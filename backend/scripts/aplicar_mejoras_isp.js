#!/usr/bin/env node
// backend/scripts/aplicar_mejoras_isp.js
// Aplica cambios de esquema necesarios para las nuevas funcionalidades ISP
// Ejecutar: cd backend && node scripts/aplicar_mejoras_isp.js

try { require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); } catch(e) {}
const pool = require('../config/database');

const DB_NAME = process.env.DB_NAME || 'base_psi';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function columnaExiste(conexion, tabla, columna) {
  const [rows] = await conexion.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME   = ?
       AND COLUMN_NAME  = ?`,
    [DB_NAME, tabla, columna]
  );
  return rows[0].cnt > 0;
}

async function enumContieneValor(conexion, tabla, columna, valor) {
  const [rows] = await conexion.execute(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME   = ?
       AND COLUMN_NAME  = ?`,
    [DB_NAME, tabla, columna]
  );
  if (rows.length === 0) return false;
  return rows[0].COLUMN_TYPE.includes(valor);
}

// ─── operaciones ─────────────────────────────────────────────────────────────

async function aplicarMejoras() {
  const conexion = await pool.getConnection();

  try {
    console.log('🚀 Aplicando mejoras de esquema para funcionalidades ISP...\n');

    // ── 1. facturas: agregar 'borrador' al enum de estado ───────────────────
    console.log('── facturas.estado (enum borrador) ──────────────────────────');
    try {
      const yaExiste = await enumContieneValor(conexion, 'facturas', 'estado', 'borrador');
      if (yaExiste) {
        console.log("  ⏩ Omitido: 'borrador' ya está en el enum de facturas.estado");
      } else {
        await conexion.execute(
          `ALTER TABLE facturas MODIFY COLUMN estado ENUM('pendiente','pagada','vencida','anulada','borrador') DEFAULT 'pendiente'`
        );
        console.log("  ✅ Agregado: valor 'borrador' al enum de facturas.estado");
      }
    } catch (err) {
      console.log(`  ❌ Error modificando facturas.estado: ${err.message}`);
    }

    // ── 2. servicios_cliente: nuevas columnas ────────────────────────────────
    console.log('\n── servicios_cliente: columnas de cancelación programada ────');

    const columnas_servicios_cliente = [
      {
        columna: 'fecha_programada_cancelacion',
        ddl: "ADD COLUMN `fecha_programada_cancelacion` DATE NULL COMMENT 'Fecha programada para cancelar el servicio al final del ciclo'",
      },
      {
        columna: 'motivo_cancelacion',
        ddl: "ADD COLUMN `motivo_cancelacion` VARCHAR(255) NULL COMMENT 'Motivo de cancelación programada'",
      },
    ];

    for (const { columna, ddl } of columnas_servicios_cliente) {
      try {
        const existe = await columnaExiste(conexion, 'servicios_cliente', columna);
        if (existe) {
          console.log(`  ⏩ Omitido: servicios_cliente.${columna} ya existe`);
        } else {
          await conexion.execute(`ALTER TABLE servicios_cliente ${ddl}`);
          console.log(`  ✅ Agregado: servicios_cliente.${columna}`);
        }
      } catch (err) {
        console.log(`  ❌ Error agregando servicios_cliente.${columna}: ${err.message}`);
      }
    }

    // ── 3. instalaciones: nuevas columnas para traslados ─────────────────────
    console.log('\n── instalaciones: columnas para traslados ────────────────────');

    const columnas_instalaciones = [
      {
        columna: 'direccion_anterior',
        ddl: "ADD COLUMN `direccion_anterior` VARCHAR(255) NULL COMMENT 'Dirección anterior del cliente (para traslados)'",
      },
      {
        columna: 'ciudad_anterior_id',
        ddl: "ADD COLUMN `ciudad_anterior_id` INT NULL COMMENT 'Ciudad anterior del cliente (para traslados)'",
      },
      {
        columna: 'sector_anterior_id',
        ddl: "ADD COLUMN `sector_anterior_id` INT NULL COMMENT 'Sector anterior del cliente (para traslados)'",
      },
      {
        columna: 'nueva_ciudad_id',
        ddl: "ADD COLUMN `nueva_ciudad_id` INT NULL COMMENT 'Nueva ciudad del cliente al completar traslado'",
      },
      {
        columna: 'nuevo_sector_id',
        ddl: "ADD COLUMN `nuevo_sector_id` INT NULL COMMENT 'Nuevo sector del cliente al completar traslado'",
      },
      {
        columna: 'actualizar_direccion_cliente',
        ddl: "ADD COLUMN `actualizar_direccion_cliente` TINYINT(1) DEFAULT 1 COMMENT 'Si al completar el traslado se actualiza la dirección del cliente'",
      },
    ];

    for (const { columna, ddl } of columnas_instalaciones) {
      try {
        const existe = await columnaExiste(conexion, 'instalaciones', columna);
        if (existe) {
          console.log(`  ⏩ Omitido: instalaciones.${columna} ya existe`);
        } else {
          await conexion.execute(`ALTER TABLE instalaciones ${ddl}`);
          console.log(`  ✅ Agregado: instalaciones.${columna}`);
        }
      } catch (err) {
        console.log(`  ❌ Error agregando instalaciones.${columna}: ${err.message}`);
      }
    }

    console.log(`\n${'─'.repeat(55)}`);
    console.log('✅ Todas las mejoras aplicadas');
    console.log(`${'─'.repeat(55)}`);

  } finally {
    conexion.release();
    process.exit(0);
  }
}

aplicarMejoras().catch(e => {
  console.error('❌ Error fatal:', e.message);
  process.exit(1);
});
