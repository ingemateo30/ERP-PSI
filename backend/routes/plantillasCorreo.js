// backend/routes/plantillasCorreo.js

const express = require('express');
const { body, param, query } = require('express-validator');
const PlantillasCorreoController = require('../controllers/plantillasCorreoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Validaciones comunes
const plantillaValidation = [
    body('titulo')
        .trim()
        .notEmpty()
        .withMessage('El título es requerido')
        .isLength({ min: 3, max: 255 })
        .withMessage('El título debe tener entre 3 y 255 caracteres'),
    
    body('asunto')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('El asunto no puede exceder 255 caracteres'),
    
    body('contenido')
        .trim()
        .notEmpty()
        .withMessage('El contenido es requerido')
        .isLength({ min: 10 })
        .withMessage('El contenido debe tener al menos 10 caracteres'),
    
    body('tipo')
        .optional()
        .isIn(['facturacion', 'corte', 'reconexion', 'bienvenida', 'general'])
        .withMessage('Tipo inválido. Debe ser: facturacion, corte, reconexion, bienvenida o general'),
    
    body('activo')
        .optional()
        .isBoolean()
        .withMessage('El campo activo debe ser verdadero o falso')
];

const idValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero positivo')
];

const tipoValidation = [
    param('tipo')
        .isIn(['facturacion', 'corte', 'reconexion', 'bienvenida', 'general'])
        .withMessage('Tipo inválido. Debe ser: facturacion, corte, reconexion, bienvenida o general')
];

// ==========================================
// RUTAS PÚBLICAS (Solo lectura para supervisores)
// ==========================================

/**
 * @route GET /api/v1/config/plantillas-correo
 * @desc Obtener todas las plantillas de correo
 * @access Supervisor+
 */
router.get('/', 
    requireRole(['administrador', 'supervisor']),
    [
        query('tipo').optional().isIn(['facturacion', 'corte', 'reconexion', 'bienvenida', 'general']),
        query('activo').optional().isIn(['true', 'false']),
        query('search').optional().trim().isLength({ max: 100 }),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    PlantillasCorreoController.getAll
);

/**
 * @route GET /api/v1/config/plantillas-correo/stats
 * @desc Obtener estadísticas de plantillas
 * @access Supervisor+
 */
router.get('/stats',
    requireRole(['administrador', 'supervisor']),
    PlantillasCorreoController.getStats
);

/**
 * @route GET /api/v1/config/plantillas-correo/tipo/:tipo
 * @desc Obtener plantillas por tipo específico
 * @access Supervisor+
 */
router.get('/tipo/:tipo',
    requireRole(['administrador', 'supervisor']),
    tipoValidation,
    PlantillasCorreoController.getByType
);

/**
 * @route GET /api/v1/config/plantillas-correo/:id
 * @desc Obtener una plantilla específica por ID
 * @access Supervisor+
 */
router.get('/:id',
    requireRole(['administrador', 'supervisor']),
    idValidation,
    PlantillasCorreoController.getById
);

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Solo administradores)
// ==========================================

/**
 * @route POST /api/v1/config/plantillas-correo
 * @desc Crear nueva plantilla de correo
 * @access Administrador
 */
router.post('/',
    requireRole(['administrador']),
    plantillaValidation,
    PlantillasCorreoController.create
);

/**
 * @route PUT /api/v1/config/plantillas-correo/:id
 * @desc Actualizar plantilla existente
 * @access Administrador
 */
router.put('/:id',
    requireRole(['administrador']),
    [...idValidation, ...plantillaValidation],
    PlantillasCorreoController.update
);

/**
 * @route DELETE /api/v1/config/plantillas-correo/:id
 * @desc Eliminar plantilla
 * @access Administrador
 */
router.delete('/:id',
    requireRole(['administrador']),
    idValidation,
    PlantillasCorreoController.delete
);

/**
 * @route POST /api/v1/config/plantillas-correo/:id/toggle
 * @desc Cambiar estado activo/inactivo de plantilla
 * @access Administrador
 */
router.post('/:id/toggle',
    requireRole(['administrador']),
    idValidation,
    PlantillasCorreoController.toggleStatus
);

/**
 * @route POST /api/v1/config/plantillas-correo/:id/duplicate
 * @desc Duplicar plantilla existente
 * @access Administrador
 */
router.post('/:id/duplicate',
    requireRole(['administrador']),
    idValidation,
    PlantillasCorreoController.duplicate
);

/**
 * @route POST /api/v1/config/plantillas-correo/:id/preview
 * @desc Generar preview de plantilla con datos de ejemplo
 * @access Administrador
 */
router.post('/:id/preview',
    requireRole(['administrador']),
    idValidation,
    [
        body('nombre_cliente').optional().trim().isLength({ max: 255 }),
        body('fecha_vencimiento').optional().trim().isLength({ max: 50 }),
        body('valor_factura').optional().trim().isLength({ max: 50 }),
        body('numero_factura').optional().trim().isLength({ max: 50 })
    ],
    PlantillasCorreoController.preview
);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Middleware para capturar rutas no encontradas en este router
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
});

// Middleware para manejo de errores
router.use((error, req, res, next) => {
    console.error('❌ Error en rutas de plantillas:', error);
    
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor en plantillas de correo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;