import apiService from './apiService';

class ClienteCompletoService {
  
  /**
   * Crear cliente completo con servicios agrupados por sede
   */
  async createClienteCompleto(datosCompletos) {
    try {
      console.log('🚀 Enviando datos completos por sede:', datosCompletos);
      
      // Validar estructura de datos
      this.validarDatosCompletos(datosCompletos);
      
      // Enviar al endpoint correcto
      const response = await apiService.post('/clientes-completo/crear', datosCompletos);
      
      console.log('✅ Cliente completo creado:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Error al crear cliente con servicios');
      }
    }
  }

  /**
   * Agregar nueva sede a cliente existente
   */
  async agregarNuevaSedeACliente(clienteId, nuevaSedeData) {
    try {
      console.log(`🏢 Agregando nueva sede al cliente ${clienteId}:`, nuevaSedeData);
      
      const response = await apiService.post(`/clientes-completo/${clienteId}/agregar-sede`, {
        sede: nuevaSedeData
      });
      
      console.log('✅ Nueva sede agregada:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error agregando nueva sede:', error);
      throw new Error(error.response?.data?.message || 'Error al agregar nueva sede');
    }
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
   * Validar datos completos antes de enviar
   */
  validarDatosCompletos(datos) {
    const errores = [];

    // Validar cliente
    if (!datos.cliente) {
      errores.push('Datos del cliente son requeridos');
    } else {
      if (!datos.cliente.identificacion) errores.push('Identificación es requerida');
      if (!datos.cliente.nombre) errores.push('Nombre es requerido');
      if (!datos.cliente.email) errores.push('Email es requerido');
      if (!datos.cliente.telefono) errores.push('Teléfono es requerido');
    }

    // Validar servicios/sedes
    if (!datos.servicios || !Array.isArray(datos.servicios) || datos.servicios.length === 0) {
      errores.push('Debe agregar al menos una sede con servicios');
    } else {
      datos.servicios.forEach((sede, index) => {
        if (!sede.direccion_servicio) {
          errores.push(`Sede ${index + 1}: Dirección es requerida`);
        }
        
        if (!sede.planInternetId && !sede.planTelevisionId) {
          errores.push(`Sede ${index + 1}: Debe tener al menos Internet o Televisión`);
        }

        // Validar precios personalizados si están habilitados
        if (sede.precioPersonalizado) {
          if (sede.planInternetId && !sede.precioInternetCustom) {
            errores.push(`Sede ${index + 1}: Precio personalizado de Internet requerido`);
          }
          if (sede.planTelevisionId && !sede.precioTelevisionCustom) {
            errores.push(`Sede ${index + 1}: Precio personalizado de TV requerido`);
          }
        }
      });
    }

    if (errores.length > 0) {
      throw new Error(`Errores de validación:\n${errores.join('\n')}`);
    }
  }

  /**
   * Previsualizar facturación por sedes
   */
  async previsualizarFacturacion(datosCliente, sedes) {
    try {
      const preview = {
        cliente: datosCliente,
        sedes_preview: []
      };

      for (let i = 0; i < sedes.length; i++) {
        const sede = sedes[i];
        
        const sedePreview = {
          nombre: sede.nombre_sede || `Sede ${i + 1}`,
          direccion: sede.direccion_servicio,
          servicios: [],
          totales: {
            subtotal: 0,
            iva: 0,
            total: 0
          },
          contrato: {
            tipo_permanencia: sede.tipoContrato,
            meses_permanencia: sede.mesesPermanencia || 0
          }
        };

        // Calcular servicios de la sede
        if (sede.planInternetId) {
          const response = await apiService.get(`/config/planes/${sede.planInternetId}`);
          const planInternet = response.data;
          const precio = sede.precioPersonalizado && sede.precioInternetCustom ? 
            parseFloat(sede.precioInternetCustom) : planInternet.precio;
          
          sedePreview.servicios.push({
            tipo: 'Internet',
            plan: planInternet.nombre,
            precio: precio,
            iva: datosCliente.estrato >= 4 ? precio * 0.19 : 0
          });
        }

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
}

export default new ClienteCompletoService();