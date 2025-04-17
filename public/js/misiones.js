// public/js/misiones.js
document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv    = document.getElementById("alerta");
  const formMision   = document.getElementById("form-mision");
  const tbody         = document.querySelector("#tabla-misiones tbody");
  const btnSearch     = document.getElementById("btn-search");
  const searchInput   = document.getElementById("search-input");
  const btnNew        = document.getElementById("btn-new");

  function showAlert(msg, isErr = false) {
    alertaDiv.textContent = msg;
    alertaDiv.style.background = isErr
      ? "rgba(255,50,50,0.8)"
      : "rgba(255,165,0,0.8)";
    setTimeout(() => (alertaDiv.textContent = ""), 3000);
  }

  function badInput(text) {
    return /<[^>]+>/.test(text) || /;|--|\/\*/.test(text);
  }

  // Carga todas o filtra por nombre
  async function cargar(filter = "") {
    try {
      const res = await fetch("/misiones");
      let data = await res.json();
      if (filter) {
        data = data.filter(m =>
          m.nombre.toLowerCase().includes(filter.toLowerCase())
        );
      }
      tbody.innerHTML = "";
      data.forEach(m => {
        tbody.innerHTML += `
          <tr>
            <td>${m.nombre}</td>
            <td>${m.ubicacion}</td>
            <td>${m.objetivo}</td>
            <td>${m.unidad}</td>
            <td>${m.comandante}</td>
            <td>${new Date(m.fecha).toLocaleDateString()}</td>
            <td>${m.nivel_amenaza}</td>
            <td>${m.estado}</td>
            <td>
              <button class="edit" data-id="${m.id}">Editar</button>
              <button class="del"  data-id="${m.id}">Borrar</button>
            </td>
          </tr>`;
      });
    } catch {
      showAlert("Error cargando misiones.", true);
    }
  }

  // Mostrar/ocultar el formulario
  btnNew.addEventListener("click", () => {
    formMision.style.display =
      formMision.style.display === "none" ? "grid" : "none";
    if (formMision.style.display === "none") formMision.reset(), delete formMision.dataset.id;
  });

  // Búsqueda por nombre
  btnSearch.addEventListener("click", () => {
    const q = searchInput.value.trim();
    cargar(q);
  });

  // CRUD: Crear o actualizar
  formMision.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formMision));
    // Validación básica
    for (const k in data) {
      if (badInput(data[k])) {
        showAlert("Caracteres inválidos detectados.", true);
        return;
      }
    }
    const id     = formMision.dataset.id;
    const url    = id ? `/misiones/${id}` : "/misiones";
    const method = id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const msg = await res.text();
    showAlert(msg, !res.ok);
    if (res.ok) {
      formMision.reset();
      delete formMision.dataset.id;
      cargar();
    }
  });

  // Editar / Borrar desde tabla
  tbody.addEventListener("click", async e => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("edit")) {
      const res = await fetch(`/misiones/${id}`);
      const m   = await res.json();
      Object.keys(m).forEach(k => {
        if (formMision.elements[k]) formMision.elements[k].value = m[k] || "";
      });
      formMision.dataset.id   = id;
      formMision.style.display = "grid";
    }
    if (e.target.classList.contains("del")) {
      if (!confirm("¿Eliminar misión?")) return;
      const res = await fetch(`/misiones/${id}`, { method: "DELETE" });
      const msg = await res.text();
      showAlert(msg, !res.ok);
      cargar();
    }
  });

  // Arranque: cargar todo
  cargar();
});
