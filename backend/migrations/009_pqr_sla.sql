-- Migration 009: SLA para PQR
-- Agrega fecha_vencimiento_sla y retro-alimenta registros existentes
-- Compatible con MySQL 5.7+

SET @dbname = DATABASE();
SET @tblname = 'pqr';
SET @colname = 'fecha_vencimiento_sla';

SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME   = @tblname
    AND COLUMN_NAME  = @colname
);

SET @sql = IF(
  @exists = 0,
  'ALTER TABLE pqr ADD COLUMN fecha_vencimiento_sla DATETIME NULL COMMENT ''Fecha límite SLA según tipo de PQR''',
  'SELECT ''columna ya existe'' AS mensaje'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill registros existentes que no tienen fecha_vencimiento_sla
-- Días calendario por tipo (regulación CRC para operadores de telecomunicaciones):
--   peticion  → 15 días hábiles ≈ 21 calendario
--   queja     → 15 días hábiles ≈ 21 calendario
--   reclamo   → 15 días hábiles ≈ 21 calendario
--   sugerencia→ 30 días calendario
UPDATE pqr
SET fecha_vencimiento_sla = CASE
    WHEN tipo = 'sugerencia' THEN DATE_ADD(fecha_recepcion, INTERVAL 30 DAY)
    ELSE DATE_ADD(fecha_recepcion, INTERVAL 21 DAY)
  END
WHERE fecha_vencimiento_sla IS NULL
  AND estado NOT IN ('resuelto', 'cerrado');
