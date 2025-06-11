// backend/routes/config.js - RUTAS DE CONFIGURACIÓN SEGURAS

const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');

// Importaciones seguras de controladores
let CompanyConfigController, GeographyController, BanksController, ServicePlansController, conceptosController;

try {
  CompanyConfigController = require('../controllers/companyConfigController');
  console.log('✅ CompanyConfigController cargado');
} catch (error) {
  console.log('⚠️ CompanyConfigController no disponible');
}

try {
  GeographyController = require('../controllers/geographyController');
  console.log('✅ GeographyController cargado');
} catch (error) {
  console.log('⚠️ GeographyController no disponible');
}

try {
  BanksController = require('../controllers/banksController');
  console.log('✅ BanksController cargado');
} catch (error) {
  console.log('⚠️ BanksController no disponible');
}

try {
  ServicePlansController = require('../controllers/servicePlansController');
  console.log('✅ ServicePlansController cargado');
} catch (error) {
  console.log('⚠️ ServicePlansController no disponible');
}

try {
  conceptosController = require('../controllers/conceptosController');
  console.log('✅ conceptosController cargado');
} catch (error) {
  console.log('⚠️ conceptosController no disponible');
}

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS BÁSICAS DE CONFIGURACIÓN
// ==========================================

/**
 * @route GET /api/v1/config/overview
 * @desc Obtener resumen completo de configuración
 */
router.get('/overview', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📊 GET /config/overview');
    
    const connection = await Database.query('SELECT 1');
    
    // Configuración básica
    const [company] = await Database.query('SELECT * FROM configuracion_empresa LIMIT 1');
    
    // Conteos básicos
    const [counts] = await Database.query(`
      SELECT 
        (SELECT COUNT(*) FROM departamentos) as departamentos,
        (SELECT COUNT(*) FROM ciudades) as ciudades,
        (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
        (SELECT COUNT(*) FROM sectores) as sectores_total,
        (SELECT COUNT(*) FROM bancos WHERE activo = 1) as bancos_activos,
        (SELECT COUNT(*) FROM bancos) as bancos_total,
        (SELECT COUNT(*) FROM planes_servicio WHERE activo = 1) as planes_activos,
        (SELECT COUNT(*) FROM planes_servicio) as planes_total,
        (SELECT COUNT(*) FROM conceptos_facturacion WHERE activo = 1) as conceptos_activos,
        (SELECT COUNT(*) FROM sistema_usuarios WHERE activo = 1) as usuarios_activos,
        (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos,
        (SELECT COUNT(*) FROM clientes) as clientes_total
    `);

    // Verificar nivel de configuración
    const isConfigured = company && company.empresa_nombre && company.empresa_nit;
    const stats = counts;
    
    // Calcular nivel de completitud
    const configurationItems = {
      empresa: isConfigured,
      geografia: stats.departamentos > 0 && stats.ciudades > 0 && stats.sectores_activos > 0,
      bancos: stats.bancos_activos > 0,
      planes: stats.planes_activos > 0,
      conceptos: stats.conceptos_activos > 0,
      usuarios: stats.usuarios_activos > 1
    };

    const completedItems = Object.values(configurationItems).filter(Boolean).length;
    const totalItems = Object.keys(configurationItems).length;
    const completionPercentage = Math.round((completedItems / totalItems) * 100);
    
    res.json({
      success: true,
      message: 'Resumen de configuración obtenido exitosamente',
      data: {
        empresa_configurada: isConfigured,
        configuracion_empresa: company || null,
        contadores: stats,
        nivel_configuracion: configurationItems,
        porcentaje_completado: completionPercentage,
        configuracion_completa: completionPercentage === 100,
        resumen: {
          departamentos: stats.departamentos,
          ciudades: stats.ciudades,
          sectores_activos: stats.sectores_activos,
          bancos_activos: stats.bancos_activos,
          planes_activos: stats.planes_activos,
          usuarios_activos: stats.usuarios_activos,
          clientes_activos: stats.clientes_activos
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/health
 * @desc Verificar estado de configuración del sistema
 */
router.get('/health', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏥 GET /config/health');
    
    // Verificaciones de salud del sistema
    const healthChecks = {
      database: false,
      company_config: false,
      geography: false,
      banks: false,
      service_plans: false,
      users: false
    };

    let issues = [];

    try {
      // Test de base de datos
      await Database.query('SELECT 1');
      healthChecks.database = true;
    } catch (error) {
      issues.push('Problema de conexión a base de datos');
    }

    // Verificar configuración de empresa
    const [company] = await Database.query('SELECT * FROM configuracion_empresa LIMIT 1');
    if (company && company.empresa_nombre) {
      healthChecks.company_config = true;
    } else {
      issues.push('Configuración de empresa incompleta');
    }

    // Verificar geografía
    const [geoCounts] = await Database.query(`
      SELECT 
        (SELECT COUNT(*) FROM departamentos) as deps,
        (SELECT COUNT(*) FROM ciudades) as cities,
        (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectors
    `);
    
    if (geoCounts.deps > 0 && geoCounts.cities > 0 && geoCounts.sectors > 0) {
      healthChecks.geography = true;
    } else {
      issues.push('Configuración geográfica incompleta');
    }

    // Verificar bancos
    const [bankCount] = await Database.query('SELECT COUNT(*) as count FROM bancos WHERE activo = 1');
    if (bankCount.count > 0) {
      healthChecks.banks = true;
    } else {
      issues.push('No hay bancos configurados');
    }

    // Verificar planes de servicio
    const [planCount] = await Database.query('SELECT COUNT(*) as count FROM planes_servicio WHERE activo = 1');
    if (planCount.count > 0) {
      healthChecks.service_plans = true;
    } else {
      issues.push('No hay planes de servicio configurados');
    }

    // Verificar usuarios
    const [userCount] = await Database.query('SELECT COUNT(*) as count FROM sistema_usuarios WHERE activo = 1');
    if (userCount.count > 0) {
      healthChecks.users = true;
    } else {
      issues.push('No hay usuarios activos');
    }

    const healthyItems = Object.values(healthChecks).filter(Boolean).length;
    const totalItems = Object.keys(healthChecks).length;
    const healthPercentage = Math.round((healthyItems / totalItems) * 100);
    
    const overallHealth = healthPercentage === 100 ? 'excelente' : 
                         healthPercentage >= 80 ? 'bueno' : 
                         healthPercentage >= 60 ? 'regular' : 'crítico';

    res.json({
      success: true,
      message: 'Estado del sistema verificado',
      data: {
        estado_general: overallHealth,
        porcentaje_salud: healthPercentage,
        verificaciones: healthChecks,
        problemas: issues,
        sistema_operativo: healthPercentage >= 80,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando salud del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado del sistema',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/stats
 * @desc Obtener estadísticas básicas
 */
router.get('/stats', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📈 GET /config/stats');
    
    const [stats] = await Database.query(`
      SELECT 
        (SELECT COUNT(*) FROM departamentos) as departamentos,
        (SELECT COUNT(*) FROM ciudades) as ciudades,
        (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
        (SELECT COUNT(*) FROM bancos WHERE activo = 1) as bancos_activos,
        (SELECT COUNT(*) FROM planes_servicio WHERE activo = 1) as planes_activos,
        (SELECT COUNT(*) FROM conceptos_facturacion WHERE activo = 1) as conceptos_activos
    `);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// RUTAS GEOGRÁFICAS BÁSICAS
// ==========================================

/**
 * @route GET /api/v1/config/departments
 * @desc Obtener departamentos
 */
router.get('/departments', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏛️ GET /config/departments');
    
    const departments = await Database.query('SELECT * FROM departamentos ORDER BY nombre ASC');
    
    res.json({
      success: true,
      data: departments,
      count: departments.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo departamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/cities
 * @desc Obtener ciudades con filtros opcionales
 */
router.get('/cities', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏙️ GET /config/cities');
    
    const { departamento_id, includeStats } = req.query;
    
    let query = `
      SELECT 
        c.*,
        d.nombre as departamento_nombre
      FROM ciudades c
      LEFT JOIN departamentos d ON c.departamento_id = d.id
    `;
    
    const params = [];
    
    if (departamento_id) {
      query += ' WHERE c.departamento_id = ?';
      params.push(departamento_id);
    }
    
    query += ' ORDER BY c.nombre ASC';

    const cities = await Database.query(query, params);

    console.log(`✅ Ciudades encontradas: ${cities.length}`);

    res.json({
      success: true,
      data: cities,
      count: cities.length,
      filters: { departamento_id },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo ciudades:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/sectors
 * @desc Obtener sectores con filtros opcionales
 */
router.get('/sectors', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏘️ GET /config/sectors');
    
    const { ciudad_id, activo, includeStats } = req.query;
    
    let query = `
      SELECT 
        s.*,
        c.nombre as ciudad_nombre,
        d.nombre as departamento_nombre
      FROM sectores s
      LEFT JOIN ciudades c ON s.ciudad_id = c.id
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (ciudad_id) {
      query += ' AND s.ciudad_id = ?';
      params.push(ciudad_id);
    }
    
    if (activo !== undefined) {
      query += ' AND s.activo = ?';
      params.push(activo === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY s.codigo ASC';

    const sectors = await Database.query(query, params);

    console.log(`✅ Sectores encontrados: ${sectors.length}`);

    res.json({
      success: true,
      data: sectors,
      count: sectors.length,
      filters: { ciudad_id, activo },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo sectores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/banks
 * @desc Obtener bancos
 */
router.get('/banks', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏦 GET /config/banks');
    
    const { activo } = req.query;
    
    let query = 'SELECT * FROM bancos';
    const params = [];
    
    if (activo !== undefined) {
      query += ' WHERE activo = ?';
      params.push(activo === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY nombre ASC';

    const banks = await Database.query(query, params);

    res.json({
      success: true,
      data: banks,
      count: banks.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo bancos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/service-plans
 * @desc Obtener planes de servicio
 */
router.get('/service-plans', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📦 GET /config/service-plans');
    
    const { tipo, activo } = req.query;
    
    let query = 'SELECT * FROM planes_servicio WHERE 1=1';
    const params = [];
    
    if (tipo) {
      query += ' AND tipo = ?';
      params.push(tipo);
    }
    
    if (activo !== undefined) {
      query += ' AND activo = ?';
      params.push(activo === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY tipo ASC, precio ASC';

    const plans = await Database.query(query, params);

    res.json({
      success: true,
      data: plans,
      count: plans.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo planes de servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// RUTAS DE CONFIGURACIÓN DE EMPRESA
// ==========================================

/**
 * @route GET /api/v1/config/company
 * @desc Obtener configuración de empresa
 */
router.get('/company', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🏢 GET /config/company');
    
    const [config] = await Database.query('SELECT * FROM configuracion_empresa LIMIT 1');

    res.json({
      success: true,
      data: {
        config: config || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo configuración de empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route PUT /api/v1/config/company
 * @desc Actualizar configuración de empresa
 */
router.put('/company', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏢 PUT /config/company');
    
    const configData = req.body;
    
    // Verificar si existe configuración
    const [existingConfig] = await Database.query('SELECT id FROM configuracion_empresa LIMIT 1');

    if (existingConfig) {
      // Actualizar configuración existente
      const updateFields = [];
      const updateValues = [];

      Object.keys(configData).forEach(key => {
        if (configData[key] !== undefined && key !== 'id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(configData[key]);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateValues.push(existingConfig.id);
      const query = `UPDATE configuracion_empresa SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
      
      await Database.query(query, updateValues);
    } else {
      // Crear nueva configuración
      const fields = Object.keys(configData);
      const values = Object.values(configData);
      const placeholders = fields.map(() => '?').join(', ');

      const query = `INSERT INTO configuracion_empresa (${fields.join(', ')}) VALUES (${placeholders})`;
      await Database.query(query, values);
    }

    // Obtener configuración actualizada
    const [updatedConfig] = await Database.query('SELECT * FROM configuracion_empresa LIMIT 1');

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: {
        config: updatedConfig
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error actualizando configuración de empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==========================================
// RUTAS DELEGADAS A CONTROLADORES (SI EXISTEN)
// ==========================================

// Rutas para conceptos de facturación
if (conceptosController) {
  router.get('/conceptos', conceptosController.getAll || conceptosController.obtenerTodos);
  router.get('/conceptos/stats', conceptosController.getStats);
  router.get('/conceptos/tipos', conceptosController.getTipos);
  router.get('/conceptos/tipo/:tipo', conceptosController.getByType);
  router.get('/conceptos/:id', conceptosController.getById);
  router.post('/conceptos', conceptosController.create || conceptosController.crear);
  router.put('/conceptos/:id', conceptosController.update);
  router.post('/conceptos/:id/toggle', conceptosController.toggleStatus);
  router.delete('/conceptos/:id', conceptosController.delete);
  console.log('✅ Rutas de conceptos delegadas al controlador');
}

// Rutas delegadas a GeographyController si existe
if (GeographyController) {
  router.get('/geography/hierarchy', GeographyController.getGeographyHierarchy);
  router.get('/geography/search', GeographyController.searchLocations);
  router.get('/geography/stats', GeographyController.getGeographyStats);
  console.log('✅ Rutas avanzadas de geografía delegadas al controlador');
}

// ==========================================
// RUTA DE TEST
// ==========================================

/**
 * @route GET /api/v1/config/test
 * @desc Test básico de configuración
 */
router.get('/test', async (req, res) => {
  try {
    const testQuery = await Database.query('SELECT 1 as test');
    
    res.json({
      success: true,
      message: 'Rutas de configuración funcionando correctamente',
      database_test: testQuery[0].test === 1,
      timestamp: new Date().toISOString(),
      available_routes: [
        'GET /api/v1/config/overview',
        'GET /api/v1/config/health', 
        'GET /api/v1/config/stats',
        'GET /api/v1/config/departments',
        'GET /api/v1/config/cities',
        'GET /api/v1/config/sectors',
        'GET /api/v1/config/banks',
        'GET /api/v1/config/service-plans',
        'GET /api/v1/config/company',
        'PUT /api/v1/config/company'
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en test de configuración',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Rutas de configuración cargadas correctamente');

module.exports = router;