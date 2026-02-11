/* BLK LAUNCHER – MASTER SCRIPT
 * Includes:
 * - Profiles
 * - Favorites
 * - Stats + History
 * - Achievements
 * - XP + Levels
 * - Daily Challenges
 * - Collections
 * - Featured Carousel
 * - Game Viewer + Save Slots (simulated)
 * - BLK AI v2
 * - OS Mode + Dock + Notifications
 * - Lockdown
 * - Offline-friendly behavior (no crashes if offline)
 */

const ADMIN_PASSWORD = "loyal";
const GAMES_JSON = "games.json";

/* -------------------- UTILITIES -------------------- */

function getParams() {
  const params = {};
  const raw = window.location.search.substring(1);
  if (!raw) return params;
  raw.split("&").forEach(p => {
    const [k, v] = p.split("=");
    if (!k) return;
    params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  });
  return params;
}

function clearLockdownParams() {
  const clean = window.location.origin + window.location.pathname;
  window.location.replace(clean);
}

function fmtTime(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/* -------------------- LOADING SCREEN -------------------- */

const loadingScreen = document.getElementById("loading-screen");
const loadingFill = document.getElementById("loading-fill");

function showLoading() {
  if (!loadingScreen) return;
  loadingScreen.style.display = "flex";
  if (loadingFill) {
    loadingFill.style.width = "0%";
    let p = 0;
    const id = setInterval(() => {
      p += 10;
      loadingFill.style.width = Math.min(p, 100) + "%";
      if (p >= 100) clearInterval(id);
    }, 80);
  }
}

function hideLoading() {
  if (!loadingScreen) return;
  setTimeout(() => {
    loadingScreen.classList.add("loading-hidden");
  }, 400);
}

showLoading();
window.addEventListener("load", hideLoading);

/* -------------------- LOCKDOWN -------------------- */

const overlay = document.getElementById("lockdown-overlay");
const msgEl = document.getElementById("lockdown-message");
const timerEl = document.getElementById("lockdown-timer");

const adminBtn = document.getElementById("lockdown-admin-button");
const popup = document.getElementById("lockdown-admin-popup");
const passInput = document.getElementById("lockdown-admin-password");
const cancelBtn = document.getElementById("lockdown-admin-cancel");
const submitBtn = document.getElementById("lockdown-admin-submit");
const errorEl = document.getElementById("lockdown-admin-error");

let lockdownInterval = null;

function showLock(msg, end) {
  if (!overlay || !msgEl || !timerEl) return;

  msgEl.textContent = msg || "This site is locked.";
  overlay.classList.remove("lockdown-hidden");
  document.body.style.overflow = "hidden";

  if (lockdownInterval) clearInterval(lockdownInterval);

  if (end) {
    const tick = () => {
      const now = Date.now();
      const left = end - now;
      if (left <= 0) {
        timerEl.textContent = "00:00:00";
        clearLockdownParams();
        return;
      }
      timerEl.textContent = fmtTime(left);
    };
    tick();
    lockdownInterval = setInterval(tick, 1000);
  } else {
    timerEl.textContent = "--:--:--";
  }
}

function hideLock() {
  if (!overlay) return;
  overlay.classList.add("lockdown-hidden");
  document.body.style.overflow = "";
  if (lockdownInterval) clearInterval(lockdownInterval);
}

if (adminBtn && popup && passInput && cancelBtn && submitBtn && errorEl) {
  adminBtn.addEventListener("click", () => {
    errorEl.textContent = "";
    passInput.value = "";
    popup.classList.remove("lockdown-popup-hidden");
    passInput.focus();
  });

  cancelBtn.addEventListener("click", () => {
    popup.classList.add("lockdown-popup-hidden");
  });

  submitBtn.addEventListener("click", () => {
    if (passInput.value.trim() === ADMIN_PASSWORD) {
      clearLockdownParams();
    } else {
      errorEl.textContent = "Incorrect password.";
    }
  });

  passInput.addEventListener("keydown", e => {
    if (e.key === "Enter") submitBtn.click();
  });
}

(function () {
  const p = getParams();
  if (!p.lockdown) {
    hideLock();
    return;
  }
  if (p.lockdown === "1") {
    const msg = p.msg || "This site is locked.";
    const end = p.end ? parseInt(p.end, 10) : null;
    showLock(msg, end);
  }
})();

/* -------------------- PROFILES -------------------- */

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem("blkProfiles") || "[]");
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem("blkProfiles", JSON.stringify(profiles));
}

function getActiveProfileId() {
  return localStorage.getItem("blkActiveProfile") || null;
}

function setActiveProfileId(id) {
  localStorage.setItem("blkActiveProfile", id);
}

function ensureDefaultProfile() {
  let profiles = getProfiles();
  if (!profiles.length) {
    const def = {
      id: "default",
      name: "Guest",
      theme: "dark",
      xp: 0,
      level: 1,
      title: "Rookie"
    };
    profiles = [def];
    saveProfiles(profiles);
    setActiveProfileId(def.id);
  }
}

function getActiveProfile() {
  ensureDefaultProfile();
  const profiles = getProfiles();
  const id = getActiveProfileId();
  return profiles.find(p => p.id === id) || profiles[0];
}

function updateProfile(patch) {
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  const idx = profiles.findIndex(p => p.id === activeId);
  if (idx === -1) return;
  profiles[idx] = { ...profiles[idx], ...patch };
  saveProfiles(profiles);
}

function profileKey(base) {
  const p = getActiveProfile();
  return `${base}_${p.id}`;
}

function initProfileUI() {
  const select = document.getElementById("profile-select");
  const newBtn = document.getElementById("profile-new-btn");
  if (!select || !newBtn) return;

  ensureDefaultProfile();
  const profiles = getProfiles();
  const active = getActiveProfileId();

  select.innerHTML = "";
  profiles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (Lv.${p.level || 1})`;
    if (p.id === active) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    setActiveProfileId(select.value);
    location.reload();
  });

  newBtn.addEventListener("click", () => {
    const name = prompt("New profile name:");
    if (!name) return;
    const id = "p-" + Date.now();
    const profiles = getProfiles();
    profiles.push({
      id,
      name,
      theme: "dark",
      xp: 0,
      level: 1,
      title: "Rookie"
    });
    saveProfiles(profiles);
    setActiveProfileId(id);
    location.reload();
  });
}

initProfileUI();

/* -------------------- FAVORITES / COLLECTIONS -------------------- */

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("favorites")) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem(profileKey("favorites"), JSON.stringify(favs));
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id);
  else favs.splice(idx, 1);
  saveFavorites(favs);
}

function getCollections() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("collections")) || "[]");
  } catch {
    return [];
  }
}

function saveCollections(cols) {
  localStorage.setItem(profileKey("collections"), JSON.stringify(cols));
}

/* -------------------- STATS / HISTORY / ACHIEVEMENTS / XP -------------------- */

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("gameStats")) || "{}");
  } catch {
    return {};
  }
}

function saveStats(stats) {
  localStorage.setItem(profileKey("gameStats"), JSON.stringify(stats));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("history")) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(hist) {
  localStorage.setItem(profileKey("history"), JSON.stringify(hist));
}

function getAchievements() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("achievements")) || "[]");
  } catch {
    return [];
  }
}

function saveAchievements(list) {
  localStorage.setItem(profileKey("achievements"), JSON.stringify(list));
}

function getDailyChallenges() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("dailyChallenges")) || "null");
  } catch {
    return null;
  }
}

function saveDailyChallenges(dc) {
  localStorage.setItem(profileKey("dailyChallenges"), JSON.stringify(dc));
}

function getRecentlyPlayed() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("recentlyPlayed")) || "[]");
  } catch {
    return [];
  }
}

function recordPlay(gameId, msPlayed = 0) {
  const stats = getStats();
  if (!stats[gameId]) stats[gameId] = { plays: 0, lastPlayed: 0, totalTime: 0 };
  stats[gameId].plays += 1;
  stats[gameId].lastPlayed = Date.now();
  stats[gameId].totalTime += msPlayed;
  saveStats(stats);

  let recent = getRecentlyPlayed();
  recent = recent.filter(x => x !== gameId);
  recent.unshift(gameId);
  recent = recent.slice(0, 20);
  localStorage.setItem(profileKey("recentlyPlayed"), JSON.stringify(recent));

  const hist = getHistory();
  hist.unshift({
    gameId,
    at: Date.now(),
    duration: msPlayed
  });
  saveHistory(hist.slice(0, 200));

  addXP(5); // small XP per play
  checkAchievements(gameId, stats);
}

/* XP + Leveling */

function addXP(amount) {
  const p = getActiveProfile();
  const xp = (p.xp || 0) + amount;
  let level = p.level || 1;
  let needed = level * 100;
  let leveledUp = false;

  let curXP = xp;
  while (curXP >= needed) {
    curXP -= needed;
    level++;
    needed = level * 100;
    leveledUp = true;
  }

  updateProfile({
    xp: curXP,
    level,
    title: level >= 10 ? "BLK Elite" : level >= 5 ? "Pro" : "Rookie"
  });

  if (leveledUp) {
    showNotification(`Level up! You are now level ${level}.`);
  }
}

/* Achievements (simple rules) */

const ACHIEVEMENT_RULES = [
  {
    id: "first_play",
    name: "First Launch",
    desc: "Play any game once.",
    check: stats => {
      return Object.values(stats).some(s => s.plays >= 1);
    }
  },
  {
    id: "drift_king",
    name: "Drift King",
    desc: "Play Drift Hunters for at least 30 minutes total.",
    check: stats => {
      const s = stats["drift-hunters"];
      return s && s.totalTime >= 30 * 60 * 1000;
    }
  },
  {
    id: "variety_gamer",
    name: "Variety Gamer",
    desc: "Play 5 different games.",
    check: stats => {
      return Object.keys(stats).length >= 5;
    }
  }
];

function checkAchievements(lastGameId, stats) {
  const unlocked = getAchievements();
  let changed = false;

  ACHIEVEMENT_RULES.forEach(rule => {
    if (unlocked.includes(rule.id)) return;
    if (rule.check(stats)) {
      unlocked.push(rule.id);
      changed = true;
      showNotification(`Achievement unlocked: ${rule.name}`);
      addXP(50);
    }
  });

  if (changed) saveAchievements(unlocked);
}

/* Daily Challenges */

function ensureDailyChallenges() {
  const existing = getDailyChallenges();
  const todayKey = new Date().toDateString();
  if (existing && existing.date === todayKey) return existing;

  const challenges = [
    {
      id: "play_racing",
      text: "Play any racing game for 5 minutes.",
      done: false
    },
    {
      id: "favorite_two",
      text: "Favorite 2 new games.",
      done: false
    },
    {
      id: "try_new",
      text: "Play a game you've never played before.",
      done: false
    }
  ];

  const dc = { date: todayKey, challenges };
  saveDailyChallenges(dc);
  return dc;
}

function markChallengeProgress(type, payload) {
  const dc = ensureDailyChallenges();
  let changed = false;

  dc.challenges.forEach(ch => {
    if (ch.id === "play_racing" && type === "time_racing" && payload.ms >= 5 * 60 * 1000) {
      if (!ch.done) {
        ch.done = true;
        changed = true;
        showNotification("Daily quest complete: Play any racing game for 5 minutes.");
        addXP(100);
      }
    }
    if (ch.id === "favorite_two" && type === "favorite_count" && payload.count >= 2) {
      if (!ch.done) {
        ch.done = true;
        changed = true;
        showNotification("Daily quest complete: Favorite 2 new games.");
        addXP(100);
      }
    }
    if (ch.id === "try_new" && type === "new_game" && payload.isNew) {
      if (!ch.done) {
        ch.done = true;
        changed = true;
        showNotification("Daily quest complete: Try a new game.");
        addXP(100);
      }
    }
  });

  if (changed) saveDailyChallenges(dc);
}

/* -------------------- SAVE SLOTS (SIMULATED) -------------------- */

function getSaveSlots() {
  try {
    return JSON.parse(localStorage.getItem(profileKey("saveSlots")) || "{}");
  } catch {
    return {};
  }
}

function saveSaveSlots(slots) {
  localStorage.setItem(profileKey("saveSlots"), JSON.stringify(slots));
}

/* -------------------- GAME LOADING -------------------- */

async function loadGames() {
  try {
    const res = await fetch(GAMES_JSON);
    if (!res.ok) throw new Error("Failed to load games.json");
    const base = await res.json();
    const local = JSON.parse(localStorage.getItem("blkLocalGames") || "[]");
    return [...base, ...local];
  } catch (e) {
    console.error(e);
    return [];
  }
}

/* -------------------- GAME VIEWER -------------------- */

const viewer = document.getElementById("game-viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerFrame = document.getElementById("viewer-frame");
const viewerClose = document.getElementById("viewer-close-btn");
const viewerFavBtn = document.getElementById("viewer-fav-btn");
const viewerFullBtn = document.getElementById("viewer-fullscreen-btn");
const viewerSaveBtn = document.getElementById("viewer-save-btn");
const viewerLoadBtn = document.getElementById("viewer-load-btn");
const viewerSlotSel = document.getElementById("viewer-save-slot");
const viewerSessionTime = document.getElementById("viewer-session-time");

let viewerCurrentId = null;
let viewerSessionStart = null;
let viewerSessionTimerId = null;

function startSessionTimer() {
  if (!viewerSessionTime) return;
  viewerSessionStart = Date.now();
  if (viewerSessionTimerId) clearInterval(viewerSessionTimerId);
  viewerSessionTimerId = setInterval(() => {
    const diff = Date.now() - viewerSessionStart;
    viewerSessionTime.textContent = fmtTime(diff);
  }, 1000);
}

function stopSessionTimer() {
  if (viewerSessionTimerId) clearInterval(viewerSessionTimerId);
}

function openViewer(game) {
  if (!viewer || !viewerFrame || !viewerTitle) {
    window.open(game.url, "_blank");
    return;
  }
  const stats = getStats();
  const isNew = !stats[game.id];

  viewerCurrentId = game.id;
  viewerTitle.textContent = `Playing: ${game.title}`;
  viewerFrame.src = game.url;
  viewer.classList.remove("viewer-hidden");

  const favs = getFavorites();
  if (viewerFavBtn) {
    viewerFavBtn.textContent = favs.includes(game.id) ? "★ Favorite" : "☆ Favorite";
  }

  startSessionTimer();

  // Mark "new game" for daily challenge
  markChallengeProgress("new_game", { isNew });
}

if (viewerClose) {
  viewerClose.addEventListener("click", () => {
    viewer.classList.add("viewer-hidden");
    if (viewerFrame) viewerFrame.src = "";
    if (viewerSessionStart && viewerCurrentId) {
      const ms = Date.now() - viewerSessionStart;
      recordPlay(viewerCurrentId, ms);
    }
    stopSessionTimer();
  });
}

if (viewerFavBtn) {
  viewerFavBtn.addEventListener("click", () => {
    if (!viewerCurrentId) return;
    toggleFavorite(viewerCurrentId);
    const favs = getFavorites();
    viewerFavBtn.textContent = favs.includes(viewerCurrentId) ? "★ Favorite" : "☆ Favorite";

    const favCount = getFavorites().length;
    markChallengeProgress("favorite_count", { count: favCount });
  });
}

if (viewerFullBtn && viewerFrame) {
  viewerFullBtn.addEventListener("click", () => {
    if (viewerFrame.requestFullscreen) viewerFrame.requestFullscreen();
  });
}

if (viewerSaveBtn && viewerSlotSel) {
  viewerSaveBtn.addEventListener("click", () => {
    if (!viewerCurrentId) return;
    const slot = viewerSlotSel.value;
    const slots = getSaveSlots();
    if (!slots[viewerCurrentId]) slots[viewerCurrentId] = {};
    slots[viewerCurrentId][slot] = {
      savedAt: Date.now()
    };
    saveSaveSlots(slots);
    alert(`Saved to slot ${slot} (metadata only).`);
  });
}

if (viewerLoadBtn && viewerSlotSel) {
  viewerLoadBtn.addEventListener("click", () => {
    if (!viewerCurrentId) return;
    const slot = viewerSlotSel.value;
    const slots = getSaveSlots();
    const data = slots[viewerCurrentId]?.[slot];
    if (!data) {
      alert("No save in this slot.");
      return;
    }
    alert(
      `Loaded slot ${slot}. (Simulated – real game state can't be restored across origins, but slot exists.)`
    );
  });
}

/* -------------------- GAMES PAGE -------------------- */

(async function initGamesPage() {
  const gamesList = document.getElementById("games-list");
  if (!gamesList) return;

  const searchInput = document.getElementById("game-search");
  const chips = document.getElementById("category-chips");
  const games = await loadGames();

  let currentCat = "all";
  let currentSearch = "";

  function render() {
    const favs = getFavorites();
    gamesList.innerHTML = "";

    const filtered = games.filter(g => {
      const matchesCat = currentCat === "all" || g.category === currentCat;
      const matchesSearch =
        !currentSearch ||
        g.title.toLowerCase().includes(currentSearch) ||
        g.description.toLowerCase().includes(currentSearch);
      return matchesCat && matchesSearch;
    });

    if (!filtered.length) {
      gamesList.innerHTML = "<p>No games found.</p>";
      return;
    }

    filtered.forEach(game => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML = `
        <img src="${game.thumbnail}" alt="${game.title}" class="game-thumb" />
        <h3>${game.title}</h3>
        <p class="game-cat">${game.category}</p>
        <p>${game.description}</p>
        <div class="game-actions">
          <button class="play-btn" data-id="${game.id}">Play</button>
          <button class="fav-btn" data-id="${game.id}">
            ${favs.includes(game.id) ? "★ Unfavorite" : "☆ Favorite"}
          </button>
        </div>
      `;
      gamesList.appendChild(card);
    });
  }

  render();

  gamesList.addEventListener("click", e => {
    const play = e.target.closest(".play-btn");
    const fav = e.target.closest(".fav-btn");
    if (play) {
      const id = play.dataset.id;
      const game = games.find(g => g.id === id);
      if (game) openViewer(game);
    }
    if (fav) {
      const id = fav.dataset.id;
      toggleFavorite(id);
      render();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentSearch = searchInput.value.trim().toLowerCase();
      render();
    });
  }

  if (chips) {
    chips.addEventListener("click", e => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      currentCat = btn.dataset.cat;
      chips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      render();
    });
  }
})();

/* -------------------- FAVORITES PAGE -------------------- */

(async function initFavoritesPage() {
  const favList = document.getElementById("favorites-list");
  if (!favList) return;

  const games = await loadGames();
  const favs = getFavorites();
  const favGames = games.filter(g => favs.includes(g.id));

  favList.innerHTML = "";

  if (!favGames.length) {
    favList.innerHTML = "<p>No favorites yet.</p>";
    return;
  }

  favGames.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <img src="${game.thumbnail}" alt="${game.title}" class="game-thumb" />
      <h3>${game.title}</h3>
      <p class="game-cat">${game.category}</p>
      <p>${game.description}</p>
      <div class="game-actions">
        <button class="play-btn" data-id="${game.id}">Play</button>
        <button class="fav-btn" data-id="${game.id}">★ Remove Favorite</button>
      </div>
    `;
    favList.appendChild(card);
  });

  favList.addEventListener("click", e => {
    const play = e.target.closest(".play-btn");
    const fav = e.target.closest(".fav-btn");
    if (play) {
      const id = play.dataset.id;
      const game = games.find(g => g.id === id);
      if (game) openViewer(game);
    }
    if (fav) {
      const id = fav.dataset.id;
      toggleFavorite(id);
      location.reload();
    }
  });
})();

/* -------------------- HOMEPAGE (FEATURED, RECENT, TOP, DAILY) -------------------- */

(async function initHomepage() {
  const titleEl = document.getElementById("featured-title");
  const descEl = document.getElementById("featured-desc");
  const thumbEl = document.getElementById("featured-thumb");
  const playBtn = document.getElementById("featured-play");
  const recentList = document.getElementById("recently-played");
  const topList = document.getElementById("top-games");
  const aiOut = document.getElementById("ai-output");

  if (!titleEl || !descEl || !thumbEl || !playBtn) return;

  const games = await loadGames();
  if (!games.length) return;

  /* Featured carousel (simple: rotate through first 3 games) */
  const featuredGames = games.slice(0, Math.min(3, games.length));
  let featuredIndex = 0;

  function renderFeatured() {
    const g = featuredGames[featuredIndex];
    titleEl.textContent = g.title;
    descEl.textContent = g.description;
    thumbEl.src = g.thumbnail;
    playBtn.onclick = () => openViewer(g);
  }

  renderFeatured();
  setInterval(() => {
    featuredIndex = (featuredIndex + 1) % featuredGames.length;
    renderFeatured();
  }, 6000);

  /* Recently played */
  const stats = getStats();
  const recentIds = getRecentlyPlayed();
  if (recentList) {
    recentList.innerHTML = "";
    if (!recentIds.length) {
      recentList.innerHTML = "<li>No games played yet.</li>";
    } else {
      recentIds.slice(0, 5).forEach(id => {
        const g = games.find(x => x.id === id);
        if (!g) return;
        const li = document.createElement("li");
        const last = stats[id]?.lastPlayed
          ? new Date(stats[id].lastPlayed).toLocaleTimeString()
          : "unknown";
        li.textContent = `${g.title} (last played: ${last})`;
        recentList.appendChild(li);
      });
    }
  }

  /* Top games */
  if (topList) {
    topList.innerHTML = "";
    const entries = Object.entries(stats);
    if (!entries.length) {
      topList.innerHTML = "<li>No stats yet.</li>";
    } else {
      entries
        .sort((a, b) => b[1].plays - a[1].plays)
        .slice(0, 5)
        .forEach(([id, data]) => {
          const g = games.find(x => x.id === id);
          if (!g) return;
          const li = document.createElement("li");
          li.textContent = `${g.title} (${data.plays} plays)`;
          topList.appendChild(li);
        });
    }
  }

  /* Daily challenges preview (text only) */
  const dc = ensureDailyChallenges();
  if (aiOut && dc) {
    const doneCount = dc.challenges.filter(c => c.done).length;
    aiOut.innerHTML += `<br>Daily quests: ${doneCount}/${dc.challenges.length} completed today.`;
  }
})();

/* -------------------- BLK AI v2 -------------------- */

function initAI() {
  const input = document.getElementById("ai-input");
  const btn = document.getElementById("ai-run-btn");
  const out = document.getElementById("ai-output");
  if (!input || !btn || !out) return;

  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const games = await loadGames();
    const favs = getFavorites();
    const stats = getStats();
    const hist = getHistory();

    function write(html) {
      out.innerHTML = html;
    }

    /* Smart search */
    if (lower.startsWith("search ") || lower.startsWith("find ")) {
      const q = lower.replace(/^search |^find /, "").trim();
      const matches = games.filter(
        g =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          (g.category || "").toLowerCase().includes(q)
      );
      if (!matches.length) return write(`AI: No results for "${q}".`);
      write(
        `AI: Results for "${q}":<br>` +
          matches.map(g => `- ${g.title} (${g.category})`).join("<br>")
      );
      return;
    }

    /* Recommend like X */
    if (lower.startsWith("recommend a game like ")) {
      const name = lower.replace("recommend a game like ", "").trim();
      const base = games.find(g => g.title.toLowerCase() === name);
      if (!base) return write("AI: I couldn't find that game.");
      const sameCat = games.filter(
        g => g.category === base.category && g.id !== base.id
      );
      if (!sameCat.length) return write("AI: No similar games found.");
      write(
        `AI: Because you like ${base.title}, try:<br>` +
          sameCat.map(g => `- ${g.title}`).join("<br>")
      );
      return;
    }

    /* Most played */
    if (lower.includes("most played")) {
      const entries = Object.entries(stats);
      if (!entries.length) return write("AI: No stats yet.");
      entries.sort((a, b) => b[1].plays - a[1].plays);
      const [id, data] = entries[0];
      const g = games.find(x => x.id === id);
      if (!g) return write("AI: Can't find that game in the library.");
      write(
        `AI: Your most played game is <b>${g.title}</b> (${data.plays} plays, ${fmtTime(
          data.totalTime
        )} total).`
      );
      return;
    }

    /* Show racing / favorites / short games */
    if (lower.startsWith("show me ") || lower.startsWith("show ")) {
      if (lower.includes("racing")) {
        const list = games.filter(g => g.category === "racing");
        if (!list.length) return write("AI: No racing games found.");
        write(
          "AI: Racing games:<br>" +
            list.map(g => `- ${g.title}`).join("<br>")
        );
        return;
      }
      if (lower.includes("favorites") || lower.includes("favourites")) {
        if (!favs.length) return write("AI: You have no favorites yet.");
        const list = games.filter(g => favs.includes(g.id));
        write(
          "AI: Your favorites:<br>" +
            list.map(g => `- ${g.title}`).join("<br>")
        );
        return;
      }
      if (lower.includes("short") || lower.includes("quick")) {
        const list = games.filter(
          g =>
            g.category === "puzzle" ||
            g.category === "retro" ||
            g.category === "action"
        );
        write(
          "AI: Quick games you can play:<br>" +
            list.slice(0, 5).map(g => `- ${g.title}`).join("<br>")
        );
        return;
      }
    }

    /* Play X */
    if (lower.startsWith("play ")) {
      const name = lower.replace("play ", "").trim();
      const g = games.find(x => x.title.toLowerCase() === name);
      if (!g) return write("AI: I couldn't find that game.");
      write(`AI: Opening <b>${g.title}</b>…`);
      openViewer(g);
      return;
    }

    /* Add to favorites */
    if (lower.startsWith("add ") && lower.includes(" to favorites")) {
      const name = lower.replace("add ", "").replace(" to favorites", "").trim();
      const g = games.find(x => x.title.toLowerCase() === name);
      if (!g) return write("AI: I couldn't find that game.");
      toggleFavorite(g.id);
      write(`AI: Added <b>${g.title}</b> to favorites.`);
      return;
    }

    /* Lockdown */
    if (lower.startsWith("lock ") && lower.includes(" minutes")) {
      const num = parseInt(lower.replace(/[^\d]/g, ""), 10);
      if (!num || num <= 0) return write("AI: I couldn't understand the time.");
      const pass = prompt("Admin password to lock:");
      if (pass !== ADMIN_PASSWORD) {
        write("AI: Incorrect admin password.");
        return;
      }
      const msg = encodeURIComponent("This site is locked.");
      const end = Date.now() + num * 60000;
      const url = new URL(window.location.href);
      url.pathname = url.pathname.replace(/admin\.html$/, "index.html");
      url.searchParams.set("lockdown", "1");
      url.searchParams.set("msg", msg);
      url.searchParams.set("end", String(end));
      write(`AI: Locking site for ${num} minutes…`);
      window.location.href = url.toString();
      return;
    }

    /* History */
    if (lower.includes("history")) {
      if (!hist.length) return write("AI: No history yet.");
      const lines = hist.slice(0, 5).map(h => {
        const g = games.find(x => x.id === h.gameId);
        if (!g) return null;
        return `${new Date(h.at).toLocaleTimeString()} – ${g.title} (${fmtTime(
          h.duration
        )})`;
      }).filter(Boolean);
      write("AI: Recent sessions:<br>" + lines.join("<br>"));
      return;
    }

    write("AI: I didn't understand that, but I'm learning.");
  });
}

initAI();

/* -------------------- OS MODE + NOTIFICATIONS -------------------- */

const osMode = document.getElementById("os-mode");
const osBtn = document.getElementById("os-mode-btn");
const osExit = document.getElementById("os-exit-btn");
const osClock = document.getElementById("os-clock");
const osSearchInput = document.getElementById("os-search-input");
const osOpenAI = document.getElementById("os-open-ai");
const osOpenGames = document.getElementById("os-open-games");
const osOpenFavs = document.getElementById("os-open-favs");
const osDesktop = document.querySelector(".os-desktop");

if (osBtn && osMode) {
  osBtn.addEventListener("click", () => {
    osMode.classList.remove("os-hidden");
  });
}

if (osExit && osMode) {
  osExit.addEventListener("click", () => {
    osMode.classList.add("os-hidden");
  });
}

if (osClock) {
  setInterval(() => {
    osClock.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

if (osSearchInput) {
  osSearchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const aiInput = document.getElementById("ai-input");
      const aiBtn = document.getElementById("ai-run-btn");
      if (aiInput && aiBtn) {
        aiInput.value = osSearchInput.value;
        aiBtn.click();
      }
    }
  });
}

if (osOpenAI) {
  osOpenAI.addEventListener("click", () => {
    const aiInput = document.getElementById("ai-input");
    if (aiInput) aiInput.focus();
  });
}

if (osOpenGames) {
  osOpenGames.addEventListener("click", () => {
    window.location.href = "games.html";
  });
}

if (osOpenFavs) {
  osOpenFavs.addEventListener("click", () => {
    window.location.href = "favorites.html";
  });
}

if (osDesktop) {
  osDesktop.addEventListener("click", e => {
    const icon = e.target.closest(".os-icon");
    if (!icon) return;
    const target = icon.dataset.open;
    if (target === "games") window.location.href = "games.html";
    if (target === "favorites") window.location.href = "favorites.html";
    if (target === "admin") window.location.href = "admin.html";
    if (target === "ai") {
      const aiInput = document.getElementById("ai-input");
      if (aiInput) aiInput.focus();
    }
    if (target === "settings") {
      alert("Settings panel (themes, wallpapers, etc.) is simulated in this build.");
    }
  });
}

/* Notifications (simple: alert-like, but you can later style a panel) */

function showNotification(message) {
  console.log("NOTIFICATION:", message);
  // For now, just console + optional alert:
  // alert(message);
}

/* -------------------- OFFLINE SAFETY -------------------- */

window.addEventListener("offline", () => {
  console.log("BLK Launcher: offline mode active.");
});

window.addEventListener("online", () => {
  console.log("BLK Launcher: back online.");
});
