// frontend/src/services/facturasService.js - COMPLETO

import apiService from './apiService';

const API_BASE = '/facturacion';

export const facturasService = {
  
  // ==========================================
  // CRUD BÁSICO DE FACTURAS
  // ==========================================

  /**
   * Obtener todas las facturas con filtros y paginación
   */
  async getFacturas(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo facturas:', error);
      throw error;
    }
  },

  /**
   * Obtener una factura por ID
   */
  async getFactura(id) {
    try {
      const response = await apiService.get(`${API_BASE}/${id}`);
      return response;
    } catch (error) {
      console.error('Error obteniendo factura:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva factura
   */
  async createFactura(facturaData) {
    try {
      const response = await apiService.post(`${API_BASE}`, facturaData);
      return response;
    } catch (error) {
      console.error('Error creando factura:', error);
      throw error;
    }
  },

  /**
   * Actualizar una factura
   */
  async updateFactura(id, facturaData) {
    try {
      const response = await apiService.put(`${API_BASE}/${id}`, facturaData);
      return response;
    } catch (error) {
      console.error('Error actualizando factura:', error);
      throw error;
    }
  },

  /**
   * Eliminar una factura
   */
  async deleteFactura(id) {
    try {
      const response = await apiService.delete(`${API_BASE}/${id}`);
      return response;
    } catch (error) {
      console.error('Error eliminando factura:', error);
      throw error;
    }
  },

  // ==========================================
  // FACTURACIÓN AUTOMÁTICA
  // ==========================================

  /**
   * Generar facturación mensual masiva
   */
  async generarFacturacionMensual(params = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/facturacion/generar-mensual`, params);
      return response;
    } catch (error) {
      console.error('Error generando facturación mensual:', error);
      throw error;
    }
  },

  /**
   * Generar factura individual para un cliente
   */
  async generarFacturaIndividual(clienteId, params = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/facturacion/cliente/${clienteId}`, params);
      return response;
    } catch (error) {
      console.error('Error generando factura individual:', error);
      throw error;
    }
  },

  /**
   * Obtener preview de facturación para un cliente específico
   */
  async getPreviewCliente(clienteId) {
    try {
      const response = await apiService.get(`${API_BASE}/facturacion/preview/${clienteId}`);
      return response;
    } catch (error) {
      console.error('Error obteniendo preview de cliente:', error);
      throw error;
    }
  },

  /**
   * Obtener preview de facturación mensual general
   */
  async getPreviewFacturacion(params = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/facturacion/preview`, params);
      return response;
    } catch (error) {
      console.error('Error obteniendo preview de facturación:', error);
      throw error;
    }
  },

  /**
   * Validar integridad de datos para facturación
   */
  async validarIntegridadDatos(clienteId = null) {
    try {
      const params = clienteId ? { cliente_id: clienteId } : {};
      const response = await apiService.post(`${API_BASE}/facturacion/validar-integridad`, params);
      return response;
    } catch (error) {
      console.error('Error validando integridad:', error);
      throw error;
    }
  },

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================

  /**
   * Obtener estadísticas de facturación
   */
  async getEstadisticas(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/estadisticas`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * Obtener resumen de facturación por período
   */
  async getResumenPeriodo(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/resumen-periodo`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo resumen por período:', error);
      throw error;
    }
  },

  /**
   * Obtener facturas vencidas
   */
  async getFacturasVencidas(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/vencidas`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo facturas vencidas:', error);
      throw error;
    }
  },

  // ==========================================
  // PAGOS Y GESTIÓN DE ESTADO
  // ==========================================

  /**
   * Registrar pago de factura
   */
  async registrarPago(facturaId, pagoData) {
    try {
      const response = await apiService.post(`${API_BASE}/${facturaId}/pagos`, pagoData);
      return response;
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  },

  /**
   * Obtener historial de pagos de una factura
   */
  async getPagosFactura(facturaId) {
    try {
      const response = await apiService.get(`${API_BASE}/${facturaId}/pagos`);
      return response;
    } catch (error) {
      console.error('Error obteniendo pagos de factura:', error);
      throw error;
    }
  },

  /**
   * Anular factura
   */
  async anularFactura(facturaId, motivo) {
    try {
      const response = await apiService.post(`${API_BASE}/${facturaId}/anular`, { motivo });
      return response;
    } catch (error) {
      console.error('Error anulando factura:', error);
      throw error;
    }
  },

  /**
   * Cambiar estado de factura
   */
  async cambiarEstado(facturaId, nuevoEstado, observaciones = '') {
    try {
      const response = await apiService.put(`${API_BASE}/${facturaId}/estado`, {
        estado: nuevoEstado,
        observaciones
      });
      return response;
    } catch (error) {
      console.error('Error cambiando estado de factura:', error);
      throw error;
    }
  },

  // ==========================================
  // IMPORTACIÓN Y EXPORTACIÓN
  // ==========================================

  /**
   * Exportar facturas a Excel
   */
  async exportarFacturas(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/exportar`, {
        params,
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exportando facturas:', error);
      throw error;
    }
  },

  /**
   * Generar PDF de factura
   */
  async generarPDF(facturaId) {
    try {
      const response = await apiService.get(`${API_BASE}/${facturaId}/pdf`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  },

  /**
   * Enviar factura por email
   */
  async enviarEmail(facturaId, emailData = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/${facturaId}/enviar-email`, emailData);
      return response;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  },

  // ==========================================
  // CONFIGURACIÓN Y PARÁMETROS
  // ==========================================

  /**
   * Obtener configuración de facturación
   */
  async getConfiguracion() {
    try {
      const response = await apiService.get(`${API_BASE}/configuracion`);
      return response;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      throw error;
    }
  },

  /**
   * Actualizar configuración de facturación
   */
  async updateConfiguracion(configData) {
    try {
      const response = await apiService.put(`${API_BASE}/configuracion`, configData);
      return response;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      throw error;
    }
  },

  /**
   * Obtener próximo número de factura
   */
  async getProximoNumero() {
    try {
      const response = await apiService.get(`${API_BASE}/proximo-numero`);
      return response;
    } catch (error) {
      console.error('Error obteniendo próximo número:', error);
      throw error;
    }
  },

  // ==========================================
  // UTILIDADES Y VALIDACIONES
  // ==========================================

  /**
   * Validar datos de factura antes de crear
   */
  async validarFactura(facturaData) {
    try {
      const response = await apiService.post(`${API_BASE}/validar`, facturaData);
      return response;
    } catch (error) {
      console.error('Error validando factura:', error);
      throw error;
    }
  },

  /**
   * Recalcular totales de factura
   */
  async recalcularTotales(facturaData) {
    try {
      const response = await apiService.post(`${API_BASE}/recalcular-totales`, facturaData);
      return response;
    } catch (error) {
      console.error('Error recalculando totales:', error);
      throw error;
    }
  },

  /**
   * Buscar facturas por múltiples criterios
   */
  async buscarFacturas(criterios) {
    try {
      const response = await apiService.post(`${API_BASE}/buscar`, criterios);
      return response;
    } catch (error) {
      console.error('Error buscando facturas:', error);
      throw error;
    }
  },

  // ==========================================
  // GESTIÓN DE CORTES Y RECONEXIONES
  // ==========================================

  /**
   * Obtener facturas pendientes para corte
   */
  async getFacturasPendientesCorte(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/pendientes-corte`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo facturas pendientes de corte:', error);
      throw error;
    }
  },

  /**
   * Generar orden de corte masiva
   */
  async generarOrdenCorteMasiva(facturaIds, params = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/generar-corte-masivo`, {
        factura_ids: facturaIds,
        ...params
      });
      return response;
    } catch (error) {
      console.error('Error generando orden de corte masiva:', error);
      throw error;
    }
  },

  // ==========================================
  // REPORTES ESPECIALIZADOS
  // ==========================================

  /**
   * Reporte de cartera por edades
   */
  async getReporteCarteraEdades(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/reportes/cartera-edades`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo reporte de cartera por edades:', error);
      throw error;
    }
  },

  /**
   * Reporte de facturación por período
   */
  async getReporteFacturacionPeriodo(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/reportes/facturacion-periodo`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo reporte de facturación por período:', error);
      throw error;
    }
  },

  /**
   * Reporte de eficiencia de cobranza
   */
  async getReporteEficienciaCobranza(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/reportes/eficiencia-cobranza`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo reporte de eficiencia de cobranza:', error);
      throw error;
    }
  }
};

export default facturasService;