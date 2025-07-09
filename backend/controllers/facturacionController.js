// ========================================
// backend/controllers/facturacionController.js
// Controlador completo de facturación con reglas correctas de IVA
// ========================================

const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const IVACalculatorService = require('../services/IVACalculatorService');
const Database = require('../models/Database');

class FacturacionController {

  /**
   * Generar factura individual para un cliente
   */
  static async generarFacturaIndividual(req, res) {
    try {
      const { cliente_id } = req.params;
      const { fecha_facturacion, forzar_regeneracion } = req.body;

      // Validar parámetros
      if (!cliente_id) {
        return res.status(400).json({
          success: false,
          message: 'ID del cliente es requerido'
        });
      }

      // Validar que no exista factura del período actual (a menos que se fuerce)
      if (!forzar_regeneracion) {
        const facturaExistente = await Database.query(`
          SELECT numero_factura 
          FROM facturas 
          WHERE cliente_id = ? 
            AND YEAR(fecha_emision) = YEAR(CURDATE())
            AND MONTH(fecha_emision) = MONTH(CURDATE())
            AND activo = 1
          LIMIT 1
        `, [cliente_id]);

        if (facturaExistente.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Ya existe la factura ${facturaExistente[0].numero_factura} para este período`,
            numero_factura_existente: facturaExistente[0].numero_factura
          });
        }
      }

      // Generar factura
      const resultado = await FacturacionAutomaticaService.generarFacturaAutomatica(
        cliente_id, 
        { fechaFacturacion: fecha_facturacion }
      );

      res.status(201).json(resultado);

    } catch (error) {
      console.error('❌ Error generando factura individual:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando factura individual',
        error: error.message
      });
    }
  }

  /**
   * Facturación masiva
   */
  static async facturacionMasiva(req, res) {
    try {
      const { 
        fecha_facturacion, 
        filtros = {},
        confirmar_proceso = false 
      } = req.body;

      if (!confirmar_proceso) {
        // Obtener vista previa de clientes a facturar
        const clientesFacturar = await FacturacionAutomaticaService.obtenerClientesParaFacturar(filtros);
        
        return res.json({
          success: true,
          vista_previa: true,
          total_clientes: clientesFacturar.length,
          clientes: clientesFacturar.slice(0, 10), // Mostrar solo los primeros 10
          mensaje: `Se facturarán ${clientesFacturar.length} clientes. Confirme el proceso.`
        });
      }

      // Ejecutar facturación masiva
      const resultados = await FacturacionAutomaticaService.facturacionMasiva(
        fecha_facturacion, 
        filtros
      );

      res.json({
        success: true,
        ...resultados,
        mensaje: `Facturación masiva completada: ${resultados.facturas_generadas} exitosas de ${resultados.total_clientes} clientes`
      });

    } catch (error) {
      console.error('❌ Error en facturación masiva:', error);
      res.status(500).json({
        success: false,
        message: 'Error en facturación masiva',
        error: error.message
      });
    }
  }

  /**
   * Obtener facturas con filtros
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
        ruta,
        estrato
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      let whereConditions = ['f.activo = 1'];
      let params = [];

      // Aplicar filtros
      if (cliente_id) {
        whereConditions.push('f.cliente_id = ?');
        params.push(cliente_id);
      }

      if (estado) {
        whereConditions.push('f.estado = ?');
        params.push(estado);
      }

      if (fecha_desde) {
        whereConditions.push('f.fecha_emision >= ?');
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        whereConditions.push('f.fecha_emision <= ?');
        params.push(fecha_hasta);
      }

      if (numero_factura) {
        whereConditions.push('f.numero_factura LIKE ?');
        params.push(`%${numero_factura}%`);
      }

      if (ruta) {
        whereConditions.push('c.ruta = ?');
        params.push(ruta);
      }

      if (estrato) {
        whereConditions.push('c.estrato = ?');
        params.push(estrato);
      }

      // Consulta principal
      const query = `
        SELECT 
          f.*,
          c.nombres,
          c.apellidos,
          c.numero_identificacion,
          c.estrato,
          c.ruta,
          c.telefono,
          c.email,
          CONCAT(c.nombres, ' ', c.apellidos) as nombre_completo,
          -- Información de IVA por estrato
          CASE 
            WHEN c.estrato IN (1,2,3) THEN 'Estratos 1-3: Internet sin IVA'
            ELSE 'Estratos 4-6: Internet con IVA 19%'
          END as info_iva_internet,
          'Televisión: IVA 19% todos los estratos' as info_iva_television,
          -- Cálculos adicionales
          DATEDIFF(CURDATE(), f.fecha_vencimiento) as dias_vencido,
          (f.total - COALESCE(f.pagado, 0)) as saldo_pendiente
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY f.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;

      // Consulta para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE ${whereConditions.join(' AND ')}
      `;

      const [facturas, countResult] = await Promise.all([
        Database.query(query, params),
        Database.query(countQuery, params)
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: facturas,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });

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
   * Obtener detalles de una factura específica
   */
  static async obtenerDetalleFactura(req, res) {
    try {
      const { factura_id } = req.params;

      // Obtener factura principal
      const facturaQuery = `
        SELECT 
          f.*,
          c.nombres,
          c.apellidos,
          c.numero_identificacion,
          c.tipo_identificacion,
          c.estrato,
          c.direccion,
          c.telefono,
          c.email,
          c.ruta,
          CONCAT(c.nombres, ' ', c.apellidos) as nombre_completo,
          d.nombre as departamento,
          cd.nombre as ciudad,
          s.nombre as sector
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN ciudades cd ON c.ciudad_id = cd.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE f.id = ? AND f.activo = 1
      `;

      const facturas = await Database.query(facturaQuery, [factura_id]);

      if (facturas.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Factura no encontrada'
        });
      }

      const factura = facturas[0];

      // Obtener detalles de la factura
      const detallesQuery = `
        SELECT 
          fd.*,
          CASE 
            WHEN fd.aplica_iva = 1 THEN CONCAT(fd.porcentaje_iva, '% IVA')
            ELSE 'Sin IVA'
          END as info_iva
        FROM facturas_detalle fd
        WHERE fd.factura_id = ?
        ORDER BY fd.id
      `;

      const detalles = await Database.query(detallesQuery, [factura_id]);

      // Calcular resumen de IVA
      const resumenIVA = {
        subtotal: factura.subtotal,
        total_iva: factura.iva,
        total: factura.total,
        desglose: {
          internet: {
            base: factura.internet,
            iva: factura.s_internet,
            aplica_iva: factura.estrato > 3,
            descripcion: factura.estrato <= 3 ? 
              'Internet - Sin IVA (Estrato 1-3)' : 
              'Internet - IVA 19% (Estrato 4-6)'
          },
          television: {
            base: factura.television,
            iva: factura.s_television,
            aplica_iva: true,
            descripcion: 'Televisión - IVA 19% (Todos los estratos)'
          },
          varios: {
            base: factura.varios,
            iva: factura.s_varios,
            aplica_iva: true,
            descripcion: 'Varios - IVA 19%'
          },
          reconexion: {
            base: factura.reconexion,
            iva: factura.s_reconexion,
            aplica_iva: true,
            descripcion: 'Reconexión - IVA 19%'
          }
        }
      };

      res.json({
        success: true,
        data: {
          factura,
          detalles,
          resumen_iva: resumenIVA
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo detalle de factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo detalle de factura',
        error: error.message
      });
    }
  }

  /**
   * Calcular preview de precios con IVA para un cliente
   */
  static async calcularPreviewPrecios(req, res) {
    try {
      const { cliente_id, plan_id } = req.params;

      // Obtener datos del cliente
      const cliente = await FacturacionAutomaticaService.obtenerDatosCliente(cliente_id);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Obtener plan de servicio
      const planQuery = `
        SELECT * FROM planes_servicio 
        WHERE id = ? AND activo = 1
      `;
      const planes = await Database.query(planQuery, [plan_id]);

      if (planes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      const plan = planes[0];

      // Calcular precios con IVA según estrato
      const preciosCalculados = IVACalculatorService.calcularPreciosPlan(plan, cliente.estrato);

      res.json({
        success: true,
        data: {
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre_completo,
            estrato: cliente.estrato
          },
          plan: {
            id: plan.id,
            codigo: plan.codigo,
            nombre: plan.nombre,
            tipo: plan.tipo
          },
          precios: preciosCalculados,
          reglas_iva: {
            internet: IVACalculatorService.obtenerDescripcionIVA('internet', cliente.estrato),
            television: IVACalculatorService.obtenerDescripcionIVA('television', cliente.estrato),
            instalacion: 'Instalación: IVA 19% (Todos los estratos)'
          }
        }
      });

    } catch (error) {
      console.error('❌ Error calculando preview de precios:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculando precios',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de facturación
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;
      
      const periodo = {};
      if (fecha_inicio) periodo.fecha_inicio = fecha_inicio;
      if (fecha_fin) periodo.fecha_fin = fecha_fin;

      const estadisticas = await FacturacionAutomaticaService.obtenerEstadisticasFacturacion(periodo);

      // Agregar estadísticas adicionales de IVA
      const estadisticasIVA = await Database.query(`
        SELECT 
          SUM(CASE WHEN c.estrato IN (1,2,3) THEN f.internet ELSE 0 END) as internet_sin_iva,
          SUM(CASE WHEN c.estrato IN (4,5,6) THEN f.internet ELSE 0 END) as internet_con_iva,
          SUM(CASE WHEN c.estrato IN (4,5,6) THEN f.s_internet ELSE 0 END) as iva_internet_recaudado,
          COUNT(CASE WHEN c.estrato IN (1,2,3) THEN 1 END) as clientes_estrato_bajo,
          COUNT(CASE WHEN c.estrato IN (4,5,6) THEN 1 END) as clientes_estrato_alto
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE f.fecha_emision BETWEEN COALESCE(?, DATE_FORMAT(CURDATE(), '%Y-%m-01')) 
                                 AND COALESCE(?, CURDATE())
          AND f.activo = 1
      `, [fecha_inicio, fecha_fin]);

      res.json({
        success: true,
        data: {
          ...estadisticas,
          ...estadisticasIVA[0],
          periodo: {
            fecha_inicio: fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            fecha_fin: fecha_fin || new Date().toISOString().split('T')[0]
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }

  /**
   * Actualizar estado de factura
   */
  static async actualizarEstadoFactura(req, res) {
    try {
      const { factura_id } = req.params;
      const { estado, observaciones } = req.body;

      const estadosValidos = ['emitida', 'pagada', 'vencida', 'cancelada'];
      
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido',
          estados_validos: estadosValidos
        });
      }

      const query = `
        UPDATE facturas 
        SET estado = ?, 
            observaciones = CONCAT(COALESCE(observaciones, ''), '\n', ?),
            updated_at = NOW()
        WHERE id = ? AND activo = 1
      `;

      const observacionCompleta = `${new Date().toISOString()}: Estado cambiado a ${estado}. ${observaciones || ''}`;

      await Database.query(query, [estado, observacionCompleta, factura_id]);

      res.json({
        success: true,
        message: `Estado de factura actualizado a: ${estado}`
      });

    } catch (error) {
      console.error('❌ Error actualizando estado de factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando estado de factura',
        error: error.message
      });
    }
  }

  /**
   * Validar factura antes de generar
   */
  static async validarFactura(req, res) {
    try {
      const { cliente_id } = req.params;

      const validacion = await FacturacionAutomaticaService.validarFactura(cliente_id, []);

      res.json({
        success: true,
        data: validacion
      });

    } catch (error) {
      console.error('❌ Error validando factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error validando factura',
        error: error.message
      });
    }
  }

  /**
   * Obtener configuración de IVA
   */
  static async obtenerConfiguracionIVA(req, res) {
    try {
      const configuracion = await Database.query(`
        SELECT 
          tipo_servicio,
          estrato_desde,
          estrato_hasta,
          aplica_iva,
          porcentaje_iva,
          descripcion
        FROM configuracion_iva 
        WHERE activo = 1
        ORDER BY tipo_servicio, estrato_desde
      `);

      res.json({
        success: true,
        data: configuracion,
        reglas: {
          internet: 'Sin IVA estratos 1-3, Con IVA 19% estratos 4-6',
          television: 'IVA 19% todos los estratos',
          reconexion: 'IVA 19% todos los estratos',
          varios: 'IVA 19% todos los estratos',
          publicidad: 'Sin IVA todos los estratos',
          interes: 'Sin IVA todos los estratos'
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo configuración IVA:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo configuración IVA',
        error: error.message
      });
    }
  }

  /**
   * Generar reporte de IVA por período
   */
  static async generarReporteIVA(req, res) {
    try {
      const { periodo } = req.params; // formato: YYYY-MM
      const [año, mes] = periodo.split('-');
      
      if (!año || !mes) {
        return res.status(400).json({
          success: false,
          message: 'Formato de período inválido. Use YYYY-MM'
        });
      }

      const reporteIVA = await Database.query(`
        SELECT 
          'Internet Estrato 1-3' as concepto,
          SUM(CASE WHEN c.estrato IN (1,2,3) THEN f.internet ELSE 0 END) as base_gravable,
          0 as iva_recaudado,
          'No aplica IVA' as observacion
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE YEAR(f.fecha_emision) = ? AND MONTH(f.fecha_emision) = ?
          AND f.activo = 1
        
        UNION ALL
        
        SELECT 
          'Internet Estrato 4-6' as concepto,
          SUM(CASE WHEN c.estrato IN (4,5,6) THEN f.internet ELSE 0 END) as base_gravable,
          SUM(CASE WHEN c.estrato IN (4,5,6) THEN f.s_internet ELSE 0 END) as iva_recaudado,
          'IVA 19%' as observacion
        FROM facturas f
        INNER JOIN clientes c ON f.cliente_id = c.id
        WHERE YEAR(f.fecha_emision) = ? AND MONTH(f.fecha_emision) = ?
          AND f.activo = 1
        
        UNION ALL
        
        SELECT 
          'Televisión (Todos)' as concepto,
          SUM(f.television) as base_gravable,
          SUM(f.s_television) as iva_recaudado,
          'IVA 19%' as observacion
        FROM facturas f
        WHERE YEAR(f.fecha_emision) = ? AND MONTH(f.fecha_emision) = ?
          AND f.activo = 1
        
        UNION ALL
        
        SELECT 
          'Varios y Reconexión' as concepto,
          SUM(f.varios + f.reconexion) as base_gravable,
          SUM(f.s_varios + f.s_reconexion) as iva_recaudado,
          'IVA 19%' as observacion
        FROM facturas f
        WHERE YEAR(f.fecha_emision) = ? AND MONTH(f.fecha_emision) = ?
          AND f.activo = 1
        
        UNION ALL
        
        SELECT 
          'Publicidad e Intereses' as concepto,
          SUM(f.publicidad + f.interes) as base_gravable,
          0 as iva_recaudado,
          'No aplica IVA' as observacion
        FROM facturas f
        WHERE YEAR(f.fecha_emision) = ? AND MONTH(f.fecha_emision) = ?
          AND f.activo = 1
      `, [año, mes, año, mes, año, mes, año, mes, año, mes]);

      // Calcular totales
      const totales = reporteIVA.reduce((acc, item) => {
        acc.total_base_gravable += parseFloat(item.base_gravable) || 0;
        acc.total_iva_recaudado += parseFloat(item.iva_recaudado) || 0;
        return acc;
      }, { total_base_gravable: 0, total_iva_recaudado: 0 });

      res.json({
        success: true,
        data: {
          periodo: `${año}-${mes}`,
          reporte_detallado: reporteIVA,
          totales,
          fecha_generacion: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error generando reporte IVA:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando reporte IVA',
        error: error.message
      });
    }
  }

  /**
   * Endpoint para probar cálculos de IVA (solo en desarrollo)
   */
  static async testCalcularIVA(req, res) {
    try {
      const { tipo_servicio, precio_base, estrato } = req.body;
      
      const resultado = IVACalculatorService.calcularPrecioConIVA(
        precio_base, 
        tipo_servicio, 
        estrato
      );

      const descripcion = IVACalculatorService.obtenerDescripcionIVA(tipo_servicio, estrato);

      res.json({
        success: true,
        data: {
          entrada: { tipo_servicio, precio_base, estrato },
          resultado,
          descripcion,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en test de cálculo IVA',
        error: error.message
      });
    }
  }
}

module.exports = FacturacionController;