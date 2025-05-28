// backend/controllers/banksController.js

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class BanksController {
  
  // Obtener todos los bancos
  static async getBanks(req, res) {
    try {
      const { activo } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          b.*,
          COUNT(p.id) as total_pagos
        FROM bancos b
        LEFT JOIN pagos p ON b.id = p.banco_id
      `;
      
      let params = [];
      
      if (activo !== undefined) {
        query += ' WHERE b.activo = ?';
        params.push(activo === 'true' ? 1 : 0);
      }
      
      query += ' GROUP BY b.id ORDER BY b.codigo ASC';
      
      const [banks] = await connection.execute(query, params);
      
      connection.release();
      
      return success(res, 'Bancos obtenidos exitosamente', banks);
      
    } catch (err) {
      logger.error('Error obteniendo bancos:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener banco por ID
  static async getBankById(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [banks] = await connection.execute(`
        SELECT 
          b.*,
          COUNT(p.id) as total_pagos,
          COALESCE(SUM(p.monto), 0) as total_monto_pagos
        FROM bancos b
        LEFT JOIN pagos p ON b.id = p.banco_id
        WHERE b.id = ?
        GROUP BY b.id
      `, [id]);
      
      connection.release();
      
      if (banks.length === 0) {
        return error(res, 'Banco no encontrado', 404);
      }
      
      return success(res, 'Banco obtenido exitosamente', banks[0]);
      
    } catch (err) {
      logger.error('Error obteniendo banco:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear banco
  static async createBank(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar si ya existe
      const [existing] = await connection.execute(
        'SELECT id FROM bancos WHERE codigo = ? OR nombre = ?',
        [codigo, nombre]
      );
      
      if (existing.length > 0) {
        connection.release();
        return error(res, 'Ya existe un banco con ese código o nombre', 400);
      }
      
      const [result] = await connection.execute(
        'INSERT INTO bancos (codigo, nombre, activo) VALUES (?, ?, 1)',
        [codigo, nombre]
      );
      
      // Obtener el banco creado
      const [newBank] = await connection.execute(
        'SELECT * FROM bancos WHERE id = ?',
        [result.insertId]
      );
      
      connection.release();
      
      logger.info('Banco creado', {
        bankId: result.insertId,
        codigo: codigo,
        nombre: nombre,
        createdBy: req.user.id
      });
      
      return success(res, 'Banco creado exitosamente', newBank[0], 201);
      
    } catch (err) {
      logger.error('Error creando banco:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar banco
  static async updateBank(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { id } = req.params;
      const { codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM bancos WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return error(res, 'Banco no encontrado', 404);
      }
      
      // Verificar duplicados (excluyendo el actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM bancos WHERE (codigo = ? OR nombre = ?) AND id != ?',
        [codigo, nombre, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return error(res, 'Ya existe otro banco con ese código o nombre', 400);
      }
      
      await connection.execute(
        'UPDATE bancos SET codigo = ?, nombre = ? WHERE id = ?',
        [codigo, nombre, id]
      );
      
      // Obtener banco actualizado
      const [updated] = await connection.execute(
        'SELECT * FROM bancos WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      logger.info('Banco actualizado', {
        bankId: id,
        updatedBy: req.user.id
      });
      
      return success(res, 'Banco actualizado exitosamente', updated[0]);
      
    } catch (err) {
      logger.error('Error actualizando banco:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Activar/desactivar banco
  static async toggleBank(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [bank] = await connection.execute(
        'SELECT * FROM bancos WHERE id = ?',
        [id]
      );
      
      if (bank.length === 0) {
        connection.release();
        return error(res, 'Banco no encontrado', 404);
      }
      
      const newStatus = bank[0].activo ? 0 : 1;
      
      await connection.execute(
        'UPDATE bancos SET activo = ? WHERE id = ?',
        [newStatus, id]
      );
      
      connection.release();
      
      logger.info('Estado de banco cambiado', {
        bankId: id,
        newStatus: newStatus,
        changedBy: req.user.id
      });
      
      return success(res, `Banco ${newStatus ? 'activado' : 'desactivado'} exitosamente`, {
        activo: newStatus === 1
      });
      
    } catch (err) {
      logger.error('Error cambiando estado del banco:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Eliminar banco (solo si no tiene pagos asociados)
  static async deleteBank(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [bank] = await connection.execute(
        'SELECT * FROM bancos WHERE id = ?',
        [id]
      );
      
      if (bank.length === 0) {
        connection.release();
        return error(res, 'Banco no encontrado', 404);
      }
      
      // Verificar si tiene pagos asociados
      const [payments] = await connection.execute(
        'SELECT COUNT(*) as count FROM pagos WHERE banco_id = ?',
        [id]
      );
      
      if (payments[0].count > 0) {
        connection.release();
        return error(res, 'No se puede eliminar el banco porque tiene pagos asociados', 400);
      }
      
      await connection.execute(
        'DELETE FROM bancos WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      logger.info('Banco eliminado', {
        bankId: id,
        deletedBy: req.user.id
      });
      
      return success(res, 'Banco eliminado exitosamente');
      
    } catch (err) {
      logger.error('Error eliminando banco:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener estadísticas de bancos
  static async getBankStats(req, res) {
    try {
      const connection = await pool.getConnection();
      
      // Estadísticas generales
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_bancos,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as bancos_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as bancos_inactivos
        FROM bancos
      `);
      
      // Bancos con más pagos
      const [topBanks] = await connection.execute(`
        SELECT 
          b.codigo,
          b.nombre,
          COUNT(p.id) as total_pagos,
          COALESCE(SUM(p.monto), 0) as total_monto
        FROM bancos b
        LEFT JOIN pagos p ON b.id = p.banco_id
        WHERE b.activo = 1
        GROUP BY b.id, b.codigo, b.nombre
        ORDER BY total_pagos DESC
        LIMIT 5
      `);
      
      connection.release();
      
      return success(res, 'Estadísticas obtenidas exitosamente', {
        ...stats[0],
        bancos_mas_usados: topBanks
      });
      
    } catch (err) {
      logger.error('Error obteniendo estadísticas de bancos:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = BanksController;