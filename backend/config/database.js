const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'base_psi',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  charset: 'utf8mb4',
  timezone: '+00:00',
  waitForConnections: true,
  queueLimit: 0,
  idleTimeout: 60000,
  maxIdle: 10
};

console.log('Configuración de base de datos:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

const pool = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
}

testConnection();

module.exports = pool;