// frontend/src/services/alertasClienteService.js
// Crear este archivo nuevo

import apiService from './apiService';

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



      // Si el error es 404 o 500, retornar null en lugar de lanzar error

      // Esto permite que la app continúe funcionando incluso si el endpoint no existe

      if (error.message?.includes('404') || error.message?.includes('500')) {

        console.warn('Endpoint de verificación no disponible, continuando sin verificación');

        return { data: null, success: false, exists: false };

      }



      // Para otros errores, retornar respuesta segura

      return { data: null, success: false, exists: false };

    }

  }

  static async agregarServicioAClienteExistente(clienteId, datosServicio) {
    try {
      const response = await apiService.post(`/clients/${clienteId}/agregar-servicio`, datosServicio);
      return response;
    } catch (error) {
      console.error('Error agregando servicio a cliente existente:', error);
      throw error;
    }
  }

  static async obtenerResumenCliente(clienteId) {
    try {
      const response = await apiService.get(`/clients/${clienteId}/resumen`);
      return response;
    } catch (error) {
      console.error('Error obteniendo resumen de cliente:', error);
      throw error;
    }
  }
}

export default AlertasClienteService;