// backend/services/FacturacionAutomaticaService.js - CORREGIDO COMPLETAMENTE
// 
// ✅ CORRECCIONES APLICADAS:
// 1. Cálculo correcto de fechas para 2da factura (nivelación)
// 2. Prorratea correcto basado en días reales
// 3. Validación de fechas para evitar años incorrectos
// 4. Cálculo preciso de días entre fechas
// ========================================================================

const { Database } = require('../models/Database');
const InteresesMoratoriosService = require('./InteresesMoratoriosService');
const IVACalculatorService = require('./IVACalculatorService');

class FacturacionAutomaticaService {

  /**
   * Generar facturación mensual masiva
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
   * ✅ CORREGIDO: Obtener clientes activos para facturar
   */
  static async obtenerClientesParaFacturar(fechaReferencia = new Date()) {
    try {
      const conexion = await Database.getConnection();

      try {
        console.log('🔍 Buscando clientes para facturar...');

        const [clientes] = await conexion.execute(`
          SELECT DISTINCT 
            c.id,
            c.identificacion,
            c.nombre,
            c.estrato,
            c.fecha_registro,
            MAX(f.fecha_hasta) as ultima_fecha_facturada,
            MIN(sc.fecha_activacion) as fecha_activacion,
            COUNT(DISTINCT sc.id) as servicios_activos
          FROM clientes c
          JOIN servicios_cliente sc ON c.id = sc.cliente_id 
            AND sc.estado = 'activo'
          JOIN planes_servicio ps ON sc.plan_id = ps.id
            AND ps.activo = 1
          LEFT JOIN facturas f ON c.id = f.cliente_id 
            AND f.estado != 'anulada'
          WHERE c.estado = 'activo'
          GROUP BY c.id, c.identificacion, c.nombre, c.estrato, c.fecha_registro
          ORDER BY c.id ASC
        `);

        console.log(`✅ Encontrados ${clientes.length} clientes con servicios activos`);
        return clientes;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo clientes para facturar:', error);
      return [];
    }
  }

  /**
   * ✅ COMPLETAMENTE CORREGIDO: Calcular período de facturación
   * 
   * REGLAS DE NEGOCIO:
   * 1ra Factura: Desde fecha de instalación por 30 días
   * 2da Factura: Desde día siguiente a última factura hasta fin del mes actual (nivelación)
   * 3ra+ Factura: Del día 1 al último día del mes anterior
   */
  static async calcularPeriodoFacturacion(clienteId, fechaReferencia = new Date()) {
    try {
      const conexion = await Database.getConnection();

      try {
        const [infoCliente] = await conexion.execute(`
          SELECT 
            c.id, c.fecha_registro, c.nombre, c.identificacion,
            COUNT(DISTINCT f.id) as total_facturas,
            MAX(f.fecha_hasta) as ultima_fecha_facturada,
            MIN(sc.fecha_activacion) as fecha_activacion_servicios,
            MIN(i.fecha_realizada) as fecha_instalacion_real,
            MIN(i.fecha_programada) as fecha_instalacion_programada
          FROM clientes c
          LEFT JOIN facturas f ON c.id = f.cliente_id 
            AND f.estado != 'anulada'
            AND f.activo = '1'
          LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id 
            AND sc.estado = 'activo'
          LEFT JOIN instalaciones i ON sc.id = i.servicio_cliente_id 
            AND i.estado = 'completada'
          WHERE c.id = ?
          GROUP BY c.id, c.fecha_registro, c.nombre, c.identificacion
        `, [clienteId]);

        if (infoCliente.length === 0) {
          throw new Error(`Cliente ${clienteId} no encontrado`);
        }

        const cliente = infoCliente[0];
        const totalFacturas = cliente.total_facturas || 0;

        // ✅ DETERMINAR FECHA BASE (fecha de inicio del contrato/instalación)
        let fechaBaseFacturacion;

        if (cliente.fecha_instalacion_real) {
          fechaBaseFacturacion = new Date(cliente.fecha_instalacion_real);
        } else if (cliente.fecha_activacion_servicios) {
          fechaBaseFacturacion = new Date(cliente.fecha_activacion_servicios);
        } else {
          fechaBaseFacturacion = new Date(cliente.fecha_registro);
        }

        console.log(`📅 Cliente: ${cliente.nombre}`);
        console.log(`   Total facturas anteriores: ${totalFacturas}`);
        console.log(`   Fecha base: ${fechaBaseFacturacion.toLocaleDateString('es-CO')}`);

        let fechaDesde, fechaHasta, esPrimeraFactura = false, esNivelacion = false;
        let tipoFacturacion = '';

        // ========================================================================
        // CASO 1: PRIMERA FACTURA (0 facturas previas)
        // ========================================================================
        if (totalFacturas === 0) {
          esPrimeraFactura = true;
          tipoFacturacion = 'Primera facturación';
          
          fechaDesde = new Date(fechaBaseFacturacion);
          fechaHasta = new Date(fechaBaseFacturacion);
          fechaHasta.setDate(fechaHasta.getDate() + 29); // 30 días (0-29)

          console.log(`   🆕 1ra Factura: ${fechaDesde.toLocaleDateString('es-CO')} → ${fechaHasta.toLocaleDateString('es-CO')}`);
        }
        
        // ========================================================================
        // CASO 2: SEGUNDA FACTURA - NIVELACIÓN (1 factura previa)
        // ========================================================================
        else if (totalFacturas === 1) {
          esNivelacion = true;
          tipoFacturacion = 'Segunda facturación (nivelación)';

          // ✅ CORRECCIÓN: Tomar fecha_hasta de la última factura correctamente
          if (!cliente.ultima_fecha_facturada) {
            throw new Error('No se encontró la fecha de la última factura');
          }

          const ultimaFechaFacturada = new Date(cliente.ultima_fecha_facturada);
          
          // Desde: día siguiente a la última factura
          fechaDesde = new Date(ultimaFechaFacturada);
          fechaDesde.setDate(fechaDesde.getDate() + 1);

          // ✅ Hasta: último día del mes ACTUAL (fecha de referencia)
          fechaHasta = new Date(
            fechaReferencia.getFullYear(),
            fechaReferencia.getMonth() + 1,
            0 // Último día del mes actual
          );

          // ✅ VALIDACIÓN: Si fechaHasta es menor o igual a fechaDesde, adelantar un mes
          if (fechaHasta <= fechaDesde) {
            fechaHasta = new Date(
              fechaReferencia.getFullYear(),
              fechaReferencia.getMonth() + 2,
              0 // Último día del mes siguiente
            );
          }

          console.log(`   🔄 2da Factura (nivelación): ${fechaDesde.toLocaleDateString('es-CO')} → ${fechaHasta.toLocaleDateString('es-CO')}`);
        }
        
        // ========================================================================
        // CASO 3: FACTURACIÓN MENSUAL ESTÁNDAR (2+ facturas previas)
        // ========================================================================
        else {
          tipoFacturacion = 'Facturación mensual estándar';

          // Del día 1 al último día del mes ANTERIOR a la fecha de referencia
          const mesAnterior = fechaReferencia.getMonth() === 0 ? 11 : fechaReferencia.getMonth() - 1;
          const anioMesAnterior = fechaReferencia.getMonth() === 0 ?
            fechaReferencia.getFullYear() - 1 : fechaReferencia.getFullYear();

          fechaDesde = new Date(anioMesAnterior, mesAnterior, 1);
          fechaHasta = new Date(anioMesAnterior, mesAnterior + 1, 0);

          console.log(`   📊 Factura mensual: ${fechaDesde.toLocaleDateString('es-CO')} → ${fechaHasta.toLocaleDateString('es-CO')}`);
        }

        // ✅ CÁLCULO CORRECTO DE DÍAS
        const diasFacturados = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;
        const periodoDescripcion = `${fechaDesde.toLocaleDateString('es-CO')} al ${fechaHasta.toLocaleDateString('es-CO')}`;

        // ✅ VALIDACIÓN: Asegurar que las fechas son válidas
        if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
          throw new Error('Error en el cálculo de fechas de facturación');
        }

        if (diasFacturados < 1 || diasFacturados > 365) {
          throw new Error(`Días facturados fuera de rango válido: ${diasFacturados}`);
        }

        console.log(`   ⏱️ Días a facturar: ${diasFacturados}`);

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
   * Validar si un cliente puede ser facturado
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
   * ✅ CORREGIDO: Calcular conceptos de facturación con prorrateo correcto
   */
  static async calcularConceptosFacturacion(cliente, serviciosActivos, periodo) {
    const conceptos = [];

    try {
      const conexion = await Database.getConnection();

      try {
        // Calcular cada servicio
        for (const servicio of serviciosActivos) {
          const precioBase = parseFloat(servicio.precio_personalizado || servicio.precio_servicio);
          
          let precioFinal = precioBase;
          
          // ✅ PRORRATEA SOLO para facturas que NO son mensuales completas (30 días)
          // Primera factura: siempre 30 días = precio completo
          // Segunda factura (nivelación): puede ser más o menos de 30 días = prorratea
          // Factura mensual: siempre mes completo = precio completo
          
          if (periodo.es_nivelacion && periodo.dias_facturados !== 30) {
            // ✅ FÓRMULA CORRECTA: (Precio × Días) / 30
            precioFinal = Math.round((precioBase * periodo.dias_facturados) / 30);
            console.log(`   💰 Prorratea ${servicio.nombre_plan}: $${precioBase} × ${periodo.dias_facturados} días / 30 = $${precioFinal}`);
          } else {
            console.log(`   💰 Precio completo ${servicio.nombre_plan}: $${precioBase}`);
          }

          conceptos.push({
            tipo: servicio.tipo_plan,
            concepto: `${servicio.nombre_plan}${periodo.es_nivelacion && periodo.dias_facturados !== 30 ? ` (${periodo.dias_facturados} días)` : ''}`,
            cantidad: 1,
            precio_unitario: precioFinal,
            valor: precioFinal,
            aplica_iva: Boolean(servicio.aplica_iva),
            porcentaje_iva: servicio.aplica_iva ? 19 : 0,
            servicio_cliente_id: servicio.id,
            plan_id: servicio.plan_id
          });
        }

        // Agregar otros conceptos (saldo anterior, intereses, reconexión, varios)
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
   * Obtener servicios activos del cliente
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
            sc.precio_personalizado,
            sc.fecha_activacion,
            ps.nombre as nombre_plan,
            ps.tipo as tipo_plan,
            ps.precio as precio_servicio,
            ps.aplica_iva,
            ps.aplica_iva_estrato_123,
            ps.aplica_iva_estrato_456,
            c.estrato
          FROM servicios_cliente sc
          JOIN planes_servicio ps ON sc.plan_id = ps.id
          JOIN clientes c ON sc.cliente_id = c.id
          WHERE sc.cliente_id = ?
            AND sc.estado = 'activo'
          ORDER BY ps.tipo ASC
        `, [clienteId]);

        // ✅ Aplicar reglas de IVA por estrato
        return servicios.map(s => {
          const estrato = parseInt(s.estrato) || 1;
          let aplicaIva = false;

          if (s.tipo_plan === 'internet') {
            // Internet: IVA solo estratos 4, 5, 6
            aplicaIva = estrato >= 4 && s.aplica_iva_estrato_456;
          } else if (s.tipo_plan === 'television') {
            // Televisión: IVA para todos los estratos
            aplicaIva = true;
          } else if (s.tipo_plan === 'combo') {
            // Combo: depende del estrato
            aplicaIva = estrato >= 4;
          }

          return {
            ...s,
            aplica_iva: aplicaIva
          };
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo servicios activos:', error);
      return [];
    }
  }

  // ========================================================================
  // MÉTODOS AUXILIARES PARA CONCEPTOS ADICIONALES
  // ========================================================================

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
          AND f.activo = '1'
      `, [clienteId]);

      const saldo = parseFloat(resultado[0]?.saldo_pendiente || 0);

      return {
        tipo: 'saldo_anterior',
        concepto: 'Saldo anterior',
        cantidad: 1,
        precio_unitario: saldo,
        valor: Math.round(saldo),
        aplica_iva: false,
        porcentaje_iva: 0
      };
    } catch (error) {
      console.error('Error calculando saldo anterior:', error);
      return { valor: 0 };
    }
  }

  static async calcularInteresMora(conexion, clienteId) {
    try {
      // Usar el servicio de intereses moratorios
      const interes = await InteresesMoratoriosService.calcularInteresesCliente(clienteId);

      return {
        tipo: 'interes',
        concepto: 'Intereses de mora',
        cantidad: 1,
        precio_unitario: interes.total_intereses || 0,
        valor: Math.round(interes.total_intereses || 0),
        aplica_iva: false,
        porcentaje_iva: 0
      };
    } catch (error) {
      console.error('Error calculando intereses:', error);
      return { valor: 0 };
    }
  }

  static async calcularReconexion(conexion, clienteId) {
    try {
      const [resultado] = await conexion.execute(`
        SELECT COALESCE(SUM(costo), 0) as total_reconexion
        FROM traslados_servicio
        WHERE cliente_id = ?
          AND facturado = 0
          AND activo = 1
      `, [clienteId]);

      const reconexion = parseFloat(resultado[0]?.total_reconexion || 0);

      if (reconexion > 0) {
        // Marcar como facturado
        await conexion.execute(`
          UPDATE traslados_servicio
          SET facturado = 1
          WHERE cliente_id = ? AND facturado = 0
        `, [clienteId]);
      }

      return {
        tipo: 'reconexion',
        concepto: 'Reconexión del servicio',
        cantidad: 1,
        precio_unitario: reconexion,
        valor: Math.round(reconexion),
        aplica_iva: true, // Reconexión lleva IVA 19%
        porcentaje_iva: 19
      };
    } catch (error) {
      console.error('Error calculando reconexión:', error);
      return { valor: 0 };
    }
  }

  static async calcularVarios(conexion, clienteId) {
    try {
      const [varios] = await conexion.execute(`
        SELECT 
          id,
          concepto,
          cantidad,
          valor_unitario,
          valor_total,
          aplica_iva,
          porcentaje_iva
        FROM varios_pendientes
        WHERE cliente_id = ?
          AND facturado = 0
          AND activo = 1
      `, [clienteId]);

      if (varios.length > 0) {
        // Marcar como facturados
        await conexion.execute(`
          UPDATE varios_pendientes
          SET facturado = 1, fecha_facturacion = NOW()
          WHERE cliente_id = ? AND facturado = 0
        `, [clienteId]);
      }

      return varios.map(v => ({
        tipo: 'varios',
        concepto: v.concepto,
        cantidad: v.cantidad || 1,
        precio_unitario: v.valor_unitario,
        valor: Math.round(v.valor_total),
        aplica_iva: Boolean(v.aplica_iva),
        porcentaje_iva: v.porcentaje_iva || (v.aplica_iva ? 19 : 0)
      }));
    } catch (error) {
      console.error('Error calculando varios:', error);
      return [];
    }
  }

  // ========================================================================
  // CREACIÓN DE FACTURA COMPLETA
  // ========================================================================

  static async crearFacturaCompleta(cliente, conceptos, periodo) {
    try {
      const conexion = await Database.getConnection();

      try {
        // Generar número de factura
        const numeroFactura = await this.generarNumeroFactura();

        // Calcular totales
        const totales = this.calcularTotalesFactura(conceptos);

        // Fechas de la factura
        const fechaEmision = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15); // 15 días para vencimiento

        // Crear factura
        const [resultado] = await conexion.execute(`
          INSERT INTO facturas (
            numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
            periodo_facturacion, fecha_emision, fecha_vencimiento,
            fecha_desde, fecha_hasta,
            internet, television, saldo_anterior, interes, reconexion,
            descuento, varios,
            subtotal, iva, total,
            estado, activo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 1, NOW())
        `, [
          numeroFactura,
          cliente.id,
          cliente.identificacion,
          cliente.nombre,
          `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`,
          fechaEmision.toISOString().split('T')[0],
          fechaVencimiento.toISOString().split('T')[0],
          periodo.fecha_desde,
          periodo.fecha_hasta,
          totales.internet,
          totales.television,
          totales.saldo_anterior,
          totales.interes,
          totales.reconexion,
          totales.descuento,
          totales.varios,
          totales.subtotal,
          totales.iva,
          totales.total
        ]);

        const facturaId = resultado.insertId;

        // Crear detalles de factura
        await this.crearDetalleFactura(conexion, facturaId, conceptos);

        // Actualizar consecutivo
        await this.actualizarConsecutivos();

        return {
          id: facturaId,
          numero: numeroFactura,
          total: totales.total,
          subtotal: totales.subtotal,
          iva: totales.iva
        };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error creando factura:', error);
      throw error;
    }
  }

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

  static async generarNumeroFactura() {
  try {
    // Obtener la última factura registrada
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

    // ✅ Retornar solo el número generado (no JSON)
    return nuevoNumero;

  } catch (error) {
    console.error('❌ Error generando número de factura:', error);
    throw new Error('Error generando número de factura: ' + error.message);
  }
}



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
   * Calcular totales de la factura
   */
  static calcularTotalesFactura(conceptos) {
    let internet = 0, television = 0, varios = 0, interes = 0;
    let reconexion = 0, descuento = 0, saldoAnterior = 0;
    let subtotal = 0, totalIVA = 0;

    conceptos.forEach(concepto => {
      const valor = parseFloat(concepto.valor || 0);
      const iva = concepto.aplica_iva ? Math.round(valor * (concepto.porcentaje_iva / 100)) : 0;

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

        console.log('✅ Log de facturación registrado correctamente');

      } finally {
        conexion.release();
      }
    } catch (error) {
      console.warn('⚠️ No se pudo registrar log de facturación:', error.message);
    }
  }

  /**
   * Validación de integridad de datos antes de facturar
   */
  static async validarIntegridadDatos() {
    const errores = [];

    try {
      const conexion = await Database.getConnection();

      try {
        // Validar clientes sin servicios activos
        const [clientesSinServicios] = await conexion.execute(`
          SELECT c.id, c.nombre
          FROM clientes c
          LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
          WHERE c.estado = 'activo'
            AND sc.id IS NULL
        `);

        clientesSinServicios.forEach(c => {
          errores.push({
            tipo: 'cliente_sin_servicios',
            cliente_id: c.id,
            cliente_nombre: c.nombre,
            descripcion: 'Cliente activo sin servicios activos'
          });
        });

        // Validar servicios sin plan
        const [serviciosSinPlan] = await conexion.execute(`
          SELECT sc.id, c.nombre as cliente_nombre
          FROM servicios_cliente sc
          JOIN clientes c ON sc.cliente_id = c.id
          LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.estado = 'activo'
            AND ps.id IS NULL
        `);

        serviciosSinPlan.forEach(s => {
          errores.push({
            tipo: 'servicio_sin_plan',
            servicio_id: s.id,
            cliente_nombre: s.cliente_nombre,
            descripcion: 'Servicio activo sin plan asociado'
          });
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('Error validando integridad:', error);
    }

    return {
      valido: errores.length === 0,
      total_errores: errores.length,
      errores
    };
  }

}

module.exports = FacturacionAutomaticaService;