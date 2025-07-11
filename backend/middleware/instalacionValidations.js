// backend/middleware/instalacionValidations.js

const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validaciones para crear instalación
const validarCrearInstalacion = [
  body('cliente_id')
    .isInt({ min: 1 })
    .withMessage('El ID del cliente debe ser un número entero positivo'),
  
  body('servicio_cliente_id')
    .isInt({ min: 1 })
    .withMessage('El ID del servicio del cliente debe ser un número entero positivo'),
  
  body('instalador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
  
  body('fecha_programada')
    .notEmpty()
    .withMessage('La fecha programada es obligatoria')
    .isISO8601()
    .withMessage('La fecha programada debe tener formato válido (YYYY-MM-DD)')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha < hoy) {
        throw new Error('La fecha programada no puede ser anterior a hoy');
      }
      return true;
    }),
  
  body('hora_programada')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora programada debe tener formato HH:MM'),
  
  body('direccion_instalacion')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La dirección no puede exceder 255 caracteres')
    .trim(),
  
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres')
    .trim(),
  
  body('telefono_contacto')
    .optional()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('El teléfono de contacto debe tener entre 7 y 20 caracteres y solo contener números, espacios, +, - y paréntesis')
    .trim(),
  
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
  
  body('equipos_instalados.*.equipo_id')
    .if(body('equipos_instalados').exists())
    .isInt({ min: 1 })
    .withMessage('El ID del equipo debe ser un número entero positivo'),
  
  body('equipos_instalados.*.cantidad')
    .if(body('equipos_instalados').exists())
    .optional()
    .isInt({ min: 1 })
    .withMessage('La cantidad del equipo debe ser un número entero positivo'),
  
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
  
  body('contrato_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del contrato debe ser un número entero positivo'),
  
  body('tipo_orden')
    .optional()
    .isIn(['instalacion', 'cambio_plan', 'traslado', 'reconexion', 'retiro', 'mantenimiento'])
    .withMessage('El tipo de orden debe ser: instalacion, cambio_plan, traslado, reconexion, retiro o mantenimiento')
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
    .withMessage('La fecha programada debe tener formato válido (YYYY-MM-DD)'),
  
  body('hora_programada')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora programada debe tener formato HH:MM'),
  
  body('direccion_instalacion')
    .optional()
    .isLength({ max: 255 })
    .withMessage('La dirección no puede exceder 255 caracteres')
    .trim(),
  
  body('barrio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El barrio no puede exceder 100 caracteres')
    .trim(),
  
  body('telefono_contacto')
    .optional()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('El teléfono de contacto debe tener entre 7 y 20 caracteres')
    .trim(),
  
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
  
  body('hora_inicio')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de inicio debe tener formato HH:MM'),
  
  body('hora_fin')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora de fin debe tener formato HH:MM'),
  
  body('equipos_instalados')
    .optional()
    .isArray()
    .withMessage('Los equipos instalados deben ser un array'),
  
  body('fotos_instalacion')
    .optional()
    .isArray()
    .withMessage('Las fotos de instalación deben ser un array'),
];

// Validación para obtener por ID
const validarObtenerPorId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la instalación debe ser un número entero positivo')
];

// Validaciones para filtros de listado
const validarFiltrosListado = [
  body('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  body('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  
  body('estado')
    .optional()
    .isIn(['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'])
    .withMessage('El estado debe ser válido'),
  
  body('tipo_instalacion')
    .optional()
    .isIn(['nueva', 'migracion', 'upgrade', 'reparacion'])
    .withMessage('El tipo de instalación debe ser válido'),
  
  body('instalador_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del instalador debe ser un número entero positivo'),
  
  body('fecha_desde')
    .optional()
    .isISO8601()
    .withMessage('La fecha desde debe tener formato válido'),
  
  body('fecha_hasta')
    .optional()
    .isISO8601()
    .withMessage('La fecha hasta debe tener formato válido'),
];

// Validación personalizada para verificar equipos disponibles
const validarEquiposDisponibles = async (req, res, next) => {
  try {
    const { equipos_instalados } = req.body;
    
    if (!equipos_instalados || !Array.isArray(equipos_instalados)) {
      return next();
    }

    const { Database } = require('../models/Database');
    
    for (const equipo of equipos_instalados) {
      if (equipo.equipo_id) {
        const [equipoDb] = await Database.query(
          'SELECT id, estado, nombre FROM inventario_equipos WHERE id = ?',
          [equipo.equipo_id]
        );
        
        if (!equipoDb) {
          return res.status(400).json({
            success: false,
            message: `El equipo con ID ${equipo.equipo_id} no existe`
          });
        }
        
        if (equipoDb.estado !== 'disponible' && equipoDb.estado !== 'asignado') {
          return res.status(400).json({
            success: false,
            message: `El equipo "${equipoDb.nombre}" no está disponible para asignación`
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error validando equipos:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando disponibilidad de equipos'
    });
  }
};

// Validación para verificar permisos según rol del usuario
const validarPermisosInstalacion = (req, res, next) => {
  const { rol } = req.user;
  const { instalador_id } = req.body;
  
  // Los instaladores solo pueden ver/editar sus propias instalaciones
  if (rol === 'instalador') {
    if (req.method === 'GET' && req.params.id) {
      // Verificar que la instalación pertenece al instalador
      // Esta validación se podría hacer en el controlador
    } else if (req.method === 'POST' || req.method === 'PUT') {
      // Al crear/actualizar, el instalador debe ser el mismo usuario
      if (instalador_id && instalador_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para asignar instalaciones a otros instaladores'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validarCrearInstalacion,
  validarActualizarInstalacion,
  validarCambiarEstado,
  validarObtenerPorId,
  validarFiltrosListado,
  validarEquiposDisponibles,
  validarPermisosInstalacion
};