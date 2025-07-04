// frontend/src/services/clientService.js - VERSIÓN CORREGIDA

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
  BY_IDENTIFICATION: '/clients/identification',
  EXPORT: '/clients/export' // Nuevo endpoint para exportar
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
      // Si la fecha viene como string, convertirla
      const fechaObj = new Date(fecha);
      
      // Agregar offset de timezone para corregir el desfase de un día
      const offsetMinutos = fechaObj.getTimezoneOffset();
      fechaObj.setMinutes(fechaObj.getMinutes() + offsetMinutos);
      
      return fechaObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error corrigiendo fecha:', error);
      return fecha;
    }
  }

  // CORRECCIÓN: Función para exportar clientes con fechas corregidas
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

      const response = await fetch(`${apiService.baseURL}${CLIENT_ENDPOINTS.EXPORT}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': formato === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('El archivo exportado está vacío');
      }

      // Generar nombre de archivo con fecha actual
      const fechaActual = new Date().toISOString().split('T')[0];
      const extension = formato === 'excel' ? 'xlsx' : 'csv';
      const nombreArchivo = `clientes_${fechaActual}.${extension}`;

      // Descargar archivo
      this.descargarArchivo(blob, nombreArchivo);

      this.log('Exportación exitosa', { nombreArchivo, tamaño: blob.size });
      
      return {
        success: true,
        message: `Archivo ${nombreArchivo} descargado exitosamente`
      };

    } catch (error) {
      this.log('Error en exportación', error);
      return {
        success: false,
        message: error.message || 'Error al exportar clientes'
      };
    }
  }

  // Función auxiliar para descargar archivos
  descargarArchivo(blob, nombreArchivo) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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

      // CORRECCIÓN: Procesar fechas correctamente
      if (key.includes('fecha') && typeof value === 'string') {
        // Asegurar formato correcto de fecha
        const fechaCorregida = this.corregirFechaUTC(value);
        if (fechaCorregida) {
          cleanedData[key] = fechaCorregida;
        }
      }
      // Limpiar strings
      else if (typeof value === 'string') {
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

      // CORRECCIÓN: Procesar fechas en la respuesta
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

      // CORRECCIÓN: Procesar fechas en cliente individual
      if (response.data) {
        response.data = {
          ...response.data,
          fecha_registro: this.corregirFechaUTC(response.data.fecha_registro),
          fecha_inicio_servicio: this.corregirFechaUTC(response.data.fecha_inicio_servicio),
          fecha_fin_servicio: this.corregirFechaUTC(response.data.fecha_fin_servicio),
          updated_at: response.data.updated_at ? new Date(response.data.updated_at).toLocaleString('es-CO') : null,
          created_at: response.data.created_at ? new Date(response.data.created_at).toLocaleString('es-CO') : null
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
      this.log('Creando cliente', clientData);

      const cleanData = this.cleanClientData(clientData);
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

      const cleanData = this.cleanClientData(clientData);
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

  // Obtener estadísticas
  async getStats() {
    try {
      this.log('Obteniendo estadísticas de clientes');

      const response = await apiService.get(CLIENT_ENDPOINTS.STATS);
      
      this.log('Estadísticas obtenidas', response);

      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      this.log('Error obteniendo estadísticas', error);
      return {
        success: false,
        data: null,
        message: error.message || 'Error al cargar estadísticas'
      };
    }
  }
}

// Exportar instancia única
export const clientService = new ClientService();
export default clientService;