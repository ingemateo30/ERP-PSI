// backend/services/FacturacionAutomaticaService.js - CORREGIDO SIN c.activo
const { Database } = require('../models/Database');
const InteresesMoratoriosService = require('./InteresesMoratoriosService');
const IVACalculatorService = require('./IVACalculatorService');

class FacturacionAutomaticaService {

  /**
   * Generar facturación mensual masiva con todas las mejoras
   */
  static async generarFacturacionMensual(parametros = {}) {
    try {
      console.log('🏗️ Iniciando facturación mensual automática...');

      const fechaActual = new Date();
      const periodo = parametros.periodo || `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;

      // 1. Obtener clientes activos para facturar
      const clientesParaFacturar = await this.obtenerClientesParaFacturar(fechaActual);

      console.log(`👥 Clientes encontrados para facturar: ${clientesParaFacturar.length}`);

      let facturasGeneradas = 0;
      let erroresFacturacion = 0;
      const resultadosDetallados = [];

      for (const cliente of clientesParaFacturar) {
        try {
          console.log(`📝 Procesando cliente: ${cliente.nombre} (${cliente.identificacion})`);

          // 2. Verificar si cliente está en condiciones de facturar
          const puedeFacturar = await this.validarClienteParaFacturacion(cliente.id);

          if (!puedeFacturar.permitir) {
            console.log(`❌ Cliente ${cliente.nombre} no puede facturar: ${puedeFacturar.razon}`);
            resultadosDetallados.push({
              cliente_id: cliente.id,
              nombre: cliente.nombre,
              estado: 'omitido',
              razon: puedeFacturar.razon
            });
            continue;
          }

          // 3. Calcular período de facturación específico para el cliente
          const periodoCliente = await this.calcularPeriodoFacturacion(cliente.id, fechaActual);

          // 4. Obtener servicios activos del cliente
          const serviciosActivos = await this.obtenerServiciosActivos(cliente.id);

          if (serviciosActivos.length === 0) {
            console.log(`⚠️ Cliente ${cliente.nombre} no tiene servicios activos`);
            continue;
          }

          // 5. Calcular conceptos de facturación
          const conceptos = await this.calcularConceptosFacturacion(cliente, serviciosActivos, periodoCliente);

          if (conceptos.length === 0) {
            console.log(`⚠️ No hay conceptos para facturar al cliente ${cliente.nombre}`);
            continue;
          }

          // 6. Generar la factura
          const factura = await this.crearFacturaCompleta(cliente, conceptos, periodoCliente);

          facturasGeneradas++;
          resultadosDetallados.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre,
            factura_id: factura.id,
            numero_factura: factura.numero,
            total: factura.total,
            estado: 'generada'
          });

          console.log(`✅ Factura generada: ${factura.numero} - $${factura.total.toLocaleString()}`);

        } catch (error) {
          console.error(`❌ Error facturando cliente ${cliente.nombre}:`, error);
          erroresFacturacion++;
          resultadosDetallados.push({
            cliente_id: cliente.id,
            nombre: cliente.nombre,
            estado: 'error',
            error: error.message
          });
        }
      }

      const resumen = {
        periodo,
        fecha_proceso: fechaActual.toISOString(),
        clientes_procesados: clientesParaFacturar.length,
        facturas_generadas: facturasGeneradas,
        errores: erroresFacturacion,
        tasa_exito: clientesParaFacturar.length > 0 ? 
          ((facturasGeneradas / clientesParaFacturar.length) * 100).toFixed(2) : '0.00',
        detalles: resultadosDetallados
      };

      console.log('📊 Resumen de facturación mensual:');
      console.log(`   - Clientes procesados: ${resumen.clientes_procesados}`);
      console.log(`   - Facturas generadas: ${resumen.facturas_generadas}`);
      console.log(`   - Errores: ${resumen.errores}`);
      console.log(`   - Tasa de éxito: ${resumen.tasa_exito}%`);

      // Registrar en logs del sistema
      await this.registrarLogFacturacion(resumen);

      return resumen;

    } catch (error) {
      console.error('❌ Error en facturación mensual:', error);
      throw error;
    }
  }

  /**
   * Obtener clientes activos para facturar - CORREGIDO
   */
  static async obtenerClientesParaFacturar(fechaReferencia = new Date()) {
    try {
      const conexion = await Database.getConnection();

      try {
        console.log('🔍 Buscando clientes para facturar...');

        const [clientes] = await conexion.execute(`
          SELECT DISTINCT
            c.id,
            c.nombre,
            c.identificacion,
            c.estado,
            c.estrato,
            c.fecha_registro,
            COUNT(DISTINCT sc.id) as servicios_activos,
            COUNT(DISTINCT f.id) as total_facturas,
            MAX(f.fecha_hasta) as ultima_fecha_facturada
          FROM clientes c
          INNER JOIN servicios_cliente sc ON c.id = sc.cliente_id
            AND sc.estado = 'activo'
            AND sc.activo = 1
          LEFT JOIN facturas f ON c.id = f.cliente_id
            AND f.activo = 1
            AND f.estado != 'anulada'
          WHERE c.estado IN ('activo', 'suspendido')
          GROUP BY c.id, c.nombre, c.identificacion, c.estado, c.estrato, c.fecha_registro
          HAVING servicios_activos > 0
          ORDER BY c.nombre ASC
        `);

        console.log(`✅ Encontrados ${clientes.length} clientes con servicios activos`);

        return clientes;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo clientes para facturar:', error);
      throw error;
    }
  }

  /**
   * Obtener servicios activos de un cliente
   */
  static async obtenerServiciosActivos(clienteId) {
    try {
      const conexion = await Database.getConnection();

      try {
        const [servicios] = await conexion.execute(`
          SELECT 
            sc.id,
            sc.cliente_id,
            sc.plan_id,
            sc.estado,
            sc.precio_personalizado,
            sc.fecha_activacion,
            ps.nombre as nombre_plan,
            ps.tipo as tipo_plan,
            ps.precio as precio_servicio,
            ps.aplica_iva,
            ps.descripcion,
            ps.velocidad_bajada,
            ps.velocidad_subida
          FROM servicios_cliente sc
          INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.cliente_id = ?
            AND sc.estado = 'activo'
            AND sc.activo = 1
            AND ps.activo = 1
          ORDER BY ps.tipo ASC
        `, [clienteId]);

        return servicios;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo servicios activos:', error);
      return [];
    }
  }

  /**
   * Calcular período de facturación según las reglas de negocio
   */
  static async calcularPeriodoFacturacion(clienteId, fechaReferencia = new Date()) {
    try {
      const conexion = await Database.getConnection();

      try {
        const [infoCliente] = await conexion.execute(`
          SELECT 
            c.id, c.fecha_registro, c.nombre, c.identificacion,
            COUNT(f.id) as total_facturas,
            MAX(f.fecha_hasta) as ultima_fecha_facturada,
            MIN(sc.fecha_activacion) as fecha_activacion_servicios,
            MIN(i.fecha_instalacion_real) as fecha_instalacion_real,
            MIN(i.fecha_programada) as fecha_instalacion_programada
          FROM clientes c
          LEFT JOIN facturas f ON c.id = f.cliente_id AND f.estado != 'anulada'
          LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
          LEFT JOIN instalaciones i ON sc.id = i.servicio_cliente_id AND i.estado = 'completada'
          WHERE c.id = ?
          GROUP BY c.id, c.fecha_registro, c.nombre, c.identificacion
        `, [clienteId]);

        if (infoCliente.length === 0) {
          throw new Error(`Cliente ${clienteId} no encontrado`);
        }

        const cliente = infoCliente[0];
        const totalFacturas = cliente.total_facturas || 0;

        let fechaBaseFacturacion;

        if (cliente.fecha_instalacion_real) {
          fechaBaseFacturacion = new Date(cliente.fecha_instalacion_real);
          console.log(`📅 Usando fecha REAL de instalación: ${fechaBaseFacturacion.toLocaleDateString()}`);
        } else if (cliente.fecha_activacion_servicios) {
          fechaBaseFacturacion = new Date(cliente.fecha_activacion_servicios);
          console.log(`📅 Usando fecha de activación: ${fechaBaseFacturacion.toLocaleDateString()}`);
        } else {
          fechaBaseFacturacion = new Date(cliente.fecha_registro);
          console.log(`📅 Usando fecha de registro: ${fechaBaseFacturacion.toLocaleDateString()}`);
        }

        const ultimaFechaFacturada = cliente.ultima_fecha_facturada ?
          new Date(cliente.ultima_fecha_facturada) : null;

        let fechaDesde, fechaHasta, esPrimeraFactura = false, esNivelacion = false;
        let tipoFacturacion = '';

        if (totalFacturas === 0) {
          esPrimeraFactura = true;
          tipoFacturacion = 'Primera facturación';
          fechaDesde = fechaBaseFacturacion;
          fechaHasta = new Date(fechaBaseFacturacion);
          fechaHasta.setDate(fechaHasta.getDate() + 29);

          console.log(`🆕 Primera factura: ${fechaDesde.toLocaleDateString()} → ${fechaHasta.toLocaleDateString()}`);

        } else if (totalFacturas === 1) {
          esNivelacion = true;
          tipoFacturacion = 'Segunda facturación (nivelación)';

          fechaDesde = new Date(ultimaFechaFacturada);
          fechaDesde.setDate(fechaDesde.getDate() + 1);

          const diaInstalacion = fechaBaseFacturacion.getDate();
          const mesActual = fechaReferencia.getMonth();
          const anioActual = fechaReferencia.getFullYear();

          if (diaInstalacion === 1) {
            fechaHasta = new Date(anioActual, mesActual + 1, 0);
          } else {
            fechaHasta = new Date(anioActual, mesActual + 1, 0);

            if (fechaHasta <= fechaDesde) {
              fechaHasta = new Date(anioActual, mesActual + 2, 0);
            }
          }

          const diasFacturados = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;

          console.log(`🔄 Segunda factura (nivelación): ${fechaDesde.toLocaleDateString()} → ${fechaHasta.toLocaleDateString()} (${diasFacturados} días)`);

        } else {
          tipoFacturacion = 'Facturación mensual estándar';

          const mesAnterior = fechaReferencia.getMonth() === 0 ? 11 : fechaReferencia.getMonth() - 1;
          const anioMesAnterior = fechaReferencia.getMonth() === 0 ?
            fechaReferencia.getFullYear() - 1 : fechaReferencia.getFullYear();

          fechaDesde = new Date(anioMesAnterior, mesAnterior, 1);
          fechaHasta = new Date(anioMesAnterior, mesAnterior + 1, 0);

          console.log(`📊 Factura mensual: ${fechaDesde.toLocaleDateString()} → ${fechaHasta.toLocaleDateString()}`);
        }

        const diasFacturados = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;
        const periodoDescripcion = `${fechaDesde.toLocaleDateString()} al ${fechaHasta.toLocaleDateString()}`;

        return {
          fecha_desde: fechaDesde.toISOString().split('T')[0],
          fecha_hasta: fechaHasta.toISOString().split('T')[0],
          periodo_descripcion: periodoDescripcion,
          dias_facturados: diasFacturados,
          es_primera_factura: esPrimeraFactura,
          es_nivelacion: esNivelacion,
          tipo_facturacion: tipoFacturacion,
          fecha_base_instalacion: fechaBaseFacturacion.toISOString().split('T')[0],
          numero_factura: totalFacturas + 1
        };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error calculando período:', error);
      throw error;
    }
  }

  /**
   * Validar si un cliente puede ser facturado - CORREGIDO
   */
  static async validarClienteParaFacturacion(clienteId) {
    try {
      const conexion = await Database.getConnection();

      try {
        const [cliente] = await conexion.execute(`
          SELECT estado
          FROM clientes 
          WHERE id = ?
        `, [clienteId]);

        if (!cliente[0]) {
          return { permitir: false, razon: 'Cliente no encontrado' };
        }

        if (cliente[0].estado === 'retirado' || cliente[0].estado === 'inactivo') {
          return { permitir: false, razon: 'Cliente retirado o inactivo' };
        }

        const [servicios] = await conexion.execute(`
          SELECT COUNT(*) as servicios_activos
          FROM servicios_cliente 
          WHERE cliente_id = ? 
            AND estado = 'activo' 
            AND activo = 1
        `, [clienteId]);

        if (servicios[0].servicios_activos === 0) {
          return { permitir: false, razon: 'No tiene servicios activos' };
        }

        const mesActual = new Date().toISOString().slice(0, 7);
        const [facturaExistente] = await conexion.execute(`
          SELECT COUNT(*) as facturas_mes
          FROM facturas 
          WHERE cliente_id = ? 
            AND DATE_FORMAT(fecha_emision, '%Y-%m') = ?
            AND activo = 1
        `, [clienteId, mesActual]);

        if (facturaExistente[0].facturas_mes > 0) {
          return { permitir: false, razon: 'Ya tiene factura generada este período' };
        }

        return { permitir: true, razon: 'Cliente apto para facturación' };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error validando cliente:', error);
      return { permitir: false, razon: 'Error en validación' };
    }
  }

  /**
   * Calcular conceptos de facturación
   */
  static async calcularConceptosFacturacion(cliente, serviciosActivos, periodo) {
    const conceptos = [];

    try {
      const conexion = await Database.getConnection();

      try {
        // Calcular cada servicio
        for (const servicio of serviciosActivos) {
          const precioBase = servicio.precio_personalizado || servicio.precio_servicio;
          
          let precioFinal = precioBase;
          
          if (periodo.es_nivelacion && periodo.dias_facturados !== 30) {
            precioFinal = Math.round((precioBase / 30) * periodo.dias_facturados);
            console.log(`💰 Precio proporcional ${servicio.nombre_plan}: ${precioBase} × ${periodo.dias_facturados}/30 = ${precioFinal}`);
          }

          conceptos.push({
            tipo: servicio.tipo_plan,
            concepto: `${servicio.nombre_plan}${periodo.es_nivelacion ? ` (${periodo.dias_facturados} días)` : ''}`,
            cantidad: 1,
            precio_unitario: precioFinal,
            valor: precioFinal,
            aplica_iva: Boolean(servicio.aplica_iva),
            porcentaje_iva: servicio.aplica_iva ? 19 : 0,
            servicio_cliente_id: servicio.id,
            plan_id: servicio.plan_id
          });
        }

        // Agregar otros conceptos
        const saldoAnterior = await this.calcularSaldoAnterior(conexion, cliente.id);
        if (saldoAnterior.valor > 0) {
          conceptos.push(saldoAnterior);
        }

        const interes = await this.calcularInteresMora(conexion, cliente.id);
        if (interes.valor > 0) {
          conceptos.push(interes);
        }

        const reconexion = await this.calcularReconexion(conexion, cliente.id);
        if (reconexion.valor > 0) {
          conceptos.push(reconexion);
        }

        const varios = await this.calcularVarios(conexion, cliente.id);
        varios.forEach(v => {
          if (v.valor > 0) conceptos.push(v);
        });

        return conceptos;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error calculando conceptos:', error);
      throw error;
    }
  }

  /**
   * Calcular saldo anterior del cliente
   */
  static async calcularSaldoAnterior(conexion, clienteId) {
    try {
      const [resultado] = await conexion.execute(`
        SELECT 
          COALESCE(SUM(f.total - COALESCE(
            (SELECT SUM(p.valor_pagado) 
             FROM pagos p 
             WHERE p.factura_id = f.id 
               AND p.activo = 1), 0
          )), 0) as saldo_pendiente
        FROM facturas f
        WHERE f.cliente_id = ?
          AND f.estado IN ('pendiente', 'vencida')
          AND f.activo = 1
      `, [clienteId]);

      const saldoPendiente = parseFloat(resultado[0]?.saldo_pendiente || 0);

      if (saldoPendiente > 0) {
        return {
          tipo: 'saldo_anterior',
          concepto: 'Saldo pendiente de facturas anteriores',
          cantidad: 1,
          precio_unitario: saldoPendiente,
          valor: saldoPendiente,
          aplica_iva: false,
          porcentaje_iva: 0
        };
      }

      return { valor: 0 };

    } catch (error) {
      console.error('❌ Error calculando saldo anterior:', error);
      return { valor: 0 };
    }
  }

  /**
   * Calcular interés de mora
   */
  static async calcularInteresMora(conexion, clienteId) {
    try {
      const interesPendiente = await InteresesMoratoriosService.calcularInteresPendiente(clienteId);

      if (interesPendiente > 0) {
        return {
          tipo: 'interes',
          concepto: 'Intereses de mora',
          cantidad: 1,
          precio_unitario: interesPendiente,
          valor: interesPendiente,
          aplica_iva: false,
          porcentaje_iva: 0
        };
      }

      return { valor: 0 };

    } catch (error) {
      console.error('❌ Error calculando interés de mora:', error);
      return { valor: 0 };
    }
  }

  /**
   * Calcular reconexión si aplica
   */
  static async calcularReconexion(conexion, clienteId) {
    try {
      const [cortesRecientes] = await conexion.execute(`
        SELECT 
          cs.id,
          cs.fecha_corte
        FROM cortes_servicio cs
        WHERE cs.cliente_id = ?
          AND cs.estado = 'activo'
          AND cs.fecha_reconexion IS NULL
          AND DATEDIFF(CURDATE(), cs.fecha_corte) <= 5
        ORDER BY cs.fecha_corte DESC
        LIMIT 1
      `, [clienteId]);

      if (cortesRecientes.length > 0) {
        const valorReconexion = 25000;

        return {
          tipo: 'reconexion',
          concepto: `Reconexión de servicio`,
          cantidad: 1,
          precio_unitario: valorReconexion,
          valor: valorReconexion,
          aplica_iva: true,
          porcentaje_iva: 19,
          corte_id: cortesRecientes[0].id
        };
      }

      return { valor: 0 };

    } catch (error) {
      console.error('❌ Error calculando reconexión:', error);
      return { valor: 0 };
    }
  }

  /**
   * Calcular varios pendientes
   */
  static async calcularVarios(conexion, clienteId) {
    try {
      const [varios] = await conexion.execute(`
        SELECT 
          'varios' as tipo,
          concepto,
          1 as cantidad,
          valor as precio_unitario,
          valor,
          COALESCE(aplica_iva, 0) as aplica_iva,
          COALESCE(porcentaje_iva, 19) as porcentaje_iva
        FROM varios_pendientes
        WHERE cliente_id = ?
          AND facturado = 0
          AND activo = 1
          AND fecha_aplicacion <= CURDATE()
      `, [clienteId]);

      return varios;

    } catch (error) {
      console.error('❌ Error obteniendo varios:', error);
      return [];
    }
  }

  /**
   * Crear factura completa
   */
  static async crearFacturaCompleta(cliente, conceptos, periodo) {
    try {
      const conexion = await Database.getConnection();

      try {
        await conexion.beginTransaction();

        const numeroFactura = await this.generarNumeroFactura();
        const totales = this.calcularTotalesFactura(conceptos);

        const fechaEmision = new Date();
        const fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

        const [resultFactura] = await conexion.execute(`
          INSERT INTO facturas (
            numero_factura, cliente_id, nombre_cliente, identificacion_cliente,
            periodo_facturacion, fecha_desde, fecha_hasta,
            fecha_emision, fecha_vencimiento,
            internet, television, saldo_anterior, interes, reconexion,
            descuento, varios, subtotal, iva, total,
            estado, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 1, NOW())
        `, [
          numeroFactura,
          cliente.id,
          cliente.nombre,
          cliente.identificacion,
          periodo.periodo_descripcion,
          periodo.fecha_desde,
          periodo.fecha_hasta,
          fechaEmision,
          fechaVencimiento,
          totales.internet || 0,
          totales.television || 0,
          totales.saldo_anterior || 0,
          totales.interes || 0,
          totales.reconexion || 0,
          totales.descuento || 0,
          totales.varios || 0,
          totales.subtotal,
          totales.iva,
          totales.total
        ]);

        const facturaId = resultFactura.insertId;

        await this.crearDetalleFactura(conexion, facturaId, conceptos);
        await this.actualizarConsecutivos();
        await this.marcarVariosComoFacturados(conexion, cliente.id);

        await conexion.commit();

        console.log(`✅ Factura ${numeroFactura} creada - Total: ${totales.total.toLocaleString()}`);

        return {
          id: facturaId,
          numero: numeroFactura,
          total: totales.total,
          cliente_id: cliente.id
        };

      } catch (error) {
        await conexion.rollback();
        throw error;
      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error creando factura:', error);
      throw error;
    }
  }

  /**
   * Crear detalle de factura
   */
  static async crearDetalleFactura(conexion, facturaId, conceptos) {
    try {
      for (const concepto of conceptos) {
        const valorIVA = concepto.aplica_iva ? 
          Math.round(concepto.valor * (concepto.porcentaje_iva / 100)) : 0;

        await conexion.execute(`
          INSERT INTO detalle_factura (
            factura_id,
            tipo_concepto,
            concepto,
            cantidad,
            precio_unitario,
            valor_base,
            aplica_iva,
            porcentaje_iva,
            valor_iva,
            valor_total,
            servicio_cliente_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          facturaId,
          concepto.tipo,
          concepto.concepto,
          concepto.cantidad || 1,
          concepto.precio_unitario,
          concepto.valor,
          concepto.aplica_iva ? 1 : 0,
          concepto.porcentaje_iva || 0,
          valorIVA,
          concepto.valor + valorIVA,
          concepto.servicio_cliente_id || null
        ]);
      }

      console.log(`✅ Creados ${conceptos.length} detalles de factura`);

    } catch (error) {
      console.error('❌ Error creando detalle de factura:', error);
      throw error;
    }
  }

  /**
   * Generar número de factura
   */
  static async generarNumeroFactura() {
    try {
      const conexion = await Database.getConnection();

      try {
        const [config] = await conexion.execute(`
          SELECT consecutivo_factura, prefijo_factura 
          FROM configuracion_empresa 
          WHERE id = 1
        `);

        const consecutivo = config[0]?.consecutivo_factura || 1;
        const prefijo = config[0]?.prefijo_factura || 'FAC';

        return `${prefijo}${String(consecutivo).padStart(6, '0')}`;
      } finally {
        conexion.release();
      }
    } catch (error) {
      console.error('❌ Error generando número de factura:', error);
      return `FAC${String(Date.now()).slice(-6)}`;
    }
  }

  /**
   * Actualizar consecutivos
   */
  static async actualizarConsecutivos() {
    try {
      const conexion = await Database.getConnection();

      try {
        await conexion.execute(`
          UPDATE configuracion_empresa 
          SET consecutivo_factura = consecutivo_factura + 1,
              updated_at = NOW()
          WHERE id = 1
        `);
      } finally {
        conexion.release();
      }
    } catch (error) {
      console.error('❌ Error actualizando consecutivos:', error);
    }
  }

  /**
   * Marcar varios como facturados
   */
  static async marcarVariosComoFacturados(conexion, clienteId) {
    try {
      await conexion.execute(`
        UPDATE varios_pendientes 
        SET facturado = 1, fecha_facturacion = NOW()
        WHERE cliente_id = ? AND facturado = 0
      `, [clienteId]);
    } catch (error) {
      console.error('❌ Error marcando varios:', error);
    }
  }
/**
   * Calcular totales de la factura
   */
  static calcularTotalesFactura(conceptos) {
    let internet = 0, television = 0, varios = 0, interes = 0;
    let reconexion = 0, descuento = 0, saldoAnterior = 0;
    let subtotal = 0, totalIVA = 0;

    conceptos.forEach(concepto => {
      const valor = parseFloat(concepto.valor || 0);
      const iva = concepto.aplica_iva ? valor * (concepto.porcentaje_iva / 100) : 0;

      switch (concepto.tipo) {
        case 'internet':
          internet += valor;
          break;
        case 'television':
          television += valor;
          break;
        case 'varios':
        case 'instalacion':
          varios += valor;
          break;
        case 'interes':
          interes += valor;
          break;
        case 'reconexion':
          reconexion += valor;
          break;
        case 'descuento':
          descuento += valor;
          break;
        case 'saldo_anterior':
          saldoAnterior += valor;
          break;
      }

      subtotal += valor;
      totalIVA += iva;
    });

    return {
      internet: Math.round(internet),
      television: Math.round(television),
      varios: Math.round(varios),
      interes: Math.round(interes),
      reconexion: Math.round(reconexion),
      descuento: Math.round(descuento),
      saldo_anterior: Math.round(saldoAnterior),
      subtotal: Math.round(subtotal),
      iva: Math.round(totalIVA),
      total: Math.round(subtotal + totalIVA)
    };
  }

  /**
   * Registrar log de facturación
   */
  static async registrarLogFacturacion(resumen) {
    try {
      const conexion = await Database.getConnection();

      try {
        await conexion.execute(`
          INSERT INTO logs_sistema (
            tipo, descripcion, datos_json, created_at
          ) VALUES (?, ?, ?, NOW())
        `, [
          'FACTURACION_MENSUAL_AUTOMATICA',
          `Facturación mensual ${resumen.periodo} - ${resumen.facturas_generadas} facturas generadas`,
          JSON.stringify(resumen)
        ]);
      } finally {
        conexion.release();
      }
    } catch (error) {
      console.warn('⚠️ No se pudo registrar log de facturación:', error.message);
    }
  }
}

module.exports = FacturacionAutomaticaService;