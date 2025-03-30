/********************************************
 * app.js - Backend con Node.js, Express y PostgreSQL (Neon)
 ********************************************/
const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require("dompurify");
const session = require("express-session");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Si en algún momento usas JWT, aquí tienes la clave secreta
const SECRET_KEY = "tu_secreto_super_seguro";

// Configuración de DOMPurify para sanitizar entradas
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const app = express();

// 📌 Configuración de conexión a PostgreSQL (Neon)
const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qsrFJBo1a0Xf@ep-purple-tree-a5qalheh-pooler.us-east-2.aws.neon.tech/scp_database?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

/**
 * Función para verificar y limpiar campos de texto.
 * 1) Bloquea patrones T-SQL conocidos para inyección.
 * 2) Purifica etiquetas HTML (DOMPurify).
 * Lanza un Error si detecta algo no permitido.
 */
function sanitizeField(fieldValue) {
  // Bloquea patrones T-SQL
  const forbiddenPatterns = [
    /;/g,              // punto y coma
    /'/g,              // comilla simple
    /--/g,             // doble guión (comentario en SQL)
    /\/\*[\s\S]*?\*\//g, // comentario /* ... */ con multilinea
    /\bxp_/gi          // xp_ ignorando mayúsculas/minúsculas
  ];

  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(fieldValue)) {
      throw new Error("Se detectaron patrones SQL no permitidos en la entrada.");
    }
  });

  // Luego sanitizamos HTML con DOMPurify
  const sanitized = DOMPurify.sanitize(fieldValue);

  // Si DOMPurify modificó algo, se detectó HTML malicioso
  if (sanitized !== fieldValue) {
    throw new Error("Se han detectado etiquetas HTML no permitidas en la entrada.");
  }

  return sanitized;
}

// 📌 Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// =====================================
// ========== SESIONES / LOGIN =========
// =====================================
app.use(session({
  secret: "clave-ultra-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// 🚀 Registro de usuarios
app.post("/auth/register", async (req, res) => {
  try {
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);

    // Hashear la contraseña con bcryptjs
    const hashedPassword = await bcryptjs.hash(contrasena, 10);

    // Verificar si el usuario ya existe
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length > 0) {
      return res.status(409).send("El usuario ya existe.");
    }

    // Insertar usuario nuevo
    await db.query("INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2)", [nombre, hashedPassword]);
    res.send("Usuario registrado correctamente.");
  } catch (err) {
    res.status(500).send("Error al registrar usuario.");
  }
});

// 🚀 Login
app.post("/auth/login", async (req, res) => {
  try {
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);

    // Buscar el usuario
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length === 0) {
      return res.status(401).send("Usuario no encontrado.");
    }

    // Comparar contraseñas (hash con bcryptjs)
    const validPass = await bcryptjs.compare(contrasena, result.rows[0].contrasena);
    if (!validPass) {
      return res.status(401).send("Contraseña incorrecta.");
    }

    // Guardar sesión
    req.session.usuario = result.rows[0].nombre;
    res.send("Inicio de sesión exitoso.");
  } catch (err) {
    res.status(500).send("Error en el login.");
  }
});

// 🚀 Verificar sesión
app.get("/auth/session", (req, res) => {
  if (req.session.usuario) {
    res.json({ usuario: req.session.usuario });
  } else {
    res.status(401).send("No has iniciado sesión.");
  }
});

// 🚀 Cerrar sesión
app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.send("Sesión cerrada.");
});

// =====================================
// ========== RUTAS PARA SCP ===========
// =====================================

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
      [
        numero_scp,
        clasificacion_contencion,
        nivel_peligro,
        ubicacion_actual,
        estado_investigacion,
        descripcion
      ]
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
      [
        numero_scp,
        clasificacion_contencion,
        nivel_peligro,
        ubicacion_actual,
        estado_investigacion,
        descripcion,
        id
      ]
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

// Iniciar servidor en el puerto 3000
app.listen(3000, () => {
  console.log("✅ Servidor escuchando en el puerto 3000");
});
