-- Migración 012 v2: Prevenir facturas duplicadas por período
-- ─────────────────────────────────────────────────────────────────────────────
-- PROBLEMA ORIGINAL: MySQL no soporta índices parciales (WHERE activo = '1'),
-- por lo que un UNIQUE KEY incluye TODAS las filas incluyendo las anuladas.
-- El simple UPDATE a estado='anulada' no resuelve el conflicto porque
-- fecha_desde/fecha_hasta siguen iguales.
--
-- SOLUCIÓN:
-- 1. Para cada grupo de duplicados (mismo cliente_id + fecha_desde + fecha_hasta):
--    Conservar la factura de MENOR id (la más antigua).
--    En las demás: poner fecha_desde=NULL y fecha_hasta=NULL.
--    MySQL permite múltiples NULL en índices UNIQUE → sin conflicto.
-- 2. Crear el UNIQUE KEY sobre (cliente_id, fecha_desde, fecha_hasta).
--
-- Ejecutar: mysql -u<usuario> -p <base_datos> < 012_unique_factura_cliente_periodo.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PASO 1: Reportar cuántos duplicados existen antes de limpiar ─────────────
SELECT
    f1.cliente_id,
    f1.fecha_desde,
    f1.fecha_hasta,
    COUNT(*) AS total_duplicados,
    GROUP_CONCAT(f1.id ORDER BY f1.id) AS ids_facturas
FROM facturas f1
WHERE f1.fecha_desde IS NOT NULL
  AND f1.fecha_hasta IS NOT NULL
GROUP BY f1.cliente_id, f1.fecha_desde, f1.fecha_hasta
HAVING COUNT(*) > 1;

-- ── PASO 2: Nullear fecha_desde/fecha_hasta en los duplicados extra ───────────
-- Se conserva el de MENOR id (la primera factura emitida para ese período).
-- Los duplicados quedan con fecha_desde=NULL, fecha_hasta=NULL y estado=anulada.
UPDATE facturas f_dup
  INNER JOIN (
    -- Subconsulta: obtiene el id MÍNIMO por grupo (el que se conserva)
    SELECT MIN(id) AS id_a_conservar, cliente_id, fecha_desde, fecha_hasta
    FROM facturas
    WHERE fecha_desde IS NOT NULL
      AND fecha_hasta IS NOT NULL
    GROUP BY cliente_id, fecha_desde, fecha_hasta
    HAVING COUNT(*) > 1
  ) keeper
    ON  f_dup.cliente_id  = keeper.cliente_id
    AND f_dup.fecha_desde = keeper.fecha_desde
    AND f_dup.fecha_hasta = keeper.fecha_hasta
    AND f_dup.id         != keeper.id_a_conservar   -- todos excepto el conservado
SET
    f_dup.fecha_desde    = NULL,
    f_dup.fecha_hasta    = NULL,
    f_dup.estado         = 'anulada',
    f_dup.observaciones  = CONCAT(
        COALESCE(f_dup.observaciones, ''),
        ' | [MIG-012] Duplicado anulado - período ya cubierto por factura id=',
        keeper.id_a_conservar
    ),
    f_dup.updated_at     = NOW();

-- ── PASO 3: Verificar que no queden duplicados ────────────────────────────────
SELECT
    cliente_id, fecha_desde, fecha_hasta, COUNT(*) AS total
FROM facturas
WHERE fecha_desde IS NOT NULL
  AND fecha_hasta IS NOT NULL
GROUP BY cliente_id, fecha_desde, fecha_hasta
HAVING COUNT(*) > 1;
-- Si la consulta anterior devuelve filas → hay duplicados aún → NO continuar.

-- ── PASO 4: Crear UNIQUE KEY ──────────────────────────────────────────────────
-- MySQL permite múltiples NULL en UNIQUE → las filas anuladas con NULL
-- en fecha_desde/fecha_hasta no causarán conflicto.
ALTER TABLE facturas
  ADD UNIQUE KEY `uq_factura_cliente_periodo`
    (`cliente_id`, `fecha_desde`, `fecha_hasta`);

-- ── PASO 5: Crear índice adicional de performance para consultas de cartera ───
-- (Solo si no existe ya)
ALTER TABLE facturas
  ADD KEY `idx_cliente_fechas` (`cliente_id`, `fecha_desde`, `fecha_hasta`);
