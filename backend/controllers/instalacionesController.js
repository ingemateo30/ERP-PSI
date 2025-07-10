// 1. VERIFICAR QUE EL CONTROLADOR EXISTE EN LA RUTA CORRECTA
// backend/controllers/instalacionesController.js

const { Database } = require('../models/Database');

class InstalacionesController {
    // Método de prueba para verificar que el controlador funciona
    static async test(req, res) {
        try {
            res.json({
                success: true,
                message: 'Controlador de instalaciones funcionando correctamente',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error en controlador de instalaciones',
                error: error.message
            });
        }
    }

    static async listar(req, res) {
        try {
            console.log('📋 Ejecutando listar instalaciones...');
            const { pagina = 1, limite = 20 } = req.query;

            // Consulta básica para probar
            const [instalaciones] = await Database.query(`
                SELECT 
                    i.*,
                    c.nombres,
                    c.apellidos,
                    c.identificacion
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?
            `, [parseInt(limite), (parseInt(pagina) - 1) * parseInt(limite)]);

            const [total] = await Database.query('SELECT COUNT(*) as total FROM instalaciones');

            console.log(`📋 Encontradas ${instalaciones.length} instalaciones`);

            res.json({
                success: true,
                data: {
                    instalaciones: instalaciones.map(inst => ({
                        ...inst,
                        cliente_nombre_completo: inst.nombres ? `${inst.nombres} ${inst.apellidos}` : 'Cliente no encontrado',
                        equipos_instalados: inst.equipos_instalados ? JSON.parse(inst.equipos_instalados) : [],
                        fotos_instalacion: inst.fotos_instalacion ? JSON.parse(inst.fotos_instalacion) : []
                    })),
                    paginacion: {
                        pagina_actual: parseInt(pagina),
                        total_registros: total[0].total,
                        registros_por_pagina: parseInt(limite),
                        total_paginas: Math.ceil(total[0].total / parseInt(limite))
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error en listar instalaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            console.log(`🔍 Buscando instalación ID: ${id}`);

            const [instalaciones] = await Database.query(`
                SELECT 
                    i.*,
                    c.nombres,
                    c.apellidos,
                    c.identificacion,
                    c.telefono as cliente_telefono
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                WHERE i.id = ?
            `, [id]);

            if (instalaciones.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            const instalacion = instalaciones[0];
            res.json({
                success: true,
                data: {
                    instalacion: {
                        ...instalacion,
                        cliente_nombre_completo: instalacion.nombres ? `${instalacion.nombres} ${instalacion.apellidos}` : 'Cliente no encontrado',
                        equipos_instalados: instalacion.equipos_instalados ? JSON.parse(instalacion.equipos_instalados) : [],
                        fotos_instalacion: instalacion.fotos_instalacion ? JSON.parse(instalacion.fotos_instalacion) : []
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async crear(req, res) {
        try {
            console.log('➕ Creando nueva instalación...');
            const {
                cliente_id,
                servicio_cliente_id,
                instalador_id,
                fecha_programada,
                hora_programada = '09:00:00',
                direccion_instalacion,
                barrio,
                telefono_contacto,
                persona_recibe,
                tipo_instalacion = 'nueva',
                observaciones,
                costo_instalacion = 0
            } = req.body;

            // Validaciones básicas
            if (!cliente_id || !servicio_cliente_id || !fecha_programada) {
                return res.status(400).json({
                    success: false,
                    message: 'Campos requeridos: cliente_id, servicio_cliente_id, fecha_programada'
                });
            }

            const [resultado] = await Database.query(`
                INSERT INTO instalaciones (
                    cliente_id, servicio_cliente_id, instalador_id, fecha_programada,
                    hora_programada, estado, direccion_instalacion, barrio,
                    telefono_contacto, persona_recibe, tipo_instalacion, observaciones,
                    costo_instalacion, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'programada', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                cliente_id, servicio_cliente_id, instalador_id, fecha_programada,
                hora_programada, direccion_instalacion, barrio,
                telefono_contacto, persona_recibe, tipo_instalacion, observaciones,
                costo_instalacion
            ]);

            console.log(`✅ Instalación creada con ID: ${resultado.insertId}`);

            res.status(201).json({
                success: true,
                message: 'Instalación creada exitosamente',
                data: { id: resultado.insertId }
            });

        } catch (error) {
            console.error('❌ Error creando instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async actualizar(req, res) {
        try {
            const { id } = req.params;
            console.log(`✏️ Actualizando instalación ID: ${id}`);

            // Verificar que existe
            const [existe] = await Database.query('SELECT id FROM instalaciones WHERE id = ?', [id]);
            if (existe.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            const camposPermitidos = [
                'instalador_id', 'fecha_programada', 'hora_programada', 'estado',
                'direccion_instalacion', 'barrio', 'telefono_contacto', 'persona_recibe',
                'tipo_instalacion', 'observaciones', 'costo_instalacion'
            ];

            const updates = [];
            const valores = [];

            camposPermitidos.forEach(campo => {
                if (req.body.hasOwnProperty(campo)) {
                    updates.push(`${campo} = ?`);
                    valores.push(req.body[campo]);
                }
            });

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay campos para actualizar'
                });
            }

            updates.push('updated_at = NOW()');
            valores.push(id);

            await Database.query(`
                UPDATE instalaciones 
                SET ${updates.join(', ')}
                WHERE id = ?
            `, valores);

            console.log(`✅ Instalación ${id} actualizada`);

            res.json({
                success: true,
                message: 'Instalación actualizada exitosamente'
            });

        } catch (error) {
            console.error('❌ Error actualizando instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado, observaciones } = req.body;
            console.log(`🔄 Cambiando estado instalación ${id} a: ${estado}`);

            const estadosValidos = ['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            await Database.query(`
                UPDATE instalaciones 
                SET estado = ?, observaciones = ?, updated_at = NOW()
                WHERE id = ?
            `, [estado, observaciones || null, id]);

            console.log(`✅ Estado cambiado a: ${estado}`);

            res.json({
                success: true,
                message: `Estado cambiado a ${estado} exitosamente`
            });

        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async eliminar(req, res) {
        try {
            const { id } = req.params;
            console.log(`🗑️ Eliminando instalación ID: ${id}`);

            const [resultado] = await Database.query('DELETE FROM instalaciones WHERE id = ?', [id]);

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            console.log(`✅ Instalación ${id} eliminada`);

            res.json({
                success: true,
                message: 'Instalación eliminada exitosamente'
            });

        } catch (error) {
            console.error('❌ Error eliminando instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async obtenerEstadisticas(req, res) {
        try {
            console.log('📊 Obteniendo estadísticas...');

            const [estadisticas] = await Database.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN estado = 'programada' THEN 1 END) as programadas,
                    COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
                    COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
                    COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
                    COUNT(CASE WHEN estado = 'reagendada' THEN 1 END) as reagendadas
                FROM instalaciones
            `);

            res.json({
                success: true,
                data: { resumen: estadisticas[0] }
            });

        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = InstalacionesController;