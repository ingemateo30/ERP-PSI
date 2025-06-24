// backend/routes/auth.js - RUTAS DE AUTENTICACIÓN CORREGIDAS

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Importación corregida del rateLimiter - ahora directamente
const rateLimiter = require('../middleware/rateLimiter');

// Función de validación
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    req.body = value;
    next();
  };
};

// Esquemas de validación
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .max(255)
    .trim()
    .lowercase()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'string.empty': 'El email es requerido',
      'any.required': 'El email es requerido',
      'string.max': 'El email no puede tener más de 255 caracteres'
    }),
  password: Joi.string()
    .required()
    .min(1)
    .max(128)
    .messages({
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida',
      'string.max': 'La contraseña no puede tener más de 128 caracteres'
    })
});

const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .max(255)
    .trim()
    .lowercase()
    .messages({
      'string.email': 'El email debe tener un formato válido',
      'string.empty': 'El email es requerido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida',
      'string.max': 'La contraseña no puede tener más de 128 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
    }),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'string.empty': 'La confirmación de contraseña es requerida',
      'any.required': 'La confirmación de contraseña es requerida'
    }),
  nombres: Joi.string()
    .required()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Los nombres deben tener al menos 2 caracteres',
      'string.empty': 'Los nombres son requeridos',
      'any.required': 'Los nombres son requeridos',
      'string.max': 'Los nombres no pueden tener más de 100 caracteres'
    }),
  apellidos: Joi.string()
    .required()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Los apellidos deben tener al menos 2 caracteres',
      'string.empty': 'Los apellidos son requeridos',
      'any.required': 'Los apellidos son requeridos',
      'string.max': 'Los apellidos no pueden tener más de 100 caracteres'
    }),
  rol: Joi.string()
    .valid('administrador', 'supervisor', 'instalador')
    .default('instalador')
    .messages({
      'any.only': 'El rol debe ser administrador, supervisor o instalador'
    }),
  telefono: Joi.string()
    .optional()
    .allow('')
    .max(20)
    .pattern(/^[0-9+\-\s()]+$/)
    .messages({
      'string.max': 'El teléfono no puede tener más de 20 caracteres',
      'string.pattern.base': 'El teléfono solo puede contener números y símbolos válidos'
    })
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'La contraseña actual es requerida',
      'any.required': 'La contraseña actual es requerida'
    }),
  newPassword: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La nueva contraseña es requerida',
      'any.required': 'La nueva contraseña es requerida',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'
    }),
  confirmNewPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'string.empty': 'La confirmación de contraseña es requerida',
      'any.required': 'La confirmación de contraseña es requerida'
    })
});

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

/**
 * @route POST /api/v1/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  rateLimiter.login,
  validate(loginSchema),
  AuthController.login
);

/**
 * @route POST /api/v1/auth/register
 * @desc Registrar nuevo usuario
 * @access Public (solo en desarrollo) / Private (producción)
 */
router.post('/register', 
  rateLimiter.register,
  validate(registerSchema),
  AuthController.register
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Renovar token de acceso
 * @access Public (con refresh token)
 */
router.post('/refresh',
  rateLimiter.refresh,
  AuthController.refreshToken
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  authenticateToken,
  AuthController.logout
);

/**
 * @route GET /api/v1/auth/verify
 * @desc Verificar token JWT válido
 * @access Private
 */
router.get('/verify', 
  authenticateToken,
  AuthController.verify
);

/**
 * @route GET /api/v1/auth/me
 * @desc Obtener información del usuario actual
 * @access Private
 */
router.get('/me', 
  authenticateToken,
  AuthController.me
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Cambiar contraseña del usuario actual
 * @access Private
 */
router.post('/change-password', 
  authenticateToken,
  validate(changePasswordSchema),
  AuthController.changePassword
);

/**
 * @route GET /api/v1/auth/profile
 * @desc Obtener perfil del usuario (alias de /me)
 * @access Private
 */
router.get('/profile', 
  authenticateToken,
  AuthController.me
);

// ==========================================
// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
// ==========================================

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Solicitar recuperación de contraseña
 * @access Public
 */
router.post('/forgot-password',
  rateLimiter.forgotPassword,
  validate(Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Debe proporcionar un email válido',
        'any.required': 'El email es requerido'
      })
  })),
  AuthController.forgotPassword
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Restablecer contraseña con token
 * @access Public
 */
router.post('/reset-password',
  rateLimiter.resetPassword,
  validate(Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'El token de recuperación es requerido'
      }),
    newPassword: Joi.string()
      .required()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'any.required': 'La nueva contraseña es requerida',
        'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
      }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'any.only': 'Las contraseñas no coinciden',
        'any.required': 'La confirmación de contraseña es requerida'
      })
  })),
  AuthController.resetPassword
);

// ==========================================
// MANEJO DE ERRORES ESPECÍFICO
// ==========================================

// Middleware de manejo de errores para auth
router.use((error, req, res, next) => {
  console.error('Error en rutas de autenticación:', error);
  
  // Error de validación de Joi
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: error.details,
      timestamp: new Date().toISOString()
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación inválido',
      timestamp: new Date().toISOString()
    });
  }

  // Error de base de datos
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'El usuario ya existe',
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;