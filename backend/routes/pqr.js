// backend/routes/pqr.js
const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = Database;

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todas las PQR con filtros y paginación
router.get('/', async (req, res) => {
    try {
        const { 
            estado, 
            tipo, 
            categoria,
            fechaInicio, 
            fechaFin, 
            search, 
            page = 1, 
            limit = 50 
        } = req.query;
        
        let query = `
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                c.telefono as cliente_telefono,
                c.correo as cliente_correo,
                u.nombre as usuario_asignado_nombre
            FROM pqr p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (estado) {
            query += ' AND p.estado = ?';
            params.push(estado);
        }
        
        if (tipo) {
            query += ' AND p.tipo = ?';
            params.push(tipo);
        }
        
        if (categoria) {
            query += ' AND p.categoria = ?';
            params.push(categoria);
        }
        
        if (fechaInicio) {
            query += ' AND DATE(p.fecha_recepcion) >= ?';
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            query += ' AND DATE(p.fecha_recepcion) <= ?';
            params.push(fechaFin);
        }
        
        if (search) {
            query += ' AND (p.numero_radicado LIKE ? OR c.nombre LIKE ? OR c.identificacion LIKE ? OR p.asunto LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }
        
        // Contar total de registros
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult.total;
        
       // ✅ DESPUÉS:
query += ' ORDER BY p.fecha_recepcion DESC';
const offset = (page - 1) * limit;
query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
// NO agregues limit y offset a params
        const pqrs = await db.query(query, params);
        
        res.json({
            success: true,
            pqrs,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo PQRs:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo PQRs' 
        });
    }
});

// Obtener estadísticas de PQR
router.get('/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN estado = 'abierto' THEN 1 END) as abiertos,
                COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
                COUNT(CASE WHEN estado = 'resuelto' THEN 1 END) as resueltos,
                COUNT(CASE WHEN estado = 'cerrado' THEN 1 END) as cerrados,
                COUNT(CASE WHEN estado = 'escalado' THEN 1 END) as escalados,
                AVG(tiempo_respuesta_horas) as tiempo_promedio_respuesta,
                COUNT(CASE WHEN fecha_recepcion >= CURDATE() - INTERVAL 30 DAY THEN 1 END) as ultimos_30_dias,
                COUNT(CASE WHEN prioridad = 'critica' AND estado IN ('abierto', 'en_proceso') THEN 1 END) as criticos_pendientes
            FROM pqr
        `;
        
        const [estadisticas] = await db.query(query);
        
        // Estadísticas por tipo y categoría
        const tiposQuery = `
            SELECT tipo, COUNT(*) as cantidad
            FROM pqr 
            GROUP BY tipo
        `;
        const tipos = await db.query(tiposQuery);
        
        const categoriasQuery = `
            SELECT categoria, COUNT(*) as cantidad
            FROM pqr 
            GROUP BY categoria
        `;
        const categorias = await db.query(categoriasQuery);
        
        res.json({
            success: true,
            estadisticas: {
                ...estadisticas,
                por_tipo: tipos,
                por_categoria: categorias
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas PQR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo estadísticas' 
        });
    }
});

// Obtener PQR por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                c.telefono as cliente_telefono,
                c.correo as cliente_correo,
                c.direccion as cliente_direccion,
                u.nombre as usuario_asignado_nombre,
                u.correo as usuario_asignado_correo
            FROM pqr p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE p.id = ?
        `;
        
        const [pqr] = await db.query(query, [id]);
        
        if (!pqr) {
            return res.status(404).json({ 
                success: false,
                error: 'PQR no encontrada' 
            });
        }
        
        res.json({
            success: true,
            pqr
        });
        
    } catch (error) {
        console.error('Error obteniendo PQR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo PQR' 
        });
    }
});

// Crear nueva PQR
router.post('/', async (req, res) => {
    try {
        const {
            cliente_id,
            tipo,
            categoria,
            servicio_afectado = 'internet',
            medio_recepcion,
            asunto,
            descripcion,
            prioridad = 'media'
        } = req.body;
        
        // Validaciones básicas
        if (!cliente_id || !tipo || !categoria || !medio_recepcion || !asunto || !descripcion) {
            return res.status(400).json({ 
                success: false,
                error: 'Faltan campos obligatorios' 
            });
        }
        
        // Verificar que el cliente existe
        const clienteQuery = 'SELECT id FROM clientes WHERE id = ?';
        const [cliente] = await db.query(clienteQuery, [cliente_id]);
        
        if (!cliente) {
            return res.status(400).json({ 
                success: false,
                error: 'Cliente no válido' 
            });
        }
        
        // Generar número de radicado
        const year = new Date().getFullYear();
        const queryLastRadicado = 'SELECT numero_radicado as ultimo FROM pqr WHERE numero_radicado LIKE ? ORDER BY id DESC LIMIT 1';
        const [lastRadicado] = await db.query(queryLastRadicado, [`${year}%`]);
        
        let numeroRadicado;
        if (lastRadicado && lastRadicado.ultimo) {
            const ultimoNumero = parseInt(lastRadicado.ultimo.substring(4));
            numeroRadicado = `${year}${(ultimoNumero + 1).toString().padStart(6, '0')}`;
        } else {
            numeroRadicado = `${year}000001`;
        }
        
        // Calcular fecha de vencimiento (15 días hábiles)
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
        
        const query = `
            INSERT INTO pqr (
                numero_radicado, cliente_id, tipo, categoria, servicio_afectado,
                medio_recepcion, fecha_recepcion, asunto, 
                descripcion, prioridad, estado
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'abierto')
        `;
        
        const result = await db.query(query, [
            numeroRadicado, cliente_id, tipo, categoria, servicio_afectado,
            medio_recepcion, asunto, descripcion, prioridad
        ]);
        
        res.status(201).json({ 
            success: true,
            id: result.insertId,
            numero_radicado: numeroRadicado,
            message: 'PQR creada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error creando PQR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error creando PQR' 
        });
    }
});
// Actualizar PQR
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 🔍 LOG 1: Ver qué llega
        console.log('🔍 PUT /pqr/:id - ID:', id);
        console.log('🔍 Body recibido:', JSON.stringify(req.body, null, 2));

        const {
            tipo,
            categoria,
            medio_recepcion,
            asunto,
            descripcion,
            prioridad,
            estado,
            respuesta,
            usuario_asignado,
            satisfaccion_cliente,
            notas_internas
        } = req.body;

        // Verificar que la PQR existe
        const checkQuery = 'SELECT id, estado as estado_anterior, fecha_recepcion FROM pqr WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);

        if (!existing) {
            return res.status(404).json({ 
                success: false,
                error: 'PQR no encontrada' 
            });
        }

        const updateFields = [];
        const params = [];

        // Campos que pueden actualizarse directamente
        if (tipo) { updateFields.push('tipo = ?'); params.push(tipo); }
        if (categoria) { updateFields.push('categoria = ?'); params.push(categoria); }
        if (medio_recepcion) { updateFields.push('medio_recepcion = ?'); params.push(medio_recepcion); }
        if (asunto) { updateFields.push('asunto = ?'); params.push(asunto); }
        if (descripcion) { updateFields.push('descripcion = ?'); params.push(descripcion); }
        if (prioridad) { updateFields.push('prioridad = ?'); params.push(prioridad); }
        if (respuesta) { updateFields.push('respuesta = ?'); params.push(respuesta); }
        if (satisfaccion_cliente) { updateFields.push('satisfaccion_cliente = ?'); params.push(satisfaccion_cliente); }
        if (notas_internas) { updateFields.push('notas_internas = ?'); params.push(notas_internas); }

        // Estado
        if (estado) {
            updateFields.push('estado = ?');
            params.push(estado);

            // Si se resuelve o cierra, agregar fecha de respuesta y tiempo
            if (estado === 'resuelto' || estado === 'cerrado') {
                updateFields.push('fecha_respuesta = NOW()');

                const tiempoQuery = `
                    SELECT TIMESTAMPDIFF(HOUR, fecha_recepcion, NOW()) as horas
                    FROM pqr WHERE id = ?
                `;
                const [tiempoResult] = await db.query(tiempoQuery, [id]);
                if (tiempoResult && tiempoResult.horas !== null) {
                    updateFields.push('tiempo_respuesta_horas = ?');
                    params.push(tiempoResult.horas);
                }
            }
        }

        // Usuario asignado
        if (usuario_asignado) {
            updateFields.push('usuario_asignado = ?');
            params.push(usuario_asignado);
            // ❌ Eliminado fecha_asignacion porque no existe en la tabla
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No hay campos para actualizar' 
            });
        }

        // Siempre actualizar updated_at
        updateFields.push('updated_at = NOW()');

        // Agregar id al final de params para el WHERE
        params.push(id);

        // 🔍 LOG 2: Revisar query y parámetros
        console.log('🔍 updateFields:', updateFields);
        console.log('🔍 params:', params);

        const query = `UPDATE pqr SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('🔍 Query final:', query);

        await db.query(query, params);

        res.json({ 
            success: true,
            message: 'PQR actualizada exitosamente' 
        });

    } catch (error) {
        console.error('❌ Error actualizando PQR:', error);
        console.error('❌ Error código SQL:', error.code);
        console.error('❌ Error sqlMessage:', error.sqlMessage);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            error: 'Error actualizando PQR',
            details: error.sqlMessage
        });
    }
});


// Eliminar PQR
router.delete('/:id', requireRole('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que la PQR existe
        const checkQuery = 'SELECT id FROM pqr WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ 
                success: false,
                error: 'PQR no encontrada' 
            });
        }
        
        const query = 'DELETE FROM pqr WHERE id = ?';
        await db.query(query, [id]);
        
        res.json({ 
            success: true,
            message: 'PQR eliminada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error eliminando PQR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error eliminando PQR' 
        });
    }
});

// Asignar PQR a usuario
router.post('/:id/asignar', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id } = req.body;
        
        if (!usuario_id) {
            return res.status(400).json({ 
                success: false,
                error: 'usuario_id es requerido' 
            });
        }
        
        // Verificar que el usuario existe
        const userQuery = 'SELECT id FROM sistema_usuarios WHERE id = ? AND activo = 1';
        const [user] = await db.query(userQuery, [usuario_id]);
        
        if (!user) {
            return res.status(400).json({ 
                success: false,
                error: 'Usuario no válido' 
            });
        }
        
        const query = `
            UPDATE pqr 
            SET usuario_asignado = ?, 
                estado = CASE WHEN estado = 'abierto' THEN 'en_proceso' ELSE estado END,
                fecha_asignacion = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.query(query, [usuario_id, id]);
        
        res.json({ 
            success: true,
            message: 'PQR asignada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error asignando PQR:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error asignando PQR' 
        });
    }
});

// Obtener PQRs por cliente
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        
        const query = `
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                u.nombre as usuario_asignado_nombre
            FROM pqr p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE p.cliente_id = ?
            ORDER BY p.fecha_recepcion DESC
        `;
        
        const pqrs = await db.query(query, [clienteId]);
        
        res.json({ 
            success: true,
            pqrs 
        });
        
    } catch (error) {
        console.error('Error obteniendo PQRs del cliente:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo PQRs del cliente' 
        });
    }
});

// Obtener usuarios para asignación
router.get('/usuarios/disponibles', async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, correo, rol
            FROM sistema_usuarios 
            WHERE activo = 1 AND rol IN ('administrador', 'supervisor')
            ORDER BY nombre
        `;
        
        const usuarios = await db.query(query);
        
        res.json({
            success: true,
            usuarios
        });
        
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error obteniendo usuarios' 
        });
    }
});

// Reportes de PQR para CRC
router.get('/reportes/crc', async (req, res) => {
    try {
        const { anno, trimestre } = req.query;
        
        if (!anno || !trimestre) {
            return res.status(400).json({ 
                success: false,
                error: 'anno y trimestre son requeridos' 
            });
        }
        
        // Calcular meses del trimestre
        let meses;
        switch(trimestre) {
            case '1': meses = [1, 2, 3]; break;
            case '2': meses = [4, 5, 6]; break;
            case '3': meses = [7, 8, 9]; break;
            case '4': meses = [10, 11, 12]; break;
            default: 
                return res.status(400).json({ 
                    success: false,
                    error: 'Trimestre inválido' 
                });
        }
        
        // Reporte de monitoreo de quejas
        const queryQuejas = `
            SELECT 
                ? as ANNO,
                ? as TRIMESTRE,
                COUNT(*) as TOTAL_QUEJAS,
                COUNT(CASE WHEN estado IN ('resuelto', 'cerrado') THEN 1 END) as QUEJAS_RESUELTAS,
                AVG(tiempo_respuesta_horas) as TIEMPO_PROMEDIO_DIAS,
                COUNT(CASE WHEN satisfaccion_cliente IN ('satisfecho', 'muy_satisfecho') THEN 1 END) as SATISFECHOS
            FROM pqr 
            WHERE YEAR(fecha_recepcion) = ? 
                AND MONTH(fecha_recepcion) IN (?, ?, ?)
                AND tipo = 'queja'
        `;
        
        const [reporteQuejas] = await db.query(queryQuejas, [
            anno, trimestre, anno, ...meses
        ]);
        
        // Reporte por categorías
        const queryCategorias = `
            SELECT 
                categoria,
                COUNT(*) as cantidad,
                AVG(tiempo_respuesta_horas) as tiempo_promedio
            FROM pqr 
            WHERE YEAR(fecha_recepcion) = ? 
                AND MONTH(fecha_recepcion) IN (?, ?, ?)
            GROUP BY categoria
        `;
        
        const categorias = await db.query(queryCategorias, [anno, ...meses]);
        
        res.json({
            success: true,
            reporte: {
                ...reporteQuejas,
                TIEMPO_PROMEDIO_DIAS: reporteQuejas.TIEMPO_PROMEDIO_DIAS ? 
                    Math.round(reporteQuejas.TIEMPO_PROMEDIO_DIAS / 24 * 100) / 100 : 0,
                por_categoria: categorias
            }
        });
        
    } catch (error) {
        console.error('Error generando reporte CRC:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error generando reporte' 
        });
    }
});

module.exports = router;