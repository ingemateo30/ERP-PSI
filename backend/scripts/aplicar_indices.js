#!/usr/bin/env node
// backend/scripts/aplicar_indices.js
// Aplica los índices de rendimiento de la migración 011
// Ejecutar: cd backend && node scripts/aplicar_indices.js

require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function aplicarIndices() {
  const conexion = await pool.getConnection();
  try {
    console.log('🚀 Aplicando índices de rendimiento...');

    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/011_performance_indexes.sql'),
      'utf8'
    );

    // Ejecutar cada statement por separado
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

    let exitosos = 0;
    let omitidos = 0;
    let errores = 0;

    for (const stmt of statements) {
      try {
        await conexion.query(stmt);
        exitosos++;
        console.log(`  ✅ ${stmt.substring(0, 60)}...`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          omitidos++;
          console.log(`  ⏩ Ya existe: ${stmt.substring(0, 60)}...`);
        } else {
          errores++;
          console.warn(`  ⚠️ Error: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Índices aplicados: ${exitosos} exitosos, ${omitidos} omitidos, ${errores} errores`);
  } finally {
    conexion.release();
    process.exit(0);
  }
}

aplicarIndices().catch(e => {
  console.error('❌ Error fatal:', e.message);
  process.exit(1);
});
