// backend/routes/instalaciones.js - ARREGLADO BASADO EN CÓDIGO ACTUAL

const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const puppeteer = require('puppeteer');

// Middleware de autenticación
const { authenticateToken, requireRole } = require('../middleware/auth');

// Controlador de instalaciones (usar el existente)
const InstalacionesController = require('../controllers/instalacionesController');

console.log('🔧 Inicializando rutas de instalaciones ARREGLADAS...');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Middleware para logs de rutas
router.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl} - Usuario: ${req.user?.id} (${req.user?.rol})`);
    next();
});

// ==========================================
// RUTAS PRINCIPALES (ORDEN IMPORTANTE)
// ==========================================

/**
 * ARREGLADO: Test del controlador
 */
router.get('/test', InstalacionesController.test);

/**
 * ARREGLADO: Obtener estadísticas (debe ir antes de /:id)
 */
router.get('/estadisticas', async (req, res) => {
    try {
        console.log('📊 Obteniendo estadísticas de instalaciones');
        
        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filtrar por instalador si es necesario
        if (req.user.rol === 'instalador') {
            whereClause += ' AND instalador_id = ?';
            params.push(req.user.id);
        }

        const [stats] = await Database.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
                SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
                SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                SUM(CASE WHEN estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
                SUM(CASE WHEN estado = 'programada' AND DATE(fecha_programada) < CURDATE() THEN 1 ELSE 0 END) as vencidas
            FROM instalaciones ${whereClause}
        `, params);

        res.json({
            success: true,
            data: stats || {
                total: 0,
                programadas: 0,
                en_proceso: 0,
                completadas: 0,
                canceladas: 0,
                reagendadas: 0,
                vencidas: 0
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error obteniendo estadísticas'
        });
    }
});

/**
 * ARREGLADO: Obtener instaladores disponibles
 */
router.get('/instaladores', 
    requireRole('administrador', 'supervisor'), 
    async (req, res) => {
        try {
            console.log('👷 Obteniendo instaladores disponibles');

            const instaladores = await Database.query(`
                SELECT 
                    id,
                    nombre,
                    telefono,
                    email,
                    activo
                FROM sistema_usuarios 
                WHERE rol IN ('instalador') 
                AND activo = 1
                ORDER BY nombre
            `);

            console.log(`✅ ${instaladores.length} instaladores encontrados`);

            res.json({
                success: true,
                data: instaladores
            });

        } catch (error) {
            console.error('❌ Error obteniendo instaladores:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error obteniendo instaladores'
            });
        }
    }
);

/**
 * ARREGLADO: Exportar reporte de instalaciones
 */
router.get('/exportar',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            console.log('📊 Exportando reporte de instalaciones');
            
            const {
                busqueda = '',
                estado = '',
                instalador_id = '',
                fecha_desde = '',
                fecha_hasta = ''
            } = req.query;

            // Construir WHERE clause para exportar
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (busqueda.trim()) {
                whereClause += ` AND (
                    c.nombre LIKE ? OR
                    i.direccion_instalacion LIKE ?
                )`;
                const searchTerm = `%${busqueda}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (estado) {
                whereClause += ' AND i.estado = ?';
                params.push(estado);
            }

            if (instalador_id && instalador_id !== 'sin_asignar') {
                whereClause += ' AND i.instalador_id = ?';
                params.push(instalador_id);
            } else if (instalador_id === 'sin_asignar') {
                whereClause += ' AND i.instalador_id IS NULL';
            }

            if (fecha_desde) {
                whereClause += ' AND DATE(i.fecha_programada) >= ?';
                params.push(fecha_desde);
            }

            if (fecha_hasta) {
                whereClause += ' AND DATE(i.fecha_programada) <= ?';
                params.push(fecha_hasta);
            }

            // Obtener datos para exportar
            const instalaciones = await Database.query(`
                SELECT 
                    i.id,
                    c.nombre as cliente_nombre,
                    c.identificacion as cliente_identificacion,
                    c.telefono as cliente_telefono,
                    i.fecha_programada,
                    i.hora_programada,
                    u.nombre as instalador_nombre_completo,
                    i.estado,
                    i.direccion_instalacion,
                    i.barrio,
                    i.telefono_contacto,
                    i.persona_recibe,
                    i.costo_instalacion,
                    i.observaciones,
                    i.created_at
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
                ${whereClause}
                ORDER BY i.fecha_programada DESC, i.created_at DESC
            `, params);

            if (instalaciones.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay datos para exportar'
                });
            }

            // Generar CSV
            const headers = [
                'ID',
                'Cliente',
                'Identificación',
                'Teléfono Cliente',
                'Fecha Programada',
                'Hora Programada',
                'Instalador',
                'Estado',
                'Dirección',
                'Barrio',
                'Teléfono Contacto',
                'Persona Recibe',
                'Costo',
                'Observaciones',
                'Fecha Creación'
            ];

            const rows = instalaciones.map(inst => [
                inst.id || '',
                inst.cliente_nombre || '',
                inst.cliente_identificacion || '',
                inst.cliente_telefono || '',
                inst.fecha_programada || '',
                inst.hora_programada || '',
                inst.instalador_nombre_completo || 'Sin asignar',
                inst.estado || '',
                inst.direccion_instalacion || '',
                inst.barrio || '',
                inst.telefono_contacto || '',
                inst.persona_recibe || '',
                inst.costo_instalacion || '0',
                inst.observaciones || '',
                inst.created_at || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => 
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
            ].join('\n');

            const filename = `instalaciones_${new Date().toISOString().split('T')[0]}.csv`;
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 support

            console.log('✅ Reporte exportado exitosamente');

        } catch (error) {
            console.error('❌ Error exportando:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error exportando datos'
            });
        }
    }
);

/**
 * ARREGLADO: Generar orden de servicio PDF
 */
router.get('/:id/pdf', async (req, res) => {
    let browser = null;
    
    try {
        const { id } = req.params;
        console.log(`📄 Generando orden PSI para instalación: ${id}`);

        // Obtener datos de la instalación
        const [instalacionData] = await Database.query(`
            SELECT 
                i.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                c.telefono as cliente_telefono,
                c.direccion as cliente_direccion,
                c.barrio as cliente_barrio,
                c.ciudad_id as cliente_ciudad,
                u.nombre as instalador_nombre_completo,
                u.telefono as instalador_telefono
            FROM instalaciones i
            LEFT JOIN clientes c ON i.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
            WHERE i.id = ?
        `, [id]);

        if (!instalacionData || instalacionData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        const instalacion = instalacionData[0];

        // Obtener servicios
        let servicios = [];
        try {
            if (instalacion.servicio_cliente_id) {
                let serviciosIds;
                if (typeof instalacion.servicio_cliente_id === 'string') {
                    try {
                        serviciosIds = JSON.parse(instalacion.servicio_cliente_id);
                    } catch {
                        serviciosIds = [instalacion.servicio_cliente_id];
                    }
                } else {
                    serviciosIds = [instalacion.servicio_cliente_id];
                }

                if (Array.isArray(serviciosIds) && serviciosIds.length > 0) {
                    const placeholders = serviciosIds.map(() => '?').join(',');
                    const [serviciosData] = await Database.query(`
                        SELECT nombre, velocidad_subida, velocidad_bajada
                        FROM planes_servicio
                        WHERE id IN (${placeholders})
                    `, serviciosIds);
                    servicios = serviciosData;
                }
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo servicios:', error);
        }

        // Construir descripción de servicios
        let servicioDescripcion = 'Internet';
        if (servicios.length > 0) {
            const primerServicio = servicios[0];
            servicioDescripcion = `${primerServicio.nombre || 'Internet'} ${primerServicio.velocidad_bajada || ''}${primerServicio.velocidad_bajada ? ' Mbps' : ''}`.trim();
        }

        // HTML EXACTO como la imagen PSI
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PSI - ${instalacion.id}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            background: white;
        }
        
        .container {
            width: 210mm;
            height: 148mm;
            margin: 0 auto;
            padding: 10mm;
            position: relative;
        }
        
        .header {
            text-align: right;
            margin-bottom: 15px;
        }
        
        .psi-title {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
        }
        
        .company-info {
            margin-top: 5px;
            font-size: 9px;
            line-height: 1.1;
        }
        
        .main-content {
            margin-top: 20px;
        }
        
        .info-line {
            margin-bottom: 8px;
            display: flex;
            align-items: baseline;
        }
        
        .label {
            font-weight: bold;
            margin-right: 5px;
            min-width: 80px;
        }
        
        .value {
            flex: 1;
            border-bottom: 1px solid #000;
            min-height: 16px;
            padding-bottom: 1px;
        }
        
        .description-section {
            margin-top: 25px;
            margin-bottom: 25px;
        }
        
        .description-label {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .description-box {
            border: 1px solid #000;
            min-height: 40px;
            padding: 5px;
        }
        
        .signatures {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-section {
            width: 45%;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            margin-top: 30px;
            margin-bottom: 5px;
        }
        
        .signature-label {
            text-align: center;
            font-size: 10px;
        }
        
        @media print {
            body { margin: 0; }
            .container { 
                width: 100%;
                height: 100vh;
                margin: 0;
                padding: 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="psi-title">PSI</div>
            <div class="company-info">
                PROVEEDOR DE TELECOMUNICACIONES S.A.S<br>
                NIT: 900.123.456-7<br>
                Carrera 15 #123-45
            </div>
        </div>

        <!-- CONTENIDO PRINCIPAL -->
        <div class="main-content">
            <!-- Nombre -->
            <div class="info-line">
                <span class="label">Nombre:</span>
                <span class="value">${instalacion.cliente_nombre || ''}</span>
            </div>

            <!-- Dirección -->
            <div class="info-line">
                <span class="label">Dirección:</span>
                <span class="value">${instalacion.direccion_instalacion || instalacion.cliente_direccion || ''}</span>
            </div>

            <!-- Barrio -->
            <div class="info-line">
                <span class="label">Barrio:</span>
                <span class="value">${instalacion.barrio || instalacion.cliente_barrio || ''}</span>
            </div>

            <!-- Teléfono -->
            <div class="info-line">
                <span class="label">Teléfono:</span>
                <span class="value">${instalacion.telefono_contacto || instalacion.cliente_telefono || ''}</span>
            </div>

            <!-- Identificación -->
            <div class="info-line">
                <span class="label">Identificación:</span>
                <span class="value">${instalacion.cliente_identificacion || ''}</span>
            </div>

            <!-- Descripción/Observaciones -->
            <div class="description-section">
                <div class="description-label">Observaciones:</div>
                <div class="description-box">
                    Instalación de ${servicioDescripcion}<br>
                    Fecha: ${instalacion.fecha_programada || 'Por programar'}<br>
                    Hora: ${instalacion.hora_programada || 'Por definir'}<br>
                    ${instalacion.observaciones || ''}
                </div>
            </div>

            <!-- Líneas adicionales -->
            <div class="info-line">
                <span class="label"></span>
                <span class="value"></span>
            </div>

            <div class="info-line">
                <span class="label"></span>
                <span class="value"></span>
            </div>

            <!-- Firmas -->
            <div class="signatures">
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-label">Firma Usuario</div>
                </div>
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-label">PSI</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        // Generar PDF con Puppeteer
        console.log('🚀 Iniciando Puppeteer para PDF PSI...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();
        
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Configuración PDF para formato PSI (A5 landscape)
        const pdfBuffer = await page.pdf({
            format: 'A5',
            landscape: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            printBackground: true,
            preferCSSPageSize: false
        });

        await browser.close();
        browser = null;

        // CORRECCIÓN CRÍTICA: Headers correctos para PDF
        const filename = `PSI_${String(instalacion.id).padStart(6, '0')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // CRÍTICO: Enviar el buffer directamente
        res.end(pdfBuffer);

        console.log(`✅ PDF PSI generado exitosamente: ${filename}`);

    } catch (error) {
        console.error('❌ Error generando PDF PSI:', error);
        
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error cerrando browser:', closeError);
            }
        }

        // Si el error ocurre después de enviar headers, no podemos enviar JSON
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error generando PDF PSI',
                error: error.message
            });
        }
    }
});

/**
 * ARREGLADO: Obtener instalación por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 Obteniendo instalación ID: ${id}`);

        const [instalacion] = await Database.query(`
            SELECT 
                i.*,
                c.nombre as cliente_nombre,
                c.identificacion as cliente_identificacion,
                c.telefono as cliente_telefono,
                c.correo as cliente_email,
                u.nombre as instalador_nombre_completo,
                u.telefono as instalador_telefono
            FROM instalaciones i
            LEFT JOIN clientes c ON i.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
            WHERE i.id = ?
        `, [id]);

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.rol === 'instalador' && instalacion.instalador_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver esta instalación'
            });
        }

        // Procesar campos JSON
        if (instalacion.equipos_instalados) {
            try {
                instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
            } catch (e) {
                instalacion.equipos_instalados = [];
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
            message: error.message || 'Error obteniendo instalación'
        });
    }
});

/**
 * ARREGLADO: Listar instalaciones
 */
router.get('/', InstalacionesController.listar);

/**
 * ARREGLADO: Crear nueva instalación
 */
router.post('/', InstalacionesController.crear);

/**
 * ARREGLADO: Actualizar instalación
 */
router.put('/:id', InstalacionesController.actualizar);

/**
 * ARREGLADO: Eliminar instalación (solo administradores)
 */
router.delete('/:id', 
    requireRole('administrador'),
    async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`🗑️ Eliminando instalación ID: ${id}`);

            // Verificar que la instalación existe
            const [instalacion] = await Database.query(
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

            // Eliminar instalación
            await Database.query('DELETE FROM instalaciones WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Instalación eliminada exitosamente'
            });

        } catch (error) {
            console.error('❌ Error eliminando instalación:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error eliminando instalación'
            });
        }
    }
);

// ==========================================
// RUTAS DE ACCIONES ESPECÍFICAS (ARREGLADAS)
// ==========================================

/**
 * ARREGLADO: Asignar instalador
 */
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { instalador_id } = req.body;

            console.log(`👷‍♂️ Asignando instalador ${instalador_id} a instalación ${id}`);

            if (!instalador_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del instalador es requerido'
                });
            }

            // Verificar que la instalación existe
            const [instalacion] = await Database.query(
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
            const [instalador] = await Database.query(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND rol IN ("instalador", "supervisor")',
                [instalador_id]
            );

            if (!instalador) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalador no encontrado o no tiene permisos'
                });
            }

            // Actualizar instalador
            await Database.query(
                'UPDATE instalaciones SET instalador_id = ?, updated_at = NOW() WHERE id = ?',
                [instalador_id, id]
            );

            // Obtener instalación actualizada
            const [instalacionActualizada] = await Database.query(`
                SELECT 
                    i.*,
                    c.nombre as cliente_nombre,
                    u.nombre as instalador_nombre_completo
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
                WHERE i.id = ?
            `, [id]);

            res.json({
                success: true,
                message: 'Instalador asignado exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error asignando instalador:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error asignando instalador'
            });
        }
    }
);

/**
 * ARREGLADO: Cambiar estado de instalación
 */
router.patch('/:id/cambiar-estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones, motivo_cancelacion } = req.body;

        console.log(`🔄 Cambiando estado de instalación ${id} a: ${estado}`);

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: 'El estado es requerido'
            });
        }

        // Verificar que la instalación existe
        const [instalacion] = await Database.query(
            'SELECT * FROM instalaciones WHERE id = ?',
            [id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada'
            });
        }

        // Verificar permisos según el estado
        const permisosEstado = {
            'en_proceso': ['instalador'], // Solo el instalador asignado
            'completada': ['instalador'], // Solo el instalador asignado
            'cancelada': ['administrador', 'supervisor'],
            'reagendada': ['administrador', 'supervisor'],
            'programada': ['administrador', 'supervisor']
        };

        if (!permisosEstado[estado]?.includes(req.user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para cambiar a este estado'
            });
        }

        // Para instaladores, verificar que sea su instalación
        if (req.user.rol === 'instalador' && instalacion.instalador_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes cambiar el estado de tus propias instalaciones'
            });
        }

        // Construir query de actualización
        const updates = ['estado = ?', 'updated_at = NOW()'];
        const params = [estado];

        if (estado === 'cancelada' && motivo_cancelacion) {
            updates.push('motivo_cancelacion = ?');
            params.push(motivo_cancelacion);
        }

        if (estado === 'completada') {
            updates.push('fecha_completada = ?');
            params.push(new Date().toISOString().split('T')[0]);
        }

        if (observaciones) {
            updates.push('observaciones = ?');
            params.push(observaciones);
        }

        // Ejecutar actualización
        const query = `UPDATE instalaciones SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);

        await Database.query(query, params);

        // Obtener instalación actualizada
        const [instalacionActualizada] = await Database.query(`
            SELECT 
                i.*,
                c.nombre as cliente_nombre
            FROM instalaciones i
            LEFT JOIN clientes c ON i.cliente_id = c.id
            WHERE i.id = ?
        `, [id]);

        res.json({
            success: true,
            message: `Estado cambiado a: ${estado}`,
            data: instalacionActualizada
        });

    } catch (error) {
        console.error('❌ Error cambiando estado:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error cambiando estado'
        });
    }
});

/**
 * ARREGLADO: Iniciar instalación (solo instaladores)
 */
router.patch('/:id/iniciar', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`▶️ Iniciando instalación ${id}`);

        // Solo instaladores pueden iniciar instalaciones
        if (req.user.rol !== 'instalador') {
            return res.status(403).json({
                success: false,
                message: 'Solo los instaladores pueden iniciar instalaciones'
            });
        }

        // Verificar que es su instalación asignada
        const [instalacion] = await Database.query(
            'SELECT * FROM instalaciones WHERE id = ? AND instalador_id = ?',
            [id, req.user.id]
        );

        if (!instalacion) {
            return res.status(404).json({
                success: false,
                message: 'Instalación no encontrada o no asignada a ti'
            });
        }

        if (instalacion.estado !== 'programada') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden iniciar instalaciones programadas'
            });
        }

        // Cambiar estado a en_proceso
        req.body = {
            estado: 'en_proceso',
            observaciones: 'Instalación iniciada por el técnico'
        };

        // Reutilizar la ruta de cambiar estado
        return router.handle({
            ...req,
            method: 'PATCH',
            originalUrl: `/api/v1/instalaciones/${id}/cambiar-estado`,
            params: { id }
        }, res);

    } catch (error) {
        console.error('❌ Error iniciando instalación:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al iniciar instalación'
        });
    }
});

console.log('✅ Rutas de instalaciones ARREGLADAS configuradas');

module.exports = router;