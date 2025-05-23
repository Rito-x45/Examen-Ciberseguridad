const express         = require("express");
const { Pool }        = require("pg");
const bodyParser      = require("body-parser");
const jsdom           = require("jsdom");
const { JSDOM }       = jsdom;
const createDOMPurify = require("dompurify");
const session         = require("express-session");
const bcryptjs        = require("bcryptjs");
require("dotenv").config();

const window    = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
const app       = express();
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function sanitizeField(value) {
  const forbidden = [/;/g, /'/g, /--/g, /\/\*[\s\S]*?\*\//g, /\bxp_/gi];
  forbidden.forEach(pat => {
    if (pat.test(value)) throw new Error("Entrada contiene patrones SQL prohibidos.");
  });
  const clean = DOMPurify.sanitize(value);
  if (clean !== value) throw new Error("Se detectaron etiquetas HTML no permitidas.");
  return clean;
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "clave-ultra-secreta",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// ===== Autenticación =====
app.post("/auth/register", async (req, res) => {
  try {
    const nombre    = sanitizeField(req.body.nombre);
    const pass      = sanitizeField(req.body.contrasena);
    const adminCode = req.body.adminCode ? sanitizeField(req.body.adminCode) : "";
    const hash      = await bcryptjs.hash(pass, 10);

    const { rows } = await db.query("SELECT 1 FROM usuarios WHERE nombre=$1", [nombre]);
    if (rows.length) return res.status(409).send("El usuario ya existe.");

    let rol = "user";
    if (adminCode) {
      if (adminCode !== "admi4530") return res.status(403).send("Código admin inválido.");
      rol = "admin";
    }

    await db.query(
      "INSERT INTO usuarios(nombre, contrasena, rol) VALUES($1,$2,$3)",
      [nombre, hash, rol]
    );
    res.send("Usuario registrado correctamente.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const nombre = sanitizeField(req.body.nombre);
    const pass   = sanitizeField(req.body.contrasena);

    const { rows } = await db.query("SELECT * FROM usuarios WHERE nombre=$1", [nombre]);
    if (!rows.length) return res.status(401).send("Usuario no encontrado.");

    const valid = await bcryptjs.compare(pass, rows[0].contrasena);
    if (!valid) return res.status(401).send("Contraseña incorrecta.");

    req.session.usuario = rows[0].nombre;
    req.session.rol     = rows[0].rol;
    res.send("Inicio de sesión exitoso.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.get("/auth/session", (req, res) => {
  if (!req.session.usuario) return res.status(401).send("No has iniciado sesión.");
  res.json({ usuario: req.session.usuario, rol: req.session.rol });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Error al cerrar sesión.");
    res.send("Sesión cerrada.");
  });
});

// ===== Misiones =====
app.get("/misiones", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM misiones ORDER BY id");
    res.json(rows);
  } catch {
    res.status(500).send("Error al obtener misiones.");
  }
});

app.get("/misiones/:id", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM misiones WHERE id = $1", [req.params.id]);
    if (!rows.length) return res.status(404).send("Misión no encontrada.");
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send("Error al buscar misión.");
  }
});

app.post("/misiones", async (req, res) => {
  try {
    let { nombre, ubicacion, objetivo, unidad, comandante, fecha, nivel_amenaza, estado } = req.body;
    if (!nombre || !objetivo) return res.status(400).send("Nombre y objetivo son obligatorios.");
    [nombre, ubicacion, objetivo, unidad, comandante, nivel_amenaza, estado] =
      [nombre, ubicacion||"", objetivo, unidad||"", comandante||"", nivel_amenaza||"", estado||""]
      .map(v => sanitizeField(v));

    await db.query(
      `INSERT INTO misiones
         (nombre, ubicacion, objetivo, unidad, comandante, fecha, nivel_amenaza, estado)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [nombre, ubicacion, objetivo, unidad, comandante, fecha, nivel_amenaza, estado]
    );
    res.send("Misión creada con éxito.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.put("/misiones/:id", async (req, res) => {
  try {
    let { nombre, ubicacion, objetivo, unidad, comandante, fecha, nivel_amenaza, estado } = req.body;
    if (!nombre || !objetivo) return res.status(400).send("Nombre y objetivo son obligatorios.");
    [nombre, ubicacion, objetivo, unidad, comandante, nivel_amenaza, estado] =
      [nombre, ubicacion||"", objetivo, unidad||"", comandante||"", nivel_amenaza||"", estado||""]
      .map(v => sanitizeField(v));

    const result = await db.query(
      `UPDATE misiones SET
         nombre=$1, ubicacion=$2, objetivo=$3, unidad=$4,
         comandante=$5, fecha=$6, nivel_amenaza=$7, estado=$8
       WHERE id=$9`,
      [nombre, ubicacion, objetivo, unidad, comandante, fecha, nivel_amenaza, estado, req.params.id]
    );
    if (!result.rowCount) return res.status(404).send("Misión no encontrada.");
    res.send("Misión actualizada con éxito.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.delete("/misiones/:id", async (req, res) => {
  try {
    const result = await db.query("DELETE FROM misiones WHERE id=$1", [req.params.id]);
    if (!result.rowCount) return res.status(404).send("Misión no encontrada.");
    res.send("Misión eliminada con éxito.");
  } catch {
    res.status(500).send("Error al eliminar misión.");
  }
});

// ===== Usuarios (admin) =====
app.get("/users", async (req, res) => {
  if (req.session.rol !== "admin") return res.status(403).send("Acceso denegado.");
  const { rows } = await db.query("SELECT id, nombre, rol FROM usuarios ORDER BY id");
  res.json(rows);
});

app.delete("/users/:id", async (req, res) => {
  if (req.session.rol !== "admin") return res.status(403).send("Acceso denegado.");
  const result = await db.query("DELETE FROM usuarios WHERE id = $1", [req.params.id]);
  if (!result.rowCount) return res.status(404).send("Usuario no encontrado.");
  res.send("Usuario eliminado exitosamente.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
