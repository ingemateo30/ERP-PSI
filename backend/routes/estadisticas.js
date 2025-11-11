// backend/routes/estadisticas.js
// RUTAS PARA ESTADÍSTICAS GENERALES - VERSIÓN CORREGIDA

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roleAuth');

console.log('🔧 Configurando rutas de estadísticas...');

// Importar controlador con manejo de errores
let EstadisticasController;
try {
  EstadisticasController = require('../controllers/estadisticasController');
  console.log('✅ EstadisticasController importado correctamente');
  console.log('📋 Tipo de EstadisticasController:', typeof EstadisticasController);
  console.log('📋 Métodos disponibles:', Object.keys(EstadisticasController));
} catch (error) {
  console.error('❌ Error importando EstadisticasController:', error.message);
  throw error;
}

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Todas las rutas de estadísticas solo para administrador
router.use(verificarRol('administrador'));

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * GET /api/v1/estadisticas/dashboard
 * Obtener todas las estadísticas del dashboard principal
 */
router.get('/dashboard', (req, res, next) => {
  console.log('📊 Ejecutando getDashboardGeneral');
  EstadisticasController.getDashboardGeneral(req, res, next);
});

/**
 * GET /api/v1/estadisticas/financieras
 * Obtener estadísticas financieras detalladas
 */
router.get('/financieras', (req, res, next) => {
  console.log('💰 Ejecutando getFinancieras');
  EstadisticasController.getFinancieras(req, res, next);
});

/**
 * GET /api/v1/estadisticas/clientes
 * Obtener estadísticas de clientes
 */
router.get('/clientes', (req, res, next) => {
  console.log('👥 Ejecutando getClientes');
  EstadisticasController.getClientes(req, res, next);
});

/**
 * GET /api/v1/estadisticas/operacionales
 * Obtener estadísticas operacionales
 */
router.get('/operacionales', (req, res, next) => {
  console.log('🔧 Ejecutando getOperacionales');
  EstadisticasController.getOperacionales(req, res, next);
});

/**
 * GET /api/v1/estadisticas/top-clientes
 * Obtener top clientes por facturación
 * Query params: limit (default: 10), periodo (semana|mes|trimestre|año)
 */
router.get('/top-clientes', (req, res, next) => {
  console.log('🏆 Ejecutando getTopClientes');
  EstadisticasController.getTopClientes(req, res, next);
});

console.log('✅ Rutas de estadísticas configuradas correctamente');

module.exports = router;