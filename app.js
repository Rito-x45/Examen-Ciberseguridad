/********************************************
 * app.js
 * Backend con Node.js, Express y MySQL
 ********************************************/

const express = require("express");
const { Client } = require("pg"); // Usamos pg para PostgreSQL
const bodyParser = require("body-parser");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require("dompurify");

// Configuración de DOMPurify para sanitizar entradas
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const app = express();

// FUNCIONES DE VALIDACIÓN Y SANITIZACIÓN
function sanitizeField(fieldValue) {
  const sanitized = DOMPurify.sanitize(fieldValue);
  if (sanitized !== fieldValue) {
    throw new Error("Se han detectado etiquetas HTML no permitidas.");
  }
  return sanitized;
}

// Conexión a la base de datos PostgreSQL (Neon)
const db = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qsrFJBo1a0Xf@ep-purple-tree-a5qalheh-pooler.us-east-2.aws.neon.tech/scp_database?sslmode=require",
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err);
    process.exit(1);
  }
  console.log("Conexión a la base de datos establecida.");
});

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); 

// 1) OBTENER TODOS LOS SCP (GET /scps)
app.get("/scps", (req, res) => {
  db.query("SELECT * FROM scps", (err, results) => {
    if (err) {
      return res.status(500).send("Error al obtener los SCPs.");
    }
    res.json(results);
  });
});

// 2) CREAR UN NUEVO SCP (POST /scps)
app.post("/scps", (req, res) => {
  try {
    let { numero_scp, clasificacion_contencion, nivel_peligro, ubicacion_actual, estado_investigacion, descripcion } = req.body;

    if (!numero_scp || !descripcion) {
      return res.status(400).send("Número SCP y descripción son obligatorios.");
    }

    numero_scp = sanitizeField(numero_scp);
    clasificacion_contencion = sanitizeField(clasificacion_contencion || "");
    nivel_peligro = sanitizeField(nivel_peligro || "");
    ubicacion_actual = sanitizeField(ubicacion_actual || "");
    estado_investigacion = sanitizeField(estado_investigacion || "");
    descripcion = sanitizeField(descripcion);

    db.query(
      `INSERT INTO scps 
       (numero_scp, clasificacion_contencion, nivel_peligro, ubicacion_actual, estado_investigacion, descripcion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        numero_scp,
        clasificacion_contencion,
        nivel_peligro,
        ubicacion_actual,
        estado_investigacion,
        descripcion
      ],
      (err) => {
        if (err) {
          return res.status(500).send("Error al crear el SCP. Verifica que no exista un SCP con el mismo número.");
        }
        res.send("SCP creado con éxito.");
      }
    );
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

// 3) BUSCAR UN SOLO SCP POR NUMERO (GET /scps/buscar?numero_scp=XXX)
app.get("/scps/buscar", (req, res) => {
  const { numero_scp } = req.query;
  if (!numero_scp) {
    return res.status(400).send("Falta el parámetro numero_scp en la URL.");
  }

  try {
    const sanitizedNumeroSCP = sanitizeField(numero_scp);

    db.query("SELECT * FROM scps WHERE numero_scp = ?", [sanitizedNumeroSCP], (err, results) => {
      if (err) {
        return res.status(500).send("Error al buscar el SCP.");
      }
      if (results.length === 0) {
        return res.status(404).send("No se encontró el SCP con ese número.");
      }
      res.json(results[0]);
    });
  } catch (error) {
    return res.status(400).send("Entrada no válida. Se detectaron caracteres no permitidos.");
  }
});

// 4) OBTENER UN SCP POR ID (GET /scps/:id) -> útil para la edición
app.get("/scps/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM scps WHERE id = ?", [id], (err, results) => {
    if (err) {
      return res.status(500).send("Error al buscar el SCP por ID.");
    }
    if (results.length === 0) {
      return res.status(404).send("No se encontró el SCP con ese ID.");
    }
    res.json(results[0]);
  });
});

// 5) EDITAR/ACTUALIZAR UN SCP (PUT /scps/:id)
app.put("/scps/:id", (req, res) => {
  const { id } = req.params;
  let {
    numero_scp,
    clasificacion_contencion,
    nivel_peligro,
    ubicacion_actual,
    estado_investigacion,
    descripcion
  } = req.body;

  if (!numero_scp || !descripcion) {
    return res.status(400).send("Número SCP y descripción son obligatorios.");
  }

  try {
    numero_scp = sanitizeField(numero_scp);
    clasificacion_contencion = sanitizeField(clasificacion_contencion || "");
    nivel_peligro = sanitizeField(nivel_peligro || "");
    ubicacion_actual = sanitizeField(ubicacion_actual || "");
    estado_investigacion = sanitizeField(estado_investigacion || "");
    descripcion = sanitizeField(descripcion);
  } catch (error) {
    return res.status(400).send("Entrada no válida. Se detectaron caracteres no permitidos.");
  }

  db.query(
    `UPDATE scps
     SET numero_scp = ?, clasificacion_contencion = ?, nivel_peligro = ?, ubicacion_actual = ?, estado_investigacion = ?, descripcion = ?
     WHERE id = ?`,
    [
      numero_scp,
      clasificacion_contencion,
      nivel_peligro,
      ubicacion_actual,
      estado_investigacion,
      descripcion,
      id
    ],
    (err, result) => {
      if (err) {
        return res.status(500).send("Error al actualizar el SCP.");
      }
      if (result.affectedRows === 0) {
        return res.status(404).send("No se encontró el SCP a actualizar.");
      }
      res.send("SCP actualizado con éxito.");
    }
  );
});

// 6) BORRAR UN SCP (DELETE /scps/:id)
app.delete("/scps/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM scps WHERE id = ?", [id], (err, result) => {
    if (err) {
      return res.status(500).send("Error al eliminar el SCP.");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("No se encontró el SCP a eliminar.");
    }
    res.send("SCP eliminado con éxito.");
  });
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Servidor escuchando en el puerto 3000");
});
