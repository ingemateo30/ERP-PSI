// frontend/src/services/clientService.js - VERSIÓN COMPLETA ACTUALIZADA

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
  // NUEVO: Endpoint para crear cliente con múltiples servicios
  CREATE_WITH_SERVICES: '/clients/clientes-con-servicios'
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
      throw new Error('El formato del email no es válido');
    }

    // Validar identificación (solo números)
    if (cleanedData.identificacion && !/^\d+$/.test(cleanedData.identificacion.toString())) {
      throw new Error('La identificación debe contener solo números');
    }

    // Validar teléfono (solo números y espacios)
    if (cleanedData.telefono && !/^[\d\s\-\+\(\)]+$/.test(cleanedData.telefono)) {
      throw new Error('El teléfono contiene caracteres no válidos');
    }

    return cleanedData;
  }

  // Manejo de errores mejorado
  handleError(error) {
    this.log('Error capturado', error);

    let mensaje = 'Error desconocido';

    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          mensaje = data.message || 'Datos inválidos';
          break;
        case 401:
          mensaje = 'Sesión expirada. Inicia sesión nuevamente';
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

  // ==========================================
  // MÉTODOS PRINCIPALES DEL SERVICIO
  // ==========================================

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

      return response;
    } catch (error) {
      this.log('Error obteniendo clientes', error);
      throw this.handleError(error);
    }
  }

  // Obtener cliente por ID
  async getClient(id) {
    try {
      if (!id) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Obteniendo cliente por ID', id);

      const response = await apiService.get(`${CLIENT_ENDPOINTS.DETAIL}/${id}`);
      this.log('Cliente obtenido', response);

      // Procesar fechas si es necesario
      if (response.data) {
        response.data = {
          ...response.data,
          fecha_registro: this.corregirFechaUTC(response.data.fecha_registro),
          fecha_inicio_servicio: this.corregirFechaUTC(response.data.fecha_inicio_servicio),
          fecha_fin_servicio: this.corregirFechaUTC(response.data.fecha_fin_servicio)
        };
      }

      return response;
    } catch (error) {
      this.log('Error obteniendo cliente', error);
      throw this.handleError(error);
    }
  }

  // Crear cliente nuevo
  async createClient(clientData) {
    try {
      this.log('Creando nuevo cliente', clientData);

      // Validar y limpiar datos
      const cleanedData = this.validateAndCleanClientData(clientData);

      const response = await apiService.post(CLIENT_ENDPOINTS.CREATE, cleanedData);
      this.log('Cliente creado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error creando cliente', error);
      throw this.handleError(error);
    }
  }

  // NUEVO: Crear cliente con múltiples servicios
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

  // Actualizar cliente existente
  async updateClient(id, clientData) {
    try {
      if (!id) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Actualizando cliente', { id, clientData });

      // Validar y limpiar datos
      const cleanedData = this.validateAndCleanClientData(clientData);

      const response = await apiService.put(`${CLIENT_ENDPOINTS.UPDATE}/${id}`, cleanedData);
      this.log('Cliente actualizado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error actualizando cliente', error);
      throw this.handleError(error);
    }
  }

  // Eliminar cliente
  async deleteClient(id) {
    try {
      if (!id) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Eliminando cliente', id);

      const response = await apiService.delete(`${CLIENT_ENDPOINTS.DELETE}/${id}`);
      this.log('Cliente eliminado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error eliminando cliente', error);
      throw this.handleError(error);
    }
  }

  // Inactivar cliente
  async inactivarCliente(id, data = {}) {
    try {
      if (!id) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Inactivando cliente', { id, data });

      const response = await apiService.patch(`${CLIENT_ENDPOINTS.DETAIL}/${id}/inactivar`, data);
      this.log('Cliente inactivado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error inactivando cliente', error);
      throw this.handleError(error);
    }
  }

  // Reactivar cliente
  async reactivarCliente(id, data = {}) {
    try {
      if (!id) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Reactivando cliente', { id, data });

      const response = await apiService.patch(`${CLIENT_ENDPOINTS.DETAIL}/${id}/reactivar`, data);
      this.log('Cliente reactivado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error reactivando cliente', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // MÉTODOS DE CONSULTA Y BÚSQUEDA
  // ==========================================

  // Buscar clientes
  async searchClients(query, filters = {}) {
    try {
      this.log('Buscando clientes', { query, filters });

      const params = {
        q: query,
        ...filters
      };

      const response = await apiService.get(CLIENT_ENDPOINTS.SEARCH, { params });
      this.log('Resultados de búsqueda', response);

      return response;
    } catch (error) {
      this.log('Error en búsqueda', error);
      throw this.handleError(error);
    }
  }

  // Buscar cliente por identificación
  async getClientByIdentification(identificacion) {
    try {
      if (!identificacion) {
        throw new Error('La identificación es requerida');
      }

      this.log('Buscando cliente por identificación', identificacion);

      const response = await apiService.get(`${CLIENT_ENDPOINTS.BY_IDENTIFICATION}/${identificacion}`);
      this.log('Cliente encontrado por identificación', response);

      return response;
    } catch (error) {
      this.log('Error buscando por identificación', error);
      throw this.handleError(error);
    }
  }

  // Validar datos del cliente
  async validateClient(clientData) {
    try {
      this.log('Validando datos del cliente', clientData);

      const response = await apiService.post(CLIENT_ENDPOINTS.VALIDATE, clientData);
      this.log('Validación completada', response);

      return response;
    } catch (error) {
      this.log('Error en validación', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // GESTIÓN DE SERVICIOS DEL CLIENTE
  // ==========================================

  // Obtener servicios de un cliente
  async getClientServices(clienteId) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Obteniendo servicios del cliente', clienteId);

      const response = await apiService.get(`${CLIENT_ENDPOINTS.DETAIL}/${clienteId}/servicios`);
      this.log('Servicios obtenidos', response);

      return response;
    } catch (error) {
      this.log('Error obteniendo servicios', error);
      throw this.handleError(error);
    }
  }

  // Agregar servicio a cliente existente
  async addServiceToClient(clienteId, servicioData) {
    try {
      if (!clienteId) {
        throw new Error('ID del cliente es requerido');
      }

      this.log('Agregando servicio al cliente', { clienteId, servicioData });

      const response = await apiService.post(`${CLIENT_ENDPOINTS.DETAIL}/${clienteId}/servicios`, servicioData);
      this.log('Servicio agregado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error agregando servicio', error);
      throw this.handleError(error);
    }
  }

  // Cambiar plan de servicio
  async cambiarPlanCliente(clienteId, servicioId, nuevosPlanData) {
    try {
      if (!clienteId || !servicioId) {
        throw new Error('ID del cliente y servicio son requeridos');
      }

      this.log('Cambiando plan del servicio', { clienteId, servicioId, nuevosPlanData });

      const response = await apiService.put(
        `${CLIENT_ENDPOINTS.DETAIL}/${clienteId}/servicios/${servicioId}/cambiar-plan`, 
        nuevosPlanData
      );
      this.log('Plan cambiado exitosamente', response);

      return response;
    } catch (error) {
      this.log('Error cambiando plan', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================

  // Obtener estadísticas de clientes
  async getClientStats() {
    try {
      this.log('Obteniendo estadísticas de clientes');

      const response = await apiService.get(CLIENT_ENDPOINTS.STATS);
      this.log('Estadísticas obtenidas', response);

      return response;
    } catch (error) {
      this.log('Error obteniendo estadísticas', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // EXPORTACIÓN
  // ==========================================

  // Exportar clientes
  async exportClients(params = {}) {
    try {
      this.log('Exportando clientes', params);

      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `${CLIENT_ENDPOINTS.EXPORT}?${queryParams.toString()}`;
      this.log('URL de exportación', url);

      // Para exportación, necesitamos usar un método especial que maneje archivos
      const response = await apiService.getBlob(url);
      
      // Determinar tipo de archivo y nombre
      const contentType = response.headers['content-type'] || '';
      const isExcel = contentType.includes('spreadsheet') || contentType.includes('excel');
      const extension = isExcel ? 'xlsx' : 'csv';
      
      // Generar nombre de archivo con fecha actual
      const fechaActual = new Date().toISOString().split('T')[0];
      const filename = `clientes_${fechaActual}.${extension}`;

      // Crear URL de descarga
      const blob = response.data;
      const url_download = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url_download;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_download);

      this.log('Exportación completada', { filename, size: blob.size });

      return {
        success: true,
        message: `Archivo ${filename} descargado exitosamente`
      };
    } catch (error) {
      this.log('Error en exportación', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // MÉTODOS DE COMPATIBILIDAD
  // ==========================================

  // Alias para compatibilidad con versiones anteriores
  async getStats() {
    return this.getClientStats();
  }

  async getAll(params) {
    return this.getClients(params);
  }

  async getById(id) {
    return this.getClient(id);
  }

  async create(data) {
    return this.createClient(data);
  }

  async update(id, data) {
    return this.updateClient(id, data);
  }

  async delete(id) {
    return this.deleteClient(id);
  }

  async search(query, filters) {
    return this.searchClients(query, filters);
  }

  async export(params) {
    return this.exportClients(params);
  }
}

// Exportar instancia única
export const clientService = new ClientService();
export default clientService;