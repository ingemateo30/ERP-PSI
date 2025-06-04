import apiService  from './apiService';

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

export const clientService = {
  // Obtener lista de clientes con filtros y paginación
  getClients: async (params = {}) => {
    try {
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
      const response = await apiService.get(url);
      
      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination || {},
        message: response.message
      };
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      return {
        success: false,
        data: [],
        pagination: {},
        message: error.message || 'Error al cargar clientes'
      };
    }
  },

  // Obtener cliente por ID
  getClientById: async (id) => {
    try {
      const response = await apiService.get(`${CLIENT_ENDPOINTS.DETAIL}/${id}`);
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al cargar cliente'
      };
    }
  },

  // Buscar clientes
  searchClients: async (searchTerm, filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', searchTerm);
      
      if (filters.estado) queryParams.append('estado', filters.estado);
      
      const url = `${CLIENT_ENDPOINTS.SEARCH}?${queryParams.toString()}`;
      const response = await apiService.get(url);
      
      return {
        success: true,
        data: response.data || [],
        message: response.message
      };
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Error en la búsqueda'
      };
    }
  },

  // Obtener estadísticas de clientes
  getClientStats: async () => {
    try {
      const response = await apiService.get(CLIENT_ENDPOINTS.STATS);
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        success: false,
        data: {},
        message: error.message || 'Error al cargar estadísticas'
      };
    }
  },

  // Crear nuevo cliente
  createClient: async (clientData) => {
    try {
      const response = await apiService.post(CLIENT_ENDPOINTS.CREATE, clientData);
      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente creado exitosamente'
      };
    } catch (error) {
      console.error('Error al crear cliente:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al crear cliente',
        errors: error.errors || []
      };
    }
  },

  // Actualizar cliente
  updateClient: async (id, clientData) => {
    try {
      const response = await apiService.put(`${CLIENT_ENDPOINTS.UPDATE}/${id}`, clientData);
      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al actualizar cliente',
        errors: error.errors || []
      };
    }
  },

  // Eliminar cliente
  deleteClient: async (id) => {
    try {
      const response = await apiService.delete(`${CLIENT_ENDPOINTS.DELETE}/${id}`);
      return {
        success: true,
        data: response.data,
        message: response.message || 'Cliente eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al eliminar cliente'
      };
    }
  },

  // Validar identificación
  validateIdentification: async (identificacion) => {
    try {
      const response = await apiService.get(`${CLIENT_ENDPOINTS.VALIDATE}/${identificacion}`);
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      console.error('Error al validar identificación:', error);
      return {
        success: false,
        data: { existe: false, cliente: null },
        message: error.message || 'Error al validar identificación'
      };
    }
  },

  // Obtener cliente por identificación
  getClientByIdentification: async (identificacion) => {
    try {
      const response = await apiService.get(`${CLIENT_ENDPOINTS.BY_IDENTIFICATION}/${identificacion}`);
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      console.error('Error al obtener cliente por identificación:', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Cliente no encontrado'
      };
    }
  }
};

export default clientService;