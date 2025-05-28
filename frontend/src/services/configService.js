// frontend/src/services/configService.js

import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class ConfigService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/config`;
  }

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
      const response = await fetch(url, {
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
      console.error('Error en ConfigService:', error);
      throw error;
    }
  }

  // ==========================================
  // CONFIGURACIÓN DE EMPRESA
  // ==========================================

  async getCompanyConfig() {
    return this.makeRequest(`${this.baseURL}/company`);
  }

  async updateCompanyConfig(config) {
    return this.makeRequest(`${this.baseURL}/company`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getConfigStats() {
    return this.makeRequest(`${this.baseURL}/stats`);
  }

  async getConfigOverview() {
    return this.makeRequest(`${this.baseURL}/overview`);
  }

  // ==========================================
  // GESTIÓN GEOGRÁFICA
  // ==========================================

  // Departamentos
  async getDepartments() {
    return this.makeRequest(`${this.baseURL}/departments`);
  }

  async createDepartment(department) {
    return this.makeRequest(`${this.baseURL}/departments`, {
      method: 'POST',
      body: JSON.stringify(department),
    });
  }

  async updateDepartment(id, department) {
    return this.makeRequest(`${this.baseURL}/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(department),
    });
  }

  // Ciudades
  async getCities(departamentoId = null) {
    const url = departamentoId 
      ? `${this.baseURL}/cities?departamento_id=${departamentoId}`
      : `${this.baseURL}/cities`;
    return this.makeRequest(url);
  }

  async createCity(city) {
    return this.makeRequest(`${this.baseURL}/cities`, {
      method: 'POST',
      body: JSON.stringify(city),
    });
  }

  // Sectores
  async getSectors(ciudadId = null) {
    const url = ciudadId 
      ? `${this.baseURL}/sectors?ciudad_id=${ciudadId}`
      : `${this.baseURL}/sectors`;
    return this.makeRequest(url);
  }

  async createSector(sector) {
    return this.makeRequest(`${this.baseURL}/sectors`, {
      method: 'POST',
      body: JSON.stringify(sector),
    });
  }

  async toggleSector(id) {
    return this.makeRequest(`${this.baseURL}/sectors/${id}/toggle`, {
      method: 'POST',
    });
  }

  // ==========================================
  // GESTIÓN DE BANCOS
  // ==========================================

  async getBanks(activo = null) {
    const url = activo !== null 
      ? `${this.baseURL}/banks?activo=${activo}`
      : `${this.baseURL}/banks`;
    return this.makeRequest(url);
  }

  async getBankById(id) {
    return this.makeRequest(`${this.baseURL}/banks/${id}`);
  }

  async createBank(bank) {
    return this.makeRequest(`${this.baseURL}/banks`, {
      method: 'POST',
      body: JSON.stringify(bank),
    });
  }

  async updateBank(id, bank) {
    return this.makeRequest(`${this.baseURL}/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bank),
    });
  }

  async toggleBank(id) {
    return this.makeRequest(`${this.baseURL}/banks/${id}/toggle`, {
      method: 'POST',
    });
  }

  async deleteBank(id) {
    return this.makeRequest(`${this.baseURL}/banks/${id}`, {
      method: 'DELETE',
    });
  }

  async getBankStats() {
    return this.makeRequest(`${this.baseURL}/banks/stats`);
  }

  // ==========================================
  // PLANES DE SERVICIO
  // ==========================================

  async getServicePlans(tipo = null, activo = null) {
    let url = `${this.baseURL}/service-plans`;
    const params = new URLSearchParams();
    
    if (tipo) params.append('tipo', tipo);
    if (activo !== null) params.append('activo', activo);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.makeRequest(url);
  }

  async getServicePlanById(id) {
    return this.makeRequest(`${this.baseURL}/service-plans/${id}`);
  }

  async createServicePlan(plan) {
    return this.makeRequest(`${this.baseURL}/service-plans`, {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async updateServicePlan(id, plan) {
    return this.makeRequest(`${this.baseURL}/service-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  }

  async toggleServicePlan(id) {
    return this.makeRequest(`${this.baseURL}/service-plans/${id}/toggle`, {
      method: 'POST',
    });
  }

  async deleteServicePlan(id) {
    return this.makeRequest(`${this.baseURL}/service-plans/${id}`, {
      method: 'DELETE',
    });
  }

  async getServicePlanStats() {
    return this.makeRequest(`${this.baseURL}/service-plans/stats`);
  }

  async getServicePlansByType() {
    return this.makeRequest(`${this.baseURL}/service-plans/by-type`);
  }
}

export default new ConfigService();