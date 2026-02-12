// BLK Launcher – main script

const ADMIN_PASSWORD = "loyal";

let allGames = [];
let currentGame = null;
let viewerTimer = null;
let viewerSeconds = 0;
let currentProfile = "Default";

// ---------- UTILITIES ----------

function getProfileKey(suffix) {
  return `blk_profile_${currentProfile}_${suffix}`;
}

function loadProfiles() {
  const select = document.getElementById("profile-select");
  const btnNew = document.getElementById("profile-new-btn");
  if (!select || !btnNew) return;

  let profiles = JSON.parse(localStorage.getItem("blk_profiles") || "[]");
  if (profiles.length === 0) profiles = ["Default"];

  if (!profiles.includes(currentProfile)) currentProfile = profiles[0];

  select.innerHTML = "";
  profiles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    if (p === currentProfile) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = () => {
    currentProfile = select.value;
    renderAll();
  };

  btnNew.onclick = () => {
    const name = prompt("New profile name:");
    if (!name) return;
    if (!profiles.includes(name)) {
      profiles.push(name);
      localStorage.setItem("blk_profiles", JSON.stringify(profiles));
      currentProfile = name;
      loadProfiles();
      renderAll();
    }
  };
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(getProfileKey("favorites")) || "[]");
}

function setFavorites(favs) {
  localStorage.setItem(getProfileKey("favorites"), JSON.stringify(favs));
}

function getStats() {
  return JSON.parse(localStorage.getItem(getProfileKey("stats")) || "{}");
}

function setStats(stats) {
  localStorage.setItem(getProfileKey("stats"), JSON.stringify(stats));
}

function addPlayTime(gameId, seconds) {
  const stats = getStats();
  if (!stats[gameId]) stats[gameId] = { seconds: 0, plays: 0, lastPlayed: null };
  stats[gameId].seconds += seconds;
  stats[gameId].plays += 1;
  stats[gameId].lastPlayed = Date.now();
  setStats(stats);
}

function getLockdown() {
  return JSON.parse(localStorage.getItem("blk_lockdown") || "null");
}

function setLockdown(obj) {
  if (!obj) localStorage.removeItem("blk_lockdown");
  else localStorage.setItem("blk_lockdown", JSON.stringify(obj));
}

// ---------- LOADING SCREEN ----------

function initLoadingScreen() {
  const loading = document.getElementById("loading-screen");
  const fill = document.getElementById("loading-fill");
  if (!loading || !fill) return;

  let pct = 0;
  const interval = setInterval(() => {
    pct += 20;
    if (pct > 100) pct = 100;
    fill.style.width = pct + "%";
    if (pct === 100) {
      clearInterval(interval);
      setTimeout(() => {
        loading.style.display = "none";
      }, 300);
    }
  }, 200);
}

// ---------- GAMES LOADING ----------

function loadGames() {
  return fetch("games.json")
    .then(r => r.json())
    .then(data => {
      allGames = data;
    })
    .catch(err => {
      console.error("Error loading games.json", err);
      allGames = [];
    });
}

// ---------- RENDER HELPERS ----------

function renderFeatured() {
  const thumb = document.getElementById("featured-thumb");
  const title = document.getElementById("featured-title");
  const desc = document.getElementById("featured-desc");
  const btn = document.getElementById("featured-play");
  if (!thumb || !title || !desc || !btn) return;
  if (allGames.length === 0) return;

  const g = allGames[0];
  thumb.src = g.thumbnail;
  title.textContent = g.title;
  desc.textContent = g.description || "";
  btn.onclick = () => openGame(g.id);
}

function renderRecentlyPlayed() {
  const ul = document.getElementById("recently-played");
  if (!ul) return;
  ul.innerHTML = "";

  const stats = getStats();
  const arr = Object.entries(stats)
    .filter(([, v]) => v.lastPlayed)
    .sort((a, b) => b[1].lastPlayed - a[1].lastPlayed)
    .slice(0, 5);

  arr.forEach(([id, v]) => {
    const game = allGames.find(g => g.id === id);
    if (!game) return;
    const li = document.createElement("li");
    const d = new Date(v.lastPlayed);
    li.textContent = `${game.title} – last played ${d.toLocaleTimeString()}`;
    ul.appendChild(li);
  });
}

function renderTopGames() {
  const ul = document.getElementById("top-games");
  if (!ul) return;
  ul.innerHTML = "";

  const stats = getStats();
  const arr = Object.entries(stats)
    .sort((a, b) => b[1].plays - a[1].plays)
    .slice(0, 5);

  arr.forEach(([id, v]) => {
    const game = allGames.find(g => g.id === id);
    if (!game) return;
    const li = document.createElement("li");
    li.textContent = `${game.title} – ${v.plays} plays`;
    ul.appendChild(li);
  });
}

function renderGamesPage() {
  const list = document.getElementById("games-list");
  if (!list) return;

  const search = document.getElementById("game-search");
  const chips = document.querySelectorAll("#category-chips .chip");

  function applyFilter() {
    const term = search ? search.value.toLowerCase() : "";
    const activeChip = document.querySelector("#category-chips .chip.active");
    const cat = activeChip ? activeChip.dataset.cat : "all";

    list.innerHTML = "";
    allGames.forEach(g => {
      if (cat !== "all" && g.category !== cat) return;
      if (term && !g.title.toLowerCase().includes(term)) return;

      const card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML = `
        <img src="${g.thumbnail}" />
        <h3>${g.title}</h3>
        <p>${g.description || ""}</p>
        <button class="play-btn">Play</button>
        <button class="fav-btn">Favorite</button>
      `;
      card.querySelector(".play-btn").onclick = () => openGame(g.id);
      card.querySelector(".fav-btn").onclick = () => toggleFavorite(g.id);
      list.appendChild(card);
    });
  }

  if (search) search.oninput = applyFilter;
  chips.forEach(chip => {
    chip.onclick = () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyFilter();
    };
  });

  applyFilter();
}

function renderFavoritesPage() {
  const list = document.getElementById("favorites-list");
  if (!list) return;

  const favs = getFavorites();
  list.innerHTML = "";

  favs.forEach(id => {
    const g = allGames.find(x => x.id === id);
    if (!g) return;
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <img src="${g.thumbnail}" />
      <h3>${g.title}</h3>
      <p>${g.description || ""}</p>
      <button class="play-btn">Play</button>
      <button class="fav-btn">Remove</button>
    `;
    card.querySelector(".play-btn").onclick = () => openGame(g.id);
    card.querySelector(".fav-btn").onclick = () => toggleFavorite(g.id);
    list.appendChild(card);
  });
}

function renderDailyQuests() {
  const ul = document.getElementById("daily-quests");
  if (!ul) return;
  ul.innerHTML = "";

  const quests = [
    "Play any racing game for 5 minutes",
    "Favorite 2 new games",
    "Try a game you've never played before"
  ];

  quests.forEach(q => {
    const li = document.createElement("li");
    li.textContent = q;
    ul.appendChild(li);
  });
}

function renderAll() {
  renderFeatured();
  renderRecentlyPlayed();
  renderTopGames();
  renderGamesPage();
  renderFavoritesPage();
  renderDailyQuests();
}

// ---------- FAVORITES ----------

function toggleFavorite(gameId) {
  let favs = getFavorites();
  if (favs.includes(gameId)) {
    favs = favs.filter(id => id !== gameId);
  } else {
    favs.push(gameId);
  }
  setFavorites(favs);
  renderFavoritesPage();
}

// ---------- VIEWER ----------

function openGame(gameId) {
  const viewer = document.getElementById("game-viewer");
  const frame = document.getElementById("viewer-frame");
  const title = document.getElementById("viewer-title");
  const timeLabel = document.getElementById("viewer-session-time");
  const favBtn = document.getElementById("viewer-fav-btn");

  if (!viewer || !frame || !title || !timeLabel || !favBtn) return;

  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  currentGame = game;
  viewerSeconds = 0;
  timeLabel.textContent = "00:00:00";
  title.textContent = `Playing: ${game.title}`;
  frame.src = game.url || "";
  viewer.classList.remove("viewer-hidden");

  const favs = getFavorites();
  favBtn.textContent = favs.includes(game.id) ? "★ Favorited" : "☆ Favorite";

  if (viewerTimer) clearInterval(viewerTimer);
  viewerTimer = setInterval(() => {
    viewerSeconds++;
    const h = String(Math.floor(viewerSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((viewerSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(viewerSeconds % 60).padStart(2, "0");
    timeLabel.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function closeViewer() {
  const viewer = document.getElementById("game-viewer");
  const frame = document.getElementById("viewer-frame");
  if (!viewer || !frame) return;

  viewer.classList.add("viewer-hidden");
  frame.src = "";
  if (viewerTimer) {
    clearInterval(viewerTimer);
    viewerTimer = null;
  }
  if (currentGame && viewerSeconds > 0) {
    addPlayTime(currentGame.id, viewerSeconds);
    renderRecentlyPlayed();
    renderTopGames();
  }
  currentGame = null;
}

// ---------- OS MODE ----------

function initOSMode() {
  const btn = document.getElementById("os-mode-btn");
  const os = document.getElementById("os-mode");
  const exitBtn = document.getElementById("os-exit-btn");
  const clock = document.getElementById("os-clock");

  if (!btn || !os || !exitBtn || !clock) return;

  btn.onclick = () => {
    os.classList.remove("os-hidden");
  };
  exitBtn.onclick = () => {
    os.classList.add("os-hidden");
  };

  setInterval(() => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString();
  }, 1000);
}

// ---------- AI ----------

function initAI() {
  const input = document.getElementById("ai-input");
  const btn = document.getElementById("ai-run-btn");
  const out = document.getElementById("ai-output");
  if (!input || !btn || !out) return;

  function respond(text) {
    out.innerHTML += "<br><br>" + text;
    out.scrollTop = out.scrollHeight;
  }

  function handle(cmd) {
    const c = cmd.toLowerCase();

    if (c.includes("most played")) {
      const stats = getStats();
      let bestId = null;
      let bestSec = 0;
      Object.entries(stats).forEach(([id, v]) => {
        if (v.seconds > bestSec) {
          bestSec = v.seconds;
          bestId = id;
        }
      });
      if (!bestId) {
        respond("You haven't played any games yet.");
      } else {
        const g = allGames.find(x => x.id === bestId);
        const mins = Math.round(bestSec / 60);
        respond(`Your most played game is ${g ? g.title : bestId} – about ${mins} minutes.`);
      }
    } else if (c.includes("racing")) {
      const list = allGames.filter(g => g.category === "racing").map(g => g.title).join(", ");
      respond(list ? "Racing games: " + list : "No racing games found.");
    } else if (c.includes("lock") && c.includes("site")) {
      respond("Locking requires admin. Use the Admin page to set lockdown.");
    } else if (c.includes("recommend")) {
      respond("Try Drift Hunters, Retro Bowl, or Slope if you like skill-based games.");
    } else {
      respond("I didn't fully get that, but you can ask about most played games, racing games, or recommendations.");
    }
  }

  btn.onclick = () => {
    const v = input.value.trim();
    if (!v) return;
    respond("> " + v);
    handle(v);
    input.value = "";
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") btn.click();
  });
}

// ---------- LOCKDOWN ----------

function initLockdownOverlay() {
  const overlay = document.getElementById("lockdown-overlay");
  const msg = document.getElementById("lockdown-message");
  const timerLabel = document.getElementById("lockdown-timer");
  const adminBtn = document.getElementById("lockdown-admin-button");
  const popup = document.getElementById("lockdown-admin-popup");
  const passInput = document.getElementById("lockdown-admin-password");
  const err = document.getElementById("lockdown-admin-error");
  const cancel = document.getElementById("lockdown-admin-cancel");
  const submit = document.getElementById("lockdown-admin-submit");

  if (!overlay || !msg || !timerLabel || !adminBtn || !popup || !passInput || !err || !cancel || !submit) return;

  function updateLockdownUI() {
    const data = getLockdown();
    if (!data) {
      overlay.classList.add("lockdown-hidden");
      return;
    }
    const now = Date.now();
    if (now >= data.until) {
      setLockdown(null);
      overlay.classList.add("lockdown-hidden");
      return;
    }
    overlay.classList.remove("lockdown-hidden");
    msg.textContent = data.reason || "Locked by admin.";
    const remaining = Math.floor((data.until - now) / 1000);
    const h = String(Math.floor(remaining / 3600)).padStart(2, "0");
    const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    timerLabel.textContent = `${h}:${m}:${s}`;
  }

  setInterval(updateLockdownUI, 1000);
  updateLockdownUI();

  adminBtn.onclick = () => {
    popup.classList.remove("lockdown-popup-hidden");
    err.textContent = "";
    passInput.value = "";
  };

  cancel.onclick = () => {
    popup.classList.add("lockdown-popup-hidden");
  };

  submit.onclick = () => {
    if (passInput.value === ADMIN_PASSWORD) {
      setLockdown(null);
      popup.classList.add("lockdown-popup-hidden");
      overlay.classList.add("lockdown-hidden");
    } else {
      err.textContent = "Incorrect password.";
    }
  };
}

// ---------- INIT ----------

window.addEventListener("load", () => {
  initLoadingScreen();
});

document.addEventListener("DOMContentLoaded", async () => {
  loadProfiles();
  await loadGames();
  renderAll();

  initOSMode();
  initAI();
  initLockdownOverlay();

  const viewerClose = document.getElementById("viewer-close-btn");
  const viewerFav = document.getElementById("viewer-fav-btn");
  const viewerFull = document.getElementById("viewer-fullscreen-btn");

  if (viewerClose) viewerClose.onclick = closeViewer;
  if (viewerFav) viewerFav.onclick = () => {
    if (!currentGame) return;
    toggleFavorite(currentGame.id);
    const favs = getFavorites();
    viewerFav.textContent = favs.includes(currentGame.id) ? "★ Favorited" : "☆ Favorite";
  };
  if (viewerFull) viewerFull.onclick = () => {
    const frame = document.getElementById("viewer-frame");
    if (frame && frame.requestFullscreen) frame.requestFullscreen();
  };
});
