// backend/controllers/clientsController.js - CONTROLADOR COMPLETO DE CLIENTES

const pool = require('../config/database');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');

class ClientsController {
  // Obtener lista de clientes con filtros y paginación
  static async getClients(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const {
        page = 1,
        limit = 10,
        estado,
        identificacion,
        nombre,
        sector_id,
        ciudad_id,
        telefono
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Construir WHERE clause
      let whereConditions = [];
      let queryParams = [];

      if (estado) {
        whereConditions.push('c.estado = ?');
        queryParams.push(estado);
      }

      if (identificacion) {
        whereConditions.push('c.identificacion LIKE ?');
        queryParams.push(`%${identificacion}%`);
      }

      if (nombre) {
        whereConditions.push('c.nombre LIKE ?');
        queryParams.push(`%${nombre}%`);
      }

      if (sector_id) {
        whereConditions.push('c.sector_id = ?');
        queryParams.push(sector_id);
      }

      if (ciudad_id) {
        whereConditions.push('c.ciudad_id = ?');
        queryParams.push(ciudad_id);
      }

      if (telefono) {
        whereConditions.push('c.telefono LIKE ?');
        queryParams.push(`%${telefono}%`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query principal con JOINs
      const mainQuery = `
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          CASE 
            WHEN cs.id IS NOT NULL THEN cs.estado_servicio
            ELSE 'sin_servicio'
          END as estado_servicio
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        LEFT JOIN contratos_servicio cs ON c.id = cs.cliente_id AND cs.activo = 1
        LEFT JOIN planes_servicio ps ON cs.plan_id = ps.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM clientes c
        ${whereClause}
      `;

      // Ejecutar queries
      const [clients] = await connection.execute(mainQuery, [...queryParams, parseInt(limit), offset]);
      const [countResult] = await connection.execute(countQuery, queryParams);

      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / parseInt(limit));

      const pagination = {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      };

      logger.info(`Clientes obtenidos: ${clients.length}, Total: ${totalItems}`);

      return ApiResponse.success(res, clients, 'Clientes obtenidos exitosamente', { pagination });

    } catch (error) {
      logger.error('Error obteniendo clientes:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Obtener estadísticas de clientes
  static async getClientStats(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();

      // Estadísticas por estado
      const [estadosStats] = await connection.execute(`
        SELECT 
          estado,
          COUNT(*) as total
        FROM clientes
        GROUP BY estado
      `);

      // Clientes nuevos por período
      const [nuevosStats] = await connection.execute(`
        SELECT 
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as nuevos_hoy,
          SUM(CASE WHEN YEARWEEK(created_at) = YEARWEEK(NOW()) THEN 1 ELSE 0 END) as nuevos_semana,
          SUM(CASE WHEN YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW()) THEN 1 ELSE 0 END) as nuevos_mes
        FROM clientes
      `);

      // Total de clientes
      const [totalStats] = await connection.execute(`
        SELECT COUNT(*) as total FROM clientes
      `);

      // Construir objeto de estadísticas
      const stats = {
        total: totalStats[0].total || 0,
        activos: 0,
        suspendidos: 0,
        cortados: 0,
        retirados: 0,
        inactivos: 0,
        nuevos_hoy: nuevosStats[0].nuevos_hoy || 0,
        nuevos_semana: nuevosStats[0].nuevos_semana || 0,
        nuevos_mes: nuevosStats[0].nuevos_mes || 0
      };

      // Llenar estadísticas por estado
      estadosStats.forEach(item => {
        if (stats.hasOwnProperty(item.estado)) {
          stats[item.estado] = parseInt(item.total);
        }
      });

      logger.info('Estadísticas de clientes obtenidas exitosamente');

      return ApiResponse.success(res, stats, 'Estadísticas obtenidas exitosamente');

    } catch (error) {
      logger.error('Error obteniendo estadísticas de clientes:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Obtener cliente por ID
  static async getClientById(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const { id } = req.params;

      if (!id) {
        return ApiResponse.error(res, 'ID de cliente requerido', 400);
      }

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

      if (clients.length === 0) {
        return ApiResponse.error(res, 'Cliente no encontrado', 404);
      }

      logger.info(`Cliente obtenido: ID ${id}`);

      return ApiResponse.success(res, clients[0], 'Cliente obtenido exitosamente');

    } catch (error) {
      logger.error('Error obteniendo cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Crear nuevo cliente
  static async createClient(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const {
        identificacion,
        nombre,
        telefono,
        email,
        direccion,
        ciudad_id,
        sector_id,
        estrato,
        coordenadas_lat,
        coordenadas_lng,
        fecha_registro,
        observaciones
      } = req.body;

      // Validaciones
      if (!identificacion || !nombre || !telefono) {
        return ApiResponse.error(res, 'Identificación, nombre y teléfono son requeridos', 400);
      }

      // Verificar si ya existe
      const [existingClient] = await connection.execute(
        'SELECT id FROM clientes WHERE identificacion = ?',
        [identificacion]
      );

      if (existingClient.length > 0) {
        return ApiResponse.error(res, 'Ya existe un cliente con esa identificación', 409);
      }

      // Insertar cliente
      const [result] = await connection.execute(`
        INSERT INTO clientes (
          identificacion, nombre, telefono, email, direccion,
          ciudad_id, sector_id, estrato, coordenadas_lat, coordenadas_lng,
          fecha_registro, observaciones, estado, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', NOW())
      `, [
        identificacion, nombre, telefono, email || null, direccion || null,
        ciudad_id || null, sector_id || null, estrato || null,
        coordenadas_lat || null, coordenadas_lng || null,
        fecha_registro || null, observaciones || null
      ]);

      await connection.commit();

      logger.info(`Cliente creado: ID ${result.insertId}, Identificación: ${identificacion}`);

      return ApiResponse.success(res, {
        id: result.insertId,
        identificacion,
        nombre
      }, 'Cliente creado exitosamente', null, 201);

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error('Error creando cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Actualizar cliente
  static async updateClient(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return ApiResponse.error(res, 'ID de cliente requerido', 400);
      }

      // Verificar que el cliente existe
      const [existingClient] = await connection.execute(
        'SELECT id FROM clientes WHERE id = ?',
        [id]
      );

      if (existingClient.length === 0) {
        return ApiResponse.error(res, 'Cliente no encontrado', 404);
      }

      // Si se está actualizando la identificación, verificar que no exista
      if (updateData.identificacion) {
        const [duplicateClient] = await connection.execute(
          'SELECT id FROM clientes WHERE identificacion = ? AND id != ?',
          [updateData.identificacion, id]
        );

        if (duplicateClient.length > 0) {
          return ApiResponse.error(res, 'Ya existe un cliente con esa identificación', 409);
        }
      }

      // Construir query de actualización
      const fields = [];
      const values = [];

      const allowedFields = [
        'identificacion', 'nombre', 'telefono', 'email', 'direccion',
        'ciudad_id', 'sector_id', 'estrato', 'coordenadas_lat', 'coordenadas_lng',
        'fecha_registro', 'observaciones', 'estado'
      ];

      allowedFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          fields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      });

      if (fields.length === 0) {
        return ApiResponse.error(res, 'No hay campos para actualizar', 400);
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const updateQuery = `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`;
      await connection.execute(updateQuery, values);

      await connection.commit();

      logger.info(`Cliente actualizado: ID ${id}`);

      return ApiResponse.success(res, { id }, 'Cliente actualizado exitosamente');

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error('Error actualizando cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Eliminar cliente
  static async deleteClient(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const { id } = req.params;

      if (!id) {
        return ApiResponse.error(res, 'ID de cliente requerido', 400);
      }

      // Verificar que el cliente existe
      const [existingClient] = await connection.execute(
        'SELECT id, identificacion, nombre FROM clientes WHERE id = ?',
        [id]
      );

      if (existingClient.length === 0) {
        return ApiResponse.error(res, 'Cliente no encontrado', 404);
      }

      // Verificar dependencias (facturas, contratos, etc.)
      const [dependencias] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM facturas WHERE cliente_id = ?) as facturas,
          (SELECT COUNT(*) FROM contratos_servicio WHERE cliente_id = ?) as contratos,
          (SELECT COUNT(*) FROM instalaciones WHERE cliente_id = ?) as instalaciones
      `, [id, id, id]);

      const { facturas, contratos, instalaciones } = dependencias[0];

      if (facturas > 0 || contratos > 0 || instalaciones > 0) {
        return ApiResponse.error(res, 
          `No se puede eliminar el cliente porque tiene dependencias: ${facturas} facturas, ${contratos} contratos, ${instalaciones} instalaciones`, 
          409
        );
      }

      // Eliminar cliente
      await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);

      await connection.commit();

      logger.info(`Cliente eliminado: ID ${id}, Identificación: ${existingClient[0].identificacion}`);

      return ApiResponse.success(res, null, 'Cliente eliminado exitosamente');

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error('Error eliminando cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Buscar clientes
  static async searchClients(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const { q } = req.query;

      if (!q || q.length < 2) {
        return ApiResponse.success(res, [], 'Término de búsqueda muy corto');
      }

      const [clients] = await connection.execute(`
        SELECT 
          c.id,
          c.identificacion,
          c.nombre,
          c.telefono,
          c.email,
          c.direccion,
          c.estado,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE 
          c.identificacion LIKE ? OR
          c.nombre LIKE ? OR
          c.telefono LIKE ? OR
          c.email LIKE ?
        ORDER BY c.nombre
        LIMIT 20
      `, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);

      logger.info(`Búsqueda realizada: "${q}", Resultados: ${clients.length}`);

      return ApiResponse.success(res, clients, 'Búsqueda realizada exitosamente');

    } catch (error) {
      logger.error('Error en búsqueda de clientes:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Obtener cliente por identificación
  static async getClientByIdentification(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const { identificacion } = req.params;

      if (!identificacion) {
        return ApiResponse.error(res, 'Identificación requerida', 400);
      }

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
        WHERE c.identificacion = ?
      `, [identificacion]);

      if (clients.length === 0) {
        return ApiResponse.success(res, null, 'Cliente no encontrado');
      }

      logger.info(`Cliente encontrado por identificación: ${identificacion}`);

      return ApiResponse.success(res, clients[0], 'Cliente encontrado exitosamente');

    } catch (error) {
      logger.error('Error obteniendo cliente por identificación:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Exportar clientes
  static async exportClients(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();

      const {
        format = 'excel',
        estado,
        sector_id,
        ciudad_id,
        fechaInicio,
        fechaFin
      } = req.query;

      // Construir WHERE clause para filtros
      let whereConditions = [];
      let queryParams = [];

      if (estado) {
        whereConditions.push('c.estado = ?');
        queryParams.push(estado);
      }

      if (sector_id) {
        whereConditions.push('c.sector_id = ?');
        queryParams.push(sector_id);
      }

      if (ciudad_id) {
        whereConditions.push('c.ciudad_id = ?');
        queryParams.push(ciudad_id);
      }

      if (fechaInicio) {
        whereConditions.push('DATE(c.created_at) >= ?');
        queryParams.push(fechaInicio);
      }

      if (fechaFin) {
        whereConditions.push('DATE(c.created_at) <= ?');
        queryParams.push(fechaFin);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Query para obtener datos de exportación
      const [clients] = await connection.execute(`
        SELECT 
          c.identificacion as 'Identificación',
          c.nombre as 'Nombre',
          c.telefono as 'Teléfono',
          c.email as 'Email',
          c.direccion as 'Dirección',
          c.estado as 'Estado',
          c.estrato as 'Estrato',
          s.nombre as 'Sector',
          ci.nombre as 'Ciudad',
          d.nombre as 'Departamento',
          DATE(c.fecha_registro) as 'Fecha Registro',
          DATE(c.created_at) as 'Fecha Creación'
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        ${whereClause}
        ORDER BY c.created_at DESC
      `, queryParams);

      if (format === 'excel') {
        // Crear archivo Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Clientes');

        // Configurar encabezados
        const headers = Object.keys(clients[0] || {});
        worksheet.addRow(headers);

        // Estilo para encabezados
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0066CC' }
        };

        // Agregar datos
        clients.forEach(client => {
          worksheet.addRow(Object.values(client));
        });

        // Ajustar ancho de columnas
        worksheet.columns.forEach(column => {
          column.width = 15;
        });

        // Configurar respuesta
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

      } else if (format === 'csv') {
        // Crear archivo CSV
        const headers = Object.keys(clients[0] || {});
        let csvContent = headers.join(',') + '\n';

        clients.forEach(client => {
          const row = Object.values(client).map(value => {
            // Escapar comillas y envolver en comillas si contiene comas
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvContent += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=clientes_${new Date().toISOString().split('T')[0]}.csv`);
        
        // Agregar BOM para UTF-8
        res.write('\ufeff');
        res.write(csvContent);
        res.end();

      } else {
        return ApiResponse.error(res, 'Formato no soportado. Use "excel" o "csv"', 400);
      }

      logger.info(`Exportación completada: ${clients.length} clientes en formato ${format}`);

    } catch (error) {
      logger.error('Error exportando clientes:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Validar datos de cliente
  static async validateClient(req, res) {
    try {
      const { identificacion } = req.body;

      if (!identificacion) {
        return ApiResponse.error(res, 'Identificación requerida', 400);
      }

      const connection = await pool.getConnection();
      
      const [existing] = await connection.execute(
        'SELECT id, nombre FROM clientes WHERE identificacion = ?',
        [identificacion]
      );

      connection.release();

      return ApiResponse.success(res, {
        exists: existing.length > 0,
        client: existing[0] || null
      }, 'Validación completada');

    } catch (error) {
      logger.error('Error validando cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener clientes activos con servicios
  static async getActiveClientsWithServices(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();

      const [clients] = await connection.execute(`
        SELECT 
          c.id,
          c.identificacion,
          c.nombre,
          c.telefono,
          c.direccion,
          c.estado,
          s.nombre as sector_nombre,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          cs.estado_servicio,
          cs.fecha_inicio as servicio_inicio
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN contratos_servicio cs ON c.id = cs.cliente_id AND cs.activo = 1
        LEFT JOIN planes_servicio ps ON cs.plan_id = ps.id
        WHERE c.estado = 'activo'
        ORDER BY c.nombre
      `);

      logger.info(`Clientes activos con servicios obtenidos: ${clients.length}`);

      return ApiResponse.success(res, clients, 'Clientes activos obtenidos exitosamente');

    } catch (error) {
      logger.error('Error obteniendo clientes activos:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }

  // Obtener resumen de cliente para dashboard
  static async getClientSummary(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();

      const { id } = req.params;

      if (!id) {
        return ApiResponse.error(res, 'ID de cliente requerido', 400);
      }

      // Información básica del cliente
      const [clientInfo] = await connection.execute(`
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE c.id = ?
      `, [id]);

      if (clientInfo.length === 0) {
        return ApiResponse.error(res, 'Cliente no encontrado', 404);
      }

      // Servicios activos
      const [services] = await connection.execute(`
        SELECT 
          cs.*,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio
        FROM contratos_servicio cs
        JOIN planes_servicio ps ON cs.plan_id = ps.id
        WHERE cs.cliente_id = ? AND cs.activo = 1
      `, [id]);

      // Últimas facturas
      const [recentInvoices] = await connection.execute(`
        SELECT 
          numero_factura,
          fecha_emision,
          fecha_vencimiento,
          total,
          estado
        FROM facturas
        WHERE cliente_id = ?
        ORDER BY fecha_emision DESC
        LIMIT 5
      `, [id]);

      // Estadísticas de pagos
      const [paymentStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_facturas,
          SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as facturas_pagadas,
          SUM(CASE WHEN estado = 'vencida' THEN 1 ELSE 0 END) as facturas_vencidas,
          SUM(total) as monto_total,
          SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as monto_pagado
        FROM facturas
        WHERE cliente_id = ?
      `, [id]);

      const summary = {
        cliente: clientInfo[0],
        servicios: services,
        facturas_recientes: recentInvoices,
        estadisticas_pagos: paymentStats[0] || {}
      };

      logger.info(`Resumen de cliente obtenido: ID ${id}`);

      return ApiResponse.success(res, summary, 'Resumen de cliente obtenido exitosamente');

    } catch (error) {
      logger.error('Error obteniendo resumen de cliente:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = ClientsController;