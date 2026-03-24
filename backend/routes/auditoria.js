// backend/routes/auditoria.js
// Consulta de logs de auditoría — solo administradores

const express = require('express');
const router  = express.Router();
const { Database } = require('../models/Database');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireRole('administrador'));

// Garantizar que la tabla existe con AUTO_INCREMENT correcto
Database.query(`
  CREATE TABLE IF NOT EXISTS logs_sistema (
    id          INT          NOT NULL AUTO_INCREMENT,
    usuario_id  INT          DEFAULT NULL,
    accion      VARCHAR(255) NOT NULL,
    tabla_afectada VARCHAR(100) DEFAULT NULL,
    registro_id INT          DEFAULT NULL,
    datos_anteriores LONGTEXT DEFAULT NULL,
    datos_nuevos     LONGTEXT DEFAULT NULL,
    ip_address  VARCHAR(45)  DEFAULT NULL,
    user_agent  TEXT         DEFAULT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`).then(() =>
  // Si ya existía sin AUTO_INCREMENT, arreglarlo
  Database.query('ALTER TABLE logs_sistema MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT')
).catch(() => {});

// GET /api/v1/auditoria
// Parámetros: page, limit, accion, usuario_id, tabla, fecha_desde, fecha_hasta, busqueda
router.get('/', async (req, res) => {
  try {
    const {
      page    = 1,
      limit   = 50,
      accion  = '',
      usuario_id = '',
      tabla   = '',
      fecha_desde = '',
      fecha_hasta = '',
      busqueda = '',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (accion) {
      where += ' AND l.accion LIKE ?';
      params.push(`%${accion}%`);
    }
    if (usuario_id) {
      where += ' AND l.usuario_id = ?';
      params.push(usuario_id);
    }
    if (tabla) {
      where += ' AND l.tabla_afectada = ?';
      params.push(tabla);
    }
    if (fecha_desde) {
      where += ' AND DATE(l.created_at) >= ?';
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      where += ' AND DATE(l.created_at) <= ?';
      params.push(fecha_hasta);
    }
    if (busqueda) {
      where += ' AND (l.accion LIKE ? OR l.ip_address LIKE ? OR u.nombre LIKE ?)';
      const t = `%${busqueda}%`;
      params.push(t, t, t);
    }

    const [{ total }] = await Database.query(
      `SELECT COUNT(*) AS total
       FROM logs_sistema l
       LEFT JOIN sistema_usuarios u ON l.usuario_id = u.id
       ${where}`,
      params
    );

    const logs = await Database.query(
      `SELECT
         l.id,
         l.accion,
         l.tabla_afectada,
         l.registro_id,
         l.datos_anteriores,
         l.datos_nuevos,
         l.ip_address,
         l.user_agent,
         l.created_at,
         l.usuario_id,
         COALESCE(u.nombre, 'Sistema') AS usuario_nombre,
         u.rol AS usuario_rol
       FROM logs_sistema l
       LEFT JOIN sistema_usuarios u ON l.usuario_id = u.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Parsear JSON guardados como texto
    const data = logs.map(r => ({
      ...r,
      datos_anteriores: r.datos_anteriores ? tryParse(r.datos_anteriores) : null,
      datos_nuevos:     r.datos_nuevos     ? tryParse(r.datos_nuevos)     : null,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total: parseInt(total),
        page:  parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(total) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/auditoria/acciones  → lista de acciones únicas (para filtro)
router.get('/acciones', async (_req, res) => {
  try {
    const rows = await Database.query(
      'SELECT DISTINCT accion FROM logs_sistema ORDER BY accion'
    );
    res.json({ success: true, data: rows.map(r => r.accion) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/v1/auditoria/tablas  → tablas afectadas únicas (para filtro)
router.get('/tablas', async (_req, res) => {
  try {
    const rows = await Database.query(
      'SELECT DISTINCT tabla_afectada FROM logs_sistema WHERE tabla_afectada IS NOT NULL ORDER BY tabla_afectada'
    );
    res.json({ success: true, data: rows.map(r => r.tabla_afectada) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

function tryParse(str) {
  try { return JSON.parse(str); } catch { return str; }
}

module.exports = router;
