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
    
    console.log('🔍 Auth Header completo:', authHeader);
    console.log('🔍 Tipo de authHeader:', typeof authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);
    console.log('🔑 Token extraído:', token.substring(0, 20) + '...');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_psi_2024');
    console.log('✅ Token decodificado:', decoded);

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

/**
 * @route POST /api/v1/consulta-cliente/validar
 * @desc Validar cliente con documento, teléfono y email
 * @access Público
 */
router.post('/validar', 
  validacionesValidar,
  consultaClienteController.validarCliente
);

// ============================================
// RUTAS PROTEGIDAS (requieren token)
// ============================================

/**
 * @route GET /api/v1/consulta-cliente/facturas
 * @desc Obtener todas las facturas del cliente
 * @access Privado (requiere token de cliente)
 */
router.get('/facturas',
  verificarTokenCliente,
  consultaClienteController.obtenerFacturas
);

/**
 * @route GET /api/v1/consulta-cliente/facturas/:facturaId/detalle
 * @desc Obtener detalles de una factura específica
 * @access Privado (requiere token de cliente)
 */
router.get('/facturas/:facturaId/detalle', 
  verificarTokenCliente, 
  consultaClienteController.obtenerDetalleFactura
);

/**
 * @route GET /api/v1/consulta-cliente/facturas/:facturaId/pdf
 * @desc Descargar PDF de factura
 * @access Privado (requiere token de cliente)
 */
router.get('/facturas/:facturaId/pdf', 
  verificarTokenCliente,  // ✅ AGREGADO
  consultaClienteController.descargarFacturaPDF
);

/**
 * @route GET /api/v1/consulta-cliente/contratos
 * @desc Obtener todos los contratos del cliente
 * @access Privado (requiere token de cliente)
 */
router.get('/contratos',
  verificarTokenCliente,
  consultaClienteController.obtenerContratos
);

/**
 * @route GET /api/v1/consulta-cliente/contratos/:contratoId/pdf
 * @desc Descargar PDF de contrato
 * @access Privado (requiere token de cliente)
 */
router.get('/contratos/:contratoId/pdf', 
  verificarTokenCliente, 
  consultaClienteController.descargarPDF
);

/**
 * @route GET /api/v1/consulta-cliente/servicios
 * @desc Obtener servicios activos del cliente
 * @access Privado (requiere token de cliente)
 */
router.get('/servicios',
  verificarTokenCliente,
  consultaClienteController.obtenerServicios
);

/**
 * @route GET /api/v1/consulta-cliente/instalaciones
 * @desc Obtener instalaciones del cliente
 * @access Privado (requiere token de cliente)
 */
router.get('/instalaciones',
  verificarTokenCliente,
  consultaClienteController.obtenerInstalaciones
);

console.log('✅ Rutas de consulta cliente cargadas correctamente');

module.exports = router;