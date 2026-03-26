// backend/routes/sistema.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
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

/**
 * GET /api/v1/sistema/estado
 * Estado del servidor: disco, RAM, CPU, uptime, Node.js, PM2 logs, DB
 */
router.get('/estado', authenticateToken, requireRole(['administrador']), async (req, res) => {
  const resultado = {};

  // ── 1. Disco ────────────────────────────────────────────────────────────────
  try {
    const dfOutput = execSync('df -h /', { timeout: 5000, encoding: 'utf8' });
    const lines = dfOutput.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      resultado.disco = {
        sistema_archivos: parts[0] || '',
        tamano:           parts[1] || '',
        usado:            parts[2] || '',
        disponible:       parts[3] || '',
        uso_porcentaje:   parts[4] || '',
        montado_en:       parts[5] || '/'
      };
    }
  } catch (err) {
    resultado.disco = { error: err.message };
  }

  // ── 2. RAM ───────────────────────────────────────────────────────────────────
  try {
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;
    resultado.ram = {
      total_bytes:    totalMem,
      libre_bytes:    freeMem,
      usado_bytes:    usedMem,
      total_gb:       (totalMem / 1073741824).toFixed(2),
      libre_gb:       (freeMem  / 1073741824).toFixed(2),
      usado_gb:       (usedMem  / 1073741824).toFixed(2),
      uso_porcentaje: ((usedMem / totalMem) * 100).toFixed(1)
    };
  } catch (err) {
    resultado.ram = { error: err.message };
  }

  // ── 3. CPU ───────────────────────────────────────────────────────────────────
  try {
    const loadAvg = os.loadavg();
    const cpus    = os.cpus();
    resultado.cpu = {
      num_nucleos:     cpus.length,
      modelo:          cpus[0]?.model || 'N/A',
      velocidad_mhz:   cpus[0]?.speed || 0,
      carga_1min:      loadAvg[0].toFixed(2),
      carga_5min:      loadAvg[1].toFixed(2),
      carga_15min:     loadAvg[2].toFixed(2),
      uso_porcentaje:  Math.min(((loadAvg[0] / cpus.length) * 100).toFixed(1), 100)
    };
  } catch (err) {
    resultado.cpu = { error: err.message };
  }

  // ── 4. Uptime ────────────────────────────────────────────────────────────────
  try {
    const processUp = process.uptime();
    const systemUp  = os.uptime();
    const formatSecs = (secs) => {
      const d = Math.floor(secs / 86400);
      const h = Math.floor((secs % 86400) / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = Math.floor(secs % 60);
      return `${d}d ${h}h ${m}m ${s}s`;
    };
    resultado.uptime = {
      proceso_segundos:  Math.floor(processUp),
      proceso_formato:   formatSecs(processUp),
      sistema_segundos:  Math.floor(systemUp),
      sistema_formato:   formatSecs(systemUp)
    };
  } catch (err) {
    resultado.uptime = { error: err.message };
  }

  // ── 5. Node.js ───────────────────────────────────────────────────────────────
  try {
    const memUsage = process.memoryUsage();
    resultado.nodejs = {
      version:          process.version,
      plataforma:       process.platform,
      arquitectura:     process.arch,
      pid:              process.pid,
      memoria: {
        rss_mb:         (memUsage.rss         / 1048576).toFixed(2),
        heap_total_mb:  (memUsage.heapTotal    / 1048576).toFixed(2),
        heap_usado_mb:  (memUsage.heapUsed     / 1048576).toFixed(2),
        externo_mb:     (memUsage.external     / 1048576).toFixed(2),
        heap_porcentaje: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)
      }
    };
  } catch (err) {
    resultado.nodejs = { error: err.message };
  }

  // ── 6. Logs PM2 ──────────────────────────────────────────────────────────────
  try {
    const pm2LogDirs = [
      '/root/.pm2/logs',
      '/home/psiroot/.pm2/logs',
      path.join(os.homedir(), '.pm2/logs')
    ];

    let logsEncontrados = [];
    let dirUsado = null;

    for (const dir of pm2LogDirs) {
      try {
        if (fs.existsSync(dir)) {
          const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
          if (archivos.length > 0) {
            dirUsado = dir;
            // Leer los últimos 50 líneas de cada archivo de log
            for (const archivo of archivos) {
              try {
                const rutaLog = path.join(dir, archivo);
                const contenido = execSync(`tail -n 50 "${rutaLog}"`, { timeout: 5000, encoding: 'utf8' });
                const lineas = contenido.trim().split('\n').filter(l => l.trim());
                logsEncontrados.push({
                  archivo,
                  lineas: lineas.slice(-50)
                });
              } catch (logErr) {
                logsEncontrados.push({ archivo, error: logErr.message });
              }
            }
            break;
          }
        }
      } catch (_) {
        // Continuar con el siguiente directorio
      }
    }

    resultado.pm2_logs = {
      directorio: dirUsado || 'No encontrado',
      encontrado: dirUsado !== null,
      archivos:   logsEncontrados
    };
  } catch (err) {
    resultado.pm2_logs = { encontrado: false, error: err.message, archivos: [] };
  }

  // ── 7. Base de datos ─────────────────────────────────────────────────────────
  try {
    const inicio = Date.now();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    resultado.base_datos = {
      estado:      'conectada',
      latencia_ms: Date.now() - inicio,
      host:        process.env.DB_HOST || 'N/A',
      nombre:      process.env.DB_NAME || 'N/A'
    };
  } catch (err) {
    resultado.base_datos = {
      estado: 'error',
      error:  err.message
    };
  }

  // ── 8. Conexiones activas (info del proceso) ──────────────────────────────────
  try {
    let conexionesInfo = {};
    try {
      const netstat = execSync('ss -tnp 2>/dev/null | grep node | wc -l', { timeout: 5000, encoding: 'utf8' });
      conexionesInfo.conexiones_node = parseInt(netstat.trim(), 10) || 0;
    } catch (_) {
      conexionesInfo.conexiones_node = 0;
    }
    try {
      const totalConns = execSync('ss -tn state established 2>/dev/null | wc -l', { timeout: 5000, encoding: 'utf8' });
      conexionesInfo.conexiones_establecidas = Math.max(0, (parseInt(totalConns.trim(), 10) || 1) - 1);
    } catch (_) {
      conexionesInfo.conexiones_establecidas = 0;
    }
    resultado.conexiones = conexionesInfo;
  } catch (err) {
    resultado.conexiones = { error: err.message };
  }

  resultado.timestamp = new Date().toISOString();
  res.json({ success: true, data: resultado });
});

module.exports = router;
