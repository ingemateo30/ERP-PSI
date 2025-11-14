-- ========================================================================
-- Migración: Permitir clientes con misma identificación en diferentes direcciones
-- Fecha: 2025-11-14
-- Descripción: Elimina el UNIQUE constraint de identificacion para permitir
--              que un mismo cliente (misma cédula/NIT) pueda tener servicios
--              en múltiples direcciones o ciudades
-- ========================================================================

-- 1. Eliminar el UNIQUE KEY de identificacion
ALTER TABLE `clientes`
DROP INDEX `identificacion`;

-- 2. Mantener el índice regular para búsquedas rápidas
-- (Ya existe idx_identificacion, no es necesario recrearlo)

-- 3. Crear índice compuesto para búsquedas eficientes
CREATE INDEX `idx_identificacion_ciudad` ON `clientes` (`identificacion`, `ciudad_id`);
CREATE INDEX `idx_identificacion_direccion` ON `clientes` (`identificacion`(20), `direccion`(100));

-- ========================================================================
-- NOTAS DE USO:
-- ========================================================================
-- Después de esta migración, el sistema permitirá:
-- - Crear múltiples registros de cliente con la misma identificación
-- - Cada registro representa una ubicación/dirección diferente
-- - Cada ubicación puede tener sus propios servicios, contratos y facturas
--
-- Ejemplo:
-- Cliente: Juan Pérez (CC 1005450340)
--   Registro 1: Calle 32 #11-13, Pereira - Servicio Internet
--   Registro 2: Carrera 10 #50-20, Dosquebradas - Servicio TV
-- ========================================================================
