document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.getElementById("nav-toggle");
    const nav = document.querySelector("nav");
    navToggle?.addEventListener("click", () => nav.classList.toggle("open"));
  
    document.querySelectorAll('a[href="#login"]').forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        document.getElementById("login-form").classList.toggle("active");
        nav.classList.remove("open");
      });
    });
  });
  

  // Verificar sesión al cargar la página
async function verificarSesion() {
  try {
    const response = await fetch('/auth/session');
    const data = await response.json();
    
    if (data.usuario && window.location.pathname === '/login.html') {
      window.location.href = '/index.html';
    }
  } catch (error) {
    console.error('Error verificando sesión:', error);
  }
}

document.addEventListener('DOMContentLoaded', verificarSesion);