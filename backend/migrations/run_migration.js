// backend/migrations/run_migration.js
// Script para ejecutar la migración de la tabla de notificaciones

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Iniciando migración de tabla de notificaciones...');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create_notificaciones_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Archivo SQL leído correctamente');

    // Obtener conexión
    const connection = await pool.getConnection();

    console.log('✅ Conexión a la base de datos establecida');

    // Ejecutar el SQL
    await connection.query(sql);

    console.log('✅ Tabla de notificaciones creada exitosamente');

    // Verificar que la tabla se creó
    const [tables] = await connection.query("SHOW TABLES LIKE 'notificaciones'");

    if (tables.length > 0) {
      console.log('✅ Verificación exitosa: Tabla "notificaciones" existe en la base de datos');

      // Mostrar estructura de la tabla
      const [columns] = await connection.query('DESCRIBE notificaciones');
      console.log('\n📋 Estructura de la tabla:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.error('❌ Error: La tabla no se creó correctamente');
    }

    connection.release();
    console.log('\n✅ Migración completada exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('\nDetalles del error:', error);
    process.exit(1);
  }
}

// Ejecutar la migración
runMigration();
