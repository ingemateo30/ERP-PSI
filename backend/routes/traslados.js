// backend/routes/traslados.js
const express = require('express');
const router = express.Router();
const TrasladosController = require('../controllers/TrasladosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Estadísticas
router.get('/estadisticas', TrasladosController.estadisticas);

// Traslados de un cliente
router.get('/cliente/:clienteId', TrasladosController.porCliente);

// Listar todos los traslados
router.get('/', TrasladosController.listar);

// Crear traslado
router.post('/',
  requireRole('administrador', 'supervisor', 'secretaria'),
  TrasladosController.crear
);

// Completar traslado
router.put('/:id/completar',
  requireRole('administrador', 'supervisor', 'instalador'),
  TrasladosController.completar
);

// Cancelar traslado
router.put('/:id/cancelar',
  requireRole('administrador', 'supervisor', 'secretaria'),
  TrasladosController.cancelar
);

module.exports = router;
