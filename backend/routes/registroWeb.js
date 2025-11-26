const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const registroWebController = require('../controllers/registroWeb.controller');

// Validaciones para registro
const validacionesRegistro = [
  body('tipoDocumento')
    .notEmpty().withMessage('El tipo de documento es requerido')
    .isIn(['CC', 'NIT', 'CE', 'TI', 'PASAPORTE']).withMessage('Tipo de documento no válido'),
  
  body('numeroDocumento')
    .notEmpty().withMessage('El número de documento es requerido')
    .isLength({ min: 5, max: 20 }).withMessage('Número de documento inválido'),
  
  body('nombres')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  
  body('apellidos')
    .notEmpty().withMessage('Los apellidos son requeridos')
    .isLength({ min: 2, max: 100 }).withMessage('Apellidos deben tener entre 2 y 100 caracteres'),
  
  body('email')
    .notEmpty().withMessage('El correo electrónico es requerido')
    .isEmail().withMessage('Formato de correo electrónico inválido'),
  
  body('celular')
    .notEmpty().withMessage('El celular es requerido')
    .matches(/^[0-9]{10}$/).withMessage('El celular debe tener 10 dígitos'),
  
  body('direccion')
    .notEmpty().withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 200 }).withMessage('Dirección debe tener entre 5 y 200 caracteres'),
  
  body('barrio')
    .notEmpty().withMessage('El barrio es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('Barrio debe tener entre 2 y 100 caracteres'),
  
  body('planesSeleccionados')
    .isArray({ min: 1 }).withMessage('Debe seleccionar al menos un plan')
];

// 📦 Obtener planes activos
router.get('/planes', registroWebController.obtenerPlanes);

// 🏙️ Obtener ciudades
router.get('/ciudades', registroWebController.obtenerCiudades);

// 🗺️ Obtener sectores por ciudad
router.get('/sectores/:ciudadId', registroWebController.obtenerSectores);

// 📝 Registrar cliente
router.post('/registro', validacionesRegistro, registroWebController.registrarCliente);

module.exports = router;
