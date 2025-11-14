// frontend/src/services/notificacionesService.js

import apiService from './apiService';

const NOTIFICACIONES_ENDPOINTS = {
  LIST: '/notificaciones',
  COUNT: '/notificaciones/count',
  DETAIL: '/notificaciones',
  MARK_READ: '/notificaciones',
  MARK_ALL_READ: '/notificaciones/mark-all-read',
  DELETE: '/notificaciones'
};

class NotificacionesService {
  constructor() {
    this.debug = process.env.NODE_ENV === 'development';
  }

  // Función de debug
  log(message, data) {
    if (this.debug) {
      console.log(`🔔 NotificacionesService: ${message}`, data);
    }
  }

  // Obtener todas las notificaciones con filtros opcionales
  async getAll(params = {}) {
    try {
      this.log('Obteniendo notificaciones', params);
      const response = await apiService.get(NOTIFICACIONES_ENDPOINTS.LIST, params);
      return response;
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      throw error;
    }
  }

  // Obtener notificaciones no leídas
  async getUnread(limite = 10) {
    try {
      this.log('Obteniendo notificaciones no leídas');
      const response = await apiService.get(
        NOTIFICACIONES_ENDPOINTS.LIST,
        { leida: false, limite },
        { silent: true } // Modo silencioso ya que puede no estar implementado
      );
      return response;
    } catch (error) {
      // En caso de cualquier error, retornar array vacío sin logear
      return { data: [], success: true };
    }
  }

  // Contar notificaciones no leídas
  async getUnreadCount() {
    try {
      this.log('Contando notificaciones no leídas');
      const response = await apiService.get(
        NOTIFICACIONES_ENDPOINTS.COUNT,
        {},
        { silent: true } // Modo silencioso ya que puede no estar implementado
      );
      return response;
    } catch (error) {
      // En caso de cualquier error, retornar 0 sin logear
      return { data: { total: 0 }, success: true };
    }
  }

  // Obtener detalle de una notificación
  async getById(id) {
    try {
      this.log('Obteniendo detalle de notificación', { id });
      const response = await apiService.get(`${NOTIFICACIONES_ENDPOINTS.DETAIL}/${id}`);
      return response;
    } catch (error) {
      console.error('Error obteniendo detalle de notificación:', error);
      throw error;
    }
  }

  // Marcar notificación como leída
  async markAsRead(id) {
    try {
      this.log('Marcando notificación como leída', { id });
      const response = await apiService.put(`${NOTIFICACIONES_ENDPOINTS.MARK_READ}/${id}/read`);
      return response;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      throw error;
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead() {
    try {
      this.log('Marcando todas las notificaciones como leídas');
      const response = await apiService.put(NOTIFICACIONES_ENDPOINTS.MARK_ALL_READ);
      return response;
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      throw error;
    }
  }

  // Eliminar una notificación
  async delete(id) {
    try {
      this.log('Eliminando notificación', { id });
      const response = await apiService.delete(`${NOTIFICACIONES_ENDPOINTS.DELETE}/${id}`);
      return response;
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      throw error;
    }
  }

  // Crear una notificación (admin)
  async create(data) {
    try {
      this.log('Creando notificación', data);
      const response = await apiService.post(NOTIFICACIONES_ENDPOINTS.LIST, data);
      return response;
    } catch (error) {
      console.error('Error creando notificación:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const notificacionesService = new NotificacionesService();
export default notificacionesService;
