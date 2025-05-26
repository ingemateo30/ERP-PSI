const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'base_psi',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

const pool = mysql.createPool(dbConfig);

pool.getConnection()
  .then(connection => {
    logger.info('Conexión a MySQL establecida correctamente');
    connection.release();
  })
  .catch(error => {
    logger.error('Error conectando a MySQL:', error.message);
  });

module.exports = pool;