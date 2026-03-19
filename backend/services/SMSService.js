// backend/services/SMSService.js
// Integración con LabsMobile para envío de SMS a clientes y técnicos
// Documentación API: https://www.labsmobile.com/api/rest/
//
// Variables de entorno requeridas:
//   LABSMOBILE_USER   — usuario/email LabsMobile
//   LABSMOBILE_TOKEN  — API token LabsMobile
//   LABSMOBILE_SENDER — número remitente (opcional, usa el del plan por defecto)

const https = require('https');

const LABSMOBILE_API = 'https://api.labsmobile.com/json/send';

class SMSService {
  /**
   * Verifica que las credenciales de LabsMobile estén configuradas.
   * Lanza error si no lo están.
   */
  static _verificarCredenciales() {
    if (!process.env.LABSMOBILE_USER || !process.env.LABSMOBILE_TOKEN) {
      throw new Error('Variables de entorno LABSMOBILE_USER y LABSMOBILE_TOKEN son requeridas');
    }
  }

  /**
   * Normaliza un número de teléfono colombiano al formato internacional (+57XXXXXXXXXX).
   * Si ya tiene prefijo internacional lo respeta.
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
   * @param {string|string[]} telefonos — teléfono(s) destino
   * @param {string} mensaje — texto del SMS (máx 160 chars para SMS simple)
   * @returns {Promise<{success: boolean, resultado: object}>}
   */
  static async enviar(telefonos, mensaje) {
    SMSService._verificarCredenciales();

    const numeros = (Array.isArray(telefonos) ? telefonos : [telefonos])
      .map(SMSService.normalizarTelefono)
      .filter(Boolean);

    if (numeros.length === 0) throw new Error('No hay números de teléfono válidos');
    if (!mensaje || !mensaje.trim()) throw new Error('El mensaje no puede estar vacío');

    const payload = JSON.stringify({
      message: mensaje.slice(0, 160),
      recipients: numeros.map(n => ({ msisdn: n })),
      ...(process.env.LABSMOBILE_SENDER && { sender: process.env.LABSMOBILE_SENDER })
    });

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(
        `${process.env.LABSMOBILE_USER}:${process.env.LABSMOBILE_TOKEN}`
      ).toString('base64');

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const url = new URL(LABSMOBILE_API);
      options.hostname = url.hostname;
      options.path = url.pathname;
      options.port = 443;

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
    const msg = `PSI Telecomunicaciones: Estimado ${cliente.nombre}, su factura por $${Number(cliente.total || 0).toLocaleString('es-CO')} vence el ${cliente.fecha_vencimiento}. Evite cortes de servicio. Info: ${process.env.EMPRESA_TELEFONO || ''}`.slice(0, 160);
    return SMSService.enviar(cliente.telefono, msg);
  }

  static async notificarCorteServicio(cliente) {
    const msg = `PSI Telecomunicaciones: Estimado ${cliente.nombre}, su servicio sera suspendido por mora. Para reconexion comuniquese al ${process.env.EMPRESA_TELEFONO || 'nuestra linea'}`.slice(0, 160);
    return SMSService.enviar(cliente.telefono, msg);
  }

  static async notificarInstalacionProgramada(cliente, fechaHora, tecnicoNombre) {
    const msg = `PSI Telecomunicaciones: Su instalacion esta programada para el ${fechaHora}. Tecnico: ${tecnicoNombre || 'asignado'}. Informes: ${process.env.EMPRESA_TELEFONO || ''}`.slice(0, 160);
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
