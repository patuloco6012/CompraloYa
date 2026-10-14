-- =====================================================
--  Compralo Ya - Base de datos MySQL
--  Ejecutar completo en MySQL Workbench, phpMyAdmin o:
--  mysql -u root -p < database.sql
-- =====================================================
CREATE DATABASE IF NOT EXISTS compraloya
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE compraloya;

-- Usuarios (inicio de sesión)
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(60)  NOT NULL,
  apellido      VARCHAR(60)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- contraseña encriptada (bcrypt)
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Catálogo de productos
CREATE TABLE IF NOT EXISTS productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  slug            VARCHAR(60)  NOT NULL UNIQUE,
  nombre          VARCHAR(120) NOT NULL,
  categoria       VARCHAR(40)  NOT NULL,
  descripcion     VARCHAR(255) NOT NULL,
  precio          DECIMAL(10,2) NOT NULL,
  imagen          VARCHAR(120) NOT NULL,
  caracteristicas TEXT NOT NULL,                 -- JSON: [{"t":"Bluetooth","v":"V5.3"}, ...]
  contenido       TEXT NOT NULL,                 -- JSON: ["Auriculares", ...]
  activo          TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Pedidos (datos del pedido + dirección de entrega)
CREATE TABLE IF NOT EXISTS pedidos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  direccion     VARCHAR(160) NOT NULL,
  localidad     VARCHAR(80)  NOT NULL,
  telefono      VARCHAR(30)  NULL,
  observaciones VARCHAR(255) NULL,
  total         DECIMAL(10,2) NOT NULL,
  estado        VARCHAR(30) NOT NULL DEFAULT 'Pendiente de coordinar',
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Detalle de cada pedido (qué productos y cuántos)
CREATE TABLE IF NOT EXISTS pedido_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT NOT NULL,
  producto_id     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id)   REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

-- Productos iniciales (precios en pesos argentinos, editables)
INSERT INTO productos (slug, nombre, categoria, descripcion, precio, imagen, caracteristicas, contenido) VALUES
('auriculares-m41', 'Auriculares inalámbricos M41', 'Auriculares',
 'Sonido 9D estéreo, luces RGB y estuche con pantalla digital de batería.', 13500.00, 'auriculares-m41.png',
 '[{"t":"Bluetooth","v":"V5.3"},{"t":"Sonido","v":"9D estéreo"},{"t":"Batería de auriculares","v":"50 mAh"},{"t":"Tiempo de carga","v":"1 hora"},{"t":"Resistencia","v":"Impermeabilidad IPX-4"},{"t":"Luz","v":"RGB"},{"t":"Retraso inalámbrico","v":"Menos de 30 ms"},{"t":"Indicador de batería","v":"Pantalla digital"}]',
 '["Auriculares M41","Estuche de carga","Cable USB Tipo C","Manual de usuario"]'),
('smartwatch-8-ultra', 'Smartwatch Watch 8 Ultra', 'Relojes',
 'Llamadas por Bluetooth, control de salud y modos deportivos en tu muñeca.', 14900.00, 'smartwatch-8-ultra.png',
 '[{"t":"Llamadas","v":"Bluetooth directas"},{"t":"Alertas","v":"De mensajes"},{"t":"Salud integral","v":"FC, SpO2 y sueño"},{"t":"Modo","v":"Multi-deporte"}]',
 '["Manual","Cable USB de carga","Malla desmontable","Reloj"]'),
('auriculares-enc', 'Auriculares inalámbricos ENC', 'Auriculares',
 'Sonido Hi-fi con cancelación de ruido ENC y estuche con pantalla LED.', 11900.00, 'auriculares-enc.png',
 '[{"t":"Sonido","v":"Hi-fi"},{"t":"Cancelación de ruido","v":"ENC"},{"t":"Micrófono","v":"HD"},{"t":"Pantalla","v":"LED digital"},{"t":"Carga rápida","v":"USB Tipo C"},{"t":"Diseño","v":"Ergonómico"},{"t":"Resistencia","v":"Al agua y polvo"}]',
 '["Auriculares x2","Estuche de carga","Cable USB Tipo C","Manual de usuario"]'),
('parlante-a005', 'Parlante mini A005', 'Parlantes',
 'Compacto, portátil y liviano, con luces LED y radio FM para llevar donde quieras.', 10500.00, 'parlante-a005.png',
 '[{"t":"Conexión","v":"Bluetooth inalámbrica"},{"t":"Luces","v":"LED"},{"t":"Radio","v":"FM"},{"t":"Diseño","v":"Portátil y liviano"},{"t":"Carga","v":"USB"},{"t":"Autonomía","v":"Excelente"}]',
 '["Parlante A005","Cable de carga USB"]');
