// routes/pqr.js
const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = Database;

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todas las PQR con filtros
router.get('/', async (req, res) => {
    try {
        const { estado, tipo, fechaInicio, fechaFin, search, page = 1, limit = 50 } = req.query;
        
        let query = `
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                c.telefono as cliente_telefono,
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
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY p.fecha_recepcion DESC';
        
        // Paginación
        const offset = (page - 1) * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
        
        const pqrs = await db.query(query, params);
        
        res.json({ 
            pqrs,
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('Error obteniendo PQRs:', error);
        res.status(500).json({ error: 'Error obteniendo PQRs' });
    }
});

// Obtener estadísticas de PQR
router.get('/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'abierto' THEN 1 ELSE 0 END) as abiertos,
                SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as enProceso,
                SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltos,
                SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) as cerrados,
                AVG(tiempo_respuesta_horas) as tiempo_promedio_respuesta,
                COUNT(CASE WHEN fecha_recepcion >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as ultimos_30_dias
            FROM pqr
        `;
        
        const [stats] = await db.query(query);
        
        // Estadísticas por tipo
        const queryTipos = `
            SELECT 
                tipo,
                COUNT(*) as cantidad,
                AVG(tiempo_respuesta_horas) as tiempo_promedio
            FROM pqr
            WHERE fecha_recepcion >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY tipo
        `;
        
        const estadisticasTipos = await db.query(queryTipos);
        
        res.json({
            ...stats,
            por_tipo: estadisticasTipos
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas PQR:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
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
                u.nombre as usuario_asignado_nombre
            FROM pqr p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE p.id = ?
        `;
        
        const [pqr] = await db.query(query, [id]);
        
        if (!pqr) {
            return res.status(404).json({ error: 'PQR no encontrada' });
        }
        
        res.json({ pqr });
        
    } catch (error) {
        console.error('Error obteniendo PQR:', error);
        res.status(500).json({ error: 'Error obteniendo PQR' });
    }
});

// Crear nueva PQR
router.post('/', async (req, res) => {
    try {
        const {
            cliente_id,
            tipo,
            categoria,
            medio_recepcion,
            asunto,
            descripcion,
            prioridad = 'media',
            servicio_afectado
        } = req.body;
        
        // Validaciones
        if (!cliente_id || !tipo || !categoria || !asunto || !descripcion) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos' 
            });
        }
        
        // Generar número de radicado único
        const year = new Date().getFullYear();
        const queryLastRadicado = 'SELECT MAX(numero_radicado) as ultimo FROM pqr WHERE numero_radicado LIKE ?';
        const [lastRadicado] = await db.query(queryLastRadicado, [`${year}%`]);
        
        let numeroRadicado;
        if (lastRadicado && lastRadicado.ultimo) {
            const ultimoNumero = parseInt(lastRadicado.ultimo.substring(4));
            numeroRadicado = `${year}${(ultimoNumero + 1).toString().padStart(6, '0')}`;
        } else {
            numeroRadicado = `${year}000001`;
        }
        
        const query = `
            INSERT INTO pqr (
                numero_radicado, cliente_id, tipo, categoria, servicio_afectado,
                medio_recepcion, fecha_recepcion, asunto, descripcion, prioridad, estado
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'abierto')
        `;
        
        const result = await db.query(query, [
            numeroRadicado, cliente_id, tipo, categoria, servicio_afectado,
            medio_recepcion, asunto, descripcion, prioridad
        ]);
        
        res.status(201).json({ 
            id: result.insertId,
            numero_radicado: numeroRadicado,
            message: 'PQR creada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error creando PQR:', error);
        res.status(500).json({ error: 'Error creando PQR' });
    }
});

// Actualizar PQR
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
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
            satisfaccion_cliente
        } = req.body;
        
        // Verificar que la PQR existe
        const checkQuery = 'SELECT id FROM pqr WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ error: 'PQR no encontrada' });
        }
        
        const updateFields = [];
        const params = [];
        
        if (tipo) {
            updateFields.push('tipo = ?');
            params.push(tipo);
        }
        
        if (categoria) {
            updateFields.push('categoria = ?');
            params.push(categoria);
        }
        
        if (medio_recepcion) {
            updateFields.push('medio_recepcion = ?');
            params.push(medio_recepcion);
        }
        
        if (asunto) {
            updateFields.push('asunto = ?');
            params.push(asunto);
        }
        
        if (descripcion) {
            updateFields.push('descripcion = ?');
            params.push(descripcion);
        }
        
        if (prioridad) {
            updateFields.push('prioridad = ?');
            params.push(prioridad);
        }
        
        if (estado) {
            updateFields.push('estado = ?');
            params.push(estado);
            
            // Si se está resolviendo o cerrando, marcar fecha de respuesta
            if (estado === 'resuelto' && !existing.fecha_respuesta) {
                updateFields.push('fecha_respuesta = NOW()');
                
                // Calcular tiempo de respuesta
                updateFields.push('tiempo_respuesta_horas = TIMESTAMPDIFF(HOUR, fecha_recepcion, NOW())');
            }
            
            if (estado === 'cerrado') {
                updateFields.push('fecha_cierre = NOW()');
            }
        }
        
        if (respuesta) {
            updateFields.push('respuesta = ?');
            params.push(respuesta);
            
            if (!existing.fecha_respuesta) {
                updateFields.push('fecha_respuesta = NOW()');
                updateFields.push('tiempo_respuesta_horas = TIMESTAMPDIFF(HOUR, fecha_recepcion, NOW())');
            }
        }
        
        if (usuario_asignado) {
            updateFields.push('usuario_asignado = ?');
            params.push(usuario_asignado);
        }
        
        if (satisfaccion_cliente) {
            updateFields.push('satisfaccion_cliente = ?');
            params.push(satisfaccion_cliente);
        }
        
        updateFields.push('updated_at = NOW()');
        params.push(id);
        
        const query = `UPDATE pqr SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.query(query, params);
        
        res.json({ message: 'PQR actualizada exitosamente' });
        
    } catch (error) {
        console.error('Error actualizando PQR:', error);
        res.status(500).json({ error: 'Error actualizando PQR' });
    }
});

// Eliminar PQR
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que la PQR existe
        const checkQuery = 'SELECT id FROM pqr WHERE id = ?';
        const [existing] = await db.query(checkQuery, [id]);
        
        if (!existing) {
            return res.status(404).json({ error: 'PQR no encontrada' });
        }
        
        const query = 'DELETE FROM pqr WHERE id = ?';
        await db.query(query, [id]);
        
        res.json({ message: 'PQR eliminada exitosamente' });
        
    } catch (error) {
        console.error('Error eliminando PQR:', error);
        res.status(500).json({ error: 'Error eliminando PQR' });
    }
});

// Asignar PQR a usuario
router.post('/:id/asignar', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id } = req.body;
        
        if (!usuario_id) {
            return res.status(400).json({ error: 'usuario_id es requerido' });
        }
        
        // Verificar que el usuario existe
        const userQuery = 'SELECT id FROM sistema_usuarios WHERE id = ? AND activo = 1';
        const [user] = await db.query(userQuery, [usuario_id]);
        
        if (!user) {
            return res.status(400).json({ error: 'Usuario no válido' });
        }
        
        const query = `
            UPDATE pqr 
            SET usuario_asignado = ?, estado = 'en_proceso', updated_at = NOW()
            WHERE id = ?
        `;
        
        await db.query(query, [usuario_id, id]);
        
        res.json({ message: 'PQR asignada exitosamente' });
        
    } catch (error) {
        console.error('Error asignando PQR:', error);
        res.status(500).json({ error: 'Error asignando PQR' });
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
        
        res.json({ pqrs });
        
    } catch (error) {
        console.error('Error obteniendo PQRs del cliente:', error);
        res.status(500).json({ error: 'Error obteniendo PQRs del cliente' });
    }
});

// Reportes de PQR para CRC
router.get('/reportes/crc', async (req, res) => {
    try {
        const { anno, trimestre } = req.query;
        
        if (!anno || !trimestre) {
            return res.status(400).json({ error: 'anno y trimestre son requeridos' });
        }
        
        // Reporte de monitoreo de quejas
        const queryQuejas = `
            SELECT 
                ? as ANNO,
                ? as TRIMESTRE,
                MONTH(fecha_recepcion) as MES_DEL_TRIMESTRE,
                CASE 
                    WHEN servicio_afectado = 'internet' THEN 1
                    WHEN servicio_afectado = 'television' THEN 2
                    WHEN servicio_afectado = 'combo' THEN 3
                    ELSE 1
                END as ID_SERVICIO,
                CASE WHEN servicio_afectado = 'combo' THEN 'SI' ELSE 'NO' END as EMPAQUETADO,
                CASE categoria
                    WHEN 'facturacion' THEN 1
                    WHEN 'tecnico' THEN 2
                    WHEN 'atencion_cliente' THEN 3
                    WHEN 'comercial' THEN 4
                    ELSE 5
                END as ID_TIPOLOGIA,
                CASE medio_recepcion
                    WHEN 'telefono' THEN 1
                    WHEN 'presencial' THEN 2
                    WHEN 'email' THEN 3
                    WHEN 'web' THEN 3
                    WHEN 'chat' THEN 4
                    ELSE 1
                END as ID_MEDIO_ATENCION,
                COUNT(*) as NUMERO_QUEJAS
            FROM pqr
            WHERE YEAR(fecha_recepcion) = ?
                AND QUARTER(fecha_recepcion) = ?
                AND tipo IN ('queja', 'reclamo')
            GROUP BY 
                MONTH(fecha_recepcion),
                servicio_afectado,
                categoria,
                medio_recepcion
        `;
        
        const quejas = await db.query(queryQuejas, [anno, trimestre, anno, trimestre]);
        
        // Indicadores de satisfacción
        const querySatisfaccion = `
            SELECT 
                ? as ANNO,
                ? as TRIMESTRE,
                MONTH(fecha_respuesta) as MES_DEL_TRIMESTRE,
                CASE medio_recepcion
                    WHEN 'telefono' THEN 1
                    WHEN 'presencial' THEN 2
                    WHEN 'email' THEN 3
                    WHEN 'web' THEN 3
                    WHEN 'chat' THEN 4
                    ELSE 1
                END as ID_MEDIO_ATENCION,
                COUNT(CASE WHEN satisfaccion_cliente = 'muy_insatisfecho' THEN 1 END) as USUARIOS_NS_MUY_INSATISFECHO,
                COUNT(CASE WHEN satisfaccion_cliente = 'insatisfecho' THEN 1 END) as USUARIOS_NS_INSATISFECHO,
                COUNT(CASE WHEN satisfaccion_cliente = 'neutral' THEN 1 END) as USUAR_NS_NI_INSATISF_NI_SATISF,
                COUNT(CASE WHEN satisfaccion_cliente = 'satisfecho' THEN 1 END) as USUARIOS_NS_SATISFECHO,
                COUNT(CASE WHEN satisfaccion_cliente = 'muy_satisfecho' THEN 1 END) as USUARIOS_NS_MUY_SATISFECHO
            FROM pqr
            WHERE YEAR(fecha_respuesta) = ?
                AND QUARTER(fecha_respuesta) = ?
                AND satisfaccion_cliente IS NOT NULL
            GROUP BY 
                MONTH(fecha_respuesta),
                medio_recepcion
        `;
        
        const satisfaccion = await db.query(querySatisfaccion, [anno, trimestre, anno, trimestre]);
        
        res.json({
            quejas,
            satisfaccion
        });
        
    } catch (error) {
        console.error('Error generando reporte CRC:', error);
        res.status(500).json({ error: 'Error generando reporte CRC' });
    }
});

module.exports = router;