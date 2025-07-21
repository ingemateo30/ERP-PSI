// backend/routes/instalaciones.js - VERSIÓN CORREGIDA COMPLETA

const express = require('express');
const router = express.Router();

// Middleware de autenticación
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validaciones
const { 
  validarCrearInstalacion,
  validarActualizarInstalacion,
  validarCambiarEstado,
  validarObtenerPorId,
  validarEquiposDisponibles,
  validarPermisosInstalacion,
  handleValidationErrors
} = require('../middleware/instalacionValidations');

// Controlador de instalaciones
const InstalacionesController = require('../controllers/instalacionesController');

console.log('🔧 Inicializando rutas de instalaciones...');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Middleware para logs de rutas
router.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl} - Usuario: ${req.user?.id} (${req.user?.rol})`);
    next();
});

// ==========================================
// RUTAS DE PRUEBA
// ==========================================

/**
 * @route GET /api/v1/instalaciones/test
 * @desc Test del controlador
 */
router.get('/test', InstalacionesController.test);

// ==========================================
// RUTAS PRINCIPALES
// ==========================================

/**
 * @route GET /api/v1/instalaciones/estadisticas
 * @desc Obtener estadísticas (debe ir antes de /:id)
 */
router.get('/estadisticas', InstalacionesController.obtenerEstadisticas);

/**
 * @route GET /api/v1/instalaciones/exportar
 * @desc Exportar reporte de instalaciones (CORREGIDO)
 */
router.get('/exportar',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            console.log('📊 Exportando reporte de instalaciones');
            
            const formato = req.query.formato || 'excel';
            const filtros = {
                estado: req.query.estado,
                instalador_id: req.query.instalador_id,
                fecha_desde: req.query.fecha_desde,
                fecha_hasta: req.query.fecha_hasta,
                busqueda: req.query.busqueda
            };

            // Obtener datos para exportar
            const response = await InstalacionesController.listar(req, { 
                json: (data) => data 
            });

            if (!response.success) {
                throw new Error('Error obteniendo datos para exportar');
            }

            const instalaciones = response.data;
            const timestamp = new Date().toISOString().split('T')[0];

            if (formato === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=instalaciones_${timestamp}.json`);
                return res.json({
                    fecha_exportacion: new Date().toISOString(),
                    total_registros: instalaciones.length,
                    filtros_aplicados: filtros,
                    instalaciones: instalaciones
                });
            }

            if (formato === 'csv') {
                // Generar CSV
                const csv = generarCSV(instalaciones);
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename=instalaciones_${timestamp}.csv`);
                return res.send('\uFEFF' + csv); // BOM para UTF-8
            }

            // Por defecto, JSON
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=instalaciones_${timestamp}.json`);
            res.json({
                fecha_exportacion: new Date().toISOString(),
                total_registros: instalaciones.length,
                instalaciones: instalaciones
            });

        } catch (error) {
            console.error('❌ Error exportando reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando reporte de instalaciones',
                error: error.message
            });
        }
    }
);

/**
 * @route GET /api/v1/instalaciones
 * @desc Listar instalaciones con filtros y paginación
 */
router.get('/', InstalacionesController.listar);

/**
 * @route GET /api/v1/instalaciones/:id
 * @desc Obtener instalación por ID (CORREGIDO)
 */
router.get('/:id', 
    validarObtenerPorId,
    handleValidationErrors,
    InstalacionesController.obtenerPorId
);

/**
 * @route POST /api/v1/instalaciones
 * @desc Crear nueva instalación
 */
router.post('/', 
    requireRole('administrador', 'supervisor'),
    validarCrearInstalacion,
    handleValidationErrors,
    validarEquiposDisponibles,
    validarPermisosInstalacion,
    InstalacionesController.crear
);

/**
 * @route PUT /api/v1/instalaciones/:id
 * @desc Actualizar instalación (CORREGIDO)
 */
router.put('/:id',
    requireRole('administrador', 'supervisor', 'instalador'),
    validarActualizarInstalacion,
    handleValidationErrors,
    validarPermisosInstalacion,
    InstalacionesController.actualizar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/estado
 * @desc Cambiar estado de instalación
 */
router.patch('/:id/estado', 
    validarCambiarEstado,
    handleValidationErrors,
    validarPermisosInstalacion,
    InstalacionesController.cambiarEstado
);

/**
 * @route PATCH /api/v1/instalaciones/:id/asignar-instalador
 * @desc Asignar instalador a una instalación (NUEVO)
 */
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { instalador_id } = req.body;

            if (!instalador_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del instalador es requerido'
                });
            }

            // Llamar al controlador para asignar instalador
            const resultado = await InstalacionesController.asignarInstalador(id, instalador_id);
            
            res.json({
                success: true,
                message: 'Instalador asignado exitosamente',
                data: resultado
            });

        } catch (error) {
            console.error('❌ Error asignando instalador:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al asignar instalador'
            });
        }
    }
);

/**
 * @route PATCH /api/v1/instalaciones/:id/reagendar
 * @desc Reagendar una instalación (NUEVO)
 */
router.patch('/:id/reagendar',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { fecha_programada, hora_programada, observaciones } = req.body;

            if (!fecha_programada || !hora_programada) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha y hora programada son requeridas'
                });
            }

            // Llamar al controlador para reagendar
            const resultado = await InstalacionesController.reagendarInstalacion(
                id, 
                fecha_programada, 
                hora_programada, 
                observaciones
            );
            
            res.json({
                success: true,
                message: 'Instalación reagendada exitosamente',
                data: resultado
            });

        } catch (error) {
            console.error('❌ Error reagendando instalación:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al reagendar instalación'
            });
        }
    }
);

/**
 * @route PATCH /api/v1/instalaciones/:id/cancelar
 * @desc Cancelar una instalación (NUEVO)
 */
router.patch('/:id/cancelar',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { motivo_cancelacion } = req.body;

            if (!motivo_cancelacion) {
                return res.status(400).json({
                    success: false,
                    message: 'El motivo de cancelación es requerido'
                });
            }

            // Llamar al controlador para cancelar
            const resultado = await InstalacionesController.cancelarInstalacion(id, motivo_cancelacion);
            
            res.json({
                success: true,
                message: 'Instalación cancelada exitosamente',
                data: resultado
            });

        } catch (error) {
            console.error('❌ Error cancelando instalación:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Error al cancelar instalación'
            });
        }
    }
);

/**
 * @route DELETE /api/v1/instalaciones/:id
 * @desc Eliminar instalación (CORREGIDO)
 */
router.delete('/:id',
    requireRole('administrador'),
    validarObtenerPorId,
    handleValidationErrors,
    InstalacionesController.eliminar
);

// ==========================================
// RUTAS ADICIONALES
// ==========================================

/**
 * @route POST /api/v1/instalaciones/:id/fotos
 * @desc Subir fotos de instalación
 */
router.post('/:id/fotos',
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            // Esta funcionalidad puede implementarse más tarde
            res.status(501).json({
                success: false,
                message: 'Funcionalidad de subida de fotos no implementada aún'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
);

/**
 * @route GET /api/v1/instalaciones/equipos/disponibles
 * @desc Obtener equipos disponibles para instalación
 */
router.get('/equipos/disponibles',
    requireRole('administrador', 'supervisor', 'instalador'),
    async (req, res) => {
        try {
            const equipos = await InstalacionesController.obtenerEquiposDisponibles();
            res.json({
                success: true,
                data: equipos
            });
        } catch (error) {
            console.error('❌ Error obteniendo equipos disponibles:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo equipos disponibles'
            });
        }
    }
);

/**
 * @route GET /api/v1/instalaciones/instaladores/disponibles
 * @desc Obtener lista de instaladores disponibles
 */
router.get('/instaladores/disponibles',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            const instaladores = await InstalacionesController.obtenerInstaladores();
            res.json({
                success: true,
                data: instaladores
            });
        } catch (error) {
            console.error('❌ Error obteniendo instaladores:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo instaladores disponibles'
            });
        }
    }
);

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Generar CSV a partir de los datos de instalaciones
 */
function generarCSV(instalaciones) {
    const headers = [
        'ID',
        'Cliente',
        'Identificación',
        'Teléfono',
        'Dirección',
        'Instalador',
        'Fecha Programada',
        'Hora Programada',
        'Estado',
        'Tipo Instalación',
        'Costo',
        'Observaciones',
        'Fecha Creación'
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
        inst.created_at || ''
    ]);

    return [headers.join(','), ...rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )].join('\n');
}

/**
 * @route GET /api/v1/instalaciones/:id/pdf
 * @desc Generar orden de servicio en PDF
 */
router.get('/:id/pdf',
    validarObtenerPorId,
    handleValidationErrors,
    InstalacionesController.generarOrdenServicioPDF
);

/**
 * @route PATCH /api/v1/instalaciones/:id/reagendar
 * @desc Reagendar instalación
 */
router.patch('/:id/reagendar',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    InstalacionesController.reagendarInstalacion
);

/**
 * @route PATCH /api/v1/instalaciones/:id/cancelar
 * @desc Cancelar instalación
 */
router.patch('/:id/cancelar',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    InstalacionesController.cancelarInstalacion
);

/**
 * @route PATCH /api/v1/instalaciones/:id/asignar-instalador
 * @desc Asignar instalador a instalación
 */
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
    validarObtenerPorId,
    [
        body('instalador_id')
            .notEmpty()
            .withMessage('El ID del instalador es requerido')
            .isInt({ min: 1 })
            .withMessage('El ID del instalador debe ser un número válido')
    ],
    handleValidationErrors,
    InstalacionesController.asignarInstalador
);

/**
 * @route GET /api/v1/instalaciones/exportar
 * @desc Exportar instalaciones (CORREGIR RUTA)
 */
router.get('/exportar',
    requireRole('administrador', 'supervisor'),
    InstalacionesController.exportar
);


/**
 * @route PATCH /api/v1/instalaciones/:id/iniciar
 * @desc Iniciar instalación (CORREGIR RESTRICCIÓN)
 */
router.patch('/:id/iniciar',
    requireRole('instalador'), // SOLO INSTALADORES
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Verificar que es su instalación asignada
            const [instalacion] = await Database.query(
                'SELECT instalador_id, estado FROM instalaciones WHERE id = ?',
                [id]
            );

            if (!instalacion) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            if (instalacion.instalador_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo puedes iniciar tus instalaciones asignadas'
                });
            }

            if (instalacion.estado !== 'programada') {
                return res.status(400).json({
                    success: false,
                    message: 'Solo se pueden iniciar instalaciones programadas'
                });
            }

            // Actualizar estado a 'en_proceso'
            await Database.query(
                `UPDATE instalaciones 
                SET estado = 'en_proceso', fecha_inicio = NOW(), updated_at = NOW()
                WHERE id = ?`,
                [id]
            );

            const instalacionActualizada = await InstalacionesController.obtenerInstalacionCompleta(id);

            res.json({
                success: true,
                message: 'Instalación iniciada exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error iniciando instalación:', error);
            res.status(500).json({
                success: false,
                message: 'Error iniciando instalación'
            });
        }
    }
);

/**
 * @route PATCH /api/v1/instalaciones/:id/iniciar
 * @desc Iniciar instalación (solo para instaladores)
 */
router.patch('/:id/iniciar',
    requireRole('instalador', 'supervisor'),
    validarObtenerPorId,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que es su instalación asignada (si es instalador)
            if (req.user.rol === 'instalador') {
                const [instalacion] = await Database.query(
                    'SELECT instalador_id FROM instalaciones WHERE id = ?',
                    [id]
                );

                if (!instalacion || instalacion.instalador_id !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'No tienes permisos para iniciar esta instalación'
                    });
                }
            }

            // Cambiar estado a 'en_proceso'
            req.body = {
                estado: 'en_proceso',
                hora_inicio: new Date().toTimeString().split(' ')[0],
                observaciones: 'Instalación iniciada'
            };

            await InstalacionesController.cambiarEstado(req, res);

        } catch (error) {
            console.error('❌ Error iniciando instalación:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al iniciar instalación'
            });
        }
    }
    
);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

router.use((error, req, res, next) => {
    console.error('❌ Error en rutas de instalaciones:', error);
    res.status(500).json({
        success: false,
        message: 'Error en el módulo de instalaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
});

console.log('✅ Rutas de instalaciones configuradas');

module.exports = router;