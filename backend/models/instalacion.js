const pool = require('../config/database');

class Instalacion {
  constructor(data = {}) {
    this.id = data.id || null;
    this.cliente_id = data.cliente_id || null;
    this.servicio_cliente_id = data.servicio_cliente_id || null;
    this.instalador_id = data.instalador_id || null;
    this.fecha_programada = data.fecha_programada || null;
    this.hora_programada = data.hora_programada || null;
    this.fecha_realizada = data.fecha_realizada || null;
    this.hora_inicio = data.hora_inicio || null;
    this.hora_fin = data.hora_fin || null;
    this.estado = data.estado || 'programada';
    this.direccion_instalacion = data.direccion_instalacion || null;
    this.barrio = data.barrio || null;
    this.telefono_contacto = data.telefono_contacto || null;
    this.persona_recibe = data.persona_recibe || null;
    this.tipo_instalacion = data.tipo_instalacion || 'nueva';
    this.observaciones = data.observaciones || null;
    this.equipos_instalados = data.equipos_instalados || null;
    this.fotos_instalacion = data.fotos_instalacion || null;
    this.coordenadas_lat = data.coordenadas_lat || null;
    this.coordenadas_lng = data.coordenadas_lng || null;
    this.costo_instalacion = data.costo_instalacion || 0;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  // Crear nueva instalación
  static async crear(datosInstalacion) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validar que el cliente existe
      const [cliente] = await connection.execute(
        'SELECT id FROM clientes WHERE id = ?',
        [datosInstalacion.cliente_id]
      );

      if (cliente.length === 0) {
        throw new Error('El cliente especificado no existe');
      }

      // Validar que el instalador existe si se proporciona
      if (datosInstalacion.instalador_id) {
        const [instalador] = await connection.execute(
          'SELECT id FROM sistema_usuarios WHERE id = ? AND rol = "instalador" AND activo = 1',
          [datosInstalacion.instalador_id]
        );

        if (instalador.length === 0) {
          throw new Error('El instalador especificado no existe o no está activo');
        }
      }

      // Insertar instalación
      const [result] = await connection.execute(
        `INSERT INTO instalaciones (
          cliente_id, servicio_cliente_id, instalador_id, fecha_programada, hora_programada,
          direccion_instalacion, barrio, telefono_contacto, persona_recibe, tipo_instalacion,
          estado, observaciones, equipos_instalados, fotos_instalacion,
          coordenadas_lat, coordenadas_lng, costo_instalacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datosInstalacion.cliente_id,
          datosInstalacion.servicio_cliente_id,
          datosInstalacion.instalador_id,
          datosInstalacion.fecha_programada,
          datosInstalacion.hora_programada,
          datosInstalacion.direccion_instalacion,
          datosInstalacion.barrio,
          datosInstalacion.telefono_contacto,
          datosInstalacion.persona_recibe,
          datosInstalacion.tipo_instalacion || 'nueva',
          datosInstalacion.estado || 'programada',
          datosInstalacion.observaciones,
          datosInstalacion.equipos_instalados ? JSON.stringify(datosInstalacion.equipos_instalados) : null,
          datosInstalacion.fotos_instalacion ? JSON.stringify(datosInstalacion.fotos_instalacion) : null,
          datosInstalacion.coordenadas_lat,
          datosInstalacion.coordenadas_lng,
          datosInstalacion.costo_instalacion || 0
        ]
      );

      await connection.commit();

      return await this.obtenerPorId(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obtener instalación por ID
  static async obtenerPorId(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          i.*,
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion,
          u.nombre as instalador_nombre,
          u.telefono as instalador_telefono,
          u.email as instalador_email,
          ci.nombre as ciudad_nombre
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE i.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      const instalacion = rows[0];

      // Parsear campos JSON
      if (instalacion.equipos_instalados) {
        instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
      }

      if (instalacion.fotos_instalacion) {
        instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
      }

      return instalacion;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // Listar instalaciones con filtros y paginación
  static async listar(filtros = {}, paginacion = { pagina: 1, limite: 10 }) {
    const connection = await pool.getConnection();
    try {
      let whereClause = 'WHERE 1=1';
      let params = [];

      // Construir filtros
      if (filtros.estado) {
        whereClause += ' AND i.estado = ?';
        params.push(filtros.estado);
      }

      if (filtros.instalador_id) {
        whereClause += ' AND i.instalador_id = ?';
        params.push(filtros.instalador_id);
      }

      if (filtros.fecha_desde) {
        whereClause += ' AND DATE(i.fecha_programada) >= ?';
        params.push(filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        whereClause += ' AND DATE(i.fecha_programada) <= ?';
        params.push(filtros.fecha_hasta);
      }

      if (filtros.tipo_instalacion) {
        whereClause += ' AND i.tipo_instalacion = ?';
        params.push(filtros.tipo_instalacion);
      }

      if (filtros.busqueda) {
        whereClause += ' AND (c.nombre LIKE ? OR c.identificacion LIKE ? OR i.direccion_instalacion LIKE ?)';
        const searchTerm = `%${filtros.busqueda}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Contar total de registros
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        ${whereClause}`,
        params
      );

      const total = countResult[0].total;

      // Calcular paginación
      const offset = (paginacion.pagina - 1) * paginacion.limite;

     const [rows] = await connection.execute(
    `SELECT 
        i.*,
        c.identificacion as cliente_identificacion,
        c.nombre as cliente_nombre,
        u.nombre as instalador_nombre,
        ci.nombre as ciudad_nombre
    FROM instalaciones i
    INNER JOIN clientes c ON i.cliente_id = c.id
    LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
    LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
    ${whereClause}
    ORDER BY i.fecha_programada DESC 
    LIMIT ${parseInt(paginacion.limite)} OFFSET ${parseInt(offset)}
  `, params);
      // Parsear campos JSON
      const instalaciones = rows.map(row => {
        if (row.equipos_instalados) {
          row.equipos_instalados = JSON.parse(row.equipos_instalados);
        }
        if (row.fotos_instalacion) {
          row.fotos_instalacion = JSON.parse(row.fotos_instalacion);
        }
        return row;
      });

      return {
        instalaciones,
        paginacion: {
          pagina: paginacion.pagina,
          limite: paginacion.limite,
          total,
          totalPaginas: Math.ceil(total / paginacion.limite)
        }
      };

    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // Actualizar instalación
  static async actualizar(id, datosActualizacion) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que la instalación existe
      const instalacionExistente = await this.obtenerPorId(id);
      if (!instalacionExistente) {
        throw new Error('La instalación especificada no existe');
      }

      // Construir query de actualización dinámicamente
      const camposPermitidos = [
        'instalador_id', 'fecha_programada', 'hora_programada', 'fecha_realizada', 
        'hora_inicio', 'hora_fin', 'direccion_instalacion', 'barrio', 'telefono_contacto', 
        'persona_recibe', 'tipo_instalacion', 'estado', 'observaciones', 
        'equipos_instalados', 'fotos_instalacion', 'coordenadas_lat', 
        'coordenadas_lng', 'costo_instalacion'
      ];

      const campos = [];
      const valores = [];

      Object.keys(datosActualizacion).forEach(campo => {
        if (camposPermitidos.includes(campo) && datosActualizacion[campo] !== undefined) {
          campos.push(`${campo} = ?`);
          
          // Manejar campos JSON
          if (['equipos_instalados', 'fotos_instalacion'].includes(campo)) {
            valores.push(JSON.stringify(datosActualizacion[campo]));
          } else {
            valores.push(datosActualizacion[campo]);
          }
        }
      });

      if (campos.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      campos.push('updated_at = NOW()');
      valores.push(id);

      await connection.execute(
        `UPDATE instalaciones SET ${campos.join(', ')} WHERE id = ?`,
        valores
      );

      await connection.commit();

      return await this.obtenerPorId(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Eliminar instalación
  static async eliminar(id) {
    const connection = await pool.getConnection();
    try {
      // Verificar que la instalación existe
      const instalacion = await this.obtenerPorId(id);
      if (!instalacion) {
        throw new Error('La instalación especificada no existe');
      }

      // No permitir eliminar instalaciones completadas
      if (instalacion.estado === 'completada') {
        throw new Error('No se puede eliminar una instalación completada');
      }

      await connection.execute(
        'DELETE FROM instalaciones WHERE id = ?',
        [id]
      );

      return true;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obtener estadísticas de instalaciones
  static async obtenerEstadisticas(filtros = {}) {
    const connection = await pool.getConnection();
    try {
      let whereClause = 'WHERE 1=1';
      let params = [];

      if (filtros.fecha_desde) {
        whereClause += ' AND DATE(fecha_programada) >= ?';
        params.push(filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        whereClause += ' AND DATE(fecha_programada) <= ?';
        params.push(filtros.fecha_hasta);
      }

      if (filtros.instalador_id) {
        whereClause += ' AND instalador_id = ?';
        params.push(filtros.instalador_id);
      }

      // Estadísticas por estado
      const [estadoStats] = await connection.execute(
        `SELECT 
          estado,
          COUNT(*) as cantidad,
          AVG(costo_instalacion) as costo_promedio
        FROM instalaciones 
        ${whereClause}
        GROUP BY estado`,
        params
      );

      // Estadísticas por tipo
      const [tipoStats] = await connection.execute(
        `SELECT 
          COALESCE(tipo_instalacion, 'nueva') as tipo_instalacion,
          COUNT(*) as cantidad
        FROM instalaciones 
        ${whereClause}
        GROUP BY tipo_instalacion`,
        params
      );

      // Estadísticas por instalador
      const [instaladorStats] = await connection.execute(
        `SELECT 
          u.nombre,
          COUNT(i.id) as total_instalaciones,
          COUNT(CASE WHEN i.estado = 'completada' THEN 1 END) as completadas,
          AVG(i.costo_instalacion) as costo_promedio
        FROM instalaciones i
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        ${whereClause}
        GROUP BY i.instalador_id, u.nombre
        HAVING total_instalaciones > 0`,
        params
      );

      return {
        por_estado: estadoStats,
        por_tipo: tipoStats,
        por_instalador: instaladorStats
      };
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obtener instalaciones pendientes por instalador
  static async obtenerPendientesPorInstalador(instaladorId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          i.*,
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        WHERE i.instalador_id = ? 
          AND i.estado IN ('programada', 'en_proceso')
        ORDER BY i.fecha_programada ASC`,
        [instaladorId]
      );

      return rows.map(row => {
        if (row.equipos_instalados) {
          row.equipos_instalados = JSON.parse(row.equipos_instalados);
        }
        if (row.fotos_instalacion) {
          row.fotos_instalacion = JSON.parse(row.fotos_instalacion);
        }
        return row;
      });
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Instalacion;