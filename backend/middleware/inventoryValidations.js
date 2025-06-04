// backend/middleware/inventoryValidations.js

const { body, param, query } = require('express-validator');

// Tipos de equipos permitidos
const EQUIPMENT_TYPES = [
  'router', 'decodificador', 'cable', 'antena', 
  'splitter', 'amplificador', 'otro'
];

// Estados de equipos permitidos
const EQUIPMENT_STATES = [
  'disponible', 'asignado', 'instalado', 'dañado', 
  'perdido', 'mantenimiento', 'devuelto'
];

// Acciones de historial permitidas
const HISTORY_ACTIONS = [
  'asignado', 'devuelto', 'instalado', 'retirado', 'dañado'
];

class InventoryValidations {

  /**
   * Validaciones para crear equipo
   */
  static createEquipment() {
    return [
      body('codigo')
        .trim()
        .notEmpty()
        .withMessage('El código es requerido')
        .isLength({ min: 3, max: 50 })
        .withMessage('El código debe tener entre 3 y 50 caracteres')
        .matches(/^[A-Z0-9_-]+$/)
        .withMessage('El código solo puede contener letras mayúsculas, números, guiones y guiones bajos')
        .customSanitizer(value => value.toUpperCase()),
      
      body('nombre')
        .trim()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 3, max: 255 })
        .withMessage('El nombre debe tener entre 3 y 255 caracteres')
        .escape(),
      
      body('tipo')
        .notEmpty()
        .withMessage('El tipo es requerido')
        .isIn(EQUIPMENT_TYPES)
        .withMessage(`Tipo de equipo no válido. Debe ser uno de: ${EQUIPMENT_TYPES.join(', ')}`),
      
      body('marca')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('La marca no puede exceder 100 caracteres')
        .escape(),
      
      body('modelo')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('El modelo no puede exceder 100 caracteres')
        .escape(),
      
      body('numero_serie')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('El número de serie no puede exceder 100 caracteres')
        .escape(),
      
      body('estado')
        .optional()
        .isIn(EQUIPMENT_STATES)
        .withMessage(`Estado no válido. Debe ser uno de: ${EQUIPMENT_STATES.join(', ')}`),
      
      body('precio_compra')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 999999999.99 })
        .withMessage('El precio de compra debe ser un número positivo menor a 1,000,000,000')
        .toFloat(),
      
      body('fecha_compra')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Fecha de compra no válida (formato: YYYY-MM-DD)')
        .custom((value) => {
          if (value && new Date(value) > new Date()) {
            throw new Error('La fecha de compra no puede ser futura');
          }
          return true;
        }),
      
      body('proveedor')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('El proveedor no puede exceder 255 caracteres')
        .escape(),
      
      body('ubicacion')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('La ubicación no puede exceder 255 caracteres')
        .escape(),
      
      body('observaciones')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres')
        .escape()
    ];
  }

  /**
   * Validaciones para actualizar equipo
   */
  static updateEquipment() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID de equipo no válido'),
      
      body('codigo')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('El código debe tener entre 3 y 50 caracteres')
        .matches(/^[A-Z0-9_-]+$/)
        .withMessage('El código solo puede contener letras mayúsculas, números, guiones y guiones bajos')
        .customSanitizer(value => value.toUpperCase()),
      
      body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('El nombre debe tener entre 3 y 255 caracteres')
        .escape(),
      
      body('tipo')
        .optional()
        .isIn(EQUIPMENT_TYPES)
        .withMessage(`Tipo de equipo no válido. Debe ser uno de: ${EQUIPMENT_TYPES.join(', ')}`),
      
      body('marca')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('La marca no puede exceder 100 caracteres')
        .escape(),
      
      body('modelo')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('El modelo no puede exceder 100 caracteres')
        .escape(),
      
      body('numero_serie')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage('El número de serie no puede exceder 100 caracteres')
        .escape(),
      
      body('precio_compra')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 999999999.99 })
        .withMessage('El precio de compra debe ser un número positivo menor a 1,000,000,000')
        .toFloat(),
      
      body('fecha_compra')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Fecha de compra no válida (formato: YYYY-MM-DD)')
        .custom((value) => {
          if (value && new Date(value) > new Date()) {
            throw new Error('La fecha de compra no puede ser futura');
          }
          return true;
        }),
      
      body('proveedor')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('El proveedor no puede exceder 255 caracteres')
        .escape(),
      
      body('ubicacion')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('La ubicación no puede exceder 255 caracteres')
        .escape(),
      
      body('observaciones')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres')
        .escape()
    ];
  }

  /**
   * Validaciones para asignar equipo
   */
  static assignEquipment() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID de equipo no válido'),
      
      body('instalador_id')
        .isInt({ min: 1 })
        .withMessage('ID de instalador no válido'),
      
      body('ubicacion')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('La ubicación no puede exceder 255 caracteres')
        .escape(),
      
      body('notas')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres')
        .escape()
    ];
  }

  /**
   * Validaciones para devolver equipo
   */
  static returnEquipment() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID de equipo no válido'),
      
      body('ubicacion_devolucion')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('La ubicación de devolución no puede exceder 255 caracteres')
        .escape(),
      
      body('notas')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres')
        .escape()
    ];
  }

  /**
   * Validaciones para marcar como instalado
   */
  static markAsInstalled() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID de equipo no válido'),
      
      body('instalador_id')
        .isInt({ min: 1 })
        .withMessage('ID de instalador no válido'),
      
      body('ubicacion_cliente')
        .trim()
        .notEmpty()
        .withMessage('La ubicación del cliente es requerida')
        .isLength({ max: 255 })
        .withMessage('La ubicación no puede exceder 255 caracteres')
        .escape(),
      
      body('coordenadas_lat')
        .optional({ nullable: true })
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitud no válida (debe estar entre -90 y 90)')
        .toFloat(),
      
      body('coordenadas_lng')
        .optional({ nullable: true })
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitud no válida (debe estar entre -180 y 180)')
        .toFloat(),
      
      body('notas')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las notas no pueden exceder 1000 caracteres')
        .escape(),
      
      body('cliente_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('ID de cliente no válido'),
      
      body('instalacion_id')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('ID de instalación no válido')
    ];
  }

  /**
   * Validaciones para actualizar ubicación
   */
  static updateLocation() {
    return [
      param('id')
        .isInt({ min: 1 })
        .withMessage('ID de equipo no válido'),
      
      body('lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitud no válida (debe estar entre -90 y 90)')
        .toFloat(),
      
      body('lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitud no válida (debe estar entre -180 y 180)')
        .toFloat(),
      
      body('direccion')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage('La dirección no puede exceder 255 caracteres')
        .escape()
    ];
  }

  /**
   * Validaciones para filtros de búsqueda
   */
  static searchFilters() {
    return [
      query('tipo')
        .optional()
        .isIn(EQUIPMENT_TYPES)
        .withMessage(`Tipo no válido. Debe ser uno de: ${EQUIPMENT_TYPES.join(', ')}`),
      
      query('estado')
        .optional()
        .isIn(EQUIPMENT_STATES)
        .withMessage(`Estado no válido. Debe ser uno de: ${EQUIPMENT_STATES.join(', ')}`),
      
      query('instalador_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de instalador no válido'),
      
      query('search')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
        .escape(),
      
      query('disponible')
        .optional()
        .isBoolean()
        .withMessage('El filtro disponible debe ser verdadero o falso')
        .toBoolean(),
      
      query('page')
        .optional()
        .isBoolean()
        .withMessage('El número de página debe ser un número entero positivo')
        .toInt(),

      query('limit')
        .optional()
        .isBoolean()
        .withMessage('El límite debe ser un número entero positivo')
        .toInt()
    ];
  }
}