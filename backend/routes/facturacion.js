// backend/routes/facturacion.js - ARCHIVO COMPLETO
const express = require('express');
const router = express.Router();
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS DE FACTURACIÓN AUTOMÁTICA
// ==========================================

/**
 * @route POST /api/v1/facturacion/generar-mensual
 * @desc Generar facturación mensual masiva
 * @access Administrador
 */
router.post('/generar-mensual', requireRole('administrador'), async (req, res) => {
  try {
    console.log('🔄 Iniciando facturación mensual masiva...');
    
    const { fecha_referencia, solo_preview } = req.body;
    const fechaRef = fecha_referencia ? new Date(fecha_referencia) : new Date();
    
    // Validar fecha
    if (isNaN(fechaRef.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Fecha de referencia inválida'
      });
    }

    // Si es solo preview, mostrar qué se facturaría sin generar
    if (solo_preview) {
      const preview = await FacturacionAutomaticaService.previewFacturacionMensual(fechaRef);
      return res.json({
        success: true,
        data: preview,
        message: 'Preview de facturación mensual generado',
        timestamp: new Date().toISOString()
      });
    }
    
    const resultado = await FacturacionAutomaticaService.generarFacturacionMensual(fechaRef);
    
    res.json({
      success: true,
      data: resultado,
      message: `Facturación mensual procesada: ${resultado.exitosas} exitosas, ${resultado.fallidas} fallidas`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en facturación mensual:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando facturación mensual',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/facturacion/cliente/:clienteId
 * @desc Generar factura individual para un cliente
 * @access Administrador, Supervisor
 */
router.post('/cliente/:clienteId', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { fecha_inicio } = req.body;
    
    if (!clienteId || isNaN(clienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    console.log(`🧾 Generando factura individual para cliente ${clienteId}...`);
    
    const factura = await FacturacionAutomaticaService.generarFacturaClienteIndividual(
      clienteId, 
      fecha_inicio
    );

    if (!factura) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo generar la factura. Verifique que el cliente tenga servicios activos y no tenga facturas pendientes para el período.'
      });
    }
    
    res.json({
      success: true,
      data: factura,
      message: `Factura generada exitosamente: ${factura.numero_factura}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error generando factura individual:`, error);
    res.status(500).json({
      success: false,
      message: 'Error generando factura individual',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/preview/:clienteId
 * @desc Preview de facturación para un cliente específico
 * @access Administrador, Supervisor
 */
router.get('/preview/:clienteId', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    if (!clienteId || isNaN(clienteId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    // Obtener datos del cliente
    const cliente = await FacturacionAutomaticaService.obtenerDatosCompletosCliente(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Calcular período y conceptos sin generar la factura
    const fechaRef = new Date();
    const periodo = FacturacionAutomaticaService.calcularPeriodoFacturacion(cliente, fechaRef);
    const serviciosActivos = await FacturacionAutomaticaService.obtenerServiciosActivosCliente(clienteId);
    const conceptos = await FacturacionAutomaticaService.calcularConceptosFacturacion(cliente, serviciosActivos, periodo);
    const totales = FacturacionAutomaticaService.calcularTotalesFactura(conceptos, cliente);

    res.json({
      success: true,
      data: {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          identificacion: cliente.identificacion,
          estrato: cliente.estrato
        },
        periodo: periodo,
        servicios_activos: serviciosActivos,
        conceptos: conceptos,
        totales: totales
      },
      message: 'Preview de facturación generado'
    });

  } catch (error) {
    console.error(`❌ Error en preview de facturación:`, error);
    res.status(500).json({
      success: false,
      message: 'Error generando preview de facturación',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/validar-datos
 * @desc Validar integridad de datos para facturación
 * @access Administrador
 */
router.get('/validar-datos', requireRole('administrador'), async (req, res) => {
  try {
    const { cliente_id } = req.query;
    
    const validacion = await FacturacionAutomaticaService.validarIntegridadDatos(
      cliente_id ? parseInt(cliente_id) : null
    );

    res.json({
      success: true,
      data: validacion,
      message: validacion.valido ? 
        'Datos válidos para facturación' : 
        `Se encontraron ${validacion.total_errores} errores de integridad`
    });

  } catch (error) {
    console.error('❌ Error validando datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando integridad de datos',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/estadisticas
 * @desc Obtener estadísticas de facturación
 * @access Administrador, Supervisor
 */
router.get('/estadisticas', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({
        success: false,
        message: 'Las fechas desde y hasta son requeridas'
      });
    }

    const estadisticas = await FacturacionAutomaticaService.obtenerEstadisticasFacturacion(
      fecha_desde, 
      fecha_hasta
    );

    res.json({
      success: true,
      data: estadisticas,
      message: 'Estadísticas de facturación obtenidas'
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

/**
 * @route POST /api/v1/facturacion/regenerar/:facturaId
 * @desc Regenerar una factura (anular y crear nueva)
 * @access Administrador
 */
router.post('/regenerar/:facturaId', requireRole('administrador'), async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo } = req.body;
    
    if (!facturaId || isNaN(facturaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    if (!motivo || motivo.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El motivo de regeneración es requerido'
      });
    }

    const resultado = await FacturacionAutomaticaService.regenerarFactura(
      facturaId, 
      motivo
    );

    res.json({
      success: true,
      data: resultado,
      message: `Factura regenerada exitosamente: ${resultado.factura_nueva}`
    });

  } catch (error) {
    console.error('❌ Error regenerando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerando factura',
      error: error.message
    });
  }
});

// ==========================================
// RUTAS DE CONSULTA DE FACTURAS
// ==========================================

/**
 * @route GET /api/v1/facturacion/facturas
 * @desc Obtener facturas con filtros y paginación
 * @access Todos los roles
 */
router.get('/facturas', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      cliente_id,
      estado,
      fecha_desde,
      fecha_hasta,
      numero_factura,
      identificacion_cliente,
      sort_by = 'fecha_emision',
      sort_order = 'DESC'
    } = req.query;

    // Validar parámetros de paginación
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      // Construir filtros WHERE
      let whereConditions = ['f.activo = 1'];
      let queryParams = [];

      if (cliente_id) {
        whereConditions.push('f.cliente_id = ?');
        queryParams.push(cliente_id);
      }

      if (estado) {
        whereConditions.push('f.estado = ?');
        queryParams.push(estado);
      }

      if (fecha_desde) {
        whereConditions.push('DATE(f.fecha_emision) >= ?');
        queryParams.push(fecha_desde);
      }

      if (fecha_hasta) {
        whereConditions.push('DATE(f.fecha_emision) <= ?');
        queryParams.push(fecha_hasta);
      }

      if (numero_factura) {
        whereConditions.push('f.numero_factura LIKE ?');
        queryParams.push(`%${numero_factura}%`);
      }

      if (identificacion_cliente) {
        whereConditions.push('f.identificacion_cliente LIKE ?');
        queryParams.push(`%${identificacion_cliente}%`);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Obtener total de registros
      const [countResult] = await conexion.execute(`
        SELECT COUNT(*) as total
        FROM facturas f
        ${whereClause}
      `, queryParams);

      const total = countResult[0].total;

      // Validar columna de ordenamiento
      const allowedSortColumns = [
        'fecha_emision', 'fecha_vencimiento', 'numero_factura', 
        'nombre_cliente', 'total', 'estado'
      ];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'fecha_emision';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Obtener facturas paginadas
      const [facturas] = await conexion.execute(`
        SELECT 
          f.id,
          f.numero_factura,
          f.cliente_id,
          f.identificacion_cliente,
          f.nombre_cliente,
          f.periodo_facturacion,
          f.fecha_emision,
          f.fecha_vencimiento,
          f.fecha_pago,
          f.subtotal,
          f.iva,
          f.total,
          f.estado,
          f.metodo_pago,
          DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencimiento,
          CASE 
            WHEN f.estado = 'pagada' THEN 'Pagada'
            WHEN f.estado = 'anulada' THEN 'Anulada'
            WHEN DATEDIFF(NOW(), f.fecha_vencimiento) > 0 THEN 'Vencida'
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

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error obteniendo facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo facturas',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/facturas/:id
 * @desc Obtener detalles de una factura específica
 * @access Todos los roles
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
    const conexion = await Database.conexion();

    try {
      // Obtener factura principal
      const [factura] = await conexion.execute(`
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

      // Obtener detalles de la factura
      const [detalles] = await conexion.execute(`
        SELECT * FROM detalle_facturas 
        WHERE factura_id = ?
        ORDER BY id
      `, [id]);

      // Obtener pagos asociados
      const [pagos] = await conexion.execute(`
        SELECT 
          p.*,
          u.nombre as usuario_nombre
        FROM pagos p
        LEFT JOIN sistema_usuarios u ON p.usuario_registro = u.id
        WHERE p.factura_id = ?
        ORDER BY p.fecha_pago DESC
      `, [id]);

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

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error obteniendo factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo factura',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/facturacion/facturas/:id/pagar
 * @desc Registrar pago de factura
 * @access Administrador, Supervisor
 */
router.post('/facturas/:id/pagar', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      valor_pagado,
      metodo_pago,
      referencia_pago,
      observaciones,
      fecha_pago
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
    const conexion = await Database.conexion();

    try {
      await conexion.beginTransaction();

      // Obtener datos de la factura
      const [factura] = await conexion.execute(`
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

      if (facturaData.estado === 'anulada') {
        return res.status(400).json({
          success: false,
          message: 'No se puede registrar pago en factura anulada'
        });
      }

      // Calcular pagos previos
      const [pagosPrevios] = await conexion.execute(`
        SELECT COALESCE(SUM(valor_pagado), 0) as total_pagado
        FROM pagos 
        WHERE factura_id = ?
      `, [id]);

      const totalPagadoPrevio = parseFloat(pagosPrevios[0].total_pagado);
      const saldoPendiente = parseFloat(facturaData.total) - totalPagadoPrevio;

      if (saldoPendiente <= 0) {
        return res.status(400).json({
          success: false,
          message: 'La factura ya está completamente pagada'
        });
      }

      if (parseFloat(valor_pagado) > saldoPendiente) {
        return res.status(400).json({
          success: false,
          message: `El valor pagado (${valor_pagado}) no puede ser mayor al saldo pendiente (${saldoPendiente})`
        });
      }

      // Registrar el pago
      await conexion.execute(`
        INSERT INTO pagos (
          factura_id, cliente_id, valor_pagado, metodo_pago,
          referencia_pago, fecha_pago, observaciones,
          usuario_registro, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        id,
        facturaData.cliente_id,
        valor_pagado,
        metodo_pago,
        referencia_pago || null,
        fecha_pago || new Date().toISOString().split('T')[0],
        observaciones || null,
        usuario_id
      ]);

      // Determinar nuevo estado de la factura
      const nuevoTotalPagado = totalPagadoPrevio + parseFloat(valor_pagado);
      const nuevoSaldoPendiente = parseFloat(facturaData.total) - nuevoTotalPagado;
      
      let nuevoEstado = facturaData.estado;
      let fechaPagoCompleto = null;

      if (nuevoSaldoPendiente <= 0.01) { // Considerando centavos
        nuevoEstado = 'pagada';
        fechaPagoCompleto = fecha_pago || new Date().toISOString().split('T')[0];
      }

      // Actualizar estado de la factura
      await conexion.execute(`
        UPDATE facturas 
        SET estado = ?, fecha_pago = ?, updated_at = NOW()
        WHERE id = ?
      `, [nuevoEstado, fechaPagoCompleto, id]);

      await conexion.commit();

      res.json({
        success: true,
        message: `Pago registrado exitosamente. Estado: ${nuevoEstado}`,
        data: {
          factura_id: id,
          valor_pagado: parseFloat(valor_pagado),
          nuevo_estado: nuevoEstado,
          total_pagado: nuevoTotalPagado,
          saldo_pendiente: Math.max(0, nuevoSaldoPendiente)
        }
      });

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error registrando pago',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/facturacion/facturas/:id/anular
 * @desc Anular una factura
 * @access Administrador
 */
router.put('/facturas/:id/anular', requireRole('administrador'), async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_anulacion } = req.body;
    const usuario_id = req.user.id;

    if (!motivo_anulacion || motivo_anulacion.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El motivo de anulación es requerido'
      });
    }

    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      await conexion.beginTransaction();

      // Verificar que la factura existe
      const [facturaExistente] = await conexion.execute(`
        SELECT id, estado, numero_factura FROM facturas 
        WHERE id = ? AND activo = 1
      `, [id]);

      if (facturaExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      if (facturaExistente[0].estado === 'anulada') {
        return res.status(400).json({
          success: false,
          message: 'La factura ya está anulada'
        });
      }

      // Verificar que no tenga pagos
      const [pagosExistentes] = await conexion.execute(`
        SELECT COUNT(*) as total_pagos FROM pagos WHERE factura_id = ?
      `, [id]);

      if (pagosExistentes[0].total_pagos > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede anular una factura que tiene pagos registrados'
        });
      }

      // Anular la factura
      await conexion.execute(`
        UPDATE facturas 
        SET estado = 'anulada', 
            observaciones = CONCAT(COALESCE(observaciones, ''), ' - ANULADA POR: ', ?, ' - MOTIVO: ', ?),
            updated_at = NOW()
        WHERE id = ?
      `, [req.user.nombre || req.user.email, motivo_anulacion, id]);

      await conexion.commit();

      res.json({
        success: true,
        message: `Factura ${facturaExistente[0].numero_factura} anulada exitosamente`,
        data: { 
          factura_id: id,
          numero_factura: facturaExistente[0].numero_factura,
          motivo: motivo_anulacion
        }
      });

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error anulando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error anulando factura',
      error: error.message
    });
  }
});

// ==========================================
// RUTAS DE REPORTES
// ==========================================

/**
 * @route GET /api/v1/facturacion/reportes/resumen
 * @desc Obtener resumen ejecutivo de facturación
 * @access Administrador, Supervisor
 */
router.get('/reportes/resumen', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { periodo } = req.query; // Formato: YYYY-MM o YYYY
    
    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      let filtroFecha = '';
      let params = [];

      if (periodo) {
        if (periodo.length === 7) { // YYYY-MM
          filtroFecha = 'AND periodo_facturacion = ?';
          params.push(periodo);
        } else if (periodo.length === 4) { // YYYY
          filtroFecha = 'AND YEAR(fecha_emision) = ?';
          params.push(periodo);
        }
      } else {
        // Por defecto, mes actual
        const mesActual = new Date().toISOString().slice(0, 7);
        filtroFecha = 'AND periodo_facturacion = ?';
        params.push(mesActual);
      }

      // Resumen general
      const [resumenGeneral] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado,
          SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as total_pendiente,
          SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as total_pagado,
          SUM(CASE WHEN estado = 'anulada' THEN total ELSE 0 END) as total_anulado,
          AVG(total) as promedio_factura,
          COUNT(DISTINCT cliente_id) as clientes_facturados
        FROM facturas 
        WHERE activo = 1 ${filtroFecha}
      `, params);

      // Facturación por tipo de servicio
      const [facturacionPorTipo] = await conexion.execute(`
        SELECT 
          SUM(internet) as total_internet,
          SUM(television) as total_television,
          SUM(varios) as total_varios,
          SUM(publicidad) as total_publicidad,
          SUM(s_internet + s_television + s_varios + s_publicidad) as total_iva
        FROM facturas 
        WHERE activo = 1 AND estado != 'anulada' ${filtroFecha}
      `, params);

      // Facturas vencidas
      const [facturasVencidas] = await conexion.execute(`
        SELECT 
          COUNT(*) as cantidad_vencidas,
          SUM(total) as monto_vencido,
          AVG(DATEDIFF(NOW(), fecha_vencimiento)) as promedio_dias_vencimiento
        FROM facturas 
        WHERE activo = 1 
          AND estado = 'pendiente' 
          AND fecha_vencimiento < NOW()
          ${filtroFecha}
      `, params);

      // Top 5 clientes por facturación
      const [topClientes] = await conexion.execute(`
        SELECT 
          cliente_id,
          nombre_cliente,
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado
        FROM facturas 
        WHERE activo = 1 AND estado != 'anulada' ${filtroFecha}
        GROUP BY cliente_id, nombre_cliente
        ORDER BY total_facturado DESC
        LIMIT 5
      `, params);

      res.json({
        success: true,
        data: {
          periodo: periodo || new Date().toISOString().slice(0, 7),
          resumen_general: resumenGeneral[0],
          facturacion_por_tipo: facturacionPorTipo[0],
          facturas_vencidas: facturasVencidas[0],
          top_clientes: topClientes
        },
        message: 'Resumen de facturación obtenido'
      });

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error obteniendo resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen de facturación',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/reportes/cartera
 * @desc Reporte de cartera vencida
 * @access Administrador, Supervisor
 */
router.get('/reportes/cartera', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { dias_minimos = 1, limite = 50 } = req.query;

    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      const [carteraVencida] = await conexion.execute(`
        SELECT 
          f.id,
          f.numero_factura,
          f.cliente_id,
          f.identificacion_cliente,
          f.nombre_cliente,
          f.fecha_emision,
          f.fecha_vencimiento,
          f.total,
          DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencido,
          c.telefono,
          c.direccion,
          c.email,
          COALESCE(SUM(p.valor_pagado), 0) as total_pagado,
          (f.total - COALESCE(SUM(p.valor_pagado), 0)) as saldo_pendiente
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        LEFT JOIN pagos p ON f.id = p.factura_id
        WHERE f.activo = 1 
          AND f.estado = 'pendiente'
          AND DATEDIFF(NOW(), f.fecha_vencimiento) >= ?
        GROUP BY f.id, f.numero_factura, f.cliente_id, f.identificacion_cliente, 
                 f.nombre_cliente, f.fecha_emision, f.fecha_vencimiento, f.total,
                 c.telefono, c.direccion, c.email
        HAVING saldo_pendiente > 0
        ORDER BY dias_vencido DESC, saldo_pendiente DESC
        LIMIT ?
      `, [parseInt(dias_minimos), parseInt(limite)]);

      // Resumen de cartera
      const [resumenCartera] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_facturas_vencidas,
          SUM(f.total - COALESCE(p.total_pagado, 0)) as total_cartera_vencida,
          AVG(DATEDIFF(NOW(), f.fecha_vencimiento)) as promedio_dias_vencimiento,
          COUNT(DISTINCT f.cliente_id) as clientes_morosos
        FROM facturas f
        LEFT JOIN (
          SELECT factura_id, SUM(valor_pagado) as total_pagado
          FROM pagos 
          GROUP BY factura_id
        ) p ON f.id = p.factura_id
        WHERE f.activo = 1 
          AND f.estado = 'pendiente'
          AND DATEDIFF(NOW(), f.fecha_vencimiento) >= ?
          AND (f.total - COALESCE(p.total_pagado, 0)) > 0
      `, [parseInt(dias_minimos)]);

      res.json({
        success: true,
        data: {
          resumen: resumenCartera[0],
          facturas_vencidas: carteraVencida,
          parametros: {
            dias_minimos: parseInt(dias_minimos),
            limite: parseInt(limite)
          }
        },
        message: 'Reporte de cartera vencida obtenido'
      });

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error obteniendo reporte de cartera:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo reporte de cartera',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/facturas/:id/pdf
 * @desc Generar y descargar PDF de factura
 * @access Todos los roles
 */
router.get('/facturas/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    // Verificar si PDFGenerator está disponible
    let PDFGenerator;
    try {
      PDFGenerator = require('./utils/pdfGenerator');
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Servicio de PDF no disponible'
      });
    }

    // Obtener detalles de la factura
    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      const [factura] = await conexion.execute(`
        SELECT f.*, c.telefono as cliente_telefono, c.direccion as cliente_direccion
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

      // Obtener detalles
      const [detalles] = await conexion.execute(`
        SELECT * FROM detalle_facturas WHERE factura_id = ?
      `, [id]);

      const facturaCompleta = {
        ...factura[0],
        detalles: detalles
      };

      // Generar PDF usando tu PDFGenerator existente
      const pdfBuffer = await PDFGenerator.generarFacturaPDF(facturaCompleta);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Factura_${facturaCompleta.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/facturas/:id/ver-pdf
 * @desc Ver PDF de factura en navegador
 * @access Todos los roles
 */
router.get('/facturas/:id/ver-pdf', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de factura inválido'
      });
    }

    // Verificar si PDFGenerator está disponible
    let PDFGenerator;
    try {
      PDFGenerator = require('./utils/pdfGenerator');
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: 'Servicio de PDF no disponible'
      });
    }

    // Obtener detalles de la factura
    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      const [factura] = await conexion.execute(`
        SELECT f.*, c.telefono as cliente_telefono, c.direccion as cliente_direccion
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

      // Obtener detalles
      const [detalles] = await conexion.execute(`
        SELECT * FROM detalle_facturas WHERE factura_id = ?
      `, [id]);

      const facturaCompleta = {
        ...factura[0],
        detalles: detalles
      };

      // Generar PDF para visualización
      const pdfBuffer = await PDFGenerator.generarFacturaPDF(facturaCompleta);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Factura_${facturaCompleta.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error mostrando PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error mostrando PDF',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/facturacion/health
 * @desc Verificar estado del sistema de facturación
 * @access Público
 */
router.get('/health', async (req, res) => {
  try {
    const { Database } = require('../models/Database');
    const conexion = await Database.conexion();

    try {
      // Verificar conexión a base de datos
      await conexion.execute('SELECT 1');

      // Obtener estadísticas básicas
      const [stats] = await conexion.execute(`
        SELECT 
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos,
          (SELECT COUNT(*) FROM servicios_cliente WHERE estado = 'activo') as servicios_activos,
          (SELECT COUNT(*) FROM facturas WHERE DATE(created_at) = CURDATE()) as facturas_hoy,
          (SELECT COUNT(*) FROM facturas WHERE estado = 'pendiente') as facturas_pendientes
      `);

      res.json({
        success: true,
        message: 'Sistema de facturación automática operativo',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'conectada',
        estadisticas: stats[0]
      });

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error verificando salud del sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el sistema de facturación',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/v1/facturacion/test
 * @desc Ejecutar facturación de prueba (solo desarrollo)
 * @access Administrador
 */
router.post('/test', requireRole('administrador'), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Endpoint de prueba no disponible en producción'
      });
    }

    const { cliente_id } = req.body;

    if (cliente_id) {
      // Prueba para un cliente específico
      const resultado = await FacturacionAutomaticaService.generarFacturaClienteIndividual(cliente_id);
      res.json({
        success: true,
        data: resultado,
        message: 'Facturación de prueba completada para cliente individual'
      });
    } else {
      // Prueba de validación general
      const validacion = await FacturacionAutomaticaService.validarIntegridadDatos();
      res.json({
        success: true,
        data: validacion,
        message: 'Validación de prueba completada'
      });
    }

  } catch (error) {
    console.error('❌ Error en facturación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error en facturación de prueba',
      error: error.message
    });
  }
});

module.exports = router;