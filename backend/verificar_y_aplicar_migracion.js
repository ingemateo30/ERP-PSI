// Script para verificar y aplicar la migración de clientes
const pool = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function verificarYAplicarMigracion() {
  let conexion;

  try {
    console.log('🔌 Obteniendo conexión del pool...');
    conexion = await pool.getConnection();
    console.log('✅ Conectado exitosamente\n');

    // 1. Verificar estructura actual de la tabla clientes
    console.log('📋 Verificando estructura actual de tabla clientes...');
    const [indices] = await conexion.execute(`
      SHOW INDEX FROM clientes WHERE Key_name = 'identificacion'
    `);

    console.log('\n📊 Índices actuales para "identificacion":');
    if (indices.length > 0) {
      indices.forEach(idx => {
        console.log(`  - ${idx.Key_name} (Non_unique: ${idx.Non_unique})`);
      });

      // Verificar si es UNIQUE (Non_unique = 0)
      const esUnico = indices.some(idx => idx.Non_unique === 0);

      if (esUnico) {
        console.log('\n⚠️  PROBLEMA ENCONTRADO: La columna "identificacion" tiene constraint UNIQUE');
        console.log('📝 Aplicando migración para eliminar el constraint...\n');

        // Leer y aplicar la migración
        const migrationPath = path.join(__dirname, 'migrations', '001_permitir_clientes_multiples_direcciones.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

        // Ejecutar la migración
        console.log('🔧 Ejecutando migración...');
        await conexion.query(migrationSQL);
        console.log('✅ Migración aplicada exitosamente\n');

        // Verificar nuevamente
        const [indicesNuevos] = await conexion.execute(`
          SHOW INDEX FROM clientes WHERE Column_name = 'identificacion'
        `);

        console.log('📊 Índices después de la migración:');
        indicesNuevos.forEach(idx => {
          console.log(`  - ${idx.Key_name} (Non_unique: ${idx.Non_unique}, Type: ${idx.Index_type})`);
        });

      } else {
        console.log('\n✅ La columna "identificacion" NO tiene constraint UNIQUE');
        console.log('✅ La migración ya fue aplicada correctamente');
      }
    } else {
      console.log('\n⚠️  No se encontraron índices para "identificacion"');
    }

    // 2. Buscar clientes con identificaciones duplicadas
    console.log('\n\n🔍 Buscando clientes con identificaciones duplicadas...');
    const [duplicados] = await conexion.execute(`
      SELECT
        identificacion,
        COUNT(*) as cantidad,
        GROUP_CONCAT(id ORDER BY id) as ids,
        GROUP_CONCAT(nombre ORDER BY id SEPARATOR ' | ') as nombres,
        GROUP_CONCAT(direccion ORDER BY id SEPARATOR ' | ') as direcciones
      FROM clientes
      GROUP BY identificacion
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
    `);

    if (duplicados.length > 0) {
      console.log(`\n📊 Se encontraron ${duplicados.length} identificaciones duplicadas:\n`);
      duplicados.forEach((dup, index) => {
        console.log(`${index + 1}. Identificación: ${dup.identificacion}`);
        console.log(`   - Cantidad de registros: ${dup.cantidad}`);
        console.log(`   - IDs: ${dup.ids}`);
        console.log(`   - Nombres: ${dup.nombres}`);
        console.log(`   - Direcciones: ${dup.direcciones}`);
        console.log('');
      });
    } else {
      console.log('✅ No hay identificaciones duplicadas en la base de datos');
    }

    // 3. Mostrar un cliente específico si existe (1005450340)
    console.log('\n🔍 Buscando información del cliente 1005450340...');
    const [clientesEspecificos] = await conexion.execute(`
      SELECT
        id, identificacion, nombre, direccion, barrio, telefono,
        correo, ciudad_id, estado, fecha_registro
      FROM clientes
      WHERE identificacion = ?
      ORDER BY id
    `, ['1005450340']);

    if (clientesEspecificos.length > 0) {
      console.log(`\n📋 Se encontraron ${clientesEspecificos.length} registro(s) con esta identificación:\n`);
      clientesEspecificos.forEach((cliente, index) => {
        console.log(`Registro ${index + 1}:`);
        console.log(`  ID: ${cliente.id}`);
        console.log(`  Nombre: ${cliente.nombre}`);
        console.log(`  Dirección: ${cliente.direccion}`);
        console.log(`  Barrio: ${cliente.barrio || 'N/A'}`);
        console.log(`  Teléfono: ${cliente.telefono}`);
        console.log(`  Email: ${cliente.correo || 'N/A'}`);
        console.log(`  Estado: ${cliente.estado}`);
        console.log(`  Fecha registro: ${cliente.fecha_registro}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No se encontró ningún cliente con identificación 1005450340');
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.error('\nℹ️  El índice ya fue eliminado previamente');
    }
    throw error;
  } finally {
    if (conexion) {
      await conexion.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
verificarYAplicarMigracion()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error en el proceso:', error);
    process.exit(1);
  });
