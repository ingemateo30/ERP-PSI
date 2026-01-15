// Script para ejecutar migraciones SQL
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  let connection;

  try {
    // Crear conexión usando las credenciales del .env
    require('dotenv').config({ path: path.join(__dirname, '../.env') });

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'erp_psi',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos');

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '../migrations/002_add_numero_orden_instalaciones.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración: 002_add_numero_orden_instalaciones.sql');

    // Ejecutar migración
    const [results] = await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente');

    // Verificar que la columna existe
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM instalaciones WHERE Field = 'numero_orden'"
    );

    if (columns.length > 0) {
      console.log('✅ Columna numero_orden verificada:', columns[0]);
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

runMigration();
