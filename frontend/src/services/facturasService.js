// frontend/src/services/facturasService.js - CON UTILIDADES AGREGADAS

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
      const response = await apiService.get(`${API_BASE}/facturas`, params);
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
      const response = await apiService.get(`${API_BASE}/facturas/${id}`);
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
      const response = await apiService.post(`${API_BASE}/facturas`, facturaData);
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
      const response = await apiService.put(`${API_BASE}/facturas/${id}`, facturaData);
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
      const response = await apiService.delete(`${API_BASE}/facturas/${id}`);
      return response;
    } catch (error) {
      console.error('Error eliminando factura:', error);
      throw error;
    }
  },

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  /**
   * Obtener estadísticas de facturación
   */
  async getEstadisticas(params = {}) {
    try {
      const queryParams = {
        fecha_desde: params.fecha_desde,
        fecha_hasta: params.fecha_hasta
      };

      if (!queryParams.fecha_desde || !queryParams.fecha_hasta) {
        const hoy = new Date();
        const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        queryParams.fecha_desde = primerDia.toISOString().split('T')[0];
        queryParams.fecha_hasta = hoy.toISOString().split('T')[0];
      }

      console.log('📊 Enviando parámetros de estadísticas:', queryParams);

      const response = await apiService.get(`${API_BASE}/estadisticas`, queryParams);
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
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
      const response = await apiService.post(`${API_BASE}/automatica/generar-mensual`, params);
      return response;
    } catch (error) {
      console.error('Error generando facturación mensual:', error);
      throw error;
    }
  },

  /**
   * Obtener preview de facturación mensual
   */
  async getPreviewFacturacionMensual(params = {}) {
    try {
      const queryParams = {
        periodo: params.periodo || new Date().toISOString().slice(0, 7) // YYYY-MM
      };

      console.log('👁️ Enviando parámetros de preview:', queryParams);

      const response = await apiService.get(`${API_BASE}/automatica/preview-mensual`, queryParams);
      return response;
    } catch (error) {
      console.error('Error obteniendo preview:', error);
      throw error;
    }
  },

  /**
   * Generar factura individual para un cliente
   */
  async generarFacturaIndividual(clienteId, params = {}) {
    try {
      const response = await apiService.post(`${API_BASE}/automatica/cliente/${clienteId}`, params);
      return response;
    } catch (error) {
      console.error('Error generando factura individual:', error);
      throw error;
    }
  },

  /**
   * Procesar saldos e intereses
   */
  async procesarSaldosIntereses() {
    try {
      const response = await apiService.post(`${API_BASE}/automatica/procesar-saldos`);
      return response;
    } catch (error) {
      console.error('Error procesando saldos:', error);
      throw error;
    }
  },

  // ==========================================
  // PAGOS
  // ==========================================

  /**
   * Registrar pago de factura
   */
  async registrarPago(facturaId, pagoData) {
    try {
      const response = await apiService.post(`${API_BASE}/facturas/${facturaId}/pagar`, pagoData);
      return response;
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  },

  // ==========================================
  // REPORTES
  // ==========================================

  /**
   * Obtener facturas vencidas
   */
  async getFacturasVencidas(params = {}) {
    try {
      const response = await apiService.get(`${API_BASE}/vencidas`, params);
      return response;
    } catch (error) {
      console.error('Error obteniendo facturas vencidas:', error);
      throw error;
    }
  },

  /**
   * Buscar facturas
   */
  async buscarFacturas(criterios) {
    try {
      const response = await apiService.get(`${API_BASE}/facturas/search`, criterios);
      return response;
    } catch (error) {
      console.error('Error buscando facturas:', error);
      throw error;
    }
  },

  // ==========================================
  // MÉTODOS ADICIONALES
  // ==========================================

  /**
   * Obtener información del módulo
   */
  async getInfo() {
    try {
      const response = await apiService.get(`${API_BASE}/info`);
      return response;
    } catch (error) {
      console.error('Error obteniendo información:', error);
      throw error;
    }
  },

  // ==========================================
  // FUNCIONES UTILITARIAS - AGREGADAS
  // ==========================================

  /**
   * Formatear moneda en pesos colombianos
   * @param {number} valor - El valor a formatear
   * @returns {string} Valor formateado como moneda
   */
  formatearMoneda: (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$0';
    }
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(valor));
  },

  /**
   * Formatear números con separadores de miles
   * @param {number} numero - El número a formatear
   * @returns {string} Número formateado
   */
  formatearNumero: (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return '0';
    }
    
    return new Intl.NumberFormat('es-CO').format(Number(numero));
  },

  /**
   * Formatear fecha en formato local colombiano
   * @param {string|Date} fecha - La fecha a formatear
   * @returns {string} Fecha formateada
   */
  formatearFecha: (fecha) => {
    if (!fecha) return 'N/A';
    
    try {
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return fechaObj.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  },

  /**
   * Formatear fecha con hora
   * @param {string|Date} fecha - La fecha a formatear
   * @returns {string} Fecha y hora formateada
   */
  formatearFechaHora: (fecha) => {
    if (!fecha) return 'N/A';
    
    try {
      const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return fechaObj.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formateando fecha y hora:', error);
      return 'Fecha inválida';
    }
  },

  /**
   * Calcular porcentaje
   * @param {number} parte - La parte del total
   * @param {number} total - El total
   * @returns {string} Porcentaje formateado
   */
  calcularPorcentaje: (parte, total) => {
    if (!total || total === 0) return '0.0';
    
    const porcentaje = (parte / total) * 100;
    return porcentaje.toFixed(1);
  },

  /**
   * Obtener el color CSS para un estado de factura
   * @param {string} estado - El estado de la factura
   * @returns {string} Clases CSS para el estado
   */
  obtenerColorEstado: (estado) => {
    const colores = {
      'pagada': 'bg-green-100 text-green-800 border-green-200',
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      'vencida': 'bg-red-100 text-red-800 border-red-200',
      'anulada': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colores[estado?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  },

  /**
   * Validar número de factura
   * @param {string} numero - El número a validar
   * @returns {boolean} True si es válido
   */
  validarNumeroFactura: (numero) => {
    if (!numero || typeof numero !== 'string') return false;
    
    // Formato: FAC000001 o similar
    const regex = /^[A-Z]{2,4}\d{4,8}$/;
    return regex.test(numero.toUpperCase());
  },

  /**
   * Generar número de factura automático
   * @param {number} consecutivo - El número consecutivo
   * @returns {string} Número de factura formateado
   */
  generarNumeroFactura: (consecutivo) => {
    const numero = consecutivo || 1;
    return `FAC${numero.toString().padStart(6, '0')}`;
  },

  /**
   * Calcular días de vencimiento
   * @param {string|Date} fechaVencimiento - Fecha de vencimiento
   * @returns {number} Días vencidos (negativo si no está vencida)
   */
  calcularDiasVencimiento: (fechaVencimiento) => {
    if (!fechaVencimiento) return 0;
    
    try {
      const hoy = new Date();
      const vencimiento = new Date(fechaVencimiento);
      const diferencia = hoy.getTime() - vencimiento.getTime();
      return Math.floor(diferencia / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculando días de vencimiento:', error);
      return 0;
    }
  },

  /**
   * Obtener texto descriptivo del estado
   * @param {string} estado - Estado de la factura
   * @returns {string} Descripción del estado
   */
  obtenerDescripcionEstado: (estado) => {
    const descripciones = {
      'pagada': 'Pagada',
      'pendiente': 'Pendiente de pago',
      'vencida': 'Vencida',
      'anulada': 'Anulada'
    };
    return descripciones[estado?.toLowerCase()] || estado || 'Estado desconocido';
  }
};

// Exportar también como default para compatibilidad
export default facturasService;