// backend/routes/inventario.js (o inventory.js)

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const InventoryController = require('../controllers/inventarioController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

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
    .withMessage('Tipo de equipo no válido')
];

// ==========================================
// RUTAS DE EQUIPOS
// ==========================================

/**
 * @route   GET /api/v1/inventory/equipment
 * @desc    Obtener todos los equipos con filtros y paginación
 * @access  Private (Todos los roles)
 */
router.get('/equipment', 
  requireRole('supervisor', 'administrador', 'instalador'),
  InventoryController.getAllEquipment
);

/**
 * @route   GET /api/v1/inventory/equipment/:id
 * @desc    Obtener equipo por ID
 * @access  Private (Todos los roles)
 */
router.get('/equipment/:id',
  requireRole('supervisor', 'administrador', 'instalador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentById
);

/**
 * @route   POST /api/v1/inventory/equipment
 * @desc    Crear nuevo equipo
 * @access  Private (Supervisor+)
 */
router.post('/equipment',
  requireRole('supervisor', 'administrador'),
  createEquipmentValidation,
  InventoryController.createEquipment
);

/**
 * @route   PUT /api/v1/inventory/equipment/:id
 * @desc    Actualizar equipo
 * @access  Private (Supervisor+)
 */
router.put('/equipment/:id',
  requireRole('supervisor', 'administrador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.updateEquipment
);

/**
 * @route   DELETE /api/v1/inventory/equipment/:id
 * @desc    Eliminar equipo
 * @access  Private (Administrador)
 */
router.delete('/equipment/:id',
  requireRole('administrador'),
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
  requireRole('supervisor', 'administrador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  InventoryController.assignToInstaller
);

/**
 * @route   POST /api/v1/inventory/equipment/:id/return
 * @desc    Devolver equipo
 * @access  Private (Todos los roles)
 */
router.post('/equipment/:id/return',
  requireRole('supervisor', 'administrador', 'instalador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.returnEquipment
);

/**
 * @route   POST /api/v1/inventory/equipment/:id/install
 * @desc    Marcar equipo como instalado
 * @access  Private (Instalador+)
 */
router.post('/equipment/:id/install',
  requireRole('instalador', 'supervisor', 'administrador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  body('ubicacion_cliente').notEmpty().withMessage('La ubicación del cliente es requerida'),
  InventoryController.markAsInstalled
);

// ==========================================
// RUTAS DE UTILIDADES
// ==========================================

/**
 * @route   GET /api/v1/inventory/stats
 * @desc    Obtener estadísticas del inventario
 * @access  Private (Supervisor+)
 */
router.get('/stats',
  requireRole('supervisor', 'administrador'),
  InventoryController.getStats
);

/**
 * @route   GET /api/v1/inventory/available
 * @desc    Obtener equipos disponibles
 * @access  Private (Todos los roles)
 */
router.get('/available',
  requireRole('supervisor', 'administrador', 'instalador'),
  InventoryController.getAvailableEquipment
);

/**
 * @route   GET /api/v1/inventory/installers
 * @desc    Obtener instaladores activos
 * @access  Private (Supervisor+)
 */
router.get('/installers',
  requireRole('supervisor', 'administrador'),
  InventoryController.getActiveInstallers
);

/**
 * @route   GET /api/v1/inventory/search
 * @desc    Buscar equipos
 * @access  Private (Todos los roles)
 */
router.get('/search',
  requireRole('supervisor', 'administrador', 'instalador'),
  query('q').isLength({ min: 2 }).withMessage('El término de búsqueda debe tener al menos 2 caracteres'),
  InventoryController.searchEquipment
);

/**
 * @route   GET /api/v1/inventory/types
 * @desc    Obtener tipos de equipos
 * @access  Private (Todos los roles)
 */
router.get('/types',
  requireRole('supervisor', 'administrador', 'instalador'),
  InventoryController.getTypes
);

/**
 * @route   GET /api/v1/inventory/check-code/:codigo
 * @desc    Verificar disponibilidad de código
 * @access  Private (Supervisor+)
 */
router.get('/check-code/:codigo',
  requireRole('supervisor', 'administrador'),
  param('codigo').notEmpty().withMessage('Código requerido'),
  InventoryController.checkCodeAvailability
);

/**
 * @route   GET /api/v1/inventory/equipment/:id/history
 * @desc    Obtener historial de un equipo
 * @access  Private (Supervisor+)
 */
router.get('/equipment/:id/history',
  requireRole('supervisor', 'administrador'),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentHistory
);

/**
 * @route   GET /api/v1/inventory/installer/:instaladorId/equipment
 * @desc    Obtener equipos de un instalador
 * @access  Private (Supervisor+ o propio instalador)
 */
router.get('/installer/:instaladorId/equipment',
  requireRole('supervisor', 'administrador', 'instalador'),
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
// RUTA DE TEST
// ==========================================

/**
 * @route   GET /api/v1/inventory/test
 * @desc    Ruta de prueba
 * @access  Private
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas de inventario funcionando correctamente',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user?.id,
      rol: req.user?.rol,
      nombre: req.user?.nombre
    }
  });
});

// ==========================================
//  MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================

router.use((error, req, res, next) => {
  console.error('Error en rutas de inventario:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development'  ? error.message : undefined
  });
});

module.exports = router;