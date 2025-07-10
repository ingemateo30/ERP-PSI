// =============================================
// BACKEND: backend/routes/clientes.js - VERSIÓN CORREGIDA
// =============================================

const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ClienteCompletoService = require('../services/ClienteCompletoService');

/**
 * @route GET /api/v1/clientes
 * @desc Obtener lista de clientes con filtros mejorados
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      estado = '',
      identificacion = '',
      nombre = '',
      telefono = '',
      ciudad_id = '',
      sector_id = '',
      estrato = '',
      plan_id = '',
      barrio = '',
      fecha_desde = '',
      fecha_hasta = '',
      estado_servicio = '',
      tipo_servicio = '',
      precio_min = '',
      precio_max = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir condiciones WHERE dinámicamente
    const condiciones = ['c.activo = 1'];
    const valores = [];

    if (search) {
      condiciones.push('(c.nombre LIKE ? OR c.identificacion LIKE ? OR c.telefono LIKE ?)');
      valores.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (estado) {
      condiciones.push('c.estado = ?');
      valores.push(estado);
    }

    if (identificacion) {
      condiciones.push('c.identificacion LIKE ?');
      valores.push(`%${identificacion}%`);
    }

    if (nombre) {
      condiciones.push('c.nombre LIKE ?');
      valores.push(`%${nombre}%`);
    }

    if (telefono) {
      condiciones.push('(c.telefono LIKE ? OR c.telefono_fijo LIKE ?)');
      valores.push(`%${telefono}%`, `%${telefono}%`);
    }

    if (ciudad_id) {
      condiciones.push('c.ciudad_id = ?');
      valores.push(ciudad_id);
    }

    if (sector_id) {
      condiciones.push('c.sector_id = ?');
      valores.push(sector_id);
    }

    if (estrato) {
      condiciones.push('c.estrato = ?');
      valores.push(estrato);
    }

    if (barrio) {
      condiciones.push('c.barrio LIKE ?');
      valores.push(`%${barrio}%`);
    }

    if (fecha_desde) {
      condiciones.push('DATE(c.fecha_registro) >= ?');
      valores.push(fecha_desde);
    }

    if (fecha_hasta) {
      condiciones.push('DATE(c.fecha_registro) <= ?');
      valores.push(fecha_hasta);
    }

    // Filtros relacionados con servicios
    if (plan_id || estado_servicio || tipo_servicio || precio_min || precio_max) {
      if (plan_id) {
        condiciones.push('sc.plan_id = ?');
        valores.push(plan_id);
      }

      if (estado_servicio) {
        condiciones.push('sc.estado = ?');
        valores.push(estado_servicio);
      }

      if (tipo_servicio) {
        condiciones.push('ps.tipo = ?');
        valores.push(tipo_servicio);
      }

      if (precio_min) {
        condiciones.push('COALESCE(sc.precio_personalizado, ps.precio) >= ?');
        valores.push(parseFloat(precio_min));
      }

      if (precio_max) {
        condiciones.push('COALESCE(sc.precio_personalizado, ps.precio) <= ?');
        valores.push(parseFloat(precio_max));
      }
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    // Query principal con LEFT JOINs para incluir info de servicios
    const query = `
      SELECT 
        c.*,
        s.nombre as sector_nombre,
        s.codigo as sector_codigo,
        ci.nombre as ciudad_nombre,
        sc.id as servicio_id,
        sc.estado as estado_servicio,
        sc.fecha_activacion,
        sc.precio_personalizado,
        ps.nombre as plan_nombre,
        ps.precio as plan_precio,
        ps.tipo as tipo_servicio,
        COALESCE(sc.precio_personalizado, ps.precio) as precio_actual
      FROM clientes c
      LEFT JOIN sectores s ON c.sector_id = s.id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      ${whereClause}
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ? OFFSET ?
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM clientes c
      LEFT JOIN sectores s ON c.sector_id = s.id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      ${whereClause}
    `;

    // Ejecutar consultas
    const [clientes] = await Database.query(query, [...valores, parseInt(limit), parseInt(offset)]);
    const [totalResult] = await Database.query(countQuery, valores);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        clientes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/clientes/:id
 * @desc Actualizar cliente existente (CORREGIDO)
 * @access Administrador, Supervisor
 */
router.put('/:id', 
  authenticateToken, 
  requireRole('administrador', 'supervisor'), 
  async (req, res) => {
    const conexion = await Database.conexion();
    
    try {
      const { id } = req.params;
      const datosCliente = req.body;

      console.log('📝 Actualizando cliente ID:', id, 'con datos:', datosCliente);

      // Verificar que el cliente existe
      const [clienteExistente] = await conexion.execute(
        'SELECT id, identificacion, nombre FROM clientes WHERE id = ? AND activo = 1', 
        [id]
      );

      if (clienteExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      console.log('✅ Cliente encontrado:', clienteExistente[0]);

      // Preparar campos para actualizar (solo campos permitidos)
      const camposPermitidos = [
        'nombre', 'direccion', 'telefono', 'telefono_fijo', 'correo',
        'barrio', 'estrato', 'sector_id', 'ciudad_id', 'observaciones'
      ];

      const campos = [];
      const valores = [];

      camposPermitidos.forEach(campo => {
        if (datosCliente[campo] !== undefined && datosCliente[campo] !== null) {
          campos.push(`${campo} = ?`);
          valores.push(datosCliente[campo]);
        }
      });

      if (campos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos válidos para actualizar'
        });
      }

      // Ejecutar actualización
      valores.push(id);
      const updateQuery = `
        UPDATE clientes 
        SET ${campos.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      console.log('🔄 Ejecutando query:', updateQuery, 'con valores:', valores);

      await conexion.execute(updateQuery, valores);

      // Obtener cliente actualizado con información completa
      const [clienteActualizado] = await conexion.execute(`
        SELECT 
          c.*, 
          s.nombre as sector_nombre, 
          ci.nombre as ciudad_nombre,
          sc.estado as estado_servicio,
          ps.nombre as plan_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.id = ?
      `, [id]);

      console.log('✅ Cliente actualizado exitosamente');

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: clienteActualizado[0]
      });

    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar cliente',
        error: error.message
      });
    } finally {
      conexion.release();
    }
  }
);

/**
 * @route PUT /api/v1/clientes/:id/inactivar
 * @desc Inactivar cliente y moverlo a clientes_inactivos
 * @access Administrador, Supervisor
 */
router.put('/:id/inactivar', 
  authenticateToken, 
  requireRole('administrador', 'supervisor'), 
  async (req, res) => {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();
      
      const { id } = req.params;
      const { 
        motivo_inactivacion = 'voluntario', 
        observaciones_inactivacion = '' 
      } = req.body;
      const usuario_id = req.user.id;

      console.log('🚫 Inactivando cliente ID:', id, 'motivo:', motivo_inactivacion);

      // Obtener datos completos del cliente
      const [cliente] = await conexion.execute(`
        SELECT c.*, s.nombre as sector_nombre, s.codigo as sector_codigo
        FROM clientes c 
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE c.id = ? AND c.activo = 1
      `, [id]);

      if (cliente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const clienteData = cliente[0];
      console.log('📋 Datos del cliente a inactivar:', clienteData.nombre);

      // Mover a clientes_inactivos
      await conexion.execute(`
        INSERT INTO clientes_inactivos (
          identificacion, nombre, direccion, descripcion, fecha_inactivacion,
          barrio, sector_codigo, telefono, poste, estrato, 
          motivo_inactivacion, cliente_id
        ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)
      `, [
        clienteData.identificacion,
        clienteData.nombre,
        clienteData.direccion,
        observaciones_inactivacion || 'Cliente inactivado desde sistema',
        clienteData.barrio,
        clienteData.sector_codigo || clienteData.sector_nombre,
        clienteData.telefono,
        clienteData.poste,
        clienteData.estrato,
        motivo_inactivacion,
        clienteData.id
      ]);

      // Cancelar servicios activos
      await conexion.execute(`
        UPDATE servicios_cliente 
        SET estado = 'cancelado', fecha_suspension = CURDATE(), updated_at = NOW()
        WHERE cliente_id = ? AND estado = 'activo'
      `, [id]);

      // Marcar cliente como inactivo (no eliminarlo)
      await conexion.execute(`
        UPDATE clientes 
        SET estado = 'inactivo', 
            observaciones = CONCAT(
              COALESCE(observaciones, ''), 
              '\n[INACTIVADO] ', NOW(), ' por usuario ID ', ?, ' - ', ?
            ),
            updated_at = NOW()
        WHERE id = ?
      `, [usuario_id, observaciones_inactivacion || 'Sin observaciones', id]);

      await conexion.commit();

      console.log('✅ Cliente inactivado exitosamente');

      res.json({
        success: true,
        message: 'Cliente inactivado exitosamente',
        data: {
          cliente_id: id,
          motivo: motivo_inactivacion,
          fecha_inactivacion: new Date().toISOString().split('T')[0]
        }
      });

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error inactivando cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al inactivar cliente',
        error: error.message
      });
    } finally {
      conexion.release();
    }
  }
);

/**
 * @route GET /api/v1/clientes/inactivos
 * @desc Obtener lista de clientes inactivos
 * @access Administrador, Supervisor
 */
router.get('/inactivos', 
  authenticateToken, 
  requireRole('administrador', 'supervisor'), 
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = search ? 
        `WHERE ci.nombre LIKE ? OR ci.identificacion LIKE ?` : '';
      
      const params = search ? [`%${search}%`, `%${search}%`] : [];

      const [clientes] = await Database.query(`
        SELECT 
          ci.*,
          DATEDIFF(CURDATE(), ci.fecha_inactivacion) as dias_inactivo
        FROM clientes_inactivos ci
        ${whereClause}
        ORDER BY ci.fecha_inactivacion DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), parseInt(offset)]);

      const [total] = await Database.query(`
        SELECT COUNT(*) as total 
        FROM clientes_inactivos ci
        ${whereClause}
      `, params);

      res.json({
        success: true,
        data: {
          clientes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total[0].total,
            totalPages: Math.ceil(total[0].total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo clientes inactivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener clientes inactivos',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/v1/clientes/:id
 * @desc Obtener cliente por ID
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [cliente] = await Database.query(`
      SELECT 
        c.*,
        s.nombre as sector_nombre,
        ci.nombre as ciudad_nombre,
        sc.id as servicio_id,
        sc.estado as estado_servicio,
        ps.nombre as plan_nombre,
        ps.precio as plan_precio
      FROM clientes c
      LEFT JOIN sectores s ON c.sector_id = s.id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE c.id = ? AND c.activo = 1
    `, [id]);

    if (cliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente[0]
    });

  } catch (error) {
    console.error('❌ Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cliente',
      error: error.message
    });
  }
});

module.exports = router;