// backend/controllers/FacturasController.js - VERSIÓN CORREGIDA
const Factura = require('../models/factura');
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');
const ApiResponse = require('../utils/responses');
const PDFGenerator = require('../utils/PDFGenerator');

class FacturasController {

  /**
   * Obtener todas las facturas con filtros mejorados
   */
  static async obtenerTodas(req, res) {
    try {
      console.log('🔍 GET /facturas - Parámetros recibidos:', req.query);
      
      const {
        page = 1,
        limit = 10,
        numero_factura,
        identificacion_cliente,
        nombre_cliente,
        estado,
        periodo_facturacion,
        fecha_desde,
        fecha_hasta,
        ruta,
        vencidas,
        search
      } = req.query;

      // Validar parámetros de paginación
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
      const offset = (pageNum - 1) * limitNum;

      // Construir filtros dinámicamente
      let whereClause = 'WHERE f.activo = "1"';
      const params = [];

      // Filtros específicos
      if (numero_factura && numero_factura.trim()) {
        whereClause += ' AND f.numero_factura LIKE ?';
        params.push(`%${numero_factura.trim()}%`);
      }

      if (identificacion_cliente && identificacion_cliente.trim()) {
        whereClause += ' AND f.identificacion_cliente LIKE ?';
        params.push(`%${identificacion_cliente.trim()}%`);
      }

      if (nombre_cliente && nombre_cliente.trim()) {
        whereClause += ' AND f.nombre_cliente LIKE ?';
        params.push(`%${nombre_cliente.trim()}%`);
      }

      if (estado && estado.trim()) {
        whereClause += ' AND f.estado = ?';
        params.push(estado.trim());
      }

      if (periodo_facturacion && periodo_facturacion.trim()) {
        whereClause += ' AND f.periodo_facturacion = ?';
        params.push(periodo_facturacion.trim());
      }

      if (fecha_desde && fecha_desde.trim()) {
        whereClause += ' AND f.fecha_emision >= ?';
        params.push(fecha_desde.trim());
      }

      if (fecha_hasta && fecha_hasta.trim()) {
        whereClause += ' AND f.fecha_emision <= ?';
        params.push(fecha_hasta.trim());
      }

      if (ruta && ruta.trim()) {
        whereClause += ' AND f.ruta = ?';
        params.push(ruta.trim());
      }

      // Filtro de facturas vencidas
      if (vencidas === 'true' || vencidas === true) {
        whereClause += ' AND f.fecha_vencimiento < CURDATE() AND f.estado = "pendiente"';
      }

      // Búsqueda general
      if (search && search.trim()) {
        whereClause += ` AND (
          f.numero_factura LIKE ? OR 
          f.identificacion_cliente LIKE ? OR 
          f.nombre_cliente LIKE ?
        )`;
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Consulta principal con JOIN optimizado
      const baseQuery = `
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        ${whereClause}
      `;

      // Obtener total de registros
      const countQuery = `SELECT COUNT(f.id) as total ${baseQuery}`;
      const [countResult] = await Database.query(countQuery, params);
      const total = countResult.total || 0;

      // Obtener facturas con paginación
      const facturesQuery = `
        SELECT 
          f.*,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          c.estrato as cliente_estrato,
          CASE 
            WHEN f.fecha_vencimiento < CURDATE() AND f.estado = 'pendiente' THEN 'vencida'
            ELSE f.estado 
          END as estado_real,
          DATEDIFF(CURDATE(), f.fecha_vencimiento) as dias_vencimiento
        ${baseQuery}
        ORDER BY f.created_at DESC, f.id DESC
        LIMIT ? OFFSET ?
      `;

      const facturas = await Database.query(facturesQuery, [...params, limitNum, offset]);

      // Preparar respuesta con paginación
      const respuesta = {
        success: true,
        data: {
          facturas: facturas || [],
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalItems: total,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        },
        message: `${facturas?.length || 0} facturas encontradas`,
        timestamp: new Date().toISOString()
      };

      console.log(`📊 Facturas encontradas: ${facturas?.length || 0} de ${total} total`);
      return res.status(200).json(respuesta);

    } catch (error) {
      console.error('❌ Error al obtener facturas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Buscar facturas (endpoint específico para búsquedas)
   */
  static async buscar(req, res) {
    try {
      const { q, tipo = 'general', limit = 10 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return ApiResponse.success(res, [], 'Término de búsqueda muy corto');
      }

      const termino = q.trim();
      const limitNum = Math.min(20, parseInt(limit) || 10);

      let query, params;

      switch (tipo) {
        case 'numero':
          query = `
            SELECT * FROM facturas 
            WHERE numero_factura LIKE ? AND activo = '1'
            ORDER BY created_at DESC LIMIT ?
          `;
          params = [`%${termino}%`, limitNum];
          break;

        case 'cliente':
          query = `
            SELECT * FROM facturas 
            WHERE (identificacion_cliente LIKE ? OR nombre_cliente LIKE ?) 
            AND activo = '1'
            ORDER BY created_at DESC LIMIT ?
          `;
          params = [`%${termino}%`, `%${termino}%`, limitNum];
          break;

        default:
          query = `
            SELECT * FROM facturas 
            WHERE (
              numero_factura LIKE ? OR 
              identificacion_cliente LIKE ? OR 
              nombre_cliente LIKE ?
            ) AND activo = '1'
            ORDER BY created_at DESC LIMIT ?
          `;
          params = [`%${termino}%`, `%${termino}%`, `%${termino}%`, limitNum];
      }

      const facturas = await Database.query(query, params);
      return ApiResponse.success(res, facturas, `${facturas.length} facturas encontradas`);

    } catch (error) {
      console.error('❌ Error en búsqueda de facturas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Obtener estadísticas de facturas
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const { periodo } = req.query;
      let whereClause = 'WHERE activo = "1"';
      const params = [];

      if (periodo) {
        whereClause += ' AND periodo_facturacion = ?';
        params.push(periodo);
      }

      const estadisticas = await Database.query(`
        SELECT 
          COUNT(*) as total_facturas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as pagadas,
          COUNT(CASE WHEN estado = 'anulada' THEN 1 END) as anuladas,
          COUNT(CASE WHEN estado = 'pendiente' AND fecha_vencimiento < CURDATE() THEN 1 END) as vencidas,
          COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END), 0) as valor_pendiente,
          COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0) as valor_pagado,
          COALESCE(SUM(total), 0) as valor_total
        FROM facturas 
        ${whereClause}
      `, params);

      return ApiResponse.success(res, estadisticas[0], 'Estadísticas obtenidas');

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Obtener facturas vencidas
   */
  static async obtenerVencidas(req, res) {
    try {
      const { dias_vencimiento, limit = 50 } = req.query;
      
      let whereClause = `
        WHERE estado = 'pendiente' 
        AND fecha_vencimiento < CURDATE() 
        AND activo = '1'
      `;
      const params = [];

      if (dias_vencimiento) {
        whereClause += ' AND DATEDIFF(CURDATE(), fecha_vencimiento) >= ?';
        params.push(parseInt(dias_vencimiento));
      }

      const facturas = await Database.query(`
        SELECT *,
          DATEDIFF(CURDATE(), fecha_vencimiento) as dias_vencidas
        FROM facturas 
        ${whereClause}
        ORDER BY fecha_vencimiento ASC, total DESC
        LIMIT ?
      `, [...params, parseInt(limit)]);

      return ApiResponse.success(res, facturas, `${facturas.length} facturas vencidas encontradas`);

    } catch (error) {
      console.error('❌ Error obteniendo facturas vencidas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Obtener factura por ID
   */
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

  /**
   * Obtener factura por número
   */
  static async obtenerPorNumero(req, res) {
    try {
      const { numero } = req.params;
      
      if (!numero) {
        return ApiResponse.validationError(res, 'Número de factura requerido');
      }

      const factura = await Database.query(
        'SELECT * FROM facturas WHERE numero_factura = ? AND activo = "1"',
        [numero]
      );

      if (factura.length === 0) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      return ApiResponse.success(res, factura[0], 'Factura obtenida exitosamente');

    } catch (error) {
      console.error('❌ Error al obtener factura por número:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Crear nueva factura (MEJORADO con validaciones)
   */
  static async crear(req, res) {
    try {
      const datosFactura = {
        ...req.body,
        created_by: req.user?.id
      };

      // Validar datos requeridos
      const camposRequeridos = ['cliente_id'];
      const camposFaltantes = camposRequeridos.filter(campo => !datosFactura[campo]);
      
      if (camposFaltantes.length > 0) {
        return ApiResponse.validationError(res, 
          `Campos requeridos faltantes: ${camposFaltantes.join(', ')}`
        );
      }

      console.log('📝 Creando nueva factura:', datosFactura);

      // Si no se especifican fechas, usar facturación automática
      if (!datosFactura.fecha_emision) {
        const facturaAutomatica = await FacturacionAutomaticaService.crearFacturaInicialCliente(
          datosFactura.cliente_id
        );
        return ApiResponse.created(res, facturaAutomatica, 'Factura automática creada exitosamente');
      }

      // Crear factura manual
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

  /**
   * Actualizar factura (CORREGIDO)
   */
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

  /**
   * Marcar como pagada (CORREGIDO)
   */
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

  /**
   * Anular factura
   */
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

  /**
   * Duplicar factura
   */
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

  /**
   * Generar número de factura
   */
  static async generarNumeroFactura(req, res) {
    try {
      const numero = await FacturacionAutomaticaService.generarNumeroFactura();
      return ApiResponse.success(res, { numero_factura: numero }, 'Número generado');
    } catch (error) {
      console.error('❌ Error generando número de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Validar número de factura
   */
  static async validarNumeroFactura(req, res) {
    try {
      const { numero } = req.params;
      
      const existe = await Database.query(
        'SELECT id FROM facturas WHERE numero_factura = ?',
        [numero]
      );

      return ApiResponse.success(res, { 
        existe: existe.length > 0,
        numero_factura: numero 
      }, 'Validación completada');

    } catch (error) {
      console.error('❌ Error validando número de factura:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Obtener detalles de factura
   */
  static async obtenerDetalles(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const detalles = await Database.query(`
        SELECT df.*, sc.estado as estado_servicio, ps.nombre as plan_nombre
        FROM detalle_facturas df
        LEFT JOIN servicios_cliente sc ON df.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE df.factura_id = ?
        ORDER BY df.id
      `, [id]);

      return ApiResponse.success(res, detalles, 'Detalles obtenidos');

    } catch (error) {
      console.error('❌ Error obteniendo detalles:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Generar PDF de factura
   */
  static async generarPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      // Generar PDF (implementar PDFGenerator)
      const pdfBuffer = await PDFGenerator.generarFactura(factura);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="factura_${factura.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Ver PDF en navegador
   */
  static async verPDF(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return ApiResponse.validationError(res, 'ID de factura inválido');
      }

      const factura = await Factura.obtenerPorId(id);
      if (!factura) {
        return ApiResponse.notFound(res, 'Factura no encontrada');
      }

      const pdfBuffer = await PDFGenerator.generarFactura(factura);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="factura_${factura.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error mostrando PDF:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }

  /**
   * Endpoint para probar PDF
   */
  static async probarPDF(req, res) {
    try {
      // Datos de prueba
      const facturaTest = {
        numero_factura: 'TEST001',
        nombre_cliente: 'Cliente de Prueba',
        identificacion_cliente: '12345678',
        total: 100000,
        fecha_emision: new Date().toISOString().split('T')[0]
      };

      const pdfBuffer = await PDFGenerator.generarFactura(facturaTest);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="test_factura.pdf"');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error en prueba PDF:', error);
      return ApiResponse.error(res, 'Error generando PDF de prueba', 500, error.message);
    }
  }

  /**
   * Procesar facturación masiva
   */
  static async procesarFacturacionMasiva(req, res) {
    try {
      console.log('🔄 Iniciando facturación masiva...');
      
      const resultado = await FacturacionAutomaticaService.generarFacturacionMensual();
      
      return ApiResponse.success(res, resultado, 'Facturación masiva procesada');

    } catch (error) {
      console.error('❌ Error en facturación masiva:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500, error.message);
    }
  }
}

module.exports = FacturasController;