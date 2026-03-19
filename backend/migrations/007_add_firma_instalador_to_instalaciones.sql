-- Migración 007: Agregar columna firma_instalador a instalaciones
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();
SET @tablename = 'instalaciones';
SET @columnname = 'firma_instalador';

SET @exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME   = @tablename
    AND COLUMN_NAME  = @columnname
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE instalaciones ADD COLUMN firma_instalador LONGTEXT DEFAULT NULL COMMENT ''Firma digital del instalador en base64 (PNG), capturada al completar instalación''',
  'SELECT ''Columna firma_instalador ya existe, se omite'' AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
