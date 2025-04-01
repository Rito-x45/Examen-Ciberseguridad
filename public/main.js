document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("formulario-scp");
  const alertaDiv = document.getElementById("alerta");
  const tablaBody = document.querySelector("#tabla-scps tbody");
  const formularioBuscar = document.getElementById("formulario-buscar");
  const resultadoBusqueda = document.getElementById("resultado-busqueda");
  const logoutBtn = document.getElementById("logout-btn");

  // Función para mostrar alertas
  function mostrarAlerta(mensaje, esError = false) {
    alertaDiv.textContent = mensaje;
    alertaDiv.className = esError ? "alert error" : "alert";
    setTimeout(() => {
      alertaDiv.textContent = "";
      alertaDiv.className = "";
    }, 3000);
  }

  // Listener para detectar el cierre de sesión en otras pestañas
  window.addEventListener("storage", (event) => {
    if (event.key === "logout") {
      window.location.href = "/login.html";
    }
  });

  // Función para cerrar sesión desde el botón
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const res = await fetch("/auth/logout", { method: "POST" });
      if (res.ok) {
        localStorage.setItem("logout", Date.now());
        window.location.href = "/login.html";
      } else {
        mostrarAlerta("Error al cerrar sesión", true);
      }
    });
  }

  // Cargar y mostrar los SCPs
  function cargarSCPs() {
    fetch("/scps")
      .then((response) => response.json())
      .then((scps) => {
        tablaBody.innerHTML = "";
        scps.forEach((scp) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${scp.numero_scp}</td>
            <td>${scp.clasificacion_contencion}</td>
            <td>${scp.nivel_peligro}</td>
            <td>${scp.ubicacion_actual}</td>
            <td>${scp.estado_investigacion}</td>
            <td>${scp.descripcion}</td>
            <td>
              <button class="editar-btn" data-id="${scp.id}">Editar</button>
              <button class="borrar-btn" data-id="${scp.id}">Borrar</button>
            </td>
          `;
          tablaBody.appendChild(row);
        });
      })
      .catch((error) => {
        console.error("Error al cargar los SCPs:", error);
        mostrarAlerta("Error al cargar los SCPs", true);
      });
  }

  // Agregar un nuevo SCP
  formulario.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(formulario);
    const data = Object.fromEntries(formData.entries());
    fetch("/scps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) =>
        response.text().then((text) => ({ status: response.status, text }))
      )
      .then(({ status, text }) => {
        if (status >= 400) {
          mostrarAlerta(text, true);
        } else {
          mostrarAlerta(text, false);
          formulario.reset();
          cargarSCPs();
        }
      })
      .catch((error) => {
        console.error("Error al agregar el SCP:", error);
        mostrarAlerta("Error al agregar el SCP", true);
      });
  });

  // Buscar un SCP por número
  formularioBuscar.addEventListener("submit", (e) => {
    e.preventDefault();
    const numero_scp = document.getElementById("buscar-numero").value.trim();
    if (/<.*?>/.test(numero_scp)) {
      mostrarAlerta("Entrada no válida. Se detectaron caracteres no permitidos en el número SCP.", true);
      return;
    }
    if (!numero_scp) {
      mostrarAlerta("Ingresa un número SCP a buscar", true);
      return;
    }
    fetch("/scps/buscar?numero_scp=" + encodeURIComponent(numero_scp))
      .then((r) => {
        if (!r.ok) {
          throw new Error("No se encontró el SCP con ese número");
        }
        return r.json();
      })
      .then((scp) => {
        resultadoBusqueda.innerHTML = `
          <h3>Resultado de la Búsqueda:</h3>
          <p><strong>Número SCP:</strong> ${scp.numero_scp}</p>
          <p><strong>Clasificación:</strong> ${scp.clasificacion_contencion}</p>
          <p><strong>Nivel de Peligro:</strong> ${scp.nivel_peligro}</p>
          <p><strong>Ubicación:</strong> ${scp.ubicacion_actual}</p>
          <p><strong>Estado:</strong> ${scp.estado_investigacion}</p>
          <p><strong>Descripción:</strong> ${scp.descripcion}</p>
        `;
      })
      .catch((error) => {
        resultadoBusqueda.innerHTML = `<p style="color:red;">${error.message}</p>`;
      });
  });

  // Función para borrar un SCP
  function borrarSCP(id) {
    if (!confirm("¿Estás seguro de borrar este SCP?")) return;
    fetch(`/scps/${id}`, { method: "DELETE" })
      .then((r) => r.text().then((text) => ({ status: r.status, text })))
      .then(({ status, text }) => {
        if (status >= 400) {
          mostrarAlerta(text, true);
        } else {
          mostrarAlerta(text, false);
          cargarSCPs();
        }
      })
      .catch((err) => {
        mostrarAlerta("Error al borrar el SCP", true);
      });
  }

  // Función para editar un SCP mediante prompts
  function editarSCP(id) {
    fetch(`/scps/${id}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("No se encontró el SCP con ese ID");
        }
        return r.json();
      })
      .then((scp) => {
        const numero_scp = prompt("Número SCP:", scp.numero_scp);
        if (numero_scp === null) return;
        if (/<.*?>/.test(numero_scp)) {
          mostrarAlerta("Entrada no válida. Se detectaron caracteres no permitidos en el número SCP.", true);
          return;
        }
        const clasificacion_contencion = prompt("Clasificación:", scp.clasificacion_contencion);
        if (clasificacion_contencion === null) return;
        const nivel_peligro = prompt("Nivel de Peligro:", scp.nivel_peligro);
        if (nivel_peligro === null) return;
        const ubicacion_actual = prompt("Ubicación Actual:", scp.ubicacion_actual);
        if (ubicacion_actual === null) return;
        const estado_investigacion = prompt("Estado de Investigación:", scp.estado_investigacion);
        if (estado_investigacion === null) return;
        const descripcion = prompt("Descripción:", scp.descripcion);
        if (descripcion === null) return;
        const data = {
          numero_scp,
          clasificacion_contencion,
          nivel_peligro,
          ubicacion_actual,
          estado_investigacion,
          descripcion
        };
        fetch(`/scps/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((resp) => resp.text().then((text) => ({ status: resp.status, text })))
          .then(({ status, text }) => {
            if (status >= 400) {
              mostrarAlerta(text, true);
            } else {
              mostrarAlerta(text, false);
              cargarSCPs();
            }
          })
          .catch((err) => {
            mostrarAlerta("Error al actualizar el SCP", true);
          });
      })
      .catch((err) => {
        mostrarAlerta(err.message, true);
      });
  }

  // Delegación de eventos para botones de editar y borrar
  tablaBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("borrar-btn")) {
      const id = e.target.getAttribute("data-id");
      borrarSCP(id);
    } else if (e.target.classList.contains("editar-btn")) {
      const id = e.target.getAttribute("data-id");
      editarSCP(id);
    }
  });

  cargarSCPs();
});
