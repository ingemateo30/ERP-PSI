// backend/controllers/FacturacionAutomaticaController.js
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

class FacturacionAutomaticaController {

  /**
   * Generar facturación mensual masiva
   * POST /api/v1/facturacion/automatica/generar-mensual
   */
  static async generarFacturacionMensual(req, res) {
    try {
      console.log('🚀 Iniciando facturación mensual automática desde controller...');
      console.log('📦 Parámetros recibidos:', req.body);

      const { fecha_referencia, solo_preview, clientes_especificos } = req.body;

      // Si es solo preview, no generar facturas
      if (solo_preview) {
        return FacturacionAutomaticaController.obtenerPreviewFacturacion(req, res);
      }

      // Validar fecha de referencia
      const fechaRef = fecha_referencia ? new Date(fecha_referencia) : new Date();
      
      if (isNaN(fechaRef.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de referencia inválida'
        });
      }

      // Ejecutar facturación automática
      const parametros = {
        periodo: `${fechaRef.getFullYear()}-${String(fechaRef.getMonth() + 1).padStart(2, '0')}`,
        clientes_especificos: clientes_especificos || null,
        usuario_id: req.user?.id || 1
      };

      console.log('⚙️ Ejecutando facturación con parámetros:', parametros);

      const resultado = await FacturacionAutomaticaService.generarFacturacionMensual(parametros);

      console.log('✅ Facturación completada:', resultado);

      res.json({
        success: true,
        data: resultado,
        message: `Facturación mensual completada: ${resultado.facturas_generadas} facturas generadas de ${resultado.clientes_procesados} clientes`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en facturación mensual:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando facturación mensual',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Obtener preview de facturación (sin generar facturas)
   * GET /api/v1/facturacion/automatica/preview-mensual
   */
  static async obtenerPreviewFacturacion(req, res) {
    try {
      console.log('👁️ Generando preview de facturación...');

      const { periodo } = req.query;
      const fechaPeriodo = periodo ? new Date(periodo + '-01') : new Date();

      // Obtener clientes activos para facturar
      const clientesActivos = await Database.query(`
        SELECT 
          c.id,
          c.identificacion,
          c.nombre,
          c.telefono,
          c.direccion,
          c.estrato,
          c.estado,
          COUNT(sc.id) as servicios_activos,
          COALESCE(SUM(
            COALESCE(sc.precio_personalizado, ps.precio)
          ), 0) as monto_estimado
        FROM clientes c
        LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.estado = 'activo'
        GROUP BY c.id, c.identificacion, c.nombre, c.telefono, c.direccion, c.estrato, c.estado
        HAVING servicios_activos > 0
        ORDER BY c.nombre ASC
      `);

      console.log(`✅ Encontrados ${clientesActivos.length} clientes con servicios activos`);

      // Calcular resumen
      const resumen = {
        total_clientes: clientesActivos.length,
        monto_total_estimado: clientesActivos.reduce((sum, c) => 
          sum + parseFloat(c.monto_estimado || 0), 0
        ),
        servicios_totales: clientesActivos.reduce((sum, c) => 
          sum + parseInt(c.servicios_activos || 0), 0
        ),
        promedio_por_cliente: clientesActivos.length > 0
          ? clientesActivos.reduce((sum, c) => sum + parseFloat(c.monto_estimado || 0), 0) / clientesActivos.length
          : 0
      };

      // Estadísticas adicionales
      const estratos = clientesActivos.reduce((acc, c) => {
        const estrato = c.estrato || 'sin_estrato';
        acc[estrato] = (acc[estrato] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          resumen,
          clientes: clientesActivos.slice(0, 20), // Primeros 20 para preview
          total_clientes_disponibles: clientesActivos.length,
          periodo: fechaPeriodo.toISOString().slice(0, 7),
          distribucion_estratos: estratos,
          info_sistema: {
            modo: 'preview',
            fecha_generacion: new Date().toISOString(),
            usuario: req.user?.username || 'sistema'
          },
          recomendaciones: clientesActivos.length === 0 ? {
            mensaje: 'No se encontraron clientes con servicios activos para facturar',
            acciones_sugeridas: [
              'Verificar que existan clientes en estado activo',
              'Asignar servicios activos a los clientes',
              'Revisar configuración de planes de servicio'
            ]
          } : {
            mensaje: `Sistema listo para facturar ${clientesActivos.length} clientes`,
            monto_total: `$${resumen.monto_total_estimado.toLocaleString('es-CO')}`,
            promedio: `$${Math.round(resumen.promedio_por_cliente).toLocaleString('es-CO')} por cliente`
          }
        },
        message: clientesActivos.length > 0
          ? `Preview generado: ${clientesActivos.length} clientes listos para facturación`
          : 'No se encontraron clientes para facturar'
      });

    } catch (error) {
      console.error('❌ Error obteniendo preview:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo preview de facturación',
        error: error.message
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

      // Verificar que el cliente existe y está activo
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

      // Generar factura usando el servicio
      const fechaInicio = fecha_inicio ? new Date(fecha_inicio) : new Date();
      const factura = await FacturacionAutomaticaService.crearFacturaInicialCliente(
        parseInt(clienteId),
        fechaInicio
      );

      console.log(`✅ Factura generada: ${factura.numero_factura}`);

      res.json({
        success: true,
        data: factura,
        message: `Factura ${factura.numero_factura} generada exitosamente para ${cliente.nombre}`,
        timestamp: new Date().toISOString()
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
   * Procesar saldos e intereses de facturas vencidas
   * POST /api/v1/facturacion/automatica/procesar-saldos
   */
  static async procesarSaldosIntereses(req, res) {
    try {
      console.log('💰 Procesando saldos e intereses...');

      await FacturacionAutomaticaService.procesarSaldosEIntereses();

      res.json({
        success: true,
        message: 'Saldos e intereses procesados exitosamente',
        timestamp: new Date().toISOString()
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
   * Obtener estadísticas del último proceso de facturación
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
        },
        message: 'Estadísticas del último proceso obtenidas'
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