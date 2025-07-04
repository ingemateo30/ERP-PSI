// controllers/FacturasController.js - Controlador corregido
const Factura = require('../models/factura');
const ApiResponse = require('../utils/ApiResponse');
const PDFService = require('../services/PDFService');
const path = require('path');
const fs = require('fs').promises;

class FacturasController {

  // Obtener todas las facturas con filtros y paginación (CORREGIDO)
  static async obtenerTodas(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        numero_factura,
        identificacion_cliente,
        nombre_cliente,
        estado,
        fecha_desde,
        fecha_hasta,
        periodo_facturacion,
        ruta,
        vencidas
      } = req.query;

      // Validar parámetros de paginación
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

      // Construir filtros sin duplicados
      const filtros = {};
      
      if (numero_factura && numero_factura.trim()) {
        filtros.numero_factura = numero_factura.trim();
      }
      
      if (identificacion_cliente && identificacion_cliente.trim()) {
        filtros.identificacion_cliente = identificacion_cliente.trim();
      }
      
      if (nombre_cliente && nombre_cliente.trim()) {
        filtros.nombre_cliente = nombre_cliente.trim();
      }
      
      if (estado && ['pendiente', 'pagada', 'anulada', 'vencida'].includes(estado)) {
        filtros.estado = estado;
      }
      
      if (fecha_desde) {
        filtros.fecha_desde = fecha_desde;
      }
      
      if (fecha_hasta) {
        filtros.fecha_hasta = fecha_hasta;
      }
      
      if (periodo_facturacion) {
        filtros.periodo_facturacion = periodo_facturacion;
      }
      
      if (ruta) {
        filtros.ruta = ruta;
      }
      
      if (vencidas === 'true' || vencidas === true) {
        filtros.vencidas = true;
      }

      console.log('🔍 Filtros aplicados:', filtros);
      console.log('📄 Paginación:', { page: pageNum, limit: limitNum });

      // Obtener facturas con filtros
      const resultado = await Factura.obtenerTodas({
        ...filtros,
        page: pageNum,
        limit: limitNum
      });

      // Estructurar respuesta consistente
      const respuesta = {
        success: true,
        data: {
          facturas: resultado.facturas || [],
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil((resultado.total || 0) / limitNum),
            totalItems: resultado.total || 0,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < Math.ceil((resultado.total || 0) / limitNum),
            hasPrevPage: pageNum > 1
          }
        },
        message: `${resultado.facturas?.length || 0} facturas encontradas`,
        timestamp: new Date().toISOString()
      };

      return res.status(200).json(respuesta);

    } catch (error) {
      console.error('❌ Error al obtener facturas:', error);
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

      return ApiResponse.success(res, factura, 'Factura obtenida exitosamente');

    } catch (error) {
      console.error('❌ Error al obtener factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Crear nueva factura
  static async crear(req, res) {
    try {
      const datosFactura = {
        ...req.body,
        created_by: req.user?.id
      };

      // Validar datos requeridos
      const camposRequeridos = ['cliente_id', 'fecha_emision', 'fecha_vencimiento'];
      const camposFaltantes = camposRequeridos.filter(campo => !datosFactura[campo]);
      
      if (camposFaltantes.length > 0) {
        return ApiResponse.validationError(res, 
          `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`
        );
      }

      console.log('📝 Creando nueva factura:', datosFactura);

      const nuevaFactura = await Factura.crear(datosFactura);

      return ApiResponse.created(res, nuevaFactura, 'Factura creada exitosamente');

    } catch (error) {
      console.error('❌ Error al crear factura:', error);
      
      if (error.message.includes('ya existe')) {
        return ApiResponse.conflict(res, error.message);
      }
      
      if (error.message.includes('Cliente no encontrado')) {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Actualizar factura (CORREGIDO)
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const datosActualizacion = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      // Verificar que la factura existe
      const facturaExistente = await Factura.obtenerPorId(id);
      if (!facturaExistente) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Verificar que se puede editar
      if (facturaExistente.estado === 'pagada') {
        return ApiResponse.forbidden(res, 'No se puede editar una factura pagada');
      }

      if (facturaExistente.estado === 'anulada') {
        return ApiResponse.forbidden(res, 'No se puede editar una factura anulada');
      }

      console.log(`📝 Actualizando factura ${id}:`, datosActualizacion);

      const facturaActualizada = await Factura.actualizar(id, datosActualizacion);

      return ApiResponse.updated(res, facturaActualizada, 'Factura actualizada exitosamente');

    } catch (error) {
      console.error('❌ Error al actualizar factura:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Marcar como pagada (CORREGIDO)
  static async marcarComoPagada(req, res) {
    try {
      const { id } = req.params;
      const { metodo_pago, fecha_pago, referencia_pago, banco_id } = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      if (!metodo_pago) {
        return ApiResponse.validationError(res, 'Método de pago requerido');
      }

      // Validar método de pago
      const metodosValidos = ['efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito'];
      if (!metodosValidos.includes(metodo_pago)) {
        return ApiResponse.validationError(res, 'Método de pago inválido');
      }

      const datosPago = {
        fecha_pago: fecha_pago || new Date().toISOString().split('T')[0],
        metodo_pago,
        referencia_pago: referencia_pago || null,
        banco_id: banco_id || null
      };

      console.log(`💰 Marcando factura ${id} como pagada:`, datosPago);

      const facturaActualizada = await Factura.marcarComoPagada(id, datosPago);

      return ApiResponse.updated(res, facturaActualizada, 'Factura marcada como pagada exitosamente');

    } catch (error) {
      console.error('❌ Error al marcar factura como pagada:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('ya está pagada')) {
        return ApiResponse.conflict(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Anular factura (CORREGIDO)
  static async anular(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      if (!motivo || motivo.trim().length < 10) {
        return ApiResponse.validationError(res, 
          'Motivo de anulación requerido (mínimo 10 caracteres)'
        );
      }

      console.log(`🚫 Anulando factura ${id} con motivo: ${motivo}`);

      const facturaAnulada = await Factura.anular(id, motivo.trim());

      return ApiResponse.updated(res, facturaAnulada, 'Factura anulada exitosamente');

    } catch (error) {
      console.error('❌ Error al anular factura:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('no se puede anular')) {
        return ApiResponse.forbidden(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Duplicar factura
  static async duplicar(req, res) {
    try {
      const { id } = req.params;
      const datosAdicionales = req.body;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`📋 Duplicando factura ${id}`);

      const nuevaFactura = await Factura.duplicar(id, {
        ...datosAdicionales,
        created_by: req.user?.id
      });

      return ApiResponse.created(res, nuevaFactura, 'Factura duplicada exitosamente');

    } catch (error) {
      console.error('❌ Error al duplicar factura:', error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Generar PDF (CORREGIDO)
  static async generarPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`📄 Generando PDF para factura ${id}`);

      // Obtener datos de la factura
      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Verificar si PDFService existe
      if (!PDFService) {
        throw new Error('Servicio de PDF no disponible');
      }

      // Generar PDF
      const pdfBuffer = await PDFService.generarFacturaPDF(factura);

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura_${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log(`✅ PDF generado exitosamente para factura ${id}`);

      return res.send(pdfBuffer);

    } catch (error) {
      console.error(`❌ Error al generar PDF para factura ${req.params.id}:`, error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('no disponible')) {
        return ApiResponse.error(res, 'Servicio de PDF temporalmente no disponible', 503);
      }

      return ApiResponse.error(res, 'Error al generar PDF', 500, error.message);
    }
  }

  // Ver PDF en navegador (CORREGIDO)
  static async verPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      console.log(`👁️ Abriendo PDF para factura ${id}`);

      // Obtener datos de la factura
      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Verificar si PDFService existe
      if (!PDFService) {
        throw new Error('Servicio de PDF no disponible');
      }

      // Generar PDF
      const pdfBuffer = await PDFService.generarFacturaPDF(factura);

      // Configurar headers para visualización
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="factura_${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log(`✅ PDF abierto exitosamente para factura ${id}`);

      return res.send(pdfBuffer);

    } catch (error) {
      console.error(`❌ Error al abrir PDF para factura ${req.params.id}:`, error);
      
      if (error.message.includes('no encontrada')) {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('no disponible')) {
        return ApiResponse.error(res, 'Servicio de PDF temporalmente no disponible', 503);
      }

      return ApiResponse.error(res, 'Error al abrir PDF', 500, error.message);
    }
  }

  // Probar PDF (para desarrollo)
  static async probarPDF(req, res) {
    try {
      console.log('🧪 Probando generación de PDF...');

      if (!PDFService) {
        throw new Error('Servicio de PDF no disponible');
      }

      // Datos de prueba
      const facturaTest = {
        id: 999,
        numero_factura: 'TEST-001',
        fecha_emision: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        cliente_id: 1,
        nombre_cliente: 'Cliente de Prueba',
        identificacion_cliente: '12345678',
        direccion_cliente: 'Dirección de Prueba',
        telefono_cliente: '300-123-4567',
        total: 100000,
        estado: 'pendiente'
      };

      const pdfBuffer = await PDFService.generarFacturaPDF(facturaTest);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="test-factura.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      console.log('✅ PDF de prueba generado exitosamente');

      return res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error al probar PDF:', error);
      return ApiResponse.error(res, 'Error al probar PDF', 500, error.message);
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
      if (estado && ['pendiente', 'pagada', 'anulada', 'vencida'].includes(estado)) {
        filtros.estado = estado;
      }

      console.log('🔍 Buscando facturas:', { termino: termino.trim(), filtros });

      const facturas = await Factura.buscar(termino.trim(), filtros);

      return ApiResponse.success(res, facturas, 
        `${facturas?.length || 0} facturas encontradas`
      );

    } catch (error) {
      console.error('❌ Error al buscar facturas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de facturas...');

      const estadisticas = await Factura.obtenerEstadisticas();

      return ApiResponse.success(res, estadisticas, 'Estadísticas obtenidas exitosamente');

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Obtener facturas vencidas
  static async obtenerVencidas(req, res) {
    try {
      console.log('⚠️ Obteniendo facturas vencidas...');

      const facturasVencidas = await Factura.obtenerVencidas();

      return ApiResponse.success(res, facturasVencidas, 
        `${facturasVencidas?.length || 0} facturas vencidas encontradas`
      );

    } catch (error) {
      console.error('❌ Error al obtener facturas vencidas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  // Generar número de factura
  static async generarNumeroFactura(req, res) {
    try {
      console.log('🔢 Generando número de factura...');

      const numeroFactura = await Factura.generarNumero();

      return ApiResponse.success(res, { numero_factura: numeroFactura }, 
        'Número de factura generado exitosamente'
      );

    } catch (error) {
      console.error('❌ Error al generar número de factura:', error);
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

      console.log(`🔍 Validando número de factura: ${numero}`);

      const existe = await Factura.existeNumero(numero);

      return ApiResponse.success(res, { 
        numero_factura: numero,
        existe,
        disponible: !existe
      }, existe ? 'Número ya existe' : 'Número disponible');

    } catch (error) {
      console.error('❌ Error al validar número de factura:', error);
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

      console.log(`🔍 Buscando factura por número: ${numero}`);

      const factura = await Factura.obtenerPorNumero(numero);
      
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      return ApiResponse.success(res, factura, 'Factura obtenida exitosamente');

    } catch (error) {
      console.error('❌ Error al obtener factura por número:', error);
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

      console.log(`📋 Obteniendo detalles de factura ${id}`);

      const detalles = await Factura.obtenerDetalles(id);
      
      if (!detalles || detalles.length === 0) {
        return ApiResponse.notFound(res, 'Detalles de factura no encontrados');
      }

      return ApiResponse.success(res, detalles, 'Detalles obtenidos exitosamente');

    } catch (error) {
      console.error('❌ Error al obtener detalles de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }
}

module.exports = FacturasController;