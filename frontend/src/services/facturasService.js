// services/facturasService.js
import apiService from './apiService';

class FacturasService {
  // Obtener todas las facturas con filtros
  static async obtenerFacturas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      
      // Agregar filtros como parámetros de consulta
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
          params.append(key, filtros[key]);
        }
      });

      console.log('🌐 Llamando API:', `/facturas?${params.toString()}`);
      
      const response = await apiService.get(`/facturas?${params.toString()}`);
      
      console.log('📡 Respuesta cruda del API:', response);
      
      // IMPORTANTE: apiService ya devuelve response.data automáticamente
      // Así que response YA ES los datos, no está envuelto en .data
      return response;
    } catch (error) {
      console.error('❌ Error en FacturasService.obtenerFacturas:', error);
      throw error;
    }
  }

  // Obtener factura por ID
  static async obtenerFacturaPorId(id) {
    try {
      const response = await apiService.get(`/facturas/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener factura:', error);
      throw error;
    }
  }

  // Crear nueva factura
  static async crearFactura(datosFactura) {
    try {
      const response = await apiService.post('/facturas', datosFactura);
      return response.data;
    } catch (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  }

  // Actualizar factura
  static async actualizarFactura(id, datosFactura) {
    try {
      const response = await apiService.put(`/facturas/${id}`, datosFactura);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar factura:', error);
      throw error;
    }
  }

  // Marcar como pagada
  static async marcarComoPagada(id, datosPago) {
    try {
      const response = await apiService.patch(`/facturas/${id}/pagar`, datosPago);
      return response.data;
    } catch (error) {
      console.error('Error al marcar como pagada:', error);
      throw error;
    }
  }

  // Anular factura
  static async anularFactura(id, motivo) {
    try {
      const response = await apiService.patch(`/facturas/${id}/anular`, { motivo });
      return response.data;
    } catch (error) {
      console.error('Error al anular factura:', error);
      throw error;
    }
  }

  // Buscar facturas
  static async buscarFacturas(termino, filtros = {}) {
    try {
      const params = new URLSearchParams({ q: termino });
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params.append(key, filtros[key]);
        }
      });

      const response = await apiService.get(`/facturas/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al buscar facturas:', error);
      throw error;
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas() {
    try {
      const response = await apiService.get('/facturas/stats');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  // Obtener facturas vencidas
  static async obtenerFacturasVencidas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params.append(key, filtros[key]);
        }
      });

      const response = await apiService.get(`/facturas/vencidas?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas vencidas:', error);
      throw error;
    }
  }

  // Generar número de factura
  static async generarNumeroFactura() {
    try {
      const response = await apiService.get('/facturas/generar-numero');
      return response.data;
    } catch (error) {
      console.error('Error al generar número:', error);
      throw error;
    }
  }

  // Duplicar factura
  static async duplicarFactura(id, datosDuplicacion = {}) {
    try {
      const response = await apiService.post(`/facturas/${id}/duplicar`, datosDuplicacion);
      return response.data;
    } catch (error) {
      console.error('Error al duplicar factura:', error);
      throw error;
    }
  }

  // ========== FUNCIONES PARA PDF ==========

  // Descargar PDF de factura
  static async descargarPDF(id, nombreCliente = 'Cliente') {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/facturas/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      // Obtener el blob del PDF
      const blob = await response.blob();
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura_${nombreCliente}_${id}.pdf`;
      
      // Simular click para descarga
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      throw error;
    }
  }

  // Ver PDF en nueva pestaña
  static async verPDF(id) {
    try {
      const token = localStorage.getItem('accessToken');
      const url = `${process.env.REACT_APP_API_URL}/facturas/${id}/ver-pdf?token=${token}`;
      
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error('Error al ver PDF:', error);
      throw error;
    }
  }

  // Probar PDF (para desarrollo)
  static async probarPDF() {
    try {
      const token = localStorage.getItem('accessToken');
      const url = `${process.env.REACT_APP_API_URL}/facturas/test-pdf${token ? `?token=${token}` : ''}`;
      
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error('Error al probar PDF:', error);
      throw error;
    }
  }

  // ========== UTILIDADES ==========

  // Formatear moneda
  static formatearMoneda(valor) {
    if (!valor) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  // Formatear fecha
  static formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  // Obtener color por estado
  static obtenerColorEstado(estado) {
    const colores = {
      'pendiente': 'yellow',
      'pagada': 'green',
      'vencida': 'red',
      'anulada': 'gray'
    };
    return colores[estado] || 'gray';
  }

  // Calcular días de vencimiento
  static calcularDiasVencimiento(fechaVencimiento) {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    
    return {
      dias: Math.abs(diferencia),
      vencida: diferencia < 0,
      mensaje: diferencia < 0 ? `Vencida hace ${Math.abs(diferencia)} días` : 
               diferencia === 0 ? 'Vence hoy' : 
               `Vence en ${diferencia} días`
    };
  }
}

export default FacturasService;