// frontend/src/services/instalacionesService.js - VERSIÓN CORREGIDA

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE_URL}/instalaciones`;

// Función helper para manejar respuestas
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
};

// Función helper para obtener headers con autenticación - CORREGIDA
const getAuthHeaders = () => {
  // Intentar obtener token de diferentes lugares (según como lo guardes en tu AuthContext)
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('token') || 
                sessionStorage.getItem('accessToken') || 
                sessionStorage.getItem('token');
  
  console.log('🔑 Token encontrado:', token ? 'SÍ' : 'NO');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const instalacionesService = {
  // Test del servicio
  async test() {
    try {
      console.log('🧪 Probando servicio de instalaciones');
      const response = await fetch(`${API_URL}/test`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error en test instalaciones:', error);
      throw error;
    }
  },

  // Obtener lista de instalaciones con filtros
  async getInstalaciones(filtros = {}) {
    try {
      console.log('📋 Obteniendo instalaciones con filtros:', filtros);
      
      const params = new URLSearchParams();
      
      // Agregar filtros como parámetros de consulta
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = `${API_URL}?${params.toString()}`;
      console.log('🌐 URL de solicitud:', url);
      
      const headers = getAuthHeaders();
      console.log('📤 Headers enviados:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo instalaciones:', error);
      throw error;
    }
  },

  // Obtener estadísticas
  async getEstadisticas(filtros = {}) {
    try {
      console.log('📊 Obteniendo estadísticas con filtros:', filtros);
      
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = `${API_URL}/estadisticas?${params.toString()}`;
      console.log('🌐 URL estadísticas:', url);
      
      const headers = getAuthHeaders();
      console.log('📤 Headers para estadísticas:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // Obtener instalación por ID
  async getInstalacionById(id) {
    try {
      console.log('🔍 Obteniendo instalación ID:', id);
      
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo instalación:', error);
      throw error;
    }
  },

  // Crear nueva instalación
  async createInstalacion(datosInstalacion) {
    try {
      console.log('➕ Creando instalación:', datosInstalacion);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(datosInstalacion)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error creando instalación:', error);
      throw error;
    }
  },

  // Actualizar instalación
  async updateInstalacion(id, datosInstalacion) {
    try {
      console.log('📝 Actualizando instalación ID:', id, 'con datos:', datosInstalacion);
      
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(datosInstalacion)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error actualizando instalación:', error);
      throw error;
    }
  },

  // Cambiar estado de instalación
  async cambiarEstado(id, nuevoEstado, datosAdicionales = {}) {
    try {
      console.log('🔄 Cambiando estado instalación ID:', id, 'a:', nuevoEstado);
      
      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado: nuevoEstado,
          ...datosAdicionales
        })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  },

  // Eliminar instalación
  async deleteInstalacion(id) {
    try {
      console.log('🗑️ Eliminando instalación ID:', id);
      
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error eliminando instalación:', error);
      throw error;
    }
  },

  // Obtener instaladores disponibles
  async getInstaladores() {
    try {
      console.log('👷 Obteniendo instaladores');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/users?rol=instalador&activo=1`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo instaladores:', error);
      throw error;
    }
  },

  // Obtener clientes activos
  async getClientes(busqueda = '') {
    try {
      console.log('👥 Obteniendo clientes, búsqueda:', busqueda);
      
      const params = new URLSearchParams();
      if (busqueda) {
        params.append('busqueda', busqueda);
      }
      params.append('estado', 'activo');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/clients?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      throw error;
    }
  },

  // Obtener servicios de un cliente
  async getServiciosCliente(clienteId) {
    try {
      console.log('🔧 Obteniendo servicios del cliente:', clienteId);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/clients/${clienteId}/servicios`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo servicios del cliente:', error);
      throw error;
    }
  },

  // Obtener equipos disponibles
  async getEquiposDisponibles() {
    try {
      console.log('📦 Obteniendo equipos disponibles');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/inventory?estado=disponible&estado=asignado`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error obteniendo equipos:', error);
      throw error;
    }
  },

  // Reagendar instalación
  async reagendarInstalacion(id, nuevaFecha, nuevaHora, observaciones = '') {
    try {
      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado: 'reagendada',
          fecha_programada: nuevaFecha,
          hora_programada: nuevaHora,
          observaciones: observaciones
        })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error reagendando instalación:', error);
      throw error;
    }
  },

  // Completar instalación
  async completarInstalacion(id, datosCompletacion) {
    try {
      const {
        fecha_realizada,
        hora_inicio,
        hora_fin,
        equipos_instalados = [],
        fotos_instalacion = [],
        observaciones = '',
        coordenadas_lat,
        coordenadas_lng
      } = datosCompletacion;

      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado: 'completada',
          fecha_realizada,
          hora_inicio,
          hora_fin,
          equipos_instalados,
          fotos_instalacion,
          observaciones,
          coordenadas_lat,
          coordenadas_lng
        })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error completando instalación:', error);
      throw error;
    }
  },

  // Cancelar instalación
  async cancelarInstalacion(id, motivo = '') {
    try {
      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado: 'cancelada',
          observaciones: motivo
        })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error cancelando instalación:', error);
      throw error;
    }
  },

  // Iniciar instalación
  async iniciarInstalacion(id, hora_inicio = null, observaciones = '') {
    try {
      const response = await fetch(`${API_URL}/${id}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          estado: 'en_proceso',
          hora_inicio: hora_inicio || new Date().toTimeString().split(' ')[0].substring(0, 5),
          observaciones
        })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error iniciando instalación:', error);
      throw error;
    }
  },

  // Obtener instalaciones del instalador actual (para vista móvil)
  async getMisInstalaciones(filtros = {}) {
    try {
      // Se asume que el backend filtrará automáticamente por el instalador actual
      // basado en el token de autenticación
      return await this.getInstalaciones({
        ...filtros,
        solo_mis_instalaciones: true
      });
    } catch (error) {
      console.error('Error obteniendo mis instalaciones:', error);
      throw error;
    }
  },

  // Subir foto de instalación
  async subirFoto(archivo, instalacionId, descripcion = '') {
    try {
      const formData = new FormData();
      formData.append('foto', archivo);
      formData.append('descripcion', descripcion);
      formData.append('instalacion_id', instalacionId);

      // Para FormData no incluir Content-Type, obtener solo Authorization
      const token = localStorage.getItem('accessToken') || 
                    localStorage.getItem('token') || 
                    sessionStorage.getItem('accessToken') || 
                    sessionStorage.getItem('token');
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/instalaciones/${instalacionId}/fotos`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error subiendo foto:', error);
      throw error;
    }
  },

  // Exportar reporte de instalaciones
  async exportarReporte(filtros = {}, formato = 'excel') {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      params.append('formato', formato);

      const token = localStorage.getItem('accessToken') || 
                    localStorage.getItem('token') || 
                    sessionStorage.getItem('accessToken') || 
                    sessionStorage.getItem('token');
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/instalaciones/exportar?${params.toString()}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error('Error al exportar reporte');
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `instalaciones_${new Date().toISOString().split('T')[0]}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true, message: 'Reporte descargado exitosamente' };
    } catch (error) {
      console.error('Error exportando reporte:', error);
      throw error;
    }
  }
};

// Funciones auxiliares para el frontend
export const instalacionesHelpers = {
  // Formatear estado para mostrar
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

  // Obtener color CSS para estado
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

  // Obtener clases CSS para badge de estado
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

  // Formatear tipo de instalación
  formatearTipo(tipo) {
    const tipos = {
      'nueva': 'Nueva Instalación',
      'migracion': 'Migración',
      'upgrade': 'Actualización',
      'reparacion': 'Reparación'
    };
    return tipos[tipo] || tipo;
  },

  // Verificar si una instalación está vencida
  esVencida(fechaProgramada, estado) {
    if (['completada', 'cancelada'].includes(estado)) {
      return false;
    }
    const hoy = new Date();
    const fecha = new Date(fechaProgramada);
    return fecha < hoy;
  },

  // Calcular días desde programación
  diasDesdeProgramacion(fechaProgramada) {
    const hoy = new Date();
    const fecha = new Date(fechaProgramada);
    const diffTime = hoy - fecha;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Validar datos de instalación
  validarDatosInstalacion(datos) {
    const errores = [];

    if (!datos.cliente_id) {
      errores.push('El cliente es obligatorio');
    }

    if (!datos.servicio_cliente_id) {
      errores.push('El servicio del cliente es obligatorio');
    }

    if (!datos.fecha_programada) {
      errores.push('La fecha programada es obligatoria');
    } else {
      const fecha = new Date(datos.fecha_programada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha < hoy) {
        errores.push('La fecha programada no puede ser anterior a hoy');
      }
    }

    if (datos.telefono_contacto && !/^[0-9+\-\s()]{7,20}$/.test(datos.telefono_contacto)) {
      errores.push('El formato del teléfono de contacto no es válido');
    }

    if (datos.costo_instalacion && datos.costo_instalacion < 0) {
      errores.push('El costo de instalación no puede ser negativo');
    }

    return errores;
  }
};