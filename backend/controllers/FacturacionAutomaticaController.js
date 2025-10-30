// backend/controllers/FacturacionAutomaticaController.js
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

// backend/controllers/FacturacionAutomaticaController.js



class FacturacionAutomaticaController {
  
  /**
   * Generar facturación mensual masiva
   */
  async generarFacturacionMensual(req, res) {
    try {
      console.log('🏗️ Iniciando generación de facturación mensual...');
      console.log('📋 Parámetros recibidos:', req.body);
      
      const resultado = await FacturacionAutomaticaService.generarFacturacionMensual(req.body);
      
      console.log('✅ Resultado del servicio:', resultado);
      
      // ✅ CORRECCIÓN: Asegurar que detalles sea un array
      const respuesta = {
        ...resultado,
        detalles: Array.isArray(resultado.detalles) ? resultado.detalles : [],
        success: true
      };

      console.log('✅ Respuesta final:', respuesta);
      
      res.json({
        success: true,
        data: respuesta
      });
      
    } catch (error) {
      console.error('❌ Error en controller de facturación:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando facturación',
        data: {
          detalles: [], // ✅ Asegurar array vacío en error
          clientes_procesados: 0,
          facturas_generadas: 0,
          errores: 1
        }
      });
    }
  }

  /**
   * Obtener preview de facturación mensual
   */
  async obtenerPreviewFacturacion(req, res) {
    try {
      const { periodo } = req.query;
      
      if (!periodo) {
        return res.status(400).json({
          success: false,
          message: 'El periodo es requerido (formato: YYYY-MM)'
        });
      }

      const preview = await FacturacionAutomaticaService.obtenerPreviewFacturacionMensual(periodo);
      
      res.json({
        success: true,
        data: preview
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo preview:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo preview'
      });
    }
  }

  /**
   * Generar factura individual
   */
  async generarFacturaIndividual(req, res) {
    try {
      const { clienteId } = req.params;
      
      const resultado = await FacturacionAutomaticaService.regenerarFacturaCliente(clienteId);
      
      res.json({
        success: true,
        data: resultado
      });
      
    } catch (error) {
      console.error('❌ Error generando factura individual:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando factura'
      });
    }
  }

  /**
   * Procesar saldos e intereses
   */
  async procesarSaldosIntereses(req, res) {
    try {
      // Implementar lógica de procesamiento de saldos
      res.json({
        success: true,
        message: 'Procesamiento de saldos completado'
      });
    } catch (error) {
      console.error('❌ Error procesando saldos:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtener estadísticas del último proceso
   */
  async obtenerEstadisticasUltimoProceso(req, res) {
    try {
      // Implementar lógica de estadísticas
      res.json({
        success: true,
        data: {
          ultimo_proceso: null,
          estadisticas: {}
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FacturacionAutomaticaController();