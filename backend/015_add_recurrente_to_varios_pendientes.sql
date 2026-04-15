-- Migración 015: Agregar campo recurrente a varios_pendientes
-- Los conceptos con recurrente = 1 se incluyen en CADA factura mensual
-- sin marcarse como facturados, permitiendo cargos fijos mensuales por cliente.
-- Fecha: 2026-04-15

ALTER TABLE `varios_pendientes`
  ADD COLUMN `recurrente` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = se incluye en cada factura mensual; 0 = cargo único (se marca facturado al emitir)'
  AFTER `activo`;

-- Índice para agilizar la consulta de recurrentes activos
ALTER TABLE `varios_pendientes`
  ADD INDEX `idx_recurrente_activo` (`cliente_id`, `recurrente`, `activo`, `facturado`);
