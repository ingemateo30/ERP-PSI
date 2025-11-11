const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS DE TRABAJOS E INSTALACIONES
// ==========================================

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
        i.observaciones
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

// Obtener TODAS mis instalaciones
router.get('/mis-instalaciones', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    const { estado, fecha_desde, fecha_hasta } = req.query;
    
    let whereConditions = ['i.instalador_id = ?'];
    let params = [instaladorId];
    
    if (estado) {
      whereConditions.push('i.estado = ?');
      params.push(estado);
    }
    
    if (fecha_desde) {
      whereConditions.push('i.fecha_programada >= ?');
      params.push(fecha_desde);
    }
    
    if (fecha_hasta) {
      whereConditions.push('i.fecha_programada <= ?');
      params.push(fecha_hasta);
    }
    
    const instalaciones = await Database.query(`
      SELECT 
        i.*,
        c.nombre as cliente_nombre,
        c.identificacion as cliente_identificacion,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        sc.plan_id,
        ps.nombre as plan_nombre,
        u.nombre as instalador_nombre
      FROM instalaciones i
      INNER JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.fecha_programada DESC, i.hora_programada DESC
    `, params);
    
    res.json({
      success: true,
      instalaciones: instalaciones || []
    });
    
  } catch (error) {
    console.error('Error obteniendo instalaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener instalaciones'
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
    const { equipos, foto, observaciones, ip_asignada, tap } = req.body;
    
    // ✅ LOGS DE DEBUG
    console.log('🔍 ========== COMPLETAR INSTALACIÓN ==========');
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
    console.log('🔑 Instalación ID:', id);
    console.log('🔑 Equipos:', equipos);
    console.log('🔑 IP Asignada:', ip_asignada);
    console.log('🔑 TAP:', tap);
    console.log('🔑 Instalador ID:', req.user.id);
    console.log('============================================');
    
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
    
    // ✅ ACTUALIZAR IP Y TAP EN LA TABLA CLIENTES
    if (ip_asignada || tap) {
      console.log('🔄 Actualizando cliente con IP y TAP...');
      
      // Obtener el cliente_id de la instalación
      const [instalacion] = await Database.query(
        'SELECT cliente_id FROM instalaciones WHERE id = ?',
        [id]
      );
      
      if (instalacion && instalacion.cliente_id) {
        const updateFields = [];
        const updateValues = [];
        
        if (ip_asignada) {
          updateFields.push('ip_asignada = ?');
          updateValues.push(ip_asignada);
          console.log('📍 IP a actualizar:', ip_asignada);
        }
        
        if (tap) {
          updateFields.push('tap = ?');
          updateValues.push(tap);
          console.log('🔑 TAP a actualizar:', tap);
        }
        
        if (updateFields.length > 0) {
          updateValues.push(instalacion.cliente_id);
          
          const updateQuery = `UPDATE clientes SET ${updateFields.join(', ')} WHERE id = ?`;
          console.log('📝 Query de actualización:', updateQuery);
          console.log('📝 Valores:', updateValues);
          
          await Database.query(updateQuery, updateValues);
          
          console.log(`✅ Cliente ${instalacion.cliente_id} actualizado - IP: ${ip_asignada || 'N/A'}, TAP: ${tap || 'N/A'}`);
        }
      } else {
        console.error('❌ No se encontró cliente_id en la instalación');
      }
    } else {
      console.log('⚠️ No se recibieron IP ni TAP para actualizar');
    }
    
    res.json({
      success: true,
      message: 'Instalación completada exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error completando instalación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al completar instalación',
      error: error.message
    });
  }
});

// ==========================================
// RUTAS DE EQUIPOS
// ==========================================

// Obtener MIS equipos asignados
router.get('/mis-equipos', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const equipos = await Database.query(`
      SELECT 
        id, codigo, nombre, tipo, marca, modelo,
        numero_serie, estado, fecha_asignacion, ubicacion_actual, observaciones
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
      message: 'Error al obtener equipos'
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

// ==========================================
// RUTAS DE CLIENTES
// ==========================================

// Obtener clientes con instalaciones del instalador
router.get('/mis-clientes', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const clientes = await Database.query(`
      SELECT DISTINCT
        c.id,
        c.identificacion,
        c.nombre,
        c.correo,
        c.telefono,
        c.direccion,
        c.estado,
        ci.nombre as municipio_nombre,
        d.nombre as departamento_nombre,
        COUNT(DISTINCT i.id) as instalaciones_count
      FROM clientes c
      INNER JOIN instalaciones i ON c.id = i.cliente_id
      LEFT JOIN ciudades ci ON c.municipio_id = ci.id
      LEFT JOIN departamentos d ON ci.departamento_id = d.id
      WHERE i.instalador_id = ?
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `, [instaladorId]);
    
    res.json({
      success: true,
      clientes: clientes || []
    });
    
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener clientes'
    });
  }
});

// ==========================================
// RUTAS DE INCIDENCIAS
// ==========================================

// Obtener MIS incidencias asignadas
router.get('/mis-incidencias', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const incidencias = await Database.query(`
      SELECT 
        i.*,
        c.nombre as municipio_nombre,
        d.nombre as departamento_nombre,
        TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
      FROM incidencias_servicio i
      LEFT JOIN ciudades c ON i.municipio_id = c.id
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      WHERE i.responsable_id = ?
      ORDER BY i.fecha_inicio DESC
    `, [instaladorId]);
    
    res.json({
      success: true,
      incidencias: incidencias || []
    });
    
  } catch (error) {
    console.error('Error obteniendo incidencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener incidencias',
      error: error.message
    });
  }
});

// Estadísticas de MIS incidencias
router.get('/mis-incidencias/estadisticas', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    
    const [stats] = await Database.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'reportado' THEN 1 ELSE 0 END) as reportadas,
        SUM(CASE WHEN estado = 'en_atencion' THEN 1 ELSE 0 END) as en_atencion,
        SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas,
        AVG(TIMESTAMPDIFF(MINUTE, fecha_inicio, fecha_fin)) as tiempo_promedio_minutos
      FROM incidencias_servicio
      WHERE responsable_id = ?
    `, [instaladorId]);
    
    res.json({
      success: true,
      estadisticas: stats || {
        total: 0,
        reportadas: 0,
        en_atencion: 0,
        resueltas: 0,
        tiempo_promedio_minutos: 0
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});


// ==========================================
// ESTADÍSTICAS DEL INSTALADOR
// ==========================================

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