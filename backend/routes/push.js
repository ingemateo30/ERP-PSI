// backend/routes/push.js
// Web Push Notifications via VAPID + web-push

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Database } = require('../models/Database');

let webpush;
try {
  webpush = require('web-push');
} catch (_) {
  webpush = null;
}

router.use(authenticateToken);

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getVapidKeys() {
  // 1. Variables de entorno
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey:  process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject:    process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'admin@psi.com'}`
    };
  }
  // 2. Base de datos
  try {
    const [cfg] = await Database.query(
      'SELECT vapid_public_key, vapid_private_key FROM configuracion_empresa LIMIT 1'
    );
    if (cfg && cfg.vapid_public_key && cfg.vapid_private_key) {
      return {
        publicKey:  cfg.vapid_public_key,
        privateKey: cfg.vapid_private_key,
        subject:    `mailto:${process.env.EMAIL_FROM || 'admin@psi.com'}`
      };
    }
  } catch (_) {}
  return null;
}

function configureWebPush(keys) {
  if (!webpush) return false;
  try {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    return true;
  } catch (_) {
    return false;
  }
}

// ─── Rutas ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/push/vapid-public-key
 * Devuelve la clave pública VAPID para que el frontend pueda suscribirse
 */
router.get('/vapid-public-key', async (req, res) => {
  try {
    const keys = await getVapidKeys();
    if (!keys) {
      return res.json({ success: false, configurado: false, message: 'Push notifications no configuradas' });
    }
    res.json({ success: true, configurado: true, publicKey: keys.publicKey });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/push/estado
 * Estado del sistema de push notifications
 */
router.get('/estado', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const keys = await getVapidKeys();
    const tieneWebPush = !!webpush;
    const tieneKeys = !!keys;

    let totalSuscripciones = 0;
    try {
      const [row] = await Database.query('SELECT COUNT(*) as total FROM push_subscriptions WHERE activo = 1');
      totalSuscripciones = row?.total || 0;
    } catch (_) {}

    res.json({
      success: true,
      data: {
        web_push_disponible: tieneWebPush,
        vapid_configurado: tieneKeys,
        total_suscripciones: totalSuscripciones,
        mensaje: !tieneWebPush
          ? 'Paquete web-push no instalado (npm install web-push)'
          : !tieneKeys
            ? 'Faltan claves VAPID. Genéralas en Configuración > Notificaciones Push'
            : `Listo. ${totalSuscripciones} suscripción(es) activa(s)`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/push/generar-vapid
 * Genera y guarda nuevas claves VAPID en la DB
 */
router.post('/generar-vapid', requireRole('administrador'), async (req, res) => {
  try {
    if (!webpush) {
      return res.status(500).json({ success: false, message: 'Paquete web-push no disponible' });
    }
    const keys = webpush.generateVAPIDKeys();

    // Guardar en DB
    const [existing] = await Database.query('SELECT id FROM configuracion_empresa LIMIT 1');
    if (existing) {
      await Database.query(
        'UPDATE configuracion_empresa SET vapid_public_key = ?, vapid_private_key = ?, push_activo = 1 WHERE id = ?',
        [keys.publicKey, keys.privateKey, existing.id]
      );
    }

    res.json({
      success: true,
      message: 'Claves VAPID generadas y guardadas correctamente',
      data: { publicKey: keys.publicKey }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/push/subscribe
 * Registra la suscripción push de un usuario (desde el navegador)
 * Body: { endpoint, keys: { p256dh, auth } }
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Suscripción inválida' });
    }

    const usuarioId = req.user.id;
    const userAgent = req.headers['user-agent']?.slice(0, 255) || null;

    // Upsert: actualizar si ya existe, crear si no
    await Database.query(`
      INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent, activo)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth),
        user_agent = VALUES(user_agent), activo = 1, updated_at = NOW()
    `, [usuarioId, endpoint, keys.p256dh, keys.auth, userAgent]);

    res.json({ success: true, message: 'Suscripción registrada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/v1/push/unsubscribe
 * Cancela la suscripción push del usuario actual
 * Body: { endpoint }
 */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false, message: 'endpoint requerido' });

    await Database.query(
      'UPDATE push_subscriptions SET activo = 0 WHERE usuario_id = ? AND endpoint = ?',
      [req.user.id, endpoint]
    );

    res.json({ success: true, message: 'Suscripción cancelada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/push/send
 * Envía una push notification a uno o todos los usuarios
 * Body: { titulo, mensaje, url?, usuario_id? (si no, se envía a todos) }
 */
router.post('/send', requireRole('administrador', 'supervisor'), async (req, res) => {
  try {
    const keys = await getVapidKeys();
    if (!keys || !webpush) {
      return res.status(400).json({ success: false, message: 'Push notifications no configuradas' });
    }
    configureWebPush(keys);

    const { titulo, mensaje, url, usuario_id } = req.body;
    if (!titulo || !mensaje) {
      return res.status(400).json({ success: false, message: 'titulo y mensaje son requeridos' });
    }

    const params = usuario_id ? [usuario_id] : [];
    const query = usuario_id
      ? 'SELECT * FROM push_subscriptions WHERE activo = 1 AND usuario_id = ?'
      : 'SELECT * FROM push_subscriptions WHERE activo = 1';

    const suscripciones = await Database.query(query, params);

    const payload = JSON.stringify({
      title: titulo,
      body: mensaje,
      icon: '/logo192.png',
      badge: '/logo192.png',
      url: url || '/',
      timestamp: Date.now()
    });

    let enviadas = 0, errores = 0;
    for (const sub of suscripciones) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        enviadas++;
      } catch (err) {
        errores++;
        // Si el endpoint ya no es válido (410 Gone), desactivar
        if (err.statusCode === 410 || err.statusCode === 404) {
          await Database.query(
            'UPDATE push_subscriptions SET activo = 0 WHERE id = ?', [sub.id]
          ).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      message: `Push enviadas: ${enviadas}, errores: ${errores}`,
      data: { total: suscripciones.length, enviadas, errores }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/push/test
 * Envía una push de prueba al usuario autenticado
 */
router.post('/test', async (req, res) => {
  try {
    const keys = await getVapidKeys();
    if (!keys || !webpush) {
      return res.status(400).json({ success: false, message: 'Push notifications no configuradas' });
    }
    configureWebPush(keys);

    const subs = await Database.query(
      'SELECT * FROM push_subscriptions WHERE activo = 1 AND usuario_id = ? LIMIT 1',
      [req.user.id]
    );

    if (!subs.length) {
      return res.json({ success: false, message: 'No tienes suscripción activa en este navegador' });
    }

    const sub = subs[0];
    const payload = JSON.stringify({
      title: '✅ Push Notifications activas',
      body: 'Las notificaciones push están funcionando correctamente.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      url: '/',
      timestamp: Date.now()
    });

    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );

    res.json({ success: true, message: 'Notificación de prueba enviada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
