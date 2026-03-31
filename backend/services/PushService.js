// backend/services/PushService.js
// Servicio para enviar push notifications desde cualquier parte del backend
// Uso: await PushService.enviarAUsuario(usuarioId, titulo, mensaje, url)
//       await PushService.enviarATodos(titulo, mensaje, url)

const { Database } = require('../models/Database');

let webpush;
try { webpush = require('web-push'); } catch (_) { webpush = null; }

class PushService {
  static async _cargarVapid() {
    if (!webpush) return false;

    const pub  = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'admin@psi.com'}`;

    if (pub && priv) {
      webpush.setVapidDetails(subj, pub, priv);
      return true;
    }

    try {
      const [cfg] = await Database.query(
        'SELECT vapid_public_key, vapid_private_key FROM configuracion_empresa LIMIT 1'
      );
      if (cfg?.vapid_public_key && cfg?.vapid_private_key) {
        webpush.setVapidDetails(subj, cfg.vapid_public_key, cfg.vapid_private_key);
        return true;
      }
    } catch (_) {}
    return false;
  }

  static async _enviar(suscripciones, titulo, cuerpo, url = '/') {
    const listo = await PushService._cargarVapid();
    if (!listo || !suscripciones.length) return { enviadas: 0, errores: 0 };

    const payload = JSON.stringify({
      title: titulo,
      body: cuerpo,
      icon: '/logo192.png',
      badge: '/logo192.png',
      url,
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
        if (err.statusCode === 410 || err.statusCode === 404) {
          Database.query('UPDATE push_subscriptions SET activo = 0 WHERE id = ?', [sub.id]).catch(() => {});
        }
      }
    }
    return { enviadas, errores };
  }

  /**
   * Enviar push a un usuario específico
   */
  static async enviarAUsuario(usuarioId, titulo, cuerpo, url = '/') {
    try {
      const subs = await Database.query(
        'SELECT * FROM push_subscriptions WHERE activo = 1 AND usuario_id = ?',
        [usuarioId]
      );
      return PushService._enviar(subs, titulo, cuerpo, url);
    } catch (_) { return { enviadas: 0, errores: 0 }; }
  }

  /**
   * Enviar push a todos los usuarios suscritos
   */
  static async enviarATodos(titulo, cuerpo, url = '/') {
    try {
      const subs = await Database.query('SELECT * FROM push_subscriptions WHERE activo = 1');
      return PushService._enviar(subs, titulo, cuerpo, url);
    } catch (_) { return { enviadas: 0, errores: 0 }; }
  }

  /**
   * Enviar push a usuarios de un rol específico
   */
  static async enviarARol(rol, titulo, cuerpo, url = '/') {
    try {
      const subs = await Database.query(`
        SELECT ps.* FROM push_subscriptions ps
        INNER JOIN sistema_usuarios u ON ps.usuario_id = u.id
        WHERE ps.activo = 1 AND u.rol = ?
      `, [rol]);
      return PushService._enviar(subs, titulo, cuerpo, url);
    } catch (_) { return { enviadas: 0, errores: 0 }; }
  }
}

module.exports = PushService;
