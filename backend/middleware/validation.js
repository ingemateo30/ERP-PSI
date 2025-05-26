const Joi = require('joi');
const ApiResponse = require('../utils/responses');
const PasswordUtils = require('../utils/password');

/**
 * Middleware de validación usando Joi
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return ApiResponse.validationError(res, errors);
    }

    // Reemplazar los datos validados y sanitizados
    req[property] = value;
    next();
  };
};

/**
 * Esquemas de validación
 */

// Validación de login
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
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .required()
    .min(1)
    .max(128)
    .messages({
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    })
});

// Validación de registro
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
    .custom((value, helpers) => {
      const validation = PasswordUtils.validatePassword(value);
      if (!validation.isValid) {
        return helpers.error('password.weak', { errors: validation.errors });
      }
      return value;
    })
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida',
      'password.weak': 'La contraseña no cumple con los requisitos de seguridad'
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
    .valid('admin', 'supervisor', 'user')
    .default('supervisor')
    .messages({
      'any.only': 'El rol debe ser admin, supervisor o user'
    })
});

// Validación de actualización de perfil
const updateProfileSchema = Joi.object({
  nombre: Joi.string()
    .optional()
    .min(2)
    .max(100)
    .trim()
    .pattern(/^[a-zA-ZÀ-ÿ\s]+$/)
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 100 caracteres'
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
    })
});

// Validación de cambio de contraseña
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
    .custom((value, helpers) => {
      const validation = PasswordUtils.validatePassword(value);
      if (!validation.isValid) {
        return helpers.error('password.weak', { errors: validation.errors });
      }
      return value;
    })
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.empty': 'La nueva contraseña es requerida',
      'any.required': 'La nueva contraseña es requerida',
      'password.weak': 'La nueva contraseña no cumple con los requisitos de seguridad'
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

// Validación de refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'El refresh token es requerido',
      'any.required': 'El refresh token es requerido'
    })
});

// Validación de recuperación de contraseña
const forgotPasswordSchema = Joi.object({
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
    })
});

// Validación de parámetros de ID
const idParamSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID debe ser un número',
      'number.integer': 'El ID debe ser un número entero',
      'number.positive': 'El ID debe ser un número positivo',
      'any.required': 'El ID es requerido'
    })
});

/**
 * Middleware de validación personalizada para contraseñas seguras
 */
const validateSecurePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return next();
  }

  const validation = PasswordUtils.validatePassword(password);
  
  if (!validation.isValid) {
    return ApiResponse.validationError(res, validation.errors.map(error => ({
      field: 'password',
      message: error,
      type: 'password.security'
    })));
  }

  next();
};

/**
 * Middleware de sanitización de datos
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Eliminar caracteres peligrosos
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
          .replace(/on\w+\s*=\s*'[^']*'/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Middleware de validación de archivos
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB por defecto
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      if (required) {
        return ApiResponse.validationError(res, [{
          field: 'file',
          message: 'Archivo requerido',
          type: 'file.required'
        }]);
      }
      return next();
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const errors = [];

    for (const file of files) {
      if (file.size > maxSize) {
        errors.push({
          field: 'file',
          message: `El archivo excede el tamaño máximo permitido (${maxSize / 1024 / 1024}MB)`,
          type: 'file.size'
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        errors.push({
          field: 'file',
          message: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`,
          type: 'file.type'
        });
      }
    }

    if (errors.length > 0) {
      return ApiResponse.validationError(res, errors);
    }

    next();
  };
};

module.exports = {
  validate,
  validateSecurePassword,
  sanitizeInput,
  validateFileUpload,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  idParamSchema
};
      