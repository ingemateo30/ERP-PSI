#!/usr/bin/env node
// backend/scripts/aplicar_indices.js
// Aplica índices de rendimiento verificando existencia via information_schema
// Ejecutar: cd backend && node scripts/aplicar_indices.js

require('dotenv').config();
const pool = require('../config/database');

// Definición de todos los índices a crear
const INDICES = [
  // clientes
  { tabla: 'clientes', indice: 'idx_clientes_estado',        columnas: '`estado`' },
  { tabla: 'clientes', indice: 'idx_clientes_ciudad_id',     columnas: '`ciudad_id`' },
  { tabla: 'clientes', indice: 'idx_clientes_sector_id',     columnas: '`sector_id`' },
  { tabla: 'clientes', indice: 'idx_clientes_identificacion',columnas: '`identificacion`' },
  { tabla: 'clientes', indice: 'idx_clientes_created_at',    columnas: '`created_at`' },
  { tabla: 'clientes', indice: 'idx_clientes_estado_ciudad', columnas: '`estado`, `ciudad_id`' },

  // facturas
  { tabla: 'facturas', indice: 'idx_facturas_cliente_id',        columnas: '`cliente_id`' },
  { tabla: 'facturas', indice: 'idx_facturas_estado',            columnas: '`estado`' },
  { tabla: 'facturas', indice: 'idx_facturas_activo',            columnas: '`activo`' },
  { tabla: 'facturas', indice: 'idx_facturas_fecha_emision',     columnas: '`fecha_emision`' },
  { tabla: 'facturas', indice: 'idx_facturas_fecha_vencimiento', columnas: '`fecha_vencimiento`' },
  { tabla: 'facturas', indice: 'idx_facturas_fecha_pago',        columnas: '`fecha_pago`' },
  { tabla: 'facturas', indice: 'idx_facturas_cliente_estado',    columnas: '`cliente_id`, `estado`' },
  { tabla: 'facturas', indice: 'idx_facturas_estado_activo',     columnas: '`estado`, `activo`' },
  { tabla: 'facturas', indice: 'idx_facturas_emision_activo',    columnas: '`fecha_emision`, `activo`' },
  { tabla: 'facturas', indice: 'idx_facturas_vcto_estado',       columnas: '`fecha_vencimiento`, `estado`' },

  // servicios_cliente
  { tabla: 'servicios_cliente', indice: 'idx_sc_cliente_id',     columnas: '`cliente_id`' },
  { tabla: 'servicios_cliente', indice: 'idx_sc_plan_id',        columnas: '`plan_id`' },
  { tabla: 'servicios_cliente', indice: 'idx_sc_estado',         columnas: '`estado`' },
  { tabla: 'servicios_cliente', indice: 'idx_sc_cliente_estado', columnas: '`cliente_id`, `estado`' },

  // contratos
  { tabla: 'contratos', indice: 'idx_contratos_cliente_id', columnas: '`cliente_id`' },
  { tabla: 'contratos', indice: 'idx_contratos_estado',     columnas: '`estado`' },
  { tabla: 'contratos', indice: 'idx_contratos_created_at', columnas: '`created_at`' },

  // instalaciones
  { tabla: 'instalaciones', indice: 'idx_inst_cliente_id', columnas: '`cliente_id`' },
  { tabla: 'instalaciones', indice: 'idx_inst_estado',     columnas: '`estado`' },
  { tabla: 'instalaciones', indice: 'idx_inst_fecha_prog', columnas: '`fecha_programada`' },
  { tabla: 'instalaciones', indice: 'idx_inst_created_at', columnas: '`created_at`' },

  // pagos
  { tabla: 'pagos', indice: 'idx_pagos_cliente_id', columnas: '`cliente_id`' },
  { tabla: 'pagos', indice: 'idx_pagos_factura_id', columnas: '`factura_id`' },
  { tabla: 'pagos', indice: 'idx_pagos_fecha_pago', columnas: '`fecha_pago`' },

  // pqr
  { tabla: 'pqr', indice: 'idx_pqr_cliente_id',  columnas: '`cliente_id`' },
  { tabla: 'pqr', indice: 'idx_pqr_estado',      columnas: '`estado`' },
  { tabla: 'pqr', indice: 'idx_pqr_fecha_recep', columnas: '`fecha_recepcion`' },

  // sistema_usuarios
  { tabla: 'sistema_usuarios', indice: 'idx_su_rol',     columnas: '`rol`' },
  { tabla: 'sistema_usuarios', indice: 'idx_su_sede_id', columnas: '`sede_id`' },
  { tabla: 'sistema_usuarios', indice: 'idx_su_activo',  columnas: '`activo`' },

  // inventario_equipos
  { tabla: 'inventario_equipos', indice: 'idx_inv_estado', columnas: '`estado`' },
  { tabla: 'inventario_equipos', indice: 'idx_inv_sede',   columnas: '`sede`' },

  // sectores
  { tabla: 'sectores', indice: 'idx_sectores_ciudad_id', columnas: '`ciudad_id`' },
];

async function aplicarIndices() {
  const conexion = await pool.getConnection();
  let creados = 0, omitidos = 0, errores = 0;

  try {
    console.log('🚀 Aplicando índices de rendimiento...\n');

    // Obtener todos los índices existentes de una sola consulta
    const [existentes] = await conexion.query(
      `SELECT table_name, index_name
       FROM information_schema.STATISTICS
       WHERE table_schema = DATABASE()`,
    );

    const indicesExistentes = new Set(
      existentes.map(r => `${r.table_name}.${r.index_name}`)
    );

    for (const { tabla, indice, columnas } of INDICES) {
      const clave = `${tabla}.${indice}`;

      if (indicesExistentes.has(clave)) {
        console.log(`  ⏩ Ya existe: ${clave}`);
        omitidos++;
        continue;
      }

      try {
        await conexion.query(
          `ALTER TABLE \`${tabla}\` ADD INDEX \`${indice}\` (${columnas})`
        );
        console.log(`  ✅ Creado:    ${clave}`);
        creados++;
      } catch (err) {
        // ER_DUP_KEYNAME: índice ya existe (race condition o nombre duplicado)
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`  ⏩ Ya existe: ${clave}`);
          omitidos++;
        } else if (err.code === 'ER_NO_SUCH_TABLE') {
          console.log(`  ⚠️  Tabla no encontrada: ${tabla} (omitido)`);
          omitidos++;
        } else if (err.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`  ⚠️  Columna no existe en ${tabla}: ${columnas} (omitido)`);
          omitidos++;
        } else {
          console.log(`  ❌ Error en ${clave}: ${err.message}`);
          errores++;
        }
      }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Creados:  ${creados}`);
    console.log(`⏩ Omitidos: ${omitidos}`);
    console.log(`❌ Errores:  ${errores}`);
    console.log(`${'─'.repeat(50)}`);

  } finally {
    conexion.release();
    process.exit(errores > 0 ? 1 : 0);
  }
}

aplicarIndices().catch(e => {
  console.error('❌ Error fatal:', e.message);
  process.exit(1);
});
