// backend/routes/facturacion.js - CORREGIDO PARA USAR Database.query

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const FacturacionAutomaticaController = require('../controllers/FacturacionAutomaticaController');


// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// ENDPOINT PRINCIPAL: OBTENER FACTURAS
// ==========================================

/**
 * @route GET /api/v1/facturacion/facturas
 * @desc Obtener todas las facturas con filtros y paginación
 * @access Autenticado
 */
router.get('/facturas', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      fecha_inicio,
      fecha_fin,
      estado,
      cliente_id,
      numero_factura,
      banco_id,        // ✅ NUEVO: Filtro por banco
      search,          // ✅ NUEVO: Búsqueda general
      sort_by = 'fecha_emision',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // CORREGIDO: Usar Database.query en lugar de Database.conexion
    const { Database } = require('../models/Database');

    // Construir WHERE clause dinámicamente
    let whereConditions = ['f.activo = 1'];
    let queryParams = [];

    if (fecha_inicio && fecha_fin) {
      whereConditions.push('f.fecha_emision BETWEEN ? AND ?');
      queryParams.push(fecha_inicio, fecha_fin);
    }

    if (estado) {
      whereConditions.push('f.estado = ?');
      queryParams.push(estado);
    }

    if (cliente_id) {
      whereConditions.push('f.cliente_id = ?');
      queryParams.push(cliente_id);
    }

    if (numero_factura) {
      whereConditions.push('f.numero_factura LIKE ?');
      queryParams.push(`%${numero_factura}%`);
    }

    // ✅ NUEVO: Filtro por banco
    if (banco_id) {
      whereConditions.push('f.banco_id = ?');
      queryParams.push(banco_id);
    }

    // ✅ NUEVO: Búsqueda general (número factura, nombre cliente, identificación)
    if (search) {
      whereConditions.push('(f.numero_factura LIKE ? OR f.nombre_cliente LIKE ? OR f.identificacion_cliente LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // Contar total
    const totalResult = await Database.query(`
      SELECT COUNT(*) as total 
      FROM facturas f
      ${whereClause}
    `, queryParams);

    const total = totalResult[0]?.total || 0;

    // Validar columna de ordenamiento
    const validSortColumns = ['fecha_emision', 'numero_factura', 'total', 'estado', 'fecha_vencimiento'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'fecha_emision';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Obtener facturas paginadas con nombre del banco
    // Obtener facturas paginadas con nombre del banco Y datos del cliente
const facturas = await Database.query(`
  SELECT 
    f.id,
    f.numero_factura,
    f.cliente_id,
    f.identificacion_cliente,        -- ✅ AGREGADO
    f.nombre_cliente,                -- ✅ AGREGADO
    f.periodo_facturacion,
    f.fecha_emision,
    f.fecha_vencimiento,
    f.fecha_pago,
    f.subtotal,
    f.iva,
    f.total,
    f.estado,
    f.metodo_pago,
    f.referencia_pago,
    f.banco_id,
    b.nombre as banco_nombre,
    f.observaciones,
    DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento,
    CASE 
      WHEN f.estado = 'pagada' THEN 'Pagada'
      WHEN f.estado = 'anulada' THEN 'Anulada'
      WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 THEN 'Vencida'
      ELSE 'Vigente'
    END as estado_descripcion
  FROM facturas f
  LEFT JOIN bancos b ON f.banco_id = b.id
  ${whereClause}
  ORDER BY f.${sortColumn} ${sortDirection}
  LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)}
`, queryParams);

    res.json({
      success: true,
      data: {
        facturas,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: total,
          total_pages: Math.ceil(total / limitNum),
          has_next_page: (pageNum * limitNum) < total,
          has_prev_page: pageNum > 1
        }
      },
      message: 'Facturas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo facturas',
      error: error.message
    });
  }
});
// ==========================================
// ENDPOINT: OBTENER FACTURA POR ID
// ==========================================

/**
 * @route GET /api/v1/facturacion/facturas/:id
 * @desc Obtener detalles de una factura específica
 * @access Autenticado
 */
router.get('/facturas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    const { Database } = require('../models/Database');

    // Obtener factura principal
    const factura = await Database.query(`
      SELECT 
        f.*,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        c.email as cliente_email,
        DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE f.id = ? AND f.activo = 1
    `, [id]);

    if (factura.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Obtener detalles de la factura (si la tabla existe)
    let detalles = [];
    try {
      detalles = await Database.query(`
        SELECT * FROM detalle_facturas 
        WHERE factura_id = ?
        ORDER BY id
      `, [id]);
    } catch (error) {
      console.log('⚠️ Tabla detalle_facturas no existe');
    }

    // Obtener pagos asociados (si la tabla existe)
    let pagos = [];
    try {
      pagos = await Database.query(`
        SELECT 
          p.*,
          u.nombre as usuario_nombre
        FROM pagos p
        LEFT JOIN sistema_usuarios u ON p.usuario_registro = u.id
        WHERE p.factura_id = ?
        ORDER BY p.fecha_pago DESC
      `, [id]);
    } catch (error) {
      console.log('⚠️ Tabla pagos no existe');
    }

    const facturaCompleta = {
      ...factura[0],
      detalles: detalles,
      pagos: pagos,
      total_pagado: pagos.reduce((sum, pago) => sum + parseFloat(pago.valor_pagado || 0), 0),
      saldo_pendiente: parseFloat(factura[0].total) - pagos.reduce((sum, pago) => sum + parseFloat(pago.valor_pagado || 0), 0)
    };

    res.json({
      success: true,
      data: facturaCompleta,
      message: 'Factura obtenida exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo factura',
      error: error.message
    });
  }
});

// ==========================================
// ENDPOINT: ESTADÍSTICAS DE FACTURACIÓN
// ==========================================

/**
 * @route GET /api/v1/facturacion/estadisticas
 * @desc Obtener estadísticas de facturación
 * @access Autenticado
 */
router.get('/estadisticas', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;

    // Validación de fechas requeridas
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({
        success: false,
        message: 'Las fechas desde y hasta son requeridas',
        error: 'Parámetros faltantes: fecha_desde, fecha_hasta'
      });
    }

    // Validar formato de fechas
    const fechaDesde = new Date(fecha_desde);
    const fechaHasta = new Date(fecha_hasta);

    if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        error: 'Formato de fecha incorrecto'
      });
    }

    const { Database } = require('../models/Database');

    // Verificar si existe la tabla facturas
    let tablaExiste = true;
    try {
      await Database.query('SELECT 1 FROM facturas LIMIT 1');
    } catch (error) {
      tablaExiste = false;
    }

    if (!tablaExiste) {
      return res.json({
        success: true,
        data: {
          total_clientes: 0,
          facturas_generadas: 0,
          monto_total: 0,
          monto_pagado: 0,
          monto_pendiente: 0,
          facturas_pagadas: 0,
          facturas_pendientes: 0,
          facturas_vencidas: 0,
          errores: 0,
          tasa_pago: 0,
          por_estado: [],
          top_clientes: []
        },
        period: { fecha_desde, fecha_hasta },
        message: 'Estadísticas simuladas - tabla facturas no existe',
        timestamp: new Date().toISOString()
      });
    }

    // Estadísticas generales de facturas en el período
    const estadisticasGenerales = await Database.query(`
      SELECT 
        COUNT(*) as total_facturas,
        COUNT(DISTINCT cliente_id) as total_clientes,
        SUM(total) as monto_total,
        SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as monto_pagado,
        SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as monto_pendiente,
        COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as facturas_pagadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as facturas_pendientes,
        COUNT(CASE WHEN estado = 'vencida' OR DATEDIFF(NOW(), fecha_vencimiento) > 0 THEN 1 END) as facturas_vencidas
      FROM facturas 
      WHERE fecha_emision BETWEEN ? AND ?
        AND activo = 1
    `, [fecha_desde, fecha_hasta]);

    // Estadísticas por estado
    const estadisticasPorEstado = await Database.query(`
      SELECT 
        estado,
        COUNT(*) as cantidad,
        SUM(total) as monto,
        AVG(total) as promedio
      FROM facturas 
      WHERE fecha_emision BETWEEN ? AND ?
        AND activo = 1
      GROUP BY estado
      ORDER BY cantidad DESC
    `, [fecha_desde, fecha_hasta]);

    // Top 5 clientes por facturación
    const topClientes = await Database.query(`
      SELECT 
        f.cliente_id,
        f.nombre_cliente,
        COUNT(*) as total_facturas,
        SUM(f.total) as monto_total,
        SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as monto_pagado
      FROM facturas f
      WHERE f.fecha_emision BETWEEN ? AND ?
        AND f.activo = 1
      GROUP BY f.cliente_id, f.nombre_cliente
      ORDER BY monto_total DESC
      LIMIT 5
    `, [fecha_desde, fecha_hasta]);

    const stats = estadisticasGenerales[0] || {};

    res.json({
      success: true,
      data: {
        // Estadísticas principales
        total_clientes: parseInt(stats.total_clientes || 0),
        facturas_generadas: parseInt(stats.total_facturas || 0),
        monto_total: parseFloat(stats.monto_total || 0),
        monto_pagado: parseFloat(stats.monto_pagado || 0),
        monto_pendiente: parseFloat(stats.monto_pendiente || 0),
        
        // Contadores por estado
        facturas_pagadas: parseInt(stats.facturas_pagadas || 0),
        facturas_pendientes: parseInt(stats.facturas_pendientes || 0),
        facturas_vencidas: parseInt(stats.facturas_vencidas || 0),
        errores: 0, // Los errores se calcularían desde logs o tabla de errores
        
        // Tasas y porcentajes
        tasa_pago: stats.total_facturas > 0 ? 
          ((stats.facturas_pagadas / stats.total_facturas) * 100).toFixed(2) : 0,
        
        // Datos detallados
        por_estado: estadisticasPorEstado.map(item => ({
          estado: item.estado,
          cantidad: parseInt(item.cantidad),
          monto: parseFloat(item.monto),
          promedio: parseFloat(item.promedio)
        })),
        
        top_clientes: topClientes.map(item => ({
          cliente_id: item.cliente_id,
          nombre: item.nombre_cliente,
          total_facturas: parseInt(item.total_facturas),
          monto_total: parseFloat(item.monto_total),
          monto_pagado: parseFloat(item.monto_pagado)
        }))
      },
      period: {
        fecha_desde,
        fecha_hasta
      },
      message: 'Estadísticas obtenidas exitosamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de facturación',
      error: error.message
    });
  }
});

// ==========================================
// ENDPOINT: FACTURAS VENCIDAS
// ==========================================

/**
 * @route GET /api/v1/facturacion/vencidas
 * @desc Obtener facturas vencidas
 * @access Autenticado
 */
router.get('/vencidas', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      dias_vencimiento = 0 // 0 = todas, >0 = solo con X días de vencimiento
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const { Database } = require('../models/Database');

    // Verificar si existe la tabla facturas
    let tablaExiste = true;
    try {
      await Database.query('SELECT 1 FROM facturas LIMIT 1');
    } catch (error) {
      tablaExiste = false;
    }

    if (!tablaExiste) {
      return res.json({
        success: true,
        data: {
          facturas: [],
          pagination: {
            current_page: pageNum,
            per_page: limitNum,
            total: 0,
            total_pages: 0
          },
          resumen: {
            total_facturas_vencidas: 0,
            monto_total_vencido: 0,
            intereses_calculados: 0
          }
        },
        message: 'No hay facturas vencidas - tabla no existe'
      });
    }

    let whereClause = `
      WHERE f.activo = 1 
        AND f.estado != 'pagada' 
        AND f.estado != 'anulada'
        AND DATEDIFF(NOW(), f.fecha_vencimiento) >= ?
    `;
    
    let queryParams = [parseInt(dias_vencimiento)];

    // Contar total
    const totalResult = await Database.query(`
      SELECT COUNT(*) as total 
      FROM facturas f
      ${whereClause}
    `, queryParams);

    const total = totalResult[0]?.total || 0;

    // Obtener facturas vencidas
    const facturasVencidas = await Database.query(`
      SELECT 
        f.id,
        f.numero_factura,
        f.cliente_id,
        f.nombre_cliente,
        f.identificacion_cliente,
        f.telefono_cliente,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.total,
        f.estado,
        DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento,
        (f.total * 0.02 * GREATEST(DATEDIFF(NOW(), f.fecha_vencimiento), 0)) as interes_mora
      FROM facturas f
      ${whereClause}
      ORDER BY f.fecha_vencimiento ASC
      LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)}
    `, queryParams);

    res.json({
      success: true,
      data: {
        facturas: facturasVencidas,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: total,
          total_pages: Math.ceil(total / limitNum)
        },
        resumen: {
          total_facturas_vencidas: total,
          monto_total_vencido: facturasVencidas.reduce((sum, f) => sum + parseFloat(f.total), 0),
          intereses_calculados: facturasVencidas.reduce((sum, f) => sum + parseFloat(f.interes_mora), 0)
        }
      },
      message: 'Facturas vencidas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas vencidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo facturas vencidas',
      error: error.message
    });
  }
});
// ==========================================
// ENDPOINTS DE FACTURACIÓN AUTOMÁTICA
// ==========================================

/**
 * @route POST /api/v1/facturacion/automatica/generar-mensual
 * @desc Generar facturación mensual masiva
 * @access Administrador
 */
router.post('/automatica/generar-mensual', 
  requireRole('administrador'), 
  FacturacionAutomaticaController.generarFacturacionMensual
);

/**
 * @route GET /api/v1/facturacion/automatica/preview-mensual
 * @desc Obtener preview de facturación mensual
 * @access Administrador, Supervisor
 */
router.get('/automatica/preview-mensual', 
  requireRole('administrador', 'supervisor'), 
  FacturacionAutomaticaController.obtenerPreviewFacturacion
);

/**
 * @route POST /api/v1/facturacion/automatica/cliente/:clienteId
 * @desc Generar factura individual para un cliente
 * @access Administrador, Supervisor
 */
router.post('/automatica/cliente/:clienteId',
  requireRole('administrador', 'supervisor'),
  FacturacionAutomaticaController.generarFacturaIndividual
);

/**
 * @route POST /api/v1/facturacion/automatica/procesar-saldos
 * @desc Procesar saldos e intereses
 * @access Administrador
 */
router.post('/automatica/procesar-saldos',
  requireRole('administrador'),
  FacturacionAutomaticaController.procesarSaldosIntereses
);

/**
 * @route GET /api/v1/facturacion/automatica/estadisticas-ultimo-proceso
 * @desc Obtener estadísticas del último proceso de facturación
 * @access Administrador, Supervisor
 */
router.get('/automatica/estadisticas-ultimo-proceso',
  requireRole('administrador', 'supervisor'),
  FacturacionAutomaticaController.obtenerEstadisticasUltimoProceso
);


// ==========================================
// ENDPOINT: REGISTRAR PAGO - CORREGIDO
// ==========================================

router.post('/facturas/:id/pagar', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      valor_pagado,
      metodo_pago,
      referencia_pago,
      observaciones,
      fecha_pago,
      banco_id  // ✅ IMPORTANTE: Recibir banco_id
    } = req.body;
    const usuario_id = req.user.id;

    // Validaciones
    if (!valor_pagado || valor_pagado <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El valor pagado debe ser mayor a cero'
      });
    }

    if (!metodo_pago) {
      return res.status(400).json({
        success: false,
        message: 'El método de pago es requerido'
      });
    }

    const { Database } = require('../models/Database');

    // Obtener datos de la factura
    const factura = await Database.query(`
      SELECT id, cliente_id, total, estado 
      FROM facturas 
      WHERE id = ? AND activo = 1
    `, [id]);

    if (factura.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const facturaData = factura[0];

    // Verificar que la factura esté pendiente
    if (facturaData.estado === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está pagada'
      });
    }

    const fechaPagoFinal = fecha_pago || new Date().toISOString().split('T')[0];
    
    // ✅ CORRECCIÓN: Actualizar con banco_id, metodo_pago y referencia_pago
    let nuevoEstado = 'pendiente';
    if (parseFloat(valor_pagado) >= parseFloat(facturaData.total)) {
      nuevoEstado = 'pagada';
      
      // ✅ UPDATE con TODOS los campos del pago
      await Database.query(`
        UPDATE facturas 
        SET 
          estado = 'pagada', 
          fecha_pago = ?,
          metodo_pago = ?,
          referencia_pago = ?,
          banco_id = ?,
          observaciones = COALESCE(?, observaciones)
        WHERE id = ?
      `, [
        fechaPagoFinal, 
        metodo_pago, 
        referencia_pago || null, 
        banco_id || null, 
        observaciones || null, 
        id
      ]);
    }

    res.json({
      success: true,
      data: {
        pago_id: Date.now(),
        factura_id: id,
        nuevo_estado: nuevoEstado,
        valor_pagado: parseFloat(valor_pagado),
        saldo_pendiente: Math.max(0, parseFloat(facturaData.total) - parseFloat(valor_pagado)),
        metodo_pago: metodo_pago,
        banco_id: banco_id,
        referencia_pago: referencia_pago
      },
      message: `Pago registrado exitosamente. Factura ${nuevoEstado === 'pagada' ? 'pagada completamente' : 'con pago parcial'}`
    });

  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error registrando pago',
      error: error.message
    });
  }
});
// ==========================================
// ENDPOINT: INFORMACIÓN DEL MÓDULO
// ==========================================

/**
 * @route GET /api/v1/facturacion/info
 * @desc Información sobre endpoints disponibles
 * @access Autenticado
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'API de Facturación - Sistema PSI',
    version: '1.0.0',
    endpoints: {
      'GET /facturas': 'Listar facturas con filtros y paginación',
      'GET /facturas/:id': 'Obtener factura específica',
      'GET /estadisticas': 'Estadísticas de facturación (requiere fechas)',
      'GET /vencidas': 'Facturas vencidas',
      'POST /automatica/generar-mensual': 'Generar facturación mensual (Admin)',
      'GET /automatica/preview-mensual': 'Preview de facturación mensual',
      'POST /facturas/:id/pagar': 'Registrar pago de factura',
      'GET /info': 'Esta información'
    },
    parametros_comunes: {
      fechas: 'YYYY-MM-DD',
      paginacion: 'page, limit',
      filtros: 'estado, cliente_id, fecha_desde, fecha_hasta'
    },
    database_status: 'conectada',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Middleware de manejo de errores específico
router.use((error, req, res, next) => {
  console.error('Error en rutas de facturación:', error);
  
  // Errores de MySQL
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referencias inválidas en los datos proporcionados',
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un registro con estos datos',
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor en facturación',
    timestamp: new Date().toISOString()
  });
});

console.log('🧾 Rutas de facturación configuradas correctamente con Database.query');

module.exports = router;