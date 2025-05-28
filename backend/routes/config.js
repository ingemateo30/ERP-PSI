// backend/routes/config.js

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Controladores
const CompanyConfigController = require('../controllers/companyConfigController');
const GeographyController = require('../controllers/geographyController');
const BanksController = require('../controllers/banksController');
const ServicePlansController = require('../controllers/servicePlansController');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');

// Función de validación simple
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
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
  codigo: Joi.string().max(5).required(),
  nombre: Joi.string().max(100).required()
});

const citySchema = Joi.object({
  departamento_id: Joi.number().integer().positive().required(),
  codigo: Joi.string().max(10).required(),
  nombre: Joi.string().max(100).required()
});

const sectorSchema = Joi.object({
  codigo: Joi.string().max(3).required(),
  nombre: Joi.string().max(100).required(),
  ciudad_id: Joi.number().integer().positive().optional()
});

const bankSchema = Joi.object({
  codigo: Joi.string().max(5).required(),
  nombre: Joi.string().max(100).required()
});

const servicePlanSchema = Joi.object({
  codigo: Joi.string().max(10).required(),
  nombre: Joi.string().max(255).required(),
  tipo: Joi.string().valid('internet', 'television', 'combo').required(),
  precio: Joi.number().min(0).required(),
  velocidad_subida: Joi.number().integer().min(0).optional().allow(null),
  velocidad_bajada: Joi.number().integer().min(0).optional().allow(null),
  canales_tv: Joi.number().integer().min(0).optional().allow(null),
  descripcion: Joi.string().optional().allow(''),
  aplica_iva: Joi.boolean().default(true)
});

// ==========================================
// CONFIGURACIÓN DE EMPRESA
// ==========================================

/**
 * @route GET /api/v1/config/company
 * @desc Obtener configuración de empresa
 * @access Private (Admin/Supervisor)
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
 * @access Private (Admin/Supervisor)
 */
router.get('/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  CompanyConfigController.getConfigStats
);

// ==========================================
// GESTIÓN GEOGRÁFICA
// ==========================================

// Departamentos
router.get('/departments',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getDepartments
);

router.post('/departments',
  authenticateToken,
  requireRole('administrador'),
  validate(departmentSchema),
  GeographyController.createDepartment
);

router.put('/departments/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(departmentSchema),
  GeographyController.updateDepartment
);

// Ciudades
router.get('/cities',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getCities
);

router.post('/cities',
  authenticateToken,
  requireRole('administrador'),
  validate(citySchema),
  GeographyController.createCity
);

// Sectores
router.get('/sectors',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  GeographyController.getSectors
);

router.post('/sectors',
  authenticateToken,
  requireRole('administrador'),
  validate(sectorSchema),
  GeographyController.createSector
);

router.post('/sectors/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  GeographyController.toggleSector
);

// ==========================================
// GESTIÓN DE BANCOS
// ==========================================

router.get('/banks',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBanks
);

router.get('/banks/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBankStats
);

router.get('/banks/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  BanksController.getBankById
);

router.post('/banks',
  authenticateToken,
  requireRole('administrador'),
  validate(bankSchema),
  BanksController.createBank
);

router.put('/banks/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(bankSchema),
  BanksController.updateBank
);

router.post('/banks/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  BanksController.toggleBank
);

router.delete('/banks/:id',
  authenticateToken,
  requireRole('administrador'),
  BanksController.deleteBank
);

// ==========================================
// PLANES DE SERVICIO
// ==========================================

router.get('/service-plans',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlans
);

router.get('/service-plans/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlanStats
);

router.get('/service-plans/by-type',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlansByType
);

router.get('/service-plans/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  ServicePlansController.getServicePlanById
);

router.post('/service-plans',
  authenticateToken,
  requireRole('administrador'),
  validate(servicePlanSchema),
  ServicePlansController.createServicePlan
);

router.put('/service-plans/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(servicePlanSchema),
  ServicePlansController.updateServicePlan
);

router.post('/service-plans/:id/toggle',
  authenticateToken,
  requireRole('administrador'),
  ServicePlansController.toggleServicePlan
);

router.delete('/service-plans/:id',
  authenticateToken,
  requireRole('administrador'),
  ServicePlansController.deleteServicePlan
);

// ==========================================
// RUTAS DE CONVENIENCIA
// ==========================================

/**
 * @route GET /api/v1/config/overview
 * @desc Obtener resumen completo de configuración
 * @access Private (Admin/Supervisor)
 */
router.get('/overview',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      // Esta ruta combina información de múltiples endpoints
      // para dar una vista general del estado de configuración
      
      const pool = require('../config/database');
      const connection = await pool.getConnection();
      
      // Configuración básica
      const [company] = await connection.execute(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );
      
      // Conteos básicos
      const [counts] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM departamentos) as departamentos,
          (SELECT COUNT(*) FROM ciudades) as ciudades,
          (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
          (SELECT COUNT(*) FROM bancos WHERE activo = 1) as bancos_activos,
          (SELECT COUNT(*) FROM planes_servicio WHERE activo = 1) as planes_activos,
          (SELECT COUNT(*) FROM conceptos_facturacion WHERE activo = 1) as conceptos_activos
      `);
      
      connection.release();
      
      const isConfigured = company.length > 0 && 
        company[0].empresa_nombre && 
        company[0].empresa_nit;
      
      res.json({
        success: true,
        message: 'Resumen de configuración obtenido',
        data: {
          empresa_configurada: isConfigured,
          configuracion_empresa: company[0] || null,
          contadores: counts[0],
          configuracion_completa: isConfigured && 
            counts[0].sectores_activos > 0 && 
            counts[0].bancos_activos > 0 && 
            counts[0].planes_activos > 0
        }
      });
      
    } catch (error) {
      console.error('Error en overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

module.exports = router;