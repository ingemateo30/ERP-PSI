// backend/routes/sistema.js - ARCHIVO COMPLETO CORREGIDO

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// IMPORTANTE: Importar middlewares de autenticación
const { authenticateToken, requireRole } = require('../middleware/auth');

// Generar Backup
router.post('/backup/generar', async (req, res) => {
  try {
    const fecha = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const nombreArchivo = `backup_${fecha}_${hora}.sql`;
    const rutaBackup = path.join(__dirname, '../backups', nombreArchivo);
    
    const comando = `mysqldump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${rutaBackup}`;
    
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error al generar backup:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al generar el backup',
          error: error.message 
        });
      }
      
      // Verificar tamaño del archivo
      const stats = fs.statSync(rutaBackup);
      const tamanoMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log('✅ Backup generado:', nombreArchivo, `(${tamanoMB} MB)`);
      
      res.json({ 
        success: true, 
        message: 'Backup generado exitosamente',
        archivo: nombreArchivo,
        ruta: rutaBackup,
        tamano: `${tamanoMB} MB`,
        fecha: new Date().toLocaleString('es-CO')
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar backup',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/v1/sistema/backup/ultimo
 * @desc Obtener información del último backup generado
 */
router.get('/backup/ultimo', authenticateToken, requireRole(['administrador']), async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const backupDir = path.join(__dirname, '../backups');
    
    // Verificar si existe el directorio de backups
    try {
      await fs.access(backupDir);
    } catch (error) {
      return res.status(200).json({
        success: true,
        ultimo_backup: null,
        message: 'No hay backups disponibles'
      });
    }
    
    // Leer archivos del directorio
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.startsWith('backup_') && file.endsWith('.sql'));
    
    if (backupFiles.length === 0) {
      return res.status(200).json({
        success: true,
        ultimo_backup: null,
        message: 'No hay backups disponibles'
      });
    }
    
    // Obtener el archivo más reciente
    const fileStats = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        return {
          nombre: file,
          fecha: stats.mtime,
          tamano: stats.size
        };
      })
    );
    
    // Ordenar por fecha (más reciente primero)
    fileStats.sort((a, b) => b.fecha - a.fecha);
    const ultimoBackup = fileStats[0];
    
    // Calcular tiempo transcurrido
    const ahora = new Date();
    const diferencia = ahora - ultimoBackup.fecha;
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);
    
    let tiempoTranscurrido;
    if (dias > 0) {
      tiempoTranscurrido = `${dias} día${dias > 1 ? 's' : ''}`;
    } else if (horas > 0) {
      tiempoTranscurrido = `${horas} hora${horas > 1 ? 's' : ''}`;
    } else {
      const minutos = Math.floor(diferencia / (1000 * 60));
      tiempoTranscurrido = `${minutos} minuto${minutos > 1 ? 's' : ''}`;
    }
    
    // Formatear tamaño
    const tamanoMB = (ultimoBackup.tamano / (1024 * 1024)).toFixed(2);
    
    res.status(200).json({
      success: true,
      ultimo_backup: {
        nombre: ultimoBackup.nombre,
        fecha: ultimoBackup.fecha.toISOString(),
        tamano: `${tamanoMB} MB`,
        tiempo_transcurrido: tiempoTranscurrido,
        hace_cuanto: `Hace ${tiempoTranscurrido}`
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo último backup:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del último backup',
      error: error.message
    });
  }
});