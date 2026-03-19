-- Migración 008: Tabla para rastreo GPS en tiempo real de técnicos
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();

SET @exists_table = (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME   = 'ubicaciones_tecnicos'
);

SET @sql = IF(
  @exists_table = 0,
  'CREATE TABLE ubicaciones_tecnicos (
    instalador_id   INT           NOT NULL,
    lat             DECIMAL(10,8) NOT NULL,
    lng             DECIMAL(11,8) NOT NULL,
    precision_metros INT          DEFAULT NULL,
    instalacion_activa_id INT     DEFAULT NULL,
    actualizado_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (instalador_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT=''Última posición GPS de cada técnico''',
  'SELECT ''Tabla ubicaciones_tecnicos ya existe, se omite'' AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
