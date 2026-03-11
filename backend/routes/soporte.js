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
    // nullable:true ignora null (primer mensaje antes de tener sessionId)
    body('sessionId').optional({ nullable: true }).isString(),
    body('nombre').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }),
    body('email').optional({ nullable: true, checkFalsy: true }).trim().isEmail().withMessage('Email inválido'),
    body('telefono').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }),
    body('conversationHistory').optional({ nullable: true }).isArray(),
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
    body('nombre').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Email inválido'),
    body('telefono').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('clienteId').optional().isInt(),
    body('categoria')
      .optional()
      .isIn(['tecnico', 'facturacion', 'comercial', 'atencion_cliente', 'otros'])
      .withMessage('Categoría inválida'),
    body('prioridad')
      .optional()
      .isIn(['baja', 'media', 'alta', 'critica'])
      .withMessage('Prioridad inválida'),
    body('asuntoAdicional').optional().trim().isLength({ max: 500 }),
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
    body('messageId').optional({ nullable: true }).isInt(),
    body('sessionId').optional({ nullable: true }).isString(),
    body('satisfaccion')
      .optional({ nullable: true })
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
    body('sessionId').optional({ nullable: true }).isString(),
    body('satisfaccion')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 5 })
      .withMessage('Satisfacción debe ser entre 1 y 5'),
    validate,
  ],
  soporteController.endSession
);

// ==================== ENDPOINTS DE IA (GROQ + LLAMA 3.3) ====================

/**
 * POST /api/v1/soporte/ai/analyze-pqr
 * Analiza un PQR para sugerir prioridad, categoría y solución rápida
 * Usado por agentes en el módulo de tickets
 */
router.post(
  '/ai/analyze-pqr',
  [
    body('asunto').trim().notEmpty().withMessage('El asunto es requerido').isLength({ max: 255 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida').isLength({ max: 5000 }),
    body('categoria').optional().isIn(['tecnico', 'facturacion', 'comercial', 'atencion_cliente', 'otros']),
    validate,
  ],
  soporteController.analyzePQRWithAI
);

/**
 * POST /api/v1/soporte/ai/suggest-response
 * Genera una respuesta sugerida para que el agente conteste un ticket
 * Usado en el panel de gestión de PQRs
 */
router.post(
  '/ai/suggest-response',
  [
    body('asunto').trim().notEmpty().withMessage('El asunto es requerido').isLength({ max: 255 }),
    body('descripcion').trim().notEmpty().withMessage('La descripción es requerida').isLength({ max: 5000 }),
    body('historialPrevio').optional().trim().isLength({ max: 3000 }),
    validate,
  ],
  soporteController.suggestAgentResponse
);

/**
 * POST /api/v1/soporte/ai/technical-diagnosis
 * Diagnóstico técnico asistido por IA para técnicos de campo
 * Usado en el módulo de incidencias/instalaciones
 */
router.post(
  '/ai/technical-diagnosis',
  [
    body('sintomas').trim().notEmpty().withMessage('Los síntomas son requeridos').isLength({ max: 2000 }),
    body('tipoServicio').optional().isIn(['internet', 'television', 'combo', 'voip']),
    body('equipoInfo').optional().trim().isLength({ max: 500 }),
    validate,
  ],
  soporteController.technicalDiagnosis
);

module.exports = router;
