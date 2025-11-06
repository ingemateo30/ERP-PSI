// backend/routes/inventario.js

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

router.get('/equipment', 
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAllEquipment
);

router.get('/equipment/:id',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentById
);

router.post('/equipment',
  requireRole(['supervisor', 'administrador']),
  createEquipmentValidation,
  InventoryController.createEquipment
);

router.put('/equipment/:id',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.updateEquipment
);

router.delete('/equipment/:id',
  requireRole(['administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.deleteEquipment
);

// ==========================================
// RUTAS DE ASIGNACIONES
// ==========================================

router.post('/equipment/:id/assign',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  InventoryController.assignToInstaller
);

router.post('/equipment/:id/return',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.returnEquipment
);

router.post('/equipment/:id/install',
  requireRole(['instalador', 'supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  body('ubicacion_cliente').notEmpty().withMessage('La ubicación del cliente es requerida'),
  InventoryController.markAsInstalled
);

// ==========================================
// RUTAS DE UTILIDADES
// ==========================================

router.get('/stats',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getStats
);

router.get('/available',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAvailableEquipment
);

router.get('/installers',
  requireRole(['supervisor', 'administrador']),
  InventoryController.getActiveInstallers
);

router.get('/search',
  requireRole(['supervisor', 'administrador', 'instalador']),
  query('q').isLength({ min: 2 }).withMessage('El término de búsqueda debe tener al menos 2 caracteres'),
  InventoryController.searchEquipment
);

router.get('/types',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getTypes
);

router.get('/check-code/:codigo',
  requireRole(['supervisor', 'administrador']),
  param('codigo').notEmpty().withMessage('Código requerido'),
  InventoryController.checkCodeAvailability
);

router.get('/equipment/:id/history',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentHistory
);

router.get('/installer/:instaladorId/equipment',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('instaladorId').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  (req, res, next) => {
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

router.use((error, req, res, next) => {
  console.error('Error en rutas de inventario:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development'  ? error.message : undefined
  });
});

module.exports = router;