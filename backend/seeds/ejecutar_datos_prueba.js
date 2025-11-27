/**
 * Script para ejecutar los datos de prueba de facturación
 *
 * Uso:
 *   node backend/seeds/ejecutar_datos_prueba.js
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function ejecutarSQL() {
  let connection;

  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await pool.getConnection();
    console.log('✅ Conexión establecida');

    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, 'datos_prueba_facturacion.sql');
    console.log(`📄 Leyendo archivo: ${sqlFilePath}`);

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir por sentencias SQL (separadas por punto y coma)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Filtrar comentarios y líneas vacías
        return stmt.length > 0 &&
               !stmt.startsWith('--') &&
               !stmt.startsWith('/*') &&
               stmt !== '';
      });

    console.log(`📊 Se ejecutarán ${statements.length} sentencias SQL\n`);

    let successCount = 0;
    let errorCount = 0;

    // Ejecutar cada sentencia
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        const [result] = await connection.query(statement);
        successCount++;

        // Mostrar progreso cada 5 sentencias
        if ((i + 1) % 5 === 0) {
          console.log(`⏳ Progreso: ${i + 1}/${statements.length} sentencias ejecutadas`);
        }

        // Si es un SELECT, mostrar resultados
        if (statement.trim().toUpperCase().startsWith('SELECT')) {
          if (Array.isArray(result) && result.length > 0) {
            console.log('\n📋 Resultado de consulta:');
            console.table(result);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`\n❌ Error en sentencia ${i + 1}:`, error.message);
        console.error(`Sentencia: ${statement.substring(0, 100)}...`);

        // Continuar con la siguiente sentencia (no detener por errores)
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ EJECUCIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log(`✓ Sentencias exitosas: ${successCount}`);
    console.log(`✗ Sentencias con error: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Mostrar resumen de datos creados
    console.log('📊 Consultando datos creados...\n');

    const [clientes] = await connection.query(`
      SELECT
        identificacion,
        nombre,
        estrato,
        fecha_registro,
        estado
      FROM clientes
      WHERE identificacion LIKE 'TEST%'
      ORDER BY identificacion
    `);

    console.log('👥 CLIENTES DE PRUEBA CREADOS:');
    console.table(clientes);

    const [facturas] = await connection.query(`
      SELECT
        f.numero_factura,
        c.nombre AS cliente,
        f.fecha_desde,
        f.fecha_hasta,
        DATEDIFF(f.fecha_hasta, f.fecha_desde) + 1 AS dias,
        f.total,
        f.estado
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      WHERE c.identificacion LIKE 'TEST%'
      ORDER BY c.identificacion, f.fecha_emision
    `);

    console.log('\n📄 FACTURAS CREADAS:');
    console.table(facturas);

    const [resumen] = await connection.query(`
      SELECT
        c.identificacion,
        c.nombre,
        COUNT(f.id) AS total_facturas,
        SUM(f.total) AS total_facturado
      FROM clientes c
      LEFT JOIN facturas f ON c.id = f.cliente_id
      WHERE c.identificacion LIKE 'TEST%'
      GROUP BY c.id, c.identificacion, c.nombre
      ORDER BY c.identificacion
    `);

    console.log('\n💰 RESUMEN POR CLIENTE:');
    console.table(resumen);

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
      console.log('\n🔌 Conexión cerrada');
    }
    await pool.end();
  }
}

// Ejecutar
console.log('\n' + '='.repeat(60));
console.log('🚀 INICIANDO CARGA DE DATOS DE PRUEBA');
console.log('='.repeat(60) + '\n');

ejecutarSQL()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
