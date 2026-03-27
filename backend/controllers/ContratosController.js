// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');
const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator'); // Antiguo (mantener para compatibilidad)
const ContratoPDFGeneratorMINTIC = require('../utils/ContratoPDFGeneratorMINTIC'); // Nuevo modelo MINTIC
const puppeteer = require('puppeteer');

// Helper: fecha local Colombia → YYYY-MM-DD (sin desfase UTC)
function fechaLocalMySQL(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
const FirmaPDFService = require('../services/FirmaPDFService');
const fs = require('fs');
const path = require('path');


class ContratosController {

    static async obtenerTodos(req, res) {
        try {
            console.log('📋 GET /contratos - Obteniendo contratos');

            const {
                page = 1,
                limit = 20,
                cliente_id,
                estado = '',
                tipo_contrato = '',
                search = '',
                para_firma = false
            } = req.query;

            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
            const offsetNum = (pageNum - 1) * limitNum;

            // ── Construir filtros WHERE (sobre tabla ligera) ──────────────────
            const whereParts = ['1=1'];
            const params = [];

            if (cliente_id) {
                whereParts.push('c.cliente_id = ?');
                params.push(cliente_id);
            }

            if (para_firma === 'true' || para_firma === true) {
                const filtroEstado = req.query.filtroEstado;
                if (filtroEstado === 'pendiente') {
                    whereParts.push('c.firmado_cliente = 0 AND c.documento_pdf_path IS NOT NULL');
                } else if (filtroEstado === 'firmado') {
                    whereParts.push('c.firmado_cliente = 1');
                } else if (filtroEstado === 'anulado') {
                    whereParts.push('c.estado = "anulado"');
                }
                // 'todos' → sin filtro adicional
            } else if (estado) {
                whereParts.push('c.estado = ?');
                params.push(estado);
            }

            if (tipo_contrato) {
                whereParts.push('c.tipo_contrato = ?');
                params.push(tipo_contrato);
            }

            // Búsqueda (JOIN a clientes solo si hay search o filtro de sede)
            const needsClienteJoin = !!(search || (req.user?.rol !== 'administrador' && req.user?.sede_id));

            if (search) {
                whereParts.push('(c.numero_contrato LIKE ? OR cl.nombre LIKE ? OR cl.identificacion LIKE ?)');
                const t = `%${search}%`;
                params.push(t, t, t);
            }

            // Restricción de sede para no-administradores
            if (req.user && req.user.rol !== 'administrador' && req.user.sede_id) {
                whereParts.push('cl.ciudad_id = ?');
                params.push(req.user.sede_id);
            }

            const whereClause = whereParts.join(' AND ');
            const clienteJoinSql = needsClienteJoin
                ? 'LEFT JOIN clientes cl ON c.cliente_id = cl.id'
                : '';

            // ── PASO 1: Contar total (query liviano) ──────────────────────────
            const [countRows] = await Database.query(
                `SELECT COUNT(DISTINCT c.id) AS total
                 FROM contratos c ${clienteJoinSql}
                 WHERE ${whereClause}`,
                params
            );
            const total = countRows[0]?.total || 0;

            // ── PASO 2: Obtener IDs paginados (rápido, solo índices) ──────────
            const [idRows] = await Database.query(
                `SELECT c.id
                 FROM contratos c ${clienteJoinSql}
                 WHERE ${whereClause}
                 ORDER BY c.created_at DESC
                 LIMIT ${limitNum} OFFSET ${offsetNum}`,
                params
            );

            if (idRows.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        contratos: [],
                        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
                    }
                });
            }

            const ids = idRows.map(r => r.id);
            const placeholders = ids.map(() => '?').join(',');

            // ── PASO 3: Enriquecer solo las N filas paginadas ─────────────────
            // JOIN a clientes_inactivos como tabla derivada (una sola vez, no por fila)
            let contratos = await Database.query(`
                SELECT
                    c.*,
                    COALESCE(cl.nombre,        ci_last.nombre,        'Cliente eliminado') AS cliente_nombre,
                    COALESCE(cl.identificacion, ci_last.identificacion, 'N/A')             AS cliente_identificacion,
                    COALESCE(cl.telefono,       ci_last.telefono,       '')                AS cliente_telefono,
                    COALESCE(cl.correo,         '')                                        AS cliente_email,
                    COALESCE(cl.direccion,      ci_last.direccion,      '')                AS cliente_direccion,
                    COALESCE(cl.estrato,        '')                                        AS cliente_estrato,
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            COALESCE(ps.nombre, ''), '|',
                            COALESCE(ps.precio, 0),  '|',
                            COALESCE(ps.tipo,   '')
                        ) SEPARATOR ';;'
                    ) AS servicios_info
                FROM contratos c
                LEFT JOIN clientes cl ON c.cliente_id = cl.id
                -- Un único JOIN a tabla derivada en lugar de 4 subconsultas correlacionadas
                LEFT JOIN (
                    SELECT ci.cliente_id, ci.nombre, ci.identificacion, ci.telefono, ci.direccion
                    FROM clientes_inactivos ci
                    INNER JOIN (
                        SELECT cliente_id, MAX(fecha_inactivacion) AS max_fi
                        FROM clientes_inactivos
                        GROUP BY cliente_id
                    ) lci ON ci.cliente_id = lci.cliente_id AND ci.fecha_inactivacion = lci.max_fi
                ) ci_last ON ci_last.cliente_id = c.cliente_id AND cl.id IS NULL
                -- Servicios: solo numéricos simples (los JSON arrays se leen de observaciones)
                LEFT JOIN servicios_cliente sc
                    ON c.servicio_id IS NOT NULL
                    AND c.servicio_id REGEXP '^[0-9]+$'
                    AND sc.id = CAST(c.servicio_id AS UNSIGNED)
                LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
                WHERE c.id IN (${placeholders})
                GROUP BY c.id
                ORDER BY c.created_at DESC
            `, ids);

            // ── PASO 4: Extraer plan_nombre / plan_precio de servicios_info u observaciones
            contratos = contratos.map(contrato => {
                let plan_nombre = 'N/A';
                let plan_precio = 0;
                let plan_tipo = 'N/A';

                if (contrato.servicios_info && contrato.servicios_info.trim() !== '||') {
                    const servicios = contrato.servicios_info.split(';;').filter(s => s && s !== '||');
                    if (servicios.length === 1) {
                        const [nombre, precio, tipo] = servicios[0].split('|');
                        if (nombre) { plan_nombre = nombre; plan_precio = parseFloat(precio) || 0; plan_tipo = tipo || 'servicio'; }
                    } else if (servicios.length > 1) {
                        const nombres = []; let precioTotal = 0;
                        for (const s of servicios) {
                            const [nombre, precio] = s.split('|');
                            if (nombre) { nombres.push(nombre); precioTotal += parseFloat(precio) || 0; }
                        }
                        if (nombres.length > 0) { plan_nombre = nombres.join(' + '); plan_precio = precioTotal; plan_tipo = 'combo'; }
                    }
                }

                if (plan_nombre === 'N/A' && contrato.observaciones) {
                    try {
                        const obs = JSON.parse(contrato.observaciones);
                        if (obs.precio_mensual_total) plan_precio = parseFloat(obs.precio_mensual_total);
                        if (obs.servicios_incluidos) {
                            plan_nombre = obs.servicios_incluidos
                                .replace(/INTERNET: |TELEVISION: |SERVICIO: /g, '')
                                .replace(/\(\$[\d.]+\)/g, '').trim();
                            if (!obs.precio_mensual_total) {
                                const m = obs.servicios_incluidos.match(/\$(\d+)/g);
                                if (m) plan_precio = m.reduce((s, p) => s + (parseInt(p.replace('$', '')) || 0), 0);
                            }
                            plan_tipo = obs.cantidad_servicios > 1 ? 'combo' : 'servicio';
                        }
                    } catch (e) { /* observaciones no es JSON */ }
                }

                if (plan_nombre === 'N/A') { plan_nombre = 'Sin información de plan'; plan_tipo = 'servicio'; }

                return { ...contrato, plan_nombre, plan_precio, plan_tipo, servicios_info: undefined };
            });

            console.log(`✅ Contratos devueltos: ${contratos.length} de ${total}`);

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
            const { regenerar } = req.query; // ✅ NUEVO: Parámetro para forzar regeneración
            console.log(`📄 Generando PDF del contrato ID: ${id} (Regenerar: ${regenerar === 'true'})`);

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
                cl.estrato as cliente_estrato,
                ci.nombre as ciudad_nombre,
                d.nombre as departamento_nombre
            FROM contratos c
            INNER JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN ciudades ci ON cl.ciudad_id = ci.id
            LEFT JOIN departamentos d ON ci.departamento_id = d.id
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
                    ps.descripcion,
                    ps.aplica_iva
                FROM servicios_cliente sc
                INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
                WHERE sc.id IN (${placeholders})
            `, servicios_ids);
            }

            console.log('📦 Servicios encontrados:', serviciosDetalles.length);

            // ✅ CORRECCIÓN: Preparar array de servicios para el PDF con TODAS las características
            // Importar servicio de IVA para cálculo dinámico según estrato del cliente
            const IVACalculatorService = require('../services/IVACalculatorService');
            const clienteEstrato = parseInt(contratoData.cliente_estrato) || 3;

            contratoData.servicios = serviciosDetalles.map(servicio => {
                const precioBase = parseFloat(servicio.precio_personalizado || servicio.precio || 0);
                const tipoServicio = servicio.plan_tipo || 'internet';
                // Calcular IVA dinámicamente según estrato del cliente y tipo de servicio
                const ivaInfo = IVACalculatorService.determinarIVA(tipoServicio, clienteEstrato);
                const valorIVA = ivaInfo.aplica ? Math.round(precioBase * (ivaInfo.porcentaje / 100)) : 0;
                const precioConIVA = precioBase + valorIVA;

                return {
                    plan_nombre: servicio.plan_nombre,
                    tipo: tipoServicio,
                    tipo_servicio: tipoServicio,
                    precio_plan: precioBase,
                    precio: precioBase,
                    precio_con_iva: precioConIVA,
                    valor_iva: valorIVA,
                    velocidad_bajada: servicio.velocidad_bajada,
                    velocidad_subida: servicio.velocidad_subida,
                    canales_tv: servicio.canales_tv,
                    tecnologia: servicio.tecnologia,
                    descripcion: servicio.descripcion,
                    aplica_iva: ivaInfo.aplica,
                    porcentaje_iva: ivaInfo.porcentaje
                };
            });

            console.log('✅ Array de servicios preparado para PDF:', contratoData.servicios);

            // 🔥 PROCESAR SERVICIOS: Separar Internet y TV (para compatibilidad)
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

            // ✅ ACTUALIZADO: Verificar si ya existe PDF generado (a menos que se fuerce regenerar)
            const usarPDFExistente = regenerar !== 'true' &&
                contratoData.documento_pdf_path &&
                fs.existsSync(contratoData.documento_pdf_path);

            if (usarPDFExistente) {
                console.log('📁 Usando PDF existente:', contratoData.documento_pdf_path);
                pdfBuffer = fs.readFileSync(contratoData.documento_pdf_path);
            } else {
                if (regenerar === 'true') {
                    console.log('🔄 Forzando regeneración del PDF...');
                } else {
                    console.log('🔨 Generando nuevo PDF...');
                }

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

                let logoPath = '';
                try {
                    const logoFilePath = path.join(__dirname, '..', 'assets', 'logo2.png');
                    const logoBuffer = fs.readFileSync(logoFilePath);
                    logoPath = `data:image/png;base64,${logoBuffer.toString('base64')}`;
                    console.log('✅ Logo cargado correctamente');
                } catch (error) {
                    console.warn('⚠️  Logo no encontrado:', error.message);
                }

                // ✅ AHORA (con logo)
                const htmlContent = ContratoPDFGeneratorMINTIC.generarHTML(contratoData, empresa, logoPath);

                // Generar PDF con Puppeteer
                const browser = await puppeteer.launch({
                    headless: true,
                    executablePath: '/usr/bin/google-chrome',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });

                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

                pdfBuffer = await page.pdf({
                    format: 'Letter', // ✅ ACTUALIZADO: Letter en lugar de A4 (modelo MINTIC)
                    margin: {
                        top: '8mm',
                        right: '10mm',
                        bottom: '8mm',
                        left: '10mm'
                    }, // ✅ ACTUALIZADO: Márgenes del modelo MINTIC
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
            // Restricción por sede para no-administradores
            let sedeJoin = '';
            let sedeWhere = '';
            const sedeParams = [];
            if (req.user && req.user.rol !== 'administrador' && req.user.sede_id) {
                sedeJoin = ' LEFT JOIN clientes cl ON c.cliente_id = cl.id';
                sedeWhere = ' WHERE cl.ciudad_id = ?';
                sedeParams.push(req.user.sede_id);
            }

            const estadisticas = await Database.query(`
        SELECT
          COUNT(*) as total_contratos,
          SUM(CASE WHEN c.estado = 'activo' THEN 1 ELSE 0 END) as contratos_activos,
          SUM(CASE WHEN c.estado = 'vencido' THEN 1 ELSE 0 END) as contratos_vencidos,
          SUM(CASE WHEN c.estado = 'terminado' THEN 1 ELSE 0 END) as contratos_terminados,
          SUM(CASE WHEN c.estado = 'anulado' THEN 1 ELSE 0 END) as contratos_anulados,
          SUM(CASE WHEN c.firmado_cliente = 1 THEN 1 ELSE 0 END) as contratos_firmados
        FROM contratos c${sedeJoin}${sedeWhere}
      `, sedeParams);

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

            let datosDescarga;
            try {
                datosDescarga = await FirmaPDFService.obtenerURLDescargaPDF(id);
            } catch (descargaError) {
                console.warn('PDF no encontrado en base de datos, regenerando...');
                datosDescarga = null;
            }

            let pdfBuffer;
            let filename;

            if (datosDescarga && datosDescarga.ruta_archivo && fs.existsSync(datosDescarga.ruta_archivo)) {
                pdfBuffer = fs.readFileSync(datosDescarga.ruta_archivo);
                filename = `contrato_${datosDescarga.numero_contrato}${datosDescarga.firmado ? '_firmado' : ''}.pdf`;
            } else {
                // Fallback: regenerar el PDF si el archivo no existe
                console.log('Archivo PDF no encontrado en disco, regenerando...');
                const contratos = await Database.query(`
                    SELECT numero_contrato FROM contratos WHERE id = ?
                `, [id]);

                if (!contratos || contratos.length === 0) {
                    return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
                }

                // Redirigir a la generación del PDF
                return res.redirect(`/api/v1/contratos/${id}/pdf`);
            }

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
    /**
     * @route POST /api/v1/contratos/:id/renovar
     * @desc Renovar un contrato existente generando uno nuevo
     * @access Private (Supervisor+)
     */
    static async renovarContrato(req, res) {
        try {
            const { id } = req.params;
            const { permanencia_meses, observaciones, terminar_anterior = true } = req.body;

            console.log(`🔄 Renovando contrato ID: ${id}`);

            if (!id || isNaN(id)) {
                return res.status(400).json({ success: false, message: 'ID de contrato inválido' });
            }

            // Obtener contrato existente
            const contratos = await Database.query(
                'SELECT * FROM contratos WHERE id = ?',
                [id]
            );

            if (contratos.length === 0) {
                return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
            }

            const contratoOriginal = contratos[0];

            if (contratoOriginal.estado === 'anulado') {
                return res.status(400).json({ success: false, message: 'No se puede renovar un contrato anulado' });
            }

            // #3 - Solo se puede renovar cuando el contrato está próximo a vencer
            const DIAS_MINIMOS_PARA_RENOVAR = 30;
            const fechaFinRef = contratoOriginal.fecha_vencimiento_permanencia || contratoOriginal.fecha_fin;

            if (!fechaFinRef) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede renovar este contrato: no tiene fecha de vencimiento definida. Solo se pueden renovar contratos con una fecha de fin establecida.'
                });
            }

            const diasRestantes = Math.ceil((new Date(fechaFinRef) - new Date()) / (1000 * 60 * 60 * 24));
            if (diasRestantes > DIAS_MINIMOS_PARA_RENOVAR) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede renovar el contrato. Aún quedan ${diasRestantes} días para su vencimiento. Solo se puede renovar dentro de los ${DIAS_MINIMOS_PARA_RENOVAR} días anteriores al vencimiento.`,
                    data: { dias_restantes: diasRestantes, dias_minimos: DIAS_MINIMOS_PARA_RENOVAR, fecha_vencimiento: fechaFinRef }
                });
            }

            const meses = parseInt(permanencia_meses) || contratoOriginal.permanencia_meses || 12;

            // Generar número de contrato usando configuración de empresa
            const [configRows] = await Database.query(
                'SELECT prefijo_contrato, consecutivo_contrato FROM configuracion_empresa WHERE id = 1'
            );

            let nuevoNumero;
            if (configRows) {
                const { prefijo_contrato, consecutivo_contrato } = configRows;
                const year = new Date().getFullYear();
                nuevoNumero = `${prefijo_contrato}-${year}-${String(consecutivo_contrato).padStart(6, '0')}`;
                // Incrementar consecutivo
                await Database.query(
                    'UPDATE configuracion_empresa SET consecutivo_contrato = consecutivo_contrato + 1 WHERE id = 1'
                );
            } else {
                nuevoNumero = `CON-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
            }

            const fechaInicio = new Date();
            const fechaFin = new Date();
            fechaFin.setMonth(fechaFin.getMonth() + meses);

            const obsTexto = observaciones ||
                `Renovación del contrato ${contratoOriginal.numero_contrato}`;

            // Crear nuevo contrato basado en el anterior
            const resultado = await Database.query(
                `INSERT INTO contratos (
                    numero_contrato, cliente_id, servicio_id, tipo_contrato, tipo_permanencia,
                    permanencia_meses, fecha_generacion, fecha_inicio, fecha_fin,
                    fecha_vencimiento_permanencia, estado, observaciones, firmado_cliente,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'activo', ?, 0, NOW(), NOW())`,
                [
                    nuevoNumero,
                    contratoOriginal.cliente_id,
                    contratoOriginal.servicio_id,
                    contratoOriginal.tipo_contrato,
                    contratoOriginal.tipo_permanencia,
                    meses,
                    fechaLocalMySQL(fechaInicio),
                    fechaLocalMySQL(fechaFin),
                    fechaLocalMySQL(fechaFin),
                    obsTexto
                ]
            );

            // Terminar contrato anterior si se solicita
            if (terminar_anterior) {
                await Database.query(
                    'UPDATE contratos SET estado = ?, updated_at = NOW() WHERE id = ?',
                    ['terminado', id]
                );
            }

            console.log(`✅ Contrato renovado: ${nuevoNumero} (ID: ${resultado.insertId})`);

            res.json({
                success: true,
                message: 'Contrato renovado exitosamente',
                data: {
                    nuevo_contrato_id: resultado.insertId,
                    numero_contrato: nuevoNumero,
                    contrato_anterior_id: parseInt(id),
                    contrato_anterior_estado: terminar_anterior ? 'terminado' : contratoOriginal.estado,
                    fecha_inicio: fechaLocalMySQL(fechaInicio),
                    fecha_fin: fechaLocalMySQL(fechaFin),
                    permanencia_meses: meses
                }
            });

        } catch (error) {
            console.error('❌ Error renovando contrato:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

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