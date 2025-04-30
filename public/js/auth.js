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

  const path = window.location.pathname;
  if (["/", "/index.html", "/misiones.html"].includes(path)) {
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


document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const alertaDiv = document.getElementById('alerta');

  // Mostrar mensaje de alerta
  function mostrarAlerta(mensaje, tipo = 'error') {
    alertaDiv.textContent = mensaje;
    alertaDiv.className = `alert ${tipo}`;
    alertaDiv.style.display = 'block';
    
    setTimeout(() => {
      alertaDiv.style.display = 'none';
    }, 5000);
  }

  // Validar contraseña
  function validarContrasena(contrasena) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return regex.test(contrasena);
  }

  // Manejar registro
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nombre = registerForm.nombre.value;
    const contrasena = registerForm.contrasena.value;
    const contrasena2 = registerForm.contrasena2.value;
    const adminCode = registerForm.adminCode.value;

    // Validaciones
    if (contrasena !== contrasena2) {
      return mostrarAlerta('Las contraseñas no coinciden');
    }

    if (!validarContrasena(contrasena)) {
      return mostrarAlerta('La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
    }

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, contrasena, adminCode })
      });

      const data = await response.text();
      
      if (!response.ok) {
        throw new Error(data);
      }

      mostrarAlerta('Registro exitoso. Ahora puedes iniciar sesión', 'success');
      registerForm.reset();
      window.location.hash = '#form-login';
    } catch (error) {
      mostrarAlerta(error.message);
    }
  });

  // Manejar login
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nombre = loginForm.nombre.value;
    const contrasena = loginForm.contrasena.value;

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, contrasena })
      });

      const data = await response.text();
      
      if (!response.ok) {
        throw new Error(data);
      }

      // Redirigir al index después de login exitoso
      window.location.href = '/index.html';
    } catch (error) {
      mostrarAlerta(error.message);
    }
  });

  // Manejar cambio entre login y registro
  window.addEventListener('hashchange', function() {
    if (window.location.hash === '#register') {
      document.querySelector('#form-login').style.display = 'none';
      document.querySelector('#register').style.display = 'block';
    } else {
      document.querySelector('#form-login').style.display = 'block';
      document.querySelector('#register').style.display = 'none';
    }
  });

  // Estado inicial
  if (window.location.hash === '#register') {
    document.querySelector('#form-login').style.display = 'none';
    document.querySelector('#register').style.display = 'block';
  }
});