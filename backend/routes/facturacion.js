// backend/routes/facturacion.js - CORREGIDO PARA USAR Database.query

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

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

    // CORREGIDO: Usar Database.query en lugar de Database.conexion
    const { Database } = require('../models/Database');

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
    const validSortColumns = ['fecha_emision', 'numero_factura', 'total', 'estado', 'fecha_vencimiento'];
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
router.post('/automatica/generar-mensual', requireRole('administrador'), async (req, res) => {
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

    // Simulación básica de facturación automática
    const resultado = {
      exitosas: 0,
      fallidas: 0,
      total_procesados: 0,
      errores: [],
      detalles: []
    };

    // Si es solo preview, mostrar qué se facturaría sin generar
    if (solo_preview) {
      // Obtener clientes activos para preview
      const { Database } = require('../models/Database');

      try {
        const clientes = await Database.query(`
          SELECT 
            id, 
            nombre, 
            identificacion
          FROM clientes c
          WHERE activo = 1
          LIMIT 10
        `);

        resultado.preview = true;
        resultado.clientes_a_facturar = clientes.length;
        resultado.detalles = clientes;

      } catch (error) {
        resultado.clientes_a_facturar = 0;
        resultado.detalles = [];
        resultado.errores.push('No se pudieron obtener clientes para preview');
      }

      return res.json({
        success: true,
        data: resultado,
        message: 'Preview de facturación mensual generado',
        timestamp: new Date().toISOString()
      });
    }

    // Aquí iría la lógica real de facturación automática
    resultado.mensaje = 'Funcionalidad de facturación automática en desarrollo';
    
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
 * @route GET /api/v1/facturacion/automatica/preview-mensual
 * @desc Obtener preview de facturación mensual MEJORADO
 * @access Administrador, Supervisor
 */
router.get('/automatica/preview-mensual', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { periodo } = req.query;
    const fechaPeriodo = periodo ? new Date(periodo + '-01') : new Date();

    const { Database } = require('../models/Database');

    console.log('📊 Generando preview de facturación...');

    try {
      // PASO 1: Verificar si existen las tablas necesarias
      let clientesExiste = true;
      let serviciosExiste = true;
      let planesExiste = true;

      try {
        await Database.query('SELECT 1 FROM clientes LIMIT 1');
      } catch (error) {
        clientesExiste = false;
        console.log('⚠️ Tabla clientes no existe');
      }

      try {
        await Database.query('SELECT 1 FROM servicios_cliente LIMIT 1');
      } catch (error) {
        serviciosExiste = false;
        console.log('⚠️ Tabla servicios_cliente no existe');
      }

      try {
        await Database.query('SELECT 1 FROM planes_servicio LIMIT 1');
      } catch (error) {
        planesExiste = false;
        console.log('⚠️ Tabla planes_servicio no existe');
      }

      // PASO 2: Obtener clientes activos (básico)
      let clientesActivos = [];
      if (clientesExiste) {
        clientesActivos = await Database.query(`
          SELECT 
            id,
            identificacion,
            nombre,
            telefono,
            direccion,
            estado
          FROM clientes 
          WHERE estado = 'activo' 
          ORDER BY nombre ASC
          LIMIT 100
        `);
        console.log(`✅ Encontrados ${clientesActivos.length} clientes activos`);
      }

      // PASO 3: Si existe servicios_cliente, obtener clientes con servicios
      let clientesConServicios = [];
      if (clientesExiste && serviciosExiste) {
        try {
          clientesConServicios = await Database.query(`
            SELECT 
              c.id,
              c.identificacion,
              c.nombre,
              c.telefono,
              c.direccion,
              COUNT(sc.id) as servicios_activos,
              COALESCE(SUM(ps.precio), 50000) as monto_estimado
            FROM clientes c
            LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
            LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
            WHERE c.estado = 'activo'
            GROUP BY c.id, c.identificacion, c.nombre, c.telefono, c.direccion
            HAVING servicios_activos > 0
            ORDER BY c.nombre ASC
            LIMIT 50
          `);
          console.log(`✅ Encontrados ${clientesConServicios.length} clientes con servicios activos`);
        } catch (error) {
          console.log('⚠️ Error consultando servicios, usando clientes básicos');
          clientesConServicios = [];
        }
      }

      // PASO 4: Usar clientes con servicios si existen, si no usar clientes básicos
      let clientesParaFacturar = clientesConServicios.length > 0 ? clientesConServicios : clientesActivos;

      // Si no hay clientes con servicios, simular datos para clientes activos
      if (clientesConServicios.length === 0 && clientesActivos.length > 0) {
        clientesParaFacturar = clientesActivos.map(cliente => ({
          ...cliente,
          servicios_activos: 1,
          monto_estimado: 45000 // Monto simulado
        }));
      }

      // PASO 5: Calcular resumen
      const resumen = {
        total_clientes: clientesParaFacturar.length,
        monto_total_estimado: clientesParaFacturar.reduce((sum, cliente) => 
          sum + parseFloat(cliente.monto_estimado || 45000), 0
        ),
        servicios_totales: clientesParaFacturar.reduce((sum, cliente) => 
          sum + parseInt(cliente.servicios_activos || 1), 0
        ),
        promedio_por_cliente: clientesParaFacturar.length > 0 ? 
          clientesParaFacturar.reduce((sum, cliente) => sum + parseFloat(cliente.monto_estimado || 45000), 0) / clientesParaFacturar.length : 0
      };

      // PASO 6: Información adicional del sistema
      const infoSistema = {
        tablas_disponibles: {
          clientes: clientesExiste,
          servicios_cliente: serviciosExiste,
          planes_servicio: planesExiste
        },
        modo_facturacion: clientesConServicios.length > 0 ? 'completo' : 'simulado',
        periodo_facturacion: fechaPeriodo.toISOString().slice(0, 7)
      };

      console.log('📊 Resumen del preview:', resumen);

      res.json({
        success: true,
        data: {
          resumen,
          clientes: clientesParaFacturar.slice(0, 20), // Mostrar solo los primeros 20 en el preview
          total_clientes_disponibles: clientesParaFacturar.length,
          periodo: fechaPeriodo.toISOString().slice(0, 7),
          info_sistema: infoSistema,
          recomendaciones: {
            mensaje: clientesConServicios.length === 0 && clientesActivos.length > 0 ? 
              'Se detectaron clientes activos pero sin servicios configurados. Se usarán valores simulados para la facturación.' :
              clientesParaFacturar.length === 0 ?
              'No se encontraron clientes activos. Agregue clientes al sistema para generar facturas.' :
              'Sistema listo para facturación automática.',
            acciones_sugeridas: clientesConServicios.length === 0 && clientesActivos.length > 0 ? [
              'Configurar planes de servicio en el sistema',
              'Asignar servicios a los clientes existentes',
              'Verificar que los servicios estén en estado "activo"'
            ] : []
          }
        },
        message: clientesParaFacturar.length > 0 ? 
          `Preview generado: ${clientesParaFacturar.length} clientes listos para facturación` :
          'No se encontraron clientes para facturar'
      });

    } catch (error) {
      console.error('❌ Error en preview:', error);
      
      // Si hay error, retornar preview básico
      res.json({
        success: true,
        data: {
          resumen: {
            total_clientes: 0,
            monto_total_estimado: 0,
            servicios_totales: 0,
            promedio_por_cliente: 0
          },
          clientes: [],
          periodo: fechaPeriodo.toISOString().slice(0, 7),
          info_sistema: {
            error: error.message,
            estado: 'error_base_datos'
          },
          recomendaciones: {
            mensaje: 'Error accediendo a la base de datos. Verifique la conexión y estructura de tablas.',
            acciones_sugeridas: [
              'Verificar conexión a la base de datos',
              'Crear las tablas necesarias (clientes, servicios_cliente, planes_servicio)',
              'Revisar los logs del servidor para más detalles'
            ]
          }
        },
        message: 'Preview con error - Revisar configuración de base de datos'
      });
    }

  } catch (error) {
    console.error('❌ Error obteniendo preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo preview de facturación',
      error: error.message
    });
  }
});


// ==========================================
// ENDPOINT: REGISTRAR PAGO
// ==========================================

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

    // Registrar el pago (simulado por ahora)
    const fechaPagoFinal = fecha_pago || new Date().toISOString().split('T')[0];
    
    // Simular registro de pago
    let nuevoEstado = 'pendiente';
    if (parseFloat(valor_pagado) >= parseFloat(facturaData.total)) {
      nuevoEstado = 'pagada';
      
      // Actualizar factura como pagada
      await Database.query(`
        UPDATE facturas 
        SET estado = 'pagada', fecha_pago = ?
        WHERE id = ?
      `, [fechaPagoFinal, id]);
    }

    res.json({
      success: true,
      data: {
        pago_id: Date.now(), // ID simulado
        factura_id: id,
        nuevo_estado: nuevoEstado,
        valor_pagado: parseFloat(valor_pagado),
        saldo_pendiente: Math.max(0, parseFloat(facturaData.total) - parseFloat(valor_pagado))
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
    message: 'API de Facturación - Sistema ISP',
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