const { body, param, query, validationResult } = require('express-validator');

// Validaciones para crear instalación
const validarCrearInstalacion = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('El ID del cliente debe ser un número entero positivo'),
  
  body('plan_id')
    .isInt({ min: 1 })
    .withMessage('El ID del plan debe ser un número entero positivo'),
  
  body('fecha_programada')
    .isISO8601()
    .withMessage('La fecha programada debe tener formato válido (YYYY-MM-DD HH:MM:SS)')
    .custom((value) => {
      const fecha = new Date(value);
      const ahora = new Date();
      if (fecha <= ahora) {
        throw new Error('La fecha programada debe ser futura');
      }
      return true;
    }),
  
  body('direccion_instalacion')
    .isLength({ min: 5, max: 255 })
    .withMessage('La dirección debe tener entre 5 y 255 caracteres')
    .trim(),
  
  body('instalador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
  
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres')
    .trim(),
  
  body('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de la ciudad debe ser un número entero positivo'),
  
  body('telefono_contacto')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono de contacto solo puede contener números y símbolos válidos')
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede exceder 20 caracteres'),
  
  body('persona_recibe')
    .optional()
    .isLength({ max: 255 })
    .withMessage('El nombre de la persona que recibe no puede exceder 255 caracteres')
    .trim(),
  
  body('tipo_instalacion')
    .optional()
    .isIn(['nueva', 'migracion', 'upgrade', 'reparacion'])
    .withMessage('El tipo de instalación debe ser: nueva, migracion, upgrade o reparacion'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
    .trim(),
  
  body('equipos_instalados')
    .optional()
    .isArray()
    .withMessage('Los equipos instalados deben ser un array'),
  
  body('equipos_instalados.*.tipo')
    .optional()
    .isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro'])
    .withMessage('Tipo de equipo inválido'),
  
  body('coordenadas_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90 grados'),
  
  body('coordenadas_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180 grados'),
  
  body('costo_instalacion')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de instalación debe ser un número positivo'),
];

// Validaciones para actualizar instalación
const validarActualizarInstalacion = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la instalación debe ser un número entero positivo'),
  
  body('instalador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
  
  body('fecha_programada')
    .optional()
    .isISO8601()
    .withMessage('La fecha programada debe tener formato válido'),
  
  body('fecha_realizada')
    .optional()
    .isISO8601()
    .withMessage('La fecha realizada debe tener formato válido'),
  
  body('direccion_instalacion')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('La dirección debe tener entre 5 y 255 caracteres')
    .trim(),
  
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres')
    .trim(),
  
  body('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de la ciudad debe ser un número entero positivo'),
  
  body('telefono_contacto')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('El teléfono de contacto solo puede contener números y símbolos válidos')
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede exceder 20 caracteres'),
  
  body('persona_recibe')
    .optional()
    .isLength({ max: 255 })
    .withMessage('El nombre de la persona que recibe no puede exceder 255 caracteres')
    .trim(),
  
  body('tipo_instalacion')
    .optional()
    .isIn(['nueva', 'migracion', 'upgrade', 'reparacion'])
    .withMessage('El tipo de instalación debe ser: nueva, migracion, upgrade o reparacion'),
  
  body('estado')
    .optional()
    .isIn(['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'])
    .withMessage('El estado debe ser: programada, en_proceso, completada, cancelada o reagendada'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
    .trim(),
  
  body('equipos_instalados')
    .optional()
    .isArray()
    .withMessage('Los equipos instalados deben ser un array'),
  
  body('fotos_instalacion')
    .optional()
    .isArray()
    .withMessage('Las fotos de instalación deben ser un array'),
  
  body('coordenadas_lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('La latitud debe estar entre -90 y 90 grados'),
  
  body('coordenadas_lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('La longitud debe estar entre -180 y 180 grados'),
  
  body('costo_instalacion')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El costo de instalación debe ser un número positivo'),
];

// Validaciones para cambiar estado
const validarCambiarEstado = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la instalación debe ser un número entero positivo'),
  
  body('estado')
    .isIn(['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'])
    .withMessage('El estado debe ser: programada, en_proceso, completada, cancelada o reagendada'),
  
  body('observaciones')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres')
    .trim(),
  
  body('fecha_realizada')
    .if(body('estado').equals('completada'))
    .notEmpty()
    .withMessage('La fecha de realización es obligatoria para instalaciones completadas')
    .isISO8601()
    .withMessage('La fecha realizada debe tener formato válido'),
  
  body('equipos_instalados')
    .optional()
    .isArray()
    .withMessage('Los equipos instalados deben ser un array'),
  
  body('fotos_instalacion')
    .optional()
    .isArray()
    .withMessage('Las fotos de instalación deben ser un array'),
];

// Validaciones para reagendar
const validarReagendar = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la instalación debe ser un número entero positivo'),
  
  body('nueva_fecha')
    .isISO8601()
    .withMessage('La nueva fecha debe tener formato válido (YYYY-MM-DD HH:MM:SS)')
    .custom((value) => {
      const fecha = new Date(value);
      const ahora = new Date();
      if (fecha <= ahora) {
        throw new Error('La nueva fecha debe ser futura');
      }
      return true;
    }),
  
  body('motivo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres')
    .trim(),
];

// Validaciones para asignar instalador
const validarAsignarInstalador = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la instalación debe ser un número entero positivo'),
  
  body('instalador_id')
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
];

// Validaciones para parámetros de consulta
const validarParametrosConsulta = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  
  query('estado')
    .optional()
    .isIn(['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'])
    .withMessage('Estado inválido'),
  
  query('instalador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
  
  query('fecha_desde')
    .optional()
    .isDate()
    .withMessage('La fecha desde debe tener formato válido (YYYY-MM-DD)'),
  
  query('fecha_hasta')
    .optional()
    .isDate()
    .withMessage('La fecha hasta debe tener formato válido (YYYY-MM-DD)'),
  
  query('tipo_instalacion')
    .optional()
    .isIn(['nueva', 'migracion', 'upgrade', 'reparacion'])
    .withMessage('Tipo de instalación inválido'),
  
  query('ciudad_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de la ciudad debe ser un número entero positivo'),
  
  query('busqueda')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('La búsqueda debe tener entre 2 y 100 caracteres')
    .trim(),
];

// Validaciones para parámetros de ID
const validarId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),
];

const validarInstaladorId = [
  param('instalador_id')
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
];

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
  const errores = validationResult(req);
  
  if (!errores.isEmpty()) {
    const erroresFormateados = errores.array().map(error => ({
      campo: error.param,
      valor: error.value,
      mensaje: error.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Errores de validación en los datos enviados',
      errores: erroresFormateados,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Validación personalizada para verificar fechas coherentes
const validarFechasCoherentes = (req, res, next) => {
  const { fecha_desde, fecha_hasta } = req.query;
  
  if (fecha_desde && fecha_hasta) {
    const desde = new Date(fecha_desde);
    const hasta = new Date(fecha_hasta);
    
    if (desde > hasta) {
      return res.status(400).json({
        success: false,
        message: 'La fecha desde no puede ser mayor que la fecha hasta',
        timestamp: new Date().toISOString()
      });
    }
    
    // Verificar que el rango no sea mayor a 1 año
    const unAno = 365 * 24 * 60 * 60 * 1000; // 1 año en milisegundos
    if (hasta - desde > unAno) {
      return res.status(400).json({
        success: false,
        message: 'El rango de fechas no puede ser mayor a 1 año',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

module.exports = {
  validarCrearInstalacion,
  validarActualizarInstalacion,
  validarCambiarEstado,
  validarReagendar,
  validarAsignarInstalador,
  validarParametrosConsulta,
  validarId,
  validarInstaladorId,
  manejarErroresValidacion,
  validarFechasCoherentes
};