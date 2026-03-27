// backend/services/EstadoClienteService.js
// Gestiona las transiciones automáticas de estado de clientes según mora

const { Database } = require('../models/Database');

/**
 * REGLAS DE NEGOCIO — ESTADOS DE CLIENTE
 * ─────────────────────────────────────────────────────────────────────────────
 * activo     → cliente al día o con mora < 30 días. Facturación normal.
 * suspendido → mora 30–60 días. Servicio puede limitarse. Sigue facturándose
 *              pero con recargo de intereses.
 * cortado    → mora > 60 días. Servicio cortado físicamente. No se genera
 *              nueva factura hasta que pague. Al pagar: cobra reconexión.
 * retirado   → cliente solicitó retiro. Contrato terminado. No facturar.
 * inactivo   → sin servicio activo (pendiente instalación o migrado sin datos).
 *              No facturar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DIAS_PARA_SUSPENDER = 30;   // mora en días → pasar a suspendido
const DIAS_PARA_CORTAR    = 60;   // mora en días → pasar a cortado

class EstadoClienteService {

  /**
   * Ejecuta la transición automática de estados para TODOS los clientes activos/suspendidos.
   * Se llama desde un endpoint de administración o cron.
   * @returns {{ suspendidos: number, cortados: number, reactivados: number }}
   */
  static async ejecutarTransiciones() {
    const conexion = await Database.getConnection();
    let suspendidos = 0, cortados = 0, reactivados = 0;

    try {
      await conexion.beginTransaction();

      // ── 1. Detectar clientes a SUSPENDER (activos con mora 30-60 días) ──────
      const [paraSuspender] = await conexion.execute(`
        SELECT DISTINCT c.id, c.nombre, c.identificacion,
               MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) AS dias_mora_max
        FROM clientes c
        JOIN facturas f ON c.id = f.cliente_id
          AND f.estado IN ('pendiente','vencida')
          AND f.activo = 1
        WHERE c.estado = 'activo'
        GROUP BY c.id, c.nombre, c.identificacion
        HAVING dias_mora_max >= ? AND dias_mora_max < ?
      `, [DIAS_PARA_SUSPENDER, DIAS_PARA_CORTAR]);

      for (const c of paraSuspender) {
        await conexion.execute(
          `UPDATE clientes SET estado = 'suspendido', updated_at = NOW() WHERE id = ?`,
          [c.id]
        );
        await conexion.execute(
          `UPDATE servicios_cliente SET estado = 'suspendido', updated_at = NOW()
           WHERE cliente_id = ? AND estado = 'activo'`,
          [c.id]
        );
        suspendidos++;
      }

      // ── 2. Detectar clientes a CORTAR (activos/suspendidos con mora > 60 días) ──
      const [paraCortar] = await conexion.execute(`
        SELECT DISTINCT c.id, c.nombre, c.identificacion,
               MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) AS dias_mora_max
        FROM clientes c
        JOIN facturas f ON c.id = f.cliente_id
          AND f.estado IN ('pendiente','vencida')
          AND f.activo = 1
        WHERE c.estado IN ('activo','suspendido')
        GROUP BY c.id, c.nombre, c.identificacion
        HAVING dias_mora_max >= ?
      `, [DIAS_PARA_CORTAR]);

      for (const c of paraCortar) {
        await conexion.execute(
          `UPDATE clientes SET estado = 'cortado', updated_at = NOW() WHERE id = ?`,
          [c.id]
        );
        await conexion.execute(
          `UPDATE servicios_cliente SET estado = 'cortado', updated_at = NOW()
           WHERE cliente_id = ? AND estado IN ('activo','suspendido')`,
          [c.id]
        );
        cortados++;
      }

      // ── 3. REACTIVAR clientes suspendidos/cortados que ya pagaron todo ───────
      const [paraReactivar] = await conexion.execute(`
        SELECT c.id
        FROM clientes c
        WHERE c.estado IN ('suspendido','cortado')
          AND NOT EXISTS (
            SELECT 1 FROM facturas f
            WHERE f.cliente_id = c.id
              AND f.estado IN ('pendiente','vencida')
              AND f.activo = 1
          )
      `);

      for (const c of paraReactivar) {
        await conexion.execute(
          `UPDATE clientes SET estado = 'activo', updated_at = NOW() WHERE id = ?`,
          [c.id]
        );
        await conexion.execute(
          `UPDATE servicios_cliente SET estado = 'activo', updated_at = NOW()
           WHERE cliente_id = ? AND estado IN ('suspendido','cortado')`,
          [c.id]
        );
        reactivados++;
      }

      await conexion.commit();
      console.log(`✅ Transiciones estado: ${suspendidos} suspendidos, ${cortados} cortados, ${reactivados} reactivados`);
      return { suspendidos, cortados, reactivados };

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error en transiciones de estado:', error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Devuelve un resumen del estado actual de la cartera de clientes.
   */
  static async resumenEstados() {
    const [rows] = await Database.query(`
      SELECT
        c.estado,
        COUNT(*) AS total,
        SUM(CASE WHEN f.total IS NOT NULL THEN 1 ELSE 0 END) AS con_facturas_pendientes,
        COALESCE(SUM(f.total), 0) AS deuda_total
      FROM clientes c
      LEFT JOIN facturas f ON c.id = f.cliente_id
        AND f.estado IN ('pendiente','vencida')
        AND f.activo = 1
      GROUP BY c.estado
      ORDER BY FIELD(c.estado,'activo','suspendido','cortado','retirado','inactivo')
    `);

    // Categorías de mora
    const [mora] = await Database.query(`
      SELECT
        CASE
          WHEN MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) <= 0   THEN 'Al día'
          WHEN MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) <= 30  THEN '1-30 días'
          WHEN MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) <= 60  THEN '31-60 días'
          WHEN MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) <= 90  THEN '61-90 días'
          ELSE 'Más de 90 días'
        END AS categoria_mora,
        COUNT(DISTINCT c.id) AS clientes,
        SUM(f.total) AS deuda
      FROM clientes c
      JOIN facturas f ON c.id = f.cliente_id
        AND f.estado IN ('pendiente','vencida')
        AND f.activo = 1
      WHERE c.estado = 'activo'
      GROUP BY categoria_mora
    `);

    return { estados: rows, mora };
  }

  /**
   * Verifica si un cliente específico debe ser cortado por mora y aplica la transición.
   */
  static async verificarCliente(clienteId) {
    const [rows] = await Database.query(`
      SELECT
        c.id, c.nombre, c.estado,
        MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) AS dias_mora_max,
        COUNT(DISTINCT CASE WHEN f.estado IN ('pendiente','vencida') THEN f.id END) AS facturas_pendientes,
        COALESCE(SUM(CASE WHEN f.estado IN ('pendiente','vencida') THEN f.total ELSE 0 END), 0) AS deuda_total
      FROM clientes c
      LEFT JOIN facturas f ON c.id = f.cliente_id AND f.activo = 1
      WHERE c.id = ?
      GROUP BY c.id, c.nombre, c.estado
    `, [clienteId]);

    if (!rows[0]) return null;
    const c = rows[0];

    let nuevoEstado = c.estado;
    if (c.facturas_pendientes === 0) {
      // Sin deuda pendiente → reactivar si estaba suspendido/cortado
      if (['suspendido', 'cortado'].includes(c.estado)) {
        nuevoEstado = 'activo';
      }
    } else if (c.dias_mora_max >= DIAS_PARA_CORTAR) {
      nuevoEstado = 'cortado';
    } else if (c.dias_mora_max >= DIAS_PARA_SUSPENDER) {
      nuevoEstado = 'suspendido';
    }

    return {
      ...c,
      nuevo_estado: nuevoEstado,
      debe_cambiar: nuevoEstado !== c.estado,
      dias_mora: c.dias_mora_max || 0,
      dias_para_suspender: DIAS_PARA_SUSPENDER,
      dias_para_cortar: DIAS_PARA_CORTAR,
    };
  }

  /**
   * Procesa la reactivación automática de un cliente después de un pago.
   * - Si estaba CORTADO y ahora no tiene deuda → activo + requiere reconexión
   * - Si estaba SUSPENDIDO y ahora no tiene deuda → activo
   * @param {number} clienteId
   * @param {number} facturaId - ID de la factura que acaba de ser pagada
   * @returns {{ reactivado: boolean, estado_anterior: string, estado_nuevo: string, requiere_reconexion: boolean }}
   */
  static async procesarPostPago(clienteId, facturaId) {
    const conexion = await Database.getConnection();
    try {
      await conexion.beginTransaction();

      // Obtener estado actual del cliente
      const [clientes] = await conexion.execute(
        'SELECT id, nombre, estado, requiere_reconexion FROM clientes WHERE id = ?',
        [clienteId]
      );
      if (!clientes || clientes.length === 0) {
        await conexion.rollback();
        conexion.release();
        return { reactivado: false, estado_anterior: null, estado_nuevo: null, requiere_reconexion: false };
      }
      const cliente = clientes[0];
      const estadoAnterior = cliente.estado;

      // Solo procesar si estaba suspendido o cortado
      if (!['suspendido', 'cortado'].includes(estadoAnterior)) {
        await conexion.rollback();
        conexion.release();
        return { reactivado: false, estado_anterior: estadoAnterior, estado_nuevo: estadoAnterior, requiere_reconexion: false };
      }

      // Verificar si aún tiene facturas pendientes después del pago
      const [pendientes] = await conexion.execute(`
        SELECT COUNT(*) AS total
        FROM facturas
        WHERE cliente_id = ?
          AND estado IN ('pendiente', 'vencida')
          AND activo = 1
          AND id != ?
      `, [clienteId, facturaId]);

      const tienePendientes = pendientes[0].total > 0;

      if (tienePendientes) {
        // Aún tiene deuda, no reactivar
        await conexion.rollback();
        conexion.release();
        return { reactivado: false, estado_anterior: estadoAnterior, estado_nuevo: estadoAnterior, requiere_reconexion: false };
      }

      // Sin deuda → reactivar
      const requiereReconexion = estadoAnterior === 'cortado';

      await conexion.execute(
        `UPDATE clientes SET
           estado = 'activo',
           requiere_reconexion = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [requiereReconexion ? 1 : 0, clienteId]
      );

      await conexion.execute(
        `UPDATE servicios_cliente SET estado = 'activo', updated_at = NOW()
         WHERE cliente_id = ? AND estado IN ('suspendido', 'cortado')`,
        [clienteId]
      );

      await conexion.commit();
      conexion.release();

      console.log(`✅ Cliente ${cliente.nombre} (ID:${clienteId}) reactivado: ${estadoAnterior} → activo${requiereReconexion ? ' (requiere reconexión)' : ''}`);

      return {
        reactivado: true,
        estado_anterior: estadoAnterior,
        estado_nuevo: 'activo',
        requiere_reconexion: requiereReconexion,
        mensaje: requiereReconexion
          ? 'Cliente reactivado. Se debe cobrar cargo de reconexión.'
          : 'Cliente reactivado sin cargo de reconexión.'
      };

    } catch (error) {
      await conexion.rollback();
      conexion.release();
      console.error('❌ Error en procesarPostPago:', error);
      throw error;
    }
  }

  /**
   * Obtener descripción legible de un estado
   */
  static describirEstado(estado) {
    const descripciones = {
      activo:     { label: 'Activo',     color: 'green',  facturacion: 'Se factura normalmente', condicion: 'Al día o mora < 30 días' },
      suspendido: { label: 'Suspendido', color: 'yellow', facturacion: 'Se factura (con intereses), acceso limitado', condicion: 'Mora 30-60 días' },
      cortado:    { label: 'Cortado',    color: 'red',    facturacion: 'No se genera nueva factura; se cobra reconexión al pagar', condicion: 'Mora > 60 días' },
      retirado:   { label: 'Retirado',   color: 'gray',   facturacion: 'No se factura, contrato terminado', condicion: 'Solicitud del cliente' },
      inactivo:   { label: 'Inactivo',   color: 'blue',   facturacion: 'No se factura', condicion: 'Sin servicios activos / pendiente de activación' },
    };
    return descripciones[estado] || { label: estado, color: 'gray', facturacion: 'Desconocido', condicion: 'Desconocido' };
  }
}

module.exports = EstadoClienteService;
