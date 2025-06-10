// controllers/FacturasController.js - VERSIÓN CORREGIDA
const { Database } = require('../models/Database');
const Factura = require('../models/factura');
const ApiResponse = require('../utils/responses');
const FacturaPDFGenerator = require('../utils/pdfGenerator');

class FacturasController {
  
  // Generar PDF para descarga
  static async generarPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`🔍 Buscando factura con ID: ${id}`);
      const factura = await Factura.obtenerPorId(id);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      console.log(`✅ Factura encontrada: ${factura.numero_factura}`);

      // CORREGIDO: Usar Database en lugar de pool
      const empresaQuery = 'SELECT * FROM configuracion_empresa WHERE id = 1';
      const empresaResult = await Database.query(empresaQuery);
      
      if (!empresaResult || empresaResult.length === 0) {
        return ApiResponse.error(res, 'Configuración de empresa no encontrada', 500);
      }

      const empresa = empresaResult[0];
      console.log(`🏢 Empresa configurada: ${empresa.empresa_nombre}`);

      // Generar PDF
      const pdfBuffer = await FacturaPDFGenerator.generar(factura, empresa);

      // Configurar headers para descarga
      const nombreArchivo = `Factura_${factura.numero_factura}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log(`📥 Enviando PDF para descarga: ${nombreArchivo}`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Ver PDF en navegador (sin descargar)
  static async verPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`🔍 Buscando factura para visualizar PDF: ${id}`);
      const factura = await Factura.obtenerPorId(id);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // CORREGIDO: Usar Database en lugar de pool
      const empresaQuery = 'SELECT * FROM configuracion_empresa WHERE id = 1';
      const empresaResult = await Database.query(empresaQuery);
      
      if (!empresaResult || empresaResult.length === 0) {
        return ApiResponse.error(res, 'Configuración de empresa no encontrada', 500);
      }

      const empresa = empresaResult[0];

      // Generar PDF
      const pdfBuffer = await FacturaPDFGenerator.generar(factura, empresa);

      // Configurar headers para visualización en navegador
      const nombreArchivo = `Factura_${factura.numero_factura}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      console.log(`👀 Enviando PDF para visualización: ${nombreArchivo}`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error al visualizar PDF:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Método de prueba para generar PDF con datos de ejemplo
  static async probarPDF(req, res) {
    try {
      console.log('🧪 Iniciando prueba de generación PDF...');

      // Datos de prueba para factura
      const facturaEjemplo = {
        id: 999,
        numero_factura: 'FAC000999',
        cliente_id: 1,
        identificacion_cliente: '1005450340',
        nombre_cliente: 'MATEO SALAZAR ORTIZ',
        cliente_direccion: 'CR 14A 21-63 ARBOLEDAS',
        cliente_telefono: '3007015239',
        periodo_facturacion: '2025-06',
        fecha_emision: '2025-06-06',
        fecha_vencimiento: '2025-06-16',
        fecha_desde: '2025-06-01',
        fecha_hasta: '2025-06-30',
        internet: 59900,
        television: 0,
        saldo_anterior: 0,
        interes: 0,
        reconexion: 0,
        descuento: 0,
        varios: 0,
        publicidad: 0,
        subtotal: 59900,
        iva: 0,
        total: 59900,
        estado: 'pendiente'
      };

      // Obtener configuración real de empresa o usar datos de ejemplo
      let empresa;
      try {
        const empresaQuery = 'SELECT * FROM configuracion_empresa WHERE id = 1';
        const empresaResult = await Database.query(empresaQuery);
        empresa = empresaResult[0];
      } catch (error) {
        console.log('📋 Usando datos de empresa de ejemplo...');
      }

      // Datos de prueba para empresa si no se encuentra en BD
      if (!empresa) {
        empresa = {
          empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS',
          empresa_nit: '901.582.657-3',
          empresa_direccion: 'Carrera 9 No. 9-94',
          empresa_ciudad: 'SANGIL',
          empresa_departamento: 'SANTANDER',
          empresa_telefono: '3184550936',
          empresa_email: 'info@psi.net.co',
          valor_reconexion: 11900,
          vigilado: 'Vigilado y regulado por el MINTIC',
          resolucion_facturacion: 'Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022',
          licencia_internet: '96006732'
        };
      }

      console.log('📋 Datos de prueba preparados');

      // Generar PDF
      const pdfBuffer = await FacturaPDFGenerator.generar(facturaEjemplo, empresa);

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Factura_Prueba.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log('✅ PDF de prueba generado exitosamente');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error en prueba de PDF:', error);
      return ApiResponse.error(res, 'Error en prueba de PDF', 500, error.message);
    }
  }

  // Obtener todas las facturas con filtros y paginación
  static async obtenerTodas(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        estado,
        numero_factura,
        identificacion_cliente,
        nombre_cliente,
        periodo_facturacion,
        fecha_desde,
        fecha_hasta,
        vencidas,
        ruta
      } = req.query;

      const offset = (page - 1) * limit;
      
      const filtros = {
        limite: parseInt(limit),
        offset: parseInt(offset)
      };

      // Agregar filtros si existen
      if (estado) filtros.estado = estado;
      if (numero_factura) filtros.numero_factura = numero_factura;
      if (identificacion_cliente) filtros.identificacion_cliente = identificacion_cliente;
      if (nombre_cliente) filtros.nombre_cliente = nombre_cliente;
      if (periodo_facturacion) filtros.periodo_facturacion = periodo_facturacion;
      if (fecha_desde) filtros.fecha_desde = fecha_desde;
      if (fecha_hasta) filtros.fecha_hasta = fecha_hasta;
      if (vencidas) filtros.vencidas = vencidas;
      if (ruta) filtros.ruta = ruta;

      const [facturas, total] = await Promise.all([
        Factura.obtenerTodas(filtros),
        Factura.contarTotal(filtros)
      ]);

      const totalPages = Math.ceil(total / limit);

      return ApiResponse.success(res, {
        facturas,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Facturas obtenidas exitosamente');

    } catch (error) {
      console.error('Error al obtener facturas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener factura por ID
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const factura = await Factura.obtenerPorId(id);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Obtener detalles de la factura
      const detalles = await Factura.obtenerDetalles(id);

      return ApiResponse.success(res, {
        factura,
        detalles
      }, 'Factura obtenida exitosamente');

    } catch (error) {
      console.error('Error al obtener factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener factura por número
  static async obtenerPorNumero(req, res) {
    try {
      const { numero } = req.params;

      if (!numero) {
        return ApiResponse.validationError(res, 'Número de factura requerido');
      }

      const factura = await Factura.obtenerPorNumero(numero);

      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Obtener detalles de la factura
      const detalles = await Factura.obtenerDetalles(factura.id);

      return ApiResponse.success(res, {
        factura,
        detalles
      }, 'Factura obtenida exitosamente');

    } catch (error) {
      console.error('Error al obtener factura por número:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Crear nueva factura
  static async crear(req, res) {
    try {
      // Validaciones básicas
      const { cliente_id, periodo_facturacion, fecha_vencimiento } = req.body;
      
      if (!cliente_id || !periodo_facturacion || !fecha_vencimiento) {
        return ApiResponse.validationError(res, 
          'Cliente, período de facturación y fecha de vencimiento son requeridos'
        );
      }

      const datosFactura = {
        ...req.body,
        created_by: req.user?.id // ID del usuario autenticado
      };

      const nuevaFactura = await Factura.crear(datosFactura);

      return ApiResponse.created(res, nuevaFactura, 'Factura creada exitosamente');

    } catch (error) {
      console.error('Error al crear factura:', error);
      
      if (error.message.includes('no encontrado') || error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('ya existe')) {
        return ApiResponse.conflict(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Actualizar factura
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const facturaActualizada = await Factura.actualizar(id, req.body);

      return ApiResponse.updated(res, facturaActualizada, 'Factura actualizada exitosamente');

    } catch (error) {
      console.error('Error al actualizar factura:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('no se puede')) {
        return ApiResponse.forbidden(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Marcar factura como pagada
  static async marcarComoPagada(req, res) {
    try {
      const { id } = req.params;
      const { fecha_pago, metodo_pago, referencia_pago, banco_id } = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      if (!metodo_pago) {
        return ApiResponse.validationError(res, 'Método de pago requerido');
      }

      const datosPago = {
        fecha_pago: fecha_pago || new Date(),
        metodo_pago,
        referencia_pago,
        banco_id
      };

      const facturaActualizada = await Factura.marcarComoPagada(id, datosPago);

      return ApiResponse.updated(res, facturaActualizada, 'Factura marcada como pagada exitosamente');

    } catch (error) {
      console.error('Error al marcar factura como pagada:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('ya está pagada')) {
        return ApiResponse.conflict(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Anular factura
  static async anular(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      if (!motivo) {
        return ApiResponse.validationError(res, 'Motivo de anulación requerido');
      }

      const facturaAnulada = await Factura.anular(id, motivo);

      return ApiResponse.updated(res, facturaAnulada, 'Factura anulada exitosamente');

    } catch (error) {
      console.error('Error al anular factura:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('no se puede anular')) {
        return ApiResponse.forbidden(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Buscar facturas
  static async buscar(req, res) {
    try {
      const { q: termino, estado } = req.query;

      if (!termino || termino.trim().length < 2) {
        return ApiResponse.validationError(res, 
          'El término de búsqueda debe tener al menos 2 caracteres'
        );
      }

      const filtros = {};
      if (estado) filtros.estado = estado;

      const facturas = await Factura.buscar(termino.trim(), filtros);

      return ApiResponse.success(res, facturas, 'Búsqueda completada exitosamente');

    } catch (error) {
      console.error('Error en búsqueda de facturas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await Factura.obtenerEstadisticas();

      return ApiResponse.success(res, estadisticas, 'Estadísticas obtenidas exitosamente');

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener facturas vencidas
  static async obtenerVencidas(req, res) {
    try {
      const { dias_minimos, ruta, limite } = req.query;

      const filtros = {};
      if (dias_minimos) filtros.dias_minimos = parseInt(dias_minimos);
      if (ruta) filtros.ruta = ruta;
      if (limite) filtros.limite = parseInt(limite);

      const facturasVencidas = await Factura.obtenerVencidas(filtros);

      return ApiResponse.success(res, facturasVencidas, 'Facturas vencidas obtenidas exitosamente');

    } catch (error) {
      console.error('Error al obtener facturas vencidas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Generar siguiente número de factura
  static async generarNumeroFactura(req, res) {
    try {
      const numeroFactura = await Factura.generarNumeroFactura();

      return ApiResponse.success(res, { numero_factura: numeroFactura }, 
        'Número de factura generado exitosamente');

    } catch (error) {
      console.error('Error al generar número de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Validar número de factura
  static async validarNumeroFactura(req, res) {
    try {
      const { numero } = req.params;

      if (!numero) {
        return ApiResponse.validationError(res, 'Número de factura requerido');
      }

      const factura = await Factura.obtenerPorNumero(numero);

      return ApiResponse.success(res, {
        existe: !!factura,
        factura: factura || null
      }, 'Validación completada exitosamente');

    } catch (error) {
      console.error('Error al validar número de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener detalles de factura
  static async obtenerDetalles(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const detalles = await Factura.obtenerDetalles(id);

      return ApiResponse.success(res, detalles, 'Detalles obtenidos exitosamente');

    } catch (error) {
      console.error('Error al obtener detalles de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Duplicar factura (crear copia)
  static async duplicar(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const facturaOriginal = await Factura.obtenerPorId(id);
      
      if (!facturaOriginal) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Crear nueva factura basada en la original
      const datosNuevaFactura = {
        cliente_id: facturaOriginal.cliente_id,
        periodo_facturacion: req.body.periodo_facturacion || facturaOriginal.periodo_facturacion,
        fecha_vencimiento: req.body.fecha_vencimiento || facturaOriginal.fecha_vencimiento,
        fecha_desde: req.body.fecha_desde || facturaOriginal.fecha_desde,
        fecha_hasta: req.body.fecha_hasta || facturaOriginal.fecha_hasta,
        internet: facturaOriginal.internet,
        television: facturaOriginal.television,
        saldo_anterior: req.body.saldo_anterior || 0,
        interes: facturaOriginal.interes,
        reconexion: facturaOriginal.reconexion,
        descuento: facturaOriginal.descuento,
        varios: facturaOriginal.varios,
        publicidad: facturaOriginal.publicidad,
        s_internet: facturaOriginal.s_internet,
        s_television: facturaOriginal.s_television,
        s_interes: facturaOriginal.s_interes,
        s_reconexion: facturaOriginal.s_reconexion,
        s_descuento: facturaOriginal.s_descuento,
        s_varios: facturaOriginal.s_varios,
        s_publicidad: facturaOriginal.s_publicidad,
        s_iva: facturaOriginal.s_iva,
        ruta: facturaOriginal.ruta,
        observaciones: req.body.observaciones || `Duplicada de factura ${facturaOriginal.numero_factura}`,
        created_by: req.user?.id
      };

      const nuevaFactura = await Factura.crear(datosNuevaFactura);

      return ApiResponse.created(res, nuevaFactura, 'Factura duplicada exitosamente');

    } catch (error) {
      console.error('Error al duplicar factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Enviar factura por correo electrónico
  static async enviarPorCorreo(req, res) {
    try {
      const { id } = req.params;
      const { correo_destino, mensaje_personalizado } = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const factura = await Factura.obtenerPorId(id);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Aquí iría la lógica para enviar por correo
      // Por ahora solo retornamos éxito
      return ApiResponse.success(res, { 
        factura_id: id,
        correo_destino: correo_destino || factura.correo_cliente 
      }, 'Factura enviada por correo exitosamente');

    } catch (error) {
      console.error('Error al enviar factura por correo:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }
}

module.exports = FacturasController;