// backend/controllers/ContratosController.js
const { Database } = require('../models/Database');

class ContratosController {
  
  static async obtenerTodos(req, res) {
    try {
      console.log('📋 GET /contratos - Obteniendo contratos');
      
      const { 
        page = 1, 
        limit = 10, 
        cliente_id, 
        estado = '',
        tipo_contrato = '',
        search = ''
      } = req.query;

      const offset = (page - 1) * limit;
      
      // ✅ CONSULTA CORREGIDA SEGÚN TU ESTRUCTURA DE BD
      let query = `
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.correo as cliente_email
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
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
      const total = countResult[0]?.total || 0;

      // Agregar paginación
      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const contratos = await Database.query(query, params);

      console.log(`✅ Encontrados ${contratos.length} contratos`);

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
          cl.estrato as cliente_estrato
        FROM contratos c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
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

  static async generarPDF(req, res) {
    try {
      const { id } = req.params;
      
      // Por ahora retornar mensaje temporal
      res.json({
        success: true,
        message: 'Función de PDF en desarrollo',
        data: { id }
      });

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  static async actualizarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, observaciones } = req.body;

      await Database.query(
        'UPDATE contratos SET estado = ?, observaciones = ?, updated_at = NOW() WHERE id = ?',
        [estado, observaciones, id]
      );

      res.json({
        success: true,
        message: 'Estado actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error actualizando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  static async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await Database.query(`
        SELECT 
          COUNT(*) as total_contratos,
          SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as contratos_activos,
          SUM(CASE WHEN estado = 'vencido' THEN 1 ELSE 0 END) as contratos_vencidos,
          SUM(CASE WHEN estado = 'terminado' THEN 1 ELSE 0 END) as contratos_terminados,
          SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END) as contratos_anulados,
          SUM(CASE WHEN firmado_cliente = 1 THEN 1 ELSE 0 END) as contratos_firmados
        FROM contratos
      `);

      res.json({
        success: true,
        data: estadisticas[0]
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ContratosController;