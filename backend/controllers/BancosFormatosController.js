// backend/controllers/BancosFormatosController.js
// Generador de archivos de recaudo para envío a bancos/redes de pago

const { Database } = require('../models/Database');
const XLSX = require('../node_modules/xlsx');

class BancosFormatosController {

  // ============================================================
  // Utilidades comunes
  // ============================================================

  static formatFecha(date) {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  static formatFechaExcel(date) {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return parseInt(`${yyyy}${mm}${dd}`);
  }

  static pad(val, length, char = '0', side = 'left') {
    const str = String(val || '');
    return side === 'left' ? str.padStart(length, char) : str.padEnd(length, char);
  }

  static fixed(str, length, padChar = ' ') {
    const s = String(str || '');
    return s.length >= length ? s.substring(0, length) : s.padEnd(length, padChar);
  }

  /**
   * Obtener configuración de la empresa
   */
  static async getEmpresaConfig() {
    const rows = await Database.query(
      'SELECT * FROM configuracion_empresa LIMIT 1'
    );
    return rows[0] || {};
  }

  /**
   * Obtener última factura pendiente por cliente
   * Agrupa por cliente y usa la factura más reciente de cada uno
   * @param {string} sede - 'campoalegre' | 'otros' | 'todas'
   */
  static async getUltimasFacturasPendientes(sede = 'todas') {
    let filtroSede = '';
    if (sede === 'campoalegre') {
      filtroSede = `AND c.ciudad_id IN (SELECT id FROM ciudades WHERE LOWER(nombre) LIKE '%campoalegre%')`;
    } else if (sede === 'otros') {
      filtroSede = `AND (c.ciudad_id NOT IN (SELECT id FROM ciudades WHERE LOWER(nombre) LIKE '%campoalegre%') OR c.ciudad_id IS NULL)`;
    }

    const rows = await Database.query(`
      SELECT
        f.id,
        f.numero_factura,
        f.cliente_id,
        f.identificacion_cliente,
        f.nombre_cliente,
        f.total,
        f.fecha_vencimiento,
        f.fecha_emision,
        f.periodo_facturacion,
        c.codigo_usuario,
        c.ciudad_id,
        ci.nombre AS ciudad_nombre
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      WHERE f.estado IN ('pendiente', 'vencida')
        AND f.activo = 1
        ${filtroSede}
      ORDER BY f.cliente_id, f.fecha_emision DESC
    `);

    // Tomar última factura por cliente
    const byClient = new Map();
    for (const row of rows) {
      if (!byClient.has(row.cliente_id)) {
        byClient.set(row.cliente_id, row);
      }
    }
    return Array.from(byClient.values());
  }

  /**
   * Obtener todas las facturas pendientes agrupadas por cliente (suma totales)
   * Usado por Finecoop/Comultrasan que consolidan servicios de un cliente
   */
  static async getFacturasPendientesAgrupadas() {
    const rows = await Database.query(`
      SELECT
        f.cliente_id,
        f.identificacion_cliente,
        f.nombre_cliente,
        SUM(f.total) AS total,
        MAX(f.fecha_vencimiento) AS fecha_vencimiento,
        MAX(f.fecha_emision) AS fecha_emision,
        c.codigo_usuario,
        c.ciudad_id,
        ci.nombre AS ciudad_nombre
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
      WHERE f.estado IN ('pendiente', 'vencida')
        AND f.activo = 1
      GROUP BY f.cliente_id, f.identificacion_cliente, f.nombre_cliente,
               c.codigo_usuario, c.ciudad_id, ci.nombre
      ORDER BY f.identificacion_cliente
    `);
    return rows;
  }

  // ============================================================
  // CAJA SOCIAL — CSV (con encabezados) y TXT (sin encabezados)
  // ============================================================

  /**
   * GET /api/v1/facturacion/formatos/cajasocial?tipo=csv|txt
   * Genera el archivo de recaudo para Caja Social Corresponsales
   * CSV: incluye registro de cabecera (tipo 01)
   * TXT: solo registros de detalle (tipo 02), sin cabecera
   */
  static async generarFormatoCajaSocial(req, res) {
    try {
      const tipo = (req.query.tipo || 'csv').toLowerCase();
      const sede = req.query.sede || 'todas';
      const empresa = await BancosFormatosController.getEmpresaConfig();
      const facturas = await BancosFormatosController.getUltimasFacturasPendientes(sede);

      const nit = (empresa.empresa_nit || '').replace(/[^0-9]/g, '');
      const codigoGs1 = empresa.codigo_gs1 || '';
      const fechaHoy = BancosFormatosController.formatFecha(new Date());

      const registrosDetalle = facturas.map(f => {
        const referencia = f.identificacion_cliente || '';
        const fechaVenc = BancosFormatosController.formatFecha(f.fecha_vencimiento);
        const monto = parseFloat(f.total || 0).toFixed(2);
        return `02,${referencia},,${fechaVenc},,${monto},`;
      });

      let contenido;
      let mimeType;
      let fileName;

      if (tipo === 'txt') {
        // Solo registros de detalle, sin encabezado
        contenido = registrosDetalle.join('\r\n') + '\r\n';
        mimeType = 'text/plain';
        fileName = `cajasocial_${fechaHoy}.txt`;
      } else {
        // CSV con encabezado
        const registroCabecera = `01,${nit},0,${codigoGs1},${fechaHoy},${registrosDetalle.length}`;
        contenido = [registroCabecera, ...registrosDetalle].join('\r\n') + '\r\n';
        mimeType = 'text/csv';
        fileName = `cajasocial_${fechaHoy}.csv`;
      }

      res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(contenido);

    } catch (error) {
      console.error('❌ Error generando formato Caja Social:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================================
  // ASOBANCARIA — Formato fijo 220/221 chars (Efecty y PSE)
  // ============================================================

  /**
   * Genera un registro de detalle Asobancaria (tipo 06)
   * Basado en el formato estándar de recaudo sectorial colombiano
   * @param {object} factura  - datos de la factura / cliente
   * @param {object} empresa  - configuración empresa
   * @param {number} width    - 220 (PSE) o 221 (Efecty)
   */
  static buildAsobancaria06(factura, empresa, width) {
    const nit = (empresa.empresa_nit || '').replace(/[^0-9]/g, '');
    const ident = String(factura.identificacion_cliente || '');
    // Identificación padded a 12 chars con ceros a la izquierda
    const ident12 = ident.padStart(12, '0').slice(-12);
    // codigo_usuario padded a 8 chars (referencia interna)
    const codigoUsr = String(factura.codigo_usuario || '0').padStart(8, '0').slice(-8);
    // Monto en centavos (sin punto decimal), padded a 13 chars
    const montoCents = Math.round(parseFloat(factura.total || 0) * 100);
    const monto13 = String(montoCents).padStart(13, '0').slice(-13);
    // Fecha de vencimiento YYYYMMDD
    const fechaVenc = BancosFormatosController.formatFecha(factura.fecha_vencimiento);
    // Nombre cliente 20 chars, mayúsculas
    const nombre20 = BancosFormatosController.fixed(
      (factura.nombre_cliente || '').toUpperCase(), 20
    );
    // Identificación sin padding (10 chars máx) para campo secundario
    const ident10 = ident.padStart(10, '0').slice(-10);
    // NIT empresa sin guión, padded a 16
    const nit16 = nit.padStart(16, '0').slice(-16);

    // Construcción del registro según posiciones del formato Asobancaria 30
    // [0:2]   tipo registro
    // [2:38]  36 ceros fijos
    // [38:50] identificación (12 chars)
    // [50:72] 22 ceros fijos
    // [72:80] código usuario / referencia (8 chars)
    // [80:88] "01011230" fijo (tipo operación + datos periodo)
    // [88:101] monto en centavos (13 chars)
    // [101:115] NIT banco colector "07709998284111" (14 chars)
    // [115:128] "00000000000000" ceros fijos (13 chars → total 128)
    // [128:136] fecha vencimiento (8 chars)
    // [136:165] ceros / campos fijos (29 chars)
    // [165:169] "1010" fijo
    // [169:179] identificación (10 chars sin padding izq. largo)
    // [179:199] nombre cliente (20 chars)
    // [199:220] "001000000001" + relleno hasta width
    const record =
      '06' +                              // [0:2]
      '0'.repeat(36) +                    // [2:38]
      ident12 +                           // [38:50]
      '0'.repeat(22) +                    // [50:72]
      codigoUsr +                         // [72:80]
      '01011230' +                        // [80:88] fijo
      monto13 +                           // [88:101]
      '07709998284111' +                  // [101:115] NIT colector fijo
      '0'.repeat(13) +                    // [115:128]
      fechaVenc +                         // [128:136]
      '0'.repeat(8) +                     // [136:144]
      '00010000000000000000' +            // [144:164] fijos según plantilla
      '1010000001' +                      // [164:174] fijo según plantilla
      ident10 +                           // [174:184] ident sin pad
      nombre20 +                          // [184:204] nombre 20
      '001000000001';                     // [204:216] fijo

    return record.padEnd(width).substring(0, width);
  }

  /**
   * Registro cabecera tipo 01 — identificación empresa y archivo
   */
  static buildAsobancaria01(empresa, convenio, fecha, width) {
    const nit = (empresa.empresa_nit || '').replace(/[^0-9]/g, '');
    const nit16 = nit.padStart(16, '0').slice(-16);
    const conv3 = String(convenio || '123').padStart(3, '0').slice(-3);
    const record = '01' + nit16 + '0'.repeat(16) + conv3 + fecha + '0101A';
    return record.padEnd(width).substring(0, width);
  }

  /**
   * Registro cabecera tipo 05 — identificación entidad recaudadora
   */
  static buildAsobancaria05(empresa, width) {
    // NIT banco colector fijo (Finecoop/Comultrasan/banco del convenio)
    // Se usa el NIT del recaudador configurado en la plantilla
    const nombre = BancosFormatosController.fixed(
      (empresa.empresa_nombre || 'comunicaciones').toLowerCase(), 30
    );
    const record = '05' + '77099982841' + '110' + '0' + '30' + nombre;
    return record.padEnd(width).substring(0, width);
  }

  /**
   * Registro totalizador tipo 08
   */
  static buildAsobancaria08(numReg, totalCents, nit, fecha, width) {
    const nit16 = String(nit || '').padStart(16, '0').slice(-16);
    const count7 = String(numReg).padStart(7, '0').slice(-7);
    const total15 = String(totalCents).padStart(15, '0').slice(-15);
    const record = '08' + count7 + nit16 + total15 + '0'.repeat(3) + '0'.repeat(5) + fecha;
    return record.padEnd(width).substring(0, width);
  }

  /**
   * Registro totalizador tipo 09
   */
  static buildAsobancaria09(numReg, totalCents, nit, width) {
    const nit16 = String(nit || '').padStart(16, '0').slice(-16);
    const count7 = String(numReg).padStart(7, '0').slice(-7);
    const total15 = String(totalCents).padStart(15, '0').slice(-15);
    const record = '09' + count7 + nit16 + total15 + '0'.repeat(10);
    return record.padEnd(width).substring(0, width);
  }

  /**
   * GET /api/v1/facturacion/formatos/efecty
   * Formato Asobancaria 221 caracteres para Efecty (Convenio 113760)
   */
  static async generarFormatoEfecty(req, res) {
    try {
      const WIDTH = 221;
      const CONVENIO = '123'; // Efecty convenio — ajustar según contrato
      const sede = req.query.sede || 'todas';
      const empresa = await BancosFormatosController.getEmpresaConfig();
      const facturas = await BancosFormatosController.getUltimasFacturasPendientes(sede);
      const fecha = BancosFormatosController.formatFecha(new Date());
      const nit = (empresa.empresa_nit || '').replace(/[^0-9]/g, '');

      const lineas = [];
      lineas.push(BancosFormatosController.buildAsobancaria01(empresa, CONVENIO, fecha, WIDTH));
      lineas.push(BancosFormatosController.buildAsobancaria05(empresa, WIDTH));

      let totalCents = 0;
      for (const f of facturas) {
        lineas.push(BancosFormatosController.buildAsobancaria06(f, empresa, WIDTH));
        totalCents += Math.round(parseFloat(f.total || 0) * 100);
      }

      lineas.push(BancosFormatosController.buildAsobancaria08(facturas.length, totalCents, nit, fecha, WIDTH));
      lineas.push(BancosFormatosController.buildAsobancaria09(facturas.length, totalCents, nit, WIDTH));

      const contenido = lineas.join('\r\n') + '\r\n';
      const fileName = `efecty_${fecha}.txt`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(contenido);

    } catch (error) {
      console.error('❌ Error generando formato Efecty:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/facturacion/formatos/pse
   * Formato Asobancaria 220 caracteres para PSE (pago en línea)
   */
  static async generarFormatoPSE(req, res) {
    try {
      const WIDTH = 220;
      const CONVENIO = '123'; // PSE convenio — ajustar según contrato
      const sede = req.query.sede || 'todas';
      const empresa = await BancosFormatosController.getEmpresaConfig();
      const facturas = await BancosFormatosController.getUltimasFacturasPendientes(sede);
      const fecha = BancosFormatosController.formatFecha(new Date());
      const nit = (empresa.empresa_nit || '').replace(/[^0-9]/g, '');

      const lineas = [];
      lineas.push(BancosFormatosController.buildAsobancaria01(empresa, CONVENIO, fecha, WIDTH));
      lineas.push(BancosFormatosController.buildAsobancaria05(empresa, WIDTH));

      let totalCents = 0;
      for (const f of facturas) {
        lineas.push(BancosFormatosController.buildAsobancaria06(f, empresa, WIDTH));
        totalCents += Math.round(parseFloat(f.total || 0) * 100);
      }

      lineas.push(BancosFormatosController.buildAsobancaria08(facturas.length, totalCents, nit, fecha, WIDTH));
      lineas.push(BancosFormatosController.buildAsobancaria09(facturas.length, totalCents, nit, WIDTH));

      const contenido = lineas.join('\r\n') + '\r\n';
      const fileName = `pse_${fecha}.txt`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(contenido);

    } catch (error) {
      console.error('❌ Error generando formato PSE:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================================
  // FINECOOP — XLSX
  // Columnas: REFERENCIA_DE_PAGO, MUNICIPIO, ID, TOTAL, FECHA_LIMITE, FECHA_HASTA
  // El ID corresponde al campo codigo_usuario del cliente (asignado por Finecoop)
  // Se agrupa por cliente, sumando todos los servicios pendientes
  // ============================================================

  /**
   * GET /api/v1/facturacion/formatos/finecoop
   */
  static async generarFormatoFinecoop(req, res) {
    try {
      const sede = req.query.sede || 'otros';
      const empresa = await BancosFormatosController.getEmpresaConfig();
      // Finecoop consolida TODAS las facturas pendientes por cliente (no solo la última)
      const facturas = await BancosFormatosController.getFacturasPendientesAgrupadas();
      const fecha = BancosFormatosController.formatFecha(new Date());

      // Calcular fechas límite y hasta (último día del mes actual)
      const ahora = new Date();
      const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      const fechaLimite = BancosFormatosController.formatFechaExcel(
        new Date(ahora.getFullYear(), ahora.getMonth(), 16) // día 16 del mes
      );
      const fechaHasta = BancosFormatosController.formatFechaExcel(ultimoDiaMes);

      const wb = XLSX.utils.book_new();

      // Hoja Consolidado
      const wsData = [
        ['REFERENCIA DE PAGO', 'MUNICIPIO', 'ID', 'TOTAL', 'FECHA_LIMITE', 'FECHA_HASTA']
      ];

      for (const f of facturas) {
        // ID = codigo_usuario asignado por Finecoop; si no existe, usar 0
        const idFinecoop = parseInt(f.codigo_usuario) || 0;
        const municipio = f.ciudad_id || 20; // ciudad_id del cliente
        const total = Math.round(parseFloat(f.total || 0));
        wsData.push([
          f.identificacion_cliente,
          municipio,
          idFinecoop,
          total,
          fechaLimite,
          fechaHasta
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const fileName = `finecoop_${fecha}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);

    } catch (error) {
      console.error('❌ Error generando formato Finecoop:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ============================================================
  // COMULTRASAN — XLSX
  // Columnas: REFERENCIA_DE_PAGO, MUNICIPIO, ID, TOTAL, FECHA_HASTA
  // Igual que Finecoop pero sin FECHA_LIMITE
  // ============================================================

  /**
   * GET /api/v1/facturacion/formatos/comultrasan
   */
  static async generarFormatoComultrasan(req, res) {
    try {
      const sede = req.query.sede || 'otros';
      const empresa = await BancosFormatosController.getEmpresaConfig();
      // Comultrasan consolida TODAS las facturas pendientes por cliente (no solo la última)
      const facturas = await BancosFormatosController.getFacturasPendientesAgrupadas();
      const fecha = BancosFormatosController.formatFecha(new Date());

      const ahora = new Date();
      const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      const fechaHasta = BancosFormatosController.formatFechaExcel(ultimoDiaMes);

      const wb = XLSX.utils.book_new();

      const wsData = [
        ['REFERENCIA DE PAGO', 'MUNICIPIO', 'ID', 'TOTAL', 'FECHA_HASTA']
      ];

      for (const f of facturas) {
        const idComultrasan = parseInt(f.codigo_usuario) || 0;
        const municipio = f.ciudad_id || 20;
        const total = Math.round(parseFloat(f.total || 0));
        wsData.push([
          f.identificacion_cliente,
          municipio,
          idComultrasan,
          total,
          fechaHasta
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const fileName = `comultrasan_${fecha}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);

    } catch (error) {
      console.error('❌ Error generando formato Comultrasan:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = BancosFormatosController;
