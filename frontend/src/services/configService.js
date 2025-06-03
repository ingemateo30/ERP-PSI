// frontend/src/services/configService.js - VERSIÓN MEJORADA INTEGRADA

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
      
      // Si es error 401, intentar refresh del token
      if (error.message.includes('401')) {
        try {
          await authService.refreshToken();
          // Reintentar la petición original
          const newToken = authService.getToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, { ...options, headers });
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              throw new Error(retryData.message || 'Error en reintento');
            }
            
            return retryData;
          }
        } catch (refreshError) {
          // Si falla el refresh, redirigir al login
          authService.removeToken();
          window.location.href = '/login';
          throw new Error('Sesión expirada');
        }
      }
      
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

  async getConfigHealth() {
    return this.makeRequest(`${this.baseURL}/health`);
  }

  async resetConfig(confirmationCode) {
    return this.makeRequest(`${this.baseURL}/reset`, {
      method: 'POST',
      body: JSON.stringify({ confirm: confirmationCode }),
    });
  }

  // Consecutivos
  async getConsecutives() {
    return this.makeRequest(`${this.baseURL}/consecutives`);
  }

  async updateConsecutives(consecutives) {
    return this.makeRequest(`${this.baseURL}/consecutives`, {
      method: 'PUT',
      body: JSON.stringify(consecutives),
    });
  }

  async incrementConsecutive(type) {
    return this.makeRequest(`${this.baseURL}/consecutives/${type}/increment`, {
      method: 'POST',
    });
  }

  // ==========================================
  // GESTIÓN GEOGRÁFICA
  // ==========================================

  // Departamentos
  async getDepartments(includeStats = false) {
    const params = includeStats ? '?includeStats=true' : '';
    return this.makeRequest(`${this.baseURL}/departments${params}`);
  }

  async getDepartmentById(id) {
    return this.makeRequest(`${this.baseURL}/departments/${id}`);
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

  async deleteDepartment(id) {
    return this.makeRequest(`${this.baseURL}/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Ciudades
  async getCities(departamentoId = null, includeStats = false) {
    let url = `${this.baseURL}/cities`;
    const params = new URLSearchParams();
    
    if (departamentoId) params.append('departamento_id', departamentoId);
    if (includeStats) params.append('includeStats', 'true');
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.makeRequest(url);
  }

  async getCityById(id) {
    return this.makeRequest(`${this.baseURL}/cities/${id}`);
  }

  async createCity(city) {
    return this.makeRequest(`${this.baseURL}/cities`, {
      method: 'POST',
      body: JSON.stringify(city),
    });
  }

  async updateCity(id, city) {
    return this.makeRequest(`${this.baseURL}/cities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(city),
    });
  }

  async deleteCity(id) {
    return this.makeRequest(`${this.baseURL}/cities/${id}`, {
      method: 'DELETE',
    });
  }

  // Sectores
  async getSectors(ciudadId = null, activo = null, includeStats = false) {
    let url = `${this.baseURL}/sectors`;
    const params = new URLSearchParams();
    
    if (ciudadId) params.append('ciudad_id', ciudadId);
    if (activo !== null) params.append('activo', activo);
    if (includeStats) params.append('includeStats', 'true');
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.makeRequest(url);
  }

  async getSectorById(id) {
    return this.makeRequest(`${this.baseURL}/sectors/${id}`);
  }

  async createSector(sector) {
    return this.makeRequest(`${this.baseURL}/sectors`, {
      method: 'POST',
      body: JSON.stringify(sector),
    });
  }

  async updateSector(id, sector) {
    return this.makeRequest(`${this.baseURL}/sectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sector),
    });
  }

  async toggleSector(id) {
    return this.makeRequest(`${this.baseURL}/sectors/${id}/toggle`, {
      method: 'POST',
    });
  }

  async deleteSector(id) {
    return this.makeRequest(`${this.baseURL}/sectors/${id}`, {
      method: 'DELETE',
    });
  }

  // Utilidades geográficas
  async getGeographyHierarchy() {
    return this.makeRequest(`${this.baseURL}/geography/hierarchy`);
  }

  async searchLocations(query, type = 'all') {
    const params = new URLSearchParams({ q: query, type });
    return this.makeRequest(`${this.baseURL}/geography/search?${params.toString()}`);
  }

  async getGeographyStats() {
    return this.makeRequest(`${this.baseURL}/geography/stats`);
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

  // ==========================================
  // MÉTODOS DE CONVENIENCIA Y UTILIDADES
  // ==========================================

  // Validar configuración completa
  async validateConfiguration() {
    try {
      const [company, stats, health] = await Promise.all([
        this.getCompanyConfig(),
        this.getConfigStats(),
        this.getConfigHealth()
      ]);

      return {
        isValid: health.data?.sistema_operativo || false,
        company: company.data,
        stats: stats.data,
        health: health.data,
        issues: health.data?.problemas || []
      };
    } catch (error) {
      console.error('Error validando configuración:', error);
      return {
        isValid: false,
        issues: ['Error verificando configuración del sistema']
      };
    }
  }

  // Obtener resumen para dashboard
  async getDashboardSummary() {
    try {
      const overview = await this.getConfigOverview();
      
      return {
        isConfigured: overview.data?.empresa_configurada || false,
        completionPercentage: overview.data?.porcentaje_completado || 0,
        pendingTasks: this.getPendingTasks(overview.data),
        counters: overview.data?.contadores || {}
      };
    } catch (error) {
      console.error('Error obteniendo resumen:', error);
      return {
        isConfigured: false,
        completionPercentage: 0,
        pendingTasks: [],
        counters: {}
      };
    }
  }

  // Obtener tareas pendientes
  getPendingTasks(overviewData) {
    if (!overviewData) return [];
    
    const tasks = [];
    
    if (!overviewData.empresa_configurada) {
      tasks.push({
        id: 'company',
        title: 'Configurar Empresa',
        description: 'Completa los datos básicos de tu empresa',
        priority: 'high',
        path: '/config/company'
      });
    }
    
    if ((overviewData.contadores?.bancos_activos || 0) === 0) {
      tasks.push({
        id: 'banks',
        title: 'Agregar Bancos',
        description: 'Configura los bancos para registro de pagos',
        priority: 'medium',
        path: '/config/banks'
      });
    }
    
    if ((overviewData.contadores?.sectores_activos || 0) === 0) {
      tasks.push({
        id: 'geography',
        title: 'Configurar Geografía',
        description: 'Define departamentos, ciudades y sectores',
        priority: 'medium',
        path: '/config/geography'
      });
    }
    
    if ((overviewData.contadores?.planes_activos || 0) === 0) {
      tasks.push({
        id: 'service-plans',
        title: 'Crear Planes de Servicio',
        description: 'Define los planes de internet y TV',
        priority: 'high',
        path: '/config/service-plans'
      });
    }
    
    return tasks;
  }

  // Inicializar configuración básica
  async initializeBasicConfig() {
    try {
      // Crear configuración mínima requerida
      const defaultCompany = {
        licencia: 'DEMO2025',
        empresa_nombre: '',
        empresa_nit: '',
        prefijo_factura: 'FAC',
        valor_reconexion: 15000,
        dias_mora_corte: 30,
        porcentaje_iva: 19
      };

      // Solo actualizar si no existe configuración
      try {
        const existing = await this.getCompanyConfig();
        if (!existing.data?.config?.empresa_nombre) {
          await this.updateCompanyConfig(defaultCompany);
        }
      } catch (error) {
        await this.updateCompanyConfig(defaultCompany);
      }

      return { success: true, message: 'Configuración básica inicializada' };
    } catch (error) {
      console.error('Error inicializando configuración:', error);
      throw error;
    }
  }
  async getConceptos(tipo = null, activo = null) {
    let url = `${this.baseURL}/conceptos`;
    const params = new URLSearchParams();
    
    if (tipo) params.append('tipo', tipo);
    if (activo !== null) params.append('activo', activo);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.makeRequest(url);
  }

  async getConceptoById(id) {
    return this.makeRequest(`${this.baseURL}/conceptos/${id}`);
  }

  async createConcepto(concepto) {
    return this.makeRequest(`${this.baseURL}/conceptos`, {
      method: 'POST',
      body: JSON.stringify(concepto),
    });
  }

  async updateConcepto(id, concepto) {
    return this.makeRequest(`${this.baseURL}/conceptos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(concepto),
    });
  }

  async toggleConcepto(id) {
    return this.makeRequest(`${this.baseURL}/conceptos/${id}/toggle`, {
      method: 'POST',
    });
  }

  async deleteConcepto(id) {
    return this.makeRequest(`${this.baseURL}/conceptos/${id}`, {
      method: 'DELETE',
    });
  }

  async getConceptosByType(tipo) {
    return this.makeRequest(`${this.baseURL}/conceptos/tipo/${tipo}`);
  }

  async getConceptosStats() {
    return this.makeRequest(`${this.baseURL}/conceptos/stats`);
  }

  async getConceptosTipos() {
    return this.makeRequest(`${this.baseURL}/conceptos/tipos`);
  }
}

export default new ConfigService();