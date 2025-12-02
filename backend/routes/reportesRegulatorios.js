// routes/reportesRegulatorios.js
const express = require('express');
const router = express.Router();
const ReportesRegulatoriosController = require('../controllers/reportesRegulatoriosController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const reportesController = new ReportesRegulatoriosController();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Ruta para obtener lista de reportes disponibles
router.get('/disponibles', reportesController.obtenerReportesDisponibles.bind(reportesController));

// Reportes CRC (Comisión de Regulación de Comunicaciones) - Solo admin y supervisor
router.get('/suscriptores-tv', requireRole('administrador', 'supervisor'), reportesController.generarReporteSuscriptoresTv.bind(reportesController));
router.get('/planes-tarifarios', requireRole('administrador', 'supervisor'), reportesController.generarReportePlanesTarifarios.bind(reportesController));
router.get('/lineas-valores', requireRole('administrador', 'supervisor'), reportesController.generarReporteLineasValores.bind(reportesController));
router.get('/disponibilidad-qos', requireRole('administrador', 'supervisor'), reportesController.generarReporteDisponibilidad.bind(reportesController));
router.get('/monitoreo-quejas', requireRole('administrador', 'supervisor'), reportesController.generarReporteQuejas.bind(reportesController));
router.get('/indicadores-quejas', requireRole('administrador', 'supervisor'), reportesController.generarReporteIndicadoresQuejas.bind(reportesController));

// Reportes contables - Solo administrador
router.get('/facturas-ventas', requireRole('administrador'), reportesController.generarReporteFacturasVentas.bind(reportesController));
router.get('/siigo-facturacion', requireRole('administrador'), reportesController.generarReporteSiigoFacturacion.bind(reportesController));

module.exports = router;