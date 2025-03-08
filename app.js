/********************************************
 * app.js - Backend con Node.js, Express y PostgreSQL (Neon)
 ********************************************/

const express = require("express");
const { Pool } = require("pg"); // Usamos Pool en lugar de Client para mejor gestión de conexiones
const bodyParser = require("body-parser");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require("dompurify");

// Configuración de DOMPurify para sanitizar entradas
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const app = express();

// 📌 Configuración de conexión a PostgreSQL (Neon)
const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qsrFJBo1a0Xf@ep-purple-tree-a5qalheh-pooler.us-east-2.aws.neon.tech/scp_database?sslmode=require",
  ssl: { rejectUnauthorized: false } // 🔹 Importante para Neon en Render
});

// 📌 Función de validación y sanitización
function sanitizeField(fieldValue) {
  const sanitized = DOMPurify.sanitize(fieldValue);
  if (sanitized !== fieldValue) {
    throw new Error("Se han detectado etiquetas HTML no permitidas.");
  }
  return sanitized;
}

// 📌 Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// 📌 1) OBTENER TODOS LOS SCPs (GET /scps)
app.get("/scps", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM scps");
    res.json(rows);
  } catch (err) {
    res.status(500).send("Error al obtener los SCPs.");
  }
});

// 📌 2) CREAR UN NUEVO SCP (POST /scps)
app.post("/scps", async (req, res) => {
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

    await db.query(
      `INSERT INTO scps 
       (numero_scp, clasificacion_contencion, nivel_peligro, ubicacion_actual, estado_investigacion, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [numero_scp, clasificacion_contencion, nivel_peligro, ubicacion_actual, estado_investigacion, descripcion]
    );

    res.send("SCP creado con éxito.");
  } catch (err) {
    res.status(500).send("Error al crear el SCP. Verifica que no exista un SCP con el mismo número.");
  }
});

// 📌 3) BUSCAR UN SCP POR NUMERO (GET /scps/buscar?numero_scp=XXX)
app.get("/scps/buscar", async (req, res) => {
  try {
    const { numero_scp } = req.query;
    if (!numero_scp) {
      return res.status(400).send("Falta el parámetro numero_scp en la URL.");
    }

    const sanitizedNumeroSCP = sanitizeField(numero_scp);

    const { rows } = await db.query("SELECT * FROM scps WHERE numero_scp = $1", [sanitizedNumeroSCP]);

    if (rows.length === 0) {
      return res.status(404).send("No se encontró el SCP con ese número.");
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send("Error al buscar el SCP.");
  }
});

// 📌 4) OBTENER UN SCP POR ID (GET /scps/:id)
app.get("/scps/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query("SELECT * FROM scps WHERE id = $1", [id]);

    if (rows.length === 0) {
      return res.status(404).send("No se encontró el SCP con ese ID.");
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).send("Error al buscar el SCP por ID.");
  }
});

// 📌 5) EDITAR UN SCP (PUT /scps/:id)
app.put("/scps/:id", async (req, res) => {
  try {
    const { id } = req.params;
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

    const result = await db.query(
      `UPDATE scps
       SET numero_scp = $1, clasificacion_contencion = $2, nivel_peligro = $3, ubicacion_actual = $4, estado_investigacion = $5, descripcion = $6
       WHERE id = $7`,
      [numero_scp, clasificacion_contencion, nivel_peligro, ubicacion_actual, estado_investigacion, descripcion, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("No se encontró el SCP a actualizar.");
    }

    res.send("SCP actualizado con éxito.");
  } catch (err) {
    res.status(500).send("Error al actualizar el SCP.");
  }
});

// 📌 6) BORRAR UN SCP (DELETE /scps/:id)
app.delete("/scps/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("DELETE FROM scps WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).send("No se encontró el SCP a eliminar.");
    }

    res.send("SCP eliminado con éxito.");
  } catch (err) {
    res.status(500).send("Error al eliminar el SCP.");
  }
});

// 📌 Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("✅ Servidor escuchando en el puerto 3000");
});
