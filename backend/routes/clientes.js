const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/clienteController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validarCrearCliente, validarActualizarCliente } = require('../middleware/validations');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas públicas (para todos los roles autenticados)

// GET /api/v1/clients - Obtener todos los clientes con filtros y paginación
router.get('/', ClienteController.obtenerTodos);

// GET /api/v1/clients/search - Buscar clientes
router.get('/search', ClienteController.buscar);

// GET /api/v1/clients/stats - Obtener estadísticas de clientes
router.get('/stats', ClienteController.obtenerEstadisticas);

// GET /api/v1/clients/validate/:identificacion - Validar si existe cliente con identificación
router.get('/validate/:identificacion', ClienteController.validarIdentificacion);

// GET /api/v1/clients/identification/:identificacion - Obtener cliente por identificación
router.get('/identification/:identificacion', ClienteController.obtenerPorIdentificacion);

// GET /api/v1/clients/:id - Obtener cliente por ID
router.get('/:id', ClienteController.obtenerPorId);

// Rutas que requieren permisos específicos

// POST /api/v1/clients - Crear nuevo cliente (Administrador y Supervisor)
router.post('/', 
  requireRole('administrador', 'supervisor'),
  validarCrearCliente,
  ClienteController.crear
);

// PUT /api/v1/clients/:id - Actualizar cliente (Administrador y Supervisor)
router.put('/:id', 
  requireRole('administrador', 'supervisor'),
  validarActualizarCliente,
  ClienteController.actualizar
);

// DELETE /api/v1/clients/:id - Eliminar cliente (Solo Administrador)
router.delete('/:id',
  requireRole('administrador'),
  ClienteController.eliminar
);

module.exports = router;