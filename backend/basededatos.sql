-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-05-2025 a las 16:58:16
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
(12, '053', 'Banco Davivienda', 1);

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
(1, 'INT', 'Servicio Internet', 0.00, 1, 0.00, NULL, 'internet', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(2, 'TV', 'Servicio Televisión', 0.00, 1, 0.00, NULL, 'television', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
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
(1, 'DEMO2024', 'Mi Empresa ISP', '900123456-1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'FAC', NULL, NULL, 1, 1, 1, 15000.00, 30, 19.00, 0.00, '2025-05-23 13:44:46');

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
  `estado` enum('disponible','instalado','dañado','perdido','mantenimiento') DEFAULT 'disponible',
  `precio_compra` decimal(10,2) DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `proveedor` varchar(255) DEFAULT NULL,
  `ubicacion` varchar(255) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
(4, 'TV_BAS', 'TV Básica', 'television', 25000.00, NULL, NULL, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
(5, 'TV_PREM', 'TV Premium', 'television', 45000.00, NULL, NULL, NULL, NULL, 1, 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46'),
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
(3, 'Aviso de Corte', 'Aviso de suspensión de servicio', 'Le informamos que su servicio será suspendido...', 'corte', 1, '2025-05-23 13:44:46', '2025-05-23 13:44:46');

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
(1, 'admin@empresa.com', '$2b$10$ejemplo_hash_password', 'Administrador Sistema', NULL, 'administrador', 1, NULL, '2025-05-23 13:44:46', '2025-05-23 13:44:46');

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
  ADD KEY `idx_numero_serie` (`numero_serie`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `ciudades`
--
ALTER TABLE `ciudades`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `instalaciones`
--
ALTER TABLE `instalaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inventario_equipos`
--
ALTER TABLE `inventario_equipos`
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `rutas_cobranza`
--
ALTER TABLE `rutas_cobranza`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sectores`
--
ALTER TABLE `sectores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `servicios_cliente`
--
ALTER TABLE `servicios_cliente`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sistema_usuarios`
--
ALTER TABLE `sistema_usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
