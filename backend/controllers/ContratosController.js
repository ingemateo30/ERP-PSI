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

            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
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

    static async abrirParaFirma(req, res) {
        try {
            const { id } = req.params;

            console.log(`📋 Abriendo contrato ${id} para firma digital`);

            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            const contratos = await Database.query(`
    SELECT * FROM contratos WHERE id = ?
`, [id]);

            if (!contratos) {
                console.log(`❌ Contrato ${id} no encontrado en la base de datos`);
                return res.status(404).json({
                    success: false,
                    message: `Contrato con ID ${id} no encontrado`
                });
            }

            const contrato = contratos[0];

            console.log('🔍 DEBUG - contrato completo:', contrato);
            console.log('🔍 DEBUG - contrato.cliente_id:', contrato.cliente_id);
            console.log('🔍 DEBUG - tipo cliente_id:', typeof contrato.cliente_id);
            // Ahora obtener datos del cliente por separado
            const clientesResult = await Database.query(`
            SELECT * FROM clientes WHERE id = ?
        `, [contrato.cliente_id]);

            if (clientesResult.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: `Cliente asociado al contrato no encontrado`
                });
            }

            const cliente = clientesResult[0];
            console.log(`✅ Cliente encontrado: ${cliente.nombre}`);

            // Verificar si ya está firmado
            const yaFirmado = Boolean(contrato.firmado_cliente) || Boolean(contrato.fecha_firma);
            console.log(`🔍 Estado de firma: firmado_cliente=${contrato.firmado_cliente}, fecha_firma=${contrato.fecha_firma}, yaFirmado=${yaFirmado}`);

            // Estructura de datos para VisorFirmaPDF
            const datosVisor = {
                id: contrato.id,
                numero_contrato: contrato.numero_contrato,
                fecha_inicio: contrato.fecha_inicio,
                tipo_permanencia: contrato.tipo_permanencia,
                permanencia_meses: contrato.permanencia_meses || 0,
                costo_instalacion: parseFloat(contrato.costo_instalacion) || 0,
                estado: contrato.estado,
                cliente_nombre: cliente.nombre,
                cliente_identificacion: cliente.identificacion,
                cliente_telefono: cliente.telefono,
                cliente_email: cliente.correo,
                firmado: yaFirmado,
                fecha_firma: contrato.fecha_firma,
                puede_firmar: !yaFirmado && contrato.estado === 'activo',
                mensaje_estado: yaFirmado ? 'Este contrato ya ha sido firmado' : 'Listo para firma digital'
            };

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
    static async procesarFirmaDigital(req, res) {
        let conexion;

        try {
            conexion = await db.getConnection();
            await conexion.beginTransaction();

            const { id } = req.params;
            const {
                signature_base64,
                firmado_por,
                cedula_firmante,
                tipo_firma = 'digital',
                observaciones = ''
            } = req.body;

            console.log(`🖊️ Procesando firma digital del contrato ${id}`);

            // Validaciones
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de contrato inválido'
                });
            }

            if (!signature_base64 || !firmado_por || !cedula_firmante) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de firma incompletos: signature_base64, firmado_por y cedula_firmante son requeridos'
                });
            }

            // Obtener contrato actual con campos REALES
            const [contratos] = await conexion.execute(`
        SELECT * FROM contratos WHERE id = ?
      `, [id]);

            if (contratos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contrato no encontrado'
                });
            }

            const contrato = contratos[0];

            // Verificar si ya está firmado
            if (contrato.firmado_cliente || contrato.fecha_firma) {
                return res.status(400).json({
                    success: false,
                    message: 'Este contrato ya ha sido firmado'
                });
            }

            // Verificar estado del contrato
            if (contrato.estado !== 'activo') {
                return res.status(400).json({
                    success: false,
                    message: 'Solo se pueden firmar contratos en estado activo'
                });
            }

            // Crear directorio para PDFs si no existe
            const uploadsDir = path.join(process.cwd(), 'uploads', 'contratos');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Generar nombre del archivo PDF firmado
            const nombrePDFFirmado = `contrato_${contrato.numero_contrato}_firmado_${Date.now()}.pdf`;
            const rutaPDFFirmado = path.join(uploadsDir, nombrePDFFirmado);

            // Por ahora, guardamos la firma como imagen en JSON hasta implementar PDF
            const datosFirma = {
                signature_base64: signature_base64,
                firmado_por: firmado_por,
                cedula_firmante: cedula_firmante,
                tipo_firma: tipo_firma,
                fecha_firma: new Date().toISOString(),
                observaciones_firma: observaciones
            };

            // Actualizar el contrato con los campos REALES de la BD
            const observacionesActualizadas = `${contrato.observaciones || ''}\n[FIRMA DIGITAL] Firmado por: ${firmado_por} - Cédula: ${cedula_firmante} - Fecha: ${new Date().toLocaleString()} - Tipo: ${tipo_firma}${observaciones ? ` - Obs: ${observaciones}` : ''}`;

            await conexion.execute(`
        UPDATE contratos SET
          firmado_cliente = 1,
          fecha_firma = CURDATE(),
          observaciones = ?,
          documento_pdf_path = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
                observacionesActualizadas,
                rutaPDFFirmado, // Ruta donde se guardará el PDF firmado
                id
            ]);

            // Guardar datos de la firma temporalmente en JSON hasta implementar PDF
            const datosTemporales = {
                contrato_id: id,
                datos_firma: datosFirma,
                fecha_procesamiento: new Date().toISOString()
            };

            fs.writeFileSync(
                path.join(uploadsDir, `firma_${contrato.numero_contrato}_${Date.now()}.json`),
                JSON.stringify(datosTemporales, null, 2)
            );

            await conexion.commit();

            console.log(`✅ Contrato ${contrato.numero_contrato} firmado exitosamente`);

            // Respuesta para VisorFirmaPDF
            const respuesta = {
                success: true,
                contrato_id: parseInt(id),
                numero_contrato: contrato.numero_contrato,
                firmado_por: firmado_por,
                cedula_firmante: cedula_firmante,
                fecha_firma: new Date().toISOString(),
                documento_pdf_path: rutaPDFFirmado,
                mensaje: 'Contrato firmado digitalmente y guardado exitosamente'
            };

            res.json({
                success: true,
                message: 'Firma procesada exitosamente',
                data: respuesta
            });

        } catch (error) {
            if (conexion) {
                await conexion.rollback();
            }
            console.error('❌ Error procesando firma digital:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando la firma',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            if (conexion) {
                conexion.release();
            }
        }
    }
}

module.exports = ContratosController;