// public/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv  = document.getElementById("alerta");
  const loginCard  = document.querySelector(".auth-card:first-of-type");
  const regCard    = document.getElementById("register");
  const formLogin  = document.getElementById("form-login");
  const formReg    = document.getElementById("form-register");
  const btnLogout  = document.getElementById("logout-btn");

  alertaDiv.textContent = "";
  if (loginCard && regCard) {
    regCard.style.display   = "none";
    loginCard.style.display = "block";
    document.querySelector(".auth-card:first-of-type .switch-link a")
      .addEventListener("click", e => {
        e.preventDefault();
        loginCard.style.display = "none";
        regCard.style.display   = "block";
      });
    regCard.querySelector(".switch-link a")
      .addEventListener("click", e => {
        e.preventDefault();
        regCard.style.display   = "none";
        loginCard.style.display = "block";
      });
  }

  function showAlert(msg, isErr=false) {
    alertaDiv.textContent = msg;
    alertaDiv.style.background = isErr
      ? "rgba(255,50,50,0.8)"
      : "rgba(255,165,0,0.8)";
    setTimeout(() => (alertaDiv.textContent = ""), 3000);
  }

  function badInput(text) {
    return /<[^>]+>/.test(text) || /;|--|\/\*/.test(text);
  }

  // Validación de fuerza de contraseña en registro
  if (formReg) {
    const pwdInput = formReg.querySelector('input[name="contrasena"]');
    const strengthDiv = document.createElement('div');
    strengthDiv.id = 'password-strength';
    strengthDiv.style.marginTop = '4px';
    pwdInput.parentNode.insertBefore(strengthDiv, formReg.adminCode);

    pwdInput.addEventListener('input', () => {
      const val = pwdInput.value;
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{6,}$/;
      if (regex.test(val)) {
        strengthDiv.textContent = 'Contraseña segura ✓';
        strengthDiv.style.color = 'lightgreen';
      } else {
        strengthDiv.textContent = 'Debe tener min. 6 caracteres, mayúscula, minúscula, número y carácter especial.';
        strengthDiv.style.color = 'salmon';
      }
    });
  }

  // Menú dinámico para admin
  function addAdminLink() {
    const nav = document.querySelector('nav');
    const link = document.createElement('a');
    link.href = '/users.html';
    link.textContent = 'Usuarios';
    nav.appendChild(link);
  }

  if (btnLogout) {
    fetch('/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.rol === 'admin') addAdminLink();
      });
  }

  // Forzar login en Home y Misiones
  const path = window.location.pathname;
  if (["/", "/index.html", "/misiones.html"].includes(path)) {
    fetch("/auth/session").then(r => {
      if (!r.ok) window.location.href = "/login.html";
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      window.location.href = "/login.html";
    });
  }

  // Login
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

  // Register
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
