// frontend/src/services/instalacionesService.js - ARREGLADO BASADO EN CÓDIGO ACTUAL

import apiService from './apiService';
import authService from './authService';
const API_BASE = '/instalaciones';



export const instalacionesService = {


  // ==========================================
  // CRUD BÁSICO (ARREGLADO)
  // ==========================================

  /**
   * ARREGLADO: Obtener todas las instalaciones con filtros y paginación
   */
  async getInstalaciones(params = {}) {
    try {
      console.log('📡 Obteniendo instalaciones con parámetros:', params);
      const response = await apiService.get(`${API_BASE}`,  params );

      console.log('📥 RESPUESTA COMPLETA DEL API:', response);

      if (response && response.success) {
        console.log('✅ Response exitoso');

        // El backend puede devolver los datos de diferentes formas
        const instalacionesData = Array.isArray(response.data)
          ? response.data
          : (response.data?.instalaciones || response.instalaciones || []);

        console.log('📋 Instalaciones finales:', instalacionesData);

        return {
          success: true,
          instalaciones: instalacionesData,
          pagination: response.pagination || response.paginacion || {},
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
   * ARREGLADO: Obtener una instalación por ID
   */
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

  /**
   * ARREGLADO: Crear una nueva instalación
   */
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

  /**
   * ARREGLADO: Actualizar una instalación
   */
  async updateInstalacion(id, instalacionData) {
    try {
      console.log('✏️ Actualizando instalación ID:', id, 'con datos:', instalacionData);
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

  /**
   * ARREGLADO: Eliminar una instalación
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
  // ACCIONES ESPECÍFICAS (ARREGLADAS)
  // ==========================================

  /**
   * ARREGLADO: Asignar instalador a una instalación
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

  /**
   * ARREGLADO: Cambiar estado de una instalación
   */
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

  /**
   * ARREGLADO: Iniciar instalación (para instaladores)
   */
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

  /**
   * ARREGLADO: Completar instalación
   */
  async completarInstalacion(instalacionId, datosCompletacion) {
    try {
      console.log('✅ Completando instalación:', instalacionId, 'con datos:', datosCompletacion);
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

  /**
   * ARREGLADO: Reagendar instalación
   */
  async reagendarInstalacion(instalacionId, datosReagenda) {
    try {
      console.log('🔄 Reagendando instalación:', instalacionId, 'con datos:', datosReagenda);
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

  /**
   * ARREGLADO: Cancelar instalación
   */
  async cancelarInstalacion(instalacionId, motivoCancelacion) {
    try {
      console.log('❌ Cancelando instalación:', instalacionId, 'motivo:', motivoCancelacion);
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
  // DATOS AUXILIARES (ARREGLADOS)
  // ==========================================

  /**
   * ARREGLADO: Obtener instaladores disponibles
   */
  async getInstaladores() {
    try {
      console.log('👷 Obteniendo instaladores disponibles');

      // Primero intentar con el endpoint específico de instaladores
      let response;
      try {
        response = await apiService.get(`${API_BASE}/instaladores`);
      } catch (error) {
        // Si no existe, usar el endpoint general de usuarios
        console.log('🔄 Probando endpoint alternativo...');
        response = await apiService.get('/users', {
          params: { rol: 'instalador,supervisor', activo: 1 }
        });
      }

      if (response.success) {
        return {
          success: true,
          instaladores: response.data || response.instaladores || []
        };
      }

      throw new Error(response.message || 'Error obteniendo instaladores');
    } catch (error) {
      console.error('❌ Error obteniendo instaladores:', error);
      return {
        success: false,
        instaladores: [],
        message: error.message
      };
    }
  },

  /**
   * ARREGLADO: Obtener equipos disponibles para instalación
   */
async getClientes(params = {}) {
    try {
        console.log('📋 Obteniendo clientes con params:', params);
        const response = await apiService.get('/clients', params);
        console.log('📋 Respuesta completa clientes:', response);
        
        const clientes = response.data?.clientes || response.data || response.clientes || [];
        console.log('📋 Clientes extraídos:', clientes);
        
        return {
            success: true,
            clientes: Array.isArray(clientes) ? clientes : []
        };
    } catch (error) {
        console.error('❌ Error obteniendo clientes:', error);
        return {
            success: false,
            clientes: []
        };
    }
},

async getInstaladores() {
    try {
        console.log('👷 Obteniendo instaladores');
        const response = await apiService.get('/users', { rol: 'instalador' });
        console.log('👷 Respuesta completa instaladores:', response);
        
        const instaladores = response.data?.users || response.data || response.users || [];
        console.log('👷 Instaladores extraídos:', instaladores);
        
        return {
            success: true,
            instaladores: Array.isArray(instaladores) ? instaladores : []
        };
    } catch (error) {
        console.error('❌ Error obteniendo instaladores:', error);
        return {
            success: false,
            instaladores: []
        };
    }
},
/**
 * ARREGLADO: Obtener servicios de un cliente
 */
async getServiciosCliente(clienteId) {
  try {
    console.log('🔍 Obteniendo servicios del cliente:', clienteId);
    // Cambiar ruta a la correcta del backend
    const response = await apiService.get(`/clients/${clienteId}`);

    if (response.success && response.data) {
      // Extraer servicios del objeto cliente
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
  // ESTADÍSTICAS Y REPORTES (ARREGLADOS)
  // ==========================================
async getClientes(params = {}) {
    try {
        console.log('📋 Obteniendo clientes');
        const response = await apiService.get('/clients', params);
        return response;
    } catch (error) {
        console.error('❌ Error obteniendo clientes:', error);
        throw error;
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
  async generarOrdenServicioPDF(instalacionId) {
    try {
      console.log('📄 Servicio: Generando orden de servicio PDF para instalación:', instalacionId);

      // VALIDACIÓN: Verificar que instalacionId existe
      if (!instalacionId) {
        throw new Error('ID de instalación es requerido');
      }

      if (isNaN(instalacionId)) {
        throw new Error('ID de instalación debe ser un número válido');
      }

      console.log('🔗 Haciendo petición a:', `/api/v1/instalaciones/${instalacionId}/pdf`);

    // Hacer fetch directo con manejo correcto del blob
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


      console.log('📊 Response status:', response.status);

      // ✅ LÍNEA CORREGIDA - Manejo seguro de headers
      try {
        console.log('📊 Response headers:', response.headers && response.headers.entries ? Object.fromEntries(response.headers.entries()) : 'Headers no disponibles');
      } catch (headerError) {
        console.log('📊 Response headers: No se pudieron obtener');
      }

      if (!response.ok) {
        let errorMessage = 'Error generando PDF';

        // Intentar obtener el mensaje de error del servidor
        try {
          const contentType = response.headers.get('Content-Type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          console.warn('⚠️ No se pudo parsear el error del servidor:', parseError);
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Verificar que recibimos un PDF válido
      const contentType = response.headers.get('Content-Type');
      console.log('📄 Content-Type recibido:', contentType);

      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error(`Tipo de contenido inválido: ${contentType || 'desconocido'}`);
      }

      // Obtener el blob del PDF
      const blob = await response.blob();
      console.log('📄 Blob recibido:', blob.size, 'bytes, tipo:', blob.type);

      // Verificación adicional: Comprobar que el blob no está vacío
      if (blob.size === 0) {
        throw new Error('El PDF generado está vacío');
      }

      // Verificación: Comprobar que es realmente un PDF
      if (blob.type && !blob.type.includes('pdf')) {
        console.warn('⚠️ Tipo de blob inesperado:', blob.type);
      }

      console.log('✅ PDF recibido exitosamente');

      return {
        success: true,
        data: blob,
        message: 'PDF generado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en servicio generarOrdenServicioPDF:', error);

      // Re-lanzar el error con información adicional
      const errorMessage = error.message || 'Error desconocido generando PDF';
      throw new Error(errorMessage);
    }
  },
  /**
   * ARREGLADO: Obtener estadísticas de instalaciones
   */
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

  /**
   * ARREGLADO: Obtener dashboard de instalaciones para instalador
   */
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

  // ==========================================
  // UTILIDADES (ARREGLADAS)
  // ==========================================

  /**
   * ARREGLADO: Subir fotos de instalación
   */
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

  /**
   * ARREGLADO: Obtener historial de cambios de una instalación
   */
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
  // FUNCIONES DE COMPATIBILIDAD (BASADAS EN CÓDIGO ACTUAL)
  // ==========================================

  /**
   * Función de compatibilidad: eliminar (basada en código actual)
   */
  async eliminar(id) {
    return this.deleteInstalacion(id);
  },

  /**
   * Función de compatibilidad: reagendar (basada en código actual)
   */
  async reagendar(id, datosReagenda) {
    return this.reagendarInstalacion(id, datosReagenda);
  },

  /**
   * Función de compatibilidad: cancelar (basada en código actual)
   */
  async cancelar(id, motivo) {
    return this.cancelarInstalacion(id, motivo);
  }
};