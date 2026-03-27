// backend/controllers/estadisticasController.js
// CONTROLADOR COMPLETO DE ESTADÍSTICAS PARA ERP PSI

const { Database } = require('../models/Database');

class EstadisticasController {

  /**
   * Determinar el sedeId efectivo según el rol del usuario.
   * - Admin puede ver todo (sedeId=null) o filtrar por una sede específica (?sede_id=X)
   * - Supervisor/Secretaria solo ven su sede
   */
  static resolverSedeId(req) {
    const rol = req.user?.rol;
    if (rol === 'administrador') {
      // Admin puede filtrar por sede_id en query, o ver todo (null)
      return req.query.sede_id ? parseInt(req.query.sede_id) : null;
    }
    // Supervisor / Secretaria: forzar su sede_id
    return req.user?.sede_id || null;
  }

  /**
   * Construir fragmento SQL para filtrar clientes por sede.
   * tableAlias: alias de la tabla clientes en el query (ej: 'c', 'cl')
   */
  static buildSedeFilter(sedeId, tableAlias = 'c') {
    if (!sedeId) return { sql: '', params: [] };
    return { sql: ` AND ${tableAlias}.ciudad_id = ?`, params: [sedeId] };
  }

  /**
   * Obtener estadísticas generales del dashboard
   * GET /api/v1/estadisticas/dashboard
   */
  static async getDashboardGeneral(req, res) {
    try {
      console.log('📊 [EstadisticasController] Obteniendo estadísticas generales del dashboard');

      const { fecha_desde, fecha_hasta } = req.query;
      const sedeId = EstadisticasController.resolverSedeId(req);

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
        metricasGerenciales,
        desglosePorSede
      ] = await Promise.all([
        EstadisticasController.getEstadisticasFinancieras(fechaDesde, fechaHasta, sedeId),
        EstadisticasController.getEstadisticasFinancieras(fechaDesdeAnterior, fechaHastaAnterior, sedeId),
        EstadisticasController.getEstadisticasClientes(sedeId),
        EstadisticasController.getEstadisticasOperacionales(sedeId),
        EstadisticasController.getTendenciasMensuales(sedeId),
        EstadisticasController.getMetricasGerenciales(fechaDesde, fechaHasta, sedeId),
        // Desglose por sede solo cuando admin ve todo (sin filtro)
        (req.user?.rol === 'administrador' && !sedeId)
          ? EstadisticasController.getDesglosePorSede(fechaDesde, fechaHasta)
          : Promise.resolve(null)
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
          sede_id: sedeId,
          sede_nombre: sedeId ? (req.user?.sede || null) : null,
          financieras,
          clientes,
          operacionales,
          tendencias,
          metricas_gerenciales: metricasGerenciales,
          desglose_por_sede: desglosePorSede,
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
   * Obtener desglose de métricas clave por sede/ciudad (solo admin sin filtro de sede).
   * Devuelve una fila por cada ciudad que tenga al menos un cliente.
   */
  static async getDesglosePorSede(fechaDesde, fechaHasta) {
    try {
      console.log('🏢 Obteniendo desglose por sede...');

      // Clientes por sede
      const clientesPorSede = await Database.query(`
        SELECT
          ci.id         AS sede_id,
          ci.nombre     AS sede_nombre,
          COUNT(cl.id)  AS total_clientes,
          SUM(CASE WHEN cl.estado = 'activo'     THEN 1 ELSE 0 END) AS activos,
          SUM(CASE WHEN cl.estado = 'suspendido' THEN 1 ELSE 0 END) AS suspendidos,
          SUM(CASE WHEN cl.estado = 'cortado'    THEN 1 ELSE 0 END) AS cortados,
          SUM(CASE WHEN cl.estado = 'retirado'   THEN 1 ELSE 0 END) AS retirados,
          SUM(CASE WHEN cl.estado = 'inactivo'   THEN 1 ELSE 0 END) AS inactivos,
          SUM(CASE WHEN MONTH(cl.created_at) = MONTH(CURDATE()) AND YEAR(cl.created_at) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS nuevos_mes
        FROM ciudades ci
        INNER JOIN clientes cl ON cl.ciudad_id = ci.id
        GROUP BY ci.id, ci.nombre
        ORDER BY total_clientes DESC
      `);

      // Facturación por sede para el período dado
      const facturacionPorSede = await Database.query(`
        SELECT
          cl.ciudad_id                                               AS sede_id,
          COUNT(f.id)                                                AS total_facturas,
          COALESCE(SUM(f.total), 0)                                  AS valor_facturado,
          COALESCE(SUM(CASE WHEN f.estado = 'pagada'    THEN f.total ELSE 0 END), 0) AS valor_recaudado,
          COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','vencida') THEN f.total ELSE 0 END), 0) AS cartera_pendiente,
          COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','vencida') AND f.fecha_vencimiento < CURDATE() THEN f.total ELSE 0 END), 0) AS cartera_vencida
        FROM facturas f
        INNER JOIN clientes cl ON f.cliente_id = cl.id
        WHERE f.fecha_emision BETWEEN ? AND ?
          AND f.activo = '1'
        GROUP BY cl.ciudad_id
      `, [fechaDesde, fechaHasta]);

      // Servicios activos y contratos activos por sede
      const serviciosPorSede = await Database.query(`
        SELECT
          cl.ciudad_id                                                 AS sede_id,
          COUNT(sc.id)                                                 AS servicios_activos,
          COALESCE(SUM(COALESCE(sc.precio_personalizado, ps.precio)), 0) AS mrr
        FROM servicios_cliente sc
        INNER JOIN clientes cl ON sc.cliente_id = cl.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.estado = 'activo'
        GROUP BY cl.ciudad_id
      `);

      const contratosPorSede = await Database.query(`
        SELECT
          cl.ciudad_id                                                AS sede_id,
          COUNT(co.id)                                                AS total_contratos,
          SUM(CASE WHEN co.estado = 'activo' THEN 1 ELSE 0 END)      AS contratos_activos
        FROM contratos co
        INNER JOIN clientes cl ON co.cliente_id = cl.id
        GROUP BY cl.ciudad_id
      `);

      // Indexar los sub-resultados por sede_id para O(1) lookup
      const facMap = {};
      for (const r of facturacionPorSede) facMap[r.sede_id] = r;
      const svcMap = {};
      for (const r of serviciosPorSede) svcMap[r.sede_id] = r;
      const conMap = {};
      for (const r of contratosPorSede) conMap[r.sede_id] = r;

      return clientesPorSede.map(s => {
        const f = facMap[s.sede_id] || {};
        const sv = svcMap[s.sede_id] || {};
        const co = conMap[s.sede_id] || {};
        return {
          sede_id:           s.sede_id,
          sede_nombre:       s.sede_nombre,
          clientes: {
            total:       parseInt(s.total_clientes) || 0,
            activos:     parseInt(s.activos) || 0,
            suspendidos: parseInt(s.suspendidos) || 0,
            cortados:    parseInt(s.cortados) || 0,
            retirados:   parseInt(s.retirados) || 0,
            inactivos:   parseInt(s.inactivos) || 0,
            nuevos_mes:  parseInt(s.nuevos_mes) || 0,
          },
          facturacion: {
            total_facturas:   parseInt(f.total_facturas) || 0,
            valor_facturado:  parseFloat(f.valor_facturado) || 0,
            valor_recaudado:  parseFloat(f.valor_recaudado) || 0,
            cartera_pendiente: parseFloat(f.cartera_pendiente) || 0,
            cartera_vencida:  parseFloat(f.cartera_vencida) || 0,
            tasa_recaudo: f.valor_facturado > 0
              ? parseFloat(((f.valor_recaudado / f.valor_facturado) * 100).toFixed(2))
              : 0,
          },
          servicios: {
            activos: parseInt(sv.servicios_activos) || 0,
            mrr:     parseFloat(sv.mrr) || 0,
          },
          contratos: {
            total:   parseInt(co.total_contratos) || 0,
            activos: parseInt(co.contratos_activos) || 0,
          },
        };
      });
    } catch (error) {
      console.error('❌ Error obteniendo desglose por sede:', error);
      return [];
    }
  }

  /**
   * Obtener métricas gerenciales avanzadas
   */
  static async getMetricasGerenciales(fechaDesde, fechaHasta, sedeId = null) {
    try {
      console.log('📊 Obteniendo métricas gerenciales avanzadas...');

      const sedeWhereC = sedeId ? ` AND c.ciudad_id = ?` : '';
      const sedeParam = sedeId ? [sedeId] : [];

      // ARPU (Average Revenue Per User) - Ingreso promedio por usuario
      const [arpu] = await Database.query(`
        SELECT
          COUNT(DISTINCT c.id) as total_clientes_activos,
          COALESCE(SUM(f.total), 0) as ingresos_totales,
          COALESCE(SUM(f.total) / NULLIF(COUNT(DISTINCT c.id), 0), 0) as arpu
        FROM clientes c
        LEFT JOIN facturas f ON c.id = f.cliente_id
          AND f.fecha_emision BETWEEN ? AND ?
          AND f.activo = '1'
        WHERE c.estado = 'activo'${sedeWhereC}
      `, [fechaDesde, fechaHasta, ...sedeParam]);

      // LTV (Customer Lifetime Value) - Valor de vida del cliente
      const [ltv] = await Database.query(`
        SELECT
          AVG(valor_total_cliente) as ltv_promedio,
          MAX(valor_total_cliente) as ltv_maximo,
          MIN(valor_total_cliente) as ltv_minimo
        FROM (
          SELECT
            cliente_id,
            SUM(total) as valor_total_cliente
          FROM facturas
          WHERE estado = 'pagada'
            AND activo = '1'
          GROUP BY cliente_id
        ) as clientes_ltv
      `);

      // Tasa de retención
      const [retencion] = await Database.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN estado = 'activo' AND created_at < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN id END) as clientes_antiguos_activos,
          COUNT(DISTINCT CASE WHEN created_at < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN id END) as total_clientes_antiguos
        FROM clientes
      `);

      const tasaRetencion = retencion.total_clientes_antiguos > 0
        ? (retencion.clientes_antiguos_activos / retencion.total_clientes_antiguos) * 100
        : 0;

      // Eficiencia de cobro (DSO - Days Sales Outstanding)
      const [dso] = await Database.query(`
        SELECT
          AVG(DATEDIFF(COALESCE(fecha_pago, CURDATE()), fecha_emision)) as dias_promedio_cobro
        FROM facturas
        WHERE fecha_emision BETWEEN ? AND ?
          AND activo = '1'
      `, [fechaDesde, fechaHasta]);

      // ROI de instalaciones
      const [roiInstalaciones] = await Database.query(`
        SELECT
          SUM(costo_instalacion) as ingresos_instalaciones,
          COUNT(DISTINCT cliente_id) as clientes_instalados,
          AVG(costo_instalacion) as costo_promedio_instalacion
        FROM instalaciones
        WHERE estado = 'completada'
          AND fecha_realizada BETWEEN ? AND ?
      `, [fechaDesde, fechaHasta]);

      // Ingresos proyectados (basado en contratos activos)
      const [proyeccion] = await Database.query(`
        SELECT
          COUNT(*) as contratos_activos,
          SUM(COALESCE(sc.precio_personalizado, ps.precio)) as mrr_actual,
          SUM(COALESCE(sc.precio_personalizado, ps.precio)) * 12 as arr_proyectado
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.estado = 'activo'
      `);

      // Eficiencia operativa
      const [eficiencia] = await Database.query(`
        SELECT
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) as instalaciones_completadas,
          COUNT(*) as total_instalaciones,
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as tasa_exito_instalaciones,
          AVG(CASE WHEN estado = 'completada' THEN DATEDIFF(fecha_realizada, fecha_programada) END) as dias_promedio_instalacion
        FROM instalaciones
        WHERE fecha_programada BETWEEN ? AND ?
      `, [fechaDesde, fechaHasta]);

      // Satisfacción del cliente (basado en PQRs resueltas vs escaladas)
      const [satisfaccion] = await Database.query(`
        SELECT
          COUNT(CASE WHEN estado IN ('resuelto', 'cerrado') THEN 1 END) as pqr_resueltas,
          COUNT(CASE WHEN estado = 'escalado' THEN 1 END) as pqr_escaladas,
          COUNT(*) as total_pqr,
          COUNT(CASE WHEN estado IN ('resuelto', 'cerrado') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as indice_satisfaccion
        FROM pqr
        WHERE fecha_recepcion BETWEEN ? AND ?
      `, [fechaDesde, fechaHasta]);

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
        instalaciones: {
          ingresos: parseFloat(roiInstalaciones.ingresos_instalaciones) || 0,
          clientes_instalados: parseInt(roiInstalaciones.clientes_instalados) || 0,
          costo_promedio: parseFloat(roiInstalaciones.costo_promedio_instalacion) || 0
        },
        proyeccion: {
          mrr: parseFloat(proyeccion.mrr_actual) || 0, // Monthly Recurring Revenue
          arr: parseFloat(proyeccion.arr_proyectado) || 0, // Annual Recurring Revenue
          contratos_activos: parseInt(proyeccion.contratos_activos) || 0
        },
        eficiencia_operativa: {
          tasa_exito_instalaciones: parseFloat(eficiencia.tasa_exito_instalaciones) || 0,
          dias_promedio_instalacion: parseFloat(eficiencia.dias_promedio_instalacion) || 0,
          instalaciones_completadas: parseInt(eficiencia.instalaciones_completadas) || 0,
          total_instalaciones: parseInt(eficiencia.total_instalaciones) || 0
        },
        satisfaccion_cliente: {
          indice: parseFloat(satisfaccion.indice_satisfaccion) || 0,
          pqr_resueltas: parseInt(satisfaccion.pqr_resueltas) || 0,
          pqr_escaladas: parseInt(satisfaccion.pqr_escaladas) || 0,
          total_pqr: parseInt(satisfaccion.total_pqr) || 0
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo métricas gerenciales:', error);
      // Retornar valores por defecto en caso de error
      return {
        arpu: { valor: 0, total_clientes: 0, ingresos_totales: 0 },
        ltv: { promedio: 0, maximo: 0, minimo: 0 },
        retencion: { tasa: 0, clientes_retenidos: 0, total_evaluados: 0 },
        cobro: { dso: 0, descripcion: 'Días promedio para cobrar una factura' },
        instalaciones: { ingresos: 0, clientes_instalados: 0, costo_promedio: 0 },
        proyeccion: { mrr: 0, arr: 0, contratos_activos: 0 },
        eficiencia_operativa: { tasa_exito_instalaciones: 0, dias_promedio_instalacion: 0, instalaciones_completadas: 0, total_instalaciones: 0 },
        satisfaccion_cliente: { indice: 0, pqr_resueltas: 0, pqr_escaladas: 0, total_pqr: 0 }
      };
    }
  }

  /**
   * Obtener estadísticas financieras
   */
  static async getEstadisticasFinancieras(fechaDesde, fechaHasta, sedeId = null) {
    try {
      console.log('💰 Obteniendo estadísticas financieras...');

      const sedeFilter = EstadisticasController.buildSedeFilter(sedeId, 'c');
      const sedeJoin = sedeId ? ' INNER JOIN clientes c ON f.cliente_id = c.id' : '';
      const sedeWhere = sedeId ? ` AND c.ciudad_id = ?` : '';
      const sedeParam = sedeId ? [sedeId] : [];

      // Facturación del periodo
      const [facturacionPeriodo] = await Database.query(`
        SELECT
          COUNT(*) as total_facturas,
          SUM(f.total) as total_facturado,
          SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as total_recaudado,
          SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END) as total_pendiente,
          SUM(CASE WHEN f.estado = 'vencida' OR (f.estado = 'pendiente' AND f.fecha_vencimiento < CURDATE()) THEN f.total ELSE 0 END) as total_vencido,
          AVG(f.total) as promedio_factura
        FROM facturas f${sedeJoin}
        WHERE f.fecha_emision BETWEEN ? AND ?
          AND f.activo = '1'${sedeWhere}
      `, [fechaDesde, fechaHasta, ...sedeParam]);

      // Cartera total (toda la activa)
      const [carteraTotal] = await Database.query(`
        SELECT
          COUNT(DISTINCT f.cliente_id) as clientes_con_deuda,
          SUM(f.total) as cartera_total,
          SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) > 0 THEN f.total ELSE 0 END) as cartera_vencida,
          SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 1 AND 30 THEN f.total ELSE 0 END) as mora_1_30,
          SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 31 AND 60 THEN f.total ELSE 0 END) as mora_31_60,
          SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) > 60 THEN f.total ELSE 0 END) as mora_mayor_60
        FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE f.estado IN ('pendiente', 'vencida')
          AND f.activo = '1'${sedeWhere}
      `, sedeParam);

      // Tasa de recaudo
      const tasaRecaudo = facturacionPeriodo.total_facturado > 0
        ? (facturacionPeriodo.total_recaudado / facturacionPeriodo.total_facturado) * 100
        : 0;

      // Pagos realizados en el periodo
      const [pagos] = await Database.query(`
        SELECT
          COUNT(*) as total_pagos,
          SUM(p.monto) as monto_total_pagos,
          COUNT(DISTINCT p.metodo_pago) as metodos_diferentes,
          COUNT(DISTINCT p.cliente_id) as clientes_pagaron
        FROM pagos p${sedeId ? ' INNER JOIN clientes c ON p.cliente_id = c.id' : ''}
        WHERE p.fecha_pago BETWEEN ? AND ?${sedeWhere}
      `, [fechaDesde, fechaHasta, ...sedeParam]);

      // Facturación por método de pago
      const facturacionPorMetodo = await Database.query(`
        SELECT
          f.metodo_pago,
          COUNT(*) as cantidad,
          SUM(f.total) as monto_total
        FROM facturas f${sedeJoin}
        WHERE f.fecha_pago BETWEEN ? AND ?
          AND f.estado = 'pagada'
          AND f.activo = '1'${sedeWhere}
        GROUP BY f.metodo_pago
        ORDER BY monto_total DESC
      `, [fechaDesde, fechaHasta, ...sedeParam]);

      // Top 10 deudores con cartera vencida
      const topDeudores = await Database.query(`
        SELECT
          c.nombre,
          c.identificacion,
          c.telefono,
          c.ruta,
          COUNT(f.id)                               AS facturas_vencidas,
          SUM(f.total)                              AS deuda_total,
          MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) AS max_dias_mora
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE f.estado IN ('pendiente','vencida')
          AND f.activo = '1'
          AND f.fecha_vencimiento < CURDATE()${sedeWhere}
        GROUP BY c.id, c.nombre, c.identificacion, c.telefono, c.ruta
        ORDER BY deuda_total DESC
        LIMIT 10
      `, sedeParam);

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
        },
        top_deudores: topDeudores.map(d => ({
          nombre: d.nombre,
          identificacion: d.identificacion,
          telefono: d.telefono || '',
          ruta: d.ruta || '',
          facturas_vencidas: parseInt(d.facturas_vencidas) || 0,
          deuda_total: parseFloat(d.deuda_total) || 0,
          max_dias_mora: parseInt(d.max_dias_mora) || 0
        }))
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas financieras:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  static async getEstadisticasClientes(sedeId = null) {
    try {
      console.log('👥 Obteniendo estadísticas de clientes...');

      const sedeWhere = sedeId ? ' AND cl.ciudad_id = ?' : '';
      const sedeParam = sedeId ? [sedeId] : [];
      const sedeWhereSimple = sedeId ? ' AND ciudad_id = ?' : '';

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
        WHERE 1=1${sedeWhereSimple}
      `, sedeParam);

      // Distribución por sectores
      const distribucionSectores = await Database.query(`
        SELECT
          COALESCE(s.codigo, 'S/C') as codigo,
          COALESCE(s.nombre, 'Sin sector') as sector,
          COALESCE(c.nombre, 'Sin ciudad') as ciudad,
          COUNT(cl.id) as total_clientes,
          CAST(SUM(CASE WHEN cl.estado = 'activo' THEN 1 ELSE 0 END) AS UNSIGNED) as clientes_activos
        FROM clientes cl
        LEFT JOIN sectores s ON cl.sector_id = s.id
        LEFT JOIN ciudades c ON cl.ciudad_id = c.id
        WHERE 1=1${sedeWhere}
        GROUP BY s.id, s.codigo, s.nombre, c.id, c.nombre
        HAVING total_clientes > 0
        ORDER BY total_clientes DESC
        LIMIT 10
      `, sedeParam);

      // Distribución por estratos
      const distribucionEstratos = await Database.query(`
        SELECT
          estrato,
          COUNT(*) as cantidad,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos
        FROM clientes
        WHERE estrato IS NOT NULL${sedeWhereSimple}
        GROUP BY estrato
        ORDER BY estrato
      `, sedeParam);

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
        WHERE sc.estado = 'activo'${sedeWhere}
        GROUP BY c.id, c.identificacion, c.nombre
        HAVING total_servicios > 1
        ORDER BY total_servicios DESC
        LIMIT 10
      `, sedeParam);

      // Churn rate (clientes perdidos en el mes)
      const [churnData] = await Database.query(`
        SELECT
          COUNT(*) as clientes_perdidos_mes,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo'${sedeWhereSimple}) as clientes_activos
        FROM clientes
        WHERE estado = 'retirado'
          AND MONTH(updated_at) = MONTH(CURDATE())
          AND YEAR(updated_at) = YEAR(CURDATE())${sedeWhereSimple}
      `, sedeId ? [sedeId, sedeId] : []);

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
  static async getEstadisticasOperacionales(sedeId = null) {
    try {
      console.log('🔧 Obteniendo estadísticas operacionales...');

      const sedeJoinInst = sedeId ? ' INNER JOIN clientes cl ON i.cliente_id = cl.id' : '';
      const sedeWhereInst = sedeId ? ` AND cl.ciudad_id = ?` : '';
      const sedeParam = sedeId ? [sedeId] : [];

      // Instalaciones
      const [instalaciones] = await Database.query(`
        SELECT
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN i.estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN i.estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN i.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN i.estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
          SUM(CASE WHEN i.fecha_programada < CURDATE() AND i.estado NOT IN ('completada', 'cancelada') THEN 1 ELSE 0 END) as vencidas,
          SUM(i.costo_instalacion) as ingresos_instalaciones,
          AVG(i.costo_instalacion) as promedio_costo
        FROM instalaciones i${sedeJoinInst}
        WHERE MONTH(i.created_at) = MONTH(CURDATE())
          AND YEAR(i.created_at) = YEAR(CURDATE())${sedeWhereInst}
      `, sedeParam);

      // Inventario (filtrado por sede si aplica - campo 'sede' en inventario_equipos)
      const invSedeWhere = sedeId ? ` AND ie.sede = (SELECT nombre FROM ciudades WHERE id = ? LIMIT 1)` : '';
      const [inventario] = await Database.query(`
        SELECT
          COUNT(*) as total_equipos,
          SUM(CASE WHEN ie.estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
          SUM(CASE WHEN ie.estado = 'asignado' THEN 1 ELSE 0 END) as asignados,
          SUM(CASE WHEN ie.estado = 'instalado' THEN 1 ELSE 0 END) as instalados,
          SUM(CASE WHEN ie.estado = 'dañado' THEN 1 ELSE 0 END) as dañados,
          SUM(CASE WHEN ie.estado = 'perdido' THEN 1 ELSE 0 END) as perdidos,
          SUM(CASE WHEN ie.estado = 'mantenimiento' THEN 1 ELSE 0 END) as en_mantenimiento,
          SUM(ie.precio_compra) as valor_total_inventario
        FROM inventario_equipos ie
        WHERE 1=1${invSedeWhere}
      `, sedeParam);

      // PQR
      const pqrSedeJoin = sedeId ? ' INNER JOIN clientes cl ON p.cliente_id = cl.id' : '';
      const pqrSedeWhere = sedeId ? ` AND cl.ciudad_id = ?` : '';
      const [pqr] = await Database.query(`
        SELECT
          COUNT(*) as total_pqr,
          SUM(CASE WHEN p.estado = 'abierto' THEN 1 ELSE 0 END) as abiertas,
          SUM(CASE WHEN p.estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN p.estado = 'resuelto' THEN 1 ELSE 0 END) as resueltas,
          SUM(CASE WHEN p.estado = 'cerrado' THEN 1 ELSE 0 END) as cerradas,
          SUM(CASE WHEN p.estado = 'escalado' THEN 1 ELSE 0 END) as escaladas,
          AVG(p.tiempo_respuesta_horas) as tiempo_promedio_respuesta
        FROM pqr p${pqrSedeJoin}
        WHERE MONTH(p.fecha_recepcion) = MONTH(CURDATE())
          AND YEAR(p.fecha_recepcion) = YEAR(CURDATE())${pqrSedeWhere}
      `, sedeParam);

      // Incidencias (generalmente globales, no por sede)
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
      const contratoSedeJoin = sedeId ? ' INNER JOIN clientes cl ON co.cliente_id = cl.id' : '';
      const contratoSedeWhere = sedeId ? ` AND cl.ciudad_id = ?` : '';
      const [contratos] = await Database.query(`
        SELECT
          COUNT(*) as total_contratos,
          SUM(CASE WHEN co.estado = 'activo' THEN 1 ELSE 0 END) as activos,
          SUM(CASE WHEN co.estado = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          SUM(CASE WHEN co.estado = 'terminado' THEN 1 ELSE 0 END) as terminados,
          SUM(CASE WHEN co.estado = 'anulado' THEN 1 ELSE 0 END) as anulados,
          SUM(CASE WHEN co.tipo_permanencia = 'con_permanencia' THEN 1 ELSE 0 END) as con_permanencia,
          SUM(CASE WHEN co.tipo_permanencia = 'sin_permanencia' THEN 1 ELSE 0 END) as sin_permanencia
        FROM contratos co${contratoSedeJoin}
        WHERE 1=1${contratoSedeWhere}
      `, sedeParam);

      // Servicios activos por tipo
      const servicioSedeJoin = sedeId ? ' INNER JOIN clientes cl ON sc.cliente_id = cl.id' : '';
      const servicioSedeWhere = sedeId ? ` AND cl.ciudad_id = ?` : '';
      const serviciosPorTipo = await Database.query(`
        SELECT
          ps.tipo,
          COUNT(sc.id) as cantidad,
          SUM(COALESCE(sc.precio_personalizado, ps.precio)) as ingresos_mensuales
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id${servicioSedeJoin}
        WHERE sc.estado = 'activo'${servicioSedeWhere}
        GROUP BY ps.tipo
        ORDER BY cantidad DESC
      `, sedeParam);

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
  static async getTendenciasMensuales(sedeId = null) {
    try {
      console.log('📈 Obteniendo tendencias mensuales...');

      const sedeJoinF = sedeId ? ' INNER JOIN clientes c ON f.cliente_id = c.id' : '';
      const sedeWhereF = sedeId ? ` AND c.ciudad_id = ?` : '';
      const sedeJoinI = sedeId ? ' INNER JOIN clientes cl ON i.cliente_id = cl.id' : '';
      const sedeWhereI = sedeId ? ` AND cl.ciudad_id = ?` : '';
      const sedeParam = sedeId ? [sedeId] : [];
      const sedeWhereC = sedeId ? ` AND ciudad_id = ?` : '';

      // Tendencias de facturación (reemplaza la vista si existe)
      let tendenciasFacturacion = [];
      try {
        tendenciasFacturacion = await Database.query(`
          SELECT
            DATE_FORMAT(f.fecha_emision, '%Y-%m') as periodo,
            COUNT(*) as total_facturas,
            SUM(f.total) as valor_total_facturado,
            SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as valor_recaudado,
            SUM(CASE WHEN f.estado IN ('pendiente','vencida') THEN f.total ELSE 0 END) as valor_pendiente_cobro,
            AVG(f.total) as promedio_factura,
            COUNT(DISTINCT f.cliente_id) as clientes_facturados
          FROM facturas f${sedeJoinF}
          WHERE f.fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            AND f.activo = '1'${sedeWhereF}
          GROUP BY DATE_FORMAT(f.fecha_emision, '%Y-%m')
          ORDER BY periodo DESC
          LIMIT 12
        `, sedeParam);
      } catch (e) {
        console.warn('⚠️ Error obteniendo tendencias de facturación:', e.message);
      }

      // Tendencia de clientes nuevos por mes
      const tendenciasClientes = await Database.query(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') as periodo,
          COUNT(*) as clientes_nuevos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos
        FROM clientes
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)${sedeWhereC}
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY periodo DESC
        LIMIT 12
      `, sedeParam);

      // Tendencia de instalaciones por mes
      const tendenciasInstalaciones = await Database.query(`
        SELECT
          DATE_FORMAT(i.created_at, '%Y-%m') as periodo,
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(i.costo_instalacion) as ingresos
        FROM instalaciones i${sedeJoinI}
        WHERE i.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)${sedeWhereI}
        GROUP BY DATE_FORMAT(i.created_at, '%Y-%m')
        ORDER BY periodo DESC
        LIMIT 12
      `, sedeParam);

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
      const sedeId = EstadisticasController.resolverSedeId(req);

      const estadisticas = await EstadisticasController.getEstadisticasFinancieras(fechaDesde, fechaHasta, sedeId);

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
      const sedeId = EstadisticasController.resolverSedeId(req);
      const estadisticas = await EstadisticasController.getEstadisticasClientes(sedeId);

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
      const sedeId = EstadisticasController.resolverSedeId(req);
      const estadisticas = await EstadisticasController.getEstadisticasOperacionales(sedeId);

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

      const sedeId = EstadisticasController.resolverSedeId(req);
      const sedeWhere = sedeId ? ` AND c.ciudad_id = ?` : '';
      const queryParams = sedeId
        ? [fechaDesde, sedeId, parseInt(limit)]
        : [fechaDesde, parseInt(limit)];

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
          AND f.activo = '1'${sedeWhere}
        GROUP BY c.id, c.identificacion, c.nombre, c.telefono, c.correo
        ORDER BY total_facturado DESC
        LIMIT ?
      `, queryParams);

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