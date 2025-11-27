-- =====================================================================
-- DATOS DE PRUEBA PARA DEMOSTRACIÓN DEL SISTEMA DE FACTURACIÓN
-- =====================================================================
-- Este script crea registros de prueba para demostrar el funcionamiento
-- completo del sistema de facturación automática.
--
-- CASOS INCLUIDOS:
-- 1. Primera factura (30 días desde inicio del contrato)
-- 2. Segunda factura (con nivelación al mes calendario)
-- 3. Tercera factura y siguientes (mes completo)
-- 4. Diferentes estratos (aplicación de IVA)
-- 5. Diferentes servicios (Internet, TV, Combos)
-- 6. Varios (instalación, etc.)
-- 7. Descuentos
-- =====================================================================

-- Limpiar datos de prueba previos (solo los que vamos a crear)
DELETE FROM servicios_cliente WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion IN ('TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005'));
DELETE FROM facturas WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion IN ('TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005'));
DELETE FROM contratos WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion IN ('TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005'));
DELETE FROM varios_pendientes WHERE cliente_id IN (SELECT id FROM clientes WHERE identificacion IN ('TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005'));
DELETE FROM clientes WHERE identificacion IN ('TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005');

-- =====================================================================
-- CASO 1: CARLOS PÉREZ - Primera factura (30 días desde inicio)
-- =====================================================================
-- Inicio contrato: 27 de Junio 2025
-- Primera factura: 27 Jun - 26 Jul (30 días)
-- Segunda factura: 27 Jul - 31 Ago (36 días - nivelación)
-- Tercera factura: 1 Sep - 30 Sep (30 días - mes completo)
-- Estrato 2 (sin IVA en Internet)
-- Servicio: Internet 30MB
-- =====================================================================

INSERT INTO clientes (
    id, identificacion, tipo_documento, nombre, direccion,
    sector_id, estrato, barrio, ciudad_id, telefono, correo,
    fecha_registro, estado, ruta, created_at
) VALUES (
    5001, 'TEST001', 'cedula', 'Carlos Pérez García',
    'Calle 15 #23-45, Barrio Centro',
    1, '2', 'Centro', 5, '3001234567', 'carlos.perez@test.com',
    '2025-06-27', 'activo', 'R001', NOW()
);

-- Contrato
INSERT INTO contratos (
    id, numero_contrato, cliente_id, servicio_id,
    tipo_contrato, tipo_permanencia, permanencia_meses,
    costo_instalacion, fecha_generacion, fecha_inicio,
    estado, generado_automaticamente, created_at
) VALUES (
    7001, 'CON-TEST-001', 5001, NULL,
    'servicio', 'con_permanencia', 6,
    50000.00, '2025-06-27', '2025-06-27',
    'activo', 1, '2025-06-27 10:00:00'
);

-- Servicio de Internet
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9001, 5001, 2, '2025-06-27',
    'activo', '2025-06-27 10:00:00'
);

-- PRIMERA FACTURA: 27 Jun - 26 Jul (30 días)
-- Internet 30MB: $65,000 (sin IVA estrato 2)
-- Instalación: $50,000 + IVA 19% = $59,500
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television, saldo_anterior, varios,
    s_internet, s_television, s_varios, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8001, 'FAC-TEST-001-1', 5001, 'TEST001', 'Carlos Pérez García',
    '2025-07', '2025-06-27', '2025-07-12',
    '2025-06-27', '2025-07-26',
    65000.00, 0.00, 0.00, 50000.00,
    65000.00, 0.00, 50000.00, 9500.00,
    115000.00, 9500.00, 124500.00,
    'pendiente', 'Primera factura: 30 días desde activación + Instalación con permanencia', '2025-06-27 10:00:00'
);

-- SEGUNDA FACTURA: 27 Jul - 31 Ago (36 días - NIVELACIÓN)
-- Internet prorrateado: 65,000 / 30 * 36 = $78,000
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television, saldo_anterior,
    s_internet, s_television, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8002, 'FAC-TEST-001-2', 5001, 'TEST001', 'Carlos Pérez García',
    '2025-08', '2025-07-27', '2025-08-11',
    '2025-07-27', '2025-08-31',
    78000.00, 0.00, 0.00,
    78000.00, 0.00, 0.00,
    78000.00, 0.00, 78000.00,
    'pendiente', 'Segunda factura: 36 días (30 días normales + 6 días de nivelación al mes calendario)', '2025-07-27 00:00:00'
);

-- TERCERA FACTURA: 1 Sep - 30 Sep (30 días - MES COMPLETO)
-- Internet mes completo: $65,000
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television, saldo_anterior,
    s_internet, s_television, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8003, 'FAC-TEST-001-3', 5001, 'TEST001', 'Carlos Pérez García',
    '2025-09', '2025-09-01', '2025-09-16',
    '2025-09-01', '2025-09-30',
    65000.00, 0.00, 0.00,
    65000.00, 0.00, 0.00,
    65000.00, 0.00, 65000.00,
    'pendiente', 'Tercera factura: Mes completo (1-30) - Ya nivelado', '2025-09-01 00:00:00'
);

-- =====================================================================
-- CASO 2: MARÍA LÓPEZ - Internet + TV con IVA (Estrato 4)
-- =====================================================================
-- Inicio contrato: 15 de Julio 2025
-- Primera factura: 15 Jul - 13 Ago (30 días)
-- Segunda factura: 14 Ago - 31 Ago (18 días - nivelación)
-- Tercera factura: 1 Sep - 30 Sep (30 días - mes completo)
-- Estrato 4 (con IVA 19% en Internet, TV siempre con IVA)
-- Servicio: Internet 50MB + TV Básica
-- =====================================================================

INSERT INTO clientes (
    id, identificacion, tipo_documento, nombre, direccion,
    sector_id, estrato, barrio, ciudad_id, telefono, correo,
    fecha_registro, estado, ruta, created_at
) VALUES (
    5002, 'TEST002', 'cedula', 'María López Rodríguez',
    'Carrera 20 #45-67, Barrio Los Pinos',
    1, '4', 'Los Pinos', 5, '3109876543', 'maria.lopez@test.com',
    '2025-07-15', 'activo', 'R002', NOW()
);

-- Contrato
INSERT INTO contratos (
    id, numero_contrato, cliente_id, servicio_id,
    tipo_contrato, tipo_permanencia, permanencia_meses,
    costo_instalacion, fecha_generacion, fecha_inicio,
    estado, generado_automaticamente, created_at
) VALUES (
    7002, 'CON-TEST-002', 5002, NULL,
    'servicio', 'sin_permanencia', 0,
    150000.00, '2025-07-15', '2025-07-15',
    'activo', 1, '2025-07-15 11:00:00'
);

-- Servicio de Internet
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9002, 5002, 3, '2025-07-15',
    'activo', '2025-07-15 11:00:00'
);

-- Servicio de TV
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9003, 5002, 4, '2025-07-15',
    'activo', '2025-07-15 11:00:00'
);

-- PRIMERA FACTURA: 15 Jul - 13 Ago (30 días)
-- Internet 50MB: $85,000 + IVA 19% = $101,150
-- TV Básica: $35,000 (ya incluye IVA)
-- Instalación sin permanencia: $150,000 + IVA 19% = $178,500
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television, varios,
    s_internet, s_television, s_varios, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8004, 'FAC-TEST-002-1', 5002, 'TEST002', 'María López Rodríguez',
    '2025-07', '2025-07-15', '2025-07-30',
    '2025-07-15', '2025-08-13',
    85000.00, 35000.00, 150000.00,
    85000.00, 35000.00, 150000.00, 43650.00,
    270000.00, 43650.00, 313650.00,
    'pendiente', 'Primera factura: 30 días + Instalación sin permanencia. Internet con IVA 19% (estrato 4), TV con IVA 19%', '2025-07-15 11:00:00'
);

-- SEGUNDA FACTURA: 14 Ago - 31 Ago (18 días - NIVELACIÓN)
-- Internet prorrateado: 85,000 / 30 * 18 = $51,000 + IVA 19% = $60,690
-- TV prorrateada: 35,000 / 30 * 18 = $21,000 (ya con IVA)
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television,
    s_internet, s_television, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8005, 'FAC-TEST-002-2', 5002, 'TEST002', 'María López Rodríguez',
    '2025-08', '2025-08-14', '2025-08-29',
    '2025-08-14', '2025-08-31',
    51000.00, 21000.00,
    51000.00, 21000.00, 9690.00,
    72000.00, 9690.00, 81690.00,
    'pendiente', 'Segunda factura: 18 días de nivelación al mes calendario', '2025-08-14 00:00:00'
);

-- TERCERA FACTURA: 1 Sep - 30 Sep (MES COMPLETO)
-- Internet: $85,000 + IVA 19% = $101,150
-- TV: $35,000 (ya con IVA)
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, television,
    s_internet, s_television, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8006, 'FAC-TEST-002-3', 5002, 'TEST002', 'María López Rodríguez',
    '2025-09', '2025-09-01', '2025-09-16',
    '2025-09-01', '2025-09-30',
    85000.00, 35000.00,
    85000.00, 35000.00, 16150.00,
    120000.00, 16150.00, 136150.00,
    'pendiente', 'Tercera factura: Mes completo ya nivelado', '2025-09-01 00:00:00'
);

-- =====================================================================
-- CASO 3: JUAN MARTÍNEZ - Estrato 1 (Sin IVA en Internet)
-- =====================================================================
-- Inicio contrato: 10 de Agosto 2025
-- Primera factura: 10 Ago - 8 Sep (30 días)
-- Estrato 1 (sin IVA en Internet)
-- Servicio: Internet 10MB
-- Con descuento por promoción
-- =====================================================================

INSERT INTO clientes (
    id, identificacion, tipo_documento, nombre, direccion,
    sector_id, estrato, barrio, ciudad_id, telefono, correo,
    fecha_registro, estado, ruta, created_at
) VALUES (
    5003, 'TEST003', 'cedula', 'Juan Martínez Sánchez',
    'Calle 8 #12-34, Barrio Popular',
    1, '1', 'Popular', 5, '3201234567', 'juan.martinez@test.com',
    '2025-08-10', 'activo', 'R001', NOW()
);

-- Contrato
INSERT INTO contratos (
    id, numero_contrato, cliente_id, servicio_id,
    tipo_contrato, tipo_permanencia, permanencia_meses,
    costo_instalacion, fecha_generacion, fecha_inicio,
    estado, generado_automaticamente, created_at
) VALUES (
    7003, 'CON-TEST-003', 5003, NULL,
    'servicio', 'con_permanencia', 6,
    50000.00, '2025-08-10', '2025-08-10',
    'activo', 1, '2025-08-10 09:00:00'
);

-- Servicio de Internet
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9004, 5003, 1, '2025-08-10',
    'activo', '2025-08-10 09:00:00'
);

-- PRIMERA FACTURA: 10 Ago - 8 Sep (30 días)
-- Internet 10MB: $45,000 (sin IVA estrato 1)
-- Instalación: $50,000 + IVA 19% = $59,500
-- Descuento promocional: $5,000
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, varios, descuento,
    s_internet, s_varios, s_descuento, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8007, 'FAC-TEST-003-1', 5003, 'TEST003', 'Juan Martínez Sánchez',
    '2025-08', '2025-08-10', '2025-08-25',
    '2025-08-10', '2025-09-08',
    45000.00, 50000.00, 5000.00,
    45000.00, 50000.00, 5000.00, 9500.00,
    90000.00, 9500.00, 99500.00,
    'pendiente', 'Primera factura: Internet estrato 1 (sin IVA) + Instalación + Descuento promocional', '2025-08-10 09:00:00'
);

-- =====================================================================
-- CASO 4: EMPRESA ABC - Internet Empresarial (Estrato 6 con IVA)
-- =====================================================================
-- Inicio contrato: 1 de Septiembre 2025
-- Primera factura: 1 Sep - 30 Sep (30 días - coincide con mes completo)
-- Estrato 6 (empresarial con IVA 19%)
-- Servicio: Internet 50MB Empresarial
-- =====================================================================

INSERT INTO clientes (
    id, identificacion, tipo_documento, nombre, direccion,
    sector_id, estrato, barrio, ciudad_id, telefono, correo,
    fecha_registro, estado, ruta, created_at
) VALUES (
    5004, 'TEST004', 'nit', 'Empresa ABC Ltda',
    'Avenida Principal #100-200, Zona Industrial',
    1, '6', 'Zona Industrial', 5, '6017654321', 'info@empresaabc.com',
    '2025-09-01', 'activo', 'R003', NOW()
);

-- Contrato
INSERT INTO contratos (
    id, numero_contrato, cliente_id, servicio_id,
    tipo_contrato, tipo_permanencia, permanencia_meses,
    costo_instalacion, fecha_generacion, fecha_inicio,
    estado, generado_automaticamente, created_at
) VALUES (
    7004, 'CON-TEST-004', 5004, NULL,
    'comercial', 'con_permanencia', 12,
    50000.00, '2025-09-01', '2025-09-01',
    'activo', 1, '2025-09-01 08:00:00'
);

-- Servicio de Internet Empresarial
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9005, 5004, 10, '2025-09-01',
    'activo', '2025-09-01 08:00:00'
);

-- PRIMERA FACTURA: 1 Sep - 30 Sep (30 días - mes completo desde el inicio)
-- Internet Empresarial 50MB: $120,000 + IVA 19% = $142,800
-- Instalación: $50,000 + IVA 19% = $59,500
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, varios,
    s_internet, s_varios, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8008, 'FAC-TEST-004-1', 5004, 'TEST004', 'Empresa ABC Ltda',
    '2025-09', '2025-09-01', '2025-09-16',
    '2025-09-01', '2025-09-30',
    120000.00, 50000.00,
    120000.00, 50000.00, 32300.00,
    170000.00, 32300.00, 202300.00,
    'pendiente', 'Primera factura empresarial: Mes completo + Instalación (caso especial: inició en día 1)', '2025-09-01 08:00:00'
);

-- =====================================================================
-- CASO 5: ANA GARCÍA - Con mora y reconexión
-- =====================================================================
-- Inicio contrato: 5 de Julio 2025
-- Primera factura: 5 Jul - 3 Ago (VENCIDA)
-- Segunda factura con reconexión y saldo anterior
-- Estrato 3 (sin IVA en Internet)
-- Servicio: Internet 20MB
-- =====================================================================

INSERT INTO clientes (
    id, identificacion, tipo_documento, nombre, direccion,
    sector_id, estrato, barrio, ciudad_id, telefono, correo,
    fecha_registro, estado, ruta, requiere_reconexion, created_at
) VALUES (
    5005, 'TEST005', 'cedula', 'Ana García Torres',
    'Transversal 12 #34-56, Barrio El Progreso',
    1, '3', 'El Progreso', 5, '3156789012', 'ana.garcia@test.com',
    '2025-07-05', 'suspendido', 'R002', 1, NOW()
);

-- Contrato
INSERT INTO contratos (
    id, numero_contrato, cliente_id, servicio_id,
    tipo_contrato, tipo_permanencia, permanencia_meses,
    costo_instalacion, fecha_generacion, fecha_inicio,
    estado, generado_automaticamente, created_at
) VALUES (
    7005, 'CON-TEST-005', 5005, NULL,
    'servicio', 'sin_permanencia', 0,
    150000.00, '2025-07-05', '2025-07-05',
    'activo', 1, '2025-07-05 10:00:00'
);

-- Servicio de Internet
INSERT INTO servicios_cliente (
    id, cliente_id, plan_id, fecha_activacion,
    estado, created_at
) VALUES (
    9006, 5005, 8, '2025-07-05',
    'suspendido', '2025-07-05 10:00:00'
);

-- PRIMERA FACTURA: 5 Jul - 3 Ago (VENCIDA)
-- Internet 20MB: $55,000 (sin IVA estrato 3)
-- Instalación: $150,000 + IVA 19% = $178,500
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, varios,
    s_internet, s_varios, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8009, 'FAC-TEST-005-1', 5005, 'TEST005', 'Ana García Torres',
    '2025-07', '2025-07-05', '2025-07-20',
    '2025-07-05', '2025-08-03',
    55000.00, 150000.00,
    55000.00, 150000.00, 28500.00,
    205000.00, 28500.00, 233500.00,
    'vencida', 'Primera factura VENCIDA - Cliente suspendido por mora', '2025-07-05 10:00:00'
);

-- SEGUNDA FACTURA: Con saldo anterior, intereses y reconexión
-- Saldo anterior: $233,500
-- Intereses por mora (2%): $4,670
-- Reconexión: $10,000 + IVA 19% = $11,900
-- Internet del periodo: $33,000 (prorrateado 18 días)
INSERT INTO facturas (
    id, numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
    periodo_facturacion, fecha_emision, fecha_vencimiento,
    fecha_desde, fecha_hasta,
    internet, saldo_anterior, interes, reconexion,
    s_internet, s_interes, s_reconexion, s_iva,
    subtotal, iva, total,
    estado, observaciones, created_at
) VALUES (
    8010, 'FAC-TEST-005-2', 5005, 'TEST005', 'Ana García Torres',
    '2025-08', '2025-08-04', '2025-08-19',
    '2025-08-04', '2025-08-31',
    33000.00, 233500.00, 4670.00, 10000.00,
    33000.00, 4670.00, 10000.00, 2280.00,
    281170.00, 2280.00, 283450.00,
    'pendiente', 'Segunda factura: Incluye saldo anterior + intereses por mora + reconexión', '2025-08-04 00:00:00'
);

-- =====================================================================
-- RESUMEN DE CASOS DE PRUEBA
-- =====================================================================
--
-- CASO 1: Carlos Pérez (TEST001)
--   - Demuestra el proceso completo de nivelación
--   - Primera factura: 30 días normales
--   - Segunda factura: 36 días (nivelación)
--   - Tercera factura: mes completo
--   - Estrato 2: sin IVA en Internet
--   - Con permanencia: instalación $50,000
--
-- CASO 2: María López (TEST002)
--   - Internet + TV con IVA (estrato 4)
--   - Sin permanencia: instalación $150,000
--   - Demuestra aplicación de IVA en ambos servicios
--
-- CASO 3: Juan Martínez (TEST003)
--   - Estrato 1: sin IVA en Internet
--   - Incluye descuento promocional
--   - Con permanencia
--
-- CASO 4: Empresa ABC (TEST004)
--   - Internet empresarial con IVA
--   - Contrato comercial con permanencia 12 meses
--   - Inició en día 1 (mes completo desde primera factura)
--
-- CASO 5: Ana García (TEST005)
--   - Cliente con mora
--   - Factura vencida
--   - Saldo anterior + intereses + reconexión
--   - Estrato 3 sin IVA
--
-- =====================================================================

-- Confirmar inserción de datos
SELECT
    '=== CLIENTES DE PRUEBA CREADOS ===' AS mensaje,
    COUNT(*) AS total_clientes
FROM clientes
WHERE identificacion LIKE 'TEST%';

SELECT
    c.nombre,
    c.identificacion,
    c.estrato,
    COUNT(DISTINCT f.id) AS total_facturas,
    SUM(f.total) AS total_facturado
FROM clientes c
LEFT JOIN facturas f ON c.id = f.cliente_id
WHERE c.identificacion LIKE 'TEST%'
GROUP BY c.id, c.nombre, c.identificacion, c.estrato
ORDER BY c.identificacion;

SELECT
    '=== FACTURAS POR PERIODO ===' AS mensaje;

SELECT
    f.numero_factura,
    c.nombre,
    f.fecha_desde,
    f.fecha_hasta,
    DATEDIFF(f.fecha_hasta, f.fecha_desde) + 1 AS dias_facturados,
    f.total,
    f.observaciones
FROM facturas f
INNER JOIN clientes c ON f.cliente_id = c.id
WHERE c.identificacion LIKE 'TEST%'
ORDER BY c.identificacion, f.fecha_emision;
