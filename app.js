const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const createDOMPurify = require("dompurify");
const session = require("express-session");
const bcryptjs = require("bcryptjs"); // Para encriptar contraseñas
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
const app = express();
const db = new Pool({
  // Reemplaza esta conexión con la tuya propia
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_qsrFJBo1a0Xf@ep-purple-tree-a5qalheh-pooler.us-east-2.aws.neon.tech/scp_database?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

function sanitizeField(fieldValue) {
  // Patrones que queremos bloquear (inyección T-SQL)
  const forbiddenPatterns = [
    /;/g,                 
    /'/g,                 
    /--/g,               
    /\/\*[\s\S]*?\*\//g,  
    /\bxp_/gi             
  ];

  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(fieldValue)) {
      throw new Error("Se detectaron patrones SQL no permitidos en la entrada.");
    }
  });

  const sanitized = DOMPurify.sanitize(fieldValue);

  if (sanitized !== fieldValue) {
    throw new Error("Se han detectado etiquetas HTML no permitidas en la entrada.");
  }

  return sanitized;
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

app.post("/auth/register", async (req, res) => {
  try {
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);
    const hashedPassword = await bcryptjs.hash(contrasena, 10);
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length > 0) {
      return res.status(409).send("El usuario ya existe.");
    }

    await db.query("INSERT INTO usuarios (nombre, contrasena) VALUES ($1, $2)", [nombre, hashedPassword]);

    res.send("Usuario registrado correctamente.");
  } catch (err) {
    return res.status(400).send(err.message);
  }
});


app.post("/auth/login", async (req, res) => {
  try {
    const nombre = sanitizeField(req.body.nombre);
    const contrasena = sanitizeField(req.body.contrasena);
    const result = await db.query("SELECT * FROM usuarios WHERE nombre = $1", [nombre]);
    if (result.rows.length === 0) {
      return res.status(401).send("Usuario no encontrado.");
    }

    const validPass = await bcryptjs.compare(contrasena, result.rows[0].contrasena);
    if (!validPass) {
      return res.status(401).send("Contraseña incorrecta.");
    }

    req.session.usuario = result.rows[0].nombre;
    res.send("Inicio de sesión exitoso.");
  } catch (err) {
    return res.status(400).send(err.message);
  }
});

app.get("/auth/session", (req, res) => {
  if (req.session.usuario) {
    res.json({ usuario: req.session.usuario });
  } else {
    res.status(401).send("No has iniciado sesión.");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(); // Destruimos la sesión
  res.send("Sesión cerrada.");
});


app.get("/scps", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM scps");
    res.json(rows);
  } catch (err) {
    res.status(500).send("Error al obtener los SCPs.");
  }
});


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
    return res.status(400).send(err.message);
  }
});


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
    return res.status(400).send(err.message);
  }
});

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
    return res.status(400).send(err.message);
  }
});


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

app.listen(3000, () => {
  console.log(" Servidor escuchando en el puerto 3000");
});
