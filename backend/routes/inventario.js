// backend/routes/inventario.js

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const multer = require('multer');

const InventoryController = require('../controllers/inventarioController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Configurar multer para subida de Excel en memoria
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  }
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// VALIDACIONES
// ==========================================

const createEquipmentValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es requerido')
    .isLength({ min: 3, max: 50 })
    .withMessage('El código debe tener entre 3 y 50 caracteres')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('El código solo puede contener letras mayúsculas, números, guiones y guiones bajos'),
  
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es requerido')
    .isIn(['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro'])
    .withMessage('Tipo de equipo no válido')
];

// ==========================================
// RUTAS DE EQUIPOS
// ==========================================

router.get('/equipment',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAllEquipment
);

router.get('/equipment-grouped',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getGroupedEquipment
);

router.get('/equipment/:id',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentById
);

router.post('/equipment',
  requireRole(['administrador']),
  createEquipmentValidation,
  InventoryController.createEquipment
);

router.put('/equipment/:id',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.updateEquipment
);

router.delete('/equipment/:id',
  requireRole(['administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.deleteEquipment
);

// ==========================================
// RUTAS DE ASIGNACIONES
// ==========================================

router.post('/equipment/:id/assign',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  InventoryController.assignToInstaller
);

router.post('/equipment/:id/return',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.returnEquipment
);

router.post('/equipment/:id/install',
  requireRole(['instalador', 'supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  body('instalador_id').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  body('ubicacion_cliente').notEmpty().withMessage('La ubicación del cliente es requerida'),
  InventoryController.markAsInstalled
);

// ==========================================
// RUTAS DE UTILIDADES
// ==========================================

router.get('/alertas-stock',
  requireRole(['supervisor', 'administrador']),
  async (req, res) => {
    try {
      const umbral = Math.max(1, parseInt(req.query.umbral) || 2);
      const { Database } = require('../models/Database');
      // Reusar la misma lógica de getGrouped pero con filtro HAVING
      const filas = await Database.query(`
        SELECT
          e.tipo,
          e.nombre,
          COUNT(*) AS cantidad_total,
          SUM(CASE WHEN e.estado = 'disponible' THEN 1 ELSE 0 END) AS disponibles,
          SUM(CASE WHEN e.estado = 'asignado' THEN 1 ELSE 0 END) AS asignados,
          SUM(CASE WHEN e.estado = 'instalado' THEN 1 ELSE 0 END) AS instalados,
          SUM(CASE WHEN e.estado = 'dañado' THEN 1 ELSE 0 END) AS daniados
        FROM inventario_equipos e
        GROUP BY e.tipo, e.nombre
        HAVING disponibles <= ?
        ORDER BY disponibles ASC, e.tipo ASC, e.nombre ASC
      `, [umbral]);

      const sinStock = filas.filter(f => f.disponibles === 0);
      const pocosStock = filas.filter(f => f.disponibles > 0);

      res.json({
        success: true,
        data: {
          alertas: filas,
          resumen: {
            sin_stock: sinStock.length,
            stock_bajo: pocosStock.length,
            total_alertas: filas.length
          },
          umbral
        }
      });
    } catch (err) {
      console.error('❌ Error en alertas-stock:', err);
      res.status(500).json({ success: false, message: 'Error obteniendo alertas de stock', error: err.message });
    }
  }
);

router.get('/stats',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getStats
);

// Movimientos recientes de inventario (historial global)
router.get('/movimientos',
  requireRole(['supervisor', 'administrador']),
  async (req, res) => {
    try {
      const limit  = Math.min(200, parseInt(req.query.limit)  || 50);
      const offset = Math.max(0,   parseInt(req.query.offset) || 0);
      const { Database } = require('../models/Database');
      const filas = await Database.query(`
        SELECT
          h.id,
          h.accion,
          h.notas        AS descripcion,
          h.fecha_accion AS fecha_movimiento,
          h.ubicacion,
          e.codigo   AS equipo_codigo,
          e.nombre   AS equipo_nombre,
          e.tipo     AS equipo_tipo,
          e.estado   AS equipo_estado_actual,
          u.nombre   AS usuario_nombre,
          u.rol      AS usuario_rol,
          ins.nombre AS instalador_nombre
        FROM inventario_historial h
        JOIN inventario_equipos   e   ON h.equipo_id      = e.id
        LEFT JOIN sistema_usuarios u   ON h.created_by     = u.id
        LEFT JOIN sistema_usuarios ins ON h.instalador_id  = ins.id
        ORDER BY h.fecha_accion DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const [{ total }] = await Database.query('SELECT COUNT(*) AS total FROM inventario_historial');
      res.json({ success: true, data: { movimientos: filas, total: Number(total), limit, offset } });
    } catch (err) {
      console.error('❌ Error en movimientos:', err);
      res.status(500).json({ success: false, message: 'Error obteniendo movimientos', error: err.message });
    }
  }
);

router.get('/available',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getAvailableEquipment
);

router.get('/installers',
  requireRole(['supervisor', 'administrador']),
  InventoryController.getActiveInstallers
);

router.get('/search',
  requireRole(['supervisor', 'administrador', 'instalador']),
  query('q').isLength({ min: 2 }).withMessage('El término de búsqueda debe tener al menos 2 caracteres'),
  InventoryController.searchEquipment
);

router.get('/types',
  requireRole(['supervisor', 'administrador', 'instalador']),
  InventoryController.getTypes
);

router.get('/check-code/:codigo',
  requireRole(['supervisor', 'administrador']),
  param('codigo').notEmpty().withMessage('Código requerido'),
  InventoryController.checkCodeAvailability
);

router.get('/equipment/:id/history',
  requireRole(['supervisor', 'administrador']),
  param('id').isInt({ min: 1 }).withMessage('ID de equipo no válido'),
  InventoryController.getEquipmentHistory
);

router.get('/installer/:instaladorId/equipment',
  requireRole(['supervisor', 'administrador', 'instalador']),
  param('instaladorId').isInt({ min: 1 }).withMessage('ID de instalador no válido'),
  (req, res, next) => {
if (req.user.rol === 'instalador' && req.user.id != req.params.instaladorId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver equipos de otros instaladores'
      });
    }
    next();
  },
  InventoryController.getInstallerEquipment
);


// ==========================================
// RUTAS DE IMPORTACIÓN MASIVA
// ==========================================

router.post('/bulk-upload',
  requireRole(['administrador']),
  uploadExcel.single('archivo'),
  InventoryController.bulkUpload
);

router.get('/bulk-upload/template',
  requireRole(['administrador', 'supervisor']),
  InventoryController.downloadTemplate
);

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rutas de inventario funcionando correctamente',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user?.id,
      rol: req.user?.rol,
      nombre: req.user?.nombre
    }
  });
});

router.use((error, req, res, next) => {
  console.error('Error en rutas de inventario:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development'  ? error.message : undefined
  });
});

module.exports = router;