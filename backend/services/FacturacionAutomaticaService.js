// backend/services/FacturacionAutomaticaService.js
const { Database } = require('../models/Database');

class FacturacionAutomaticaService {
  
  /**
   * Crear factura automática cuando se registra un nuevo cliente
   */
  static async crearFacturaInicialCliente(clienteId, fechaInicio = null) {
    try {
      const fechaInicioServicio = fechaInicio || new Date();
      
      // Obtener datos del cliente y sus servicios
      const cliente = await this.obtenerDatosClienteCompletos(clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Calcular períodos de facturación según las reglas del negocio
      const periodos = this.calcularPeriodosFacturacion(fechaInicioServicio);
      
      // Crear primera factura (del día de inicio hasta 30 días después)
      const primeraFactura = await this.crearFacturaPeriodo(cliente, periodos.primer);
      
      console.log(`✅ Factura inicial creada para cliente ${cliente.nombre}: ${primeraFactura.numero_factura}`);
      
      return primeraFactura;

    } catch (error) {
      console.error('❌ Error creando factura inicial:', error);
      throw error;
    }
  }

  /**
   * Generar facturación mensual masiva para todos los clientes activos
   */
  static async generarFacturacionMensual(fechaReferencia = null) {
    try {
      const fecha = fechaReferencia || new Date();
      console.log(`🔄 Iniciando facturación mensual para: ${fecha.toISOString().split('T')[0]}`);
      
      // Obtener clientes que necesitan facturación este mes
      const clientesParaFacturar = await this.obtenerClientesParaFacturacion(fecha);
      
      const resultados = {
        exitosas: 0,
        fallidas: 0,
        errores: []
      };

      for (const cliente of clientesParaFacturar) {
        try {
          const factura = await this.procesarFacturacionCliente(cliente, fecha);
          resultados.exitosas++;
          console.log(`✅ Factura creada: ${factura.numero_factura} - ${cliente.nombre}`);
        } catch (error) {
          resultados.fallidas++;
          resultados.errores.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre,
            error: error.message
          });
          console.error(`❌ Error facturando cliente ${cliente.nombre}:`, error.message);
        }
      }

      console.log(`📊 Facturación mensual completada: ${resultados.exitosas} exitosas, ${resultados.fallidas} fallidas`);
      return resultados;

    } catch (error) {
      console.error('❌ Error en facturación mensual masiva:', error);
      throw error;
    }
  }

  /**
   * Obtener datos completos del cliente incluyendo servicios y planes
   */
  static async obtenerDatosClienteCompletos(clienteId) {
    const query = `
      SELECT 
        c.*,
        sc.id as servicio_id,
        sc.estado as estado_servicio,
        sc.fecha_instalacion,
        sc.fecha_activacion,
        ps.id as plan_id,
        ps.nombre as plan_nombre,
        ps.precio as plan_precio,
        ps.tipo as plan_tipo,
        ps.aplica_iva as plan_aplica_iva,
        s.codigo as sector_codigo
      FROM clientes c
      LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      LEFT JOIN sectores s ON c.sector_id = s.id
      WHERE c.id = ? AND c.activo = 1
    `;

    const resultados = await Database.query(query, [clienteId]);
    
    if (resultados.length === 0) {
      return null;
    }

    // Agrupar servicios del cliente
    const cliente = {
      ...resultados[0],
      servicios: resultados.filter(r => r.servicio_id).map(r => ({
        id: r.servicio_id,
        estado: r.estado_servicio,
        fecha_instalacion: r.fecha_instalacion,
        fecha_activacion: r.fecha_activacion,
        plan: {
          id: r.plan_id,
          nombre: r.plan_nombre,
          precio: r.plan_precio,
          tipo: r.plan_tipo,
          aplica_iva: r.plan_aplica_iva
        }
      }))
    };

    return cliente;
  }

  /**
   * Calcular períodos de facturación según reglas del negocio
   */
  static calcularPeriodosFacturacion(fechaInicio) {
    const inicio = new Date(fechaInicio);
    
    // Primer período: desde fecha inicio hasta 30 días después
    const finPrimerPeriodo = new Date(inicio);
    finPrimerPeriodo.setDate(inicio.getDate() + 30);
    
    // Segundo período: desde día siguiente hasta fin de mes siguiente (para nivelar)
    const inicioSegundoPeriodo = new Date(finPrimerPeriodo);
    inicioSegundoPeriodo.setDate(finPrimerPeriodo.getDate() + 1);
    
    const finSegundoPeriodo = new Date(inicioSegundoPeriodo.getFullYear(), inicioSegundoPeriodo.getMonth() + 1, 0);
    
    // Tercer período en adelante: siempre del 1 al último día del mes
    const inicioTercerPeriodo = new Date(finSegundoPeriodo.getFullYear(), finSegundoPeriodo.getMonth() + 1, 1);
    const finTercerPeriodo = new Date(inicioTercerPeriodo.getFullYear(), inicioTercerPeriodo.getMonth() + 1, 0);

    return {
      primer: {
        desde: inicio,
        hasta: finPrimerPeriodo,
        tipo: 'inicial'
      },
      segundo: {
        desde: inicioSegundoPeriodo,
        hasta: finSegundoPeriodo,
        tipo: 'nivelacion'
      },
      tercero: {
        desde: inicioTercerPeriodo,
        hasta: finTercerPeriodo,
        tipo: 'mensual_normal'
      }
    };
  }

  /**
   * Crear factura para un período específico
   */
  static async crearFacturaPeriodo(cliente, periodo) {
    // Obtener configuración de empresa
    const config = await this.obtenerConfiguracionEmpresa();
    
    // Generar número de factura
    const numeroFactura = await this.generarNumeroFactura(config.prefijo_factura);
    
    // Calcular valores de facturación
    const valores = this.calcularValoresFactura(cliente, periodo);
    
    // Crear factura
    const datosFactura = {
      numero_factura: numeroFactura,
      cliente_id: cliente.id,
      identificacion_cliente: cliente.identificacion,
      nombre_cliente: cliente.nombre,
      periodo_facturacion: this.formatearPeriodoFacturacion(periodo.desde),
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: this.calcularFechaVencimiento(new Date(), 15), // 15 días para pagar
      fecha_desde: periodo.desde.toISOString().split('T')[0],
      fecha_hasta: periodo.hasta.toISOString().split('T')[0],
      
      // Valores de servicios
      internet: valores.servicios.internet || 0,
      television: valores.servicios.television || 0,
      saldo_anterior: valores.saldo_anterior || 0,
      interes: valores.interes || 0,
      reconexion: valores.reconexion || 0,
      descuento: valores.descuento || 0,
      varios: valores.varios || 0,
      publicidad: valores.publicidad || 0,
      
      // Valores con IVA (calculados)
      s_internet: valores.servicios_iva.internet || 0,
      s_television: valores.servicios_iva.television || 0,
      s_interes: valores.interes || 0, // No aplica IVA
      s_reconexion: valores.reconexion_iva || 0,
      s_descuento: valores.descuento || 0, // No aplica IVA
      s_varios: valores.varios_iva || 0,
      s_publicidad: valores.publicidad || 0, // No aplica IVA según instrucciones
      s_iva: valores.total_iva,
      
      subtotal: valores.subtotal,
      iva: valores.total_iva,
      total: valores.total,
      estado: 'pendiente',
      ruta: cliente.sector_codigo || 'R01',
      resolucion: config.resolucion_facturacion,
      observaciones: this.generarObservacionesFactura(periodo, cliente),
      created_by: 1 // Sistema automático
    };

    // Insertar factura en base de datos
    const Factura = require('../models/factura');
    const facturaCreada = await Factura.crear(datosFactura);
    
    // Crear detalles de factura
    await this.crearDetallesFactura(facturaCreada.id, cliente, valores);
    
    return facturaCreada;
  }

  /**
   * Calcular valores de facturación aplicando reglas de IVA
   */
  static calcularValoresFactura(cliente, periodo) {
    const config = {
      porcentaje_iva: 19.00,
      valor_reconexion: 42016.00,
      valor_instalacion: 42016.00
    };

    let valores = {
      servicios: { internet: 0, television: 0 },
      servicios_iva: { internet: 0, television: 0 },
      saldo_anterior: 0,
      interes: 0,
      reconexion: 0,
      reconexion_iva: 0,
      descuento: 0,
      varios: 0,
      varios_iva: 0,
      publicidad: 0,
      total_iva: 0,
      subtotal: 0,
      total: 0
    };

    // Calcular días del período para prorrateo
    const diasPeriodo = Math.ceil((periodo.hasta - periodo.desde) / (1000 * 60 * 60 * 24)) + 1;
    const factorProrrateo = diasPeriodo / 30; // Base 30 días

    // Procesar servicios del cliente
    cliente.servicios.forEach(servicio => {
      if (servicio.estado !== 'activo') return;

      const valorBase = servicio.plan.precio * factorProrrateo;
      
      if (servicio.plan.tipo === 'internet') {
        valores.servicios.internet += valorBase;
        
        // IVA para internet según estrato (1,2,3 no pagan IVA)
        if (!['1', '2', '3'].includes(cliente.estrato)) {
          const iva = valorBase * (config.porcentaje_iva / 100);
          valores.servicios_iva.internet = valorBase + iva;
          valores.total_iva += iva;
        } else {
          valores.servicios_iva.internet = valorBase; // Sin IVA
        }
      } 
      else if (servicio.plan.tipo === 'television') {
        valores.servicios.television += valorBase;
        
        // Televisión siempre paga IVA del 19%
        const iva = valorBase * (config.porcentaje_iva / 100);
        valores.servicios_iva.television = valorBase + iva;
        valores.total_iva += iva;
      }
    });

    // Agregar varios si es primera factura (instalación)
    if (periodo.tipo === 'inicial') {
      valores.varios = config.valor_instalacion;
      const ivaVarios = valores.varios * (config.porcentaje_iva / 100);
      valores.varios_iva = valores.varios + ivaVarios;
      valores.total_iva += ivaVarios;
    }

    // Calcular totales
    valores.subtotal = valores.servicios.internet + valores.servicios.television + 
                      valores.varios + valores.reconexion + valores.publicidad - valores.descuento;
    valores.total = valores.subtotal + valores.total_iva + valores.saldo_anterior + valores.interes;

    return valores;
  }

  /**
   * Obtener clientes que necesitan facturación en una fecha específica
   */
  static async obtenerClientesParaFacturacion(fecha) {
    const query = `
      SELECT DISTINCT c.*, 
        MAX(f.fecha_hasta) as ultima_fecha_facturada,
        sc.fecha_activacion,
        sc.fecha_instalacion
      FROM clientes c
      JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1 AND sc.estado = 'activo'
      LEFT JOIN facturas f ON c.id = f.cliente_id
      WHERE c.activo = 1
      GROUP BY c.id
      HAVING 
        (ultima_fecha_facturada IS NULL) OR 
        (ultima_fecha_facturada < DATE_SUB(?, INTERVAL 30 DAY))
      ORDER BY c.id
    `;

    return await Database.query(query, [fecha.toISOString().split('T')[0]]);
  }

  /**
   * Procesar facturación para un cliente específico
   */
  static async procesarFacturacionCliente(cliente, fechaReferencia) {
    const clienteCompleto = await this.obtenerDatosClienteCompletos(cliente.id);
    
    // Determinar el siguiente período a facturar
    const ultimaFecha = cliente.ultima_fecha_facturada ? 
      new Date(cliente.ultima_fecha_facturada) : 
      new Date(cliente.fecha_activacion || cliente.fecha_instalacion);
    
    const proximoPeriodo = this.calcularProximoPeriodo(ultimaFecha, fechaReferencia);
    
    return await this.crearFacturaPeriodo(clienteCompleto, proximoPeriodo);
  }

  /**
   * Calcular próximo período de facturación
   */
  static calcularProximoPeriodo(ultimaFecha, fechaReferencia) {
    const inicio = new Date(ultimaFecha);
    inicio.setDate(inicio.getDate() + 1); // Día siguiente a la última facturación
    
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 29); // 30 días después
    
    return {
      desde: inicio,
      hasta: fin,
      tipo: 'mensual_normal'
    };
  }

  /**
   * Utilidades auxiliares
   */
  static async obtenerConfiguracionEmpresa() {
    const config = await Database.query('SELECT * FROM configuracion_empresa WHERE id = 1');
    return config[0] || {
      prefijo_factura: 'FAC',
      consecutivo_factura: 1,
      resolucion_facturacion: 'Pendiente'
    };
  }

  static async generarNumeroFactura(prefijo = 'FAC') {
    // Actualizar consecutivo y obtener nuevo número
    await Database.query(
      'UPDATE configuracion_empresa SET consecutivo_factura = consecutivo_factura + 1 WHERE id = 1'
    );
    
    const config = await Database.query('SELECT consecutivo_factura FROM configuracion_empresa WHERE id = 1');
    const consecutivo = config[0]?.consecutivo_factura || 1;
    
    return `${prefijo}${String(consecutivo).padStart(6, '0')}`;
  }

  static formatearPeriodoFacturacion(fecha) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  }

  static calcularFechaVencimiento(fechaEmision, diasVencimiento = 15) {
    const vencimiento = new Date(fechaEmision);
    vencimiento.setDate(vencimiento.getDate() + diasVencimiento);
    return vencimiento.toISOString().split('T')[0];
  }

  static generarObservacionesFactura(periodo, cliente) {
    const servicios = cliente.servicios.map(s => s.plan.nombre).join(', ');
    return `Facturación automática período ${periodo.desde.toISOString().split('T')[0]} al ${periodo.hasta.toISOString().split('T')[0]}. Servicios: ${servicios}`;
  }

  static async crearDetallesFactura(facturaId, cliente, valores) {
    const detalles = [];
    
    // Detalle de servicios
    cliente.servicios.forEach(servicio => {
      if (servicio.estado === 'activo') {
        let valor = 0;
        let valorIva = 0;
        
        if (servicio.plan.tipo === 'internet') {
          valor = valores.servicios.internet;
          valorIva = valores.servicios_iva.internet - valor;
        } else if (servicio.plan.tipo === 'television') {
          valor = valores.servicios.television;
          valorIva = valores.servicios_iva.television - valor;
        }
        
        if (valor > 0) {
          detalles.push({
            factura_id: facturaId,
            concepto_nombre: servicio.plan.nombre,
            cantidad: 1,
            precio_unitario: valor,
            descuento: 0,
            subtotal: valor,
            iva: valorIva,
            total: valor + valorIva,
            servicio_cliente_id: servicio.id
          });
        }
      }
    });

    // Insertar detalles
    for (const detalle of detalles) {
      await Database.query(
        `INSERT INTO detalle_facturas (factura_id, concepto_nombre, cantidad, precio_unitario, descuento, subtotal, iva, total, servicio_cliente_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [detalle.factura_id, detalle.concepto_nombre, detalle.cantidad, detalle.precio_unitario, 
         detalle.descuento, detalle.subtotal, detalle.iva, detalle.total, detalle.servicio_cliente_id]
      );
    }
  }

  /**
   * Procesar facturación de saldos e intereses
   */
  static async procesarSaldosEIntereses() {
    try {
      console.log('🔄 Procesando saldos e intereses...');
      
      // Obtener facturas vencidas no pagadas
      const facturasVencidas = await Database.query(`
        SELECT * FROM facturas 
        WHERE estado = 'pendiente' 
        AND fecha_vencimiento < CURDATE() 
        AND activo = '1'
      `);

      const config = await this.obtenerConfiguracionEmpresa();
      const porcentajeInteres = config.porcentaje_interes || 0;

      for (const factura of facturasVencidas) {
        // Calcular días de mora
        const fechaVencimiento = new Date(factura.fecha_vencimiento);
        const hoy = new Date();
        const diasMora = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));

        if (diasMora > 0 && porcentajeInteres > 0) {
          // Calcular intereses
          const interesMensual = (factura.total * porcentajeInteres / 100) * (diasMora / 30);
          
          // Actualizar factura con intereses
          await Database.query(
            'UPDATE facturas SET interes = interes + ?, total = total + ? WHERE id = ?',
            [interesMensual, interesMensual, factura.id]
          );
          
          console.log(`💰 Intereses calculados para factura ${factura.numero_factura}: $${interesMensual.toFixed(2)}`);
        }

        // Verificar si debe cortarse el servicio
        if (diasMora >= (config.dias_mora_corte || 30)) {
          await this.cortarServicioPorMora(factura.cliente_id);
        }
      }

      console.log('✅ Procesamiento de saldos e intereses completado');
    } catch (error) {
      console.error('❌ Error procesando saldos e intereses:', error);
      throw error;
    }
  }

  /**
   * Cortar servicio por mora
   */
  static async cortarServicioPorMora(clienteId) {
    try {
      await Database.query(
        'UPDATE servicios_cliente SET estado = "cortado" WHERE cliente_id = ? AND activo = 1',
        [clienteId]
      );
      
      console.log(`✂️ Servicio cortado por mora para cliente ${clienteId}`);
    } catch (error) {
      console.error('❌ Error cortando servicio:', error);
    }
  }
}

module.exports = FacturacionAutomaticaService;