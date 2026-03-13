// backend/services/EnvioMasivoEmailService.js
// Servicio para envío masivo de facturas por email con seguimiento en tiempo real

const pool = require('../config/database');
const EmailService = require('./EmailService');

class EnvioMasivoEmailService {

  /**
   * Crear tablas si no existen (auto-migration)
   */
  static async inicializarTablas() {
    const conexion = await pool.getConnection();
    try {
      await conexion.execute(`
        CREATE TABLE IF NOT EXISTS envios_masivos_email (
          id INT PRIMARY KEY AUTO_INCREMENT,
          tipo VARCHAR(50) NOT NULL DEFAULT 'facturas_mensuales',
          periodo VARCHAR(10) NULL,
          total_facturas INT NOT NULL DEFAULT 0,
          enviados INT NOT NULL DEFAULT 0,
          fallidos INT NOT NULL DEFAULT 0,
          sin_email INT NOT NULL DEFAULT 0,
          estado ENUM('pendiente','en_proceso','completado','error') NOT NULL DEFAULT 'pendiente',
          iniciado_por INT NULL,
          iniciado_automaticamente TINYINT(1) DEFAULT 0,
          fecha_inicio DATETIME NULL,
          fecha_fin DATETIME NULL,
          duracion_segundos INT NULL,
          detalle_errores JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conexion.execute(`
        CREATE TABLE IF NOT EXISTS envios_masivos_email_detalle (
          id INT PRIMARY KEY AUTO_INCREMENT,
          lote_id INT NOT NULL,
          cliente_id INT NOT NULL,
          factura_id INT NOT NULL,
          email_destino VARCHAR(255) NULL,
          estado ENUM('pendiente','enviado','fallido','sin_email') NOT NULL DEFAULT 'pendiente',
          mensaje_error TEXT NULL,
          intentos INT NOT NULL DEFAULT 0,
          fecha_envio DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_lote_id (lote_id),
          INDEX idx_estado (estado),
          FOREIGN KEY (lote_id) REFERENCES envios_masivos_email(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } finally {
      conexion.release();
    }
  }

  /**
   * Iniciar envío masivo de facturas del período actual
   * @param {string} periodo - 'YYYY-MM' (si no se especifica, usa el mes siguiente)
   * @param {number|null} usuarioId - ID del usuario que inicia el envío (null = automático)
   * @returns {object} { lote_id, total_facturas }
   */
  static async iniciarEnvioMasivo(periodo = null, usuarioId = null) {
    await this.inicializarTablas();

    const fechaHoy = new Date();
    // Por defecto: facturas del mes siguiente (generadas el día 20)
    if (!periodo) {
      const mesSiguiente = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 1);
      periodo = `${mesSiguiente.getFullYear()}-${String(mesSiguiente.getMonth() + 1).padStart(2, '0')}`;
    }

    const conexion = await pool.getConnection();
    try {
      // 1. Verificar que no haya un envío en proceso para el mismo período
      const [enProceso] = await conexion.execute(
        `SELECT id FROM envios_masivos_email WHERE periodo = ? AND estado = 'en_proceso' LIMIT 1`,
        [periodo]
      );
      if (enProceso.length > 0) {
        throw new Error(`Ya hay un envío en proceso para el período ${periodo} (lote #${enProceso[0].id})`);
      }

      // 2. Obtener facturas del período que tengan email del cliente
      const [facturas] = await conexion.execute(`
        SELECT
          f.id as factura_id,
          f.numero_factura,
          f.total,
          f.fecha_vencimiento,
          f.estado as factura_estado,
          c.id as cliente_id,
          c.nombre as cliente_nombre,
          c.correo as cliente_email
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.fecha_desde >= ? AND f.fecha_hasta <= ?
          AND f.estado IN ('pendiente', 'vencida')
          AND f.activo = '1'
        ORDER BY c.nombre ASC
      `, [`${periodo}-01`, `${periodo}-31`]);

      if (facturas.length === 0) {
        throw new Error(`No hay facturas pendientes en el período ${periodo}`);
      }

      // 3. Crear el lote de envío
      const [result] = await conexion.execute(`
        INSERT INTO envios_masivos_email
          (tipo, periodo, total_facturas, estado, iniciado_por, iniciado_automaticamente, fecha_inicio)
        VALUES ('facturas_mensuales', ?, ?, 'pendiente', ?, ?, NOW())
      `, [periodo, facturas.length, usuarioId, usuarioId ? 0 : 1]);

      const loteId = result.insertId;

      // 4. Crear registros detalle para cada factura
      for (const factura of facturas) {
        const tieneEmail = !!(factura.cliente_email && factura.cliente_email.trim());
        await conexion.execute(`
          INSERT INTO envios_masivos_email_detalle
            (lote_id, cliente_id, factura_id, email_destino, estado)
          VALUES (?, ?, ?, ?, ?)
        `, [loteId, factura.cliente_id, factura.factura_id,
            tieneEmail ? factura.cliente_email : null,
            tieneEmail ? 'pendiente' : 'sin_email']);
      }

      console.log(`📧 Lote de envío #${loteId} creado: ${facturas.length} facturas para período ${periodo}`);
      return { lote_id: loteId, periodo, total_facturas: facturas.length };
    } finally {
      conexion.release();
    }
  }

  /**
   * Procesar el lote de envío (envía los emails en background)
   * @param {number} loteId
   */
  static async procesarLote(loteId) {
    await this.inicializarTablas();
    const conexion = await pool.getConnection();

    try {
      // Marcar como en proceso
      await conexion.execute(
        `UPDATE envios_masivos_email SET estado = 'en_proceso', fecha_inicio = NOW() WHERE id = ?`,
        [loteId]
      );

      // Obtener todos los pendientes del lote
      const [pendientes] = await conexion.execute(`
        SELECT d.*, f.numero_factura, f.total, f.fecha_vencimiento,
               c.nombre as cliente_nombre
        FROM envios_masivos_email_detalle d
        JOIN facturas f ON d.factura_id = f.id
        JOIN clientes c ON d.cliente_id = c.id
        WHERE d.lote_id = ? AND d.estado = 'pendiente'
      `, [loteId]);

      let enviados = 0;
      let fallidos = 0;
      const errores = [];

      for (const item of pendientes) {
        try {
          // Incrementar intentos
          await conexion.execute(
            `UPDATE envios_masivos_email_detalle SET intentos = intentos + 1 WHERE id = ?`,
            [item.id]
          );

          // Enviar email
          await EmailService.enviarFactura(item.factura_id, item.email_destino);

          // Marcar como enviado
          await conexion.execute(
            `UPDATE envios_masivos_email_detalle
             SET estado = 'enviado', fecha_envio = NOW()
             WHERE id = ?`,
            [item.id]
          );

          // Actualizar contador del lote
          await conexion.execute(
            `UPDATE envios_masivos_email SET enviados = enviados + 1 WHERE id = ?`,
            [loteId]
          );

          enviados++;
          console.log(`✅ Email enviado: ${item.cliente_nombre} - Factura ${item.numero_factura}`);

          // Pequeña pausa para no saturar el servidor SMTP
          await new Promise(r => setTimeout(r, 300));

        } catch (error) {
          fallidos++;
          const mensajeError = error.message || 'Error desconocido';
          errores.push({ cliente: item.cliente_nombre, factura: item.numero_factura, error: mensajeError });

          await conexion.execute(
            `UPDATE envios_masivos_email_detalle
             SET estado = 'fallido', mensaje_error = ?
             WHERE id = ?`,
            [mensajeError.substring(0, 500), item.id]
          );

          await conexion.execute(
            `UPDATE envios_masivos_email SET fallidos = fallidos + 1 WHERE id = ?`,
            [loteId]
          );

          console.error(`❌ Error enviando a ${item.cliente_nombre}: ${mensajeError}`);
        }
      }

      // Marcar lote como completado
      await conexion.execute(`
        UPDATE envios_masivos_email
        SET estado = 'completado',
            fecha_fin = NOW(),
            duracion_segundos = TIMESTAMPDIFF(SECOND, fecha_inicio, NOW()),
            detalle_errores = ?
        WHERE id = ?
      `, [errores.length > 0 ? JSON.stringify(errores) : null, loteId]);

      console.log(`📊 Lote #${loteId} completado: ${enviados} enviados, ${fallidos} fallidos`);
      return { lote_id: loteId, enviados, fallidos };

    } catch (error) {
      await conexion.execute(
        `UPDATE envios_masivos_email SET estado = 'error' WHERE id = ?`,
        [loteId]
      );
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Iniciar y procesar lote en background (no bloquea la respuesta HTTP)
   */
  static iniciarYProcesarEnBackground(loteId) {
    setImmediate(async () => {
      try {
        await this.procesarLote(loteId);
      } catch (error) {
        console.error(`❌ Error procesando lote #${loteId}:`, error.message);
      }
    });
  }

  /**
   * Obtener estado de un lote
   */
  static async obtenerEstadoLote(loteId) {
    await this.inicializarTablas();
    const conexion = await pool.getConnection();
    try {
      const [lotes] = await conexion.execute(
        `SELECT * FROM envios_masivos_email WHERE id = ?`,
        [loteId]
      );
      if (lotes.length === 0) throw new Error('Lote no encontrado');

      const lote = lotes[0];

      // Conteos por estado del detalle
      const [conteos] = await conexion.execute(`
        SELECT estado, COUNT(*) as cantidad
        FROM envios_masivos_email_detalle
        WHERE lote_id = ?
        GROUP BY estado
      `, [loteId]);

      const porEstado = {};
      conteos.forEach(c => { porEstado[c.estado] = c.cantidad; });

      return { ...lote, por_estado: porEstado };
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener detalle de errores de un lote
   */
  static async obtenerDetalleErrores(loteId) {
    await this.inicializarTablas();
    const conexion = await pool.getConnection();
    try {
      const [detalles] = await conexion.execute(`
        SELECT d.*, c.nombre as cliente_nombre, f.numero_factura
        FROM envios_masivos_email_detalle d
        JOIN clientes c ON d.cliente_id = c.id
        JOIN facturas f ON d.factura_id = f.id
        WHERE d.lote_id = ? AND d.estado IN ('fallido', 'sin_email')
        ORDER BY d.estado, c.nombre
      `, [loteId]);
      return detalles;
    } finally {
      conexion.release();
    }
  }

  /**
   * Listar todos los lotes de envío
   */
  static async listarLotes(limite = 20) {
    await this.inicializarTablas();
    const conexion = await pool.getConnection();
    try {
      const [lotes] = await conexion.execute(`
        SELECT e.*,
               u.nombre as usuario_nombre
        FROM envios_masivos_email e
        LEFT JOIN sistema_usuarios u ON e.iniciado_por = u.id
        ORDER BY e.created_at DESC
        LIMIT ?
      `, [limite]);
      return lotes;
    } finally {
      conexion.release();
    }
  }

  /**
   * Reintentar emails fallidos de un lote
   */
  static async reintentarFallidos(loteId) {
    await this.inicializarTablas();
    const conexion = await pool.getConnection();
    try {
      // Resetear fallidos a pendiente
      const [result] = await conexion.execute(`
        UPDATE envios_masivos_email_detalle
        SET estado = 'pendiente', mensaje_error = NULL
        WHERE lote_id = ? AND estado = 'fallido'
      `, [loteId]);

      if (result.affectedRows === 0) {
        throw new Error('No hay emails fallidos para reintentar en este lote');
      }

      // Recalcular contadores del lote
      await conexion.execute(`
        UPDATE envios_masivos_email
        SET estado = 'pendiente',
            fallidos = 0
        WHERE id = ?
      `, [loteId]);

      return { reintentados: result.affectedRows };
    } finally {
      conexion.release();
    }
  }
}

module.exports = EnvioMasivoEmailService;
