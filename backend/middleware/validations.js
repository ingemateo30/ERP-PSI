// middleware/validations.js
const { body, validationResult } = require('express-validator');

// Función para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// ========== VALIDACIONES PARA CLIENTES ==========

// Validación para crear cliente
const validarCrearCliente = [
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
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
    
  body('direccion')
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 255 })
    .withMessage('La dirección debe tener entre 5 y 255 caracteres'),
    
  body('sector_id')
    .optional()
    .isNumeric()
    .withMessage('El ID del sector debe ser numérico'),
    
  body('estrato')
    .optional()
    .isIn(['1', '2', '3', '4', '5', '6'])
    .withMessage('El estrato debe estar entre 1 y 6'),
    
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres'),
    
  body('ciudad_id')
    .optional()
    .isNumeric()
    .withMessage('El ID de la ciudad debe ser numérico'),
    
  body('telefono')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres'),
    
  body('telefono_2')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono 2 debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 30 })
    .withMessage('El teléfono 2 no puede exceder 30 caracteres'),
    
  body('correo')
    .optional()
    .isEmail()
    .withMessage('El correo debe tener un formato válido')
    .isLength({ max: 100 })
    .withMessage('El correo no puede exceder 100 caracteres'),
    
  body('fecha_registro')
    .optional()
    .isISO8601()
    .withMessage('La fecha de registro debe ser válida'),
    
  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('La fecha hasta debe ser válida'),
    
  body('estado')
    .optional()
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('Estado inválido'),
    
  body('mac_address')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('La dirección MAC debe tener un formato válido'),
    
  body('ip_asignada')
    .optional()
    .isIP()
    .withMessage('La IP asignada debe ser válida'),
    
  body('tap')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El TAP no puede exceder 20 caracteres'),
    
  body('poste')
    .optional()
    .isLength({ max: 50 })
    .withMessage('El poste no puede exceder 50 caracteres'),
    
  body('contrato')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El contrato no puede exceder 20 caracteres'),
    
  body('ruta')
    .optional()
    .isLength({ max: 10 })
    .withMessage('La ruta no puede exceder 10 caracteres'),
    
  body('codigo_usuario')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El código de usuario no puede exceder 20 caracteres'),
    
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  handleValidationErrors
];

// Validación para actualizar cliente
const validarActualizarCliente = [
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
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
    
  body('direccion')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('La dirección debe tener entre 5 y 255 caracteres'),
    
  body('sector_id')
    .optional()
    .isNumeric()
    .withMessage('El ID del sector debe ser numérico'),
    
  body('estrato')
    .optional()
    .isIn(['1', '2', '3', '4', '5', '6'])
    .withMessage('El estrato debe estar entre 1 y 6'),
    
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres'),
    
  body('ciudad_id')
    .optional()
    .isNumeric()
    .withMessage('El ID de la ciudad debe ser numérico'),
    
  body('telefono')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres'),
    
  body('telefono_2')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono 2 debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 30 })
    .withMessage('El teléfono 2 no puede exceder 30 caracteres'),
    
  body('correo')
    .optional()
    .isEmail()
    .withMessage('El correo debe tener un formato válido')
    .isLength({ max: 100 })
    .withMessage('El correo no puede exceder 100 caracteres'),
    
  body('fecha_registro')
    .optional()
    .isISO8601()
    .withMessage('La fecha de registro debe ser válida'),
    
  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('La fecha hasta debe ser válida'),
    
  body('estado')
    .optional()
    .isIn(['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'])
    .withMessage('Estado inválido'),
    
  body('mac_address')
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('La dirección MAC debe tener un formato válido'),
    
  body('ip_asignada')
    .optional()
    .isIP()
    .withMessage('La IP asignada debe ser válida'),
    
  body('tap')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El TAP no puede exceder 20 caracteres'),
    
  body('poste')
    .optional()
    .isLength({ max: 50 })
    .withMessage('El poste no puede exceder 50 caracteres'),
    
  body('contrato')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El contrato no puede exceder 20 caracteres'),
    
  body('ruta')
    .optional()
    .isLength({ max: 10 })
    .withMessage('La ruta no puede exceder 10 caracteres'),
    
  body('codigo_usuario')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El código de usuario no puede exceder 20 caracteres'),
    
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  handleValidationErrors
];

// ========== VALIDACIONES PARA FACTURAS ==========

// Validación para crear factura
const validarCrearFactura = [
  body('cliente_id')
    .notEmpty()
    .withMessage('El ID del cliente es requerido')
    .isNumeric()
    .withMessage('El ID del cliente debe ser numérico'),
    
  body('periodo_facturacion')
    .notEmpty()
    .withMessage('El período de facturación es requerido')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El formato del período debe ser YYYY-MM'),
    
  body('fecha_vencimiento')
    .notEmpty()
    .withMessage('La fecha de vencimiento es requerida')
    .isISO8601()
    .withMessage('La fecha de vencimiento debe ser válida'),
    
  body('fecha_desde')
    .optional()
    .isISO8601()
    .withMessage('La fecha desde debe ser válida'),
    
  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('La fecha hasta debe ser válida'),
    
  body('internet')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('El valor de internet debe ser decimal válido'),
    
  body('television')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('El valor de televisión debe ser decimal válido'),
    
  body('saldo_anterior')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('El saldo anterior debe ser decimal válido'),
    
  body('ruta')
    .optional()
    .isLength({ max: 10 })
    .withMessage('La ruta no puede exceder 10 caracteres'),
    
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  handleValidationErrors
];

// Validación para actualizar factura
const validarActualizarFactura = [
  body('periodo_facturacion')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('El formato del período debe ser YYYY-MM'),
    
  body('fecha_vencimiento')
    .optional()
    .isISO8601()
    .withMessage('La fecha de vencimiento debe ser válida'),
    
  body('estado')
    .optional()
    .isIn(['pendiente', 'pagada', 'vencida', 'anulada'])
    .withMessage('Estado inválido'),
    
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  handleValidationErrors
];

// Validación para marcar factura como pagada
const validarPagarFactura = [
  body('metodo_pago')
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'consignacion'])
    .withMessage('Método de pago inválido'),
    
  body('fecha_pago')
    .optional()
    .isISO8601()
    .withMessage('La fecha de pago debe ser válida'),
    
  body('referencia_pago')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La referencia de pago no puede exceder 255 caracteres'),
    
  body('banco_id')
    .optional()
    .isNumeric()
    .withMessage('El ID del banco debe ser numérico'),

  handleValidationErrors
];

// ========== VALIDACIONES PARA USUARIOS ==========

// Validación para crear usuario
const validarCrearUsuario = [
  body('email')
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres'),
    
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
    
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    
  body('telefono')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede exceder 20 caracteres'),
    
  body('rol')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isIn(['administrador', 'instalador', 'supervisor'])
    .withMessage('Rol inválido'),

  handleValidationErrors
];

// Validación para actualizar usuario
const validarActualizarUsuario = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres'),
    
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
    
  body('nombre')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    
  body('telefono')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono debe contener solo números, espacios, paréntesis, + y -')
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede exceder 20 caracteres'),
    
  body('rol')
    .optional()
    .isIn(['administrador', 'instalador', 'supervisor'])
    .withMessage('Rol inválido'),

  handleValidationErrors
];

// ========== VALIDACIONES PARA LOGIN ==========

const validarLogin = [
  body('email')
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('El email debe tener un formato válido'),
    
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),

  handleValidationErrors
];

// ========== EXPORTAR TODAS LAS VALIDACIONES ==========

module.exports = {
  // Clientes
  validarCrearCliente,
  validarActualizarCliente,
  
  // Facturas
  validarCrearFactura,
  validarActualizarFactura,
  validarPagarFactura,
  
  // Usuarios
  validarCrearUsuario,
  validarActualizarUsuario,
  
  // Auth
  validarLogin,
  
  // Utilidad
  handleValidationErrors
};