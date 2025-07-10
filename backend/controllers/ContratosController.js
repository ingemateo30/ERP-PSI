// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');
const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');

class ContratosController {
  
  /**
   * Obtener todos los contratos con paginación
   */
  static async obtenerTodos(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        cliente_id, 
        estado = '',
        tipo_contrato = '',
        search = ''
      } = req.query;

      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          ps.tipo as plan_tipo
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE 1=1
      `;

      const params = [];

      // Filtros
      if (cliente_id) {
        query += ' AND c.cliente_id = ?';
        params.push(cliente_id);
      }

      if (estado) {
        query += ' AND c.estado = ?';
        params.push(estado);
      }

      if (tipo_contrato) {
        query += ' AND c.tipo_contrato = ?';
        params.push(tipo_contrato);
      }

      if (search) {
        query += ' AND (c.numero_contrato LIKE ? OR cl.nombre LIKE ? OR cl.identificacion LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Contar total
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await Database.query(countQuery, params);
      const total = countResult[0].total;

      // Agregar paginación y orden
      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const contratos = await Database.query(query, params);

      res.json({
        success: true,
        data: {
          contratos,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener contrato por ID con todos los detalles
   */
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          cl.direccion as cliente_direccion,
          cl.estrato as cliente_estrato,
          cd.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          s.nombre as sector_nombre,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          ps.tipo as plan_tipo,
          ps.velocidad_bajada,
          ps.velocidad_subida,
          ps.canales_tv,
          ps.descripcion as plan_descripcion,
          u.nombre as creado_por_nombre
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN ciudades cd ON cl.ciudad_id = cd.id
        LEFT JOIN departamentos d ON cd.departamento_id = d.id
        LEFT JOIN sectores s ON cl.sector_id = s.id
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        LEFT JOIN sistema_usuarios u ON c.created_by = u.id
        WHERE c.id = ?
      `;

      const contratos = await Database.query(query, [id]);

      if (contratos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contrato no encontrado'
        });
      }

      res.json({
        success: true,
        data: contratos[0]
      });

    } catch (error) {
      console.error('❌ Error obteniendo contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Generar PDF del contrato
   */
  static async generarPDF(req, res) {
    try {
      const { id } = req.params;

      // Obtener datos completos del contrato
      const query = `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.email as cliente_email,
          cl.direccion as cliente_direccion,
          cl.estrato as cliente_estrato,
          cd.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          s.nombre as sector_nombre,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          ps.tipo as plan_tipo,
          ps.velocidad_bajada,
          ps.velocidad_subida,
          ps.canales_tv,
          ps.descripcion as plan_descripcion
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN ciudades cd ON cl.ciudad_id = cd.id
        LEFT JOIN departamentos d ON cd.departamento_id = d.id
        LEFT JOIN sectores s ON cl.sector_id = s.id
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.id = ?
      `;

      const contratos = await Database.query(query, [id]);

      if (contratos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contrato no encontrado'
        });
      }

      const contrato = contratos[0];

      // Obtener configuración de la empresa
      const empresaQuery = `
        SELECT 
          razon_social as empresa_nombre,
          nit as empresa_nit,
          direccion as empresa_direccion,
          telefono as empresa_telefono,
          email as empresa_email,
          logo_url as empresa_logo
        FROM configuracion_empresa LIMIT 1
      `;

      const empresaResult = await Database.query(empresaQuery);

      if (empresaResult.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Configuración de empresa no encontrada'
        });
      }

      const empresa = empresaResult[0];

      // Generar PDF usando el template PSI
      const pdfBuffer = await ContratoPDFGenerator.generarContrato(contrato, empresa);

      // Guardar ruta del PDF en la base de datos
      const pdfPath = `contratos/contrato_${contrato.numero_contrato}.pdf`;
      await Database.query(
        'UPDATE contratos SET documento_pdf_path = ? WHERE id = ?',
        [pdfPath, id]
      );

      // Configurar headers para descarga
      const nombreArchivo = `Contrato_${contrato.numero_contrato}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      console.log(`📥 Enviando PDF del contrato: ${nombreArchivo}`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generando PDF del contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Actualizar estado del contrato
   */
  static async actualizarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, fecha_firma, observaciones } = req.body;

      const estadosValidos = ['activo', 'vencido', 'terminado', 'anulado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido'
        });
      }

      let updateFields = ['estado = ?', 'updated_at = NOW()'];
      let params = [estado];

      if (fecha_firma) {
        updateFields.push('fecha_firma = ?', 'firmado_cliente = 1');
        params.push(fecha_firma);
      }

      if (observaciones) {
        updateFields.push('observaciones = ?');
        params.push(observaciones);
      }

      params.push(id);

      await Database.query(
        `UPDATE contratos SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      res.json({
        success: true,
        message: 'Estado del contrato actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error actualizando estado del contrato:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de contratos
   */
  static async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await Database.query(`
        SELECT 
          COUNT(*) as total_contratos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as contratos_activos,
          SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as contratos_vencidos,
          SUM(CASE WHEN estado = 'terminado' THEN 1 ELSE 0 END) as contratos_terminados,
          SUM(CASE WHEN tipo_permanencia = 'con_permanencia' THEN 1 ELSE 0 END) as con_permanencia,
          SUM(CASE WHEN tipo_permanencia = 'sin_permanencia' THEN 1 ELSE 0 END) as sin_permanencia,
          SUM(CASE WHEN firmado_cliente = 1 THEN 1 ELSE 0 END) as contratos_firmados,
          AVG(permanencia_meses) as promedio_permanencia_meses
        FROM contratos
      `);

      res.json({
        success: true,
        data: estadisticas[0]
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de contratos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ContratosController;