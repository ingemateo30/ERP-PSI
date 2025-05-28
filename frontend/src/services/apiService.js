// frontend/src/services/apiService.js

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
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

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
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

// Servicios específicos para cada módulo
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
  generatePDF: (id) => apiService.get(`/invoices/${id}/pdf`),
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
  getPlans: () => apiService.get('/services/plans'),
  getPlanById: (id) => apiService.get(`/services/plans/${id}`),
  createPlan: (data) => apiService.post('/services/plans', data),
  updatePlan: (id, data) => apiService.put(`/services/plans/${id}`, data),
  deletePlan: (id) => apiService.delete(`/services/plans/${id}`),
  
  getClientServices: (clientId) => apiService.get(`/clients/${clientId}/services`),
  activateService: (clientId, data) => apiService.post(`/clients/${clientId}/services`, data),
  updateService: (serviceId, data) => apiService.put(`/services/${serviceId}`, data),
  suspendService: (serviceId, reason) => apiService.patch(`/services/${serviceId}/suspend`, { reason }),
  reactivateService: (serviceId) => apiService.patch(`/services/${serviceId}/reactivate`),
};

export const usersService = {
  getAll: (params) => apiService.get('/users', params),
  getById: (id) => apiService.get(`/users/${id}`),
  create: (data) => apiService.post('/users', data),
  update: (id, data) => apiService.put(`/users/${id}`, data),
  delete: (id) => apiService.delete(`/users/${id}`),
  changePassword: (id, passwordData) => apiService.patch(`/users/${id}/password`, passwordData),
  toggleStatus: (id) => apiService.patch(`/users/${id}/toggle-status`),
  getStats: () => apiService.get('/users/stats'),
  
  // Perfil del usuario actual
  getProfile: () => apiService.get('/users/profile'),
  updateProfile: (data) => apiService.put('/users/profile', data),
  deleteAccount: () => apiService.delete('/users/profile'),
};

export const reportsService = {
  getFinancial: (params) => apiService.get('/reports/financial', params),
  getClients: (params) => apiService.get('/reports/clients', params),
  getServices: (params) => apiService.get('/reports/services', params),
  getCustom: (reportType, params) => apiService.get(`/reports/${reportType}`, params),
  exportToPDF: (reportType, params) => apiService.get(`/reports/${reportType}/pdf`, params),
  exportToExcel: (reportType, params) => apiService.get(`/reports/${reportType}/excel`, params),
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