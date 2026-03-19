// backend/routes/sms.js
// Endpoints para envío de SMS vía LabsMobile

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const SMSService = require('../services/SMSService');
const { Database } = require('../models/Database');

router.use(authenticateToken);

/**
 * GET /api/v1/sms/estado
 * Verificar si las credenciales LabsMobile están configuradas
 */
router.get('/estado', requireRole('administrador', 'supervisor'), (req, res) => {
  const configurado = !!(process.env.LABSMOBILE_USER && process.env.LABSMOBILE_TOKEN);
  res.json({
    success: true,
    configurado,
    mensaje: configurado
      ? 'LabsMobile configurado correctamente'
      : 'Faltan las variables LABSMOBILE_USER y/o LABSMOBILE_TOKEN en el archivo .env'
  });
});

/**
 * POST /api/v1/sms/enviar
 * Enviar SMS manual a uno o varios números
 * Body: { telefonos: string|string[], mensaje: string }
 */
router.post('/enviar', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { telefonos, mensaje } = req.body;
    if (!telefonos || !mensaje) {
      return res.status(400).json({ success: false, message: 'telefonos y mensaje son requeridos' });
    }
    const resultado = await SMSService.enviar(telefonos, mensaje);
    res.json({ success: resultado.success, data: resultado.resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/sms/notificar-vencimientos
 * Enviar SMS masivo a clientes con facturas que vencen en N días
 * Body: { dias: number (default 3) }
 * Acceso: administrador, supervisor
 */
router.post('/notificar-vencimientos', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const { dias = 3 } = req.body;

    const clientes = await Database.query(`
      SELECT DISTINCT
        c.id,
        c.nombre,
        c.telefono,
        f.total,
        DATE_FORMAT(f.fecha_vencimiento, '%d/%m/%Y') AS fecha_vencimiento
      FROM clientes c
      INNER JOIN facturas f ON f.cliente_id = c.id
      WHERE f.estado IN ('pendiente')
        AND f.activo = 1
        AND c.telefono IS NOT NULL
        AND c.telefono != ''
        AND DATE(f.fecha_vencimiento) = DATE_ADD(CURDATE(), INTERVAL ? DAY)
    `, [parseInt(dias)]);

    let enviados = 0;
    let errores = 0;
    const detalle = [];

    for (const cliente of clientes) {
      try {
        const resultado = await SMSService.notificarVencimientoFactura(cliente);
        if (resultado.success) { enviados++; } else { errores++; }
        detalle.push({ cliente_id: cliente.id, nombre: cliente.nombre, exito: resultado.success });
      } catch (e) {
        errores++;
        detalle.push({ cliente_id: cliente.id, nombre: cliente.nombre, exito: false, error: e.message });
      }
    }

    res.json({
      success: true,
      message: `SMS enviados: ${enviados}, errores: ${errores} de ${clientes.length} clientes`,
      data: { total: clientes.length, enviados, errores, detalle }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/sms/notificar-corte/:clienteId
 * Notificar a un cliente específico que su servicio será cortado
 */
router.post('/notificar-corte/:clienteId', requireRole('administrador', 'supervisor', 'secretaria'), async (req, res) => {
  try {
    const { clienteId } = req.params;
    const [cliente] = await Database.query(
      'SELECT id, nombre, telefono FROM clientes WHERE id = ?',
      [clienteId]
    );
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    if (!cliente.telefono) return res.status(400).json({ success: false, message: 'El cliente no tiene teléfono registrado' });

    const resultado = await SMSService.notificarCorteServicio(cliente);
    res.json({ success: resultado.success, data: resultado.resultado });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/sms/notificar-instalacion/:instalacionId
 * Notificar al cliente y/o técnico sobre una instalación programada
 */
router.post('/notificar-instalacion/:instalacionId', requireRole('administrador', 'supervisor', 'secretaria'), async (req, res) => {
  try {
    const { instalacionId } = req.params;

    const [inst] = await Database.query(`
      SELECT
        i.id, i.fecha_programada, i.hora_programada,
        c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
        u.nombre AS tecnico_nombre, u.telefono AS tecnico_telefono
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
      WHERE i.id = ?
    `, [instalacionId]);

    if (!inst) return res.status(404).json({ success: false, message: 'Instalación no encontrada' });

    const fecha = inst.fecha_programada
      ? new Date(inst.fecha_programada).toLocaleDateString('es-CO') + ' ' + (inst.hora_programada || '')
      : 'fecha por confirmar';

    const resultados = {};

    if (inst.cliente_telefono) {
      const r = await SMSService.notificarInstalacionProgramada(
        { nombre: inst.cliente_nombre, telefono: inst.cliente_telefono },
        fecha,
        inst.tecnico_nombre
      );
      resultados.cliente = { exito: r.success };
    }

    if (inst.tecnico_telefono) {
      const r = await SMSService.notificarTecnicoNuevaTarea(
        { telefono: inst.tecnico_telefono },
        `Instalacion para ${inst.cliente_nombre} el ${fecha}`
      );
      resultados.tecnico = { exito: r.success };
    }

    res.json({ success: true, data: resultados });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
