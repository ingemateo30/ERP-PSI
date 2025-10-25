// frontend/src/services/facturacionManualService.js
// Service completo para gestión de facturación manual integrado con backend

import apiService from './apiService';

// Base URL que coincide con las rutas del backend (/api/v1/facturas)
const API_BASE = '/facturas';

/**
 * Service para manejo de facturación manual
 * Integrado con las rutas de backend/routes/factura.js
 */
export const facturacionManualService = {

  // ==========================================
  // CRUD BÁSICO DE FACTURAS MANUALES
  // ==========================================

  /**
   * Obtener todas las facturas con filtros y paginación
   * Endpoint: GET /api/v1/facturas
   */
  async obtenerFacturas(params = {}) {
    try {
      console.log('🔍 Obteniendo facturas con parámetros:', params);
      
      // CORREGIDO: Enviar parámetros directamente sin anidar en params
      const response = await apiService.get(API_BASE, params);
      
      // Manejar diferentes estructuras de respuesta
      if (response?.data?.facturas) {
        return {
          facturas: response.data.facturas,
          pagination: response.data.pagination || {},
          stats: response.data.stats || null
        };
      }
      
      if (Array.isArray(response?.data)) {
        return {
          facturas: response.data,
          pagination: {},
          stats: null
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener una factura específica por ID
   * Endpoint: GET /api/v1/facturas/:id
   */
  async obtenerFacturaPorId(id) {
    try {
      console.log(`🔍 Obteniendo factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }

      const response = await apiService.get(`${API_BASE}/${id}`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo factura por ID:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener factura por número
   * Endpoint: GET /api/v1/facturas/numero/:numero
   */
  async obtenerFacturaPorNumero(numero) {
    try {
      console.log(`🔍 Obteniendo factura por número: ${numero}`);
      
      if (!numero) {
        throw new Error('Número de factura requerido');
      }

      const response = await apiService.get(`${API_BASE}/numero/${numero}`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo factura por número:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Crear nueva factura manual
   * Endpoint: POST /api/v1/facturas
   */
  async crearFacturaManual(facturaData) {
    try {
      console.log('➕ Creando factura manual:', facturaData);
      
      // Validaciones básicas antes de enviar
      this.validarDatosFactura(facturaData);
      
      const response = await apiService.post(API_BASE, facturaData);
      
      console.log('✅ Factura creada exitosamente:', response?.data);
      return response;
    } catch (error) {
      console.error('❌ Error creando factura manual:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Actualizar factura existente
   * Endpoint: PUT /api/v1/facturas/:id
   */
  async actualizarFactura(id, facturaData) {
    try {
      console.log(`✏️ Actualizando factura ID: ${id}`, facturaData);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      this.validarDatosFactura(facturaData);
      
      const response = await apiService.put(`${API_BASE}/${id}`, facturaData);
      
      console.log('✅ Factura actualizada exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error actualizando factura:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Duplicar factura existente
   * Endpoint: POST /api/v1/facturas/:id/duplicar
   */
  async duplicarFactura(id) {
    try {
      console.log(`📋 Duplicando factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      const response = await apiService.post(`${API_BASE}/${id}/duplicar`);
      
      console.log('✅ Factura duplicada exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error duplicando factura:', error);
      throw this.handleError(error);
    }
  },
/**
 * Obtener historial completo de facturación de un cliente
 * Endpoint: GET /api/v1/facturas/historial-cliente
 */
/**
 * Obtener historial completo de facturación de un cliente
 * Endpoint: GET /api/v1/facturas/historial-cliente
 */
async obtenerHistorialCliente(params = {}) {
  try {
    console.log('📋 Obteniendo historial de cliente con params:', params);
    
    if (!params.cliente_id) {
      throw new Error('cliente_id es requerido');
    }
    
    // DEBUGGING: Verificar el cliente_id específicamente
    console.log('🔍 Cliente ID recibido:', params.cliente_id, 'Tipo:', typeof params.cliente_id);
    
    // CORRECCIÓN: Asegurar que cliente_id sea string/number válido
    const clienteId = parseInt(params.cliente_id);
    if (isNaN(clienteId) || clienteId <= 0) {
      throw new Error(`cliente_id inválido: ${params.cliente_id}`);
    }
    
    const queryParams = new URLSearchParams({
      cliente_id: clienteId.toString(),
      page: (params.page || 1).toString(),
      limit: (params.limit || 50).toString()
    });
    
    // Agregar filtros opcionales solo si tienen valor
    if (params.estado && params.estado !== 'todas') {
      queryParams.append('estado', params.estado);
    }
    
    if (params.fecha_desde) {
      queryParams.append('fecha_desde', params.fecha_desde);
    }
    
    if (params.fecha_hasta) {
      queryParams.append('fecha_hasta', params.fecha_hasta);
    }
    
    const baseURL = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';
    const url = `${baseURL}/facturas/historial-cliente?${queryParams.toString()}`;
    
    console.log('🔍 URL final construida:', url);
    console.log('🔍 Query params construidos:', Object.fromEntries(queryParams.entries()));
    
    // Obtener token
    const authService = await import('./authService');
    const token = authService.default.getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }
    
    console.log('🔑 Token presente:', !!token);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    // DEBUGGING: Leer el cuerpo de la respuesta para ver el error específico
    const responseText = await response.text();
    console.log('📝 Respuesta completa del servidor:', responseText);
    
    if (response.status === 400) {
      // Intentar parsear el mensaje de error del backend
      try {
        const errorData = JSON.parse(responseText);
        const errorMessage = errorData.message || errorData.error || 'Bad Request sin mensaje';
        console.error('❌ Error 400 del backend:', errorMessage);
        throw new Error(`Error del servidor: ${errorMessage}`);
      } catch (parseError) {
        console.error('❌ Error 400 - Respuesta no es JSON:', responseText);
        throw new Error(`Error 400 del servidor: ${responseText.substring(0, 200)}`);
      }
    }
    
    if (response.status === 401) {
      throw new Error('Token de autenticación inválido o expirado');
    }
    
    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Respuesta no es JSON válido: ${parseError.message}`);
    }
    
    console.log('📊 Datos parseados exitosamente:', data);
    
    // Manejar la estructura de respuesta del backend
    if (data?.success && data?.data) {
      return {
        facturas: data.data.facturas || [],
        estadisticas: data.data.estadisticas || {},
        pagination: data.data.pagination || {}
      };
    } else {
      throw new Error(data?.message || 'Estructura de respuesta no válida');
    }
    
  } catch (error) {
    console.error('❌ Error completo en obtenerHistorialCliente:', error);
    throw error;
  }
},
  // ==========================================
  // GESTIÓN DE PAGOS
  // ==========================================

  /**
   * Registrar pago de factura
   * Endpoint: PATCH /api/v1/facturas/:id/pagar
   */
  async registrarPago(facturaId, datosPago) {
    try {
      console.log(`💰 Registrando pago para factura ID: ${facturaId}`, datosPago);
      
      if (!facturaId || isNaN(facturaId)) {
        throw new Error('ID de factura inválido');
      }
      
      // Validar datos de pago
      if (!datosPago.valor_pagado || datosPago.valor_pagado <= 0) {
        throw new Error('Valor de pago debe ser mayor a 0');
      }
      
      if (!datosPago.metodo_pago) {
        throw new Error('Método de pago es requerido');
      }
      
      const response = await apiService.patch(`${API_BASE}/${facturaId}/pagar`, datosPago);
      
      console.log('✅ Pago registrado exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error registrando pago:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Anular factura
   * Endpoint: PATCH /api/v1/facturas/:id/anular
   */
  async anularFactura(id, motivo = '') {
    try {
      console.log(`❌ Anulando factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      const response = await apiService.patch(`${API_BASE}/${id}/anular`, { motivo });
      
      console.log('✅ Factura anulada exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error anulando factura:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // BÚSQUEDAS Y FILTROS
  // ==========================================

  /**
   * Buscar facturas con criterios específicos
   * Endpoint: GET /api/v1/facturas/search
   */
  async buscarFacturas(criterios = {}) {
    try {
      console.log('🔍 Buscando facturas con criterios:', criterios);
      
      // CORREGIDO: Enviar parámetros directamente
      const response = await apiService.get(`${API_BASE}/search`, criterios);
      return response;
    } catch (error) {
      console.error('❌ Error buscando facturas:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener facturas vencidas
   * Endpoint: GET /api/v1/facturas/vencidas
   */
  async obtenerFacturasVencidas(params = {}) {
    try {
      console.log('⏰ Obteniendo facturas vencidas');
      
      // CORREGIDO: Enviar parámetros directamente
      const response = await apiService.get(`${API_BASE}/vencidas`, params);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo facturas vencidas:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================

  /**
   * Obtener estadísticas de facturas
   * Endpoint: GET /api/v1/facturas/stats
   */
  async obtenerEstadisticas(params = {}) {
    try {
      console.log('📊 Obteniendo estadísticas de facturas');
      
      // CORREGIDO: Enviar parámetros directamente
      const response = await apiService.get(`${API_BASE}/stats`, params);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // GENERACIÓN DE DOCUMENTOS
  // ==========================================

  /**
   * Generar PDF de factura
   * Endpoint: GET /api/v1/facturas/:id/pdf
   */
  async generarPDF(id, download = true) {
    try {
      console.log(`📄 Generando PDF para factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      const response = await apiService.getBlob(`${API_BASE}/${id}/pdf`);
      
      if (download && response.data) {
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `factura_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      console.log('✅ PDF generado exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Ver PDF en navegador
   * Endpoint: GET /api/v1/facturas/:id/ver-pdf
   */
  async verPDF(id) {
    try {
      console.log(`👁️ Visualizando PDF para factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      const response = await apiService.getBlob(`${API_BASE}/${id}/ver-pdf`);
      
      if (response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        window.open(url, '_blank');
        // No revocamos la URL inmediatamente para permitir la visualización
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error visualizando PDF:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // UTILIDADES DE FACTURACIÓN
  // ==========================================

  /**
   * Generar número de factura
   * Endpoint: GET /api/v1/facturas/generar-numero
   */
  async generarNumeroFactura() {
    try {
      console.log('🔢 Generando número de factura');
      
      const response = await apiService.get(`${API_BASE}/generar-numero`);
      return response;
    } catch (error) {
      console.error('❌ Error generando número de factura:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Validar número de factura
   * Endpoint: GET /api/v1/facturas/validate/:numero
   */
  async validarNumeroFactura(numero) {
    try {
      console.log(`✅ Validando número de factura: ${numero}`);
      
      if (!numero) {
        throw new Error('Número de factura requerido');
      }
      
      const response = await apiService.get(`${API_BASE}/validate/${numero}`);
      return response;
    } catch (error) {
      console.error('❌ Error validando número de factura:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener detalles completos de factura
   * Endpoint: GET /api/v1/facturas/:id/detalles
   */
  async obtenerDetallesFactura(id) {
    try {
      console.log(`📋 Obteniendo detalles de factura ID: ${id}`);
      
      if (!id || isNaN(id)) {
        throw new Error('ID de factura inválido');
      }
      
      const response = await apiService.get(`${API_BASE}/${id}/detalles`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo detalles de factura:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // FACTURACIÓN AUTOMÁTICA (SI ESTÁ DISPONIBLE)
  // ==========================================

  /**
   * Generar facturación mensual masiva
   * Endpoint: POST /api/v1/facturas/automatica/generar-mensual
   */
  async generarFacturacionMensual(params = {}) {
    try {
      console.log('🔄 Iniciando facturación mensual masiva');
      
      const response = await apiService.post(`${API_BASE}/automatica/generar-mensual`, params);
      
      console.log('✅ Facturación mensual completada');
      return response;
    } catch (error) {
      console.error('❌ Error en facturación mensual:', error);
      throw this.handleError(error);
    }
  },

  /**
   * Generar factura individual para cliente específico
   * Endpoint: POST /api/v1/facturas/automatica/cliente/:clienteId
   */
  async generarFacturaIndividual(clienteId, params = {}) {
    try {
      console.log(`🧾 Generando factura individual para cliente: ${clienteId}`);
      
      if (!clienteId || isNaN(clienteId)) {
        throw new Error('ID de cliente inválido');
      }
      
      const response = await apiService.post(`${API_BASE}/automatica/cliente/${clienteId}`, params);
      
      console.log('✅ Factura individual generada');
      return response;
    } catch (error) {
      console.error('❌ Error generando factura individual:', error);
      throw this.handleError(error);
    }
  },

  // ==========================================
  // VALIDACIONES Y UTILIDADES
  // ==========================================

  /**
   * Validar datos de factura antes de enviar
   */
  validarDatosFactura(facturaData) {
    const errores = [];

    // Validaciones básicas
    if (!facturaData.cliente_id) {
      errores.push('Cliente es requerido');
    }

    if (!facturaData.fecha_emision) {
      errores.push('Fecha de emisión es requerida');
    }

    if (!facturaData.fecha_vencimiento) {
      errores.push('Fecha de vencimiento es requerida');
    }

    // Validar que fecha de vencimiento sea posterior a fecha de emisión
    if (facturaData.fecha_emision && facturaData.fecha_vencimiento) {
      const fechaEmision = new Date(facturaData.fecha_emision);
      const fechaVencimiento = new Date(facturaData.fecha_vencimiento);
      
      if (fechaVencimiento <= fechaEmision) {
        errores.push('Fecha de vencimiento debe ser posterior a fecha de emisión');
      }
    }

    // Validar valores numéricos
    const camposNumericos = ['internet', 'television', 'saldo_anterior', 'interes', 'reconexion', 'descuento', 'varios', 'publicidad'];
    camposNumericos.forEach(campo => {
      if (facturaData[campo] !== undefined && (isNaN(facturaData[campo]) || facturaData[campo] < 0)) {
        errores.push(`${campo} debe ser un número válido mayor o igual a 0`);
      }
    });

    if (errores.length > 0) {
      throw new Error(`Errores de validación:\n${errores.join('\n')}`);
    }
  },

  /**
   * Calcular totales de factura
   */
  calcularTotales(facturaData) {
    const {
      internet = 0,
      television = 0,
      saldo_anterior = 0,
      interes = 0,
      reconexion = 0,
      descuento = 0,
      varios = 0,
      publicidad = 0
    } = facturaData;

    // Convertir a números
    const subtotal = parseFloat(internet) + parseFloat(television) + parseFloat(varios) + parseFloat(publicidad);
    const otrosCargos = parseFloat(saldo_anterior) + parseFloat(interes) + parseFloat(reconexion);
    const descuentoAplicado = parseFloat(descuento);
    
    const baseGravable = Math.max(0, subtotal - descuentoAplicado);
    const iva = baseGravable * 0.19; // IVA del 19%
    const total = baseGravable + iva + otrosCargos;

    return {
      subtotal: subtotal.toFixed(2),
      descuento: descuentoAplicado.toFixed(2),
      base_gravable: baseGravable.toFixed(2),
      iva: iva.toFixed(2),
      otros_cargos: otrosCargos.toFixed(2),
      total: total.toFixed(2)
    };
  },

  /**
   * Formatear datos de factura para envío
   */
  formatearDatosFactura(facturaData) {
    const totales = this.calcularTotales(facturaData);
    
    return {
      ...facturaData,
      ...totales,
      // Asegurar formato de fechas
      fecha_emision: facturaData.fecha_emision || new Date().toISOString().split('T')[0],
      fecha_vencimiento: facturaData.fecha_vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Convertir valores numéricos
      internet: parseFloat(facturaData.internet || 0),
      television: parseFloat(facturaData.television || 0),
      saldo_anterior: parseFloat(facturaData.saldo_anterior || 0),
      interes: parseFloat(facturaData.interes || 0),
      reconexion: parseFloat(facturaData.reconexion || 0),
      descuento: parseFloat(facturaData.descuento || 0),
      varios: parseFloat(facturaData.varios || 0),
      publicidad: parseFloat(facturaData.publicidad || 0)
    };
  },

  /**
   * Manejo centralizado de errores
   */
  handleError(error) {
    console.error('🚨 Error en facturación manual service:', error);

    // Error de red
    if (!error.response) {
      return {
        type: 'network',
        message: 'Error de conexión. Verifique su conexión a internet.',
        details: error.message
      };
    }

    // Error del servidor
    if (error.response.status >= 500) {
      return {
        type: 'server',
        message: 'Error interno del servidor. Intente nuevamente.',
        status: error.response.status,
        details: error.response.data?.message || error.message
      };
    }

    // Error de validación
    if (error.response.status === 400) {
      return {
        type: 'validation',
        message: error.response.data?.message || 'Datos inválidos',
        status: error.response.status,
        details: error.response.data?.errors || []
      };
    }

    // Error de autorización
    if (error.response.status === 401 || error.response.status === 403) {
      return {
        type: 'authorization',
        message: 'No tiene permisos para realizar esta acción',
        status: error.response.status
      };
    }

    // Error no encontrado
    if (error.response.status === 404) {
      return {
        type: 'not_found',
        message: 'Recurso no encontrado',
        status: error.response.status
      };
    }

    // Error genérico
    return {
      type: 'unknown',
      message: error.response.data?.message || 'Error desconocido',
      status: error.response.status,
      details: error.response.data
    };
  }
};

// ==========================================
// CONSTANTES Y CONFIGURACIONES
// ==========================================

export const ESTADOS_FACTURA = {
  PENDIENTE: 'pendiente',
  PAGADA: 'pagada',
  VENCIDA: 'vencida',
  ANULADA: 'anulada',
  PARCIAL: 'parcial'
};

export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  TARJETA: 'tarjeta',
  CHEQUE: 'cheque',
  PSE: 'pse',
  OTRO: 'otro'
};

export const TIPOS_SERVICIO = {
  INTERNET: 'internet',
  TELEVISION: 'television',
  RECONEXION: 'reconexion',
  INTERES: 'interes',
  DESCUENTO: 'descuento',
  VARIOS: 'varios',
  PUBLICIDAD: 'publicidad'
};

// Export por defecto
export default facturacionManualService;