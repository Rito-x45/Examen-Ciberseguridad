// --- Login/Register/Session Control ---
function saveSession(username) {
  localStorage.setItem('unsc_user', username);
}
function getSession() {
  return localStorage.getItem('unsc_user');
}
function clearSession() {
  localStorage.removeItem('unsc_user');
}

// --- Login Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toast = document.getElementById('toast');
  const path = window.location.pathname.split("/").pop();

  // Proteger páginas (excepto login/registro)
  if (!['login.html', 'registro.html', ''].includes(path)) {
    const user = getSession();
    if (!user) {
      window.location.href = "login.html";
    }
  }

  // Mostrar bienvenida si acaba de iniciar sesión
  if (getSession() && !['login.html','registro.html',''].includes(path)) {
    if (toast) {
      showToast(`¡Bienvenido, ${getSession()}, a la página de la UNSC!`);
      setTimeout(hideToast, 4000);
    }
  }

  // Login
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const user = loginForm.user.value.trim();
      const pass = loginForm.pass.value;
      if (user.length < 3 || pass.length < 3) {
        showToast("Usuario y contraseña deben tener al menos 3 caracteres.");
        return;
      }
      saveSession(user);
      showToast(`¡Bienvenido, ${user}, a la página de la UNSC!`);
      setTimeout(() => window.location.href = "index.html", 1500);
    };
  }

  // Registro
  if (registerForm) {
    registerForm.onsubmit = (e) => {
      e.preventDefault();
      const user = registerForm.reg_user.value.trim();
      const pass = registerForm.reg_pass.value;
      if (user.length < 3 || pass.length < 3) {
        showToast("Usuario y contraseña deben tener al menos 3 caracteres.");
        return;
      }
      saveSession(user);
      showToast(`¡Registro exitoso! Bienvenido, ${user}.`);
      setTimeout(() => window.location.href = "index.html", 1500);
    };
  }

  // Logout (en cada página protegida pon un botón con id="logoutBtn")
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      clearSession();
      window.location.href = "login.html";
    };
  }

  // --- Tabs (Nosotros) ---
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  if (tabLinks.length) {
    tabLinks.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        tabLinks.forEach(b => b.classList.remove('active'));
        tabContents.forEach(tc => tc.style.display = 'none');
        btn.classList.add('active');
        tabContents[idx].style.display = 'block';
      });
    });
    // Muestra la primera tab por defecto
    tabLinks[0].classList.add('active');
    tabContents[0].style.display = 'block';
  }
});

// --- Toast (mensaje de bienvenida) ---
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hide');
}
function hideToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('hide');
}
