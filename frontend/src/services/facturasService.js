// frontend/src/services/facturasService.js
// Servicio para manejar las APIs de facturación automática - CORREGIDO

import apiServiceDefault from './apiService';

import React from 'react';
const API_BASE = '/facturacion';

export const facturasService = {
  
  // ==========================================
  // FACTURACIÓN AUTOMÁTICA
  // ==========================================

  /**
   * Generar facturación mensual masiva
   */
  async generarFacturacionMensual(params = {}) {
    try {
      const response = await apiServiceDefault.post(`${API_BASE}/generar-mensual`, params);
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
      const response = await apiServiceDefault.post(`${API_BASE}/cliente/${clienteId}`, params);
      return response;
    } catch (error) {
      console.error('Error generando factura individual:', error);
      throw error;
    }
  },

  /**
   * Obtener preview de facturación para un cliente
   */
  async getPreviewCliente(clienteId) {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/preview/${clienteId}`);
      return response;
    } catch (error) {
      console.error('Error obteniendo preview:', error);
      throw error;
    }
  },

  /**
   * Validar integridad de datos para facturación
   */
  async validarIntegridadDatos(clienteId = null) {
    try {
      const params = clienteId ? { cliente_id: clienteId } : {};
      const response = await apiServiceDefault.get(`${API_BASE}/validar-datos`, { params });
      return response;
    } catch (error) {
      console.error('Error validando datos:', error);
      throw error;
    }
  },

  /**
   * Regenerar una factura específica
   */
  async regenerarFactura(facturaId, motivo) {
    try {
      const response = await apiServiceDefault.post(`${API_BASE}/regenerar/${facturaId}`, { motivo });
      return response;
    } catch (error) {
      console.error('Error regenerando factura:', error);
      throw error;
    }
  },

  // ==========================================
  // CONSULTA DE FACTURAS
  // ==========================================

  /**
   * Obtener lista de facturas con filtros y paginación
   */
  async getAll(params = {}) {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/facturas`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo facturas:', error);
      throw error;
    }
  },

  /**
   * Obtener una factura específica por ID
   */
  async getById(id) {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/facturas/${id}`);
      return response;
    } catch (error) {
      console.error('Error obteniendo factura:', error);
      throw error;
    }
  },

  /**
   * Registrar pago de una factura
   */
  async registrarPago(facturaId, pagoData) {
    try {
      const response = await apiServiceDefault.post(`${API_BASE}/facturas/${facturaId}/pagar`, pagoData);
      return response;
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  },

  /**
   * Anular una factura
   */
  async anularFactura(facturaId, motivo) {
    try {
      const response = await apiServiceDefault.put(`${API_BASE}/facturas/${facturaId}/anular`, { 
        motivo_anulacion: motivo 
      });
      return response;
    } catch (error) {
      console.error('Error anulando factura:', error);
      throw error;
    }
  },

  // ==========================================
  // REPORTES Y ESTADÍSTICAS
  // ==========================================

  /**
   * Obtener estadísticas de facturación
   */
  async getEstadisticas(params = {}) {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/estadisticas`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * Obtener resumen ejecutivo de facturación
   */
  async getResumenEjecutivo(periodo = null) {
    try {
      const params = periodo ? { periodo } : {};
      const response = await apiServiceDefault.get(`${API_BASE}/reportes/resumen`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo resumen:', error);
      throw error;
    }
  },

  /**
   * Obtener reporte de cartera vencida
   */
  async getCarteraVencida(params = {}) {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/reportes/cartera`, { params });
      return response;
    } catch (error) {
      console.error('Error obteniendo cartera vencida:', error);
      throw error;
    }
  },

  // ==========================================
  // ARCHIVOS Y DOCUMENTOS
  // ==========================================

  /**
   * Generar y descargar PDF de factura
   */
  async descargarPDF(facturaId) {
    try {
      const response = await apiServiceDefault.getBlob(`${API_BASE}/facturas/${facturaId}/pdf`);
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Factura_${facturaId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error descargando PDF:', error);
      throw error;
    }
  },

  /**
   * Ver PDF de factura en nueva ventana
   */
  verPDF(facturaId) {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const url = `${baseURL}/api/v1${API_BASE}/facturas/${facturaId}/ver-pdf`;
    window.open(url, '_blank');
  },

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Verificar estado de salud del sistema de facturación
   */
  async checkHealth() {
    try {
      const response = await apiServiceDefault.get(`${API_BASE}/health`);
      return response;
    } catch (error) {
      console.error('Error verificando salud del sistema:', error);
      throw error;
    }
  },

  /**
   * Obtener configuración de facturación
   */
  async getConfiguracion() {
    try {
      const response = await apiServiceDefault.get('/config/company');
      return response;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      throw error;
    }
  },

  /**
   * Formatear número de factura para mostrar
   */
  formatearNumeroFactura(numero) {
    if (!numero) return '';
    return numero.toString().toUpperCase();
  },

  /**
   * Formatear estado de factura para mostrar
   */
  formatearEstadoFactura(estado) {
    const estados = {
      'pendiente': { texto: 'Pendiente', color: 'yellow' },
      'pagada': { texto: 'Pagada', color: 'green' },
      'vencida': { texto: 'Vencida', color: 'red' },
      'anulada': { texto: 'Anulada', color: 'gray' }
    };
    return estados[estado] || { texto: estado, color: 'gray' };
  },

  /**
   * Calcular días de vencimiento
   */
  calcularDiasVencimiento(fechaVencimiento) {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diffTime = hoy.getTime() - vencimiento.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  },

  /**
   * Validar datos de pago
   */
  validarDatosPago(datosPago) {
    const errores = [];

    if (!datosPago.valor_pagado || datosPago.valor_pagado <= 0) {
      errores.push('El valor pagado debe ser mayor a cero');
    }

    if (!datosPago.metodo_pago) {
      errores.push('El método de pago es requerido');
    }

    if (datosPago.metodo_pago === 'transferencia' && !datosPago.referencia_pago) {
      errores.push('La referencia de pago es requerida para transferencias');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  },

  /**
   * Exportar facturas a Excel
   */
  async exportarExcel(filtros = {}) {
    try {
      const response = await apiServiceDefault.getBlob(`${API_BASE}/facturas/export/excel`, { params: filtros });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      throw error;
    }
  }
};

// ==========================================
// HOOKS PERSONALIZADOS PARA FACTURAS
// ==========================================


export const useFacturas = () => {
  const [facturas, setFacturas] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const cargarFacturas = async (filtros = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await facturasService.getAll({
        ...filtros,
        page: pagination.page,
        limit: pagination.limit
      });
      setFacturas(response.data.facturas);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    facturas,
    loading,
    error,
    pagination,
    setPagination,
    cargarFacturas
  };
};

export const useEstadisticasFacturacion = () => {
  const [estadisticas, setEstadisticas] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const cargarEstadisticas = async (periodo = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await facturasService.getEstadisticas(
        periodo ? { periodo } : {}
      );
      setEstadisticas(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    estadisticas,
    loading,
    error,
    cargarEstadisticas
  };
};

export default facturasService;