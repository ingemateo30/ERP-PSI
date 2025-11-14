// Script para ejecutar migración de base de datos
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/database');

async function ejecutarMigracion() {
  let connection;
  try {
    console.log('🔄 Iniciando migración: Permitir clientes con múltiples direcciones...');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '001_permitir_clientes_multiples_direcciones.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Obtener conexión
    connection = await pool.getConnection();

    // Dividir por statements (separados por punto y coma)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    console.log(`📝 Ejecutando ${statements.length} statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`   [${i + 1}/${statements.length}] Ejecutando...`);
          await connection.execute(statement);
          console.log(`   ✅ Statement ${i + 1} ejecutado correctamente`);
        } catch (error) {
          // Si el error es que el índice no existe, continuar
          if (error.message.includes("Can't DROP") || error.message.includes("check that")) {
            console.log(`   ⚠️  Statement ${i + 1} saltado: ${error.message}`);
          } else if (error.message.includes("Duplicate key")) {
            console.log(`   ⚠️  Índice ya existe, continuando...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('📋 RESUMEN DE CAMBIOS:');
    console.log('   - Eliminado UNIQUE constraint de columna identificacion');
    console.log('   - Ahora es posible crear múltiples clientes con la misma identificación');
    console.log('   - Cada cliente puede tener diferente dirección y ciudad');
    console.log('   - Se mantienen índices para búsquedas rápidas');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

// Ejecutar migración
ejecutarMigracion();
