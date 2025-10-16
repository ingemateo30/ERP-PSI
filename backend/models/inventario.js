// backend/models/inventory.js

const db = require('../config/database');

class InventoryModel {
  
  // ==========================================
  // MÉTODOS PARA GESTIÓN DE EQUIPOS
  // ==========================================
  
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
      
      // Aplicar filtros
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
      
      // Ordenamiento
      const orderBy = filters.orderBy || 'e.updated_at';
      const orderDirection = filters.orderDirection || 'DESC';
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
      
      // Paginación
      if (filters.limit) {
  const limitNum = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;

  // ORDER BY seguro + LIMIT + OFFSET
  query += ` ORDER BY ${sortColumnSafe} ${sortDirectionSafe} LIMIT ${limitNum} OFFSET ${offset}`;
} 
      
      const [equipos] = await db.execute(query, params);
      
      // Obtener total para paginación
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
          page: filters.page || 1,
          limit: filters.limit || total,
          pages: filters.limit ? Math.ceil(total / filters.limit) : 1
        }
      };
    } catch (error) {
      console.error('Error obteniendo equipos:', error);
      throw error;
    }
  }
  
  /**
   * Obtener equipo por ID
   */
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
      console.error('Error obteniendo equipo por ID:', error);
      throw error;
    }
  }
  
  /**
   * Crear nuevo equipo
   */
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
      console.error('Error creando equipo:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar equipo
   */
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
      console.error('Error actualizando equipo:', error);
      throw error;
    }
  }
  
  /**
   * Eliminar equipo
   */
  static async delete(id) {
    try {
      // Verificar que el equipo no esté asignado
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
      console.error('Error eliminando equipo:', error);
      throw error;
    }
  }
  
  // ==========================================
  // MÉTODOS PARA GESTIÓN DE ASIGNACIONES
  // ==========================================
  
  /**
   * Asignar equipo a instalador
   */
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
      console.error('Error asignando equipo:', error);
      throw error;
    }
  }
  
  /**
   * Devolver equipo
   */
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
      console.error('Error devolviendo equipo:', error);
      throw error;
    }
  }
  
  /**
   * Marcar equipo como instalado
   */
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
      
      // Registrar en historial
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
      console.error('Error marcando equipo como instalado:', error);
      throw error;
    }
  }
  
  /**
   * Obtener equipos asignados a un instalador
   */
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
      console.error('Error obteniendo equipos por instalador:', error);
      throw error;
    }
  }
  
  // ==========================================
  // MÉTODOS PARA HISTORIAL
  // ==========================================
  
  /**
   * Obtener historial de un equipo
   */
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
      console.error('Error obteniendo historial del equipo:', error);
      throw error;
    }
  }
  
  /**
   * Obtener historial de un instalador
   */
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
        ${sortColumnSafe} ${sortDirectionSafe}
        LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)};
      `;
      
      const [historial] = await db.execute(query, [instaladorId, limit]);
      return historial;
    } catch (error) {
      console.error('Error obteniendo historial del instalador:', error);
      throw error;
    }
  }
  
  // ==========================================
  // MÉTODOS PARA ESTADÍSTICAS Y REPORTES
  // ==========================================
  
  /**
   * Obtener estadísticas del inventario
   */
  static async getStats() {
    try {
      const queries = {
        general: `
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
        `,
        
        por_tipo: `
          SELECT 
            tipo,
            COUNT(*) as cantidad,
            COUNT(CASE WHEN estado = 'disponible' THEN 1 END) as disponibles,
            COUNT(CASE WHEN estado = 'asignado' THEN 1 END) as asignados,
            COUNT(CASE WHEN estado = 'instalado' THEN 1 END) as instalados
          FROM inventario_equipos
          GROUP BY tipo
          ORDER BY cantidad DESC
        `,
        
        por_instalador: `
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
        `,
        
        movimientos_recientes: `
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
          ORDER BY ${sortColumnSafe} ${sortDirectionSafe} 
          LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)};
        `
      };
      
      const [generalStats] = await db.execute(queries.general);
      const [tipoStats] = await db.execute(queries.por_tipo);
      const [instaladorStats] = await db.execute(queries.por_instalador);
      const [movimientosRecientes] = await db.execute(queries.movimientos_recientes);
      
      return {
        general: generalStats[0],
        por_tipo: tipoStats,
        por_instalador: instaladorStats,
        movimientos_recientes: movimientosRecientes
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
  
  /**
   * Obtener equipos disponibles para asignación
   */
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
      console.error('Error obteniendo equipos disponibles:', error);
      throw error;
    }
  }
  
  /**
   * Obtener instaladores activos
   */
   static async getActiveInstallers() {
    try {
      // ✅ USANDO LA MISMA CONSULTA QUE FUNCIONA EN INCIDENCIAS
      // pero manteniendo los campos adicionales que necesita inventario
      const query = `
        SELECT 
          u.id,
          u.nombre as nombre,
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
      console.log('👥 Lista de instaladores:', instaladores.map(i => ({ id: i.id, nombre: i.nombre })));
      
      return instaladores;
    } catch (error) {
      console.error('❌ Error obteniendo instaladores activos:', error);
      console.error('❌ Detalles del error:', error.message);
      throw error;
    }
  }
  
  /**
   * Verificar disponibilidad de código
   */
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
      console.error('Error verificando disponibilidad de código:', error);
      throw error;
    }
  }
  
  /**
   * Buscar equipos por código o número de serie
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT 
          e.*,
          u.nombre AS instalador_nombre
        FROM inventario_equipos e
        LEFT JOIN sistema_usuarios u ON e.instalador_id = u.id
        WHERE e.codigo LIKE ? OR e.numero_serie LIKE ? OR e.nombre LIKE ?
        ORDER BY ${sortColumnSafe} ${sortDirectionSafe} 
        LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)};
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [equipos] = await db.execute(query, [searchPattern, searchPattern, searchPattern]);
      return equipos;
    } catch (error) {
      console.error('Error buscando equipos:', error);
      throw error;
    }
  }
  
  /**
   * Obtener reporte de equipos por rango de fechas
   */
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
      console.error('Error obteniendo reporte por fechas:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar ubicación de equipo (para instaladores móviles)
   */
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
      console.error('Error actualizando ubicación:', error);
      throw error;
    }
  }
  
  /**
   * Obtener tipos de equipos únicos
   */
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
      console.error('Error obteniendo tipos de equipos:', error);
      throw error;
    }
  }
  
  /**
   * Obtener marcas únicas por tipo
   */
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
      console.error('Error obteniendo marcas por tipo:', error);
      throw error;
    }
  }
}

module.exports = InventoryModel;