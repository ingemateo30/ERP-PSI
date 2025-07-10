// backend/routes/instalaciones.js
// RUTAS DE INSTALACIONES CORREGIDAS

const express = require('express');
const router = express.Router();

// Middleware de autenticación
const { authenticateToken, requireRole } = require('../middleware/auth');

// Controlador de instalaciones
const InstalacionesController = require('../controllers/instalacionesController');

console.log('🔧 Inicializando rutas de instalaciones...');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Middleware para logs de rutas
router.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl} - Usuario: ${req.user?.id} (${req.user?.rol})`);
    next();
});

// ==========================================
// RUTAS DE PRUEBA
// ==========================================

/**
 * @route GET /api/v1/instalaciones/test
 * @desc Test del controlador
 */
router.get('/test', InstalacionesController.test);

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * @route GET /api/v1/instalaciones/estadisticas
 * @desc Obtener estadísticas (debe ir antes de /:id)
 */
router.get('/estadisticas', InstalacionesController.obtenerEstadisticas);

/**
 * @route GET /api/v1/instalaciones
 * @desc Listar instalaciones
 */
router.get('/', InstalacionesController.listar);

/**
 * @route GET /api/v1/instalaciones/:id
 * @desc Obtener instalación por ID
 */
router.get('/:id', InstalacionesController.obtenerPorId);

/**
 * @route POST /api/v1/instalaciones
 * @desc Crear nueva instalación
 */
router.post('/', 
    requireRole('administrador', 'supervisor'),
    InstalacionesController.crear
);

/**
 * @route PUT /api/v1/instalaciones/:id
 * @desc Actualizar instalación
 */
router.put('/:id',
    requireRole('administrador', 'supervisor'),
    InstalacionesController.actualizar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/estado
 * @desc Cambiar estado de instalación
 */
router.patch('/:id/estado', InstalacionesController.cambiarEstado);

/**
 * @route DELETE /api/v1/instalaciones/:id
 * @desc Eliminar instalación
 */
router.delete('/:id',
    requireRole('administrador'),
    InstalacionesController.eliminar
);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

router.use((error, req, res, next) => {
    console.error('❌ Error en rutas de instalaciones:', error);
    res.status(500).json({
        success: false,
        message: 'Error en el módulo de instalaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
});

console.log('✅ Rutas de instalaciones configuradas');

module.exports = router;