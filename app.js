/********************************************
 * app.js
 * Backend con Node.js, Express y PostgreSQL (Neon)
 * Incluye validación de patrones SQL y HTML
 ********************************************/

// --------------------- DEPENDENCIAS PRINCIPALES --------------------- //
const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");

// Para sanitizar HTML y detectar etiquetas maliciosas
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require("dompurify");

// Para manejar sesiones
const session = require("express-session");

// Para encriptar contraseñas
const bcryptjs = require("bcryptjs");

// (Opcional) Para JWT, si lo usas en algún momento
const jwt = require("jsonwebtoken");
const SECRET_KEY = "tu_secreto_super_seguro";

// --------------------- CONFIGURACIÓN DE DOMPurify --------------------- //
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// --------------------- CREACIÓN DE LA APP DE EXPRESS --------------------- //
const app = express();

// --------------------- CONFIGURACIÓN DE CONEXIÓN A POSTGRESQL (NEON) --------------------- //
const db = new Pool({
  // Reemplaza esta conexión con la tuya propia
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qsrFJBo1a0Xf@ep-purple-tree-a5qalheh-pooler.us-east-2.aws.neon.tech/scp_database?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

/**
 * sanitizeField(fieldValue):
 *  - Verifica y bloquea patrones T-SQL básicos: ;  '  --  /* ... */ // xp_
   //Sanitiza HTML para evitar inyección de etiquetas <script> u otras.;
   //Si detecta algo prohibido, lanza un Error con mensaje específico. **//
function sanitizeField(fieldValue) {
  // Patrones que queremos bloquear (inyección T-SQL)
  const forbiddenPatterns = [
    /;/g,                 // punto y coma
    /'/g,                 // comilla simple
    /--/g,                // doble guión (comentario en SQL)
    /\/\*[\s\S]*?\*\//g,  // comentario /* ... */ multilinea
    /\bxp_/gi             // secuencia xp_ (ignore case)
  ];

  // Si se detecta alguno de estos patrones, se lanza un Error
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(fieldValue)) {
      throw new Error("Se detectaron patrones SQL no permitidos en la entrada.");
    }
  });

  // Luego sanitizamos HTML con DOMPurify
  const sanitized = DOMPurify.sanitize(fieldValue);

  // Si DOMPurify modificó algo, significa que había HTML no permitido
  if (sanitized !== fieldValue) {
    throw new Error("Se han detectado etiquetas HTML no permitidas en la entrada.");
  }

  return sanitized;
}

// --------------------- MIDDLEWARES GLOBALES --------------------- //
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos de la carpeta "public"
app.use(express.static("public"));

// --------------------- SESIONES (LOGIN/LOGOUT) --------------------- //
app.use(session({
  secret: "clave-ultra-secreta", // Debe ser un secreto seguro en producción
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// --------------------- RUTA: REGISTRO DE USUARIO --------------------- //
app.post("/auth/register", async (req, res) => {
  try {
    // Sanitizamos nombre y contraseña
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);

    // Hashear la contraseña con bcryptjs
    const hashedPassword = await bcryptjs.hash(contrasena, 10);

    // Verificar si el usuario ya existe en la BD
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length > 0) {
      // Si ya existe, enviamos un error con status 409
      return res.status(409).send("El usuario ya existe.");
    }

    // Insertar usuario nuevo
    await db.query("INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2)", [nombre, hashedPassword]);

    // Respuesta exitosa
    res.send("Usuario registrado correctamente.");
  } catch (err) {
    // Si hay algún error (incluyendo sanitizeField), enviamos el mensaje específico
    return res.status(400).send(err.message);
  }
});

// --------------------- RUTA: LOGIN DE USUARIO --------------------- //
app.post("/auth/login", async (req, res) => {
  try {
    // Sanitizamos nombre y contraseña
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);

    // Buscar el usuario en la BD
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length === 0) {
      return res.status(401).send("Usuario no encontrado.");
    }

    // Comparar contraseñas (verificamos el hash en la BD)
    const validPass = await bcryptjs.compare(contrasena, result.rows[0].contrasena);
    if (!validPass) {
      return res.status(401).send("Contraseña incorrecta.");
    }

    // Guardar el nombre de usuario en la sesión
    req.session.usuario = result.rows[0].nombre;

    // Respuesta exitosa
    res.send("Inicio de sesión exitoso.");
  } catch (err) {
    // Enviamos mensaje específico si falla la sanitización
    return res.status(400).send(err.message);
  }
});

// --------------------- RUTA: VERIFICAR SESIÓN --------------------- //
app.get("/auth/session", (req, res) => {
  // Si existe req.session.usuario, significa que hay sesión iniciada
  if (req.session.usuario) {
    res.json({ usuario: req.session.usuario });
  } else {
    res.status(401).send("No has iniciado sesión.");
  }
});

// --------------------- RUTA: CERRAR SESIÓN --------------------- //
app.post("/auth/logout", (req, res) => {
  req.session.destroy(); // Destruimos la sesión
  res.send("Sesión cerrada.");
});

// --------------------- RUTAS PARA GESTIONAR SCPs --------------------- //

/**
 * 1) OBTENER TODOS LOS SCPs
 *    - GET /scps
 */
app.get("/scps", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM scps");
    res.json(rows);
  } catch (err) {
    res.status(500).send("Error al obtener los SCPs.");
  }
});

/**
 * 2) CREAR UN NUEVO SCP
 *    - POST /scps
 */
app.post("/scps", async (req, res) => {
  try {
    // Extraemos campos del body
    let {
      numero_scp,
      clasificacion_contencion,
      nivel_peligro,
      ubicacion_actual,
      estado_investigacion,
      descripcion
    } = req.body;

    // Validamos que al menos vengan estos campos
    if (!numero_scp || !descripcion) {
      return res.status(400).send("Número SCP y descripción son obligatorios.");
    }

    // Sanitizamos todos los campos
    numero_scp = sanitizeField(numero_scp);
    clasificacion_contencion = sanitizeField(clasificacion_contencion || "");
    nivel_peligro = sanitizeField(nivel_peligro || "");
    ubicacion_actual = sanitizeField(ubicacion_actual || "");
    estado_investigacion = sanitizeField(estado_investigacion || "");
    descripcion = sanitizeField(descripcion);

    // Insertamos en la BD
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
    // Si falla la sanitización o la inserción, enviamos error
    return res.status(400).send(err.message);
  }
});

/**
 * 3) BUSCAR UN SCP POR NUMERO
 *    - GET /scps/buscar?numero_scp=XXX
 */
app.get("/scps/buscar", async (req, res) => {
  try {
    const { numero_scp } = req.query;
    if (!numero_scp) {
      return res.status(400).send("Falta el parámetro numero_scp en la URL.");
    }

    // Sanitizamos
    const sanitizedNumeroSCP = sanitizeField(numero_scp);

    // Buscamos en la BD
    const { rows } = await db.query("SELECT * FROM scps WHERE numero_scp = $1", [sanitizedNumeroSCP]);

    if (rows.length === 0) {
      return res.status(404).send("No se encontró el SCP con ese número.");
    }

    res.json(rows[0]);
  } catch (err) {
    return res.status(400).send(err.message);
  }
});

/**
 * 4) OBTENER UN SCP POR ID
 *    - GET /scps/:id
 */
app.get("/scps/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos por ID
    const { rows } = await db.query("SELECT * FROM scps WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).send("No se encontró el SCP con ese ID.");
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).send("Error al buscar el SCP por ID.");
  }
});

/**
 * 5) EDITAR UN SCP
 *    - PUT /scps/:id
 */
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

    // Validamos campos mínimos
    if (!numero_scp || !descripcion) {
      return res.status(400).send("Número SCP y descripción son obligatorios.");
    }

    // Sanitizamos
    numero_scp = sanitizeField(numero_scp);
    clasificacion_contencion = sanitizeField(clasificacion_contencion || "");
    nivel_peligro = sanitizeField(nivel_peligro || "");
    ubicacion_actual = sanitizeField(ubicacion_actual || "");
    estado_investigacion = sanitizeField(estado_investigacion || "");
    descripcion = sanitizeField(descripcion);

    // Actualizamos en la BD
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
    return res.status(400).send(err.message);
  }
});

/**
 * 6) BORRAR UN SCP
 *    - DELETE /scps/:id
 */
app.delete("/scps/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Borramos de la BD
    const result = await db.query("DELETE FROM scps WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).send("No se encontró el SCP a eliminar.");
    }

    res.send("SCP eliminado con éxito.");
  } catch (err) {
    res.status(500).send("Error al eliminar el SCP.");
  }
});

// --------------------- INICIAR SERVIDOR --------------------- //
app.listen(3000, () => {
  console.log("✅ Servidor escuchando en el puerto 3000");
});
