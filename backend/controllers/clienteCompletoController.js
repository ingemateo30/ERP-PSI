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

      // Crear cliente completo
      const resultado = await ClienteCompletoService.crearClienteCompleto(datosCompletos);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente con todos los documentos',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);
      
      let statusCode = 500;
      let message = 'Error interno del servidor';

      if (error.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'Ya existe un cliente con esta identificación';
      } else if (error.message.includes('no encontrado')) {
        statusCode = 404;
        message = error.message;
      } else if (error.message.includes('inválido') || error.message.includes('requerido')) {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ============================================
   * CAMBIAR PLAN DE CLIENTE
   * ============================================
   */

  /**
   * Cambiar plan de servicio de un cliente existente
   */
  async cambiarPlanCliente(req, res) {
    try {
      const clienteId = parseInt(req.params.clienteId);
      
      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const nuevosPlanData = {
        plan_id: req.body.plan_id,
        precio_personalizado: req.body.precio_personalizado,
        fecha_activacion: req.body.fecha_activacion || new Date().toISOString().split('T')[0],
        observaciones: req.body.observaciones
      };

      // Validar datos del nuevo plan
      if (!nuevosPlanData.plan_id) {
        return res.status(400).json({
          success: false,
          message: 'El ID del plan es requerido'
        });
      }

      const resultado = await ClienteCompletoService.cambiarPlanCliente(clienteId, nuevosPlanData);

      res.json({
        success: true,
        message: 'Plan cambiado exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      
      let statusCode = 500;
      let message = 'Error interno del servidor';

      if (error.message.includes('no tiene servicios activos')) {
        statusCode = 404;
        message = 'Cliente no tiene servicios activos';
      } else if (error.message.includes('no encontrado')) {
        statusCode = 404;
        message = error.message;
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ============================================
   * OBTENER SERVICIOS DE CLIENTE
   * ============================================
   */

  /**
   * Obtener todos los servicios de un cliente
   */
  async obtenerServiciosCliente(req, res) {
    try {
      const clienteId = parseInt(req.params.clienteId);
      
      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const servicios = await ClienteCompletoService.obtenerServiciosCliente(clienteId);

      res.json({
        success: true,
        data: servicios,
        total: servicios.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error obteniendo servicios del cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ============================================
   * PREVISUALIZACIÓN DE FACTURACIÓN
   * ============================================
   */

  /**
   * Previsualizar primera factura antes de crear el cliente
   */
  async previsualizarPrimeraFactura(req, res) {
    try {
      const { plan_id, precio_personalizado, estrato = '3', fecha_activacion } = req.body;

      if (!plan_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del plan es requerido'
        });
      }

      // Simular datos para cálculo
      const datosSimulacion = {
        plan_tipo: req.body.plan_tipo || 'internet',
        plan_precio: parseFloat(precio_personalizado) || parseFloat(req.body.plan_precio) || 0,
        estrato: estrato
      };

      // Calcular conceptos que se incluirían
      const conceptos = ClienteCompletoService.calcularConceptosPrimeraFactura(
        { ...datosSimulacion, plan_nombre: req.body.plan_nombre || 'Plan seleccionado' },
        { precio_personalizado }
      );

      // Calcular totales
      const totales = ClienteCompletoService.calcularTotalesFactura(conceptos, estrato);

      // Calcular período de facturación
      const fechaActivacionDate = new Date(fecha_activacion || new Date());
      const fechaDesde = new Date(fechaActivacionDate);
      const fechaHasta = new Date(fechaActivacionDate);
      fechaHasta.setDate(fechaHasta.getDate() + 30);

      res.json({
        success: true,
        data: {
          conceptos: conceptos.map(c => ({
            concepto: c.concepto,
            cantidad: c.cantidad,
            precio_unitario: c.precio_unitario,
            valor: c.valor,
            iva: c.aplica_iva ? Math.round(c.valor * (c.porcentaje_iva / 100)) : 0,
            total: c.valor + (c.aplica_iva ? Math.round(c.valor * (c.porcentaje_iva / 100)) : 0),
            aplica_iva: c.aplica_iva
          })),
          totales: {
            subtotal: totales.subtotal,
            iva: totales.iva,
            total: totales.total
          },
          periodo: {
            fecha_desde: fechaDesde.toISOString().split('T')[0],
            fecha_hasta: fechaHasta.toISOString().split('T')[0],
            dias: 30
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en previsualización:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error calculando previsualización',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * ============================================
   * OBTENER PLANES DISPONIBLES
   * ============================================
   */

  /**
   * Obtener planes de servicio disponibles para asignación
   */
  async obtenerPlanesDisponibles(req, res) {
    try {
      const { Database } = require('../models/Database');
      const conexion = await Database.conexion();

      try {
        const [planes] = await conexion.execute(`
          SELECT 
            id, codigo, nombre, tipo, precio, 
            velocidad_subida, velocidad_bajada, canales_tv,
            descripcion, aplica_iva, activo
          FROM planes_servicio 
          WHERE activo = 1 
          ORDER BY tipo, precio
        `);

        res.json({
          success: true,
          data: planes
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo planes:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error obteniendo planes disponibles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Validar cliente
    if (!datos.cliente) {
      errores.push('Datos del cliente son requeridos');
      return errores;
    }

    if (!datos.cliente.identificacion) {
      errores.push('Identificación del cliente es requerida');
    }

    if (!datos.cliente.nombre) {
      errores.push('Nombre del cliente es requerido');
    }

    if (!datos.cliente.email) {
      errores.push('Email del cliente es requerido');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.cliente.email)) {
      errores.push('Email del cliente no tiene formato válido');
    }

    if (!datos.cliente.telefono) {
      errores.push('Teléfono del cliente es requerido');
    }

    if (!datos.cliente.direccion) {
      errores.push('Dirección del cliente es requerida');
    }

    if (!datos.cliente.ciudad_id) {
      errores.push('Ciudad del cliente es requerida');
    }

    // Validar servicio
    if (!datos.servicio) {
      errores.push('Datos del servicio son requeridos');
      return errores;
    }

    if (!datos.servicio.plan_id) {
      errores.push('Plan de servicio es requerido');
    }

    // Validar fecha de activación
    if (datos.servicio.fecha_activacion) {
      const fechaActivacion = new Date(datos.servicio.fecha_activacion);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaActivacion < hoy) {
        errores.push('La fecha de activación no puede ser anterior a hoy');
      }
    }

    return errores;
  }

  /**
   * ============================================
   * ESTADÍSTICAS DE SERVICIOS
   * ============================================
   */

  /**
   * Obtener estadísticas de servicios por cliente
   */
  async obtenerEstadisticasServicios(req, res) {
    try {
      const { Database } = require('../models/Database');
      const conexion = await Database.conexion();

      try {
        const [estadisticas] = await conexion.execute(`
          SELECT 
            COUNT(DISTINCT c.id) as total_clientes,
            COUNT(sc.id) as total_servicios,
            COUNT(CASE WHEN sc.estado = 'activo' THEN 1 END) as servicios_activos,
            COUNT(CASE WHEN sc.estado = 'suspendido' THEN 1 END) as servicios_suspendidos,
            COUNT(CASE WHEN sc.estado = 'cortado' THEN 1 END) as servicios_cortados,
            AVG(COALESCE(sc.precio_personalizado, ps.precio)) as precio_promedio,
            SUM(COALESCE(sc.precio_personalizado, ps.precio)) as facturacion_mensual_estimada
          FROM clientes c
          LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id
          LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE c.activo = 1
        `);

        const [serviciosPorTipo] = await conexion.execute(`
          SELECT 
            ps.tipo,
            COUNT(sc.id) as cantidad,
            AVG(COALESCE(sc.precio_personalizado, ps.precio)) as precio_promedio
          FROM servicios_cliente sc
          INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.estado = 'activo'
          GROUP BY ps.tipo
        `);

        res.json({
          success: true,
          data: {
            resumen: estadisticas[0],
            por_tipo: serviciosPorTipo
          }
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas de servicios',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ClienteCompletoController();