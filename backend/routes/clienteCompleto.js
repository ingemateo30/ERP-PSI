// backend/routes/clienteCompletoRoutes.js
// Rutas para gestión completa de clientes con servicios

const express = require('express');
const router = express.Router();
const ClienteCompletoController = require('../controllers/clienteCompletoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Instanciar controlador
const clienteCompletoController = new ClienteCompletoController();

/**
 * ============================================
 * RUTAS PRINCIPALES
 * ============================================
 */

/**
 * POST /api/clientes-completo/crear
 * Crear cliente completo con servicio y documentos automáticos
 */
router.post('/crear', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.crearClienteCompleto(req, res)
);

/**
 * POST /api/clientes-completo/previsualizar-factura
 * Previsualizar primera factura antes de crear cliente
 */
router.post('/previsualizar-factura', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.previsualizarPrimeraFactura(req, res)
);

/**
 * ============================================
 * GESTIÓN DE SERVICIOS
 * ============================================
 */

/**
 * GET /api/clientes-completo/:clienteId/servicios
 * Obtener servicios de un cliente
 */
router.get('/:clienteId/servicios', 
  authenticateToken,
  requireRole(['administrador', 'supervisor', 'instalador']),
  (req, res) => clienteCompletoController.getServiciosCliente(req, res)
);

/**
 * PUT /api/clientes-completo/:clienteId/cambiar-plan
 * Cambiar plan de servicio de un cliente
 */
router.put('/:clienteId/cambiar-plan', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.cambiarPlanCliente(req, res)
);

/**
 * PUT /api/clientes-completo/:clienteId/suspender
 * Suspender servicio de un cliente
 */
router.put('/:clienteId/suspender', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.suspenderServicio(req, res)
);

/**
 * PUT /api/clientes-completo/:clienteId/reactivar
 * Reactivar servicio de un cliente
 */
router.put('/:clienteId/reactivar', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.reactivarServicio(req, res)
);

/**
 * ============================================
 * CONSULTAS Y DETALLES
 * ============================================
 */

/**
 * GET /api/clientes-completo/:clienteId/completo
 * Obtener detalles completos de un cliente con sus servicios
 */
router.get('/:clienteId/completo', 
  authenticateToken,
  requireRole(['administrador', 'supervisor', 'instalador']),
  (req, res) => clienteCompletoController.getClienteCompleto(req, res)
);

/**
 * GET /api/clientes-completo/:clienteId/historial-servicios
 * Obtener historial de servicios de un cliente
 */
router.get('/:clienteId/historial-servicios', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.getHistorialServicios(req, res)
);

/**
 * GET /api/clientes-completo/:clienteId/estadisticas
 * Obtener estadísticas de un cliente
 */
router.get('/:clienteId/estadisticas', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.getEstadisticasCliente(req, res)
);

/**
 * ============================================
 * DOCUMENTOS Y FACTURACIÓN
 * ============================================
 */

/**
 * POST /api/clientes-completo/:clienteId/generar-contrato
 * Generar contrato para un cliente
 */
router.post('/:clienteId/generar-contrato', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.generarContrato(req, res)
);

/**
 * POST /api/clientes-completo/:clienteId/generar-orden-instalacion
 * Generar orden de instalación
 */
router.post('/:clienteId/generar-orden-instalacion', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.generarOrdenInstalacion(req, res)
);

/**
 * POST /api/clientes-completo/:clienteId/generar-factura
 * Generar factura inmediata para un cliente
 */
router.post('/:clienteId/generar-factura', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.generarFacturaInmediata(req, res)
);

/**
 * ============================================
 * UTILIDADES
 * ============================================
 */

/**
 * GET /api/clientes-completo/planes-disponibles
 * Obtener planes disponibles para asignación
 */
router.get('/planes-disponibles', 
  authenticateToken,
  requireRole(['administrador', 'supervisor', 'instalador']),
  (req, res) => clienteCompletoController.getPlanesDisponibles(req, res)
);

/**
 * GET /api/clientes-completo/verificar-identificacion
 * Verificar disponibilidad de identificación
 */
router.get('/verificar-identificacion', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.verificarDisponibilidadIdentificacion(req, res)
);

/**
 * POST /api/clientes-completo/calcular-precio-plan
 * Calcular precio de plan con descuentos y promociones
 */
router.post('/calcular-precio-plan', 
  authenticateToken,
  requireRole(['administrador', 'supervisor']),
  (req, res) => clienteCompletoController.calcularPrecioPlan(req, res)
);

/**
 * ============================================
 * MANEJO DE ERRORES
 * ============================================
 */

// Middleware para manejar errores específicos de este router
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de cliente completo:', error);
  
  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.errors
    });
  }
  
  // Errores de base de datos
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un cliente con esta identificación'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;