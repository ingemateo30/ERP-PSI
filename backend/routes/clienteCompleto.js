// backend/routes/clienteCompleto.js
const express = require('express');
const router = express.Router();
const ClienteCompletoService = require('../services/ClienteCompletoService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { audit } = require('../utils/auditLogger');

/**
 * ============================================
 * IMPORTANTE: Orden de rutas
 * Las rutas específicas DEBEN ir ANTES que /:id
 * ============================================
 */

/**
 * ============================================
 * RUTAS DE PREVISUALIZACIÓN (ANTES de /:id)
 * ============================================
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
 * RUTAS DE FACTURACIÓN (ANTES de /:id)
 * ============================================
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
 * RUTAS DE CONTRATOS (ANTES de /:id)
 * ============================================
 */
router.get('/contratos',
  authenticateToken,
  requireRole(['supervisor', 'administrador']),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, cliente_id } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const offsetNum = (pageNum - 1) * limitNum;

      const { Database } = require('../models/Database');
      let where = 'WHERE 1=1';
      const params = [];
      if (cliente_id) {
        where += ' AND c.cliente_id = ?';
        params.push(parseInt(cliente_id));
      }

      const contratos = await Database.query(`
        SELECT
          c.id, c.numero_contrato, c.tipo_contrato, c.tipo_permanencia,
          c.permanencia_meses, c.costo_instalacion, c.fecha_generacion,
          c.fecha_inicio, c.fecha_fin, c.estado, c.observaciones,
          cl.nombre AS cliente_nombre, cl.identificacion AS cliente_identificacion,
          ps.nombre AS plan_nombre, ps.tipo AS plan_tipo, ps.precio AS plan_precio
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        ${where}
        ORDER BY c.fecha_generacion DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, params);

      res.json({ success: true, data: { contratos, pagination: { page: pageNum, limit: limitNum } } });

    } catch (error) {
      console.error('❌ Error obteniendo contratos:', error);
      res.status(500).json({ success: false, message: error.message || 'Error obteniendo contratos' });
    }
  }
);

/**
 * ============================================
 * RUTAS DE CREACIÓN
 * ============================================
 */
router.post('/crear',
  authenticateToken,  // ✅ Agregado
  requireRole(['supervisor', 'administrador']),  // ✅ Agregado
  async (req, res) => {
    try {
      console.log('📨 Datos recibidos en el servidor:', JSON.stringify(req.body, null, 2));

      const datosCompletos = req.body;
      const createdBy = req.user.id;  // ✅ Ahora siempre existe

      // ✅ VALIDACIÓN BÁSICA
      if (!datosCompletos.cliente) {
        return res.status(400).json({
          success: false,
          message: 'Los datos del cliente son obligatorios'
        });
      }

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
          message: 'Datos básicos del cliente incompletos'
        });
      }

      // ✅ VALIDAR PRIMER SERVICIO
      const primerServicio = servicios[0];
      if (!primerServicio.planInternetId && !primerServicio.planTelevisionId && !primerServicio.plan_id) {
        return res.status(400).json({
          success: false,
          message: 'El servicio debe tener al menos un plan'
        });
      }

      console.log('🔄 Procesando datos validados');

      const resultado = await ClienteCompletoService.crearClienteConServicios(
        datosCompletos,
        createdBy
      );

      // Registrar en auditoría
      audit({
        usuario_id: createdBy,
        accion: 'CREATE',
        tabla: 'clientes',
        registro_id: resultado.cliente?.id || resultado.clienteId || null,
        datos_nuevos: { identificacion: datosCompletos.cliente.identificacion, nombre: datosCompletos.cliente.nombre },
        ip: req.ip,
        user_agent: req.get('User-Agent')
      }).catch(() => {});

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente con todos los servicios',
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error creando cliente completo:', error);

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

      if (error.message.includes('undefined')) {
        return res.status(400).json({
          success: false,
          message: 'Error en los datos enviados',
          details: error.message
        });
      }

      if (error.message.includes('Plan de servicio no encontrado')) {
        return res.status(400).json({
          success: false,
          message: 'El plan de servicio seleccionado no existe'
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }
);

/**
 * ============================================
 * RUTAS CON PARÁMETROS (DESPUÉS de rutas específicas)
 * ============================================
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
router.post('/:id/generar-contrato',
  authenticateToken,
  requireRole(['supervisor', 'administrador']),
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

router.post('/:id/generar-orden-instalacion',
  authenticateToken,
  requireRole(['instalador', 'supervisor', 'administrador']),
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

router.post('/:id/generar-factura',
  authenticateToken,
  requireRole(['supervisor', 'administrador']),
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

router.put('/:id/cambiar-plan',
  authenticateToken,
  requireRole(['supervisor', 'administrador', 'secretaria']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { plan_id, servicio_id, precio_personalizado, fecha_cambio, observaciones } = req.body;

      if (!plan_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del nuevo plan es requerido'
        });
      }

      const resultado = await ClienteCompletoService.cambiarPlanCliente(id, {
        plan_id,
        servicio_id,
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

router.put('/:id/suspender',
  authenticateToken,
  requireRole(['supervisor', 'administrador']),
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

router.put('/:id/reactivar',
  authenticateToken,
  requireRole(['supervisor', 'administrador']),
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
 * RUTAS DE SEDES
 * ============================================
 */
router.post('/:clienteId/agregar-sede',
  authenticateToken,  // ✅ Agregado
  requireRole(['supervisor', 'administrador']),  // ✅ Agregado
  async (req, res) => {
    try {
      const { clienteId } = req.params;
      const { sede } = req.body;

      const resultado = await ClienteCompletoService.agregarNuevaSedeACliente(
        clienteId,
        sede,
        req.user.id
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
  }
);

router.get('/:clienteId/sedes',
  authenticateToken,  // ✅ Agregado
  async (req, res) => {
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
  }
);

module.exports = router;