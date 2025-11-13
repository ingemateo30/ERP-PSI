-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NULL COMMENT 'NULL significa para todos los usuarios con ese rol',
  tipo VARCHAR(50) NOT NULL COMMENT 'nuevo_cliente, nueva_instalacion, instalacion_actualizada, etc',
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON NULL COMMENT 'Información adicional como IDs, enlaces, etc',
  leida TINYINT(1) DEFAULT 0,
  fecha_lectura DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tipo (tipo),
  INDEX idx_leida (leida),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
