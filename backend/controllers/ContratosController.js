// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');
const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
const puppeteer = require('puppeteer');

class ContratosController {

    static async obtenerTodos(req, res) {
        try {
            console.log('📋 GET /contratos - Obteniendo contratos');

            const {
                page = 1,
                limit = 10,
                cliente_id,
                estado = '',
                tipo_contrato = '',
                search = ''
            } = req.query;

            const offset = (page - 1) * limit;

            // ✅ CONSULTA MEJORADA CON JOINS PARA TRAER LOS DATOS DEL PLAN
            let query = `
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.identificacion as cliente_identificacion,
        cl.telefono as cliente_telefono,
        cl.correo as cliente_email,
        cl.direccion as cliente_direccion,
        cl.estrato as cliente_estrato,
        ps.nombre as plan_nombre,
        ps.precio as plan_precio,
        ps.tipo as plan_tipo,
        ps.velocidad_bajada,
        ps.velocidad_subida,
        ps.canales_tv,
        ps.descripcion as plan_descripcion
      FROM contratos c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE 1=1
    `;

            const params = [];

            // Aplicar filtros...
            if (cliente_id) {
                query += ' AND c.cliente_id = ?';
                params.push(cliente_id);
            }

            if (estado) {
                query += ' AND c.estado = ?';
                params.push(estado);
            }

            if (tipo_contrato) {
                query += ' AND c.tipo_contrato = ?';
                params.push(tipo_contrato);
            }

            if (search) {
                query += ' AND (c.numero_contrato LIKE ? OR cl.nombre LIKE ? OR cl.identificacion LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Contar total
            const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
            const [countResult] = await Database.query(countQuery, params);
            const total = countResult[0]?.total || 0;

            // Agregar paginación
            query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const contratos = await Database.query(query, params);

            console.log(`✅ Encontrados ${contratos.length} contratos con datos de planes`);

            res.json({
                success: true,
                data: {
                    contratos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error obteniendo contratos:', error);
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

            const query = `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          cl.direccion as cliente_direccion,
          cl.estrato as cliente_estrato
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.id = ?
      `;

            const contratos = await Database.query(query, [id]);

            if (contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            res.json({
                success: true,
                data: contratos[0]
            });

        } catch (error) {
            console.error('❌ Error obteniendo contrato:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================



    static async generarPDF(req, res) {
        try {
            const { id } = req.params;
            console.log(`📄 Generando PDF para contrato ID: ${id}`);

            // Consulta FINAL con TODOS los campos correctos
            const query = `
      SELECT 
        -- Datos del contrato
        c.id,
        c.numero_contrato,
        c.cliente_id,
        c.servicio_id,
        c.tipo_contrato,
        c.tipo_permanencia,
        c.permanencia_meses,
        c.costo_instalacion,
        c.fecha_generacion,
        c.fecha_inicio,
        c.fecha_fin,
        c.fecha_vencimiento_permanencia,
        c.estado,
        c.observaciones,
        c.firmado_cliente,
        c.fecha_firma,
        
        -- Datos del cliente (SOLO CAMPOS QUE EXISTEN)
        cl.identificacion,
        cl.tipo_documento,
        cl.nombre as cliente_nombre,
        cl.direccion as cliente_direccion,
        cl.estrato as cliente_estrato,
        cl.barrio,
        cl.telefono as cliente_telefono,
        cl.telefono_2,
        cl.correo as cliente_email,
        cl.fecha_registro,
        cl.fecha_hasta,
        cl.estado as cliente_estado,
        cl.mac_address,
        cl.ip_asignada,
        cl.tap,
        cl.poste,
        cl.contrato as cliente_contrato,
        cl.ruta,
        cl.requiere_reconexion,
        cl.codigo_usuario,
        cl.observaciones as cliente_observaciones,
        
        -- Datos geográficos
        ci.nombre as ciudad_nombre,
        d.nombre as departamento_nombre,
        
        -- Datos del sector
        s.nombre as sector_nombre,
        s.codigo as sector_codigo,
        
        -- Datos del servicio del cliente
        sc.plan_id,
        sc.fecha_activacion,
        sc.fecha_suspension,
        sc.estado as servicio_estado,
        sc.precio_personalizado,
        sc.observaciones as servicio_observaciones,
        
             ps.codigo as plan_codigo,
ps.nombre as plan_nombre,
ps.tipo as plan_tipo,
ps.precio as plan_precio,
ps.velocidad_subida,
ps.velocidad_bajada,
ps.canales_tv,
ps.descripcion as plan_descripcion,
ps.aplica_iva,
ps.activo as plan_activo,
ps.created_at as plan_created_at,
ps.updated_at as plan_updated_at,
        
        -- Configuración de empresa
        ce.empresa_nombre,
        ce.empresa_nit,
        ce.empresa_direccion,
        ce.empresa_ciudad,
        ce.empresa_departamento,
        ce.empresa_telefono,
        ce.empresa_email,
        ce.vigilado,
        ce.vigilado_internet,
        ce.porcentaje_iva,
        ce.valor_reconexion,
        ce.dias_mora_corte
        
      FROM contratos c
      INNER JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN ciudades ci ON cl.ciudad_id = ci.id
      LEFT JOIN departamentos d ON ci.departamento_id = d.id
      LEFT JOIN sectores s ON cl.sector_id = s.id
      LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      CROSS JOIN configuracion_empresa ce
      WHERE c.id = ? AND cl.estado = 'activo'
    `;

            const contratos = await Database.query(query, [id]);

            if (contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado o cliente inactivo'
                });
            }

            const row = contratos[0];

            console.log('📋 Datos obtenidos de la BD:', {
                contrato: row.numero_contrato,
                cliente: row.cliente_nombre,
                plan: row.plan_nombre,
                identificacion: row.identificacion
            });

            // Estructurar datos para el ContratoPDFGenerator existente
            const contratoData = {
                id: row.id,
                numero_contrato: row.numero_contrato,
                cliente_id: row.cliente_id,
                servicio_id: row.servicio_id,
                tipo_contrato: row.tipo_contrato,
                tipo_permanencia: row.tipo_permanencia,
                permanencia_meses: row.permanencia_meses,
                costo_instalacion: row.costo_instalacion,
                fecha_generacion: row.fecha_generacion,
                fecha_inicio: row.fecha_inicio,
                fecha_fin: row.fecha_fin,
                fecha_vencimiento_permanencia: row.fecha_vencimiento_permanencia,
                estado: row.estado,
                observaciones: row.observaciones,
                firmado_cliente: row.firmado_cliente,
                fecha_firma: row.fecha_firma,

                // Datos del cliente adaptados para el PDF
                cliente_nombre: row.cliente_nombre,
                cliente_identificacion: `${row.tipo_documento || 'CC'} ${row.identificacion}`,
                cliente_email: row.cliente_email || '',
                cliente_telefono: row.cliente_telefono || '',
                cliente_direccion: row.cliente_direccion,
                cliente_estrato: row.cliente_estrato || '',

                // Ubicación
                ciudad_nombre: row.ciudad_nombre || 'San Gil',
                departamento_nombre: row.departamento_nombre || 'Santander',

                // Sector
                sector_nombre: row.sector_nombre,
                sector_codigo: row.sector_codigo,

                // Servicio
                servicio_estado: row.servicio_estado,
                precio_personalizado: row.precio_personalizado,

                // Plan/Servicio - usar precio personalizado si existe, sino el del plan
                plan_codigo: row.plan_codigo,
                plan_nombre: row.plan_nombre || 'Plan de Servicio',
                plan_tipo: row.plan_tipo || 'internet',
                plan_precio: row.precio_personalizado || row.plan_precio || 0,
                precio_internet: row.precio_internet,
                precio_television: row.precio_television,
                plan_precio_instalacion: row.precio_instalacion || row.costo_instalacion,
                velocidad_subida: row.velocidad_subida,
                velocidad_bajada: row.velocidad_bajada,
                canales_tv: row.canales_tv,
                plan_descripcion: row.plan_descripcion,
                plan_permanencia: row.plan_permanencia,
                tecnologia: row.tecnologia,
                plan_segmento: row.plan_segmento,
                aplica_iva: row.aplica_iva,
                requiere_instalacion: row.requiere_instalacion,
                descuento_combo: row.descuento_combo
            };

            const empresaData = {
                empresa_nombre: row.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
                empresa_nit: row.empresa_nit || '901.582.657-3',
                empresa_direccion: row.empresa_direccion || 'Carrera 9 No. 9-94',
                empresa_ciudad: row.empresa_ciudad || 'San Gil',
                empresa_departamento: row.empresa_departamento || 'SANTANDER',
                empresa_telefono: row.empresa_telefono || '3184550936',
                empresa_email: row.empresa_email || 'facturacion@psi.net.co',
                vigilado: row.vigilado || 'Registro único de TIC No.',
                vigilado_internet: row.vigilado_internet || 'Registro único de TIC No.',
                porcentaje_iva: row.porcentaje_iva || 19.00,
                valor_reconexion: row.valor_reconexion,
                dias_mora_corte: row.dias_mora_corte
            };

            console.log('📄 Generando HTML del contrato...');

            // Generar HTML usando tu ContratoPDFGenerator existente
            const htmlContent = ContratoPDFGenerator.generarHTML(contratoData, empresaData);

            console.log('🖨️ Iniciando conversión a PDF...');

            // Configurar Puppeteer para generar PDF
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            const page = await browser.newPage();

            // Configurar el contenido HTML
            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Generar PDF con configuración específica
            const pdfBuffer = await page.pdf({
                format: 'Letter',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                },
                preferCSSPageSize: true,
                displayHeaderFooter: false
            });

            await browser.close();

            console.log(`✅ PDF generado exitosamente (${pdfBuffer.length} bytes)`);

            // Configurar headers para descarga del PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="contrato_${contratoData.numero_contrato}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // Enviar el PDF
            res.send(pdfBuffer);

            console.log(`📎 PDF del contrato ${contratoData.numero_contrato} enviado al cliente`);

        } catch (error) {
            console.error('❌ Error generando PDF del contrato:', error);

            res.status(500).json({
                success: false,
                message: 'Error generando PDF del contrato',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error.stack,
                    sql_error: error.sqlMessage || 'No SQL error'
                } : undefined
            });
        }
    }

    static async actualizarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado, observaciones } = req.body;

            await Database.query(
                'UPDATE contratos SET estado = ?, observaciones = ?, updated_at = NOW() WHERE id = ?',
                [estado, observaciones, id]
            );

            res.json({
                success: true,
                message: 'Estado actualizado exitosamente'
            });

        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async obtenerEstadisticas(req, res) {
        try {
            const estadisticas = await Database.query(`
        SELECT 
          COUNT(*) as total_contratos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as contratos_activos,
          SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as contratos_vencidos,
          SUM(CASE WHEN estado = 'terminado' THEN 1 ELSE 0 END) as contratos_terminados,
          SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) as contratos_anulados,
          SUM(CASE WHEN firmado_cliente = 1 THEN 1 ELSE 0 END) as contratos_firmados
        FROM contratos
      `);

            res.json({
                success: true,
                data: estadisticas[0]
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

module.exports = ContratosController;