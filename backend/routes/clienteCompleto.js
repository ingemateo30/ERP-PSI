// backend/routes/clienteCompleto.js
// Rutas para gestión completa de clientes con servicios

const express = require('express');
const router = express.Router();
const ClienteCompletoService = require('../services/ClienteCompletoService');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * ============================================
 * RUTAS DE CREACIÓN COMPLETA DE CLIENTE
 * ============================================
 */

/**
 * @route POST /api/v1/clientes-completo/crear
 * @desc Crear cliente completo con servicio y documentos automáticos
 * @access Private (Administrador+)
 */
/**
 * ✅ RUTA PRINCIPAL CORREGIDA
 * @route POST /api/v1/clientes-completo/crear
 * @desc Crear cliente completo - maneja estructura real del frontend
 */
router.post('/crear', async (req, res) => {
  try {
    console.log('📨 Datos recibidos en el servidor:', JSON.stringify(req.body, null, 2));

    const datosCompletos = req.body;
    const createdBy = req.user?.id || datosCompletos.created_by || 1;

    // ✅ VALIDACIÓN BÁSICA
    if (!datosCompletos.cliente) {
      return res.status(400).json({
        success: false,
        message: 'Los datos del cliente son obligatorios'
      });
    }

    // ✅ CORRECCIÓN: El frontend envía 'servicios' array, necesitamos extraer datos
    const servicios = datosCompletos.servicios || [];

    if (!Array.isArray(servicios) || servicios.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un servicio'
      });
    }

    // ✅ VALIDAR DATOS BÁSICOS DEL CLIENTE
    const cliente = datosCompletos.cliente;
    if (!cliente.identificacion || !cliente.nombre || !cliente.email || !cliente.telefono) {
      return res.status(400).json({
        success: false,
        message: 'Datos básicos del cliente incompletos (identificación, nombre, email, teléfono son requeridos)'
      });
    }

    // ✅ VALIDAR PRIMER SERVICIO
    const primerServicio = servicios[0];
    if (!primerServicio.planInternetId && !primerServicio.planTelevisionId && !primerServicio.plan_id) {
      return res.status(400).json({
        success: false,
        message: 'El servicio debe tener al menos un plan de Internet, Televisión o un plan único'
      });
    }

    console.log('🔄 Procesando datos validados:', {
      cliente: cliente.identificacion,
      servicios_count: servicios.length,
      primer_servicio: {
        internet: primerServicio.planInternetId,
        television: primerServicio.planTelevisionId,
        plan_unico: primerServicio.plan_id
      },
      created_by: createdBy
    });

    // ✅ LLAMAR AL SERVICIO CON DATOS CORRECTOS
    const resultado = await ClienteCompletoService.crearClienteConServicios(
      datosCompletos,
      createdBy
    );

    // ✅ RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente con todos los servicios',
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error creando cliente completo:', error);

    // Manejo de errores específicos
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esta identificación'
      });
    }

    if (error.message.includes('undefined')) {
      return res.status(400).json({
        success: false,
        message: 'Error en los datos enviados: algunos campos contienen valores no válidos',
        details: error.message
      });
    }

    if (error.message.includes('Plan de servicio no encontrado')) {
      return res.status(400).json({
        success: false,
        message: 'El plan de servicio seleccionado no existe o está inactivo'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/v1/clientes-completo/:id
 * @desc Obtener cliente completo con todos sus datos y servicios
 * @access Private
 */
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const clienteCompleto = await ClienteCompletoService.obtenerClienteCompleto(id);

      if (!clienteCompleto) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        data: clienteCompleto
      });

    } catch (error) {
      console.error('❌ Error obteniendo cliente completo:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }
);

/**
 * ============================================
 * RUTAS DE DOCUMENTOS AUTOMÁTICOS
 * ============================================
 */

/**
 * @route POST /api/v1/clientes-completo/:id/generar-contrato
 * @desc Generar contrato para un cliente
 * @access Private (Supervisor+)
 */
router.post('/:id/generar-contrato',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { tipo_contrato } = req.body;

      const contrato = await ClienteCompletoService.generarContrato(
        id,
        tipo_contrato || 'servicio'
      );

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
);

/**
 * @route POST /api/v1/clientes-completo/:id/generar-orden-instalacion
 * @desc Generar orden de instalación para un cliente
 * @access Private (Instalador+)
 */
router.post('/:id/generar-orden-instalacion',
  authenticateToken,
  requireRole('instalador', 'supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha_instalacion } = req.body;

      const ordenInstalacion = await ClienteCompletoService.generarOrdenInstalacion(
        id,
        fecha_instalacion
      );

      res.json({
        success: true,
        message: 'Orden de instalación generada exitosamente',
        data: ordenInstalacion
      });

    } catch (error) {
      console.error('❌ Error generando orden de instalación:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error generando orden de instalación'
      });
    }
  }
);

/**
 * @route POST /api/v1/clientes-completo/:id/generar-factura
 * @desc Generar factura inmediata para un cliente
 * @access Private (Supervisor+)
 */
router.post('/:id/generar-factura',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { conceptos_adicionales } = req.body;

      const factura = await ClienteCompletoService.generarFacturaInmediata(
        id,
        conceptos_adicionales || []
      );

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
);

/**
 * ============================================
 * RUTAS DE GESTIÓN DE SERVICIOS
 * ============================================
 */

/**
 * @route GET /api/v1/clientes-completo/:id/servicios
 * @desc Obtener servicios de un cliente
 * @access Private
 */
router.get('/:id/servicios',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const servicios = await ClienteCompletoService.obtenerServiciosCliente(id);

      res.json({
        success: true,
        data: servicios
      });

    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo servicios'
      });
    }
  }
);

/**
 * @route PUT /api/v1/clientes-completo/:id/cambiar-plan
 * @desc Cambiar plan de servicio de un cliente
 * @access Private (Supervisor+)
 */
router.put('/:id/cambiar-plan',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { plan_id, precio_personalizado, fecha_cambio, observaciones } = req.body;

      if (!plan_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del nuevo plan es requerido'
        });
      }

      const resultado = await ClienteCompletoService.cambiarPlanCliente(id, {
        plan_id,
        precio_personalizado,
        fecha_cambio: fecha_cambio || new Date(),
        observaciones
      });

      res.json({
        success: true,
        message: 'Plan cambiado exitosamente',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error cambiando plan:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error cambiando plan'
      });
    }
  }
);

/**
 * @route PUT /api/v1/clientes-completo/:id/suspender
 * @desc Suspender servicio de un cliente
 * @access Private (Supervisor+)
 */
router.put('/:id/suspender',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo, fecha_suspension } = req.body;

      const resultado = await ClienteCompletoService.suspenderServicio(id, {
        motivo: motivo || 'Suspensión manual',
        fecha_suspension: fecha_suspension || new Date()
      });

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
);

/**
 * @route PUT /api/v1/clientes-completo/:id/reactivar
 * @desc Reactivar servicio de un cliente
 * @access Private (Supervisor+)
 */
router.put('/:id/reactivar',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { observaciones } = req.body;

      const resultado = await ClienteCompletoService.reactivarServicio(id, {
        fecha_reactivacion: new Date(),
        observaciones
      });

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
);

/**
 * ============================================
 * RUTAS DE PREVISUALIZACIÓN
 * ============================================
 */

/**
 * @route POST /api/v1/clientes-completo/previsualizar-factura
 * @desc Previsualizar primera factura antes de crear cliente
 * @access Private
 */
router.post('/previsualizar-factura',
  authenticateToken,
  async (req, res) => {
    try {
      const { cliente, servicio } = req.body;

      const preview = await ClienteCompletoService.previsualizarPrimeraFactura({
        cliente,
        servicio
      });

      res.json({
        success: true,
        data: preview
      });

    } catch (error) {
      console.error('❌ Error en previsualización:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error en previsualización'
      });
    }
  }
);

/**
 * ============================================
 * RUTAS DE FACTURACIÓN INTEGRADA
 * ============================================
 */

/**
 * @route GET /api/v1/clientes-completo/facturas
 * @desc Obtener todas las facturas generadas desde cliente completo
 * @access Private
 */
router.get('/facturas',
  authenticateToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, estado, cliente_id } = req.query;

      const facturas = await ClienteCompletoService.obtenerFacturasGeneradas({
        page: parseInt(page),
        limit: parseInt(limit),
        estado,
        cliente_id
      });

      res.json({
        success: true,
        data: facturas
      });

    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo facturas'
      });
    }
  }
);

/**
 * @route GET /api/v1/clientes-completo/facturas/:id
 * @desc Obtener factura específica con detalles
 * @access Private
 */
router.get('/facturas/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const factura = await ClienteCompletoService.obtenerFacturaCompleta(id);

      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      res.json({
        success: true,
        data: factura
      });

    } catch (error) {
      console.error('❌ Error obteniendo factura:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo factura'
      });
    }
  }
);

/**
 * ============================================
 * RUTAS DE CONTRATOS
 * ============================================
 */

router.post('/:clienteId/agregar-sede', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { sede } = req.body;

    const resultado = await ClienteCompletoService.agregarNuevaSedeACliente(
      clienteId,
      sede,
      req.user?.id
    );

    res.json({
      success: true,
      message: 'Nueva sede agregada exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/:clienteId/sedes', async (req, res) => {
  try {
    const { clienteId } = req.params;

    const sedes = await ClienteCompletoService.listarSedesCliente(clienteId);

    res.json({
      success: true,
      data: sedes
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/clientes-completo/contratos
 * @desc Obtener todos los contratos generados
 * @access Private (Supervisor+)
 */
router.get('/contratos',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, cliente_id } = req.query;

      const contratos = await ClienteCompletoService.obtenerContratosGenerados({
        page: parseInt(page),
        limit: parseInt(limit),
        cliente_id
      });

      res.json({
        success: true,
        data: contratos
      });

    } catch (error) {
      console.error('❌ Error obteniendo contratos:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo contratos'
      });
    }
  }
);

module.exports = router;