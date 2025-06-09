// routes/incidencias.js
const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = Database;

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todas las incidencias con filtros
router.get('/', async (req, res) => {
    try {
        const { 
            estado, 
            tipo_incidencia, 
            categoria,
            fechaInicio, 
            fechaFin, 
            municipio_id,
            search, 
            page = 1, 
            limit = 50 
        } = req.query;
        
        let query = `
            SELECT 
                i.*,
                c.nombre as municipio_nombre,
                u.nombre as responsable_nombre
            FROM incidencias_servicio i
            LEFT JOIN ciudades c ON i.municipio_id = c.id
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (estado) {
            query += ' AND i.estado = ?';
            params.push(estado);
        }
        
        if (tipo_incidencia) {
            query += ' AND i.tipo_incidencia = ?';
            params.push(tipo_incidencia);
        }
        
        if (categoria) {
            query += ' AND i.categoria = ?';
            params.push(categoria);
        }
        
        if (municipio_id) {
            query += ' AND i.municipio_id = ?';
            params.push(municipio_id);
        }
        
        if (fechaInicio) {
            query += ' AND DATE(i.fecha_inicio) >= ?';
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            query += ' AND DATE(i.fecha_inicio) <= ?';
            params.push(fechaFin);
        }
        
        if (search) {
            query += ' AND (i.numero_incidencia LIKE ? OR i.descripcion LIKE ? OR i.direccion LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY i.fecha_inicio DESC';
        
        // Paginación
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
        
        const incidencias = await db.query(query, params);
        
        res.json({ 
            incidencias,
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('Error obteniendo incidencias:', error);
        res.status(500).json({ error: 'Error obteniendo incidencias' });
    }
});

// Obtener estadísticas de incidencias
router.get('/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'reportado' THEN 1 ELSE 0 END) as reportadas,
                SUM(CASE WHEN estado = 'en_atencion' THEN 1 ELSE 0 END) as en_atencion,
                SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas,
                SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) as cerradas,
                AVG(tiempo_duracion_minutos) as tiempo_promedio_resolucion,
                SUM(usuarios_afectados) as total_usuarios_afectados,
                COUNT(CASE WHEN fecha_inicio >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as ultimos_30_dias
            FROM incidencias_servicio
        `;
        
        const [stats] = await db.query(query);
        
        // Estadísticas por tipo
        const queryTipos = `
            SELECT 
                tipo_incidencia,
                categoria,
                COUNT(*) as cantidad,
                AVG(tiempo_duracion_minutos) as tiempo_promedio,
                SUM(usuarios_afectados) as usuarios_afectados_total
            FROM incidencias_servicio
            WHERE fecha_inicio >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY tipo_incidencia, categoria
        `;
        
        const estadisticasTipos = await db.query(queryTipos);
        
        res.json({
            ...stats,
            por_tipo: estadisticasTipos
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas incidencias:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// Obtener incidencia por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                i.*,
                c.nombre as municipio_nombre,
                u.nombre as responsable_nombre,
                u.telefono as responsable_telefono
            FROM incidencias_servicio i
            LEFT JOIN ciudades c ON i.municipio_id = c.id
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            WHERE i.id = ?
        `;
        
        const [incidencia] = await db.query(query, [id]);
        
        if (!incidencia) {
            return res.status(404).json({ error: 'Incidencia no encontrada' });
        }
        
        res.json({ incidencia });
        
    } catch (error) {
        console.error('Error obteniendo incidencia:', error);
        res.status(500).json({ error: 'Error obteniendo incidencia' });
    }
});

// Crear nueva incidencia
router.post('/', async (req, res) => {
    try {
        const {
            tipo_incidencia,
            categoria,
            descripcion,
            municipio_id,
            direccion,
            coordenadas_lat,
            coordenadas_lng,
            usuarios_afectados = 0,
            responsable_id
        } = req.body;
        
        // Validaciones
        if (!tipo_incidencia || !categoria || !descripcion) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: tipo_incidencia, categoria, descripcion' 
            });
        }
        
        // Generar número de incidencia único
        const year = new Date().getFullYear();
        const queryLastIncidencia = 'SELECT MAX(numero_incidencia) as ultimo FROM incidencias_servicio WHERE numero_incidencia LIKE ?';
        const [lastIncidencia] = await db.query(queryLastIncidencia, [`INC${year}%`]);
        
        let numeroIncidencia;
        if (lastIncidencia && lastIncidencia.ultimo) {
            const ultimoNumero = parseInt(lastIncidencia.ultimo.substring(7));
            numeroIncidencia = `INC${year}${(ultimoNumero + 1).toString().padStart(4, '0')}`;
        } else {
            numeroIncidencia = `INC${year}0001`;
        }
        
        const query = `
            INSERT INTO incidencias_servicio (
                numero_incidencia, tipo_incidencia, categoria, fecha_inicio,
                descripcion, municipio_id, direccion, coordenadas_lat, coordenadas_lng,
                usuarios_afectados, responsable_id, estado
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'reportado')
        `;
        
        const result = await db.query(query, [
            numeroIncidencia, tipo_incidencia, categoria, descripcion,
            municipio_id, direccion, coordenadas_lat, coordenadas_lng,
            usuarios_afectados, responsable_id
        ]);
        
        res.status(201).json({ 
            id: result.insertId,
            numero_incidencia: numeroIncidencia,
            message: 'Incidencia creada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error creando incidencia:', error);
        res.status(500).json({ error: 'Error creando incidencia' });
    }
});

// Actualizar incidencia
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tipo_incidencia,
            categoria,
            descripcion,
            fecha_fin,
            tiempo_duracion_minutos,
            usuarios_afectados,
            direccion,
            coordenadas_lat,
            coordenadas_lng,
            causa_raiz,
            solucion_aplicada,
            mecanismo_solucion,
            estado,
            responsable_id,
            observaciones
        } = req.body;
        
        // Verificar que la incidencia existe
        const checkQuery = 'SELECT * FROM incidencias_servicio WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ error: 'Incidencia no encontrada' });
        }
        
        const updateFields = [];
        const params = [];
        
        if (tipo_incidencia) {
            updateFields.push('tipo_incidencia = ?');
            params.push(tipo_incidencia);
        }
        
        if (categoria) {
            updateFields.push('categoria = ?');
            params.push(categoria);
        }
        
        if (descripcion) {
            updateFields.push('descripcion = ?');
            params.push(descripcion);
        }
        
        if (fecha_fin) {
            updateFields.push('fecha_fin = ?');
            params.push(fecha_fin);
            
            // Calcular duración automáticamente si no se proporciona
            if (!tiempo_duracion_minutos) {
                updateFields.push('tiempo_duracion_minutos = TIMESTAMPDIFF(MINUTE, fecha_inicio, ?)');
                params.push(fecha_fin);
            }
        }
        
        if (tiempo_duracion_minutos) {
            updateFields.push('tiempo_duracion_minutos = ?');
            params.push(tiempo_duracion_minutos);
        }
        
        if (usuarios_afectados !== undefined) {
            updateFields.push('usuarios_afectados = ?');
            params.push(usuarios_afectados);
        }
        
        if (direccion) {
            updateFields.push('direccion = ?');
            params.push(direccion);
        }
        
        if (coordenadas_lat) {
            updateFields.push('coordenadas_lat = ?');
            params.push(coordenadas_lat);
        }
        
        if (coordenadas_lng) {
            updateFields.push('coordenadas_lng = ?');
            params.push(coordenadas_lng);
        }
        
        if (causa_raiz) {
            updateFields.push('causa_raiz = ?');
            params.push(causa_raiz);
        }
        
        if (solucion_aplicada) {
            updateFields.push('solucion_aplicada = ?');
            params.push(solucion_aplicada);
        }
        
        if (mecanismo_solucion) {
            updateFields.push('mecanismo_solucion = ?');
            params.push(mecanismo_solucion);
        }
        
        if (estado) {
            updateFields.push('estado = ?');
            params.push(estado);
            
            // Si se está resolviendo, marcar fecha de fin automáticamente
            if (estado === 'resuelto' && !existing.fecha_fin && !fecha_fin) {
                updateFields.push('fecha_fin = NOW()');
                updateFields.push('tiempo_duracion_minutos = TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW())');
            }
        }
        
        if (responsable_id) {
            updateFields.push('responsable_id = ?');
            params.push(responsable_id);
        }
        
        if (observaciones) {
            updateFields.push('observaciones = ?');
            params.push(observaciones);
        }
        
        updateFields.push('updated_at = NOW()');
        params.push(id);
        
        const query = `UPDATE incidencias_servicio SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.query(query, params);
        
        res.json({ message: 'Incidencia actualizada exitosamente' });
        
    } catch (error) {
        console.error('Error actualizando incidencia:', error);
        res.status(500).json({ error: 'Error actualizando incidencia' });
    }
});

// Cerrar incidencia
router.post('/:id/cerrar', async (req, res) => {
    try {
        const { id } = req.params;
        const { solucion_aplicada, observaciones } = req.body;
        
        const query = `
            UPDATE incidencias_servicio 
            SET 
                estado = 'cerrado',
                fecha_fin = COALESCE(fecha_fin, NOW()),
                tiempo_duracion_minutos = COALESCE(tiempo_duracion_minutos, TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW())),
                solucion_aplicada = COALESCE(?, solucion_aplicada),
                observaciones = COALESCE(?, observaciones),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.query(query, [solucion_aplicada, observaciones, id]);
        
        res.json({ message: 'Incidencia cerrada exitosamente' });
        
    } catch (error) {
        console.error('Error cerrando incidencia:', error);
        res.status(500).json({ error: 'Error cerrando incidencia' });
    }
});

// Obtener incidencias activas (para dashboard)
router.get('/activas/resumen', async (req, res) => {
    try {
        const query = `
            SELECT 
                i.*,
                c.nombre as municipio_nombre,
                u.nombre as responsable_nombre,
                TIMESTAMPDIFF(HOUR, i.fecha_inicio, NOW()) as horas_transcurridas
            FROM incidencias_servicio i
            LEFT JOIN ciudades c ON i.municipio_id = c.id
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            WHERE i.estado IN ('reportado', 'en_atencion')
            ORDER BY i.fecha_inicio DESC
            LIMIT 10
        `;
        
        const incidenciasActivas = await db.query(query);
        
        res.json({ incidencias_activas: incidenciasActivas });
        
    } catch (error) {
        console.error('Error obteniendo incidencias activas:', error);
        res.status(500).json({ error: 'Error obteniendo incidencias activas' });
    }
});

module.exports = router;