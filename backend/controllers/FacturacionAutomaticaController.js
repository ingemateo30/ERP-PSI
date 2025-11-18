// backend/controllers/FacturacionAutomaticaController.js - CORREGIDO CON PREVIEW DETALLADO

const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

class FacturacionAutomaticaController {

  /**
   * Obtener preview DETALLADO de facturación (sin generar facturas)
   * GET /api/v1/facturacion/automatica/preview-mensual
   */
  static async obtenerPreviewFacturacion(req, res) {
    try {
      console.log('👁️ Generando preview DETALLADO de facturación...');

      const { periodo } = req.query;
      const fechaPeriodo = periodo ? new Date(periodo + '-01') : new Date();

      // 1. Obtener clientes para facturar
      const clientesParaFacturar = await FacturacionAutomaticaService.obtenerClientesParaFacturar(fechaPeriodo);

      console.log(`📊 Clientes encontrados: ${clientesParaFacturar.length}`);

      if (clientesParaFacturar.length === 0) {
        return res.json({
          success: true,
          data: {
            clientes_a_facturar: 0,
            monto_total_estimado: 0,
            servicios_totales: 0,
            detalles: [],
            resumen: {
              total_clientes: 0,
              monto_total_estimado: 0,
              servicios_totales: 0,
              por_tipo_factura: {
                primera: 0,
                segunda: 0,
                mensual: 0
              }
            }
          },
          message: 'No se encontraron clientes para facturar'
        });
      }

      // 2. Procesar cada cliente y obtener detalles completos
      const detallesClientes = [];
      let montoTotalEstimado = 0;
      let serviciosTotales = 0;
      
      const estadisticas = {
        primera: 0,
        segunda: 0,
        mensual: 0
      };

      for (const cliente of clientesParaFacturar) {
        try {
          // Validar cliente
          const validacion = await FacturacionAutomaticaService.validarClienteParaFacturacion(cliente.id);
          if (!validacion.permitir) {
            console.log(`⏭️ Cliente ${cliente.nombre} omitido: ${validacion.razon}`);
            continue;
          }

          // Calcular período
          const periodo = await FacturacionAutomaticaService.calcularPeriodoFacturacion(cliente.id, fechaPeriodo);

          // Obtener servicios
          const servicios = await FacturacionAutomaticaService.obtenerServiciosActivos(cliente.id);

          if (servicios.length === 0) {
            console.log(`⚠️ Cliente ${cliente.nombre} sin servicios activos`);
            continue;
          }

          // Calcular conceptos
          const conceptos = await FacturacionAutomaticaService.calcularConceptosFacturacion(cliente, servicios, periodo);

          // Calcular totales
          const totales = FacturacionAutomaticaService.calcularTotalesFactura(conceptos);

          // ✅ CORREGIDO: Contar facturas reales del cliente
          const conexion = await Database.getConnection();
          const [conteoFacturas] = await conexion.execute(`
            SELECT COUNT(*) as total 
            FROM facturas 
            WHERE cliente_id = ? AND activo = '1'
          `, [cliente.id]);
          conexion.release();

          const numFacturas = conteoFacturas[0]?.total || 0;
          const tipoFacturaReal = numFacturas === 0 ? 'primera' : 
                                 numFacturas === 1 ? 'segunda' : 'mensual';

          // Construir detalle del cliente
          const detalleCliente = {
            cliente_id: cliente.id,
            identificacion: cliente.identificacion,
            nombre: cliente.nombre,
            estrato: cliente.estrato,
            numero_factura: periodo.numero_factura,
            tipo_factura: tipoFacturaReal,
            tipo_factura_descripcion: `${numFacturas + 1}ra Factura`,
            tipo_factura_numero: numFacturas + 1,
            periodo_facturacion: {
              fecha_desde: periodo.fecha_desde,
              fecha_hasta: periodo.fecha_hasta,
              descripcion: periodo.periodo_descripcion,
              dias: periodo.dias_facturados
            },
            servicios: servicios.map(s => ({
              tipo: s.tipo_plan,
              nombre: s.nombre_plan,
              precio: s.precio_personalizado || s.precio_servicio,
              aplica_iva: Boolean(s.aplica_iva),
              porcentaje_iva: s.aplica_iva ? (s.porcentaje_iva || 19) : 0
            })),
            conceptos: conceptos.map(c => ({
              tipo: c.tipo,
              concepto: c.concepto,
              valor: c.valor,
              aplica_iva: c.aplica_iva,
              porcentaje_iva: c.porcentaje_iva || 0,
              iva: c.aplica_iva ? Math.round(c.valor * (c.porcentaje_iva / 100)) : 0
            })),
            totales: {
              internet: totales.internet,
              television: totales.television,
              varios: totales.varios,
              instalacion: conceptos.find(c => c.tipo === 'instalacion')?.valor || 0,
              subtotal: totales.subtotal,
              iva: totales.iva,
              total: totales.total
            }
          };

          detallesClientes.push(detalleCliente);
          montoTotalEstimado += totales.total;
          serviciosTotales += servicios.length;

          // ✅ CORREGIDO: Estadísticas por tipo usando el conteo real
          if (tipoFacturaReal === 'primera') estadisticas.primera++;
          else if (tipoFacturaReal === 'segunda') estadisticas.segunda++;
          else estadisticas.mensual++;

        } catch (error) {
          console.error(`❌ Error procesando cliente ${cliente.nombre}:`, error);
        }
      }

      // 3. Construir respuesta completa
      const respuesta = {
        success: true,
        data: {
          clientes_a_facturar: detallesClientes.length,
          monto_total_estimado: Math.round(montoTotalEstimado),
          servicios_totales: serviciosTotales,
          detalles: detallesClientes,
          resumen: {
            total_clientes: detallesClientes.length,
            monto_total_estimado: Math.round(montoTotalEstimado),
            servicios_totales: serviciosTotales,
            por_tipo_factura: estadisticas,
            promedio_por_cliente: detallesClientes.length > 0 ? 
              Math.round(montoTotalEstimado / detallesClientes.length) : 0
          }
        },
        message: `Preview generado: ${detallesClientes.length} clientes listos para facturación`
      };

      console.log('✅ Preview generado exitosamente:', {
        clientes: respuesta.data.clientes_a_facturar,
        monto: respuesta.data.monto_total_estimado
      });

      res.json(respuesta);

    } catch (error) {
      console.error('❌ Error obteniendo preview:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo preview de facturación',
        error: error.message,
        data: {
          clientes_a_facturar: 0,
          monto_total_estimado: 0,
          servicios_totales: 0,
          detalles: []
        }
      });
    }
  }

  /**
   * Generar facturación mensual masiva
   * POST /api/v1/facturacion/automatica/generar-mensual
   */
  static async generarFacturacionMensual(req, res) {
    try {
      console.log('🏗️ Iniciando generación de facturación mensual...');
      console.log('📋 Parámetros recibidos:', req.body);

      // Validar días de vencimiento si se proporciona
      if (req.body.diasVencimiento && (req.body.diasVencimiento < 1 || req.body.diasVencimiento > 365)) {
        return res.status(400).json({
          success: false,
          message: 'Los días de vencimiento deben estar entre 1 y 365'
        });
      }

      const resultado = await FacturacionAutomaticaService.generarFacturacionMensual(req.body);
      
      console.log('✅ Facturación completada');
      
      res.json({
        success: true,
        data: resultado,
        message: `Facturación completada: ${resultado.facturas_generadas} facturas generadas`
      });
      
    } catch (error) {
      console.error('❌ Error en facturación:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando facturación',
        data: {
          detalles: [],
          clientes_procesados: 0,
          facturas_generadas: 0,
          errores: 1
        }
      });
    }
  }

  /**
   * Generar factura individual para un cliente
   * POST /api/v1/facturacion/automatica/cliente/:clienteId
   */
  static async generarFacturaIndividual(req, res) {
    try {
      const { clienteId } = req.params;
      const { fecha_inicio } = req.body;

      console.log(`🧾 Generando factura individual para cliente ${clienteId}...`);

      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      // Verificar que el cliente existe
      const [cliente] = await Database.query(`
        SELECT id, nombre, estado FROM clientes WHERE id = ?
      `, [clienteId]);

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      if (cliente.estado !== 'activo') {
        return res.status(400).json({
          success: false,
          message: `Cliente en estado: ${cliente.estado}. Solo se pueden facturar clientes activos`
        });
      }

      // Generar factura
      const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
      const factura = await FacturacionAutomaticaService.crearFacturaInicialCliente(
        parseInt(clienteId),
        fechaInicio
      );

      console.log(`✅ Factura generada: ${factura.numero_factura}`);

      res.json({
        success: true,
        data: factura,
        message: `Factura ${factura.numero_factura} generada exitosamente`
      });

    } catch (error) {
      console.error('❌ Error generando factura individual:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando factura individual',
        error: error.message
      });
    }
  }

  /**
   * Procesar saldos e intereses
   * POST /api/v1/facturacion/automatica/procesar-saldos
   */
  static async procesarSaldosIntereses(req, res) {
    try {
      console.log('💰 Procesando saldos e intereses...');

      await FacturacionAutomaticaService.procesarSaldosEIntereses();

      res.json({
        success: true,
        message: 'Saldos e intereses procesados exitosamente'
      });

    } catch (error) {
      console.error('❌ Error procesando saldos:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando saldos e intereses',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas del último proceso
   * GET /api/v1/facturacion/automatica/estadisticas-ultimo-proceso
   */
  static async obtenerEstadisticasUltimoProceso(req, res) {
    try {
      const ultimoProceso = await Database.query(`
        SELECT * FROM logs_sistema 
        WHERE tipo = 'FACTURACION_MENSUAL_AUTOMATICA'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (ultimoProceso.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No se encontró ningún proceso de facturación previo'
        });
      }

      const datos = JSON.parse(ultimoProceso[0].datos_json);

      res.json({
        success: true,
        data: {
          fecha_proceso: ultimoProceso[0].created_at,
          ...datos
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.json({
        success: true,
        data: null,
        message: 'No hay registros de facturación previa'
      });
    }
  }
}

module.exports = FacturacionAutomaticaController;