// backend/models/inventario.js - VERSIÓN FINAL COMPLETAMENTE CORREGIDA

const db = require('../config/database');

class InventoryModel {
  
  /**
   * Obtener todos los equipos con filtros
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          e.*,
          u.nombre AS instalador_nombre,
          u.telefono AS instalador_telefono,
          u.email AS instalador_email,
          CASE 
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NULL 
            THEN DATEDIFF(NOW(), e.fecha_asignacion)
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NOT NULL 
            THEN DATEDIFF(e.fecha_devolucion, e.fecha_asignacion)
            ELSE NULL 
          END AS dias_asignado,
          CASE 
            WHEN e.estado = 'asignado' AND e.instalador_id IS NOT NULL 
            THEN CONCAT('Asignado a ', u.nombre)
            WHEN e.estado = 'instalado' AND e.instalador_id IS NOT NULL 
            THEN CONCAT('Instalado por ', u.nombre)
            ELSE e.estado
          END AS estado_descriptivo
        FROM inventario_equipos e
        LEFT JOIN sistema_usuarios u ON e.instalador_id = u.id AND u.rol = 'instalador'
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.tipo) {
        query += ' AND e.tipo = ?';
        params.push(filters.tipo);
      }
      
      if (filters.estado) {
        query += ' AND e.estado = ?';
        params.push(filters.estado);
      }
      
      if (filters.instalador_id) {
        query += ' AND e.instalador_id = ?';
        params.push(filters.instalador_id);
      }
      
      if (filters.search) {
        query += ' AND (e.codigo LIKE ? OR e.nombre LIKE ? OR e.marca LIKE ? OR e.modelo LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.disponible) {
        query += ' AND e.estado = "disponible"';
      }
      
      // ✅ Ordenamiento seguro
      const allowedOrderBy = ['e.codigo', 'e.nombre', 'e.tipo', 'e.estado', 'e.created_at', 'e.updated_at'];
      const orderBy = allowedOrderBy.includes(filters.orderBy) ? filters.orderBy : 'e.updated_at';
      const orderDirection = filters.orderDirection === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
      
      // ✅ Paginación segura con parámetros preparados
      if (filters.limit) {
        const limitNum = parseInt(filters.limit) || 50;
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT ${limitNum} OFFSET ${offset}`;
        // No se necesita push de parámetros
      }
      const [equipos] = await db.execute(query, params);
      
      // Obtener total
      let totalQuery = `
        SELECT COUNT(*) as total
        FROM inventario_equipos e
        LEFT JOIN sistema_usuarios u ON e.instalador_id = u.id AND u.rol = 'instalador'
        WHERE 1=1
      `;
      
      const totalParams = [];
      
      if (filters.tipo) {
        totalQuery += ' AND e.tipo = ?';
        totalParams.push(filters.tipo);
      }
      
      if (filters.estado) {
        totalQuery += ' AND e.estado = ?';
        totalParams.push(filters.estado);
      }
      
      if (filters.instalador_id) {
        totalQuery += ' AND e.instalador_id = ?';
        totalParams.push(filters.instalador_id);
      }
      
      if (filters.search) {
        totalQuery += ' AND (e.codigo LIKE ? OR e.nombre LIKE ? OR e.marca LIKE ? OR e.modelo LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        totalParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (filters.disponible) {
        totalQuery += ' AND e.estado = "disponible"';
      }
      
      const [totalResult] = await db.execute(totalQuery, totalParams);
      const total = totalResult[0].total;
      
      return {
        equipos,
        pagination: {
          total,
          page: parseInt(filters.page) || 1,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      console.error('❌ Error en getAll:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    try {
      const query = `
        SELECT 
          e.*,
          u.nombre AS instalador_nombre,
          u.telefono AS instalador_telefono,
          u.email AS instalador_email,
          CASE 
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NULL 
            THEN DATEDIFF(NOW(), e.fecha_asignacion)
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NOT NULL 
            THEN DATEDIFF(e.fecha_devolucion, e.fecha_asignacion)
            ELSE NULL 
          END AS dias_asignado
        FROM inventario_equipos e
        LEFT JOIN sistema_usuarios u ON e.instalador_id = u.id AND u.rol = 'instalador'
        WHERE e.id = ?
      `;
      
      const [equipos] = await db.execute(query, [id]);
      return equipos[0];
    } catch (error) {
      console.error('❌ Error en getById:', error);
      throw error;
    }
  }
  
  static async create(equipoData, userId) {
    try {
      const query = `
        INSERT INTO inventario_equipos (
          codigo, nombre, tipo, marca, modelo, numero_serie,
          estado, precio_compra, fecha_compra, proveedor,
          ubicacion, observaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        equipoData.codigo,
        equipoData.nombre,
        equipoData.tipo,
        equipoData.marca || null,
        equipoData.modelo || null,
        equipoData.numero_serie || null,
        equipoData.estado || 'disponible',
        equipoData.precio_compra || null,
        equipoData.fecha_compra || null,
        equipoData.proveedor || null,
        equipoData.ubicacion || null,
        equipoData.observaciones || null
      ];
      
      const [result] = await db.execute(query, params);
      
      return {
        id: result.insertId,
        ...equipoData,
        estado: equipoData.estado || 'disponible'
      };
    } catch (error) {
      console.error('❌ Error en create:', error);
      throw error;
    }
  }
  
  static async update(id, equipoData, userId) {
    try {
      const query = `
        UPDATE inventario_equipos SET
          codigo = ?, nombre = ?, tipo = ?, marca = ?, modelo = ?,
          numero_serie = ?, precio_compra = ?, fecha_compra = ?,
          proveedor = ?, ubicacion = ?, observaciones = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      const params = [
        equipoData.codigo,
        equipoData.nombre,
        equipoData.tipo,
        equipoData.marca || null,
        equipoData.modelo || null,
        equipoData.numero_serie || null,
        equipoData.precio_compra || null,
        equipoData.fecha_compra || null,
        equipoData.proveedor || null,
        equipoData.ubicacion || null,
        equipoData.observaciones || null,
        id
      ];
      
      await db.execute(query, params);
      return await this.getById(id);
    } catch (error) {
      console.error('❌ Error en update:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    try {
      const equipo = await this.getById(id);
      if (!equipo) {
        throw new Error('Equipo no encontrado');
      }
      
      if (equipo.estado === 'asignado' || equipo.estado === 'instalado') {
        throw new Error('No se puede eliminar un equipo asignado o instalado');
      }
      
      const query = 'DELETE FROM inventario_equipos WHERE id = ?';
      await db.execute(query, [id]);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error en delete:', error);
      throw error;
    }
  }
  
  static async assignToInstaller(equipoId, instaladorId, assignmentData, userId) {
    try {
      await db.execute('CALL AsignarEquipoInstalador(?, ?, ?, ?, ?)', [
        equipoId,
        instaladorId,
        assignmentData.ubicacion || null,
        assignmentData.notas || null,
        userId
      ]);
      
      return await this.getById(equipoId);
    } catch (error) {
      console.error('❌ Error en assignToInstaller:', error);
      throw error;
    }
  }
  
  static async returnEquipment(equipoId, returnData, userId) {
    try {
      await db.execute('CALL DevolverEquipo(?, ?, ?, ?)', [
        equipoId,
        returnData.ubicacion_devolucion || 'Almacén Principal',
        returnData.notas || null,
        userId
      ]);
      
      return await this.getById(equipoId);
    } catch (error) {
      console.error('❌ Error en returnEquipment:', error);
      throw error;
    }
  }
  
  static async markAsInstalled(equipoId, installationData, userId) {
    try {
      const query = `
        UPDATE inventario_equipos SET
          estado = 'instalado',
          ubicacion_actual = ?,
          coordenadas_lat = ?,
          coordenadas_lng = ?,
          notas_instalador = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.execute(query, [
        installationData.ubicacion_cliente,
        installationData.coordenadas_lat || null,
        installationData.coordenadas_lng || null,
        installationData.notas || null,
        equipoId
      ]);
      
      const historialQuery = `
        INSERT INTO inventario_historial (
          equipo_id, instalador_id, accion, ubicacion, 
          coordenadas_lat, coordenadas_lng, notas, 
          cliente_id, instalacion_id, created_by
        ) VALUES (?, ?, 'instalado', ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.execute(historialQuery, [
        equipoId,
        installationData.instalador_id,
        installationData.ubicacion_cliente,
        installationData.coordenadas_lat || null,
        installationData.coordenadas_lng || null,
        installationData.notas || null,
        installationData.cliente_id || null,
        installationData.instalacion_id || null,
        userId
      ]);
      
      return await this.getById(equipoId);
    } catch (error) {
      console.error('❌ Error en markAsInstalled:', error);
      throw error;
    }
  }
  
  static async getByInstaller(instaladorId, estado = null) {
    try {
      let query = `
        SELECT e.*, u.nombre AS instalador_nombre
        FROM inventario_equipos e
        JOIN sistema_usuarios u ON e.instalador_id = u.id
        WHERE e.instalador_id = ?
      `;
      
      const params = [instaladorId];
      
      if (estado) {
        query += ' AND e.estado = ?';
        params.push(estado);
      }
      
      query += ' ORDER BY e.fecha_asignacion DESC';
      
      const [equipos] = await db.execute(query, params);
      return equipos;
    } catch (error) {
      console.error('❌ Error en getByInstaller:', error);
      throw error;
    }
  }
  
  static async getHistory(equipoId) {
    try {
      const query = `
        SELECT 
          h.*,
          u.nombre AS instalador_nombre,
          c.nombre AS cliente_nombre,
          e.codigo AS equipo_codigo,
          e.nombre AS equipo_nombre
        FROM inventario_historial h
        JOIN sistema_usuarios u ON h.instalador_id = u.id
        LEFT JOIN clientes c ON h.cliente_id = c.id
        JOIN inventario_equipos e ON h.equipo_id = e.id
        WHERE h.equipo_id = ?
        ORDER BY h.fecha_accion DESC
      `;
      
      const [historial] = await db.execute(query, [equipoId]);
      return historial;
    } catch (error) {
      console.error('❌ Error en getHistory:', error);
      throw error;
    }
  }
  
static async getInstallerHistory(instaladorId, limit = 50) {
    try {
      const query = `
        SELECT 
          h.*,
          e.codigo AS equipo_codigo,
          e.nombre AS equipo_nombre,
          e.tipo AS equipo_tipo,
          c.nombre AS cliente_nombre
        FROM inventario_historial h
        JOIN inventario_equipos e ON h.equipo_id = e.id
        LEFT JOIN clientes c ON h.cliente_id = c.id
        WHERE h.instalador_id = ?
        ORDER BY h.fecha_accion DESC
        LIMIT ${parseInt(limit)}
      `;
      
      const [historial] = await db.execute(query, [instaladorId]);
      return historial;
    } catch (error) {
      console.error('❌ Error en getInstallerHistory:', error);
      throw error;
    }
  }
  
  static async getStats() {
    try {
      console.log('📊 getStats - Obteniendo estadísticas...');
      
      // Query general
      const generalQuery = `
        SELECT 
          COUNT(*) as total_equipos,
          COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as disponibles,
          COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
          COUNT(CASE WHEN estado = 'instalado' THEN 1 END) as instalados,
          COUNT(CASE WHEN estado = 'dañado' THEN 1 END) as dañados,
          COUNT(CASE WHEN estado = 'perdido' THEN 1 END) as perdidos,
          COUNT(CASE WHEN estado = 'mantenimiento' THEN 1 END) as en_mantenimiento,
          SUM(CASE WHEN precio_compra IS NOT NULL THEN precio_compra ELSE 0 END) as valor_total_inventario
        FROM inventario_equipos
      `;
      
      // Query por tipo
      const tipoQuery = `
        SELECT 
          tipo,
          COUNT(*) as cantidad,
          COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as disponibles,
          COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
          COUNT(CASE WHEN estado = 'instalado' THEN 1 END) as instalados
        FROM inventario_equipos
        GROUP BY tipo
        ORDER BY cantidad DESC
      `;
      
      // Query por instalador
      const instaladorQuery = `
        SELECT 
          u.id,
          u.nombre,
          u.telefono,
          COUNT(e.id) as equipos_asignados,
          COUNT(CASE WHEN e.estado = 'asignado' THEN 1 END) as equipos_pendientes,
          COUNT(CASE WHEN e.estado = 'instalado' THEN 1 END) as equipos_instalados,
          AVG(CASE 
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NULL 
            THEN DATEDIFF(NOW(), e.fecha_asignacion)
            WHEN e.fecha_asignacion IS NOT NULL AND e.fecha_devolucion IS NOT NULL 
            THEN DATEDIFF(e.fecha_devolucion, e.fecha_asignacion)
            ELSE NULL 
          END) as promedio_dias_asignacion
        FROM sistema_usuarios u
        LEFT JOIN inventario_equipos e ON u.id = e.instalador_id
        WHERE u.rol = 'instalador' AND u.activo = 1
        GROUP BY u.id, u.nombre, u.telefono
        ORDER BY equipos_asignados DESC
      `;
      
      // Query movimientos recientes
      const movimientosQuery = `
        SELECT 
          h.fecha_accion,
          h.accion,
          e.codigo,
          e.nombre as equipo_nombre,
          u.nombre as instalador_nombre,
          c.nombre as cliente_nombre
        FROM inventario_historial h
        JOIN inventario_equipos e ON h.equipo_id = e.id
        JOIN sistema_usuarios u ON h.instalador_id = u.id
        LEFT JOIN clientes c ON h.cliente_id = c.id
        ORDER BY h.fecha_accion DESC
        LIMIT 10
      `;
      
      const [generalStats] = await db.execute(generalQuery);
      const [tipoStats] = await db.execute(tipoQuery);
      const [instaladorStats] = await db.execute(instaladorQuery);
      const [movimientosRecientes] = await db.execute(movimientosQuery);
      
      console.log('✅ getStats - Estadísticas obtenidas exitosamente');
      
      return {
        general: generalStats[0],
        por_tipo: tipoStats,
        por_instalador: instaladorStats,
        movimientos_recientes: movimientosRecientes
      };
    } catch (error) {
      console.error('❌ Error en getStats:', error);
      console.error('❌ Detalles:', error.message);
      throw error;
    }
  }
  
  static async getAvailableEquipment(tipo = null) {
    try {
      let query = `
        SELECT id, codigo, nombre, tipo, marca, modelo, ubicacion
        FROM inventario_equipos
        WHERE estado = 'disponible'
      `;
      
      const params = [];
      
      if (tipo) {
        query += ' AND tipo = ?';
        params.push(tipo);
      }
      
      query += ' ORDER BY nombre';
      
      const [equipos] = await db.execute(query, params);
      return equipos;
    } catch (error) {
      console.error('❌ Error en getAvailableEquipment:', error);
      throw error;
    }
  }
  
  static async getActiveInstallers() {
    try {
      const query = `
        SELECT 
          u.id,
          u.nombre,
          u.telefono,
          u.email,
          u.rol,
          COUNT(e.id) as equipos_asignados
        FROM sistema_usuarios u
        LEFT JOIN inventario_equipos e ON u.id = e.instalador_id AND e.estado IN ('asignado', 'instalado')
        WHERE u.rol = 'instalador' AND u.activo = 1
        GROUP BY u.id, u.nombre, u.telefono, u.email, u.rol
        ORDER BY u.nombre
      `;
      
      const [instaladores] = await db.execute(query);
      console.log(`✅ Instaladores activos encontrados: ${instaladores.length}`);
      
      return instaladores;
    } catch (error) {
      console.error('❌ Error en getActiveInstallers:', error);
      throw error;
    }
  }
  
  static async checkCodeAvailability(codigo, excludeId = null) {
    try {
      let query = 'SELECT id FROM inventario_equipos WHERE codigo = ?';
      const params = [codigo];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const [result] = await db.execute(query, params);
      return result.length === 0;
    } catch (error) {
      console.error('❌ Error en checkCodeAvailability:', error);
      throw error;
    }
  }
  
  static async search(searchTerm) {
    try {
      const query = `
        SELECT 
          e.*,
          u.nombre AS instalador_nombre
        FROM inventario_equipos e
        LEFT JOIN sistema_usuarios u ON e.instalador_id = u.id
        WHERE e.codigo LIKE ? OR e.numero_serie LIKE ? OR e.nombre LIKE ?
        ORDER BY e.nombre
        LIMIT 50
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [equipos] = await db.execute(query, [searchPattern, searchPattern, searchPattern]);
      return equipos;
    } catch (error) {
      console.error('❌ Error en search:', error);
      throw error;
    }
  }
  
  static async getReportByDateRange(startDate, endDate, tipo = null) {
    try {
      let query = `
        SELECT 
          h.*,
          e.codigo,
          e.nombre as equipo_nombre,
          e.tipo,
          u.nombre as instalador_nombre,
          c.nombre as cliente_nombre
        FROM inventario_historial h
        JOIN inventario_equipos e ON h.equipo_id = e.id
        JOIN sistema_usuarios u ON h.instalador_id = u.id
        LEFT JOIN clientes c ON h.cliente_id = c.id
        WHERE h.fecha_accion BETWEEN ? AND ?
      `;
      
      const params = [startDate, endDate];
      
      if (tipo) {
        query += ' AND e.tipo = ?';
        params.push(tipo);
      }
      
      query += ' ORDER BY h.fecha_accion DESC';
      
      const [movimientos] = await db.execute(query, params);
      return movimientos;
    } catch (error) {
      console.error('❌ Error en getReportByDateRange:', error);
      throw error;
    }
  }
  
  static async updateLocation(equipoId, locationData, userId) {
    try {
      const query = `
        UPDATE inventario_equipos SET
          coordenadas_lat = ?,
          coordenadas_lng = ?,
          ubicacion_actual = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await db.execute(query, [
        locationData.lat,
        locationData.lng,
        locationData.direccion || null,
        equipoId
      ]);
      
      return await this.getById(equipoId);
    } catch (error) {
      console.error('❌ Error en updateLocation:', error);
      throw error;
    }
  }
  
  static async getTypes() {
    try {
      const query = `
        SELECT DISTINCT tipo, COUNT(*) as cantidad
        FROM inventario_equipos
        GROUP BY tipo
        ORDER BY tipo
      `;
      
      const [tipos] = await db.execute(query);
      return tipos;
    } catch (error) {
      console.error('❌ Error en getTypes:', error);
      throw error;
    }
  }
  
  static async getBrandsByType(tipo) {
    try {
      const query = `
        SELECT DISTINCT marca, COUNT(*) as cantidad
        FROM inventario_equipos
        WHERE tipo = ? AND marca IS NOT NULL
        GROUP BY marca
        ORDER BY marca
      `;
      
      const [marcas] = await db.execute(query, [tipo]);
      return marcas;
    } catch (error) {
      console.error('❌ Error en getBrandsByType:', error);
      throw error;
    }
  }
}

module.exports = InventoryModel;