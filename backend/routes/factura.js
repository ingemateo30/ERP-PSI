const express = require('express');
const router = express.Router();
const FacturasController = require('../controllers/FacturasController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validarCrearFactura, validarActualizarFactura, validarPagarFactura } = require('../middleware/validations');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas públicas (para todos los roles autenticados)

// GET /api/v1/facturas - Obtener todas las facturas con filtros y paginación
router.get('/', FacturasController.obtenerTodas);

// GET /api/v1/facturas/search - Buscar facturas
router.get('/search', FacturasController.buscar);

// GET /api/v1/facturas/stats - Obtener estadísticas de facturas
router.get('/stats', FacturasController.obtenerEstadisticas);

// GET /api/v1/facturas/vencidas - Obtener facturas vencidas
router.get('/vencidas', FacturasController.obtenerVencidas);

router.get('/test-pdf', FacturasController.probarPDF);

// GET /api/v1/facturas/:id/pdf - Descargar PDF de factura
router.get('/:id/pdf', FacturasController.generarPDF);

// GET /api/v1/facturas/:id/ver-pdf - Ver PDF en navegador
router.get('/:id/ver-pdf', FacturasController.verPDF);

// GET /api/v1/facturas/generar-numero - Generar siguiente número de factura
router.get('/generar-numero', 
  requireRole('administrador', 'supervisor'),
  FacturasController.generarNumeroFactura
);

// GET /api/v1/facturas/validate/:numero - Validar si existe factura con número
router.get('/validate/:numero', FacturasController.validarNumeroFactura);

// GET /api/v1/facturas/numero/:numero - Obtener factura por número
router.get('/numero/:numero', FacturasController.obtenerPorNumero);

// GET /api/v1/facturas/:id - Obtener factura por ID
router.get('/:id', FacturasController.obtenerPorId);

// GET /api/v1/facturas/:id/detalles - Obtener detalles de factura
router.get('/:id/detalles', FacturasController.obtenerDetalles);

// Rutas que requieren permisos específicos

// POST /api/v1/facturas - Crear nueva factura (Administrador y Supervisor)
router.post('/', 
  requireRole('administrador', 'supervisor'),
  validarCrearFactura,
  FacturasController.crear
);

// POST /api/v1/facturas/:id/duplicar - Duplicar factura (Administrador y Supervisor)
router.post('/:id/duplicar',
  requireRole('administrador', 'supervisor'),
  FacturasController.duplicar
);

// PUT /api/v1/facturas/:id - Actualizar factura (Administrador y Supervisor)
router.put('/:id', 
  requireRole('administrador', 'supervisor'),
  validarActualizarFactura,
  FacturasController.actualizar
);

// PATCH /api/v1/facturas/:id/pagar - Marcar como pagada (Todos los roles)
router.patch('/:id/pagar',
  validarPagarFactura,
  FacturasController.marcarComoPagada
);

// PATCH /api/v1/facturas/:id/anular - Anular factura (Solo Administrador)
router.patch('/:id/anular',
  requireRole('administrador'),
  FacturasController.anular
);

module.exports = router;