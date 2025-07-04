// backend/routes/clients.js - RUTAS DE CLIENTES

const express = require('express');
const router = express.Router();
const ClientsController = require('../controllers/clientsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const { body, param, query } = require('express-validator');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// ============================================
// VALIDACIONES
// ============================================

const clientValidationRules = [
  body('identificacion')
    .notEmpty()
    .withMessage('La identificación es requerida')
    .isLength({ min: 3, max: 20 })
    .withMessage('La identificación debe tener entre 3 y 20 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('La identificación solo debe contener números'),
    
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo debe contener letras y espacios'),
    
  body('telefono')
    .notEmpty()
    .withMessage('El teléfono es requerido')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono tiene un formato inválido')
    .isLength({ min: 7, max: 30 })
    .withMessage('El teléfono debe tener entre 7 y 30 caracteres'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email tiene un formato inválido')
    .normalizeEmail(),
    
  body('direccion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
    
  body('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de ciudad debe ser un número entero positivo'),
    
  body('sector_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de sector debe ser un número entero positivo'),
    
  body('estrato')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('El estrato debe ser un número entre 1 y 6'),
    
  body('coordenadas_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90'),
    
  body('coordenadas_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180'),
    
  body('fecha_registro')
    .optional()
    .isISO8601()
    .withMessage('La fecha de registro debe tener formato válido'),
    
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
];

const updateClientValidationRules = [
  body('identificacion')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('La identificación debe tener entre 3 y 20 caracteres')
    .matches(/^[0-9]+$/)
    .withMessage('La identificación solo debe contener números'),
    
  body('nombre')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo debe contener letras y espacios'),
    
  body('telefono')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono tiene un formato inválido')
    .isLength({ min: 7, max: 30 })
    .withMessage('El teléfono debe tener entre 7 y 30 caracteres'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email tiene un formato inválido')
    .normalizeEmail(),
    
  body('estado')
    .optional()
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('El estado debe ser: activo, suspendido, cortado, retirado o inactivo')
];

const idValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo')
];

const identificationValidationRules = [
  param('identificacion')
    .notEmpty()
    .withMessage('La identificación es requerida')
    .matches(/^[0-9]+$/)
    .withMessage('La identificación solo debe contener números')
];

const searchValidationRules = [
  query('q')
    .notEmpty()
    .withMessage('El término de búsqueda es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
];

const paginationValidationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
];

// ============================================
// RUTAS PÚBLICAS (solo requieren autenticación)
// ============================================

/**
 * @route   GET /api/v1/clients
 * @desc    Obtener lista de clientes con filtros y paginación
 * @access  Private (Todos los roles)
 */
router.get('/', 
  paginationValidationRules,
  validationMiddleware,
  ClientsController.getClients
);

/**
 * @route   GET /api/v1/clients/stats
 * @desc    Obtener estadísticas de clientes
 * @access  Private (Todos los roles)
 */
router.get('/stats', 
  ClientsController.getClientStats
);

/**
 * @route   GET /api/v1/clients/search
 * @desc    Buscar clientes
 * @access  Private (Todos los roles)
 */
router.get('/search', 
  searchValidationRules,
  validationMiddleware,
  ClientsController.searchClients
);

/**
 * @route   GET /api/v1/clients/active-with-services
 * @desc    Obtener clientes activos con servicios
 * @access  Private (Todos los roles)
 */
router.get('/active-with-services', 
  ClientsController.getActiveClientsWithServices
);

/**
 * @route   GET /api/v1/clients/export
 * @desc    Exportar clientes
 * @access  Private (Administrador, Supervisor)
 */
router.get('/export', 
  roleMiddleware(['administrador', 'supervisor']),
  ClientsController.exportClients
);

/**
 * @route   GET /api/v1/clients/identification/:identificacion
 * @desc    Obtener cliente por identificación
 * @access  Private (Todos los roles)
 */
router.get('/identification/:identificacion', 
  identificationValidationRules,
  validationMiddleware,
  ClientsController.getClientByIdentification
);

/**
 * @route   GET /api/v1/clients/:id
 * @desc    Obtener cliente por ID
 * @access  Private (Todos los roles)
 */
router.get('/:id', 
  idValidationRules,
  validationMiddleware,
  ClientsController.getClientById
);

/**
 * @route   GET /api/v1/clients/:id/summary
 * @desc    Obtener resumen completo de cliente
 * @access  Private (Todos los roles)
 */
router.get('/:id/summary', 
  idValidationRules,
  validationMiddleware,
  ClientsController.getClientSummary
);

// ============================================
// RUTAS RESTRINGIDAS POR ROL
// ============================================

/**
 * @route   POST /api/v1/clients
 * @desc    Crear nuevo cliente
 * @access  Private (Administrador, Supervisor)
 */
router.post('/', 
  roleMiddleware(['administrador', 'supervisor']),
  clientValidationRules,
  validationMiddleware,
  ClientsController.createClient
);

/**
 * @route   PUT /api/v1/clients/:id
 * @desc    Actualizar cliente
 * @access  Private (Administrador, Supervisor)
 */
router.put('/:id', 
  roleMiddleware(['administrador', 'supervisor']),
  idValidationRules,
  updateClientValidationRules,
  validationMiddleware,
  ClientsController.updateClient
);

/**
 * @route   DELETE /api/v1/clients/:id
 * @desc    Eliminar cliente
 * @access  Private (Solo Administrador)
 */
router.delete('/:id', 
  roleMiddleware(['administrador']),
  idValidationRules,
  validationMiddleware,
  ClientsController.deleteClient
);

/**
 * @route   POST /api/v1/clients/validate
 * @desc    Validar datos de cliente
 * @access  Private (Administrador, Supervisor)
 */
router.post('/validate', 
  roleMiddleware(['administrador', 'supervisor']),
  body('identificacion').notEmpty().withMessage('Identificación requerida'),
  validationMiddleware,
  ClientsController.validateClient
);

// ============================================
// MANEJO DE ERRORES ESPECÍFICO DE RUTAS
// ============================================

// Middleware para capturar errores no manejados en las rutas de clientes
router.use((error, req, res, next) => {
  console.error('Error en rutas de clientes:', error);
  
  if (error.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: error.details
    });
  }
  
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un cliente con esa identificación'
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor en módulo de clientes'
  });
});

module.exports = router;