// frontend/src/services/instalacionesService.js

// Importar el servicio base existente
import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const BASE_URL = '/api/v1/instalaciones';

class InstalacionesService {
  
  // Realizar petición HTTP básica
  async makeRequest(url, options = {}) {
    const token = authService.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log('🌐 Realizando petición a:', fullUrl);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('Error en InstalacionesService:', error);
      
      if (error.message.includes('401')) {
        try {
          await authService.refreshToken();
          // Reintentar la petición original
          const newToken = authService.getToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              throw new Error(retryData.message || 'Error en reintento');
            }
            
            return retryData;
          }
        } catch (refreshError) {
          // Si falla el refresh, redirigir al login
          authService.removeToken();
          window.location.href = '/login';
          throw new Error('Sesión expirada');
        }
      }
      
      throw error;
    }
  }
  
  // Listar instalaciones con filtros y paginación
  async getInstalaciones(params = {}) {
    try {
      console.log('🔍 Obteniendo instalaciones con parámetros:', params);
      
      const queryParams = new URLSearchParams();
      
      // Agregar parámetros de paginación
      if (params.pagina) queryParams.append('pagina', params.pagina);
      if (params.limite) queryParams.append('limite', params.limite);
      
      // Agregar filtros
      if (params.estado) queryParams.append('estado', params.estado);
      if (params.instalador_id) queryParams.append('instalador_id', params.instalador_id);
      if (params.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
      if (params.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
      if (params.tipo_instalacion) queryParams.append('tipo_instalacion', params.tipo_instalacion);
      if (params.ciudad_id) queryParams.append('ciudad_id', params.ciudad_id);
      if (params.busqueda) queryParams.append('busqueda', params.busqueda);
      
      const url = `${BASE_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('🌐 URL solicitada:', url);
      
      const response = await this.makeRequest(url);
      console.log('✅ Respuesta de instalaciones:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo instalaciones:', error);
      throw this.handleError(error, 'obtener instalaciones');
    }
  }

  // Obtener instalación por ID
  async getInstalacion(id) {
    try {
      console.log('🔍 Obteniendo instalación ID:', id);
      const response = await this.makeRequest(`${BASE_URL}/${id}`);
      console.log('✅ Instalación obtenida:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo instalación:', error);
      throw this.handleError(error, 'obtener instalación');
    }
  }

  // Crear nueva instalación
  async createInstalacion(datosInstalacion) {
    try {
      console.log('➕ Creando instalación:', datosInstalacion);
      
      // Validar datos requeridos
      this.validateInstalacionData(datosInstalacion);
      
      const response = await this.makeRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(datosInstalacion)
      });
      console.log('✅ Instalación creada:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creando instalación:', error);
      throw this.handleError(error, 'crear instalación');
    }
  }

  // Actualizar instalación
  async updateInstalacion(id, datosActualizacion) {
    try {
      console.log('✏️ Actualizando instalación:', id, datosActualizacion);
      const response = await this.makeRequest(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(datosActualizacion)
      });
      console.log('✅ Instalación actualizada:', response);
      return response;
    } catch (error) {
      console.error('❌ Error actualizando instalación:', error);
      throw this.handleError(error, 'actualizar instalación');
    }
  }

  // Cambiar estado de instalación
  async cambiarEstado(id, estado, datos = {}) {
    try {
      console.log('🔄 Cambiando estado de instalación:', id, 'a', estado);
      
      const payload = {
        estado,
        ...datos
      };
      
      // Si es completada, requerir fecha de realización
      if (estado === 'completada' && !datos.fecha_realizada) {
        payload.fecha_realizada = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      const response = await this.makeRequest(`${BASE_URL}/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      console.log('✅ Estado cambiado:', response);
      return response;
    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      throw this.handleError(error, 'cambiar estado de instalación');
    }
  }

  // Reagendar instalación
  async reagendarInstalacion(id, nuevaFecha, motivo = '') {
    try {
      console.log('📅 Reagendando instalación:', id, 'para', nuevaFecha);
      
      const payload = {
        nueva_fecha: nuevaFecha,
        motivo
      };
      
      const response = await this.makeRequest(`${BASE_URL}/${id}/reagendar`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      console.log('✅ Instalación reagendada:', response);
      return response;
    } catch (error) {
      console.error('❌ Error reagendando instalación:', error);
      throw this.handleError(error, 'reagendar instalación');
    }
  }

  // Asignar instalador
  async asignarInstalador(id, instaladorId) {
    try {
      console.log('👷 Asignando instalador:', instaladorId, 'a instalación:', id);
      
      const payload = {
        instalador_id: instaladorId
      };
      
      const response = await this.makeRequest(`${BASE_URL}/${id}/asignar-instalador`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      console.log('✅ Instalador asignado:', response);
      return response;
    } catch (error) {
      console.error('❌ Error asignando instalador:', error);
      throw this.handleError(error, 'asignar instalador');
    }
  }

  // Eliminar instalación
  async deleteInstalacion(id) {
    try {
      console.log('🗑️ Eliminando instalación:', id);
      const response = await this.makeRequest(`${BASE_URL}/${id}`, {
        method: 'DELETE'
      });
      console.log('✅ Instalación eliminada:', response);
      return response;
    } catch (error) {
      console.error('❌ Error eliminando instalación:', error);
      throw this.handleError(error, 'eliminar instalación');
    }
  }

  // Obtener estadísticas
  async getEstadisticas(filtros = {}) {
    try {
      console.log('📊 Obteniendo estadísticas con filtros:', filtros);
      
      const queryParams = new URLSearchParams();
      if (filtros.fecha_desde) queryParams.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) queryParams.append('fecha_hasta', filtros.fecha_hasta);
      if (filtros.instalador_id) queryParams.append('instalador_id', filtros.instalador_id);
      
      const url = `${BASE_URL}/estadisticas${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest(url);
      console.log('✅ Estadísticas obtenidas:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw this.handleError(error, 'obtener estadísticas');
    }
  }

  // Obtener instalaciones pendientes por instalador
  async getPendientesPorInstalador(instaladorId) {
    try {
      console.log('⏳ Obteniendo pendientes del instalador:', instaladorId);
      const response = await this.makeRequest(`${BASE_URL}/instalador/${instaladorId}/pendientes`);
      console.log('✅ Pendientes obtenidos:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo pendientes:', error);
      throw this.handleError(error, 'obtener instalaciones pendientes');
    }
  }

  // Obtener agenda del instalador
  async getAgendaInstalador(instaladorId, fechaDesde = null, fechaHasta = null) {
    try {
      console.log('📅 Obteniendo agenda del instalador:', instaladorId);
      
      const queryParams = new URLSearchParams();
      if (fechaDesde) queryParams.append('fecha_desde', fechaDesde);
      if (fechaHasta) queryParams.append('fecha_hasta', fechaHasta);
      
      const url = `${BASE_URL}/instalador/${instaladorId}/agenda${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await this.makeRequest(url);
      console.log('✅ Agenda obtenida:', response);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo agenda:', error);
      throw this.handleError(error, 'obtener agenda del instalador');
    }
  }

  // Obtener información de la API
  async getInfo() {
    try {
      const response = await this.makeRequest(`${BASE_URL}/info`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo info de API:', error);
      throw this.handleError(error, 'obtener información de la API');
    }
  }

  // Validar datos de instalación
  validateInstalacionData(datos) {
    const errores = [];

    if (!datos.cliente_id) {
      errores.push('Cliente es requerido');
    }

    if (!datos.plan_id) {
      errores.push('Plan de servicio es requerido');
    }

    if (!datos.fecha_programada) {
      errores.push('Fecha programada es requerida');
    } else {
      const fechaProgramada = new Date(datos.fecha_programada);
      const ahora = new Date();
      if (fechaProgramada <= ahora) {
        errores.push('La fecha programada debe ser futura');
      }
    }

    if (!datos.direccion_instalacion || datos.direccion_instalacion.trim().length < 5) {
      errores.push('Dirección de instalación debe tener al menos 5 caracteres');
    }

    if (datos.coordenadas_lat && (datos.coordenadas_lat < -90 || datos.coordenadas_lat > 90)) {
      errores.push('Latitud debe estar entre -90 y 90 grados');
    }

    if (datos.coordenadas_lng && (datos.coordenadas_lng < -180 || datos.coordenadas_lng > 180)) {
      errores.push('Longitud debe estar entre -180 y 180 grados');
    }

    if (datos.costo_instalacion && datos.costo_instalacion < 0) {
      errores.push('El costo de instalación no puede ser negativo');
    }

    if (errores.length > 0) {
      throw new Error(`Errores de validación: ${errores.join(', ')}`);
    }
  }

  // Manejar errores
  handleError(error, operacion) {
    let mensaje = `Error al ${operacion}`;
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          mensaje = data.message || 'Datos inválidos';
          break;
        case 401:
          mensaje = 'No autorizado. Inicia sesión nuevamente';
          break;
        case 403:
          mensaje = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          mensaje = 'Instalación no encontrada';
          break;
        case 409:
          mensaje = 'Conflicto en los datos';
          break;
        case 429:
          mensaje = 'Demasiadas solicitudes. Intenta más tarde';
          break;
        case 500:
          mensaje = 'Error interno del servidor';
          break;
        default:
          mensaje = data.message || `Error ${status}`;
      }
    } else if (error.message) {
      mensaje = error.message;
    }

    return new Error(mensaje);
  }

  // Funciones de utilidad para el frontend
  
  // Formatear fecha para visualización
  formatFecha(fecha) {
    if (!fecha) return 'No especificada';
    
    try {
      return new Date(fecha).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return fecha;
    }
  }

  // Formatear fecha solo
  formatFechaSolo(fecha) {
    if (!fecha) return 'No especificada';
    
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return fecha;
    }
  }

  // Obtener color del estado
  getEstadoColor(estado) {
    const colores = {
      'programada': 'bg-blue-100 text-blue-800 border-blue-200',
      'en_proceso': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'completada': 'bg-green-100 text-green-800 border-green-200',
      'cancelada': 'bg-red-100 text-red-800 border-red-200',
      'reagendada': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  // Obtener etiqueta del estado
  getEstadoLabel(estado) {
    const etiquetas = {
      'programada': 'Programada',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'reagendada': 'Reagendada'
    };
    
    return etiquetas[estado] || estado;
  }

  // Obtener etiqueta del tipo
  getTipoLabel(tipo) {
    const etiquetas = {
      'nueva': 'Nueva Instalación',
      'migracion': 'Migración',
      'upgrade': 'Actualización',
      'reparacion': 'Reparación'
    };
    
    return etiquetas[tipo] || tipo;
  }

  // Calcular tiempo transcurrido
  calcularTiempoTranscurrido(fechaCreacion) {
    if (!fechaCreacion) return 'No disponible';
    
    const ahora = new Date();
    const fecha = new Date(fechaCreacion);
    const diferencia = ahora - fecha;
    
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (dias > 0) {
      return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    } else if (horas > 0) {
      return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    } else {
      return 'Hace unos minutos';
    }
  }

  // Verificar si la instalación está vencida
  esVencida(fechaProgramada, estado) {
    if (estado === 'completada' || estado === 'cancelada') {
      return false;
    }
    
    const ahora = new Date();
    const fecha = new Date(fechaProgramada);
    
    return fecha < ahora;
  }
}

// Exportar instancia única
export const instalacionesService = new InstalacionesService();