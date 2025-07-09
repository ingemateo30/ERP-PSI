-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-07-2025 a las 22:12:39
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `base_psi`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `AsignarEquipoInstalador` (IN `p_equipo_id` INT, IN `p_instalador_id` INT, IN `p_ubicacion` VARCHAR(255), IN `p_notas` TEXT, IN `p_asignado_por` INT)   BEGIN
  DECLARE v_estado_actual VARCHAR(50);
  DECLARE v_instalador_actual INT;
  
  -- Verificar estado actual del equipo
  SELECT estado, instalador_id INTO v_estado_actual, v_instalador_actual
  FROM inventario_equipos 
  WHERE id = p_equipo_id;
  
  -- Verificar que el equipo esté disponible
  IF v_estado_actual != 'disponible' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El equipo no está disponible para asignación';
  END IF;
  
  -- Verificar que el usuario sea instalador
  IF NOT EXISTS (SELECT 1 FROM sistema_usuarios WHERE id = p_instalador_id AND rol = 'instalador') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario especificado no es un instalador';
  END IF;
  
  -- Actualizar el equipo
  UPDATE inventario_equipos 
  SET 
    estado = 'asignado',
    instalador_id = p_instalador_id,
    fecha_asignacion = NOW(),
    fecha_devolucion = NULL,
    ubicacion_actual = p_ubicacion,
    notas_instalador = p_notas,
    updated_at = NOW()
  WHERE id = p_equipo_id;
  
  -- Registrar en historial
  INSERT INTO inventario_historial (
    equipo_id, instalador_id, accion, ubicacion, notas, created_by
  ) VALUES (
    p_equipo_id, p_instalador_id, 'asignado', p_ubicacion, p_notas, p_asignado_por
  );
  
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CalcularDisponibilidadMensual` (IN `p_anno` INT, IN `p_mes` INT)   BEGIN
    DECLARE v_dias_mes INT;
    DECLARE v_minutos_mes INT;
    DECLARE v_minutos_inactividad INT;
    DECLARE v_disponibilidad DECIMAL(5,2);
    
    -- Calcular días del mes
    SET v_dias_mes = DAY(LAST_DAY(CONCAT(p_anno, '-', LPAD(p_mes, 2, '0'), '-01')));
    SET v_minutos_mes = v_dias_mes * 24 * 60;
    
    -- Obtener minutos de inactividad por incidencias
    SELECT COALESCE(SUM(tiempo_duracion_minutos), 0) 
    INTO v_minutos_inactividad
    FROM incidencias_servicio 
    WHERE YEAR(fecha_inicio) = p_anno 
      AND MONTH(fecha_inicio) = p_mes
      AND estado = 'resuelto';
    
    -- Calcular disponibilidad
    SET v_disponibilidad = ((v_minutos_mes - v_minutos_inactividad) / v_minutos_mes) * 100;
    
    -- Insertar o actualizar métrica
    INSERT INTO metricas_qos (
        fecha_medicion, mes, anno, semestre, disponibilidad_porcentaje,
        tiempo_actividad_minutos, tiempo_inactividad_minutos
    ) VALUES (
        LAST_DAY(CONCAT(p_anno, '-', LPAD(p_mes, 2, '0'), '-01')),
        p_mes, p_anno, 
        CASE WHEN p_mes <= 6 THEN 1 ELSE 2 END,
        v_disponibilidad,
        v_minutos_mes - v_minutos_inactividad,
        v_minutos_inactividad
    ) ON DUPLICATE KEY UPDATE 
        disponibilidad_porcentaje = v_disponibilidad,
        tiempo_actividad_minutos = v_minutos_mes - v_minutos_inactividad,
        tiempo_inactividad_minutos = v_minutos_inactividad;
        
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CalcularEstadisticasFacturacion` (IN `fecha_inicio` DATE, IN `fecha_fin` DATE)   BEGIN
    SELECT 
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as pagadas,
        COUNT(CASE WHEN estado = 'anulada' THEN 1 END) as anuladas,
        COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as vencidas,
        SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as valor_pendiente,
        SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as valor_pagado,
        SUM(total) as valor_total_facturado,
        AVG(total) as promedio_factura,
        SUM(s_iva) as total_iva_facturado,
        COUNT(DISTINCT cliente_id) as clientes_facturados
    FROM facturas 
    WHERE fecha_emision BETWEEN fecha_inicio AND fecha_fin
    AND activo = '1';
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `DevolverEquipo` (IN `p_equipo_id` INT, IN `p_ubicacion_devolucion` VARCHAR(255), IN `p_notas` TEXT, IN `p_devuelto_por` INT)   BEGIN
  DECLARE v_instalador_actual INT;
  
  -- Obtener instalador actual
  SELECT instalador_id INTO v_instalador_actual
  FROM inventario_equipos 
  WHERE id = p_equipo_id;
  
  -- Actualizar el equipo
  UPDATE inventario_equipos 
  SET 
    estado = 'disponible',
    fecha_devolucion = NOW(),
    ubicacion_actual = p_ubicacion_devolucion,
    notas_instalador = CONCAT(IFNULL(notas_instalador, ''), '\n--- DEVUELTO ---\n', IFNULL(p_notas, '')),
    updated_at = NOW()
  WHERE id = p_equipo_id;
  
  -- Registrar en historial
  INSERT INTO inventario_historial (
    equipo_id, instalador_id, accion, ubicacion, notas, created_by
  ) VALUES (
    p_equipo_id, v_instalador_actual, 'devuelto', p_ubicacion_devolucion, p_notas, p_devuelto_por
  );
  
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GenerarNumeroFactura` (OUT `nuevo_numero` VARCHAR(20))   BEGIN
    DECLARE prefijo VARCHAR(10);
    DECLARE consecutivo INT;
    
    -- Obtener configuración
    SELECT 
        COALESCE(prefijo_factura, 'FAC') as pref,
        COALESCE(consecutivo_factura, 1) as cons
    INTO prefijo, consecutivo
    FROM configuracion_empresa 
    WHERE id = 1;
    
    -- Actualizar consecutivo
    UPDATE configuracion_empresa 
    SET consecutivo_factura = consecutivo_factura + 1 
    WHERE id = 1;
    
    -- Generar número con formato
    SET nuevo_numero = CONCAT(prefijo, LPAD(consecutivo + 1, 6, '0'));
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ObtenerClientesConMora` (IN `dias_mora_minima` INT)   BEGIN
    SELECT 
        c.id,
        c.identificacion,
        c.nombre,
        c.telefono,
        c.email,
        s.nombre as sector,
        COUNT(f.id) as facturas_vencidas,
        SUM(f.total) as total_deuda,
        MIN(f.fecha_vencimiento) as primera_factura_vencida,
        MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) as dias_mora_maxima,
        GROUP_CONCAT(f.numero_factura ORDER BY f.fecha_vencimiento SEPARATOR ', ') as facturas_numeros
    FROM clientes c
    JOIN facturas f ON c.id = f.cliente_id
    LEFT JOIN sectores s ON c.sector_id = s.id
    WHERE f.estado IN ('pendiente', 'vencida')
    AND DATEDIFF(CURDATE(), f.fecha_vencimiento) >= dias_mora_minima
    AND f.activo = '1'
    AND c.activo = 1
    GROUP BY c.id
    HAVING total_deuda > 0
    ORDER BY dias_mora_maxima DESC, total_deuda DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `ObtenerClientesParaFacturar` (IN `fecha_referencia` DATE)   BEGIN
    SELECT DISTINCT 
        c.id,
        c.identificacion,
        c.nombre,
        c.estrato,
        MAX(f.fecha_hasta) as ultima_fecha_facturada,
        sc.fecha_activacion,
        COUNT(sc.id) as servicios_activos,
        GROUP_CONCAT(ps.nombre SEPARATOR ', ') as planes_servicios
    FROM clientes c
    JOIN servicios_cliente sc ON c.id = sc.cliente_id 
        AND sc.activo = 1 
        AND sc.estado = 'activo'
    JOIN planes_servicio ps ON sc.plan_id = ps.id
    LEFT JOIN facturas f ON c.id = f.cliente_id AND f.activo = '1'
    WHERE c.activo = 1
    GROUP BY c.id
    HAVING 
        (ultima_fecha_facturada IS NULL) OR 
        (ultima_fecha_facturada < DATE_SUB(fecha_referencia, INTERVAL 30 DAY))
    ORDER BY ultima_fecha_facturada ASC, c.id ASC;
END$$

--
-- Funciones
--
CREATE DEFINER=`root`@`localhost` FUNCTION `calcular_precio_con_iva` (`tipo_servicio` VARCHAR(20), `precio_base` DECIMAL(10,2), `estrato_cliente` INT) RETURNS DECIMAL(10,2) DETERMINISTIC READS SQL DATA BEGIN
  DECLARE precio_final DECIMAL(10,2) DEFAULT 0.00;
  DECLARE aplica_iva BOOLEAN DEFAULT FALSE;
  
  -- Determinar si aplica IVA según tipo de servicio y estrato
  CASE tipo_servicio
    WHEN 'internet' THEN
      SET aplica_iva = (estrato_cliente > 3);
    WHEN 'television' THEN
      SET aplica_iva = TRUE;
    WHEN 'reconexion' THEN
      SET aplica_iva = TRUE;
    WHEN 'varios' THEN
      SET aplica_iva = TRUE;
    WHEN 'publicidad' THEN
      SET aplica_iva = FALSE;
    WHEN 'interes' THEN
      SET aplica_iva = FALSE;
    ELSE
      SET aplica_iva = FALSE;
  END CASE;
  
  -- Calcular precio final
  IF aplica_iva THEN
    SET precio_final = ROUND(precio_base * 1.19, 2);
  ELSE
    SET precio_final = precio_base;
  END IF;
  
  RETURN precio_final;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bancos`
--

CREATE TABLE `bancos` (
  `id` int(11) NOT NULL,
  `codigo` varchar(5) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `bancos`
--

INSERT INTO `bancos` (`id`, `codigo`, `nombre`, `activo`) VALUES
(1, '001', 'Banco de Bogotá', 1),
(2, '002', 'Banco Popular', 1),
(3, '007', 'Bancolombia', 1),
(4, '009', 'Citibank', 1),
(5, '012', 'Banco GNB Sudameris', 1),
(6, '013', 'BBVA Colombia', 1),
(7, '014', 'Helm Bank', 1),
(8, '023', 'Banco de Occidente', 1),
(9, '031', 'Banco Agrario', 1),
(10, '040', 'Banco Unión', 1),
(11, '052', 'Banco AV Villas', 0),
(12, '053', 'Banco Davivienda', 1),
(13, '010', 'Efectivo', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ciudades`
--

CREATE TABLE `ciudades` (
  `id` int(11) NOT NULL,
  `departamento_id` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `ciudades`
--

INSERT INTO `ciudades` (`id`, `departamento_id`, `codigo`, `nombre`) VALUES
(1, 1, '11001', 'Bogotá'),
(2, 2, '05001', 'Medellín'),
(3, 3, '76001', 'Cali'),
(4, 4, '08001', 'Barranquilla'),
(5, 5, '13001', 'Cartagena'),
(6, 6, '28276', 'San Gil');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `identificacion` varchar(20) NOT NULL,
  `tipo_documento` enum('cedula','nit','pasaporte','extranjeria') DEFAULT 'cedula',
  `nombre` varchar(255) NOT NULL,
  `direccion` text NOT NULL,
  `sector_id` int(11) DEFAULT NULL,
  `estrato` varchar(2) DEFAULT NULL,
  `barrio` varchar(100) DEFAULT NULL,
  `ciudad_id` int(11) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `telefono_2` varchar(30) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `fecha_registro` date DEFAULT NULL,
  `fecha_hasta` date DEFAULT NULL,
  `estado` enum('activo','suspendido','cortado','retirado','inactivo') DEFAULT 'activo',
  `mac_address` varchar(17) DEFAULT NULL,
  `ip_asignada` varchar(15) DEFAULT NULL,
  `tap` varchar(20) DEFAULT NULL,
  `poste` varchar(50) DEFAULT NULL,
  `contrato` varchar(20) DEFAULT NULL,
  `ruta` varchar(10) DEFAULT NULL,
  `requiere_reconexion` tinyint(1) DEFAULT 0,
  `codigo_usuario` varchar(20) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `identificacion`, `tipo_documento`, `nombre`, `direccion`, `sector_id`, `estrato`, `barrio`, `ciudad_id`, `telefono`, `telefono_2`, `correo`, `fecha_registro`, `fecha_hasta`, `estado`, `mac_address`, `ip_asignada`, `tap`, `poste`, `contrato`, `ruta`, `requiere_reconexion`, `codigo_usuario`, `observaciones`, `created_by`, `created_at`, `updated_at`) VALUES
(1, '123456789', 'cedula', 'Juan Carlos Rodríguez Méndez', 'Calle 15 # 23-45, Barrio Centro', 1, '1', 'Centro', 5, '3001234567', '6012345678', 'juan.rodriguez@email.com', '2024-01-14', '2025-01-15', 'activo', 'AA:BB:CC:DD:EE:01', '192.168.1.101', 'TAP001', 'P-001', 'CT-00001', 'R001', 0, 'USR00001', 'Cliente preferencial, pago puntual', 1, '2025-06-06 14:46:55', '2025-07-04 20:13:03'),
(2, '87654321', 'cedula', 'María Isabel García López', 'Carrera 10 # 45-67, Barrio Los Pinos', 1, '4', 'Los Pinos', 5, '3109876543', NULL, 'maria.garcia@gmail.com', '2024-02-01', '2025-02-01', 'activo', 'AA:BB:CC:DD:EE:02', '192.168.1.102', 'TAP002', 'P-002', 'CT-00002', 'R001', 0, 'USR00002', 'Servicio de internet y TV', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(3, '23456789', 'cedula', 'Carlos Alberto Ruiz Vargas', 'Calle 8 # 12-34, Barrio San José', 1, '2', 'San José', 5, '3201234567', '6078901234', 'carlos.ruiz@hotmail.com', '2024-01-19', '2025-01-20', 'activo', 'AA:BB:CC:DD:EE:03', '192.168.1.103', 'TAP003', 'P-003', 'CT-00003', 'R002', 1, 'USR00003', 'Suspendido por mora - Requiere reconexión', 1, '2025-06-06 14:46:55', '2025-07-04 21:59:40'),
(4, '34567890', 'cedula', 'Ana Patricia Morales Castellanos', 'Transversal 5 # 78-90, Barrio Villa Nueva', 1, '3', 'Villa Nueva', 5, '3156789012', NULL, 'ana.morales@empresa.com', '2024-03-01', '2025-03-01', 'activo', 'AA:BB:CC:DD:EE:04', '192.168.1.104', 'TAP004', 'P-004', 'CT-00004', 'R001', 0, 'USR00004', 'Cliente empresarial', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(5, '45678901', 'cedula', 'Luis Fernando Torres Jiménez', 'Avenida Principal # 100-25, Barrio El Progreso', 1, '5', 'El Progreso', 5, '3012345678', '6075432109', 'luis.torres@correo.co', '2024-02-15', '2025-02-15', 'activo', 'AA:BB:CC:DD:EE:05', '192.168.1.105', 'TAP005', 'P-005', 'CT-00005', 'R002', 0, 'USR00005', 'Plan premium, servicio completo', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(6, '56789012', 'cedula', 'Sandra Milena Castro Romero', 'Calle 25 # 15-80, Barrio La Esperanza', 1, '2', 'La Esperanza', 5, '3178901234', NULL, 'sandra.castro@yahoo.com', '2024-03-10', '2025-03-10', 'activo', 'AA:BB:CC:DD:EE:06', '192.168.1.106', 'TAP006', 'P-006', 'CT-00006', 'R001', 0, 'USR00006', 'Solo servicio de internet', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(7, '67890123', 'cedula', 'Roberto Andrés Silva Peña', 'Carrera 20 # 30-45, Barrio Las Flores', 1, '3', 'Las Flores', 5, '3023456789', '6012987654', 'roberto.silva@outlook.com', '2023-11-30', '2024-12-01', 'activo', 'AA:BB:CC:DD:EE:07', '192.168.1.107', 'TAP007', 'P-007', 'CT-00007', 'R002', 1, 'USR00007', 'Cortado por mora prolongada', 1, '2025-06-06 14:46:55', '2025-07-04 21:59:34'),
(8, '78901234', 'cedula', 'Claudia Elena Vargas Muñoz', 'Diagonal 12 # 56-78, Barrio Nuevo Horizonte', 1, '4', 'Nuevo Horizonte', 5, '3134567890', NULL, 'claudia.vargas@gmail.com', '2024-01-30', '2025-01-30', 'activo', 'AA:BB:CC:DD:EE:08', '192.168.1.108', 'TAP008', 'P-008', 'CT-00008', 'R001', 0, 'USR00008', 'Excelente historial de pagos', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(9, '900123456', 'nit', 'Empresa XYZ Servicios Ltda', 'Calle 50 # 100-200, Zona Industrial', 1, '6', 'Zona Industrial', 5, '6017654321', '3001111111', 'info@empresaxyz.com', '2024-02-20', '2025-02-20', 'activo', 'AA:BB:CC:DD:EE:09', '192.168.1.109', 'TAP009', 'P-009', 'CT-00009', 'R003', 0, 'USR00009', 'Cliente corporativo - Plan empresarial', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(10, '89012345', 'cedula', 'Pedro José Hernández Rueda', 'Calle 35 # 67-89, Barrio El Recuerdo', 1, '3', 'El Recuerdo', 5, '3187654321', '6013456789', 'pedro.hernandez@correo.com', '2024-03-05', '2025-03-05', 'activo', 'AA:BB:CC:DD:EE:10', '192.168.1.110', 'TAP010', 'P-010', 'CT-00010', 'R002', 0, 'USR00010', 'Cliente nuevo - Plan básico', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(16, '1005450340', 'cedula', 'mateo salazar ortiz', 'calle 32e 11 13', 3, '1', 'san luis', 6, '3011780208', '3024773516', NULL, '2025-07-03', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'nuevo cliente', NULL, '2025-07-04 20:16:38', '2025-07-04 20:17:27'),
(20, '79882886', 'cedula', 'prueba prueba prueba', 'CR 1 7 53', 3, '2', 'industrial', 6, '3007015239', NULL, 'sistemas@jelcom.com.co', '2025-07-08', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2025-07-08 14:59:21', '2025-07-08 14:59:21'),
(23, '52487047', 'cedula', 'Lina Maria Ortiz Pereira', 'CR 1 7 53', 3, '2', 'industrial', 6, '3007015239', NULL, 'sistemas@jelcom.com.co', '2025-07-08', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2025-07-08 15:16:25', '2025-07-08 15:16:25'),
(25, '52487048', 'cedula', 'prueba prueba', 'calle 32e 11 13', 3, '1', 'san luis', 6, '3024773516', NULL, 'MSALAZAR5@UDI.EDU.CO', '2025-07-08', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2025-07-08 19:36:14', '2025-07-08 19:36:14'),
(26, '52487049', 'cedula', 'prueba prueba', 'calle 32e 11 13', 3, '1', 'san luis', 6, '3024773516', NULL, 'MSALAZAR5@UDI.EDU.CO', '2025-07-08', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2025-07-08 21:27:30', '2025-07-08 21:27:30'),
(27, '52487050', 'cedula', 'prueba2', 'calle 32e 11 13', NULL, '1', 'san luis', 6, '3024773516', '3024773516', 'MSALAZAR5@UDI.EDU.CO', '2025-07-08', NULL, 'activo', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, '2025-07-08 21:49:13', '2025-07-08 21:49:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes_inactivos`
--

CREATE TABLE `clientes_inactivos` (
  `id` int(11) NOT NULL,
  `identificacion` varchar(20) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_inactivacion` date DEFAULT NULL,
  `barrio` varchar(100) DEFAULT NULL,
  `sector_codigo` varchar(3) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `poste` varchar(50) DEFAULT NULL,
  `estrato` varchar(2) DEFAULT NULL,
  `motivo_inactivacion` text DEFAULT NULL,
  `cliente_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `codigos_regulatorios`
--

CREATE TABLE `codigos_regulatorios` (
  `id` int(11) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `codigos_regulatorios`
--

INSERT INTO `codigos_regulatorios` (`id`, `tipo`, `codigo`, `descripcion`, `activo`) VALUES
(1, 'segmento_plan', '1', 'Residencial', 1),
(2, 'segmento_plan', '2', 'Empresarial', 1),
(3, 'modalidad_plan', '1', 'Internet', 1),
(4, 'modalidad_plan', '2', 'Televisión', 1),
(5, 'modalidad_plan', '3', 'Empaquetado', 1),
(6, 'tecnologia', '1', 'Fibra Óptica', 1),
(7, 'tecnologia', '2', 'HFC (Cable)', 1),
(8, 'tecnologia', '3', 'Satelital', 1),
(9, 'estado_servicio', '1', 'Activo', 1),
(10, 'estado_servicio', '2', 'Suspendido', 1),
(11, 'estado_servicio', '3', 'Cortado', 1),
(12, 'estado_servicio', '4', 'Cancelado', 1),
(13, 'tipologia_pqr', '1', 'Facturación', 1),
(14, 'tipologia_pqr', '2', 'Calidad Técnica', 1),
(15, 'tipologia_pqr', '3', 'Atención al Cliente', 1),
(16, 'tipologia_pqr', '4', 'Comercial', 1),
(17, 'medio_atencion', '1', 'Telefónico', 1),
(18, 'medio_atencion', '2', 'Presencial', 1),
(19, 'medio_atencion', '3', 'Web/Email', 1),
(20, 'medio_atencion', '4', 'Chat', 1),
(21, 'segmento_plan', '1', 'Residencial', 1),
(22, 'segmento_plan', '2', 'Empresarial', 1),
(23, 'modalidad_plan', '1', 'Internet', 1),
(24, 'modalidad_plan', '2', 'Televisión', 1),
(25, 'modalidad_plan', '3', 'Empaquetado', 1),
(26, 'tecnologia', '1', 'Fibra Óptica', 1),
(27, 'tecnologia', '2', 'HFC (Cable)', 1),
(28, 'tecnologia', '3', 'Satelital', 1),
(29, 'estado_servicio', '1', 'Activo', 1),
(30, 'estado_servicio', '2', 'Suspendido', 1),
(31, 'estado_servicio', '3', 'Cortado', 1),
(32, 'estado_servicio', '4', 'Cancelado', 1),
(33, 'tipologia_pqr', '1', 'Facturación', 1),
(34, 'tipologia_pqr', '2', 'Calidad Técnica', 1),
(35, 'tipologia_pqr', '3', 'Atención al Cliente', 1),
(36, 'tipologia_pqr', '4', 'Comercial', 1),
(37, 'medio_atencion', '1', 'Telefónico', 1),
(38, 'medio_atencion', '2', 'Presencial', 1),
(39, 'medio_atencion', '3', 'Web/Email', 1),
(40, 'medio_atencion', '4', 'Chat', 1),
(41, 'segmento_plan', '1', 'Residencial', 1),
(42, 'segmento_plan', '2', 'Empresarial', 1),
(43, 'modalidad_plan', '1', 'Internet', 1),
(44, 'modalidad_plan', '2', 'Televisión', 1),
(45, 'modalidad_plan', '3', 'Empaquetado', 1),
(46, 'tecnologia', '1', 'Fibra Óptica', 1),
(47, 'tecnologia', '2', 'HFC (Cable)', 1),
(48, 'tecnologia', '3', 'Satelital', 1),
(49, 'tecnologia', '4', 'FTTH (Fibra al Hogar)', 1),
(50, 'estado_servicio', '1', 'Activo', 1),
(51, 'estado_servicio', '2', 'Suspendido', 1),
(52, 'estado_servicio', '3', 'Cortado', 1),
(53, 'estado_servicio', '4', 'Cancelado', 1),
(54, 'tipologia_pqr', '1', 'Facturación', 1),
(55, 'tipologia_pqr', '2', 'Calidad Técnica', 1),
(56, 'tipologia_pqr', '3', 'Atención al Cliente', 1),
(57, 'tipologia_pqr', '4', 'Comercial', 1),
(58, 'tipologia_pqr', '5', 'Otros', 1),
(59, 'medio_atencion', '1', 'Telefónico', 1),
(60, 'medio_atencion', '2', 'Presencial', 1),
(61, 'medio_atencion', '3', 'Web/Email', 1),
(62, 'medio_atencion', '4', 'Chat', 1),
(63, 'medio_atencion', '5', 'Aplicación Móvil', 1),
(64, 'prioridad_pqr', '1', 'Baja', 1),
(65, 'prioridad_pqr', '2', 'Media', 1),
(66, 'prioridad_pqr', '3', 'Alta', 1),
(67, 'prioridad_pqr', '4', 'Crítica', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conceptos_facturacion`
--

CREATE TABLE `conceptos_facturacion` (
  `id` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `valor_base` decimal(10,2) DEFAULT 0.00,
  `aplica_iva` tinyint(1) DEFAULT 0,
  `porcentaje_iva` decimal(5,2) DEFAULT 0.00,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('internet','television','reconexion','interes','descuento','varios','publicidad') NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `estrato_aplicable` varchar(10) DEFAULT NULL COMMENT 'Estratos donde aplica (ej: 1,2,3 o 4,5,6)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `conceptos_facturacion`
--

INSERT INTO `conceptos_facturacion` (`id`, `codigo`, `nombre`, `valor_base`, `aplica_iva`, `porcentaje_iva`, `descripcion`, `tipo`, `activo`, `created_at`, `updated_at`, `estrato_aplicable`) VALUES
(80, '80', 'INTERNET', 59900.00, 0, 0.00, 'INTERNET 50 MEGAS HOGAR SOLO INTERNET', 'internet', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', '1,2,3'),
(81, '81', 'INTERNET', 64900.00, 0, 0.00, 'INTERNET 100 MEGAS HOGAR SOLO INTERNET', 'internet', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', '1,2,3'),
(82, '82', 'INTERNET', 59900.00, 0, 0.00, 'INTERNET 50 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', '1,2,3'),
(83, '83', 'INTERNET', 64900.00, 0, 0.00, 'INTERNET 100 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', '1,2,3'),
(84, '84', 'INTERNET', 74900.00, 0, 0.00, 'INTERNET 200 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', '1,2,3'),
(85, '85', 'INTERNET', 84900.00, 0, 0.00, 'INTERNET 400 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(86, '86', 'INTERNET', 39900.00, 0, 0.00, 'INTERNET 5 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(87, '87', 'INTERNET', 49900.00, 0, 0.00, 'INTERNET 10 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(88, '88', 'INTERNET', 69900.00, 0, 0.00, 'INTERNET 500 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(89, '89', 'INTERNET', 79900.00, 0, 0.00, 'INTERNET 900 MEGAS HOGAR', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(90, '90', 'FIBRA COMERCIAL', 74900.00, 0, 0.00, 'INTERNET COMERCIAL 100 MEGAS', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(91, '91', 'FIBRA COMERCIAL', 71344.00, 1, 19.00, 'INTERNET COMERCIAL 200 MEGAS', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(92, '92', 'FIBRA COMERCIAL', 79747.00, 1, 19.00, 'INTERNET COMERCIAL 400 MEGAS', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(99, '99', 'INTERNET', 69900.00, 0, 0.00, 'FIBRA 200 MG RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(100, '100', 'TELEVISIÓN', 26807.00, 1, 19.00, 'Basico', 'television', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', 'TODOS'),
(105, '105', 'INTERNET', 64900.00, 0, 0.00, 'FIBRA 200 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(106, '106', 'INTERNET', 69900.00, 0, 0.00, 'FIBRA 200 MEGAS', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(116, '116', 'INTERNET', 67142.00, 1, 19.00, 'FIBRA 200 MEGAS COMERCIAL + IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(129, '129', 'INTERNET', 59900.00, 0, 0.00, 'FIBRA 100 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(130, '130', 'INTERNET', 69900.00, 0, 0.00, 'FIBRA 300 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(131, '131', 'INTERNET', 83949.00, 1, 19.00, 'FIBRA 300 MEGAS COMERCIAL + IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(132, '132', 'INTERNET', 75546.00, 1, 19.00, 'FIBRA 200 MEGAS COMERCIAL+ IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(140, '140', 'INTERNET', 64900.00, 0, 0.00, 'FIBRA 100 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(141, '141', 'INTERNET', 69900.00, 0, 0.00, 'FIBRA 150 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(145, '145', 'INTERNET', 79900.00, 0, 0.00, 'FIBRA 300 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(147, '147', 'INTERNET', 67142.00, 1, 19.00, 'INTERNET FIBRA 200 MEGAS COMERCIAL + IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(148, '148', 'INTERNET', 75546.00, 1, 19.00, 'INTERNET FIBRA 300 MEGAS COMERCIAL + IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(149, '149', 'INTERNET', 79900.00, 0, 0.00, 'FIBRA 400 MG RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(150, '150', 'INTERNET', 243697.00, 1, 19.00, 'INTERNET 10 MEGAS DEDICADO', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(152, '152', 'INTERNET', 67143.00, 1, 19.00, '500 MEGAS FIBRA INTERNET COMERCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(153, '153', 'INTERNET', 75546.00, 1, 19.00, '900 MEGAS FIBRA INTERNET COMERCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(154, '154', 'INTERNET', 58740.00, 1, 19.00, 'INTERNET FIBRA 50 MEGAS COMERCIAL + IVA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(200, '200', 'INTERNET', 49900.00, 0, 0.00, 'FIBRA', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(300, '300', 'INTERNET', 38000.00, 0, 0.00, '30 MEGAS', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(302, '302', 'INTERNET', 0.00, 0, 0.00, '', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(514, '514', 'INTERNET', 149900.00, 0, 0.00, 'INTERNET 200 MEGAS RURAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(515, '515', 'INTERNET', 1672269.00, 1, 19.00, 'INTERNET 320 MEGAS DEDICADO', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(516, '516', 'INTERNET', 1252100.00, 1, 19.00, 'INTERNET 200 MEGAS DEDICADO', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(526, '526', 'TELEVISION', 176471.00, 1, 19.00, 'TELEVISION 21 PUNTOS', 'television', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', 'TODOS'),
(528, '528', 'TELEVISION', 8403.00, 1, 19.00, 'TELEVISION DUO', 'television', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', 'TODOS'),
(529, '529', 'TELEVISION', 38572.00, 1, 19.00, 'TELEVISION', 'television', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', 'TODOS'),
(530, '530', 'TELEVISION', 37731.00, 1, 19.00, 'TELEVISION ESTRATO 1,2 Y 3', 'television', 1, '2025-07-04 13:46:55', '2025-07-09 19:04:56', 'TODOS'),
(751, '751', 'INTERNET', 59900.00, 0, 0.00, 'FIBRA 200 MEGAS RESIDENCIAL', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(910, '910', 'INTERNET', 1252100.00, 1, 19.00, '200 MEGAS DEDICADO + 10 PUNTOS DE TV', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL),
(911, '911', 'INTERNET', 1252100.00, 1, 19.00, '200 MEGAS + 10 PUNTOS DE TV', 'internet', 1, '2025-07-04 13:46:55', '2025-07-04 13:46:55', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_empresa`
--

CREATE TABLE `configuracion_empresa` (
  `id` int(11) NOT NULL,
  `licencia` varchar(100) NOT NULL,
  `empresa_nombre` varchar(255) DEFAULT NULL,
  `empresa_nit` varchar(30) DEFAULT NULL,
  `empresa_direccion` varchar(255) DEFAULT NULL,
  `empresa_ciudad` varchar(100) DEFAULT NULL,
  `empresa_departamento` varchar(100) DEFAULT NULL,
  `empresa_telefono` varchar(30) DEFAULT NULL,
  `empresa_email` varchar(100) DEFAULT NULL,
  `resolucion_facturacion` varchar(100) DEFAULT NULL,
  `licencia_internet` varchar(100) DEFAULT NULL,
  `vigilado` varchar(255) DEFAULT NULL,
  `vigilado_internet` varchar(255) DEFAULT NULL,
  `comentario` text DEFAULT NULL,
  `prefijo_factura` varchar(10) DEFAULT NULL,
  `codigo_gs1` varchar(20) DEFAULT NULL,
  `fecha_actualizacion` date DEFAULT NULL,
  `consecutivo_factura` int(11) DEFAULT 1,
  `consecutivo_contrato` int(11) DEFAULT 1,
  `consecutivo_recibo` int(11) DEFAULT 1,
  `valor_reconexion` decimal(10,2) DEFAULT 0.00,
  `dias_mora_corte` int(11) DEFAULT 30,
  `porcentaje_iva` decimal(5,2) DEFAULT 19.00,
  `porcentaje_interes` decimal(5,2) DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `configuracion_empresa`
--

INSERT INTO `configuracion_empresa` (`id`, `licencia`, `empresa_nombre`, `empresa_nit`, `empresa_direccion`, `empresa_ciudad`, `empresa_departamento`, `empresa_telefono`, `empresa_email`, `resolucion_facturacion`, `licencia_internet`, `vigilado`, `vigilado_internet`, `comentario`, `prefijo_factura`, `codigo_gs1`, `fecha_actualizacion`, `consecutivo_factura`, `consecutivo_contrato`, `consecutivo_recibo`, `valor_reconexion`, `dias_mora_corte`, `porcentaje_iva`, `porcentaje_interes`, `updated_at`) VALUES
(1, 'PRINCIPAL1', 'PROVEEDOR DE TELECOMUNICACIONES SAS.', '901582657-3', 'Carrera 9 No. 9-94', 'San Gil', 'SANTANDER', '3184550936', 'facturacion@psi.net.co', 'pendiente', 'pendiente', 'Registro unico de tic No. 96006732', 'pendiente', 'hola', 'FAC', 'GS1', '2025-06-11', 18, 1, 1, 10000.00, 15, 19.00, 15.00, '2025-07-08 22:05:48');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_facturacion`
--

CREATE TABLE `configuracion_facturacion` (
  `id` int(11) NOT NULL,
  `parametro` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  `tipo` enum('STRING','NUMBER','BOOLEAN','JSON','DATE') DEFAULT 'STRING',
  `descripcion` text DEFAULT NULL,
  `categoria` varchar(50) DEFAULT 'GENERAL',
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `configuracion_facturacion`
--

INSERT INTO `configuracion_facturacion` (`id`, `parametro`, `valor`, `tipo`, `descripcion`, `categoria`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'FACTURACION_AUTOMATICA_ACTIVA', 'true', 'BOOLEAN', 'Activar/desactivar facturación automática mensual', 'AUTOMATIZACION', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(2, 'DIAS_VENCIMIENTO_FACTURA', '15', 'NUMBER', 'Días para vencimiento de facturas desde fecha de emisión', 'FACTURACION', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(3, 'PORCENTAJE_INTERES_MORA', '2.0', 'NUMBER', 'Porcentaje de interés mensual por mora', 'MORA', 1, '2025-07-04 21:22:33', '2025-07-09 20:10:24'),
(4, 'DIAS_CORTE_SERVICIO', '30', 'NUMBER', 'Días de mora antes del corte automático de servicio', 'CORTE', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(5, 'VALOR_INSTALACION_DEFAULT', '42016', 'NUMBER', 'Valor por defecto para instalaciones nuevas', 'SERVICIOS', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(6, 'GENERAR_PDF_AUTOMATICO', 'true', 'BOOLEAN', 'Generar PDF automáticamente al crear facturas', 'PDF', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(7, 'ENVIAR_EMAIL_FACTURA', 'false', 'BOOLEAN', 'Enviar factura por email automáticamente', 'EMAIL', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(8, 'HORARIO_FACTURACION_MENSUAL', '06:00', 'STRING', 'Hora para ejecutar facturación mensual (HH:MM)', 'AUTOMATIZACION', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(9, 'INCLUIR_MOROSOS_FACTURACION', 'true', 'BOOLEAN', 'Incluir clientes con mora en facturación mensual', 'MORA', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(10, 'REDONDEAR_CENTAVOS', 'true', 'BOOLEAN', 'Redondear valores a centavos más cercanos', 'CALCULO', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(11, 'PERMITIR_FACTURAS_CERO', 'false', 'BOOLEAN', 'Permitir crear facturas con valor $0', 'VALIDACION', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33'),
(12, 'BACKUP_ANTES_FACTURACION', 'true', 'BOOLEAN', 'Crear backup antes de facturación masiva', 'SEGURIDAD', 1, '2025-07-04 21:22:33', '2025-07-04 21:22:33');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_iva`
--

CREATE TABLE `configuracion_iva` (
  `id` int(11) NOT NULL,
  `tipo_servicio` enum('internet','television','reconexion','varios','publicidad','interes','descuento') NOT NULL,
  `estrato_desde` int(11) NOT NULL,
  `estrato_hasta` int(11) NOT NULL,
  `aplica_iva` tinyint(1) NOT NULL DEFAULT 0,
  `porcentaje_iva` decimal(5,2) NOT NULL DEFAULT 0.00,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `configuracion_iva`
--

INSERT INTO `configuracion_iva` (`id`, `tipo_servicio`, `estrato_desde`, `estrato_hasta`, `aplica_iva`, `porcentaje_iva`, `descripcion`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'internet', 1, 3, 0, 0.00, 'Internet estratos 1,2,3 - Sin IVA', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(2, 'internet', 4, 6, 1, 19.00, 'Internet estratos 4,5,6 - Con IVA 19%', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(3, 'television', 1, 6, 1, 19.00, 'Televisión todos los estratos - Con IVA 19%', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(4, 'reconexion', 1, 6, 1, 19.00, 'Reconexión todos los estratos - Con IVA 19%', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(5, 'varios', 1, 6, 1, 19.00, 'Varios todos los estratos - Con IVA 19%', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(6, 'publicidad', 1, 6, 0, 0.00, 'Publicidad todos los estratos - Sin IVA', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(7, 'interes', 1, 6, 0, 0.00, 'Intereses todos los estratos - Sin IVA', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56'),
(8, 'descuento', 1, 6, 0, 0.00, 'Descuentos todos los estratos - Sin IVA', 1, '2025-07-09 19:04:56', '2025-07-09 19:04:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cortes_servicio`
--

CREATE TABLE `cortes_servicio` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `servicio_cliente_id` int(11) NOT NULL,
  `motivo` enum('mora','solicitud_cliente','mantenimiento','suspension_administrativa','otro') NOT NULL,
  `fecha_corte` date NOT NULL,
  `fecha_reconexion` date DEFAULT NULL,
  `costo_reconexion` decimal(10,2) DEFAULT 0.00,
  `realizado_por` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `departamentos`
--

CREATE TABLE `departamentos` (
  `id` int(11) NOT NULL,
  `codigo` varchar(5) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `departamentos`
--

INSERT INTO `departamentos` (`id`, `codigo`, `nombre`) VALUES
(1, '11', 'Bogotá D.C.'),
(2, '05', 'Antioquia'),
(3, '76', 'Valle del Cauca'),
(4, '08', 'Atlántico'),
(5, '13', 'Bolívar'),
(6, '12', 'Santander'),
(7, '14', 'Huila');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_facturas`
--

CREATE TABLE `detalle_facturas` (
  `id` int(11) NOT NULL,
  `factura_id` int(11) NOT NULL,
  `concepto_id` int(11) DEFAULT NULL,
  `concepto_nombre` varchar(255) NOT NULL,
  `cantidad` int(11) DEFAULT 1,
  `precio_unitario` decimal(10,2) NOT NULL,
  `descuento` decimal(10,2) DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL,
  `iva` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `servicio_cliente_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `facturacion_historial`
--

CREATE TABLE `facturacion_historial` (
  `id` int(11) NOT NULL,
  `tipo_proceso` enum('MENSUAL','INDIVIDUAL','MANUAL','CORRECCION') NOT NULL,
  `fecha_proceso` date NOT NULL,
  `clientes_procesados` int(11) DEFAULT 0,
  `facturas_generadas` int(11) DEFAULT 0,
  `facturas_fallidas` int(11) DEFAULT 0,
  `valor_total_facturado` decimal(15,2) DEFAULT 0.00,
  `errores_json` longtext DEFAULT NULL CHECK (json_valid(`errores_json`)),
  `parametros_json` longtext DEFAULT NULL CHECK (json_valid(`parametros_json`)),
  `tiempo_procesamiento_segundos` int(11) DEFAULT NULL,
  `estado` enum('INICIADO','COMPLETADO','FALLIDO','CANCELADO') DEFAULT 'INICIADO',
  `observaciones` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `facturas`
--

CREATE TABLE `facturas` (
  `id` int(11) NOT NULL,
  `numero_factura` varchar(20) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `identificacion_cliente` varchar(20) NOT NULL,
  `nombre_cliente` varchar(255) NOT NULL,
  `periodo_facturacion` varchar(7) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `fecha_desde` date DEFAULT NULL,
  `fecha_hasta` date DEFAULT NULL,
  `fecha_pago` date DEFAULT NULL,
  `internet` decimal(10,2) DEFAULT 0.00,
  `television` decimal(10,2) DEFAULT 0.00,
  `saldo_anterior` decimal(10,2) DEFAULT 0.00,
  `interes` decimal(10,2) DEFAULT 0.00,
  `reconexion` decimal(10,2) DEFAULT 0.00,
  `descuento` decimal(10,2) DEFAULT 0.00,
  `varios` decimal(10,2) DEFAULT 0.00,
  `publicidad` decimal(10,2) DEFAULT 0.00,
  `s_internet` decimal(10,2) DEFAULT 0.00,
  `s_television` decimal(10,2) DEFAULT 0.00,
  `s_interes` decimal(10,2) DEFAULT 0.00,
  `s_reconexion` decimal(10,2) DEFAULT 0.00,
  `s_descuento` decimal(10,2) DEFAULT 0.00,
  `s_varios` decimal(10,2) DEFAULT 0.00,
  `s_publicidad` decimal(10,2) DEFAULT 0.00,
  `s_iva` decimal(10,2) DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL,
  `iva` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `estado` enum('pendiente','pagada','vencida','anulada') DEFAULT 'pendiente',
  `metodo_pago` enum('efectivo','transferencia','tarjeta','cheque','consignacion') DEFAULT NULL,
  `referencia_pago` varchar(255) DEFAULT NULL,
  `banco_id` int(11) DEFAULT NULL,
  `ruta` varchar(10) DEFAULT NULL,
  `resolucion` varchar(100) DEFAULT NULL,
  `consignacion` char(1) DEFAULT NULL,
  `activo` char(1) DEFAULT '1',
  `observaciones` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `facturas`
--

INSERT INTO `facturas` (`id`, `numero_factura`, `cliente_id`, `identificacion_cliente`, `nombre_cliente`, `periodo_facturacion`, `fecha_emision`, `fecha_vencimiento`, `fecha_desde`, `fecha_hasta`, `fecha_pago`, `internet`, `television`, `saldo_anterior`, `interes`, `reconexion`, `descuento`, `varios`, `publicidad`, `s_internet`, `s_television`, `s_interes`, `s_reconexion`, `s_descuento`, `s_varios`, `s_publicidad`, `s_iva`, `subtotal`, `iva`, `total`, `estado`, `metodo_pago`, `referencia_pago`, `banco_id`, `ruta`, `resolucion`, `consignacion`, `activo`, `observaciones`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'FAC000001', 1, '1005450340', 'MATEO SALAZAR ORTIZ', '2025-06', '2025-06-01', '2025-06-16', '2025-06-01', '2025-06-30', NULL, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 59900.00, 'vencida', NULL, NULL, NULL, 'R01', 'Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022', NULL, '1', 'Factura de internet mensual', 1, '2025-06-09 13:29:14', '2025-07-04 21:22:33'),
(2, 'FAC000002', 2, '1234567890', 'JUAN PÉREZ LÓPEZ', '2025-06', '2025-06-01', '2025-06-16', '2025-06-01', '2025-06-30', '2025-06-10', 45000.00, 25000.00, 10000.00, 1500.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 25000.00, 1500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 81500.00, 0.00, 81500.00, 'pagada', 'efectivo', NULL, NULL, 'R02', NULL, NULL, '1', 'Internet + TV + saldo anterior + intereses', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(3, 'FAC000003', 3, '9876543210', 'MARÍA GARCÍA RUIZ', '2025-05', '2025-05-01', '2025-05-16', '2025-05-01', '2025-05-31', NULL, 39900.00, 15000.00, 0.00, 0.00, 11900.00, 0.00, 0.00, 0.00, 39900.00, 15000.00, 0.00, 11900.00, 0.00, 0.00, 0.00, 0.00, 66800.00, 0.00, 66800.00, 'vencida', NULL, NULL, NULL, 'R01', NULL, NULL, '1', 'Internet + TV + reconexión', 1, '2025-06-09 13:29:14', '2025-07-04 21:22:33'),
(4, 'FAC000004', 1, '1005450340', 'MATEO SALAZAR ORTIZ', '2025-05', '2025-05-01', '2025-05-16', '2025-05-01', '2025-05-31', NULL, 59900.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 0.00, 0.00, 59900.00, 0.00, 0.00, 0.00, 10000.00, 0.00, 0.00, 0.00, 49900.00, 0.00, 49900.00, 'pagada', NULL, NULL, NULL, 'R01', NULL, NULL, '1', 'Internet con descuento promocional', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(5, 'FAC000005', 2, '1234567890', 'JUAN PÉREZ LÓPEZ', '2025-04', '2025-04-01', '2025-04-16', '2025-04-01', '2025-04-30', NULL, 45000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 70000.00, 0.00, 70000.00, 'anulada', NULL, NULL, NULL, 'R02', NULL, NULL, '1', 'Factura anulada por error en facturación', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(6, 'FAC000006', 1, '12345678', 'Juan Carlos Rodríguez Méndez', '2025-06', '2025-06-26', '2025-06-16', '2025-06-01', '2025-06-30', NULL, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 59900.00, 'vencida', NULL, NULL, NULL, 'R01', NULL, NULL, '1', 'Duplicada de factura FAC000001', 1, '2025-06-26 14:21:49', '2025-07-04 21:22:33'),
(7, 'FAC000007', 2, '87654321', 'María Isabel García López', '2025-07', '2025-07-04', '2025-08-15', '2025-07-01', '2025-07-31', NULL, 49900.00, 50000.00, 10000.00, 0.00, 0.00, 0.00, 2000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 'pendiente', NULL, NULL, NULL, NULL, NULL, NULL, '1', NULL, 1, '2025-07-04 20:43:37', '2025-07-04 20:43:37'),
(16, '202500000002', 23, '52487047', 'Lina Maria Ortiz Pereira', '2025-07', '2025-07-08', '2025-08-07', '2025-07-08', NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 85000.00, 0.00, 85000.00, 'pendiente', NULL, NULL, NULL, NULL, NULL, NULL, '1', 'Primera factura automática', 1, '2025-07-08 15:16:25', '2025-07-08 15:19:56'),
(17, 'FAC000015', 25, '', '', '', '2025-07-08', '2025-08-07', NULL, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 0.00, 45000.00, 'pendiente', NULL, NULL, NULL, NULL, NULL, NULL, '1', 'Primera factura automática', NULL, '2025-07-08 19:36:14', '2025-07-08 19:36:14'),
(18, 'FAC000016', 26, '', '', '', '2025-07-08', '2025-08-07', NULL, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 65000.00, 0.00, 65000.00, 'pendiente', NULL, NULL, NULL, NULL, NULL, NULL, '1', 'Primera factura automática', NULL, '2025-07-08 21:27:30', '2025-07-08 21:27:30'),
(19, 'FAC000017', 27, '', '', '', '2025-07-08', '2025-08-07', NULL, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 0.00, 45000.00, 'pendiente', NULL, NULL, NULL, NULL, NULL, NULL, '1', 'Primera factura automática', NULL, '2025-07-08 21:49:13', '2025-07-08 21:49:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `incidencias_servicio`
--

CREATE TABLE `incidencias_servicio` (
  `id` int(11) NOT NULL,
  `numero_incidencia` varchar(20) NOT NULL,
  `tipo_incidencia` enum('programado','no_programado','emergencia') NOT NULL,
  `categoria` enum('fibra_cortada','falla_energia','mantenimiento','actualizacion','otros') NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `tiempo_duracion_minutos` int(11) DEFAULT NULL,
  `usuarios_afectados` int(11) DEFAULT 0,
  `municipio_id` int(11) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `coordenadas_lat` decimal(10,8) DEFAULT NULL,
  `coordenadas_lng` decimal(11,8) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `causa_raiz` text DEFAULT NULL,
  `solucion_aplicada` text DEFAULT NULL,
  `mecanismo_solucion` enum('reparacion','reemplazo','configuracion','otro') DEFAULT NULL,
  `estado` enum('reportado','en_atencion','resuelto','cerrado') DEFAULT 'reportado',
  `responsable_id` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `instalaciones`
--

CREATE TABLE `instalaciones` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `servicio_cliente_id` int(11) NOT NULL,
  `instalador_id` int(11) DEFAULT NULL,
  `fecha_programada` date NOT NULL,
  `hora_programada` time DEFAULT NULL,
  `fecha_realizada` date DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `estado` enum('programada','en_proceso','completada','cancelada','reagendada') DEFAULT 'programada',
  `direccion_instalacion` varchar(255) DEFAULT NULL,
  `barrio` varchar(100) DEFAULT NULL,
  `telefono_contacto` varchar(30) DEFAULT NULL,
  `persona_recibe` varchar(255) DEFAULT NULL,
  `tipo_instalacion` enum('nueva','migracion','upgrade','reparacion') DEFAULT 'nueva',
  `observaciones` text DEFAULT NULL,
  `equipos_instalados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`equipos_instalados`)),
  `fotos_instalacion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fotos_instalacion`)),
  `coordenadas_lat` decimal(10,8) DEFAULT NULL,
  `coordenadas_lng` decimal(11,8) DEFAULT NULL,
  `costo_instalacion` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `instalaciones`
--

INSERT INTO `instalaciones` (`id`, `cliente_id`, `servicio_cliente_id`, `instalador_id`, `fecha_programada`, `hora_programada`, `fecha_realizada`, `hora_inicio`, `hora_fin`, `estado`, `direccion_instalacion`, `barrio`, `telefono_contacto`, `persona_recibe`, `tipo_instalacion`, `observaciones`, `equipos_instalados`, `fotos_instalacion`, `coordenadas_lat`, `coordenadas_lng`, `costo_instalacion`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2025-06-20', '09:00:00', '2025-06-20', '09:15:00', '11:30:00', 'completada', 'Calle 15 # 23-45, Barrio Centro', 'Centro', '3001234567', 'Juan Carlos Rodríguez', 'nueva', 'Instalación exitosa. Cliente muy colaborador. Señal excelente.', '[\r\n        {\r\n            \"equipo_id\": 1,\r\n            \"equipo_codigo\": \"RTR001\",\r\n            \"equipo_nombre\": \"Router WiFi AC1200\",\r\n            \"cantidad\": 1,\r\n            \"numero_serie\": \"TPL2024001\",\r\n            \"observaciones\": \"Router principal instalado en sala\"\r\n        },\r\n        {\r\n            \"equipo_id\": 3,\r\n            \"equipo_codigo\": \"CBL001\", \r\n            \"equipo_nombre\": \"Cable UTP Cat6\",\r\n            \"cantidad\": 15,\r\n            \"numero_serie\": \"CAB-001-001\",\r\n            \"observaciones\": \"15 metros utilizados para conexión desde tap hasta router\"\r\n        }\r\n    ]', '[\r\n        {\r\n            \"url\": \"/uploads/instalaciones/1/foto1.jpg\",\r\n            \"descripcion\": \"Router instalado en sala principal\",\r\n            \"fecha\": \"2025-06-20 10:30:00\"\r\n        },\r\n        {\r\n            \"url\": \"/uploads/instalaciones/1/foto2.jpg\", \r\n            \"descripcion\": \"Conexión externa desde tap\",\r\n            \"fecha\": \"2025-06-20 11:00:00\"\r\n        }\r\n    ]', 6.26377500, -73.13758900, 25000.00, '2025-06-25 13:24:30', '2025-06-25 13:24:30'),
(2, 2, 2, 2, '2025-06-25', '14:00:00', NULL, '14:10:00', NULL, 'en_proceso', 'Carrera 10 # 45-67, Barrio Los Pinos', 'Los Pinos', '3109876543', 'María Isabel García', 'nueva', 'Instalación en progreso. Requiere conexión de fibra adicional.', '[\r\n        {\r\n            \"equipo_id\": 2,\r\n            \"equipo_codigo\": \"RTR002\",\r\n            \"equipo_nombre\": \"Router WiFi AX1800\", \r\n            \"cantidad\": 1,\r\n            \"numero_serie\": \"ASU2024001\",\r\n            \"observaciones\": \"Router de alta velocidad para plan 50MB\"\r\n        }\r\n    ]', NULL, 6.26412000, -73.13824500, 35000.00, '2025-06-25 13:24:30', '2025-06-25 13:24:30'),
(3, 3, 3, 3, '2025-06-26', '08:30:00', NULL, NULL, NULL, 'programada', 'Calle 8 # 12-34, Barrio San José', 'San José', '3201234567', 'Carlos Alberto Ruiz', 'nueva', 'Instalación combo internet + TV. Cliente requiere configuración especial para TV en 2 habitaciones.', '[\r\n        {\r\n            \"equipo_id\": 1,\r\n            \"equipo_codigo\": \"RTR001\",\r\n            \"equipo_nombre\": \"Router WiFi AC1200\",\r\n            \"cantidad\": 1,\r\n            \"numero_serie\": \"\",\r\n            \"observaciones\": \"Pendiente asignación de router específico\"\r\n        },\r\n        {\r\n            \"equipo_id\": 8,\r\n            \"equipo_codigo\": \"DEC001\", \r\n            \"equipo_nombre\": \"Decodificador TDT HD\",\r\n            \"cantidad\": 2,\r\n            \"numero_serie\": \"\",\r\n            \"observaciones\": \"2 decodificadores para habitaciones\"\r\n        },\r\n        {\r\n            \"equipo_id\": 4,\r\n            \"equipo_codigo\": \"CBL002\",\r\n            \"equipo_nombre\": \"Cable Coaxial RG6\",\r\n            \"cantidad\": 25,\r\n            \"numero_serie\": \"\",\r\n            \"observaciones\": \"Cable para distribución de señal TV\"\r\n        }\r\n    ]', NULL, 6.26289000, -73.13542300, 45000.00, '2025-06-25 13:24:30', '2025-06-25 13:24:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_equipos`
--

CREATE TABLE `inventario_equipos` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('router','decodificador','cable','antena','splitter','amplificador','otro') NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `modelo` varchar(100) DEFAULT NULL,
  `numero_serie` varchar(100) DEFAULT NULL,
  `estado` enum('disponible','asignado','instalado','dañado','perdido','mantenimiento','devuelto') DEFAULT 'disponible',
  `instalador_id` int(11) DEFAULT NULL,
  `fecha_asignacion` datetime DEFAULT NULL,
  `fecha_devolucion` datetime DEFAULT NULL,
  `precio_compra` decimal(10,2) DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `proveedor` varchar(255) DEFAULT NULL,
  `ubicacion` varchar(255) DEFAULT NULL,
  `ubicacion_actual` varchar(255) DEFAULT NULL,
  `coordenadas_lat` decimal(10,8) DEFAULT NULL,
  `coordenadas_lng` decimal(11,8) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `notas_instalador` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `inventario_equipos`
--

INSERT INTO `inventario_equipos` (`id`, `codigo`, `nombre`, `tipo`, `marca`, `modelo`, `numero_serie`, `estado`, `instalador_id`, `fecha_asignacion`, `fecha_devolucion`, `precio_compra`, `fecha_compra`, `proveedor`, `ubicacion`, `ubicacion_actual`, `coordenadas_lat`, `coordenadas_lng`, `observaciones`, `notas_instalador`, `created_at`, `updated_at`) VALUES
(1, 'RTR001', 'Router WiFi AC1200', 'router', 'TP-Link', 'Archer C6', 'TPL2024001', 'disponible', NULL, NULL, NULL, 75000.00, '2024-01-15', 'Distribuidora Tech', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(2, 'RTR002', 'Router WiFi AX1800', 'router', 'Asus', 'AX1800', 'ASU2024001', 'disponible', NULL, NULL, NULL, 120000.00, '2024-02-01', 'Distribuidora Tech', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(3, 'CBL001', 'Cable UTP Cat6 305m', 'cable', 'Panduit', 'Cat6-305', 'PAN2024001', 'disponible', NULL, NULL, NULL, 450000.00, '2024-01-20', 'Cables y Más', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(4, 'CBL002', 'Cable Coaxial RG6 305m', 'cable', 'CommScope', 'RG6-305', 'CS2024001', 'disponible', NULL, NULL, NULL, 280000.00, '2024-01-25', 'Cables y Más', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(5, 'ANT001', 'Antena Sectorial 2.4GHz', 'antena', 'Ubiquiti', 'AM-2G15-120', 'UBI2024001', 'disponible', NULL, NULL, NULL, 85000.00, '2024-02-10', 'Wireless Solutions', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(7, 'AMP001', 'Amplificador de Señal 30dB', 'otro', 'Antronix', 'CMA2030', 'ANT2024002', 'disponible', NULL, NULL, NULL, 45000.00, '2025-06-04', 'Electrónicos del Valle', 'sangil', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-11 13:20:46'),
(8, 'DEC001', 'Decodificador TDT HD', 'decodificador', 'Samsung', 'GX-SM530SH', 'SAM2024001', 'disponible', NULL, NULL, NULL, 45000.00, '2024-03-05', 'Samsung Colombia', 'San Gil', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 19:27:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_historial`
--

CREATE TABLE `inventario_historial` (
  `id` int(11) NOT NULL,
  `equipo_id` int(11) NOT NULL,
  `instalador_id` int(11) NOT NULL,
  `accion` enum('asignado','devuelto','instalado','retirado','dañado') NOT NULL,
  `fecha_accion` datetime NOT NULL DEFAULT current_timestamp(),
  `ubicacion` varchar(255) DEFAULT NULL,
  `coordenadas_lat` decimal(10,8) DEFAULT NULL,
  `coordenadas_lng` decimal(11,8) DEFAULT NULL,
  `notas` text DEFAULT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `instalacion_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `logs_sistema`
--

CREATE TABLE `logs_sistema` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `accion` varchar(255) NOT NULL,
  `tabla_afectada` varchar(100) DEFAULT NULL,
  `registro_id` int(11) DEFAULT NULL,
  `datos_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_anteriores`)),
  `datos_nuevos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_nuevos`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metricas_qos`
--

CREATE TABLE `metricas_qos` (
  `id` int(11) NOT NULL,
  `fecha_medicion` date NOT NULL,
  `mes` int(2) NOT NULL,
  `anno` year(4) NOT NULL,
  `semestre` int(1) NOT NULL,
  `disponibilidad_porcentaje` decimal(5,2) NOT NULL DEFAULT 99.00,
  `tiempo_actividad_minutos` int(11) NOT NULL DEFAULT 0,
  `tiempo_inactividad_minutos` int(11) NOT NULL DEFAULT 0,
  `incidencias_total` int(11) DEFAULT 0,
  `usuarios_promedio` int(11) DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `metricas_qos`
--

INSERT INTO `metricas_qos` (`id`, `fecha_medicion`, `mes`, `anno`, `semestre`, `disponibilidad_porcentaje`, `tiempo_actividad_minutos`, `tiempo_inactividad_minutos`, `incidencias_total`, `usuarios_promedio`, `observaciones`, `created_at`) VALUES
(1, '2025-06-30', 6, '2025', 1, 99.90, 43200, 0, 0, 0, NULL, '2025-06-09 17:03:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `factura_id` int(11) DEFAULT NULL,
  `numero_recibo` varchar(20) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo_pago` enum('efectivo','transferencia','tarjeta','cheque','consignacion') NOT NULL,
  `banco_id` int(11) DEFAULT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `numero_cheque` varchar(50) DEFAULT NULL,
  `fecha_pago` date NOT NULL,
  `observaciones` text DEFAULT NULL,
  `recibido_por` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planes_servicio`
--

CREATE TABLE `planes_servicio` (
  `id` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('internet','television','combo') NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `velocidad_subida` int(11) DEFAULT NULL,
  `velocidad_bajada` int(11) DEFAULT NULL,
  `canales_tv` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `aplica_iva` tinyint(1) DEFAULT 1,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `precio_internet` decimal(10,2) DEFAULT NULL COMMENT 'Precio del componente internet (para combos)',
  `precio_television` decimal(10,2) DEFAULT NULL COMMENT 'Precio del componente TV (para combos)',
  `precio_instalacion` decimal(10,2) DEFAULT 42016.00 COMMENT 'Costo de instalación para este plan',
  `requiere_instalacion` tinyint(1) DEFAULT 1 COMMENT 'Si requiere cobro de instalación',
  `segmento` enum('residencial','empresarial') DEFAULT 'residencial' COMMENT 'Segmento del plan',
  `tecnologia` varchar(50) DEFAULT 'Fibra Óptica' COMMENT 'Tecnología del servicio',
  `permanencia_meses` int(11) DEFAULT 0 COMMENT 'Meses de permanencia mínima',
  `descuento_combo` decimal(5,2) DEFAULT 0.00 COMMENT 'Porcentaje de descuento por combo',
  `conceptos_incluidos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Conceptos incluidos en formato JSON' CHECK (json_valid(`conceptos_incluidos`)),
  `orden_visualizacion` int(11) DEFAULT 0 COMMENT 'Orden para mostrar en listas',
  `promocional` tinyint(1) DEFAULT 0 COMMENT 'Si es un plan promocional',
  `fecha_inicio_promocion` date DEFAULT NULL COMMENT 'Inicio de promoción',
  `fecha_fin_promocion` date DEFAULT NULL COMMENT 'Fin de promoción',
  `aplica_iva_estrato_123` tinyint(1) DEFAULT 0 COMMENT 'Aplica IVA para estratos 1,2,3',
  `aplica_iva_estrato_456` tinyint(1) DEFAULT 1 COMMENT 'Aplica IVA para estratos 4,5,6',
  `precio_internet_sin_iva` decimal(10,2) DEFAULT 0.00 COMMENT 'Precio internet sin IVA',
  `precio_television_sin_iva` decimal(10,2) DEFAULT 0.00 COMMENT 'Precio TV sin IVA',
  `precio_internet_con_iva` decimal(10,2) DEFAULT 0.00 COMMENT 'Precio internet con IVA',
  `precio_television_con_iva` decimal(10,2) DEFAULT 0.00 COMMENT 'Precio TV con IVA'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `planes_servicio`
--

INSERT INTO `planes_servicio` (`id`, `codigo`, `nombre`, `tipo`, `precio`, `velocidad_subida`, `velocidad_bajada`, `canales_tv`, `descripcion`, `aplica_iva`, `activo`, `created_at`, `updated_at`, `precio_internet`, `precio_television`, `precio_instalacion`, `requiere_instalacion`, `segmento`, `tecnologia`, `permanencia_meses`, `descuento_combo`, `conceptos_incluidos`, `orden_visualizacion`, `promocional`, `fecha_inicio_promocion`, `fecha_fin_promocion`, `aplica_iva_estrato_123`, `aplica_iva_estrato_456`, `precio_internet_sin_iva`, `precio_television_sin_iva`, `precio_internet_con_iva`, `precio_television_con_iva`) VALUES
(1, 'INT10', 'Internet 10MB', 'internet', 45000.00, 2, 10, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 45000.00, 0.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 0, 0.00, '{\"internet\": 45000.00, \"instalacion\": 42016, \"tipo_principal\": \"internet\"}', 1, 0, NULL, NULL, 0, 1, 45000.00, 0.00, 53550.00, 0.00),
(2, 'INT30', 'Internet 30MB', 'internet', 65000.00, 5, 30, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 65000.00, 0.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 0, 0.00, '{\"internet\": 65000.00, \"instalacion\": 42016, \"tipo_principal\": \"internet\"}', 2, 0, NULL, NULL, 0, 1, 65000.00, 0.00, 77350.00, 0.00),
(3, 'INT50', 'Internet 50MB', 'internet', 85000.00, 10, 50, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 85000.00, 0.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 0, 0.00, '{\"internet\": 85000.00, \"instalacion\": 42016, \"tipo_principal\": \"internet\"}', 3, 0, NULL, NULL, 0, 1, 85000.00, 0.00, 101150.00, 0.00),
(4, 'TV_BAS', 'TV Básica', 'television', 35000.00, NULL, NULL, 80, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 0.00, 35000.00, 42016.00, 1, 'residencial', 'HFC (Cable)', 0, 0.00, '{\"television\": 25000.00, \"instalacion\": 42016, \"tipo_principal\": \"television\"}', 4, 0, NULL, NULL, 1, 1, 0.00, 29411.76, 0.00, 35000.00),
(5, 'TV_PREM', 'TV Premium', 'television', 45000.00, NULL, NULL, 100, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 0.00, 45000.00, 42016.00, 1, 'residencial', 'HFC (Cable)', 0, 0.00, '{\"television\": 45000.00, \"instalacion\": 42016, \"tipo_principal\": \"television\"}', 5, 0, NULL, NULL, 1, 1, 0.00, 37815.13, 0.00, 45000.00),
(6, 'COMBO1', 'Combo Internet 30MB + TV', 'combo', 75000.00, 5, 30, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-07-09 19:04:56', 48750.00, 26250.00, 42016.00, 1, 'residencial', 'Fibra Óptica + HFC', 0, 15.00, '{\"internet\": 48750.00, \"television\": 26250.00, \"instalacion\": 42016, \"descuento_combo\": 15.00, \"tipo_principal\": \"combo\"}', 6, 0, NULL, NULL, 0, 1, 48750.00, 22058.82, 58012.50, 26250.00),
(8, 'INT20', 'Internet 20MB Residencial', 'internet', 55000.00, 3, 20, NULL, 'Plan internet residencial 20MB ideal para navegación y streaming básico', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 55000.00, 0.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 12, 0.00, '{\"internet\": 55000, \"instalacion\": 42016, \"tipo_principal\": \"internet\"}', 7, 0, NULL, NULL, 0, 1, 55000.00, 0.00, 65450.00, 0.00),
(9, 'INT100', 'Internet 100MB Residencial', 'internet', 95000.00, 15, 100, NULL, 'Plan internet residencial 100MB para familias con alto consumo', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 95000.00, 0.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 12, 0.00, '{\"internet\": 95000, \"instalacion\": 42016, \"tipo_principal\": \"internet\"}', 8, 0, NULL, NULL, 0, 1, 95000.00, 0.00, 113050.00, 0.00),
(10, 'EMP50', 'Internet 50MB Empresarial', 'internet', 120000.00, 20, 50, NULL, 'Plan internet empresarial con soporte prioritario y IP fija', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 120000.00, 0.00, 60000.00, 1, 'empresarial', 'Fibra Óptica', 24, 0.00, '{\"internet\": 120000, \"instalacion\": 60000, \"tipo_principal\": \"internet\", \"ip_fija\": true}', 9, 0, NULL, NULL, 0, 1, 120000.00, 0.00, 142800.00, 0.00),
(11, 'TV_DIG', 'TV Digital HD', 'television', 35000.00, NULL, NULL, 120, 'Televisión digital HD con canales nacionales e internacionales', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 0.00, 35000.00, 42016.00, 1, 'residencial', 'Satelital', 12, 0.00, '{\"television\": 35000, \"instalacion\": 42016, \"tipo_principal\": \"television\"}', 10, 0, NULL, NULL, 1, 1, 0.00, 29411.76, 0.00, 35000.00),
(12, 'COMBO_30TV', 'Combo Internet 30MB + TV Básica', 'combo', 85000.00, 5, 30, 80, 'Combo económico ideal para familias: Internet 30MB + TV Básica', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 55250.00, 29750.00, 42016.00, 1, 'residencial', 'Fibra Óptica + HFC', 12, 15.00, '{\"internet\": 55250, \"television\": 29750, \"instalacion\": 42016, \"descuento_combo\": 15.00, \"tipo_principal\": \"combo\"}', 11, 0, NULL, NULL, 0, 1, 55250.00, 25000.00, 65747.50, 29750.00),
(13, 'COMBO_50PR', 'Combo Internet 50MB + TV Premium', 'combo', 115000.00, 10, 50, 100, 'Combo premium: Internet 50MB + TV Premium con canales HD', 1, 1, '2025-07-09 15:42:59', '2025-07-09 19:04:56', 74750.00, 40250.00, 42016.00, 1, 'residencial', 'Fibra Óptica + HFC', 12, 15.00, '{\"internet\": 74750, \"television\": 40250, \"instalacion\": 42016, \"descuento_combo\": 15.00, \"tipo_principal\": \"combo\"}', 12, 0, NULL, NULL, 0, 1, 74750.00, 33823.53, 88952.50, 40250.00),
(14, 'COMBO3', 'i', 'combo', 45000.00, 3, 2, 80, '', 1, 1, '2025-07-09 16:56:44', '2025-07-09 19:04:56', 29250.00, 15750.00, 42016.00, 1, 'residencial', 'Fibra Óptica', 0, 0.00, '{\"tipo_principal\":\"combo\",\"instalacion\":\"42016\",\"internet\":29250,\"television\":15750}', 0, 0, '0000-00-00', '0000-00-00', 0, 1, 29250.00, 13235.29, 34807.50, 15750.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `plantillas_correo`
--

CREATE TABLE `plantillas_correo` (
  `id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `asunto` varchar(255) DEFAULT NULL,
  `contenido` text NOT NULL,
  `tipo` enum('facturacion','corte','reconexion','bienvenida','general') DEFAULT 'general',
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `plantillas_correo`
--

INSERT INTO `plantillas_correo` (`id`, `titulo`, `asunto`, `contenido`, `tipo`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'Bienvenida', 'Bienvenido a nuestros servicios', 'Estimado cliente, le damos la bienvenida...', 'bienvenida', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(2, 'Facturación', 'Su factura está disponible', 'Su factura del mes está lista para descargar...', 'facturacion', 0, '2025-05-23 13:44:46', '2025-07-07 22:02:26'),
(3, 'Aviso de Corte', 'Aviso de suspensión de servicio', 'Le informamos que su servicio será suspendido...', 'corte', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(4, 'Factura Vencida', 'Su factura {{numero_factura}} está vencida', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <h2 style=\"color: #0e6493;\">{{empresa_nombre}}</h2>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que su factura número <strong>{{numero_factura}}</strong> con fecha de vencimiento <strong>{{fecha_vencimiento}}</strong> por valor de <strong>{{valor_factura}}</strong> se encuentra vencida.</p>\r\n    \r\n    <div style=\"background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0e6493; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0; color: #0e6493;\">Información de Pago</h3>\r\n        <p style=\"margin: 10px 0 0 0;\">Para realizar su pago, comuníquese con nosotros al <strong>{{telefono_soporte}}</strong> o visite nuestras oficinas.</p>\r\n    </div>\r\n    \r\n    <p>Evite la suspensión de su servicio realizando el pago a la mayor brevedad posible.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        Fecha: {{fecha_actual}}\r\n    </p>\r\n</div>', 'facturacion', 1, '2025-06-04 13:36:32', '2025-06-12 19:42:47'),
(5, 'Aviso Corte por Mora', 'URGENTE: Suspensión de servicio programada', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #dc3545; color: white; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">⚠️ AVISO URGENTE ⚠️</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que debido a mora en el pago de sus servicios, <strong>su servicio será suspendido en las próximas 24 horas</strong>.</p>\r\n    \r\n    <div style=\"background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #856404;\">Para evitar la suspensión:</h3>\r\n        <ul style=\"margin: 0; padding-left: 20px;\">\r\n            <li>Realice su pago inmediatamente</li>\r\n            <li>Comuníquese con nosotros al <strong>{{telefono_soporte}}</strong></li>\r\n            <li>Presente comprobante de pago</li>\r\n        </ul>\r\n    </div>\r\n    \r\n    <p><strong>Factura pendiente:</strong> {{numero_factura}}<br>\r\n    <strong>Valor:</strong> {{valor_factura}}<br>\r\n    <strong>Vencimiento:</strong> {{fecha_vencimiento}}</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        {{empresa_nombre}}<br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'corte', 1, '2025-06-04 13:36:32', '2025-06-04 13:54:32'),
(6, 'Servicio Restablecido', '✅ Su servicio ha sido restablecido', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #28a745; color: white; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">✅ SERVICIO RESTABLECIDO</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Nos complace informarle que su servicio ha sido <strong>restablecido exitosamente</strong>.</p>\r\n    \r\n    <div style=\"background-color: #d4edda; padding: 15px; border: 1px solid #c3e6cb; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #155724;\">Su servicio ya está activo</h3>\r\n        <p style=\"margin: 0;\">Puede comenzar a utilizar todos nuestros servicios normalmente.</p>\r\n    </div>\r\n    \r\n    <p>Agradecemos su pago y confianza en nuestros servicios.</p>\r\n    \r\n    <p>Si experimenta algún inconveniente técnico, no dude en contactarnos al <strong>{{telefono_soporte}}</strong>.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'reconexion', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(7, 'Bienvenida Nuevo Cliente', '¡Bienvenido a {{empresa_nombre}}!', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #0e6493; color: white; padding: 20px; text-align: center;\">\r\n        <h1 style=\"margin: 0;\">¡Bienvenido a {{empresa_nombre}}!</h1>\r\n    </div>\r\n    \r\n    <div style=\"padding: 20px;\">\r\n        <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n        \r\n        <p>¡Nos complace darle la bienvenida a nuestra familia de clientes!</p>\r\n        \r\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;\">\r\n            <h3 style=\"margin: 0 0 15px 0; color: #0e6493;\">Sus servicios incluyen:</h3>\r\n            <ul style=\"margin: 0; padding-left: 20px;\">\r\n                <li>Conexión de internet de alta velocidad</li>\r\n                <li>Soporte técnico especializado</li>\r\n                <li>Atención al cliente 24/7</li>\r\n                <li>Facturación electrónica</li>\r\n            </ul>\r\n        </div>\r\n        \r\n        <div style=\"background-color: #e7f3ff; padding: 15px; border-left: 4px solid #0e6493; margin: 20px 0;\">\r\n            <h3 style=\"margin: 0 0 10px 0;\">Información de contacto:</h3>\r\n            <p style=\"margin: 0;\"><strong>Soporte técnico:</strong> {{telefono_soporte}}</p>\r\n        </div>\r\n        \r\n        <p>Estamos aquí para brindarle el mejor servicio. No dude en contactarnos si tiene alguna pregunta.</p>\r\n        \r\n        <p style=\"margin-top: 30px;\">\r\n            ¡Gracias por elegirnos!<br>\r\n            <strong>{{empresa_nombre}}</strong><br>\r\n            {{fecha_actual}}\r\n        </p>\r\n    </div>\r\n</div>', 'bienvenida', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(8, 'Mantenimiento Programado', 'Mantenimiento programado - {{fecha_mantenimiento}}', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #ffc107; color: #212529; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">🔧 MANTENIMIENTO PROGRAMADO</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que realizaremos un mantenimiento programado en nuestros sistemas para mejorar la calidad del servicio.</p>\r\n    \r\n    <div style=\"background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #856404;\">Detalles del mantenimiento:</h3>\r\n        <p style=\"margin: 5px 0;\"><strong>Fecha:</strong> {{fecha_mantenimiento}}</p>\r\n        <p style=\"margin: 5px 0;\"><strong>Hora:</strong> {{hora_mantenimiento}}</p>\r\n        <p style=\"margin: 5px 0;\"><strong>Duración estimada:</strong> {{duracion_mantenimiento}}</p>\r\n    </div>\r\n    \r\n    <p>Durante este período, es posible que experimente interrupciones temporales en el servicio.</p>\r\n    \r\n    <p>Agradecemos su comprensión y disculpas por las molestias ocasionadas.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'general', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(9, 'prueba', 'esto es una prueba', 'pruena{{nombre_cliente}}', 'general', 1, '2025-06-04 19:25:58', '2025-06-04 19:25:58');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pqr`
--

CREATE TABLE `pqr` (
  `id` int(11) NOT NULL,
  `numero_radicado` varchar(20) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `tipo` enum('peticion','queja','reclamo','sugerencia') NOT NULL,
  `categoria` enum('facturacion','tecnico','comercial','atencion_cliente','otros') NOT NULL,
  `servicio_afectado` enum('internet','television','combo','todos') DEFAULT NULL,
  `medio_recepcion` enum('telefono','email','presencial','web','chat') NOT NULL,
  `fecha_recepcion` datetime NOT NULL,
  `fecha_respuesta` datetime DEFAULT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `estado` enum('abierto','en_proceso','resuelto','cerrado','escalado') DEFAULT 'abierto',
  `prioridad` enum('baja','media','alta','critica') DEFAULT 'media',
  `asunto` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `respuesta` text DEFAULT NULL,
  `tiempo_respuesta_horas` int(11) DEFAULT NULL,
  `satisfaccion_cliente` enum('muy_insatisfecho','insatisfecho','neutral','satisfecho','muy_satisfecho') DEFAULT NULL,
  `usuario_asignado` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rutas_cobranza`
--

CREATE TABLE `rutas_cobranza` (
  `id` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `cobrador_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sectores`
--

CREATE TABLE `sectores` (
  `id` int(11) NOT NULL,
  `codigo` varchar(3) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `ciudad_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sectores`
--

INSERT INTO `sectores` (`id`, `codigo`, `nombre`, `ciudad_id`, `activo`) VALUES
(1, '001', 'CENTRO', 5, 1),
(2, '111', 'Engativa', 1, 1),
(3, '684', 'zona central', 6, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicios_cliente`
--

CREATE TABLE `servicios_cliente` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `fecha_activacion` date NOT NULL,
  `fecha_suspension` date DEFAULT NULL,
  `estado` enum('activo','suspendido','cortado','cancelado') DEFAULT 'activo',
  `precio_personalizado` decimal(10,2) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `instalador_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `servicios_cliente`
--

INSERT INTO `servicios_cliente` (`id`, `cliente_id`, `plan_id`, `fecha_activacion`, `fecha_suspension`, `estado`, `precio_personalizado`, `observaciones`, `instalador_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2025-06-20', NULL, 'activo', NULL, NULL, 1, '2025-06-25 13:23:57', '2025-06-25 13:23:57'),
(2, 2, 3, '2025-06-22', NULL, 'activo', NULL, NULL, 2, '2025-06-25 13:23:57', '2025-06-25 13:23:57'),
(3, 3, 6, '2025-06-25', NULL, 'activo', NULL, NULL, 3, '2025-06-25 13:23:57', '2025-06-25 13:23:57'),
(6, 20, 1, '2025-07-08', NULL, 'activo', NULL, NULL, NULL, '2025-07-08 14:59:21', '2025-07-08 14:59:21'),
(9, 23, 3, '2025-07-08', NULL, 'activo', NULL, NULL, NULL, '2025-07-08 15:16:25', '2025-07-08 15:16:25'),
(10, 25, 1, '2025-07-08', NULL, 'activo', NULL, NULL, NULL, '2025-07-08 19:36:14', '2025-07-08 19:36:14'),
(11, 26, 2, '2025-07-08', NULL, 'activo', NULL, NULL, NULL, '2025-07-08 21:27:30', '2025-07-08 21:27:30'),
(12, 27, 1, '2025-07-08', NULL, 'activo', NULL, NULL, NULL, '2025-07-08 21:49:13', '2025-07-08 21:49:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sistema_usuarios`
--

CREATE TABLE `sistema_usuarios` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rol` enum('administrador','instalador','supervisor') NOT NULL DEFAULT 'supervisor',
  `activo` tinyint(1) DEFAULT 1,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sistema_usuarios`
--

INSERT INTO `sistema_usuarios` (`id`, `email`, `password`, `nombre`, `telefono`, `rol`, `activo`, `ultimo_acceso`, `created_at`, `updated_at`) VALUES
(1, 'admin@empresa.com', '$2b$12$8pOnup7urwhWUA7.e8VpEuDYuUiZ/gVTIf35HbnKQSWBMQeb7QXAa', 'Mateo salazar ortiz', '3007015239', 'administrador', 1, '2025-07-09 15:58:53', '2025-05-23 13:44:46', '2025-07-09 15:58:53'),
(2, 'super@empresa.com', '$2b$12$f1Vvth/hYSUD7VHtfmZKmOuNXrHowf0Fy2T7MtxdhRAZdIOQR8MCa', 'mateo salazar ortiz', '3007015239', 'supervisor', 1, '2025-06-03 16:18:19', '2025-05-30 14:32:41', '2025-06-11 13:07:30'),
(3, 'instalador@empresa.com', '$2b$12$FCgmtglWlgNJPwNmNbX3fOp8eRnvpeaSgKdteS0mKYtKHq1/qq6Ri', 'mateo salazar ortiz', '3007015239', 'instalador', 1, '2025-06-04 16:44:35', '2025-05-30 15:00:25', '2025-06-04 16:44:35');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_cartera_actual`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_cartera_actual` (
`cliente_id` int(11)
,`identificacion` varchar(20)
,`cliente_nombre` varchar(255)
,`telefono` varchar(30)
,`correo` varchar(100)
,`sector` varchar(100)
,`sector_codigo` varchar(3)
,`facturas_pendientes` bigint(21)
,`saldo_total` decimal(32,2)
,`fecha_primera_mora` date
,`dias_mora_maxima` bigint(7)
,`categoria_mora` varchar(13)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_cartera_vencida`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_cartera_vencida` (
`id` int(11)
,`numero_factura` varchar(20)
,`identificacion_cliente` varchar(20)
,`nombre_cliente` varchar(255)
,`fecha_vencimiento` date
,`total` decimal(10,2)
,`estado` enum('pendiente','pagada','vencida','anulada')
,`dias_vencido` int(7)
,`telefono` varchar(30)
,`direccion` text
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_clientes_activos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_clientes_activos` (
`id` int(11)
,`identificacion` varchar(20)
,`nombre` varchar(255)
,`telefono` varchar(30)
,`direccion` text
,`estado` enum('activo','suspendido','cortado','retirado','inactivo')
,`sector` varchar(100)
,`estado_servicio` enum('activo','suspendido','cortado','cancelado')
,`plan_nombre` varchar(255)
,`precio_plan` decimal(10,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_equipos_instaladores`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_equipos_instaladores` (
`id` int(11)
,`codigo` varchar(50)
,`nombre` varchar(255)
,`tipo` enum('router','decodificador','cable','antena','splitter','amplificador','otro')
,`marca` varchar(100)
,`modelo` varchar(100)
,`numero_serie` varchar(100)
,`estado` enum('disponible','asignado','instalado','dañado','perdido','mantenimiento','devuelto')
,`precio_compra` decimal(10,2)
,`fecha_compra` date
,`proveedor` varchar(255)
,`ubicacion` varchar(255)
,`ubicacion_actual` varchar(255)
,`coordenadas_lat` decimal(10,8)
,`coordenadas_lng` decimal(11,8)
,`observaciones` text
,`notas_instalador` text
,`instalador_id` int(11)
,`fecha_asignacion` datetime
,`fecha_devolucion` datetime
,`instalador_nombre` varchar(255)
,`instalador_telefono` varchar(20)
,`instalador_email` varchar(255)
,`created_at` timestamp
,`updated_at` timestamp
,`dias_asignado` int(7)
,`estado_descriptivo` varchar(269)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_estadisticas_mensuales`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_estadisticas_mensuales` (
`periodo` varchar(7)
,`total_facturas` bigint(21)
,`pendientes` bigint(21)
,`pagadas` bigint(21)
,`anuladas` bigint(21)
,`vencidas` bigint(21)
,`valor_total_facturado` decimal(32,2)
,`valor_recaudado` decimal(32,2)
,`valor_pendiente_cobro` decimal(32,2)
,`promedio_factura` decimal(14,6)
,`clientes_facturados` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_estadisticas_pqr`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_estadisticas_pqr` (
`anno` int(4)
,`trimestre` int(1)
,`mes` int(2)
,`tipo` enum('peticion','queja','reclamo','sugerencia')
,`categoria` enum('facturacion','tecnico','comercial','atencion_cliente','otros')
,`medio_recepcion` enum('telefono','email','presencial','web','chat')
,`estado` enum('abierto','en_proceso','resuelto','cerrado','escalado')
,`total_pqr` bigint(21)
,`tiempo_promedio_respuesta` decimal(14,4)
,`resueltos` decimal(22,0)
,`satisfechos` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_metricas_disponibilidad`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_metricas_disponibilidad` (
`anno` year(4)
,`semestre` int(1)
,`mes` int(2)
,`disponibilidad_promedio` decimal(9,6)
,`total_inactividad_minutos` decimal(32,0)
,`total_incidencias` decimal(32,0)
,`meses_reportados` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_planes_completos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_planes_completos` (
`id` int(11)
,`codigo` varchar(10)
,`nombre` varchar(255)
,`tipo` enum('internet','television','combo')
,`precio` decimal(10,2)
,`precio_internet` decimal(10,2)
,`precio_television` decimal(10,2)
,`velocidad_subida` int(11)
,`velocidad_bajada` int(11)
,`canales_tv` int(11)
,`descripcion` text
,`precio_instalacion` decimal(10,2)
,`requiere_instalacion` tinyint(1)
,`segmento` enum('residencial','empresarial')
,`tecnologia` varchar(50)
,`permanencia_meses` int(11)
,`descuento_combo` decimal(5,2)
,`orden_visualizacion` int(11)
,`promocional` tinyint(1)
,`aplica_iva` tinyint(1)
,`activo` tinyint(1)
,`created_at` timestamp
,`updated_at` timestamp
,`tipo_servicio_detallado` varchar(13)
,`precio_con_iva` decimal(13,4)
,`velocidad_total` bigint(12)
,`clientes_activos` bigint(21)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_precios_con_iva`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_precios_con_iva` (
`id` int(11)
,`codigo` varchar(10)
,`nombre` varchar(255)
,`tipo` enum('internet','television','combo')
,`precio_base` decimal(10,2)
,`precio_internet` decimal(10,2)
,`precio_television` decimal(10,2)
,`precio_internet_sin_iva` decimal(10,2)
,`precio_internet_con_iva` decimal(12,2)
,`precio_television_sin_iva` decimal(13,2)
,`precio_television_con_iva` decimal(10,2)
,`activo` tinyint(1)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_reportes_crc`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_reportes_crc` (
`tipo_reporte` varchar(23)
,`valor` decimal(22,2)
,`descripcion` varchar(26)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_suscriptores_tecnologia`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_suscriptores_tecnologia` (
`ciudad_id` int(11)
,`ciudad_nombre` varchar(100)
,`segmento` varchar(11)
,`tipo_servicio` enum('internet','television','combo')
,`total_suscriptores` bigint(21)
,`suscriptores_activos` decimal(22,0)
,`precio_promedio` decimal(14,6)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_cartera_actual`
--
DROP TABLE IF EXISTS `vista_cartera_actual`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_cartera_actual`  AS SELECT `c`.`id` AS `cliente_id`, `c`.`identificacion` AS `identificacion`, `c`.`nombre` AS `cliente_nombre`, `c`.`telefono` AS `telefono`, `c`.`correo` AS `correo`, `s`.`nombre` AS `sector`, `s`.`codigo` AS `sector_codigo`, count(`f`.`id`) AS `facturas_pendientes`, sum(`f`.`total`) AS `saldo_total`, min(`f`.`fecha_vencimiento`) AS `fecha_primera_mora`, max(to_days(curdate()) - to_days(`f`.`fecha_vencimiento`)) AS `dias_mora_maxima`, CASE WHEN max(to_days(curdate()) - to_days(`f`.`fecha_vencimiento`)) <= 30 THEN 'MORA_TEMPRANA' WHEN max(to_days(curdate()) - to_days(`f`.`fecha_vencimiento`)) <= 60 THEN 'MORA_MEDIA' WHEN max(to_days(curdate()) - to_days(`f`.`fecha_vencimiento`)) <= 90 THEN 'MORA_ALTA' ELSE 'MORA_CRITICA' END AS `categoria_mora` FROM ((`clientes` `c` join `facturas` `f` on(`c`.`id` = `f`.`cliente_id`)) left join `sectores` `s` on(`c`.`sector_id` = `s`.`id`)) WHERE `f`.`estado` in ('pendiente','vencida') AND `f`.`activo` = '1' AND `c`.`estado` = 'activo' GROUP BY `c`.`id` HAVING `saldo_total` > 0 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_cartera_vencida`
--
DROP TABLE IF EXISTS `vista_cartera_vencida`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_cartera_vencida`  AS SELECT `f`.`id` AS `id`, `f`.`numero_factura` AS `numero_factura`, `f`.`identificacion_cliente` AS `identificacion_cliente`, `f`.`nombre_cliente` AS `nombre_cliente`, `f`.`fecha_vencimiento` AS `fecha_vencimiento`, `f`.`total` AS `total`, `f`.`estado` AS `estado`, to_days(curdate()) - to_days(`f`.`fecha_vencimiento`) AS `dias_vencido`, `c`.`telefono` AS `telefono`, `c`.`direccion` AS `direccion` FROM (`facturas` `f` join `clientes` `c` on(`f`.`cliente_id` = `c`.`id`)) WHERE `f`.`estado` = 'pendiente' AND `f`.`fecha_vencimiento` < curdate() ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_clientes_activos`
--
DROP TABLE IF EXISTS `vista_clientes_activos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_clientes_activos`  AS SELECT `c`.`id` AS `id`, `c`.`identificacion` AS `identificacion`, `c`.`nombre` AS `nombre`, `c`.`telefono` AS `telefono`, `c`.`direccion` AS `direccion`, `c`.`estado` AS `estado`, `s`.`nombre` AS `sector`, `sc`.`estado` AS `estado_servicio`, `ps`.`nombre` AS `plan_nombre`, `ps`.`precio` AS `precio_plan` FROM (((`clientes` `c` left join `sectores` `s` on(`c`.`sector_id` = `s`.`id`)) left join `servicios_cliente` `sc` on(`c`.`id` = `sc`.`cliente_id`)) left join `planes_servicio` `ps` on(`sc`.`plan_id` = `ps`.`id`)) WHERE `c`.`estado` = 'activo' AND `sc`.`estado` = 'activo' ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_equipos_instaladores`
--
DROP TABLE IF EXISTS `vista_equipos_instaladores`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_equipos_instaladores`  AS SELECT `e`.`id` AS `id`, `e`.`codigo` AS `codigo`, `e`.`nombre` AS `nombre`, `e`.`tipo` AS `tipo`, `e`.`marca` AS `marca`, `e`.`modelo` AS `modelo`, `e`.`numero_serie` AS `numero_serie`, `e`.`estado` AS `estado`, `e`.`precio_compra` AS `precio_compra`, `e`.`fecha_compra` AS `fecha_compra`, `e`.`proveedor` AS `proveedor`, `e`.`ubicacion` AS `ubicacion`, `e`.`ubicacion_actual` AS `ubicacion_actual`, `e`.`coordenadas_lat` AS `coordenadas_lat`, `e`.`coordenadas_lng` AS `coordenadas_lng`, `e`.`observaciones` AS `observaciones`, `e`.`notas_instalador` AS `notas_instalador`, `e`.`instalador_id` AS `instalador_id`, `e`.`fecha_asignacion` AS `fecha_asignacion`, `e`.`fecha_devolucion` AS `fecha_devolucion`, `u`.`nombre` AS `instalador_nombre`, `u`.`telefono` AS `instalador_telefono`, `u`.`email` AS `instalador_email`, `e`.`created_at` AS `created_at`, `e`.`updated_at` AS `updated_at`, CASE WHEN `e`.`fecha_asignacion` is not null AND `e`.`fecha_devolucion` is null THEN to_days(current_timestamp()) - to_days(`e`.`fecha_asignacion`) WHEN `e`.`fecha_asignacion` is not null AND `e`.`fecha_devolucion` is not null THEN to_days(`e`.`fecha_devolucion`) - to_days(`e`.`fecha_asignacion`) ELSE NULL END AS `dias_asignado`, CASE WHEN `e`.`estado` = 'asignado' AND `e`.`instalador_id` is not null THEN concat('Asignado a ',`u`.`nombre`) WHEN `e`.`estado` = 'instalado' AND `e`.`instalador_id` is not null THEN concat('Instalado por ',`u`.`nombre`) ELSE `e`.`estado` END AS `estado_descriptivo` FROM (`inventario_equipos` `e` left join `sistema_usuarios` `u` on(`e`.`instalador_id` = `u`.`id` and `u`.`rol` = 'instalador')) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_estadisticas_mensuales`
--
DROP TABLE IF EXISTS `vista_estadisticas_mensuales`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_estadisticas_mensuales`  AS SELECT date_format(`facturas`.`fecha_emision`,'%Y-%m') AS `periodo`, count(0) AS `total_facturas`, count(case when `facturas`.`estado` = 'pendiente' then 1 end) AS `pendientes`, count(case when `facturas`.`estado` = 'pagada' then 1 end) AS `pagadas`, count(case when `facturas`.`estado` = 'anulada' then 1 end) AS `anuladas`, count(case when `facturas`.`estado` = 'vencida' then 1 end) AS `vencidas`, sum(`facturas`.`total`) AS `valor_total_facturado`, sum(case when `facturas`.`estado` = 'pagada' then `facturas`.`total` else 0 end) AS `valor_recaudado`, sum(case when `facturas`.`estado` in ('pendiente','vencida') then `facturas`.`total` else 0 end) AS `valor_pendiente_cobro`, avg(`facturas`.`total`) AS `promedio_factura`, count(distinct `facturas`.`cliente_id`) AS `clientes_facturados` FROM `facturas` WHERE `facturas`.`activo` = '1' GROUP BY date_format(`facturas`.`fecha_emision`,'%Y-%m') ORDER BY date_format(`facturas`.`fecha_emision`,'%Y-%m') DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_estadisticas_pqr`
--
DROP TABLE IF EXISTS `vista_estadisticas_pqr`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_estadisticas_pqr`  AS SELECT year(`pqr`.`fecha_recepcion`) AS `anno`, quarter(`pqr`.`fecha_recepcion`) AS `trimestre`, month(`pqr`.`fecha_recepcion`) AS `mes`, `pqr`.`tipo` AS `tipo`, `pqr`.`categoria` AS `categoria`, `pqr`.`medio_recepcion` AS `medio_recepcion`, `pqr`.`estado` AS `estado`, count(0) AS `total_pqr`, avg(`pqr`.`tiempo_respuesta_horas`) AS `tiempo_promedio_respuesta`, sum(case when `pqr`.`estado` in ('resuelto','cerrado') then 1 else 0 end) AS `resueltos`, sum(case when `pqr`.`satisfaccion_cliente` in ('satisfecho','muy_satisfecho') then 1 else 0 end) AS `satisfechos` FROM `pqr` GROUP BY year(`pqr`.`fecha_recepcion`), quarter(`pqr`.`fecha_recepcion`), month(`pqr`.`fecha_recepcion`), `pqr`.`tipo`, `pqr`.`categoria`, `pqr`.`medio_recepcion`, `pqr`.`estado` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_metricas_disponibilidad`
--
DROP TABLE IF EXISTS `vista_metricas_disponibilidad`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_metricas_disponibilidad`  AS SELECT `metricas_qos`.`anno` AS `anno`, `metricas_qos`.`semestre` AS `semestre`, `metricas_qos`.`mes` AS `mes`, avg(`metricas_qos`.`disponibilidad_porcentaje`) AS `disponibilidad_promedio`, sum(`metricas_qos`.`tiempo_inactividad_minutos`) AS `total_inactividad_minutos`, sum(`metricas_qos`.`incidencias_total`) AS `total_incidencias`, count(0) AS `meses_reportados` FROM `metricas_qos` GROUP BY `metricas_qos`.`anno`, `metricas_qos`.`semestre` ORDER BY `metricas_qos`.`anno` DESC, `metricas_qos`.`semestre` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_planes_completos`
--
DROP TABLE IF EXISTS `vista_planes_completos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_planes_completos`  AS SELECT `p`.`id` AS `id`, `p`.`codigo` AS `codigo`, `p`.`nombre` AS `nombre`, `p`.`tipo` AS `tipo`, `p`.`precio` AS `precio`, `p`.`precio_internet` AS `precio_internet`, `p`.`precio_television` AS `precio_television`, `p`.`velocidad_subida` AS `velocidad_subida`, `p`.`velocidad_bajada` AS `velocidad_bajada`, `p`.`canales_tv` AS `canales_tv`, `p`.`descripcion` AS `descripcion`, `p`.`precio_instalacion` AS `precio_instalacion`, `p`.`requiere_instalacion` AS `requiere_instalacion`, `p`.`segmento` AS `segmento`, `p`.`tecnologia` AS `tecnologia`, `p`.`permanencia_meses` AS `permanencia_meses`, `p`.`descuento_combo` AS `descuento_combo`, `p`.`orden_visualizacion` AS `orden_visualizacion`, `p`.`promocional` AS `promocional`, `p`.`aplica_iva` AS `aplica_iva`, `p`.`activo` AS `activo`, `p`.`created_at` AS `created_at`, `p`.`updated_at` AS `updated_at`, CASE WHEN `p`.`precio_internet` > 0 AND `p`.`precio_television` > 0 THEN 'Combo' WHEN `p`.`precio_internet` > 0 THEN 'Solo Internet' WHEN `p`.`precio_television` > 0 THEN 'Solo TV' ELSE 'Otro' END AS `tipo_servicio_detallado`, CASE WHEN `p`.`aplica_iva` = 1 THEN `p`.`precio`* 1.19 ELSE `p`.`precio` END AS `precio_con_iva`, coalesce(`p`.`velocidad_subida`,0) + coalesce(`p`.`velocidad_bajada`,0) AS `velocidad_total`, (select count(0) from `servicios_cliente` `sc` where `sc`.`plan_id` = `p`.`id` and `sc`.`estado` = 'activo') AS `clientes_activos` FROM `planes_servicio` AS `p` WHERE `p`.`activo` = 1 ORDER BY `p`.`orden_visualizacion` ASC, `p`.`precio` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_precios_con_iva`
--
DROP TABLE IF EXISTS `vista_precios_con_iva`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_precios_con_iva`  AS SELECT `p`.`id` AS `id`, `p`.`codigo` AS `codigo`, `p`.`nombre` AS `nombre`, `p`.`tipo` AS `tipo`, `p`.`precio` AS `precio_base`, `p`.`precio_internet` AS `precio_internet`, `p`.`precio_television` AS `precio_television`, CASE WHEN `p`.`tipo` = 'internet' THEN `p`.`precio` WHEN `p`.`tipo` = 'combo' THEN `p`.`precio_internet` ELSE 0 END AS `precio_internet_sin_iva`, CASE WHEN `p`.`tipo` = 'internet' THEN round(`p`.`precio` * 1.19,2) WHEN `p`.`tipo` = 'combo' THEN round(`p`.`precio_internet` * 1.19,2) ELSE 0 END AS `precio_internet_con_iva`, CASE WHEN `p`.`tipo` = 'television' THEN round(`p`.`precio` / 1.19,2) WHEN `p`.`tipo` = 'combo' THEN round(`p`.`precio_television` / 1.19,2) ELSE 0 END AS `precio_television_sin_iva`, CASE WHEN `p`.`tipo` = 'television' THEN `p`.`precio` WHEN `p`.`tipo` = 'combo' THEN `p`.`precio_television` ELSE 0 END AS `precio_television_con_iva`, `p`.`activo` AS `activo` FROM `planes_servicio` AS `p` WHERE `p`.`activo` = 1 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_reportes_crc`
--
DROP TABLE IF EXISTS `vista_reportes_crc`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_reportes_crc`  AS SELECT 'suscriptores_activos' AS `tipo_reporte`, count(distinct `c`.`id`) AS `valor`, 'Total suscriptores activos' AS `descripcion` FROM (`clientes` `c` join `servicios_cliente` `sc` on(`c`.`id` = `sc`.`cliente_id`)) WHERE `c`.`estado` = 'activo' AND `sc`.`estado` = 'activo'union all select 'pqr_abiertas' AS `tipo_reporte`,count(0) AS `valor`,'PQR abiertas' AS `descripcion` from `pqr` where `pqr`.`estado` in ('abierto','en_proceso') union all select 'disponibilidad_promedio' AS `tipo_reporte`,round(avg(`metricas_qos`.`disponibilidad_porcentaje`),2) AS `valor`,'Disponibilidad promedio %' AS `descripcion` from `metricas_qos` where `metricas_qos`.`fecha_medicion` >= current_timestamp() - interval 6 month  ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_suscriptores_tecnologia`
--
DROP TABLE IF EXISTS `vista_suscriptores_tecnologia`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_suscriptores_tecnologia`  AS SELECT `c`.`ciudad_id` AS `ciudad_id`, `ci`.`nombre` AS `ciudad_nombre`, CASE WHEN `c`.`estrato` in ('1','2','3') THEN 'RESIDENCIAL' ELSE 'EMPRESARIAL' END AS `segmento`, `ps`.`tipo` AS `tipo_servicio`, count(distinct `sc`.`cliente_id`) AS `total_suscriptores`, sum(case when `sc`.`estado` = 'activo' then 1 else 0 end) AS `suscriptores_activos`, avg(`ps`.`precio`) AS `precio_promedio` FROM (((`servicios_cliente` `sc` join `clientes` `c` on(`sc`.`cliente_id` = `c`.`id`)) join `ciudades` `ci` on(`c`.`ciudad_id` = `ci`.`id`)) join `planes_servicio` `ps` on(`sc`.`plan_id` = `ps`.`id`)) WHERE `c`.`estado` in ('activo','suspendido') GROUP BY `c`.`ciudad_id`, `ci`.`nombre`, CASE WHEN `c`.`estrato` in ('1','2','3') THEN 'RESIDENCIAL' ELSE 'EMPRESARIAL' END, `ps`.`tipo` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `bancos`
--
ALTER TABLE `bancos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`);

--
-- Indices de la tabla `ciudades`
--
ALTER TABLE `ciudades`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_departamento` (`departamento_id`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `identificacion` (`identificacion`),
  ADD KEY `idx_identificacion` (`identificacion`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_telefono` (`telefono`),
  ADD KEY `idx_sector` (`sector_id`),
  ADD KEY `idx_ruta` (`ruta`),
  ADD KEY `idx_contrato` (`contrato`),
  ADD KEY `idx_codigo_usuario` (`codigo_usuario`),
  ADD KEY `ciudad_id` (`ciudad_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indices de la tabla `clientes_inactivos`
--
ALTER TABLE `clientes_inactivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_identificacion` (`identificacion`),
  ADD KEY `idx_fecha_inactivacion` (`fecha_inactivacion`),
  ADD KEY `cliente_id` (`cliente_id`);

--
-- Indices de la tabla `codigos_regulatorios`
--
ALTER TABLE `codigos_regulatorios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_codigo` (`codigo`);

--
-- Indices de la tabla `conceptos_facturacion`
--
ALTER TABLE `conceptos_facturacion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `licencia` (`licencia`),
  ADD KEY `idx_licencia` (`licencia`);

--
-- Indices de la tabla `configuracion_facturacion`
--
ALTER TABLE `configuracion_facturacion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_parametro` (`parametro`);

--
-- Indices de la tabla `configuracion_iva`
--
ALTER TABLE `configuracion_iva`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `cortes_servicio`
--
ALTER TABLE `cortes_servicio`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_fecha_corte` (`fecha_corte`),
  ADD KEY `idx_motivo` (`motivo`),
  ADD KEY `servicio_cliente_id` (`servicio_cliente_id`),
  ADD KEY `realizado_por` (`realizado_por`);

--
-- Indices de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`);

--
-- Indices de la tabla `detalle_facturas`
--
ALTER TABLE `detalle_facturas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_factura` (`factura_id`),
  ADD KEY `idx_concepto` (`concepto_id`),
  ADD KEY `servicio_cliente_id` (`servicio_cliente_id`);

--
-- Indices de la tabla `facturacion_historial`
--
ALTER TABLE `facturacion_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha_proceso` (`fecha_proceso`),
  ADD KEY `idx_tipo_proceso` (`tipo_proceso`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `facturas`
--
ALTER TABLE `facturas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_factura` (`numero_factura`),
  ADD KEY `idx_numero_factura` (`numero_factura`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_identificacion` (`identificacion_cliente`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_emision` (`fecha_emision`),
  ADD KEY `idx_fecha_vencimiento` (`fecha_vencimiento`),
  ADD KEY `idx_periodo` (`periodo_facturacion`),
  ADD KEY `idx_ruta` (`ruta`),
  ADD KEY `banco_id` (`banco_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_estado_fecha` (`estado`,`fecha_emision`),
  ADD KEY `idx_cliente_estado` (`cliente_id`,`estado`),
  ADD KEY `idx_periodo_estado` (`periodo_facturacion`,`estado`),
  ADD KEY `idx_fecha_vencimientoo` (`fecha_vencimiento`),
  ADD KEY `idx_numero_facturaa` (`numero_factura`),
  ADD KEY `idx_identificacion_cliente` (`identificacion_cliente`),
  ADD KEY `idx_nombre_cliente` (`nombre_cliente`),
  ADD KEY `idx_activo_estado` (`activo`,`estado`),
  ADD KEY `idx_ruta_estado` (`ruta`,`estado`);

--
-- Indices de la tabla `incidencias_servicio`
--
ALTER TABLE `incidencias_servicio`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_incidencia` (`numero_incidencia`),
  ADD KEY `idx_fecha_inicio` (`fecha_inicio`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_municipio` (`municipio_id`),
  ADD KEY `idx_responsable` (`responsable_id`),
  ADD KEY `idx_incidencias_fecha_inicio` (`fecha_inicio`),
  ADD KEY `idx_incidencias_estado` (`estado`);

--
-- Indices de la tabla `instalaciones`
--
ALTER TABLE `instalaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_instalador` (`instalador_id`),
  ADD KEY `idx_fecha_programada` (`fecha_programada`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `servicio_cliente_id` (`servicio_cliente_id`);

--
-- Indices de la tabla `inventario_equipos`
--
ALTER TABLE `inventario_equipos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_numero_serie` (`numero_serie`),
  ADD KEY `idx_instalador` (`instalador_id`),
  ADD KEY `idx_estado_instalador` (`estado`,`instalador_id`),
  ADD KEY `idx_fecha_asignacion` (`fecha_asignacion`);

--
-- Indices de la tabla `inventario_historial`
--
ALTER TABLE `inventario_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_equipo` (`equipo_id`),
  ADD KEY `idx_instalador` (`instalador_id`),
  ADD KEY `idx_fecha` (`fecha_accion`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `fk_historial_cliente` (`cliente_id`),
  ADD KEY `fk_historial_instalacion` (`instalacion_id`),
  ADD KEY `fk_historial_created_by` (`created_by`);

--
-- Indices de la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_accion` (`accion`),
  ADD KEY `idx_tabla` (`tabla_afectada`),
  ADD KEY `idx_fecha` (`created_at`);

--
-- Indices de la tabla `metricas_qos`
--
ALTER TABLE `metricas_qos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha` (`fecha_medicion`),
  ADD KEY `idx_anno_semestre` (`anno`,`semestre`),
  ADD KEY `idx_anno_mes` (`anno`,`mes`),
  ADD KEY `idx_metricas_fecha` (`fecha_medicion`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_recibo` (`numero_recibo`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_factura` (`factura_id`),
  ADD KEY `idx_fecha_pago` (`fecha_pago`),
  ADD KEY `idx_metodo_pago` (`metodo_pago`),
  ADD KEY `idx_numero_recibo` (`numero_recibo`),
  ADD KEY `banco_id` (`banco_id`),
  ADD KEY `recibido_por` (`recibido_por`);

--
-- Indices de la tabla `planes_servicio`
--
ALTER TABLE `planes_servicio`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_activo` (`activo`),
  ADD KEY `idx_precio` (`precio`),
  ADD KEY `idx_segmento` (`segmento`),
  ADD KEY `idx_tecnologia` (`tecnologia`),
  ADD KEY `idx_orden_visualizacion` (`orden_visualizacion`),
  ADD KEY `idx_promocional` (`promocional`),
  ADD KEY `idx_precio_internet` (`precio_internet`),
  ADD KEY `idx_precio_television` (`precio_television`);

--
-- Indices de la tabla `plantillas_correo`
--
ALTER TABLE `plantillas_correo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indices de la tabla `pqr`
--
ALTER TABLE `pqr`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_radicado` (`numero_radicado`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_recepcion` (`fecha_recepcion`),
  ADD KEY `idx_usuario_asignado` (`usuario_asignado`),
  ADD KEY `idx_pqr_fecha_recepcion` (`fecha_recepcion`),
  ADD KEY `idx_pqr_estado_tipo` (`estado`,`tipo`);

--
-- Indices de la tabla `rutas_cobranza`
--
ALTER TABLE `rutas_cobranza`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_cobrador` (`cobrador_id`);

--
-- Indices de la tabla `sectores`
--
ALTER TABLE `sectores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_codigo` (`codigo`),
  ADD KEY `idx_ciudad` (`ciudad_id`);

--
-- Indices de la tabla `servicios_cliente`
--
ALTER TABLE `servicios_cliente`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cliente` (`cliente_id`),
  ADD KEY `idx_plan` (`plan_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_activacion` (`fecha_activacion`),
  ADD KEY `instalador_id` (`instalador_id`);

--
-- Indices de la tabla `sistema_usuarios`
--
ALTER TABLE `sistema_usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_rol` (`rol`),
  ADD KEY `idx_activo` (`activo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `bancos`
--
ALTER TABLE `bancos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `ciudades`
--
ALTER TABLE `ciudades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de la tabla `clientes_inactivos`
--
ALTER TABLE `clientes_inactivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `codigos_regulatorios`
--
ALTER TABLE `codigos_regulatorios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- AUTO_INCREMENT de la tabla `conceptos_facturacion`
--
ALTER TABLE `conceptos_facturacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=912;

--
-- AUTO_INCREMENT de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `configuracion_facturacion`
--
ALTER TABLE `configuracion_facturacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=134;

--
-- AUTO_INCREMENT de la tabla `configuracion_iva`
--
ALTER TABLE `configuracion_iva`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `cortes_servicio`
--
ALTER TABLE `cortes_servicio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `detalle_facturas`
--
ALTER TABLE `detalle_facturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `facturacion_historial`
--
ALTER TABLE `facturacion_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `facturas`
--
ALTER TABLE `facturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `incidencias_servicio`
--
ALTER TABLE `incidencias_servicio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `instalaciones`
--
ALTER TABLE `instalaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `inventario_equipos`
--
ALTER TABLE `inventario_equipos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `inventario_historial`
--
ALTER TABLE `inventario_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `metricas_qos`
--
ALTER TABLE `metricas_qos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `planes_servicio`
--
ALTER TABLE `planes_servicio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `plantillas_correo`
--
ALTER TABLE `plantillas_correo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `pqr`
--
ALTER TABLE `pqr`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rutas_cobranza`
--
ALTER TABLE `rutas_cobranza`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sectores`
--
ALTER TABLE `sectores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `servicios_cliente`
--
ALTER TABLE `servicios_cliente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `sistema_usuarios`
--
ALTER TABLE `sistema_usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `ciudades`
--
ALTER TABLE `ciudades`
  ADD CONSTRAINT `ciudades_ibfk_1` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos` (`id`);

--
-- Filtros para la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`sector_id`) REFERENCES `sectores` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `clientes_ibfk_2` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `clientes_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `clientes_inactivos`
--
ALTER TABLE `clientes_inactivos`
  ADD CONSTRAINT `clientes_inactivos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `cortes_servicio`
--
ALTER TABLE `cortes_servicio`
  ADD CONSTRAINT `cortes_servicio_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cortes_servicio_ibfk_2` FOREIGN KEY (`servicio_cliente_id`) REFERENCES `servicios_cliente` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cortes_servicio_ibfk_3` FOREIGN KEY (`realizado_por`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `detalle_facturas`
--
ALTER TABLE `detalle_facturas`
  ADD CONSTRAINT `detalle_facturas_ibfk_1` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_facturas_ibfk_2` FOREIGN KEY (`concepto_id`) REFERENCES `conceptos_facturacion` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `detalle_facturas_ibfk_3` FOREIGN KEY (`servicio_cliente_id`) REFERENCES `servicios_cliente` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `facturas`
--
ALTER TABLE `facturas`
  ADD CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `facturas_ibfk_2` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `facturas_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `incidencias_servicio`
--
ALTER TABLE `incidencias_servicio`
  ADD CONSTRAINT `incidencias_ibfk_1` FOREIGN KEY (`municipio_id`) REFERENCES `ciudades` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `incidencias_ibfk_2` FOREIGN KEY (`responsable_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `instalaciones`
--
ALTER TABLE `instalaciones`
  ADD CONSTRAINT `instalaciones_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `instalaciones_ibfk_2` FOREIGN KEY (`servicio_cliente_id`) REFERENCES `servicios_cliente` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `instalaciones_ibfk_3` FOREIGN KEY (`instalador_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `inventario_equipos`
--
ALTER TABLE `inventario_equipos`
  ADD CONSTRAINT `fk_inventario_instalador` FOREIGN KEY (`instalador_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `inventario_historial`
--
ALTER TABLE `inventario_historial`
  ADD CONSTRAINT `fk_historial_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_historial_created_by` FOREIGN KEY (`created_by`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_historial_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `inventario_equipos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_historial_instalacion` FOREIGN KEY (`instalacion_id`) REFERENCES `instalaciones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_historial_instalador` FOREIGN KEY (`instalador_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `logs_sistema`
--
ALTER TABLE `logs_sistema`
  ADD CONSTRAINT `logs_sistema_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pagos_ibfk_3` FOREIGN KEY (`banco_id`) REFERENCES `bancos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pagos_ibfk_4` FOREIGN KEY (`recibido_por`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `pqr`
--
ALTER TABLE `pqr`
  ADD CONSTRAINT `pqr_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pqr_ibfk_2` FOREIGN KEY (`usuario_asignado`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `rutas_cobranza`
--
ALTER TABLE `rutas_cobranza`
  ADD CONSTRAINT `rutas_cobranza_ibfk_1` FOREIGN KEY (`cobrador_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sectores`
--
ALTER TABLE `sectores`
  ADD CONSTRAINT `sectores_ibfk_1` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `servicios_cliente`
--
ALTER TABLE `servicios_cliente`
  ADD CONSTRAINT `servicios_cliente_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `servicios_cliente_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `planes_servicio` (`id`),
  ADD CONSTRAINT `servicios_cliente_ibfk_3` FOREIGN KEY (`instalador_id`) REFERENCES `sistema_usuarios` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
