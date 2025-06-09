-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-06-2025 a las 16:29:12
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
(11, '052', 'Banco AV Villas', 1),
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
(5, 5, '13001', 'Cartagena');

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
(1, '12345678', 'cedula', 'Juan Carlos Rodríguez Méndez', 'Calle 15 # 23-45, Barrio Centro', 1, '3', 'Centro', 5, '3001234567', '6012345678', 'juan.rodriguez@email.com', '2024-01-15', '2025-01-15', 'activo', 'AA:BB:CC:DD:EE:01', '192.168.1.101', 'TAP001', 'P-001', 'CT-00001', 'R001', 0, 'USR00001', 'Cliente preferencial, pago puntual', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(2, '87654321', 'cedula', 'María Isabel García López', 'Carrera 10 # 45-67, Barrio Los Pinos', 1, '4', 'Los Pinos', 5, '3109876543', NULL, 'maria.garcia@gmail.com', '2024-02-01', '2025-02-01', 'activo', 'AA:BB:CC:DD:EE:02', '192.168.1.102', 'TAP002', 'P-002', 'CT-00002', 'R001', 0, 'USR00002', 'Servicio de internet y TV', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(3, '23456789', 'cedula', 'Carlos Alberto Ruiz Vargas', 'Calle 8 # 12-34, Barrio San José', 1, '2', 'San José', 5, '3201234567', '6078901234', 'carlos.ruiz@hotmail.com', '2024-01-20', '2025-01-20', 'suspendido', 'AA:BB:CC:DD:EE:03', '192.168.1.103', 'TAP003', 'P-003', 'CT-00003', 'R002', 1, 'USR00003', 'Suspendido por mora - Requiere reconexión', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(4, '34567890', 'cedula', 'Ana Patricia Morales Castellanos', 'Transversal 5 # 78-90, Barrio Villa Nueva', 1, '3', 'Villa Nueva', 5, '3156789012', NULL, 'ana.morales@empresa.com', '2024-03-01', '2025-03-01', 'activo', 'AA:BB:CC:DD:EE:04', '192.168.1.104', 'TAP004', 'P-004', 'CT-00004', 'R001', 0, 'USR00004', 'Cliente empresarial', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(5, '45678901', 'cedula', 'Luis Fernando Torres Jiménez', 'Avenida Principal # 100-25, Barrio El Progreso', 1, '5', 'El Progreso', 5, '3012345678', '6075432109', 'luis.torres@correo.co', '2024-02-15', '2025-02-15', 'activo', 'AA:BB:CC:DD:EE:05', '192.168.1.105', 'TAP005', 'P-005', 'CT-00005', 'R002', 0, 'USR00005', 'Plan premium, servicio completo', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(6, '56789012', 'cedula', 'Sandra Milena Castro Romero', 'Calle 25 # 15-80, Barrio La Esperanza', 1, '2', 'La Esperanza', 5, '3178901234', NULL, 'sandra.castro@yahoo.com', '2024-03-10', '2025-03-10', 'activo', 'AA:BB:CC:DD:EE:06', '192.168.1.106', 'TAP006', 'P-006', 'CT-00006', 'R001', 0, 'USR00006', 'Solo servicio de internet', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(7, '67890123', 'cedula', 'Roberto Andrés Silva Peña', 'Carrera 20 # 30-45, Barrio Las Flores', 1, '3', 'Las Flores', 5, '3023456789', '6012987654', 'roberto.silva@outlook.com', '2023-12-01', '2024-12-01', 'cortado', 'AA:BB:CC:DD:EE:07', '192.168.1.107', 'TAP007', 'P-007', 'CT-00007', 'R002', 1, 'USR00007', 'Cortado por mora prolongada', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(8, '78901234', 'cedula', 'Claudia Elena Vargas Muñoz', 'Diagonal 12 # 56-78, Barrio Nuevo Horizonte', 1, '4', 'Nuevo Horizonte', 5, '3134567890', NULL, 'claudia.vargas@gmail.com', '2024-01-30', '2025-01-30', 'activo', 'AA:BB:CC:DD:EE:08', '192.168.1.108', 'TAP008', 'P-008', 'CT-00008', 'R001', 0, 'USR00008', 'Excelente historial de pagos', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(9, '900123456', 'nit', 'Empresa XYZ Servicios Ltda', 'Calle 50 # 100-200, Zona Industrial', 1, '6', 'Zona Industrial', 5, '6017654321', '3001111111', 'info@empresaxyz.com', '2024-02-20', '2025-02-20', 'activo', 'AA:BB:CC:DD:EE:09', '192.168.1.109', 'TAP009', 'P-009', 'CT-00009', 'R003', 0, 'USR00009', 'Cliente corporativo - Plan empresarial', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55'),
(10, '89012345', 'cedula', 'Pedro José Hernández Rueda', 'Calle 35 # 67-89, Barrio El Recuerdo', 1, '3', 'El Recuerdo', 5, '3187654321', '6013456789', 'pedro.hernandez@correo.com', '2024-03-05', '2025-03-05', 'activo', 'AA:BB:CC:DD:EE:10', '192.168.1.110', 'TAP010', 'P-010', 'CT-00010', 'R002', 0, 'USR00010', 'Cliente nuevo - Plan básico', 1, '2025-06-06 14:46:55', '2025-06-06 14:46:55');

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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `conceptos_facturacion`
--

INSERT INTO `conceptos_facturacion` (`id`, `codigo`, `nombre`, `valor_base`, `aplica_iva`, `porcentaje_iva`, `descripcion`, `tipo`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'INT', 'Servicio Internet', 0.00, 1, 0.00, NULL, 'internet', 1, '2025-05-23 13:44:46', '2025-06-03 13:58:34'),
(2, 'TV', 'Servicio Televisión basico', 0.00, 1, 0.00, NULL, 'television', 1, '2025-05-23 13:44:46', '2025-06-03 13:58:50'),
(3, 'REC', 'Reconexión', 0.00, 1, 0.00, NULL, 'reconexion', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(4, 'INT_M', 'Intereses por Mora', 0.00, 0, 0.00, NULL, 'interes', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(5, 'DESC', 'Descuento', 0.00, 0, 0.00, NULL, 'descuento', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(6, 'VAR', 'Varios', 0.00, 1, 0.00, NULL, 'varios', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(7, 'PUB', 'Publicidad', 0.00, 1, 0.00, NULL, 'publicidad', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46');

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
(1, 'DEMO2024', 'Mi Empresa PSI', '900123456-1', 'DFD', 'SANGIL', 'SANTANDER', '44478787', 'PSI@PSI.COM.CO', 'SDSDFSDFDSFSD', 'DFSDFSDFS', 'DFSDFSF', 'DFSDFSDF', 'DFSDF', 'FAC', 'GS1', '2025-05-29', 6, 1, 1, 15000.00, 30, 19.00, 15.00, '2025-06-09 13:29:15');

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
(5, '13', 'Bolívar');

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
(1, 'FAC000001', 1, '1005450340', 'MATEO SALAZAR ORTIZ', '2025-06', '2025-06-01', '2025-06-16', '2025-06-01', '2025-06-30', NULL, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 59900.00, 0.00, 59900.00, 'pendiente', NULL, NULL, NULL, 'R01', 'Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022', NULL, '1', 'Factura de internet mensual', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(2, 'FAC000002', 2, '1234567890', 'JUAN PÉREZ LÓPEZ', '2025-06', '2025-06-01', '2025-06-16', '2025-06-01', '2025-06-30', '2025-06-10', 45000.00, 25000.00, 10000.00, 1500.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 25000.00, 1500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 81500.00, 0.00, 81500.00, 'pagada', 'efectivo', NULL, NULL, 'R02', NULL, NULL, '1', 'Internet + TV + saldo anterior + intereses', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(3, 'FAC000003', 3, '9876543210', 'MARÍA GARCÍA RUIZ', '2025-05', '2025-05-01', '2025-05-16', '2025-05-01', '2025-05-31', NULL, 39900.00, 15000.00, 0.00, 0.00, 11900.00, 0.00, 0.00, 0.00, 39900.00, 15000.00, 0.00, 11900.00, 0.00, 0.00, 0.00, 0.00, 66800.00, 0.00, 66800.00, 'pendiente', NULL, NULL, NULL, 'R01', NULL, NULL, '1', 'Internet + TV + reconexión', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(4, 'FAC000004', 1, '1005450340', 'MATEO SALAZAR ORTIZ', '2025-05', '2025-05-01', '2025-05-16', '2025-05-01', '2025-05-31', NULL, 59900.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 0.00, 0.00, 59900.00, 0.00, 0.00, 0.00, 10000.00, 0.00, 0.00, 0.00, 49900.00, 0.00, 49900.00, 'pagada', NULL, NULL, NULL, 'R01', NULL, NULL, '1', 'Internet con descuento promocional', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14'),
(5, 'FAC000005', 2, '1234567890', 'JUAN PÉREZ LÓPEZ', '2025-04', '2025-04-01', '2025-04-16', '2025-04-01', '2025-04-30', NULL, 45000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 25000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 70000.00, 0.00, 70000.00, 'anulada', NULL, NULL, NULL, 'R02', NULL, NULL, '1', 'Factura anulada por error en facturación', 1, '2025-06-09 13:29:14', '2025-06-09 13:29:14');

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
  `observaciones` text DEFAULT NULL,
  `equipos_instalados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`equipos_instalados`)),
  `fotos_instalacion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fotos_instalacion`)),
  `coordenadas_lat` decimal(10,8) DEFAULT NULL,
  `coordenadas_lng` decimal(11,8) DEFAULT NULL,
  `costo_instalacion` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(6, 'SPL001', 'Splitter 1x8 5-1000MHz', 'splitter', 'Antronix', 'CMC2008H', 'ANT2024001', 'disponible', NULL, NULL, NULL, 15000.00, '2024-02-15', 'Electrónicos del Valle', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 15:12:48'),
(7, 'AMP001', 'Amplificador de Señal 30dB', 'otro', 'Antronix', 'CMA2030', 'ANT2024002', 'disponible', NULL, NULL, NULL, 45000.00, '2025-06-04', 'Electrónicos del Valle', 'Almacén Principal', NULL, NULL, NULL, NULL, NULL, '2025-06-04 15:12:48', '2025-06-04 19:36:26'),
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
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `planes_servicio`
--

INSERT INTO `planes_servicio` (`id`, `codigo`, `nombre`, `tipo`, `precio`, `velocidad_subida`, `velocidad_bajada`, `canales_tv`, `descripcion`, `aplica_iva`, `activo`, `created_at`, `updated_at`) VALUES
(1, 'INT10', 'Internet 10MB', 'internet', 45000.00, 2, 10, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(2, 'INT30', 'Internet 30MB', 'internet', 65000.00, 5, 30, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(3, 'INT50', 'Internet 50MB', 'internet', 85000.00, 10, 50, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(4, 'TV_BAS', 'TV Básica', 'television', 25000.00, NULL, NULL, 80, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-29 22:23:56'),
(5, 'TV_PREM', 'TV Premium', 'television', 45000.00, NULL, NULL, 100, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-29 22:24:00'),
(6, 'COMBO1', 'Combo Internet 30MB + TV', 'combo', 75000.00, 5, 30, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46');

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
(2, 'Facturación', 'Su factura está disponible', 'Su factura del mes está lista para descargar...', 'facturacion', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(3, 'Aviso de Corte', 'Aviso de suspensión de servicio', 'Le informamos que su servicio será suspendido...', 'corte', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(4, 'Factura Vencida', 'Su factura {{numero_factura}} está vencida', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <h2 style=\"color: #0e6493;\">{{empresa_nombre}}</h2>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que su factura número <strong>{{numero_factura}}</strong> con fecha de vencimiento <strong>{{fecha_vencimiento}}</strong> por valor de <strong>{{valor_factura}}</strong> se encuentra vencida.</p>\r\n    \r\n    <div style=\"background-color: #f8f9fa; padding: 15px; border-left: 4px solid #0e6493; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0; color: #0e6493;\">Información de Pago</h3>\r\n        <p style=\"margin: 10px 0 0 0;\">Para realizar su pago, comuníquese con nosotros al <strong>{{telefono_soporte}}</strong> o visite nuestras oficinas.</p>\r\n    </div>\r\n    \r\n    <p>Evite la suspensión de su servicio realizando el pago a la mayor brevedad posible.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        Fecha: {{fecha_actual}}\r\n    </p>\r\n</div>', 'facturacion', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(5, 'Aviso Corte por Mora', 'URGENTE: Suspensión de servicio programada', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #dc3545; color: white; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">⚠️ AVISO URGENTE ⚠️</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que debido a mora en el pago de sus servicios, <strong>su servicio será suspendido en las próximas 24 horas</strong>.</p>\r\n    \r\n    <div style=\"background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #856404;\">Para evitar la suspensión:</h3>\r\n        <ul style=\"margin: 0; padding-left: 20px;\">\r\n            <li>Realice su pago inmediatamente</li>\r\n            <li>Comuníquese con nosotros al <strong>{{telefono_soporte}}</strong></li>\r\n            <li>Presente comprobante de pago</li>\r\n        </ul>\r\n    </div>\r\n    \r\n    <p><strong>Factura pendiente:</strong> {{numero_factura}}<br>\r\n    <strong>Valor:</strong> {{valor_factura}}<br>\r\n    <strong>Vencimiento:</strong> {{fecha_vencimiento}}</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        {{empresa_nombre}}<br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'corte', 1, '2025-06-04 13:36:32', '2025-06-04 13:54:32'),
(6, 'Servicio Restablecido', '✅ Su servicio ha sido restablecido', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #28a745; color: white; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">✅ SERVICIO RESTABLECIDO</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Nos complace informarle que su servicio ha sido <strong>restablecido exitosamente</strong>.</p>\r\n    \r\n    <div style=\"background-color: #d4edda; padding: 15px; border: 1px solid #c3e6cb; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #155724;\">Su servicio ya está activo</h3>\r\n        <p style=\"margin: 0;\">Puede comenzar a utilizar todos nuestros servicios normalmente.</p>\r\n    </div>\r\n    \r\n    <p>Agradecemos su pago y confianza en nuestros servicios.</p>\r\n    \r\n    <p>Si experimenta algún inconveniente técnico, no dude en contactarnos al <strong>{{telefono_soporte}}</strong>.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'reconexion', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(7, 'Bienvenida Nuevo Cliente', '¡Bienvenido a {{empresa_nombre}}!', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #0e6493; color: white; padding: 20px; text-align: center;\">\r\n        <h1 style=\"margin: 0;\">¡Bienvenido a {{empresa_nombre}}!</h1>\r\n    </div>\r\n    \r\n    <div style=\"padding: 20px;\">\r\n        <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n        \r\n        <p>¡Nos complace darle la bienvenida a nuestra familia de clientes!</p>\r\n        \r\n        <div style=\"background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;\">\r\n            <h3 style=\"margin: 0 0 15px 0; color: #0e6493;\">Sus servicios incluyen:</h3>\r\n            <ul style=\"margin: 0; padding-left: 20px;\">\r\n                <li>Conexión de internet de alta velocidad</li>\r\n                <li>Soporte técnico especializado</li>\r\n                <li>Atención al cliente 24/7</li>\r\n                <li>Facturación electrónica</li>\r\n            </ul>\r\n        </div>\r\n        \r\n        <div style=\"background-color: #e7f3ff; padding: 15px; border-left: 4px solid #0e6493; margin: 20px 0;\">\r\n            <h3 style=\"margin: 0 0 10px 0;\">Información de contacto:</h3>\r\n            <p style=\"margin: 0;\"><strong>Soporte técnico:</strong> {{telefono_soporte}}</p>\r\n        </div>\r\n        \r\n        <p>Estamos aquí para brindarle el mejor servicio. No dude en contactarnos si tiene alguna pregunta.</p>\r\n        \r\n        <p style=\"margin-top: 30px;\">\r\n            ¡Gracias por elegirnos!<br>\r\n            <strong>{{empresa_nombre}}</strong><br>\r\n            {{fecha_actual}}\r\n        </p>\r\n    </div>\r\n</div>', 'bienvenida', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(8, 'Mantenimiento Programado', 'Mantenimiento programado - {{fecha_mantenimiento}}', '<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\r\n    <div style=\"background-color: #ffc107; color: #212529; padding: 15px; text-align: center; margin-bottom: 20px;\">\r\n        <h2 style=\"margin: 0;\">🔧 MANTENIMIENTO PROGRAMADO</h2>\r\n    </div>\r\n    \r\n    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>\r\n    \r\n    <p>Le informamos que realizaremos un mantenimiento programado en nuestros sistemas para mejorar la calidad del servicio.</p>\r\n    \r\n    <div style=\"background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 5px; margin: 20px 0;\">\r\n        <h3 style=\"margin: 0 0 10px 0; color: #856404;\">Detalles del mantenimiento:</h3>\r\n        <p style=\"margin: 5px 0;\"><strong>Fecha:</strong> {{fecha_mantenimiento}}</p>\r\n        <p style=\"margin: 5px 0;\"><strong>Hora:</strong> {{hora_mantenimiento}}</p>\r\n        <p style=\"margin: 5px 0;\"><strong>Duración estimada:</strong> {{duracion_mantenimiento}}</p>\r\n    </div>\r\n    \r\n    <p>Durante este período, es posible que experimente interrupciones temporales en el servicio.</p>\r\n    \r\n    <p>Agradecemos su comprensión y disculpas por las molestias ocasionadas.</p>\r\n    \r\n    <p style=\"margin-top: 30px;\">\r\n        Atentamente,<br>\r\n        <strong>{{empresa_nombre}}</strong><br>\r\n        {{fecha_actual}}\r\n    </p>\r\n</div>', 'general', 1, '2025-06-04 13:36:32', '2025-06-04 13:36:32'),
(9, 'prueba', 'esto es una prueba', 'pruena{{nombre_cliente}}', 'general', 1, '2025-06-04 19:25:58', '2025-06-04 19:25:58');

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
(1, '001', 'CENTRO', 5, 1);

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
(1, 'admin@empresa.com', '$2b$10$G79aY18UGoMa8iEa65GvieeQi74v7DkXCmQs4sVxuuhNCdWUBjcGO', 'Mateo salazar ortiz', '3007015239', 'administrador', 1, '2025-06-09 13:18:25', '2025-05-23 13:44:46', '2025-06-09 13:18:25'),
(2, 'super@empresa.com', '$2b$12$f1Vvth/hYSUD7VHtfmZKmOuNXrHowf0Fy2T7MtxdhRAZdIOQR8MCa', 'mateo salazar ortiz', '3007015239', 'supervisor', 1, '2025-06-03 16:18:19', '2025-05-30 14:32:41', '2025-06-03 16:18:19'),
(3, 'instalador@empresa.com', '$2b$12$FCgmtglWlgNJPwNmNbX3fOp8eRnvpeaSgKdteS0mKYtKHq1/qq6Ri', 'mateo salazar ortiz', '3007015239', 'instalador', 1, '2025-06-04 16:44:35', '2025-05-30 15:00:25', '2025-06-04 16:44:35');

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
  ADD KEY `created_by` (`created_by`);

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
  ADD KEY `idx_precio` (`precio`);

--
-- Indices de la tabla `plantillas_correo`
--
ALTER TABLE `plantillas_correo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tipo` (`tipo`),
  ADD KEY `idx_activo` (`activo`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `clientes_inactivos`
--
ALTER TABLE `clientes_inactivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `conceptos_facturacion`
--
ALTER TABLE `conceptos_facturacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `cortes_servicio`
--
ALTER TABLE `cortes_servicio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `departamentos`
--
ALTER TABLE `departamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `detalle_facturas`
--
ALTER TABLE `detalle_facturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `facturas`
--
ALTER TABLE `facturas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `instalaciones`
--
ALTER TABLE `instalaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `planes_servicio`
--
ALTER TABLE `planes_servicio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `plantillas_correo`
--
ALTER TABLE `plantillas_correo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `rutas_cobranza`
--
ALTER TABLE `rutas_cobranza`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sectores`
--
ALTER TABLE `sectores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `servicios_cliente`
--
ALTER TABLE `servicios_cliente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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