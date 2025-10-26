// frontend/src/services/instalacionesService.js
import apiService from './apiService';
import authService from './authService';

const API_BASE = '/instalaciones';

export const instalacionesService = {
  // ==========================================
  // CRUD BÁSICO
  // ==========================================
  async getInstalaciones(params = {}) {
    try {
      console.log('📡 Obteniendo instalaciones con parámetros:', params);
      const response = await apiService.get(`${API_BASE}`, params);
      console.log('📥 RESPUESTA COMPLETA DEL API:', response);

      if (response && response.success) {
        const instalacionesData = Array.isArray(response.data)
          ? response.data
          : (response.data?.instalaciones || response.instalaciones || []);

        return {
          success: true,
          instalaciones: instalacionesData,
          pagination: response.pagination || response.paginacion || {},
          estadisticas: response.estadisticas || {}
        };
      }
      
      return {
        success: false,
        instalaciones: [],
        pagination: {},
        estadisticas: {},
        message: response.message || 'Error desconocido'
      };
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

  async getInstalacion(id) {
    try {
      console.log('🔍 Obteniendo instalación ID:', id);
      const response = await apiService.get(`${API_BASE}/${id}`);
      
      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion
        };
      }
      throw new Error(response.message || 'Error obteniendo instalación');
    } catch (error) {
      console.error('❌ Error obteniendo instalación:', error);
      throw error;
    }
  },

  async createInstalacion(instalacionData) {
    try {
      console.log('➕ Creando instalación:', instalacionData);
      const response = await apiService.post(`${API_BASE}`, instalacionData);

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación creada exitosamente'
        };
      }
      throw new Error(response.message || 'Error creando instalación');
    } catch (error) {
      console.error('❌ Error creando instalación:', error);
      throw error;
    }
  },

  async updateInstalacion(id, instalacionData) {
    try {
      console.log('✏️ Actualizando instalación ID:', id);
      const response = await apiService.put(`${API_BASE}/${id}`, instalacionData);

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación actualizada exitosamente'
        };
      }
      throw new Error(response.message || 'Error actualizando instalación');
    } catch (error) {
      console.error('❌ Error actualizando instalación:', error);
      throw error;
    }
  },

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
  // ACCIONES ESPECÍFICAS
  // ==========================================
  async asignarInstalador(instalacionId, instaladorId) {
    try {
      console.log('👷 Asignando instalador:', instaladorId, 'a instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/asignar-instalador`, {
        instalador_id: instaladorId
      });

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalador asignado exitosamente'
        };
      }
      throw new Error(response.message || 'Error asignando instalador');
    } catch (error) {
      console.error('❌ Error asignando instalador:', error);
      throw error;
    }
  },

  async cambiarEstado(instalacionId, nuevoEstado, datosAdicionales = {}) {
    try {
      console.log('🔄 Cambiando estado de instalación:', instalacionId, 'a:', nuevoEstado);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/cambiar-estado`, {
        estado: nuevoEstado,
        ...datosAdicionales
      });

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Estado actualizado exitosamente'
        };
      }
      throw new Error(response.message || 'Error cambiando estado');
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      throw error;
    }
  },

  async iniciarInstalacion(instalacionId) {
    try {
      console.log('▶️ Iniciando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/iniciar`);

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación iniciada exitosamente'
        };
      }
      throw new Error(response.message || 'Error iniciando instalación');
    } catch (error) {
      console.error('❌ Error iniciando instalación:', error);
      throw error;
    }
  },

  async completarInstalacion(instalacionId, datosCompletacion) {
    try {
      console.log('✅ Completando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/completar`, datosCompletacion);

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación completada exitosamente'
        };
      }
      throw new Error(response.message || 'Error completando instalación');
    } catch (error) {
      console.error('❌ Error completando instalación:', error);
      throw error;
    }
  },

  async reagendarInstalacion(instalacionId, datosReagenda) {
    try {
      console.log('🔄 Reagendando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/reagendar`, datosReagenda);

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación reagendada exitosamente'
        };
      }
      throw new Error(response.message || 'Error reagendando instalación');
    } catch (error) {
      console.error('❌ Error reagendando instalación:', error);
      throw error;
    }
  },

  async cancelarInstalacion(instalacionId, motivoCancelacion) {
    try {
      console.log('❌ Cancelando instalación:', instalacionId);
      const response = await apiService.patch(`${API_BASE}/${instalacionId}/cancelar`, {
        motivo_cancelacion: motivoCancelacion
      });

      if (response.success) {
        return {
          success: true,
          instalacion: response.data || response.instalacion,
          message: response.message || 'Instalación cancelada exitosamente'
        };
      }
      throw new Error(response.message || 'Error cancelando instalación');
    } catch (error) {
      console.error('❌ Error cancelando instalación:', error);
      throw error;
    }
  },

  // ==========================================
  // DATOS AUXILIARES
  // ==========================================
  async getClientes(params = {}) {
    try {
      console.log('📋 Obteniendo clientes con params:', params);
      const response = await apiService.get('/clients', params);
      console.log('📋 Respuesta completa clientes:', response);
      
      const clientes = response.data || response.clientes || [];
      console.log('📋 Clientes extraídos:', clientes);
      
      return {
        success: true,
        clientes: Array.isArray(clientes) ? clientes : []
      };
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      return { success: false, clientes: [] };
    }
  },

  async getClienteById(id) {
    try {
      console.log(`📋 Obteniendo cliente ID: ${id}`);
      const response = await apiService.get(`/clients/${id}`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      throw error;
    }
  },

  async getInstaladores() {
    try {
      console.log('👷 Obteniendo instaladores');
      const response = await apiService.get('/users', { rol: 'instalador' });
      console.log('👷 Respuesta completa instaladores:', response);
      
      // Los instaladores están en message.users
      const instaladores = response.message?.users || response.data?.users || response.users || [];
      console.log('👷 Instaladores extraídos:', instaladores);
      
      return {
        success: true,
        instaladores: Array.isArray(instaladores) ? instaladores : []
      };
    } catch (error) {
      console.error('❌ Error obteniendo instaladores:', error);
      return { success: false, instaladores: [] };
    }
  },

  async getEquiposDisponibles() {
    try {
      console.log('📦 Obteniendo equipos disponibles');
      const response = await apiService.get('/inventory/available');
      console.log('📦 Respuesta equipos:', response);

      const equipos = response.data?.equipos || response.data || response.equipos || [];
      
      return {
        success: true,
        equipos: Array.isArray(equipos) ? equipos : []
      };
    } catch (error) {
      console.error('❌ Error obteniendo equipos:', error);
      return { success: false, equipos: [] };
    }
  },

  async getServiciosCliente(clienteId) {
    try {
      console.log('🔍 Obteniendo servicios del cliente:', clienteId);
      const response = await apiService.get(`/clients/${clienteId}`);

      if (response.success && response.data) {
        const servicios = response.data.servicios || [];
        return {
          success: true,
          servicios: servicios
        };
      }
      throw new Error(response.message || 'Error obteniendo servicios del cliente');
    } catch (error) {
      console.error('❌ Error obteniendo servicios del cliente:', error);
      return {
        success: false,
        servicios: [],
        message: error.message
      };
    }
  },

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================
  async getEstadisticas(params = {}) {
    try {
      console.log('📊 Obteniendo estadísticas de instalaciones');
      const response = await apiService.get(`${API_BASE}/estadisticas`, { params });

      if (response.success) {
        return {
          success: true,
          estadisticas: response.data || response.estadisticas || {}
        };
      }
      throw new Error(response.message || 'Error obteniendo estadísticas');
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        estadisticas: {},
        message: error.message
      };
    }
  },

  async getDashboardInstalador(instaladorId) {
    try {
      console.log('📊 Obteniendo dashboard para instalador:', instaladorId);
      const response = await apiService.get(`${API_BASE}/dashboard/instalador/${instaladorId}`);

      if (response.success) {
        return {
          success: true,
          dashboard: response.data || response.dashboard || {}
        };
      }
      throw new Error(response.message || 'Error obteniendo dashboard');
    } catch (error) {
      console.error('❌ Error obteniendo dashboard:', error);
      return {
        success: false,
        dashboard: {},
        message: error.message
      };
    }
  },

  async generarOrdenServicioPDF(instalacionId) {
    try {
      console.log('📄 Generando orden de servicio PDF para instalación:', instalacionId);

      if (!instalacionId || isNaN(instalacionId)) {
        throw new Error('ID de instalación inválido');
      }

      const token = authService.getToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1'}/instalaciones/${instalacionId}/pdf`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/pdf',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('El PDF generado está vacío');
      }

      return {
        success: true,
        data: blob,
        message: 'PDF generado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw error;
    }
  },

  // ==========================================
  // UTILIDADES
  // ==========================================
  async subirFotos(instalacionId, archivos) {
    try {
      console.log('📸 Subiendo fotos para instalación:', instalacionId);

      const formData = new FormData();
      archivos.forEach((archivo, index) => {
        formData.append(`foto_${index}`, archivo);
      });

      const response = await apiService.post(`${API_BASE}/${instalacionId}/fotos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.success) {
        return {
          success: true,
          fotos: response.data || response.fotos || [],
          message: response.message || 'Fotos subidas exitosamente'
        };
      }
      throw new Error(response.message || 'Error subiendo fotos');
    } catch (error) {
      console.error('❌ Error subiendo fotos:', error);
      throw error;
    }
  },

  async getHistorial(instalacionId) {
    try {
      console.log('📋 Obteniendo historial de instalación:', instalacionId);
      const response = await apiService.get(`${API_BASE}/${instalacionId}/historial`);

      if (response.success) {
        return {
          success: true,
          historial: response.data || response.historial || []
        };
      }
      throw new Error(response.message || 'Error obteniendo historial');
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return {
        success: false,
        historial: [],
        message: error.message
      };
    }
  },

  // ==========================================
  // FUNCIONES DE COMPATIBILIDAD
  // ==========================================
  async eliminar(id) {
    return this.deleteInstalacion(id);
  },

  async reagendar(id, datosReagenda) {
    return this.reagendarInstalacion(id, datosReagenda);
  },

  async cancelar(id, motivo) {
    return this.cancelarInstalacion(id, motivo);
  },

  async buscarClientes(termino = '') {
    return this.getClientes({ busqueda: termino, limit: 50, activo: 1 });
  }
};

export default instalacionesService;