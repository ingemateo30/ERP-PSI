// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');
const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
const puppeteer = require('puppeteer');
const FirmaPDFService = require('../services/FirmaPDFService');
const fs = require('fs');
const path = require('path');


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

            console.log(`📄 Generando PDF del contrato ID: ${id}`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            // CORRECCIÓN: Usar Database.query directamente con campos correctos
            const contratos = await Database.query(`
                SELECT 
                    c.*,
                    cl.nombre as cliente_nombre,
                    cl.identificacion as cliente_identificacion,
                    cl.telefono as cliente_telefono,
                    cl.correo as cliente_email,
                    cl.direccion as cliente_direccion,
                    cl.barrio as cliente_barrio,
                    cl.estrato as cliente_estrato,
                    sc.plan_id,
                    ps.nombre as servicio_nombre,
                    ps.tipo as servicio_tipo,
                    ps.precio as servicio_precio,
                    ps.descripcion as servicio_descripcion,
                    ps.velocidad_bajada,
                    ps.velocidad_subida,
                    ps.canales_tv
                FROM contratos c
                INNER JOIN clientes cl ON c.cliente_id = cl.id
                LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
                LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
                WHERE c.id = ? AND c.estado = 'activo'
                LIMIT 1
            `, [id]);

            if (!contratos || contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            const contratoData = contratos[0];
            console.log(`✅ Contrato encontrado: ${contratoData.numero_contrato}`);

            let pdfBuffer;

            // Verificar si ya existe PDF generado
            if (contratoData.documento_pdf_path && fs.existsSync(contratoData.documento_pdf_path)) {
                console.log('📁 Usando PDF existente:', contratoData.documento_pdf_path);
                pdfBuffer = fs.readFileSync(contratoData.documento_pdf_path);
            } else {
                console.log('🔨 Generando nuevo PDF...');

                // CORRECCIÓN: Obtener configuración de empresa
                const empresaConfig = await Database.query(`
                    SELECT * FROM configuracion_empresa LIMIT 1
                `);

                if (!empresaConfig || empresaConfig.length === 0) {
                    return res.status(500).json({
                        success: false,
                        message: 'Configuración de empresa no encontrada'
                    });
                }

                const empresa = empresaConfig[0];

                // Generar HTML del contrato
                const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
                const htmlContent = ContratoPDFGenerator.generarHTML(contratoData, empresa);

                // Generar PDF con Puppeteer
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });

                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

                pdfBuffer = await page.pdf({
                    format: 'A4',
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

                try {
                    console.log('📁 Creando directorio de uploads...');
                    console.log('🔍 Directorio actual:', process.cwd());

                    // Usar __dirname para una ruta más confiable
                    const uploadsDir = path.join(__dirname, '..', 'uploads', 'contratos');
                    console.log('🔍 Directorio de uploads:', uploadsDir);

                    // Crear directorio si no existe
                    if (!fs.existsSync(uploadsDir)) {
                        console.log('📂 Creando directorio:', uploadsDir);
                        fs.mkdirSync(uploadsDir, { recursive: true });
                        console.log('✅ Directorio creado exitosamente');
                    } else {
                        console.log('📂 Directorio ya existe');
                    }

                    const nombrePDF = `contrato_${contratoData.numero_contrato}_original.pdf`;
                    const rutaPDF = path.join(uploadsDir, nombrePDF);

                    console.log('💾 Guardando PDF en:', rutaPDF);

                    // Guardar archivo PDF
                    fs.writeFileSync(rutaPDF, pdfBuffer);
                    console.log('✅ PDF guardado exitosamente');

                    // Actualizar ruta en base de datos usando Database.query
                    await Database.query(`
        UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
    `, [rutaPDF, id]);

                    console.log('💾 Ruta actualizada en base de datos');

                } catch (dirError) {
                    console.error('❌ Error creando directorio o guardando archivo:', dirError);

                    // Si falla, continuar sin guardar el archivo pero sí servir el PDF
                    console.log('⚠️ Continuando sin guardar archivo físico...');
                }

                // CORRECCIÓN: Guardar PDF generado para uso futuro
                const uploadsDir = path.join(process.cwd(), 'uploads', 'contratos');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const nombrePDF = `contrato_${contratoData.numero_contrato}_original.pdf`;
                const rutaPDF = path.join(uploadsDir, nombrePDF);

                fs.writeFileSync(rutaPDF, pdfBuffer);

                // Actualizar ruta en base de datos usando Database.query
                await Database.query(`
                    UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
                `, [rutaPDF, id]);

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

            const conexion = await Database.query();

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