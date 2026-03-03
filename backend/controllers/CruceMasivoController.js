// backend/controllers/CruceMasivoController.js
// Procesa archivos enviados por bancos/cooperativas y marca facturas como pagadas masivamente

const { Database } = require('../models/Database');
const XLSX = require('../node_modules/xlsx');

class CruceMasivoController {

  // ============================================================
  // Parsers de archivos por banco
  // ============================================================

  /**
   * Parsea CSV/TXT de Caja Social (formato registros 01/02)
   * Línea 01: cabecera; línea 02: detalle de pago
   * Campos: tipo, id_cliente, ref2, fecha_venc, fecha_pago, monto, ...
   */
  static parseCajaSocialCSV(buffer) {
    const texto = buffer.toString('utf-8').replace(/\r/g, '');
    const lineas = texto.split('\n').filter(l => l.trim());
    const pagos = [];

    for (const linea of lineas) {
      if (!linea.startsWith('02')) continue;
      const campos = linea.split(',');
      // 02,ID_CLIENTE,,FECHA_VENC,FECHA_PAGO,MONTO,...
      const identificacion = (campos[1] || '').trim().replace(/^0+/, '') || (campos[1] || '').trim();
      const fechaVencStr = (campos[3] || '').trim();   // YYYYMMDD
      const fechaPagoStr = (campos[4] || '').trim();   // YYYYMMDD (si viene)
      const montoStr = (campos[5] || '0').trim();
      const monto = parseFloat(montoStr.replace(/[^0-9.]/g, '')) || 0;

      if (!identificacion || monto <= 0) continue;

      let fechaPago = CruceMasivoController.parseFechaYYYYMMDD(fechaPagoStr || fechaVencStr);
      pagos.push({ identificacion, monto, fechaPago, fuente: 'cajasocial' });
    }
    return pagos;
  }

  /**
   * Parsea archivo D44 de Caja Social.
   * El D44 es un formato propietario de Caja Social para reporte de recaudo.
   * Estructura de cada línea (según guía Caja Social):
   *   Pos  1-2  : tipo registro (02 = detalle)
   *   Pos  3-14 : número de referencia / identificación (12 chars)
   *   Pos 15-22 : fecha transacción YYYYMMDD (8 chars)
   *   Pos 23-35 : valor pagado en centavos (13 chars)
   *   Pos 36-55 : nombre del pagador (20 chars) - opcional
   * Si el archivo viene como CSV (con comas), delega al parser CSV.
   */
  static parseCajaSocialD44(buffer) {
    const texto = buffer.toString('latin1').replace(/\r/g, '');
    const lineas = texto.split('\n').filter(l => l.trim());

    // Si tiene comas, tratar como CSV
    if (lineas.some(l => l.includes(','))) {
      return CruceMasivoController.parseCajaSocialCSV(buffer);
    }

    const pagos = [];
    for (const linea of lineas) {
      if (linea.length < 23) continue;
      const tipo = linea.substring(0, 2);
      if (tipo !== '02') continue;

      const identRaw = linea.substring(2, 14).trim();
      const identificacion = identRaw.replace(/^0+/, '') || identRaw;
      const fechaStr = linea.substring(14, 22).trim();
      const centavosStr = linea.substring(22, 35).trim();
      const montoCents = parseInt(centavosStr) || 0;
      const monto = montoCents / 100;

      if (!identificacion || monto <= 0) continue;
      const fechaPago = CruceMasivoController.parseFechaYYYYMMDD(fechaStr);
      pagos.push({ identificacion, monto, fechaPago, fuente: 'cajasocial' });
    }
    return pagos;
  }

  /**
   * Parsea TXT Asobancaria de respuesta (pagos realizados).
   * Registro tipo 06 = detalle de pago procesado.
   * Posiciones (base 0, longitud 220-221):
   *   [0:2]    tipo registro
   *   [38:50]  identificación cliente (12 chars, ceros a la izq)
   *   [88:101] monto en centavos (13 chars)
   *   [128:136] fecha vencimiento / pago YYYYMMDD (8 chars)
   *
   * Nota: desde pág. 9 del manual Asobancaria, los registros de respuesta
   * usan la misma estructura de posiciones que los de solicitud.
   */
  static parseAsobancariaTXT(buffer) {
    const texto = buffer.toString('latin1').replace(/\r/g, '');
    const lineas = texto.split('\n').filter(l => l.trim());
    const pagos = [];

    for (const linea of lineas) {
      if (!linea.startsWith('06') || linea.length < 101) continue;

      const identRaw = linea.substring(38, 50);
      const identificacion = identRaw.replace(/^0+/, '') || identRaw;
      const montoCents = parseInt(linea.substring(88, 101)) || 0;
      const monto = montoCents / 100;
      const fechaStr = linea.length >= 136 ? linea.substring(128, 136) : '';
      const fechaPago = CruceMasivoController.parseFechaYYYYMMDD(fechaStr);

      if (!identificacion || monto <= 0) continue;
      pagos.push({ identificacion, monto, fechaPago, fuente: 'asobancaria' });
    }
    return pagos;
  }

  /**
   * Parsea XLSX de Finecoop.
   * El archivo enviado por Finecoop contiene los pagos realizados.
   * Columnas buscadas (sin importar mayúsculas):
   *   - referencia | id | codigo | cedula   → identificación del cliente
   *   - valor | monto | total | pagado      → monto pagado
   *   - fecha                               → fecha del pago
   */
  static parseXLSX(buffer, fuente) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    if (rows.length < 2) return [];

    const headers = (rows[0] || []).map(h => String(h || '').toLowerCase().trim());

    const findCol = (...terms) => headers.findIndex(h => terms.some(t => h.includes(t)));

    const idxId    = findCol('referencia', 'cedula', 'identificacion', 'id', 'codigo');
    const idxMonto = findCol('valor', 'monto', 'total', 'pagado', 'pago');
    const idxFecha = findCol('fecha');

    if (idxId === -1) return [];

    const pagos = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const refRaw = String(row[idxId] || '').trim();
      // Limpiar ceros iniciales para comparar con identificacion_cliente
      const identificacion = refRaw.replace(/^0+/, '') || refRaw;
      const montoRaw = idxMonto >= 0 ? String(row[idxMonto] || '0') : '0';
      const monto = parseFloat(montoRaw.replace(/[^0-9.]/g, '')) || 0;
      const fechaRaw = idxFecha >= 0 ? String(row[idxFecha] || '').trim() : '';
      const fechaPago = CruceMasivoController.parseFechaFlexible(fechaRaw);

      if (!identificacion || monto <= 0) continue;
      // codigo_usuario también puede ser la referencia en Finecoop/Comultrasan
      pagos.push({ identificacion, codigo_usuario: refRaw, monto, fechaPago, fuente });
    }
    return pagos;
  }

  // ============================================================
  // Utilidades de fecha
  // ============================================================

  static parseFechaYYYYMMDD(str) {
    if (!str || str.length !== 8) return null;
    const y = str.substring(0, 4);
    const m = str.substring(4, 6);
    const d = str.substring(6, 8);
    const fecha = new Date(`${y}-${m}-${d}`);
    return isNaN(fecha.getTime()) ? null : `${y}-${m}-${d}`;
  }

  static parseFechaFlexible(str) {
    if (!str) return null;
    // Intentar YYYYMMDD
    if (/^\d{8}$/.test(str)) return CruceMasivoController.parseFechaYYYYMMDD(str);
    // Intentar DD/MM/YYYY o DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
    // Intentar YYYY-MM-DD directo
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return null;
  }

  // ============================================================
  // Lógica de matching y marcado
  // ============================================================

  /**
   * Busca la factura pendiente más reciente que coincida con el pago.
   * Criterios (en orden de preferencia):
   *  1. codigo_usuario exacto (para Finecoop/Comultrasan)
   *  2. identificacion_cliente exacta
   *  3. identificacion_cliente sin ceros iniciales
   */
  static async buscarFactura(pago) {
    const queries = [
      // Por codigo_usuario (Finecoop/Comultrasan)
      ...(pago.codigo_usuario ? [{
        sql: `SELECT f.id, f.numero_factura, f.total, f.nombre_cliente, f.identificacion_cliente
              FROM facturas f
              INNER JOIN clientes c ON f.cliente_id = c.id
              WHERE f.estado IN ('pendiente','vencida') AND f.activo = 1
                AND c.codigo_usuario = ?
              ORDER BY f.fecha_emision DESC LIMIT 1`,
        params: [pago.codigo_usuario]
      }] : []),
      // Por identificacion_cliente exacta
      {
        sql: `SELECT f.id, f.numero_factura, f.total, f.nombre_cliente, f.identificacion_cliente
              FROM facturas f
              WHERE f.estado IN ('pendiente','vencida') AND f.activo = 1
                AND f.identificacion_cliente = ?
              ORDER BY f.fecha_emision DESC LIMIT 1`,
        params: [pago.identificacion]
      },
      // Sin ceros iniciales (por si la BD tiene el número con ceros)
      {
        sql: `SELECT f.id, f.numero_factura, f.total, f.nombre_cliente, f.identificacion_cliente
              FROM facturas f
              WHERE f.estado IN ('pendiente','vencida') AND f.activo = 1
                AND REPLACE(f.identificacion_cliente, '0', '') = REPLACE(?, '0', '')
                AND f.identificacion_cliente = LPAD(?, LENGTH(f.identificacion_cliente), '0')
              ORDER BY f.fecha_emision DESC LIMIT 1`,
        params: [pago.identificacion, pago.identificacion]
      }
    ];

    for (const q of queries) {
      const rows = await Database.query(q.sql, q.params);
      if (rows && rows.length > 0) return rows[0];
    }
    return null;
  }

  /**
   * Marca facturas como pagadas según lista de pagos encontrados
   */
  static async marcarFacturasPagadas(pagos, banco, fechaPagoManual) {
    const marcadas = [];
    const noEncontradas = [];
    const errores = [];

    for (const pago of pagos) {
      try {
        const factura = await CruceMasivoController.buscarFactura(pago);
        if (!factura) {
          noEncontradas.push({ ...pago, razon: 'Factura no encontrada en estado pendiente/vencida' });
          continue;
        }

        // Determinar fecha de pago
        let fechaPago = fechaPagoManual || pago.fechaPago || new Date().toISOString().split('T')[0];

        await Database.query(`
          UPDATE facturas SET
            estado       = 'pagada',
            fecha_pago   = ?,
            valor_pagado = ?,
            metodo_pago  = ?,
            updated_at   = NOW()
          WHERE id = ? AND estado IN ('pendiente','vencida')
        `, [fechaPago, Math.round(pago.monto), banco, factura.id]);

        marcadas.push({
          factura_id:      factura.id,
          numero_factura:  factura.numero_factura,
          nombre_cliente:  factura.nombre_cliente,
          identificacion:  pago.identificacion,
          monto:           Math.round(pago.monto),
          fecha_pago:      fechaPago
        });
      } catch (err) {
        console.error('❌ Error marcando factura:', err.message);
        errores.push({ ...pago, error: err.message });
      }
    }

    return {
      total_procesados:      pagos.length,
      marcadas:              marcadas.length,
      no_encontradas:        noEncontradas.length,
      errores:               errores.length,
      detalle_marcadas:      marcadas,
      detalle_no_encontradas: noEncontradas,
      detalle_errores:       errores
    };
  }

  // ============================================================
  // Endpoints HTTP
  // ============================================================

  /**
   * POST /api/v1/facturacion/cruce-masivo/preview
   * Previsualiza los pagos detectados en el archivo sin marcar nada
   */
  static async previewCruceMasivo(req, res) {
    try {
      const banco = (req.body.banco || '').toLowerCase();
      const archivo = req.file;
      if (!archivo) return res.status(400).json({ success: false, message: 'Archivo requerido' });
      if (!banco)   return res.status(400).json({ success: false, message: 'Tipo de banco requerido' });

      const pagos = CruceMasivoController.parsearArchivo(banco, archivo.buffer);
      const encontradas = [];
      const noEncontradas = [];

      for (const pago of pagos) {
        const factura = await CruceMasivoController.buscarFactura(pago);
        if (factura) {
          encontradas.push({ ...pago, factura });
        } else {
          noEncontradas.push(pago);
        }
      }

      return res.json({
        success: true,
        banco,
        total:            pagos.length,
        encontradas:      encontradas.length,
        no_encontradas:   noEncontradas.length,
        detalle_encontradas:    encontradas,
        detalle_no_encontradas: noEncontradas
      });
    } catch (error) {
      console.error('❌ Error en preview cruce masivo:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/facturacion/cruce-masivo/procesar
   * Procesa el archivo y marca facturas como pagadas
   */
  static async procesarCruceMasivo(req, res) {
    try {
      const banco = (req.body.banco || '').toLowerCase();
      const fechaPagoManual = req.body.fecha_pago || null;
      const archivo = req.file;
      if (!archivo) return res.status(400).json({ success: false, message: 'Archivo requerido' });
      if (!banco)   return res.status(400).json({ success: false, message: 'Tipo de banco requerido' });

      const pagos = CruceMasivoController.parsearArchivo(banco, archivo.buffer);
      if (pagos.length === 0) {
        return res.json({ success: false, message: 'No se encontraron pagos en el archivo' });
      }

      const resultado = await CruceMasivoController.marcarFacturasPagadas(pagos, banco, fechaPagoManual);
      return res.json({ success: true, banco, ...resultado });
    } catch (error) {
      console.error('❌ Error en cruce masivo:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Selecciona el parser adecuado según el banco
   */
  static parsearArchivo(banco, buffer) {
    switch (banco) {
      case 'cajasocial':
      case 'cajasocial_csv':
        return CruceMasivoController.parseCajaSocialCSV(buffer);
      case 'cajasocial_d44':
        return CruceMasivoController.parseCajaSocialD44(buffer);
      case 'finecoop':
        return CruceMasivoController.parseXLSX(buffer, 'finecoop');
      case 'comultrasan':
        return CruceMasivoController.parseXLSX(buffer, 'comultrasan');
      case 'asobancaria':
      case 'efecty':
      case 'pse':
        return CruceMasivoController.parseAsobancariaTXT(buffer);
      default:
        throw new Error(`Banco no reconocido: ${banco}`);
    }
  }
}

module.exports = CruceMasivoController;
