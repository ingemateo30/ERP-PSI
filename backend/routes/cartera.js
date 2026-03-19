// backend/routes/cartera.js
// Panel de cartera para clientes morosos (2+ facturas vencidas)

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Database } = require('../models/Database');
const Notificacion = require('../models/notificacion');

router.use(authenticateToken);

/**
 * GET /api/v1/cartera/morosos
 * Clientes con 2 o más facturas vencidas (pendientes y pasada la fecha de vencimiento)
 * Acceso: secretaria, supervisor, administrador
 */
router.get('/morosos', requireRole('secretaria', 'supervisor', 'administrador'), async (req, res) => {
  try {
    const { ciudad_id, search } = req.query;

    // Restricción de sede
    let sedeFilter = '';
    const params = [];

    if (req.user && req.user.rol !== 'administrador' && req.user.sede_id) {
      sedeFilter = 'AND c.ciudad_id = ?';
      params.push(req.user.sede_id);
    } else if (ciudad_id) {
      sedeFilter = 'AND c.ciudad_id = ?';
      params.push(ciudad_id);
    }

    let searchFilter = '';
    if (search) {
      searchFilter = 'AND (c.nombre LIKE ? OR c.identificacion LIKE ? OR c.telefono LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const morosos = await Database.query(`
      SELECT
        c.id,
        c.identificacion,
        c.nombre,
        c.telefono,
        c.correo AS email,
        c.direccion,
        c.estado AS estado_cliente,
        ci.nombre AS ciudad_nombre,
        s.nombre AS sector_nombre,
        COUNT(f.id) AS facturas_vencidas,
        SUM(f.total) AS total_deuda,
        MIN(f.fecha_vencimiento) AS primera_vencida,
        MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) AS dias_mora_max,
        SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 1 AND 30 THEN f.total ELSE 0 END) AS mora_1_30,
        SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) BETWEEN 31 AND 60 THEN f.total ELSE 0 END) AS mora_31_60,
        SUM(CASE WHEN DATEDIFF(CURDATE(), f.fecha_vencimiento) > 60 THEN f.total ELSE 0 END) AS mora_mayor_60,
        MAX(n.created_at) AS ultima_notificacion
      FROM clientes c
      INNER JOIN facturas f ON c.id = f.cliente_id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      LEFT JOIN sectores s ON c.sector_id = s.id
      LEFT JOIN notificaciones n ON n.datos_adicionales LIKE CONCAT('%"cliente_id":', c.id, '%')
        AND n.tipo = 'cliente_moroso'
      WHERE f.estado IN ('pendiente', 'vencida')
        AND f.fecha_vencimiento < CURDATE()
        AND f.activo = 1
        ${sedeFilter}
        ${searchFilter}
      GROUP BY c.id
      HAVING COUNT(f.id) >= 2
      ORDER BY total_deuda DESC, dias_mora_max DESC
    `, params);

    // Estadísticas globales
    const statsParams = params.slice(0, ciudad_id || (req.user && req.user.rol !== 'administrador' && req.user.sede_id) ? 1 : 0);

    const stats = await Database.query(`
      SELECT
        COUNT(DISTINCT sub.id) AS total_morosos,
        SUM(sub.total_deuda) AS cartera_total,
        AVG(sub.total_deuda) AS deuda_promedio,
        SUM(sub.facturas_vencidas) AS total_facturas_vencidas
      FROM (
        SELECT
          c.id,
          SUM(f.total) AS total_deuda,
          COUNT(f.id) AS facturas_vencidas
        FROM clientes c
        INNER JOIN facturas f ON c.id = f.cliente_id
        WHERE f.estado IN ('pendiente', 'vencida')
          AND f.fecha_vencimiento < CURDATE()
          AND f.activo = 1
          ${sedeFilter ? sedeFilter.replace(/c\.ciudad_id = \?/, 'c.ciudad_id = ?') : ''}
        GROUP BY c.id
        HAVING COUNT(f.id) >= 2
      ) sub
    `, statsParams);

    res.json({
      success: true,
      data: {
        morosos,
        estadisticas: stats[0] || {
          total_morosos: 0,
          cartera_total: 0,
          deuda_promedio: 0,
          total_facturas_vencidas: 0
        },
        total: morosos.length
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes morosos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo clientes morosos', error: error.message });
  }
});

/**
 * GET /api/v1/cartera/morosos/:clienteId/facturas
 * Detalle de facturas vencidas de un cliente moroso
 */
router.get('/morosos/:clienteId/facturas', requireRole('secretaria', 'supervisor', 'administrador'), async (req, res) => {
  try {
    const { clienteId } = req.params;

    const facturas = await Database.query(`
      SELECT
        f.id,
        f.numero_factura,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.total,
        f.estado,
        f.periodo_facturacion,
        DATEDIFF(CURDATE(), f.fecha_vencimiento) AS dias_vencida
      FROM facturas f
      WHERE f.cliente_id = ?
        AND f.estado IN ('pendiente', 'vencida')
        AND f.fecha_vencimiento < CURDATE()
        AND f.activo = 1
      ORDER BY f.fecha_vencimiento ASC
    `, [clienteId]);

    res.json({ success: true, data: facturas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo facturas del cliente', error: error.message });
  }
});

/**
 * POST /api/v1/cartera/notificar/:clienteId
 * Enviar notificación interna de cobro para un cliente moroso
 * (Secretaria marca para recordar contactar al cliente)
 */
router.post('/notificar/:clienteId', requireRole('secretaria', 'supervisor', 'administrador'), async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { observaciones } = req.body;

    // Obtener datos del cliente
    const clientes = await Database.query(`
      SELECT c.id, c.nombre, c.identificacion, c.telefono, c.correo,
             COUNT(f.id) AS facturas_vencidas,
             SUM(f.total) AS total_deuda
      FROM clientes c
      INNER JOIN facturas f ON c.id = f.cliente_id
      WHERE c.id = ?
        AND f.estado IN ('pendiente', 'vencida')
        AND f.fecha_vencimiento < CURDATE()
        AND f.activo = 1
      GROUP BY c.id
    `, [clienteId]);

    if (!clientes.length) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado o sin facturas vencidas' });
    }

    const cliente = clientes[0];

    // Crear notificación interna para todos los supervisores/administradores
    await Notificacion.crear({
      tipo: 'cliente_moroso',
      titulo: `Gestión de cobro: ${cliente.nombre}`,
      mensaje: `El cliente ${cliente.nombre} (${cliente.identificacion}) tiene ${cliente.facturas_vencidas} factura(s) vencida(s) por un total de $${Number(cliente.total_deuda).toLocaleString('es-CO')}. ${observaciones ? 'Nota: ' + observaciones : ''}`,
      datos_adicionales: {
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono,
        facturas_vencidas: cliente.facturas_vencidas,
        total_deuda: cliente.total_deuda,
        gestionado_por: req.user.id,
        observaciones: observaciones || ''
      }
    });

    res.json({
      success: true,
      message: `Notificación de cobro registrada para ${cliente.nombre}`
    });
  } catch (error) {
    console.error('Error enviando notificación de cobro:', error);
    res.status(500).json({ success: false, message: 'Error enviando notificación', error: error.message });
  }
});

/**
 * POST /api/v1/cartera/notificar-masivo
 * Generar notificaciones internas para TODOS los morosos (2+ facturas)
 * Acceso: supervisor, administrador
 */
router.post('/notificar-masivo', requireRole('supervisor', 'administrador'), async (req, res) => {
  try {
    const morosos = await Database.query(`
      SELECT
        c.id, c.nombre, c.identificacion, c.telefono,
        COUNT(f.id) AS facturas_vencidas,
        SUM(f.total) AS total_deuda
      FROM clientes c
      INNER JOIN facturas f ON c.id = f.cliente_id
      WHERE f.estado IN ('pendiente', 'vencida')
        AND f.fecha_vencimiento < CURDATE()
        AND f.activo = 1
      GROUP BY c.id
      HAVING COUNT(f.id) >= 2
    `, []);

    let notificados = 0;
    for (const cliente of morosos) {
      try {
        await Notificacion.crear({
          tipo: 'cliente_moroso',
          titulo: `Cartera vencida: ${cliente.nombre}`,
          mensaje: `${cliente.nombre} tiene ${cliente.facturas_vencidas} factura(s) vencida(s) por $${Number(cliente.total_deuda).toLocaleString('es-CO')}. Requiere gestión de cobro.`,
          datos_adicionales: {
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            facturas_vencidas: cliente.facturas_vencidas,
            total_deuda: cliente.total_deuda
          }
        });
        notificados++;
      } catch (err) {
        console.error(`Error notificando cliente ${cliente.id}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `${notificados} clientes morosos notificados de ${morosos.length} encontrados`,
      data: { total_morosos: morosos.length, notificados }
    });
  } catch (error) {
    console.error('Error en notificación masiva:', error);
    res.status(500).json({ success: false, message: 'Error en notificación masiva', error: error.message });
  }
});

module.exports = router;
