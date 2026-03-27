// backend/controllers/FacturasController.js - CORREGIDO PARA USAR Database.query

const { Database } = require('../models/Database');
const Factura = require('../models/factura');
const FacturaPDFGenerator = require('../utils/pdfGenerator');
const EstadoClienteService = require('../services/EstadoClienteService');
// Importaciones opcionales con manejo de errores
let FacturacionAutomaticaService;
let PDFGenerator;

try {
  FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
  console.log('✅ FacturacionAutomaticaService cargado en FacturasController');
} catch (error) {
  console.log('⚠️ FacturacionAutomaticaService no disponible en FacturasController');
}

try {
  PDFGenerator = require('../utils/pdfGenerator');
  console.log('✅ PDFGenerator cargado en FacturasController');
} catch (error) {
  console.log('⚠️ PDFGenerator no disponible en FacturasController');
}

class FacturasController {

  // ==========================================
  // MÉTODOS PRINCIPALES REQUERIDOS POR LAS RUTAS
  // ==========================================

 /**
 * Obtener todas las facturas con filtros y paginación
 * CORREGIDO: Agregado filtro de búsqueda general
 */
static async obtenerTodas(req, res) {
  try {
    const { 
      page = 1, 
      limit = 20,
      fecha_desde,
      fecha_hasta,
      estado,
      cliente_id,
      numero_factura,
      search,           // ✅ NUEVO: parámetro de búsqueda general
      ruta,            // ✅ NUEVO: filtro por ruta
      monto_min,       // ✅ NUEVO: monto mínimo
      monto_max,       // ✅ NUEVO: monto máximo
      sort_by = 'fecha_emision',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('📋 [FacturasController] Obteniendo facturas con parámetros:', {
      page: pageNum,
      limit: limitNum,
      fecha_desde,
      fecha_hasta,
      estado,
      cliente_id,
      numero_factura,
      search,
      ruta,
      monto_min,
      monto_max
    });

    // Verificar si existe la tabla facturas
    let tablaExiste = true;
    try {
      await Database.query('SELECT 1 FROM facturas LIMIT 1');
    } catch (error) {
      tablaExiste = false;
      console.log('⚠️ Tabla facturas no existe');
    }

    if (!tablaExiste) {
      return res.json({
        success: true,
        data: {
          facturas: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        },
        message: 'Tabla facturas no existe - retornando datos vacíos'
      });
    }

    // Validar columna de ordenamiento
    const validSortColumns = ['fecha_emision', 'numero_factura', 'total', 'estado', 'fecha_vencimiento', 'nombre_cliente', 'id'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'fecha_emision';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // ✅ CONSTRUCCIÓN DINÁMICA DE QUERY
    let query = `
  SELECT
    f.id,
    f.numero_factura,
    f.cliente_id,
    f.identificacion_cliente,
    f.nombre_cliente,
    f.periodo_facturacion,
    f.fecha_emision,
    f.fecha_vencimiento,
    f.fecha_desde,
    f.fecha_hasta,
    f.fecha_pago,
    f.internet,
    f.television,
    f.saldo_anterior,
    f.interes,
    f.reconexion,
    f.descuento,
    f.varios,
    f.publicidad,
    f.subtotal,
    f.iva,
    f.total,
    f.estado,
    f.metodo_pago,
    f.referencia_pago,
    f.banco_id,
    f.ruta,
    f.observaciones,
    f.created_at,
    f.updated_at,

    -- Información adicional del cliente desde tabla clientes
    c.telefono as cliente_telefono,
    c.direccion as cliente_direccion,
    c.correo as cliente_email,
    c.estrato as cliente_estrato,

    -- Nota de Crédito (si existe)
    nc.id as nota_credito_id,
    nc.numero_nc,

    DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencido,
    CASE
      WHEN f.estado = 'pagada' THEN 'Pagada'
      WHEN f.estado = 'anulada' THEN 'Anulada'
      WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' THEN 'Vencida'
      ELSE 'Pendiente'
    END as estado_descripcion
  FROM facturas f
  LEFT JOIN clientes c ON f.cliente_id = c.id
  LEFT JOIN notas_credito nc ON f.id = nc.factura_id
      WHERE f.activo = 1
    `;

    const params = [];

    // ✅ FILTRO DE BÚSQUEDA GENERAL (NUEVO)
    if (search && search.trim()) {
      query += ` AND (
        f.numero_factura LIKE ? OR 
        f.nombre_cliente LIKE ? OR 
        f.identificacion_cliente LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      console.log('🔍 Aplicando búsqueda general:', search);
    }

    // Filtro por rango de fechas
    if (fecha_desde && fecha_hasta) {
      query += ' AND f.fecha_emision BETWEEN ? AND ?';
      params.push(fecha_desde, fecha_hasta);
    }

    // Filtro por estado
    if (estado) {
      query += ' AND f.estado = ?';
      params.push(estado);
    }

    // Filtro por cliente
    if (cliente_id) {
      query += ' AND f.cliente_id = ?';
      params.push(cliente_id);
    }

    // Filtro por número de factura específico
    if (numero_factura) {
      query += ' AND f.numero_factura LIKE ?';
      params.push(`%${numero_factura}%`);
    }

    // ✅ FILTRO POR RUTA (NUEVO)
    if (ruta && ruta.trim()) {
      query += ' AND f.ruta LIKE ?';
      params.push(`%${ruta.trim()}%`);
      console.log('📍 Aplicando filtro de ruta:', ruta);
    }

    // ✅ FILTRO POR RANGO DE MONTOS (NUEVO)
    if (monto_min) {
      query += ' AND f.total >= ?';
      params.push(parseFloat(monto_min));
      console.log('💰 Aplicando monto mínimo:', monto_min);
    }

    if (monto_max) {
      query += ' AND f.total <= ?';
      params.push(parseFloat(monto_max));
      console.log('💰 Aplicando monto máximo:', monto_max);
    }

    // Contar total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const totalResult = await Database.query(countQuery, params);
    const total = totalResult[0]?.total || 0;

    console.log(`📊 Total de facturas encontradas: ${total}`);

    // Agregar ordenamiento y paginación
    query += ` ORDER BY f.${sortColumn} ${sortDirection} LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)}`;
    
    console.log('🔍 Query final construida');

    // Ejecutar query principal
    const facturas = await Database.query(query, params);

    // Calcular paginación
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`✅ Facturas obtenidas: ${facturas.length}/${total} total, página ${pageNum}/${totalPages}`);

    res.json({
      success: true,
      data: {
        facturas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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
}

  /**
   * Obtener una factura por ID
   */
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura inválido'
        });
      }

      // Verificar si existe la tabla facturas
      let tablaExiste = true;
      try {
        await Database.query('SELECT 1 FROM facturas LIMIT 1');
      } catch (error) {
        tablaExiste = false;
      }

      if (!tablaExiste) {
        return res.status(404).json({
          success: false,
          message: 'Tabla facturas no existe'
        });
      }

      // Obtener factura principal
      const factura = await Database.query(`
        SELECT 
          f.*,
          c.telefono as cliente_telefono_adicional,
          c.direccion as cliente_direccion_adicional,
          c.correo as cliente_email_adicional,
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

      // Obtener detalles de la factura (si existen)
      let detalles = [];
      try {
        detalles = await Database.query(`
          SELECT * FROM detalle_facturas 
          WHERE factura_id = ?
          ORDER BY id
        `, [id]);
      } catch (error) {
        console.log('⚠️ No se pudieron obtener detalles de factura (tabla no existe)');
      }

      // Obtener pagos asociados (si existen)
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
        console.log('⚠️ No se pudieron obtener pagos de factura (tabla no existe)');
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
  }

  /**
   * Buscar facturas con diferentes criterios
   */
  static async buscar(req, res) {
    try {
      const { 
        q = '', 
        tipo = 'numero', // numero, cliente, identificacion
        page = 1, 
        limit = 20 
      } = req.query;

      if (!q.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
      }

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
              current_page: parseInt(page),
              per_page: parseInt(limit),
              total: 0,
              total_pages: 0
            },
            search_params: { q, tipo }
          },
          message: 'Tabla facturas no existe'
        });
      }

      let whereClause = 'WHERE f.activo = 1 AND ';
      let queryParams = [];

      switch (tipo) {
        case 'numero':
          whereClause += 'f.numero_factura LIKE ?';
          queryParams.push(`%${q}%`);
          break;
        case 'cliente':
          whereClause += 'f.nombre_cliente LIKE ?';
          queryParams.push(`%${q}%`);
          break;
        case 'identificacion':
          whereClause += 'f.identificacion_cliente LIKE ?';
          queryParams.push(`%${q}%`);
          break;
        default:
          whereClause += '(f.numero_factura LIKE ? OR f.nombre_cliente LIKE ? OR f.identificacion_cliente LIKE ?)';
          queryParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Contar resultados
      const countResult = await Database.query(`
        SELECT COUNT(*) as total FROM facturas f ${whereClause}
      `, queryParams);

      const total = countResult[0]?.total || 0;

      // Buscar facturas
      const facturas = await Database.query(`
        SELECT 
          f.id,
          f.numero_factura,
          f.cliente_id,
          f.identificacion_cliente,
          f.nombre_cliente,
          f.fecha_emision,
          f.fecha_vencimiento,
          f.total,
          f.estado,
          CASE 
            WHEN f.estado = 'pagada' THEN 'Pagada'
            WHEN f.estado = 'anulada' THEN 'Anulada'
            WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' THEN 'Vencida'
            ELSE 'Vigente'
          END as estado_descripcion
        FROM facturas f
        ${whereClause}
        ORDER BY f.fecha_emision DESC
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
            total_pages: Math.ceil(total / limitNum)
          },
          search_params: { q, tipo }
        },
        message: `Se encontraron ${total} facturas`
      });

    } catch (error) {
      console.error('❌ Error buscando facturas:', error);
      res.status(500).json({
        success: false,
        message: 'Error en búsqueda de facturas',
        error: error.message
      });
    }
  }

 /**
 * Obtener estadísticas de facturas
 * GET /api/v1/facturas/stats
 */
static async obtenerEstadisticas(req, res) {
  try {
    console.log('📊 [FacturasController] Obteniendo estadísticas de facturas');
    
    const { 
      fecha_desde, 
      fecha_hasta,
      cliente_id 
    } = req.query;

    // Verificar si existe la tabla facturas
    let tablaExiste = true;
    try {
      await Database.query('SELECT 1 FROM facturas LIMIT 1');
    } catch (error) {
      tablaExiste = false;
    }

    if (!tablaExiste) {
      console.log('⚠️ Tabla facturas no existe');
      return res.json({
        success: true,
        data: {
          total: 0,
          pendientes: 0,
          pagadas: 0,
          vencidas: 0,
          anuladas: 0,
          valor_total: 0,
          valor_pendiente: 0,
          valor_pagado: 0,
          valor_vencido: 0,
          promedio_factura: 0,
          facturas_mora: 0
        },
        message: 'Tabla facturas no existe'
      });
    }

    // ✅ CONSTRUCCIÓN DINÁMICA DE FILTROS
    let whereClause = 'WHERE f.activo = 1';
    let queryParams = [];

    // Solo aplicar filtro de fecha si se proporcionan AMBAS fechas
    if (fecha_desde && fecha_hasta) {
      whereClause += ' AND f.fecha_emision BETWEEN ? AND ?';
      queryParams.push(fecha_desde, fecha_hasta);
      console.log('📅 Aplicando filtro de fechas:', { fecha_desde, fecha_hasta });
    } else {
      console.log('📊 Sin filtro de fechas - mostrando TODAS las facturas');
    }

    // Filtro opcional por cliente
    if (cliente_id) {
      whereClause += ' AND f.cliente_id = ?';
      queryParams.push(cliente_id);
      console.log('👤 Aplicando filtro de cliente:', cliente_id);
    }

    // ✅ QUERY PRINCIPAL - Estadísticas completas
    const estadisticas = await Database.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT f.cliente_id) as total_clientes,
        
        -- Contadores por estado
        SUM(CASE WHEN f.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN f.estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
        SUM(CASE WHEN f.estado = 'vencida' THEN 1 ELSE 0 END) as vencidas,
        SUM(CASE WHEN f.estado = 'anulada' THEN 1 ELSE 0 END) as anuladas,
        
        -- Montos por estado
        SUM(f.total) as valor_total,
        SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as valor_pagado,
        SUM(CASE WHEN f.estado IN ('pendiente', 'vencida') THEN f.total ELSE 0 END) as valor_pendiente,
        SUM(CASE WHEN f.estado = 'vencida' THEN f.total ELSE 0 END) as valor_vencido,
        
        -- Promedio y mora
        AVG(f.total) as promedio_factura,
        SUM(CASE WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' AND f.estado != 'anulada' THEN 1 ELSE 0 END) as facturas_mora
      FROM facturas f
      ${whereClause}
    `, queryParams);

    const stats = estadisticas[0] || {};

    console.log('✅ [FacturasController] Estadísticas calculadas:', {
      total: stats.total,
      pendientes: stats.pendientes,
      pagadas: stats.pagadas,
      vencidas: stats.vencidas
    });

    // ✅ RESPUESTA EN FORMATO ESPERADO POR EL FRONTEND
    res.json({
      success: true,
      data: {
        // Formato principal que espera el frontend
        total: parseInt(stats.total) || 0,
        pendientes: parseInt(stats.pendientes) || 0,
        pagadas: parseInt(stats.pagadas) || 0,
        vencidas: parseInt(stats.vencidas) || 0,
        anuladas: parseInt(stats.anuladas) || 0,
        valor_total: parseFloat(stats.valor_total) || 0,
        valor_pendiente: parseFloat(stats.valor_pendiente) || 0,
        valor_pagado: parseFloat(stats.valor_pagado) || 0,
        valor_vencido: parseFloat(stats.valor_vencido) || 0,
        promedio_factura: parseFloat(stats.promedio_factura) || 0,
        facturas_mora: parseInt(stats.facturas_mora) || 0,
        
        // Formato adicional (compatibilidad con otros componentes)
        resumen: {
          total_facturas: parseInt(stats.total) || 0,
          total_clientes: parseInt(stats.total_clientes) || 0,
          monto_total: parseFloat(stats.valor_total) || 0,
          monto_pagado: parseFloat(stats.valor_pagado) || 0,
          monto_pendiente: parseFloat(stats.valor_pendiente) || 0,
          monto_vencido: parseFloat(stats.valor_vencido) || 0,
          promedio_factura: parseFloat(stats.promedio_factura) || 0
        },
        por_estado: {
          pagadas: parseInt(stats.pagadas) || 0,
          pendientes: parseInt(stats.pendientes) || 0,
          vencidas: parseInt(stats.vencidas) || 0,
          anuladas: parseInt(stats.anuladas) || 0
        }
      },
      message: 'Estadísticas obtenidas exitosamente'
    });

  } catch (error) {
    console.error('❌ [FacturasController] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
}
  /**
   * Obtener facturas vencidas
   */
  static async obtenerVencidas(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20,
        dias_vencimiento = 0 
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

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
          message: 'Tabla facturas no existe'
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
          f.saldo_anterior,
          f.intereses_mora,
          DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento,
          (f.total * 0.02 * GREATEST(DATEDIFF(NOW(), f.fecha_vencimiento), 0)) as interes_calculado
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
            intereses_calculados: facturasVencidas.reduce((sum, f) => sum + parseFloat(f.interes_calculado), 0)
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
  }

  // ==========================================
  // MÉTODOS ADICIONALES SIMPLIFICADOS
  // ==========================================

  static async obtenerPorNumero(req, res) {
    try {
      const { numero } = req.params;
      const factura = await Database.query(`
        SELECT * FROM facturas WHERE numero_factura = ? AND activo = 1
      `, [numero]);
      
      if (factura.length === 0) {
        return res.status(404).json({ success: false, message: 'Factura no encontrada' });
      }
      
      res.json({ success: true, data: factura[0], message: 'Factura encontrada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error obteniendo factura', error: error.message });
    }
  }

  static async validarNumeroFactura(req, res) {
    try {
      const { numero } = req.params;
      const factura = await Database.query(`SELECT id FROM facturas WHERE numero_factura = ? AND activo = 1`, [numero]);
      res.json({
        success: true,
        data: { existe: factura.length > 0, numero_factura: numero },
        message: factura.length > 0 ? 'Número de factura ya existe' : 'Número de factura disponible'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error validando número de factura', error: error.message });
    }
  }
  static async generarNumeroFactura(req, res) {
    try {
      // Obtener la última factura registrada (sin importar si está activa o no)
      const ultimaFactura = await Database.query(`
        SELECT numero_factura 
        FROM facturas 
        ORDER BY id DESC 
        LIMIT 1
      `);

      // Si no hay facturas, empezamos desde 1
      let proximoNumero = 1;

      // Si existe al menos una factura previa, extraemos su número final
      if (ultimaFactura.length > 0 && ultimaFactura[0].numero_factura) {
        const match = ultimaFactura[0].numero_factura.match(/(\d+)$/);
        if (match) {
          proximoNumero = parseInt(match[1], 10) + 1;
        }
      }

      // Generar nuevo número con formato FAC000001
      const nuevoNumero = `FAC${proximoNumero.toString().padStart(6, '0')}`;

      // Responder con el nuevo número generado
      res.json({
        success: true,
        data: { numero_factura: nuevoNumero, consecutivo: proximoNumero },
        message: 'Número de factura generado correctamente'
      });

    } catch (error) {
      console.error('❌ Error generando número de factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando número de factura',
        error: error.message
      });
    }
  }


  // Métodos no implementados que devuelven 501
  static async probarPDF(req, res) {
    res.status(501).json({ success: false, message: 'Generación de PDF no disponible' });
  }

static async crear(req, res) {
  try {
    const {
      numero_factura,
      cliente_id,
      periodo_facturacion,
      fecha_emision,
      fecha_vencimiento,
      fecha_desde,
      fecha_hasta,
      subtotal,
      impuestos,
      descuentos,
      total,
      observaciones,
      items = []
    } = req.body;

    console.log('📝 Creando factura:', { numero_factura, cliente_id, total });

    // Obtener información del cliente
    const [cliente] = await Database.query(
      'SELECT * FROM clientes WHERE id = ?',
      [cliente_id]
    );

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Crear la factura
    const resultado = await Database.query(`
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento,
        fecha_desde, fecha_hasta,
        subtotal, iva, total, estado, observaciones, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, 1)
    `, [
      numero_factura,
      cliente_id,
      cliente.identificacion,
      cliente.nombre,
      periodo_facturacion,
      fecha_emision,
      fecha_vencimiento,
      fecha_desde,
      fecha_hasta,
      subtotal,
      impuestos,
      total,
      observaciones
    ]);

    const facturaId = resultado.insertId;

    // Insertar items si existen
    if (items && items.length > 0) {
      for (const item of items) {
        await Database.query(`
          INSERT INTO detalle_facturas (
            factura_id, concepto_nombre, cantidad, precio_unitario,
            descuento, subtotal, iva, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          facturaId,
          item.descripcion || item.concepto_nombre,
          item.cantidad || 1,
          item.precio_unitario || 0,
          item.descuento || 0,
          item.subtotal || 0,
          item.iva || 0,
          item.total || 0
        ]);
      }
    }

    console.log('✅ Factura creada exitosamente:', facturaId);

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: {
        id: facturaId,
        numero_factura
      }
    });

  } catch (error) {
    console.error('❌ Error creando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando factura',
      error: error.message
    });
  }
}

static async actualizar(req, res) {
  try {
    const { id } = req.params;
    const {
      fecha_emision,
      fecha_vencimiento,
      fecha_desde,
      fecha_hasta,
      subtotal,
      impuestos,
      descuentos,
      total,
      observaciones,
      estado,
      metodo_pago,
      referencia_pago
    } = req.body;

    console.log('✏️ Actualizando factura:', id);

    // Verificar que existe
    const [facturaExistente] = await Database.query(
      'SELECT * FROM facturas WHERE id = ? AND activo = 1',
      [id]
    );

    if (!facturaExistente) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Actualizar factura
    // Actualizar factura
await Database.query(`
  UPDATE facturas SET
    fecha_emision = COALESCE(?, fecha_emision),
    fecha_vencimiento = COALESCE(?, fecha_vencimiento),
    fecha_desde = ?,
    fecha_hasta = ?,
    subtotal = COALESCE(?, subtotal),
    iva = COALESCE(?, iva),
    total = COALESCE(?, total),
    observaciones = ?,
    estado = COALESCE(?, estado),
    metodo_pago = ?,
    referencia_pago = ?,
    updated_at = NOW()
  WHERE id = ?
`, [
  fecha_emision || null,
  fecha_vencimiento || null,
  fecha_desde || null,
  fecha_hasta || null,
  subtotal || null,
  impuestos || null,
  total || null,
  observaciones || null,
  estado || null,
  metodo_pago || null,
  referencia_pago || null,
  id
]);
    console.log('✅ Factura actualizada:', id);

    res.json({
      success: true,
      message: 'Factura actualizada exitosamente',
      data: { id }
    });

  } catch (error) {
    console.error('❌ Error actualizando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando factura',
      error: error.message
    });
  }
}
static async marcarComoPagada(req, res) {
  try {
    const { id } = req.params;
    const {
      metodo_pago,
      referencia_pago,
      fecha_pago,
      monto_pagado,
      banco_id,
      observaciones
    } = req.body;

    console.log('💰 Marcando factura como pagada:', {
      id,
      metodo_pago,
      referencia_pago,
      fecha_pago,
      monto_pagado,
      banco_id
    });

    // Verificar que existe
    const [factura] = await Database.query(
      'SELECT * FROM facturas WHERE id = ? AND activo = 1',
      [id]
    );

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (factura.estado === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está pagada'
      });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede marcar como pagada una factura anulada'
      });
    }

    // ✅ CORRECCIÓN: Orden correcto de parámetros en el UPDATE
    await Database.query(`
      UPDATE facturas SET
        estado = 'pagada',
        fecha_pago = ?,
        metodo_pago = ?,
        referencia_pago = ?,
        banco_id = ?,
        observaciones = COALESCE(?, observaciones),
        updated_at = NOW()
      WHERE id = ?
    `, [
      fecha_pago || new Date().toISOString().split('T')[0],  // Parámetro 1: fecha_pago
      metodo_pago || 'efectivo',                              // Parámetro 2: metodo_pago
      referencia_pago || null,                                // Parámetro 3: referencia_pago
      banco_id || null,                                       // Parámetro 4: banco_id
      observaciones || null,                                  // Parámetro 5: observaciones
      id                                                      // Parámetro 6: id (WHERE)
    ]);

    console.log('✅ Factura actualizada a estado pagada');

    // Registrar pago en tabla pagos si existe
    try {
      await Database.query(`
        INSERT INTO pagos (
          factura_id, fecha_pago, valor_pagado, metodo_pago,
          referencia_pago, banco_id, usuario_registro, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        id,
        fecha_pago || new Date().toISOString().split('T')[0],
        monto_pagado || factura.total,
        metodo_pago || 'efectivo',
        referencia_pago || null,
        banco_id || null,
        req.user?.id || null
      ]);
      console.log('✅ Pago registrado en tabla pagos');
    } catch (error) {
      console.log('⚠️ No se pudo registrar en tabla pagos:', error.message);
    }

    console.log('✅ Factura marcada como pagada exitosamente:', id);

    // Verificar reactivación automática del cliente
    let reactivacion = null;
    try {
      reactivacion = await EstadoClienteService.procesarPostPago(factura.cliente_id, parseInt(id));
      if (reactivacion.reactivado) {
        console.log(`🔄 Cliente ${factura.cliente_id} reactivado automáticamente tras pago.`);
      }
    } catch (reactivacionError) {
      console.warn('⚠️ No se pudo verificar reactivación del cliente:', reactivacionError.message);
    }

    res.json({
      success: true,
      message: 'Factura marcada como pagada exitosamente',
      data: {
        id,
        estado: 'pagada',
        fecha_pago: fecha_pago || new Date().toISOString().split('T')[0],
        monto_pagado: monto_pagado || factura.total,
        reactivacion_cliente: reactivacion
      }
    });

  } catch (error) {
    console.error('❌ Error marcando factura como pagada:', error);
    res.status(500).json({
      success: false,
      message: 'Error marcando factura como pagada',
      error: error.message
    });
  }
}
static async anular(req, res) {
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;

    console.log('🚫 Anulando factura:', id);

    // Verificar que existe
    const [factura] = await Database.query(
      'SELECT * FROM facturas WHERE id = ? AND activo = 1',
      [id]
    );

    if (!factura) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está anulada'
      });
    }

    if (factura.estado === 'pagada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede anular una factura pagada'
      });
    }

    // Anular factura
    await Database.query(`
      UPDATE facturas SET
        estado = 'anulada',
        observaciones = CONCAT(COALESCE(observaciones, ''), '\n\nANULADA: ', ?),
        updated_at = NOW()
      WHERE id = ?
    `, [
      motivo_anulacion || 'Sin motivo especificado',
      id
    ]);

    console.log('✅ Factura anulada:', id);

    // --- Generar Nota de Crédito formal ---
    let notaCredito = null;
    try {
      // Número secuencial NC-YYYY-NNNNNN
      const year = new Date().getFullYear();
      const lastNC = await Database.query(
        'SELECT numero_nc FROM notas_credito ORDER BY id DESC LIMIT 1'
      );
      let consecutivo = 1;
      if (lastNC.length > 0) {
        const match = lastNC[0].numero_nc.match(/(\d+)$/);
        if (match) consecutivo = parseInt(match[1]) + 1;
      }
      const numero_nc = `NC-${year}-${consecutivo.toString().padStart(6, '0')}`;

      // Separar tipo y detalle del motivo
      let motivo_tipo = 'otro';
      let motivo_detalle = motivo_anulacion || 'Sin motivo especificado';
      const colonIdx = motivo_detalle.indexOf(': ');
      if (colonIdx > -1) {
        motivo_tipo = motivo_detalle.substring(0, colonIdx).toLowerCase().replace(/\s+/g, '_').substring(0, 80);
        motivo_detalle = motivo_detalle.substring(colonIdx + 2);
      }

      const ncResult = await Database.query(`
        INSERT INTO notas_credito
          (numero_nc, factura_id, cliente_id, nombre_cliente, identificacion_cliente,
           numero_factura_original, motivo_tipo, motivo_detalle, valor, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        numero_nc,
        parseInt(id),
        factura.cliente_id,
        factura.nombre_cliente,
        factura.identificacion_cliente,
        factura.numero_factura,
        motivo_tipo,
        motivo_detalle,
        parseFloat(factura.total) || 0,
        req.user?.id || null
      ]);

      notaCredito = {
        id: ncResult.insertId,
        numero_nc,
        factura_id: parseInt(id),
        numero_factura_original: factura.numero_factura,
        valor: parseFloat(factura.total) || 0
      };

      console.log('📄 Nota de Crédito generada:', numero_nc);
    } catch (ncError) {
      // NC failure is non-fatal — factura was already anulada
      console.error('⚠️ Error generando Nota de Crédito (factura ya anulada):', ncError.message);
    }

    res.json({
      success: true,
      message: 'Factura anulada exitosamente',
      data: { id, estado: 'anulada', nota_credito: notaCredito }
    });

  } catch (error) {
    console.error('❌ Error anulando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error anulando factura',
      error: error.message
    });
  }
}
  static async obtenerDetalles(req, res) {
    return FacturasController.obtenerPorId(req, res);
  }

  static async generarPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`🔍 Buscando factura con ID: ${id}`);
      const factura = await Factura.obtenerPorId(id);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      console.log(`✅ Factura encontrada: ${factura.numero_factura}`);

      // CORREGIDO: Usar Database en lugar de pool
      const empresaQuery = 'SELECT * FROM configuracion_empresa WHERE id = 1';
      const empresaResult = await Database.query(empresaQuery);
      
      if (!empresaResult || empresaResult.length === 0) {
        return ApiResponse.error(res, 'Configuración de empresa no encontrada', 500);
      }

      const empresa = empresaResult[0];
      console.log(`🏢 Empresa configurada: ${empresa.empresa_nombre}`);

      // Generar PDF
      const pdfBuffer = await FacturaPDFGenerator.generarFactura(factura, empresa);

      // Configurar headers para descarga
      const nombreArchivo = `Factura_${factura.numero_factura}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log(`📥 Enviando PDF para descarga: ${nombreArchivo}`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

static async verPDF(req, res) {
  return FacturasController.generarPDF(req, res);
}

static async duplicar(req, res) {
  try {
    const { id } = req.params;
    
    console.log('📋 Duplicando factura:', id);
    
    // 1. Obtener factura original
    const [facturaOriginal] = await Database.query(`
      SELECT * FROM facturas WHERE id = ?
    `, [id]);
    
    if (!facturaOriginal) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }
    
    // 2. Obtener items de la factura original
    const items = await Database.query(`
      SELECT * FROM detalle_facturas WHERE factura_id = ?
    `, [id]);
    
    // 3. Generar nuevo número de factura (temporal)
    const nuevoNumero = `TEMP-${Date.now()}`;
    
    // 4. Crear nueva factura (simplificada con columnas esenciales)
    const nuevaFactura = await Database.query(`
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento,
        internet, television, subtotal, iva, total, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, ?, ?, 'pendiente', ?)
    `, [
      nuevoNumero,
      facturaOriginal.cliente_id,
      facturaOriginal.identificacion_cliente,
      facturaOriginal.nombre_cliente,
      facturaOriginal.periodo_facturacion,
      facturaOriginal.internet || 0,
      facturaOriginal.television || 0,
      facturaOriginal.subtotal,
      facturaOriginal.iva || 0,
      facturaOriginal.total,
      `Duplicado de ${facturaOriginal.numero_factura}`
    ]);
    
    const nuevaFacturaId = nuevaFactura.insertId;
    
    // 5. Duplicar items
    for (const item of items) {
      await Database.query(`
        INSERT INTO detalle_facturas (
          factura_id, concepto_id, concepto_nombre, cantidad,
          precio_unitario, descuento, subtotal, iva, total, servicio_cliente_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        nuevaFacturaId,
        item.concepto_id || null,
        item.concepto_nombre,
        item.cantidad || 1,
        item.precio_unitario,
        item.descuento || 0,
        item.subtotal,
        item.iva || 0,
        item.total,
        item.servicio_cliente_id || null
      ]);
    }
    
    console.log('✅ Factura duplicada exitosamente:', nuevaFacturaId);
    
    res.json({
      success: true,
      message: 'Factura duplicada exitosamente',
      data: {
        id: nuevaFacturaId,
        numero_factura: nuevoNumero,
        factura_original: id
      }
    });
    
  } catch (error) {
    console.error('❌ Error duplicando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicando factura',
      error: error.message
    });
  }
}
}

console.log('✅ FacturasController configurado correctamente con Database.query');

module.exports = FacturasController;