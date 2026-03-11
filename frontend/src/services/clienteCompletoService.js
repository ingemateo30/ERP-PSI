// frontend/src/services/clienteCompletoService.js - CORREGIDO

import apiService from './apiService';

class ClienteCompletoService {
  
  /**
   * Crear cliente completo con servicios agrupados por sede - CORREGIDO
   */
  async createClienteCompleto(datosCompletos) {
    try {
      console.log('🚀 Enviando datos completos por sede:', datosCompletos);

       const user = JSON.parse(localStorage.getItem('user'));
      const createdBy = user?.id || 1;
      
      // Validar estructura de datos antes de enviar
      this.validarDatosCompletos(datosCompletos);

    
      
      // SOLUCIÓN: Asegurar que los datos estén en el formato correcto
      const datosLimpios = this.limpiarDatosParaEnvio(datosCompletos);
      
      console.log('📦 Datos limpios para envío:', datosLimpios);

         const datosConCreatedBy = {
        ...datosLimpios,
        created_by: createdBy
      };
      
      // Enviar al endpoint correcto
      const response = await apiService.post('/clientes-completo/crear', datosConCreatedBy);
      
      console.log('✅ Cliente completo creado:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);
      
      // Mejorar el manejo de errores
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error al crear cliente con servicios');
      }
    }
  }

  /**
   * NUEVO: Limpiar datos para envío y evitar problemas de serialización
   */
  limpiarDatosParaEnvio(datos) {
    try {
      // Crear una copia profunda de los datos para evitar modificar el original
      const datosCopia = JSON.parse(JSON.stringify(datos));
      
      // Limpiar datos del cliente
      if (datosCopia.cliente) {
        // Eliminar campos undefined o null
        Object.keys(datosCopia.cliente).forEach(key => {
          if (datosCopia.cliente[key] === undefined || datosCopia.cliente[key] === null) {
            delete datosCopia.cliente[key];
          }
          // Limpiar strings
          if (typeof datosCopia.cliente[key] === 'string') {
            datosCopia.cliente[key] = datosCopia.cliente[key].trim();
          }
        });
      }

      // Limpiar servicios/sedes
      if (datosCopia.servicios && Array.isArray(datosCopia.servicios)) {
        datosCopia.servicios = datosCopia.servicios.map(servicio => {
          const servicioLimpio = { ...servicio };
          
          // Eliminar campos undefined o null
          Object.keys(servicioLimpio).forEach(key => {
            if (servicioLimpio[key] === undefined || servicioLimpio[key] === null) {
              delete servicioLimpio[key];
            }
            // Limpiar strings
            if (typeof servicioLimpio[key] === 'string') {
              servicioLimpio[key] = servicioLimpio[key].trim();
            }
          });

          // Asegurar que los IDs sean números si están presentes
          if (servicioLimpio.planInternetId) {
            servicioLimpio.planInternetId = parseInt(servicioLimpio.planInternetId);
          }
          if (servicioLimpio.planTelevisionId) {
            servicioLimpio.planTelevisionId = parseInt(servicioLimpio.planTelevisionId);
          }
          if (servicioLimpio.ciudad_id) {
            servicioLimpio.ciudad_id = parseInt(servicioLimpio.ciudad_id);
          }
          if (servicioLimpio.sector_id) {
            servicioLimpio.sector_id = parseInt(servicioLimpio.sector_id);
          }

          // Convertir precios a números si están presentes
          if (servicioLimpio.precioInternetCustom) {
            servicioLimpio.precioInternetCustom = parseFloat(servicioLimpio.precioInternetCustom);
          }
          if (servicioLimpio.precioTelevisionCustom) {
            servicioLimpio.precioTelevisionCustom = parseFloat(servicioLimpio.precioTelevisionCustom);
          }

          return servicioLimpio;
        });
      }

      // Limpiar opciones si están presentes
      if (datosCopia.opciones) {
        Object.keys(datosCopia.opciones).forEach(key => {
          if (datosCopia.opciones[key] === undefined || datosCopia.opciones[key] === null) {
            delete datosCopia.opciones[key];
          }
        });
      }

      return datosCopia;
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
      throw new Error('Error al procesar datos para envío');
    }
  }

  /**
   * Agregar nueva sede a cliente existente
   */
  async agregarNuevaSedeACliente(clienteId, nuevaSedeData) {
    try {
      console.log(`🏢 Agregando nueva sede al cliente ${clienteId}:`, nuevaSedeData);
      
      // Limpiar datos de la nueva sede
      const sedeDataLimpia = this.limpiarDatosParaEnvio({ sede: nuevaSedeData }).sede;
      
      const response = await apiService.post(`/clientes-completo/${clienteId}/agregar-sede`, {
        sede: sedeDataLimpia
      });
      
      console.log('✅ Nueva sede agregada:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error agregando nueva sede:', error);
      throw new Error(error.response?.data?.message || 'Error al agregar nueva sede');
    }
  }

  /**
   * Previsualizar cliente antes de crear
   */
  async previsualizarCliente(datosCompletos) {
    try {
      console.log('👁️ Generando previsualización:', datosCompletos);
      
      // Validar datos
      this.validarDatosCompletos(datosCompletos);
      
      const preview = {
        cliente_info: {
          identificacion: datosCompletos.cliente.identificacion,
          nombre: datosCompletos.cliente.nombre,
          email: datosCompletos.cliente.email,
          telefono: datosCompletos.cliente.telefono,
          estrato: datosCompletos.cliente.estrato || 3
        },
        sedes_preview: []
      };

      // Generar preview de cada sede
      for (const sede of datosCompletos.servicios) {
        const sedePreview = {
          direccion: sede.direccion_servicio || sede.direccionServicio,
          nombre_sede: sede.nombre_sede || sede.nombreSede || 'Sede Principal',
          servicios: [],
          totales: {
            subtotal: 0,
            iva: 0,
            total: 0
          }
        };

        // Agregar Internet si está configurado
        if (sede.planInternetId) {
          const response = await apiService.get(`/config/planes/${sede.planInternetId}`);
          const planInternet = response.data;
          const precio = sede.precioPersonalizado && sede.precioInternetCustom ? 
            parseFloat(sede.precioInternetCustom) : planInternet.precio;
          
          sedePreview.servicios.push({
            tipo: 'Internet',
            plan: planInternet.nombre,
            precio: precio,
            iva: datosCompletos.cliente.estrato >= 4 ? precio * 0.19 : 0
          });
        }

        // Agregar Televisión si está configurado
        if (sede.planTelevisionId) {
          const response = await apiService.get(`/config/planes/${sede.planTelevisionId}`);
          const planTv = response.data;
          const precio = sede.precioPersonalizado && sede.precioTelevisionCustom ? 
            parseFloat(sede.precioTelevisionCustom) : planTv.precio;
          
          sedePreview.servicios.push({
            tipo: 'Televisión',
            plan: planTv.nombre,
            precio: precio,
            iva: precio * 0.19
          });
        }

        // Calcular totales de la sede
        sedePreview.totales.subtotal = sedePreview.servicios.reduce((sum, s) => sum + s.precio, 0);
        sedePreview.totales.iva = sedePreview.servicios.reduce((sum, s) => sum + s.iva, 0);
        sedePreview.totales.total = sedePreview.totales.subtotal + sedePreview.totales.iva;

        preview.sedes_preview.push(sedePreview);
      }

      // Totales generales
      preview.totales_generales = {
        total_sedes: preview.sedes_preview.length,
        total_contratos: preview.sedes_preview.length,
        total_facturas: preview.sedes_preview.length,
        monto_total_mensual: preview.sedes_preview.reduce((sum, sede) => sum + sede.totales.total, 0)
      };

      return { success: true, data: preview };

    } catch (error) {
      console.error('❌ Error en previsualización:', error);
      throw new Error('Error generando previsualización');
    }
  }

  /**
   * Obtener servicios activos e histórico de un cliente
   */
  async getClientServices(clienteId) {
    try {
      const response = await apiService.get(`/clientes-completo/${clienteId}/servicios`);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo servicios del cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener servicios');
    }
  }

  /**
   * Obtener planes de servicio disponibles
   */
  async getPlanesDisponibles() {
    try {
      const response = await apiService.get('/config/service-plans');
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo planes disponibles:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener planes');
    }
  }

  /**
   * Cambiar plan de servicio del cliente
   */
  async cambiarPlanCliente(clienteId, datos) {
    try {
      const response = await apiService.put(`/clientes-completo/${clienteId}/cambiar-plan`, datos);
      return response;
    } catch (error) {
      console.error('❌ Error cambiando plan del cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al cambiar plan');
    }
  }

  /**
   * Agregar un servicio adicional al cliente
   */
  async agregarServicioCliente(clienteId, datos) {
    try {
      const response = await apiService.post(`/clientes/${clienteId}/agregar-servicio`, datos);
      return response;
    } catch (error) {
      console.error('❌ Error agregando servicio al cliente:', error);
      throw new Error(error.response?.data?.message || 'Error al agregar servicio');
    }
  }

  /**
   * Cancela la instalación de un cliente recién creado cuando no se pudo realizar.
   * Anula contrato y facturas pendientes para evitar cobros de mora.
   * @param {number} clienteId
   * @param {object} datos - { motivo: string, observaciones?: string }
   */
  async cancelarInstalacion(clienteId, datos) {
    try {
      const response = await apiService.post(`/clientes/${clienteId}/cancelar-instalacion`, datos);
      return response;
    } catch (error) {
      console.error('❌ Error cancelando instalación:', error);
      throw new Error(error.response?.data?.message || 'Error al cancelar la instalación');
    }
  }

  /**
   * Formatear valor a moneda colombiana
   */
  formatearMoneda(valor) {
    if (!valor && valor !== 0) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  /**
   * Formatear fecha a formato legible
   */
  formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    try {
      const datePart = fecha.split('T')[0].split(' ')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Calcular totales en tiempo real para previsualización
   */
  calcularTotalesEnTiempoReal(plan, precioPersonalizado, estrato) {
    const precio = precioPersonalizado ? parseFloat(precioPersonalizado) : parseFloat(plan.precio || 0);
    const estratoNum = parseInt(estrato) || 3;
    // IVA: internet exento estratos 1-3, TV siempre 19%
    const aplicaIva = plan.tipo === 'television' || (plan.tipo === 'internet' && estratoNum >= 4);
    const iva = aplicaIva ? Math.round(precio * 0.19) : 0;
    return {
      servicio: {
        precio,
        iva,
        total: precio + iva,
        aplica_iva: aplicaIva
      }
    };
  }

  /**
   * Listar todas las sedes de un cliente
   */
  async listarSedesCliente(clienteId) {
    try {
      const response = await apiService.get(`/clientes-completo/${clienteId}/sedes`);
      return response;
    } catch (error) {
      console.error('❌ Error listando sedes:', error);
      throw new Error(error.response?.data?.message || 'Error al listar sedes del cliente');
    }
  }

  /**
   * Validar datos completos antes de enviar - MEJORADO
   */
 validarDatosCompletos(datos) {
  const errores = [];

  console.log('🔍 Validando datos completos:', datos);

  // Validar cliente
  if (!datos.cliente) {
    errores.push('Datos del cliente son requeridos');
  } else {
    if (!datos.cliente.identificacion || !datos.cliente.identificacion.trim()) {
      errores.push('Identificación es requerida');
    }
    if (!datos.cliente.nombre || !datos.cliente.nombre.trim()) {
      errores.push('Nombre es requerido');
    }
    if (!datos.cliente.email || !datos.cliente.email.trim()) {
      errores.push('Email es requerido');
    }
    if (!datos.cliente.telefono || !datos.cliente.telefono.trim()) {
      errores.push('Teléfono es requerido');
    }
    if (!datos.cliente.direccion || !datos.cliente.direccion.trim()) {
      errores.push('Dirección es requerida');
    }
  }

  // ✅ CORRECCIÓN: Validar servicios (puede venir como 'servicios' o 'sedes')
  const servicios = datos.servicios || datos.sedes || [];
  
  if (!Array.isArray(servicios) || servicios.length === 0) {
    errores.push('Debe agregar al menos una sede con servicios');
  } else {
    servicios.forEach((sede, index) => {
      // Validar dirección de servicio
      const direccion = sede.direccion_servicio || sede.direccionServicio || sede.direccion;
      if (!direccion || !direccion.trim()) {
        errores.push(`Sede ${index + 1}: Dirección de servicio es requerida`);
      }
      
      // Validar que tenga al menos un servicio
      if (!sede.planInternetId && !sede.planTelevisionId) {
        errores.push(`Sede ${index + 1}: Debe tener al menos Internet o Televisión`);
      }

      // Validar IDs de planes son números
      if (sede.planInternetId && isNaN(parseInt(sede.planInternetId))) {
        errores.push(`Sede ${index + 1}: ID de plan de Internet debe ser un número`);
      }
      
      if (sede.planTelevisionId && isNaN(parseInt(sede.planTelevisionId))) {
        errores.push(`Sede ${index + 1}: ID de plan de Televisión debe ser un número`);
      }

      // Validar precios personalizados si están habilitados
      if (sede.precioPersonalizado) {
        if (sede.planInternetId && (!sede.precioInternetCustom || isNaN(parseFloat(sede.precioInternetCustom)))) {
          errores.push(`Sede ${index + 1}: Precio personalizado de Internet es inválido`);
        }
        if (sede.planTelevisionId && (!sede.precioTelevisionCustom || isNaN(parseFloat(sede.precioTelevisionCustom)))) {
          errores.push(`Sede ${index + 1}: Precio personalizado de Televisión es inválido`);
        }
      }

      // Validar tipo de contrato
      if (!sede.tipoContrato) {
        errores.push(`Sede ${index + 1}: Tipo de contrato es requerido`);
      } else if (!['con_permanencia', 'sin_permanencia'].includes(sede.tipoContrato)) {
        errores.push(`Sede ${index + 1}: Tipo de contrato debe ser 'con_permanencia' o 'sin_permanencia'`);
      }
    });
  }

  if (errores.length > 0) {
    console.error('❌ Errores de validación:', errores);
    throw new Error(`Errores de validación: ${errores.join(', ')}`);
  }

  console.log('✅ Datos validados correctamente');
}
}

export default new ClienteCompletoService();