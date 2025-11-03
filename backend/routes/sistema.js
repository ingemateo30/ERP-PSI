const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

module.exports = router;