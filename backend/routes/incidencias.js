// backend/routes/incidencias.js
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
            search, 
            page = 1, 
            limit = 50 
        } = req.query;
        
        let query = `
            SELECT 
                i.*,
                m.nombre as municipio_nombre,
                m.departamento_nombre,
                u.nombre as responsable_nombre,
                TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
            FROM incidencias_servicio i
            LEFT JOIN municipios m ON i.municipio_id = m.id
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
        
        if (fechaInicio) {
            query += ' AND DATE(i.fecha_inicio) >= ?';
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            query += ' AND DATE(i.fecha_inicio) <= ?';
            params.push(fechaFin);
        }
        
        if (search) {
            query += ' AND (i.numero_incidencia LIKE ? OR i.descripcion LIKE ? OR m.nombre LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }
        
        // Contar total de registros
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult.total;
        
        // Agregar ordenamiento y paginación
        query += ' ORDER BY i.fecha_inicio DESC';
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const incidencias = await db.query(query, params);
        
        res.json({
            success: true,
            incidencias,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo incidencias activas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo incidencias activas' 
        });
    }
});

// Obtener incidencia por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                i.*,
                m.nombre as municipio_nombre,
                m.departamento_nombre,
                u.nombre as responsable_nombre,
                u.correo as responsable_correo,
                u.telefono as responsable_telefono,
                TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
            FROM incidencias_servicio i
            LEFT JOIN municipios m ON i.municipio_id = m.id
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            WHERE i.id = ?
        `;
        
        const [incidencia] = await db.query(query, [id]);
        
        if (!incidencia) {
            return res.status(404).json({ 
                success: false,
                error: 'Incidencia no encontrada' 
            });
        }
        
        res.json({
            success: true,
            incidencia
        });
        
    } catch (error) {
        console.error('Error obteniendo incidencia:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo incidencia' 
        });
    }
});

// Crear nueva incidencia
router.post('/', async (req, res) => {
    try {
        const {
            tipo_incidencia,
            categoria,
            fecha_inicio,
            usuarios_afectados = 0,
            municipio_id,
            direccion,
            coordenadas_lat,
            coordenadas_lng,
            descripcion,
            causa_raiz,
            responsable_id
        } = req.body;
        
        // Validaciones básicas
        if (!tipo_incidencia || !categoria || !descripcion) {
            return res.status(400).json({ 
                success: false,
                error: 'Faltan campos obligatorios (tipo_incidencia, categoria, descripcion)' 
            });
        }
        
        // Generar número de incidencia
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const queryLastIncidencia = `
            SELECT numero_incidencia as ultimo 
            FROM incidencias_servicio 
            WHERE numero_incidencia LIKE ? 
            ORDER BY id DESC LIMIT 1
        `;
        const [lastIncidencia] = await db.query(queryLastIncidencia, [`INC${year}${month}%`]);
        
        let numeroIncidencia;
        if (lastIncidencia && lastIncidencia.ultimo) {
            const ultimoNumero = parseInt(lastIncidencia.ultimo.substring(7));
            numeroIncidencia = `INC${year}${month}${(ultimoNumero + 1).toString().padStart(4, '0')}`;
        } else {
            numeroIncidencia = `INC${year}${month}0001`;
        }
        
        const query = `
            INSERT INTO incidencias_servicio (
                numero_incidencia, tipo_incidencia, categoria, fecha_inicio,
                usuarios_afectados, municipio_id, direccion, coordenadas_lat,
                coordenadas_lng, descripcion, causa_raiz, responsable_id, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reportado')
        `;
        
        const fechaInicioFinal = fecha_inicio || new Date();
        
        const result = await db.query(query, [
            numeroIncidencia, tipo_incidencia, categoria, fechaInicioFinal,
            usuarios_afectados, municipio_id, direccion, coordenadas_lat,
            coordenadas_lng, descripcion, causa_raiz, responsable_id
        ]);
        
        res.status(201).json({ 
            success: true,
            id: result.insertId,
            numero_incidencia: numeroIncidencia,
            message: 'Incidencia creada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error creando incidencia:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error creando incidencia' 
        });
    }
});

// Actualizar incidencia
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tipo_incidencia,
            categoria,
            fecha_inicio,
            fecha_fin,
            usuarios_afectados,
            municipio_id,
            direccion,
            coordenadas_lat,
            coordenadas_lng,
            descripcion,
            causa_raiz,
            solucion_aplicada,
            mecanismo_solucion,
            estado,
            responsable_id,
            observaciones
        } = req.body;
        
        // Verificar que la incidencia existe
        const checkQuery = 'SELECT id, estado as estado_anterior FROM incidencias_servicio WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ 
                success: false,
                error: 'Incidencia no encontrada' 
            });
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
        
        if (fecha_inicio) {
            updateFields.push('fecha_inicio = ?');
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            updateFields.push('fecha_fin = ?');
            params.push(fecha_fin);
        }
        
        if (usuarios_afectados !== undefined) {
            updateFields.push('usuarios_afectados = ?');
            params.push(usuarios_afectados);
        }
        
        if (municipio_id) {
            updateFields.push('municipio_id = ?');
            params.push(municipio_id);
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
        
        if (descripcion) {
            updateFields.push('descripcion = ?');
            params.push(descripcion);
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
            
            // Si se resuelve o cierra automáticamente, agregar fecha fin
            if ((estado === 'resuelto' || estado === 'cerrado') && !fecha_fin) {
                updateFields.push('fecha_fin = NOW()');
                
                // Calcular duración
                const duracionQuery = `
                    SELECT TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW()) as minutos
                    FROM incidencias_servicio WHERE id = ?
                `;
                const [duracionResult] = await db.query(duracionQuery, [id]);
                if (duracionResult) {
                    updateFields.push('tiempo_duracion_minutos = ?');
                    params.push(duracionResult.minutos);
                }
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
        
        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No hay campos para actualizar' 
            });
        }
        
        updateFields.push('updated_at = NOW()');
        params.push(id);
        
        const query = `UPDATE incidencias_servicio SET ${updateFields.join(', ')} WHERE id = ?`;
        await db.query(query, params);
        
        res.json({ 
            success: true,
            message: 'Incidencia actualizada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error actualizando incidencia:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando incidencia' 
        });
    }
});

// Cerrar incidencia
router.post('/:id/cerrar', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            solucion_aplicada, 
            mecanismo_solucion, 
            observaciones 
        } = req.body;
        
        // Verificar que la incidencia existe y no está cerrada
        const checkQuery = 'SELECT id, estado FROM incidencias_servicio WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ 
                success: false,
                error: 'Incidencia no encontrada' 
            });
        }
        
        if (existing.estado === 'cerrado') {
            return res.status(400).json({ 
                success: false,
                error: 'La incidencia ya está cerrada' 
            });
        }
        
        // Calcular duración
        const duracionQuery = `
            SELECT TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW()) as minutos
            FROM incidencias_servicio WHERE id = ?
        `;
        const [duracionResult] = await db.query(duracionQuery, [id]);
        const duracion = duracionResult ? duracionResult.minutos : 0;
        
        const query = `
            UPDATE incidencias_servicio 
            SET estado = 'cerrado',
                fecha_fin = NOW(),
                tiempo_duracion_minutos = ?,
                solucion_aplicada = COALESCE(?, solucion_aplicada),
                mecanismo_solucion = COALESCE(?, mecanismo_solucion),
                observaciones = COALESCE(?, observaciones),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.query(query, [
            duracion, 
            solucion_aplicada, 
            mecanismo_solucion, 
            observaciones, 
            id
        ]);
        
        res.json({ 
            success: true,
            message: 'Incidencia cerrada exitosamente',
            duracion_minutos: duracion
        });
        
    } catch (error) {
        console.error('Error cerrando incidencia:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error cerrando incidencia' 
        });
    }
});

// Obtener municipios para formulario
router.get('/municipios/disponibles', async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, departamento_nombre
            FROM municipios 
            ORDER BY departamento_nombre, nombre
        `;
        
        const municipios = await db.query(query);
        
        res.json({
            success: true,
            municipios
        });
        
    } catch (error) {
        console.error('Error obteniendo municipios:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo municipios' 
        });
    }
});

// Obtener responsables disponibles
router.get('/responsables/disponibles', async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, correo, telefono
            FROM sistema_usuarios 
            WHERE activo = 1 AND rol IN ('administrador', 'supervisor', 'instalador')
            ORDER BY nombre
        `;
        
        const responsables = await db.query(query);
        
        res.json({
            success: true,
            responsables
        });
        
    } catch (error) {
        console.error('Error obteniendo responsables:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo responsables' 
        });
    }
});

// Reporte de disponibilidad del servicio
router.get('/reportes/disponibilidad', async (req, res) => {
    try {
        const { mes, anno } = req.query;
        
        if (!mes || !anno) {
            return res.status(400).json({ 
                success: false,
                error: 'mes y anno son requeridos' 
            });
        }
        
        // Calcular métricas de disponibilidad
        const query = `
            SELECT 
                COUNT(*) as total_incidencias,
                SUM(tiempo_duracion_minutos) as total_minutos_inactividad,
                SUM(usuarios_afectados) as total_usuarios_afectados,
                AVG(tiempo_duracion_minutos) as promedio_duracion,
                COUNT(CASE WHEN tipo_incidencia = 'no_programado' THEN 1 END) as incidencias_no_programadas,
                COUNT(CASE WHEN tipo_incidencia = 'emergencia' THEN 1 END) as emergencias
            FROM incidencias_servicio
            WHERE YEAR(fecha_inicio) = ? AND MONTH(fecha_inicio) = ?
                AND estado = 'cerrado'
        `;
        
        const [metricas] = await db.query(query, [anno, mes]);
        
        // Calcular disponibilidad (asumiendo 30 días * 24 horas * 60 minutos = 43,200 minutos/mes)
        const minutosTotalesMes = 30 * 24 * 60;
        const minutosInactividad = metricas.total_minutos_inactividad || 0;
        const disponibilidadPorcentaje = ((minutosTotalesMes - minutosInactividad) / minutosTotalesMes) * 100;
        
        // Detalle por categoría
        const queryCategoria = `
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                SUM(tiempo_duracion_minutos) as minutos_inactividad,
                SUM(usuarios_afectados) as usuarios_afectados
            FROM incidencias_servicio
            WHERE YEAR(fecha_inicio) = ? AND MONTH(fecha_inicio) = ?
                AND estado = 'cerrado'
            GROUP BY categoria
        `;
        
        const categorias = await db.query(queryCategoria, [anno, mes]);
        
        res.json({
            success: true,
            reporte: {
                mes: parseInt(mes),
                anno: parseInt(anno),
                disponibilidad_porcentaje: Math.round(disponibilidadPorcentaje * 100) / 100,
                ...metricas,
                minutos_totales_mes: minutosTotalesMes,
                por_categoria: categorias
            }
        });
        
    } catch (error) {
        console.error('Error generando reporte de disponibilidad:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error generando reporte' 
        });
    }
});

module.exports = router;
       