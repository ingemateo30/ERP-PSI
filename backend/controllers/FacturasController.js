// backend/controllers/FacturasController.js
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

// Importaciones opcionales
let PDFGenerator;

try {
  PDFGenerator = require('./utils/pdfGenerator');
  console.log('✅ PDFGenerator cargado en FacturasController');
} catch (error) {
  console.log('⚠️ PDFGenerator no disponible en FacturasController');
}

class FacturasController {

  /**
   * Generar facturación mensual masiva
   */
  static async generarFacturacionMensual(req, res) {
    try {
      console.log('🔄 Iniciando facturación mensual masiva...');
      
      const { fecha_referencia, solo_preview } = req.body;
      const fechaRef = fecha_referencia ? new Date(fecha_referencia) : new Date();
      
      // Si es solo preview, mostrar qué se facturaría sin generar
      if (solo_preview) {
        const preview = await FacturacionAutomaticaService.previewFacturacionMensual(fechaRef);
        return res.json({
          success: true,
          data: preview,
          message: 'Preview de facturación mensual generado',
          timestamp: new Date().toISOString()
        });
      }
      
      const resultado = await FacturacionAutomaticaService.generarFacturacionMensual(fechaRef);
      
      res.json({
        success: true,
        data: resultado,
        message: `Facturación mensual procesada: ${resultado.exitosas} exitosas, ${resultado.fallidas} fallidas`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en facturación mensual:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando facturación mensual',
        error: error.message
      });
    }
  }

  /**
   * Generar factura individual para un cliente
   */
  static async generarFacturaIndividual(req, res) {
    try {
      const { clienteId } = req.params;
      const { fecha_inicio, generar_orden_instalacion, generar_contrato } = req.body;
      
      if (!clienteId || isNaN(clienteId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      console.log(`🧾 Generando factura individual para cliente ${clienteId}...`);
      
      // Generar factura
      const factura = await FacturacionAutomaticaService.generarFacturaClienteIndividual(
        clienteId, 
        fecha_inicio
      );

      // Generar documentos adicionales si se solicita
      const documentosGenerados = {
        factura: factura,
        orden_instalacion: null,
        contrato: null
      };

      if (generar_orden_instalacion) {
        documentosGenerados.orden_instalacion = await this.generarOrdenInstalacion(clienteId);
      }

      if (generar_contrato) {
        documentosGenerados.contrato = await this.generarContrato(clienteId);
      }
      
      res.json({
        success: true,
        data: documentosGenerados,
        message: `Factura generada exitosamente: ${factura.numero_factura}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error generando factura individual:`, error);
      res.status(500).json({
        success: false,
        message: 'Error generando factura individual',
        error: error.message
      });
    }
  }

  /**
   * Obtener facturas con filtros y paginación
   */
  static async obtenerFacturas(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        cliente_id,
        estado,
        fecha_desde,
        fecha_hasta,
        numero_factura,
        sort_by = 'fecha_factura',
        sort_order = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = ['f.activo = 1'];
      let params = [];

      // Aplicar filtros
      if (cliente_id) {
        whereClause.push('f.cliente_id = ?');
        params.push(cliente_id);
      }

      if (estado) {
        whereClause.push('f.estado = ?');
        params.push(estado);
      }

      if (fecha_desde) {
        whereClause.push('DATE(f.fecha_factura) >= ?');
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        whereClause.push('DATE(f.fecha_factura) <= ?');
        params.push(fecha_hasta);
      }

      if (numero_factura) {
        whereClause.push('f.numero_factura LIKE ?');
        params.push(`%${numero_factura}%`);
      }

      const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

      const conexion = await Database.conexion();

      try {
        // Obtener total de registros
        const [countResult] = await conexion.execute(`
          SELECT COUNT(*) as total
          FROM facturas f
          LEFT JOIN clientes c ON f.cliente_id = c.id
          ${whereSQL}
        `, params);

        const total = countResult[0].total;

        // Obtener facturas paginadas
        const [facturas] = await conexion.execute(`
          SELECT 
            f.*,
            CONCAT(c.nombres, ' ', c.apellidos) as cliente_nombre,
            c.documento,
            c.telefono,
            c.email
          FROM facturas f
          LEFT JOIN clientes c ON f.cliente_id = c.id
          ${whereSQL}
          ORDER BY f.${sort_by} ${sort_order}
          LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
          success: true,
          data: {
            facturas,
            pagination: {
              current_page: parseInt(page),
              per_page: parseInt(limit),
              total: total,
              total_pages: Math.ceil(total / parseInt(limit))
            }
          },
          message: 'Facturas obtenidas exitosamente'
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo facturas',
        error: error.message
      });
    }
  }

  /**
   * Obtener detalles completos de una factura
   */
  static async obtenerFacturaPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura inválido'
        });
      }

      const factura = await this.obtenerDetallesFactura(id);

      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      res.json({
        success: true,
        data: factura,
        message: 'Factura obtenida exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo factura',
        error: error.message
      });
    }
  }

  /**
   * Anular una factura
   */
  static async anularFactura(req, res) {
    try {
      const { id } = req.params;
      const { motivo_anulacion } = req.body;
      const usuario_id = req.user.id;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de factura inválido'
        });
      }

      if (!motivo_anulacion || motivo_anulacion.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El motivo de anulación es requerido'
        });
      }

      const conexion = await Database.conexion();

      try {
        await conexion.beginTransaction();

        // Verificar que la factura existe y está pendiente
        const [facturaExistente] = await conexion.execute(`
          SELECT id, estado, total FROM facturas WHERE id = ? AND activo = 1
        `, [id]);

        if (facturaExistente.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Factura no encontrada'
          });
        }

        if (facturaExistente[0].estado !== 'pendiente') {
          return res.status(400).json({
            success: false,
            message: 'Solo se pueden anular facturas pendientes'
          });
        }

        // Anular la factura
        await conexion.execute(`
          UPDATE facturas 
          SET estado = 'anulada', 
              motivo_anulacion = ?,
              fecha_anulacion = NOW(),
              usuario_anulacion = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [motivo_anulacion, usuario_id, id]);

        await conexion.commit();

        res.json({
          success: true,
          message: 'Factura anulada exitosamente',
          data: { factura_id: id }
        });

      } catch (error) {
        await conexion.rollback();
        throw error;
      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error anulando factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error anulando factura',
        error: error.message
      });
    }
  }

  /**
   * Generar PDF de factura
   */
  static async generarPDF(req, res) {
    try {
      const { id } = req.params;

      if (!PDFGenerator) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no disponible'
        });
      }

      const factura = await this.obtenerDetallesFactura(id);
      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      // Usar tu PDFGenerator existente
      const pdfBuffer = await PDFGenerator.generarFacturaPDF(factura);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Factura_${factura.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando PDF',
        error: error.message
      });
    }
  }

  /**
   * Ver PDF en navegador
   */
  static async verPDF(req, res) {
    try {
      const { id } = req.params;

      if (!PDFGenerator) {
        return res.status(503).json({
          success: false,
          message: 'Servicio de PDF no disponible'
        });
      }

      const factura = await this.obtenerDetallesFactura(id);
      if (!factura) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      // Usar tu PDFGenerator existente
      const pdfBuffer = await PDFGenerator.generarFacturaPDF(factura);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Factura_${factura.numero_factura}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error mostrando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error mostrando PDF',
        error: error.message
      });
    }
  }

  /**
   * Registrar pago de factura
   */
  static async registrarPago(req, res) {
    try {
      const { id } = req.params;
      const {
        valor_pagado,
        metodo_pago,
        referencia_pago,
        observaciones,
        fecha_pago
      } = req.body;
      const usuario_id = req.user.id;

      // Validaciones
      if (!valor_pagado || valor_pagado <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El valor pagado debe ser mayor a cero'
        });
      }

      if (!metodo_pago) {
        return res.status(400).json({
          success: false,
          message: 'El método de pago es requerido'
        });
      }

      const conexion = await Database.conexion();

      try {
        await conexion.beginTransaction();

        // Obtener datos de la factura
        const [factura] = await conexion.execute(`
          SELECT id, cliente_id, total, estado 
          FROM facturas 
          WHERE id = ? AND activo = 1
        `, [id]);

        if (factura.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Factura no encontrada'
          });
        }

        const facturaData = factura[0];

        if (facturaData.estado === 'pagada') {
          return res.status(400).json({
            success: false,
            message: 'La factura ya está pagada'
          });
        }

        if (facturaData.estado === 'anulada') {
          return res.status(400).json({
            success: false,
            message: 'No se puede registrar pago en factura anulada'
          });
        }

        // Registrar el pago
        await conexion.execute(`
          INSERT INTO pagos (
            factura_id, cliente_id, valor_pagado, metodo_pago,
            referencia_pago, fecha_pago, observaciones,
            usuario_registro, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          id,
          facturaData.cliente_id,
          valor_pagado,
          metodo_pago,
          referencia_pago || null,
          fecha_pago || new Date(),
          observaciones || null,
          usuario_id
        ]);

        // Actualizar estado de la factura
        const nuevoEstado = valor_pagado >= facturaData.total ? 'pagada' : 'abono';
        
        await conexion.execute(`
          UPDATE facturas 
          SET estado = ?, fecha_pago = ?, updated_at = NOW()
          WHERE id = ?
        `, [nuevoEstado, fecha_pago || new Date(), id]);

        await conexion.commit();

        res.json({
          success: true,
          message: `Pago registrado exitosamente. Estado: ${nuevoEstado}`,
          data: {
            factura_id: id,
            valor_pagado,
            nuevo_estado: nuevoEstado
          }
        });

      } catch (error) {
        await conexion.rollback();
        throw error;
      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error registrando pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error registrando pago',
        error: error.message
      });
    }
  }

  /**
   * Generar orden de instalación
   */
  static async generarOrdenInstalacion(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      // Obtener datos del cliente y servicios
      const [cliente] = await conexion.execute(`
        SELECT * FROM clientes WHERE id = ? AND activo = 1
      `, [clienteId]);

      if (cliente.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const [servicios] = await conexion.execute(`
        SELECT s.*, p.nombre_plan, p.modalidad_plan, p.tecnologia
        FROM servicios s
        JOIN planes p ON s.plan_id = p.id
        WHERE s.cliente_id = ? AND s.activo = 1
      `, [clienteId]);

      // Generar número de orden
      const numeroOrden = await this.generarNumeroOrden();

      // Crear orden de instalación
      const [resultado] = await conexion.execute(`
        INSERT INTO ordenes_instalacion (
          numero_orden, cliente_id, fecha_orden, estado,
          tecnico_asignado, observaciones, created_at, updated_at
        ) VALUES (?, ?, NOW(), 'pendiente', NULL, ?, NOW(), NOW())
      `, [
        numeroOrden,
        clienteId,
        `Orden automática para servicios: ${servicios.map(s => s.nombre_plan).join(', ')}`
      ]);

      return {
        id: resultado.insertId,
        numero_orden: numeroOrden,
        cliente_id: clienteId,
        servicios: servicios
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar contrato
   */
  static async generarContrato(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      // Obtener configuración para número de contrato
      const [config] = await conexion.execute(`
        SELECT consecutivo_contrato FROM configuracion_empresa WHERE id = 1
      `);

      const consecutivo = config[0]?.consecutivo_contrato || 1;
      const numeroContrato = `CNT${consecutivo.toString().padStart(6, '0')}`;

      // Actualizar consecutivo
      await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_contrato = consecutivo_contrato + 1 
        WHERE id = 1
      `);

      // Crear contrato
      const [resultado] = await conexion.execute(`
        INSERT INTO contratos (
          numero_contrato, cliente_id, fecha_contrato, 
          estado, vigencia_meses, created_at, updated_at
        ) VALUES (?, ?, NOW(), 'activo', 12, NOW(), NOW())
      `, [numeroContrato, clienteId]);

      return {
        id: resultado.insertId,
        numero_contrato: numeroContrato,
        cliente_id: clienteId
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener detalles completos de una factura
   */
  static async obtenerDetallesFactura(facturaId) {
    const conexion = await Database.conexion();
    
    try {
      // Obtener factura principal
      const [factura] = await conexion.execute(`
        SELECT 
          f.*,
          CONCAT(c.nombres, ' ', c.apellidos) as cliente_nombre,
          c.documento, c.tipo_documento, c.telefono, c.email,
          c.direccion, c.barrio, c.estrato
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = ? AND f.activo = 1
      `, [facturaId]);

      if (factura.length === 0) {
        return null;
      }

      const facturaData = factura[0];

      // Obtener detalles de la factura
      const [detalles] = await conexion.execute(`
        SELECT 
          df.*,
          cf.nombre as concepto_nombre,
          cf.codigo as concepto_codigo
        FROM detalles_factura df
        LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
        WHERE df.factura_id = ?
        ORDER BY df.id
      `, [facturaId]);

      facturaData.detalles = detalles;

      // Obtener pagos asociados
      const [pagos] = await conexion.execute(`
        SELECT * FROM pagos 
        WHERE factura_id = ? 
        ORDER BY fecha_pago DESC
      `, [facturaId]);

      facturaData.pagos = pagos;

      return facturaData;

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar número de orden
   */
  static async generarNumeroOrden() {
    const conexion = await Database.conexion();
    try {
      const [config] = await conexion.execute(`
        SELECT consecutivo_orden_instalacion FROM configuracion_empresa WHERE id = 1
      `);
      
      const consecutivo = config[0]?.consecutivo_orden_instalacion || 1;
      
      await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_orden_instalacion = consecutivo_orden_instalacion + 1 
        WHERE id = 1
      `);
      
      return `ORD${consecutivo.toString().padStart(6, '0')}`;
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener reportes de facturación
   */
  static async obtenerReportes(req, res) {
    try {
      const {
        tipo_reporte,
        fecha_desde,
        fecha_hasta,
        cliente_id,
        estado
      } = req.query;

      const conexion = await Database.conexion();

      try {
        let consulta = '';
        let params = [];

        switch (tipo_reporte) {
          case 'ventas_diarias':
            consulta = `
              SELECT 
                DATE(fecha_factura) as fecha,
                COUNT(*) as total_facturas,
                SUM(subtotal) as subtotal,
                SUM(iva) as iva,
                SUM(total) as total
              FROM facturas 
              WHERE fecha_factura BETWEEN ? AND ?
                AND estado != 'anulada'
              GROUP BY DATE(fecha_factura)
              ORDER BY fecha DESC
            `;
            params = [fecha_desde, fecha_hasta];
            break;

          case 'facturas_pendientes':
            consulta = `
              SELECT 
                f.id, f.numero_factura, f.fecha_factura, f.fecha_vencimiento,
                f.total, CONCAT(c.nombres, ' ', c.apellidos) as cliente_nombre,
                c.telefono, c.email,
                DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencida
              FROM facturas f
              LEFT JOIN clientes c ON f.cliente_id = c.id
              WHERE f.estado = 'pendiente'
                AND f.activo = 1
              ORDER BY f.fecha_vencimiento ASC
            `;
            break;

          case 'clientes_morosos':
            consulta = `
              SELECT 
                c.id, CONCAT(c.nombres, ' ', c.apellidos) as cliente_nombre,
                c.documento, c.telefono, c.email,
                COUNT(f.id) as facturas_pendientes,
                SUM(f.total) as total_deuda,
                MIN(f.fecha_vencimiento) as deuda_mas_antigua
              FROM clientes c
              INNER JOIN facturas f ON c.id = f.cliente_id
              WHERE f.estado = 'pendiente'
                AND f.fecha_vencimiento < NOW()
                AND f.activo = 1
              GROUP BY c.id
              HAVING total_deuda > 0
              ORDER BY deuda_mas_antigua ASC
            `;
            break;

          default:
            return res.status(400).json({
              success: false,
              message: 'Tipo de reporte no válido'
            });
        }

        const [resultados] = await conexion.execute(consulta, params);

        res.json({
          success: true,
          data: {
            tipo_reporte,
            resultados,
            total_registros: resultados.length
          },
          message: 'Reporte generado exitosamente'
        });

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte',
        error: error.message
      });
    }
  }
}

module.exports = FacturasController;