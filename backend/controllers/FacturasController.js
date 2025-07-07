// backend/controllers/FacturasController.js - CORREGIDO PARA USAR Database.query

const { Database } = require('../models/Database');

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
        sort_by = 'fecha_emision',
        sort_order = 'DESC'
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
              total_pages: 0,
              has_next_page: false,
              has_prev_page: false
            }
          },
          message: 'Tabla facturas no existe - retornando datos vacíos'
        });
      }

      // Construir WHERE clause dinámicamente
      let whereConditions = ['f.activo = 1'];
      let queryParams = [];

      if (fecha_desde && fecha_hasta) {
        whereConditions.push('f.fecha_emision BETWEEN ? AND ?');
        queryParams.push(fecha_desde, fecha_hasta);
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
      const validSortColumns = ['fecha_emision', 'numero_factura', 'total', 'estado', 'fecha_vencimiento', 'nombre_cliente'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'fecha_emision';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Obtener facturas paginadas
      const facturas = await Database.query(`
        SELECT 
          f.id,
          f.numero_factura,
          f.cliente_id,
          f.identificacion_cliente,
          f.nombre_cliente,
          f.telefono_cliente,
          f.direccion_cliente,
          f.email_cliente,
          f.periodo_facturacion,
          f.fecha_emision,
          f.fecha_vencimiento,
          f.fecha_pago,
          f.subtotal,
          f.descuentos,
          f.iva,
          f.total,
          f.estado,
          f.metodo_pago,
          f.referencia_pago,
          f.observaciones,
          f.saldo_anterior,
          f.intereses_mora,
          DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento,
          CASE 
            WHEN f.estado = 'pagada' THEN 'Pagada'
            WHEN f.estado = 'anulada' THEN 'Anulada'
            WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' THEN 'Vencida'
            ELSE 'Vigente'
          END as estado_descripcion
        FROM facturas f
        ${whereClause}
        ORDER BY f.${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?
      `, [...queryParams, limitNum, offset]);

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
          c.email as cliente_email_adicional,
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
        LIMIT ? OFFSET ?
      `, [...queryParams, limitNum, offset]);

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
   */
  static async obtenerEstadisticas(req, res) {
    try {
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
        return res.json({
          success: true,
          data: {
            resumen: {
              total_facturas: 0,
              total_clientes: 0,
              monto_total: 0,
              monto_pagado: 0,
              monto_pendiente: 0,
              monto_vencido: 0,
              promedio_factura: 0
            },
            por_estado: {
              pagadas: 0,
              pendientes: 0,
              vencidas: 0,
              anuladas: 0
            },
            tendencia_mensual: [],
            periodo: {
              fecha_desde: fecha_desde || 'Sin filtro',
              fecha_hasta: fecha_hasta || 'Sin filtro'
            }
          },
          message: 'Estadísticas simuladas - tabla facturas no existe'
        });
      }

      let whereClause = 'WHERE f.activo = 1';
      let queryParams = [];

      if (fecha_desde && fecha_hasta) {
        whereClause += ' AND f.fecha_emision BETWEEN ? AND ?';
        queryParams.push(fecha_desde, fecha_hasta);
      }

      if (cliente_id) {
        whereClause += ' AND f.cliente_id = ?';
        queryParams.push(cliente_id);
      }

      // Estadísticas generales
      const estadisticas = await Database.query(`
        SELECT 
          COUNT(*) as total_facturas,
          COUNT(DISTINCT f.cliente_id) as total_clientes,
          SUM(f.total) as monto_total,
          SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as monto_pagado,
          SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END) as monto_pendiente,
          SUM(CASE WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' THEN f.total ELSE 0 END) as monto_vencido,
          COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END) as facturas_pagadas,
          COUNT(CASE WHEN f.estado = 'pendiente' THEN 1 END) as facturas_pendientes,
          COUNT(CASE WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 AND f.estado != 'pagada' THEN 1 END) as facturas_vencidas,
          COUNT(CASE WHEN f.estado = 'anulada' THEN 1 END) as facturas_anuladas,
          AVG(f.total) as promedio_factura
        FROM facturas f
        ${whereClause}
      `, queryParams);

      // Estadísticas por mes (últimos 6 meses)
      const estadisticasMensuales = await Database.query(`
        SELECT 
          DATE_FORMAT(f.fecha_emision, '%Y-%m') as mes,
          COUNT(*) as cantidad_facturas,
          SUM(f.total) as monto_total,
          COUNT(DISTINCT f.cliente_id) as clientes_activos
        FROM facturas f
        WHERE f.activo = 1 
          AND f.fecha_emision >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(f.fecha_emision, '%Y-%m')
        ORDER BY mes DESC
        LIMIT 6
      `);

      const stats = estadisticas[0] || {};

      res.json({
        success: true,
        data: {
          resumen: {
            total_facturas: parseInt(stats.total_facturas || 0),
            total_clientes: parseInt(stats.total_clientes || 0),
            monto_total: parseFloat(stats.monto_total || 0),
            monto_pagado: parseFloat(stats.monto_pagado || 0),
            monto_pendiente: parseFloat(stats.monto_pendiente || 0),
            monto_vencido: parseFloat(stats.monto_vencido || 0),
            promedio_factura: parseFloat(stats.promedio_factura || 0)
          },
          por_estado: {
            pagadas: parseInt(stats.facturas_pagadas || 0),
            pendientes: parseInt(stats.facturas_pendientes || 0),
            vencidas: parseInt(stats.facturas_vencidas || 0),
            anuladas: parseInt(stats.facturas_anuladas || 0)
          },
          tendencia_mensual: estadisticasMensuales,
          periodo: {
            fecha_desde: fecha_desde || 'Sin filtro',
            fecha_hasta: fecha_hasta || 'Sin filtro'
          }
        },
        message: 'Estadísticas obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
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
        LIMIT ? OFFSET ?
      `, [...queryParams, limitNum, offset]);

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
      const ultimaFactura = await Database.query(`
        SELECT numero_factura FROM facturas WHERE activo = 1 ORDER BY id DESC LIMIT 1
      `);
      
      let proximoNumero = 1;
      if (ultimaFactura.length > 0) {
        const match = ultimaFactura[0].numero_factura.match(/(\d+)$/);
        if (match) proximoNumero = parseInt(match[1]) + 1;
      }
      
      const nuevoNumero = `FAC${proximoNumero.toString().padStart(6, '0')}`;
      res.json({
        success: true,
        data: { numero_factura: nuevoNumero, consecutivo: proximoNumero },
        message: 'Número de factura generado'
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error generando número de factura', error: error.message });
    }
  }

  // Métodos no implementados que devuelven 501
  static async probarPDF(req, res) {
    res.status(501).json({ success: false, message: 'Generación de PDF no disponible' });
  }

  static async crear(req, res) {
    res.status(501).json({ success: false, message: 'Método de creación de facturas en desarrollo' });
  }

  static async actualizar(req, res) {
    res.status(501).json({ success: false, message: 'Método de actualización de facturas en desarrollo' });
  }

  static async marcarComoPagada(req, res) {
    res.status(501).json({ success: false, message: 'Método de pago de facturas en desarrollo' });
  }

  static async anular(req, res) {
    res.status(501).json({ success: false, message: 'Método de anulación de facturas en desarrollo' });
  }

  static async obtenerDetalles(req, res) {
    return FacturasController.obtenerPorId(req, res);
  }

  static async generarPDF(req, res) {
    res.status(501).json({ success: false, message: 'Generación de PDF en desarrollo' });
  }

  static async verPDF(req, res) {
    res.status(501).json({ success: false, message: 'Visualización de PDF en desarrollo' });
  }

  static async duplicar(req, res) {
    res.status(501).json({ success: false, message: 'Duplicación de facturas en desarrollo' });
  }
}

console.log('✅ FacturasController configurado correctamente con Database.query');

module.exports = FacturasController;