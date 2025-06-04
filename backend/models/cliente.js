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

  // Obtener cliente por ID
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
          ci.nombre as ciudad_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE c.identificacion = ?
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, [identificacion]);
      connection.release();
      
      return filas[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar cliente por identificación: ${error.message}`);
    }
  }

  // Crear nuevo cliente
  static async crear(datosCliente) {
    try {
      // Verificar si ya existe la identificación
      const clienteExistente = await this.obtenerPorIdentificacion(datosCliente.identificacion);
      if (clienteExistente) {
        throw new Error('Ya existe un cliente con esta identificación');
      }

      const query = `
        INSERT INTO clientes (
          identificacion, tipo_documento, nombre, direccion, sector_id,
          estrato, barrio, ciudad_id, telefono, telefono_2, correo,
          fecha_registro, fecha_hasta, estado, mac_address, ip_asignada,
          tap, poste, contrato, ruta, requiere_reconexion, codigo_usuario,
          observaciones, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const valores = [
        datosCliente.identificacion,
        datosCliente.tipo_documento || 'cedula',
        datosCliente.nombre,
        datosCliente.direccion,
        datosCliente.sector_id || null,
        datosCliente.estrato || null,
        datosCliente.barrio || null,
        datosCliente.ciudad_id || null,
        datosCliente.telefono || null,
        datosCliente.telefono_2 || null,
        datosCliente.correo || null,
        datosCliente.fecha_registro || new Date().toISOString().split('T')[0],
        datosCliente.fecha_hasta || null,
        datosCliente.estado || 'activo',
        datosCliente.mac_address || null,
        datosCliente.ip_asignada || null,
        datosCliente.tap || null,
        datosCliente.poste || null,
        datosCliente.contrato || null,
        datosCliente.ruta || null,
        datosCliente.requiere_reconexion || 0,
        datosCliente.codigo_usuario || null,
        datosCliente.observaciones || null,
        datosCliente.created_by || null
      ];
      
      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, valores);
      connection.release();
      
      return {
        id: resultado.insertId,
        ...datosCliente
      };
    } catch (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }
  }

  // Actualizar cliente
  static async actualizar(id, datosCliente) {
    try {
      // Verificar si el cliente existe
      const clienteExistente = await this.obtenerPorId(id);
      if (!clienteExistente) {
        throw new Error('Cliente no encontrado');
      }

      // Si se está cambiando la identificación, verificar que no exista otra
      if (datosCliente.identificacion && datosCliente.identificacion !== clienteExistente.identificacion) {
        const otroCliente = await this.obtenerPorIdentificacion(datosCliente.identificacion);
        if (otroCliente && otroCliente.id !== id) {
          throw new Error('Ya existe un cliente con esta identificación');
        }
      }

      const camposActualizar = [];
      const valores = [];
      
      // Construir query dinámicamente
      Object.keys(datosCliente).forEach(campo => {
        if (datosCliente[campo] !== undefined && campo !== 'id') {
          camposActualizar.push(`${campo} = ?`);
          valores.push(datosCliente[campo]);
        }
      });
      
      if (camposActualizar.length === 0) {
        throw new Error('No hay campos para actualizar');
      }
      
      valores.push(id);
      
      const query = `
        UPDATE clientes 
        SET ${camposActualizar.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;
      
      const connection = await pool.getConnection();
      await connection.execute(query, valores);
      connection.release();
      
      return await this.obtenerPorId(id);
    } catch (error) {
      throw new Error(`Error al actualizar cliente: ${error.message}`);
    }
  }

  // Eliminar cliente (soft delete)
  static async eliminar(id) {
    try {
      const cliente = await this.obtenerPorId(id);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Verificar si tiene servicios activos
      const connection = await pool.getConnection();
      
      const queryServicios = 'SELECT COUNT(*) as total FROM servicios_cliente WHERE cliente_id = ? AND estado = "activo"';
      const [servicios] = await connection.execute(queryServicios, [id]);
      
      if (servicios[0].total > 0) {
        connection.release();
        throw new Error('No se puede eliminar un cliente con servicios activos');
      }

      // Mover a clientes inactivos
      const queryInactivo = `
        INSERT INTO clientes_inactivos (
          identificacion, nombre, direccion, descripcion, fecha_inactivacion,
          barrio, sector_codigo, telefono, poste, estrato, motivo_inactivacion, cliente_id
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, 'ELIMINADO POR USUARIO', ?)
      `;
      
      await connection.execute(queryInactivo, [
        cliente.identificacion,
        cliente.nombre,
        cliente.direccion,
        'Cliente eliminado del sistema',
        cliente.barrio,
        cliente.sector_codigo,
        cliente.telefono,
        cliente.poste,
        cliente.estrato,
        id
      ]);

      // Eliminar cliente
      const queryEliminar = 'DELETE FROM clientes WHERE id = ?';
      await connection.execute(queryEliminar, [id]);
      
      connection.release();
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
          c.*,
          s.nombre as sector_nombre,
          ci.nombre as ciudad_nombre
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        WHERE (
          c.identificacion LIKE ? OR 
          c.nombre LIKE ? OR 
          c.telefono LIKE ? OR 
          c.telefono_2 LIKE ? OR
          c.direccion LIKE ?
        )
      `;
      
      const searchTerm = `%${termino}%`;
      const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      
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
      throw new Error(`Error en búsqueda de clientes: ${error.message}`);
    }
  }

  // Estadísticas de clientes
  static async obtenerEstadisticas() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as suspendidos,
          SUM(CASE WHEN estado = 'cortado' THEN 1 ELSE 0 END) as cortados,
          SUM(CASE WHEN estado = 'retirado' THEN 1 ELSE 0 END) as retirados,
          SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as inactivos,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as nuevos_hoy,
          SUM(CASE WHEN WEEK(created_at) = WEEK(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN 1 ELSE 0 END) as nuevos_semana,
          SUM(CASE WHEN MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) THEN 1 ELSE 0 END) as nuevos_mes
        FROM clientes
      `;
      
      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query);
      connection.release();
      
      return filas[0];
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }
}

module.exports = Cliente;