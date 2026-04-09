-- Migración 014: Agregar columnas de metraje a inventario_equipos
-- Para productos vendidos por metros (fibra drop, cable UTP, cable coaxial, etc.)
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();

-- metros_totales: metros en el carrete completo al momento de asignación
SET @col = 'metros_totales';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='inventario_equipos' AND COLUMN_NAME=@col);
SET @sql = IF(@exists=0,
  'ALTER TABLE inventario_equipos ADD COLUMN metros_totales DECIMAL(10,2) DEFAULT NULL COMMENT ''Metros totales asignados al técnico (carrete). NULL = no aplica metraje''',
  'SELECT ''metros_totales ya existe'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- metros_disponibles: metros que le quedan al técnico después de instalaciones
SET @col = 'metros_disponibles';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='inventario_equipos' AND COLUMN_NAME=@col);
SET @sql = IF(@exists=0,
  'ALTER TABLE inventario_equipos ADD COLUMN metros_disponibles DECIMAL(10,2) DEFAULT NULL COMMENT ''Metros restantes disponibles. Se descuenta en cada instalación''',
  'SELECT ''metros_disponibles ya existe'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
