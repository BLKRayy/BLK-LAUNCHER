const ADMIN_PASSWORD = "loyal";

const adminContent = document.getElementById("admin-content");
const loginBtn = document.getElementById("admin-login-btn");
const passInput = document.getElementById("admin-password");
const errorEl = document.getElementById("admin-error");

loginBtn.addEventListener("click", () => {
  if (passInput.value.trim() === ADMIN_PASSWORD) {
    loadAdminPanel();
  } else {
    errorEl.textContent = "Incorrect password.";
  }
});

passInput.addEventListener("keydown", e => {
  if (e.key === "Enter") loginBtn.click();
});

function buildIndexUrlFromAdmin() {
  const url = new URL(window.location.href);
  url.pathname = url.pathname.replace(/admin\.html$/, "index.html");
  url.search = "";
  return url;
}

function loadAdminPanel() {
  adminContent.classList.remove("admin-locked");
  adminContent.innerHTML = `
    <h1>Admin Panel</h1>

    <section class="admin-section">
      <h2>Global Lockdown</h2>
      <textarea id="lock-msg" placeholder="Lockdown message"></textarea>
      <input type="number" id="lock-mins" placeholder="Minutes" min="1" value="60" />
      <button id="activate-lock">Activate Lockdown</button>
      <p class="hint">This will send users to index.html with ?lockdown=1&end=...&msg=...</p>
    </section>

    <section class="admin-section">
      <h2>Game Importer v2</h2>
      <p>Paste game info or use quick add.</p>
      <input id="imp-title" placeholder="Title" />
      <input id="imp-url" placeholder="Game URL" />
      <input id="imp-thumb" placeholder="Thumbnail URL (optional)" />
      <input id="imp-cat" placeholder="Category (action, racing, etc.)" />
      <button id="imp-add-btn">Add Game (Local Only)</button>
      <p class="hint">This updates localStorage only. For permanent changes, edit games.json in GitHub.</p>
    </section>

    <section class="admin-section">
      <h2>Profile Export / Import</h2>
      <button id="export-profile">Export Active Profile (.blk)</button>
      <input type="file" id="import-profile-file" accept=".blk" />
      <button id="import-profile">Import Profile</button>
      <p class="hint">Simulated export/import using JSON text.</p>
    </section>

    <section class="admin-section">
      <h2>Admin Analytics</h2>
      <button id="refresh-analytics">Refresh Analytics</button>
      <div id="analytics-output" class="log-box"></div>
    </section>

    <section class="admin-section">
      <h2>Theme Settings</h2>
      <button class="theme-btn" data-theme="light">Light</button>
      <button class="theme-btn" data-theme="dark">Dark</button>
      <button class="theme-btn" data-theme="neon">Neon</button>
    </section>

    <section class="admin-section">
      <h2>Debug Tools</h2>
      <button id="debug-reload">Force Reload</button>
      <button id="debug-reset-admin">Reset Admin Session</button>
    </section>

    <section class="admin-section">
      <h2>Version Info</h2>
      <p>BLK Launcher v2.0 (Top 25 Build)</p>
      <p>Build Date: Feb 2026</p>
    </section>
  `;

  const logBox = document.getElementById("analytics-output");
  const log = msg => {
    const line = document.createElement("div");
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logBox.prepend(line);
  };

  /* Lockdown */
  document.getElementById("activate-lock").addEventListener("click", () => {
    const msg = encodeURIComponent(
      document.getElementById("lock-msg").value.trim() || "This site is locked."
    );
    const mins = parseInt(document.getElementById("lock-mins").value, 10) || 60;
    const end = Date.now() + mins * 60000;

    const indexUrl = buildIndexUrlFromAdmin();
    indexUrl.searchParams.set("lockdown", "1");
    indexUrl.searchParams.set("msg", msg);
    indexUrl.searchParams.set("end", String(end));

    log("Lockdown activated.");
    window.location.href = indexUrl.toString();
  });

  /* Importer v2 (local only) */
  document.getElementById("imp-add-btn").addEventListener("click", () => {
    const title = document.getElementById("imp-title").value.trim();
    const url = document.getElementById("imp-url").value.trim();
    const thumb =
      document.getElementById("imp-thumb").value.trim() ||
      "https://via.placeholder.com/300x200?text=" + encodeURIComponent(title || "Game");
    const cat = document.getElementById("imp-cat").value.trim().toLowerCase() || "action";
    if (!title || !url) {
      alert("Title and URL are required.");
      return;
    }
    const local = JSON.parse(localStorage.getItem("blkLocalGames") || "[]");
    const id = "local-" + Date.now();
    local.push({
      id,
      title,
      url,
      thumbnail: thumb,
      category: cat,
      description: "Imported game."
    });
    localStorage.setItem("blkLocalGames", JSON.stringify(local));
    log(`Imported game "${title}" (local only).`);
    alert("Game added locally. To make it permanent, add it to games.json in GitHub.");
  });

  /* Profile export/import (simulated) */
  document.getElementById("export-profile").addEventListener("click", () => {
    const data = {
      profiles: localStorage.getItem("blkProfiles"),
      active: localStorage.getItem("blkActiveProfile"),
      favorites: Object.keys(localStorage)
        .filter(k => k.startsWith("favorites_"))
        .reduce((acc, k) => ({ ...acc, [k]: localStorage.getItem(k) }), {}),
      stats: Object.keys(localStorage)
        .filter(k => k.startsWith("gameStats_"))
        .reduce((acc, k) => ({ ...acc, [k]: localStorage.getItem(k) }), {}),
      history: Object.keys(localStorage)
        .filter(k => k.startsWith("history_"))
        .reduce((acc, k) => ({ ...acc, [k]: localStorage.getItem(k) }), {})
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "profile.blk";
    a.click();
    URL.revokeObjectURL(url);
    log("Profile exported as profile.blk");
  });

  document.getElementById("import-profile").addEventListener("click", () => {
    const fileInput = document.getElementById("import-profile-file");
    if (!fileInput.files.length) {
      alert("Choose a .blk file first.");
      return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.profiles) localStorage.setItem("blkProfiles", data.profiles);
        if (data.active) localStorage.setItem("blkActiveProfile", data.active);
        if (data.favorites) {
          Object.entries(data.favorites).forEach(([k, v]) => localStorage.setItem(k, v));
        }
        if (data.stats) {
          Object.entries(data.stats).forEach(([k, v]) => localStorage.setItem(k, v));
        }
        if (data.history) {
          Object.entries(data.history).forEach(([k, v]) => localStorage.setItem(k, v));
        }
        log("Profile imported. Reloading.");
        alert("Profile imported. Reloading page.");
        location.reload();
      } catch {
        alert("Invalid .blk file.");
      }
    };
    reader.readAsText(file);
  });

  /* Analytics */
  document.getElementById("refresh-analytics").addEventListener("click", () => {
    logBox.innerHTML = "";
    const statsKeys = Object.keys(localStorage).filter(k => k.startsWith("gameStats_"));
    if (!statsKeys.length) {
      log("No stats found.");
      return;
    }
    statsKeys.forEach(k => {
      const profileId = k.replace("gameStats_", "");
      const stats = JSON.parse(localStorage.getItem(k) || "{}");
      const totalSessions = Object.values(stats).reduce((sum, s) => sum + (s.plays || 0), 0);
      log(`Profile ${profileId}: ${totalSessions} total sessions.`);
    });
  });

  /* Themes (simulated) */
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      log(`Theme changed to ${theme} (simulated).`);
      alert(`Theme set to ${theme} (simulated).`);
    });
  });

  /* Debug */
  document.getElementById("debug-reload").addEventListener("click", () => {
    log("Force reload triggered.");
    location.reload();
  });

  document.getElementById("debug-reset-admin").addEventListener("click", () => {
    log("Admin session reset (reload required).");
    alert("Admin session reset. Reloading.");
    location.reload();
  });

  log("Admin logged in.");
}
