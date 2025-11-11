// backend/controllers/instalacionesController.js

const { Database } = require('../models/Database');


console.log('🔧 Inicializando controlador de instalaciones...');

class InstalacionesController {

    // Test del controlador
    static async test(req, res) {
        try {
            console.log('🧪 Test instalaciones controller');

            res.json({
                success: true,
                message: 'Controlador de instalaciones funcionando correctamente',
                timestamp: new Date().toISOString(),
                user: req.user || null
            });
        } catch (error) {
            console.error('❌ Error en test instalaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error en test del controlador',
                error: error.message
            });
        }
    }

    // Listar instalaciones con filtros y paginación
    static async listar(req, res) {
        try {
            console.log('📋 Listando instalaciones con parámetros:', req.query);

            const {
                page = 1,
                limit = 20,
                busqueda = '',
                estado = '',
                instalador_id = '',
                fecha_desde = '',
                fecha_hasta = '',
                vencidas = false
            } = req.query;

            // Construir WHERE clause
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (busqueda.trim()) {
                whereClause += ` AND (
        c.nombre LIKE ? OR
        c.identificacion LIKE ? OR
        i.direccion_instalacion LIKE ? OR
        i.telefono_contacto LIKE ?
      )`;
                const searchTerm = `%${busqueda}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            if (estado) {
                whereClause += ' AND i.estado = ?';
                params.push(estado);
            }

            if (instalador_id) {
                if (instalador_id === 'sin_asignar') {
                    whereClause += ' AND i.instalador_id IS NULL';
                } else {
                    whereClause += ' AND i.instalador_id = ?';
                    params.push(instalador_id);
                }
            }

            if (fecha_desde) {
                whereClause += ' AND DATE(i.fecha_programada) >= ?';
                params.push(fecha_desde);
            }

            if (fecha_hasta) {
                whereClause += ' AND DATE(i.fecha_programada) <= ?';
                params.push(fecha_hasta);
            }

            if (vencidas === 'true' || vencidas === true) {
                whereClause += ` AND DATE(i.fecha_programada) < CURDATE() 
                      AND i.estado NOT IN ('completada', 'cancelada')`;
            }

            // Query base
            const baseQuery = `
      FROM instalaciones i
      INNER JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
      LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      ${whereClause}
    `;

            // Contar total de registros
            const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
            const [{ total }] = await Database.query(countQuery, params);

            console.log('📊 Total de registros encontrados:', total);

            // Si es para exportar, devolver todos los datos
            if (req.query.export || (res && typeof res.json !== 'function')) {
                const exportQuery = `
        SELECT 
          i.*,
          c.nombre as cliente_nombre,
c.identificacion as cliente_identificacion,
c.telefono as cliente_telefono,
u.nombre as instalador_nombre
        ${baseQuery}
        ORDER BY i.created_at DESC
      `;

                const instalaciones = await Database.query(exportQuery, params);

                return {
                    success: true,
                    data: instalaciones,
                    total: total
                };
            }

            // Calcular paginación
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const totalPages = Math.ceil(total / limitNum);

           // ✅ DESPUÉS:
const selectQuery = `
      SELECT
        i.*,
        c.nombre as cliente_nombre,
        c.identificacion as cliente_identificacion,
        c.telefono as cliente_telefono,
        c.correo as cliente_email,
        u.nombre as instalador_nombre,
        ps.nombre as plan_nombre,
        ps.precio as plan_precio
      ${baseQuery}
      ORDER BY i.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
const instalaciones = await Database.query(selectQuery, params);
            
            console.log('📋 Instalaciones obtenidas:', instalaciones.length);
            console.log('📋 Primera instalación:', instalaciones[0] || 'Ninguna');

            // Procesar equipos instalados para cada instalación
            instalaciones.forEach(instalacion => {
                if (instalacion.equipos_instalados) {
                    try {
                        instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
                    } catch (e) {
                        instalacion.equipos_instalados = [];
                    }
                } else {
                    instalacion.equipos_instalados = [];
                }
            });

            // Obtener estadísticas
            const estadisticasQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN i.estado = 'programada' THEN 1 ELSE 0 END) as programadas,
        SUM(CASE WHEN i.estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
        SUM(CASE WHEN i.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN i.estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
        SUM(CASE WHEN DATE(i.fecha_programada) < CURDATE() 
            AND i.estado NOT IN ('completada', 'cancelada') THEN 1 ELSE 0 END) as vencidas
      ${baseQuery}
    `;

            const [estadisticas] = await Database.query(estadisticasQuery, params);

            const response = {
                success: true,
                data: instalaciones, // IMPORTANTE: usar 'data', no 'instalaciones'
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: totalPages,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                },
                estadisticas: estadisticas || {
                    total: 0,
                    programadas: 0,
                    en_proceso: 0,
                    completadas: 0,
                    canceladas: 0,
                    reagendadas: 0,
                    vencidas: 0
                }
            };

            console.log('📤 Enviando respuesta:', {
                success: response.success,
                dataLength: response.data.length,
                pagination: response.pagination,
                estadisticas: response.estadisticas
            });

            res.json(response);

        } catch (error) {
            console.error('❌ Error listando instalaciones:', error);

            const errorResponse = {
                success: false,
                message: 'Error obteniendo instalaciones',
                error: error.message,
                data: [], // Asegurar que siempre hay un array
                pagination: {},
                estadisticas: {}
            };

            res.status(500).json(errorResponse);
        }
    }

    // Obtener instalación por ID
    static async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            console.log('🔍 Obteniendo instalación ID:', id);

            const consulta = `
        SELECT 
          i.*,
          
          -- Datos del cliente
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion,
          c.correo as cliente_email,
          
          -- Datos del instalador
          u.nombre as instalador_nombres,
          u.telefono as instalador_telefono,
          u.email as instalador_email,
          
          -- Datos del servicio
          sc.plan_id,
          sc.estado as servicio_estado,
          sc.fecha_activacion,
          
          -- Datos del plan
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          ps.velocidad_subida,
          ps.velocidad_bajada,
          
          -- Información geográfica
          s.nombre as sector_nombre,
          cd.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          
          -- Información del contrato
          cont.numero_contrato,
          cont.tipo_permanencia,
          cont.permanencia_meses

        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades cd ON s.ciudad_id = cd.id
        LEFT JOIN departamentos d ON cd.departamento_id = d.id
        LEFT JOIN contratos cont ON i.contrato_id = cont.id
        WHERE i.id = ?
      `;

            const [instalacion] = await Database.query(consulta, [id]);

            if (!instalacion) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            // Procesar JSON fields
            if (instalacion.equipos_instalados) {
                try {
                    instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
                } catch (e) {
                    instalacion.equipos_instalados = [];
                }
            }

            if (instalacion.fotos_instalacion) {
                try {
                    instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
                } catch (e) {
                    instalacion.fotos_instalacion = [];
                }
            }

            res.json({
                success: true,
                data: instalacion
            });

        } catch (error) {
            console.error('❌ Error obteniendo instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener la instalación',
                error: error.message
            });
        }
    }

    // Crear nueva instalación
static async crear(req, res) {
    const connection = await Database.getConnection();

    try {
        await connection.beginTransaction();

        console.log('➕ Creando nueva instalación:', req.body);

        const {
            cliente_id,
            servicio_cliente_id,
            instalador_id,
            fecha_programada,
            hora_programada,
            direccion_instalacion,
            barrio,
            telefono_contacto,
            persona_recibe,
            tipo_instalacion = 'nueva',
            observaciones,
            equipos_instalados = [],
            costo_instalacion = 0,
            coordenadas_lat,
            coordenadas_lng,
            contrato_id,
            tipo_orden = 'instalacion'
        } = req.body;

        // Validar cliente existe
        const [clientes] = await connection.query(
            'SELECT id, nombre FROM clientes WHERE id = ?',
            [cliente_id]
        );

        if (!clientes || clientes.length === 0) {
            throw new Error('Cliente no encontrado');
        }

        // Validar servicio cliente existe si se proporciona
        if (servicio_cliente_id) {
            const [serviciosCliente] = await connection.query(
                'SELECT id, plan_id FROM servicios_cliente WHERE id = ?',
                [servicio_cliente_id]
            );

            if (!serviciosCliente || serviciosCliente.length === 0) {
                throw new Error('Servicio de cliente no encontrado');
            }

            // Verificar si ya existe una instalación pendiente para este servicio
            const [instalacionesExistentes] = await connection.query(
                `SELECT id FROM instalaciones 
                 WHERE servicio_cliente_id = ? AND estado NOT IN ('cancelada', 'completada')`,
                [servicio_cliente_id]
            );

            if (instalacionesExistentes && instalacionesExistentes.length > 0) {
                throw new Error('Ya existe una instalación pendiente para este servicio');
            }
        }

        // Validar instalador si se proporciona
        if (instalador_id) {
            const [instaladores] = await connection.query(
                `SELECT id, nombre FROM sistema_usuarios
                 WHERE id = ? AND rol IN ('instalador', 'supervisor')`,
                [instalador_id]
            );

            if (!instaladores || instaladores.length === 0) {
                throw new Error('Instalador no encontrado o no tiene permisos');
            }
        }

        // Preparar datos para inserción
        const equiposJson = JSON.stringify(equipos_instalados);

        const query = `
            INSERT INTO instalaciones (
                cliente_id,
                servicio_cliente_id,
                instalador_id,
                fecha_programada,
                hora_programada,
                direccion_instalacion,
                barrio,
                telefono_contacto,
                persona_recibe,
                tipo_instalacion,
                observaciones,
                equipos_instalados,
                costo_instalacion,
                coordenadas_lat,
                coordenadas_lng,
                contrato_id,
                tipo_orden,
                estado,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'programada', NOW(), NOW())
        `;

        const parametros = [
            cliente_id,
            servicio_cliente_id || null,
            instalador_id || null,
            fecha_programada,
            hora_programada || null,
            direccion_instalacion || null,
            barrio || null,
            telefono_contacto || null,
            persona_recibe || null,
            tipo_instalacion,
            observaciones || null,
            equiposJson,
            costo_instalacion,
            coordenadas_lat || null,
            coordenadas_lng || null,
            contrato_id || null,
            tipo_orden
        ];

        const [result] = await connection.query(query, parametros);
        const instalacionId = result.insertId;

        // Si hay equipos, actualizar su estado a "asignado"
        if (equipos_instalados && equipos_instalados.length > 0) {
            for (const equipo of equipos_instalados) {
                if (equipo.equipo_id) {
                    await connection.query(
                        `UPDATE inventario_equipos 
                         SET estado = 'asignado', instalador_id = ?, fecha_asignacion = NOW()
                         WHERE id = ?`,
                        [instalador_id, equipo.equipo_id]
                    );
                }
            }
        }

        await connection.commit();

        // Obtener la instalación creada con datos completos
        const instalacionCreada = await this.obtenerInstalacionCompleta(connection, instalacionId);

        res.status(201).json({
            success: true,
            message: 'Instalación creada exitosamente',
            data: instalacionCreada
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error creando instalación:', error);

        res.status(400).json({
            success: false,
            message: error.message || 'Error al crear la instalación',
            error: error.message
        });
    } finally {
        connection.release();
    }
}

// Método auxiliar para obtener instalación completa
static async obtenerInstalacionCompleta(connection, instalacionId) {
    const [instalaciones] = await connection.query(
        `SELECT 
            i.*,
            c.nombre as cliente_nombre,
            c.email as cliente_email,
            c.telefono as cliente_telefono,
            c.documento as cliente_documento,
            sc.plan_id,
            sc.estado as servicio_estado,
            p.nombre as plan_nombre,
            p.velocidad as plan_velocidad,
            u.nombre as instalador_nombre,
            u.telefono as instalador_telefono,
            u.email as instalador_email
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes p ON sc.plan_id = p.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        WHERE i.id = ?`,
        [instalacionId]
    );

    if (!instalaciones || instalaciones.length === 0) {
        throw new Error('Instalación no encontrada');
    }

    const instalacion = instalaciones[0];

    // Parsear equipos_instalados si es string JSON
    if (typeof instalacion.equipos_instalados === 'string') {
        try {
            instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
        } catch (e) {
            instalacion.equipos_instalados = [];
        }
    }

    return instalacion;
}
    // Actualizar instalación
 static async actualizar(req, res) {
        const connection = await Database.getConnection(); // CORRECCIÓN: usar pool en lugar de Database

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            console.log('📝 Actualizando instalación ID:', id, 'Datos:', req.body);

            // Obtener instalación actual
            const [instalacionActual] = await connection.query(
                'SELECT * FROM instalaciones WHERE id = ?',
                [id]
            );

            if (instalacionActual.length === 0) { // CORRECCIÓN: verificar length
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            const {
                instalador_id,
                fecha_programada,
                hora_programada,
                direccion_instalacion,
                barrio,
                telefono_contacto,
                persona_recibe,
                tipo_instalacion,
                observaciones,
                equipos_instalados,
                costo_instalacion,
                coordenadas_lat,
                coordenadas_lng,
                estado
            } = req.body;

            // Construir consulta de actualización dinámicamente
            const camposActualizar = [];
            const parametros = [];

            if (instalador_id !== undefined) {
                // Validar que el instalador existe
                if (instalador_id) {
                    const [instalador] = await connection.query(
                        'SELECT id FROM sistema_usuarios WHERE id = ? AND rol IN ("instalador", "supervisor") AND activo = 1',
                        [instalador_id]
                    );

                    if (instalador.length === 0) {
                        await connection.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'El instalador especificado no existe o no está activo'
                        });
                    }
                }
                camposActualizar.push('instalador_id = ?');
                parametros.push(instalador_id);
            }

            if (fecha_programada !== undefined) {
                // Validar formato de fecha
                const fechaValida = new Date(fecha_programada);
                if (isNaN(fechaValida.getTime())) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Formato de fecha inválido'
                    });
                }
                camposActualizar.push('fecha_programada = ?');
                parametros.push(fecha_programada);
            }

            if (hora_programada !== undefined) {
                camposActualizar.push('hora_programada = ?');
                parametros.push(hora_programada);
            }

            if (direccion_instalacion !== undefined) {
                camposActualizar.push('direccion_instalacion = ?');
                parametros.push(direccion_instalacion);
            }

            if (barrio !== undefined) {
                camposActualizar.push('barrio = ?');
                parametros.push(barrio);
            }

            if (telefono_contacto !== undefined) {
                camposActualizar.push('telefono_contacto = ?');
                parametros.push(telefono_contacto);
            }

            if (persona_recibe !== undefined) {
                camposActualizar.push('persona_recibe = ?');
                parametros.push(persona_recibe);
            }

            if (tipo_instalacion !== undefined) {
                camposActualizar.push('tipo_instalacion = ?');
                parametros.push(tipo_instalacion);
            }

            if (observaciones !== undefined) {
                camposActualizar.push('observaciones = ?');
                parametros.push(observaciones);
            }

            if (equipos_instalados !== undefined) {
                camposActualizar.push('equipos_instalados = ?');
                parametros.push(JSON.stringify(equipos_instalados));
            }

            if (costo_instalacion !== undefined) {
                camposActualizar.push('costo_instalacion = ?');
                parametros.push(parseFloat(costo_instalacion) || 0);
            }

            if (coordenadas_lat !== undefined) {
                camposActualizar.push('coordenadas_lat = ?');
                parametros.push(coordenadas_lat ? parseFloat(coordenadas_lat) : null);
            }

            if (coordenadas_lng !== undefined) {
                camposActualizar.push('coordenadas_lng = ?');
                parametros.push(coordenadas_lng ? parseFloat(coordenadas_lng) : null);
            }

            if (estado !== undefined) {
                // Validar estado
                const estadosValidos = ['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'];
                if (!estadosValidos.includes(estado)) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`
                    });
                }
                camposActualizar.push('estado = ?');
                parametros.push(estado);
            }

            if (camposActualizar.length === 0) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No se proporcionaron campos para actualizar'
                });
            }

            // Agregar updated_at y id
            camposActualizar.push('updated_at = NOW()');
            parametros.push(id);

            const query = `UPDATE instalaciones SET ${camposActualizar.join(', ')} WHERE id = ?`;

            console.log('📝 Ejecutando query:', query);
            console.log('📝 Parámetros:', parametros);

            const [result] = await connection.query(query, parametros);

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'No se pudo actualizar la instalación'
                });
            }

            // Registrar en logs si existe el sistema de logs
            try {
                if (req.user && req.user.id) {
                    await connection.query(
                        `INSERT INTO logs_sistema (usuario_id, accion, tabla_afectada, registro_id, datos_anteriores, datos_nuevos, ip_address, user_agent)
                         VALUES (?, 'UPDATE', 'instalaciones', ?, ?, ?, ?, ?)`,
                        [
                            req.user.id,
                            id,
                            JSON.stringify(instalacionActual[0]),
                            JSON.stringify(req.body),
                            req.ip || 'unknown',
                            req.get('User-Agent') || 'unknown'
                        ]
                    );
                }
            } catch (logError) {
                console.warn('⚠️ Error registrando en logs:', logError.message);
                // No fallar la transacción por errores de logs
            }

            await connection.commit();

            // Obtener instalación actualizada con datos completos
            const instalacionActualizada = await InstalacionesController.obtenerInstalacionCompleta(id);

            res.json({
                success: true,
                message: 'Instalación actualizada exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ Error actualizando instalación:', error);

            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar la instalación',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
            });
        } finally {
            connection.release();
        }
    }

    // Cambiar estado de instalación
    static async cambiarEstado(req, res) {
        const connection = await Database.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const {
                estado,
                observaciones,
                fecha_realizada,
                hora_inicio,
                hora_fin,
                equipos_instalados,
                fotos_instalacion
            } = req.body;

            console.log('🔄 Cambiando estado instalación ID:', id, 'a:', estado);

            // Obtener instalación actual
            const [instalacionActual] = await connection.query(
                'SELECT * FROM instalaciones WHERE id = ?',
                [id]
            );

            if (!instalacionActual) {
                throw new Error('Instalación no encontrada');
            }

            // Preparar campos a actualizar
            const camposActualizar = ['estado = ?', 'updated_at = NOW()'];
            const parametros = [estado];

            if (observaciones) {
                camposActualizar.push('observaciones = ?');
                parametros.push(observaciones);
            }

            if (fecha_realizada) {
                camposActualizar.push('fecha_realizada = ?');
                parametros.push(fecha_realizada);
            }

            if (hora_inicio) {
                camposActualizar.push('hora_inicio = ?');
                parametros.push(hora_inicio);
            }

            if (hora_fin) {
                camposActualizar.push('hora_fin = ?');
                parametros.push(hora_fin);
            }

            if (equipos_instalados) {
                camposActualizar.push('equipos_instalados = ?');
                parametros.push(JSON.stringify(equipos_instalados));
            }

            if (fotos_instalacion) {
                camposActualizar.push('fotos_instalacion = ?');
                parametros.push(JSON.stringify(fotos_instalacion));
            }

            parametros.push(id);

            const query = `UPDATE instalaciones SET ${camposActualizar.join(', ')} WHERE id = ?`;
            await connection.query(query, parametros);

            // Lógica específica por estado
            if (estado === 'completada') {
                // Actualizar equipos a estado "instalado"
                if (equipos_instalados && equipos_instalados.length > 0) {
                    for (const equipo of equipos_instalados) {
                        if (equipo.equipo_id) {
                            await connection.query(
                                `UPDATE inventario_equipos 
                 SET estado = 'instalado', ubicacion_actual = ?
                 WHERE id = ?`,
                                [instalacionActual.direccion_instalacion, equipo.equipo_id]
                            );
                        }
                    }
                }

                // Activar servicio del cliente si no está activo
                await connection.query(
                    `UPDATE servicios_cliente 
           SET estado = 'activo', fecha_activacion = CURDATE()
           WHERE id = ? AND estado != 'activo'`,
                    [instalacionActual.servicio_cliente_id]
                );
                // ✅✅✅ INSERTAR AQUÍ TODO EL CÓDIGO NUEVO ✅✅✅
    // Actualizar IP y TAP en la tabla clientes si vienen en el request
    const { ip_asignada, tap } = req.body;
    
    if (ip_asignada || tap) {
        const updateClienteFields = [];
        const updateClienteValues = [];
        
        if (ip_asignada) {
            updateClienteFields.push('ip_asignada = ?');
            updateClienteValues.push(ip_asignada);
        }
        
        if (tap) {
            updateClienteFields.push('tap = ?');
            updateClienteValues.push(tap);
        }
        
        if (updateClienteFields.length > 0) {
            updateClienteValues.push(instalacionActual.cliente_id);
            
            await connection.query(
                `UPDATE clientes SET ${updateClienteFields.join(', ')} WHERE id = ?`,
                updateClienteValues
            );
            
            console.log(`✅ Actualizado cliente ${instalacionActual.cliente_id} - IP: ${ip_asignada || 'N/A'}, TAP: ${tap || 'N/A'}`);
        }
    }
    // ✅✅✅ FIN DEL CÓDIGO NUEVO ✅✅✅


            }

            if (estado === 'cancelada') {
                // Liberar equipos asignados
                if (instalacionActual.equipos_instalados) {
                    try {
                        const equiposActuales = JSON.parse(instalacionActual.equipos_instalados);
                        for (const equipo of equiposActuales) {
                            if (equipo.equipo_id) {
                                await connection.query(
                                    `UPDATE inventario_equipos 
                   SET estado = 'disponible', instalador_id = NULL, fecha_devolucion = NOW()
                   WHERE id = ?`,
                                    [equipo.equipo_id]
                                );
                            }
                        }
                    } catch (e) {
                        console.warn('Error liberando equipos:', e);
                    }
                }
            }



            await connection.commit();

            // Obtener instalación actualizada
            const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

            res.json({
                success: true,
                message: `Estado de instalación cambiado a: ${estado}`,
                data: instalacionActualizada
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ Error cambiando estado:', error);

            res.status(400).json({
                success: false,
                message: error.message || 'Error al cambiar el estado',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Eliminar instalación
   static async eliminar(req, res) {
    const connection = await Database.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        console.log('🗑️ Eliminando instalación ID:', id);

        // Verificar que la instalación existe
        const [instalacion] = await connection.query(
            'SELECT * FROM instalaciones WHERE id = ?',
            [id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Solo permitir eliminar si está en estado programada o cancelada
        if (!['programada', 'cancelada'].includes(instalacion.estado)) {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden eliminar instalaciones programadas o canceladas'
            });
        }

        // Liberar equipos si los hay
        if (instalacion.equipos_instalados) {
            try {
                const equipos = JSON.parse(instalacion.equipos_instalados);
                for (const equipo of equipos) {
                    if (equipo.equipo_id) {
                        await connection.query(
                            `UPDATE inventario_equipos 
                            SET estado = 'disponible', instalador_id = NULL, fecha_devolucion = NOW()
                            WHERE id = ?`,
                            [equipo.equipo_id]
                        );
                    }
                }
            } catch (e) {
                console.warn('Error liberando equipos:', e);
            }
        }

        // Eliminar instalación
        await connection.query('DELETE FROM instalaciones WHERE id = ?', [id]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Instalación eliminada exitosamente'
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error eliminando instalación:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error eliminando instalación'
        });
    } finally {
        connection.release();
    }
}

    // Obtener estadísticas de instalaciones
    static async obtenerEstadisticas(req, res) {
        try {
            console.log('📊 Obteniendo estadísticas de instalaciones');

            const { fecha_desde, fecha_hasta, instalador_id } = req.query;

            // Estadísticas generales
            let consultaGeneral = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
          SUM(CASE WHEN fecha_programada < CURDATE() AND estado IN ('programada', 'en_proceso') THEN 1 ELSE 0 END) as vencidas,
          SUM(CASE WHEN fecha_programada = CURDATE() THEN 1 ELSE 0 END) as hoy,
          SUM(CASE WHEN WEEK(fecha_programada) = WEEK(CURDATE()) AND YEAR(fecha_programada) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as esta_semana,
          SUM(CASE WHEN MONTH(fecha_programada) = MONTH(CURDATE()) AND YEAR(fecha_programada) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as este_mes,
          ROUND(AVG(costo_instalacion), 2) as costo_promedio,
          SUM(costo_instalacion) as costo_total
        FROM instalaciones 
        WHERE 1=1
      `;

            const parametrosGeneral = [];

            if (fecha_desde) {
                consultaGeneral += ` AND fecha_programada >= ?`;
                parametrosGeneral.push(fecha_desde);
            }

            if (fecha_hasta) {
                consultaGeneral += ` AND fecha_programada <= ?`;
                parametrosGeneral.push(fecha_hasta);
            }

            if (instalador_id) {
                consultaGeneral += ` AND instalador_id = ?`;
                parametrosGeneral.push(instalador_id);
            }

            const [estadisticasGenerales] = await Database.query(consultaGeneral, parametrosGeneral);

            // Estadísticas por instalador
            let consultaInstaladores = `
        SELECT 
          i.instalador_id,
          u.nombre as instalador_nombre,
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN i.estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN i.estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN i.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN i.fecha_programada < CURDATE() AND i.estado IN ('programada', 'en_proceso') THEN 1 ELSE 0 END) as vencidas,
          ROUND((SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as porcentaje_exito,
          SUM(i.costo_instalacion) as ingresos_total
        FROM instalaciones i
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        WHERE i.instalador_id IS NOT NULL
      `;

            const parametrosInstaladores = [];

            if (fecha_desde) {
                consultaInstaladores += ` AND i.fecha_programada >= ?`;
                parametrosInstaladores.push(fecha_desde);
            }

            if (fecha_hasta) {
                consultaInstaladores += ` AND i.fecha_programada <= ?`;
                parametrosInstaladores.push(fecha_hasta);
            }

            if (instalador_id) {
                consultaInstaladores += ` AND i.instalador_id = ?`;
                parametrosInstaladores.push(instalador_id);
            }

            consultaInstaladores += ` GROUP BY i.instalador_id, u.nombre ORDER BY total_instalaciones DESC`;

            const instaladores = await Database.query(consultaInstaladores, parametrosInstaladores);

            // Estadísticas por tipo de instalación
            let consultaTipos = `
        SELECT 
          tipo_instalacion,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          ROUND(AVG(costo_instalacion), 2) as costo_promedio
        FROM instalaciones 
        WHERE 1=1
      `;

            const parametrosTipos = [];

            if (fecha_desde) {
                consultaTipos += ` AND fecha_programada >= ?`;
                parametrosTipos.push(fecha_desde);
            }

            if (fecha_hasta) {
                consultaTipos += ` AND fecha_programada <= ?`;
                parametrosTipos.push(fecha_hasta);
            }

            if (instalador_id) {
                consultaTipos += ` AND instalador_id = ?`;
                parametrosTipos.push(instalador_id);
            }

            consultaTipos += ` GROUP BY tipo_instalacion ORDER BY total DESC`;

            const tiposInstalacion = await Database.query(consultaTipos, parametrosTipos);

            // Estadísticas mensuales del año actual
            const consultaMensual = `
        SELECT 
          MONTH(fecha_programada) as mes,
          MONTHNAME(fecha_programada) as mes_nombre,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(costo_instalacion) as ingresos
        FROM instalaciones 
        WHERE YEAR(fecha_programada) = YEAR(CURDATE())
        ${instalador_id ? 'AND instalador_id = ?' : ''}
        GROUP BY MONTH(fecha_programada), MONTHNAME(fecha_programada)
        ORDER BY MONTH(fecha_programada)
      `;

            const parametrosMensual = instalador_id ? [instalador_id] : [];
            const estadisticasMensuales = await Database.query(consultaMensual, parametrosMensual);

            // Instalaciones próximas (siguientes 7 días)
            const consultaProximas = `
        SELECT 
          i.id,
          i.fecha_programada,
          i.hora_programada,
          i.estado,
          i.tipo_instalacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          i.direccion_instalacion,
          u.nombre as instalador_nombre,
          ps.nombre as plan_nombre
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE i.fecha_programada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND i.estado IN ('programada', 'en_proceso')
        ${instalador_id ? 'AND i.instalador_id = ?' : ''}
        ORDER BY i.fecha_programada ASC, i.hora_programada ASC
        LIMIT 10
      `;

            const parametrosProximas = instalador_id ? [instalador_id] : [];
            const instalacionesProximas = await Database.query(consultaProximas, parametrosProximas);

            res.json({
                success: true,
                data: {
                    resumen: estadisticasGenerales,
                    por_instalador: instaladores,
                    por_tipo: tiposInstalacion,
                    mensuales: estadisticasMensuales,
                    proximas: instalacionesProximas
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }

    // Método auxiliar para obtener instalación completa
    static async obtenerInstalacionCompleta(id) {
        try {
            const consulta = `
        SELECT 
          i.*,
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.correo as cliente_email,
          u.nombre as instalador_nombre_completo,
          u.telefono as instalador_telefono,
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE i.id = ?
      `;

            const [instalacion] = await Database.query(consulta, [id]);

            if (instalacion) {
                // Procesar JSON fields
                if (instalacion.equipos_instalados) {
                    try {
                        instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
                    } catch (e) {
                        instalacion.equipos_instalados = [];
                    }
                }

                if (instalacion.fotos_instalacion) {
                    try {
                        instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
                    } catch (e) {
                        instalacion.fotos_instalacion = [];
                    }
                }
            }

            return instalacion;
        } catch (error) {
            console.error('Error obteniendo instalación completa:', error);
            return null;
        }
    }

    static async asignarInstalador(req, res) {
    const connection = await Database.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { instalador_id } = req.body;

        if (!instalador_id) {
            return res.status(400).json({
                success: false,
                message: 'El ID del instalador es requerido'
            });
        }

        console.log(`👷‍♂️ Asignando instalador ${instalador_id} a instalación ${id}`);

        // Verificar que la instalación existe
        const [instalacion] = await connection.query(
            'SELECT * FROM instalaciones WHERE id = ?',
            [id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Verificar que el instalador existe
        const [instalador] = await connection.query(
            'SELECT * FROM usuarios WHERE id = ? AND rol = "instalador" AND activo = 1',
            [instalador_id]
        );

        if (!instalador) {
            return res.status(404).json({
                success: false,
                message: 'Instalador no encontrado o inactivo'
            });
        }

        // Actualizar la instalación
        await connection.query(
            `UPDATE instalaciones 
            SET 
                instalador_id = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [instalador_id, id]
        );

        await connection.commit();

        // Obtener instalación actualizada
        const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

        res.json({
            success: true,
            message: 'Instalador asignado exitosamente',
            data: instalacionActualizada
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error asignando instalador:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error asignando instalador'
        });
    } finally {
        connection.release();
    }
}

    /**
     * Reagendar una instalación
     */
    static async reagendarInstalacion(req, res) {
    const connection = await Database.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { fecha_programada, hora_programada, observaciones } = req.body;

        console.log(`📅 Reagendando instalación ${id} para ${fecha_programada} ${hora_programada}`);

        // Verificar que la instalación existe
        const [instalacion] = await connection.query(
            'SELECT * FROM instalaciones WHERE id = ?',
            [id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Verificar que puede ser reagendada
        if (instalacion.estado === 'completada') {
            return res.status(400).json({
                success: false,
                message: 'No se puede reagendar una instalación completada'
            });
        }

        if (instalacion.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                message: 'No se puede reagendar una instalación cancelada'
            });
        }

        // Validar nueva fecha
        const fechaNueva = new Date(fecha_programada);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (fechaNueva < hoy) {
            return res.status(400).json({
                success: false,
                message: 'La nueva fecha no puede ser anterior a hoy'
            });
        }

        // Actualizar la instalación
        const observacionesCompletas = observaciones ||
            `Reagendada desde ${instalacion.fecha_programada} ${instalacion.hora_programada || ''}`;

        await connection.query(
            `UPDATE instalaciones 
            SET 
                fecha_programada = ?, 
                hora_programada = ?,
                estado = 'reagendada',
                observaciones = CONCAT(IFNULL(observaciones, ''), '\n', ?),
                updated_at = NOW()
            WHERE id = ?`,
            [fecha_programada, hora_programada, observacionesCompletas, id]
        );

        await connection.commit();

        // Obtener instalación actualizada
        const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

        res.json({
            success: true,
            message: 'Instalación reagendada exitosamente',
            data: instalacionActualizada
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error reagendando instalación:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error reagendando instalación'
        });
    } finally {
        connection.release();
    }
}

    /**
     * Cancelar una instalación
     */
    static async cancelarInstalacion(req, res) {
    const connection = await Database.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { motivo } = req.body;

        if (!motivo || motivo.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El motivo de cancelación es requerido'
            });
        }

        console.log(`❌ Cancelando instalación ${id}. Motivo: ${motivo}`);

        // Verificar que la instalación existe
        const [instalacion] = await connection.query(
            'SELECT * FROM instalaciones WHERE id = ?',
            [id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Verificar que puede ser cancelada
        if (instalacion.estado === 'completada') {
            return res.status(400).json({
                success: false,
                message: 'No se puede cancelar una instalación completada'
            });
        }

        if (instalacion.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                message: 'La instalación ya está cancelada'
            });
        }

        // Liberar equipos asignados si los hay
        if (instalacion.equipos_instalados) {
            try {
                const equipos = JSON.parse(instalacion.equipos_instalados);
                for (const equipo of equipos) {
                    if (equipo.equipo_id) {
                        await connection.query(
                            `UPDATE inventario_equipos 
                            SET estado = 'disponible', instalador_id = NULL, fecha_devolucion = NOW()
                            WHERE id = ?`,
                            [equipo.equipo_id]
                        );
                    }
                }
            } catch (parseError) {
                console.warn('Error liberando equipos:', parseError);
            }
        }

        // Actualizar la instalación
        await connection.query(
            `UPDATE instalaciones 
            SET 
                estado = 'cancelada',
                observaciones = CONCAT(IFNULL(observaciones, ''), '\n', 'CANCELADA: ', ?),
                updated_at = NOW()
            WHERE id = ?`,
            [motivo, id]
        );

        await connection.commit();

        // Obtener instalación actualizada
        const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

        res.json({
            success: true,
            message: 'Instalación cancelada exitosamente',
            data: instalacionActualizada
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error cancelando instalación:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error cancelando instalación'
        });
    } finally {
        connection.release();
    }
}

    /**
     * Obtener equipos disponibles para instalación
     */
    static async obtenerEquiposDisponibles() {
        try {
            const equipos = await Database.query(`
      SELECT 
        ie.id,
        ie.codigo,
        ie.nombre,
        ie.tipo_equipo,
        ie.marca,
        ie.modelo,
        ie.numero_serie,
        ie.precio_costo,
        ie.observaciones
      FROM inventario_equipos ie
      WHERE ie.estado = 'disponible'
        AND ie.activo = 1
      ORDER BY ie.tipo_equipo, ie.nombre
    `);

            return equipos;
        } catch (error) {
            console.error('❌ Error obteniendo equipos disponibles:', error);
            throw error;
        }
    }

    /**
     * Obtener lista de instaladores disponibles
     */
    static async obtenerInstaladores() {
        try {
            const instaladores = await Database.query(`
      SELECT 
        su.id,
        su.nombre,
        su.email,
        su.telefono,
        COUNT(i.id) as instalaciones_activas
      FROM sistema_usuarios su
      LEFT JOIN instalaciones i ON i.instalador_id = su.id 
        AND i.estado IN ('programada', 'en_proceso')
      WHERE su.rol = 'instalador' 
        AND su.activo = 1
      GROUP BY su.id, su.nombre, su.email, su.telefono
      ORDER BY su.nombre
    `);

            return instaladores;
        } catch (error) {
            console.error('❌ Error obteniendo instaladores:', error);
            throw error;
        }
    }

    /**
     * Obtener clientes para búsqueda
     */
    static async obtenerClientes(termino = '') {
        try {
            let whereClause = 'WHERE c.activo = 1';
            let params = [];

            if (termino.trim()) {
                whereClause += ` AND (
        c.nombres LIKE ? OR 
        c.apellidos LIKE ? OR 
        c.identificacion LIKE ? OR 
        c.telefono LIKE ? OR
        c.email LIKE ?
      )`;
                const terminoBusqueda = `%${termino}%`;
                params = [terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda, terminoBusqueda];
            }

            const clientes = await Database.query(`
      SELECT 
        c.id,
        c.identificacion,
        c.nombre
        c.telefono,
        c.correo,
        c.direccion,
      FROM clientes c
      ${whereClause}
      ORDER BY c.nombre
      LIMIT 50
    `, params);

            return clientes;
        } catch (error) {
            console.error('❌ Error obteniendo clientes:', error);
            throw error;
        }
    }

    /**
     * Obtener servicios de un cliente
     */
    static async obtenerServiciosCliente(clienteId) {
        try {
            const servicios = await Database.query(`
      SELECT 
        sc.id,
        sc.cliente_id,
        sc.plan_id,
        sc.estado,
        sc.fecha_inicio,
        sc.direccion_instalacion,
        ps.nombre as plan_nombre,
        ps.precio_mensual,
        ps.velocidad_descarga,
        ps.velocidad_subida
      FROM servicios_cliente sc
      INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE sc.cliente_id = ?
        AND sc.activo = 1
      ORDER BY sc.fecha_inicio DESC
    `, [clienteId]);

            return servicios;
        } catch (error) {
            console.error('❌ Error obteniendo servicios del cliente:', error);
            throw error;
        }
    }

    /**
 * Reagendar instalación
 */
    static async reagendarInstalacion(req, res) {
        try {
            const { id } = req.params;
            const { fecha_programada, hora_programada, observaciones } = req.body;

            console.log(`📅 Reagendando instalación ${id} para ${fecha_programada} ${hora_programada}`);

            const query = `
      UPDATE instalaciones 
      SET fecha_programada = ?, 
          hora_programada = ?, 
          observaciones = CONCAT(IFNULL(observaciones, ''), '\n', 'Reagendada: ', ?),
          estado = 'reagendada',
          updated_at = NOW()
      WHERE id = ?
    `;

            await Database.query(query, [
                fecha_programada,
                hora_programada,
                observaciones || 'Instalación reagendada',
                id
            ]);

            const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

            res.json({
                success: true,
                message: 'Instalación reagendada exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error reagendando instalación:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error reagendando instalación'
            });
        }
    }

    /**
     * Cancelar instalación
     */
    static async cancelarInstalacion(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            if (!motivo || motivo.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'El motivo de cancelación es requerido'
                });
            }

            console.log(`❌ Cancelando instalación ${id}. Motivo: ${motivo}`);

            const query = `
      UPDATE instalaciones 
      SET estado = 'cancelada',
          observaciones = CONCAT(IFNULL(observaciones, ''), '\n', 'CANCELADA: ', ?),
          updated_at = NOW()
      WHERE id = ?
    `;

            await Database.query(query, [motivo, id]);

            const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

            res.json({
                success: true,
                message: 'Instalación cancelada exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error cancelando instalación:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error cancelando instalación'
            });
        }
    }

    static async exportar(req, res) {
    try {
        const { formato = 'excel' } = req.query;
        
        console.log('📊 Exportando instalaciones en formato:', formato);

        // Construir consulta con filtros
        let query = `
            SELECT 
                i.id,
                CONCAT(c.nombres, ' ', c.apellidos) as cliente_nombre,
                c.identificacion as cliente_identificacion,
                i.telefono_contacto,
                i.direccion_instalacion,
                CONCAT(u.nombres, ' ', u.apellidos) as instalador_nombre,
                DATE_FORMAT(i.fecha_programada, '%d/%m/%Y') as fecha_programada,
                i.hora_programada,
                i.estado,
                i.tipo_instalacion,
                i.costo_instalacion,
                i.observaciones,
                DATE_FORMAT(i.created_at, '%d/%m/%Y %H:%i') as fecha_creacion
            FROM instalaciones i
            LEFT JOIN clientes c ON i.cliente_id = c.id
            LEFT JOIN usuarios u ON i.instalador_id = u.id
            WHERE i.activo = 1
            ORDER BY i.created_at DESC
        `;

        const instalaciones = await Database.query(query);

        if (formato === 'excel') {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Instalaciones');

            // Headers
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Cliente', key: 'cliente_nombre', width: 30 },
                { header: 'Identificación', key: 'cliente_identificacion', width: 15 },
                { header: 'Teléfono', key: 'telefono_contacto', width: 15 },
                { header: 'Dirección', key: 'direccion_instalacion', width: 40 },
                { header: 'Instalador', key: 'instalador_nombre', width: 25 },
                { header: 'Fecha Programada', key: 'fecha_programada', width: 15 },
                { header: 'Hora', key: 'hora_programada', width: 10 },
                { header: 'Estado', key: 'estado', width: 15 },
                { header: 'Tipo', key: 'tipo_instalacion', width: 15 },
                { header: 'Costo', key: 'costo_instalacion', width: 12 },
                { header: 'Observaciones', key: 'observaciones', width: 50 },
                { header: 'Fecha Creación', key: 'fecha_creacion', width: 20 }
            ];

            // Estilos del header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F81BD' }
            };

            // Agregar datos
            instalaciones.forEach(instalacion => {
                worksheet.addRow({
                    ...instalacion,
                    costo_instalacion: instalacion.costo_instalacion || 0
                });
            });

            // Headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="instalaciones.xlsx"');

            // Escribir al response
            await workbook.xlsx.write(res);
            res.end();

        } else if (formato === 'csv') {
            const headers = [
                'ID', 'Cliente', 'Identificación', 'Teléfono', 'Dirección',
                'Instalador', 'Fecha Programada', 'Hora', 'Estado', 'Tipo',
                'Costo', 'Observaciones', 'Fecha Creación'
            ];

            const rows = instalaciones.map(inst => [
                inst.id,
                inst.cliente_nombre || '',
                inst.cliente_identificacion || '',
                inst.telefono_contacto || '',
                inst.direccion_instalacion || '',
                inst.instalador_nombre || 'Sin asignar',
                inst.fecha_programada || '',
                inst.hora_programada || '',
                inst.estado || '',
                inst.tipo_instalacion || '',
                inst.costo_instalacion || '0',
                inst.observaciones || '',
                inst.fecha_creacion || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => 
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="instalaciones.csv"');
            res.send('\ufeff' + csvContent); // BOM para UTF-8

        } else {
            res.status(400).json({
                success: false,
                message: 'Formato no soportado'
            });
        }

    } catch (error) {
        console.error('❌ Error exportando instalaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error exportando instalaciones'
        });
    }
}
    /**
     * Generar orden de servicio en PDF
     */
  static async generarOrdenServicioPDF(req, res) {
    try {
        const { id } = req.params;
        console.log(`📄 Generando orden de servicio PDF para instalación ${id}`);

        // Obtener información completa de la instalación
        const instalacion = await this.obtenerInstalacionCompleta(id);
        
        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });

        // Headers para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="orden-servicio-${id}.pdf"`);

        // Pipe del documento al response
        doc.pipe(res);

        // ENCABEZADO DE LA EMPRESA
        doc.font('Helvetica-Bold')
            .fontSize(20)
            .text('ORDEN DE SERVICIO', 50, 50, { align: 'center' });

        doc.fontSize(12)
            .text('InternetCorp S.A.S.', 50, 80, { align: 'center' })
            .text('NIT: 123.456.789-0', 50, 95, { align: 'center' })
            .text('Teléfono: (123) 456-7890', 50, 110, { align: 'center' });

        // Línea divisoria
        doc.moveTo(50, 130)
            .lineTo(550, 130)
            .stroke();

        let yPosition = 150;

        // INFORMACIÓN DE LA ORDEN
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .text('INFORMACIÓN DE LA ORDEN', 50, yPosition);

        yPosition += 25;

        doc.font('Helvetica')
            .fontSize(10)
            .text(`Orden No: #${instalacion.id}`, 50, yPosition)
            .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, 300, yPosition);

        yPosition += 15;

        doc.text(`Estado: ${instalacion.estado?.toUpperCase()}`, 50, yPosition)
            .text(`Tipo: ${instalacion.tipo_instalacion || 'Nueva Instalación'}`, 300, yPosition);

        yPosition += 30;

        // INFORMACIÓN DEL CLIENTE
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('INFORMACIÓN DEL CLIENTE', 50, yPosition);

        yPosition += 20;

        doc.font('Helvetica')
            .fontSize(10)
            .text(`Cliente: ${instalacion.cliente_nombre || 'No especificado'}`, 50, yPosition);

        yPosition += 15;

        doc.text(`Identificación: ${instalacion.cliente_identificacion || 'No especificada'}`, 50, yPosition)
            .text(`Teléfono: ${instalacion.telefono_contacto || 'No especificado'}`, 300, yPosition);

        yPosition += 15;

        doc.text(`Dirección: ${instalacion.direccion_instalacion || 'No especificada'}`, 50, yPosition);

        yPosition += 30;

        // INFORMACIÓN DEL SERVICIO
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('INFORMACIÓN DEL SERVICIO', 50, yPosition);

        yPosition += 20;

        doc.font('Helvetica')
            .fontSize(10)
            .text(`Plan: ${instalacion.plan_nombre || 'No especificado'}`, 50, yPosition)
            .text(`Costo: $${instalacion.costo_instalacion?.toLocaleString() || '0'}`, 300, yPosition);

        yPosition += 30;

        // INFORMACIÓN DE INSTALACIÓN
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('PROGRAMACIÓN DE INSTALACIÓN', 50, yPosition);

        yPosition += 20;

        const fechaProgramada = instalacion.fecha_programada ? 
            new Date(instalacion.fecha_programada).toLocaleDateString('es-CO') : 
            'Por definir';

        doc.font('Helvetica')
            .fontSize(10)
            .text(`Fecha Programada: ${fechaProgramada}`, 50, yPosition)
            .text(`Hora: ${instalacion.hora_programada || 'Por definir'}`, 300, yPosition);

        yPosition += 15;

        doc.text(`Instalador: ${instalacion.instalador_nombre || 'Sin asignar'}`, 50, yPosition);

        yPosition += 30;

        // OBSERVACIONES
        if (instalacion.observaciones) {
            doc.font('Helvetica-Bold')
                .fontSize(12)
                .text('OBSERVACIONES', 50, yPosition);

            yPosition += 20;

            doc.font('Helvetica')
                .fontSize(10)
                .text(instalacion.observaciones, 50, yPosition, { width: 500 });

            yPosition += 40;
        }

        // FOOTER
        doc.fontSize(8)
            .text('___________________________', 50, yPosition + 50)
            .text('Firma del Cliente', 50, yPosition + 70)
            .text('___________________________', 350, yPosition + 50)
            .text('Firma del Instalador', 350, yPosition + 70);

        // Finalizar el documento
        doc.end();

    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando orden de servicio'
        });
    }
}
}

console.log('✅ Controlador de instalaciones inicializado');

module.exports = InstalacionesController;