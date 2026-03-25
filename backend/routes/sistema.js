// backend/routes/sistema.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const pool = require('../config/database');

const { authenticateToken, requireRole } = require('../middleware/auth');

const BACKUP_DIR = path.join(__dirname, '../backups');

// Asegurar que el directorio de backups existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Genera un volcado SQL completo usando mysql2 (sin necesitar mysqldump instalado)
 */
async function generarSQLDump(rutaArchivo) {
  const conn = await pool.getConnection();
  const stream = fs.createWriteStream(rutaArchivo, { encoding: 'utf8' });

  const write = (line) => new Promise((res, rej) => {
    if (!stream.write(line + '\n')) {
      stream.once('drain', res);
    } else {
      res();
    }
  });

  try {
    const db = process.env.DB_NAME || 'base_psi';

    await write(`-- ERP-PSI Database Backup`);
    await write(`-- Fecha: ${new Date().toISOString()}`);
    await write(`-- Base de datos: ${db}`);
    await write('');
    await write('SET NAMES utf8mb4;');
    await write('SET FOREIGN_KEY_CHECKS = 0;');
    await write('');

    const [tables] = await conn.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];

    for (const row of tables) {
      const tableName = row[tableKey];

      // CREATE TABLE
      const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSQL = createRow['Create Table'];
      await write(`-- Tabla: ${tableName}`);
      await write(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      await write(createSQL + ';');
      await write('');

      // INSERT DATA (por lotes de 500)
      const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length === 0) {
        await write(`-- (sin datos en ${tableName})`);
        await write('');
        continue;
      }

      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      const BATCH = 500;
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const values = batch.map(r => {
          const vals = Object.values(r).map(v => {
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "\\'")}'`;
            return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
          });
          return `(${vals.join(', ')})`;
        }).join(',\n');
        await write(`INSERT INTO \`${tableName}\` (${cols}) VALUES`);
        await write(values + ';');
      }
      await write('');
    }

    await write('SET FOREIGN_KEY_CHECKS = 1;');

    await new Promise((res, rej) => {
      stream.end(err => err ? rej(err) : res());
    });

  } finally {
    conn.release();
  }
}

/**
 * POST /api/v1/sistema/backup/generar
 * Genera un backup completo de la base de datos y lo descarga
 */
router.post('/backup/generar', authenticateToken, requireRole(['administrador']), async (req, res) => {
  const fecha = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const nombreArchivo = `backup_${fecha}_${hora}.sql`;
  const rutaBackup = path.join(BACKUP_DIR, nombreArchivo);

  try {
    console.log('⏳ Generando backup:', nombreArchivo);
    await generarSQLDump(rutaBackup);

    const stats = fs.statSync(rutaBackup);
    const tamanoMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Backup generado: ${nombreArchivo} (${tamanoMB} MB)`);

    res.download(rutaBackup, nombreArchivo, (err) => {
      if (err && !res.headersSent) {
        console.error('❌ Error enviando archivo:', err);
        res.status(500).json({ success: false, message: 'Error al descargar el backup' });
      }
    });

  } catch (error) {
    console.error('❌ Error generando backup:', error);
    // Limpiar archivo parcial si existe
    if (fs.existsSync(rutaBackup)) {
      try { fs.unlinkSync(rutaBackup); } catch (_) {}
    }
    res.status(500).json({
      success: false,
      message: 'Error al generar el backup',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/sistema/backup/ultimo
 * Obtener información del último backup generado
 */
router.get('/backup/ultimo', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    let files;
    try {
      files = await fsPromises.readdir(BACKUP_DIR);
    } catch {
      return res.json({ success: true, ultimo_backup: null, message: 'No hay backups disponibles' });
    }

    const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.sql'));
    if (backupFiles.length === 0) {
      return res.json({ success: true, ultimo_backup: null, message: 'No hay backups disponibles' });
    }

    const fileStats = await Promise.all(
      backupFiles.map(async (file) => {
        const s = await fsPromises.stat(path.join(BACKUP_DIR, file));
        return { nombre: file, fecha: s.mtime, tamano: s.size };
      })
    );
    fileStats.sort((a, b) => b.fecha - a.fecha);
    const ub = fileStats[0];

    const diff = Date.now() - ub.fecha;
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor(diff / 3600000);
    const minutos = Math.floor(diff / 60000);
    const tiempo = dias > 0 ? `${dias} día${dias > 1 ? 's' : ''}` :
                   horas > 0 ? `${horas} hora${horas > 1 ? 's' : ''}` :
                   `${minutos} minuto${minutos !== 1 ? 's' : ''}`;

    res.json({
      success: true,
      ultimo_backup: {
        nombre: ub.nombre,
        fecha: ub.fecha.toISOString(),
        tamano: `${(ub.tamano / 1048576).toFixed(2)} MB`,
        tiempo_transcurrido: tiempo,
        hace_cuanto: `Hace ${tiempo}`
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo último backup:', error);
    res.status(500).json({ success: false, message: 'Error al obtener información del backup' });
  }
});

/**
 * GET /api/v1/sistema/backup/listar
 * Listar todos los backups disponibles
 */
router.get('/backup/listar', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    let files;
    try {
      files = await fsPromises.readdir(BACKUP_DIR);
    } catch {
      return res.json({ success: true, backups: [] });
    }

    const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.sql'));
    const fileStats = await Promise.all(
      backupFiles.map(async (file) => {
        const s = await fsPromises.stat(path.join(BACKUP_DIR, file));
        return {
          nombre: file,
          fecha: s.mtime.toISOString(),
          tamano: `${(s.size / 1048576).toFixed(2)} MB`
        };
      })
    );
    fileStats.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ success: true, backups: fileStats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al listar backups' });
  }
});

module.exports = router;
