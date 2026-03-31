// backend/services/SMSService.js
// Integración con LabsMobile para envío de SMS a clientes y técnicos
//
// Las credenciales se leen primero desde las variables de entorno y,
// si no están configuradas, desde la tabla configuracion_empresa (DB).

const https = require('https');

const LABSMOBILE_API = 'https://api.labsmobile.com/json/send';

class SMSService {
  /**
   * Carga credenciales desde la DB si no están en .env
   */
  static async _obtenerCredenciales() {
    const user  = process.env.LABSMOBILE_USER;
    const token = process.env.LABSMOBILE_TOKEN;

    if (user && token) {
      return {
        user,
        token,
        sender: process.env.LABSMOBILE_SENDER || null
      };
    }

    // Intentar leer desde DB
    try {
      const { Database } = require('../models/Database');
      const [cfg] = await Database.query(
        'SELECT labsmobile_user, labsmobile_token, labsmobile_sender FROM configuracion_empresa LIMIT 1'
      );
      if (cfg && cfg.labsmobile_user && cfg.labsmobile_token) {
        return {
          user:   cfg.labsmobile_user,
          token:  cfg.labsmobile_token,
          sender: cfg.labsmobile_sender || null
        };
      }
    } catch (_) { /* silencioso */ }

    return null;
  }

  /**
   * Verifica si hay credenciales disponibles (para mostrar estado en UI)
   */
  static async estaConfigurado() {
    const creds = await SMSService._obtenerCredenciales();
    return !!creds;
  }

  /**
   * Normaliza un número de teléfono colombiano al formato internacional (+57XXXXXXXXXX).
   */
  static normalizarTelefono(telefono) {
    if (!telefono) return null;
    const limpio = String(telefono).replace(/\D/g, '');
    if (limpio.startsWith('57') && limpio.length === 12) return `+${limpio}`;
    if (limpio.length === 10 && limpio.startsWith('3')) return `+57${limpio}`;
    if (limpio.length === 10) return `+57${limpio}`;
    return `+${limpio}`;
  }

  /**
   * Envía un SMS a uno o varios destinatarios.
   * @param {string|string[]} telefonos
   * @param {string} mensaje
   */
  static async enviar(telefonos, mensaje) {
    const creds = await SMSService._obtenerCredenciales();
    if (!creds) {
      throw new Error('LabsMobile no configurado. Configure LABSMOBILE_USER y LABSMOBILE_TOKEN en .env o en la configuración del sistema.');
    }

    const numeros = (Array.isArray(telefonos) ? telefonos : [telefonos])
      .map(SMSService.normalizarTelefono)
      .filter(Boolean);

    if (numeros.length === 0) throw new Error('No hay números de teléfono válidos');
    if (!mensaje || !mensaje.trim()) throw new Error('El mensaje no puede estar vacío');

    const payload = JSON.stringify({
      message: mensaje.slice(0, 160),
      recipient: numeros.map(n => ({ msisdn: n.replace(/^\+/, '') })),
      ...(creds.sender && { tpoa: creds.sender })
    });

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${creds.user}:${creds.token}`).toString('base64');

      const url = new URL(LABSMOBILE_API);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        port: 443,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            // LabsMobile devuelve code "0" en éxito
            resolve({ success: json.code === '0', resultado: json });
          } catch {
            resolve({ success: false, resultado: { raw: data } });
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  // ============================================================
  // Plantillas de mensajes predefinidos
  // ============================================================

  static async notificarVencimientoFactura(cliente) {
    const empresaTel = process.env.EMPRESA_TELEFONO || '';
    const msg = `PSI Telecomunicaciones: Estimado ${cliente.nombre}, su factura por $${Number(cliente.total || 0).toLocaleString('es-CO')} vence el ${cliente.fecha_vencimiento}. Evite cortes de servicio.${empresaTel ? ' Info: ' + empresaTel : ''}`.slice(0, 160);
    return SMSService.enviar(cliente.telefono, msg);
  }

  static async notificarCorteServicio(cliente) {
    const empresaTel = process.env.EMPRESA_TELEFONO || 'nuestra línea';
    const msg = `PSI Telecomunicaciones: Estimado ${cliente.nombre}, su servicio sera suspendido por mora. Para reconexion comuniquese al ${empresaTel}`.slice(0, 160);
    return SMSService.enviar(cliente.telefono, msg);
  }

  static async notificarInstalacionProgramada(cliente, fechaHora, tecnicoNombre) {
    const empresaTel = process.env.EMPRESA_TELEFONO || '';
    const msg = `PSI Telecomunicaciones: Su instalacion esta programada para el ${fechaHora}. Tecnico: ${tecnicoNombre || 'asignado'}.${empresaTel ? ' Informes: ' + empresaTel : ''}`.slice(0, 160);
    return SMSService.enviar(cliente.telefono, msg);
  }

  static async notificarTecnicoNuevaTarea(tecnico, descripcion) {
    const msg = `PSI - Nueva tarea asignada: ${descripcion}. Revisa tu app para detalles.`.slice(0, 160);
    return SMSService.enviar(tecnico.telefono, msg);
  }

  static async notificarPQRAsignada(tecnico, pqrId, descripcionCorta) {
    const msg = `PSI - PQR #${pqrId} asignada a ti: ${descripcionCorta}. Atiende a la brevedad.`.slice(0, 160);
    return SMSService.enviar(tecnico.telefono, msg);
  }
}

module.exports = SMSService;
