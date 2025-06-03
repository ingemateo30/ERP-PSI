// backend/routes/conceptos.js

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const conceptosController = require('../controllers/conceptosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validaciones reutilizables
const validateConceptoId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID debe ser un número entero positivo')
];

const validateConceptoCreate = [
    body('codigo')
        .notEmpty()
        .withMessage('El código es requerido')
        .isLength({ max: 10 })
        .withMessage('El código no puede exceder 10 caracteres')
        .matches(/^[A-Z0-9_]+$/)
        .withMessage('El código solo puede contener letras mayúsculas, números y guiones bajos'),
    
    body('nombre')
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ max: 100 })
        .withMessage('El nombre no puede exceder 100 caracteres')
        .trim(),
    
    body('valor_base')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El valor base debe ser un número positivo'),
    
    body('aplica_iva')
        .optional()
        .isBoolean()
        .withMessage('Aplica IVA debe ser verdadero o falso'),
    
    body('porcentaje_iva')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('El porcentaje de IVA debe estar entre 0 y 100'),
    
    body('descripcion')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La descripción no puede exceder 500 caracteres')
        .trim(),
    
    body('tipo')
        .notEmpty()
        .withMessage('El tipo es requerido')
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo inválido'),
    
    body('activo')
        .optional()
        .isBoolean()
        .withMessage('Estado activo debe ser verdadero o falso')
];

const validateConceptoUpdate = [
    body('codigo')
        .optional()
        .isLength({ max: 10 })
        .withMessage('El código no puede exceder 10 caracteres')
        .matches(/^[A-Z0-9_]+$/)
        .withMessage('El código solo puede contener letras mayúsculas, números y guiones bajos'),
    
    body('nombre')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('El nombre debe tener entre 1 y 100 caracteres')
        .trim(),
    
    body('valor_base')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El valor base debe ser un número positivo'),
    
    body('aplica_iva')
        .optional()
        .isBoolean()
        .withMessage('Aplica IVA debe ser verdadero o falso'),
    
    body('porcentaje_iva')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('El porcentaje de IVA debe estar entre 0 y 100'),
    
    body('descripcion')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La descripción no puede exceder 500 caracteres')
        .trim(),
    
    body('tipo')
        .optional()
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo inválido'),
    
    body('activo')
        .optional()
        .isBoolean()
        .withMessage('Estado activo debe ser verdadero o falso')
];

const validateQueryParams = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero positivo'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe estar entre 1 y 100'),
    
    query('tipo')
        .optional()
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo de filtro inválido'),
    
    query('activo')
        .optional()
        .isIn(['true', 'false'])
        .withMessage('Filtro activo debe ser true o false'),
    
    query('search')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Término de búsqueda debe tener entre 1 y 100 caracteres')
        .trim()
];

const validateTipoParam = [
    param('tipo')
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo inválido')
];

// ===============================================
// RUTAS PÚBLICAS (requieren autenticación básica)
// ===============================================

// GET /api/v1/conceptos - Obtener todos los conceptos
router.get('/', 
    authenticateToken,
    validateQueryParams,
    (req, res) => conceptosController.getAll(req, res)
);

// GET /api/v1/conceptos/stats - Obtener estadísticas
router.get('/stats', 
    authenticateToken,
    requireRole('administrador', 'supervisor'),
    (req, res) => conceptosController.getStats(req, res)
);

// GET /api/v1/conceptos/tipos - Obtener tipos disponibles
router.get('/tipos', 
    authenticateToken,
    (req, res) => conceptosController.getTipos(req, res)
);

// GET /api/v1/conceptos/tipo/:tipo - Obtener conceptos por tipo
router.get('/tipo/:tipo', 
    authenticateToken,
    validateTipoParam,
    (req, res) => conceptosController.getByType(req, res)
);

// GET /api/v1/conceptos/:id - Obtener concepto por ID
router.get('/:id', 
    authenticateToken,
    validateConceptoId,
    (req, res) => conceptosController.getById(req, res)
);

// ===============================================
// RUTAS ADMINISTRATIVAS (solo administradores)
// ===============================================

// POST /api/v1/conceptos - Crear nuevo concepto
router.post('/', 
    authenticateToken,
    requireRole('administrador'),
    validateConceptoCreate,
    (req, res) => conceptosController.create(req, res)
);

// PUT /api/v1/conceptos/:id - Actualizar concepto
router.put('/:id', 
    authenticateToken,
    requireRole('administrador'),
    validateConceptoId,
    validateConceptoUpdate,
    (req, res) => conceptosController.update(req, res)
);

// POST /api/v1/conceptos/:id/toggle - Cambiar estado activo/inactivo
router.post('/:id/toggle', 
    authenticateToken,
    requireRole('administrador'),
    validateConceptoId,
    (req, res) => conceptosController.toggleStatus(req, res)
);

// DELETE /api/v1/conceptos/:id - Eliminar concepto
router.delete('/:id', 
    authenticateToken,
    requireRole('administrador'),
    validateConceptoId,
    (req, res) => conceptosController.delete(req, res)
);

// ===============================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ===============================================

// Middleware para manejar errores de validación
router.use((error, req, res, next) => {
    console.error('Error en middleware de conceptos:', error);
    
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Datos JSON inválidos',
            error: 'El cuerpo de la petición contiene JSON malformado'
        });
    }
    
    if (error.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'Datos demasiado grandes',
            error: 'El cuerpo de la petición excede el tamaño máximo permitido'
        });
    }
    
    // Error genérico del servidor
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
});

// Middleware para rutas no encontradas específicas de conceptos
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada en conceptos',
        error: `La ruta ${req.method} ${req.originalUrl} no existe en el módulo de conceptos`,
        availableRoutes: [
            'GET /conceptos - Listar conceptos',
            'GET /conceptos/stats - Estadísticas',
            'GET /conceptos/tipos - Tipos disponibles',
            'GET /conceptos/tipo/:tipo - Conceptos por tipo',
            'GET /conceptos/:id - Obtener concepto',
            'POST /conceptos - Crear concepto',
            'PUT /conceptos/:id - Actualizar concepto',
            'POST /conceptos/:id/toggle - Cambiar estado',
            'DELETE /conceptos/:id - Eliminar concepto'
        ]
    });
});

module.exports = router;