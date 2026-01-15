-- Migración: Agregar columna numero_orden a tabla instalaciones
-- Fecha: 2026-01-15
-- Descripción: Agrega columna numero_orden para almacenar el número de orden de instalación

USE erp_psi;

-- Agregar columna numero_orden si no existe
ALTER TABLE instalaciones
ADD COLUMN IF NOT EXISTS numero_orden VARCHAR(50) NULL
AFTER id;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_numero_orden ON instalaciones(numero_orden);

-- Comentar la columna
ALTER TABLE instalaciones
MODIFY COLUMN numero_orden VARCHAR(50) NULL
COMMENT 'Número único de orden de instalación (formato: ORD-YYYY-XXXXXX)';

SELECT 'Columna numero_orden agregada exitosamente' AS resultado;
