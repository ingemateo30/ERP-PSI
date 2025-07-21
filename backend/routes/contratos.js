// backend/routes/contratos.js
const express = require('express');
const router = express.Router();
const ContratosController = require('../controllers/ContratosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

console.log('📋 Cargando rutas de contratos...');

/**
 * @route GET /api/v1/contratos
 * @desc Obtener todos los contratos con paginación y filtros
 * @access Private (Supervisor+)
 */
router.get('/',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  ContratosController.obtenerTodos
);

/**
 * @route GET /api/v1/contratos/stats
 * @desc Obtener estadísticas de contratos
 * @access Private (Supervisor+)
 */
router.get('/stats',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  ContratosController.obtenerEstadisticas
);

/**
 * @route GET /api/v1/contratos/:id
 * @desc Obtener contrato por ID con todos los detalles
 * @access Private
 */
router.get('/:id',
  authenticateToken,
  ContratosController.obtenerPorId
);

/**
 * @route GET /api/v1/contratos/:id/pdf
 * @desc Generar y descargar PDF del contrato
 * @access Private
 */
router.get('/:id/pdf',
  authenticateToken,
  ContratosController.generarPDF
);

router.get('/:id/verificar-pdf',
  authenticateToken,
  ContratosController.verificarPDF
);

router.get('/:id/descargar-pdf',
  authenticateToken,
  ContratosController.descargarPDF
);

/**
 * @route PUT /api/v1/contratos/:id/estado
 * @desc Actualizar estado del contrato
 * @access Private (Supervisor+)
 */
router.put('/:id/estado',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  ContratosController.actualizarEstado
);

/**
 * @route GET /api/v1/contratos/:id/abrir-firma
 * @desc Obtener contrato para proceso de firma
 */
router.get('/:id/abrir-firma', ContratosController.abrirParaFirma);

/**
 * @route POST /api/v1/contratos/:id/procesar-firma
 * @desc Procesar firma digital y guardar PDF
 */
router.post('/:id/procesar-firma', ContratosController.procesarFirmaDigital);

const authenticateFlexible = (req, res, next) => {
  // Intentar autenticación por header primero
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Si no hay token en header, buscar en query params
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Error de autenticación:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

console.log('✅ Rutas de contratos cargadas correctamente');

module.exports = router;