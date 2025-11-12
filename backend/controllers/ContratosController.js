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
            search = '',
            para_firma = false 
        } = req.query;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offsetNum = (pageNum - 1) * limitNum;

        // ✅ Query mejorado - maneja servicio_id NULL y JSON arrays
        let query = `
            SELECT 
                c.*,
                cl.nombre as cliente_nombre,
                cl.identificacion as cliente_identificacion,
                cl.telefono as cliente_telefono,
                cl.correo as cliente_email,
                cl.direccion as cliente_direccion,
                cl.estrato as cliente_estrato,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        COALESCE(ps.nombre, ''), '|',
                        COALESCE(ps.precio, 0), '|',
                        COALESCE(ps.tipo, '')
                    ) SEPARATOR ';;'
                ) as servicios_info
            FROM contratos c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN servicios_cliente sc ON (
                CASE 
                    WHEN c.servicio_id IS NULL THEN FALSE
                    WHEN c.servicio_id REGEXP '^[0-9]+$' 
                    THEN sc.id = CAST(c.servicio_id AS UNSIGNED)
                    WHEN c.servicio_id LIKE '[%'
                    THEN JSON_CONTAINS(CAST(c.servicio_id AS JSON), CAST(sc.id AS JSON))
                    ELSE FALSE
                END
            )
            LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
            WHERE 1=1
        `;

        const params = [];

        if (cliente_id) {
            query += ' AND c.cliente_id = ?';
            params.push(cliente_id);
        }

        if (para_firma === 'true' || para_firma === true) {
    console.log('🖊️ Filtrando contratos para firma');
    
    if (req.query.filtroEstado === 'pendiente') {
        query += ' AND c.firmado_cliente = 0 AND c.documento_pdf_path IS NOT NULL';
    } else if (req.query.filtroEstado === 'firmado') {
        query += ' AND c.firmado_cliente = 1';
    } else if (req.query.filtroEstado === 'anulado') {
        query += ' AND c.estado = "anulado"';
    } else if (req.query.filtroEstado === 'todos') {  // ✅ AÑADIR ESTE CASO
        // No filtrar por estado, mostrar todos
    }
} else if (estado) {
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

        query += ' GROUP BY c.id';

        // Contar total
        const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM contratos c 
                           LEFT JOIN clientes cl ON c.cliente_id = cl.id 
                           WHERE 1=1 ${query.substring(query.indexOf('WHERE 1=1') + 9, query.indexOf('GROUP BY'))}`;
        const [countResult] = await Database.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        query += ` ORDER BY c.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
        
        let contratos = await Database.query(query, params);

        // ✅ Procesar cada contrato para extraer plan_nombre y plan_precio
        contratos = contratos.map(contrato => {
            let plan_nombre = 'N/A';
            let plan_precio = 0;
            let plan_tipo = 'N/A';

            // Primero intentar obtener de servicios_info
            if (contrato.servicios_info && contrato.servicios_info.trim() !== '||') {
                const servicios = contrato.servicios_info.split(';;').filter(s => s && s !== '||');
                
                if (servicios.length === 1) {
                    const [nombre, precio, tipo] = servicios[0].split('|');
                    if (nombre) {
                        plan_nombre = nombre;
                        plan_precio = parseFloat(precio) || 0;
                        plan_tipo = tipo || 'servicio';
                    }
                } else if (servicios.length > 1) {
                    const nombres = [];
                    let precioTotal = 0;
                    for (const servicio of servicios) {
                        const [nombre, precio] = servicio.split('|');
                        if (nombre) {
                            nombres.push(nombre);
                            precioTotal += parseFloat(precio) || 0;
                        }
                    }
                    if (nombres.length > 0) {
                        plan_nombre = nombres.join(' + ');
                        plan_precio = precioTotal;
                        plan_tipo = 'combo';
                    }
                }
            }

            // ✅ Si no hay datos, extraer de observaciones JSON
            if (plan_nombre === 'N/A' && contrato.observaciones) {
                try {
                    const obs = JSON.parse(contrato.observaciones);
                    if (obs.servicios_incluidos) {
                        // Extraer nombres limpiando prefijos
                        plan_nombre = obs.servicios_incluidos
                            .replace(/INTERNET: /g, '')
                            .replace(/TELEVISION: /g, '')
                            .replace(/\(\$\d+(\.\d+)?\)/g, '') // Quitar precios entre paréntesis
                            .trim();
                        
                        // Extraer y sumar precios
                        const matches = obs.servicios_incluidos.match(/\(?\$(\d+)/g);
                        if (matches) {
                            plan_precio = matches.reduce((sum, precio) => {
                                const num = parseInt(precio.replace(/\(?\$/, ''));
                                return sum + (isNaN(num) ? 0 : num);
                            }, 0);
                        }
                        plan_tipo = obs.cantidad_servicios > 1 ? 'combo' : 'servicio';
                    }
                } catch (e) {
                    // Si falla el parse, mantener N/A
                    console.log(`⚠️ No se pudo parsear observaciones del contrato ${contrato.numero_contrato}`);
                }
            }

            // ✅ Último fallback - Mensaje más descriptivo si sigue siendo N/A
            if (plan_nombre === 'N/A') {
                plan_nombre = 'Sin información de plan';
                plan_precio = 0;
                plan_tipo = 'servicio';
            }

            return {
                ...contrato,
                plan_nombre,
                plan_precio,
                plan_tipo,
                servicios_info: undefined // Remover campo temporal
            };
        });

        console.log(`✅ Encontrados ${contratos.length} contratos`);

        res.json({
            success: true,
            data: {
                contratos,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
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
          cl.correo as cliente_email,
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

        // 🔥 NUEVA CONSULTA: Obtener TODOS los servicios del cliente
        const contratos = await Database.query(`
            SELECT 
                c.*,
                cl.nombre as cliente_nombre,
                cl.identificacion as cliente_identificacion,
                cl.telefono as cliente_telefono,
                cl.correo as cliente_email,
                cl.direccion as cliente_direccion,
                cl.barrio as cliente_barrio,
                cl.estrato as cliente_estrato
            FROM contratos c
            INNER JOIN clientes cl ON c.cliente_id = cl.id
            WHERE c.id = ? AND c.estado IN ('activo', 'anulado', 'terminado')
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

        // 🔥 OBTENER TODOS LOS SERVICIOS DEL CLIENTE
        let servicios_ids = [];
        try {
            if (contratoData.servicio_id) {
                if (contratoData.servicio_id.startsWith('[')) {
                    servicios_ids = JSON.parse(contratoData.servicio_id);
                } else {
                    servicios_ids = [parseInt(contratoData.servicio_id)];
                }
            }
        } catch (e) {
            console.error('Error parseando servicio_id:', e);
            servicios_ids = [];
        }

        console.log('🔍 Servicios IDs:', servicios_ids);

        // Obtener detalles de TODOS los servicios
        let serviciosDetalles = [];
        if (servicios_ids.length > 0) {
            const placeholders = servicios_ids.map(() => '?').join(',');
            serviciosDetalles = await Database.query(`
                SELECT 
                    sc.*,
                    ps.nombre as plan_nombre,
                    ps.tipo as plan_tipo,
                    ps.precio,
                    ps.precio_internet,
                    ps.precio_television,
                    ps.velocidad_bajada,
                    ps.velocidad_subida,
                    ps.canales_tv,
                    ps.descripcion
                FROM servicios_cliente sc
                INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
                WHERE sc.id IN (${placeholders})
            `, servicios_ids);
        }

        console.log('📦 Servicios encontrados:', serviciosDetalles.length);

        // 🔥 PROCESAR SERVICIOS: Separar Internet y TV
        let internetData = null;
        let televisionData = null;

        serviciosDetalles.forEach(servicio => {
            console.log(`📋 Servicio: ${servicio.plan_nombre} - Tipo: ${servicio.plan_tipo}`);
            
            if (servicio.plan_tipo === 'internet') {
                internetData = {
                    nombre: servicio.plan_nombre,
                    precio_sin_iva: parseFloat(servicio.precio_internet || servicio.precio || 0),
                    velocidad_bajada: servicio.velocidad_bajada,
                    velocidad_subida: servicio.velocidad_subida,
                    descripcion: servicio.descripcion
                };
            } else if (servicio.plan_tipo === 'television') {
                televisionData = {
                    nombre: servicio.plan_nombre,
                    precio_sin_iva: parseFloat(servicio.precio_television || servicio.precio || 0),
                    canales: servicio.canales_tv,
                    descripcion: servicio.descripcion
                };
            } else if (servicio.plan_tipo === 'combo') {
                // Si es combo, usar los precios separados
                internetData = {
                    nombre: `${servicio.plan_nombre} (Internet)`,
                    precio_sin_iva: parseFloat(servicio.precio_internet || 0),
                    velocidad_bajada: servicio.velocidad_bajada,
                    velocidad_subida: servicio.velocidad_subida
                };
                televisionData = {
                    nombre: `${servicio.plan_nombre} (TV)`,
                    precio_sin_iva: parseFloat(servicio.precio_television || 0),
                    canales: servicio.canales_tv
                };
            }
        });

        // Agregar al contratoData
        contratoData.internet_data = internetData;
        contratoData.television_data = televisionData;
        
        // Para compatibilidad con el generador
        contratoData.precio_internet = internetData ? internetData.precio_sin_iva : 0;
        contratoData.precio_television = televisionData ? televisionData.precio_sin_iva : 0;

        console.log('💰 Internet:', contratoData.precio_internet);
        console.log('📺 TV:', contratoData.precio_television);

        let pdfBuffer;

        // Verificar si ya existe PDF generado
        if (contratoData.documento_pdf_path && fs.existsSync(contratoData.documento_pdf_path)) {
            console.log('📁 Usando PDF existente:', contratoData.documento_pdf_path);
            pdfBuffer = fs.readFileSync(contratoData.documento_pdf_path);
        } else {
            console.log('🔨 Generando nuevo PDF...');

            // Obtener configuración de empresa
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
                executablePath: '/usr/bin/google-chrome',
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

            // Guardar el PDF
            try {
                const uploadsDir = path.join(__dirname, '..', 'uploads', 'contratos');
                
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const nombrePDF = `contrato_${contratoData.numero_contrato}_original.pdf`;
                const rutaPDF = path.join(uploadsDir, nombrePDF);

                fs.writeFileSync(rutaPDF, pdfBuffer);
                console.log('✅ PDF guardado exitosamente');

                await Database.query(`
                    UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
                `, [rutaPDF, id]);

            } catch (dirError) {
                console.error('❌ Error guardando archivo:', dirError);
            }
        }

        console.log(`✅ PDF generado exitosamente (${pdfBuffer.length} bytes)`);

        const filename = `contrato_${contratoData.numero_contrato || id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Accept-Ranges', 'bytes');

        res.end(pdfBuffer, 'binary');

        console.log(`📎 PDF del contrato servido: ${filename}`);

    } catch (error) {
        console.error('❌ Error generando PDF del contrato:', error);

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
        const estado = req.body.estado || req.body;
        const observaciones = req.body.observaciones || '';

        // Validar que el estado sea un string válido
        const estadosValidos = ['activo', 'suspendido', 'terminado', 'anulado', 'cancelado'];
        const estadoFinal = typeof estado === 'string' ? estado : estado.estado;

        if (!estadosValidos.includes(estadoFinal)) {
            return res.status(400).json({
                success: false,
                message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
            });
        }

        await Database.query(
            'UPDATE contratos SET estado = ?, observaciones = ?, updated_at = NOW() WHERE id = ?',
            [estadoFinal, observaciones, id]
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

        // ✅ Usar el patrón estándar de Database.query
        const contratos = await Database.query(`
            SELECT documento_pdf_path, numero_contrato, firmado_cliente
            FROM contratos WHERE id = ? AND activo = 1
        `, [id]);

        if (contratos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contrato no encontrado'
            });
        }

        const contrato = contratos[0];
        const pdfExiste  =  contrato.documento_pdf_path && fs.existsSync(contrato.documento_pdf_path);

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