// frontend/src/services/apiService.js - SERVICIOS CORREGIDOS

import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Método genérico para hacer peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = authService.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Para cookies httpOnly
      ...options,
    };

    // Agregar token de autorización si existe
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      // Si es 401, intentar refrescar token una vez
      if (response.status === 401 && token && !options._isRetry) {
        try {
          await authService.refreshToken();
          // Reintentar la petición original
          return this.request(endpoint, { ...options, _isRetry: true });
        } catch (refreshError) {
          // Si falla el refresh, redirigir al login
          authService.removeToken();
          window.location.href = '/login';
          throw new Error('Sesión expirada');
        }
      }

      // CORREGIDO: Verificar si la respuesta es binaria (PDF, imágenes, etc.)
      const contentType = response.headers.get('Content-Type') || '';
      const isBlob = contentType.includes('application/pdf') || 
                    contentType.includes('application/octet-stream') ||
                    contentType.includes('image/') ||
                    contentType.includes('video/') ||
                    contentType.includes('audio/') ||
                    options.responseType === 'blob';

      let data;
      
      if (isBlob) {
        // Para respuestas binarias, usar blob()
        data = await response.blob();
      } else {
        // Para respuestas JSON normales
        data = await response.json();
      }

      if (!response.ok) {
        // Si es un blob con error, intentar convertir a JSON para obtener el mensaje
        if (isBlob && data.type === 'application/json') {
          try {
            const errorText = await data.text();
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
          } catch (parseError) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
        }
        
        // Mejor manejo de errores de validación para respuestas JSON
        if (!isBlob && data.validationErrors) {
          const error = new Error(data.message || 'Error de validación');
          error.validationErrors = data.validationErrors;
          throw error;
        }
        
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }

      // CORREGIDO: Para respuestas blob, devolver un objeto con información útil
      if (isBlob) {
        return {
          data: data,
          headers: response.headers,
          status: response.status,
          type: contentType
        };
      }

      return data;
    } catch (error) {
      console.error('Error en petición API:', error);
      throw error;
    }
  }

  // Métodos HTTP específicos
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
    });
  }

  // NUEVO: Método específico para descargar PDFs y archivos
  async getBlob(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*'
      }
    });
  }

async post(endpoint, data = {}) {
  let body;
  if (data instanceof FormData) {
    body = data; // FormData no necesita serialización
  } else if (typeof data === 'string') {
    body = data; // Ya es string, no serializar
  } else {
    body = JSON.stringify(data); // Solo serializar objects
  }
  
  return this.request(endpoint, {
    method: 'POST',
    body: body
  });
}

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Método para subir archivos
  async upload(endpoint, formData) {
    const token = authService.getToken();
    
    const config = {
      method: 'POST',
      body: formData,
      credentials: 'include',
    };

    // No establecer Content-Type para FormData (se establece automáticamente)
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (response.status === 401 && token) {
        try {
          await authService.refreshToken();
          // Reintentar con nuevo token
          const newToken = authService.getToken();
          config.headers.Authorization = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            throw new Error(retryData.message || 'Error en upload');
          }
          
          return retryData;
        } catch (refreshError) {
          authService.removeToken();
          window.location.href = '/login';
          throw new Error('Sesión expirada');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en upload');
      }

      return data;
    } catch (error) {
      console.error('Error en upload:', error);
      throw error;
    }
  }
}

// Crear instancia del servicio
const apiService = new ApiService();

// SERVICIOS CORREGIDOS PARA USUARIOS
export const usersService = {
  // CORREGIDO: Función para obtener todos los usuarios
  getAll: (params) => {
    console.log('🔍 Obteniendo usuarios con parámetros:', params);
    return apiService.get('/users', params);
  },
  
  getById: (id) => {
    console.log('🔍 Obteniendo usuario por ID:', id);
    return apiService.get(`/users/${id}`);
  },
  
  create: (data) => {
    console.log('➕ Creando usuario:', data);
    return apiService.post('/users', data);
  },
  
  update: (id, data) => {
    console.log('✏️ Actualizando usuario:', id, data);
    return apiService.put(`/users/${id}`, data);
  },
  
  delete: (id) => {
    console.log('🗑️ Eliminando usuario:', id);
    return apiService.delete(`/users/${id}`);
  },
  
  // CORREGIDO: Función para cambiar contraseña
  changePassword: (id, passwordData) => {
    console.log('🔑 Cambiando contraseña para usuario:', id);
    return apiService.post(`/users/${id}/change-password`, passwordData);
  },
  
  // CORREGIDO: Función para cambiar estado
  toggleStatus: (id) => {
    console.log('🔄 Cambiando estado de usuario:', id);
    return apiService.post(`/users/${id}/toggle-status`);
  },
  
  getStats: () => {
    console.log('📊 Obteniendo estadísticas de usuarios');
    return apiService.get('/users/stats');
  },
  
  // Perfil del usuario actual
  getProfile: () => {
    console.log('👤 Obteniendo perfil del usuario actual');
    return apiService.get('/users/profile');
  },
  
  updateProfile: (data) => {
    console.log('👤 Actualizando perfil:', data);
    return apiService.put('/users/profile', data);
  },
  
  // CORREGIDO: Función para cambiar contraseña propia
  changeOwnPassword: (passwordData) => {
    console.log('🔑 Cambiando contraseña propia');
    return apiService.post('/users/profile/change-password', passwordData);
  }
};

export const clientsService = {
  getAll: (params) => apiService.get('/clients', params),
  getById: (id) => apiService.get(`/clients/${id}`),
  create: (data) => apiService.post('/clients', data),
  update: (id, data) => apiService.put(`/clients/${id}`, data),
  delete: (id) => apiService.delete(`/clients/${id}`),
  changeStatus: (id, status, motivo) => apiService.patch(`/clients/${id}/status`, { status, motivo }),
  getStats: () => apiService.get('/clients/stats'),
};

export const invoicesService = {
  getAll: (params) => apiService.get('/invoices', params),
  getById: (id) => apiService.get(`/invoices/${id}`),
  create: (data) => apiService.post('/invoices', data),
  update: (id, data) => apiService.put(`/invoices/${id}`, data),
  delete: (id) => apiService.delete(`/invoices/${id}`),
  getByClient: (clientId, params) => apiService.get(`/clients/${clientId}/invoices`, params),
  markAsPaid: (id, paymentData) => apiService.patch(`/invoices/${id}/pay`, paymentData),
  generatePDF: (id) => apiService.getBlob(`/invoices/${id}/pdf`), // CORREGIDO: Usar getBlob
};

export const paymentsService = {
  getAll: (params) => apiService.get('/payments', params),
  getById: (id) => apiService.get(`/payments/${id}`),
  create: (data) => apiService.post('/payments', data),
  update: (id, data) => apiService.put(`/payments/${id}`, data),
  delete: (id) => apiService.delete(`/payments/${id}`),
  getByClient: (clientId, params) => apiService.get(`/clients/${clientId}/payments`, params),
};

export const servicesService = {
   getServicePlans: (params) => apiService.get('/config/service-plans', params),
  getServicePlanStats: () => apiService.get('/config/service-plans/stats'),
  getServicePlanById: (id) => apiService.get(`/config/service-plans/${id}`),
  createServicePlan: (data) => apiService.post('/config/service-plans', data),
  updateServicePlan: (id, data) => apiService.put(`/config/service-plans/${id}`, data),
  deleteServicePlan: (id) => apiService.delete(`/config/service-plans/${id}`),
  toggleServicePlanStatus: (id, activo) => apiService.patch(`/config/service-plans/${id}/toggle-status`, { activo }),
  getServicePlansForClientForm: () => apiService.get('/config/service-plans', { activo: 1, orden: 'orden_visualizacion' }),
};

export const reportsService = {
  getFinancial: (params) => apiService.get('/reports/financial', params),
  getClients: (params) => apiService.get('/reports/clients', params),
  getServices: (params) => apiService.get('/reports/services', params),
  getCustom: (reportType, params) => apiService.get(`/reports/${reportType}`, params),
  exportToPDF: (reportType, params) => apiService.getBlob(`/reports/${reportType}/pdf`, params), // CORREGIDO
  exportToExcel: (reportType, params) => apiService.getBlob(`/reports/${reportType}/excel`, params), // CORREGIDO
};

export const installationsService = {
  getAll: (params) => apiService.get('/installations', params),
  getById: (id) => apiService.get(`/installations/${id}`),
  create: (data) => apiService.post('/installations', data),
  update: (id, data) => apiService.put(`/installations/${id}`, data),
  delete: (id) => apiService.delete(`/installations/${id}`),
  schedule: (data) => apiService.post('/installations/schedule', data),
  complete: (id, data) => apiService.patch(`/installations/${id}/complete`, data),
  cancel: (id, reason) => apiService.patch(`/installations/${id}/cancel`, { reason }),
  uploadPhotos: (id, formData) => apiService.upload(`/installations/${id}/photos`, formData),
};

export const inventoryService = {
  getEquipment: (params) => apiService.get('/inventory/equipment', params),
  getEquipmentById: (id) => apiService.get(`/inventory/equipment/${id}`),
  createEquipment: (data) => apiService.post('/inventory/equipment', data),
  updateEquipment: (id, data) => apiService.put(`/inventory/equipment/${id}`, data),
  deleteEquipment: (id) => apiService.delete(`/inventory/equipment/${id}`),
  assignEquipment: (equipmentId, assignmentData) => apiService.patch(`/inventory/equipment/${equipmentId}/assign`, assignmentData),
  returnEquipment: (equipmentId) => apiService.patch(`/inventory/equipment/${equipmentId}/return`),
  getMovements: (params) => apiService.get('/inventory/movements', params),
};

export const configService = {
  getCompany: () => apiService.get('/config/company'),
  updateCompany: (data) => apiService.put('/config/company', data),
  getEmailTemplates: () => apiService.get('/config/email-templates'),
  updateEmailTemplate: (id, data) => apiService.put(`/config/email-templates/${id}`, data),
  getBanks: () => apiService.get('/config/banks'),
  getSectors: () => apiService.get('/config/sectors'),
  getCities: () => apiService.get('/config/cities'),
  getDepartments: () => apiService.get('/config/departments'),
};

// Exportar el servicio principal
export default apiService;