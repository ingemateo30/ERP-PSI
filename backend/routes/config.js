// backend/routes/config.js - RUTAS DE CONFIGURACIÓN SEGURAS

const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roleAuth');

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
// Todas las rutas de configuración requieren rol administrador
router.use(verificarRol('administrador'));

// ==========================================
// RUTAS BÁSICAS DE CONFIGURACIÓN
// ==========================================
// backend/routes/config.js - AGREGAR ESTAS RUTAS AL FINAL DEL ARCHIVO

// ==========================================
// RUTAS DE CONCEPTOS DENTRO DE CONFIG
// ==========================================

/**
 * @route GET /api/v1/config/conceptos
 * @desc Obtener conceptos de facturación
 */
router.get('/conceptos', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📋 GET /config/conceptos - Redirigiendo a conceptos');

    // Importar el controlador de conceptos
    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    // Llamar al método del controlador
    await conceptosController.getAll(req, res);
  } catch (error) {
    console.error('❌ Error en GET /config/conceptos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/config/conceptos/stats
 * @desc Obtener estadísticas de conceptos
 */
router.get('/conceptos/stats', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📊 GET /config/conceptos/stats');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.getStats(req, res);
  } catch (error) {
    console.error('❌ Error en GET /config/conceptos/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/config/conceptos/tipos
 * @desc Obtener tipos de conceptos
 */
router.get('/conceptos/tipos', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('📋 GET /config/conceptos/tipos');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.getTipos(req, res);
  } catch (error) {
    console.error('❌ Error en GET /config/conceptos/tipos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/config/conceptos/:id
 * @desc Obtener concepto por ID
 */
router.get('/conceptos/:id', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 GET /config/conceptos/:id con ID:', id);

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.getById(req, res);
  } catch (error) {
    console.error('❌ Error en GET /config/conceptos/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/config/conceptos
 * @desc Crear nuevo concepto
 */
router.post('/conceptos', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('➕ POST /config/conceptos');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.create(req, res);
  } catch (error) {
    console.error('❌ Error en POST /config/conceptos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/config/conceptos/:id
 * @desc Actualizar concepto
 */
router.put('/conceptos/:id', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('✏️ PUT /config/conceptos/:id');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.update(req, res);
  } catch (error) {
    console.error('❌ Error en PUT /config/conceptos/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/config/conceptos/:id/toggle
 * @desc Cambiar estado de concepto
 */
router.post('/conceptos/:id/toggle', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🔄 POST /config/conceptos/:id/toggle');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.toggleStatus(req, res);
  } catch (error) {
    console.error('❌ Error en POST /config/conceptos/:id/toggle:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/config/conceptos/:id
 * @desc Eliminar concepto
 */
router.delete('/conceptos/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🗑️ DELETE /config/conceptos/:id');

    let conceptosController;
    try {
      conceptosController = require('../controllers/conceptosController');
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Controller de conceptos no disponible',
        error: error.message
      });
    }

    await conceptosController.delete(req, res);
  } catch (error) {
    console.error('❌ Error en DELETE /config/conceptos/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// AGREGAR AL FINAL DEL ARCHIVO backend/routes/config.js, ANTES DEL module.exports
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
 * @route POST /api/v1/config/departments
 * @desc Crear departamento
 */
router.post('/departments', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏛️ POST /config/departments');

    const { codigo, nombre } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Código y nombre son requeridos'
      });
    }

    // Verificar si ya existe
    const existing = await Database.query(
      'SELECT id FROM departamentos WHERE codigo = ? OR nombre = ?',
      [codigo, nombre]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un departamento con ese código o nombre'
      });
    }

    // Crear departamento
    const result = await Database.query(
      'INSERT INTO departamentos (codigo, nombre) VALUES (?, ?)',
      [codigo.trim(), nombre.trim()]
    );

    // Obtener el departamento creado
    const [created] = await Database.query(
      'SELECT * FROM departamentos WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: created,
      message: 'Departamento creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/config/departments/:id
 * @desc Actualizar departamento
 */
router.put('/departments/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏛️ PUT /config/departments/:id');

    const { id } = req.params;
    const { codigo, nombre } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Código y nombre son requeridos'
      });
    }

    // Verificar si existe
    const existing = await Database.query(
      'SELECT id FROM departamentos WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    // Verificar duplicados
    const duplicates = await Database.query(
      'SELECT id FROM departamentos WHERE (codigo = ? OR nombre = ?) AND id != ?',
      [codigo, nombre, id]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe otro departamento con ese código o nombre'
      });
    }

    // Actualizar
    await Database.query(
      'UPDATE departamentos SET codigo = ?, nombre = ? WHERE id = ?',
      [codigo.trim(), nombre.trim(), id]
    );

    // Obtener el departamento actualizado
    const [updated] = await Database.query(
      'SELECT * FROM departamentos WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updated,
      message: 'Departamento actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/config/departments/:id
 * @desc Eliminar departamento
 */
router.delete('/departments/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏛️ DELETE /config/departments/:id');

    const { id } = req.params;

    // Verificar si tiene ciudades asociadas
    const [cities] = await Database.query(
      'SELECT COUNT(*) as count FROM ciudades WHERE departamento_id = ?',
      [id]
    );

    if (cities.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar un departamento que tiene ciudades asociadas'
      });
    }

    // Eliminar
    const result = await Database.query(
      'DELETE FROM departamentos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Departamento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Departamento eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando departamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
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
 * @route POST /api/v1/config/cities
 * @desc Crear ciudad
 */
router.post('/cities', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏙️ POST /config/cities');

    const { departamento_id, codigo, nombre } = req.body;

    if (!departamento_id || !codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Departamento, código y nombre son requeridos'
      });
    }

    // Verificar si el departamento existe
    const dept = await Database.query(
      'SELECT id FROM departamentos WHERE id = ?',
      [departamento_id]
    );

    if (dept.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El departamento especificado no existe'
      });
    }

    // Verificar duplicados
    const existing = await Database.query(
      'SELECT id FROM ciudades WHERE codigo = ? OR nombre = ?',
      [codigo, nombre]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una ciudad con ese código o nombre'
      });
    }

    // Crear ciudad
    const result = await Database.query(
      'INSERT INTO ciudades (departamento_id, codigo, nombre) VALUES (?, ?, ?)',
      [departamento_id, codigo.trim(), nombre.trim()]
    );

    // Obtener la ciudad creada con información del departamento
    const [created] = await Database.query(
      `SELECT c.*, d.nombre as departamento_nombre 
       FROM ciudades c 
       LEFT JOIN departamentos d ON c.departamento_id = d.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: created,
      message: 'Ciudad creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando ciudad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/config/cities/:id
 * @desc Actualizar ciudad
 */
router.put('/cities/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏙️ PUT /config/cities/:id');

    const { id } = req.params;
    const { departamento_id, codigo, nombre } = req.body;

    if (!departamento_id || !codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Departamento, código y nombre son requeridos'
      });
    }

    // Verificar si la ciudad existe
    const existing = await Database.query(
      'SELECT id FROM ciudades WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    // Verificar si el departamento existe
    const dept = await Database.query(
      'SELECT id FROM departamentos WHERE id = ?',
      [departamento_id]
    );

    if (dept.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El departamento especificado no existe'
      });
    }

    // Verificar duplicados
    const duplicates = await Database.query(
      'SELECT id FROM ciudades WHERE (codigo = ? OR nombre = ?) AND id != ?',
      [codigo, nombre, id]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe otra ciudad con ese código o nombre'
      });
    }

    // Actualizar
    await Database.query(
      'UPDATE ciudades SET departamento_id = ?, codigo = ?, nombre = ? WHERE id = ?',
      [departamento_id, codigo.trim(), nombre.trim(), id]
    );

    // Obtener la ciudad actualizada
    const [updated] = await Database.query(
      `SELECT c.*, d.nombre as departamento_nombre 
       FROM ciudades c 
       LEFT JOIN departamentos d ON c.departamento_id = d.id 
       WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updated,
      message: 'Ciudad actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando ciudad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/config/cities/:id
 * @desc Eliminar ciudad
 */
router.delete('/cities/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏙️ DELETE /config/cities/:id');

    const { id } = req.params;

    // Verificar si tiene sectores asociados
    const [sectors] = await Database.query(
      'SELECT COUNT(*) as count FROM sectores WHERE ciudad_id = ?',
      [id]
    );

    if (sectors.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar una ciudad que tiene sectores asociados'
      });
    }

    // Eliminar
    const result = await Database.query(
      'DELETE FROM ciudades WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Ciudad eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando ciudad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
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
 * @route POST /api/v1/config/sectors
 * @desc Crear sector
 */
router.post('/sectors', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏘️ POST /config/sectors');

    const { ciudad_id, codigo, nombre, activo = true } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Código y nombre son requeridos'
      });
    }

    // Verificar si la ciudad existe (si se especifica)
    if (ciudad_id) {
      const city = await Database.query(
        'SELECT id FROM ciudades WHERE id = ?',
        [ciudad_id]
      );

      if (city.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La ciudad especificada no existe'
        });
      }
    }

    // Verificar duplicados
    const existing = await Database.query(
      'SELECT id FROM sectores WHERE codigo = ?',
      [codigo]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un sector con ese código'
      });
    }

    // Crear sector
    const result = await Database.query(
      'INSERT INTO sectores (ciudad_id, codigo, nombre, activo) VALUES (?, ?, ?, ?)',
      [ciudad_id || null, codigo.trim(), nombre.trim(), activo ? 1 : 0]
    );

    // Obtener el sector creado con información relacionada
    const [created] = await Database.query(
      `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
       FROM sectores s
       LEFT JOIN ciudades c ON s.ciudad_id = c.id
       LEFT JOIN departamentos d ON c.departamento_id = d.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: created,
      message: 'Sector creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando sector:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/config/sectors/:id
 * @desc Actualizar sector
 */
router.put('/sectors/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏘️ PUT /config/sectors/:id');

    const { id } = req.params;
    const { ciudad_id, codigo, nombre, activo } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Código y nombre son requeridos'
      });
    }

    // Verificar si el sector existe
    const existing = await Database.query(
      'SELECT id FROM sectores WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sector no encontrado'
      });
    }

    // Verificar si la ciudad existe (si se especifica)
    if (ciudad_id) {
      const city = await Database.query(
        'SELECT id FROM ciudades WHERE id = ?',
        [ciudad_id]
      );

      if (city.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La ciudad especificada no existe'
        });
      }
    }

    // Verificar duplicados
    const duplicates = await Database.query(
      'SELECT id FROM sectores WHERE codigo = ? AND id != ?',
      [codigo, id]
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe otro sector con ese código'
      });
    }

    // Actualizar
    await Database.query(
      'UPDATE sectores SET ciudad_id = ?, codigo = ?, nombre = ?, activo = ? WHERE id = ?',
      [ciudad_id || null, codigo.trim(), nombre.trim(), activo ? 1 : 0, id]
    );

    // Obtener el sector actualizado
    const [updated] = await Database.query(
      `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
       FROM sectores s
       LEFT JOIN ciudades c ON s.ciudad_id = c.id
       LEFT JOIN departamentos d ON c.departamento_id = d.id
       WHERE s.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updated,
      message: 'Sector actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando sector:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/config/sectors/:id
 * @desc Eliminar sector
 */
router.delete('/sectors/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏘️ DELETE /config/sectors/:id');

    const { id } = req.params;

    // Verificar si tiene clientes asociados
    const [clients] = await Database.query(
      'SELECT COUNT(*) as count FROM clientes WHERE sector_id = ?',
      [id]
    );

    if (clients.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar un sector que tiene clientes asociados'
      });
    }

    // Eliminar
    const result = await Database.query(
      'DELETE FROM sectores WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sector no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Sector eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando sector:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/config/sectors/:id/toggle
 * @desc Cambiar estado activo/inactivo del sector
 */
router.post('/sectors/:id/toggle', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏘️ POST /config/sectors/:id/toggle');

    const { id } = req.params;

    // Obtener estado actual
    const [current] = await Database.query(
      'SELECT activo FROM sectores WHERE id = ?',
      [id]
    );

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Sector no encontrado'
      });
    }

    const newState = current.activo ? 0 : 1;

    // Actualizar estado
    await Database.query(
      'UPDATE sectores SET activo = ? WHERE id = ?',
      [newState, id]
    );

    // Obtener el sector actualizado
    const [updated] = await Database.query(
      `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
       FROM sectores s
       LEFT JOIN ciudades c ON s.ciudad_id = c.id
       LEFT JOIN departamentos d ON c.departamento_id = d.id
       WHERE s.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updated,
      message: `Sector ${newState ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error cambiando estado del sector:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});
router.get('/sectores-por-ciudad/:ciudadId', async (req, res) => {
  try {
    const { ciudadId } = req.params;
    const [sectores] = await pool.execute(
      'SELECT * FROM sectores WHERE ciudad_id = ? AND activo = 1 ORDER BY nombre',
      [ciudadId]
    );
    
    res.json({
      success: true,
      data: sectores
    });
  } catch (error) {
    console.error('Error obteniendo sectores:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo sectores'
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

// ==========================================

// ✅ PLANES DE SERVICIO MEJORADOS 
// PUT /api/v1/config/banks/:id - Actualizar banco
// PUT /api/v1/config/banks/:id - Actualizar banco
router.put('/banks/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏦 PUT /config/banks/:id');
    console.log('📊 Body recibido:', req.body);
    
    const { id } = req.params;
    const { nombre, codigo, activo } = req.body;
    
    // Validar campos obligatorios
    if (!nombre || codigo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos (nombre, codigo)'
      });
    }
    
    // Si activo no viene, obtener el valor actual
    let activoValue;
    if (activo === undefined) {
      const [bancoActual] = await Database.query(
        'SELECT activo FROM bancos WHERE id = ?',
        [id]
      );
      activoValue = bancoActual ? bancoActual.activo : 1;
    } else {
      activoValue = activo ? 1 : 0;
    }
    
    console.log('Actualizando con valores:', { nombre, codigo, activoValue, id });
    
    await Database.query(
      'UPDATE bancos SET nombre = ?, codigo = ?, activo = ? WHERE id = ?',
      [nombre, codigo || '', activoValue, id]
    );
    
    res.json({
      success: true,
      message: 'Banco actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando banco:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando banco',
      error: error.message
    });
  }
});
// POST /api/v1/config/banks - Crear banco
router.post('/banks', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🏦 POST /config/banks');
    console.log('📊 Body recibido:', req.body);
    
    const { nombre, codigo, activo = true } = req.body;
    
    if (!nombre || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos (nombre, codigo)'
      });
    }
    
    const result = await Database.query(
      'INSERT INTO bancos (nombre, codigo, activo) VALUES (?, ?, ?)',
      [nombre, codigo, activo ? 1 : 0]
    );
    
    const [newBank] = await Database.query(
      'SELECT * FROM bancos WHERE id = ?',
      [result.insertId]
    );
    
    res.json({
      success: true,
      message: 'Banco creado exitosamente',
      data: newBank
    });
  } catch (error) {
    console.error('❌ Error creando banco:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando banco',
      error: error.message
    });
  }
});
// DELETE /api/v1/config/banks/:id - Eliminar banco
router.delete('/banks/:id', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🗑️ DELETE /config/banks/:id');
    
    const { id } = req.params;
    
    // Verificar si el banco tiene pagos asociados
    const [pagos] = await Database.query(
      'SELECT COUNT(*) as total FROM pagos WHERE banco_id = ?',
      [id]
    );
    
    if (pagos && pagos.total > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar. El banco tiene ${pagos.total} pago(s) asociado(s)`
      });
    }
    
    await Database.query('DELETE FROM bancos WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Banco eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando banco:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando banco',
      error: error.message
    });
  }
});
// ==========================================
// ✅ PLANES DE SERVICIO
// ==========================================

// GET /api/v1/config/service-plans - Listar planes
router.get('/service-plans', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    console.log('🔄 Backend: GET /config/service-plans');
    const { activo, orden } = req.query;
    
    let query = 'SELECT * FROM planes_servicio WHERE 1 = 1';
    const params = [];
    
    if (activo !== undefined) {
      query += ' AND activo = ?';
      params.push(activo === 'true' || activo === '1' ? 1 : 0);
    }
    
    if (orden === 'orden_visualizacion') {
      query += ' ORDER BY orden_visualizacion ASC, nombre ASC';
    } else {
      query += ' ORDER BY codigo ASC';
    }

    const planes = await Database.query(query, params);

    res.json({
      success: true,
      data: planes,
      total: planes.length,
      message: 'Planes obtenidos exitosamente'
    });
  } catch (error) {
    console.error('❌ Backend: Error en /service-plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo planes de servicio',
      error: error.message
    });
  }
});
// POST /api/v1/config/banks/:id/toggle - Cambiar estado
router.post('/banks/:id/toggle', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🔄 POST /config/banks/:id/toggle');
    
    const { id } = req.params;
    
    await Database.query(
      'UPDATE bancos SET activo = NOT activo WHERE id = ?',
      [id]
    );
    
    const [banco] = await Database.query(
      'SELECT * FROM bancos WHERE id = ?',
      [id]
    );
    
    console.log('✅ Banco actualizado:', banco);
    
    res.json({
      success: true,
      message: 'Estado del banco actualizado',
      data: banco
    });
  } catch (error) {
    console.error('❌ Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error cambiando estado',
      error: error.message
    });
  }
});
router.get('/service-plans/stats', requireRole('supervisor', 'administrador'), async (req, res) => {
  try {
    const stats = await Database.query(`
      SELECT 
        COUNT(*) as total_planes,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as planes_activos,
        SUM(CASE WHEN tipo = 'internet' THEN 1 ELSE 0 END) as planes_internet,
        SUM(CASE WHEN tipo = 'television' THEN 1 ELSE 0 END) as planes_tv,
        SUM(CASE WHEN tipo = 'combo' THEN 1 ELSE 0 END) as planes_combo,
        SUM(CASE WHEN segmento = 'residencial' THEN 1 ELSE 0 END) as planes_residenciales,
        SUM(CASE WHEN segmento = 'empresarial' THEN 1 ELSE 0 END) as planes_empresariales,
        AVG(precio) as precio_promedio,
        MIN(precio) as precio_minimo,
        MAX(precio) as precio_maximo,
        SUM(CASE WHEN promocional = 1 AND fecha_fin_promocion >= CURDATE() THEN 1 ELSE 0 END) as promociones_vigentes
      FROM planes_servicio
    `);

    const planesPopulares = await Database.query(`
      SELECT 
        p.codigo,
        p.nombre,
        p.tipo,
        p.precio,
        COUNT(sc.id) as total_clientes
      FROM planes_servicio p
      LEFT JOIN servicios_cliente sc ON p.id = sc.plan_id AND sc.estado = 'activo'
      WHERE p.activo = 1
      GROUP BY p.id
      ORDER BY total_clientes DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        ...stats[0],
        planes_mas_populares: planesPopulares
      },
      message: 'Estadísticas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
});

router.get('/service-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const planes = await Database.query(`
      SELECT 
        p.*,
        CASE 
          WHEN p.precio_internet > 0 AND p.precio_television > 0 THEN 'Combo'
          WHEN p.precio_internet > 0 THEN 'Internet'
          WHEN p.precio_television > 0 THEN 'TV'
          ELSE 'Otro'
        END as tipo_detallado,
        
        ROUND(p.precio * 1.19, 2) as precio_con_iva,
        
        (SELECT COUNT(*) FROM servicios_cliente sc 
         WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos,
        (SELECT COUNT(*) FROM servicios_cliente sc 
         WHERE sc.plan_id = p.id AND sc.estado = 'suspendido') as clientes_suspendidos,
        (SELECT AVG(DATEDIFF(CURDATE(), sc.fecha_activacion)) 
         FROM servicios_cliente sc 
         WHERE sc.plan_id = p.id AND sc.estado = 'activo') as dias_promedio_cliente
         
      FROM planes_servicio p
      WHERE p.id = ? AND p.activo = 1
    `, [id]);

    if (planes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan de servicio no encontrado'
      });
    }

    const plan = {
      ...planes[0],
      conceptos_incluidos: planes[0].conceptos_incluidos ?
        JSON.parse(planes[0].conceptos_incluidos) : null
    };

    res.json({
      success: true,
      data: plan,
      message: 'Plan obtenido exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo plan de servicio',
      error: error.message
    });
  }
});

router.post('/service-plans', requireRole('administrador'), async (req, res) => {
  try {
    const {
      codigo,
      nombre,
      tipo,
      precio,
      precio_internet,
      precio_television,
      velocidad_subida,
      velocidad_bajada,
      canales_tv,
      descripcion,
      precio_instalacion = 42016,
      requiere_instalacion = true,
      segmento = 'residencial',
      tecnologia = 'Fibra Óptica',
      permanencia_meses = 0,
      descuento_combo = 0,
      orden_visualizacion = 0,
      promocional = false,
      fecha_inicio_promocion,
      fecha_fin_promocion,
      aplica_iva = true
    } = req.body;

    // Validaciones básicas
    if (!codigo || !nombre || !tipo || !precio) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: codigo, nombre, tipo, precio'
      });
    }

    // Verificar código único
    const codigoExistente = await Database.query(
      'SELECT id FROM planes_servicio WHERE codigo = ?',
      [codigo]
    );

    if (codigoExistente.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un plan con ese código'
      });
    }

    // Calcular precios según tipo
    let precioInternetFinal = precio_internet || 0;
    let precioTelevisionFinal = precio_television || 0;

    if (tipo === 'internet') {
      precioInternetFinal = precio;
      precioTelevisionFinal = 0;
    } else if (tipo === 'television') {
      precioInternetFinal = 0;
      precioTelevisionFinal = precio;
    } else if (tipo === 'combo') {
      if (!precio_internet && !precio_television) {
        precioInternetFinal = Math.round(precio * 0.65);
        precioTelevisionFinal = Math.round(precio * 0.35);
      }
    }

    // Crear conceptos incluidos
    const conceptosIncluidos = {
      tipo_principal: tipo,
      instalacion: precio_instalacion
    };

    if (precioInternetFinal > 0) {
      conceptosIncluidos.internet = precioInternetFinal;
    }
    if (precioTelevisionFinal > 0) {
      conceptosIncluidos.television = precioTelevisionFinal;
    }
    if (descuento_combo > 0) {
      conceptosIncluidos.descuento_combo = descuento_combo;
    }

    // Insertar plan
// Insertar plan
const resultado = await Database.query(`
  INSERT INTO planes_servicio (
    codigo, nombre, tipo, precio, precio_internet, precio_television,
    velocidad_subida, velocidad_bajada, canales_tv, descripcion,
    requiere_instalacion, segmento, tecnologia,
    permanencia_minima_meses, descuento_combo, 
    orden_visualizacion, promocional, fecha_inicio_promocion, 
    fecha_fin_promocion, aplica_iva, activo,
    costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
    aplica_permanencia
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
`, [
  codigo, nombre, tipo, precio, precioInternetFinal, precioTelevisionFinal,
  velocidad_subida, velocidad_bajada, canales_tv, descripcion,
  requiere_instalacion, segmento, tecnologia,
  permanencia_meses || 6, descuento_combo,
  orden_visualizacion, promocional, fecha_inicio_promocion,
  fecha_fin_promocion, aplica_iva,
  precio_instalacion || 50000, precio_instalacion || 150000,
  permanencia_meses > 0 ? 1 : 0
]);

    res.status(201).json({
      success: true,
      data: {
        id: resultado.insertId,
        codigo,
        nombre,
        tipo,
        precio,
        conceptos_incluidos: conceptosIncluidos
      },
      message: 'Plan de servicio creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando plan de servicio',
      error: error.message
    });
  }
});


router.put('/service-plans/:id', requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizacion = req.body;

    console.log('🔧 Actualizando plan ID:', id);
    console.log('📋 Datos recibidos:', datosActualizacion);

    // Verificar que el plan existe
    const [planExistente] = await Database.query(
      'SELECT * FROM planes_servicio WHERE id = ?',
      [id]
    );

    if (!planExistente) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    console.log('📋 Plan existente encontrado');

    // Verificar qué campos existen en la tabla de forma más segura
    let camposExistentes = [];
    try {
      const tableInfo = await Database.query("DESCRIBE planes_servicio");
      console.log('📋 TableInfo raw:', tableInfo);
      console.log('📋 TableInfo type:', typeof tableInfo);
      console.log('📋 TableInfo isArray:', Array.isArray(tableInfo));

      if (Array.isArray(tableInfo)) {
        camposExistentes = tableInfo.map(field => field.Field);
      } else {
        // Si no es array, usar los campos conocidos de la estructura SQL
        camposExistentes = [
          'id', 'codigo', 'nombre', 'tipo', 'precio', 'velocidad_subida', 'velocidad_bajada',
          'canales_tv', 'descripcion', 'aplica_iva', 'activo', 'created_at', 'updated_at',
          'precio_internet', 'precio_television', 'precio_instalacion', 'requiere_instalacion',
          'segmento', 'tecnologia', 'permanencia_meses', 'descuento_combo', 'conceptos_incluidos',
          'orden_visualizacion', 'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion'
        ];
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo estructura de tabla, usando campos conocidos');
      // Usar campos conocidos como fallback
      camposExistentes = [
        'id', 'codigo', 'nombre', 'tipo', 'precio', 'velocidad_subida', 'velocidad_bajada',
        'canales_tv', 'descripcion', 'aplica_iva', 'activo', 'created_at', 'updated_at',
        'precio_internet', 'precio_television', 'precio_instalacion', 'requiere_instalacion',
        'segmento', 'tecnologia', 'permanencia_meses', 'descuento_combo', 'conceptos_incluidos',
        'orden_visualizacion', 'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion'
      ];
    }

    console.log('📋 Campos existentes detectados:', camposExistentes);

    // Campos que se pueden actualizar (solo los que existen en la tabla)
    const camposPermitidos = [
      'nombre', 'precio', 'precio_internet', 'precio_television',
      'velocidad_subida', 'velocidad_bajada', 'canales_tv', 'descripcion',
      'precio_instalacion', 'requiere_instalacion', 'segmento', 'tecnologia',
      'permanencia_meses', 'descuento_combo', 'orden_visualizacion',
      'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion', 'aplica_iva'
    ].filter(campo => camposExistentes.includes(campo));

    console.log('📋 Campos permitidos:', camposPermitidos);

    const setClauses = [];
    const valores = [];

    // Agregar campos básicos
    camposPermitidos.forEach(campo => {
      if (datosActualizacion.hasOwnProperty(campo)) {
        setClauses.push(`${campo} = ?`);
        valores.push(datosActualizacion[campo]);
        console.log(`✅ Agregando campo: ${campo} = ${datosActualizacion[campo]}`);
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos válidos para actualizar'
      });
    }

    // Actualizar conceptos incluidos si existe el campo y hay cambios relevantes
    if (camposExistentes.includes('conceptos_incluidos') &&
      (datosActualizacion.precio || datosActualizacion.precio_internet ||
        datosActualizacion.precio_television || datosActualizacion.descuento_combo !== undefined)) {

      let conceptosActualizados = {};

      // Intentar parsear los conceptos existentes
      try {
        conceptosActualizados = planExistente.conceptos_incluidos ?
          JSON.parse(planExistente.conceptos_incluidos) : {};
      } catch (e) {
        console.warn('⚠️ Error parseando conceptos existentes:', e);
        conceptosActualizados = {};
      }

      // Actualizar conceptos según los cambios
      if (datosActualizacion.precio_internet !== undefined) {
        conceptosActualizados.internet = datosActualizacion.precio_internet;
      }
      if (datosActualizacion.precio_television !== undefined) {
        conceptosActualizados.television = datosActualizacion.precio_television;
      }
      if (datosActualizacion.descuento_combo !== undefined) {
        conceptosActualizados.descuento_combo = datosActualizacion.descuento_combo;
      }

      setClauses.push('conceptos_incluidos = ?');
      valores.push(JSON.stringify(conceptosActualizados));
      console.log('✅ Actualizando conceptos incluidos:', conceptosActualizados);
    }

    // Agregar updated_at si existe el campo
    if (camposExistentes.includes('updated_at')) {
      setClauses.push('updated_at = NOW()');
    }

    // Agregar ID al final para el WHERE
    valores.push(id);

    const query = `UPDATE planes_servicio SET ${setClauses.join(', ')} WHERE id = ?`;

    console.log('📝 Query a ejecutar:', query);
    console.log('📝 Valores:', valores);

    await Database.query(query, valores);

    console.log('✅ Plan actualizado exitosamente');

    // Obtener el plan actualizado
    const [planActualizado] = await Database.query(
      'SELECT * FROM planes_servicio WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      data: planActualizado
    });

  } catch (error) {
    console.error('❌ Error actualizando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando plan de servicio',
      error: error.message
    });
  }
});


router.delete('/service-plans/:id', requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si tiene clientes activos
    const clientesActivos = await Database.query(`
      SELECT COUNT(*) as total 
      FROM servicios_cliente 
      WHERE plan_id = ? AND estado = 'activo'
    `, [id]);

    if (clientesActivos[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el plan porque tiene ${clientesActivos[0].total} clientes activos`
      });
    }

    // Soft delete
    await Database.query(`
      UPDATE planes_servicio 
      SET activo = 0, updated_at = NOW() 
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Plan eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando plan de servicio',
      error: error.message
    });
  }
});

router.patch('/service-plans/:id/toggle-status', requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    await Database.query(`
      UPDATE planes_servicio 
      SET activo = ?, updated_at = NOW() 
      WHERE id = ?
    `, [activo ? 1 : 0, id]);

    res.json({
      success: true,
      message: `Plan ${activo ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    console.error('❌ Error cambiando estado del plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error cambiando estado del plan',
      error: error.message
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
  if (configData[key] !== undefined && key !== 'id' && key !== 'updated_at') {
    updateFields.push(`${key} = ?`);
    // Convertir fechas ISO a formato MySQL
    if (key === 'fecha_actualizacion' && configData[key]) {
      const date = new Date(configData[key]);
      updateValues.push(date.toISOString().slice(0, 19).replace('T', ' '));
    } else {
      updateValues.push(configData[key]);
    }
  }
});
// Agregar updated_at al final
updateFields.push('updated_at = NOW()');

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      updateValues.push(existingConfig.id);
      const query = `UPDATE configuracion_empresa SET ${updateFields.join(', ')} WHERE id = ?`;
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

// Solo delegar si los controladores existen
if (GeographyController && typeof GeographyController.obtenerJerarquia === 'function') {
  router.get('/geography/hierarchy', GeographyController.obtenerJerarquia);
  console.log('✅ Ruta /geography/hierarchy delegada');
}

if (GeographyController && typeof GeographyController.buscarUbicaciones === 'function') {
  router.get('/geography/search', GeographyController.buscarUbicaciones);
  console.log('✅ Ruta /geography/search delegada');
}

if (GeographyController && typeof GeographyController.obtenerEstadisticasGeografia === 'function') {
  router.get('/geography/stats', GeographyController.obtenerEstadisticasGeografia);
  console.log('✅ Ruta /geography/stats delegada');
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

        // Departamentos
        'GET /api/v1/config/departments',
        'POST /api/v1/config/departments',
        'PUT /api/v1/config/departments/:id',
        'DELETE /api/v1/config/departments/:id',

        // Ciudades
        'GET /api/v1/config/cities',
        'POST /api/v1/config/cities',
        'PUT /api/v1/config/cities/:id',
        'DELETE /api/v1/config/cities/:id',

        // Sectores
        'GET /api/v1/config/sectors',
        'POST /api/v1/config/sectors',
        'PUT /api/v1/config/sectors/:id',
        'DELETE /api/v1/config/sectors/:id',
        'POST /api/v1/config/sectors/:id/toggle',

        // Bancos
        'GET /api/v1/config/banks',

        // Planes de servicio
        'GET /api/v1/config/service-plans',

        // Empresa
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