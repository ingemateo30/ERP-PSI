// backend/routes/estadisticas.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

console.log('🔧 Configurando rutas de estadísticas...');

// Importar controlador con manejo de errores
let EstadisticasController;
try {
  EstadisticasController = require('../controllers/estadisticasController');
  console.log('✅ EstadisticasController importado correctamente');
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
// ESTADÍSTICAS DE PAGOS
// ==========================================
router.get('/pagos', authenticateToken, requireRole(['administrador', 'supervisor']), async (req, res) => {
  try {
    console.log('📊 GET /estadisticas/pagos');
    
    const { fecha_inicio, fecha_fin, banco_id, metodo_pago } = req.query;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren fecha_inicio y fecha_fin'
      });
    }

    const db = require('../config/database');

    // Estadísticas generales
    let queryGeneral = `
      SELECT 
        COUNT(DISTINCT f.id) as total_pagos,
        COALESCE(SUM(f.total), 0) as monto_total,
        COALESCE(AVG(f.total), 0) as promedio_pago
      FROM facturas f
      WHERE f.estado = 'pagada'
        AND f.fecha_pago BETWEEN ? AND ?
        AND f.activo = 1
    `;
    
    const paramsGeneral = [fecha_inicio, fecha_fin];
    
    if (banco_id) {
      queryGeneral += ' AND f.banco_id = ?';
      paramsGeneral.push(banco_id);
    }
    
    if (metodo_pago) {
      queryGeneral += ' AND f.metodo_pago = ?';
      paramsGeneral.push(metodo_pago);
    }

    console.log('📊 Query:', queryGeneral);
    console.log('📊 Params:', paramsGeneral);

    const [statsGeneral] = await db.query(queryGeneral, paramsGeneral);
    console.log('📊 Stats resultado:', statsGeneral);

    // Desglose por método
    let queryMetodo = `
      SELECT 
        f.metodo_pago,
        COUNT(f.id) as cantidad,
        COALESCE(SUM(f.total), 0) as monto
      FROM facturas f
      WHERE f.estado = 'pagada'
        AND f.fecha_pago BETWEEN ? AND ?
        AND f.activo = 1
    `;
    
    const paramsMetodo = [fecha_inicio, fecha_fin];
    
    if (banco_id) {
      queryMetodo += ' AND f.banco_id = ?';
      paramsMetodo.push(banco_id);
    }
    
    queryMetodo += ' GROUP BY f.metodo_pago ORDER BY monto DESC';
    
    const [porMetodo] = await db.query(queryMetodo, paramsMetodo);
    console.log('📊 Por método:', porMetodo);

    // Construir respuesta
    const stats = (statsGeneral && statsGeneral[0]) ? statsGeneral[0] : { total_pagos: 0, monto_total: 0, promedio_pago: 0 };

    const por_metodo = {};
    if (Array.isArray(porMetodo)) {
      porMetodo.forEach(item => {
        if (item.metodo_pago) {
          por_metodo[item.metodo_pago] = {
            cantidad: parseInt(item.cantidad) || 0,
            monto: parseFloat(item.monto) || 0
          };
        }
      });
    }

    const respuesta = {
      success: true,
      data: {
        total_pagos: parseInt(stats.total_pagos) || 0,
        monto_total: parseFloat(stats.monto_total) || 0,
        promedio_pago: parseFloat(stats.promedio_pago) || 0,
        por_metodo: por_metodo
      }
    };

    console.log('📊 Respuesta:', JSON.stringify(respuesta, null, 2));
    res.json(respuesta);

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
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
console.log('   GET /api/v1/estadisticas/pagos');

module.exports = router;
