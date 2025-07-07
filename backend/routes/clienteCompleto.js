// backend/routes/clienteCompleto.js
// Rutas para gestión completa de clientes con servicios

const express = require('express');
const router = express.Router();
const clienteCompletoController = require('../controllers/clienteCompletoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * ============================================
 * MIDDLEWARE DE AUTENTICACIÓN
 * ============================================
 */

// Aplicar verificación de token a todas las rutas
router.use(authenticateToken);

/**
 * ============================================
 * RUTAS DE CREACIÓN COMPLETA
 * ============================================
 */

/**
 * @route POST /api/clientes-completo/crear
 * @desc Crear cliente completo con servicio y documentos automáticos
 * @access Administrador
 */
router.post(
  '/crear',
  requireRole(['administrador']),
  clienteCompletoController.crearClienteCompleto
);

/**
 * @route POST /api/clientes-completo/previsualizar-factura
 * @desc Previsualizar primera factura antes de crear cliente
 * @access Administrador, Supervisor
 */
router.post(
  '/previsualizar-factura',
  requireRole(['administrador', 'supervisor']),
  clienteCompletoController.previsualizarPrimeraFactura
);

/**
 * ============================================
 * RUTAS DE GESTIÓN DE SERVICIOS
 * ============================================
 */

/**
 * @route GET /api/clientes-completo/:clienteId/servicios
 * @desc Obtener todos los servicios de un cliente
 * @access Administrador, Supervisor
 */
router.get(
  '/:clienteId/servicios',
  requireRole(['administrador', 'supervisor']),
  clienteCompletoController.obtenerServiciosCliente
);

/**
 * @route PUT /api/clientes-completo/:clienteId/cambiar-plan
 * @desc Cambiar plan de servicio de un cliente existente
 * @access Administrador
 */
router.put(
  '/:clienteId/cambiar-plan',
  requireRole(['administrador']),
  clienteCompletoController.cambiarPlanCliente
);

/**
 * ============================================
 * RUTAS DE CONSULTA
 * ============================================
 */

/**
 * @route GET /api/clientes-completo/planes-disponibles
 * @desc Obtener planes de servicio disponibles para asignación
 * @access Administrador, Supervisor
 */
router.get(
  '/planes-disponibles',
  requireRole(['administrador', 'supervisor']),
  clienteCompletoController.obtenerPlanesDisponibles
);

/**
 * @route GET /api/clientes-completo/estadisticas-servicios
 * @desc Obtener estadísticas de servicios por cliente
 * @access Administrador, Supervisor
 */
router.get(
  '/estadisticas-servicios',
  requireRole(['administrador', 'supervisor']),
  clienteCompletoController.obtenerEstadisticasServicios
);

/**
 * ============================================
 * MIDDLEWARE DE MANEJO DE ERRORES
 * ============================================
 */

// Middleware para manejar errores no capturados en las rutas
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de cliente completo:', error);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;

// ============================================
// DOCUMENTACIÓN DE LAS RUTAS
// ============================================

/**
 * ESTRUCTURA DE DATOS ESPERADA PARA CREAR CLIENTE COMPLETO:
 * 
 * POST /api/clientes-completo/crear
 * {
 *   "cliente": {
 *     "identificacion": "1234567890",
 *     "tipo_documento": "cedula",
 *     "nombre": "Juan Pérez López",
 *     "email": "juan@email.com",
 *     "telefono": "3001234567",
 *     "telefono_fijo": "6012345678",
 *     "direccion": "Calle 123 # 45-67",
 *     "barrio": "Centro",
 *     "estrato": "3",
 *     "ciudad_id": 1,
 *     "sector_id": 1,
 *     "observaciones": "Cliente nuevo",
 *     "fecha_inicio_contrato": "2025-07-07"
 *   },
 *   "servicio": {
 *     "plan_id": 1,
 *     "precio_personalizado": 50000,
 *     "fecha_activacion": "2025-07-07",
 *     "observaciones": "Plan promocional"
 *   },
 *   "opciones": {
 *     "generar_documentos": true,
 *     "enviar_bienvenida": true,
 *     "programar_instalacion": true
 *   }
 * }
 * 
 * RESPUESTA EXITOSA:
 * {
 *   "success": true,
 *   "message": "Cliente creado exitosamente con todos los documentos",
 *   "data": {
 *     "cliente_id": 123,
 *     "servicio_id": 456,
 *     "documentos_generados": {
 *       "contrato": {
 *         "numero": "CT-000123",
 *         "fecha_generacion": "2025-07-07"
 *       },
 *       "orden_instalacion": {
 *         "id": 789,
 *         "numero": "INST-000789",
 *         "fecha_programada": "2025-07-10"
 *       },
 *       "factura": {
 *         "id": 101112,
 *         "numero_factura": "FAC000101112",
 *         "total": 92016,
 *         "conceptos_incluidos": [
 *           "Internet 30MB - Primer período (30 días)",
 *           "Cargo por instalación"
 *         ]
 *       }
 *     },
 *     "email_enviado": true
 *   }
 * }
 */

/**
 * ESTRUCTURA PARA CAMBIAR PLAN:
 * 
 * PUT /api/clientes-completo/:clienteId/cambiar-plan
 * {
 *   "plan_id": 2,
 *   "precio_personalizado": 65000,
 *   "fecha_activacion": "2025-08-01",
 *   "observaciones": "Upgrade a plan superior"
 * }
 * 
 * RESPUESTA:
 * {
 *   "success": true,
 *   "message": "Plan cambiado exitosamente",
 *   "data": {
 *     "cliente_id": 123,
 *     "servicio_anterior_id": 456,
 *     "nuevo_servicio_id": 789,
 *     "message": "Plan cambiado exitosamente de Internet 30MB al nuevo plan"
 *   }
 * }
 */

/**
 * ESTRUCTURA PARA PREVISUALIZAR FACTURA:
 * 
 * POST /api/clientes-completo/previsualizar-factura
 * {
 *   "plan_id": 1,
 *   "plan_tipo": "internet",
 *   "plan_nombre": "Internet 30MB",
 *   "plan_precio": 45000,
 *   "precio_personalizado": 40000,
 *   "estrato": "3",
 *   "fecha_activacion": "2025-07-07"
 * }
 * 
 * RESPUESTA:
 * {
 *   "success": true,
 *   "data": {
 *     "conceptos": [
 *       {
 *         "concepto": "Internet 30MB - Primer período (30 días)",
 *         "cantidad": 1,
 *         "precio_unitario": 40000,
 *         "valor": 40000,
 *         "iva": 0,
 *         "total": 40000,
 *         "aplica_iva": false
 *       },
 *       {
 *         "concepto": "Cargo por instalación",
 *         "cantidad": 1,
 *         "precio_unitario": 42016,
 *         "valor": 42016,
 *         "iva": 7983,
 *         "total": 49999,
 *         "aplica_iva": true
 *       }
 *     ],
 *     "totales": {
 *       "subtotal": 82016,
 *       "iva": 7983,
 *       "total": 89999
 *     },
 *     "periodo": {
 *       "fecha_desde": "2025-07-07",
 *       "fecha_hasta": "2025-08-06",
 *       "dias": 30
 *     }
 *   }
 * }
 */