// backend/services/FacturacionAutomaticaService.js - VERSIÓN MEJORADA
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
        tasa_exito: ((facturasGeneradas / clientesParaFacturar.length) * 100).toFixed(2),
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
   * Calcular período de facturación según las reglas de negocio
   */
  static async calcularPeriodoFacturacion(clienteId, fechaReferencia = new Date()) {
    try {
      const conexion = await Database.conexion();

      try {
        const [infoCliente] = await conexion.execute(`
        SELECT 
          c.fecha_registro,
          sc.fecha_activacion,
          MAX(f.fecha_hasta) as ultima_fecha_facturada,
          COUNT(f.id) as total_facturas
        FROM clientes c
        LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.activo = 1
        LEFT JOIN facturas f ON c.id = f.cliente_id AND f.activo = 1
        WHERE c.id = ?
        GROUP BY c.id, c.fecha_registro, sc.fecha_activacion
      `, [clienteId]);

        const cliente = infoCliente[0];
        const fechaActivacion = new Date(cliente.fecha_activacion || cliente.fecha_registro);
        const totalFacturas = cliente.total_facturas || 0;
        const ultimaFechaFacturada = cliente.ultima_fecha_facturada ?
          new Date(cliente.ultima_fecha_facturada) : null;

        let fechaDesde, fechaHasta, esPrimeraFactura = false, esNivelacion = false;

        if (totalFacturas === 0) {
          // PRIMERA FACTURA: Ejemplo 27 junio → 26 julio
          esPrimeraFactura = true;
          fechaDesde = fechaActivacion;
          fechaHasta = new Date(fechaActivacion);
          fechaHasta.setDate(fechaHasta.getDate() + 29); // 30 días inclusive

        } else if (totalFacturas === 1) {
          // SEGUNDA FACTURA: Ejemplo 27 julio → 31 agosto (nivelación)
          esNivelacion = true;
          fechaDesde = new Date(ultimaFechaFacturada);
          fechaDesde.setDate(fechaDesde.getDate() + 1); // Día siguiente al último facturado

          // Ir hasta el final del mes para nivelar
          const mesFacturacion = fechaReferencia.getMonth();
          const añoFacturacion = fechaReferencia.getFullYear();
          fechaHasta = new Date(añoFacturacion, mesFacturacion, 0); // Último día del mes anterior

          // Si ya estamos en ese mes, ir al siguiente
          if (fechaHasta <= fechaDesde) {
            fechaHasta = new Date(añoFacturacion, mesFacturacion + 1, 0);
          }

        } else {
          // TERCERA EN ADELANTE: 1 → 30 del mes
          const mesAnterior = fechaReferencia.getMonth() === 0 ? 11 : fechaReferencia.getMonth() - 1;
          const añoMesAnterior = fechaReferencia.getMonth() === 0 ?
            fechaReferencia.getFullYear() - 1 : fechaReferencia.getFullYear();

          fechaDesde = new Date(añoMesAnterior, mesAnterior, 1);
          fechaHasta = new Date(añoMesAnterior, mesAnterior + 1, 0);
        }

        const diasFacturados = Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)) + 1;

        return {
          cliente_id: clienteId,
          fecha_desde: fechaDesde.toISOString().split('T')[0],
          fecha_hasta: fechaHasta.toISOString().split('T')[0],
          dias_facturados: diasFacturados,
          es_primera_factura: esPrimeraFactura,
          es_nivelacion: esNivelacion,
          total_facturas_anteriores: totalFacturas,
          periodo_descripcion: `${fechaDesde.toISOString().split('T')[0]} al ${fechaHasta.toISOString().split('T')[0]}`,
          periodo_facturacion: `${fechaReferencia.getFullYear()}-${String(fechaReferencia.getMonth() + 1).padStart(2, '0')}`
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
      const conexion = await Database.conexion();

      try {
        // 1. Verificar estado del cliente
        const [cliente] = await conexion.execute(`
          SELECT estado, activo 
          FROM clientes 
          WHERE id = ?
        `, [clienteId]);

        if (!cliente[0] || !cliente[0].activo) {
          return { permitir: false, razon: 'Cliente inactivo o no encontrado' };
        }

        if (cliente[0].estado === 'retirado') {
          return { permitir: false, razon: 'Cliente retirado' };
        }

        // 2. Verificar mora excesiva (configuración: parar facturación después de no pago al primer mes)
        const [facturasMora] = await conexion.execute(`
          SELECT 
            COUNT(*) as facturas_mora,
            MAX(DATEDIFF(CURDATE(), fecha_vencimiento)) as dias_mora_maxima
          FROM facturas 
          WHERE cliente_id = ? 
            AND estado IN ('pendiente', 'vencida')
            AND DATEDIFF(CURDATE(), fecha_vencimiento) > 30
            AND activo = 1
        `, [clienteId]);

        const moraExcesiva = facturasMora[0].facturas_mora > 0 && facturasMora[0].dias_mora_maxima > 60;

        if (moraExcesiva) {
          // Marcar cliente como inactivo por mora
          await conexion.execute(`
            UPDATE clientes 
            SET estado = 'suspendido',
                observaciones = CONCAT(COALESCE(observaciones, ''), '\n[SISTEMA] Cliente suspendido por mora excesiva - ', NOW())
            WHERE id = ?
          `, [clienteId]);

          return { permitir: false, razon: 'Cliente suspendido por mora excesiva (más de 60 días)' };
        }

        // 3. Verificar servicios activos
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
        const [facturasSinPago] = await conexion.execute(`
  SELECT 
    COUNT(*) as facturas_sin_pago,
    MIN(fecha_vencimiento) as primera_vencida,
    DATEDIFF(CURDATE(), MIN(fecha_vencimiento)) as dias_primer_impago
  FROM facturas 
  WHERE cliente_id = ? 
    AND estado IN ('pendiente', 'vencida')
    AND activo = 1
    AND total > (SELECT COALESCE(SUM(valor_pagado), 0) FROM pagos WHERE factura_id = facturas.id)
`, [clienteId]);

        const moraInfo = facturasSinPago[0];

        // Si tiene facturas sin pago por más de 30 días, suspender facturación pero seguir intereses
        if (moraInfo.facturas_sin_pago > 0 && moraInfo.dias_primer_impago > 30) {
          // Marcar cliente como suspendido
          await conexion.execute(`
    UPDATE clientes 
    SET estado = 'suspendido',
        observaciones = CONCAT(COALESCE(observaciones, ''), 
                              '\n[SISTEMA] Suspendido por mora - ', NOW())
    WHERE id = ?
  `, [clienteId]);

          return {
            permitir: false,
            razon: 'Cliente suspendido por mora - facturación detenida, intereses continúan',
            seguir_intereses: true
          };
        }
        // 4. Verificar si ya tiene factura del período actual
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
      console.error('❌ Error validando cliente para facturación:', error);
      return { permitir: false, razon: 'Error en validación' };
    }
  }

  /**
   * Calcular conceptos de facturación con todas las mejoras
   */
  static async calcularConceptosFacturacion(cliente, serviciosActivos, periodo) {
    const conceptos = [];

    try {
      // 1. SERVICIOS CONTRATADOS (Internet, TV, etc.)
      for (const servicio of serviciosActivos) {
        const conceptoServicio = await this.calcularConceptoServicio(servicio, periodo, cliente);
        if (conceptoServicio) {
          conceptos.push(conceptoServicio);
        }
      }

      // 2. INSTALACIÓN (solo primera factura y según permanencia)
      if (periodo.es_primera_factura) {
        const conceptosInstalacion = await this.calcularConceptosInstalacion(cliente.id, serviciosActivos);
        conceptos.push(...conceptosInstalacion);
      }

      // 3. SALDO ANTERIOR (deuda pendiente)
      const saldoAnterior = await this.obtenerSaldoAnterior(cliente.id);
      if (saldoAnterior > 0) {
        conceptos.push({
          tipo: 'saldo_anterior',
          concepto: 'Saldo anterior pendiente',
          cantidad: 1,
          precio_unitario: saldoAnterior,
          valor: saldoAnterior,
          aplica_iva: false,
          porcentaje_iva: 0
        });
      }

      // 4. INTERESES POR MORA (sin IVA, en factura del mes siguiente)
      const interesesMora = await InteresesMoratoriosService.obtenerInteresesPendientes(cliente.id);
      if (interesesMora.total > 0) {
        conceptos.push({
          tipo: 'interes',
          concepto: `Intereses por mora (${interesesMora.facturas} facturas)`,
          cantidad: 1,
          precio_unitario: interesesMora.total,
          valor: interesesMora.total,
          aplica_iva: false,
          porcentaje_iva: 0
        });
      }

      // 5. VARIOS PENDIENTES (traslados, pérdida inventario, etc.)
      const variosDescuentos = await this.obtenerVariosDescuentosPendientes(cliente.id);
      conceptos.push(...variosDescuentos);

      // 6. RECONEXIÓN (si aplica)
      const reconexion = await this.calcularReconexion(cliente.id);
      if (reconexion.valor > 0) {
        conceptos.push(reconexion);
      }

      return conceptos;

    } catch (error) {
      console.error('❌ Error calculando conceptos de facturación:', error);
      return [];
    }
  }

  /**
   * Calcular conceptos de instalación según planes de permanencia
   */
  static async calcularConceptosInstalacion(clienteId, serviciosActivos) {
    try {
      const conexion = await Database.conexion();
      const conceptosInstalacion = [];

      for (const servicio of serviciosActivos) {
        // Verificar si el plan requiere instalación
        const [planInfo] = await conexion.execute(`
          SELECT 
            p.requiere_instalacion,
            p.permanencia_meses,
            p.valor_instalacion,
            p.nombre
          FROM planes_servicio p
          WHERE p.id = ?
        `, [servicio.plan_id]);

        const plan = planInfo[0];

        if (plan.requiere_instalacion) {
          let valorInstalacion = plan.valor_instalacion || 42016; // Valor por defecto

          // Aplicar descuento por permanencia si aplica
          if (plan.permanencia_meses >= 12) {
            valorInstalacion = 0; // Gratis por permanencia de 12+ meses
          } else if (plan.permanencia_meses >= 6) {
            valorInstalacion = valorInstalacion * 0.5; // 50% descuento por 6+ meses
          }

          if (valorInstalacion > 0) {
            conceptosInstalacion.push({
              tipo: 'instalacion',
              concepto: `Instalación ${plan.nombre}`,
              cantidad: 1,
              precio_unitario: valorInstalacion,
              valor: valorInstalacion,
              aplica_iva: true,
              porcentaje_iva: 19,
              servicio_cliente_id: servicio.id,
              plan_permanencia: plan.permanencia_meses
            });
          }
        }
      }

      return conceptosInstalacion;

    } catch (error) {
      console.error('❌ Error calculando instalación:', error);
      return [];
    }
  }

  /**
   * Obtener varios y descuentos pendientes
   */
  static async obtenerVariosDescuentosPendientes(clienteId) {
    try {
      const conexion = await Database.conexion();

      try {
        // Obtener varios pendientes de diferentes fuentes
        const [variosPendientes] = await conexion.execute(`
          SELECT 
            'traslado' as tipo,
            CONCAT('Traslado de servicio - ', DATE_FORMAT(fecha_traslado, '%d/%m/%Y')) as concepto,
            1 as cantidad,
            costo as precio_unitario,
            costo as valor,
            true as aplica_iva,
            19 as porcentaje_iva
          FROM traslados_servicio
          WHERE cliente_id = ? 
            AND facturado = 0 
            AND activo = 1
          
          UNION ALL
          
          SELECT 
            'equipo_perdido' as tipo,
            CONCAT('Reposición equipo - ', nombre) as concepto,
            cantidad,
            precio_reposicion as precio_unitario,
            (cantidad * precio_reposicion) as valor,
            true as aplica_iva,
            19 as porcentaje_iva
          FROM equipos_perdidos
          WHERE cliente_id = ? 
            AND facturado = 0 
            AND activo = 1
            
          UNION ALL
          
          SELECT 
            'varios' as tipo,
            concepto,
            cantidad,
            valor_unitario as precio_unitario,
            valor_total as valor,
            aplica_iva,
            porcentaje_iva
          FROM varios_pendientes
          WHERE cliente_id = ? 
            AND facturado = 0 
            AND activo = 1
            AND fecha_aplicacion <= CURDATE()
        `, [clienteId, clienteId, clienteId]);

        return variosPendientes;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo varios pendientes:', error);
      return [];
    }
  }

  /**
   * Calcular reconexión si aplica
   */
  static async calcularReconexion(clienteId) {
    try {
      const conexion = await Database.conexion();

      try {
        // Verificar si hay cortes recientes que requieren reconexión
        const [cortesRecientes] = await conexion.execute(`
          SELECT 
            cs.id,
            cs.fecha_corte,
            cs.motivo,
            DATEDIFF(CURDATE(), cs.fecha_corte) as dias_corte
          FROM cortes_servicio cs
          WHERE cs.cliente_id = ?
            AND cs.estado = 'activo'
            AND cs.fecha_reconexion IS NULL
            AND DATEDIFF(CURDATE(), cs.fecha_corte) <= 5
          ORDER BY cs.fecha_corte DESC
          LIMIT 1
        `, [clienteId]);

        if (cortesRecientes.length > 0) {
          // Obtener valor de reconexión de configuración
          const [config] = await conexion.execute(`
            SELECT valor
            FROM configuracion_facturacion
            WHERE parametro = 'VALOR_RECONEXION'
              AND activo = 1
          `);

          const valorReconexion = parseFloat(config[0]?.valor || 25000);

          return {
            tipo: 'reconexion',
            concepto: `Reconexión de servicio - Corte ${cortesRecientes[0].fecha_corte}`,
            cantidad: 1,
            precio_unitario: valorReconexion,
            valor: valorReconexion,
            aplica_iva: true,
            porcentaje_iva: 19,
            corte_id: cortesRecientes[0].id
          };
        }

        return { valor: 0 };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error calculando reconexión:', error);
      return { valor: 0 };
    }
  }

  /**
   * Crear factura completa con todos los conceptos
   */
  static async crearFacturaCompleta(cliente, conceptos, periodo) {
    try {
      const conexion = await Database.conexion();

      try {
        await conexion.beginTransaction();

        // 1. Generar número de factura
        const numeroFactura = await this.generarNumeroFactura();

        // 2. Calcular totales
        const totales = this.calcularTotalesFactura(conceptos);

        // 3. Calcular fecha de vencimiento
        const fechaEmision = new Date();
        const fechaVencimiento = new Date(fechaEmision);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15); // 15 días para pagar

        // 4. Crear registro de factura
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

        // 5. Crear detalle de factura
        await this.crearDetalleFactura(conexion, facturaId, conceptos);

        // 6. Actualizar consecutivos
        await this.actualizarConsecutivos();

        // 7. Marcar varios como facturados
        await this.marcarVariosComoFacturados(conexion, cliente.id);

        await conexion.commit();

        console.log(`✅ Factura ${numeroFactura} creada exitosamente - Total: ${totales.total.toLocaleString()}`);

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
      console.error('❌ Error creando factura completa:', error);
      throw error;
    }
  }

  /**
   * Marcar varios como facturados
   */
  static async marcarVariosComoFacturados(conexion, clienteId) {
    await conexion.execute(`
      UPDATE traslados_servicio 
      SET facturado = 1, fecha_facturacion = NOW()
      WHERE cliente_id = ? AND facturado = 0
    `, [clienteId]);

    await conexion.execute(`
      UPDATE equipos_perdidos 
      SET facturado = 1, fecha_facturacion = NOW()
      WHERE cliente_id = ? AND facturado = 0
    `, [clienteId]);

    await conexion.execute(`
      UPDATE varios_pendientes 
      SET facturado = 1, fecha_facturacion = NOW()
      WHERE cliente_id = ? AND facturado = 0
    `, [clienteId]);
  }

  /**
   * Registrar log de facturación
   */
  static async registrarLogFacturacion(resumen) {
    try {
      const conexion = await Database.conexion();

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

  // ============================================
// MÉTODO FALTANTE: calcularConceptoServicio()
// Agregar este método a tu FacturacionAutomaticaService.js
// ============================================

/**
 * Calcular concepto de servicio con IVA correcto según estrato
 * MÉTODO FALTANTE - AGREGAR DESPUÉS DE calcularConceptosFacturacion()
 */
static async calcularConceptoServicio(servicio, periodo, cliente) {
  try {
    console.log(`📝 Calculando concepto para servicio: ${servicio.nombre_plan}`);
    
    // 1. Obtener precio del servicio (personalizado o del plan)
    const precioServicio = servicio.precio_personalizado || servicio.precio_servicio || servicio.precio;
    
    if (!precioServicio || precioServicio <= 0) {
      console.warn(`⚠️ Precio no válido para servicio ${servicio.nombre_plan}: ${precioServicio}`);
      return null;
    }

    // 2. Calcular valor proporcional según días facturados
    let valorServicio = parseFloat(precioServicio);
    
    if (periodo.dias_facturados && periodo.dias_facturados !== 30) {
      valorServicio = (valorServicio / 30) * periodo.dias_facturados;
      valorServicio = Math.round(valorServicio);
      console.log(`📊 Valor proporcional: ${precioServicio} × ${periodo.dias_facturados}/30 = ${valorServicio}`);
    }

    // 3. Determinar aplicación de IVA según reglas del negocio y estrato del cliente
    let aplicaIVA = false;
    let porcentajeIVA = 0;
    let descripcionIVA = '';

    // Reglas de IVA según las instrucciones:
    if (servicio.tipo === 'internet' || servicio.tipo_plan === 'internet') {
      // Internet: Sin IVA para estratos 1,2,3 - Con IVA 19% para estratos 4,5,6
      if (cliente.estrato >= 4) {
        aplicaIVA = true;
        porcentajeIVA = 19;
        descripcionIVA = `Internet - IVA 19% (Estrato ${cliente.estrato})`;
      } else {
        aplicaIVA = false;
        porcentajeIVA = 0;
        descripcionIVA = `Internet - Sin IVA (Estrato ${cliente.estrato})`;
      }
    } else if (servicio.tipo === 'television' || servicio.tipo_plan === 'television') {
      // Televisión: IVA 19% para todos los estratos
      aplicaIVA = true;
      porcentajeIVA = 19;
      descripcionIVA = `Televisión - IVA 19% (Todos los estratos)`;
    } else if (servicio.tipo === 'combo' || servicio.tipo_plan === 'combo') {
      // Combo: Separar internet y TV para aplicar IVA diferenciado
      const precioInternet = servicio.precio_internet || (valorServicio * 0.6); // 60% aprox
      const precioTV = servicio.precio_television || (valorServicio * 0.4); // 40% aprox
      
      // Para combos, crear dos conceptos separados
      const conceptos = [];
      
      // Concepto Internet del combo
      if (precioInternet > 0) {
        conceptos.push({
          tipo: 'internet',
          concepto: `${servicio.nombre_plan} (Internet) - ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
          cantidad: 1,
          precio_unitario: precioInternet,
          valor: precioInternet,
          aplica_iva: cliente.estrato >= 4,
          porcentaje_iva: cliente.estrato >= 4 ? 19 : 0,
          dias_facturados: periodo.dias_facturados,
          servicio_cliente_id: servicio.id,
          estrato_cliente: cliente.estrato,
          descripcion_iva: cliente.estrato >= 4 ? 
            `Internet - IVA 19% (Estrato ${cliente.estrato})` : 
            `Internet - Sin IVA (Estrato ${cliente.estrato})`
        });
      }
      
      // Concepto TV del combo
      if (precioTV > 0) {
        conceptos.push({
          tipo: 'television',
          concepto: `${servicio.nombre_plan} (TV) - ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
          cantidad: 1,
          precio_unitario: precioTV,
          valor: precioTV,
          aplica_iva: true,
          porcentaje_iva: 19,
          dias_facturados: periodo.dias_facturados,
          servicio_cliente_id: servicio.id,
          estrato_cliente: cliente.estrato,
          descripcion_iva: 'Televisión - IVA 19% (Todos los estratos)'
        });
      }
      
      return conceptos; // Retorna array para combos
    } else {
      // Otros servicios: Con IVA por defecto
      aplicaIVA = true;
      porcentajeIVA = 19;
      descripcionIVA = `${servicio.tipo || 'Servicio'} - IVA 19%`;
    }

    console.log(`💰 IVA calculado: ${aplicaIVA ? `${porcentajeIVA}%` : 'Sin IVA'} - ${descripcionIVA}`);

    // 4. Retornar concepto calculado
    return {
      tipo: servicio.tipo || servicio.tipo_plan || 'servicio',
      concepto: `${servicio.nombre_plan} - ${periodo.fecha_desde} al ${periodo.fecha_hasta}`,
      cantidad: 1,
      precio_unitario: valorServicio,
      valor: valorServicio,
      aplica_iva: aplicaIVA,
      porcentaje_iva: porcentajeIVA,
      dias_facturados: periodo.dias_facturados,
      servicio_cliente_id: servicio.id,
      estrato_cliente: cliente.estrato,
      descripcion_iva: descripcionIVA,
      plan_id: servicio.plan_id,
      conceptos_incluidos: servicio.conceptos_incluidos ? JSON.parse(servicio.conceptos_incluidos) : null
    };

  } catch (error) {
    console.error(`❌ Error calculando concepto de servicio:`, error);
    return null;
  }
}

// ============================================
// OTROS MÉTODOS FALTANTES QUE TAMBIÉN NECESITAS
// ============================================

/**
 * Obtener saldo anterior del cliente
 * MÉTODO FALTANTE - AGREGAR TAMBIÉN
 */
static async obtenerSaldoAnterior(clienteId) {
  try {
    const [resultado] = await Database.query(`
      SELECT COALESCE(SUM(total - COALESCE(pagado, 0)), 0) as saldo
      FROM facturas 
      WHERE cliente_id = ? 
        AND estado IN ('pendiente', 'vencida') 
        AND activo = 1
    `, [clienteId]);

    return parseFloat(resultado[0]?.saldo) || 0;
  } catch (error) {
    console.error('❌ Error obteniendo saldo anterior:', error);
    return 0;
  }
}

/**
 * Calcular reconexión si aplica
 * MÉTODO FALTANTE - AGREGAR TAMBIÉN
 */
static async calcularReconexion(clienteId) {
  try {
    const conexion = await Database.conexion();
    
    try {
      // Verificar si hay cortes recientes que requieren reconexión
      const [cortesRecientes] = await conexion.execute(`
        SELECT 
          cs.id,
          cs.fecha_corte,
          cs.motivo,
          DATEDIFF(CURDATE(), cs.fecha_corte) as dias_corte
        FROM cortes_servicio cs
        WHERE cs.cliente_id = ?
          AND cs.estado = 'activo'
          AND cs.fecha_reconexion IS NULL
          AND DATEDIFF(CURDATE(), cs.fecha_corte) <= 5
        ORDER BY cs.fecha_corte DESC
        LIMIT 1
      `, [clienteId]);

      if (cortesRecientes.length > 0) {
        // Obtener valor de reconexión de configuración
        const [config] = await conexion.execute(`
          SELECT valor_reconexion
          FROM configuracion_empresa
          WHERE id = 1
        `);

        const valorReconexion = parseFloat(config[0]?.valor_reconexion || 25000);

        return {
          tipo: 'reconexion',
          concepto: `Reconexión de servicio - Corte ${cortesRecientes[0].fecha_corte}`,
          cantidad: 1,
          precio_unitario: valorReconexion,
          valor: valorReconexion,
          aplica_iva: true,
          porcentaje_iva: 19,
          corte_id: cortesRecientes[0].id,
          descripcion_iva: 'Reconexión - IVA 19%'
        };
      }

      return { valor: 0 };

    } finally {
      conexion.release();
    }

  } catch (error) {
    console.error('❌ Error calculando reconexión:', error);
    return { valor: 0 };
  }
}

/**
 * Generar número de factura consecutivo
 * MÉTODO FALTANTE - AGREGAR TAMBIÉN
 */
static async generarNumeroFactura() {
  try {
    const [config] = await Database.query(`
      SELECT consecutivo_factura, prefijo_factura 
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    const consecutivo = config[0]?.consecutivo_factura || 1;
    const prefijo = config[0]?.prefijo_factura || 'FAC';

    return `${prefijo}${String(consecutivo).padStart(6, '0')}`;
  } catch (error) {
    console.error('❌ Error generando número de factura:', error);
    return `FAC${String(Date.now()).slice(-6)}`;
  }
}

/**
 * Actualizar consecutivos de facturación
 * MÉTODO FALTANTE - AGREGAR TAMBIÉN
 */
static async actualizarConsecutivos() {
  try {
    await Database.query(`
      UPDATE configuracion_empresa 
      SET consecutivo_factura = consecutivo_factura + 1,
          updated_at = NOW()
      WHERE id = 1
    `);
  } catch (error) {
    console.error('❌ Error actualizando consecutivos:', error);
  }
}

/**
 * Calcular totales de la factura
 * MÉTODO FALTANTE - AGREGAR TAMBIÉN  
 */
static calcularTotalesFactura(conceptos) {
  let internet = 0, television = 0, varios = 0, interes = 0;
  let reconexion = 0, descuento = 0, saldoAnterior = 0;
  let subtotal = 0, totalIVA = 0;

  conceptos.forEach(concepto => {
    const valor = parseFloat(concepto.valor || 0);
    const iva = concepto.aplica_iva ? valor * (concepto.porcentaje_iva / 100) : 0;

    // Categorizar por tipo
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
}


module.exports = FacturacionAutomaticaService;