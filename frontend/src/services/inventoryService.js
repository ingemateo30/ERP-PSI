// frontend/src/services/inventoryService.js

import apiService from './apiService';

class InventoryService {
  
  // ==========================================
  // GESTIÓN DE EQUIPOS
  // ==========================================
  
  /**
   * Obtener todos los equipos con filtros
   */
  async getEquipment(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      // Volver a la ruta real
      const url = queryString ? `/inventory/equipment?${queryString}` : '/inventory/equipment';
      
      console.log('🔗 Haciendo petición a:', url);
      const response = await apiService.get(url);
      console.log('📥 Respuesta recibida:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error obteniendo equipos:', error);
      console.error('Error response:', error.response?.data);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener equipo por ID
   */
  async getEquipmentById(id) {
    try {
      const response = await apiService.get(`/inventory/equipment/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Crear nuevo equipo
   */
  async createEquipment(equipmentData) {
    try {
      const response = await apiService.post('/inventory/equipment', equipmentData);
      return response.data;
    } catch (error) {
      console.error('Error creando equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Actualizar equipo
   */
  async updateEquipment(id, equipmentData) {
    try {
      const response = await apiService.put(`/inventory/equipment/${id}`, equipmentData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Eliminar equipo
   */
  async deleteEquipment(id) {
    try {
      const response = await apiService.delete(`/inventory/equipment/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando equipo:', error);
      throw this.handleError(error);
    }
  }
  
  // ==========================================
  // GESTIÓN DE ASIGNACIONES
  // ==========================================
  
  /**
   * Asignar equipo a instalador
   */
  async assignEquipment(equipmentId, assignmentData) {
    try {
      const response = await apiService.post(`/inventory/equipment/${equipmentId}/assign`, assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error asignando equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Devolver equipo
   */
  async returnEquipment(equipmentId, returnData = {}) {
    try {
      const response = await apiService.post(`/inventory/equipment/${equipmentId}/return`, returnData);
      return response.data;
    } catch (error) {
      console.error('Error devolviendo equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Marcar equipo como instalado
   */
  async markAsInstalled(equipmentId, installationData) {
    try {
      const response = await apiService.post(`/inventory/equipment/${equipmentId}/install`, installationData);
      return response.data;
    } catch (error) {
      console.error('Error marcando como instalado:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Actualizar ubicación del equipo
   */
  async updateLocation(equipmentId, locationData) {
    try {
      const response = await apiService.put(`/inventory/equipment/${equipmentId}/location`, locationData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      throw this.handleError(error);
    }
  }
  
  // ==========================================
  // GESTIÓN DE INSTALADORES
  // ==========================================
  
  /**
   * Obtener equipos de un instalador
   */
  async getInstallerEquipment(instaladorId, estado = null) {
    try {
      const params = estado ? `?estado=${estado}` : '';
      const response = await apiService.get(`/inventory/installer/${instaladorId}/equipment${params}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo equipos del instalador:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener historial de un instalador
   */
  async getInstallerHistory(instaladorId, limit = 50) {
    try {
      const response = await apiService.get(`/inventory/installer/${instaladorId}/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo historial del instalador:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener instaladores activos
   */
  async getActiveInstallers() {
    try {
      const response = await apiService.get('/inventory/installers');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo instaladores:', error);
      throw this.handleError(error);
    }
  }
  
  // ==========================================
  // HISTORIAL Y REPORTES
  // ==========================================
  
  /**
   * Obtener historial de un equipo
   */
  async getEquipmentHistory(equipmentId) {
    try {
      const response = await apiService.get(`/inventory/equipment/${equipmentId}/history`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo historial del equipo:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener estadísticas del inventario
   */
  async getStats() {
    try {
      const response = await apiService.get('/inventory/stats');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener reporte por rango de fechas
   */
  async getReportByDateRange(startDate, endDate, tipo = null) {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      
      if (tipo) {
        params.append('tipo', tipo);
      }
      
      const response = await apiService.get(`/inventory/reports/date-range?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo reporte:', error);
      throw this.handleError(error);
    }
  }
  
  // ==========================================
  // UTILIDADES
  // ==========================================
  
  /**
   * Obtener equipos disponibles
   */
  async getAvailableEquipment(tipo = null) {
    try {
      const params = tipo ? `?tipo=${tipo}` : '';
      const response = await apiService.get(`/inventory/available${params}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo equipos disponibles:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Buscar equipos
   */
  async searchEquipment(searchTerm) {
    try {
      const response = await apiService.get(`/inventory/search?q=${encodeURIComponent(searchTerm)}`);
      return response.data;
    } catch (error) {
      console.error('Error buscando equipos:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener tipos de equipos
   */
  async getTypes() {
    try {
      const response = await apiService.get('/inventory/types');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo tipos:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Obtener marcas por tipo
   */
  async getBrandsByType(tipo) {
    try {
      const response = await apiService.get(`/inventory/types/${tipo}/brands`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo marcas:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Verificar disponibilidad de código
   */
  async checkCodeAvailability(codigo, excludeId = null) {
    try {
      const params = excludeId ? `?excludeId=${excludeId}` : '';
      const response = await apiService.get(`/inventory/check-code/${codigo}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error verificando código:', error);
      throw this.handleError(error);
    }
  }
  
  // ==========================================
  // MANEJO DE ERRORES
  // ==========================================
  
  handleError(error) {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    } else if (error.response?.data?.errors) {
      const firstError = error.response.data.errors[0];
      return new Error(firstError.msg || firstError.message || 'Error de validación');
    } else if (error.message) {
      return new Error(error.message);
    } else {
      return new Error('Error inesperado en el servicio de inventario');
    }
  }
  
  // ==========================================
  // CONSTANTES ÚTILES
  // ==========================================
  
  get EQUIPMENT_TYPES() {
    return [
      { value: 'router', label: 'Router' },
      { value: 'decodificador', label: 'Decodificador' },
      { value: 'cable', label: 'Cable' },
      { value: 'antena', label: 'Antena' },
      { value: 'splitter', label: 'Splitter' },
      { value: 'amplificador', label: 'Amplificador' },
      { value: 'otro', label: 'Otro' }
    ];
  }
  
  get EQUIPMENT_STATES() {
    return [
      { value: 'disponible', label: 'Disponible', color: 'green' },
      { value: 'asignado', label: 'Asignado', color: 'blue' },
      { value: 'instalado', label: 'Instalado', color: 'purple' },
      { value: 'dañado', label: 'Dañado', color: 'red' },
      { value: 'perdido', label: 'Perdido', color: 'gray' },
      { value: 'mantenimiento', label: 'Mantenimiento', color: 'yellow' },
      { value: 'devuelto', label: 'Devuelto', color: 'indigo' }
    ];
  }
  
  getStateColor(estado) {
    const stateInfo = this.EQUIPMENT_STATES.find(s => s.value === estado);
    return stateInfo ? stateInfo.color : 'gray';
  }
  
  getStateLabel(estado) {
    const stateInfo = this.EQUIPMENT_STATES.find(s => s.value === estado);
    return stateInfo ? stateInfo.label : estado;
  }
}

export default new InventoryService();