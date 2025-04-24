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
  