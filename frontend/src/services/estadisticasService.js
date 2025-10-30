// frontend/src/services/estadisticasService.js
// SERVICIO PARA CONSUMIR API DE ESTADÍSTICAS

import apiService from './apiService';

const ESTADISTICAS_ENDPOINTS = {
  DASHBOARD: '/estadisticas/dashboard',
  FINANCIERAS: '/estadisticas/financieras',
  CLIENTES: '/estadisticas/clientes',
  OPERACIONALES: '/estadisticas/operacionales',
  TOP_CLIENTES: '/estadisticas/top-clientes'
};

class EstadisticasService {
  constructor() {
    this.debug = process.env.NODE_ENV === 'development';
  }

  log(message, data) {
    if (this.debug) {
      console.log(`📊 EstadisticasService: ${message}`, data);
    }
  }

  /**
   * Obtener todas las estadísticas del dashboard
   * @param {Object} params - Parámetros de filtro { fecha_desde, fecha_hasta }
   * @returns {Promise<Object>}
   */
  async getDashboard(params = {}) {
    try {
      this.log('Obteniendo estadísticas del dashboard', params);

      const queryParams = new URLSearchParams();
      if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);

      const url = `${ESTADISTICAS_ENDPOINTS.DASHBOARD}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await apiService.get(url);

      this.log('Dashboard obtenido exitosamente', response);

      return {
        success: true,
        data: response.data || {},
        message: response.message || 'Estadísticas del dashboard obtenidas'
      };
    } catch (error) {
      this.log('Error obteniendo dashboard', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error obteniendo estadísticas del dashboard'
      };
    }
  }

  /**
   * Obtener estadísticas financieras
   * @param {Object} params - { fecha_desde, fecha_hasta }
   * @returns {Promise<Object>}
   */
  async getFinancieras(params = {}) {
    try {
      this.log('Obteniendo estadísticas financieras', params);

      const queryParams = new URLSearchParams();
      if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);

      const url = `${ESTADISTICAS_ENDPOINTS.FINANCIERAS}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await apiService.get(url);

      return {
        success: true,
        data: response.data || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas financieras', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error obteniendo estadísticas financieras'
      };
    }
  }

  /**
   * Obtener estadísticas de clientes
   * @returns {Promise<Object>}
   */
  async getClientes() {
    try {
      this.log('Obteniendo estadísticas de clientes');

      const response = await apiService.get(ESTADISTICAS_ENDPOINTS.CLIENTES);

      return {
        success: true,
        data: response.data || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas de clientes', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error obteniendo estadísticas de clientes'
      };
    }
  }

  /**
   * Obtener estadísticas operacionales
   * @returns {Promise<Object>}
   */
  async getOperacionales() {
    try {
      this.log('Obteniendo estadísticas operacionales');

      const response = await apiService.get(ESTADISTICAS_ENDPOINTS.OPERACIONALES);

      return {
        success: true,
        data: response.data || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas operacionales', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error obteniendo estadísticas operacionales'
      };
    }
  }

  /**
   * Obtener top clientes por facturación
   * @param {Object} params - { limit, periodo }
   * @returns {Promise<Object>}
   */
  async getTopClientes(params = {}) {
    try {
      this.log('Obteniendo top clientes', params);

      const queryParams = new URLSearchParams();
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.periodo) queryParams.append('periodo', params.periodo);

      const url = `${ESTADISTICAS_ENDPOINTS.TOP_CLIENTES}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await apiService.get(url);

      return {
        success: true,
        data: response.data || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo top clientes', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error obteniendo top clientes'
      };
    }
  }

  /**
   * Formatear moneda
   * @param {Number} valor
   * @returns {String}
   */
  formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  }

  /**
   * Formatear número
   * @param {Number} valor
   * @returns {String}
   */
  formatearNumero(valor) {
    return new Intl.NumberFormat('es-CO').format(valor || 0);
  }

  /**
   * Formatear porcentaje
   * @param {Number} valor
   * @returns {String}
   */
  formatearPorcentaje(valor) {
    return `${parseFloat(valor || 0).toFixed(2)}%`;
  }
}

// Exportar instancia única
const estadisticasService = new EstadisticasService();
export default estadisticasService;