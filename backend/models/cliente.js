// backend/models/cliente.js - VERSIÓN CORREGIDA CON NUEVOS MÉTODOS

const pool = require('../config/database');

class Cliente {
  // Obtener todos los clientes con filtros
  static async obtenerTodos(filtros = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filtros dinámicos
      if (filtros.estado) {
        query += ' AND c.estado = ?';
        params.push(filtros.estado);
      }
      
      if (filtros.identificacion) {
        query += ' AND c.identificacion LIKE ?';
        params.push(`%${filtros.identificacion}%`);
      }
      
      if (filtros.nombre) {
        query += ' AND c.nombre LIKE ?';
        params.push(`%${filtros.nombre}%`);
      }
      
      if (filtros.sector_id) {
        query += ' AND c.sector_id = ?';
        params.push(filtros.sector_id);
      }
      
      if (filtros.ciudad_id) {
        query += ' AND c.ciudad_id = ?';
        params.push(filtros.ciudad_id);
      }
      
      if (filtros.telefono) {
        query += ' AND (c.telefono LIKE ? OR c.telefono_2 LIKE ?)';
        params.push(`%${filtros.telefono}%`, `%${filtros.telefono}%`);
      }
      
      query += ' ORDER BY c.created_at DESC';
      
      // Paginación
      if (filtros.limite && filtros.offset !== undefined) {
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(filtros.limite), parseInt(filtros.offset));
      }
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }
  }

  // NUEVO: Obtener todos los clientes para exportación (sin paginación)
  static async obtenerTodosParaExportar(filtros = {}) {
    try {
      let query = `
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Filtros dinámicos
      if (filtros.estado) {
        query += ' AND c.estado = ?';
        params.push(filtros.estado);
      }
      
      if (filtros.sector_id) {
        query += ' AND c.sector_id = ?';
        params.push(filtros.sector_id);
      }
      
      if (filtros.ciudad_id) {
        query += ' AND c.ciudad_id = ?';
        params.push(filtros.ciudad_id);
      }

      // CORRECCIÓN: Filtros de fecha para exportación
      if (filtros.fecha_inicio) {
        query += ' AND c.fecha_registro >= ?';
        params.push(filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        query += ' AND c.fecha_registro <= ?';
        params.push(filtros.fecha_fin);
      }
      
      query += ' ORDER BY c.created_at DESC';
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al obtener clientes para exportación: ${error.message}`);
    }
  }

  // NUEVO: Validar que el sector pertenezca a la ciudad
  static async validarSectorCiudad(sectorId, ciudadId) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM sectores s
        WHERE s.id = ? AND s.ciudad_id = ?
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [sectorId, ciudadId]);
      connection.release();
      
      return filas[0].count > 0;
    } catch (error) {
      console.error('Error validando sector-ciudad:', error);
      return false;
    }
  }

  // Contar total de clientes con filtros
  static async contarTotal(filtros = {}) {
    try {
      let query = 'SELECT COUNT(*) as total FROM clientes c WHERE 1=1';
      const params = [];
      
      if (filtros.estado) {
        query += ' AND c.estado = ?';
        params.push(filtros.estado);
      }
      
      if (filtros.identificacion) {
        query += ' AND c.identificacion LIKE ?';
        params.push(`%${filtros.identificacion}%`);
      }
      
      if (filtros.nombre) {
        query += ' AND c.nombre LIKE ?';
        params.push(`%${filtros.nombre}%`);
      }
      
      if (filtros.sector_id) {
        query += ' AND c.sector_id = ?';
        params.push(filtros.sector_id);
      }
      
      if (filtros.ciudad_id) {
        query += ' AND c.ciudad_id = ?';
        params.push(filtros.ciudad_id);
      }
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas[0].total;
    } catch (error) {
      throw new Error(`Error al contar clientes: ${error.message}`);
    }
  }

  // Obtener cliente por ID con información técnica completa
  static async obtenerPorId(id) {
    try {
      const query = `
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE c.id = ?
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [id]);
      connection.release();
      
      return filas[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener cliente: ${error.message}`);
    }
  }

  // Obtener cliente por identificación
  static async obtenerPorIdentificacion(identificacion) {
    try {
      const query = `
        SELECT 
          c.*,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        WHERE c.identificacion = ?
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [identificacion]);
      connection.release();
      
      return filas[0] || null;
    } catch (error) {
      throw new Error(`Error al obtener cliente por identificación: ${error.message}`);
    }
  }

  // Crear nuevo cliente
  static async crear(datos) {
    try {
      // CORRECCIÓN: Incluir todos los campos en la inserción
      const query = `
        INSERT INTO clientes (
          identificacion, tipo_documento, nombre, direccion, sector_id, 
          estrato, barrio, ciudad_id, telefono, telefono_2, email, 
          fecha_registro, fecha_inicio_servicio, fecha_fin_servicio, estado, 
          mac_address, ip_asignada, tap, puerto, numero_contrato, ruta, 
          requiere_reconexion, codigo_usuario, observaciones, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        datos.identificacion,
        datos.tipo_documento || 'cedula',
        datos.nombre,
        datos.direccion,
        datos.sector_id || null,
        datos.estrato || null,
        datos.barrio || null,
        datos.ciudad_id || null,
        datos.telefono || null,
        datos.telefono_2 || null,
        datos.email || null,
        datos.fecha_registro || new Date().toISOString().split('T')[0],
        datos.fecha_inicio_servicio || null,
        datos.fecha_fin_servicio || null,
        datos.estado || 'activo',
        datos.mac_address || null,
        datos.ip_asignada || null,
        datos.tap || null,
        datos.puerto || null,
        datos.numero_contrato || null,
        datos.ruta || null,
        datos.requiere_reconexion ? 1 : 0,
        datos.codigo_usuario || null,
        datos.observaciones || null,
        datos.activo !== undefined ? (datos.activo ? 1 : 0) : 1
      ];
      
      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, params);
      connection.release();
      
      return resultado.insertId;
    } catch (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }
  }

  // Actualizar cliente
  static async actualizar(id, datos) {
    try {
      // CORRECCIÓN: Construir query dinámicamente solo con campos proporcionados
      const camposActualizacion = [];
      const params = [];
      
      const camposPermitidos = [
        'identificacion', 'tipo_documento', 'nombre', 'direccion', 'sector_id',
        'estrato', 'barrio', 'ciudad_id', 'telefono', 'telefono_2', 'email',
        'fecha_registro', 'fecha_inicio_servicio', 'fecha_fin_servicio', 'estado',
        'mac_address', 'ip_asignada', 'tap', 'puerto', 'numero_contrato', 'ruta',
        'requiere_reconexion', 'codigo_usuario', 'observaciones', 'activo'
      ];
      
      camposPermitidos.forEach(campo => {
        if (datos.hasOwnProperty(campo)) {
          camposActualizacion.push(`${campo} = ?`);
          
          // Manejar campos boolean
          if (campo === 'requiere_reconexion' || campo === 'activo') {
            params.push(datos[campo] ? 1 : 0);
          } else {
            params.push(datos[campo]);
          }
        }
      });
      
      if (camposActualizacion.length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      const query = `
        UPDATE clientes 
        SET ${camposActualizacion.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;
      
      params.push(id);
      
      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, params);
      connection.release();
      
      if (resultado.affectedRows === 0) {
        throw new Error('Cliente no encontrado');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }
  }

  // Eliminar cliente
  static async eliminar(id) {
    try {
      // Verificar si el cliente existe
      const clienteExistente = await this.obtenerPorId(id);
      if (!clienteExistente) {
        throw new Error('Cliente no encontrado');
      }

      // Verificar si tiene servicios activos (facturas, instalaciones, etc.)
      const connection = await pool.getConnection();
      
      const [facturas] = await connection.execute(
        'SELECT COUNT(*) as count FROM facturas WHERE cliente_id = ?',
        [id]
      );
      
      if (facturas[0].count > 0) {
        connection.release();
        throw new Error('No se puede eliminar el cliente porque tiene facturas asociadas');
      }
      
      // Realizar eliminación
      const [resultado] = await connection.execute(
        'DELETE FROM clientes WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      if (resultado.affectedRows === 0) {
        throw new Error('No se pudo eliminar el cliente');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Error al eliminar cliente: ${error.message}`);
    }
  }

  // Buscar clientes
  static async buscar(termino, filtros = {}) {
    try {
      let query = `
        SELECT 
          c.id, c.identificacion, c.nombre, c.direccion, c.telefono, 
          c.estado, s.codigo as sector_codigo, s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE (
          c.identificacion LIKE ? OR 
          c.nombre LIKE ? OR 
          c.telefono LIKE ? OR
          c.telefono_2 LIKE ?
        )
      `;
      
      const params = [
        `%${termino}%`,
        `%${termino}%`,
        `%${termino}%`,
        `%${termino}%`
      ];
      
      if (filtros.estado) {
        query += ' AND c.estado = ?';
        params.push(filtros.estado);
      }
      
      query += ' ORDER BY c.nombre ASC LIMIT 50';
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();
      
      return filas;
    } catch (error) {
      throw new Error(`Error al buscar clientes: ${error.message}`);
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas() {
    try {
      const connection = await pool.getConnection();
      
      // Estadísticas básicas
      const [estadisticasBasicas] = await connection.execute(`
        SELECT 
          COUNT(*) as total_clientes,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as suspendidos,
          SUM(CASE WHEN estado = 'cortado' THEN 1 ELSE 0 END) as cortados,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as nuevos_hoy,
          SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as nuevos_semana
        FROM clientes
      `);
      
      // Estadísticas por ciudad
      const [estadisticasCiudad] = await connection.execute(`
        SELECT 
          ci.nombre as ciudad,
          COUNT(*) as cantidad
        FROM clientes c
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        GROUP BY c.ciudad_id, ci.nombre
        ORDER BY cantidad DESC
        LIMIT 10
      `);
      
      // Estadísticas por sector
      const [estadisticasSector] = await connection.execute(`
        SELECT 
          s.codigo, s.nombre as sector,
          COUNT(*) as cantidad
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE s.codigo IS NOT NULL
        GROUP BY c.sector_id, s.codigo, s.nombre
        ORDER BY cantidad DESC
        LIMIT 10
      `);
      
      connection.release();
      
      return {
        basicas: estadisticasBasicas[0],
        por_ciudad: estadisticasCiudad,
        por_sector: estadisticasSector
      };
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = Cliente;