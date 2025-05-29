// backend/routes/auth.js - RUTAS DE AUTENTICACIÓN COMPLETAS

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

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
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida',
      'string.max': 'La contraseña no puede tener más de 128 caracteres'
    }),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'string.empty': 'La confirmación de contraseña es requerida',
      'any.required': 'La confirmación de contraseña es requerida'
    }),
  nombre: Joi.string()
    .required()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres',
      'string.empty': 'El nombre es requerido',
      'any.required': 'El nombre es requerido'
    }),
  telefono: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^[0-9+\-\s()]+$/)
    .min(10)
    .max(20)
    .messages({
      'string.pattern.base': 'El teléfono debe contener solo números y caracteres válidos',
      'string.min': 'El teléfono debe tener al menos 10 caracteres',
      'string.max': 'El teléfono no puede tener más de 20 caracteres'
    }),
  rol: Joi.string()
    .optional()
    .valid('administrador', 'supervisor', 'instalador')
    .default('supervisor')
    .messages({
      'any.only': 'El rol debe ser administrador, supervisor o instalador'
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
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La nueva contraseña es requerida',
      'any.required': 'La nueva contraseña es requerida'
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
 * @access Public
 */
router.post('/register', 
  rateLimiter.register,
  validate(registerSchema),
  AuthController.register
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Renovar token de acceso
 * @access Private
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

module.exports = router;