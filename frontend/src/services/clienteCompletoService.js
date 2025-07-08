// frontend/src/services/clienteCompletoService.js
// Servicio para gestión completa de clientes con servicios

import apiService from './apiService';

const API_BASE = '/api/clientes-completo';

export const clienteCompletoService = {

  /**
   * ============================================
   * CREACIÓN COMPLETA DE CLIENTE
   * ============================================
   */

  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  async createClienteCompleto(datosCompletos) {
    try {
      console.log('🚀 Enviando datos para creación completa:', datosCompletos);
      
      // Validar datos antes de enviar
      this.validarDatosCliente(datosCompletos);
      
      const response = await apiService.post(`${API_BASE}/crear`, datosCompletos);
      
      console.log('✅ Cliente completo creado:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);
      throw error;
    }
  },

  /**
   * Validar datos del cliente antes de enviar
   */
  validarDatosCliente(datos) {
    const errores = [];

    // Validar datos del cliente
    if (!datos.cliente) {
      errores.push('Datos del cliente son requeridos');
    } else {
      if (!datos.cliente.identificacion) errores.push('Identificación es requerida');
      if (!datos.cliente.nombre) errores.push('Nombre es requerido');
      if (!datos.cliente.email) errores.push('Email es requerido');
      if (!datos.cliente.telefono) errores.push('Teléfono es requerido');
      if (!datos.cliente.direccion) errores.push('Dirección es requerida');
      if (!datos.cliente.ciudad_id) errores.push('Ciudad es requerida');
    }

    // Validar datos del servicio
    if (!datos.servicio) {
      errores.push('Datos del servicio son requeridos');
    } else {
      if (!datos.servicio.plan_id) errores.push('Plan de servicio es requerido');
      if (!datos.servicio.fecha_activacion) errores.push('Fecha de activación es requerida');
    }

    if (errores.length > 0) {
      throw new Error(`Errores de validación:\n${errores.join('\n')}`);
    }
  },

  /**
   * Previsualizar primera factura antes de crear cliente
   */
  async previsualizarPrimeraFactura(datosPreview) {
    try {
      console.log('👁️ Previsualizando factura:', datosPreview);
      
      const response = await apiService.post(`${API_BASE}/previsualizar-factura`, datosPreview);
      
      return response;
      
    } catch (error) {
      console.error('❌ Error en previsualización:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * GESTIÓN DE SERVICIOS
   * ============================================
   */

  /**
   * Obtener servicios de un cliente
   */
  async getClientServices(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      const response = await apiService.get(`${API_BASE}/${clienteId}/servicios`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo servicios del cliente:', error);
      throw error;
    }
  },

  /**
   * Cambiar plan de servicio de un cliente
   */
  async cambiarPlanCliente(clienteId, nuevosPlanData) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      if (!nuevosPlanData.plan_id) {
        throw new Error('ID del nuevo plan es requerido');
      }
      
      console.log(`🔄 Cambiando plan del cliente ${clienteId}:`, nuevosPlanData);
      
      const response = await apiService.put(`${API_BASE}/${clienteId}/cambiar-plan`, nuevosPlanData);
      
      console.log('✅ Plan cambiado exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      throw error;
    }
  },

  /**
   * Suspender servicio de un cliente
   */
  async suspenderServicio(clienteId, motivoSuspension = '') {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      console.log(`⏸️ Suspendiendo servicio del cliente ${clienteId}`);
      
      const response = await apiService.put(`${API_BASE}/${clienteId}/suspender`, {
        motivo: motivoSuspension,
        fecha_suspension: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Servicio suspendido exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error suspendiendo servicio:', error);
      throw error;
    }
  },

  /**
   * Reactivar servicio de un cliente
   */
  async reactivarServicio(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      console.log(`▶️ Reactivando servicio del cliente ${clienteId}`);
      
      const response = await apiService.put(`${API_BASE}/${clienteId}/reactivar`, {
        fecha_reactivacion: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Servicio reactivado exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error reactivando servicio:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * CONSULTAS AUXILIARES
   * ============================================
   */

  /**
   * Obtener planes disponibles para asignación
   */
  async getPlanesDisponibles() {
    try {
      const response = await apiService.get(`${API_BASE}/planes-disponibles`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo planes disponibles:', error);
      throw error;
    }
  },

  /**
   * Obtener historial de servicios de un cliente
   */
  async getHistorialServicios(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      const response = await apiService.get(`${API_BASE}/${clienteId}/historial-servicios`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo historial de servicios:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles completos de un cliente con sus servicios
   */
  async getClienteCompleto(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      const response = await apiService.get(`${API_BASE}/${clienteId}/completo`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo cliente completo:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * DOCUMENTOS Y FACTURACIÓN
   * ============================================
   */

  /**
   * Generar contrato para un cliente
   */
  async generarContrato(clienteId, tipoContrato = 'servicio') {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      console.log(`📄 Generando contrato para cliente ${clienteId}`);
      
      const response = await apiService.post(`${API_BASE}/${clienteId}/generar-contrato`, {
        tipo_contrato: tipoContrato,
        fecha_generacion: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Contrato generado exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error generando contrato:', error);
      throw error;
    }
  },

  /**
   * Generar orden de instalación
   */
  async generarOrdenInstalacion(clienteId, fechaInstalacion = null) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      console.log(`🔧 Generando orden de instalación para cliente ${clienteId}`);
      
      const response = await apiService.post(`${API_BASE}/${clienteId}/generar-orden-instalacion`, {
        fecha_instalacion: fechaInstalacion || new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Orden de instalación generada:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error generando orden de instalación:', error);
      throw error;
    }
  },

  /**
   * Generar factura inmediata para un cliente
   */
  async generarFacturaInmediata(clienteId, conceptosAdicionales = []) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      console.log(`🧾 Generando factura inmediata para cliente ${clienteId}`);
      
      const response = await apiService.post(`${API_BASE}/${clienteId}/generar-factura`, {
        conceptos_adicionales: conceptosAdicionales,
        fecha_facturacion: new Date().toISOString().split('T')[0]
      });
      
      console.log('✅ Factura generada exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error generando factura:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * UTILIDADES
   * ============================================
   */

  /**
   * Verificar disponibilidad de identificación
   */
  async verificarDisponibilidadIdentificacion(identificacion, tipoDocumento = 'cedula') {
    try {
      if (!identificacion) {
        throw new Error('Identificación es requerida');
      }
      
      const response = await apiService.get(`${API_BASE}/verificar-identificacion`, {
        params: {
          identificacion,
          tipo_documento: tipoDocumento
        }
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ Error verificando identificación:', error);
      throw error;
    }
  },

  /**
   * Calcular precio de plan con descuentos y promociones
   */
  async calcularPrecioPlan(planId, clienteData = {}) {
    try {
      if (!planId) {
        throw new Error('ID del plan es requerido');
      }
      
      const response = await apiService.post(`${API_BASE}/calcular-precio-plan`, {
        plan_id: planId,
        datos_cliente: clienteData
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ Error calculando precio del plan:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de cliente completo
   */
  async getEstadisticasCliente(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }
      
      const response = await apiService.get(`${API_BASE}/${clienteId}/estadisticas`);
      return response;
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del cliente:', error);
      throw error;
    }
  }
};

// Exportar como default también para compatibilidad
export default clienteCompletoService;