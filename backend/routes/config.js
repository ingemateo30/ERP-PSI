// backend/routes/config.js - RUTAS DE CONFIGURACIÓN COMPLETAS

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Controladores
const CompanyConfigController = require('../controllers/companyConfigController');
const GeographyController = require('../controllers/geographyController');
const BanksController = require('../controllers/banksController');
const conceptosController = require('../controllers/conceptosController');
const ServicePlansController = require('../controllers/servicePlansController');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');

// Función de validación simple
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

// Esquemas de validación
const companyConfigSchema = Joi.object({
  licencia: Joi.string().max(100).required(),
  empresa_nombre: Joi.string().max(255).allow(''),
  empresa_nit: Joi.string().max(30).allow(''),
  empresa_direccion: Joi.string().max(255).allow(''),
  empresa_ciudad: Joi.string().max(100).allow(''),
  empresa_departamento: Joi.string().max(100).allow(''),
  empresa_telefono: Joi.string().max(30).allow(''),
  empresa_email: Joi.string().email().max(100).allow(''),
  resolucion_facturacion: Joi.string().max(100).allow(''),
  licencia_internet: Joi.string().max(100).allow(''),
  vigilado: Joi.string().max(255).allow(''),
  vigilado_internet: Joi.string().max(255).allow(''),
  comentario: Joi.string().allow(''),
  prefijo_factura: Joi.string().max(10).allow(''),
  codigo_gs1: Joi.string().max(20).allow(''),
  valor_reconexion: Joi.number().min(0).default(0),
  dias_mora_corte: Joi.number().integer().min(1).default(30),
  porcentaje_iva: Joi.number().min(0).max(100).default(19),
  porcentaje_interes: Joi.number().min(0).max(100).default(0)
});

const departmentSchema = Joi.object({
  codigo: Joi.string().max(5).required().uppercase(),
  nombre: Joi.string().max(100).required().trim()
});

const citySchema = Joi.object({
  departamento_id: Joi.number().integer().positive().required(),
  codigo: Joi.string().max(10).required(),
  nombre: Joi.string().max(100).required().trim()
});

const sectorSchema = Joi.object({
  codigo: Joi.string().max(3).required().uppercase(),
  nombre: Joi.string().max(100).required().trim(),
  ciudad_id: Joi.number().integer().positive().optional().allow(null)
});

const bankSchema = Joi.object({
  codigo: Joi.string().max(5).required(),
  nombre: Joi.string().max(100).required().trim()
});

const servicePlanSchema = Joi.object({
  codigo: Joi.string().max(10).required().uppercase(),
  nombre: Joi.string().max(255).required().trim(),
  tipo: Joi.string().valid('internet', 'television', 'combo').required(),
  precio: Joi.number().min(0).required(),
  velocidad_subida: Joi.number().integer().min(0).optional().allow(null),
  velocidad_bajada: Joi.number().integer().min(0).optional().allow(null),
  canales_tv: Joi.number().integer().min(0).optional().allow(null),
  descripcion: Joi.string().optional().allow(''),
  aplica_iva: Joi.boolean().default(true)
});

const consecutiveSchema = Joi.object({
  consecutivo_factura: Joi.number().integer().min(1).optional(),
  consecutivo_contrato: Joi.number().integer().min(1).optional(),
  consecutivo_recibo: Joi.number().integer().min(1).optional()
});

// ==========================================
// CONFIGURACIÓN DE EMPRESA
// ==========================================

/**
 * @route GET /api/v1/config/company
 * @desc Obtener configuración de empresa
 * @access Private (Supervisor+)
 */
router.get('/company',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  CompanyConfigController.getCompanyConfig
);

/**
 * @route PUT /api/v1/config/company
 * @desc Actualizar configuración de empresa
 * @access Private (Admin)
 */
router.put('/company',
  authenticateToken,
  requireRole('administrador'),
  validate(companyConfigSchema),
  CompanyConfigController.updateCompanyConfig
);

/**
 * @route GET /api/v1/config/stats
 * @desc Obtener estadísticas de configuración
 * @access Private (Supervisor+)
 */
router.get('/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  CompanyConfigController.getConfigStats
);

/**
 * @route GET /api/v1/config/consecutives
 * @desc Obtener próximos consecutivos
 * @access Private (Supervisor+)
 */
router.get('/consecutives',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  CompanyConfigController.getNextConsecutives
);

/**
 * @route PUT /api/v1/config/consecutives
 * @desc Actualizar consecutivos
 * @access Private (Admin)
 */
router.put('/consecutives',
  authenticateToken,
  requireRole('administrador'),
  validate(consecutiveSchema),
  CompanyConfigController.updateConsecutives
);

/**
 * @route POST /api/v1/config/consecutives/:type/increment
 * @desc Incrementar consecutivo específico
 * @access Private (Admin)
 */
router.post('/consecutives/:type/increment',
  authenticateToken,
  requireRole('administrador'),
  CompanyConfigController.incrementConsecutive
);

/**
 * @route POST /api/v1/config/reset
 * @desc Restablecer configuración a valores por defecto
 * @access Private (Admin only)
 */
router.post('/reset',
  authenticateToken,
  requireRole('administrador'),
  CompanyConfigController.resetConfig
);

// ==========================================
// GESTIÓN GEOGRÁFICA - DEPARTAMENTOS
// ==========================================

/**
 * @route GET /api/v1/config/departments
 * @desc Obtener todos los departamentos
 * @access Private (Supervisor+)
 */
router.get('/departments',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getDepartments
);

/**
 * @route GET /api/v1/config/departments/:id
 * @desc Obtener departamento por ID
 * @access Private (Supervisor+)
 */
router.get('/departments/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getDepartmentById
);

/**
 * @route POST /api/v1/config/departments
 * @desc Crear nuevo departamento
 * @access Private (Admin)
 */
router.post('/departments',
  authenticateToken,
  requireRole('administrador'),
  validate(departmentSchema),
  GeographyController.createDepartment
);

/**
 * @route PUT /api/v1/config/departments/:id
 * @desc Actualizar departamento
 * @access Private (Admin)
 */
router.put('/departments/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(departmentSchema),
  GeographyController.updateDepartment
);

/**
 * @route DELETE /api/v1/config/departments/:id
 * @desc Eliminar departamento
 * @access Private (Admin)
 */
router.delete('/departments/:id',
  authenticateToken,
  requireRole('administrador'),
  GeographyController.deleteDepartment
);

// ==========================================
// GESTIÓN GEOGRÁFICA - CIUDADES
// ==========================================

/**
 * @route GET /api/v1/config/cities
 * @desc Obtener ciudades con filtros
 * @access Private (Supervisor+)
 */
router.get('/cities',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getCities
);

/**
 * @route GET /api/v1/config/cities/:id
 * @desc Obtener ciudad por ID
 * @access Private (Supervisor+)
 */
router.get('/cities/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getCityById
);

/**
 * @route POST /api/v1/config/cities
 * @desc Crear nueva ciudad
 * @access Private (Admin)
 */
router.post('/cities',
  authenticateToken,
  requireRole('administrador'),
  validate(citySchema),
  GeographyController.createCity
);

/**
 * @route PUT /api/v1/config/cities/:id
 * @desc Actualizar ciudad
 * @access Private (Admin)
 */
router.put('/cities/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(citySchema),
  GeographyController.updateCity
);

/**
 * @route DELETE /api/v1/config/cities/:id
 * @desc Eliminar ciudad
 * @access Private (Admin)
 */
router.delete('/cities/:id',
  authenticateToken,
  requireRole('administrador'),
  GeographyController.deleteCity
);

// ==========================================
// GESTIÓN GEOGRÁFICA - SECTORES
// ==========================================

/**
 * @route GET /api/v1/config/sectors
 * @desc Obtener sectores con filtros
 * @access Private (Supervisor+)
 */
router.get('/sectors',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getSectors
);

/**
 * @route GET /api/v1/config/sectors/:id
 * @desc Obtener sector por ID
 * @access Private (Supervisor+)
 */
router.get('/sectors/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getSectorById
);

/**
 * @route POST /api/v1/config/sectors
 * @desc Crear nuevo sector
 * @access Private (Admin)
 */
router.post('/sectors',
  authenticateToken,
  requireRole('administrador'),
  validate(sectorSchema),
  GeographyController.createSector
);

/**
 * @route PUT /api/v1/config/sectors/:id
 * @desc Actualizar sector
 * @access Private (Admin)
 */
router.put('/sectors/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(sectorSchema),
  GeographyController.updateSector
);

/**
 * @route POST /api/v1/config/sectors/:id/toggle
 * @desc Activar/desactivar sector
 * @access Private (Admin)
 */
router.post('/sectors/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  GeographyController.toggleSector
);

/**
 * @route DELETE /api/v1/config/sectors/:id
 * @desc Eliminar sector
 * @access Private (Admin)
 */
router.delete('/sectors/:id',
  authenticateToken,
  requireRole('administrador'),
  GeographyController.deleteSector
);

// ==========================================
// GESTIÓN DE BANCOS
// ==========================================

/**
 * @route GET /api/v1/config/banks
 * @desc Obtener todos los bancos
 * @access Private (Supervisor+)
 */
router.get('/banks',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBanks
);

/**
 * @route GET /api/v1/config/banks/stats
 * @desc Obtener estadísticas de bancos
 * @access Private (Supervisor+)
 */
router.get('/banks/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBankStats
);

/**
 * @route GET /api/v1/config/banks/:id
 * @desc Obtener banco por ID
 * @access Private (Supervisor+)
 */
router.get('/banks/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBankById
);

/**
 * @route POST /api/v1/config/banks
 * @desc Crear nuevo banco
 * @access Private (Admin)
 */
router.post('/banks',
  authenticateToken,
  requireRole('administrador'),
  validate(bankSchema),
  BanksController.createBank
);

/**
 * @route PUT /api/v1/config/banks/:id
 * @desc Actualizar banco
 * @access Private (Admin)
 */
router.put('/banks/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(bankSchema),
  BanksController.updateBank
);

/**
 * @route POST /api/v1/config/banks/:id/toggle
 * @desc Activar/desactivar banco
 * @access Private (Admin)
 */
router.post('/banks/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  BanksController.toggleBank
);

/**
 * @route DELETE /api/v1/config/banks/:id
 * @desc Eliminar banco
 * @access Private (Admin)
 */
router.delete('/banks/:id',
  authenticateToken,
  requireRole('administrador'),
  BanksController.deleteBank
);

// ==========================================
// PLANES DE SERVICIO
// ==========================================

/**
 * @route GET /api/v1/config/service-plans
 * @desc Obtener todos los planes de servicio
 * @access Private (Supervisor+)
 */
router.get('/service-plans',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlans
);

/**
 * @route GET /api/v1/config/service-plans/stats
 * @desc Obtener estadísticas de planes
 * @access Private (Supervisor+)
 */
router.get('/service-plans/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlanStats
);

/**
 * @route GET /api/v1/config/service-plans/by-type
 * @desc Obtener planes agrupados por tipo
 * @access Private (Supervisor+)
 */
router.get('/service-plans/by-type',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlansByType
);

/**
 * @route GET /api/v1/config/service-plans/:id
 * @desc Obtener plan por ID
 * @access Private (Supervisor+)
 */
router.get('/service-plans/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlanById
);

/**
 * @route POST /api/v1/config/service-plans
 * @desc Crear nuevo plan de servicio
 * @access Private (Admin)
 */
router.post('/service-plans',
  authenticateToken,
  requireRole('administrador'),
  validate(servicePlanSchema),
  ServicePlansController.createServicePlan
);

/**
 * @route PUT /api/v1/config/service-plans/:id
 * @desc Actualizar plan de servicio
 * @access Private (Admin)
 */
router.put('/service-plans/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(servicePlanSchema),
  ServicePlansController.updateServicePlan
);

/**
 * @route POST /api/v1/config/service-plans/:id/toggle
 * @desc Activar/desactivar plan de servicio
 * @access Private (Admin)
 */
router.post('/service-plans/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  ServicePlansController.toggleServicePlan
);

/**
 * @route DELETE /api/v1/config/service-plans/:id
 * @desc Eliminar plan de servicio
 * @access Private (Admin)
 */
router.delete('/service-plans/:id',
  authenticateToken,
  requireRole('administrador'),
  ServicePlansController.deleteServicePlan
);

// ==========================================
// RUTAS DE UTILIDAD GEOGRÁFICA
// ==========================================

/**
 * @route GET /api/v1/config/geography/hierarchy
 * @desc Obtener jerarquía geográfica completa
 * @access Private (Supervisor+)
 */
router.get('/geography/hierarchy',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getGeographyHierarchy
);

/**
 * @route GET /api/v1/config/geography/search
 * @desc Buscar ubicaciones por término
 * @access Private (Supervisor+)
 */
router.get('/geography/search',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.searchLocations
);

/**
 * @route GET /api/v1/config/geography/stats
 * @desc Obtener estadísticas geográficas
 * @access Private (Supervisor+)
 */
router.get('/geography/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getGeographyStats
);

// ==========================================
// RUTAS DE CONVENIENCIA
// ==========================================

/**
 * @route GET /api/v1/config/overview
 * @desc Obtener resumen completo de configuración
 * @access Private (Supervisor+)
 */
router.get('/overview',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const pool = require('../config/database');
      const connection = await pool.getConnection();
      
      // Configuración básica
      const [company] = await connection.execute(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );
      
      // Conteos básicos con más detalle
      const [counts] = await connection.execute(`
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
      const isConfigured = company.length > 0 && 
        company[0].empresa_nombre && 
        company[0].empresa_nit;

      const stats = counts[0];
      
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

      connection.release();
      
      res.json({
        success: true,
        message: 'Resumen de configuración obtenido exitosamente',
        data: {
          empresa_configurada: isConfigured,
          configuracion_empresa: company[0] || null,
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
      console.error('Error en overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route GET /api/v1/config/health
 * @desc Verificar estado de configuración del sistema
 * @access Private (Supervisor+)
 */
router.get('/health',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const pool = require('../config/database');
      const connection = await pool.getConnection();
      
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
        await connection.ping();
        healthChecks.database = true;
      } catch (error) {
        issues.push('Problema de conexión a base de datos');
      }

      // Verificar configuración de empresa
      const [company] = await connection.execute('SELECT * FROM configuracion_empresa LIMIT 1');
      if (company.length > 0 && company[0].empresa_nombre) {
        healthChecks.company_config = true;
      } else {
        issues.push('Configuración de empresa incompleta');
      }

      // Verificar geografía
      const [geoCounts] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM departamentos) as deps,
          (SELECT COUNT(*) FROM ciudades) as cities,
          (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectors
      `);
      
      if (geoCounts[0].deps > 0 && geoCounts[0].cities > 0 && geoCounts[0].sectors > 0) {
        healthChecks.geography = true;
      } else {
        issues.push('Configuración geográfica incompleta');
      }

      // Verificar bancos
      const [bankCount] = await connection.execute('SELECT COUNT(*) as count FROM bancos WHERE activo = 1');
      if (bankCount[0].count > 0) {
        healthChecks.banks = true;
      } else {
        issues.push('No hay bancos configurados');
      }

      // Verificar planes de servicio
      const [planCount] = await connection.execute('SELECT COUNT(*) as count FROM planes_servicio WHERE activo = 1');
      if (planCount[0].count > 0) {
        healthChecks.service_plans = true;
      } else {
        issues.push('No hay planes de servicio configurados');
      }

      // Verificar usuarios
      const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM sistema_usuarios WHERE activo = 1');
      if (userCount[0].count > 0) {
        healthChecks.users = true;
      } else {
        issues.push('No hay usuarios activos');
      }

      connection.release();

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
      console.error('Error verificando salud del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando estado del sistema',
        timestamp: new Date().toISOString()
      });
    }
  },
)
  
  
// Rutas para conceptos de facturación
router.get('/conceptos', conceptosController.getAll);
router.get('/conceptos/stats', conceptosController.getStats);
router.get('/conceptos/tipos', conceptosController.getTipos);
router.get('/conceptos/tipo/:tipo', conceptosController.getByType);
router.get('/conceptos/:id', conceptosController.getById);
router.post('/conceptos', conceptosController.create);
router.put('/conceptos/:id', conceptosController.update);
router.post('/conceptos/:id/toggle', conceptosController.toggleStatus);
router.delete('/conceptos/:id', conceptosController.delete);

module.exports = router;