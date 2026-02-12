// BLK Launcher – admin logic

const ADMIN_PASSWORD = "loyal";

document.addEventListener("DOMContentLoaded", () => {
  const passInput = document.getElementById("admin-password");
  const btn = document.getElementById("admin-login-btn");
  const err = document.getElementById("admin-error");
  const container = document.getElementById("admin-content");

  if (!passInput || !btn || !err || !container) return;

  btn.onclick = () => {
    if (passInput.value === ADMIN_PASSWORD) {
      container.innerHTML = `
        <h3>Admin Panel</h3>
        <p>Welcome, admin.</p>
        <h4>Lockdown Controls</h4>
        <p>Lock the launcher for a set time.</p>
        <input id="lock-minutes" type="number" min="1" max="180" placeholder="Minutes" />
        <input id="lock-reason" placeholder="Reason (optional)" />
        <button id="lock-apply">Apply Lockdown</button>
        <p id="lock-status"></p>
      `;

      const lockMinutes = document.getElementById("lock-minutes");
      const lockReason = document.getElementById("lock-reason");
      const lockApply = document.getElementById("lock-apply");
      const lockStatus = document.getElementById("lock-status");

      lockApply.onclick = () => {
        const mins = parseInt(lockMinutes.value, 10);
        if (!mins || mins <= 0) {
          lockStatus.textContent = "Enter a valid number of minutes.";
          return;
        }
        const until = Date.now() + mins * 60 * 1000;
        const reason = lockReason.value || "Locked by admin.";
        localStorage.setItem("blk_lockdown", JSON.stringify({ until, reason }));
        lockStatus.textContent = `Lockdown active for ${mins} minutes.`;
      };
    } else {
      err.textContent = "Incorrect password.";
    }
  };
});
