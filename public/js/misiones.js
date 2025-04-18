// public/js/misiones.js
document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv  = document.getElementById("alerta");
  const formMision = document.getElementById("form-mision");
  const tbody       = document.querySelector("#tabla-misiones tbody");
  const searchInput = document.getElementById("search-input");
  const btnNew      = document.getElementById("btn-new");

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

  btnNew.addEventListener("click", () => {
    const showing = formMision.style.display !== "none";
    formMision.style.display = showing ? "none" : "grid";
    if (showing) {
      formMision.reset();
      delete formMision.dataset.id;
    }
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (badInput(q)) {
      showAlert("Caracteres inválidos detectados.", true);
      searchInput.value = "";
      cargar();
    } else {
      cargar(q);
    }
  });

  formMision.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formMision));
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

  tbody.addEventListener("click", async e => {
    const id = e.target.dataset.id;

    if (e.target.classList.contains("del")) {
      if (!confirm("¿Eliminar misión?")) return;
      const res = await fetch(`/misiones/${id}`, { method: "DELETE" });
      const msg = await res.text();
      showAlert(msg, !res.ok);
      cargar();
      return;
    }

    if (e.target.classList.contains("edit")) {
      try {
        const res = await fetch(`/misiones/${id}`);
        if (!res.ok) throw new Error(res.statusText);
        const m = await res.json();
        Object.entries(m).forEach(([key, val]) => {
          const fld = formMision.elements[key];
          if (fld) fld.value = val || "";
        });
        formMision.dataset.id = id;
        formMision.style.display = "grid";
        formMision.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {
        showAlert("No se pudo cargar la misión: " + err.message, true);
      }
    }
  });

  cargar();
});
