// backend/routes/inventory.js

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const InventoryController = require('../controllers/inventarioController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// ==========================================
// VALIDACIONES
// ==========================================

const createEquipmentValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('El código debe tener entre 3 y 50 caracteres')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es requerido')
    .isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro'])
    .withMessage('Tipo de equipo no válido'),
  
  body('marca')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La marca no puede exceder 100 caracteres'),
  
  body('modelo')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El modelo no puede exceder 100 caracteres'),
  
  body('numero_serie')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El número de serie no puede exceder 100 caracteres'),
  
  body('estado')
    .optional()
    .isIn(['disponible', 'asignado', 'instalado', 'dañado', 'perdido', 'mantenimiento', 'devuelto'])
    .withMessage('Estado no válido'),
  
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio de compra debe ser un número positivo'),
  
  body('fecha_compra')
    .optional()
    .isISO8601()
    .withMessage('Fecha de compra no válida'),
  
  body('proveedor')
    .optional()
    .isLength({ max: 255 })
    .withMessage('El proveedor no puede exceder 255 caracteres'),
  
  body('ubicacion')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La ubicación no puede exceder 255 caracteres'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
];

const updateEquipmentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de equipo no válido'),
  
  body('codigo')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('El código debe tener entre 3 y 50 caracteres')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  
  body('nombre')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  
  body('tipo')
    .optional()
    .isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro'])
    .withMessage('Tipo de equipo no válido'),
  
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio de compra debe ser un número positivo'),
  
  body('fecha_compra')
    .optional()
    .isISO8601()
    .withMessage('Fecha de compra no válida')
];

const assignmentValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de equipo no válido'),
  
  body('instalador_id')
    .isInt({ min: 1 })
    .withMessage('ID de instalador no válido'),
  
  body('ubicacion')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La ubicación no puede exceder 255 caracteres'),
  
  body('notas')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
];

const installationValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de equipo no válido'),
  
  body('instalador_id')
    .isInt({ min: 1 })
    .withMessage('ID de instalador no válido'),
  
  body('ubicacion_cliente')
    .notEmpty()
    .withMessage('La ubicación del cliente es requerida')
    .isLength({ max: 255 })
    .withMessage('La ubicación no puede exceder 255 caracteres'),
  
  body('coordenadas_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud no válida'),
  
  body('coordenadas_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud no válida'),
  
  body('cliente_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de cliente no válido'),
  
  body('instalacion_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de instalación no válido')
];

const locationValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de equipo no válido'),
  
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud no válida'),
  
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud no válida'),
  
  body('direccion')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La dirección no puede exceder 255 caracteres')
];

// ==========================================
// RUTAS DE EQUIPOS
// ==========================================

/**
 * @route   GET /api/v1/inventory/equipment
 * @desc    Obtener todos los equipos con filtros y paginación
 * @access  Private (Supervisor+)
 */
router.get('/equipment', 
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAllEquipment
);

/**
 * @route   GET /api/v1/inventory/equipment/:id
 * @desc    Obtener equipo por ID
 * @access  Private (Supervisor+)
 */
router.get('/equipment/:id',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentById
);

/**
 * @route   POST /api/v1/inventory/equipment
 * @desc    Crear nuevo equipo
 * @access  Private (Supervisor+)
 */
router.post('/equipment',
  roleMiddleware(['supervisor', 'administrador']),
  createEquipmentValidation,
  InventoryController.createEquipment
);

/**
 * @route   PUT /api/v1/inventory/equipment/:id
 * @desc    Actualizar equipo
 * @access  Private (Supervisor+)
 */
router.put('/equipment/:id',
  roleMiddleware(['supervisor', 'administrador']),
  updateEquipmentValidation,
  InventoryController.updateEquipment
);

/**
 * @route   DELETE /api/v1/inventory/equipment/:id
 * @desc    Eliminar equipo
 * @access  Private (Administrador)
 */
router.delete('/equipment/:id',
  roleMiddleware(['administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.deleteEquipment
);

// ==========================================
// RUTAS DE ASIGNACIONES
// ==========================================

/**
 * @route   POST /api/v1/inventory/equipment/:id/assign
 * @desc    Asignar equipo a instalador
 * @access  Private (Supervisor+)
 */
router.post('/equipment/:id/assign',
  roleMiddleware(['supervisor', 'administrador']),
  assignmentValidation,
  InventoryController.assignToInstaller
);

/**
 * @route   POST /api/v1/inventory/equipment/:id/return
 * @desc    Devolver equipo
 * @access  Private (Supervisor+)
 */
router.post('/equipment/:id/return',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.returnEquipment
);

/**
 * @route   POST /api/v1/inventory/equipment/:id/install
 * @desc    Marcar equipo como instalado
 * @access  Private (Instalador+)
 */
router.post('/equipment/:id/install',
  roleMiddleware(['instalador', 'supervisor', 'administrador']),
  installationValidation,
  InventoryController.markAsInstalled
);

/**
 * @route   PUT /api/v1/inventory/equipment/:id/location
 * @desc    Actualizar ubicación del equipo
 * @access  Private (Instalador+)
 */
router.put('/equipment/:id/location',
  roleMiddleware(['instalador', 'supervisor', 'administrador']),
  locationValidation,
  InventoryController.updateLocation
);

/**
 * @route   GET /api/v1/inventory/installer/:instaladorId/equipment
 * @desc    Obtener equipos de un instalador
 * @access  Private (Supervisor+ o propio instalador)
 */
router.get('/installer/:instaladorId/equipment',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  param('instaladorId').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  (req, res, next) => {
    // Instaladores solo pueden ver sus propios equipos
    if (req.user.rol === 'instalador' && req.user.id != req.params.instaladorId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver equipos de otros instaladores'
      });
    }
    next();
  },
  InventoryController.getInstallerEquipment
);

// ==========================================
// RUTAS DE HISTORIAL Y REPORTES
// ==========================================

/**
 * @route   GET /api/v1/inventory/equipment/:id/history
 * @desc    Obtener historial de un equipo
 * @access  Private (Supervisor+)
 */
router.get('/equipment/:id/history',
  roleMiddleware(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentHistory
);

/**
 * @route   GET /api/v1/inventory/installer/:instaladorId/history
 * @desc    Obtener historial de un instalador
 * @access  Private (Supervisor+ o propio instalador)
 */
router.get('/installer/:instaladorId/history',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  param('instaladorId').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  (req, res, next) => {
    // Instaladores solo pueden ver su propio historial
    if (req.user.rol === 'instalador' && req.user.id != req.params.instaladorId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el historial de otros instaladores'
      });
    }
    next();
  },
  InventoryController.getInstallerHistory
);

/**
 * @route   GET /api/v1/inventory/stats
 * @desc    Obtener estadísticas del inventario
 * @access  Private (Supervisor+)
 */
router.get('/stats',
  roleMiddleware(['supervisor', 'administrador']),
  InventoryController.getStats
);

/**
 * @route   GET /api/v1/inventory/reports/date-range
 * @desc    Obtener reporte por rango de fechas
 * @access  Private (Supervisor+)
 */
router.get('/reports/date-range',
  roleMiddleware(['supervisor', 'administrador']),
  query('startDate').isISO8601().withMessage('Fecha de inicio no válida'),
  query('endDate').isISO8601().withMessage('Fecha de fin no válida'),
  query('tipo').optional().isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro']),
  InventoryController.getReportByDateRange
);

// ==========================================
// RUTAS DE UTILIDADES
// ==========================================

/**
 * @route   GET /api/v1/inventory/available
 * @desc    Obtener equipos disponibles
 * @access  Private (Supervisor+)
 */
router.get('/available',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAvailableEquipment
);

/**
 * @route   GET /api/v1/inventory/installers
 * @desc    Obtener instaladores activos
 * @access  Private (Supervisor+)
 */
router.get('/installers',
  roleMiddleware(['supervisor', 'administrador']),
  InventoryController.getActiveInstallers
);

/**
 * @route   GET /api/v1/inventory/search
 * @desc    Buscar equipos
 * @access  Private (Supervisor+)
 */
router.get('/search',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  query('q').isLength({ min: 2 }).withMessage('El término de búsqueda debe tener al menos 2 caracteres'),
  InventoryController.searchEquipment
);

/**
 * @route   GET /api/v1/inventory/types
 * @desc    Obtener tipos de equipos
 * @access  Private (Supervisor+)
 */
router.get('/types',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  InventoryController.getTypes
);

/**
 * @route   GET /api/v1/inventory/types/:tipo/brands
 * @desc    Obtener marcas por tipo
 * @access  Private (Supervisor+)
 */
router.get('/types/:tipo/brands',
  roleMiddleware(['supervisor', 'administrador', 'instalador']),
  param('tipo').isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro']),
  InventoryController.getBrandsByType
);

/**
 * @route   GET /api/v1/inventory/check-code/:codigo
 * @desc    Verificar disponibilidad de código
 * @access  Private (Supervisor+)
 */
router.get('/check-code/:codigo',
  roleMiddleware(['supervisor', 'administrador']),
  param('codigo').notEmpty().withMessage('Código requerido'),
  InventoryController.checkCodeAvailability
);

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================

router.use((error, req, res, next) => {
  console.error('Error en rutas de inventario:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;