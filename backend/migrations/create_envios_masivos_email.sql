-- Tabla para rastrear lotes de envío masivo de facturas por email
CREATE TABLE IF NOT EXISTS envios_masivos_email (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tipo VARCHAR(50) NOT NULL DEFAULT 'facturas_mensuales' COMMENT 'facturas_mensuales, recordatorios, etc.',
  periodo VARCHAR(10) NULL COMMENT 'YYYY-MM del mes facturado',
  total_facturas INT NOT NULL DEFAULT 0,
  enviados INT NOT NULL DEFAULT 0,
  fallidos INT NOT NULL DEFAULT 0,
  sin_email INT NOT NULL DEFAULT 0,
  estado ENUM('pendiente','en_proceso','completado','error') NOT NULL DEFAULT 'pendiente',
  iniciado_por INT NULL COMMENT 'ID del usuario que inició el envío',
  iniciado_automaticamente TINYINT(1) DEFAULT 0,
  fecha_inicio DATETIME NULL,
  fecha_fin DATETIME NULL,
  duracion_segundos INT NULL,
  detalle_errores JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_periodo (periodo),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para rastrear cada email enviado dentro de un lote
CREATE TABLE IF NOT EXISTS envios_masivos_email_detalle (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lote_id INT NOT NULL,
  cliente_id INT NOT NULL,
  factura_id INT NOT NULL,
  email_destino VARCHAR(255) NULL,
  estado ENUM('pendiente','enviado','fallido','sin_email') NOT NULL DEFAULT 'pendiente',
  mensaje_error TEXT NULL,
  intentos INT NOT NULL DEFAULT 0,
  fecha_envio DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lote_id (lote_id),
  INDEX idx_estado (estado),
  INDEX idx_factura_id (factura_id),
  FOREIGN KEY (lote_id) REFERENCES envios_masivos_email(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
