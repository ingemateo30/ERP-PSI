// backend/routes/auth.js - RUTAS DE AUTENTICACIÓN SIMPLIFICADAS

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Importar rateLimiter con manejo de errores
let rateLimiter;
try {
  rateLimiter = require('../middleware/rateLimiter');
  console.log('✅ rateLimiter cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando rateLimiter:', error.message);
  // Crear middleware dummy si falla
  rateLimiter = {
    login: (req, res, next) => next(),
    register: (req, res, next) => next(),
    refresh: (req, res, next) => next(),
    forgotPassword: (req, res, next) => next(),
    resetPassword: (req, res, next) => next()
  };
}

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

// Esquemas de validación básicos
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
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.empty': 'El nombre es requerido',
      'any.required': 'El nombre es requerido',
      'string.max': 'El nombre no puede tener más de 100 caracteres'
    }),
  telefono: Joi.string()
    .optional()
    .allow('')
    .max(20)
    .pattern(/^[0-9+\-\s()]*$/)
    .messages({
      'string.max': 'El teléfono no puede tener más de 20 caracteres',
      'string.pattern.base': 'El teléfono solo puede contener números y símbolos válidos'
    }),
  rol: Joi.string()
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

// Verificar que AuthController tenga los métodos necesarios
const verificarMetodo = (metodo, nombre) => {
  if (typeof AuthController[metodo] === 'function') {
    console.log(`✅ AuthController.${metodo} disponible`);
    return AuthController[metodo];
  } else {
    console.error(`❌ AuthController.${metodo} NO ENCONTRADO`);
    // Retornar un handler de error temporal
    return (req, res) => {
      res.status(501).json({
        success: false,
        message: `Método ${nombre} no implementado`,
        timestamp: new Date().toISOString()
      });
    };
  }
};

// Obtener métodos con verificación
const loginHandler = verificarMetodo('login', 'login');
const registerHandler = verificarMetodo('register', 'register');
const logoutHandler = verificarMetodo('logout', 'logout');
const verifyHandler = verificarMetodo('verify', 'verify');
const meHandler = verificarMetodo('me', 'me');
const changePasswordHandler = verificarMetodo('changePassword', 'changePassword');

// ==========================================
// RUTAS BÁSICAS DE AUTENTICACIÓN
// ==========================================

/**
 * @route POST /api/v1/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  rateLimiter.login,
  validate(loginSchema),
  loginHandler
);

/**
 * @route POST /api/v1/auth/register
 * @desc Registrar nuevo usuario
 * @access Public (solo en desarrollo) / Private (producción)
 */
router.post('/register', 
  rateLimiter.register,
  validate(registerSchema),
  registerHandler
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  authenticateToken,
  logoutHandler
);

/**
 * @route GET /api/v1/auth/verify
 * @desc Verificar token JWT válido
 * @access Private
 */
router.get('/verify', 
  authenticateToken,
  verifyHandler
);

/**
 * @route GET /api/v1/auth/me
 * @desc Obtener información del usuario actual
 * @access Private
 */
router.get('/me', 
  authenticateToken,
  meHandler
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Cambiar contraseña del usuario actual
 * @access Private
 */
router.post('/change-password', 
  authenticateToken,
  validate(changePasswordSchema),
  changePasswordHandler
);

/**
 * @route GET /api/v1/auth/profile
 * @desc Obtener perfil del usuario (alias de /me)
 * @access Private
 */
router.get('/profile', 
  authenticateToken,
  meHandler
);

// ==========================================
// RUTAS OPCIONALES (solo si están implementadas)
// ==========================================

// Verificar si existe refreshToken
if (typeof AuthController.refreshToken === 'function') {
  /**
   * @route POST /api/v1/auth/refresh
   * @desc Renovar token de acceso
   * @access Public (con refresh token)
   */
  router.post('/refresh',
    rateLimiter.refresh,
    AuthController.refreshToken
  );
  console.log('✅ Ruta /refresh habilitada');
} else {
  console.log('⚠️ AuthController.refreshToken no disponible - ruta /refresh deshabilitada');
}

// Verificar si existe forgotPassword
if (typeof AuthController.forgotPassword === 'function') {
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
  console.log('✅ Ruta /forgot-password habilitada');
} else {
  console.log('⚠️ AuthController.forgotPassword no disponible - ruta /forgot-password deshabilitada');
}

// Verificar si existe resetPassword
if (typeof AuthController.resetPassword === 'function') {
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
        .messages({
          'string.min': 'La contraseña debe tener al menos 8 caracteres',
          'any.required': 'La nueva contraseña es requerida'
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
  console.log('✅ Ruta /reset-password habilitada');
} else {
  console.log('⚠️ AuthController.resetPassword no disponible - ruta /reset-password deshabilitada');
}

// ==========================================
// RUTA DE INFORMACIÓN
// ==========================================

/**
 * @route GET /api/v1/auth/info
 * @desc Obtener información sobre las rutas de autenticación disponibles
 * @access Public
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'API de Autenticación - Sistema PSI',
    availableRoutes: {
      'POST /login': 'Iniciar sesión',
      'POST /register': 'Registrar nuevo usuario',
      'POST /logout': 'Cerrar sesión (requiere token)',
      'GET /verify': 'Verificar token (requiere token)',
      'GET /me': 'Obtener información del usuario actual (requiere token)',
      'GET /profile': 'Alias de /me (requiere token)',
      'POST /change-password': 'Cambiar contraseña (requiere token)',
      'GET /info': 'Esta información'
    },
    optionalRoutes: {
      'POST /refresh': AuthController.refreshToken ? 'Disponible' : 'No implementado',
      'POST /forgot-password': AuthController.forgotPassword ? 'Disponible' : 'No implementado',
      'POST /reset-password': AuthController.resetPassword ? 'Disponible' : 'No implementado'
    },
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MANEJO DE ERRORES
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

console.log('🔐 Rutas de autenticación configuradas correctamente');

module.exports = router;