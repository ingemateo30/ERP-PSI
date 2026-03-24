// backend/routes/factura.js - RUTAS MEJORADAS CON FACTURACIÓN AUTOMÁTICA
const express = require('express');
const router = express.Router();
const FacturasController = require('../controllers/FacturasController');
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { audit, metaFromReq } = require('../utils/auditLogger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validarCrearFactura, validarActualizarFactura, validarPagarFactura } = require('../middleware/validations');
const { body, validationResult } = require('express-validator');


// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS PÚBLICAS (LECTURA)
// ==========================================

/**
 * @route GET /api/v1/facturas
 * @desc Obtener todas las facturas con filtros y paginación MEJORADOS
 * @access Autenticado
 */
router.get('/', FacturasController.obtenerTodas);

/**
 * @route GET /api/v1/facturas/search
 * @desc Buscar facturas con diferentes criterios
 * @access Autenticado
 */
router.get('/search', FacturasController.buscar);

/**
 * @route GET /api/v1/facturas/stats
 * @desc Obtener estadísticas de facturas
 * @access Autenticado
 */
router.get('/stats', FacturasController.obtenerEstadisticas);

/**
 * @route GET /api/v1/facturas/vencidas
 * @desc Obtener facturas vencidas
 * @access Autenticado
 */
router.get('/vencidas', FacturasController.obtenerVencidas);

/**
 * @route GET /api/v1/facturas/test-pdf
 * @desc Probar generación de PDF
 * @access Autenticado
 */
router.get('/test-pdf', FacturasController.probarPDF);

/**
 * @route GET /api/v1/facturas/generar-numero
 * @desc Generar siguiente número de factura
 * @access Administrador, Supervisor
 */
router.get('/generar-numero', 
  requireRole('administrador', 'supervisor'),
  FacturasController.generarNumeroFactura
);

/**
 * @route GET /api/v1/facturas/validate/:numero
 * @desc Validar si existe factura con número específico
 * @access Autenticado
 */
router.get('/validate/:numero', FacturasController.validarNumeroFactura);

/**
 * @route GET /api/v1/facturas/numero/:numero
 * @desc Obtener factura por número
 * @access Autenticado
 */
router.get('/numero/:numero', FacturasController.obtenerPorNumero);

/**
 * @route GET /api/v1/facturas/historial-cliente
 * @desc Obtener historial completo de facturación de un cliente
 * @access Autenticado
 */
router.get('/historial-cliente', async (req, res) => {
  try {
    const { 
      cliente_id, 
      estado, 
      fecha_desde, 
      fecha_hasta, 
      numero_factura,
      page = 1,
      limit = 50
    } = req.query;

    // ✅ LOG DE DEBUG
    console.log('📋 [BACKEND historial-cliente] Parámetros recibidos:', {
      cliente_id,
      estado,
      fecha_desde,
      fecha_hasta,
      numero_factura,
      page,
      limit
    });

    // ✅ VALIDACIÓN CRÍTICA
    if (!cliente_id) {
      console.log('❌ [BACKEND] Cliente ID no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'ID de cliente es requerido'
      });
    }

    const { Database } = require('../models/Database');
    const offset = (page - 1) * limit;
    
    // ✅ CORRECCIÓN: Agregar f.activo = 1 desde el inicio
    let whereClause = 'WHERE f.cliente_id = ? AND f.activo = 1';
    let params = [cliente_id];

    console.log('🔍 [BACKEND] WHERE inicial:', whereClause);
    console.log('🔍 [BACKEND] Params inicial:', params);

    // Aplicar filtros adicionales
    if (estado) {
      whereClause += ' AND f.estado = ?';
      params.push(estado);
      console.log('🎯 [BACKEND] Filtro estado agregado:', estado);
    }

    if (fecha_desde) {
      whereClause += ' AND f.fecha_emision >= ?';
      params.push(fecha_desde);
      console.log('📅 [BACKEND] Filtro fecha_desde agregado:', fecha_desde);
    }

    if (fecha_hasta) {
      whereClause += ' AND f.fecha_emision <= ?';
      params.push(fecha_hasta);
      console.log('📅 [BACKEND] Filtro fecha_hasta agregado:', fecha_hasta);
    }

    if (numero_factura) {
      whereClause += ' AND f.numero_factura LIKE ?';
      params.push(`%${numero_factura}%`);
      console.log('🔢 [BACKEND] Filtro numero_factura agregado:', numero_factura);
    }

    console.log('🔍 [BACKEND] WHERE final:', whereClause);
    console.log('🔍 [BACKEND] Params finales:', params);

    // Obtener facturas - usar datos actuales del cliente para evitar datos incorrectos almacenados
    const facturas = await Database.query(`
      SELECT
        f.*,
        c.nombre as cliente_nombre,
        c.nombre as nombre_cliente,
        c.identificacion as cliente_identificacion,
        c.identificacion as identificacion_cliente,
        c.telefono as cliente_telefono,
        c.correo as cliente_email,
        c.direccion as cliente_direccion
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      ${whereClause}
      ORDER BY f.fecha_emision DESC, f.id DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, params);

    console.log(`✅ [BACKEND] Facturas encontradas: ${facturas.length}`);

    // Obtener detalles de cada factura (pagos, etc.)
    for (let factura of facturas) {
      try {
        // Obtener pagos de la factura
        const pagos = await Database.query(`
          SELECT * FROM pagos 
          WHERE factura_id = ?
          ORDER BY fecha_pago DESC
        `, [factura.id]);
        
        factura.pagos = pagos;

        // Obtener detalles de conceptos si es necesario
        const detalles = await Database.query(`
          SELECT df.*, cf.nombre as concepto_nombre
          FROM detalle_facturas df
          LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
          WHERE df.factura_id = ?
        `, [factura.id]);
        
        factura.detalles = detalles;
      } catch (detailError) {
        console.log('⚠️ [BACKEND] Error obteniendo detalles para factura', factura.id, detailError.message);
        factura.pagos = [];
        factura.detalles = [];
      }
    }

    // Obtener estadísticas del cliente (SOLO del cliente específico)
    const estadisticas = await Database.query(`
      SELECT 
        COUNT(*) as total_facturas,
        SUM(total) as valor_total,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
        SUM(CASE WHEN estado = 'vencida' THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as valor_pendiente,
        SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as valor_pagado,
        AVG(total) as promedio_factura
      FROM facturas 
      WHERE cliente_id = ? AND estado != 'anulada' AND activo = 1
    `, [cliente_id]);

    console.log('📊 [BACKEND] Estadísticas calculadas:', estadisticas[0]);

    res.json({
      success: true,
      data: {
        facturas,
        estadisticas: estadisticas[0] || {},
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: facturas.length
        }
      },
      message: 'Historial de facturación obtenido exitosamente'
    });

  } catch (error) {
    console.error('❌ [BACKEND] Error obteniendo historial de facturación:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial de facturación',
      error: error.message
    });
  }
});
/**
 * @route GET /api/v1/facturas/:id/nota-credito
 * @desc Obtener datos de la Nota de Crédito asociada a una factura anulada
 * @access Autenticado
 */
router.get('/:id/nota-credito', async (req, res) => {
  try {
    const { id } = req.params;
    const { Database } = require('../models/Database');
    const rows = await Database.query(`
      SELECT nc.*,
             u.nombre AS usuario_nombre
      FROM notas_credito nc
      LEFT JOIN sistema_usuarios u ON nc.usuario_id = u.id
      WHERE nc.factura_id = ?
      LIMIT 1
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Nota de Crédito no encontrada para esta factura' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo Nota de Crédito', error: err.message });
  }
});

/**
 * @route GET /api/v1/facturas/:id/nota-credito/pdf
 * @desc Descargar PDF de la Nota de Crédito
 * @access Autenticado
 */
router.get('/:id/nota-credito/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { Database } = require('../models/Database');
    const PDFGenerator = require('../utils/pdfGenerator');

    const [nc] = await Database.query(`
      SELECT nc.*, u.nombre AS usuario_nombre
      FROM notas_credito nc
      LEFT JOIN sistema_usuarios u ON nc.usuario_id = u.id
      WHERE nc.factura_id = ?
      LIMIT 1
    `, [id]);

    if (!nc) {
      return res.status(404).json({ success: false, message: 'Nota de Crédito no encontrada' });
    }

    const empresaRows = await Database.query('SELECT * FROM configuracion_empresa WHERE id = 1');
    const empresa = empresaRows[0] || {};

    const pdfBuffer = await PDFGenerator.generarNotaCredito(nc, empresa);
    const filename = `${nc.numero_nc}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ Error generando PDF de Nota de Crédito:', err);
    res.status(500).json({ success: false, message: 'Error generando PDF', error: err.message });
  }
});

/**
 * @route GET /api/v1/facturas/:id/pdf
 * @desc Descargar PDF de factura
 * @access Autenticado
 */
router.get('/:id/pdf', FacturasController.generarPDF);

/**
 * @route GET /api/v1/facturas/:id/ver-pdf
 * @desc Ver PDF en navegador
 * @access Autenticado
 */
router.get('/:id/ver-pdf', FacturasController.verPDF);

/**
 * @route GET /api/v1/facturas/:id/detalles
 * @desc Obtener detalles de factura
 * @access Autenticado
 */
router.get('/:id/detalles', FacturasController.obtenerDetalles);

/**
 * @route GET /api/v1/facturas/:id
 * @desc Obtener factura por ID
 * @access Autenticado
 */
router.get('/:id', FacturasController.obtenerPorId);

// ==========================================
// RUTAS DE FACTURACIÓN AUTOMÁTICA
// ==========================================

/**
 * @route POST /api/v1/facturas/automatica/generar-mensual
 * @desc Generar facturación mensual masiva para todos los clientes
 * @access Administrador
 */
router.post('/automatica/generar-mensual',
 requireRole('administrador'),
  async (req, res) => {
    try {
      console.log('🔄 Iniciando facturación mensual MEJORADA...');
      
      const { fecha_referencia, clientes_especificos } = req.body;
      const fechaRef = fecha_referencia ? new Date(fecha_referencia) : new Date();
      
      const resultado = {
        procesados: 0,
        exitosas: 0,
        fallidas: 0,
        errores: [],
        detalles: []
      };

      // Obtener clientes a procesar
      let clientesIds = clientes_especificos;
      if (!clientesIds || clientesIds.length === 0) {
        const [todosClientes] = await Database.query(`
          SELECT DISTINCT c.id 
          FROM clientes c
          INNER JOIN servicios_cliente sc ON c.id = sc.cliente_id
          WHERE c.estado = 'activo' AND sc.estado = 'activo'
        `);
        clientesIds = todosClientes.map(c => c.id);
      }

      console.log(`📋 Procesando ${clientesIds.length} clientes con lógica mejorada...`);

      // Procesar cada cliente
      for (const clienteId of clientesIds) {
        try {
          resultado.procesados++;
          
          const facturaGenerada = await FacturacionAutomaticaService.generarFacturaClienteMejorada(
            clienteId, 
            fechaRef
          );

          if (facturaGenerada) {
            resultado.exitosas++;
            resultado.detalles.push({
              cliente_id: clienteId,
              cliente_nombre: facturaGenerada.cliente_nombre,
              numero_factura: facturaGenerada.numero,
              total: facturaGenerada.total,
              tipo_facturacion: facturaGenerada.tipo_facturacion,
              dias_facturados: facturaGenerada.dias_facturados,
              estado: 'exitosa'
            });
          }

        } catch (error) {
          console.error(`❌ Error procesando cliente ${clienteId}:`, error);
          resultado.fallidas++;
          resultado.errores.push({
            cliente_id: clienteId,
            error: error.message
          });
        }
      }

      console.log(`✅ Facturación mejorada completada: ${resultado.exitosas} exitosas, ${resultado.fallidas} fallidas`);

      res.json({
        success: true,
        data: resultado,
        message: `Facturación mejorada procesada: ${resultado.exitosas} exitosas de ${resultado.procesados} procesados`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en facturación mensual mejorada:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando facturación mejorada',
        error: error.message
      });
    }
  }

);

/**
 * @route POST /api/v1/facturas/automatica/cliente/:clienteId
 * @desc Generar factura automática para un cliente específico
 * @access Administrador, Supervisor
 */
router.post('/automatica/cliente/:clienteId',
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { clienteId } = req.params;
      const { fecha_inicio } = req.body;
      
      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      console.log(`🧾 Generando factura automática para cliente ${clienteId}...`);
      
      const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
      const factura = await FacturacionAutomaticaService.crearFacturaInicialCliente(
        parseInt(clienteId),
        fechaInicio
      );

      res.json({
        success: true,
        data: factura,
        message: `Factura automática generada: ${factura.numero_factura}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error generando factura automática:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando factura automática',
        error: error.message
      });
    }
  }
);


/**
 * @route POST /api/v1/facturas/automatica/procesar-saldos
 * @desc Procesar saldos e intereses de facturas vencidas
 * @access Administrador
 */
router.post('/automatica/procesar-saldos',
  requireRole('administrador'),
  async (req, res) => {
    try {
      console.log('💰 Procesando saldos e intereses...');
      
      await FacturacionAutomaticaService.procesarSaldosEIntereses();
      
      res.json({
        success: true,
        message: 'Saldos e intereses procesados exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error procesando saldos:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando saldos e intereses',
        error: error.message
      });
    }
  }
);

// ==========================================
// RUTAS DE ADMINISTRACIÓN
// ==========================================

/**
 * @route POST /api/v1/facturas
 * @desc Crear nueva factura (manual o automática)
 * @access Administrador, Supervisor
 */
router.post('/', 
  requireRole('administrador', 'supervisor'),
  validarCrearFactura,
  FacturasController.crear
);

/**
 * @route POST /api/v1/facturas/:id/duplicar
 * @desc Duplicar factura existente
 * @access Administrador, Supervisor
 */
router.post('/:id/duplicar',
  requireRole('administrador', 'supervisor'),
  FacturasController.duplicar
);

/**
 * @route PUT /api/v1/facturas/:id
 * @desc Actualizar factura
 * @access Administrador, Supervisor
 */
router.put('/:id', 
  requireRole('administrador', 'supervisor'),
  validarActualizarFactura,
  FacturasController.actualizar
);

/**
 * @route PATCH /api/v1/facturas/:id/pagar
 * @desc Marcar factura como pagada
 * @access Todos los roles autenticados
 */
router.patch('/:id/pagar',
  validarPagarFactura,
  FacturasController.marcarComoPagada
);

/**
 * @route PATCH /api/v1/facturas/:id/anular
 * @desc Anular factura
 * @access Solo Administrador
 */
router.patch('/:id/anular',
  requireRole('administrador'),
  FacturasController.anular
);

// ==========================================
// MIDDLEWARE DE VALIDACIONES MEJORADO
// ==========================================

/**
 * Validación para crear factura con soporte automático
 */
const validarCrearFacturaMejorada = [
  body('cliente_id')
    .notEmpty()
    .withMessage('ID del cliente es requerido')
    .isInt({ min: 1 })
    .withMessage('ID del cliente debe ser un número entero positivo'),
  
  body('fecha_emision')
    .optional()
    .isISO8601()
    .withMessage('Fecha de emisión debe ser una fecha válida'),
  
  body('fecha_vencimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de vencimiento debe ser una fecha válida'),
  
  body('automatica')
    .optional()
    .isBoolean()
    .withMessage('El campo automática debe ser un booleano'),

  // Validación condicional: si no es automática, requerir más campos
  body('periodo_facturacion')
    .if(body('automatica').not().equals(true))
    .notEmpty()
    .withMessage('Período de facturación requerido para facturas manuales'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validación mejorada para pagos
 */
const validarPagoMejorado = [
  body('metodo_pago')
    .notEmpty()
    .withMessage('Método de pago requerido')
    .isIn(['efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'tarjeta', 'efecty', 'pse', 'otro'])
    .withMessage('Método de pago inválido'),
  
  body('fecha_pago')
    .optional()
    .isISO8601()
    .withMessage('Fecha de pago debe ser una fecha válida'),
  
  body('referencia_pago')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Referencia de pago debe tener entre 3 y 100 caracteres'),
  
  body('banco_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID del banco debe ser un número entero positivo'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en el pago',
        errors: errors.array()
      });
    }
    next();
  }
];

// ==========================================
// RUTAS DE REPORTING Y ANÁLISIS
// ==========================================

/**
 * @route GET /api/v1/facturas/reportes/cartera
 * @desc Reporte de cartera de clientes
 * @access Administrador, Supervisor
 */
router.get('/reportes/cartera',
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { fecha_corte, incluir_detalle = false } = req.query;
      
      const fechaCorte = fecha_corte || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          c.identificacion,
          c.nombre,
          c.telefono,
          s.nombre as sector,
          COUNT(f.id) as total_facturas_pendientes,
          SUM(f.total) as total_cartera,
          MIN(f.fecha_vencimiento) as factura_mas_antigua,
          MAX(DATEDIFF(?, f.fecha_vencimiento)) as dias_mora_maxima
        FROM clientes c
        JOIN facturas f ON c.id = f.cliente_id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE f.estado = 'pendiente' 
        AND f.fecha_vencimiento <= ?
        AND f.activo = '1'
        GROUP BY c.id
        HAVING total_cartera > 0
        ORDER BY total_cartera DESC, dias_mora_maxima DESC
      `;

      const { Database } = require('../models/Database');
      const cartera = await Database.query(query, [fechaCorte, fechaCorte]);

      // Estadísticas generales
      const estadisticas = await Database.query(`
        SELECT 
          COUNT(DISTINCT f.cliente_id) as clientes_con_mora,
          SUM(f.total) as total_cartera_general,
          AVG(f.total) as promedio_deuda_cliente,
          COUNT(f.id) as total_facturas_vencidas
        FROM facturas f
        WHERE f.estado = 'pendiente' 
        AND f.fecha_vencimiento <= ?
        AND f.activo = '1'
      `, [fechaCorte]);

      res.json({
        success: true,
        data: {
          cartera,
          estadisticas: estadisticas[0],
          fecha_corte: fechaCorte,
          total_registros: cartera.length
        },
        message: 'Reporte de cartera generado',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error generando reporte de cartera:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte de cartera',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/v1/facturas/reportes/ingresos
 * @desc Reporte de ingresos por período
 * @access Administrador, Supervisor
 */
router.get('/reportes/ingresos',
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, agrupacion = 'mensual' } = req.query;
      
      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de inicio y fin son requeridas'
        });
      }

      let formatoFecha;
      switch (agrupacion) {
        case 'diario':
          formatoFecha = '%Y-%m-%d';
          break;
        case 'semanal':
          formatoFecha = '%Y-%u';
          break;
        case 'mensual':
        default:
          formatoFecha = '%Y-%m';
          break;
      }

      const query = `
        SELECT 
          DATE_FORMAT(fecha_pago, '${formatoFecha}') as periodo,
          COUNT(*) as facturas_pagadas,
          SUM(total) as ingresos_total,
          AVG(total) as promedio_factura,
          SUM(s_internet) as ingresos_internet,
          SUM(s_television) as ingresos_television,
          SUM(s_varios) as ingresos_varios,
          SUM(s_iva) as total_iva
        FROM facturas 
        WHERE estado = 'pagada' 
        AND fecha_pago BETWEEN ? AND ?
        AND activo = '1'
        GROUP BY DATE_FORMAT(fecha_pago, '${formatoFecha}')
        ORDER BY periodo DESC
      `;

      const { Database } = require('../models/Database');
      const ingresos = await Database.query(query, [fecha_inicio, fecha_fin]);

      res.json({
        success: true,
        data: {
          ingresos,
          parametros: {
            fecha_inicio,
            fecha_fin,
            agrupacion
          },
          total_registros: ingresos.length
        },
        message: 'Reporte de ingresos generado',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error generando reporte de ingresos:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte de ingresos',
        error: error.message
      });
    }
  }
);

// ==========================================
// RUTAS DE UTILIDADES Y MANTENIMIENTO
// ==========================================

/**
 * @route POST /api/v1/facturas/utilidades/recalcular-totales
 * @desc Recalcular totales de facturas (utilidad de mantenimiento)
 * @access Administrador
 */
router.post('/utilidades/recalcular-totales',
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { facturas_ids } = req.body;
      
      let whereClause = 'WHERE activo = "1"';
      let params = [];
      
      if (facturas_ids && Array.isArray(facturas_ids)) {
        whereClause += ` AND id IN (${facturas_ids.map(() => '?').join(',')})`;
        params = facturas_ids;
      }

      const { Database } = require('../models/Database');
      
      // Obtener facturas a recalcular
      const facturas = await Database.query(`
        SELECT id, s_internet, s_television, s_interes, s_reconexion, 
               s_descuento, s_varios, s_publicidad, s_iva, saldo_anterior
        FROM facturas ${whereClause}
      `, params);

      let actualizadas = 0;

      for (const factura of facturas) {
        // Recalcular subtotal y total
        const subtotal = (factura.s_internet || 0) + 
                        (factura.s_television || 0) + 
                        (factura.s_interes || 0) + 
                        (factura.s_reconexion || 0) + 
                        (factura.s_descuento || 0) + 
                        (factura.s_varios || 0) + 
                        (factura.s_publicidad || 0);
        
        const total = subtotal + (factura.s_iva || 0) + (factura.saldo_anterior || 0);

        await Database.query(
          'UPDATE facturas SET subtotal = ?, total = ?, updated_at = NOW() WHERE id = ?',
          [subtotal, total, factura.id]
        );
        
        actualizadas++;
      }

      res.json({
        success: true,
        data: {
          facturas_procesadas: facturas.length,
          facturas_actualizadas: actualizadas
        },
        message: `${actualizadas} facturas recalculadas exitosamente`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error recalculando totales:', error);
      res.status(500).json({
        success: false,
        message: 'Error recalculando totales de facturas',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/facturas/utilidades/actualizar-estados
 * @desc Actualizar estados de facturas vencidas
 * @access Administrador
 */
router.post('/utilidades/actualizar-estados',
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { Database } = require('../models/Database');
      
      // Marcar facturas vencidas
      const resultadoVencidas = await Database.query(`
        UPDATE facturas 
        SET estado = 'vencida', updated_at = NOW()
        WHERE estado = 'pendiente' 
        AND fecha_vencimiento < CURDATE()
        AND activo = '1'
      `);

      res.json({
        success: true,
        data: {
          facturas_marcadas_vencidas: resultadoVencidas.affectedRows || 0
        },
        message: 'Estados de facturas actualizados',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error actualizando estados:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando estados de facturas',
        error: error.message
      });
    }
  }
);

// ==========================================
// MIDDLEWARE DE LOGGING Y AUDITORÍA
// ==========================================

/**
 * Middleware para registrar acciones importantes en facturas
 */
const auditarAccionFactura = (accion) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (data && data.success) {
        const idParam = parseInt(req.params?.id) || null;
        audit({
          usuario_id: req.user?.id || null,
          accion,
          tabla: 'facturas',
          registro_id: idParam,
          datos_nuevos: req.body || null,
          ...metaFromReq(req),
        });
      }
      return originalJson(data);
    };
    next();
  };
};

// Aplicar auditoría a rutas críticas
router.use('/automatica/*', auditarAccionFactura('FACTURACION_AUTOMATICA'));
router.use('/:id/pagar', auditarAccionFactura('PAGO_FACTURA'));
router.use('/:id/anular', auditarAccionFactura('ANULAR_FACTURA'));

// ==========================================
// MIDDLEWARE DE VALIDACIONES ESPECÍFICAS
// ==========================================



/**
 * Validaciones específicas para facturación automática
 */
const validarFacturacionAutomatica = [
  body('fecha_referencia')
    .optional()
    .isISO8601()
    .withMessage('Fecha de referencia debe ser una fecha válida'),
  
  body('incluir_morosos')
    .optional()
    .isBoolean()
    .withMessage('incluir_morosos debe ser un booleano'),
  
  body('solo_activos')
    .optional()
    .isBoolean()
    .withMessage('solo_activos debe ser un booleano'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en facturación automática',
        errors: errors.array()
      });
    }
    next();
  }
];

// Aplicar validaciones a rutas automáticas
router.use('/automatica/generar-mensual', validarFacturacionAutomatica);

// ==========================================
// RUTAS DE INTEGRACIÓN Y WEBHOOKS
// ==========================================

/**
 * @route POST /api/v1/facturas/webhook/pago-exitoso
 * @desc Webhook para procesar pagos exitosos desde pasarelas de pago
 * @access Sistema (con token especial)
 */
router.post('/webhook/pago-exitoso',
  // Middleware especial para webhooks (sin autenticación de usuario)
  (req, res, next) => {
    const webhookToken = req.headers['x-webhook-token'];
    const expectedToken = process.env.WEBHOOK_TOKEN || 'webhook_secret_token';
    
    if (webhookToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de webhook inválido'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { 
        numero_factura, 
        metodo_pago, 
        referencia_pago, 
        monto, 
        fecha_pago,
        banco_id 
      } = req.body;

      if (!numero_factura || !metodo_pago || !monto) {
        return res.status(400).json({
          success: false,
          message: 'Datos de pago incompletos'
        });
      }

      const { Database } = require('../models/Database');
      
      // Buscar factura por número
      const factura = await Database.query(
        'SELECT * FROM facturas WHERE numero_factura = ? AND activo = "1"',
        [numero_factura]
      );

      if (factura.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      if (factura[0].estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: 'La factura no está pendiente de pago'
        });
      }

      // Verificar monto
      if (Math.abs(parseFloat(monto) - parseFloat(factura[0].total)) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'El monto no coincide con el total de la factura'
        });
      }

      // Marcar como pagada
      const Factura = require('../models/factura');
      const facturaActualizada = await Factura.marcarComoPagada(factura[0].id, {
        fecha_pago: fecha_pago || new Date().toISOString().split('T')[0],
        metodo_pago,
        referencia_pago,
        banco_id
      });

      console.log(`💳 Pago procesado vía webhook: ${numero_factura} - ${monto}`);

      res.json({
        success: true,
        data: facturaActualizada,
        message: 'Pago procesado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error procesando webhook de pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando pago',
        error: error.message
      });
    }
  }
);

// ==========================================
// MIDDLEWARE DE RATE LIMITING
// ==========================================

const rateLimit = require('express-rate-limit');

// Rate limiting para facturación automática masiva
const facturacionMasivaLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 intentos por hora
  message: {
    success: false,
    message: 'Demasiados intentos de facturación masiva. Intenta de nuevo en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use('/automatica/generar-mensual', facturacionMasivaLimit);

// Rate limiting para reportes pesados
const reportesLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 reportes por 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes de reportes. Intenta de nuevo en 15 minutos.'
  }
});

router.use('/reportes/*', reportesLimit);

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================

router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de facturas:', error);
  
  // Error de validación de MongoDB/MySQL
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un registro con estos datos',
      error: 'Entrada duplicada'
    });
  }

  // Error de conexión a base de datos
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Servicio de base de datos no disponible',
      error: 'Error de conexión'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

module.exports = router;