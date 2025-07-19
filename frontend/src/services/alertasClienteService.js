// frontend/src/services/alertasClienteService.js
// Crear este archivo nuevo

import apiService  from './apiService';

class AlertasClienteService {
  
  static async verificarClienteExistente(identificacion, tipoDocumento = 'cedula') {
    try {
      const response = await apiService.get('/clients/verificar-existente', {
        identificacion,
        tipo_documento: tipoDocumento
      });
      
      return response;
    } catch (error) {
      console.error('Error verificando cliente existente:', error);
      throw error;
    }
  }

  static async agregarServicioAClienteExistente(clienteId, datosServicio) {
    try {
      const response = await apiService.post(`/clientes/${clienteId}/agregar-servicio`, datosServicio);
      return response;
    } catch (error) {
      console.error('Error agregando servicio a cliente existente:', error);
      throw error;
    }
  }

  static async obtenerResumenCliente(clienteId) {
    try {
      const response = await apiService.get(`/clientes/${clienteId}/resumen`);
      return response;
    } catch (error) {
      console.error('Error obteniendo resumen de cliente:', error);
      throw error;
    }
  }
}

export default AlertasClienteService;