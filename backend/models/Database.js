const pool = require('../config/database');
const logger = require('../utils/logger');

class Database {
  static async query(sql, params = []) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('Error ejecutando query:', {
        error: error.message,
        sql: sql.substring(0, 100),
        params
      });
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  static async transaction(callback) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('Error en transacción:', error.message);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

async function connectDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    logger.error('Error conectando a la base de datos:', error.message);
    throw error;
  }
}

module.exports = { Database, connectDatabase };
