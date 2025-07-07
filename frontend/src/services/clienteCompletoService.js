// frontend/src/services/clienteCompletoService.js
// Servicio para gestión completa de clientes con servicios

import apiService from './apiService';

const API_BASE = '/api/clientes-completo';

export const clienteCompletoService = {

  /**
   * ============================================
   * CREACIÓN COMPLETA DE CLIENTE
   * ============================================
   */

  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  async createClienteCompleto(datosCompletos) {
    try {
      console.log('🚀 Enviando datos para creación completa:', datosCompletos);
      
      const response = await apiService.post(`${API_BASE}/crear`, datosCompletos);
      
      console.log('✅ Cliente completo creado:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);
      throw error;
    }
  },

  /**
   * Previsualizar primera factura antes de crear cliente
   */
  async previsualizarPrimeraFactura(datosPreview) {
    try {
      console.log('👁️ Previsualizando factura:', datosPreview);
      
      const response = await apiService.post(`${API_BASE}/previsualizar-factura`, datosPreview);
      
      return response;
      
    } catch (error) {
      console.error('❌ Error en previsualización:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * GESTIÓN DE SERVICIOS
   * ============================================
   */

  /**
   * Obtener servicios de un cliente
   */
  async getClientServices(clienteId) {
    try {
      const response = await apiService.get(`${API_BASE}/${clienteId}/servicios`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo servicios del cliente:', error);
      throw error;
    }
  },

  /**
   * Cambiar plan de servicio de un cliente
   */
  async cambiarPlanCliente(clienteId, nuevosPlanData) {
    try {
      console.log(`🔄 Cambiando plan del cliente ${clienteId}:`, nuevosPlanData);
      
      const response = await apiService.put(`${API_BASE}/${clienteId}/cambiar-plan`, nuevosPlanData);
      
      console.log('✅ Plan cambiado exitosamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * CONSULTAS AUXILIARES
   * ============================================
   */

  /**
   * Obtener planes disponibles para asignación
   */
  async getPlanesDisponibles() {
    try {
      const response = await apiService.get(`${API_BASE}/planes-disponibles`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo planes disponibles:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de servicios
   */
  async getEstadisticasServicios() {
    try {
      const response = await apiService.get(`${API_BASE}/estadisticas-servicios`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * ============================================
   * UTILIDADES DE CÁLCULO
   * ============================================
   */

  /**
   * Calcular IVA según tipo de servicio y estrato
   */
  calcularIVA(tipoServicio, estrato, valor) {
    const estratoNumerico = parseInt(estrato) || 4;
    let aplicaIva = false;

    switch (tipoServicio) {
      case 'internet':
        aplicaIva = estratoNumerico > 3;
        break;
      case 'television':
        aplicaIva = true;
        break;
      case 'combo':
        aplicaIva = estratoNumerico > 3;
        break;
      case 'varios':
        aplicaIva = true;
        break;
      default:
        aplicaIva = false;
    }

    return {
      aplica: aplicaIva,
      porcentaje: aplicaIva ? 19 : 0,
      valor: aplicaIva ? Math.round(valor * 0.19) : 0
    };
  },

  /**
   * Calcular totales de facturación en tiempo real
   */
  calcularTotalesEnTiempoReal(plan, precioPersonalizado, estrato) {
    if (!plan) return null;

    const precio = parseFloat(precioPersonalizado) || parseFloat(plan.precio) || 0;
    const valorInstalacion = 42016;

    // Calcular IVA del servicio
    const ivaServicio = this.calcularIVA(plan.tipo, estrato, precio);
    
    // Calcular IVA de instalación (siempre aplica)
    const ivaInstalacion = this.calcularIVA('varios', estrato, valorInstalacion);

    const subtotal = precio + valorInstalacion;
    const totalIva = ivaServicio.valor + ivaInstalacion.valor;
    const total = subtotal + totalIva;

    return {
      servicio: {
        precio: precio,
        iva: ivaServicio.valor,
        total: precio + ivaServicio.valor,
        aplica_iva: ivaServicio.aplica
      },
      instalacion: {
        precio: valorInstalacion,
        iva: ivaInstalacion.valor,
        total: valorInstalacion + ivaInstalacion.valor,
        aplica_iva: ivaInstalacion.aplica
      },
      resumen: {
        subtotal: subtotal,
        iva: totalIva,
        total: total
      },
      desglose: [
        {
          concepto: `${plan.nombre} - Primer período (30 días)`,
          cantidad: 1,
          precio_unitario: precio,
          subtotal: precio,
          iva: ivaServicio.valor,
          total: precio + ivaServicio.valor,
          aplica_iva: ivaServicio.aplica
        },
        {
          concepto: 'Cargo por instalación',
          cantidad: 1,
          precio_unitario: valorInstalacion,
          subtotal: valorInstalacion,
          iva: ivaInstalacion.valor,
          total: valorInstalacion + ivaInstalacion.valor,
          aplica_iva: ivaInstalacion.aplica
        }
      ]
    };
  },

  /**
   * ============================================
   * VALIDACIONES
   * ============================================
   */

  /**
   * Validar datos de cliente completo antes de enviar
   */
  validarDatosClienteCompleto(datos) {
    const errores = [];

    // Validar cliente
    if (!datos.cliente) {
      errores.push('Datos del cliente son requeridos');
      return errores;
    }

    const { cliente, servicio } = datos;

    // Validaciones de cliente
    if (!cliente.identificacion?.trim()) {
      errores.push('La identificación es requerida');
    }

    if (!cliente.nombre?.trim()) {
      errores.push('El nombre es requerido');
    }

    if (!cliente.email?.trim()) {
      errores.push('El email es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
      errores.push('El email no tiene un formato válido');
    }

    if (!cliente.telefono?.trim()) {
      errores.push('El teléfono es requerido');
    }

    if (!cliente.direccion?.trim()) {
      errores.push('La dirección es requerida');
    }

    if (!cliente.ciudad_id) {
      errores.push('La ciudad es requerida');
    }

    // Validaciones de servicio
    if (!servicio) {
      errores.push('Datos del servicio son requeridos');
      return errores;
    }

    if (!servicio.plan_id) {
      errores.push('El plan de servicio es requerido');
    }

    // Validar fecha de activación
    if (servicio.fecha_activacion) {
      const fechaActivacion = new Date(servicio.fecha_activacion);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaActivacion < hoy) {
        errores.push('La fecha de activación no puede ser anterior a hoy');
      }
    }

    // Validar precio personalizado si se proporciona
    if (servicio.precio_personalizado) {
      const precio = parseFloat(servicio.precio_personalizado);
      if (isNaN(precio) || precio <= 0) {
        errores.push('El precio personalizado debe ser un número válido mayor a 0');
      }
    }

    return errores;
  },

  /**
   * ============================================
   * FORMATEO DE DATOS
   * ============================================
   */

  /**
   * Formatear datos para envío al backend
   */
  formatearDatosParaEnvio(formData) {
    return {
      cliente: {
        identificacion: formData.identificacion?.trim(),
        tipo_documento: formData.tipo_documento || 'cedula',
        nombre: formData.nombre?.trim(),
        email: formData.email?.trim().toLowerCase(),
        telefono: formData.telefono?.trim(),
        telefono_fijo: formData.telefono_fijo?.trim() || null,
        direccion: formData.direccion?.trim(),
        barrio: formData.barrio?.trim() || null,
        estrato: formData.estrato || '3',
        ciudad_id: parseInt(formData.ciudad_id),
        sector_id: formData.sector_id ? parseInt(formData.sector_id) : null,
        observaciones: formData.observaciones?.trim() || null,
        fecha_inicio_contrato: formData.fecha_activacion
      },
      servicio: {
        plan_id: parseInt(formData.plan_id),
        precio_personalizado: formData.precio_personalizado ? 
          parseFloat(formData.precio_personalizado) : null,
        fecha_activacion: formData.fecha_activacion,
        observaciones: formData.observaciones_servicio?.trim() || null
      },
      opciones: {
        generar_documentos: formData.generar_documentos !== false,
        enviar_bienvenida: formData.enviar_bienvenida !== false,
        programar_instalacion: formData.programar_instalacion !== false
      }
    };
  },

  /**
   * ============================================
   * UTILIDADES DE PRESENTACIÓN
   * ============================================
   */

  /**
   * Formatear mensaje de éxito con documentos generados
   */
  formatearMensajeExito(response) {
    const { data } = response;
    let mensaje = `Cliente creado exitosamente.\n\n`;
    
    if (data.documentos_generados) {
      const docs = data.documentos_generados;
      
      if (docs.contrato) {
        mensaje += `✅ Contrato: ${docs.contrato.numero}\n`;
      }
      
      if (docs.orden_instalacion) {
        mensaje += `✅ Orden de instalación: ${docs.orden_instalacion.numero}\n`;
        mensaje += `📅 Fecha programada: ${docs.orden_instalacion.fecha_programada}\n`;
      }
      
      if (docs.factura) {
        mensaje += `✅ Primera factura: ${docs.factura.numero_factura}\n`;
        mensaje += `💰 Total: $${docs.factura.total.toLocaleString()}\n`;
        
        if (docs.factura.conceptos_incluidos) {
          mensaje += `📋 Conceptos: ${docs.factura.conceptos_incluidos.join(', ')}\n`;
        }
      }
    }

    if (data.email_enviado) {
      mensaje += `📧 Email de bienvenida enviado\n`;
    }

    return mensaje;
  },

  /**
   * Obtener color de estado de servicio
   */
  getColorEstadoServicio(estado) {
    const colores = {
      'activo': 'green',
      'suspendido': 'yellow', 
      'cortado': 'red',
      'cancelado': 'gray'
    };
    
    return colores[estado] || 'gray';
  },

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha) {
    if (!fecha) return '-';
    
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return fecha;
    }
  },

  /**
   * Formatear moneda
   */
  formatearMoneda(valor) {
    if (!valor && valor !== 0) return '$0';
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  },

  /**
   * ============================================
   * MANEJO DE ERRORES
   * ============================================
   */

  /**
   * Procesar errores de respuesta del backend
   */
  procesarError(error) {
    console.error('Error procesado:', error);
    
    // Error de red
    if (!error.response) {
      return {
        tipo: 'conexion',
        mensaje: 'Error de conexión. Verifique su conexión a internet.',
        detalles: null
      };
    }

    const { status, data } = error.response;

    // Error de validación (400)
    if (status === 400) {
      return {
        tipo: 'validacion',
        mensaje: data.message || 'Datos inválidos',
        detalles: data.errors || null
      };
    }

    // Error de duplicado (409)
    if (status === 409) {
      return {
        tipo: 'duplicado',
        mensaje: 'Ya existe un cliente con esta identificación',
        detalles: null
      };
    }

    // Error de autorización (401, 403)
    if (status === 401 || status === 403) {
      return {
        tipo: 'autorizacion',
        mensaje: 'No tiene permisos para realizar esta acción',
        detalles: null
      };
    }

    // Error del servidor (500+)
    if (status >= 500) {
      return {
        tipo: 'servidor',
        mensaje: 'Error interno del servidor. Intente nuevamente.',
        detalles: data.error || null
      };
    }

    // Error genérico
    return {
      tipo: 'general',
      mensaje: data.message || 'Ha ocurrido un error inesperado',
      detalles: data.error || null
    };
  },

  /**
   * ============================================
   * UTILIDADES ADICIONALES
   * ============================================
   */

  /**
   * Generar ID único para transacciones
   */
  generarIdTransaccion() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Formatear número de teléfono
   */
  formatearTelefono(telefono) {
    if (!telefono) return '';
    
    // Remover caracteres no numéricos
    const numeros = telefono.replace(/\D/g, '');
    
    // Formatear según longitud
    if (numeros.length === 10) {
      return `${numeros.substr(0, 3)}-${numeros.substr(3, 3)}-${numeros.substr(6, 4)}`;
    } else if (numeros.length === 7) {
      return `${numeros.substr(0, 3)}-${numeros.substr(3, 4)}`;
    }
    
    return telefono;
  },

  /**
   * Validar número de identificación
   */
  validarIdentificacion(identificacion, tipoDocumento = 'cedula') {
    if (!identificacion) return false;
    
    const numero = identificacion.replace(/\D/g, '');
    
    switch (tipoDocumento) {
      case 'cedula':
        return numero.length >= 6 && numero.length <= 10;
      case 'nit':
        return numero.length >= 9 && numero.length <= 12;
      case 'pasaporte':
        return identificacion.length >= 6 && identificacion.length <= 20;
      default:
        return numero.length >= 6;
    }
  },

  /**
   * Calcular edad desde fecha de nacimiento
   */
  calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  },

  /**
   * Obtener próxima fecha de facturación
   */
  calcularProximaFacturacion(fechaUltimaFacturacion, cicloFacturacion = 'mensual') {
    if (!fechaUltimaFacturacion) return null;
    
    const ultima = new Date(fechaUltimaFacturacion);
    const proxima = new Date(ultima);
    
    switch (cicloFacturacion) {
      case 'mensual':
        proxima.setMonth(proxima.getMonth() + 1);
        break;
      case 'bimestral':
        proxima.setMonth(proxima.getMonth() + 2);
        break;
      case 'trimestral':
        proxima.setMonth(proxima.getMonth() + 3);
        break;
      default:
        proxima.setMonth(proxima.getMonth() + 1);
    }
    
    return proxima.toISOString().split('T')[0];
  },

  /**
   * Generar resumen de cliente para reportes
   */
  generarResumenCliente(cliente, servicios = []) {
    const servicioActivo = servicios.find(s => s.estado === 'activo');
    const totalServicios = servicios.length;
    const valorMensual = servicioActivo ? 
      (servicioActivo.precio_personalizado || servicioActivo.plan_precio) : 0;
    
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      identificacion: cliente.identificacion,
      email: cliente.email,
      telefono: cliente.telefono,
      estado: cliente.estado,
      estrato: cliente.estrato,
      servicio_activo: servicioActivo ? servicioActivo.plan_nombre : 'Sin servicio',
      valor_mensual: this.formatearMoneda(valorMensual),
      total_servicios: totalServicios,
      fecha_registro: this.formatearFecha(cliente.created_at),
      dias_como_cliente: cliente.created_at ? 
        Math.floor((new Date() - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24)) : 0
    };
  },

  /**
   * Validar email
   */
  validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Limpiar string
   */
  limpiarString(str) {
    if (!str) return '';
    return str.toString().trim().replace(/\s+/g, ' ');
  },

  /**
   * Capitalizar texto
   */
  capitalizarTexto(texto) {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  },

  /**
   * Formatear identificación
   */
  formatearIdentificacion(identificacion, tipoDocumento = 'cedula') {
    if (!identificacion) return '';
    
    const limpio = identificacion.replace(/\D/g, '');
    
    if (tipoDocumento === 'nit' && limpio.length >= 9) {
      return limpio.replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
    }
    
    return limpio;
  },

  /**
   * Calcular días entre fechas
   */
  calcularDiasEntreFechas(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  },

  /**
   * Obtener nombre del mes
   */
  obtenerNombreMes(fecha) {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const fechaObj = new Date(fecha);
    return meses[fechaObj.getMonth()];
  },

  /**
   * Validar rango de fechas
   */
  validarRangoFechas(fechaInicio, fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const hoy = new Date();
    
    if (inicio > fin) {
      return { valido: false, mensaje: 'La fecha de inicio debe ser anterior a la fecha de fin' };
    }
    
    if (inicio > hoy) {
      return { valido: false, mensaje: 'La fecha de inicio no puede ser futura' };
    }
    
    return { valido: true, mensaje: '' };
  }
};

export default clienteCompletoService;