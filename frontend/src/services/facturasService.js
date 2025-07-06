// services/facturasService.js - Servicio corregido para facturas
import apiService from './apiService';

class FacturasService {

  // Obtener factura por ID (método faltante)
  static async obtenerFacturaPorId(id) {
    try {
      if (!id) throw new Error('ID de factura requerido');

      console.log(`📄 Obteniendo factura por ID ${id}...`);

      const response = await apiService.get(`/facturas/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al obtener factura por ID ${id}:`, error);
      throw this.manejarError(error, 'obtener factura por ID');
    }
  }

  // Obtener facturas con filtros (corregido para evitar duplicados)
  static async obtenerFacturas(filtros = {}) {
    try {
      console.log('📡 Obteniendo facturas con filtros:', filtros);

      // Limpiar filtros para evitar duplicados en query params
      const filtrosLimpios = this.limpiarFiltros(filtros);

      const params = new URLSearchParams();
      Object.keys(filtrosLimpios).forEach(key => {
        const value = filtrosLimpios[key];
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const queryString = params.toString();
      const url = queryString ? `/facturas?${queryString}` : '/facturas';

      console.log('🔗 URL de consulta:', url);

      const response = await apiService.get(url);

      console.log('📥 Respuesta del servidor:', response);

      return response.data || response;
    } catch (error) {
      console.error('❌ Error al obtener facturas:', error);
      throw this.manejarError(error, 'obtener facturas');
    }
  }

  // Limpiar filtros duplicados y vacíos
  static limpiarFiltros(filtros) {
    const filtrosLimpios = {};

    Object.keys(filtros).forEach(key => {
      const value = filtros[key];

      // Solo incluir valores válidos
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        // Convertir booleanos a string si es necesario
        if (typeof value === 'boolean') {
          filtrosLimpios[key] = value.toString();
        } else {
          filtrosLimpios[key] = value;
        }
      }
    });

    return filtrosLimpios;
  }

  // Obtener factura por ID
  static async obtenerFactura(id) {
    try {
      if (!id) throw new Error('ID de factura requerido');

      console.log(`📄 Obteniendo factura ${id}...`);

      const response = await apiService.get(`/facturas/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al obtener factura ${id}:`, error);
      throw this.manejarError(error, 'obtener factura');
    }
  }

  // Crear factura
  static async crearFactura(datosFactura) {
    try {
      console.log('📝 Creando nueva factura...', datosFactura);

      const response = await apiService.post('/facturas', datosFactura);

      console.log('✅ Factura creada exitosamente');
      return response.data || response;
    } catch (error) {
      console.error('❌ Error al crear factura:', error);
      throw this.manejarError(error, 'crear factura');
    }
  }

  // Actualizar factura (CORREGIDO)
  static async actualizarFactura(id, datosFactura) {
    try {
      if (!id) throw new Error('ID de factura requerido para actualizar');

      console.log(`📝 Actualizando factura ${id}...`, datosFactura);

      const response = await apiService.put(`/facturas/${id}`, datosFactura);

      console.log('✅ Factura actualizada exitosamente');
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al actualizar factura ${id}:`, error);
      throw this.manejarError(error, 'actualizar factura');
    }
  }

  // Marcar como pagada (CORREGIDO)
  static async marcarComoPagada(id, datosPago) {
    try {
      if (!id) throw new Error('ID de factura requerido');
      if (!datosPago?.metodo_pago) throw new Error('Método de pago requerido');

      console.log(`💰 Marcando factura ${id} como pagada...`, datosPago);

      // Validar datos de pago
      const datosValidados = {
        metodo_pago: datosPago.metodo_pago,
        fecha_pago: datosPago.fecha_pago || new Date().toISOString().split('T')[0],
        referencia_pago: datosPago.referencia_pago || null,
        banco_id: datosPago.banco_id || null
      };

      const response = await apiService.patch(`/facturas/${id}/pagar`, datosValidados);

      console.log('✅ Factura marcada como pagada exitosamente');
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al marcar factura ${id} como pagada:`, error);
      throw this.manejarError(error, 'marcar como pagada');
    }
  }

  // Anular factura (CORREGIDO)
  static async anularFactura(id, motivo) {
    try {
      if (!id) throw new Error('ID de factura requerido');
      if (!motivo || motivo.trim().length < 10) {
        throw new Error('Motivo de anulación debe tener al menos 10 caracteres');
      }

      console.log(`🚫 Anulando factura ${id}...`, { motivo });

      const response = await apiService.patch(`/facturas/${id}/anular`, { motivo: motivo.trim() });

      console.log('✅ Factura anulada exitosamente');
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al anular factura ${id}:`, error);
      throw this.manejarError(error, 'anular factura');
    }
  }

  // Duplicar factura
  static async duplicarFactura(id, datos = {}) {
    try {
      if (!id) throw new Error('ID de factura requerido para duplicar');

      console.log(`📋 Duplicando factura ${id}...`);

      const response = await apiService.post(`/facturas/${id}/duplicar`, datos);

      console.log('✅ Factura duplicada exitosamente');
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al duplicar factura ${id}:`, error);
      throw this.manejarError(error, 'duplicar factura');
    }
  }

  // Descargar PDF (CORREGIDO)
  static async descargarPDF(id, nombreCliente = 'factura') {
    try {
      if (!id) throw new Error('ID de factura requerido para descargar PDF');

      console.log(`📥 Descargando PDF de factura ${id}...`);

      const response = await apiService.get(`/facturas/${id}/pdf`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `factura_${id}_${nombreCliente.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      console.log('✅ PDF descargado exitosamente');
      return { success: true, message: 'PDF descargado exitosamente' };
    } catch (error) {
      console.error(`❌ Error al descargar PDF de factura ${id}:`, error);
      throw this.manejarError(error, 'descargar PDF');
    }
  }

  // Ver PDF en navegador (CORREGIDO)
  static async verPDF(id) {
    try {
      if (!id) throw new Error('ID de factura requerido para ver PDF');

      console.log(`👁️ Abriendo PDF de factura ${id}...`);

      const response = await apiService.get(`/facturas/${id}/ver-pdf`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Crear URL del blob y abrir en nueva ventana
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const ventana = window.open(url, '_blank');
      if (!ventana) {
        throw new Error('No se pudo abrir la ventana. Verifica que no esté bloqueada por el navegador.');
      }

      // Limpiar URL después de un tiempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);

      console.log('✅ PDF abierto exitosamente');
      return { success: true, message: 'PDF abierto exitosamente' };
    } catch (error) {
      console.error(`❌ Error al ver PDF de factura ${id}:`, error);
      throw this.manejarError(error, 'ver PDF');
    }
  }

  // Buscar facturas
  static async buscarFacturas(termino, filtros = {}) {
    try {
      if (!termino || termino.trim().length < 2) {
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
      }

      console.log('🔍 Buscando facturas...', { termino, filtros });

      const params = new URLSearchParams({ q: termino.trim() });

      Object.keys(filtros).forEach(key => {
        if (filtros[key] && filtros[key] !== '') {
          params.append(key, filtros[key]);
        }
      });

      const response = await apiService.get(`/facturas/search?${params.toString()}`);
      return response.data || response;
    } catch (error) {
      console.error('❌ Error al buscar facturas:', error);
      throw this.manejarError(error, 'buscar facturas');
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas() {
    try {
      console.log('📊 Obteniendo estadísticas de facturas...');

      const response = await apiService.get('/facturas/stats');
      return response.data || response;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw this.manejarError(error, 'obtener estadísticas');
    }
  }

  // Obtener facturas vencidas
  static async obtenerVencidas() {
    try {
      console.log('⚠️ Obteniendo facturas vencidas...');

      const response = await apiService.get('/facturas/vencidas');
      return response.data || response;
    } catch (error) {
      console.error('❌ Error al obtener facturas vencidas:', error);
      throw this.manejarError(error, 'obtener facturas vencidas');
    }
  }

  // Generar número de factura
  static async generarNumeroFactura() {
    try {
      console.log('🔢 Generando número de factura...');

      const response = await apiService.get('/facturas/generar-numero');
      return response.data || response;
    } catch (error) {
      console.error('❌ Error al generar número de factura:', error);
      throw this.manejarError(error, 'generar número de factura');
    }
  }

  // Validar número de factura
  static async validarNumeroFactura(numero) {
    try {
      if (!numero) throw new Error('Número de factura requerido');

      console.log(`🔍 Validando número de factura ${numero}...`);

      const response = await apiService.get(`/facturas/validate/${numero}`);
      return response.data || response;
    } catch (error) {
      console.error(`❌ Error al validar número ${numero}:`, error);
      throw this.manejarError(error, 'validar número de factura');
    }
  }

  // Probar PDF (para desarrollo)
  static async probarPDF() {
    try {
      console.log('🧪 Probando generación de PDF...');

      const response = await apiService.get('/facturas/test-pdf', {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Crear blob y mostrar/descargar el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Abrir en nueva ventana para visualizar
      const ventana = window.open(url, '_blank');
      if (!ventana) {
        // Si no se puede abrir ventana, descargar automáticamente
        const link = document.createElement('a');
        link.href = url;
        link.download = 'factura_test.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Limpiar URL después de un tiempo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);

      console.log('✅ PDF de prueba generado exitosamente');
      return { success: true, message: 'PDF de prueba generado exitosamente' };
    } catch (error) {
      console.error('❌ Error al probar PDF:', error);
      throw this.manejarError(error, 'probar PDF');
    }
  }

  // Formatear moneda colombiana
  static formatearMoneda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$0';
    }

    const numero = parseFloat(valor);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numero);
  }

  // Formatear número simple
  static formatearNumero(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '0';
    }

    const numero = parseFloat(valor);
    return new Intl.NumberFormat('es-CO').format(numero);
  }

  // Formatear fecha
  static formatearFecha(fecha) {
    if (!fecha) return 'N/A';

    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return fecha.toString();
    }
  }

  // Formatear fecha y hora
  static formatearFechaHora(fecha) {
    if (!fecha) return 'N/A';

    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return fecha.toString();
    }
  }

  // Obtener color según estado
  static obtenerColorEstado(estado) {
    switch (estado?.toLowerCase()) {
      case 'pagada':
        return 'text-green-600 bg-green-100';
      case 'pendiente':
        return 'text-yellow-600 bg-yellow-100';
      case 'vencida':
        return 'text-red-600 bg-red-100';
      case 'anulada':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // Obtener icono según estado
  static obtenerIconoEstado(estado) {
    switch (estado?.toLowerCase()) {
      case 'pagada':
        return '✅';
      case 'pendiente':
        return '⏳';
      case 'vencida':
        return '⚠️';
      case 'anulada':
        return '❌';
      default:
        return '📄';
    }
  }

  // Calcular días de vencimiento
  static calcularDiasVencimiento(fechaVencimiento) {
    if (!fechaVencimiento) return null;

    try {
      const hoy = new Date();
      const vencimiento = new Date(fechaVencimiento);
      const diferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
      return diferencia;
    } catch (error) {
      return null;
    }
  }

  // Validar datos de factura
  static validarDatosFactura(datos) {
    const errores = [];

    if (!datos.cliente_id) {
      errores.push('Cliente es requerido');
    }

    if (!datos.fecha_emision) {
      errores.push('Fecha de emisión es requerida');
    }

    if (!datos.fecha_vencimiento) {
      errores.push('Fecha de vencimiento es requerida');
    }

    if (!datos.total || datos.total <= 0) {
      errores.push('El total debe ser mayor a cero');
    }

    // Validar que fecha de vencimiento sea posterior a fecha de emisión
    if (datos.fecha_emision && datos.fecha_vencimiento) {
      const emision = new Date(datos.fecha_emision);
      const vencimiento = new Date(datos.fecha_vencimiento);

      if (vencimiento <= emision) {
        errores.push('La fecha de vencimiento debe ser posterior a la fecha de emisión');
      }
    }

    return errores;
  }

  // Generar filtros de URL
  static generarFiltrosURL(filtros) {
    const params = new URLSearchParams();

    Object.keys(filtros).forEach(key => {
      const value = filtros[key];
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        if (typeof value === 'boolean') {
          params.append(key, value.toString());
        } else {
          params.append(key, value);
        }
      }
    });

    return params.toString();
  }

  // Manejar errores de manera consistente
  static manejarError(error, accion) {
    let mensaje = `Error al ${accion}`;

    if (error.response) {
      // Error de respuesta del servidor
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          mensaje = data?.message || 'Datos inválidos proporcionados';
          break;
        case 401:
          mensaje = 'No autorizado. Por favor, inicia sesión nuevamente';
          break;
        case 403:
          mensaje = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          mensaje = 'Recurso no encontrado';
          break;
        case 409:
          mensaje = data?.message || 'Conflicto con el estado actual del recurso';
          break;
        case 422:
          mensaje = data?.message || 'Error de validación en los datos';
          break;
        case 500:
          mensaje = 'Error interno del servidor. Por favor, intenta más tarde';
          break;
        default:
          mensaje = data?.message || `Error del servidor (${status})`;
      }
    } else if (error.request) {
      // Error de red
      mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión a internet';
    } else if (error.message) {
      // Error personalizado
      mensaje = error.message;
    }

    return new Error(mensaje);
  }
}

export default FacturasService;