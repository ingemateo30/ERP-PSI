// frontend/src/services/clientService.js - VERSIÓN CORREGIDA COMPLETA

import apiService from './apiService';
import authService from './authService';

const CLIENT_ENDPOINTS = {
  LIST: '/clients',
  DETAIL: '/clients',
  CREATE: '/clients',
  UPDATE: '/clients',
  DELETE: '/clients',
  SEARCH: '/clients/search',
  STATS: '/clients/stats',
  VALIDATE: '/clients/validate',
  BY_IDENTIFICATION: '/clients/identification',
  EXPORT: '/clients/export'
};

class ClientService {
  constructor() {
    this.debug = process.env.NODE_ENV === 'development';
  }

  // Función de debug
  log(message, data) {
    if (this.debug) {
      console.log(`👤 ClientService: ${message}`, data);
    }
  }

  // CORRECCIÓN: Función para corregir fechas UTC
  corregirFechaUTC(fecha) {
    if (!fecha) return null;
    
    try {
      const fechaObj = new Date(fecha);
      const offsetMinutos = fechaObj.getTimezoneOffset();
      fechaObj.setMinutes(fechaObj.getMinutes() + offsetMinutos);
      return fechaObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error corrigiendo fecha:', error);
      return fecha;
    }
  }

  // CORRECCIÓN: Validar y limpiar datos del cliente
  validateAndCleanClientData(clientData) {
    const cleanedData = { ...clientData };

    // Validaciones requeridas
    const requiredFields = ['identificacion', 'nombre', 'telefono'];
    for (const field of requiredFields) {
      if (!cleanedData[field] || cleanedData[field].toString().trim() === '') {
        throw new Error(`El campo ${field} es requerido`);
      }
    }

    // Limpiar campos de texto
    if (cleanedData.nombre) cleanedData.nombre = cleanedData.nombre.trim();
    if (cleanedData.direccion) cleanedData.direccion = cleanedData.direccion.trim();
    if (cleanedData.email) cleanedData.email = cleanedData.email.trim().toLowerCase();

    // Validar email si existe
    if (cleanedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedData.email)) {
      throw new Error('El formato del email es inválido');
    }

    // Convertir campos numéricos
    if (cleanedData.sector_id) cleanedData.sector_id = parseInt(cleanedData.sector_id);
    if (cleanedData.ciudad_id) cleanedData.ciudad_id = parseInt(cleanedData.ciudad_id);
    if (cleanedData.estrato) cleanedData.estrato = parseInt(cleanedData.estrato);

    // Limpiar campos vacíos
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '' || cleanedData[key] === null || cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    this.log('Datos validados y limpiados', {
      original: clientData,
      cleaned: cleanedData
    });

    return cleanedData;
  }

  // Obtener lista de clientes con filtros y paginación
  async getClients(params = {}) {
    try {
      this.log('Obteniendo lista de clientes', params);

      const queryParams = new URLSearchParams();

      // Parámetros de paginación
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      // Filtros
      if (params.estado) queryParams.append('estado', params.estado);
      if (params.identificacion) queryParams.append('identificacion', params.identificacion);
      if (params.nombre) queryParams.append('nombre', params.nombre);
      if (params.sector_id) queryParams.append('sector_id', params.sector_id);
      if (params.ciudad_id) queryParams.append('ciudad_id', params.ciudad_id);
      if (params.telefono) queryParams.append('telefono', params.telefono);

      const url = `${CLIENT_ENDPOINTS.LIST}?${queryParams.toString()}`;
      this.log('URL de petición', url);

      const response = await apiService.get(url);
      this.log('Respuesta del servidor', response);

      // Procesar fechas en la respuesta
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map(cliente => ({
          ...cliente,
          fecha_registro: this.corregirFechaUTC(cliente.fecha_registro),
          fecha_inicio_servicio: this.corregirFechaUTC(cliente.fecha_inicio_servicio),
          fecha_fin_servicio: this.corregirFechaUTC(cliente.fecha_fin_servicio),
          updated_at: cliente.updated_at ? new Date(cliente.updated_at).toLocaleString('es-CO') : null,
          created_at: cliente.created_at ? new Date(cliente.created_at).toLocaleString('es-CO') : null
        }));
      }

      return {
        success: true,
        data: response.data,
        pagination: response.pagination,
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo clientes', error);
      return {
        success: false,
        data: [],
        pagination: null,
        message: error.message || 'Error al cargar clientes'
      };
    }
  }

  // CORRECCIÓN: Función para obtener estadísticas de clientes
  async getClientStats() {
    try {
      this.log('Obteniendo estadísticas de clientes');

      const response = await apiService.get(CLIENT_ENDPOINTS.STATS);
      this.log('Estadísticas obtenidas', response);

      return {
        success: true,
        data: response.data || response.message || {},
        message: response.message || 'Estadísticas cargadas exitosamente'
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas', error);
      return {
        success: false,
        data: {
          total: 0,
          activos: 0,
          suspendidos: 0,
          cortados: 0,
          retirados: 0,
          inactivos: 0,
          nuevos_hoy: 0,
          nuevos_semana: 0,
          nuevos_mes: 0
        },
        message: error.message || 'Error al cargar estadísticas'
      };
    }
  }

  // Obtener cliente por ID
  async getClientById(id) {
    try {
      this.log('Obteniendo cliente por ID', id);

      if (!id) {
        throw new Error('ID de cliente requerido');
      }

      const response = await apiService.get(`${CLIENT_ENDPOINTS.DETAIL}/${id}`);
      this.log('Cliente obtenido', response);

      // Corregir fechas en la respuesta
      if (response.data) {
        response.data = {
          ...response.data,
          fecha_registro: this.corregirFechaUTC(response.data.fecha_registro),
          fecha_inicio_servicio: this.corregirFechaUTC(response.data.fecha_inicio_servicio),
          fecha_fin_servicio: this.corregirFechaUTC(response.data.fecha_fin_servicio)
        };
      }

      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo cliente', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al cargar cliente'
      };
    }
  }

  // Crear nuevo cliente
  async createClient(clientData) {
    try {
      this.log('Creando nuevo cliente', clientData);

      const cleanData = this.validateAndCleanClientData(clientData);
      const response = await apiService.post(CLIENT_ENDPOINTS.CREATE, cleanData);
      
      this.log('Cliente creado', response);

      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente creado exitosamente'
      };
    } catch (error) {
      this.log('Error creando cliente', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al crear cliente'
      };
    }
  }

  // Actualizar cliente
  async updateClient(id, clientData) {
    try {
      this.log('Actualizando cliente', { id, clientData });

      if (!id) {
        throw new Error('ID de cliente requerido');
      }

      const cleanData = this.validateAndCleanClientData(clientData);
      const response = await apiService.put(`${CLIENT_ENDPOINTS.UPDATE}/${id}`, cleanData);
      
      this.log('Cliente actualizado', response);

      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente actualizado exitosamente'
      };
    } catch (error) {
      this.log('Error actualizando cliente', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al actualizar cliente'
      };
    }
  }

  // Eliminar cliente
  async deleteClient(id) {
    try {
      this.log('Eliminando cliente', id);

      if (!id) {
        throw new Error('ID de cliente requerido');
      }

      const response = await apiService.delete(`${CLIENT_ENDPOINTS.DELETE}/${id}`);
      this.log('Cliente eliminado', response);

      return {
        success: true,
        message: response.message || 'Cliente eliminado exitosamente'
      };
    } catch (error) {
      this.log('Error eliminando cliente', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar cliente'
      };
    }
  }

  // Buscar clientes
  async buscarClientes(termino) {
    try {
      this.log('Buscando clientes', termino);

      if (!termino || termino.length < 2) {
        return {
          success: true,
          data: [],
          message: 'Término de búsqueda muy corto'
        };
      }

      const response = await apiService.get(`${CLIENT_ENDPOINTS.SEARCH}?q=${encodeURIComponent(termino)}`);
      this.log('Resultados de búsqueda', response);

      return {
        success: true,
        data: response.data || [],
        message: response.message
      };
    } catch (error) {
      this.log('Error en búsqueda', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Error en la búsqueda'
      };
    }
  }

  // Validar cliente por identificación
  async validateClientByIdentification(identificacion) {
    try {
      this.log('Validando cliente por identificación', identificacion);

      if (!identificacion) {
        throw new Error('Identificación requerida');
      }

      const response = await apiService.get(`${CLIENT_ENDPOINTS.BY_IDENTIFICATION}/${identificacion}`);
      this.log('Validación completada', response);

      return {
        success: true,
        data: response.data,
        exists: !!response.data,
        message: response.message
      };
    } catch (error) {
      this.log('Error validando cliente', error);
      return {
        success: false,
        data: null,
        exists: false,
        message: error.message || 'Error en validación'
      };
    }
  }

  // CORRECCIÓN: Exportar clientes
 // CORRECCIÓN: Método exportClients usando authService
async exportClients(formato = 'excel', filtros = {}) {
  try {
    this.log('Exportando clientes', { formato, filtros });

    const queryParams = new URLSearchParams();
    
    // Agregar filtros
    if (filtros.estado) queryParams.append('estado', filtros.estado);
    if (filtros.sector_id) queryParams.append('sector_id', filtros.sector_id);
    if (filtros.ciudad_id) queryParams.append('ciudad_id', filtros.ciudad_id);
    if (filtros.fechaInicio) queryParams.append('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) queryParams.append('fechaFin', filtros.fechaFin);
    
    // Agregar formato
    queryParams.append('format', formato);

    // CORREGIDO: Usar authService en lugar de localStorage directo
    const token = authService.getToken();
    if (!token) {
      throw new Error('Token de autenticación requerido');
    }

    this.log('Token obtenido', { hasToken: !!token });

    const response = await fetch(`${apiService.baseURL}${CLIENT_ENDPOINTS.EXPORT}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': formato === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      }
    });

    this.log('Respuesta del servidor', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    // MEJORADO: Manejo de errores más específico
    if (!response.ok) {
      if (response.status === 401) {
        // Token expirado o inválido
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('No tienes permisos para exportar clientes.');
      } else if (response.status === 404) {
        throw new Error('Endpoint de exportación no encontrado.');
      } else {
        // Intentar obtener el mensaje de error del servidor
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } catch (jsonError) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('El archivo exportado está vacío');
    }

    // Generar nombre de archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const extension = formato === 'excel' ? 'xlsx' : 'csv';
    const filename = `clientes_${fechaActual}.${extension}`;

    // Crear URL de descarga
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.log('Exportación completada', { filename, size: blob.size });

    return {
      success: true,
      message: `Archivo ${filename} descargado exitosamente`
    };
  } catch (error) {
    this.log('Error en exportación', error);
    return {
      success: false,
      message: error.message || 'Error en la exportación'
    };
  }
}
  // Alias para compatibilidad
  async getStats() {
    return this.getClientStats();
  }
}

// Exportar instancia única
export const clientService = new ClientService();
export default clientService;