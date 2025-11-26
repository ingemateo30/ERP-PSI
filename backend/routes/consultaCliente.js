const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const consultaClienteController = require('../controllers/consultaCliente.controller');
const jwt = require('jsonwebtoken');

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN PARA CLIENTES
// ============================================
const verificarTokenCliente = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_psi_2024');

    if (decoded.tipo !== 'cliente_publico') {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }

    req.clientePublico = {
      clienteId: decoded.clienteId,
      identificacion: decoded.identificacion
    };

    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return res.status(401).json({
      success: false,
      message: 'Token expirado o inválido'
    });
  }
};

// ============================================
// VALIDACIONES
// ============================================
const validacionesValidar = [
  body('numeroDocumento')
    .notEmpty().withMessage('Documento requerido')
    .isLength({ min: 6, max: 20 }).withMessage('Documento inválido'),
  
  body('telefono')
    .notEmpty().withMessage('Teléfono requerido')
    .matches(/^[0-9]{7,10}$/).withMessage('Teléfono debe tener entre 7 y 10 dígitos'),
  
  body('email')
    .notEmpty().withMessage('Email requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail()
];

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Validar cliente (sin autenticación)
router.post('/validar', 
  validacionesValidar,
  consultaClienteController.validarCliente
);

// ============================================
// RUTAS PROTEGIDAS (requieren token)
// ============================================

// Obtener facturas
router.get('/facturas',
  verificarTokenCliente,
  consultaClienteController.obtenerFacturas
);

// Obtener contratos
router.get('/contratos',
  verificarTokenCliente,
  consultaClienteController.obtenerContratos
);

// Obtener servicios
router.get('/servicios',
  verificarTokenCliente,
  consultaClienteController.obtenerServicios
);

// Obtener instalaciones
router.get('/instalaciones',
  verificarTokenCliente,
  consultaClienteController.obtenerInstalaciones
);
// Descargar PDF de contrato
router.get('/contratos/:contratoId/pdf', verificarTokenCliente, consultaClienteController.descargarPDF);

// ✅ NUEVA: Descargar PDF de factura
router.get('/facturas/:facturaId/pdf', consultaClienteController.descargarFacturaPDF);
// Obtener detalles de una factura
router.get('/facturas/:facturaId/detalle', verificarTokenCliente, consultaClienteController.obtenerDetalleFactura);
module.exports = router;
