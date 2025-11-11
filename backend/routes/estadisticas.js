// backend/routes/estadisticas.js
// RUTAS PARA ESTADÍSTICAS GENERALES - VERSIÓN FINAL FUNCIONAL

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

console.log('🔧 Configurando rutas de estadísticas...');

// Importar controlador con manejo de errores
let EstadisticasController;
try {
  EstadisticasController = require('../controllers/estadisticasController');
  console.log('✅ EstadisticasController importado correctamente');
  console.log('📋 Tipo de EstadisticasController:', typeof EstadisticasController);
  
  // Verificar que los métodos existen
  const metodosRequeridos = ['getDashboardGeneral', 'getFinancieras', 'getClientes', 'getOperacionales', 'getTopClientes'];
  const metodosFaltantes = metodosRequeridos.filter(metodo => typeof EstadisticasController[metodo] !== 'function');
  
  if (metodosFaltantes.length > 0) {
    throw new Error(`Métodos faltantes en EstadisticasController: ${metodosFaltantes.join(', ')}`);
  }
  
  console.log('✅ Todos los métodos del controlador están disponibles');
} catch (error) {
  console.error('❌ Error importando EstadisticasController:', error.message);
  console.error('⚠️  Usando endpoints de respaldo temporales');
  
  // Controlador de respaldo si el archivo no existe
  EstadisticasController = {
    getDashboardGeneral: (req, res) => {
      res.json({
        success: true,
        data: {
          periodo: { fecha_desde: new Date(), fecha_hasta: new Date() },
          financieras: { periodo: {}, cartera: {}, pagos: {} },
          clientes: { resumen: {}, distribucion: {} },
          operacionales: { instalaciones: {}, inventario: {} },
          tendencias: {}
        },
        message: 'Controlador de estadísticas no disponible - usando datos de prueba'
      });
    },
    getFinancieras: (req, res) => {
      res.json({ success: true, data: {}, message: 'Controlador no disponible' });
    },
    getClientes: (req, res) => {
      res.json({ success: true, data: {}, message: 'Controlador no disponible' });
    },
    getOperacionales: (req, res) => {
      res.json({ success: true, data: {}, message: 'Controlador no disponible' });
    },
    getTopClientes: (req, res) => {
      res.json({ success: true, data: { clientes: [] }, message: 'Controlador no disponible' });
    }
  };
}

// ==========================================
// MIDDLEWARE APLICADO A TODAS LAS RUTAS
// ==========================================

// Autenticación requerida para todas las rutas
router.use(authenticateToken);

// Solo administradores pueden acceder a estadísticas
router.use(requireRole(['administrador']));

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * GET /api/v1/estadisticas/dashboard
 * Obtener todas las estadísticas del dashboard principal
 */
router.get('/dashboard', (req, res, next) => {
  try {
    console.log('📊 [Estadísticas] Ejecutando getDashboardGeneral');
    console.log('👤 Usuario:', req.user.nombre, '- Rol:', req.user.rol);
    EstadisticasController.getDashboardGeneral(req, res, next);
  } catch (error) {
    console.error('❌ Error en ruta /dashboard:', error);
    next(error);
  }
});

/**
 * GET /api/v1/estadisticas/financieras
 * Obtener estadísticas financieras detalladas
 */
router.get('/financieras', (req, res, next) => {
  try {
    console.log('💰 [Estadísticas] Ejecutando getFinancieras');
    console.log('👤 Usuario:', req.user.nombre);
    EstadisticasController.getFinancieras(req, res, next);
  } catch (error) {
    console.error('❌ Error en ruta /financieras:', error);
    next(error);
  }
});

/**
 * GET /api/v1/estadisticas/clientes
 * Obtener estadísticas de clientes
 */
router.get('/clientes', (req, res, next) => {
  try {
    console.log('👥 [Estadísticas] Ejecutando getClientes');
    console.log('👤 Usuario:', req.user.nombre);
    EstadisticasController.getClientes(req, res, next);
  } catch (error) {
    console.error('❌ Error en ruta /clientes:', error);
    next(error);
  }
});

/**
 * GET /api/v1/estadisticas/operacionales
 * Obtener estadísticas operacionales
 */
router.get('/operacionales', (req, res, next) => {
  try {
    console.log('🔧 [Estadísticas] Ejecutando getOperacionales');
    console.log('👤 Usuario:', req.user.nombre);
    EstadisticasController.getOperacionales(req, res, next);
  } catch (error) {
    console.error('❌ Error en ruta /operacionales:', error);
    next(error);
  }
});

/**
 * GET /api/v1/estadisticas/top-clientes
 * Obtener top clientes por facturación
 * Query params:
 *   - limit: número de clientes (default: 10)
 *   - periodo: semana|mes|trimestre|año (default: mes)
 */
router.get('/top-clientes', (req, res, next) => {
  try {
    console.log('🏆 [Estadísticas] Ejecutando getTopClientes');
    console.log('👤 Usuario:', req.user.nombre);
    console.log('📋 Parámetros:', req.query);
    EstadisticasController.getTopClientes(req, res, next);
  } catch (error) {
    console.error('❌ Error en ruta /top-clientes:', error);
    next(error);
  }
});

// ==========================================
// MANEJO DE ERRORES ESPECÍFICO
// ==========================================

router.use((error, req, res, next) => {
  console.error('💥 [Estadísticas] Error en rutas:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error en el módulo de estadísticas',
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Rutas de estadísticas configuradas correctamente');
console.log('📍 Endpoints disponibles:');
console.log('   GET /api/v1/estadisticas/dashboard');
console.log('   GET /api/v1/estadisticas/financieras');
console.log('   GET /api/v1/estadisticas/clientes');
console.log('   GET /api/v1/estadisticas/operacionales');
console.log('   GET /api/v1/estadisticas/top-clientes');

module.exports = router;