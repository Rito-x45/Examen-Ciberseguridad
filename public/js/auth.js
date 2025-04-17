// public/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv   = document.getElementById("alerta");
  const formLogin   = document.getElementById("form-login");
  const formReg     = document.getElementById("form-register");
  const btnLogout   = document.getElementById("logout-btn");

  function showAlert(msg, isErr = false) {
    alertaDiv.textContent = msg;
    alertaDiv.style.background = isErr ? "rgba(255,50,50,0.8)" : "rgba(255,165,0,0.8)";
    setTimeout(() => alertaDiv.textContent = "", 3000);
  }

  function badInput(text) {
    return /<[^>]+>/.test(text) || /;|--|\/\*/.test(text);
  }

  // Sólo en páginas protegidas
  const path = window.location.pathname;
  const protectedPages = ["/misiones.html", "/index.html", "/"];
  if (protectedPages.includes(path) && btnLogout) {
    fetch("/auth/session").then(r => {
      if (!r.ok) window.location.href = "/login.html";
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      window.location.href = "/login.html";
    });
  }

  if (formLogin) {
    formLogin.addEventListener("submit", async e => {
      e.preventDefault();
      const u = formLogin.nombre.value.trim();
      const p = formLogin.contrasena.value.trim();
      if (badInput(u) || badInput(p)) {
        showAlert("Entrada inválida.", true);
        return;
      }
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: u, contrasena: p })
      });
      const msg = await res.text();
      showAlert(msg, !res.ok);
      if (res.ok) window.location.href = "/index.html";
    });
  }

  if (formReg) {
    formReg.addEventListener("submit", async e => {
      e.preventDefault();
      const u = formReg.nombre.value.trim();
      const p = formReg.contrasena.value.trim();
      const a = formReg.adminCode.value.trim();
      if (badInput(u) || badInput(p) || (a && badInput(a))) {
        showAlert("Entrada inválida.", true);
        return;
      }
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: u, contrasena: p, adminCode: a })
      });
      const msg = await res.text();
      showAlert(msg, !res.ok);
    });
  }
});