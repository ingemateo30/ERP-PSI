// backend/controllers/TrasladosController.js
// Gestión de traslados de clientes: cuando un suscriptor cambia de dirección
const { Database } = require('../models/Database');
const pool = require('../config/database');

class TrasladosController {

  // ── Crear traslado programado ────────────────────────────────────────────
  static async crear(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        cliente_id,
        servicio_cliente_id,
        // Nueva ubicación
        direccion_nueva, barrio_nuevo,
        ciudad_nueva_id, sector_nuevo_id,
        // Logística
        instalador_id,
        fecha_programada, hora_programada,
        persona_recibe,
        // Cobro de instalación
        cobra_instalacion = false,
        costo_instalacion = 0,
        // ¿Actualizar dirección del cliente al completar?
        actualizar_direccion = true,
        observaciones = ''
      } = req.body;

      if (!cliente_id || !direccion_nueva || !fecha_programada) {
        return res.status(400).json({
          success: false,
          message: 'cliente_id, direccion_nueva y fecha_programada son requeridos'
        });
      }

      // Obtener datos actuales del cliente
      const [clientes] = await connection.execute(
        `SELECT id, nombre, direccion, barrio, ciudad_id, sector_id, telefono FROM clientes WHERE id = ?`,
        [cliente_id]
      );
      if (clientes.length === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      const cliente = clientes[0];

      // Insertar orden de traslado (usa tabla instalaciones con tipo_orden='traslado')
      const [result] = await connection.execute(`
        INSERT INTO instalaciones (
          cliente_id, servicio_cliente_id, instalador_id,
          fecha_programada, hora_programada,
          estado, tipo_instalacion, tipo_orden,
          direccion_instalacion, barrio, telefono_contacto, persona_recibe,
          observaciones, costo_instalacion,
          direccion_anterior, ciudad_anterior_id, sector_anterior_id,
          nueva_ciudad_id, nuevo_sector_id, actualizar_direccion_cliente,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'programada', 'nueva', 'traslado',
                  ?, ?, ?, ?, ?, ?,
                  ?, ?, ?,
                  ?, ?, ?,
                  NOW(), NOW())
      `, [
        cliente_id,
        servicio_cliente_id || null,
        instalador_id || null,
        fecha_programada,
        hora_programada || '08:00:00',
        direccion_nueva,
        barrio_nuevo || cliente.barrio || '',
        cliente.telefono || '',
        persona_recibe || cliente.nombre,
        observaciones,
        cobra_instalacion ? parseFloat(costo_instalacion) || 0 : 0,
        // dirección anterior (actual del cliente)
        cliente.direccion || '',
        cliente.ciudad_id || null,
        cliente.sector_id || null,
        // nueva ubicación
        ciudad_nueva_id || cliente.ciudad_id || null,
        sector_nuevo_id || cliente.sector_id || null,
        actualizar_direccion ? 1 : 0
      ]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Traslado programado exitosamente',
        data: {
          traslado_id: result.insertId,
          cliente: cliente.nombre,
          direccion_anterior: cliente.direccion,
          direccion_nueva,
          fecha_programada,
          cobra_instalacion: !!cobra_instalacion,
          costo_instalacion: cobra_instalacion ? parseFloat(costo_instalacion) || 0 : 0
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creando traslado:', error);
      res.status(500).json({ success: false, message: 'Error creando traslado', error: error.message });
    } finally {
      connection.release();
    }
  }

  // ── Listar traslados con filtros y paginación ────────────────────────────
  static async listar(req, res) {
    try {
      const {
        page = 1, limit = 20,
        estado, cliente_id, instalador_id,
        fecha_desde, fecha_hasta, search
      } = req.query;

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Sede filter para secretaria/supervisor
      const sedeId = req.user?.rol === 'administrador' ? null : req.user?.sede_id;

      const whereParts = [`i.tipo_orden = 'traslado'`];
      const params = [];

      if (estado)      { whereParts.push('i.estado = ?');               params.push(estado); }
      if (cliente_id)  { whereParts.push('i.cliente_id = ?');           params.push(cliente_id); }
      if (instalador_id){ whereParts.push('i.instalador_id = ?');       params.push(instalador_id); }
      if (fecha_desde) { whereParts.push('i.fecha_programada >= ?');    params.push(fecha_desde); }
      if (fecha_hasta) { whereParts.push('i.fecha_programada <= ?');    params.push(fecha_hasta); }
      if (sedeId)      { whereParts.push('c.ciudad_id = ?');            params.push(sedeId); }
      if (search) {
        whereParts.push('(c.nombre LIKE ? OR c.identificacion LIKE ? OR i.direccion_instalacion LIKE ? OR i.direccion_anterior LIKE ?)');
        const t = `%${search}%`;
        params.push(t, t, t, t);
      }

      const where = 'WHERE ' + whereParts.join(' AND ');

      const countResult = await Database.query(
        `SELECT COUNT(*) AS total FROM instalaciones i
         LEFT JOIN clientes c ON i.cliente_id = c.id
         ${where}`, params
      );
      const total = countResult[0]?.total || 0;

      const traslados = await Database.query(`
        SELECT
          i.id, i.cliente_id,
          c.nombre AS cliente_nombre, c.identificacion AS cliente_identificacion,
          c.telefono AS cliente_telefono,
          i.fecha_programada, i.hora_programada, i.fecha_realizada,
          i.estado,
          i.direccion_anterior,
          i.ciudad_anterior_id, ci_ant.nombre AS ciudad_anterior,
          i.direccion_instalacion AS direccion_nueva, i.barrio AS barrio_nuevo,
          i.nueva_ciudad_id, ci_new.nombre AS ciudad_nueva,
          i.nuevo_sector_id, s_new.nombre AS sector_nuevo,
          i.costo_instalacion, i.actualizar_direccion_cliente,
          i.instalador_id,
          CONCAT(u.nombre, ' ', COALESCE(u.apellido,'')) AS instalador_nombre,
          i.persona_recibe, i.observaciones, i.fotos_instalacion,
          i.created_at
        FROM instalaciones i
        LEFT JOIN clientes c      ON i.cliente_id       = c.id
        LEFT JOIN ciudades ci_ant ON i.ciudad_anterior_id = ci_ant.id
        LEFT JOIN ciudades ci_new ON i.nueva_ciudad_id   = ci_new.id
        LEFT JOIN sectores s_new  ON i.nuevo_sector_id   = s_new.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id  = u.id
        ${where}
        ORDER BY i.fecha_programada DESC, i.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `, params);

      res.json({
        success: true,
        data: {
          traslados,
          pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
        }
      });

    } catch (error) {
      console.error('❌ Error listando traslados:', error);
      res.status(500).json({ success: false, message: 'Error listando traslados', error: error.message });
    }
  }

  // ── Completar traslado: marcar completado + actualizar dirección del cliente ──
  static async completar(req, res) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { observaciones_finales, fotos, coordenadas_lat, coordenadas_lng } = req.body;

      const [rows] = await connection.execute(`
        SELECT i.*, c.nombre AS cliente_nombre
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        WHERE i.id = ? AND i.tipo_orden = 'traslado'
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Traslado no encontrado' });
      }

      const t = rows[0];

      if (t.estado === 'completada') {
        return res.status(400).json({ success: false, message: 'El traslado ya fue completado' });
      }

      // Actualizar instalación
      await connection.execute(`
        UPDATE instalaciones SET
          estado = 'completada',
          fecha_realizada = CURDATE(),
          hora_fin = CURTIME(),
          observaciones = CONCAT(COALESCE(observaciones,''), IF(? != '', CONCAT(' | ', ?), '')),
          fotos_instalacion = COALESCE(?, fotos_instalacion),
          coordenadas_lat = COALESCE(?, coordenadas_lat),
          coordenadas_lng = COALESCE(?, coordenadas_lng),
          updated_at = NOW()
        WHERE id = ?
      `, [
        observaciones_finales || '', observaciones_finales || '',
        fotos ? JSON.stringify(fotos) : null,
        coordenadas_lat || null,
        coordenadas_lng || null,
        id
      ]);

      // Actualizar dirección del cliente si aplica
      if (t.actualizar_direccion_cliente) {
        await connection.execute(`
          UPDATE clientes SET
            direccion  = ?,
            barrio     = COALESCE(NULLIF(?,''), barrio),
            ciudad_id  = COALESCE(?, ciudad_id),
            sector_id  = COALESCE(?, sector_id),
            updated_at = NOW()
          WHERE id = ?
        `, [
          t.direccion_instalacion,
          t.barrio || '',
          t.nueva_ciudad_id || null,
          t.nuevo_sector_id || null,
          t.cliente_id
        ]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Traslado completado para ${t.cliente_nombre}`,
        data: {
          direccion_actualizada: t.actualizar_direccion_cliente ? t.direccion_instalacion : null,
          cobra_instalacion: parseFloat(t.costo_instalacion) > 0
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error completando traslado:', error);
      res.status(500).json({ success: false, message: 'Error completando traslado', error: error.message });
    } finally {
      connection.release();
    }
  }

  // ── Traslados de un cliente ──────────────────────────────────────────────
  static async porCliente(req, res) {
    try {
      const { clienteId } = req.params;
      const traslados = await Database.query(`
        SELECT i.*,
          ci_ant.nombre AS ciudad_anterior, ci_new.nombre AS ciudad_nueva
        FROM instalaciones i
        LEFT JOIN ciudades ci_ant ON i.ciudad_anterior_id = ci_ant.id
        LEFT JOIN ciudades ci_new ON i.nueva_ciudad_id    = ci_new.id
        WHERE i.cliente_id = ? AND i.tipo_orden = 'traslado'
        ORDER BY i.created_at DESC
      `, [clienteId]);

      res.json({ success: true, data: traslados });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error obteniendo traslados del cliente', error: error.message });
    }
  }

  // ── Cancelar traslado programado ─────────────────────────────────────────
  static async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      await Database.query(`
        UPDATE instalaciones SET
          estado = 'cancelada',
          observaciones = CONCAT(COALESCE(observaciones,''), ' | CANCELADO: ', ?),
          updated_at = NOW()
        WHERE id = ? AND tipo_orden = 'traslado' AND estado IN ('programada','reagendada')
      `, [motivo || 'Sin motivo especificado', id]);

      res.json({ success: true, message: 'Traslado cancelado' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error cancelando traslado', error: error.message });
    }
  }

  // ── Estadísticas de traslados ────────────────────────────────────────────
  static async estadisticas(req, res) {
    try {
      const sedeId = req.user?.rol === 'administrador' ? null : req.user?.sede_id;
      const sedeJoin = sedeId ? ' INNER JOIN clientes c ON i.cliente_id = c.id' : '';
      const sedeWhere = sedeId ? ` AND c.ciudad_id = ?` : '';
      const sedeParam = sedeId ? [sedeId] : [];

      const [stats] = await Database.query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN i.estado = 'programada'  THEN 1 ELSE 0 END) AS programados,
          SUM(CASE WHEN i.estado = 'en_proceso'  THEN 1 ELSE 0 END) AS en_proceso,
          SUM(CASE WHEN i.estado = 'completada'  THEN 1 ELSE 0 END) AS completados,
          SUM(CASE WHEN i.estado = 'cancelada'   THEN 1 ELSE 0 END) AS cancelados,
          SUM(CASE WHEN i.estado = 'completada' AND MONTH(i.fecha_realizada) = MONTH(CURDATE())
                        AND YEAR(i.fecha_realizada) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS completados_mes,
          SUM(CASE WHEN i.estado = 'programada' AND i.fecha_programada < CURDATE() THEN 1 ELSE 0 END) AS atrasados,
          COALESCE(SUM(CASE WHEN i.costo_instalacion > 0 THEN i.costo_instalacion ELSE 0 END), 0) AS ingresos_traslados
        FROM instalaciones i${sedeJoin}
        WHERE i.tipo_orden = 'traslado'${sedeWhere}
      `, sedeParam);

      res.json({ success: true, data: stats[0] || {} });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas', error: error.message });
    }
  }
}

module.exports = TrasladosController;
