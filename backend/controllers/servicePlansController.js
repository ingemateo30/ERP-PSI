// backend/controllers/servicePlansController.js

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class ServicePlansController {
  
  // Obtener todos los planes
  static async getServicePlans(req, res) {
    try {
      const { tipo, activo } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          ps.*,
          COUNT(sc.id) as clientes_suscritos
        FROM planes_servicio ps
        LEFT JOIN servicios_cliente sc ON ps.id = sc.plan_id AND sc.estado = 'activo'
      `;
      
      let whereConditions = [];
      let params = [];
      
      if (tipo) {
        whereConditions.push('ps.tipo = ?');
        params.push(tipo);
      }
      
      if (activo !== undefined) {
        whereConditions.push('ps.activo = ?');
        params.push(activo === 'true' ? 1 : 0);
      }
      
      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' GROUP BY ps.id ORDER BY ps.tipo ASC, ps.precio ASC';
      
      const [plans] = await connection.execute(query, params);
      
      connection.release();
      
      return success(res, 'Planes obtenidos exitosamente', plans);
      
    } catch (err) {
      logger.error('Error obteniendo planes de servicio:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener plan por ID
  static async getServicePlanById(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [plans] = await connection.execute(`
        SELECT 
          ps.*,
          COUNT(sc.id) as clientes_suscritos,
          COALESCE(SUM(CASE WHEN sc.estado = 'activo' THEN 1 ELSE 0 END), 0) as clientes_activos
        FROM planes_servicio ps
        LEFT JOIN servicios_cliente sc ON ps.id = sc.plan_id
        WHERE ps.id = ?
        GROUP BY ps.id
      `, [id]);
      
      connection.release();
      
      if (plans.length === 0) {
        return error(res, 'Plan de servicio no encontrado', 404);
      }
      
      return success(res, 'Plan obtenido exitosamente', plans[0]);
      
    } catch (err) {
      logger.error('Error obteniendo plan de servicio:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear plan
  static async createServicePlan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const {
        codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada,
        canales_tv, descripcion, aplica_iva
      } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar si ya existe
      const [existing] = await connection.execute(
        'SELECT id FROM planes_servicio WHERE codigo = ?',
        [codigo]
      );
      
      if (existing.length > 0) {
        connection.release();
        return error(res, 'Ya existe un plan con ese código', 400);
      }
      
      const [result] = await connection.execute(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada,
          canales_tv, descripcion, aplica_iva, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        codigo, nombre, tipo, precio, velocidad_subida || null, velocidad_bajada || null,
        canales_tv || null, descripcion || null, aplica_iva ? 1 : 0
      ]);
      
      // Obtener el plan creado
      const [newPlan] = await connection.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [result.insertId]
      );
      
      connection.release();
      
      logger.info('Plan de servicio creado', {
        planId: result.insertId,
        codigo: codigo,
        nombre: nombre,
        tipo: tipo,
        precio: precio,
        createdBy: req.user.id
      });
      
      return success(res, 'Plan creado exitosamente', newPlan[0], 201);
      
    } catch (err) {
      logger.error('Error creando plan de servicio:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar plan
  static async updateServicePlan(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { id } = req.params;
      const {
        codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada,
        canales_tv, descripcion, aplica_iva
      } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return error(res, 'Plan de servicio no encontrado', 404);
      }
      
      // Verificar código único (excluyendo el actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM planes_servicio WHERE codigo = ? AND id != ?',
        [codigo, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return error(res, 'Ya existe otro plan con ese código', 400);
      }
      
      await connection.execute(`
        UPDATE planes_servicio SET
          codigo = ?, nombre = ?, tipo = ?, precio = ?, velocidad_subida = ?,
          velocidad_bajada = ?, canales_tv = ?, descripcion = ?, aplica_iva = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        codigo, nombre, tipo, precio, velocidad_subida || null, velocidad_bajada || null,
        canales_tv || null, descripcion || null, aplica_iva ? 1 : 0, id
      ]);
      
      // Obtener plan actualizado
      const [updated] = await connection.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      logger.info('Plan de servicio actualizado', {
        planId: id,
        updatedBy: req.user.id
      });
      
      return success(res, 'Plan actualizado exitosamente', updated[0]);
      
    } catch (err) {
      logger.error('Error actualizando plan de servicio:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Activar/desactivar plan
  static async toggleServicePlan(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [plan] = await connection.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [id]
      );
      
      if (plan.length === 0) {
        connection.release();
        return error(res, 'Plan de servicio no encontrado', 404);
      }
      
      const newStatus = plan[0].activo ? 0 : 1;
      
      // Si se desactiva, verificar que no tenga clientes activos
      if (newStatus === 0) {
        const [activeClients] = await connection.execute(
          'SELECT COUNT(*) as count FROM servicios_cliente WHERE plan_id = ? AND estado = "activo"',
          [id]
        );
        
        if (activeClients[0].count > 0) {
          connection.release();
          return error(res, 'No se puede desactivar el plan porque tiene clientes activos', 400);
        }
      }
      
      await connection.execute(
        'UPDATE planes_servicio SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );
      
      connection.release();
      
      logger.info('Estado de plan cambiado', {
        planId: id,
        newStatus: newStatus,
        changedBy: req.user.id
      });
      
      return success(res, `Plan ${newStatus ? 'activado' : 'desactivado'} exitosamente`, {
        activo: newStatus === 1
      });
      
    } catch (err) {
      logger.error('Error cambiando estado del plan:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Eliminar plan (solo si no tiene clientes)
  static async deleteServicePlan(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [plan] = await connection.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [id]
      );
      
      if (plan.length === 0) {
        connection.release();
        return error(res, 'Plan de servicio no encontrado', 404);
      }
      
      // Verificar si tiene clientes asociados
      const [clients] = await connection.execute(
        'SELECT COUNT(*) as count FROM servicios_cliente WHERE plan_id = ?',
        [id]
      );
      
      if (clients[0].count > 0) {
        connection.release();
        return error(res, 'No se puede eliminar el plan porque tiene clientes asociados', 400);
      }
      
      await connection.execute(
        'DELETE FROM planes_servicio WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      logger.info('Plan de servicio eliminado', {
        planId: id,
        deletedBy: req.user.id
      });
      
      return success(res, 'Plan eliminado exitosamente');
      
    } catch (err) {
      logger.error('Error eliminando plan de servicio:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener estadísticas de planes
  static async getServicePlanStats(req, res) {
    try {
      const connection = await pool.getConnection();
      
      // Estadísticas generales
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_planes,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as planes_activos,
          SUM(CASE WHEN tipo = 'internet' THEN 1 ELSE 0 END) as planes_internet,
          SUM(CASE WHEN tipo = 'television' THEN 1 ELSE 0 END) as planes_tv,
          SUM(CASE WHEN tipo = 'combo' THEN 1 ELSE 0 END) as planes_combo,
          AVG(precio) as precio_promedio,
          MIN(precio) as precio_minimo,
          MAX(precio) as precio_maximo
        FROM planes_servicio
      `);
      
      // Planes más populares
      const [popularPlans] = await connection.execute(`
        SELECT 
          ps.codigo,
          ps.nombre,
          ps.tipo,
          ps.precio,
          COUNT(sc.id) as total_clientes
        FROM planes_servicio ps
        LEFT JOIN servicios_cliente sc ON ps.id = sc.plan_id AND sc.estado = 'activo'
        WHERE ps.activo = 1
        GROUP BY ps.id, ps.codigo, ps.nombre, ps.tipo, ps.precio
        ORDER BY total_clientes DESC
        LIMIT 5
      `);
      
      connection.release();
      
      return success(res, 'Estadísticas obtenidas exitosamente', {
        ...stats[0],
        planes_mas_populares: popularPlans
      });
      
    } catch (err) {
      logger.error('Error obteniendo estadísticas de planes:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener planes por tipo
  static async getServicePlansByType(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [results] = await connection.execute(`
        SELECT 
          tipo,
          COUNT(*) as total_planes,
          AVG(precio) as precio_promedio,
          MIN(precio) as precio_minimo,
          MAX(precio) as precio_maximo
        FROM planes_servicio
        WHERE activo = 1
        GROUP BY tipo
        ORDER BY tipo ASC
      `);
      
      connection.release();
      
      return success(res, 'Planes por tipo obtenidos exitosamente', results);
      
    } catch (err) {
      logger.error('Error obteniendo planes por tipo:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = ServicePlansController;