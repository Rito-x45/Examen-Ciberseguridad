-- Crear la base de datos y la tabla de SCPs

CREATE DATABASE IF NOT EXISTS scp_database;
USE scp_database;

CREATE TABLE IF NOT EXISTS scps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_scp VARCHAR(20) UNIQUE NOT NULL,
  clasificacion_contencion VARCHAR(20),
  nivel_peligro VARCHAR(20),
  ubicacion_actual VARCHAR(50),
  estado_investigacion VARCHAR(20),
  descripcion TEXT NOT NULL
);

select * from scps;