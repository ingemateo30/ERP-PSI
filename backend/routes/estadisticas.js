// backend/routes/estadisticas.js
// RUTAS PARA ESTADÍSTICAS GENERALES

const express = require('express');
const router = express.Router();
const EstadisticasController = require('../controllers/estadisticasController');
const { authenticateToken } = require('../middleware/auth');

console.log('🔧 Configurando rutas de estadísticas...');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * GET /api/v1/estadisticas/dashboard
 * Obtener todas las estadísticas del dashboard principal
 */
router.get('/dashboard', EstadisticasController.getDashboardGeneral);

/**
 * GET /api/v1/estadisticas/financieras
 * Obtener estadísticas financieras detalladas
 */
router.get('/financieras', EstadisticasController.getFinancieras);

/**
 * GET /api/v1/estadisticas/clientes
 * Obtener estadísticas de clientes
 */
router.get('/clientes', EstadisticasController.getClientes);

/**
 * GET /api/v1/estadisticas/operacionales
 * Obtener estadísticas operacionales
 */
router.get('/operacionales', EstadisticasController.getOperacionales);

/**
 * GET /api/v1/estadisticas/top-clientes
 * Obtener top clientes por facturación
 * Query params: limit (default: 10), periodo (semana|mes|trimestre|año)
 */
router.get('/top-clientes', EstadisticasController.getTopClientes);

console.log('✅ Rutas de estadísticas configuradas correctamente');

module.exports = router;