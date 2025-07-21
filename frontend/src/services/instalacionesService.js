// frontend/src/services/instalacionesService.js - VERSIÓN CORREGIDA COMPLETA

import apiService from './apiService';

const API_BASE = '/instalaciones';

export const instalacionesService = {
  
  // ==========================================
  // CRUD BÁSICO
  // ==========================================

  /**
   * Obtener todas las instalaciones con filtros y paginación
   */
 async getInstalaciones(params = {}) {
  try {
    console.log('📡 Obteniendo instalaciones con parámetros:', params);
    const response = await apiService.get(`${API_BASE}`, { params });
    
    console.log('📥 RESPUESTA COMPLETA DEL API:', response);
    console.log('📊 Tipo de response:', typeof response);
    console.log('📊 Keys de response:', Object.keys(response));
    
    if (response && response.success) {
      console.log('✅ Response exitoso');
      console.log('📋 response.data:', response.data);
      console.log('📋 Tipo de response.data:', typeof response.data);
      console.log('📋 Es array response.data?', Array.isArray(response.data));
      
      // El backend devuelve response.data, no response.instalaciones
      const instalacionesData = Array.isArray(response.data) ? response.data : [];
      
      console.log('📋 Instalaciones finales:', instalacionesData);
      
      return {
        success: true,
        instalaciones: instalacionesData,
        pagination: response.pagination || {},
        estadisticas: response.estadisticas || {}
      };
    } else {
      console.error('❌ Response no exitoso:', response);
      return {
        success: false,
        instalaciones: [],
        pagination: {},
        estadisticas: {},
        message: response.message || 'Error desconocido'
      };
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo instalaciones:', error);
    return {
      success: false,
      instalaciones: [],
      pagination: {},
      estadisticas: {},
      message: error.message || 'Error de conexión'
    };
  }
},

  /**
   * Obtener una instalación por ID (CORREGIDO)
   */
  async getInstalacion(id) {
    try {
      console.log('🔍 Obteniendo instalación ID:', id);
      const response = await apiService.get(`${API_BASE}/${id}`);
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data
        };
      }
      
      throw new Error(response.message || 'Error obteniendo instalación');
    } catch (error) {
      console.error('❌ Error obteniendo instalación:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva instalación
   */
  async createInstalacion(instalacionData) {
    try {
      console.log('➕ Creando instalación:', instalacionData);
      const response = await apiService.post(`${API_BASE}`, instalacionData);
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Instalación creada exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error creando instalación');
    } catch (error) {
      console.error('❌ Error creando instalación:', error);
      throw error;
    }
  },

  /**
   * Actualizar una instalación (CORREGIDO)
   */
  async updateInstalacion(id, instalacionData) {
    try {
      console.log('✏️ Actualizando instalación ID:', id, 'con datos:', instalacionData);
      const response = await apiService.put(`${API_BASE}/${id}`, instalacionData);
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Instalación actualizada exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error actualizando instalación');
    } catch (error) {
      console.error('❌ Error actualizando instalación:', error);
      throw error;
    }
  },

  /**
   * Eliminar una instalación (CORREGIDO)
   */
  async deleteInstalacion(id) {
    try {
      console.log('🗑️ Eliminando instalación ID:', id);
      const response = await apiService.delete(`${API_BASE}/${id}`);
      
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Instalación eliminada exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error eliminando instalación');
    } catch (error) {
      console.error('❌ Error eliminando instalación:', error);
      throw error;
    }
  },

  // ==========================================
  // ACCIONES ESPECÍFICAS (NUEVAS)
  // ==========================================

  /**
   * Asignar instalador a una instalación
   */
  async asignarInstalador(instalacionId, instaladorId) {
    try {
      console.log('👷 Asignando instalador:', instaladorId, 'a instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/asignar-instalador`, {
        instalador_id: instaladorId
      });
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Instalador asignado exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error asignando instalador');
    } catch (error) {
      console.error('❌ Error asignando instalador:', error);
      throw error;
    }
  },

  /**
   * Reagendar una instalación (CORREGIDO)
   */
  async reagendarInstalacion(instalacionId, fechaNueva, horaNueva, observaciones = '') {
    try {
      console.log('📅 Reagendando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/reagendar`, {
        fecha_programada: fechaNueva,
        hora_programada: horaNueva,
        observaciones: observaciones
      });
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Instalación reagendada exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error reagendando instalación');
    } catch (error) {
      console.error('❌ Error reagendando instalación:', error);
      throw error;
    }
  },

  /**
   * Cancelar una instalación (CORREGIDO)
   */
  async cancelarInstalacion(instalacionId, motivoCancelacion) {
    try {
      console.log('❌ Cancelando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/cancelar`, {
        motivo_cancelacion: motivoCancelacion
      });
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Instalación cancelada exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error cancelando instalación');
    } catch (error) {
      console.error('❌ Error cancelando instalación:', error);
      throw error;
    }
  },

  /**
   * Cambiar estado de instalación
   */
  async cambiarEstado(id, estado, datos = {}) {
    try {
      console.log('🔄 Cambiando estado de instalación:', id, 'a:', estado);
      const response = await apiService.patch(`${API_BASE}/${id}/estado`, {
        estado,
        ...datos
      });
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data,
          message: response.message || 'Estado actualizado exitosamente'
        };
      }
      
      throw new Error(response.message || 'Error cambiando estado');
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      throw error;
    }
  },

  // ==========================================
  // DATOS AUXILIARES
  // ==========================================

  /**
   * Obtener instaladores disponibles
   */
  async getInstaladores() {
    try {
      console.log('👷 Obteniendo instaladores disponibles');
      const response = await apiService.get(`${API_BASE}/instaladores/disponibles`);
      
      if (response.success) {
        return {
          success: true,
          instaladores: response.data || []
        };
      }
      
      throw new Error(response.message || 'Error obteniendo instaladores');
    } catch (error) {
      console.error('❌ Error obteniendo instaladores:', error);
      throw error;
    }
  },

  /**
   * Obtener equipos disponibles
   */
  async getEquiposDisponibles() {
    try {
      console.log('📦 Obteniendo equipos disponibles');
      const response = await apiService.get(`${API_BASE}/equipos/disponibles`);
      
      if (response.success) {
        return {
          success: true,
          equipos: response.data || []
        };
      }
      
      throw new Error(response.message || 'Error obteniendo equipos');
    } catch (error) {
      console.error('❌ Error obteniendo equipos:', error);
      throw error;
    }
  },

  /**
   * Buscar clientes
   */
  async getClientes(termino = '') {
    try {
      console.log('🔍 Buscando clientes con término:', termino);
      const response = await apiService.get('/clientes', {
        params: { 
          busqueda: termino,
          limit: 50,
          activo: 1
        }
      });
      
      if (response.success) {
        return {
          success: true,
          data: response.data || []
        };
      }
      
      throw new Error(response.message || 'Error buscando clientes');
    } catch (error) {
      console.error('❌ Error buscando clientes:', error);
      throw error;
    }
  },

  /**
   * Obtener servicios de un cliente
   */
  async getServiciosCliente(clienteId) {
    try {
      console.log('🌐 Obteniendo servicios del cliente:', clienteId);
      const response = await apiService.get(`/clientes/${clienteId}/servicios`);
      
      if (response.success) {
        return {
          success: true,
          data: response.data || []
        };
      }
      
      throw new Error(response.message || 'Error obteniendo servicios del cliente');
    } catch (error) {
      console.error('❌ Error obteniendo servicios del cliente:', error);
      throw error;
    }
  },

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================

  /**
   * Obtener estadísticas de instalaciones
   */
  async getEstadisticas(filtros = {}) {
    try {
      console.log('📊 Obteniendo estadísticas de instalaciones');
      const response = await apiService.get(`${API_BASE}/estadisticas`, { params: filtros });
      
      if (response.success) {
        return {
          success: true,
          estadisticas: response.data || {}
        };
      }
      
      throw new Error(response.message || 'Error obteniendo estadísticas');
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * Exportar reporte de instalaciones (CORREGIDO)
   */
  async exportarReporte(filtros = {}, formato = 'excel') {
    try {
      console.log('📊 Exportando reporte de instalaciones en formato:', formato);
      
      const params = {
        ...filtros,
        formato: formato
      };

      const response = await apiService.getBlob(`${API_BASE}/exportar`, { params });
      
      // Crear blob y descargar archivo
      const blob = new Blob([response], { 
        type: formato === 'csv' ? 'text/csv' : 'application/json' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = formato === 'csv' ? 'csv' : 'json';
      a.download = `instalaciones_${timestamp}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { 
        success: true, 
        message: 'Reporte descargado exitosamente' 
      };
    } catch (error) {
      console.error('❌ Error exportando reporte:', error);
      throw error;
    }
  },

  /**
 * Reagendar instalación
 */
async reagendarInstalacion(id, fechaProgramada, horaProgramada, observaciones = '') {
  try {
    console.log(`📅 Reagendando instalación ${id} para ${fechaProgramada} ${horaProgramada}`);
    
    const response = await apiService.patch(`${this.baseURL}/${id}/reagendar`, {
      fecha_programada: fechaProgramada,
      hora_programada: horaProgramada,
      observaciones
    });
    
    console.log('✅ Instalación reagendada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error reagendando instalación:', error);
    throw this.handleError(error);
  }
},

/**
 * Cancelar instalación
 */
async cancelarInstalacion(id, motivo) {
  try {
    console.log(`❌ Cancelando instalación ${id}. Motivo: ${motivo}`);
    
    const response = await apiService.patch(`${this.baseURL}/${id}/cancelar`, {
      motivo
    });
    
    console.log('✅ Instalación cancelada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error cancelando instalación:', error);
    throw this.handleError(error);
  }
},

/**
 * Descargar orden de servicio en PDF
 */
async descargarOrdenPDF(instalacionId) {
  try {
    console.log(`📄 Descargando orden de servicio PDF para instalación ${instalacionId}`);
    
    const response = await apiService.get(`${this.baseURL}/${instalacionId}/pdf`, {
      responseType: 'blob'
    });
    
    // Crear y descargar el archivo
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `orden-servicio-${instalacionId}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Orden de servicio descargada exitosamente');
    return { success: true, message: 'Orden de servicio descargada exitosamente' };
  } catch (error) {
    console.error('❌ Error descargando orden PDF:', error);
    throw this.handleError(error);
  }
},

/**
 * Exportar reporte de instalaciones (CORREGIR MÉTODO EXISTENTE)
 */
async exportarReporte(queryParams = '', formato = 'excel') {
  try {
    console.log('📊 Exportando reporte de instalaciones:', { queryParams, formato });
    
    const params = new URLSearchParams(queryParams);
    params.append('formato', formato);
    
    const response = await apiService.get(`${this.baseURL}/exportar?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Crear y descargar el archivo
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const extension = formato === 'excel' ? 'xlsx' : 'json';
    const fecha = new Date().toISOString().split('T')[0];
    link.download = `instalaciones_${fecha}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Reporte descargado exitosamente');
    return { success: true, message: 'Reporte descargado exitosamente' };
  } catch (error) {
    console.error('❌ Error exportando reporte:', error);
    throw this.handleError(error);
  }
}
};

// ==========================================
// FUNCIONES AUXILIARES PARA EL FRONTEND
// ==========================================

export const instalacionesHelpers = {
  
  /**
   * Formatear estado para mostrar
   */
  formatearEstado(estado) {
    const estados = {
      'programada': 'Programada',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'reagendada': 'Reagendada'
    };
    return estados[estado] || estado;
  },

  /**
   * Obtener color CSS para estado
   */
  getColorEstado(estado) {
    const colores = {
      'programada': 'blue',
      'en_proceso': 'yellow',
      'completada': 'green',
      'cancelada': 'red',
      'reagendada': 'purple'
    };
    return colores[estado] || 'gray';
  },

  /**
   * Obtener clases CSS para badge de estado
   */
  getClasesEstado(estado) {
    const clases = {
      'programada': 'bg-blue-100 text-blue-800 border-blue-200',
      'en_proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'completada': 'bg-green-100 text-green-800 border-green-200',
      'cancelada': 'bg-red-100 text-red-800 border-red-200',
      'reagendada': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return clases[estado] || 'bg-gray-100 text-gray-800 border-gray-200';
  },

  /**
   * Formatear tipo de instalación
   */
  formatearTipo(tipo) {
    const tipos = {
      'nueva': 'Nueva Instalación',
      'migracion': 'Migración',
      'upgrade': 'Actualización',
      'reparacion': 'Reparación'
    };
    return tipos[tipo] || tipo;
  },

  /**
   * Verificar si una instalación está vencida
   */
  esVencida(fechaProgramada, estado) {
    if (['completada', 'cancelada'].includes(estado)) {
      return false;
    }
    const hoy = new Date();
    const fecha = new Date(fechaProgramada);
    return fecha < hoy;
  },

async exportarReporte(queryParams = '', formato = 'excel') {
    try {
        console.log('📊 Exportando reporte de instalaciones:', { queryParams, formato });
        
        const params = new URLSearchParams(queryParams);
        params.append('formato', formato);
        
        const response = await apiService.get(`${this.baseURL}/exportar?${params.toString()}`, {
            responseType: 'blob'
        });
        
        // Crear y descargar el archivo
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const extension = formato === 'excel' ? 'xlsx' : 'csv';
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `instalaciones_${timestamp}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Reporte descargado exitosamente');
        return { success: true, message: 'Reporte descargado exitosamente' };
        
    } catch (error) {
        console.error('❌ Error exportando reporte:', error);
        throw this.handleError(error);
    }
},
  /**
   * Calcular días desde programación
   */
  diasDesdeProgramacion(fechaProgramada) {
    const hoy = new Date();
    const fecha = new Date(fechaProgramada);
    const diferencia = Math.ceil((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diferencia;
  },

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha, incluirHora = false) {
    if (!fecha) return '-';
    
    const date = new Date(fecha);
    const opciones = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    if (incluirHora) {
      opciones.hour = '2-digit';
      opciones.minute = '2-digit';
    }
    
    return date.toLocaleDateString('es-CO', opciones);
  },

  /**
   * Formatear precio
   */
  formatearPrecio(precio) {
    if (!precio || precio === 0) return 'Gratis';
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  },

  /**
   * Validar datos de instalación
   */
  validarInstalacion(datos) {
    const errores = {};

    if (!datos.cliente_id) {
      errores.cliente_id = 'El cliente es obligatorio';
    }

    if (!datos.servicio_cliente_id) {
      errores.servicio_cliente_id = 'El servicio del cliente es obligatorio';
    }

    if (!datos.fecha_programada) {
      errores.fecha_programada = 'La fecha programada es obligatoria';
    } else {
      const fecha = new Date(datos.fecha_programada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha < hoy) {
        errores.fecha_programada = 'La fecha no puede ser anterior a hoy';
      }
    }

    if (!datos.direccion_instalacion || datos.direccion_instalacion.trim() === '') {
      errores.direccion_instalacion = 'La dirección de instalación es obligatoria';
    }

    if (!datos.telefono_contacto || datos.telefono_contacto.trim() === '') {
      errores.telefono_contacto = 'El teléfono de contacto es obligatorio';
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(datos.telefono_contacto)) {
      errores.telefono_contacto = 'Formato de teléfono inválido';
    }

    if (datos.costo_instalacion && datos.costo_instalacion < 0) {
      errores.costo_instalacion = 'El costo no puede ser negativo';
    }

    return {
      esValido: Object.keys(errores).length === 0,
      errores
    };
  }
};

export default instalacionesService;