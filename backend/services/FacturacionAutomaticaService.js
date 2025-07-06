// backend/services/FacturacionAutomaticaService.js
// Servicio de Facturación Automática para PSI - Basado en estructura existente
const { Database } = require('../models/Database');

// Importaciones opcionales para servicios que pueden no existir
let PDFGenerator, EmailService;

try {
  PDFGenerator = require('./utils/pdfGenerator');
  console.log('✅ PDFGenerator cargado correctamente');
} catch (error) {
  console.log('⚠️ PDFGenerator no disponible - funciones de PDF deshabilitadas');
}

try {
  EmailService = require('../services/EmailService');
  console.log('✅ EmailService cargado correctamente');
} catch (error) {
  console.log('⚠️ EmailService no disponible - notificaciones por email deshabilitadas');
}

class FacturacionAutomaticaService {

  /**
   * Generar facturación mensual masiva para todos los clientes activos
   */
  static async generarFacturacionMensual(fechaReferencia = new Date()) {
    const conexion = await Database.conexion();
    
    try {
      console.log('🔄 Iniciando facturación mensual automática...');
      
      // Obtener todos los clientes activos con servicios
      const clientesActivos = await this.obtenerClientesParaFacturar(fechaReferencia);
      
      console.log(`📊 Clientes a facturar: ${clientesActivos.length}`);
      
      const resultados = {
        exitosas: 0,
        fallidas: 0,
        facturas_generadas: [],
        errores: []
      };

      // Procesar cada cliente
      for (const cliente of clientesActivos) {
        try {
          console.log(`🧾 Procesando cliente: ${cliente.nombre} (ID: ${cliente.id})`);
          
          const facturaGenerada = await this.generarFacturaCliente(cliente, fechaReferencia);
          
          if (facturaGenerada) {
            resultados.exitosas++;
            resultados.facturas_generadas.push(facturaGenerada);
            console.log(`✅ Factura generada: ${facturaGenerada.numero_factura}`);
          }

        } catch (error) {
          console.error(`❌ Error procesando cliente ${cliente.id}:`, error.message);
          resultados.fallidas++;
          resultados.errores.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre,
            error: error.message
          });
        }
      }

      console.log(`📈 Facturación completada: ${resultados.exitosas} exitosas, ${resultados.fallidas} fallidas`);
      return resultados;

    } catch (error) {
      console.error('❌ Error en facturación mensual:', error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Generar factura automática para un cliente específico
   */
  static async generarFacturaClienteIndividual(clienteId, fechaInicio = null) {
    const conexion = await Database.conexion();
    
    try {
      // Obtener información completa del cliente
      const cliente = await this.obtenerDatosCompletosCliente(clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Determinar fecha de referencia para la facturación
      const fechaPeriodo = fechaInicio ? new Date(fechaInicio) : new Date();
      
      // Generar la factura
      const factura = await this.generarFacturaCliente(cliente, fechaPeriodo);
      
      return factura;

    } catch (error) {
      console.error(`❌ Error generando factura para cliente ${clienteId}:`, error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Generar factura para un cliente específico según las reglas de negocio
   */
  static async generarFacturaCliente(cliente, fechaReferencia) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      // 1. Calcular período de facturación según reglas específicas
      const periodo = this.calcularPeriodoFacturacion(cliente, fechaReferencia);
      
      // 2. Verificar si ya existe factura para este período
      const facturaExistente = await this.verificarFacturaExistente(
        cliente.id, 
        periodo.periodo_facturacion
      );
      
      if (facturaExistente) {
        console.log(`⚠️ Ya existe factura para el período ${periodo.periodo_facturacion}`);
        await conexion.rollback();
        return null;
      }

      // 3. Obtener servicios activos del cliente
      const serviciosActivos = await this.obtenerServiciosActivosCliente(cliente.id);
      
      if (serviciosActivos.length === 0) {
        console.log(`⚠️ Cliente ${cliente.id} no tiene servicios activos`);
        await conexion.rollback();
        return null;
      }

      // 4. Calcular conceptos de facturación
      const conceptos = await this.calcularConceptosFacturacion(
        cliente, 
        serviciosActivos, 
        periodo
      );

      // 5. Calcular totales de la factura
      const totales = this.calcularTotalesFactura(conceptos, cliente);

      // 6. Generar número de factura
      const numeroFactura = await this.generarNumeroFactura();

      // 7. Crear registro principal de factura
      const facturaId = await this.crearFacturaPrincipal({
        numeroFactura,
        cliente,
        periodo,
        totales,
        serviciosActivos
      });

      // 8. Crear detalles de la factura
      await this.crearDetallesFactura(facturaId, conceptos);

      // 9. Actualizar fecha de última facturación del cliente
      await this.actualizarUltimaFacturacion(cliente.id, periodo.fecha_hasta);

      // 10. Si es primera factura, generar orden de instalación y contrato
      if (periodo.es_primera_factura) {
        await this.generarDocumentosIniciales(cliente.id, facturaId);
      }

      await conexion.commit();

      console.log(`✅ Factura ${numeroFactura} creada con ID: ${facturaId}`);

      return {
        id: facturaId,
        numero_factura: numeroFactura,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        periodo: periodo.periodo_facturacion,
        subtotal: totales.subtotal,
        iva: totales.iva,
        total: totales.total,
        fecha_emision: periodo.fecha_emision,
        fecha_vencimiento: periodo.fecha_vencimiento
      };

    } catch (error) {
      await conexion.rollback();
      console.error(`❌ Error generando factura para cliente ${cliente.id}:`, error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Calcular período de facturación según las reglas específicas del negocio
   */
  static calcularPeriodoFacturacion(cliente, fechaReferencia) {
    const fechaRef = new Date(fechaReferencia);
    const fechaEmision = new Date(fechaRef);
    
    // Obtener última factura del cliente
    const ultimaFacturacion = cliente.fecha_ultima_facturacion ? 
      new Date(cliente.fecha_ultima_facturacion) : null;

    let fechaDesde, fechaHasta, esPrimeraFactura = false, esNivelacion = false;

    if (!ultimaFacturacion) {
      // PRIMERA FACTURA: Desde fecha de activación por 30 días
      esPrimeraFactura = true;
      fechaDesde = new Date(cliente.fecha_activacion || cliente.created_at);
      fechaHasta = new Date(fechaDesde);
      fechaHasta.setDate(fechaHasta.getDate() + 30);
      
      console.log(`📅 Primera factura - Desde: ${this.formatearFecha(fechaDesde)} hasta: ${this.formatearFecha(fechaHasta)}`);
    } 
    else {
      // SEGUNDA FACTURA O MÁS: Aplicar lógica de nivelación
      fechaDesde = new Date(ultimaFacturacion);
      fechaDesde.setDate(fechaDesde.getDate() + 1);

      // Verificar si ya está nivelado al final del mes
      if (this.estaNiveladoAlFinDelMes(ultimaFacturacion)) {
        // Facturación mensual regular (1 al 30/31)
        fechaDesde = new Date(fechaRef.getFullYear(), fechaRef.getMonth(), 1);
        fechaHasta = new Date(fechaRef.getFullYear(), fechaRef.getMonth() + 1, 0);
      } else {
        // Nivelación: facturar hasta fin de mes + días adicionales
        esNivelacion = true;
        const finDelMes = new Date(fechaRef.getFullYear(), fechaRef.getMonth() + 1, 0);
        
        // Calcular días del mes siguiente para completar 30 días
        const diasFacturados = this.calcularDiasEntreFechas(fechaDesde, finDelMes);
        const diasAdicionales = Math.max(0, 30 - diasFacturados);
        
        fechaHasta = new Date(finDelMes);
        fechaHasta.setDate(fechaHasta.getDate() + diasAdicionales);
        
        console.log(`📅 Nivelación - Desde: ${this.formatearFecha(fechaDesde)} hasta: ${this.formatearFecha(fechaHasta)} (${diasFacturados + diasAdicionales} días)`);
      }
    }

    // Fecha de vencimiento: 30 días después de emisión
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // Período en formato YYYY-MM para agrupación
    const periodoFacturacion = `${fechaRef.getFullYear()}-${(fechaRef.getMonth() + 1).toString().padStart(2, '0')}`;

    return {
      fecha_emision: this.formatearFecha(fechaEmision),
      fecha_vencimiento: this.formatearFecha(fechaVencimiento),
      fecha_desde: this.formatearFecha(fechaDesde),
      fecha_hasta: this.formatearFecha(fechaHasta),
      periodo_facturacion: periodoFacturacion,
      dias_facturados: this.calcularDiasEntreFechas(fechaDesde, fechaHasta),
      es_primera_factura: esPrimeraFactura,
      es_nivelacion: esNivelacion
    };
  }

  /**
   * Calcular conceptos de facturación para un cliente
   */
  static async calcularConceptosFacturacion(cliente, serviciosActivos, periodo) {
    const conceptos = [];

    // 1. SERVICIOS CONTRATADOS (Internet, TV, etc.)
    for (const servicio of serviciosActivos) {
      const conceptoServicio = this.calcularConceptoServicio(servicio, periodo, cliente);
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
        valor: saldoAnterior,
        aplica_iva: false
      });
    }

    // 4. INTERESES POR MORA
    const interesesMora = await this.calcularInteresesMora(cliente.id);
    if (interesesMora > 0) {
      conceptos.push({
        tipo: 'interes',
        concepto: 'Intereses por mora',
        valor: interesesMora,
        aplica_iva: false
      });
    }

    // 5. VARIOS Y DESCUENTOS PENDIENTES
    const variosDescuentos = await this.obtenerVariosDescuentosPendientes(cliente.id);
    conceptos.push(...variosDescuentos);

    return conceptos;
  }

  /**
   * Calcular concepto de servicio (Internet, TV, etc.)
   */
  static calcularConceptoServicio(servicio, periodo, cliente) {
    try {
      // Obtener precio del servicio (personalizado o del plan)
      const precioServicio = servicio.precio_personalizado || servicio.precio_plan;
      
      // Calcular valor proporcional según días facturados
      let valorServicio = precioServicio;
      if (periodo.dias_facturados !== 30) {
        valorServicio = (precioServicio / 30) * periodo.dias_facturados;
        valorServicio = Math.round(valorServicio);
      }

      // Determinar aplicación de IVA según reglas del negocio
      const aplicaIva = this.determinarAplicacionIVA(servicio.tipo, cliente.estrato);
      const porcentajeIva = aplicaIva ? 19 : 0;

      return {
        tipo: servicio.tipo,
        concepto: `${servicio.nombre_plan} - ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
        cantidad: 1,
        precio_unitario: valorServicio,
        valor: valorServicio,
        aplica_iva: aplicaIva,
        porcentaje_iva: porcentajeIva,
        dias_facturados: periodo.dias_facturados,
        servicio_cliente_id: servicio.id
      };

    } catch (error) {
      console.error(`Error calculando concepto de servicio:`, error);
      return null;
    }
  }

  /**
   * Determinar aplicación de IVA según reglas específicas del negocio
   */
  static determinarAplicacionIVA(tipoServicio, estrato) {
    const estratoNumerico = parseInt(estrato) || 4;

    switch (tipoServicio) {
      case 'internet':
        // Internet: No aplica IVA en estratos 1, 2 y 3
        return estratoNumerico > 3;
      
      case 'television':
        // TV: Siempre aplica IVA del 19%
        return true;
      
      case 'empaquetado':
        // Empaquetado: Aplica IVA solo si estrato > 3
        return estratoNumerico > 3;
      
      case 'publicidad':
        // Publicidad: No aplica IVA según instrucciones
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Calcular concepto de instalación (primera factura)
   */
  static calcularConceptoInstalacion() {
    const valorInstalacion = 42016; // Valor fijo según instrucciones
    const valorIva = Math.round(valorInstalacion * 0.19); // 19% IVA

    return {
      tipo: 'varios',
      concepto: 'Cargo por instalación',
      cantidad: 1,
      precio_unitario: valorInstalacion,
      valor: valorInstalacion,
      aplica_iva: true,
      porcentaje_iva: 19
    };
  }

  /**
   * Calcular totales de la factura según estructura existente
   */
  static calcularTotalesFactura(conceptos, cliente) {
    let internet = 0, television = 0, varios = 0, publicidad = 0;
    let descuento = 0, interes = 0, reconexion = 0, saldoAnterior = 0;
    let s_internet = 0, s_television = 0, s_varios = 0, s_publicidad = 0;
    let s_descuento = 0, s_interes = 0, s_reconexion = 0;

    conceptos.forEach(concepto => {
      const valor = concepto.valor || 0;
      const valorIva = concepto.aplica_iva ? Math.round(valor * (concepto.porcentaje_iva / 100)) : 0;

      switch (concepto.tipo) {
        case 'internet':
          internet += valor;
          s_internet += valorIva;
          break;
        case 'television':
          television += valor;
          s_television += valorIva;
          break;
        case 'varios':
          varios += valor;
          s_varios += valorIva;
          break;
        case 'publicidad':
          publicidad += valor;
          s_publicidad += valorIva;
          break;
        case 'descuento':
          descuento += valor;
          s_descuento += valorIva;
          break;
        case 'interes':
          interes += valor;
          s_interes += valorIva;
          break;
        case 'reconexion':
          reconexion += valor;
          s_reconexion += valorIva;
          break;
        case 'saldo_anterior':
          saldoAnterior += valor;
          break;
      }
    });

    const subtotal = internet + television + varios + publicidad + interes + reconexion + saldoAnterior - descuento;
    const totalIva = s_internet + s_television + s_varios + s_publicidad + s_interes + s_reconexion - s_descuento;
    const total = subtotal + totalIva;

    return {
      internet: Math.round(internet),
      television: Math.round(television),
      varios: Math.round(varios),
      publicidad: Math.round(publicidad),
      descuento: Math.round(descuento),
      interes: Math.round(interes),
      reconexion: Math.round(reconexion),
      saldo_anterior: Math.round(saldoAnterior),
      s_internet: Math.round(s_internet),
      s_television: Math.round(s_television),
      s_varios: Math.round(s_varios),
      s_publicidad: Math.round(s_publicidad),
      s_descuento: Math.round(s_descuento),
      s_interes: Math.round(s_interes),
      s_reconexion: Math.round(s_reconexion),
      s_iva: Math.round(totalIva),
      subtotal: Math.round(subtotal),
      iva: Math.round(totalIva),
      total: Math.round(total)
    };
  }

  /**
   * Crear registro principal de factura
   */
  static async crearFacturaPrincipal(datos) {
    const conexion = await Database.conexion();
    
    try {
      const { numeroFactura, cliente, periodo, totales } = datos;

      const [resultado] = await conexion.execute(`
        INSERT INTO facturas (
          numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
          periodo_facturacion, fecha_emision, fecha_vencimiento, 
          fecha_desde, fecha_hasta,
          internet, television, varios, publicidad, descuento, interes, reconexion, saldo_anterior,
          s_internet, s_television, s_varios, s_publicidad, s_descuento, s_interes, s_reconexion, s_iva,
          subtotal, iva, total, estado, ruta, consignacion,
          observaciones, activo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        numeroFactura,
        cliente.id,
        cliente.identificacion,
        cliente.nombre,
        periodo.periodo_facturacion,
        periodo.fecha_emision,
        periodo.fecha_vencimiento,
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
        'pendiente',
        cliente.ruta || 'R01',
        '1',
        `Factura automática - Período: ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
        1
      ]);

      return resultado.insertId;

    } finally {
      conexion.release();
    }
  }

  /**
   * Crear detalles de la factura
   */
  static async crearDetallesFactura(facturaId, conceptos) {
    const conexion = await Database.conexion();
    
    try {
      for (const concepto of conceptos) {
        const valorIva = concepto.aplica_iva ? 
          Math.round(concepto.valor * (concepto.porcentaje_iva / 100)) : 0;

        await conexion.execute(`
          INSERT INTO detalle_facturas (
            factura_id, concepto_nombre, cantidad, precio_unitario,
            descuento, subtotal, iva, total, servicio_cliente_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          facturaId,
          concepto.concepto,
          concepto.cantidad || 1,
          concepto.precio_unitario || concepto.valor,
          concepto.tipo === 'descuento' ? concepto.valor : 0,
          concepto.valor,
          valorIva,
          concepto.valor + valorIva,
          concepto.servicio_cliente_id || null
        ]);
      }
    } finally {
      conexion.release();
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES Y DE CONSULTA
  // ==========================================

  /**
   * Obtener clientes activos para facturar
   */
  static async obtenerClientesParaFacturar(fechaReferencia) {
    const conexion = await Database.conexion();
    
    try {
      const [clientes] = await conexion.execute(`
        SELECT DISTINCT
          c.*,
          MAX(f.fecha_hasta) as fecha_ultima_facturacion
        FROM clientes c
        INNER JOIN servicios_cliente sc ON c.id = sc.cliente_id
        LEFT JOIN facturas f ON c.id = f.cliente_id
        WHERE c.estado = 'activo' 
          AND sc.estado = 'activo'
        GROUP BY c.id
        ORDER BY c.id
      `);

      return clientes;

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener datos completos de un cliente
   */
  static async obtenerDatosCompletosCliente(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      const [cliente] = await conexion.execute(`
        SELECT c.*, MAX(f.fecha_hasta) as fecha_ultima_facturacion
        FROM clientes c
        LEFT JOIN facturas f ON c.id = f.cliente_id
        WHERE c.id = ? AND c.estado = 'activo'
        GROUP BY c.id
      `, [clienteId]);

      return cliente.length > 0 ? cliente[0] : null;

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener servicios activos de un cliente
   */
  static async obtenerServiciosActivosCliente(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      const [servicios] = await conexion.execute(`
        SELECT sc.*, ps.nombre as nombre_plan, ps.precio as precio_plan, ps.tipo
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ? AND sc.estado = 'activo' AND ps.activo = 1
      `, [clienteId]);

      return servicios;

    } finally {
      conexion.release();
    }
  }

  /**
   * Verificar si ya existe factura para un período
   */
  static async verificarFacturaExistente(clienteId, periodoFacturacion) {
    const conexion = await Database.conexion();
    
    try {
      const [facturas] = await conexion.execute(`
        SELECT id FROM facturas 
        WHERE cliente_id = ? AND periodo_facturacion = ? AND activo = 1
      `, [clienteId, periodoFacturacion]);

      return facturas.length > 0;

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar número de factura consecutivo
   */
  static async generarNumeroFactura() {
    const conexion = await Database.conexion();
    
    try {
      // Obtener último número de factura
      const [ultimaFactura] = await conexion.execute(`
        SELECT numero_factura FROM facturas 
        WHERE numero_factura REGEXP '^FAC[0-9]+$'
        ORDER BY CAST(SUBSTRING(numero_factura, 4) AS UNSIGNED) DESC 
        LIMIT 1
      `);

      let consecutivo = 1;
      if (ultimaFactura.length > 0) {
        const ultimoNumero = ultimaFactura[0].numero_factura;
        consecutivo = parseInt(ultimoNumero.substring(3)) + 1;
      }

      return `FAC${consecutivo.toString().padStart(6, '0')}`;

    } finally {
      conexion.release();
    }
  }

  /**
   * Actualizar fecha de última facturación del cliente
   */
  static async actualizarUltimaFacturacion(clienteId, fechaHasta) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.execute(`
        UPDATE clientes 
        SET updated_at = NOW()
        WHERE id = ?
      `, [clienteId]);
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener saldo anterior pendiente
   */
  static async obtenerSaldoAnterior(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      const [saldo] = await conexion.execute(`
        SELECT COALESCE(SUM(total), 0) as saldo_pendiente
        FROM facturas 
        WHERE cliente_id = ? AND estado = 'pendiente' AND activo = 1
      `, [clienteId]);

      return saldo.length > 0 ? parseFloat(saldo[0].saldo_pendiente) : 0;

    } finally {
      conexion.release();
    }
  }

  /**
   * Calcular intereses por mora
   */
  static async calcularInteresesMora(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      const [facturasMorosas] = await conexion.execute(`
        SELECT total, DATEDIFF(NOW(), fecha_vencimiento) as dias_mora
        FROM facturas 
        WHERE cliente_id = ? 
          AND estado = 'pendiente' 
          AND fecha_vencimiento < NOW()
          AND activo = 1
      `, [clienteId]);

      let totalIntereses = 0;
      const tasaInteresDiaria = 0.00083; // Aproximadamente 2.5% mensual

      facturasMorosas.forEach(factura => {
        if (factura.dias_mora > 0) {
          const interes = factura.total * tasaInteresDiaria * factura.dias_mora;
          totalIntereses += interes;
        }
      });

      return Math.round(totalIntereses);

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener varios y descuentos pendientes
   */
  static async obtenerVariosDescuentosPendientes(clienteId) {
    // Esta función se puede expandir para manejar varios y descuentos
    // programados en una tabla específica
    return [];
  }

  /**
   * Generar documentos iniciales (contrato y orden de instalación)
   */
  static async generarDocumentosIniciales(clienteId, facturaId) {
    const conexion = await Database.conexion();
    
    try {
      // Crear registro de instalación si no existe
      const [instalacionExistente] = await conexion.execute(`
        SELECT id FROM instalaciones WHERE cliente_id = ?
      `, [clienteId]);

      if (instalacionExistente.length === 0) {
        await conexion.execute(`
          INSERT INTO instalaciones (
            cliente_id, fecha_programada, estado, observaciones, created_at
          ) VALUES (?, DATE_ADD(NOW(), INTERVAL 3 DAY), 'programada', 'Instalación automática por facturación', NOW())
        `, [clienteId]);

        console.log(`📋 Orden de instalación creada para cliente ${clienteId}`);
      }

    } finally {
      conexion.release();
    }
  }

  // ==========================================
  // MÉTODOS UTILITARIOS
  // ==========================================

  static formatearFecha(fecha) {
    return fecha.toISOString().split('T')[0];
  }

  static calcularDiasEntreFechas(fechaInicio, fechaFin) {
    const diffTime = fechaFin.getTime() - fechaInicio.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  static estaNiveladoAlFinDelMes(fecha) {
    const ultimoDiaMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const diferenciaDias = Math.abs(fecha.getDate() - ultimoDiaMes.getDate());
    return diferenciaDias <= 2; // Considera nivelado si está dentro de 2 días del fin de mes
  }

  /**
   * Preview de facturación mensual (sin generar facturas)
   */
  static async previewFacturacionMensual(fechaReferencia = new Date()) {
    const conexion = await Database.conexion();
    
    try {
      const clientesParaFacturar = await this.obtenerClientesParaFacturar(fechaReferencia);
      
      const preview = {
        total_clientes: clientesParaFacturar.length,
        clientes_primera_factura: 0,
        clientes_nivelacion: 0,
        clientes_regulares: 0,
        estimado_ingresos: 0,
        detalles: []
      };

      for (const cliente of clientesParaFacturar) {
        try {
          const periodo = this.calcularPeriodoFacturacion(cliente, fechaReferencia);
          const serviciosActivos = await this.obtenerServiciosActivosCliente(cliente.id);
          const conceptos = await this.calcularConceptosFacturacion(cliente, serviciosActivos, periodo);
          const totales = this.calcularTotalesFactura(conceptos, cliente);

          if (periodo.es_primera_factura) {
            preview.clientes_primera_factura++;
          } else if (periodo.es_nivelacion) {
            preview.clientes_nivelacion++;
          } else {
            preview.clientes_regulares++;
          }

          preview.estimado_ingresos += totales.total;

          preview.detalles.push({
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            periodo: periodo.periodo_facturacion,
            tipo_facturacion: periodo.es_primera_factura ? 'primera' : 
                            periodo.es_nivelacion ? 'nivelacion' : 'regular',
            dias_facturados: periodo.dias_facturados,
            total_estimado: totales.total,
            servicios: serviciosActivos.length
          });

        } catch (error) {
          console.error(`Error en preview para cliente ${cliente.id}:`, error.message);
        }
      }

      return preview;

    } finally {
      conexion.release();
    }
  }

  /**
   * Procesar facturación por lotes para mejorar rendimiento
   */
  static async procesarFacturacionPorLotes(clientes, fechaReferencia, tamanoLote = 10) {
    const resultados = {
      exitosas: 0,
      fallidas: 0,
      facturas_generadas: [],
      errores: []
    };

    // Dividir clientes en lotes
    for (let i = 0; i < clientes.length; i += tamanoLote) {
      const lote = clientes.slice(i, i + tamanoLote);
      
      console.log(`📦 Procesando lote ${Math.floor(i/tamanoLote) + 1} de ${Math.ceil(clientes.length/tamanoLote)} (${lote.length} clientes)`);

      // Procesar lote en paralelo
      const promesasLote = lote.map(cliente => 
        this.generarFacturaCliente(cliente, fechaReferencia)
          .then(factura => {
            if (factura) {
              resultados.exitosas++;
              resultados.facturas_generadas.push(factura);
            }
            return { success: true, cliente_id: cliente.id };
          })
          .catch(error => {
            resultados.fallidas++;
            resultados.errores.push({
              cliente_id: cliente.id,
              nombre: cliente.nombre,
              error: error.message
            });
            return { success: false, cliente_id: cliente.id, error: error.message };
          })
      );

      await Promise.all(promesasLote);
      
      // Pausa pequeña entre lotes para no sobrecargar la base de datos
      if (i + tamanoLote < clientes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return resultados;
  }

  /**
   * Validar integridad de datos antes de facturar
   */
  static async validarIntegridadDatos(clienteId = null) {
    const conexion = await Database.conexion();
    
    try {
      const errores = [];

      // Validar clientes sin servicios activos
      let consultaClientes = `
        SELECT c.id, c.nombre 
        FROM clientes c 
        LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
        WHERE c.estado = 'activo' AND sc.id IS NULL
      `;
      
      if (clienteId) {
        consultaClientes += ` AND c.id = ${clienteId}`;
      }

      const [clientesSinServicios] = await conexion.execute(consultaClientes);
      
      clientesSinServicios.forEach(cliente => {
        errores.push({
          tipo: 'cliente_sin_servicios',
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          descripcion: 'Cliente activo sin servicios activos'
        });
      });

      // Validar servicios sin planes
      let consultaServicios = `
        SELECT sc.id, sc.cliente_id, c.nombre as cliente_nombre
        FROM servicios_cliente sc
        INNER JOIN clientes c ON sc.cliente_id = c.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.estado = 'activo' AND (ps.id IS NULL OR ps.activo = 0)
      `;

      if (clienteId) {
        consultaServicios += ` AND sc.cliente_id = ${clienteId}`;
      }

      const [serviciosSinPlanes] = await conexion.execute(consultaServicios);
      
      serviciosSinPlanes.forEach(servicio => {
        errores.push({
          tipo: 'servicio_sin_plan',
          cliente_id: servicio.cliente_id,
          cliente_nombre: servicio.cliente_nombre,
          servicio_id: servicio.id,
          descripcion: 'Servicio activo sin plan válido'
        });
      });

      // Validar planes sin precio
      let consultaPlanes = `
        SELECT DISTINCT ps.id, ps.nombre, sc.cliente_id, c.nombre as cliente_nombre
        FROM planes_servicio ps
        INNER JOIN servicios_cliente sc ON ps.id = sc.plan_id AND sc.estado = 'activo'
        INNER JOIN clientes c ON sc.cliente_id = c.id
        WHERE ps.activo = 1 AND (ps.precio IS NULL OR ps.precio <= 0)
      `;

      if (clienteId) {
        consultaPlanes += ` AND sc.cliente_id = ${clienteId}`;
      }

      const [planesSinPrecio] = await conexion.execute(consultaPlanes);
      
      planesSinPrecio.forEach(plan => {
        errores.push({
          tipo: 'plan_sin_precio',
          cliente_id: plan.cliente_id,
          cliente_nombre: plan.cliente_nombre,
          plan_id: plan.id,
          plan_nombre: plan.nombre,
          descripcion: 'Plan activo sin precio configurado'
        });
      });

      return {
        valido: errores.length === 0,
        errores: errores,
        total_errores: errores.length
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener estadísticas de facturación
   */
  static async obtenerEstadisticasFacturacion(fechaDesde, fechaHasta) {
    const conexion = await Database.conexion();
    
    try {
      // Estadísticas generales
      const [estadisticasGenerales] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado,
          SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as total_pendiente,
          SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as total_pagado,
          AVG(total) as promedio_factura
        FROM facturas 
        WHERE fecha_emision BETWEEN ? AND ? AND activo = 1
      `, [fechaDesde, fechaHasta]);

      // Facturación por tipo de servicio
      const [facturaciónPorTipo] = await conexion.execute(`
        SELECT 
          'Internet' as tipo,
          SUM(internet) as total,
          COUNT(*) as cantidad_facturas
        FROM facturas 
        WHERE fecha_emision BETWEEN ? AND ? AND activo = 1 AND internet > 0
        
        UNION ALL
        
        SELECT 
          'Televisión' as tipo,
          SUM(television) as total,
          COUNT(*) as cantidad_facturas
        FROM facturas 
        WHERE fecha_emision BETWEEN ? AND ? AND activo = 1 AND television > 0
        
        UNION ALL
        
        SELECT 
          'Varios' as tipo,
          SUM(varios) as total,
          COUNT(*) as cantidad_facturas
        FROM facturas 
        WHERE fecha_emision BETWEEN ? AND ? AND activo = 1 AND varios > 0
      `, [fechaDesde, fechaHasta, fechaDesde, fechaHasta, fechaDesde, fechaHasta]);

      // Top 10 clientes por facturación
      const [topClientes] = await conexion.execute(`
        SELECT 
          cliente_id,
          nombre_cliente,
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado
        FROM facturas 
        WHERE fecha_emision BETWEEN ? AND ? AND activo = 1
        GROUP BY cliente_id, nombre_cliente
        ORDER BY total_facturado DESC
        LIMIT 10
      `, [fechaDesde, fechaHasta]);

      return {
        periodo: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
        generales: estadisticasGenerales[0],
        por_tipo_servicio: facturaciónPorTipo,
        top_clientes: topClientes
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Regenerar factura (anular y crear nueva)
   */
  static async regenerarFactura(facturaId, motivo) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      // Obtener datos de la factura original
      const [facturaOriginal] = await conexion.execute(`
        SELECT * FROM facturas WHERE id = ? AND activo = 1
      `, [facturaId]);

      if (facturaOriginal.length === 0) {
        throw new Error('Factura no encontrada');
      }

      const factura = facturaOriginal[0];

      // Anular factura original
      await conexion.execute(`
        UPDATE facturas 
        SET estado = 'anulada', 
            observaciones = CONCAT(observaciones, ' - ANULADA: ', ?),
            updated_at = NOW()
        WHERE id = ?
      `, [motivo, facturaId]);

      // Obtener cliente actualizado
      const cliente = await this.obtenerDatosCompletosCliente(factura.cliente_id);
      
      // Regenerar factura con datos actuales
      const nuevaFactura = await this.generarFacturaCliente(
        cliente, 
        new Date(factura.fecha_emision)
      );

      await conexion.commit();

      console.log(`♻️ Factura ${factura.numero_factura} regenerada como ${nuevaFactura.numero_factura}`);

      return {
        factura_anulada: factura.numero_factura,
        factura_nueva: nuevaFactura.numero_factura,
        motivo: motivo
      };

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }
}

module.exports = FacturacionAutomaticaService;