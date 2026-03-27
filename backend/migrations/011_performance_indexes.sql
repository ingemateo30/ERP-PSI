-- ============================================================
-- Migration 011: Índices de rendimiento para 100k+ registros
-- Compatible MySQL 5.7+ / MariaDB
-- NOTA: Si un índice ya existe MySQL lanzará ER_DUP_KEYNAME (1061)
--       y continuará con el siguiente. Ignorar esos warnings.
-- Ejecutar: mysql -u usuario -p base_psi < migrations/011_performance_indexes.sql
--       o:  cd backend && node scripts/aplicar_indices.js
-- ============================================================

-- clientes
ALTER TABLE `clientes` ADD INDEX `idx_clientes_estado`         (`estado`);
ALTER TABLE `clientes` ADD INDEX `idx_clientes_ciudad_id`      (`ciudad_id`);
ALTER TABLE `clientes` ADD INDEX `idx_clientes_sector_id`      (`sector_id`);
ALTER TABLE `clientes` ADD INDEX `idx_clientes_identificacion` (`identificacion`);
ALTER TABLE `clientes` ADD INDEX `idx_clientes_created_at`     (`created_at`);
ALTER TABLE `clientes` ADD INDEX `idx_clientes_estado_ciudad`  (`estado`, `ciudad_id`);

-- facturas
ALTER TABLE `facturas` ADD INDEX `idx_facturas_cliente_id`         (`cliente_id`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_estado`             (`estado`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_activo`             (`activo`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_fecha_emision`      (`fecha_emision`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_fecha_vencimiento`  (`fecha_vencimiento`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_fecha_pago`         (`fecha_pago`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_cliente_estado`     (`cliente_id`, `estado`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_estado_activo`      (`estado`, `activo`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_emision_activo`     (`fecha_emision`, `activo`);
ALTER TABLE `facturas` ADD INDEX `idx_facturas_vcto_estado`        (`fecha_vencimiento`, `estado`);

-- servicios_cliente
ALTER TABLE `servicios_cliente` ADD INDEX `idx_sc_cliente_id`     (`cliente_id`);
ALTER TABLE `servicios_cliente` ADD INDEX `idx_sc_plan_id`        (`plan_id`);
ALTER TABLE `servicios_cliente` ADD INDEX `idx_sc_estado`         (`estado`);
ALTER TABLE `servicios_cliente` ADD INDEX `idx_sc_cliente_estado` (`cliente_id`, `estado`);

-- contratos
ALTER TABLE `contratos` ADD INDEX `idx_contratos_cliente_id` (`cliente_id`);
ALTER TABLE `contratos` ADD INDEX `idx_contratos_estado`     (`estado`);
ALTER TABLE `contratos` ADD INDEX `idx_contratos_created_at` (`created_at`);

-- instalaciones
ALTER TABLE `instalaciones` ADD INDEX `idx_inst_cliente_id` (`cliente_id`);
ALTER TABLE `instalaciones` ADD INDEX `idx_inst_estado`     (`estado`);
ALTER TABLE `instalaciones` ADD INDEX `idx_inst_fecha_prog` (`fecha_programada`);
ALTER TABLE `instalaciones` ADD INDEX `idx_inst_created_at` (`created_at`);

-- pagos
ALTER TABLE `pagos` ADD INDEX `idx_pagos_cliente_id` (`cliente_id`);
ALTER TABLE `pagos` ADD INDEX `idx_pagos_factura_id` (`factura_id`);
ALTER TABLE `pagos` ADD INDEX `idx_pagos_fecha_pago` (`fecha_pago`);

-- pqr
ALTER TABLE `pqr` ADD INDEX `idx_pqr_cliente_id`  (`cliente_id`);
ALTER TABLE `pqr` ADD INDEX `idx_pqr_estado`      (`estado`);
ALTER TABLE `pqr` ADD INDEX `idx_pqr_fecha_recep` (`fecha_recepcion`);

-- sistema_usuarios
ALTER TABLE `sistema_usuarios` ADD INDEX `idx_su_rol`     (`rol`);
ALTER TABLE `sistema_usuarios` ADD INDEX `idx_su_sede_id` (`sede_id`);
ALTER TABLE `sistema_usuarios` ADD INDEX `idx_su_activo`  (`activo`);

-- inventario_equipos
ALTER TABLE `inventario_equipos` ADD INDEX `idx_inv_estado` (`estado`);
ALTER TABLE `inventario_equipos` ADD INDEX `idx_inv_sede`   (`sede`);

-- sectores
ALTER TABLE `sectores` ADD INDEX `idx_sectores_ciudad_id` (`ciudad_id`);

SELECT 'Índices aplicados. Los warnings de "Duplicate key name" son normales si ya existían.' AS resultado;
