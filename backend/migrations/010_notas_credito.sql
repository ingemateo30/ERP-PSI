-- Migration 010: Notas de Crédito formales
-- Crea tabla notas_credito para documentar anulaciones de facturas
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();
SET @tblname = 'notas_credito';

SET @exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tblname
);

SET @sql = IF(
  @exists = 0,
  'CREATE TABLE notas_credito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_nc VARCHAR(20) NOT NULL UNIQUE COMMENT ''Número secuencial NC-YYYY-000001'',
    factura_id INT NOT NULL COMMENT ''ID de la factura anulada'',
    cliente_id INT NOT NULL,
    nombre_cliente VARCHAR(255) NOT NULL,
    identificacion_cliente VARCHAR(50) NOT NULL,
    numero_factura_original VARCHAR(50) NOT NULL COMMENT ''Número legible de la factura'',
    motivo_tipo VARCHAR(80) NOT NULL COMMENT ''duplicada / error_datos / cliente_solicita / error_sistema / cambio_servicio / otro'',
    motivo_detalle TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT ''Total de la factura anulada'',
    usuario_id INT NULL COMMENT ''Usuario que realizó la anulación'',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nc_factura (factura_id),
    INDEX idx_nc_cliente (cliente_id),
    INDEX idx_nc_numero (numero_nc)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT ''Notas de crédito generadas al anular facturas''',
  'SELECT ''tabla notas_credito ya existe'' AS mensaje'
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
