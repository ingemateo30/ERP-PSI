// backend/models/notificacion.js

const pool = require('../config/database');

class Notificacion {
  // Crear nueva notificación
  static async crear(datos) {
    try {
      const query = `
        INSERT INTO notificaciones (
          usuario_id, tipo, titulo, mensaje, datos_adicionales, leida
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        datos.usuario_id || null, // null significa para todos los usuarios del rol
        datos.tipo,
        datos.titulo,
        datos.mensaje,
        datos.datos_adicionales ? JSON.stringify(datos.datos_adicionales) : null,
        0 // no leída por defecto
      ];

      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, params);
      connection.release();

      return resultado.insertId;
    } catch (error) {
      console.error('Error al crear notificación:', error);
      throw new Error(`Error al crear notificación: ${error.message}`);
    }
  }

  // Obtener notificaciones por usuario con filtros por rol
  static async obtenerPorUsuario(usuarioId, rol, filtros = {}) {
    try {
      let query = `
        SELECT
          n.*,
          DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as fecha_formateada
        FROM notificaciones n
        WHERE (n.usuario_id = ? OR n.usuario_id IS NULL)
      `;

      const params = [usuarioId];

      // Filtrar por tipo si se proporciona
      if (filtros.tipo) {
        query += ' AND n.tipo = ?';
        params.push(filtros.tipo);
      }

      // Filtrar por leídas/no leídas
      if (filtros.leida !== undefined) {
        query += ' AND n.leida = ?';
        params.push(filtros.leida ? 1 : 0);
      }

      // Filtrar solo las últimas X horas/días según el rol
      if (rol === 'administrador' || rol === 'supervisor') {
        // Administradores y supervisores ven todas las notificaciones recientes
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (rol === 'instalador') {
        // Instaladores solo ven notificaciones de instalaciones
        query += ' AND n.tipo IN ("nueva_instalacion", "instalacion_actualizada", "bienvenida")';
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)';
      }

      query += ' ORDER BY n.created_at DESC';

      // Limitar resultados
      const limite = filtros.limite || 50;
      query += ` LIMIT ${parseInt(limite)}`;

      console.log('🔍 Query de notificaciones:', query);
      console.log('📊 Parámetros:', params);

      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();

      console.log('📬 Filas obtenidas de BD:', filas.length);

      // Parsear datos adicionales
      return filas.map(fila => ({
        ...fila,
        datos_adicionales: fila.datos_adicionales ? JSON.parse(fila.datos_adicionales) : null
      }));
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      throw new Error(`Error al obtener notificaciones: ${error.message}`);
    }
  }

  // Marcar notificación como leída
  static async marcarComoLeida(id, usuarioId) {
    try {
      const query = `
        UPDATE notificaciones
        SET leida = 1, fecha_lectura = NOW()
        WHERE id = ? AND (usuario_id = ? OR usuario_id IS NULL)
      `;

      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, [id, usuarioId]);
      connection.release();

      return resultado.affectedRows > 0;
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      throw new Error(`Error al marcar notificación como leída: ${error.message}`);
    }
  }

  // Marcar todas las notificaciones como leídas
  static async marcarTodasComoLeidas(usuarioId) {
    try {
      const query = `
        UPDATE notificaciones
        SET leida = 1, fecha_lectura = NOW()
        WHERE (usuario_id = ? OR usuario_id IS NULL) AND leida = 0
      `;

      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, [usuarioId]);
      connection.release();

      return resultado.affectedRows;
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      throw new Error(`Error al marcar todas como leídas: ${error.message}`);
    }
  }

  // Contar notificaciones no leídas
  static async contarNoLeidas(usuarioId, rol) {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM notificaciones
        WHERE (usuario_id = ? OR usuario_id IS NULL) AND leida = 0
      `;

      const params = [usuarioId];

      // Filtrar por rol
      if (rol === 'instalador') {
        query += ' AND tipo IN ("nueva_instalacion", "instalacion_actualizada", "bienvenida")';
      }

      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();

      console.log(`🔢 Conteo de notificaciones no leídas para usuario ${usuarioId} (${rol}):`, filas[0].total);

      return filas[0].total;
    } catch (error) {
      console.error('Error al contar notificaciones no leídas:', error);
      throw new Error(`Error al contar notificaciones no leídas: ${error.message}`);
    }
  }

  // Eliminar notificación
  static async eliminar(id, usuarioId) {
    try {
      const query = `
        DELETE FROM notificaciones
        WHERE id = ? AND (usuario_id = ? OR usuario_id IS NULL)
      `;

      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, [id, usuarioId]);
      connection.release();

      return resultado.affectedRows > 0;
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      throw new Error(`Error al eliminar notificación: ${error.message}`);
    }
  }

  // Limpiar notificaciones antiguas
  static async limpiarAntiguas(dias = 30) {
    try {
      const query = `
        DELETE FROM notificaciones
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      const connection = await pool.getConnection();
      const [resultado] = await connection.execute(query, [dias]);
      connection.release();

      return resultado.affectedRows;
    } catch (error) {
      console.error('Error al limpiar notificaciones antiguas:', error);
      throw new Error(`Error al limpiar notificaciones antiguas: ${error.message}`);
    }
  }

  // Crear notificación de nuevo cliente
  static async notificarNuevoCliente(clienteId, clienteNombre) {
    try {
      const notificacion = {
        tipo: 'nuevo_cliente',
        titulo: 'Nuevo Cliente Registrado',
        mensaje: `Se ha registrado un nuevo cliente: ${clienteNombre}`,
        datos_adicionales: {
          cliente_id: clienteId,
          cliente_nombre: clienteNombre
        }
      };

      return await this.crear(notificacion);
    } catch (error) {
      console.error('Error al notificar nuevo cliente:', error);
      throw error;
    }
  }

  // Crear notificación de nueva instalación
  static async notificarNuevaInstalacion(instalacionId, clienteNombre, instaladorId = null) {
    try {
      const notificacion = {
        usuario_id: instaladorId, // Si hay instalador asignado, enviar a él específicamente
        tipo: 'nueva_instalacion',
        titulo: 'Nueva Instalación Programada',
        mensaje: `Se ha programado una nueva instalación para el cliente: ${clienteNombre}`,
        datos_adicionales: {
          instalacion_id: instalacionId,
          cliente_nombre: clienteNombre
        }
      };

      return await this.crear(notificacion);
    } catch (error) {
      console.error('Error al notificar nueva instalación:', error);
      throw error;
    }
  }
}

module.exports = Notificacion;
