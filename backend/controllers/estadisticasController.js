// backend/controllers/estadisticasController.js
// CONTROLADOR COMPLETO DE ESTADÍSTICAS PARA ERP PSI

const { Database } = require('../models/Database');

class EstadisticasController {

  /**
   * Obtener estadísticas generales del dashboard
   * GET /api/v1/estadisticas/dashboard
   */
  static async getDashboardGeneral(req, res) {
    try {
      console.log('📊 [EstadisticasController] Obteniendo estadísticas generales del dashboard');

      const { fecha_desde, fecha_hasta } = req.query;

      // Si no se proporcionan fechas, usar el mes actual
      const fechaDesde = fecha_desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const fechaHasta = fecha_hasta || new Date().toISOString().split('T')[0];

      console.log(`📅 Rango de fechas: ${fechaDesde} - ${fechaHasta}`);

      // Calcular período anterior para comparación
      const diasDiferencia = Math.ceil((new Date(fechaHasta) - new Date(fechaDesde)) / (1000 * 60 * 60 * 24));
      const fechaDesdeAnterior = new Date(new Date(fechaDesde).getTime() - diasDiferencia * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fechaHastaAnterior = new Date(new Date(fechaDesde).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Ejecutar todas las consultas en paralelo
      const [
        financieras,
        financierasAnterior,
        clientes,
        operacionales,
        tendencias,
        metricasGerenciales
      ] = await Promise.all([
        EstadisticasController.getEstadisticasFinancieras(fechaDesde, fechaHasta),
        EstadisticasController.getEstadisticasFinancieras(fechaDesdeAnterior, fechaHastaAnterior),
        EstadisticasController.getEstadisticasClientes(),
        EstadisticasController.getEstadisticasOperacionales(),
        EstadisticasController.getTendenciasMensuales(),
        EstadisticasController.getMetricasGerenciales(fechaDesde, fechaHasta)
      ]);

      // Calcular variaciones porcentuales
      const comparaciones = {
        facturacion: EstadisticasController.calcularVariacion(
          financieras.periodo.total_facturado,
          financierasAnterior.periodo.total_facturado
        ),
        recaudo: EstadisticasController.calcularVariacion(
          financieras.periodo.total_recaudado,
          financierasAnterior.periodo.total_recaudado
        ),
        cartera_vencida: EstadisticasController.calcularVariacion(
          financieras.cartera.cartera_vencida,
          financierasAnterior.cartera.cartera_vencida
        ),
        clientes_nuevos: EstadisticasController.calcularVariacion(
          clientes.resumen.nuevos_mes,
          0 // Se puede mejorar comparando con mes anterior
        )
      };

      const response = {
        success: true,
        data: {
          periodo: {
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta
          },
          financieras,
          clientes,
          operacionales,
          tendencias,
          metricas_gerenciales: metricasGerenciales,
          comparaciones,
          fecha_actualizacion: new Date().toISOString()
        },
        message: 'Estadísticas del dashboard obtenidas exitosamente'
      };

      console.log('✅ [EstadisticasController] Estadísticas obtenidas exitosamente');
      res.json(response);

    } catch (error) {
      console.error('❌ [EstadisticasController] Error obteniendo estadísticas del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas del dashboard',
        error: error.message
      });
    }
  }

  /**
   * Calcular variación porcentual entre dos valores
   */
  static calcularVariacion(valorActual, valorAnterior) {
    if (!valorAnterior || valorAnterior === 0) {
      return valorActual > 0 ? 100 : 0;
    }
    const variacion = ((valorActual - valorAnterior) / valorAnterior) * 100;
    return parseFloat(variacion.toFixed(2));
  }

  /**
   * Obtener métricas gerenciales avanzadas
   */
  static async getMetricasGerenciales(fechaDesde, fechaHasta) {
    try {
      console.log('📊 Obteniendo métricas gerenciales avanzadas...');

      // ARPU (Average Revenue Per User) - Basado en facturación del período
      const [arpu] = await Database.query(`
        SELECT
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as total_clientes_activos,
          COALESCE(SUM(f.total), 0) as ingresos_totales,
          COALESCE(SUM(f.total) / NULLIF((SELECT COUNT(*) FROM clientes WHERE estado = 'activo'), 0), 0) as arpu
        FROM facturas f
        WHERE f.fecha_emision BETWEEN ? AND ?
          AND f.activo = '1'
      `, [fechaDesde, fechaHasta]);

      // LTV (Customer Lifetime Value) - Valor promedio histórico por cliente
      const [ltv] = await Database.query(`
        SELECT
          COALESCE(AVG(valor_total_cliente), 0) as ltv_promedio,
          COALESCE(MAX(valor_total_cliente), 0) as ltv_maximo,
          COALESCE(MIN(valor_total_cliente), 0) as ltv_minimo
        FROM (
          SELECT
            cliente_id,
            SUM(total) as valor_total_cliente
          FROM facturas
          WHERE estado = 'pagada'
            AND activo = '1'
          GROUP BY cliente_id
          HAVING SUM(total) > 0
        ) as clientes_ltv
      `);

      // Tasa de retención (clientes con más de 6 meses)
      const [retencion] = await Database.query(`
        SELECT
          COUNT(CASE WHEN estado = 'activo' AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN 1 END) as clientes_antiguos_activos,
          COUNT(CASE WHEN created_at < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN 1 END) as total_clientes_antiguos
        FROM clientes
      `);

      const tasaRetencion = retencion.total_clientes_antiguos > 0
        ? (retencion.clientes_antiguos_activos / retencion.total_clientes_antiguos) * 100
        : 0;

      // DSO - Días promedio de cobro (solo facturas pagadas)
      const [dso] = await Database.query(`
        SELECT
          COALESCE(AVG(DATEDIFF(fecha_pago, fecha_emision)), 0) as dias_promedio_cobro
        FROM facturas
        WHERE estado = 'pagada'
          AND fecha_pago IS NOT NULL
          AND fecha_emision BETWEEN ? AND ?
          AND activo = '1'
      `, [fechaDesde, fechaHasta]);

      // MRR/ARR - Ingresos recurrentes (basado en servicios activos O promedio de facturación)
      // Primero intentar con servicios_cliente
      let proyeccion;
      try {
        [proyeccion] = await Database.query(`
          SELECT
            COUNT(*) as contratos_activos,
            COALESCE(SUM(COALESCE(sc.precio_personalizado, ps.precio)), 0) as mrr_actual,
            COALESCE(SUM(COALESCE(sc.precio_personalizado, ps.precio)) * 12, 0) as arr_proyectado
          FROM servicios_cliente sc
          INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.estado = 'activo'
        `);
      } catch (err) {
        // Si no existe la tabla, calcular MRR basado en promedio de facturación
        console.log('⚠️ No se pudo obtener MRR de servicios_cliente, calculando desde facturas');
        [proyeccion] = await Database.query(`
          SELECT
            (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as contratos_activos,
            COALESCE(AVG(total), 0) * (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as mrr_actual,
            COALESCE(AVG(total), 0) * (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') * 12 as arr_proyectado
          FROM facturas
          WHERE fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
            AND activo = '1'
        `);
      }

      return {
        arpu: {
          valor: parseFloat(arpu.arpu) || 0,
          total_clientes: parseInt(arpu.total_clientes_activos) || 0,
          ingresos_totales: parseFloat(arpu.ingresos_totales) || 0
        },
        ltv: {
          promedio: parseFloat(ltv.ltv_promedio) || 0,
          maximo: parseFloat(ltv.ltv_maximo) || 0,
          minimo: parseFloat(ltv.ltv_minimo) || 0
        },
        retencion: {
          tasa: parseFloat(tasaRetencion.toFixed(2)),
          clientes_retenidos: parseInt(retencion.clientes_antiguos_activos) || 0,
          total_evaluados: parseInt(retencion.total_clientes_antiguos) || 0
        },
        cobro: {
          dso: parseFloat(dso.dias_promedio_cobro) || 0,
          descripcion: 'Días promedio para cobrar una factura'
        },
        proyeccion: {
          mrr: parseFloat(proyeccion.mrr_actual) || 0,
          arr: parseFloat(proyeccion.arr_proyectado) || 0,
          contratos_activos: parseInt(proyeccion.contratos_activos) || 0
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo métricas gerenciales:', error);
      console.error(error);
      // Retornar valores por defecto en caso de error
      return {
        arpu: { valor: 0, total_clientes: 0, ingresos_totales: 0 },
        ltv: { promedio: 0, maximo: 0, minimo: 0 },
        retencion: { tasa: 0, clientes_retenidos: 0, total_evaluados: 0 },
        cobro: { dso: 0, descripcion: 'Días promedio para cobrar una factura' },
        proyeccion: { mrr: 0, arr: 0, contratos_activos: 0 }
      };
    }
  }

  /**
   * Obtener estadísticas financieras
   */
  static async getEstadisticasFinancieras(fechaDesde, fechaHasta) {
    try {
      console.log('💰 Obteniendo estadísticas financieras...');

      // Facturación del periodo
      const [facturacionPeriodo] = await Database.query(`
        SELECT 
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado,
          SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as total_recaudado,
          SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as total_pendiente,
          SUM(CASE WHEN estado = 'vencida' OR (estado = 'pendiente' AND fecha_vencimiento < CURDATE()) THEN total ELSE 0 END) as total_vencido,
          AVG(total) as promedio_factura
        FROM facturas
        WHERE fecha_emision BETWEEN ? AND ?
          AND activo = '1'
      `, [fechaDesde, fechaHasta]);

      // Cartera total (toda la activa)
      const [carteraTotal] = await Database.query(`
        SELECT 
          COUNT(DISTINCT cliente_id) as clientes_con_deuda,
          SUM(total) as cartera_total,
          SUM(CASE WHEN DATEDIFF(CURDATE(), fecha_vencimiento) > 0 THEN total ELSE 0 END) as cartera_vencida,
          SUM(CASE WHEN DATEDIFF(CURDATE(), fecha_vencimiento) BETWEEN 1 AND 30 THEN total ELSE 0 END) as mora_1_30,
          SUM(CASE WHEN DATEDIFF(CURDATE(), fecha_vencimiento) BETWEEN 31 AND 60 THEN total ELSE 0 END) as mora_31_60,
          SUM(CASE WHEN DATEDIFF(CURDATE(), fecha_vencimiento) > 60 THEN total ELSE 0 END) as mora_mayor_60
        FROM facturas
        WHERE estado IN ('pendiente', 'vencida')
          AND activo = '1'
      `);

      // Tasa de recaudo
      const tasaRecaudo = facturacionPeriodo.total_facturado > 0
        ? (facturacionPeriodo.total_recaudado / facturacionPeriodo.total_facturado) * 100
        : 0;

      // Pagos realizados en el periodo
      const [pagos] = await Database.query(`
        SELECT 
          COUNT(*) as total_pagos,
          SUM(monto) as monto_total_pagos,
          COUNT(DISTINCT metodo_pago) as metodos_diferentes,
          COUNT(DISTINCT cliente_id) as clientes_pagaron
        FROM pagos
        WHERE fecha_pago BETWEEN ? AND ?
      `, [fechaDesde, fechaHasta]);

      // Facturación por método de pago
      const facturacionPorMetodo = await Database.query(`
        SELECT 
          metodo_pago,
          COUNT(*) as cantidad,
          SUM(total) as monto_total
        FROM facturas
        WHERE fecha_pago BETWEEN ? AND ?
          AND estado = 'pagada'
          AND activo = '1'
        GROUP BY metodo_pago
        ORDER BY monto_total DESC
      `, [fechaDesde, fechaHasta]);

      return {
        periodo: {
          total_facturas: parseInt(facturacionPeriodo.total_facturas) || 0,
          total_facturado: parseFloat(facturacionPeriodo.total_facturado) || 0,
          total_recaudado: parseFloat(facturacionPeriodo.total_recaudado) || 0,
          total_pendiente: parseFloat(facturacionPeriodo.total_pendiente) || 0,
          total_vencido: parseFloat(facturacionPeriodo.total_vencido) || 0,
          promedio_factura: parseFloat(facturacionPeriodo.promedio_factura) || 0,
          tasa_recaudo: parseFloat(tasaRecaudo.toFixed(2))
        },
        cartera: {
          clientes_con_deuda: parseInt(carteraTotal.clientes_con_deuda) || 0,
          cartera_total: parseFloat(carteraTotal.cartera_total) || 0,
          cartera_vencida: parseFloat(carteraTotal.cartera_vencida) || 0,
          mora_1_30_dias: parseFloat(carteraTotal.mora_1_30) || 0,
          mora_31_60_dias: parseFloat(carteraTotal.mora_31_60) || 0,
          mora_mayor_60_dias: parseFloat(carteraTotal.mora_mayor_60) || 0
        },
        pagos: {
          total_pagos: parseInt(pagos.total_pagos) || 0,
          monto_total_pagos: parseFloat(pagos.monto_total_pagos) || 0,
          clientes_pagaron: parseInt(pagos.clientes_pagaron) || 0,
          por_metodo: facturacionPorMetodo
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas financieras:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  static async getEstadisticasClientes() {
    try {
      console.log('👥 Obteniendo estadísticas de clientes...');

      // Resumen general de clientes
      const [resumenClientes] = await Database.query(`
        SELECT 
          COUNT(*) as total_clientes,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN estado = 'suspendido' THEN 1 ELSE 0 END) as suspendidos,
          SUM(CASE WHEN estado = 'cortado' THEN 1 ELSE 0 END) as cortados,
          SUM(CASE WHEN estado = 'retirado' THEN 1 ELSE 0 END) as retirados,
          SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as inactivos,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as nuevos_hoy,
          SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) as nuevos_semana,
          SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as nuevos_mes
        FROM clientes
      `);

      // Distribución por sectores
      const distribucionSectores = await Database.query(`
        SELECT 
          s.codigo,
          s.nombre as sector,
          c.nombre as ciudad,
          COUNT(cl.id) as total_clientes,
          SUM(CASE WHEN cl.estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos
        FROM clientes cl
        LEFT JOIN sectores s ON cl.sector_id = s.id
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        GROUP BY s.id, s.codigo, s.nombre, c.nombre
        HAVING total_clientes > 0
        ORDER BY total_clientes DESC
        LIMIT 10
      `);

      // Distribución por estratos
      const distribucionEstratos = await Database.query(`
        SELECT 
          estrato,
          COUNT(*) as cantidad,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos
        FROM clientes
        WHERE estrato IS NOT NULL
        GROUP BY estrato
        ORDER BY estrato
      `);

      // Clientes con más servicios
      const clientesServiciosMultiples = await Database.query(`
        SELECT 
          c.id,
          c.identificacion,
          c.nombre,
          COUNT(sc.id) as total_servicios,
          GROUP_CONCAT(DISTINCT ps.tipo) as tipos_servicio
        FROM clientes c
        INNER JOIN servicios_cliente sc ON c.id = sc.cliente_id
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.estado = 'activo'
        GROUP BY c.id, c.identificacion, c.nombre
        HAVING total_servicios > 1
        ORDER BY total_servicios DESC
        LIMIT 10
      `);

      // Churn rate (clientes perdidos en el mes)
      const [churnData] = await Database.query(`
        SELECT 
          COUNT(*) as clientes_perdidos_mes,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos
        FROM clientes
        WHERE estado = 'retirado'
          AND MONTH(updated_at) = MONTH(CURDATE())
          AND YEAR(updated_at) = YEAR(CURDATE())
      `);

      const churnRate = churnData.clientes_activos > 0
        ? (churnData.clientes_perdidos_mes / churnData.clientes_activos) * 100
        : 0;

      return {
        resumen: resumenClientes,
        distribucion: {
          por_sectores: distribucionSectores,
          por_estratos: distribucionEstratos
        },
        clientes_servicios_multiples: clientesServiciosMultiples,
        churn: {
          clientes_perdidos_mes: parseInt(churnData.clientes_perdidos_mes) || 0,
          clientes_activos: parseInt(churnData.clientes_activos) || 0,
          tasa_churn: parseFloat(churnRate.toFixed(2))
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de clientes:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas operacionales
   */
  static async getEstadisticasOperacionales() {
    try {
      console.log('🔧 Obteniendo estadísticas operacionales...');

      // Instalaciones
      const [instalaciones] = await Database.query(`
        SELECT 
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
          SUM(CASE WHEN fecha_programada < CURDATE() AND estado NOT IN ('completada', 'cancelada') THEN 1 ELSE 0 END) as vencidas,
          SUM(costo_instalacion) as ingresos_instalaciones,
          AVG(costo_instalacion) as promedio_costo
        FROM instalaciones
        WHERE MONTH(created_at) = MONTH(CURDATE())
          AND YEAR(created_at) = YEAR(CURDATE())
      `);

      // Inventario
      const [inventario] = await Database.query(`
        SELECT 
          COUNT(*) as total_equipos,
          SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
          SUM(CASE WHEN estado = 'asignado' THEN 1 ELSE 0 END) as asignados,
          SUM(CASE WHEN estado = 'instalado' THEN 1 ELSE 0 END) as instalados,
          SUM(CASE WHEN estado = 'dañado' THEN 1 ELSE 0 END) as dañados,
          SUM(CASE WHEN estado = 'perdido' THEN 1 ELSE 0 END) as perdidos,
          SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END) as en_mantenimiento,
          SUM(precio_compra) as valor_total_inventario
        FROM inventario_equipos
      `);

      // PQR
      const [pqr] = await Database.query(`
        SELECT 
          COUNT(*) as total_pqr,
          SUM(CASE WHEN estado = 'abierto' THEN 1 ELSE 0 END) as abiertas,
          SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas,
          SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) as cerradas,
          SUM(CASE WHEN estado = 'escalado' THEN 1 ELSE 0 END) as escaladas,
          AVG(tiempo_respuesta_horas) as tiempo_promedio_respuesta
        FROM pqr
        WHERE MONTH(fecha_recepcion) = MONTH(CURDATE())
          AND YEAR(fecha_recepcion) = YEAR(CURDATE())
      `);

      // Incidencias
      const [incidencias] = await Database.query(`
        SELECT 
          COUNT(*) as total_incidencias,
          SUM(CASE WHEN estado = 'reportado' THEN 1 ELSE 0 END) as reportadas,
          SUM(CASE WHEN estado = 'en_atencion' THEN 1 ELSE 0 END) as en_atencion,
          SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas,
          SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) as cerradas,
          SUM(usuarios_afectados) as total_usuarios_afectados,
          AVG(tiempo_duracion_minutos) as tiempo_promedio_resolucion
        FROM incidencias_servicio
        WHERE MONTH(fecha_inicio) = MONTH(CURDATE())
          AND YEAR(fecha_inicio) = YEAR(CURDATE())
      `);

      // Contratos
      const [contratos] = await Database.query(`
        SELECT 
          COUNT(*) as total_contratos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          SUM(CASE WHEN estado = 'terminado' THEN 1 ELSE 0 END) as terminados,
          SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) as anulados,
          SUM(CASE WHEN tipo_permanencia = 'con_permanencia' THEN 1 ELSE 0 END) as con_permanencia,
          SUM(CASE WHEN tipo_permanencia = 'sin_permanencia' THEN 1 ELSE 0 END) as sin_permanencia
        FROM contratos
      `);

      // Servicios activos por tipo
      const serviciosPorTipo = await Database.query(`
        SELECT 
          ps.tipo,
          COUNT(sc.id) as cantidad,
          SUM(COALESCE(sc.precio_personalizado, ps.precio)) as ingresos_mensuales
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.estado = 'activo'
        GROUP BY ps.tipo
        ORDER BY cantidad DESC
      `);

      return {
        instalaciones: {
          ...instalaciones,
          tasa_completadas: instalaciones.total_instalaciones > 0
            ? parseFloat(((instalaciones.completadas / instalaciones.total_instalaciones) * 100).toFixed(2))
            : 0
        },
        inventario: inventario,
        pqr: {
          ...pqr,
          tasa_resolucion: pqr.total_pqr > 0
            ? parseFloat((((pqr.resueltas + pqr.cerradas) / pqr.total_pqr) * 100).toFixed(2))
            : 0
        },
        incidencias: {
          ...incidencias,
          tasa_resolucion: incidencias.total_incidencias > 0
            ? parseFloat((((incidencias.resueltas + incidencias.cerradas) / incidencias.total_incidencias) * 100).toFixed(2))
            : 0
        },
        contratos: contratos,
        servicios: {
          por_tipo: serviciosPorTipo,
          total_ingresos_mensuales: serviciosPorTipo.reduce((sum, s) => sum + parseFloat(s.ingresos_mensuales || 0), 0)
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas operacionales:', error);
      throw error;
    }
  }

  /**
   * Obtener tendencias mensuales (últimos 12 meses)
   */
  static async getTendenciasMensuales() {
    try {
      console.log('📈 Obteniendo tendencias mensuales...');

      // Usar la vista optimizada si existe
      const tendenciasFacturacion = await Database.query(`
        SELECT 
          periodo,
          total_facturas,
          valor_total_facturado,
          valor_recaudado,
          valor_pendiente_cobro,
          promedio_factura,
          clientes_facturados
        FROM vista_estadisticas_mensuales
        WHERE periodo >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH), '%Y-%m')
        ORDER BY periodo DESC
        LIMIT 12
      `);

      // Tendencia de clientes nuevos por mes
      const tendenciasClientes = await Database.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as periodo,
          COUNT(*) as clientes_nuevos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos
        FROM clientes
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY periodo DESC
        LIMIT 12
      `);

      // Tendencia de instalaciones por mes
      const tendenciasInstalaciones = await Database.query(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as periodo,
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(costo_instalacion) as ingresos
        FROM instalaciones
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY periodo DESC
        LIMIT 12
      `);

      return {
        facturacion: tendenciasFacturacion.reverse(),
        clientes: tendenciasClientes.reverse(),
        instalaciones: tendenciasInstalaciones.reverse()
      };
    } catch (error) {
      console.error('❌ Error obteniendo tendencias mensuales:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas financieras detalladas
   * GET /api/v1/estadisticas/financieras
   */
  static async getFinancieras(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const fechaDesde = fecha_desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const fechaHasta = fecha_hasta || new Date().toISOString().split('T')[0];

      const estadisticas = await EstadisticasController.getEstadisticasFinancieras(fechaDesde, fechaHasta);

      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas financieras obtenidas exitosamente'
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas financieras:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas financieras',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de clientes detalladas
   * GET /api/v1/estadisticas/clientes
   */
  static async getClientes(req, res) {
    try {
      const estadisticas = await EstadisticasController.getEstadisticasClientes();

      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas de clientes obtenidas exitosamente'
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de clientes',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas operacionales detalladas
   * GET /api/v1/estadisticas/operacionales
   */
  static async getOperacionales(req, res) {
    try {
      const estadisticas = await EstadisticasController.getEstadisticasOperacionales();

      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas operacionales obtenidas exitosamente'
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas operacionales:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas operacionales',
        error: error.message
      });
    }
  }

  /**
   * Obtener top clientes por facturación
   * GET /api/v1/estadisticas/top-clientes
   */
  static async getTopClientes(req, res) {
    try {
      const { limit = 10, periodo = 'mes' } = req.query;

      let fechaDesde;
      switch (periodo) {
        case 'semana':
          fechaDesde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'trimestre':
          fechaDesde = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'año':
          fechaDesde = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
          break;
        default:
          fechaDesde = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      }

      const topClientes = await Database.query(`
        SELECT 
          c.id,
          c.identificacion,
          c.nombre,
          c.telefono,
          c.correo,
          COUNT(f.id) as total_facturas,
          SUM(f.total) as total_facturado,
          SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as total_pagado,
          MAX(f.fecha_emision) as ultima_factura
        FROM clientes c
        INNER JOIN facturas f ON c.id = f.cliente_id
        WHERE f.fecha_emision >= ?
          AND f.activo = '1'
        GROUP BY c.id, c.identificacion, c.nombre, c.telefono, c.correo
        ORDER BY total_facturado DESC
        LIMIT ?
      `, [fechaDesde, parseInt(limit)]);

      res.json({
        success: true,
        data: {
          periodo: periodo,
          fecha_desde: fechaDesde,
          clientes: topClientes
        },
        message: 'Top clientes obtenidos exitosamente'
      });
    } catch (error) {
      console.error('❌ Error obteniendo top clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo top clientes',
        error: error.message
      });
    }
  }
}

console.log('✅ EstadisticasController inicializado correctamente');

module.exports = EstadisticasController;