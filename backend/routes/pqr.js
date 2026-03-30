// backend/routes/pqr.js
const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const db = Database;

// ─── SLA: días calendario según tipo (regulación CRC para ISPs) ───────────────
const SLA_DIAS = {
  peticion:   21,  // 15 días hábiles ≈ 21 calendario
  queja:      21,
  reclamo:    21,
  sugerencia: 30
};

function calcularVencimientoSLA(tipo) {
  const dias = SLA_DIAS[tipo] || 21;
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

/**
 * Devuelve: 'ok' | 'proximo' (≤ 3 días) | 'vencido'
 */
function estadoSLA(fechaVencimiento, estadoPQR) {
  if (!fechaVencimiento || ['resuelto', 'cerrado'].includes(estadoPQR)) return 'ok';
  const ahora = new Date();
  const venc  = new Date(fechaVencimiento);
  const diffMs = venc - ahora;
  if (diffMs < 0) return 'vencido';
  if (diffMs < 3 * 24 * 60 * 60 * 1000) return 'proximo'; // menos de 3 días
  return 'ok';
}

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
            searchBy,
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
                u.nombre as usuario_asignado_nombre,
                CASE
                  WHEN p.estado IN ('resuelto','cerrado') THEN 'ok'
                  WHEN p.fecha_vencimiento_sla IS NULL THEN 'ok'
                  WHEN NOW() > p.fecha_vencimiento_sla THEN 'vencido'
                  WHEN TIMESTAMPDIFF(HOUR, NOW(), p.fecha_vencimiento_sla) <= 72 THEN 'proximo'
                  ELSE 'ok'
                END AS estado_sla,
                TIMESTAMPDIFF(HOUR, NOW(), p.fecha_vencimiento_sla) AS horas_restantes_sla
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
            const searchParam = `%${search}%`;
            if (searchBy === 'cedula') {
                query += ' AND c.identificacion LIKE ?';
                params.push(searchParam);
            } else if (searchBy === 'nombre') {
                query += ' AND c.nombre LIKE ?';
                params.push(searchParam);
            } else if (searchBy === 'direccion') {
                query += ' AND c.direccion LIKE ?';
                params.push(searchParam);
            } else {
                query += ' AND (p.numero_radicado LIKE ? OR c.nombre LIKE ? OR c.identificacion LIKE ? OR c.direccion LIKE ? OR p.asunto LIKE ?)';
                params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
            }
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

// ─── SLA: PQRs vencidas o próximas a vencer ───────────────────────────────────
router.get('/sla-alertas', async (req, res) => {
    try {
        const alertas = await db.query(`
            SELECT
                p.id, p.numero_radicado, p.tipo, p.prioridad, p.estado,
                p.asunto, p.fecha_recepcion, p.fecha_vencimiento_sla,
                c.nombre AS cliente_nombre,
                u.nombre AS asignado_nombre,
                TIMESTAMPDIFF(HOUR, NOW(), p.fecha_vencimiento_sla) AS horas_restantes,
                CASE
                  WHEN NOW() > p.fecha_vencimiento_sla THEN 'vencido'
                  WHEN TIMESTAMPDIFF(HOUR, NOW(), p.fecha_vencimiento_sla) <= 72 THEN 'proximo'
                  ELSE 'ok'
                END AS estado_sla
            FROM pqr p
            JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE p.estado NOT IN ('resuelto', 'cerrado')
              AND p.fecha_vencimiento_sla IS NOT NULL
              AND (
                NOW() > p.fecha_vencimiento_sla
                OR TIMESTAMPDIFF(HOUR, NOW(), p.fecha_vencimiento_sla) <= 72
              )
            ORDER BY p.fecha_vencimiento_sla ASC
            LIMIT 100
        `);

        const vencidos = alertas.filter(a => a.estado_sla === 'vencido').length;
        const proximos = alertas.filter(a => a.estado_sla === 'proximo').length;

        res.json({ success: true, data: alertas, resumen: { vencidos, proximos, total: alertas.length } });
    } catch (error) {
        console.error('Error obteniendo alertas SLA:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo alertas SLA' });
    }
});

// Obtener PQR por ID
// NOTA: Las rutas específicas (/mis-pqr, /cliente/:id, /usuarios/disponibles, /reportes/crc)
// deben estar ANTES de esta ruta genérica /:id para que Express no las capture como IDs.

// ─── Rutas específicas movidas aquí para evitar captura por /:id ──────────────

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
            SELECT id, nombre, correo, rol, sede_id
            FROM sistema_usuarios
            WHERE activo = 1 AND rol IN ('administrador', 'supervisor', 'secretaria', 'instalador')
            ORDER BY FIELD(rol,'administrador','supervisor','secretaria','instalador'), nombre
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

/**
 * GET /api/v1/pqr/mis-pqr
 * PQRs asignadas al técnico autenticado + PQRs sin asignar de su sede
 */
router.get('/mis-pqr', async (req, res) => {
    try {
        const userId = req.user.id;
        const { estado } = req.query;

        let estadoFilter = '';
        const params = [userId, userId];
        if (estado) {
            estadoFilter = 'AND p.estado = ?';
            params.push(estado);
        }

        const pqrs = await db.query(`
            SELECT
                p.*,
                c.nombre AS cliente_nombre,
                c.telefono AS cliente_telefono,
                c.identificacion AS cliente_identificacion,
                ci.nombre AS ciudad_nombre,
                u.nombre AS usuario_asignado_nombre
            FROM pqr p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
            LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
            WHERE (p.usuario_asignado = ? OR (p.usuario_asignado IS NULL AND p.estado = 'abierto'))
              AND p.estado != 'cerrado'
              ${estadoFilter}
            ORDER BY
                CASE p.prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
                p.fecha_recepcion DESC
        `, params);

        res.json({ success: true, data: pqrs, total: pqrs.length });

    } catch (error) {
        console.error('Error obteniendo mis PQRs:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo PQRs' });
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

// ─── Ruta genérica por ID (debe ir DESPUÉS de todas las rutas específicas) ────
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
        
        // Calcular fecha de vencimiento SLA según tipo (regulación CRC)
        const fechaVencimientoSLA = calcularVencimientoSLA(tipo);

        const query = `
            INSERT INTO pqr (
                numero_radicado, cliente_id, tipo, categoria, servicio_afectado,
                medio_recepcion, fecha_recepcion, asunto,
                descripcion, prioridad, estado, fecha_vencimiento_sla
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'abierto', ?)
        `;

        const result = await db.query(query, [
            numeroRadicado, cliente_id, tipo, categoria, servicio_afectado,
            medio_recepcion, asunto, descripcion, prioridad,
            fechaVencimientoSLA
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
            cliente_id,
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
            notas_internas,
	   firma_cliente 
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
	if (cliente_id) { updateFields.push('cliente_id = ?'); params.push(cliente_id); }
if (firma_cliente !== undefined) { 
    updateFields.push('firma_cliente = ?'); 
    params.push(firma_cliente); 
}
        // Estado
        if (estado) {
            // Regulación CRC: no se puede cerrar/resolver sin respuesta al usuario
            if ((estado === 'resuelto' || estado === 'cerrado') && !respuesta) {
                const [pqrActual] = await db.query('SELECT respuesta FROM pqr WHERE id = ?', [id]);
                if (!pqrActual || !pqrActual.respuesta) {
                    return res.status(400).json({
                        success: false,
                        error: 'No se puede cerrar/resolver una PQR sin registrar la respuesta al usuario. Regulación CRC Resolución 2000-81.'
                    });
                }
            }

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

// (rutas /cliente/:clienteId, /usuarios/disponibles, /mis-pqr fueron movidas antes de /:id)

/**
 * PATCH /api/v1/pqr/:id/gestionar
 * Técnico actualiza estado y agrega nota de gestión
 */
router.patch('/:id/gestionar', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, nota_gestion } = req.body;
        const userId = req.user.id;

        const estadosPermitidos = ['en_proceso', 'resuelto', 'cerrado'];
        if (!estado || !estadosPermitidos.includes(estado)) {
            return res.status(400).json({ success: false, error: `Estado debe ser uno de: ${estadosPermitidos.join(', ')}` });
        }

        // Solo el técnico asignado o supervisor/admin puede gestionar
        const [pqr] = await db.query('SELECT id, usuario_asignado FROM pqr WHERE id = ?', [id]);
        if (!pqr) return res.status(404).json({ success: false, error: 'PQR no encontrada' });

        const puedeGestionar = pqr.usuario_asignado === userId ||
            ['administrador', 'supervisor'].includes(req.user.rol);
        if (!puedeGestionar) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para gestionar esta PQR' });
        }

        const { respuesta, firma_cliente } = req.body;
        const updateFields = ['estado = ?'];
        const updateValues = [estado];

        if (nota_gestion) {
            updateFields.push('respuesta = CONCAT(COALESCE(respuesta, ""), "\n[Gestión ", NOW(), "]: ", ?)');
            updateValues.push(nota_gestion);
        }
        if (respuesta) {
            updateFields.push('respuesta = ?');
            updateValues.push(respuesta);
        }
        if (firma_cliente) {
            updateFields.push('firma_cliente = ?');
            updateValues.push(firma_cliente);
        }
        if (estado === 'cerrado' || estado === 'resuelto') {
            updateFields.push('fecha_cierre = NOW()');
        }

        updateValues.push(id);
        await db.query(`UPDATE pqr SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

        const [pqrActualizada] = await db.query('SELECT * FROM pqr WHERE id = ?', [id]);
        res.json({ success: true, data: pqrActualizada });

    } catch (error) {
        console.error('Error gestionando PQR:', error);
        res.status(500).json({ success: false, error: 'Error gestionando PQR' });
    }
});

// (ruta /reportes/crc fue movida antes de /:id)

module.exports = router;
