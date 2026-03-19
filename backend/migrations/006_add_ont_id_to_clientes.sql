-- Migración 006: Agregar campo ont_id a la tabla clientes
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();
SET @tablename = 'clientes';
SET @columnname = 'ont_id';

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME   = @tablename
    AND COLUMN_NAME  = @columnname
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE clientes ADD COLUMN ont_id VARCHAR(50) DEFAULT NULL COMMENT ''Identificador ONT/GPON para corte de servicio (reemplaza IP en redes FTTH)''',
  'SELECT ''Columna ont_id ya existe, se omite'' AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice (ignora el error si ya existe)
SET @idx = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME   = @tablename
    AND INDEX_NAME   = 'idx_clientes_ont_id'
);

SET @sql2 = IF(
  @idx = 0,
  'ALTER TABLE clientes ADD INDEX idx_clientes_ont_id (ont_id)',
  'SELECT ''Índice idx_clientes_ont_id ya existe, se omite'' AS mensaje'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
