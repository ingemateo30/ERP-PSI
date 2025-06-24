const pool = require('../config/database');

class Instalacion {
  constructor(data = {}) {
    this.id = data.id || null;
    this.cliente_id = data.cliente_id || null;
    this.plan_id = data.plan_id || null;
    this.instalador_id = data.instalador_id || null;
    this.fecha_programada = data.fecha_programada || null;
    this.fecha_realizada = data.fecha_realizada || null;
    this.direccion_instalacion = data.direccion_instalacion || null;
    this.barrio = data.barrio || null;
    this.ciudad_id = data.ciudad_id || null;
    this.telefono_contacto = data.telefono_contacto || null;
    this.persona_recibe = data.persona_recibe || null;
    this.tipo_instalacion = data.tipo_instalacion || 'nueva';
    this.estado = data.estado || 'programada';
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
        'SELECT id FROM clientes WHERE id = ? AND activo = 1',
        [datosInstalacion.cliente_id]
      );

      if (cliente.length === 0) {
        throw new Error('El cliente especificado no existe o no está activo');
      }

      // Validar que el plan existe
      const [plan] = await connection.execute(
        'SELECT id FROM planes_servicio WHERE id = ? AND activo = 1',
        [datosInstalacion.plan_id]
      );

      if (plan.length === 0) {
        throw new Error('El plan especificado no existe o no está activo');
      }

      // Validar que el instalador existe
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
          cliente_id, plan_id, instalador_id, fecha_programada, direccion_instalacion,
          barrio, ciudad_id, telefono_contacto, persona_recibe, tipo_instalacion,
          estado, observaciones, equipos_instalados, coordenadas_lat, coordenadas_lng,
          costo_instalacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datosInstalacion.cliente_id,
          datosInstalacion.plan_id,
          datosInstalacion.instalador_id,
          datosInstalacion.fecha_programada,
          datosInstalacion.direccion_instalacion,
          datosInstalacion.barrio,
          datosInstalacion.ciudad_id,
          datosInstalacion.telefono_contacto,
          datosInstalacion.persona_recibe,
          datosInstalacion.tipo_instalacion || 'nueva',
          datosInstalacion.estado || 'programada',
          datosInstalacion.observaciones,
          datosInstalacion.equipos_instalados ? JSON.stringify(datosInstalacion.equipos_instalados) : null,
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
          c.numero_documento,
          c.nombres,
          c.apellidos,
          c.email as cliente_email,
          c.telefono as cliente_telefono,
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          u.nombres as instalador_nombres,
          u.apellidos as instalador_apellidos,
          u.telefono as instalador_telefono,
          u.email as instalador_email,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        INNER JOIN planes_servicio ps ON i.plan_id = ps.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN ciudades ci ON i.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE i.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      const instalacion = rows[0];
      
      // Parsear JSON de equipos instalados
      if (instalacion.equipos_instalados) {
        instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
      }

      // Parsear JSON de fotos
      if (instalacion.fotos_instalacion) {
        instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
      }

      return new Instalacion(instalacion);
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  // Listar instalaciones con filtros y paginación
  static async listar(filtros = {}, paginacion = {}) {
    const connection = await pool.getConnection();
    try {
      const { pagina = 1, limite = 10 } = paginacion;
      const offset = (pagina - 1) * limite;

      let whereClause = 'WHERE 1=1';
      let params = [];

      // Construir filtros dinámicos
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

      if (filtros.ciudad_id) {
        whereClause += ' AND i.ciudad_id = ?';
        params.push(filtros.ciudad_id);
      }

      if (filtros.busqueda) {
        whereClause += ` AND (
          c.numero_documento LIKE ? OR 
          c.nombres LIKE ? OR 
          c.apellidos LIKE ? OR
          i.direccion_instalacion LIKE ?
        )`;
        const busqueda = `%${filtros.busqueda}%`;
        params.push(busqueda, busqueda, busqueda, busqueda);
      }

      // Consulta principal
      const [rows] = await connection.execute(
        `SELECT 
          i.*,
          c.numero_documento,
          c.nombres,
          c.apellidos,
          c.email as cliente_email,
          c.telefono as cliente_telefono,
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          u.nombres as instalador_nombres,
          u.apellidos as instalador_apellidos,
          u.telefono as instalador_telefono,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        INNER JOIN planes_servicio ps ON i.plan_id = ps.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN ciudades ci ON i.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        ${whereClause}
        ORDER BY i.fecha_programada DESC, i.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limite, offset]
      );

      // Consulta para contar total
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        INNER JOIN planes_servicio ps ON i.plan_id = ps.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN ciudades ci ON i.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        ${whereClause}`,
        params
      );

      const total = countResult[0].total;
      const totalPaginas = Math.ceil(total / limite);

      // Procesar datos de instalaciones
      const instalaciones = rows.map(row => {
        if (row.equipos_instalados) {
          row.equipos_instalados = JSON.parse(row.equipos_instalados);
        }
        if (row.fotos_instalacion) {
          row.fotos_instalacion = JSON.parse(row.fotos_instalacion);
        }
        return new Instalacion(row);
      });

      return {
        instalaciones,
        paginacion: {
          paginaActual: parseInt(pagina),
          totalPaginas,
          limite: parseInt(limite),
          total
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
        'instalador_id', 'fecha_programada', 'fecha_realizada', 'direccion_instalacion',
        'barrio', 'ciudad_id', 'telefono_contacto', 'persona_recibe', 'tipo_instalacion',
        'estado', 'observaciones', 'equipos_instalados', 'fotos_instalacion',
        'coordenadas_lat', 'coordenadas_lng', 'costo_instalacion'
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

  // Eliminar instalación (soft delete)
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
          tipo_instalacion,
          COUNT(*) as cantidad
        FROM instalaciones 
        ${whereClause}
        GROUP BY tipo_instalacion`,
        params
      );

      // Estadísticas por instalador
      const [instaladorStats] = await connection.execute(
        `SELECT 
          u.nombres,
          u.apellidos,
          COUNT(i.id) as total_instalaciones,
          COUNT(CASE WHEN i.estado = 'completada' THEN 1 END) as completadas,
          AVG(i.costo_instalacion) as costo_promedio
        FROM instalaciones i
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        ${whereClause}
        GROUP BY i.instalador_id, u.nombres, u.apellidos
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
          c.numero_documento,
          c.nombres,
          c.apellidos,
          c.telefono as cliente_telefono,
          ps.nombre as plan_nombre,
          ci.nombre as ciudad_nombre
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        INNER JOIN planes_servicio ps ON i.plan_id = ps.id
        LEFT JOIN ciudades ci ON i.ciudad_id = ci.id
        WHERE i.instalador_id = ? AND i.estado IN ('programada', 'en_proceso')
        ORDER BY i.fecha_programada ASC`,
        [instaladorId]
      );

      return rows.map(row => {
        if (row.equipos_instalados) {
          row.equipos_instalados = JSON.parse(row.equipos_instalados);
        }
        return new Instalacion(row);
      });
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Instalacion;