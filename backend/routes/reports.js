// backend/routes/reports.js

const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reportsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route GET /api/v1/reports/financial
 * @desc Obtener reporte financiero
 * @access Private (Supervisor+)
 */
router.get('/financial',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  ReportsController.getFinancialReport
);

/**
 * @route GET /api/v1/reports/clients
 * @desc Obtener reporte de clientes
 * @access Private (Supervisor+)
 */
router.get('/clients',
  authenticateToken,
  requireRole('supervisor', 'administrador'),
  ReportsController.getClientsReport
);

/**
 * @route GET /api/v1/reports/dashboard
 * @desc Obtener estadísticas del dashboard
 * @access Private
 */
router.get('/dashboard',
  authenticateToken,
  ReportsController.getDashboardStats
);

module.exports = router;