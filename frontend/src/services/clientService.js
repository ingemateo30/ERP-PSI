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
  EXPORT: '/clients/export',
  CREATE_WITH_SERVICES: '/clients/clientes-con-servicios',
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
      return `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,'0')}-${String(fechaObj.getDate()).padStart(2,'0')}`;
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
handleError(error, operacion = 'operación') {
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
          mensaje = 'Cliente no encontrado';
          break;
        case 409:
          mensaje = 'Conflicto en los datos';
          break;
        case 429:
          mensaje = 'Demasiadas solicitudes. Intenta de nuevo más tarde';
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
 // Obtener lista de clientes con filtros y paginación
async getClients(params = {}) {
  try {
    this.log('Obteniendo lista de clientes', params);
    
    // Detectar si es instalador
    const user = authService.getCurrentUserInfo();
    
    if (user?.rol === 'instalador') {
      this.log('Usuario instalador detectado, usando endpoint específico');
      return this.getMisClientes();
    }

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

    return response;
  } catch (error) {
    this.log('Error obteniendo clientes', error);
    throw this.handleError(error, 'obtener clientes');
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
// Obtener clientes del instalador actual
async getMisClientes() {
  try {
    this.log('Obteniendo mis clientes como instalador');
    
    const user = authService.getCurrentUserInfo();
    
    if (user?.rol === 'instalador') {
      // Usar endpoint específico de instalador
      const response = await apiService.get('/instalador/mis-clientes');
      this.log('Respuesta mis-clientes', response);
      
      if (response.success) {
        return {
          success: true,
          data: response.clientes || [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: response.clientes?.length || 0,
            itemsPerPage: response.clientes?.length || 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
      }
    }
    
    // Fallback a método normal
    return this.getClients();
  } catch (error) {
    this.log('Error obteniendo mis clientes', error);
    throw this.handleError(error, 'obtener clientes');
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

  async inactivarCliente(clienteId, datos) {
    try {
      this.log('Inactivando cliente', { clienteId, datos });

      const response = await apiService.put(`/clients/${clienteId}/inactivar`, datos);

      if (response.success) {
        this.log('Cliente inactivado exitosamente', response);
        return response;
      } else {
        throw new Error(response.message || 'Error al inactivar cliente');
      }

    } catch (error) {
      this.log('Error inactivando cliente', error);
      throw this.handleError(error, 'inactivar cliente');
    }
  }

  /**
   * Obtener clientes inactivos
   */
  async getClientesInactivos(params = {}) {
    try {
      this.log('Obteniendo clientes inactivos', params);

      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);

      const url = `/clients/inactivos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(url);

      if (response.success) {
        this.log('Clientes inactivos obtenidos', response);
        return response;
      } else {
        throw new Error(response.message || 'Error obteniendo clientes inactivos');
      }

    } catch (error) {
      this.log('Error obteniendo clientes inactivos', error);
      throw this.handleError(error, 'obtener clientes inactivos');
    }
  }

  /**
   * Reactivar cliente inactivo
   */
  async reactivarCliente(clienteId, datos = {}) {
    try {
      this.log('Reactivando cliente', { clienteId, datos });

      const response = await apiService.put(`/clients/${clienteId}/reactivar`, datos);

      if (response.success) {
        this.log('Cliente reactivado exitosamente', response);
        return response;
      } else {
        throw new Error(response.message || 'Error al reactivar cliente');
      }

    } catch (error) {
      this.log('Error reactivando cliente', error);
      throw this.handleError(error, 'reactivar cliente');
    }
  }

  /**
   * Cambiar estado de un cliente manualmente (admin)
   */
  async cambiarEstadoCliente(clienteId, { nuevo_estado, motivo, observaciones }) {
    try {
      this.log('Cambiando estado de cliente', { clienteId, nuevo_estado, motivo });
      const response = await apiService.put(`/clients/${clienteId}/cambiar-estado`, {
        nuevo_estado, motivo, observaciones
      });
      if (response.success) {
        this.log('Estado cambiado exitosamente', response);
        return response;
      } else {
        throw new Error(response.message || 'Error al cambiar estado del cliente');
      }
    } catch (error) {
      this.log('Error cambiando estado', error);
      throw this.handleError(error, 'cambiar estado del cliente');
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
 /**
   * Obtener ciudades para formularios
   */
  async getCiudades() {
    try {
      this.log('Obteniendo ciudades');
      
      const response = await apiService.get('/config/cities');
      
      this.log('Ciudades obtenidas', response);
      
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      this.log('Error obteniendo ciudades', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Error obteniendo ciudades'
      };
    }
  }

  /**
   * Obtener sectores para formularios
   */
  async getSectores() {
    try {
      this.log('Obteniendo sectores');
      
      const response = await apiService.get('/config/sectors');
      
      this.log('Sectores obtenidos', response);
      
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      this.log('Error obteniendo sectores', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Error obteniendo sectores'
      };
    }
  }

  /**
   * Obtener sectores por ciudad
   */
  async getSectoresPorCiudad(ciudadId) {
    try {
      this.log('Obteniendo sectores por ciudad', ciudadId);
      
      if (!ciudadId) {
        return {
          success: true,
          data: []
        };
      }
      
      const response = await apiService.get(`/config/sectors?ciudad_id=${ciudadId}`);
      
      this.log('Sectores por ciudad obtenidos', response);
      
      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      this.log('Error obteniendo sectores por ciudad', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Error obteniendo sectores'
      };
    }
  }

  async getBarriosPorCiudad(ciudadId) {
    try {
      if (!ciudadId) return { success: true, data: [] };
      const response = await apiService.get(`/clientes/barrios?ciudad_id=${ciudadId}`);
      return { success: true, data: response.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

async createClientWithServices(data) {
    try {
      this.log('Creando cliente con múltiples servicios', data);

      // Validar datos del cliente
      if (!data.datosCliente) {
        throw new Error('Los datos del cliente son requeridos');
      }

      if (!data.servicios || !Array.isArray(data.servicios) || data.servicios.length === 0) {
        throw new Error('Debe proporcionar al menos un servicio');
      }

      // Validar y limpiar datos del cliente
      const datosClienteLimpios = this.validateAndCleanClientData(data.datosCliente);

      // Validar servicios
      const serviciosValidados = data.servicios.map((servicio, index) => {
        if (!servicio.planInternetId && !servicio.planTelevisionId) {
          throw new Error(`El servicio ${index + 1} debe tener al menos Internet o Televisión`);
        }

        if (!servicio.direccionServicio || !servicio.direccionServicio.trim()) {
          throw new Error(`El servicio ${index + 1} debe tener una dirección de servicio`);
        }

        return {
          ...servicio,
          direccionServicio: servicio.direccionServicio.trim(),
          nombreSede: servicio.nombreSede ? servicio.nombreSede.trim() : '',
          contactoSede: servicio.contactoSede ? servicio.contactoSede.trim() : '',
          observaciones: servicio.observaciones ? servicio.observaciones.trim() : ''
        };
      });

      const payload = {
        datosCliente: datosClienteLimpios,
        servicios: serviciosValidados
      };

      this.log('Payload final para crear cliente con servicios', payload);

      const response = await apiService.post(CLIENT_ENDPOINTS.CREATE_WITH_SERVICES, payload);
      this.log('Cliente con servicios creado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error creando cliente con servicios', error);
      throw this.handleError(error);
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