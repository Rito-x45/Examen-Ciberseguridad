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

/* ======== RUTAS AUTENTICACIÓN ======== */
app.post("/auth/register", async (req, res) => {
  try {
    const nombre    = sanitizeField(req.body.nombre);
    const pass      = sanitizeField(req.body.contrasena);
    const adminCode = req.body.adminCode ? sanitizeField(req.body.adminCode) : "";
    const hash      = await bcryptjs.hash(pass, 10);

    const { rows } = await db.query(
      "SELECT 1 FROM usuarios WHERE nombre=$1", [nombre]
    );
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
    const { rows } = await db.query(
      "SELECT * FROM usuarios WHERE nombre=$1", [nombre]
    );
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

/* ======== RUTAS MISIONES ======== */
app.get("/misiones", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM misiones ORDER BY id");
    res.json(rows);
  } catch {
    res.status(500).send("Error al obtener misiones.");
  }
});

app.post("/misiones", async (req, res) => {
  try {
    let {
      nombre, ubicacion, objetivo, unidad, comandante,
      fecha, nivel_amenaza, estado,
      info_1, info_2, info_3, info_3_1, info_3_2,
      info_4, info_4_1, info_4_2, info_4_3,
      info_5, info_5_1, info_5_2, info_5_3,
      info_6,
      info_7, info_7_1, info_7_2,
      info_8, info_9, info_10, info_11, info_12, info_13
    } = req.body;
    if (!nombre || !objetivo) return res.status(400).send("Nombre y objetivo son obligatorios.");

    // Sanitizar todos los campos
    nombre        = sanitizeField(nombre);
    ubicacion     = sanitizeField(ubicacion || "");
    objetivo      = sanitizeField(objetivo);
    unidad        = sanitizeField(unidad || "");
    comandante    = sanitizeField(comandante || "");
    nivel_amenaza = sanitizeField(nivel_amenaza || "");
    estado        = sanitizeField(estado || "");
    [info_1, info_2, info_3, info_3_1, info_3_2,
     info_4, info_4_1, info_4_2, info_4_3,
     info_5, info_5_1, info_5_2, info_5_3,
     info_6,
     info_7, info_7_1, info_7_2,
     info_8, info_9, info_10, info_11, info_12, info_13
    ] = [info_1, info_2, info_3, info_3_1, info_3_2,
         info_4, info_4_1, info_4_2, info_4_3,
         info_5, info_5_1, info_5_2, info_5_3,
         info_6,
         info_7, info_7_1, info_7_2,
         info_8, info_9, info_10, info_11, info_12, info_13
    ].map(val => sanitizeField(val || ""));

    await db.query(
      `INSERT INTO misiones (
        nombre, ubicacion, objetivo, unidad, comandante,
        fecha, nivel_amenaza, estado,
        info_1, info_2, info_3, info_3_1, info_3_2,
        info_4, info_4_1, info_4_2, info_4_3,
        info_5, info_5_1, info_5_2, info_5_3,
        info_6,
        info_7, info_7_1, info_7_2,
        info_8, info_9, info_10, info_11, info_12, info_13
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      )`,
      [
        nombre, ubicacion, objetivo, unidad, comandante,
        fecha, nivel_amenaza, estado,
        info_1, info_2, info_3, info_3_1, info_3_2,
        info_4, info_4_1, info_4_2, info_4_3,
        info_5, info_5_1, info_5_2, info_5_3,
        info_6,
        info_7, info_7_1, info_7_2,
        info_8, info_9, info_10, info_11, info_12, info_13
      ]
    );
    res.send("Misión creada con éxito.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.put("/misiones/:id", async (req, res) => {
  try {
    let {
      nombre, ubicacion, objetivo, unidad, comandante,
      fecha, nivel_amenaza, estado,
      info_1, info_2, info_3, info_3_1, info_3_2,
      info_4, info_4_1, info_4_2, info_4_3,
      info_5, info_5_1, info_5_2, info_5_3,
      info_6,
      info_7, info_7_1, info_7_2,
      info_8, info_9, info_10, info_11, info_12, info_13
    } = req.body;
    if (!nombre || !objetivo) return res.status(400).send("Nombre y objetivo son obligatorios.");

    // Sanitizar todos los campos (igual que en POST)
    nombre        = sanitizeField(nombre);
    ubicacion     = sanitizeField(ubicacion || "");
    objetivo      = sanitizeField(objetivo);
    unidad        = sanitizeField(unidad || "");
    comandante    = sanitizeField(comandante || "");
    nivel_amenaza = sanitizeField(nivel_amenaza || "");
    estado        = sanitizeField(estado || "");
    [info_1, info_2, info_3, info_3_1, info_3_2,
     info_4, info_4_1, info_4_2, info_4_3,
     info_5, info_5_1, info_5_2, info_5_3,
     info_6,
     info_7, info_7_1, info_7_2,
     info_8, info_9, info_10, info_11, info_12, info_13
    ] = [info_1, info_2, info_3, info_3_1, info_3_2,
         info_4, info_4_1, info_4_2, info_4_3,
         info_5, info_5_1, info_5_2, info_5_3,
         info_6,
         info_7, info_7_1, info_7_2,
         info_8, info_9, info_10, info_11, info_12, info_13
    ].map(val => sanitizeField(val || ""));

    const result = await db.query(
      `UPDATE misiones SET
        nombre=$1, ubicacion=$2, objetivo=$3, unidad=$4, comandante=$5,
        fecha=$6, nivel_amenaza=$7, estado=$8,
        info_1=$9, info_2=$10, info_3=$11, info_3_1=$12, info_3_2=$13,
        info_4=$14, info_4_1=$15, info_4_2=$16, info_4_3=$17,
        info_5=$18, info_5_1=$19, info_5_2=$20, info_5_3=$21,
        info_6=$22,
        info_7=$23, info_7_1=$24, info_7_2=$25,
        info_8=$26, info_9=$27, info_10=$28, info_11=$29, info_12=$30, info_13=$31
       WHERE id=$32`,
      [
        nombre, ubicacion, objetivo, unidad, comandante,
        fecha, nivel_amenaza, estado,
        info_1, info_2, info_3, info_3_1, info_3_2,
        info_4, info_4_1, info_4_2, info_4_3,
        info_5, info_5_1, info_5_2, info_5_3,
        info_6,
        info_7, info_7_1, info_7_2,
        info_8, info_9, info_10, info_11, info_12, info_13,
        req.params.id
      ]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));