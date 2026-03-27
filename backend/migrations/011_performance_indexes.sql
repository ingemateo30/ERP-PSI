-- ============================================================
-- Migration 011: Índices de rendimiento para 100k+ registros
-- ============================================================
-- Ejecutar: mysql -u usuario -p base_de_datos < 011_performance_indexes.sql
-- Seguro: usa IF NOT EXISTS para no duplicar índices
-- ============================================================

-- ─── CLIENTES ────────────────────────────────────────────────
-- Búsquedas frecuentes: por estado, ciudad, sector, identificación
ALTER TABLE clientes
  ADD INDEX IF NOT EXISTS idx_clientes_estado         (estado),
  ADD INDEX IF NOT EXISTS idx_clientes_ciudad_id      (ciudad_id),
  ADD INDEX IF NOT EXISTS idx_clientes_sector_id      (sector_id),
  ADD INDEX IF NOT EXISTS idx_clientes_identificacion (identificacion),
  ADD INDEX IF NOT EXISTS idx_clientes_created_at     (created_at),
  ADD INDEX IF NOT EXISTS idx_clientes_estado_ciudad  (estado, ciudad_id);

-- ─── FACTURAS ────────────────────────────────────────────────
-- Búsquedas frecuentes: por cliente, estado, fecha_emision, fecha_vencimiento
ALTER TABLE facturas
  ADD INDEX IF NOT EXISTS idx_facturas_cliente_id      (cliente_id),
  ADD INDEX IF NOT EXISTS idx_facturas_estado          (estado),
  ADD INDEX IF NOT EXISTS idx_facturas_activo          (activo),
  ADD INDEX IF NOT EXISTS idx_facturas_fecha_emision   (fecha_emision),
  ADD INDEX IF NOT EXISTS idx_facturas_fecha_vencimiento (fecha_vencimiento),
  ADD INDEX IF NOT EXISTS idx_facturas_fecha_pago      (fecha_pago),
  ADD INDEX IF NOT EXISTS idx_facturas_cliente_estado  (cliente_id, estado),
  ADD INDEX IF NOT EXISTS idx_facturas_estado_activo   (estado, activo),
  ADD INDEX IF NOT EXISTS idx_facturas_emision_activo  (fecha_emision, activo),
  ADD INDEX IF NOT EXISTS idx_facturas_vcto_estado     (fecha_vencimiento, estado);

-- ─── SERVICIOS_CLIENTE ───────────────────────────────────────
ALTER TABLE servicios_cliente
  ADD INDEX IF NOT EXISTS idx_sc_cliente_id  (cliente_id),
  ADD INDEX IF NOT EXISTS idx_sc_plan_id     (plan_id),
  ADD INDEX IF NOT EXISTS idx_sc_estado      (estado),
  ADD INDEX IF NOT EXISTS idx_sc_cliente_estado (cliente_id, estado);

-- ─── CONTRATOS ───────────────────────────────────────────────
ALTER TABLE contratos
  ADD INDEX IF NOT EXISTS idx_contratos_cliente_id  (cliente_id),
  ADD INDEX IF NOT EXISTS idx_contratos_estado      (estado),
  ADD INDEX IF NOT EXISTS idx_contratos_created_at  (created_at);

-- ─── INSTALACIONES ───────────────────────────────────────────
ALTER TABLE instalaciones
  ADD INDEX IF NOT EXISTS idx_inst_cliente_id     (cliente_id),
  ADD INDEX IF NOT EXISTS idx_inst_estado         (estado),
  ADD INDEX IF NOT EXISTS idx_inst_fecha_prog     (fecha_programada),
  ADD INDEX IF NOT EXISTS idx_inst_created_at     (created_at);

-- ─── PAGOS ───────────────────────────────────────────────────
ALTER TABLE pagos
  ADD INDEX IF NOT EXISTS idx_pagos_cliente_id  (cliente_id),
  ADD INDEX IF NOT EXISTS idx_pagos_factura_id  (factura_id),
  ADD INDEX IF NOT EXISTS idx_pagos_fecha_pago  (fecha_pago);

-- ─── PQR ─────────────────────────────────────────────────────
ALTER TABLE pqr
  ADD INDEX IF NOT EXISTS idx_pqr_cliente_id     (cliente_id),
  ADD INDEX IF NOT EXISTS idx_pqr_estado         (estado),
  ADD INDEX IF NOT EXISTS idx_pqr_fecha_recep    (fecha_recepcion);

-- ─── SISTEMA_USUARIOS ────────────────────────────────────────
ALTER TABLE sistema_usuarios
  ADD INDEX IF NOT EXISTS idx_su_rol      (rol),
  ADD INDEX IF NOT EXISTS idx_su_sede_id  (sede_id),
  ADD INDEX IF NOT EXISTS idx_su_activo   (activo);

-- ─── INVENTARIO_EQUIPOS ──────────────────────────────────────
ALTER TABLE inventario_equipos
  ADD INDEX IF NOT EXISTS idx_inv_estado  (estado),
  ADD INDEX IF NOT EXISTS idx_inv_sede    (sede);

-- ─── SECTORES ────────────────────────────────────────────────
ALTER TABLE sectores
  ADD INDEX IF NOT EXISTS idx_sectores_ciudad_id (ciudad_id);

SELECT 'Índices de rendimiento aplicados correctamente' AS resultado;
