// backend/routes/instalaciones.js - ARREGLADO BASADO EN CÓDIGO ACTUAL

const express = require('express');
const router = express.Router();
const { Database } = require('../models/Database');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Middleware de autenticación
const { authenticateToken, requireRole } = require('../middleware/auth');

// Controlador de instalaciones (usar el existente)
const InstalacionesController = require('../controllers/instalacionesController');

console.log('🔧 Inicializando rutas de instalaciones ARREGLADAS...');

// Configurar multer para subida de fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/instalaciones');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'instalacion-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png)'));
    }
  }
});

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
 * 🆕 MOVIDA AQUÍ: Obtener trabajos del instalador
 * GET /api/instalaciones/mis-trabajos/:instalador_id
 */
router.get('/mis-trabajos/:instalador_id', async (req, res) => {
  try {
    const { instalador_id } = req.params;
    const { estado } = req.query;

    console.log(`📋 Obteniendo trabajos del instalador ${instalador_id}`);

    // Verificar que el usuario solo pueda ver sus propios trabajos (a menos que sea admin/supervisor)
    if (req.user.rol !== 'administrador' && req.user.rol !== 'supervisor') {
      if (parseInt(instalador_id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ver estos trabajos'
        });
      }
    }

    let whereClause = 'WHERE i.instalador_id = ?';
    const params = [instalador_id];

    // Filtrar por estado si se proporciona
    if (estado && estado !== 'todas') {
      if (estado === 'pendiente') {
        whereClause += " AND i.estado = 'programada'";
      } else {
        whereClause += ' AND i.estado = ?';
        params.push(estado);
      }
    }

// Consulta con JOIN a clientes y planes
    const query = `
      SELECT 
        i.*,
        c.nombre as cliente_nombre,
        c.telefono as cliente_telefono,
        c.correo as cliente_email,
        sc.plan_id,
        ps.nombre as plan_nombre,
        ps.velocidad_bajada,
        ps.velocidad_subida,
        c.nombre as nombre_completo
      FROM instalaciones i
      INNER JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      ${whereClause}
      ORDER BY i.fecha_programada ASC, i.hora_programada ASC
    `;

    const instalaciones = await Database.query(query, params);

    res.json({
      success: true,
      data: instalaciones,
      total: instalaciones.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo trabajos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error obteniendo trabajos del instalador'
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
 * 🆕 MOVIDA AQUÍ: Obtener equipos disponibles
 */
router.get('/equipos/disponibles', async (req, res) => {
  try {
    console.log('📦 Obteniendo equipos disponibles');

    const equipos = await Database.query(
      `SELECT id, codigo, nombre, tipo, marca, modelo, numero_serie, estado, ubicacion
       FROM inventario_equipos
       WHERE estado = 'disponible'
       ORDER BY tipo, nombre`
    );

    res.json({
      success: true,
      data: equipos,
      total: equipos.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo equipos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error obteniendo equipos disponibles'
    });
  }
});

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
                params.push(searchTerm, searchTerm);
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

        // DEBUGGING: Verificar primero si existe la instalación
        console.log('🔍 Verificando instalación con ID:', id, '(tipo:', typeof id, ')');

        // PASO 1: Verificar que la instalación existe - CORREGIDO
        const checkResult = await Database.query(`
            SELECT COUNT(*) as total FROM instalaciones WHERE id = ?
        `, [id]);

        console.log('📊 Resultado verificación completo:', checkResult);
        console.log('📊 Tipo de resultado:', typeof checkResult);
        console.log('📊 Es array?:', Array.isArray(checkResult));

        // CORRECCIÓN: Manejar diferentes estructuras de respuesta
        let totalCount = 0;
        if (Array.isArray(checkResult)) {
            if (checkResult.length > 0) {
                if (Array.isArray(checkResult[0])) {
                    // Estructura: [[{total: 1}], metadata]
                    totalCount = checkResult[0][0]?.total || 0;
                } else {
                    // Estructura: [{total: 1}]
                    totalCount = checkResult[0]?.total || 0;
                }
            }
        } else if (checkResult && checkResult.total !== undefined) {
            // Estructura: {total: 1}
            totalCount = checkResult.total;
        }

        console.log('📊 Total count extraído:', totalCount);

        if (totalCount === 0) {
            console.log('❌ No existe instalación con ID:', id);
            return res.status(404).json({
                success: false,
                message: `Instalación con ID ${id} no encontrada en la base de datos`
            });
        }

        // PASO 2: Obtener datos completos con JOINs opcionales - CORREGIDO
        const instalacionResult = await Database.query(`
            SELECT 
                i.*,
                COALESCE(c.nombre, 'Cliente no asignado') as cliente_nombre,
                COALESCE(c.identificacion, '') as cliente_identificacion,
                COALESCE(c.telefono, '') as cliente_telefono,
                COALESCE(c.direccion, '') as cliente_direccion,
                COALESCE(c.barrio, '') as cliente_barrio,
                c.ciudad_id as cliente_ciudad,
                COALESCE(u.nombre, 'Instalador no asignado') as instalador_nombre_completo,
                COALESCE(u.telefono, '') as instalador_telefono
            FROM instalaciones i
            LEFT JOIN clientes c ON i.cliente_id = c.id
            LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
            WHERE i.id = ?
        `, [id]);

        console.log('📊 Resultado instalación completo:', instalacionResult);
        console.log('📊 Tipo:', typeof instalacionResult, 'Es array:', Array.isArray(instalacionResult));

        // CORRECCIÓN: Extraer datos según la estructura real
        let instalacionData = [];
        if (Array.isArray(instalacionResult)) {
            if (instalacionResult.length > 0 && Array.isArray(instalacionResult[0])) {
                // Estructura: [[datos], metadata]
                instalacionData = instalacionResult[0];
            } else {
                // Estructura: [datos]
                instalacionData = instalacionResult;
            }
        }

        console.log('📊 Datos extraídos:', instalacionData?.length || 0, 'registros');

        if (instalacionData && instalacionData.length > 0) {
            console.log('✅ Instalación encontrada:', {
                id: instalacionData[0].id,
                cliente_id: instalacionData[0].cliente_id,
                cliente_nombre: instalacionData[0].cliente_nombre
            });
        }

        // CORRECCIÓN: Verificar que existe el registro
        if (!instalacionData || instalacionData.length === 0) {
            console.log('❌ Query no devolvió resultados para ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Error obteniendo datos de la instalación'
            });
        }

        // CORRECCIÓN: Tomar el primer elemento del array
        const instalacion = instalacionData[0];
        console.log('✅ Instalación encontrada:', instalacion.id, instalacion.cliente_nombre);

        // Obtener servicios - CORREGIDO
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
                    const serviciosResult = await Database.query(`
                        SELECT nombre, velocidad_subida, velocidad_bajada
                        FROM planes_servicio
                        WHERE id IN (${placeholders})
                    `, serviciosIds);

                    // CORRECCIÓN: Extraer servicios según estructura
                    if (Array.isArray(serviciosResult)) {
                        if (serviciosResult.length > 0 && Array.isArray(serviciosResult[0])) {
                            servicios = serviciosResult[0] || [];
                        } else {
                            servicios = serviciosResult || [];
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo servicios:', error.message);
            servicios = [];
        }

        // Construir descripción de servicios
        let servicioDescripcion = 'Internet';
        if (servicios.length > 0) {
            const primerServicio = servicios[0];
            servicioDescripcion = `${primerServicio.nombre || 'Internet'} ${primerServicio.velocidad_bajada || ''}${primerServicio.velocidad_bajada ? ' Mbps' : ''}`.trim();
        }

        console.log('📋 Servicio descripción:', servicioDescripcion);

        const logoPath = path.join(__dirname, '../public/logo2.png');
        let logoBase64 = '';
        try {
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
                console.log('✅ Logo cargado exitosamente desde:', logoPath);
            } else {
                console.log('⚠️ Logo no encontrado en:', logoPath);
            }
        } catch (logoError) {
            console.warn('⚠️ Error cargando logo:', logoError.message);
        }
// Fragmento mejorado para la ruta GET /:id/pdf
// Reemplazar solo la sección del htmlContent

// Fragmento mejorado para la ruta GET /:id/pdf
// Reemplazar solo la sección del htmlContent

const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden de Servicio PSI - ${instalacion.id}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 7px;
            line-height: 1.1;
            color: #000;
            background: white;
            padding: 0;
            margin: 0;
        }

        .psi-container {
            width: 216mm;
            height: 93mm;
            padding: 2mm 3mm;
            position: relative;
            background: white;
        }

        /* HEADER ULTRA COMPACTO */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1mm;
            padding-bottom: 0.5mm;
            border-bottom: 1px solid #000;
        }

        .left-header {
            display: flex;
            align-items: center;
            gap: 1.5mm;
        }

        .logo-section {
            width: 12mm;
            height: 8mm;
            display: flex;
            align-items: center;
            justify-content: center;
            ${logoBase64 ? `background: url('${logoBase64}') no-repeat center center; background-size: contain;` : 'border: 1px solid #000; background: white;'}
        }

        .company-info {
            display: flex;
            flex-direction: column;
            gap: 0.2mm;
        }

        .company-name {
            font-size: 7px;
            font-weight: bold;
            color: #000;
        }

        .company-details {
            font-size: 5px;
            color: #333;
            line-height: 1.1;
        }

        .right-header {
            text-align: right;
            background: #f0f0f0;
            padding: 0.5mm 1.5mm;
            border: 1px solid #000;
        }

        .order-title {
            font-size: 7px;
            font-weight: bold;
            color: #000;
        }

        .order-number {
            font-size: 9px;
            font-weight: bold;
            color: #000;
        }

        .order-date {
            font-size: 5px;
            color: #333;
        }

        /* SECCIÓN CLIENTE COMPACTA */
        .client-section {
            background: white;
            padding: 0.8mm 1.5mm;
            margin-bottom: 0.8mm;
            border: 1px solid #000;
        }

        .section-title {
            font-size: 6px;
            font-weight: bold;
            color: #000;
            margin-bottom: 0.5mm;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 0.3mm;
        }

        .client-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5mm 2mm;
        }

        .info-field {
            display: flex;
            align-items: center;
            gap: 0.5mm;
        }

        .info-label {
            font-weight: bold;
            font-size: 6px;
            color: #000;
            min-width: 16mm;
        }

        .info-value {
            flex: 1;
            font-size: 6px;
            color: #000;
            padding: 0.3mm 0.8mm;
            background: white;
            border-bottom: 1px solid #000;
        }

        /* GRID ÚNICO PARA PROGRAMACIÓN Y SERVICIOS */
        .combined-section {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 1.5mm;
            margin-bottom: 0.8mm;
        }

        .schedule-box {
            background: #f5f5f5;
            padding: 0.8mm 1.5mm;
            border: 1px solid #000;
        }

        .schedule-box .section-title {
            font-size: 6px;
            margin-bottom: 0.3mm;
        }

        .schedule-value {
            text-align: center;
            font-weight: bold;
            font-size: 7px;
            background: white;
            padding: 0.5mm;
            border: 1px solid #000;
            margin-top: 0.5mm;
        }

        /* SERVICIOS INLINE */
        .services-box {
            background: white;
            padding: 0.8mm 1.5mm;
            border: 1px solid #000;
        }

        .services-inline {
            display: flex;
            flex-wrap: wrap;
            gap: 1mm 2mm;
            margin-top: 0.5mm;
        }

        .service-item {
            display: flex;
            align-items: center;
            gap: 0.5mm;
            font-size: 6px;
        }

        .service-label {
            font-weight: bold;
        }

        .service-value {
            padding: 0.3mm 1mm;
            border-bottom: 1px solid #000;
            min-width: 15mm;
        }

        /* OBSERVACIONES MÁS PEQUEÑAS */
        .observations-section {
            margin-bottom: 0.8mm;
        }

        .observations-box {
            background: white;
            border: 1px solid #000;
            padding: 0.8mm 1mm;
            min-height: 6mm;
            max-height: 8mm;
            font-size: 5.5px;
            line-height: 1.2;
            overflow: hidden;
        }

        /* FIRMAS COMPACTAS */
        .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2mm;
            margin-top: 1mm;
        }

        .signature-block {
            text-align: center;
            padding: 0.5mm;
            background: white;
            border: 1px solid #000;
        }

        .signature-line {
            border-top: 1.5px solid #000;
            margin-bottom: 0.5mm;
            height: 7mm;
        }

        .signature-label {
            font-size: 6px;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
        }

        .signature-sublabel {
            font-size: 5px;
            color: #333;
            margin-top: 0.3mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        @page {
            size: 216mm 93mm;
            margin: 0;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .psi-container {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="psi-container">
        <!-- HEADER -->
        <div class="header">
            <div class="left-header">
                <div class="logo-section">
                    ${!logoBase64 ? '<span style="font-size: 5px; color: #0056b3; font-weight: bold;">PSI</span>' : ''}
                </div>
                <div class="company-info">
                    <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES S.A.S.</div>
                    <div class="company-details">
                        NIT: 901.582.657-3 | Registro TIC No. 96006732 | WhatsApp: 318 455 0936
                    </div>
                </div>
            </div>

            <div class="right-header">
                <div class="order-title">ORDEN DE SERVICIO</div>
                <div class="order-number">No. ${String(instalacion.id).padStart(6, '0')}</div>
                <div class="order-date">
                    ${instalacion.fecha_programada ? new Date(instalacion.fecha_programada).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }) : ''} ${instalacion.hora_programada || ''}
                </div>
            </div>
        </div>

        <!-- INFORMACIÓN DEL CLIENTE -->
        <div class="client-section">
            <div class="section-title">Cliente</div>
            <div class="client-grid">
                <div class="info-field">
                    <span class="info-label">Nombre:</span>
                    <span class="info-value">${instalacion.cliente_nombre || ''}</span>
                </div>
                <div class="info-field">
                    <span class="info-label">Identificación:</span>
                    <span class="info-value">${instalacion.cliente_identificacion || ''}</span>
                </div>
                <div class="info-field">
                    <span class="info-label">Dirección:</span>
                    <span class="info-value">${instalacion.direccion_instalacion || instalacion.cliente_direccion || ''}</span>
                </div>
                <div class="info-field">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${instalacion.telefono_contacto || instalacion.cliente_telefono || ''}</span>
                </div>
            </div>
        </div>

        <!-- PROGRAMACIÓN Y SERVICIOS COMBINADOS -->
        <div class="combined-section">
            <div>
                <div class="schedule-box">
                    <div class="section-title">Programación</div>
                    <div class="schedule-value">
                        ${instalacion.fecha_programada ? new Date(instalacion.fecha_programada).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short'
                        }) : ''}
                    </div>
                    <div class="schedule-value" style="margin-top: 0.5mm; font-size: 8px;">
                        ${instalacion.hora_programada || ''}
                    </div>
                </div>
            </div>

            <div class="services-box">
                <div class="section-title">Servicios a Instalar</div>
                <div class="services-inline">
                    <div class="service-item">
                        <span class="service-label">Internet:</span>
                        <span class="service-value">${servicioDescripcion}</span>
                    </div>
                    <div class="service-item">
                        <span class="service-label">TV:</span>
                        <span class="service-value"></span>
                    </div>
                    <div class="service-item">
                        <span class="service-label">Tel:</span>
                        <span class="service-value"></span>
                    </div>
                    <div class="service-item">
                        <span class="service-label">Poste:</span>
                        <span class="service-value"></span>
                    </div>
                    <div class="service-item">
                        <span class="service-label">Amarre:</span>
                        <span class="service-value"></span>
                    </div>
                    <div class="service-item">
                        <span class="service-label">Instalador:</span>
                        <span class="service-value" style="font-weight: bold;">${instalacion.instalador_nombre_completo || 'Sin asignar'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- OBSERVACIONES -->
        <div class="observations-section">
            <div class="section-title">Observaciones</div>
            <div class="observations-box">
                ${instalacion.observaciones || 'Sin observaciones adicionales'}
            </div>
        </div>

        <!-- FIRMAS COMPACTAS -->
        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Firma Cliente</div>
                <div class="signature-sublabel">${instalacion.cliente_nombre || ''}</div>
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Firma Instalador</div>
                <div class="signature-sublabel">${instalacion.instalador_nombre_completo || 'Por asignar'}</div>
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Completado</div>
                <div class="signature-sublabel">Fecha y Hora</div>
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
            ],
            executablePath: '/usr/bin/google-chrome',
        });

        const page = await browser.newPage();

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Configuración PDF para formato PSI - 1/3 de carta
        const pdfBuffer = await page.pdf({
            width: '216mm',  // Ancho carta
            height: '93mm',  // 1/3 de la altura carta (279mm/3)
            margin: {
                top: '2mm',
                right: '2mm',
                bottom: '2mm',
                left: '2mm'
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
        console.error('Stack completo:', error.stack);

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
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
            });
        }
    }
});
/**
 * 🆕 MOVIDA AQUÍ: Iniciar instalación
 * PUT /api/instalaciones/:id/iniciar
 */
router.put('/:id/iniciar', upload.single('foto_antes'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🚀 Iniciando instalación ${id}`);

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

    // Verificar permisos
    if (req.user.rol !== 'administrador' && req.user.rol !== 'supervisor') {
      if (instalacion.instalador_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para modificar esta instalación'
        });
      }
    }

    // Preparar datos de actualización
    const horaInicio = new Date().toTimeString().split(' ')[0];
    let fotosArray = [];

    // Si ya hay fotos, parsearlas
    if (instalacion.fotos_instalacion) {
      try {
        fotosArray = JSON.parse(instalacion.fotos_instalacion);
      } catch (e) {
        fotosArray = [];
      }
    }

    // Agregar nueva foto si se subió
    if (req.file) {
      fotosArray.push({
        url: `/uploads/instalaciones/${req.file.filename}`,
        descripcion: 'Foto antes de la instalación',
        fecha: new Date().toISOString(),
        tipo: 'antes'
      });
    }

    // Actualizar instalación
    await Database.query(
      `UPDATE instalaciones 
       SET estado = 'en_proceso',
           hora_inicio = ?,
           fotos_instalacion = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [horaInicio, JSON.stringify(fotosArray), id]
    );

    res.json({
      success: true,
      message: 'Instalación iniciada correctamente',
      data: {
        hora_inicio: horaInicio,
        foto_subida: !!req.file
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando instalación:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error iniciando instalación'
    });
  }
});

/**
 * 🆕 MOVIDA AQUÍ: Actualizar progreso de instalación
 * PUT /api/instalaciones/:id/actualizar
 */
router.put('/:id/actualizar', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos_instalados, observaciones, estado, motivo_cancelacion } = req.body;

    console.log(`💾 Actualizando instalación ${id}`);

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

    // Preparar datos de actualización
    const updateFields = [];
    const updateValues = [];

    if (equipos_instalados !== undefined) {
      updateFields.push('equipos_instalados = ?');
      updateValues.push(JSON.stringify(equipos_instalados));
    }

    if (observaciones !== undefined) {
      updateFields.push('observaciones = ?');
      updateValues.push(observaciones);
    }

    if (estado) {
      updateFields.push('estado = ?');
      updateValues.push(estado);
    }

    if (motivo_cancelacion) {
      updateFields.push('motivo_cancelacion = ?');
      updateValues.push(motivo_cancelacion);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Ejecutar actualización
    await Database.query(
      `UPDATE instalaciones SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Instalación actualizada correctamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando instalación:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error actualizando instalación'
    });
  }
});

/**
 * 🆕 MOVIDA AQUÍ: Completar instalación
 * PUT /api/instalaciones/:id/completar
 */
router.put('/:id/completar', upload.single('foto_despues'), async (req, res) => {
  try {
    const { id } = req.params;
    const { equipos_instalados, observaciones, estado } = req.body;

    console.log(`✅ Completando instalación ${id}`);

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

    const horaFin = new Date().toTimeString().split(' ')[0];
    const fechaRealizada = new Date().toISOString().split('T')[0];
    let fotosArray = [];

    // Si ya hay fotos, parsearlas
    if (instalacion.fotos_instalacion) {
      try {
        fotosArray = JSON.parse(instalacion.fotos_instalacion);
      } catch (e) {
        fotosArray = [];
      }
    }

    // Agregar foto después si se subió
    if (req.file) {
      fotosArray.push({
        url: `/uploads/instalaciones/${req.file.filename}`,
        descripcion: 'Foto después de la instalación',
        fecha: new Date().toISOString(),
        tipo: 'despues'
      });
    }

    // Actualizar instalación
    await Database.query(
      `UPDATE instalaciones 
       SET estado = ?,
           hora_fin = ?,
           fecha_realizada = ?,
           equipos_instalados = ?,
           observaciones = ?,
           fotos_instalacion = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        estado || 'completada',
        horaFin,
        fechaRealizada,
        equipos_instalados,
        observaciones,
        JSON.stringify(fotosArray),
        id
      ]
    );

    // Si hay equipos instalados, actualizar inventario
    if (equipos_instalados) {
      const equipos = JSON.parse(equipos_instalados);
      
      for (const equipo of equipos) {
        // Actualizar estado del equipo en inventario
        await Database.query(
          `UPDATE inventario_equipos 
           SET estado = 'instalado',
               instalador_id = ?,
               fecha_asignacion = CURRENT_TIMESTAMP,
               ubicacion_actual = ?,
               notas_instalador = ?
           WHERE id = ?`,
          [
            instalacion.instalador_id,
            instalacion.direccion_instalacion,
            equipo.observaciones || '',
            equipo.equipo_id
          ]
        );

        // Registrar en historial
        await Database.query(
          `INSERT INTO inventario_historial 
           (equipo_id, tipo_movimiento, instalador_id, cliente_id, instalacion_id, observaciones)
           VALUES (?, 'instalacion', ?, ?, ?, ?)`,
          [
            equipo.equipo_id,
            instalacion.instalador_id,
            instalacion.cliente_id,
            id,
            `Equipo instalado: ${equipo.observaciones || ''}`
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'Instalación completada correctamente',
      data: {
        hora_fin: horaFin,
        fecha_realizada: fechaRealizada,
        foto_subida: !!req.file
      }
    });

  } catch (error) {
    console.error('❌ Error completando instalación:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completando instalación'
    });
  }
});
/**
 * 🆕 CORREGIDO: Asignar instalador (DEBE IR ANTES DE /:id)
 */
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
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

            // Verificar instalación
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

            // Verificar instalador
            const [instalador] = await Database.query(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND rol IN ("instalador", "supervisor") AND activo = 1',
                [instalador_id]
            );

            if (!instalador) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalador no encontrado o no tiene permisos'
                });
            }

            // Actualizar
            await Database.query(
                'UPDATE instalaciones SET instalador_id = ?, updated_at = NOW() WHERE id = ?',
                [instalador_id, id]
            );

            // Obtener actualizada
            const [instalacionActualizada] = await Database.query(`
                SELECT i.*, c.nombre as cliente_nombre, u.nombre as instalador_nombre_completo
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
                WHERE i.id = ?
            `, [id]);

            // Crear notificación para el instalador
            const Notificacion = require('../models/notificacion');
            try {
                await Notificacion.notificarNuevaInstalacion(
                    id,
                    instalacionActualizada.cliente_nombre,
                    instalador_id
                );
                console.log('✅ Notificación creada para instalador:', instalador_id);
            } catch (notifError) {
                console.error('⚠️ Error creando notificación:', notifError);
                // No fallar la petición si falla la notificación
            }

            res.json({
                success: true,
                message: 'Instalador asignado exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error asignando instalador:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * ARREGLADO: Cambiar estado de instalación
 */
router.patch('/:id/cambiar-estado',
    requireRole('administrador', 'supervisor', 'instalador'),  
    async (req, res) => {
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
            'en_proceso': ['instalador'],
            'completada': ['instalador'],
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
 * ⚠️ ESTA DEBE IR DESPUÉS DE TODAS LAS RUTAS ESPECÍFICAS
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
router.put('/:id',
    requireRole('administrador', 'supervisor'),  // ✅ AGREGAR ESTO
    InstalacionesController.actualizar
);

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

module.exports = router;