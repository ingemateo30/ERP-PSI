// backend/routes/reports.js

const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/reportsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roleAuth');

/**
 * @route GET /api/v1/reports/financial
 * @desc Obtener reporte financiero
 * @access Private (Supervisor+)
 */
router.get('/financial',
  authenticateToken,
  verificarRol('administrador'),
  ReportsController.getFinancialReport
);

/**
 * @route GET /api/v1/reports/clients
 * @desc Obtener reporte de clientes
 * @access Private (Supervisor+)
 */
router.get('/clients',
  authenticateToken,
  verificarRol('administrador'),
  ReportsController.getClientsReport
);

/**
 * @route GET /api/v1/reports/dashboard
 * @desc Obtener estadísticas del dashboard
 * @access Private
 */
router.get('/dashboard',
  authenticateToken,
  verificarRol('administrador'),
  ReportsController.getDashboardStats
);

// ============================================================
// PDF REPORTS (A-5)
// ============================================================
const PDFKit = require('pdfkit');

/**
 * Helper: generate a simple tabular PDF report
 * @param {object} opts - { title, subtitle, headers, rows, widths, empresa }
 * @returns {Promise<Buffer>}
 */
function generarReportePDF({ title, subtitle, headers, rows, widths, empresa }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFKit({ size: 'letter', margin: 40, layout: 'landscape' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = 712; // landscape usable width (792 letter - 2×40 margins)
      const empresaNombre = empresa?.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.';
      const empresaNit = empresa?.empresa_nit || '901582657-3';
      const fechaHoy = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });

      // Header band
      doc.rect(40, 30, PW, 50).fill('#0e6493');
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
        .text(title, 50, 40, { width: PW - 20 });
      doc.fontSize(9).font('Helvetica').fillColor('#cce4f0')
        .text(`${empresaNombre}  |  NIT ${empresaNit}  |  Generado: ${fechaHoy}`, 50, 60, { width: PW - 20 });
      if (subtitle) {
        doc.fontSize(8).fillColor('#ffffff').text(subtitle, 50, 73, { width: PW - 20 });
      }

      let y = 92;

      // Column widths default
      const colWidths = widths || headers.map(() => Math.floor(PW / headers.length));
      let x = 40;

      // Table header
      doc.rect(40, y, PW, 18).fill('#1a3c6e');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
        x += colWidths[i];
      });
      y += 18;

      // Rows
      doc.fontSize(7.5).font('Helvetica').fillColor('#000000');
      rows.forEach((row, ri) => {
        if (y > 530) {
          doc.addPage({ size: 'letter', layout: 'landscape', margin: 40 });
          y = 40;
          // Repeat header on new page
          x = 40;
          doc.rect(40, y, PW, 18).fill('#1a3c6e');
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
          headers.forEach((h, i) => {
            doc.text(h, x + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
            x += colWidths[i];
          });
          y += 18;
          doc.fontSize(7.5).font('Helvetica').fillColor('#000000');
        }

        const bg = ri % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(40, y, PW, 16).fill(bg);

        // Vertical dividers
        let dx = 40;
        colWidths.forEach(w => {
          dx += w;
          doc.moveTo(dx, y).lineTo(dx, y + 16).lineWidth(0.2).stroke('#cccccc');
        });

        x = 40;
        row.forEach((cell, ci) => {
          const txt = cell == null ? '' : String(cell);
          doc.fillColor(ri % 2 === 0 ? '#111827' : '#374151')
            .text(txt, x + 3, y + 4, { width: colWidths[ci] - 6, lineBreak: false, ellipsis: true });
          x += colWidths[ci];
        });
        y += 16;
      });

      // Footer total
      y += 6;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#555555')
        .text(`Total registros: ${rows.length}`, 40, y);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * @route GET /api/v1/reports/pdf/cartera-vencida
 * @desc PDF de cartera vencida (facturas pendientes con fecha vencida)
 */
router.get('/pdf/cartera-vencida',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { Database } = require('../models/Database');
      const facturas = await Database.query(`
        SELECT f.numero_factura, f.nombre_cliente, f.identificacion_cliente,
               f.fecha_emision, f.fecha_vencimiento,
               DATEDIFF(NOW(), f.fecha_vencimiento) AS dias_mora,
               f.total, f.ruta,
               c.telefono AS telefono_cliente
        FROM facturas f
        LEFT JOIN clientes c ON f.cliente_id = c.id
        WHERE f.activo = 1
          AND f.estado NOT IN ('pagada', 'anulada')
          AND f.fecha_vencimiento < CURDATE()
        ORDER BY dias_mora DESC, f.total DESC
        LIMIT 500
      `);

      const empresa = (await Database.query('SELECT * FROM configuracion_empresa LIMIT 1'))[0] || {};
      const total = facturas.reduce((s, f) => s + parseFloat(f.total || 0), 0);
      const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

      const pdfBuffer = await generarReportePDF({
        title: 'Reporte de Cartera Vencida',
        subtitle: `Fecha de corte: ${new Date().toLocaleDateString('es-CO')}  |  Total cartera: ${fmt(total)}`,
        headers: ['Factura', 'Cliente', 'Identificación', 'F. Emisión', 'F. Vencimiento', 'Días Mora', 'Total', 'Ruta', 'Teléfono'],
        widths:  [65,        135,      85,               65,           65,               55,          80,      60,    102],
        rows: facturas.map(f => [
          f.numero_factura, f.nombre_cliente, f.identificacion_cliente,
          new Date(f.fecha_emision).toLocaleDateString('es-CO'),
          new Date(f.fecha_vencimiento).toLocaleDateString('es-CO'),
          `${f.dias_mora} días`,
          fmt(f.total), f.ruta || '', f.telefono_cliente || ''
        ]),
        empresa
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="cartera_vencida_${new Date().toISOString().slice(0,10)}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('❌ Error PDF cartera vencida:', err);
      res.status(500).json({ success: false, message: 'Error generando reporte', error: err.message });
    }
  }
);

/**
 * @route GET /api/v1/reports/pdf/instalaciones-dia
 * @desc PDF de instalaciones del día (o fecha específica)
 */
router.get('/pdf/instalaciones-dia',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
      const { Database } = require('../models/Database');
      const instalaciones = await Database.query(`
        SELECT i.id, c.nombre AS cliente, c.identificacion, c.telefono,
               COALESCE(i.direccion_instalacion, c.direccion) AS direccion,
               i.estado, i.fecha_programada,
               u.nombre AS tecnico,
               i.hora_inicio, i.hora_fin, i.observaciones,
               ps.nombre AS servicio
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON sc.id = CAST(i.servicio_cliente_id AS UNSIGNED)
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE DATE(i.fecha_programada) = ?
        ORDER BY i.estado ASC, i.fecha_programada ASC
        LIMIT 200
      `, [fecha]);

      const empresa = (await Database.query('SELECT * FROM configuracion_empresa LIMIT 1'))[0] || {};
      const estadoLabel = { programada: 'Programada', en_proceso: 'En proceso', completada: 'Completada', cancelada: 'Cancelada' };

      const pdfBuffer = await generarReportePDF({
        title: `Instalaciones del día: ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'full' })}`,
        subtitle: `Total: ${instalaciones.length} instalaciones`,
        headers: ['#', 'Cliente', 'Identificación', 'Teléfono', 'Dirección', 'Técnico', 'Estado', 'Inicio', 'Fin', 'Servicio'],
        widths:  [22,  105,      78,               65,         115,         85,        68,      42,      42,    90],
        rows: instalaciones.map((i, idx) => [
          idx + 1, i.cliente, i.identificacion, i.telefono || '',
          i.direccion || '', i.tecnico || '', estadoLabel[i.estado] || i.estado,
          i.hora_inicio ? String(i.hora_inicio).slice(0, 5) : '',
          i.hora_fin ? String(i.hora_fin).slice(0, 5) : '',
          i.servicio || ''
        ]),
        empresa
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="instalaciones_${fecha}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('❌ Error PDF instalaciones:', err);
      res.status(500).json({ success: false, message: 'Error generando reporte', error: err.message });
    }
  }
);

/**
 * @route GET /api/v1/reports/pdf/pqr-abiertos
 * @desc PDF de PQR abiertos (estado != resuelto y != cerrado)
 */
router.get('/pdf/pqr-abiertos',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  async (req, res) => {
    try {
      const { Database } = require('../models/Database');
      const pqrs = await Database.query(`
        SELECT p.numero_radicado, p.tipo, p.categoria,
               COALESCE(c.nombre, '') AS cliente,
               p.asunto, p.estado,
               p.fecha_recepcion,
               DATE_ADD(p.fecha_recepcion, INTERVAL
                 CASE p.tipo WHEN 'sugerencia' THEN 30 ELSE 21 END DAY
               ) AS fecha_vencimiento_sla,
               CASE
                 WHEN p.estado IN ('resuelto','cerrado') THEN 'ok'
                 WHEN NOW() > DATE_ADD(p.fecha_recepcion, INTERVAL
                   CASE p.tipo WHEN 'sugerencia' THEN 30 ELSE 21 END DAY) THEN 'vencido'
                 WHEN TIMESTAMPDIFF(HOUR, NOW(), DATE_ADD(p.fecha_recepcion, INTERVAL
                   CASE p.tipo WHEN 'sugerencia' THEN 30 ELSE 21 END DAY)) <= 72 THEN 'proximo'
                 ELSE 'ok'
               END AS sla,
               u.nombre AS asignado
        FROM pqr p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON p.usuario_asignado = u.id
        WHERE p.estado NOT IN ('resuelto','cerrado')
        ORDER BY
          CASE WHEN NOW() > DATE_ADD(p.fecha_recepcion, INTERVAL
            CASE p.tipo WHEN 'sugerencia' THEN 30 ELSE 21 END DAY) THEN 0 ELSE 1 END ASC,
          p.fecha_recepcion ASC
        LIMIT 300
      `);

      const empresa = (await Database.query('SELECT * FROM configuracion_empresa LIMIT 1'))[0] || {};
      const tipoLabel = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
      const slaLabel = { ok: 'OK', vencido: 'VENCIDO', proximo: 'Próximo' };

      const pdfBuffer = await generarReportePDF({
        title: 'Reporte PQR Abiertos',
        subtitle: `Fecha: ${new Date().toLocaleDateString('es-CO')}  |  Total: ${pqrs.length} registros`,
        headers: ['Radicado', 'Tipo', 'Categoría', 'Cliente', 'Asunto', 'Estado', 'Recepción', 'Vence SLA', 'SLA', 'Asignado'],
        widths:  [65,         50,     68,           100,       110,      58,       60,           60,          40,    101],
        rows: pqrs.map(p => [
          p.numero_radicado,
          tipoLabel[p.tipo] || p.tipo,
          p.categoria || '',
          p.cliente || '',
          p.asunto || '',
          p.estado,
          p.fecha_recepcion ? new Date(p.fecha_recepcion).toLocaleDateString('es-CO') : '',
          p.fecha_vencimiento_sla ? new Date(p.fecha_vencimiento_sla).toLocaleDateString('es-CO') : 'N/A',
          slaLabel[p.sla] || p.sla,
          p.asignado || 'Sin asignar'
        ]),
        empresa
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="pqr_abiertos_${new Date().toISOString().slice(0,10)}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('❌ Error PDF PQR:', err);
      res.status(500).json({ success: false, message: 'Error generando reporte', error: err.message });
    }
  }
);

module.exports = router;