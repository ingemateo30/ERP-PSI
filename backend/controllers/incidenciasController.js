// backend/controllers/incidenciasController.js
// CONTROLADOR COMPLETO PARA GESTIÓN DE INCIDENCIAS

const { Database } = require('../models/Database');

class IncidenciasController {
  constructor() {
    this.db = Database;
  }

  // ==========================================
  // ESTADÍSTICAS DE INCIDENCIAS
  // ==========================================

  async getEstadisticas(req, res) {
    try {
      console.log('📊 GET estadísticas de incidencias');

      // Estadísticas por estado
      const estadisticasPorEstado = await this.db.query(`
        SELECT 
          estado,
          COUNT(*) as total,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM incidencias_servicio), 2) as porcentaje
        FROM incidencias_servicio 
        GROUP BY estado
        ORDER BY total DESC
      `);

      // Estadísticas por tipo
      const estadisticasPorTipo = await this.db.query(`
        SELECT 
          tipo,
          COUNT(*) as total,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM incidencias_servicio), 2) as porcentaje
        FROM incidencias_servicio 
        GROUP BY tipo
        ORDER BY total DESC
      `);

      // Incidencias del mes actual
      const incidenciasMesActual = await this.db.query(`
        SELECT COUNT(*) as total
        FROM incidencias_servicio 
        WHERE YEAR(fecha_inicio) = YEAR(CURDATE()) 
        AND MONTH(fecha_inicio) = MONTH(CURDATE())
      `);

      // Incidencias activas (reportado + en_progreso)
      const incidenciasActivas = await this.db.query(`
        SELECT COUNT(*) as total
        FROM incidencias_servicio 
        WHERE estado IN ('reportado', 'en_progreso')
      `);

      // Tiempo promedio de resolución (en horas)
      const tiempoPromedioResolucion = await this.db.query(`
        SELECT 
          ROUND(AVG(TIMESTAMPDIFF(HOUR, fecha_inicio, fecha_fin)), 2) as promedio_horas
        FROM incidencias_servicio 
        WHERE estado = 'resuelto' 
        AND fecha_fin IS NOT NULL
      `);

      // Incidencias por municipio (top 10)
      const incidenciasPorMunicipio = await this.db.query(`
        SELECT 
          c.nombre as municipio,
          COUNT(*) as total
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        GROUP BY i.municipio_id, c.nombre
        ORDER BY total DESC
        LIMIT 10
      `);

      // Estadísticas de los últimos 7 días
      const ultimosSieteDias = await this.db.query(`
        SELECT 
          DATE(fecha_inicio) as fecha,
          COUNT(*) as total
        FROM incidencias_servicio 
        WHERE fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(fecha_inicio)
        ORDER BY fecha DESC
      `);

      // Responsables con más incidencias asignadas
      const responsablesTop = await this.db.query(`
        SELECT 
          CONCAT(u.nombres, ' ', u.apellidos) as responsable,
          COUNT(*) as total_asignadas,
          SUM(CASE WHEN i.estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas
        FROM incidencias_servicio i
        LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
        WHERE i.responsable_id IS NOT NULL
        GROUP BY i.responsable_id, u.nombres, u.apellidos
        ORDER BY total_asignadas DESC
        LIMIT 10
      `);

      const estadisticas = {
        resumen: {
          total_incidencias: estadisticasPorEstado.reduce((sum, e) => sum + e.total, 0),
          incidencias_activas: incidenciasActivas[0]?.total || 0,
          incidencias_mes_actual: incidenciasMesActual[0]?.total || 0,
          tiempo_promedio_resolucion: tiempoPromedioResolucion[0]?.promedio_horas || 0
        },
        por_estado: estadisticasPorEstado,
        por_tipo: estadisticasPorTipo,
        por_municipio: incidenciasPorMunicipio,
        ultimos_siete_dias: ultimosSieteDias,
        responsables_top: responsablesTop
      };

      console.log('✅ Estadísticas de incidencias generadas');

      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas obtenidas exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de incidencias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ==========================================
  // CRUD BÁSICO DE INCIDENCIAS
  // ==========================================

  async getAll(req, res) {
    try {
      console.log('📋 GET todas las incidencias');
      
      const {
        tipo,
        estado,
        municipio_id,
        fecha_inicio,
        fecha_fin,
        responsable_id,
        search,
        page = 1,
        limit = 50
      } = req.query;

      let query = `
        SELECT 
          i.*,
          c.nombre as municipio_nombre,
          d.nombre as departamento_nombre,
          CONCAT(u.nombres, ' ', u.apellidos) as responsable_nombre,
          TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
        WHERE 1=1
      `;

      const queryParams = [];

      // Aplicar filtros
      if (tipo) {
        query += ' AND i.tipo = ?';
        queryParams.push(tipo);
      }

      if (estado) {
        query += ' AND i.estado = ?';
        queryParams.push(estado);
      }

      if (municipio_id) {
        query += ' AND i.municipio_id = ?';
        queryParams.push(municipio_id);
      }

      if (fecha_inicio) {
        query += ' AND DATE(i.fecha_inicio) >= ?';
        queryParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        query += ' AND DATE(i.fecha_inicio) <= ?';
        queryParams.push(fecha_fin);
      }

      if (responsable_id) {
        query += ' AND i.responsable_id = ?';
        queryParams.push(responsable_id);
      }

      if (search) {
        query += ' AND (i.titulo LIKE ? OR i.descripcion LIKE ? OR c.nombre LIKE ?)';
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Restricción por sede para no-administradores
      if (req.user && req.user.rol !== 'administrador' && req.user.sede_id) {
        query += ' AND i.municipio_id = ?';
        queryParams.push(req.user.sede_id);
      }

      // Ordenar y paginar
      const offset = (page - 1) * limit;
      query += ` ORDER BY i.fecha_inicio DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const incidencias = await this.db.query(query, queryParams);

      // Contar total para paginación — reconstruir params en orden correcto
      let countQuery = `
        SELECT COUNT(*) as total
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        WHERE 1=1
      `;
      const countParams = [];

      if (tipo) { countQuery += ' AND i.tipo = ?'; countParams.push(tipo); }
      if (estado) { countQuery += ' AND i.estado = ?'; countParams.push(estado); }
      if (municipio_id) { countQuery += ' AND i.municipio_id = ?'; countParams.push(municipio_id); }
      if (fecha_inicio) { countQuery += ' AND DATE(i.fecha_inicio) >= ?'; countParams.push(fecha_inicio); }
      if (fecha_fin) { countQuery += ' AND DATE(i.fecha_inicio) <= ?'; countParams.push(fecha_fin); }
      if (responsable_id) { countQuery += ' AND i.responsable_id = ?'; countParams.push(responsable_id); }
      if (search) {
        countQuery += ' AND (i.titulo LIKE ? OR i.descripcion LIKE ? OR c.nombre LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
      if (req.user && req.user.rol !== 'administrador' && req.user.sede_id) {
        countQuery += ' AND i.municipio_id = ?';
        countParams.push(req.user.sede_id);
      }

      const [totalResult] = await this.db.query(countQuery, countParams);
      const total = totalResult.total;

      console.log(`✅ ${incidencias.length} incidencias obtenidas (${total} total)`);

      res.json({
        success: true,
        data: incidencias,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        },
        message: 'Incidencias obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo incidencias:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 GET incidencia por ID: ${id}`);

      const [incidencia] = await this.db.query(`
        SELECT 
          i.*,
          c.nombre as municipio_nombre,
          d.nombre as departamento_nombre,
          CONCAT(u.nombres, ' ', u.apellidos) as responsable_nombre,
          TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
        WHERE i.id = ?
      `, [id]);

      if (!incidencia) {
        return res.status(404).json({
          success: false,
          message: 'Incidencia no encontrada'
        });
      }

      console.log(`✅ Incidencia ${id} encontrada`);

      res.json({
        success: true,
        data: incidencia,
        message: 'Incidencia obtenida exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo incidencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async create(req, res) {
    try {
      console.log('➕ POST crear nueva incidencia');

      const {
        tipo,
        titulo,
        descripcion,
        municipio_id,
        direccion,
        coordenadas_lat,
        coordenadas_lng,
        usuarios_afectados,
        responsable_id,
        observaciones
      } = req.body;

      const created_by = req.user?.id;

      // Validaciones básicas
      if (!tipo || !titulo || !descripcion || !municipio_id) {
        return res.status(400).json({
          success: false,
          message: 'Campos requeridos: tipo, titulo, descripcion, municipio_id'
        });
      }

      const query = `
        INSERT INTO incidencias_servicio (
          tipo, titulo, descripcion, municipio_id, direccion,
          coordenadas_lat, coordenadas_lng, usuarios_afectados,
          responsable_id, observaciones, estado, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reportado', ?, NOW())
      `;

      const [result] = await this.db.query(query, [
        tipo,
        titulo,
        descripcion,
        municipio_id,
        direccion,
        coordenadas_lat,
        coordenadas_lng,
        usuarios_afectados || 0,
        responsable_id,
        observaciones,
        created_by
      ]);

      console.log(`✅ Incidencia creada con ID: ${result.insertId}`);

      res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: 'Incidencia creada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creando incidencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      console.log(`✏️ PUT actualizar incidencia ${id}`);

      const {
        tipo,
        titulo,
        descripcion,
        municipio_id,
        direccion,
        coordenadas_lat,
        coordenadas_lng,
        usuarios_afectados,
        responsable_id,
        observaciones,
        estado
      } = req.body;

      // Verificar que la incidencia existe
      const [incidenciaExistente] = await this.db.query(
        'SELECT id FROM incidencias_servicio WHERE id = ?',
        [id]
      );

      if (!incidenciaExistente) {
        return res.status(404).json({
          success: false,
          message: 'Incidencia no encontrada'
        });
      }

      await this.db.query(`
        UPDATE incidencias_servicio SET
          tipo = COALESCE(?, tipo),
          titulo = COALESCE(?, titulo),
          descripcion = COALESCE(?, descripcion),
          municipio_id = COALESCE(?, municipio_id),
          direccion = COALESCE(?, direccion),
          coordenadas_lat = COALESCE(?, coordenadas_lat),
          coordenadas_lng = COALESCE(?, coordenadas_lng),
          usuarios_afectados = COALESCE(?, usuarios_afectados),
          responsable_id = COALESCE(?, responsable_id),
          observaciones = COALESCE(?, observaciones),
          estado = COALESCE(?, estado),
          updated_at = NOW()
        WHERE id = ?
      `, [
        tipo,
        titulo,
        descripcion,
        municipio_id,
        direccion,
        coordenadas_lat,
        coordenadas_lng,
        usuarios_afectados,
        responsable_id,
        observaciones,
        estado,
        id
      ]);

      console.log(`✅ Incidencia ${id} actualizada exitosamente`);

      res.json({
        success: true,
        message: 'Incidencia actualizada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error actualizando incidencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async cerrarIncidencia(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔒 POST cerrar incidencia ${id}`);

      const {
        solucion_aplicada,
        mecanismo_solucion,
        observaciones_cierre
      } = req.body;

      // Verificar que la incidencia existe y no está cerrada
      const [incidencia] = await this.db.query(
        'SELECT id, estado, fecha_inicio FROM incidencias_servicio WHERE id = ?',
        [id]
      );

      if (!incidencia) {
        return res.status(404).json({
          success: false,
          message: 'Incidencia no encontrada'
        });
      }

      if (incidencia.estado === 'cerrado') {
        return res.status(400).json({
          success: false,
          message: 'La incidencia ya está cerrada'
        });
      }

      await this.db.query(`
        UPDATE incidencias_servicio SET
          estado = 'resuelto',
          fecha_fin = NOW(),
          solucion_aplicada = ?,
          mecanismo_solucion = ?,
          observaciones_cierre = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        solucion_aplicada,
        mecanismo_solucion,
        observaciones_cierre,
        id
      ]);

      console.log(`✅ Incidencia ${id} cerrada exitosamente`);

      res.json({
        success: true,
        message: 'Incidencia cerrada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error cerrando incidencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  async getIncidenciasActivas(req, res) {
    try {
      console.log('⚡ GET incidencias activas (resumen)');

      const incidenciasActivas = await this.db.query(`
        SELECT 
          i.*,
          c.nombre as municipio_nombre,
          CONCAT(u.nombres, ' ', u.apellidos) as responsable_nombre,
          TIMESTAMPDIFF(MINUTE, i.fecha_inicio, NOW()) as minutos_transcurridos
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
        WHERE i.estado IN ('reportado', 'en_progreso')
        ORDER BY i.fecha_inicio ASC
        LIMIT 10
      `);

      console.log(`✅ ${incidenciasActivas.length} incidencias activas encontradas`);

      res.json({
        success: true,
        data: incidenciasActivas,
        message: 'Incidencias activas obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo incidencias activas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async getMunicipiosDisponibles(req, res) {
    try {
      console.log('🏘️ GET municipios disponibles');

      const municipios = await this.db.query(`
        SELECT 
          c.id,
          c.nombre,
          d.nombre as departamento_nombre
        FROM ciudades c
        INNER JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.activo = 1
        ORDER BY d.nombre, c.nombre
      `);

      console.log(`✅ ${municipios.length} municipios encontrados`);

      res.json({
        success: true,
        data: { municipios },
        message: 'Municipios obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo municipios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  async getResponsablesDisponibles(req, res) {
    try {
      console.log('👷 GET responsables disponibles');

      const responsables = await this.db.query(`
        SELECT 
          id,
          CONCAT(nombres, ' ', apellidos) as nombre,
          rol
        FROM sistema_usuarios
        WHERE rol IN ('instalador', 'supervisor', 'administrador') 
        AND activo = 1
        ORDER BY nombres, apellidos
      `);

      console.log(`✅ ${responsables.length} responsables encontrados`);

      res.json({
        success: true,
        data: { responsables },
        message: 'Responsables obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo responsables:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // REPORTES Y EXPORTACIONES
  // ==========================================

  async generarReporteIncidencias(req, res) {
    try {
      console.log('📋 Generando reporte de incidencias');

      const {
        fecha_inicio,
        fecha_fin,
        tipo,
        estado,
        municipio_id,
        formato = 'json'
      } = req.query;

      let query = `
        SELECT 
          i.*,
          c.nombre as municipio_nombre,
          d.nombre as departamento_nombre,
          CONCAT(u.nombres, ' ', u.apellidos) as responsable_nombre,
          TIMESTAMPDIFF(HOUR, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_horas
        FROM incidencias_servicio i
        LEFT JOIN ciudades c ON i.municipio_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
        WHERE 1=1
      `;

      const queryParams = [];

      if (fecha_inicio) {
        query += ' AND DATE(i.fecha_inicio) >= ?';
        queryParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        query += ' AND DATE(i.fecha_inicio) <= ?';
        queryParams.push(fecha_fin);
      }

      if (tipo) {
        query += ' AND i.tipo = ?';
        queryParams.push(tipo);
      }

      if (estado) {
        query += ' AND i.estado = ?';
        queryParams.push(estado);
      }

      if (municipio_id) {
        query += ' AND i.municipio_id = ?';
        queryParams.push(municipio_id);
      }

      query += ' ORDER BY i.fecha_inicio DESC';

      const incidencias = await this.db.query(query, queryParams);

      console.log(`✅ Reporte generado con ${incidencias.length} incidencias`);

      if (formato === 'csv') {
        // Generar CSV
        const csv = this.convertirACSV(incidencias);
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="reporte_incidencias.csv"'
        });
        res.send(csv);
      } else {
        // Devolver JSON
        res.json({
          success: true,
          data: incidencias,
          filtros: { fecha_inicio, fecha_fin, tipo, estado, municipio_id },
          total: incidencias.length,
          generado_en: new Date().toISOString(),
          message: 'Reporte generado exitosamente'
        });
      }

    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // MÉTODOS UTILITARIOS
  // ==========================================

  convertirACSV(data) {
    if (!data || data.length === 0) return '';

    const headers = [
      'ID', 'Tipo', 'Título', 'Descripción', 'Estado', 'Municipio',
      'Fecha Inicio', 'Fecha Fin', 'Duración (horas)', 'Usuarios Afectados',
      'Responsable', 'Observaciones'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.id,
        `"${row.tipo}"`,
        `"${row.titulo}"`,
        `"${row.descripcion}"`,
        `"${row.estado}"`,
        `"${row.municipio_nombre || ''}"`,
        row.fecha_inicio,
        row.fecha_fin || '',
        row.duracion_horas || '',
        row.usuarios_afectados || 0,
        `"${row.responsable_nombre || ''}"`,
        `"${row.observaciones || ''}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  validarDatosIncidencia(datos) {
    const errores = [];

    if (!datos.tipo) errores.push('El tipo es requerido');
    if (!datos.titulo?.trim()) errores.push('El título es requerido');
    if (!datos.descripcion?.trim()) errores.push('La descripción es requerida');
    if (!datos.municipio_id) errores.push('El municipio es requerido');

    if (datos.usuarios_afectados && datos.usuarios_afectados < 0) {
      errores.push('Los usuarios afectados deben ser un número positivo');
    }

    if (datos.coordenadas_lat && (datos.coordenadas_lat < -90 || datos.coordenadas_lat > 90)) {
      errores.push('Latitud inválida');
    }

    if (datos.coordenadas_lng && (datos.coordenadas_lng < -180 || datos.coordenadas_lng > 180)) {
      errores.push('Longitud inválida');
    }

    return errores;
  }
}

module.exports = new IncidenciasController();