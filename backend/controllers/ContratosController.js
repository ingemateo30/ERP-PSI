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

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            // Obtener datos del contrato
            const query = `
        SELECT 
          c.*,
          cl.identificacion,
          cl.tipo_documento,
          cl.nombre as cliente_nombre,
          cl.direccion as cliente_direccion,
          cl.estrato as cliente_estrato,
          cl.barrio,
          cl.telefono as cliente_telefono,
          cl.telefono_2,
          cl.correo as cliente_email,
          cl.mac_address,
          cl.ip_asignada,
          cl.tap,
          cl.poste,
          cl.ruta,
          ci.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          s.nombre as sector_nombre,
          s.codigo as sector_codigo,
          sc.plan_id,
          sc.fecha_activacion,
          sc.fecha_suspension,
          sc.estado as servicio_estado,
          p.nombre as plan_nombre,
          p.descripcion as plan_descripcion,
          p.velocidad_bajada,
          p.velocidad_subida,
          p.precio as plan_precio,
          p.canales_tv
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN ciudades ci ON cl.ciudad_id = ci.id
        LEFT JOIN departamentos d ON ci.departamento_id = d.id
        LEFT JOIN sectores s ON cl.sector_id = s.id
        LEFT JOIN servicios_cliente sc ON cl.id = sc.cliente_id
        LEFT JOIN planes_servicio p ON sc.plan_id = p.id
        WHERE c.id = ?
      `;

            const contratos = await Database.query(query, [id]);

            if (contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            const contratoData = contratos[0];
            console.log(`📋 Contrato encontrado: ${contratoData.numero_contrato}`);

            // Obtener configuración de empresa
            const empresaQuery = 'SELECT * FROM configuracion_empresa LIMIT 1';
            const empresaResult = await Database.query(empresaQuery);

            const empresaData = empresaResult.length > 0 ? empresaResult[0] : {
                empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
                empresa_nit: '901.582.657-3',
                empresa_direccion: 'VIA 40 #36-135',
                empresa_ciudad: 'San Gil',
                empresa_departamento: 'SANTANDER',
                empresa_telefono: '3184550936',
                empresa_email: 'facturacion@psi.net.co'
            };

            console.log('📄 Generando HTML del contrato...');

            // Generar HTML usando ContratoPDFGenerator
            const htmlContent = ContratoPDFGenerator.generarHTML(contratoData, empresaData);

            console.log('🖨️ Iniciando conversión a PDF...');

            // Configurar Puppeteer
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

            // Generar PDF
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

            // CORREGIDO: Headers específicos para PDF
            const filename = `contrato_${contratoData.numero_contrato || id}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            // IMPORTANTE: Enviar directamente el buffer sin conversiones
            res.end(pdfBuffer, 'binary');

            console.log(`📎 PDF del contrato enviado: ${filename}`);

        } catch (error) {
            console.error('❌ Error generando PDF del contrato:', error);

            res.status(500).json({
                success: false,
                message: 'Error generando PDF del contrato',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
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