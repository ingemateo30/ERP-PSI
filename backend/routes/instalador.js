const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { audit, metaFromReq } = require('../utils/auditLogger');

// Helper para fecha local en formato MySQL (evita bug UTC de toISOString)
const fechaLocalMySQL = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Auto-crear tabla ubicaciones_tecnicos si no existe
Database.query(`
  CREATE TABLE IF NOT EXISTS ubicaciones_tecnicos (
    instalador_id        INT           NOT NULL,
    lat                  DECIMAL(10,8) NOT NULL,
    lng                  DECIMAL(11,8) NOT NULL,
    precision_metros     INT           DEFAULT NULL,
    instalacion_activa_id INT          DEFAULT NULL,
    actualizado_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (instalador_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`).catch(err => console.warn('⚠️ No se pudo crear tabla ubicaciones_tecnicos:', err.message));

// Auto-agregar columnas de metraje a inventario_equipos (solo si no existen)
Database.query('ALTER TABLE inventario_equipos ADD COLUMN metros_totales DECIMAL(10,2) DEFAULT NULL COMMENT \'Metros totales asignados al técnico\' ')
  .catch(() => {}); // ignora si ya existe
Database.query('ALTER TABLE inventario_equipos ADD COLUMN metros_disponibles DECIMAL(10,2) DEFAULT NULL COMMENT \'Metros restantes del carrete\' ')
  .catch(() => {}); // ignora si ya existe

// Hora / fecha en zona Colombia (UTC-5, sin horario de verano)
// Usamos resta explícita de ms en vez de toLocaleString para mayor fiabilidad en cualquier servidor
const horaColombia = () => {
  const d = new Date(Date.now() - 5 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};
const fechaColombia = () => {
  const d = new Date(Date.now() - 5 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;
};

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS DE TRABAJOS E INSTALACIONES
// ==========================================

// Obtener trabajos del instalador para hoy
router.get('/mis-trabajos/hoy', async (req, res) => {
  try {
    const instaladorId = req.user.id;
    const hoy = fechaLocalMySQL();
    
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

// Iniciar instalación (con validación de geofence 500 m)
router.post('/instalacion/:id/iniciar', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body; // GPS del técnico al momento de iniciar

    // Obtener coordenadas de la instalación para validar geofence
    const [inst] = await Database.query(
      'SELECT coordenadas_lat, coordenadas_lng FROM instalaciones WHERE id = ? AND instalador_id = ?',
      [id, req.user.id]
    );

    if (!inst) {
      return res.status(404).json({ success: false, message: 'Instalación no encontrada' });
    }

    // Validar geofence solo si la instalación tiene coordenadas Y el técnico envió su posición
    if (lat && lng && inst.coordenadas_lat && inst.coordenadas_lng) {
      const distancia = calcularDistanciaMetros(
        parseFloat(lat), parseFloat(lng),
        parseFloat(inst.coordenadas_lat), parseFloat(inst.coordenadas_lng)
      );
      if (distancia > 500) {
        return res.status(422).json({
          success: false,
          fuera_de_rango: true,
          distancia_metros: Math.round(distancia),
          message: `Estás a ${Math.round(distancia)} m del punto de instalación. Debes estar a menos de 500 m para iniciar.`
        });
      }
    }

    const horaInicio = horaColombia();

    await Database.query(`
      UPDATE instalaciones
      SET estado = 'en_proceso',
          hora_inicio = ?,
          coordenadas_lat = COALESCE(coordenadas_lat, ?),
          coordenadas_lng = COALESCE(coordenadas_lng, ?)
      WHERE id = ? AND instalador_id = ?
    `, [horaInicio, lat || null, lng || null, id, req.user.id]);

    // Guardar posición del técnico en tabla de tracking en vivo
    if (lat && lng) {
      await Database.query(`
        INSERT INTO ubicaciones_tecnicos (instalador_id, lat, lng, instalacion_activa_id)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE lat=VALUES(lat), lng=VALUES(lng),
          instalacion_activa_id=VALUES(instalacion_activa_id), actualizado_at=NOW()
      `, [req.user.id, lat, lng, id]);
    }

    audit({ usuario_id: req.user.id, accion: 'INSTALACION_INICIADA', tabla: 'instalaciones', registro_id: parseInt(id), datos_nuevos: { hora_inicio: horaInicio, lat, lng }, ...metaFromReq(req) });

    res.json({ success: true, message: 'Instalación iniciada', hora_inicio: horaInicio });

  } catch (error) {
    console.error('Error iniciando instalación:', error);
    res.status(500).json({ success: false, message: 'Error al iniciar instalación', error: error.message });
  }
});

// Actualizar ubicación GPS del técnico (llamado periódicamente desde el móvil)
router.post('/ubicacion', async (req, res) => {
  try {
    const { lat, lng, precision, instalacion_id } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat y lng requeridos' });

    // Garantizar que la tabla exista (por si el servidor no se reinició tras la migración)
    await Database.query(`
      CREATE TABLE IF NOT EXISTS ubicaciones_tecnicos (
        instalador_id         INT           NOT NULL,
        lat                   DECIMAL(10,8) NOT NULL,
        lng                   DECIMAL(11,8) NOT NULL,
        precision_metros      INT           DEFAULT NULL,
        instalacion_activa_id INT           DEFAULT NULL,
        actualizado_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (instalador_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await Database.query(`
      INSERT INTO ubicaciones_tecnicos (instalador_id, lat, lng, precision_metros, instalacion_activa_id)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        lat = VALUES(lat),
        lng = VALUES(lng),
        precision_metros = VALUES(precision_metros),
        instalacion_activa_id = VALUES(instalacion_activa_id),
        actualizado_at = NOW()
    `, [req.user.id, lat, lng, precision || null, instalacion_id || null]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error guardando ubicación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Completar instalación con foto, firma y equipos
router.post('/instalacion/:id/completar', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos, foto, observaciones, ip_asignada, tap, mac_address, ont_id, firma_instalador } = req.body;

    const horaFin = horaColombia();
    const fechaRealizada = fechaColombia();

    // equipos puede ser array de IDs o array de objetos {equipo_id, cantidad, ...}
    const equipoIds = equipos && equipos.length > 0
      ? equipos.map(e => (typeof e === 'object' ? e.equipo_id : e)).filter(Boolean)
      : [];
    const equiposJson = equipos && equipos.length > 0 ? JSON.stringify(equipos) : null;

    // Construir UPDATE dinámico: firma_instalador solo si se envió
    // (evita error si la columna no existe aún en la BD)
    const updateFields = [
      'estado = ?',
      'hora_fin = ?',
      'fecha_realizada = ?',
      'equipos_instalados = ?',
      'fotos_instalacion = ?',
      "observaciones = CONCAT(COALESCE(observaciones, ''), '\\n', ?)"
    ];
    const updateValues = [
      'completada',
      horaFin,
      fechaRealizada,
      equiposJson,
      foto ? JSON.stringify([foto]) : null,
      observaciones || ''
    ];

    if (firma_instalador) {
      updateFields.splice(5, 0, 'firma_instalador = ?');
      updateValues.splice(5, 0, firma_instalador);
    }

    updateValues.push(id, req.user.id);
    await Database.query(
      `UPDATE instalaciones SET ${updateFields.join(', ')} WHERE id = ? AND instalador_id = ?`,
      updateValues
    );

    // Actualizar estado de equipos
    // - Equipos con metros_usados: descontar metros; solo marcar 'instalado' si no quedan
    // - Equipos sin metros: marcar 'instalado' directamente
    if (equipos && equipos.length > 0) {
      for (const item of equipos) {
        const eqId = typeof item === 'object' ? (item.equipo_id || item.id) : item;
        if (!eqId) continue;

        // metros_usados puede venir de: item.metros_usados (ModalCompletar) o item.cantidad (IniciarInstalacion con metros_disponibles)
        const metrosUsados = typeof item === 'object'
          ? (item.metros_usados || (item.metros_disponibles != null ? parseFloat(item.cantidad) || 0 : 0))
          : 0;

        if (metrosUsados > 0) {
          // Equipo con seguimiento de metros: descontar
          await Database.query(`
            UPDATE inventario_equipos
            SET metros_disponibles = GREATEST(0, COALESCE(metros_disponibles, 0) - ?),
                ubicacion_actual = CASE
                  WHEN GREATEST(0, COALESCE(metros_disponibles, 0) - ?) <= 0
                  THEN (SELECT direccion_instalacion FROM instalaciones WHERE id = ?)
                  ELSE ubicacion_actual
                END,
                estado = CASE
                  WHEN GREATEST(0, COALESCE(metros_disponibles, 0) - ?) <= 0
                  THEN 'instalado'
                  ELSE estado
                END
            WHERE id = ? AND instalador_id = ?
          `, [metrosUsados, metrosUsados, id, metrosUsados, eqId, req.user.id]);
        } else {
          // Equipo sin metros: marcar como instalado
          await Database.query(`
            UPDATE inventario_equipos
            SET estado = 'instalado',
                ubicacion_actual = (SELECT direccion_instalacion FROM instalaciones WHERE id = ?)
            WHERE id = ? AND instalador_id = ?
          `, [id, eqId, req.user.id]);
        }
      }
    }

    // Actualizar IP, TAP, MAC y ONT en la tabla clientes
    if (ip_asignada || tap || mac_address || ont_id) {
      const [instalacion] = await Database.query(
        'SELECT cliente_id FROM instalaciones WHERE id = ?',
        [id]
      );

      if (instalacion && instalacion.cliente_id) {
        const updateFields = [];
        const updateValues = [];

        if (ip_asignada) { updateFields.push('ip_asignada = ?'); updateValues.push(ip_asignada); }
        if (tap)         { updateFields.push('tap = ?');         updateValues.push(tap); }
        if (mac_address) { updateFields.push('mac_address = ?'); updateValues.push(mac_address); }
        if (ont_id)      { updateFields.push('ont_id = ?');      updateValues.push(ont_id); }

        if (updateFields.length > 0) {
          updateValues.push(instalacion.cliente_id);
          await Database.query(`UPDATE clientes SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
        }
      }
    }

    audit({ usuario_id: req.user.id, accion: 'INSTALACION_COMPLETADA', tabla: 'instalaciones', registro_id: parseInt(id), datos_nuevos: { hora_fin: horaFin, observaciones, ip_asignada, ont_id }, ...metaFromReq(req) });

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
        numero_serie, estado, fecha_asignacion, ubicacion_actual, observaciones,
        metros_totales, metros_disponibles
      FROM inventario_equipos
      WHERE instalador_id = ?
        AND estado = 'asignado'
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
    const hoy = fechaLocalMySQL();
    
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

// ─── Utilidad: distancia en metros entre dos coordenadas (Haversine) ──────────
function calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = router;