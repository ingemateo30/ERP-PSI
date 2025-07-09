// ========================================
// backend/services/FacturacionAutomaticaService.js
// Servicio completo de facturación automática con reglas correctas de IVA
// ========================================

const Database = require('../models/Database');
const IVACalculatorService = require('./IVACalculatorService');

class FacturacionAutomaticaService {

  /**
   * Generar factura automática para un cliente
   * @param {number} clienteId - ID del cliente
   * @param {object} opciones - Opciones adicionales
   * @returns {object} Resultado de la facturación
   */
  static async generarFacturaAutomatica(clienteId, opciones = {}) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      // 1. Obtener datos del cliente
      const cliente = await this.obtenerDatosCliente(clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // 2. Calcular período de facturación
      const periodo = await this.calcularPeriodoFacturacion(clienteId, opciones.fechaFacturacion);

      // 3. Generar número de factura
      const numeroFactura = await this.generarNumeroFactura();

      // 4. Obtener servicios activos del cliente
      const serviciosActivos = await this.obtenerServiciosActivos(clienteId);

      // 5. Calcular conceptos de facturación
      const conceptos = await this.calcularConceptosFacturacion(
        cliente, 
        serviciosActivos, 
        periodo
      );

      // 6. Calcular totales con IVA correcto
      const totales = await this.calcularTotalesConIVA(conceptos, cliente);

      // 7. Crear registro de factura
      const facturaId = await this.crearFacturaPrincipal({
        numeroFactura,
        cliente,
        periodo,
        totales,
        conceptos
      });

      // 8. Crear detalles de factura
      await this.crearDetallesFactura(facturaId, conceptos);

      // 9. Actualizar consecutivos
      await this.actualizarConsecutivos();

      await conexion.commit();

      return {
        success: true,
        factura_id: facturaId,
        numero_factura: numeroFactura,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre_completo,
          identificacion: cliente.numero_identificacion
        },
        periodo: periodo,
        totales: totales,
        conceptos: conceptos.length,
        mensaje: 'Factura generada exitosamente'
      };

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error generando factura automática:', error);
      throw error;
    } finally {
      await conexion.release();
    }
  }

  /**
   * Obtener datos completos del cliente incluyendo estrato
   */
  static async obtenerDatosCliente(clienteId) {
    const query = `
      SELECT 
        c.*,
        COALESCE(c.estrato, 3) as estrato,
        CONCAT(c.nombres, ' ', c.apellidos) as nombre_completo,
        d.nombre as departamento,
        cd.nombre as ciudad,
        s.nombre as sector
      FROM clientes c
      LEFT JOIN departamentos d ON c.departamento_id = d.id
      LEFT JOIN ciudades cd ON c.ciudad_id = cd.id  
      LEFT JOIN sectores s ON c.sector_id = s.id
      WHERE c.id = ? AND c.activo = 1
    `;

    const resultado = await Database.query(query, [clienteId]);
    return resultado.length > 0 ? resultado[0] : null;
  }

  /**
   * Calcular período de facturación según reglas del negocio
   */
  static async calcularPeriodoFacturacion(clienteId, fechaFacturacion = null) {
    const fechaActual = fechaFacturacion ? new Date(fechaFacturacion) : new Date();
    
    // Obtener última factura del cliente
    const ultimaFactura = await Database.query(`
      SELECT fecha_hasta, DATE(fecha_hasta) as ultimo_dia_facturado
      FROM facturas 
      WHERE cliente_id = ? AND activo = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [clienteId]);

    let fechaDesde, fechaHasta, esPrimeraFactura = false;

    if (ultimaFactura.length === 0) {
      // PRIMERA FACTURA: Desde fecha actual hasta 30 días después
      esPrimeraFactura = true;
      fechaDesde = new Date(fechaActual);
      fechaHasta = new Date(fechaActual);
      fechaHasta.setDate(fechaHasta.getDate() + 30);
    } else {
      // SEGUNDA FACTURA EN ADELANTE
      const ultimoDiaFacturado = new Date(ultimaFactura[0].ultimo_dia_facturado);
      fechaDesde = new Date(ultimoDiaFacturado);
      fechaDesde.setDate(fechaDesde.getDate() + 1);
      
      // Para segunda factura: nivelar al final del mes
      const esSegundaFactura = await this.esSegundaFactura(clienteId);
      
      if (esSegundaFactura) {
        // Facturar hasta final del mes para nivelar
        fechaHasta = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth() + 1, 0);
      } else {
        // Facturas normales: ciclo mensual completo
        fechaHasta = new Date(fechaDesde);
        fechaHasta.setDate(fechaHasta.getDate() + 29); // 30 días
      }
    }

    const diasFacturados = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;

    return {
      fecha_desde: fechaDesde.toISOString().split('T')[0],
      fecha_hasta: fechaHasta.toISOString().split('T')[0],
      dias_facturados: diasFacturados,
      es_primera_factura: esPrimeraFactura,
      periodo_facturacion: `${fechaDesde.toISOString().split('T')[0]} al ${fechaHasta.toISOString().split('T')[0]}`
    };
  }

  /**
   * Verificar si es la segunda factura del cliente
   */
  static async esSegundaFactura(clienteId) {
    const facturas = await Database.query(`
      SELECT COUNT(*) as total 
      FROM facturas 
      WHERE cliente_id = ? AND activo = 1
    `, [clienteId]);
    
    return facturas[0].total === 1;
  }

  /**
   * Obtener servicios activos del cliente
   */
  static async obtenerServiciosActivos(clienteId) {
    const query = `
      SELECT 
        sc.*,
        p.codigo as codigo_plan,
        p.nombre as nombre_plan,
        p.tipo as tipo_plan,
        p.precio as precio_plan,
        p.precio_internet,
        p.precio_television,
        COALESCE(sc.precio_personalizado, p.precio) as precio_servicio,
        CASE 
          WHEN p.precio_internet > 0 AND p.precio_television > 0 THEN 'combo'
          WHEN p.precio_internet > 0 THEN 'internet'
          WHEN p.precio_television > 0 THEN 'television'
          ELSE 'otro'
        END as tipo
      FROM servicios_cliente sc
      INNER JOIN planes_servicio p ON sc.plan_id = p.id
      WHERE sc.cliente_id = ? 
        AND sc.estado = 'activo'
        AND sc.activo = 1
        AND p.activo = 1
    `;

    return await Database.query(query, [clienteId]);
  }

  /**
   * Calcular conceptos de facturación con IVA correcto
   */
  static async calcularConceptosFacturacion(cliente, serviciosActivos, periodo) {
    const conceptos = [];

    // 1. SERVICIOS CONTRATADOS (Internet, TV, etc.)
    for (const servicio of serviciosActivos) {
      const conceptoServicio = await this.calcularConceptoServicio(servicio, periodo, cliente);
      if (conceptoServicio) {
        conceptos.push(conceptoServicio);
      }
    }

    // 2. CARGO DE INSTALACIÓN (solo primera factura)
    if (periodo.es_primera_factura) {
      const conceptoInstalacion = this.calcularConceptoInstalacion();
      conceptos.push(conceptoInstalacion);
    }

    // 3. SALDO ANTERIOR (si existe deuda pendiente)
    const saldoAnterior = await this.obtenerSaldoAnterior(cliente.id);
    if (saldoAnterior > 0) {
      conceptos.push({
        tipo: 'saldo_anterior',
        concepto: 'Saldo anterior',
        cantidad: 1,
        precio_unitario: saldoAnterior,
        valor: saldoAnterior,
        aplica_iva: false,
        porcentaje_iva: 0
      });
    }

    // 4. INTERESES POR MORA (sin IVA según reglas)
    const interesesMora = await this.calcularInteresesMora(cliente.id);
    if (interesesMora > 0) {
      conceptos.push({
        tipo: 'interes',
        concepto: 'Intereses por mora',
        cantidad: 1,
        precio_unitario: interesesMora,
        valor: interesesMora,
        aplica_iva: false,
        porcentaje_iva: 0
      });
    }

    // 5. VARIOS Y DESCUENTOS PENDIENTES
    const variosDescuentos = await this.obtenerVariosDescuentosPendientes(cliente.id);
    conceptos.push(...variosDescuentos);

    return conceptos;
  }

  /**
   * Calcular concepto de servicio con IVA correcto según estrato
   */
  static async calcularConceptoServicio(servicio, periodo, cliente) {
    try {
      // Obtener precio del servicio (personalizado o del plan)
      const precioServicio = servicio.precio_personalizado || servicio.precio_servicio;
      
      // Calcular valor proporcional según días facturados
      let valorServicio = precioServicio;
      if (periodo.dias_facturados !== 30) {
        valorServicio = (precioServicio / 30) * periodo.dias_facturados;
        valorServicio = Math.round(valorServicio);
      }

      // Determinar aplicación de IVA según reglas del negocio y estrato del cliente
      const configuracionIVA = IVACalculatorService.determinarIVA(servicio.tipo, cliente.estrato);

      return {
        tipo: servicio.tipo,
        concepto: `${servicio.nombre_plan} - ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
        cantidad: 1,
        precio_unitario: valorServicio,
        valor: valorServicio,
        aplica_iva: configuracionIVA.aplica,
        porcentaje_iva: configuracionIVA.porcentaje,
        dias_facturados: periodo.dias_facturados,
        servicio_cliente_id: servicio.id,
        estrato_cliente: cliente.estrato,
        descripcion_iva: IVACalculatorService.obtenerDescripcionIVA(servicio.tipo, cliente.estrato)
      };

    } catch (error) {
      console.error(`Error calculando concepto de servicio:`, error);
      return null;
    }
  }

  /**
   * Calcular concepto de instalación (primera factura) - Siempre con IVA 19%
   */
  static calcularConceptoInstalacion() {
    const valorInstalacion = 42016; // Valor fijo según instrucciones

    return {
      tipo: 'varios',
      concepto: 'Cargo por instalación',
      cantidad: 1,
      precio_unitario: valorInstalacion,
      valor: valorInstalacion,
      aplica_iva: true,
      porcentaje_iva: 19,
      descripcion_iva: 'INSTALACIÓN: IVA 19% (Todos los estratos)'
    };
  }

  /**
   * Calcular totales de la factura con IVA correcto
   */
  static async calcularTotalesConIVA(conceptos, cliente) {
    // Usar el servicio de IVA para calcular conceptos con IVA correcto
    const conceptosConIVA = await IVACalculatorService.calcularConceptosConIVA(conceptos, cliente);
    
    // Generar resumen de impuestos
    const resumenImpuestos = IVACalculatorService.generarResumenImpuestos(conceptosConIVA);

    // Estructurar según formato actual de la base de datos
    return {
      // Valores base sin IVA
      internet: resumenImpuestos.desglose_iva.internet.base,
      television: resumenImpuestos.desglose_iva.television.base,
      varios: resumenImpuestos.desglose_iva.varios.base,
      publicidad: resumenImpuestos.desglose_iva.publicidad.base,
      descuento: resumenImpuestos.desglose_iva.descuento.base,
      interes: resumenImpuestos.desglose_iva.interes.base,
      reconexion: resumenImpuestos.desglose_iva.reconexion.base,
      saldo_anterior: conceptos.find(c => c.tipo === 'saldo_anterior')?.valor || 0,

      // Valores de IVA por categoría
      s_internet: resumenImpuestos.desglose_iva.internet.iva,
      s_television: resumenImpuestos.desglose_iva.television.iva,
      s_varios: resumenImpuestos.desglose_iva.varios.iva,
      s_publicidad: resumenImpuestos.desglose_iva.publicidad.iva,
      s_descuento: resumenImpuestos.desglose_iva.descuento.iva,
      s_interes: resumenImpuestos.desglose_iva.interes.iva,
      s_reconexion: resumenImpuestos.desglose_iva.reconexion.iva,
      s_iva: resumenImpuestos.total_iva,

      // Totales
      subtotal: resumenImpuestos.subtotal,
      iva: resumenImpuestos.total_iva,
      total: resumenImpuestos.total_con_iva,

      // Información adicional
      estrato_cliente: cliente.estrato,
      conceptos_con_iva: conceptosConIVA
    };
  }

  /**
   * Crear registro principal de factura
   */
  static async crearFacturaPrincipal(datos) {
    const { numeroFactura, cliente, periodo, totales } = datos;

    const fechaEmision = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 15); // 15 días para pagar

    const query = `
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento, 
        fecha_desde, fecha_hasta,
        internet, television, varios, publicidad, descuento, interes, reconexion, saldo_anterior,
        s_internet, s_television, s_varios, s_publicidad, s_descuento, s_interes, s_reconexion, s_iva,
        subtotal, iva, total, estado, ruta, consignacion,
        observaciones, activo, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const valores = [
      numeroFactura,
      cliente.id,
      cliente.numero_identificacion,
      cliente.nombre_completo,
      periodo.periodo_facturacion,
      fechaEmision.toISOString().split('T')[0],
      fechaVencimiento.toISOString().split('T')[0],
      periodo.fecha_desde,
      periodo.fecha_hasta,
      totales.internet,
      totales.television,
      totales.varios,
      totales.publicidad,
      totales.descuento,
      totales.interes,
      totales.reconexion,
      totales.saldo_anterior,
      totales.s_internet,
      totales.s_television,
      totales.s_varios,
      totales.s_publicidad,
      totales.s_descuento,
      totales.s_interes,
      totales.s_reconexion,
      totales.s_iva,
      totales.subtotal,
      totales.iva,
      totales.total,
      'emitida',
      cliente.ruta || '',
      '',
      `Factura generada automáticamente - Estrato ${cliente.estrato}`,
      1,
      new Date(),
      new Date()
    ];

    const resultado = await Database.query(query, valores);
    return resultado.insertId;
  }

  /**
   * Crear detalles de factura con información de IVA
   */
  static async crearDetallesFactura(facturaId, conceptos) {
    const detalles = [];

    for (const concepto of conceptos) {
      const valorIVA = concepto.aplica_iva ? 
        Math.round(concepto.valor * (concepto.porcentaje_iva / 100)) : 0;

      detalles.push([
        facturaId,
        concepto.tipo,
        concepto.concepto,
        concepto.cantidad || 1,
        concepto.precio_unitario || concepto.valor,
        concepto.valor,
        concepto.aplica_iva ? 1 : 0,
        concepto.porcentaje_iva || 0,
        valorIVA,
        concepto.valor + valorIVA,
        concepto.descripcion_iva || '',
        new Date(),
        new Date()
      ]);
    }

    if (detalles.length > 0) {
      const query = `
        INSERT INTO facturas_detalle (
          factura_id, tipo_concepto, concepto, cantidad, precio_unitario, 
          valor_base, aplica_iva, porcentaje_iva, valor_iva, valor_total,
          observaciones, created_at, updated_at
        ) VALUES ?
      `;

      await Database.query(query, [detalles]);
    }
  }

  /**
   * Generar número de factura consecutivo
   */
  static async generarNumeroFactura() {
    const config = await Database.query(`
      SELECT consecutivo_factura, prefijo_factura 
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    const consecutivo = config[0]?.consecutivo_factura || 1;
    const prefijo = config[0]?.prefijo_factura || 'FAC';

    return `${prefijo}${String(consecutivo).padStart(6, '0')}`;
  }

  /**
   * Actualizar consecutivos de facturación
   */
  static async actualizarConsecutivos() {
    await Database.query(`
      UPDATE configuracion_empresa 
      SET consecutivo_factura = consecutivo_factura + 1,
          updated_at = NOW()
      WHERE id = 1
    `);
  }

  /**
   * Obtener saldo anterior del cliente
   */
  static async obtenerSaldoAnterior(clienteId) {
    const saldo = await Database.query(`
      SELECT COALESCE(SUM(total - COALESCE(pagado, 0)), 0) as saldo
      FROM facturas 
      WHERE cliente_id = ? 
        AND estado IN ('emitida', 'vencida') 
        AND activo = 1
    `, [clienteId]);

    return parseFloat(saldo[0]?.saldo) || 0;
  }

  /**
   * Calcular intereses por mora
   */
  static async calcularInteresesMora(clienteId) {
    // Obtener configuración de intereses
    const configInteres = await Database.query(`
      SELECT porcentaje_interes, dias_mora_corte
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    const porcentajeInteres = parseFloat(configInteres[0]?.porcentaje_interes) || 0;
    const diasMora = parseInt(configInteres[0]?.dias_mora_corte) || 30;

    if (porcentajeInteres === 0) return 0;

    // Calcular intereses sobre facturas vencidas
    const facturasMora = await Database.query(`
      SELECT 
        total,
        DATEDIFF(CURDATE(), fecha_vencimiento) as dias_vencido
      FROM facturas 
      WHERE cliente_id = ? 
        AND estado = 'vencida'
        AND DATEDIFF(CURDATE(), fecha_vencimiento) > ?
        AND activo = 1
    `, [clienteId, diasMora]);

    let totalIntereses = 0;
    facturasMora.forEach(factura => {
      const interesDiario = (factura.total * porcentajeInteres) / (100 * 30);
      totalIntereses += interesDiario * factura.dias_vencido;
    });

    return Math.round(totalIntereses);
  }

  /**
   * Obtener varios y descuentos pendientes
   */
  static async obtenerVariosDescuentosPendientes(clienteId) {
    const conceptosPendientes = await Database.query(`
      SELECT 
        'varios' as tipo,
        concepto,
        valor,
        observaciones
      FROM conceptos_pendientes 
      WHERE cliente_id = ? 
        AND estado = 'pendiente'
        AND activo = 1
    `, [clienteId]);

    return conceptosPendientes.map(concepto => ({
      tipo: concepto.tipo,
      concepto: concepto.concepto,
      cantidad: 1,
      precio_unitario: concepto.valor,
      valor: concepto.valor,
      aplica_iva: ['varios', 'reconexion'].includes(concepto.tipo),
      porcentaje_iva: ['varios', 'reconexion'].includes(concepto.tipo) ? 19 : 0,
      observaciones: concepto.observaciones
    }));
  }

  /**
   * Facturación masiva por período
   */
  static async facturacionMasiva(fechaFacturacion = null, filtros = {}) {
    try {
      console.log('🔄 Iniciando facturación masiva...');

      // Obtener clientes activos para facturar
      const clientesFacturar = await this.obtenerClientesParaFacturar(filtros);
      
      const resultados = {
        total_clientes: clientesFacturar.length,
        facturas_generadas: 0,
        facturas_fallidas: 0,
        errores: [],
        facturas_exitosas: []
      };

      for (const cliente of clientesFacturar) {
        try {
          const resultadoFactura = await this.generarFacturaAutomatica(
            cliente.id, 
            { fechaFacturacion }
          );

          resultados.facturas_generadas++;
          resultados.facturas_exitosas.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre_completo,
            numero_factura: resultadoFactura.numero_factura,
            total: resultadoFactura.totales.total
          });

          console.log(`✅ Factura generada: ${cliente.nombre_completo} - ${resultadoFactura.numero_factura}`);

        } catch (error) {
          resultados.facturas_fallidas++;
          resultados.errores.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre_completo,
            error: error.message
          });

          console.error(`❌ Error facturando ${cliente.nombre_completo}:`, error.message);
        }
      }

      console.log(`📊 Facturación masiva completada: ${resultados.facturas_generadas} exitosas, ${resultados.facturas_fallidas} fallidas`);
      
      return resultados;

    } catch (error) {
      console.error('❌ Error en facturación masiva:', error);
      throw error;
    }
  }

  /**
   * Obtener clientes que requieren facturación
   */
  static async obtenerClientesParaFacturar(filtros = {}) {
    let whereConditions = ['c.activo = 1', 'c.estado = "activo"'];
    let params = [];

    // Filtros opcionales
    if (filtros.ruta) {
      whereConditions.push('c.ruta = ?');
      params.push(filtros.ruta);
    }

    if (filtros.estrato) {
      whereConditions.push('c.estrato = ?');
      params.push(filtros.estrato);
    }

    if (filtros.sector_id) {
      whereConditions.push('c.sector_id = ?');
      params.push(filtros.sector_id);
    }

    const query = `
      SELECT 
        c.id,
        c.numero_identificacion,
        CONCAT(c.nombres, ' ', c.apellidos) as nombre_completo,
        c.estrato,
        c.ruta,
        -- Verificar si ya tiene factura del período actual
        (SELECT COUNT(*) 
         FROM facturas f 
         WHERE f.cliente_id = c.id 
           AND YEAR(f.fecha_emision) = YEAR(CURDATE())
           AND MONTH(f.fecha_emision) = MONTH(CURDATE())
           AND f.activo = 1
        ) as facturas_mes_actual,
        -- Verificar servicios activos
        (SELECT COUNT(*) 
         FROM servicios_cliente sc 
         WHERE sc.cliente_id = c.id 
           AND sc.estado = 'activo' 
           AND sc.activo = 1
        ) as servicios_activos
      FROM clientes c
      WHERE ${whereConditions.join(' AND ')}
      HAVING facturas_mes_actual = 0 
        AND servicios_activos > 0
      ORDER BY c.ruta, c.nombres, c.apellidos
    `;

    return await Database.query(query, params);
  }

  /**
   * Obtener estadísticas de facturación
   */
  static async obtenerEstadisticasFacturacion(periodo = null) {
    const fechaInicio = periodo?.fecha_inicio || 
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaFin = periodo?.fecha_fin || 
      new Date().toISOString().split('T')[0];

    const estadisticas = await Database.query(`
      SELECT 
        COUNT(*) as total_facturas,
        SUM(total) as total_facturado,
        SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as total_pagado,
        SUM(CASE WHEN estado = 'emitida' THEN total ELSE 0 END) as total_pendiente,
        SUM(CASE WHEN estado = 'vencida' THEN total ELSE 0 END) as total_vencido,
        AVG(total) as promedio_factura,
        
        -- Estadísticas por estrato
        SUM(CASE WHEN c.estrato IN (1,2,3) THEN f.total ELSE 0 END) as facturado_estrato_bajo,
        SUM(CASE WHEN c.estrato IN (4,5,6) THEN f.total ELSE 0 END) as facturado_estrato_alto,
        
        -- Estadísticas de IVA
        SUM(f.iva) as total_iva_recaudado,
        SUM(f.s_internet) as iva_internet,
        SUM(f.s_television) as iva_television,
        SUM(f.s_varios) as iva_varios,
        SUM(f.s_reconexion) as iva_reconexion,
        
        -- Distribución por tipo de servicio
        SUM(f.internet) as total_internet,
        SUM(f.television) as total_television,
        SUM(f.varios) as total_varios,
        SUM(f.reconexion) as total_reconexion
        
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      WHERE f.fecha_emision BETWEEN ? AND ?
        AND f.activo = 1
    `, [fechaInicio, fechaFin]);

    return estadisticas[0] || {};
  }

  /**
   * Validar factura antes de crear
   */
  static async validarFactura(clienteId, conceptos) {
    const validaciones = {
      valida: true,
      errores: [],
      advertencias: []
    };

    // 1. Verificar que el cliente existe y está activo
    const cliente = await this.obtenerDatosCliente(clienteId);
    if (!cliente) {
      validaciones.valida = false;
      validaciones.errores.push('Cliente no encontrado o inactivo');
      return validaciones;
    }

    // 2. Verificar servicios activos
    const serviciosActivos = await this.obtenerServiciosActivos(clienteId);
    if (serviciosActivos.length === 0) {
      validaciones.valida = false;
      validaciones.errores.push('El cliente no tiene servicios activos');
    }

    // 3. Verificar si ya existe factura del período
    const facturaExistente = await Database.query(`
      SELECT id, numero_factura 
      FROM facturas 
      WHERE cliente_id = ? 
        AND YEAR(fecha_emision) = YEAR(CURDATE())
        AND MONTH(fecha_emision) = MONTH(CURDATE())
        AND activo = 1
      LIMIT 1
    `, [clienteId]);

    if (facturaExistente.length > 0) {
      validaciones.advertencias.push(
        `Ya existe factura ${facturaExistente[0].numero_factura} para este período`
      );
    }

    // 4. Validar conceptos
    if (!conceptos || conceptos.length === 0) {
      validaciones.valida = false;
      validaciones.errores.push('No hay conceptos para facturar');
    }

    // 5. Validar estrato del cliente
    if (!cliente.estrato || cliente.estrato < 1 || cliente.estrato > 6) {
      validaciones.advertencias.push(
        `Estrato del cliente (${cliente.estrato}) puede ser incorrecto`
      );
    }

    return validaciones;
  }
}

module.exports = FacturacionAutomaticaService;