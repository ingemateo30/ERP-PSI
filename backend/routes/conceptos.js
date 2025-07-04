// backend/routes/conceptos.js - ACTUALIZADO

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const conceptosController = require('../controllers/conceptosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

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
        .matches(/^[A-Z0-9_]+$/i)
        .withMessage('El código solo puede contener letras, números y guiones bajos'),
    
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
        .withMessage('El campo activo debe ser verdadero o falso')
];

const validateConceptoUpdate = [
    body('codigo')
        .optional()
        .isLength({ max: 10 })
        .withMessage('El código no puede exceder 10 caracteres')
        .matches(/^[A-Z0-9_]+$/i)
        .withMessage('El código solo puede contener letras, números y guiones bajos'),
    
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
        .withMessage('El campo activo debe ser verdadero o falso')
];

const validateTipoParam = [
    param('tipo')
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo inválido')
];

const validateBulkCreate = [
    body('conceptos')
        .isArray({ min: 1, max: 100 })
        .withMessage('Se requiere un array de conceptos (máximo 100)'),
    
    body('conceptos.*.codigo')
        .notEmpty()
        .withMessage('El código es requerido en todos los conceptos'),
    
    body('conceptos.*.nombre')
        .notEmpty()
        .withMessage('El nombre es requerido en todos los conceptos'),
    
    body('conceptos.*.tipo')
        .isIn(['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'])
        .withMessage('Tipo inválido en concepto')
];

// ===========================================
// RUTAS PÚBLICAS (SOLO LECTURA)
// ===========================================

/**
 * @route GET /api/v1/conceptos
 * @desc Obtener todos los conceptos con filtros opcionales
 * @access Autenticado
 */
router.get('/', conceptosController.getAll);

/**
 * @route GET /api/v1/conceptos/tipos
 * @desc Obtener tipos de conceptos disponibles
 * @access Autenticado
 */
router.get('/tipos', conceptosController.getTipos);

/**
 * @route GET /api/v1/conceptos/stats
 * @desc Obtener estadísticas de conceptos
 * @access Autenticado
 */
router.get('/stats', conceptosController.getStats);

/**
 * @route GET /api/v1/conceptos/tipo/:tipo
 * @desc Obtener conceptos por tipo específico
 * @access Autenticado
 */
router.get('/tipo/:tipo', validateTipoParam, conceptosController.getByType);

/**
 * @route GET /api/v1/conceptos/:id
 * @desc Obtener concepto por ID
 * @access Autenticado
 */
router.get('/:id', validateConceptoId, conceptosController.getById);

// ===========================================
// RUTAS ADMINISTRATIVAS
// ===========================================

/**
 * @route POST /api/v1/conceptos
 * @desc Crear nuevo concepto de facturación
 * @access Administrador, Supervisor
 */
router.post('/', 
    requireRole('administrador', 'supervisor'),
    validateConceptoCreate,
    conceptosController.create
);

/**
 * @route POST /api/v1/conceptos/bulk
 * @desc Crear múltiples conceptos en lote
 * @access Administrador
 */
router.post('/bulk',
    requireRole('administrador'),
    validateBulkCreate,
    conceptosController.bulkCreate
);

/**
 * @route PUT /api/v1/conceptos/:id
 * @desc Actualizar concepto existente
 * @access Administrador, Supervisor
 */
router.put('/:id',
    requireRole('administrador', 'supervisor'),
    validateConceptoId,
    validateConceptoUpdate,
    conceptosController.update
);

/**
 * @route POST /api/v1/conceptos/:id/toggle
 * @desc Cambiar estado activo/inactivo del concepto
 * @access Administrador, Supervisor
 */
router.post('/:id/toggle',
    requireRole('administrador', 'supervisor'),
    validateConceptoId,
    conceptosController.toggleStatus
);

/**
 * @route DELETE /api/v1/conceptos/:id
 * @desc Eliminar/desactivar concepto
 * @access Administrador
 */
router.delete('/:id',
    requireRole('administrador'),
    validateConceptoId,
    conceptosController.delete
);

module.exports = router;