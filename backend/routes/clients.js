// backend/routes/clients.js

const express = require('express');
const router = express.Router();
const Joi = require('joi');

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

// Esquema de validación para clientes
const clientSchema = Joi.object({
  identificacion: Joi.string().max(20).required(),
  tipo_documento: Joi.string().valid('cedula', 'nit', 'pasaporte', 'extranjeria').default('cedula'),
  nombre: Joi.string().max(255).required(),
  direccion: Joi.string().required(),
  sector_id: Joi.number().integer().positive().optional().allow(null),
  estrato: Joi.string().max(2).optional().allow(''),
  barrio: Joi.string().max(100).optional().allow(''),
  ciudad_id: Joi.number().integer().positive().optional().allow(null),
  telefono: Joi.string().max(30).optional().allow(''),
  telefono_2: Joi.string().max(30).optional().allow(''),
  correo: Joi.string().email().max(100).optional().allow(''),
  fecha_registro: Joi.date().optional(),
  fecha_hasta: Joi.date().optional(),
  estado: Joi.string().valid('activo', 'suspendido', 'cortado', 'retirado', 'inactivo').default('activo'),
  mac_address: Joi.string().max(17).optional().allow(''),
  ip_asignada: Joi.string().max(15).optional().allow(''),
  tap: Joi.string().max(20).optional().allow(''),
  poste: Joi.string().max(50).optional().allow(''),
  contrato: Joi.string().max(20).optional().allow(''),
  ruta: Joi.string().max(10).optional().allow(''),
  requiere_reconexion: Joi.boolean().default(false),
  codigo_usuario: Joi.string().max(20).optional().allow(''),
  observaciones: Joi.string().optional().allow('')
});

/**
 * @route GET /api/v1/clients
 * @desc Obtener lista de clientes con filtros y paginación
 * @access Private (Supervisor+)
 */
router.get('/',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        estado = '', 
        sector_id = '',
        ciudad_id = '',
        ruta = '',
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const offset = (page - 1) * limit;
      const pool = require('../config/database');
      const connection = await pool.getConnection();

      let whereConditions = [];
      let queryParams = [];

      // Filtro por búsqueda (nombre, identificación, teléfono)
      if (search) {
        whereConditions.push('(c.nombre LIKE ? OR c.identificacion LIKE ? OR c.telefono LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Filtro por estado
      if (estado) {
        whereConditions.push('c.estado = ?');
        queryParams.push(estado);
      }

      // Filtro por sector
      if (sector_id) {
        whereConditions.push('c.sector_id = ?');
        queryParams.push(sector_id);
      }

      // Filtro por ciudad
      if (ciudad_id) {
        whereConditions.push('c.ciudad_id = ?');
        queryParams.push(ciudad_id);
      }

      // Filtro por ruta
      if (ruta) {
        whereConditions.push('c.ruta = ?');
        queryParams.push(ruta);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Consultar clientes con información relacionada
      const [clients] = await connection.execute(`
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        ${whereClause}
        ORDER BY c.${sort} ${order}
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), parseInt(offset)]);

      // Contar total de clientes
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total 
        FROM clientes c 
        ${whereClause}
      `, queryParams);

      connection.release();

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: 'Clientes obtenidos exitosamente',
        data: clients,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/v1/clients/stats
 * @desc Obtener estadísticas de clientes
 * @access Private (Supervisor+)
 */
router.get('/stats',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const pool = require('../config/database');
      const connection = await pool.getConnection();

      // Estadísticas generales
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_clientes,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos,
          SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as clientes_suspendidos,
          SUM(CASE WHEN estado = 'cortado' THEN 1 ELSE 0 END) as clientes_cortados,
          SUM(CASE WHEN estado = 'retirado' THEN 1 ELSE 0 END) as clientes_retirados,
          SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as clientes_inactivos
        FROM clientes
      `);

      // Clientes por sector
      const [sectorStats] = await connection.execute(`
        SELECT 
          s.nombre as sector_nombre,
          COUNT(c.id) as total_clientes
        FROM sectores s
        LEFT JOIN clientes c ON s.id = c.sector_id AND c.estado = 'activo'
        GROUP BY s.id, s.nombre
        ORDER BY total_clientes DESC
        LIMIT 10
      `);

      // Clientes registrados últimos 30 días
      const [recentClients] = await connection.execute(`
        SELECT COUNT(*) as clientes_recientes
        FROM clientes 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      connection.release();

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          ...stats[0],
          clientes_recientes: recentClients[0].clientes_recientes,
          por_sector: sectorStats
        }
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route GET /api/v1/clients/:id
 * @desc Obtener cliente por ID
 * @access Private (Supervisor+)
 */
router.get('/:id',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pool = require('../config/database');
      const connection = await pool.getConnection();

      const [clients] = await connection.execute(`
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE c.id = ?
      `, [id]);

      connection.release();

      if (clients.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Cliente obtenido exitosamente',
        data: clients[0]
      });

    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

/**
 * @route POST /api/v1/clients
 * @desc Crear nuevo cliente
 * @access Private (Supervisor+)
 */
router.post('/',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  validate(clientSchema),
  async (req, res) => {
    try {
      const clientData = req.body;
      const createdBy = req.user.id;

      const pool = require('../config/database');
      const connection = await pool.getConnection();

      // Verificar si la identificación ya existe
      const [existing] = await connection.execute(
        'SELECT id FROM clientes WHERE identificacion = ?',
        [clientData.identificacion]
      );

      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe un cliente con esta identificación'
        });
      }

      // Insertar nuevo cliente
      const [result] = await connection.execute(`
        INSERT INTO clientes (
          identificacion, tipo_documento, nombre, direccion, sector_id, estrato,
          barrio, ciudad_id, telefono, telefono_2, correo, fecha_registro,
          fecha_hasta, estado, mac_address, ip_asignada, tap, poste, contrato,
          ruta, requiere_reconexion, codigo_usuario, observaciones, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        clientData.identificacion,
        clientData.tipo_documento || 'cedula',
        clientData.nombre,
        clientData.direccion,
        clientData.sector_id || null,
        clientData.estrato || null,
        clientData.barrio || null,
        clientData.ciudad_id || null,
        clientData.telefono || null,
        clientData.telefono_2 || null,
        clientData.correo || null,
        clientData.fecha_registro || new Date(),
        clientData.fecha_hasta || null,
        clientData.estado || 'activo',
        clientData.mac_address || null,
        clientData.ip_asignada || null,
        clientData.tap || null,
        clientData.poste || null,
        clientData.contrato || null,
        clientData.ruta || null,
        clientData.requiere_reconexion || false,
        clientData.codigo_usuario || null,
        clientData.observaciones || null,
        createdBy
      ]);

      // Obtener el cliente creado
      const [newClient] = await connection.execute(`
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE c.id = ?
      `, [result.insertId]);

      connection.release();

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: newClient[0]
      });

    } catch (error) {
      console.error('Error creando cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

module.exports = router;