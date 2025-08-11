// backend/routes/incidencias.js
const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = Database;

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// =====================================================
// RUTAS PRINCIPALES DE INCIDENCIAS
// =====================================================

/**
 * @route GET /api/incidencias
 * @desc Obtener todas las incidencias con filtros opcionales
 * @access Private (Administrador, Supervisor, Instalador)
 */
router.get('/', requireRole('administrador', 'supervisor', 'instalador'), async (req, res) => {
    try {
        console.log('📋 GET /api/incidencias - Obteniendo incidencias');

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
                u.nombre as responsable_nombre,
                TIMESTAMPDIFF(MINUTE, i.fecha_inicio, COALESCE(i.fecha_fin, NOW())) as duracion_minutos
            FROM incidencias_servicio i
            LEFT JOIN ciudades c ON i.municipio_id = c.id
            LEFT JOIN departamentos d ON c.departamento_id = d.id
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            WHERE 1=1
        `;

        const queryParams = [];

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
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }

        // Contar total para paginación
        let countQuery = `
            SELECT COUNT(*) as total
            FROM incidencias_servicio i
            LEFT JOIN ciudades c ON i.municipio_id = c.id
            WHERE 1=1
        `;
        const countParams = [...queryParams.slice(0, -3)]; // Excluir parámetros de búsqueda para el conteo

        // Aplicar los mismos filtros al conteo
        let countParamIndex = 0;
        if (tipo) {
            countQuery += ' AND i.tipo = ?';
            countParamIndex++;
        }
        if (estado) {
            countQuery += ' AND i.estado = ?';
            countParamIndex++;
        }
        if (municipio_id) {
            countQuery += ' AND i.municipio_id = ?';
            countParamIndex++;
        }
        if (fecha_inicio) {
            countQuery += ' AND DATE(i.fecha_inicio) >= ?';
            countParamIndex++;
        }
        if (fecha_fin) {
            countQuery += ' AND DATE(i.fecha_inicio) <= ?';
            countParamIndex++;
        }
        if (responsable_id) {
            countQuery += ' AND i.responsable_id = ?';
            countParamIndex++;
        }
        if (search) {
            countQuery += ' AND (i.titulo LIKE ? OR i.descripcion LIKE ? OR c.nombre LIKE ?)';
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam);
        }

        const [{ total }] = await db.query(countQuery, countParams);

        // Agregar ordenamiento y paginación a la consulta principal
        query += ' ORDER BY i.fecha_inicio DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const incidencias = await db.query(query, queryParams);

        console.log(`✅ Encontradas ${incidencias.length} incidencias de ${total} total`);

        res.json({
            success: true,
            data: {
                incidencias,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    pages: Math.ceil(total / limit)
                }
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
});

/**
 * @route GET /api/incidencias/estadisticas
 * @desc Obtener estadísticas completas de incidencias
 * @access Private (Administrador, Supervisor)
 */
router.get('/estadisticas', requireRole('administrador', 'supervisor'), async (req, res) => {
    try {
        console.log('📊 GET /api/incidencias/estadisticas');

        // Estadísticas por estado
        const estadisticasPorEstado = await db.query(`
            SELECT 
                estado,
                COUNT(*) as total,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM incidencias_servicio), 2) as porcentaje
            FROM incidencias_servicio 
            GROUP BY estado
            ORDER BY total DESC
        `);

        // Estadísticas por tipo
        const estadisticasPorTipo = await db.query(`
            SELECT 
                tipo_incidencia,
                COUNT(*) as total,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM incidencias_servicio), 2) as porcentaje
            FROM incidencias_servicio 
            GROUP BY tipo_incidencia
            ORDER BY total DESC
        `);

        // Incidencias del mes actual
        const incidenciasMesActual = await db.query(`
            SELECT COUNT(*) as total
            FROM incidencias_servicio 
            WHERE YEAR(fecha_inicio) = YEAR(CURDATE()) 
            AND MONTH(fecha_inicio) = MONTH(CURDATE())
        `);

        // Incidencias activas
        const incidenciasActivas = await db.query(`
            SELECT COUNT(*) as total
            FROM incidencias_servicio 
            WHERE estado IN ('reportado', 'en_progreso')
        `);

        // Tiempo promedio de resolución
        const tiempoPromedioResolucion = await db.query(`
            SELECT 
                ROUND(AVG(TIMESTAMPDIFF(HOUR, fecha_inicio, fecha_fin)), 2) as promedio_horas
            FROM incidencias_servicio 
            WHERE estado = 'resuelto' 
            AND fecha_fin IS NOT NULL
        `);

        const estadisticas = {
            resumen: {
                total_incidencias: estadisticasPorEstado.reduce((sum, e) => sum + e.total, 0),
                incidencias_activas: incidenciasActivas[0]?.total || 0,
                incidencias_mes_actual: incidenciasMesActual[0]?.total || 0,
                tiempo_promedio_resolucion: tiempoPromedioResolucion[0]?.promedio_horas || 0
            },
            por_estado: estadisticasPorEstado,
            por_tipo: estadisticasPorTipo
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
});

/**
 * @route GET /api/incidencias/activas/resumen
 * @desc Obtener resumen de incidencias activas
 * @access Private (Administrador, Supervisor, Instalador)
 */
router.get('/activas/resumen', requireRole('administrador', 'supervisor', 'instalador'), async (req, res) => {
    try {
        console.log('🚨 GET /api/incidencias/activas/resumen');

        const incidenciasActivas = await db.query(`
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

        console.log(`✅ Encontradas ${incidenciasActivas.length} incidencias activas`);

        res.json({
            success: true,
            data: incidenciasActivas,
            message: 'Resumen de incidencias activas obtenido'
        });

    } catch (error) {
        console.error('❌ Error obteniendo incidencias activas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/**
 * @route GET /api/incidencias/municipios/disponibles
 * @desc Obtener municipios disponibles
 * @access Private
 */
router.get('/municipios/disponibles', async (req, res) => {
    try {
        console.log('🏘️ GET /api/incidencias/municipios/disponibles');

        const municipios = await db.query(`
            SELECT 
                c.id,
                c.nombre,
                d.nombre as departamento_nombre
            FROM ciudades c
            INNER JOIN departamentos d ON c.departamento_id = d.id
            WHERE c.activo = 1
            ORDER BY d.nombre, c.nombre
        `);

        console.log(`✅ Encontrados ${municipios.length} municipios`);

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
});

/**
 * @route GET /api/incidencias/responsables/disponibles
 * @desc Obtener responsables disponibles
 * @access Private
 */
router.get('/responsables/disponibles', async (req, res) => {
    try {
        console.log('👷 GET /api/incidencias/responsables/disponibles');

        const responsables = await db.query(`
            SELECT 
                id,
                CONCAT(nombres, ' ', apellidos) as nombre,
                rol
            FROM sistema_usuarios
            WHERE rol IN ('instalador', 'supervisor', 'administrador') 
            AND activo = 1
            ORDER BY nombres, apellidos
        `);

        console.log(`✅ Encontrados ${responsables.length} responsables`);

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
});

/**
 * @route GET /api/incidencias/:id
 * @desc Obtener incidencia por ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 GET /api/incidencias/${id}`);

        const [incidencia] = await db.query(`
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
});

/**
 * @route POST /api/incidencias
 * @desc Crear nueva incidencia
 * @access Private (Administrador, Supervisor, Instalador)
 */
router.post('/', requireRole('administrador', 'supervisor', 'instalador'), async (req, res) => {
    try {
        console.log('➕ POST /api/incidencias - Creando incidencia');

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

        // Validaciones básicas
        if (!tipo || !titulo || !descripcion || !municipio_id) {
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: tipo, titulo, descripcion, municipio_id'
            });
        }

        const result = await db.query(`
            INSERT INTO incidencias_servicio (
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
                fecha_inicio,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reportado', NOW(), NOW())
        `, [
            tipo,
            titulo,
            descripcion,
            municipio_id,
            direccion || null,
            coordenadas_lat || null,
            coordenadas_lng || null,
            usuarios_afectados || 0,
            responsable_id || null,
            observaciones || null
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
});

/**
 * @route PUT /api/incidencias/:id
 * @desc Actualizar incidencia
 * @access Private (Administrador, Supervisor, Instalador)
 */
router.put('/:id', requireRole('administrador', 'supervisor', 'instalador'), async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`✏️ PUT /api/incidencias/${id} - Actualizando incidencia`);

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
        const [incidenciaExistente] = await db.query(
            'SELECT id FROM incidencias_servicio WHERE id = ?',
            [id]
        );

        if (!incidenciaExistente) {
            return res.status(404).json({
                success: false,
                message: 'Incidencia no encontrada'
            });
        }

        await db.query(`
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
});

/**
 * @route POST /api/incidencias/:id/cerrar
 * @desc Cerrar incidencia
 * @access Private (Administrador, Supervisor, Instalador)
 */
router.post('/:id/cerrar', requireRole('administrador', 'supervisor', 'instalador'), async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔒 POST /api/incidencias/${id}/cerrar - Cerrando incidencia`);

        const {
            solucion_aplicada,
            mecanismo_solucion,
            observaciones_cierre
        } = req.body;

        // Verificar que la incidencia existe y no está cerrada
        const [incidencia] = await db.query(
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

        // Calcular duración en minutos
        const duracionQuery = `
            SELECT TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW()) as minutos
            FROM incidencias_servicio WHERE id = ?
        `;
        const [duracionResult] = await db.query(duracionQuery, [id]);
        const duracion = duracionResult ? duracionResult.minutos : 0;

        await db.query(`
            UPDATE incidencias_servicio 
            SET estado = 'cerrado',
                fecha_fin = NOW(),
                tiempo_duracion_minutos = ?,
                solucion_aplicada = COALESCE(?, solucion_aplicada),
                mecanismo_solucion = COALESCE(?, mecanismo_solucion),
                observaciones = CASE 
                    WHEN ? IS NOT NULL THEN 
                        CONCAT(COALESCE(observaciones, ''), '\n\nCierre: ', ?)
                    ELSE observaciones
                END,
                updated_at = NOW()
            WHERE id = ?
        `, [
            duracion,
            solucion_aplicada,
            mecanismo_solucion,
            observaciones_cierre,
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
});

module.exports = router;