const { body, validationResult } = require('express-validator');

// Validaciones para crear cliente
const validarCliente = [
  body('identificacion')
    .notEmpty()
    .withMessage('La identificación es requerida')
    .isLength({ min: 5, max: 20 })
    .withMessage('La identificación debe tener entre 5 y 20 caracteres')
    .matches(/^[0-9A-Za-z-]+$/)
    .withMessage('La identificación solo puede contener números, letras y guiones'),

  body('tipo_documento')
    .optional()
    .isIn(['cedula', 'nit', 'pasaporte', 'extranjeria'])
    .withMessage('Tipo de documento inválido'),

  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('direccion')
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La dirección debe tener entre 5 y 500 caracteres'),

  body('sector_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de sector inválido'),

  body('estrato')
    .optional()
    .isIn(['1', '2', '3', '4', '5', '6'])
    .withMessage('Estrato inválido (debe ser 1-6)'),

  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres'),

  body('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de ciudad inválido'),

  body('telefono')
    .optional()
    .isMobilePhone('es-CO')
    .withMessage('Número de teléfono inválido para Colombia')
    .customSanitizer((value) => {
      if (!value) return null;
      // Normalizar formato de teléfono colombiano
      return value.replace(/\D/g, '');
    }),

  body('telefono_2')
    .optional()
    .isMobilePhone('es-CO')
    .withMessage('Número de teléfono 2 inválido para Colombia')
    .customSanitizer((value) => {
      if (!value) return null;
      return value.replace(/\D/g, '');
    }),

  body('correo')
    .optional()
    .isEmail()
    .withMessage('Correo electrónico inválido')
    .normalizeEmail(),

  body('fecha_registro')
    .optional()
    .isISO8601()
    .withMessage('Fecha de registro inválida')
    .toDate(),

  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta inválida')
    .toDate(),

  body('estado')
    .optional()
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('Estado inválido'),

  body('mac_address')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Dirección MAC inválida'),

  body('ip_asignada')
    .optional()
    .isIP()
    .withMessage('Dirección IP inválida'),

  body('tap')
    .optional()
    .isLength({ max: 20 })
    .withMessage('TAP no puede exceder 20 caracteres'),

  body('poste')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Poste no puede exceder 50 caracteres'),

  body('contrato')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Contrato no puede exceder 20 caracteres'),

  body('ruta')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Ruta no puede exceder 10 caracteres'),

  body('requiere_reconexion')
    .optional()
    .isBoolean()
    .withMessage('Requiere reconexión debe ser verdadero o falso'),

  body('codigo_usuario')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Código de usuario no puede exceder 20 caracteres'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  // Validación personalizada para verificar coherencia de fechas
  body('fecha_hasta').custom((value, { req }) => {
    if (value && req.body.fecha_registro) {
      const fechaRegistro = new Date(req.body.fecha_registro);
      const fechaHasta = new Date(value);
      
      if (fechaHasta <= fechaRegistro) {
        throw new Error('La fecha hasta debe ser posterior a la fecha de registro');
      }
    }
    return true;
  }),

  // Validación personalizada para IP y MAC
  body('ip_asignada').custom((value, { req }) => {
    if (value && !req.body.mac_address) {
      throw new Error('Si se asigna IP, también se debe proporcionar la dirección MAC');
    }
    return true;
  })
];

// Validaciones para actualizar cliente (campos opcionales)
const validarActualizacionCliente = [
  body('identificacion')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('La identificación debe tener entre 5 y 20 caracteres')
    .matches(/^[0-9A-Za-z-]+$/)
    .withMessage('La identificación solo puede contener números, letras y guiones'),

  body('tipo_documento')
    .optional()
    .isIn(['cedula', 'nit', 'pasaporte', 'extranjeria'])
    .withMessage('Tipo de documento inválido'),

  body('nombre')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('direccion')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('La dirección debe tener entre 5 y 500 caracteres'),

  body('sector_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de sector inválido'),

  body('estrato')
    .optional()
    .isIn(['1', '2', '3', '4', '5', '6'])
    .withMessage('Estrato inválido (debe ser 1-6)'),

  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres'),

  body('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de ciudad inválido'),

  body('telefono')
    .optional()
    .isMobilePhone('es-CO')
    .withMessage('Número de teléfono inválido para Colombia')
    .customSanitizer((value) => {
      if (!value) return null;
      return value.replace(/\D/g, '');
    }),

  body('telefono_2')
    .optional()
    .isMobilePhone('es-CO')
    .withMessage('Número de teléfono 2 inválido para Colombia')
    .customSanitizer((value) => {
      if (!value) return null;
      return value.replace(/\D/g, '');
    }),

  body('correo')
    .optional()
    .isEmail()
    .withMessage('Correo electrónico inválido')
    .normalizeEmail(),

  body('fecha_registro')
    .optional()
    .isISO8601()
    .withMessage('Fecha de registro inválida')
    .toDate(),

  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha hasta inválida')
    .toDate(),

  body('estado')
    .optional()
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('Estado inválido'),

  body('mac_address')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Dirección MAC inválida'),

  body('ip_asignada')
    .optional()
    .isIP()
    .withMessage('Dirección IP inválida'),

  body('tap')
    .optional()
    .isLength({ max: 20 })
    .withMessage('TAP no puede exceder 20 caracteres'),

  body('poste')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Poste no puede exceder 50 caracteres'),

  body('contrato')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Contrato no puede exceder 20 caracteres'),

  body('ruta')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Ruta no puede exceder 10 caracteres'),

  body('requiere_reconexion')
    .optional()
    .isBoolean()
    .withMessage('Requiere reconexión debe ser verdadero o falso'),

  body('codigo_usuario')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Código de usuario no puede exceder 20 caracteres'),

  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  // Validación personalizada para verificar coherencia de fechas
  body('fecha_hasta').custom((value, { req }) => {
    if (value && req.body.fecha_registro) {
      const fechaRegistro = new Date(req.body.fecha_registro);
      const fechaHasta = new Date(value);
      
      if (fechaHasta <= fechaRegistro) {
        throw new Error('La fecha hasta debe ser posterior a la fecha de registro');
      }
    }
    return true;
  })
];

// Validaciones para cambio de estado
const validarCambioEstado = [
  body('estado')
    .notEmpty()
    .withMessage('El estado es requerido')
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('Estado inválido'),

  body('motivo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres')
];

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errores: errores.array().map(error => ({
        campo: error.path,
        mensaje: error.msg,
        valor: error.value
      }))
    });
  }
  next();
};

module.exports = {
  validarCliente,
  validarActualizacionCliente,
  validarCambioEstado,
  manejarErroresValidacion
};