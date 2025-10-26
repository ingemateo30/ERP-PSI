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

       // ✅ DESPUÉS:
        query += ' ORDER BY i.fecha_inicio DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;


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
                nombre as nombre,
                rol
            FROM sistema_usuarios
            WHERE rol IN ('instalador') 
            AND activo = 1
            ORDER BY nombre
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
        
        // Generar número único de incidencia
        const year = new Date().getFullYear();
        const lastIncidencia = await db.query(
            'SELECT numero_incidencia FROM incidencias_servicio WHERE numero_incidencia LIKE ? ORDER BY id DESC LIMIT 1',
            [`INC-${year}%`]
        );
        
        let numeroIncidencia;
        if (lastIncidencia.length > 0) {
            const lastNumber = parseInt(lastIncidencia[0].numero_incidencia.split('-')[2]);
            numeroIncidencia = `INC-${year}-${String(lastNumber + 1).padStart(6, '0')}`;
        } else {
            numeroIncidencia = `INC-${year}-000001`;
        }
        
        console.log('📝 Número de incidencia generado:', numeroIncidencia);
        
        const result = await db.query(`
            INSERT INTO incidencias_servicio (
                numero_incidencia,
                tipo_incidencia,
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
            numeroIncidencia,
            tipo,
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
            data: { id: result.insertId, numero_incidencia: numeroIncidencia },
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
            tipo_incidencia,          // Cambiado de 'tipo'
            categoria,                // Nuevo campo obligatorio
            titulo,                   // Este campo NO existe en la BD
            descripcion,
            municipio_id,
            direccion,
            coordenadas_lat,
            coordenadas_lng,
            usuarios_afectados,
            responsable_id,
            observaciones,
            estado,
            fecha_inicio,             // Nuevo campo
            fecha_fin,                // Nuevo campo
            causa_raiz,               // Nuevo campo
            solucion_aplicada,        // Nuevo campo
            mecanismo_solucion        // Nuevo campo
        } = req.body;

        // Validaciones básicas
        if (tipo_incidencia && !['programado', 'no_programado', 'emergencia'].includes(tipo_incidencia)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de incidencia inválido. Debe ser: programado, no_programado, emergencia'
            });
        }

        if (categoria && !['fibra_cortada', 'falla_energia', 'mantenimiento', 'actualizacion', 'otros'].includes(categoria)) {
            return res.status(400).json({
                success: false,
                message: 'Categoría inválida. Debe ser: fibra_cortada, falla_energia, mantenimiento, actualizacion, otros'
            });
        }

        if (estado && !['reportado', 'en_atencion', 'resuelto', 'cerrado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Debe ser: reportado, en_atencion, resuelto, cerrado'
            });
        }

        if (mecanismo_solucion && !['reparacion', 'reemplazo', 'configuracion', 'otro'].includes(mecanismo_solucion)) {
            return res.status(400).json({
                success: false,
                message: 'Mecanismo de solución inválido. Debe ser: reparacion, reemplazo, configuracion, otro'
            });
        }

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

        // Construir la query dinámicamente solo con los campos que se envían
        const updates = [];
        const values = [];

        if (tipo_incidencia !== undefined) {
            updates.push('tipo_incidencia = ?');
            values.push(tipo_incidencia);
        }
        if (categoria !== undefined) {
            updates.push('categoria = ?');
            values.push(categoria);
        }
        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            values.push(descripcion);
        }
        if (municipio_id !== undefined) {
            updates.push('municipio_id = ?');
            values.push(municipio_id);
        }
        if (direccion !== undefined) {
            updates.push('direccion = ?');
            values.push(direccion);
        }
        if (coordenadas_lat !== undefined) {
            updates.push('coordenadas_lat = ?');
            values.push(coordenadas_lat);
        }
        if (coordenadas_lng !== undefined) {
            updates.push('coordenadas_lng = ?');
            values.push(coordenadas_lng);
        }
        if (usuarios_afectados !== undefined) {
            updates.push('usuarios_afectados = ?');
            values.push(usuarios_afectados);
        }
        if (responsable_id !== undefined) {
            updates.push('responsable_id = ?');
            values.push(responsable_id);
        }
        if (observaciones !== undefined) {
            updates.push('observaciones = ?');
            values.push(observaciones);
        }
        if (estado !== undefined) {
            updates.push('estado = ?');
            values.push(estado);
        }
        if (fecha_inicio !== undefined) {
            updates.push('fecha_inicio = ?');
            values.push(fecha_inicio);
        }
        if (fecha_fin !== undefined) {
            updates.push('fecha_fin = ?');
            values.push(fecha_fin);
        }
        if (causa_raiz !== undefined) {
            updates.push('causa_raiz = ?');
            values.push(causa_raiz);
        }
        if (solucion_aplicada !== undefined) {
            updates.push('solucion_aplicada = ?');
            values.push(solucion_aplicada);
        }
        if (mecanismo_solucion !== undefined) {
            updates.push('mecanismo_solucion = ?');
            values.push(mecanismo_solucion);
        }

        // Siempre actualizar updated_at
        updates.push('updated_at = NOW()');

        if (updates.length === 1) { // Solo updated_at
            return res.status(400).json({
                success: false,
                message: 'No se proporcionaron campos para actualizar'
            });
        }

        // Agregar el ID al final
        values.push(id);

        const query = `
            UPDATE incidencias_servicio SET
                ${updates.join(', ')}
            WHERE id = ?
        `;

        console.log('📝 Query de actualización:', query);
        console.log('📝 Valores:', values);

        await db.query(query, values);

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

        // Validar mecanismo_solucion si se proporciona
        if (mecanismo_solucion && !['reparacion', 'reemplazo', 'configuracion', 'otro'].includes(mecanismo_solucion)) {
            return res.status(400).json({
                success: false,
                message: 'Mecanismo de solución inválido. Debe ser: reparacion, reemplazo, configuracion, otro'
            });
        }

        // Verificar que la incidencia existe y no está cerrada
        const [incidencia] = await db.query(
            'SELECT id, estado, fecha_inicio, observaciones FROM incidencias_servicio WHERE id = ?',
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

        // Construir observaciones actualizadas
        let observaciones_actualizadas = incidencia.observaciones || '';
        if (observaciones_cierre) {
            const timestamp = new Date().toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            if (observaciones_actualizadas) {
                observaciones_actualizadas += `\n\n--- CIERRE (${timestamp}) ---\n${observaciones_cierre}`;
            } else {
                observaciones_actualizadas = `--- CIERRE (${timestamp}) ---\n${observaciones_cierre}`;
            }
        }

        // Construir query dinámicamente para evitar undefined
        const updates = [
            'estado = "cerrado"',
            'fecha_fin = NOW()',
            `tiempo_duracion_minutos = ${duracion}`,
            'updated_at = NOW()'
        ];
        const params = [];

        // Solo agregar campos que no son undefined/null
        if (solucion_aplicada !== undefined && solucion_aplicada !== null) {
            updates.push('solucion_aplicada = ?');
            params.push(solucion_aplicada);
        }

        if (mecanismo_solucion !== undefined && mecanismo_solucion !== null) {
            updates.push('mecanismo_solucion = ?');
            params.push(mecanismo_solucion);
        }

        if (observaciones_cierre !== undefined && observaciones_cierre !== null) {
            updates.push('observaciones = ?');
            params.push(observaciones_actualizadas);
        }

        // Agregar el ID al final
        params.push(id);

        const query = `
            UPDATE incidencias_servicio 
            SET ${updates.join(', ')}
            WHERE id = ?
        `;

        console.log('📝 Query de cierre:', query);
        console.log('📝 Parámetros:', params);

        await db.query(query, params);

        console.log(`✅ Incidencia ${id} cerrada exitosamente - Duración: ${duracion} minutos`);

        // Obtener la incidencia actualizada para responder
        const [incidenciaActualizada] = await db.query(
            `SELECT 
                i.*,
                u.nombre as responsable_nombre,
                m.nombre as municipio_nombre
            FROM incidencias_servicio i
            LEFT JOIN sistema_usuarios u ON i.responsable_id = u.id
            LEFT JOIN ciudades m ON i.municipio_id = m.id
            WHERE i.id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Incidencia cerrada exitosamente',
            data: {
                id: incidenciaActualizada.id,
                numero_incidencia: incidenciaActualizada.numero_incidencia,
                estado: incidenciaActualizada.estado,
                fecha_inicio: incidenciaActualizada.fecha_inicio,
                fecha_fin: incidenciaActualizada.fecha_fin,
                tiempo_duracion_minutos: incidenciaActualizada.tiempo_duracion_minutos,
                duracion_formateada: formatearDuracion(incidenciaActualizada.tiempo_duracion_minutos),
                solucion_aplicada: incidenciaActualizada.solucion_aplicada,
                mecanismo_solucion: incidenciaActualizada.mecanismo_solucion
            }
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

// Función auxiliar para formatear duración
function formatearDuracion(minutos) {
    if (!minutos || minutos === 0) return '0 minutos';
    
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    
    let resultado = '';
    
    if (dias > 0) {
        resultado += `${dias} día${dias > 1 ? 's' : ''}`;
    }
    
    if (horasRestantes > 0) {
        if (resultado) resultado += ', ';
        resultado += `${horasRestantes} hora${horasRestantes > 1 ? 's' : ''}`;
    }
    
    if (mins > 0) {
        if (resultado) resultado += ', ';
        resultado += `${mins} minuto${mins > 1 ? 's' : ''}`;
    }
    
    return resultado || '0 minutos';
}

module.exports = router;