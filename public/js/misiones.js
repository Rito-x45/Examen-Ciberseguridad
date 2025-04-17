document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv  = document.getElementById("alerta");
  const formMision = document.getElementById("form-mision");
  const tbody       = document.querySelector("#tabla-misiones tbody");

  function showAlert(msg, isErr=false) {
    alertaDiv.textContent = msg;
    alertaDiv.style.background = isErr
      ? "rgba(255,50,50,0.8)"
      : "rgba(255,165,0,0.8)";
    setTimeout(() => (alertaDiv.textContent = ""), 4000);
  }

  function badInput(text) {
    return /<[^>]+>/.test(text) || /;|--|\/\*/.test(text);
  }

  async function cargar() {
    try {
      const res = await fetch("/misiones");
      const data = await res.json();
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

  if (formMision) {
    formMision.addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formMision));
      for (const key in data) {
        if (badInput(data[key])) {
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
      if (e.target.classList.contains("edit")) {
        const res = await fetch(`/misiones/${id}`);
        const m   = await res.json();
        Object.keys(m).forEach(k => {
          if (formMision.elements[k]) formMision.elements[k].value = m[k] || "";
        });
        formMision.dataset.id = id;
      }
      if (e.target.classList.contains("del")) {
        if (!confirm("¿Eliminar misión?")) return;
        const res = await fetch(`/misiones/${id}`, { method: "DELETE" });
        const msg = await res.text();
        showAlert(msg, false);
        cargar();
      }
    });

    cargar();
  }
});
