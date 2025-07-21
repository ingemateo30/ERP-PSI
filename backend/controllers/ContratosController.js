// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');
const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
const puppeteer = require('puppeteer');
const FirmaPDFService = require('../services/FirmaPDFService');

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



    /**
     * @route GET /api/v1/contratos/:id/pdf
     * @desc Generar y servir PDF del contrato - CORREGIDO
     */
    static async generarPDF(req, res) {
        try {
            const { id } = req.params;
            const { token } = req.query;

            console.log(`📄 Generando PDF del contrato ID: ${id}`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            // CORRECCIÓN: Obtener datos del contrato con JOIN
            const conexion = await db.getConnection();

            const [contratos] = await conexion.execute(`
                SELECT 
                    c.*,
                    cl.nombre as cliente_nombre,
                    cl.identificacion as cliente_identificacion,
                    cl.telefono as cliente_telefono,
                    cl.correo as cliente_email,
                    cl.direccion as cliente_direccion,
                    s.nombre as servicio_nombre,
                    s.descripcion as servicio_descripcion,
                    s.precio as servicio_precio
                FROM contratos c
                INNER JOIN clientes cl ON c.cliente_id = cl.id
                LEFT JOIN servicios s ON c.servicio_id = s.id
                WHERE c.id = ? AND c.activo = 1
            `, [id]);

            if (contratos.length === 0) {
                conexion.release();
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            const contratoData = contratos[0];

            // CORRECCIÓN: Obtener datos de la empresa
            const [empresaResult] = await conexion.execute(`
                SELECT * FROM configuracion_empresa WHERE id = 1
            `);

            conexion.release();

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

            // CORRECCIÓN: Verificar si ya existe PDF generado
            let pdfBuffer;
            const rutaPDFExistente = contratoData.documento_pdf_path;

            if (rutaPDFExistente && fs.existsSync(rutaPDFExistente)) {
                console.log('📁 Usando PDF existente:', rutaPDFExistente);
                pdfBuffer = fs.readFileSync(rutaPDFExistente);
            } else {
                console.log('🔨 Generando nuevo PDF...');

                // Generar HTML usando ContratoPDFGenerator
                const htmlContent = ContratoPDFGenerator.generarHTML(contratoData, empresaData);

                console.log('🖨️ Iniciando conversión a PDF...');

                // CORRECCIÓN: Configurar Puppeteer para servidor
                const browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-gpu',
                        '--disable-software-rasterizer'
                    ]
                });

                const page = await browser.newPage();

                // Configurar el contenido HTML
                await page.setContent(htmlContent, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                // Generar PDF
                pdfBuffer = await page.pdf({
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

                // CORRECCIÓN: Guardar PDF generado para uso futuro
                const uploadsDir = path.join(process.cwd(), 'uploads', 'contratos');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const nombrePDF = `contrato_${contratoData.numero_contrato}_original.pdf`;
                const rutaPDF = path.join(uploadsDir, nombrePDF);

                fs.writeFileSync(rutaPDF, pdfBuffer);

                // Actualizar ruta en base de datos
                const conexionUpdate = await db.getConnection();
                await conexionUpdate.execute(`
                    UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
                `, [rutaPDF, id]);
                conexionUpdate.release();

                console.log('💾 PDF guardado en:', rutaPDF);
            }

            console.log(`✅ PDF generado exitosamente (${pdfBuffer.length} bytes)`);

            // CORRECCIÓN: Headers específicos para PDF
            const filename = `contrato_${contratoData.numero_contrato || id}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
            res.setHeader('Accept-Ranges', 'bytes');

            // IMPORTANTE: Enviar directamente el buffer
            res.end(pdfBuffer, 'binary');

            console.log(`📎 PDF del contrato servido: ${filename}`);

        } catch (error) {
            console.error('❌ Error generando PDF del contrato:', error);

            // CORRECCIÓN: No enviar JSON si headers ya están enviados
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error generando PDF del contrato',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
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


    /**
     * @route GET /api/v1/contratos/:id/abrir-firma
     * @desc Obtener contrato para proceso de firma - CORREGIDO
     */
    static async abrirParaFirma(req, res) {
        try {
            const { id } = req.params;

            console.log(`📋 Abriendo contrato ${id} para firma`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            // CORRECCIÓN: Usar el servicio especializado
            const datosVisor = await FirmaPDFService.abrirContratoParaFirma(id);

            const yaFirmado = Boolean(datosVisor.firmado);
            datosVisor.estado_firma = yaFirmado ? 'Este contrato ya ha sido firmado' : 'Listo para firma digital';

            res.json({
                success: true,
                message: yaFirmado ? 'Contrato ya firmado' : 'Contrato listo para firma',
                data: datosVisor
            });

        } catch (error) {
            console.error('❌ Error abriendo contrato para firma:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * @route POST /api/v1/contratos/:id/procesar-firma
     * @desc Procesar firma desde VisorFirmaPDF (campos REALES de la BD)
     */
    /**
     * @route POST /api/v1/contratos/:id/procesar-firma
     * @desc Procesar firma desde VisorFirmaPDF (campos REALES de la BD)
     */
    /**
       * @route POST /api/v1/contratos/:id/procesar-firma
       * @desc Procesar firma digital y guardar PDF firmado - CORREGIDO
       */
    static async procesarFirmaDigital(req, res) {
        try {
            const { id } = req.params;
            const datosSignature = req.body;

            console.log(`🖊️ Procesando firma digital del contrato ${id}`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            // Validar datos de firma
            const {
                signature_base64,
                firmado_por,
                cedula_firmante,
                tipo_firma = 'digital',
                observaciones = ''
            } = datosSignature;

            if (!signature_base64 || !firmado_por || !cedula_firmante) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de firma incompletos: signature_base64, firmado_por y cedula_firmante son requeridos'
                });
            }

            // CORRECCIÓN: Usar el servicio especializado
            const resultado = await FirmaPDFService.procesarFirmaYGuardarPDF(id, datosSignature);

            console.log(`✅ Contrato ${id} firmado exitosamente`);

            res.json({
                success: true,
                message: 'Firma procesada exitosamente',
                data: resultado
            });

        } catch (error) {
            console.error('❌ Error procesando firma digital:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando la firma',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    /**
    * @route GET /api/v1/contratos/:id/descargar-pdf
    * @desc Descargar PDF firmado del contrato
    */
    static async descargarPDF(req, res) {
        try {
            const { id } = req.params;

            console.log(`⬇️ Descargando PDF del contrato ${id}`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            const datosDescarga = await FirmaPDFService.obtenerURLDescargaPDF(id);

            if (!fs.existsSync(datosDescarga.ruta_archivo)) {
                return res.status(404).json({
                    success: false,
                    message: 'Archivo PDF no encontrado'
                });
            }

            const pdfBuffer = fs.readFileSync(datosDescarga.ruta_archivo);
            const filename = `contrato_${datosDescarga.numero_contrato}${datosDescarga.firmado ? '_firmado' : ''}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.end(pdfBuffer, 'binary');

            console.log(`✅ PDF descargado: ${filename}`);

        } catch (error) {
            console.error('❌ Error descargando PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error descargando PDF',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    /**
    * @route GET /api/v1/contratos/:id/verificar-pdf
    * @desc Verificar disponibilidad del PDF
    */
    static async verificarPDF(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            const conexion = await db.getConnection();

            const [contratos] = await conexion.execute(`
                SELECT documento_pdf_path, numero_contrato, firmado_cliente
                FROM contratos WHERE id = ? AND activo = 1
            `, [id]);

            conexion.release();

            if (contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            const contrato = contratos[0];
            const pdfExiste = contrato.documento_pdf_path && fs.existsSync(contrato.documento_pdf_path);

            let tamanoArchivo = 0;
            if (pdfExiste) {
                const stats = fs.statSync(contrato.documento_pdf_path);
                tamanoArchivo = stats.size;
            }

            res.json({
                success: true,
                data: {
                    pdf_disponible: pdfExiste,
                    numero_contrato: contrato.numero_contrato,
                    firmado: Boolean(contrato.firmado_cliente),
                    ruta_archivo: contrato.documento_pdf_path,
                    tamano_bytes: tamanoArchivo,
                    tamano_mb: (tamanoArchivo / (1024 * 1024)).toFixed(2)
                }
            });

        } catch (error) {
            console.error('❌ Error verificando PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error verificando PDF',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = ContratosController;