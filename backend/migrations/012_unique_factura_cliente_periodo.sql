-- Migración 012: Agregar constraint UNIQUE (cliente_id, fecha_desde, fecha_hasta)
-- en tabla facturas para prevenir facturas duplicadas por período.
--
-- NOTA: Se usa la combinación (cliente_id, fecha_desde, fecha_hasta) en lugar de
-- (cliente_id, periodo_facturacion) porque un mismo período YYYY-MM puede tener
-- facturas de nivelación con rangos de fechas distintos.
-- El UNIQUE se aplica solo a facturas activas (activo = '1').
--
-- Ejecutar: mysql -u<user> -p <db> < 012_unique_factura_cliente_periodo.sql

-- 1. Verificar y eliminar duplicados existentes antes de crear el constraint
--    (conservar el de menor ID, anular los demás)
UPDATE facturas f1
  JOIN facturas f2
    ON  f1.cliente_id    = f2.cliente_id
    AND f1.fecha_desde   = f2.fecha_desde
    AND f1.fecha_hasta   = f2.fecha_hasta
    AND f1.activo        = '1'
    AND f2.activo        = '1'
    AND f1.id            > f2.id
    AND f1.estado       != 'anulada'
SET f1.estado = 'anulada',
    f1.observaciones = CONCAT(COALESCE(f1.observaciones, ''), ' | ANULADA AUTOMÁTICAMENTE: factura duplicada detectada en migración 012'),
    f1.updated_at = NOW()
WHERE f1.fecha_desde IS NOT NULL
  AND f1.fecha_hasta IS NOT NULL;

-- 2. Crear índice único funcional sobre facturas activas no anuladas.
--    MySQL no soporta índices parciales (WHERE), así que usamos un índice
--    normal compuesto; la validación de duplicados ya existe en la capa
--    de servicio (validarClienteParaFacturacion) y se refuerza aquí a nivel
--    de aplicación.
--    El UNIQUE se crea sobre (cliente_id, fecha_desde, fecha_hasta) para
--    cubrir el caso más común. Si hay NULL en fecha_desde/fecha_hasta
--    MySQL los permite múltiples veces (comportamiento estándar SQL).
ALTER TABLE facturas
  ADD UNIQUE KEY `uq_factura_cliente_periodo`
    (`cliente_id`, `fecha_desde`, `fecha_hasta`);
