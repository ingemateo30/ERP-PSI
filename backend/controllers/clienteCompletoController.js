// backend/controllers/clienteCompletoController.js
// Controlador para gestión completa de clientes con servicios

const ClienteCompletoService = require('../services/ClienteCompletoService');

class ClienteCompletoController {

  /**
   * ============================================
   * CREAR CLIENTE COMPLETO
   * ============================================
   */

  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  async crearClienteCompleto(req, res) {
    try {
      console.log('📝 Solicitud de creación completa de cliente:', req.body);

      // Validar datos requeridos
      const validacionErrores = this.validarDatosClienteCompleto(req.body);
      if (validacionErrores.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validacionErrores
        });
      }

      // Preparar datos estructurados
      const datosCompletos = {
        cliente: {
          identificacion: req.body.cliente.identificacion,
          tipo_documento: req.body.cliente.tipo_documento || 'cedula',
          nombre: req.body.cliente.nombre,
          email: req.body.cliente.email,
          telefono: req.body.cliente.telefono,
          telefono_fijo: req.body.cliente.telefono_fijo,
          direccion: req.body.cliente.direccion,
          barrio: req.body.cliente.barrio,
          estrato: req.body.cliente.estrato || '3',
          ciudad_id: req.body.cliente.ciudad_id,
          sector_id: req.body.cliente.sector_id,
          observaciones: req.body.cliente.observaciones,
          fecha_inicio_contrato: req.body.cliente.fecha_inicio_contrato
        },
        servicio: {
          plan_id: req.body.servicio.plan_id,
          tipo_permanencia: req.body.servicio.tipo_permanencia || 'sin_permanencia',
          precio_personalizado: req.body.servicio.precio_personalizado,
          fecha_activacion: req.body.servicio.fecha_activacion || new Date().toISOString().split('T')[0],
          observaciones: req.body.servicio.observaciones
        },
        opciones: {
          generar_documentos: req.body.opciones?.generar_documentos !== false,
          enviar_bienvenida: req.body.opciones?.enviar_bienvenida !== false,
          programar_instalacion: req.body.opciones?.programar_instalacion !== false
        }
      };

      // Ejecutar creación completa
      const createdBy = req.body.created_by || req.user?.id || req.user?.userId || req.userId || 1;
      const resultado = await ClienteCompletoService.crearClienteCompleto(datosCompletos, createdBy);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente con todos los servicios',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);

      // Manejo de errores específicos
      if (error.code === 'ER_DUP_ENTRY') {
        // Importar helper de cliente existente
        const { generarRespuestaErrorDuplicado } = require('../utils/clienteExistenteHelper');

        try {
          const identificacion = req.body.cliente?.identificacion || req.body.identificacion;
          const errorInfo = await generarRespuestaErrorDuplicado(identificacion);
          return res.status(errorInfo.statusCode).json(errorInfo.response);
        } catch (helperError) {
          console.error('Error al generar respuesta detallada:', helperError);
          return res.status(409).json({
            success: false,
            message: 'Ya existe un cliente con esta identificación',
            detalle: 'Verifique los datos del cliente existente antes de crear uno nuevo'
          });
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * Previsualizar primera factura antes de crear cliente
   */
  async previsualizarPrimeraFactura(req, res) {
    try {
      console.log('👁️ Solicitud de previsualización de factura:', req.body);

      const datosPreview = {
        plan_id: req.body.plan_id,
        precio_personalizado: req.body.precio_personalizado,
        fecha_facturacion: req.body.fecha_facturacion || new Date().toISOString().split('T')[0],
        conceptos_adicionales: req.body.conceptos_adicionales || []
      };

      const previewFactura = await ClienteCompletoService.previsualizarPrimeraFactura(datosPreview);

      res.json({
        success: true,
        data: previewFactura
      });

    } catch (error) {
      console.error('❌ Error en previsualización:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando previsualización'
      });
    }
  }

  /**
   * ============================================
   * GESTIÓN DE SERVICIOS
   * ============================================
   */

  /**
   * Obtener servicios de un cliente
   */
  async getServiciosCliente(req, res) {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const servicios = await ClienteCompletoService.obtenerServiciosCliente(clienteId);

      res.json({
        success: true,
        data: servicios
      });

    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo servicios del cliente'
      });
    }
  }

  /**
   * Cambiar plan de servicio de un cliente
   */
  async cambiarPlanCliente(req, res) {
    try {
      const { clienteId } = req.params;
      const datosNuevoPlan = req.body;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      if (!datosNuevoPlan.plan_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del nuevo plan es requerido'
        });
      }

      const resultado = await ClienteCompletoService.cambiarPlanCliente(clienteId, datosNuevoPlan);

      res.json({
        success: true,
        message: 'Plan cambiado exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error cambiando plan del cliente'
      });
    }
  }

  /**
   * Suspender servicio de un cliente
   */
  async suspenderServicio(req, res) {
    try {
      const { clienteId } = req.params;
      const { motivo } = req.body;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const resultado = await ClienteCompletoService.suspenderServicio(clienteId, motivo);

      res.json({
        success: true,
        message: 'Servicio suspendido exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error suspendiendo servicio:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error suspendiendo servicio'
      });
    }
  }

  /**
   * Reactivar servicio de un cliente
   */
  async reactivarServicio(req, res) {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const resultado = await ClienteCompletoService.reactivarServicio(clienteId);

      res.json({
        success: true,
        message: 'Servicio reactivado exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error reactivando servicio:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error reactivando servicio'
      });
    }
  }

  /**
   * ============================================
   * CONSULTAS Y DETALLES
   * ============================================
   */

  /**
   * Obtener cliente completo con servicios
   */
  async getClienteCompleto(req, res) {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const clienteCompleto = await ClienteCompletoService.obtenerClienteCompleto(clienteId);

      res.json({
        success: true,
        data: clienteCompleto
      });

    } catch (error) {
      console.error('❌ Error obteniendo cliente completo:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo datos del cliente'
      });
    }
  }

  /**
   * Obtener historial de servicios
   */
  async getHistorialServicios(req, res) {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const historial = await ClienteCompletoService.obtenerHistorialServicios(clienteId);

      res.json({
        success: true,
        data: historial
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo historial de servicios'
      });
    }
  }

  /**
   * Obtener estadísticas de cliente
   */
  async getEstadisticasCliente(req, res) {
    try {
      const { clienteId } = req.params;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const estadisticas = await ClienteCompletoService.obtenerEstadisticasCliente(clienteId);

      res.json({
        success: true,
        data: estadisticas
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo estadísticas del cliente'
      });
    }
  }

  /**
   * ============================================
   * DOCUMENTOS Y FACTURACIÓN
   * ============================================
   */

  /**
   * Generar contrato
   */
  async generarContrato(req, res) {
    try {
      const { clienteId } = req.params;
      const { tipo_contrato } = req.body;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const contrato = await ClienteCompletoService.generarContrato(clienteId, tipo_contrato);

      res.json({
        success: true,
        message: 'Contrato generado exitosamente',
        data: contrato
      });

    } catch (error) {
      console.error('❌ Error generando contrato:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando contrato'
      });
    }
  }

  /**
   * Generar orden de instalación
   */
  async generarOrdenInstalacion(req, res) {
    try {
      const { clienteId } = req.params;
      const { fecha_instalacion } = req.body;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const orden = await ClienteCompletoService.generarOrdenInstalacion(clienteId, fecha_instalacion);

      res.json({
        success: true,
        message: 'Orden de instalación generada exitosamente',
        data: orden
      });

    } catch (error) {
      console.error('❌ Error generando orden:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando orden de instalación'
      });
    }
  }

  /**
   * Generar factura inmediata
   */
  async generarFacturaInmediata(req, res) {
    try {
      const { clienteId } = req.params;
      const { conceptos_adicionales } = req.body;

      if (!clienteId) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      const factura = await ClienteCompletoService.generarFacturaInmediata(clienteId, conceptos_adicionales);

      res.json({
        success: true,
        message: 'Factura generada exitosamente',
        data: factura
      });

    } catch (error) {
      console.error('❌ Error generando factura:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generando factura'
      });
    }
  }

  /**
   * ============================================
   * UTILIDADES
   * ============================================
   */

  /**
   * Obtener planes disponibles
   */
  async getPlanesDisponibles(req, res) {
    try {
      const planes = await ClienteCompletoService.obtenerPlanesDisponibles();

      res.json({
        success: true,
        data: planes
      });

    } catch (error) {
      console.error('❌ Error obteniendo planes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo planes disponibles'
      });
    }
  }

  /**
   * Verificar disponibilidad de identificación
   */
  async verificarDisponibilidadIdentificacion(req, res) {
    try {
      const { identificacion, tipo_documento } = req.query;

      if (!identificacion) {
        return res.status(400).json({
          success: false,
          message: 'Identificación es requerida'
        });
      }

      const disponible = await ClienteCompletoService.verificarDisponibilidadIdentificacion(
        identificacion,
        tipo_documento || 'cedula'
      );

      res.json({
        success: true,
        data: { disponible }
      });

    } catch (error) {
      console.error('❌ Error verificando identificación:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error verificando disponibilidad'
      });
    }
  }

  /**
   * Calcular precio de plan
   */
  async calcularPrecioPlan(req, res) {
    try {
      const { plan_id, datos_cliente } = req.body;

      if (!plan_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del plan es requerido'
        });
      }

      const precio = await ClienteCompletoService.calcularPrecioPlan(plan_id, datos_cliente);

      res.json({
        success: true,
        data: precio
      });

    } catch (error) {
      console.error('❌ Error calculando precio:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error calculando precio del plan'
      });
    }
  }

  /**
   * ============================================
   * VALIDACIONES
   * ============================================
   */

  /**
   * Validar datos para creación completa de cliente
   */
  validarDatosClienteCompleto(datos) {
    const errores = [];

    // Validar estructura de datos
    if (!datos.cliente) {
      errores.push('Datos del cliente son requeridos');
      return errores;
    }

    if (!datos.servicio) {
      errores.push('Datos del servicio son requeridos');
      return errores;
    }

    // Validar campos del cliente
    if (!datos.cliente.identificacion) {
      errores.push('La identificación del cliente es requerida');
    }

    if (!datos.cliente.nombre) {
      errores.push('El nombre del cliente es requerido');
    }

    if (!datos.cliente.email) {
      errores.push('El email del cliente es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.cliente.email)) {
      errores.push('El formato del email no es válido');
    }

    if (!datos.cliente.telefono) {
      errores.push('El teléfono del cliente es requerido');
    }

    if (!datos.cliente.direccion) {
      errores.push('La dirección del cliente es requerida');
    }

    if (!datos.cliente.ciudad_id) {
      errores.push('La ciudad del cliente es requerida');
    }

    // Validar campos del servicio
    if (!datos.servicio.plan_id) {
      errores.push('El plan de servicio es requerido');
    }

    if (!datos.servicio.fecha_activacion) {
      errores.push('La fecha de activación del servicio es requerida');
    }

    return errores;
  }
}

// CORREGIDO: Exportar la clase correctamente
module.exports = ClienteCompletoController;
