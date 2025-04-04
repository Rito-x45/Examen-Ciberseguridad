document.addEventListener("DOMContentLoaded", () => {
  const alertaDiv = document.getElementById("alerta");
  const tablaBody = document.querySelector("#tabla-scps tbody");
  const formulario = document.getElementById("formulario-scp");
  const formularioBuscar = document.getElementById("formulario-buscar");
  const resultadoBusqueda = document.getElementById("resultado-busqueda");
  const logoutBtn = document.getElementById("logout-btn");

  // Elementos de la sección de administrador
  const adminSection = document.getElementById("admin-section");
  const verUsuariosBtn = document.getElementById("ver-usuarios-btn");
  const tablaUsuariosBody = document.querySelector("#tabla-usuarios tbody");

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
        // Sincronizar logout en todas las pestañas
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
      headers: { "Content-Type": "application/json" },
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
      mostrarAlerta("Entrada no válida. Se detectaron caracteres no permitidos.", true);
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

  // Borrar un SCP
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

  // Editar un SCP (con prompts)
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
          mostrarAlerta("Entrada no válida. Se detectaron caracteres no permitidos.", true);
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

  // Delegar eventos para botones de editar y borrar en la tabla de SCPs
  tablaBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("borrar-btn")) {
      const id = e.target.getAttribute("data-id");
      borrarSCP(id);
    } else if (e.target.classList.contains("editar-btn")) {
      const id = e.target.getAttribute("data-id");
      editarSCP(id);
    }
  });

  // Verificar rol de la sesión y mostrar la sección de administración si es admin
  fetch("/auth/session")
    .then((res) => {
      if (!res.ok) throw new Error("No has iniciado sesión");
      return res.json();
    })
    .then((data) => {
      // data.rol -> 'admin' o 'user'
      if (data.rol === "admin") {
        adminSection.style.display = "block";
      }
    })
    .catch((err) => {
      window.location.href = "/login.html";
    });

  // Ver usuarios (solo admin)
  if (verUsuariosBtn) {
    verUsuariosBtn.addEventListener("click", () => {
      fetch("/users")
        .then((res) => {
          if (!res.ok) throw new Error("Error al obtener usuarios");
          return res.json();
        })
        .then((usuarios) => {
          tablaUsuariosBody.innerHTML = "";
          usuarios.forEach((u) => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${u.id}</td>
              <td>${u.nombre}</td>
              <td>${u.rol}</td>
              <td>
                <button class="borrar-usuario" data-id="${u.id}">Borrar</button>
              </td>
            `;
            tablaUsuariosBody.appendChild(row);
          });
        })
        .catch((err) => {
          alert(err.message);
        });
    });
  }

  // Borrar usuario (solo admin)
  if (tablaUsuariosBody) {
    tablaUsuariosBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("borrar-usuario")) {
        const userId = e.target.getAttribute("data-id");
        if (confirm("¿Estás seguro de borrar a este usuario?")) {
          fetch(`/users/${userId}`, { method: "DELETE" })
            .then((res) => res.text())
            .then((msg) => {
              alert(msg);
              verUsuariosBtn.click();
            })
            .catch((err) => alert("Error al borrar usuario"));
        }
      }
    });
  }

  // Cargar SCPs al inicio
  cargarSCPs();
});
