// frontend/src/services/clientService.js - VERSIÓN CORREGIDA CON DEBUG

import apiService from './apiService';

const CLIENT_ENDPOINTS = {
  LIST: '/clients',
  DETAIL: '/clients',
  CREATE: '/clients',
  UPDATE: '/clients',
  DELETE: '/clients',
  SEARCH: '/clients/search',
  STATS: '/clients/stats',
  VALIDATE: '/clients/validate',
  BY_IDENTIFICATION: '/clients/identification'
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

  // Limpiar y validar datos de cliente antes de enviar
  cleanClientData(clientData) {
    if (!clientData || typeof clientData !== 'object') {
      throw new Error('Datos de cliente inválidos');
    }

    const cleanedData = {};

    // Procesar cada campo
    Object.keys(clientData).forEach(key => {
      const value = clientData[key];

      // Saltar valores nulos, undefined o cadenas vacías
      if (value === null || value === undefined || value === '') {
        return;
      }

      // Limpiar strings
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          cleanedData[key] = trimmed;
        }
      }
      // Convertir números
      else if (key === 'sector_id' || key === 'ciudad_id') {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue > 0) {
          cleanedData[key] = numValue;
        }
      }
      // Convertir booleanos
      else if (key === 'requiere_reconexion') {
        cleanedData[key] = Boolean(value);
      }
      // Otros valores
      else {
        cleanedData[key] = value;
      }
    });

    // Validaciones básicas
    if (!cleanedData.identificacion || cleanedData.identificacion.length < 5) {
      throw new Error('La identificación es requerida y debe tener al menos 5 caracteres');
    }

    if (!cleanedData.nombre || cleanedData.nombre.length < 3) {
      throw new Error('El nombre es requerido y debe tener al menos 3 caracteres');
    }

    if (!cleanedData.direccion || cleanedData.direccion.length < 5) {
      throw new Error('La dirección es requerida y debe tener al menos 5 caracteres');
    }

    // Asegurar valores por defecto
    if (!cleanedData.tipo_documento) {
      cleanedData.tipo_documento = 'cedula';
    }

    if (!cleanedData.estado) {
      cleanedData.estado = 'activo';
    }

    if (!cleanedData.fecha_registro) {
      cleanedData.fecha_registro = new Date().toISOString().split('T')[0];
    }

    this.log('Datos de cliente limpiados', {
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

      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo clientes', error);
      return {
        success: false,
        data: [],
        pagination: {},
        message: error.message || 'Error al cargar clientes'
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

  // Buscar clientes
  async searchClients(searchTerm, filters = {}) {
    try {
      this.log('Buscando clientes', { searchTerm, filters });

      if (!searchTerm || searchTerm.trim().length < 2) {
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
      }

      const queryParams = new URLSearchParams();
      queryParams.append('q', searchTerm.trim());

      if (filters.estado) queryParams.append('estado', filters.estado);

      const url = `${CLIENT_ENDPOINTS.SEARCH}?${queryParams.toString()}`;
      const response = await apiService.get(url);

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

  // Obtener estadísticas de clientes
  async getClientStats() {
    try {
      this.log('Obteniendo estadísticas de clientes');

      const response = await apiService.get(CLIENT_ENDPOINTS.STATS);

      this.log('Estadísticas obtenidas', response);

      return {
        success: true,
        data: response.data || {},
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas', error);
      return {
        success: false,
        data: {},
        message: error.message || 'Error al cargar estadísticas'
      };
    }
  }

  // Crear nuevo cliente
  async createClient(clientData) {
    try {
      this.log('Creando nuevo cliente', clientData);

      const cleanedData = this.cleanClientData(clientData);
      
      this.log('Datos limpiados para crear cliente', cleanedData);

      const response = await apiService.post(CLIENT_ENDPOINTS.CREATE, cleanedData);

      this.log('Cliente creado exitosamente', response);

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
        message: error.message || 'Error al crear cliente',
        errors: error.response?.errors || []
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

      // Para actualización, usamos limpieza menos estricta
      const cleanedData = {};
      
      Object.keys(clientData).forEach(key => {
        const value = clientData[key];
        
        // Solo incluir valores que no estén vacíos
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'sector_id' || key === 'ciudad_id') {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              cleanedData[key] = numValue;
            }
          } else if (key === 'requiere_reconexion') {
            cleanedData[key] = Boolean(value);
          } else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
              cleanedData[key] = trimmed;
            }
          } else {
            cleanedData[key] = value;
          }
        }
      });

      this.log('Datos limpiados para actualizar cliente', cleanedData);

      const response = await apiService.put(`${CLIENT_ENDPOINTS.UPDATE}/${id}`, cleanedData);

      this.log('Cliente actualizado exitosamente', response);

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
        message: error.message || 'Error al actualizar cliente',
        errors: error.response?.errors || []
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

      this.log('Cliente eliminado exitosamente', response);

      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente eliminado exitosamente'
      };
    } catch (error) {
      this.log('Error eliminando cliente', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al eliminar cliente'
      };
    }
  }

  // Validar identificación
  async validateIdentification(identificacion) {
    try {
      this.log('Validando identificación', identificacion);

      if (!identificacion || identificacion.trim().length < 5) {
        throw new Error('Identificación requerida');
      }

      const response = await apiService.get(`${CLIENT_ENDPOINTS.VALIDATE}/${identificacion.trim()}`);

      this.log('Validación de identificación', response);

      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      this.log('Error validando identificación', error);
      return {
        success: false,
        data: { existe: false, cliente: null },
        message: error.message || 'Error al validar identificación'
      };
    }
  }

  // Obtener cliente por identificación
  async getClientByIdentification(identificacion) {
    try {
      this.log('Obteniendo cliente por identificación', identificacion);

      if (!identificacion || identificacion.trim().length < 5) {
        throw new Error('Identificación requerida');
      }

      const response = await apiService.get(`${CLIENT_ENDPOINTS.BY_IDENTIFICATION}/${identificacion.trim()}`);

      this.log('Cliente obtenido por identificación', response);

      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo cliente por identificación', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Cliente no encontrado'
      };
    }
  }
}

// Crear instancia del servicio
export const clientService = new ClientService();

export default clientService;