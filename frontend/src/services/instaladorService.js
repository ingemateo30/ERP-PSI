import apiService from './apiService';

const instaladorService = {
  // Obtener trabajos de hoy
  obtenerTrabajosHoy: async () => {
    try {
      const response = await apiService.get('/instalador/mis-trabajos/hoy');
      return response;
    } catch (error) {
      console.error('Error obteniendo trabajos de hoy:', error);
      throw error;
    }
  },

  // Obtener equipos asignados
  obtenerMisEquipos: async () => {
    try {
      const response = await apiService.get('/instalador/mis-equipos');
      return response;
    } catch (error) {
      console.error('Error obteniendo equipos:', error);
      throw error;
    }
  },

  // Iniciar instalación
  iniciarInstalacion: async (instalacionId) => {
    try {
      const response = await apiService.post(`/instalador/instalacion/${instalacionId}/iniciar`);
      return response;
    } catch (error) {
      console.error('Error iniciando instalación:', error);
      throw error;
    }
  },

  // Completar instalación
  completarInstalacion: async (instalacionId, data) => {
    try {
      const response = await apiService.post(`/instalador/instalacion/${instalacionId}/completar`, data);
      return response;
    } catch (error) {
      console.error('Error completando instalación:', error);
      throw error;
    }
  },

  // Devolver equipos
  devolverEquipos: async (equiposIds) => {
    try {
      const response = await apiService.post('/instalador/equipos/devolver', { equiposIds });
      return response;
    } catch (error) {
      console.error('Error devolviendo equipos:', error);
      throw error;
    }
  },

  // Obtener estadísticas
  obtenerEstadisticas: async () => {
    try {
      const response = await apiService.get('/instalador/estadisticas');
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
};

export default instaladorService;