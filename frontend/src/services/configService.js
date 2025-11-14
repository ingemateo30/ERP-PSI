//
// frontend/src/services/configService.js - VERSIÓN MEJORADA INTEGRADA

  import authService from './authService';

  const API_BASE_URL = process.env.NODE_ENV === 'development'
    ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
    : process.env.REACT_APP_API_URL;


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

async getServicePlans(params = {}) {
  try {
    // ✅ ASEGURAR que params sea un objeto
    const filtros = params || {};
    
    // ✅ Si no se especifica 'activo', filtrar solo activos por defecto
    if (filtros.activo === undefined) {
      filtros.activo = 'true';
    }
    
    const queryParams = new URLSearchParams(filtros).toString();
    const url = queryParams ? 
      `${this.baseURL}/service-plans?${queryParams}` : 
      `${this.baseURL}/service-plans`;
      
    console.log('🔄 ConfigService: Solicitando planes desde:', url);
    
    const response = await this.makeRequest(url);
    console.log('📡 ConfigService: Respuesta recibida:', response);
    
    return response;
  } catch (error) {
    console.error('❌ ConfigService: Error obteniendo planes:', error);
    throw error;
  }
}
    async getServicePlanStats() {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/stats`);
      } catch (error) {
        console.error('❌ ConfigService: Error obteniendo estadísticas:', error);
        throw error;
      }
    }

    async getServicePlanById(id) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/${id}`);
      } catch (error) {
        console.error('❌ ConfigService: Error obteniendo plan:', error);
        throw error;
      }
    }

    async createServicePlan(planData) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans`, {
          method: 'POST',
          body: JSON.stringify(planData),
        });
      } catch (error) {
        console.error('❌ ConfigService: Error creando plan:', error);
        throw error;
      }
    }

    async updateServicePlan(id, planData) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/${id}`, {
          method: 'PUT',
          body: JSON.stringify(planData),
        });
      } catch (error) {
        console.error('❌ ConfigService: Error actualizando plan:', error);
        throw error;
      }
    }

    async deleteServicePlan(id) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/${id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('❌ ConfigService: Error eliminando plan:', error);
        throw error;
      }
    }

    async toggleServicePlanStatus(id, activo) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/${id}/toggle-status`, {
          method: 'PATCH',
          body: JSON.stringify({ activo }),
        });
      } catch (error) {
        console.error('❌ ConfigService: Error cambiando estado:', error);
        throw error;
      }
    }
    async getServicePlansStats() {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/stats`);
      } catch (error) {
        console.error('❌ ConfigService: Error obteniendo estadísticas de planes:', error);
        throw error;
      }
    }

    // ✅ FUNCIÓN AGREGADA: Duplicar plan
    async duplicateServicePlan(id, duplicateData) {
      try {
        return await this.makeRequest(`${this.baseURL}/service-plans/${id}/duplicate`, {
          method: 'POST',
          body: JSON.stringify(duplicateData),
        });
      } catch (error) {
        console.error('❌ ConfigService: Error duplicando plan:', error);
        throw error;
      }
    }


    // ==========================================
    // MÉTODOS DE UTILIDAD PARA PLANES
    // ==========================================

    async getServicePlansForClientForm() {
      try {
        const response = await this.getServicePlans({ 
          activo: 1, 
          orden: 'orden_visualizacion' 
        });
        
        // Agrupar planes por segmento y tipo
        const planesAgrupados = {
          residencial: { internet: [], television: [], combo: [] },
          empresarial: { internet: [], television: [], combo: [] }
        };

        if (response.success && response.data) {
          response.data.forEach(plan => {
            const segmento = plan.segmento || 'residencial';
            const tipo = plan.tipo;
            
            if (planesAgrupados[segmento] && planesAgrupados[segmento][tipo]) {
              planesAgrupados[segmento][tipo].push({
                id: plan.id,
                codigo: plan.codigo,
                nombre: plan.nombre,
                precio: plan.precio,
                precio_con_iva: plan.precio_con_iva,
                velocidad_bajada: plan.velocidad_bajada,
                canales_tv: plan.canales_tv,
                permanencia_meses: plan.permanencia_meses,
                precio_instalacion: plan.precio_instalacion,
                especificaciones: this.getEspecificacionesDisplay(plan)
              });
            }
          });
        }

        return {
          success: true,
          data: {
            planes_agrupados: planesAgrupados,
            planes_simples: response.data || []
          }
        };
      } catch (error) {
        console.error('❌ ConfigService: Error obteniendo planes para formulario:', error);
        throw error;
      }
    }

    getEspecificacionesDisplay(plan) {
      switch (plan.tipo) {
        case 'internet':
          return plan.velocidad_bajada ? `${plan.velocidad_bajada} Mbps` : 'Internet';
        case 'television':
          return plan.canales_tv ? `${plan.canales_tv} canales` : 'TV';
        case 'combo':
          const internet = plan.velocidad_bajada ? `${plan.velocidad_bajada} Mbps` : '';
          const tv = plan.canales_tv ? `${plan.canales_tv} canales` : '';
          return internet && tv ? `${internet} + ${tv}` : 'Combo';
        default:
          return 'N/A';
      }
    }

  // ================================================================
  // TAMBIÉN ACTUALIZAR EL apiService.js EXISTENTE
  // ================================================================

  /*
  En frontend/src/services/apiService.js, BUSCAR la sección de configService 
  y REEMPLAZAR por:

  export const configService = {
    getCompany: () => apiService.get('/config/company'),
    updateCompany: (data) => apiService.put('/config/company', data),
    getEmailTemplates: () => apiService.get('/config/email-templates'),
    updateEmailTemplate: (id, data) => apiService.put(`/config/email-templates/${id}`, data),
    getBanks: () => apiService.get('/config/banks'),
    getSectors: () => apiService.get('/config/sectors'),
    getCities: () => apiService.get('/config/cities'),
    getDepartments: () => apiService.get('/config/departments'),
    
    // ✅ PLANES DE SERVICIO MEJORADOS
    getServicePlans: (params) => apiService.get('/config/service-plans', params),
    getServicePlanStats: () => apiService.get('/config/service-plans/stats'),
    getServicePlanById: (id) => apiService.get(`/config/service-plans/${id}`),
    createServicePlan: (data) => apiService.post('/config/service-plans', data),
    updateServicePlan: (id, data) => apiService.put(`/config/service-plans/${id}`, data),
    deleteServicePlan: (id) => apiService.delete(`/config/service-plans/${id}`),
    toggleServicePlanStatus: (id, activo) => apiService.patch(`/config/service-plans/${id}/toggle-status`, { activo }),
    getServicePlansForClientForm: () => apiService.get('/config/service-plans', { activo: 1, orden: 'orden_visualizacion' }),
  };
  */
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
    // Agregar estos métodos al archivo frontend/src/services/configService.js existente

  // ==========================================
  // PLANTILLAS DE CORREO
  // ==========================================

  // Obtener todas las plantillas
  async getPlantillasCorreo(tipo = null, activo = null) {
    let url = `${this.baseURL}/plantillas-correo`;
    const params = new URLSearchParams();
    
    if (tipo) params.append('tipo', tipo);
    if (activo !== null) params.append('activo', activo);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.makeRequest(url);
  }

  // Obtener plantilla por ID
  async getPlantillaCorreoById(id) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}`);
  }

  // Crear nueva plantilla
  async createPlantillaCorreo(plantilla) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo`, {
      method: 'POST',
      body: JSON.stringify(plantilla),
    });
  }

  // Actualizar plantilla
  async updatePlantillaCorreo(id, plantilla) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plantilla),
    });
  }

  // Eliminar plantilla
  async deletePlantillaCorreo(id) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}`, {
      method: 'DELETE',
    });
  }

  // Cambiar estado de plantilla
  async togglePlantillaCorreo(id) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}/toggle`, {
      method: 'POST',
    });
  }

  // Obtener plantillas por tipo
  async getPlantillasCorreoPorTipo(tipo) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/tipo/${tipo}`);
  }

  // Obtener estadísticas de plantillas
  async getPlantillasCorreoStats() {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/stats`);
  }

  // Duplicar plantilla
  async duplicatePlantillaCorreo(id) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Preview de plantilla
  async previewPlantillaCorreo(id, datosEjemplo = {}) {
    return this.makeRequest(`${this.baseURL}/plantillas-correo/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify(datosEjemplo),
    });
  }
  }

  export default new ConfigService();