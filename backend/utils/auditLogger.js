// backend/utils/auditLogger.js
// Registra acciones críticas en la tabla logs_sistema

const { Database } = require('../models/Database');

/**
 * Escribe un registro en logs_sistema de forma silenciosa (nunca lanza error).
 *
 * @param {Object} opts
 * @param {number|null}  opts.usuario_id     ID del usuario que ejecuta la acción
 * @param {string}       opts.accion         Ej: 'LOGIN_OK', 'PAGO_REGISTRADO', 'CLIENTE_EDITADO'
 * @param {string|null}  opts.tabla          Tabla principal afectada
 * @param {number|null}  opts.registro_id    PK del registro afectado
 * @param {Object|null}  opts.datos_antes    Estado anterior (se serializa a JSON)
 * @param {Object|null}  opts.datos_nuevos   Estado nuevo  (se serializa a JSON)
 * @param {string|null}  opts.ip             IP del cliente
 * @param {string|null}  opts.user_agent     User-Agent del navegador
 */
async function audit({
  usuario_id = null,
  accion,
  tabla = null,
  registro_id = null,
  datos_antes = null,
  datos_nuevos = null,
  ip = null,
  user_agent = null,
}) {
  try {
    await Database.query(
      `INSERT INTO logs_sistema
         (usuario_id, accion, tabla_afectada, registro_id,
          datos_anteriores, datos_nuevos, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        accion,
        tabla,
        registro_id,
        datos_antes  ? JSON.stringify(datos_antes)  : null,
        datos_nuevos ? JSON.stringify(datos_nuevos) : null,
        ip,
        user_agent,
      ]
    );
  } catch (err) {
    // No propagar errores de auditoría para no interrumpir el flujo principal
    console.error('⚠️ auditLogger: no se pudo registrar acción:', accion, err.message);
  }
}

/**
 * Extrae IP real y User-Agent de un objeto request de Express.
 * Soporta X-Forwarded-For cuando app corre detrás de proxy.
 */
function metaFromReq(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || null);

  const userAgent = req.get?.('User-Agent') || null;

  return { ip, user_agent: userAgent };
}

module.exports = { audit, metaFromReq };
