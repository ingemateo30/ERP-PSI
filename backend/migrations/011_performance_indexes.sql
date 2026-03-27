-- ============================================================
-- Migration 011: Índices de rendimiento para 100k+ registros
-- Compatible con MySQL 5.7+ y MariaDB
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS agregar_indice$$

CREATE PROCEDURE agregar_indice(
  IN p_tabla   VARCHAR(64),
  IN p_indice  VARCHAR(64),
  IN p_columnas TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name   = p_tabla
      AND index_name   = p_indice
    LIMIT 1
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD INDEX `', p_indice, '` (', p_columnas, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('  ✅ Creado: ', p_tabla, '.', p_indice) AS resultado;
  ELSE
    SELECT CONCAT('  ⏩ Ya existe: ', p_tabla, '.', p_indice) AS resultado;
  END IF;
END$$

DELIMITER ;

-- ─── CLIENTES ────────────────────────────────────────────────
CALL agregar_indice('clientes', 'idx_clientes_estado',        '`estado`');
CALL agregar_indice('clientes', 'idx_clientes_ciudad_id',     '`ciudad_id`');
CALL agregar_indice('clientes', 'idx_clientes_sector_id',     '`sector_id`');
CALL agregar_indice('clientes', 'idx_clientes_identificacion','`identificacion`');
CALL agregar_indice('clientes', 'idx_clientes_created_at',    '`created_at`');
CALL agregar_indice('clientes', 'idx_clientes_estado_ciudad', '`estado`, `ciudad_id`');

-- ─── FACTURAS ────────────────────────────────────────────────
CALL agregar_indice('facturas', 'idx_facturas_cliente_id',         '`cliente_id`');
CALL agregar_indice('facturas', 'idx_facturas_estado',             '`estado`');
CALL agregar_indice('facturas', 'idx_facturas_activo',             '`activo`');
CALL agregar_indice('facturas', 'idx_facturas_fecha_emision',      '`fecha_emision`');
CALL agregar_indice('facturas', 'idx_facturas_fecha_vencimiento',  '`fecha_vencimiento`');
CALL agregar_indice('facturas', 'idx_facturas_fecha_pago',         '`fecha_pago`');
CALL agregar_indice('facturas', 'idx_facturas_cliente_estado',     '`cliente_id`, `estado`');
CALL agregar_indice('facturas', 'idx_facturas_estado_activo',      '`estado`, `activo`');
CALL agregar_indice('facturas', 'idx_facturas_emision_activo',     '`fecha_emision`, `activo`');
CALL agregar_indice('facturas', 'idx_facturas_vcto_estado',        '`fecha_vencimiento`, `estado`');

-- ─── SERVICIOS_CLIENTE ───────────────────────────────────────
CALL agregar_indice('servicios_cliente', 'idx_sc_cliente_id',      '`cliente_id`');
CALL agregar_indice('servicios_cliente', 'idx_sc_plan_id',         '`plan_id`');
CALL agregar_indice('servicios_cliente', 'idx_sc_estado',          '`estado`');
CALL agregar_indice('servicios_cliente', 'idx_sc_cliente_estado',  '`cliente_id`, `estado`');

-- ─── CONTRATOS ───────────────────────────────────────────────
CALL agregar_indice('contratos', 'idx_contratos_cliente_id',  '`cliente_id`');
CALL agregar_indice('contratos', 'idx_contratos_estado',      '`estado`');
CALL agregar_indice('contratos', 'idx_contratos_created_at',  '`created_at`');

-- ─── INSTALACIONES ───────────────────────────────────────────
CALL agregar_indice('instalaciones', 'idx_inst_cliente_id',  '`cliente_id`');
CALL agregar_indice('instalaciones', 'idx_inst_estado',      '`estado`');
CALL agregar_indice('instalaciones', 'idx_inst_fecha_prog',  '`fecha_programada`');
CALL agregar_indice('instalaciones', 'idx_inst_created_at',  '`created_at`');

-- ─── PAGOS ───────────────────────────────────────────────────
CALL agregar_indice('pagos', 'idx_pagos_cliente_id',  '`cliente_id`');
CALL agregar_indice('pagos', 'idx_pagos_factura_id',  '`factura_id`');
CALL agregar_indice('pagos', 'idx_pagos_fecha_pago',  '`fecha_pago`');

-- ─── PQR ─────────────────────────────────────────────────────
CALL agregar_indice('pqr', 'idx_pqr_cliente_id',   '`cliente_id`');
CALL agregar_indice('pqr', 'idx_pqr_estado',       '`estado`');
CALL agregar_indice('pqr', 'idx_pqr_fecha_recep',  '`fecha_recepcion`');

-- ─── SISTEMA_USUARIOS ────────────────────────────────────────
CALL agregar_indice('sistema_usuarios', 'idx_su_rol',      '`rol`');
CALL agregar_indice('sistema_usuarios', 'idx_su_sede_id',  '`sede_id`');
CALL agregar_indice('sistema_usuarios', 'idx_su_activo',   '`activo`');

-- ─── INVENTARIO_EQUIPOS ──────────────────────────────────────
CALL agregar_indice('inventario_equipos', 'idx_inv_estado',  '`estado`');
CALL agregar_indice('inventario_equipos', 'idx_inv_sede',    '`sede`');

-- ─── SECTORES ────────────────────────────────────────────────
CALL agregar_indice('sectores', 'idx_sectores_ciudad_id', '`ciudad_id`');

-- Limpiar procedimiento temporal
DROP PROCEDURE IF EXISTS agregar_indice;

SELECT 'Índices de rendimiento aplicados correctamente' AS resultado;
