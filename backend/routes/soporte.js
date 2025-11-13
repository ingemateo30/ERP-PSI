/**
 * Rutas para el sistema de Soporte con Chatbot IA
 * Estas rutas NO requieren autenticación (son públicas)
 */

const express = require('express');
const router = express.Router();
const soporteController = require('../controllers/soporteController');
const { body, param, query, validationResult } = require('express-validator');

// Middleware para validar errores
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

/**
 * POST /api/v1/soporte/chat
 * Enviar mensaje al chatbot
 */
router.post(
  '/chat',
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('El mensaje es requerido')
      .isLength({ max: 1000 })
      .withMessage('El mensaje no puede exceder 1000 caracteres'),
    body('sessionId')
      .optional()
      .isString()
      .withMessage('Session ID debe ser texto'),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 0, max: 255 })
      .withMessage('Nombre no puede exceder 255 caracteres'),
    body('email')
      .optional()
      .trim()
      .custom((value) => {
        // Permitir ausencia, cadena vacía o email válido
        if (!value || value === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      })
      .withMessage('Email inválido'),
    body('telefono')
      .optional()
      .trim()
      .isLength({ min: 0, max: 20 })
      .withMessage('Teléfono no puede exceder 20 caracteres'),
    body('conversationHistory')
      .optional()
      .isArray()
      .withMessage('Historial debe ser un array'),
    validate,
  ],
  soporteController.chatMessage
);

/**
 * POST /api/v1/soporte/ticket
 * Crear ticket (PQR) desde conversación
 */
router.post(
  '/ticket',
  [
    body('sessionId').notEmpty().withMessage('Session ID es requerido'),
    body('nombre').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
    body('email')
      .optional({ values: 'falsy' })
      .trim()
      .custom((value) => {
        if (!value || value === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      })
      .withMessage('Email inválido'),
    body('telefono').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
    body('clienteId').optional().isInt(),
    body('categoria')
      .optional()
      .isIn(['tecnico', 'facturacion', 'comercial', 'atencion_cliente', 'otros'])
      .withMessage('Categoría inválida'),
    body('prioridad')
      .optional()
      .isIn(['baja', 'media', 'alta', 'critica'])
      .withMessage('Prioridad inválida'),
    body('asuntoAdicional').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    validate,
  ],
  soporteController.createTicketFromChat
);

/**
 * POST /api/v1/soporte/resolved
 * Marcar problema como resuelto
 */
router.post(
  '/resolved',
  [
    body('messageId').optional().isInt(),
    body('sessionId').optional().isString(),
    body('satisfaccion')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Satisfacción debe ser entre 1 y 5'),
    validate,
  ],
  soporteController.markAsResolved
);

/**
 * GET /api/v1/soporte/faqs
 * Obtener preguntas frecuentes
 */
router.get(
  '/faqs',
  [
    query('categoria')
      .optional()
      .isIn(['tecnica', 'facturacion', 'comercial', 'general', 'todas'])
      .withMessage('Categoría inválida'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Límite debe ser entre 1 y 100'),
    validate,
  ],
  soporteController.getFAQs
);

/**
 * POST /api/v1/soporte/faqs/:id/view
 * Incrementar contador de vistas de FAQ
 */
router.post(
  '/faqs/:id/view',
  [
    param('id').isInt().withMessage('ID debe ser un número entero'),
    validate,
  ],
  soporteController.incrementFAQView
);

/**
 * POST /api/v1/soporte/faqs/:id/useful
 * Marcar FAQ como útil
 */
router.post(
  '/faqs/:id/useful',
  [
    param('id').isInt().withMessage('ID debe ser un número entero'),
    validate,
  ],
  soporteController.markFAQAsUseful
);

/**
 * GET /api/v1/soporte/statistics
 * Obtener estadísticas del chatbot (puede requerir auth en producción)
 */
router.get(
  '/statistics',
  [
    query('desde').optional().isISO8601().withMessage('Fecha desde inválida'),
    query('hasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
    validate,
  ],
  soporteController.getStatistics
);

/**
 * POST /api/v1/soporte/session/end
 * Finalizar sesión de chat
 */
router.post(
  '/session/end',
  [
    body('sessionId').notEmpty().withMessage('Session ID es requerido'),
    body('satisfaccion')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Satisfacción debe ser entre 1 y 5'),
    validate,
  ],
  soporteController.endSession
);

module.exports = router;
