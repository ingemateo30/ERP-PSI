// backend/controllers/reportsController.js

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/responses');
const pool = require('../config/database');

class ReportsController {
  
  // Reportes financieros
  static async getFinancialReport(req, res) {
    try {
      const { 
        period = '6months',
        startDate,
        endDate 
      } = req.query;

      const connection = await pool.getConnection();
      
      // Calcular fechas según período
      let dateCondition = '';
      const params = [];
      
      if (startDate && endDate) {
        dateCondition = 'WHERE f.fecha_emision BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        const months = period === '6months' ? 6 : period === '12months' ? 12 : 3;
        dateCondition = 'WHERE f.fecha_emision >= DATE_SUB(NOW(), INTERVAL ? MONTH)';
        params.push(months);
      }

      // Datos mensuales de ingresos
      const [monthlyData] = await connection.execute(`
        SELECT 
          DATE_FORMAT(f.fecha_emision, '%Y-%m') as mes,
          MONTHNAME(f.fecha_emision) as mes_nombre,
          COALESCE(SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END), 0) as pendientes,
          COUNT(f.id) as total_facturas,
          COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END) as facturas_pagadas
        FROM facturas f
        ${dateCondition}
        GROUP BY DATE_FORMAT(f.fecha_emision, '%Y-%m')
        ORDER BY mes DESC
        LIMIT 12
      `, params);

      // Estadísticas generales
      const [generalStats] = await connection.execute(`
        SELECT 
          COALESCE(SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END), 0) as total_ingresos,
          COALESCE(SUM(CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END), 0) as total_pendiente,
          COUNT(DISTINCT f.cliente_id) as clientes_facturados,
          COUNT(f.id) as total_facturas,
          ROUND(AVG(f.total), 2) as factura_promedio,
          COALESCE(SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) / 
                   NULLIF(SUM(f.total), 0) * 100, 0) as tasa_cobranza
        FROM facturas f
        ${dateCondition}
      `, params);

      connection.release();

      return ApiResponse.success(res, {
        monthlyData: monthlyData.reverse(), // Más reciente primero
        ...generalStats[0]
      }, 'Reporte financiero obtenido exitosamente');

    } catch (error) {
      logger.error('Error generando reporte financiero:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Reporte de clientes
  static async getClientsReport(req, res) {
    try {
      const connection = await pool.getConnection();

      // Estadísticas por estado
      const [clientStats] = await connection.execute(`
        SELECT 
          estado,
          COUNT(*) as total,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM clientes), 2) as porcentaje
        FROM clientes
        GROUP BY estado
      `);

      // Clientes por sector
      const [sectorStats] = await connection.execute(`
        SELECT 
          COALESCE(s.nombre, 'Sin sector') as sector_nombre,
          COUNT(c.id) as total_clientes,
          SUM(CASE WHEN c.estado = 'activo' THEN 1 ELSE 0 END) as clientes_activos
        FROM clientes c
        LEFT JOIN sectores s ON c.sector_id = s.id
        GROUP BY s.id, s.nombre
        ORDER BY total_clientes DESC
        LIMIT 10
      `);

      // Crecimiento mensual
      const [growthData] = await connection.execute(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as mes,
          MONTHNAME(created_at) as mes_nombre,
          COUNT(*) as nuevos_clientes
        FROM clientes
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY mes DESC
        LIMIT 12
      `);

      connection.release();

      return ApiResponse.success(res, {
        por_estado: clientStats,
        por_sector: sectorStats,
        crecimiento_mensual: growthData.reverse()
      }, 'Reporte de clientes obtenido exitosamente');

    } catch (error) {
      logger.error('Error generando reporte de clientes:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Dashboard principal
  static async getDashboardStats(req, res) {
    try {
      const connection = await pool.getConnection();

      // Estadísticas principales
      const [mainStats] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'suspendido') as clientes_suspendidos,
          (SELECT COUNT(*) FROM servicios_cliente WHERE estado = 'activo') as servicios_activos,
          (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE estado = 'pagada' AND MONTH(fecha_emision) = MONTH(NOW())) as ingresos_mes_actual,
          (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE estado = 'pendiente') as cartera_pendiente,
          (SELECT COUNT(*) FROM facturas WHERE estado = 'vencida') as facturas_vencidas
      `);

      // Actividad reciente
      const [recentActivity] = await connection.execute(`
        SELECT 
          'cliente' as tipo,
          c.nombre as descripcion,
          c.created_at as fecha,
          'Nuevo cliente registrado' as accion
        FROM clientes c
        WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 
          'pago' as tipo,
          CONCAT('Pago de $', FORMAT(p.monto, 0)) as descripcion,
          p.fecha_pago as fecha,
          'Pago registrado' as accion
        FROM pagos p
        WHERE p.fecha_pago >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        ORDER BY fecha DESC
        LIMIT 10
      `);

      connection.release();

      return ApiResponse.success(res, {
        stats: mainStats[0],
        recent_activity: recentActivity
      }, 'Estadísticas del dashboard obtenidas exitosamente');

    } catch (error) {
      logger.error('Error obteniendo estadísticas del dashboard:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = ReportsController;