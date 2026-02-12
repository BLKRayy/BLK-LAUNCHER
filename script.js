// Minimal BLK Launcher Script
// No advanced features, no viewer, no OS mode.
// Just enough to confirm JS loads correctly.

window.onload = () => {
  console.log("Minimal script.js loaded successfully.");

  const btn = document.getElementById("test-btn");
  const out = document.getElementById("test-output");

  if (btn && out) {
    btn.addEventListener("click", () => {
      out.textContent = "JavaScript is working!";
      out.style.color = "#ff0033";
    });
  }

  // Load games.json (simple test)
  fetch("games.json")
    .then(res => res.json())
    .then(games => {
      const list = document.getElementById("games-list");
      if (!list) return;

      list.innerHTML = "";
      games.forEach(g => {
        const div = document.createElement("div");
        div.className = "game-card";
        div.innerHTML = `
          <img src="${g.thumbnail}" class="game-thumb" />
          <h3>${g.title}</h3>
          <p>${g.description}</p>
        `;
        list.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Error loading games.json:", err);
    });
};
