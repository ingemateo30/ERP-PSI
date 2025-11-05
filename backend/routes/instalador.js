const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);
// Obtener MIS equipos asignados (solo del instalador logueado)
router.get('/mis-equipos', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const equipos = await Database.query(`
      SELECT 
        id, codigo, nombre, tipo, marca, modelo,
        estado, fecha_asignacion, ubicacion_actual
      FROM inventario_equipos
      WHERE instalador_id = ?
        AND estado IN ('asignado', 'instalado')
      ORDER BY fecha_asignacion DESC
    `, [instaladorId]);
    
    res.json({
      success: true,
      equipos: equipos || []
    });
    
  } catch (error) {
    console.error('Error obteniendo equipos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener equipos'
    });
  }
});
// Obtener trabajos del instalador para hoy
router.get('/mis-trabajos/hoy', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    const hoy = new Date().toISOString().split('T')[0];
    
    const trabajos = await Database.query(`
      SELECT 
        i.id,
        i.cliente_id,
        c.nombre as cliente_nombre,
        i.direccion_instalacion as direccion,
        i.barrio,
        i.hora_programada as hora,
        i.estado,
        i.tipo_instalacion as tipo,
        i.tipo_orden,
        i.telefono_contacto,
        i.persona_recibe,
        i.observaciones,
        i.fotos_instalacion,
        i.equipos_instalados,
        i.hora_inicio,
        i.hora_fin
      FROM instalaciones i
      INNER JOIN clientes c ON i.cliente_id = c.id
      WHERE i.instalador_id = ?
        AND i.fecha_programada = ?
        AND i.estado IN ('programada', 'en_proceso')
      ORDER BY i.hora_programada ASC
    `, [instaladorId, hoy]);
    
    res.json({
      success: true,
      trabajos: trabajos || [],
      total: trabajos ? trabajos.length : 0
    });
    
  } catch (error) {
    console.error('Error obteniendo trabajos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener trabajos',
      error: error.message
    });
  }
});

// Obtener equipos asignados al instalador
router.get('/mis-equipos', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const equipos = await Database.query(`
      SELECT 
        id,
        codigo,
        nombre,
        tipo,
        marca,
        modelo,
        numero_serie,
        estado,
        fecha_asignacion,
        ubicacion_actual,
        observaciones
      FROM inventario_equipos
      WHERE instalador_id = ?
        AND estado IN ('asignado', 'instalado')
      ORDER BY fecha_asignacion DESC
    `, [instaladorId]);
    
    res.json({
      success: true,
      equipos: equipos || [],
      total: equipos ? equipos.length : 0
    });
    
  } catch (error) {
    console.error('Error obteniendo equipos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener equipos',
      error: error.message
    });
  }
});

// Iniciar instalación
router.post('/instalacion/:id/iniciar', async (req, res) => {
  try {
    const { id } = req.params;
    const horaInicio = new Date().toTimeString().split(' ')[0];
    
    await Database.query(`
      UPDATE instalaciones
      SET estado = 'en_proceso',
          hora_inicio = ?
      WHERE id = ? AND instalador_id = ?
    `, [horaInicio, id, req.user.id]);
    
    res.json({
      success: true,
      message: 'Instalación iniciada',
      hora_inicio: horaInicio
    });
    
  } catch (error) {
    console.error('Error iniciando instalación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar instalación',
      error: error.message
    });
  }
});

// Completar instalación con foto y equipos
router.post('/instalacion/:id/completar', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos, foto, observaciones } = req.body;
    
    const horaFin = new Date().toTimeString().split(' ')[0];
    const fechaRealizada = new Date().toISOString().split('T')[0];
    
    // Actualizar instalación
    await Database.query(`
      UPDATE instalaciones
      SET estado = 'completada',
          hora_fin = ?,
          fecha_realizada = ?,
          equipos_instalados = ?,
          fotos_instalacion = ?,
          observaciones = CONCAT(COALESCE(observaciones, ''), '\n', ?)
      WHERE id = ? AND instalador_id = ?
    `, [horaFin, fechaRealizada, JSON.stringify(equipos), JSON.stringify([foto]), observaciones || '', id, req.user.id]);
    
    // Actualizar estado de equipos a 'instalado'
    if (equipos && equipos.length > 0) {
      for (const equipoId of equipos) {
        await Database.query(`
          UPDATE inventario_equipos
          SET estado = 'instalado',
              ubicacion_actual = (SELECT direccion_instalacion FROM instalaciones WHERE id = ?)
          WHERE id = ? AND instalador_id = ?
        `, [id, equipoId, req.user.id]);
      }
    }
    
    res.json({
      success: true,
      message: 'Instalación completada exitosamente'
    });
    
  } catch (error) {
    console.error('Error completando instalación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al completar instalación',
      error: error.message
    });
  }
});

// Devolver equipos
router.post('/equipos/devolver', async (req, res) => {
  try {
    const { equiposIds } = req.body;
    const instaladorId = req.user.id;
    
    if (!equiposIds || equiposIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un equipo'
      });
    }
    
    const fechaDevolucion = new Date();
    const placeholders = equiposIds.map(() => '?').join(',');
    
    await Database.query(`
      UPDATE inventario_equipos
      SET estado = 'disponible',
          instalador_id = NULL,
          fecha_devolucion = ?,
          ubicacion_actual = 'Bodega Central'
      WHERE id IN (${placeholders}) AND instalador_id = ?
    `, [fechaDevolucion, ...equiposIds, instaladorId]);
    
    res.json({
      success: true,
      message: `${equiposIds.length} equipo(s) devuelto(s) exitosamente`
    });
    
  } catch (error) {
    console.error('Error devolviendo equipos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al devolver equipos',
      error: error.message
    });
  }
});

// Estadísticas del instalador
router.get('/estadisticas', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    const hoy = new Date().toISOString().split('T')[0];
    
    // Pendientes hoy
    const pendientesHoy = await Database.query(`
      SELECT COUNT(*) as total
      FROM instalaciones
      WHERE instalador_id = ?
        AND fecha_programada = ?
        AND estado = 'programada'
    `, [instaladorId, hoy]);
    
    // Completadas esta semana
    const completadasSemana = await Database.query(`
      SELECT COUNT(*) as total
      FROM instalaciones
      WHERE instalador_id = ?
        AND fecha_realizada >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND estado = 'completada'
    `, [instaladorId]);
    
    // Equipos asignados
    const equiposAsignados = await Database.query(`
      SELECT COUNT(*) as total
      FROM inventario_equipos
      WHERE instalador_id = ?
        AND estado IN ('asignado', 'instalado')
    `, [instaladorId]);
    
    res.json({
      success: true,
      estadisticas: {
        pendientesHoy: pendientesHoy[0]?.total || 0,
        completadasSemana: completadasSemana[0]?.total || 0,
        equiposAsignados: equiposAsignados[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;