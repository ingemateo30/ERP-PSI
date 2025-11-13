/**
 * Controlador para el sistema de Soporte con Chatbot IA
 */

const db = require('../config/database');
const geminiService = require('../services/geminiService');
const { v4: uuidv4 } = require('uuid');

/**
 * Enviar mensaje al chatbot y obtener respuesta
 */
exports.chatMessage = async (req, res) => {
  try {
    const {
      message,
      sessionId,
      nombre,
      email,
      telefono,
      conversationHistory = [],
    } = req.body;

    // Validar mensaje
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'El mensaje no puede estar vacío',
      });
    }

    // Generar o usar sessionId existente
    const actualSessionId = sessionId || uuidv4();

    // Verificar o crear sesión
    await ensureSession(actualSessionId, nombre, email, telefono, req);

    // Obtener respuesta de la IA
    const aiResponse = await geminiService.generateResponse(
      message,
      conversationHistory
    );

    // Clasificar tipo de consulta
    const tipoConsulta = geminiService.classifyQuery(message);

    // Guardar en historial
    const [result] = await db.query(
      `INSERT INTO soporte_chat_historico
       (session_id, nombre_usuario, email_usuario, telefono_usuario,
        mensaje_usuario, respuesta_ia, tipo_consulta, problema_resuelto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actualSessionId,
        nombre || null,
        email || null,
        telefono || null,
        message,
        aiResponse.response,
        tipoConsulta,
        false, // Se marcará como resuelto después si el usuario confirma
      ]
    );

    // Actualizar contador de mensajes en sesión
    await db.query(
      `UPDATE soporte_chat_sesiones
       SET mensajes_count = mensajes_count + 1
       WHERE session_id = ?`,
      [actualSessionId]
    );

    // Buscar si hay FAQs relacionadas
    const faqs = await searchRelatedFAQs(message);

    res.json({
      success: true,
      data: {
        sessionId: actualSessionId,
        messageId: result.insertId,
        response: aiResponse.response,
        needsTicket: aiResponse.needsTicket,
        tipoConsulta,
        relatedFAQs: faqs,
        source: aiResponse.source,
      },
    });
  } catch (error) {
    console.error('Error en chatMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el mensaje',
      details: error.message,
    });
  }
};

/**
 * Crear ticket (PQR) desde conversación de chat
 */
exports.createTicketFromChat = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      sessionId,
      nombre,
      email,
      telefono,
      clienteId,
      categoria,
      prioridad,
      asuntoAdicional,
    } = req.body;

    // Obtener historial de la conversación
    const [historial] = await connection.query(
      `SELECT mensaje_usuario, respuesta_ia, tipo_consulta
       FROM soporte_chat_historico
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId]
    );

    if (historial.length === 0) {
      throw new Error('No se encontró historial de conversación');
    }

    // Construir descripción del PQR
    const descripcionChat = historial
      .map((msg, idx) => {
        return `**Usuario:** ${msg.mensaje_usuario}\n\n**Asistente:** ${msg.respuesta_ia}\n\n---`;
      })
      .join('\n\n');

    const descripcionCompleta = `**Ticket generado desde chatbot de soporte**\n\n${asuntoAdicional ? `**Información adicional del usuario:**\n${asuntoAdicional}\n\n---\n\n` : ''}**Historial de conversación:**\n\n${descripcionChat}`;

    // Determinar datos del PQR
    const tipoConsulta = historial[0].tipo_consulta;
    const asunto =
      asuntoAdicional || historial[0].mensaje_usuario.substring(0, 100);

    // Mapear tipo de consulta a categoría PQR
    const categoriaMap = {
      tecnica: 'tecnico',
      facturacion: 'facturacion',
      comercial: 'comercial',
      general: 'atencion_cliente',
    };

    const categoriaPQR = categoria || categoriaMap[tipoConsulta] || 'otros';

    // Generar número de radicado
    const numeroRadicado = await generarNumeroRadicado(connection);

    // Crear el PQR
    const [pqrResult] = await connection.query(
      `INSERT INTO pqr
       (numero_radicado, cliente_id, tipo, categoria, medio_recepcion,
        fecha_recepcion, estado, prioridad, asunto, descripcion)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        numeroRadicado,
        clienteId || null,
        'peticion', // Tipo por defecto
        categoriaPQR,
        'chat',
        'abierto',
        prioridad || 'media',
        asunto,
        descripcionCompleta,
      ]
    );

    const pqrId = pqrResult.insertId;

    // Actualizar historial del chat como convertido a PQR
    await connection.query(
      `UPDATE soporte_chat_historico
       SET convertido_pqr = TRUE, pqr_id = ?
       WHERE session_id = ?`,
      [pqrId, sessionId]
    );

    // Actualizar sesión
    await connection.query(
      `UPDATE soporte_chat_sesiones
       SET estado = 'escalada'
       WHERE session_id = ?`,
      [sessionId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Ticket de soporte creado exitosamente',
      data: {
        pqrId,
        numeroRadicado,
        categoria: categoriaPQR,
        prioridad: prioridad || 'media',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en createTicketFromChat:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el ticket',
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Marcar problema como resuelto
 */
exports.markAsResolved = async (req, res) => {
  try {
    const { messageId, sessionId, satisfaccion } = req.body;

    // Actualizar mensaje específico
    if (messageId) {
      await db.query(
        `UPDATE soporte_chat_historico
         SET problema_resuelto = TRUE, satisfaccion = ?
         WHERE id = ?`,
        [satisfaccion || null, messageId]
      );
    }

    // Actualizar sesión
    if (sessionId) {
      await db.query(
        `UPDATE soporte_chat_sesiones
         SET problemas_resueltos = problemas_resueltos + 1,
             satisfaccion_final = ?
         WHERE session_id = ?`,
        [satisfaccion || null, sessionId]
      );
    }

    res.json({
      success: true,
      message: 'Problema marcado como resuelto',
    });
  } catch (error) {
    console.error('Error en markAsResolved:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar como resuelto',
    });
  }
};

/**
 * Obtener FAQs
 */
exports.getFAQs = async (req, res) => {
  try {
    const { categoria, limit = 20 } = req.query;

    let query = `
      SELECT id, pregunta, respuesta, categoria, vistas, util_count
      FROM soporte_faq
      WHERE activo = TRUE
    `;

    const params = [];

    if (categoria && categoria !== 'todas') {
      query += ` AND categoria = ?`;
      params.push(categoria);
    }

    query += ` ORDER BY orden ASC, vistas DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [faqs] = await db.query(query, params);

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    console.error('Error en getFAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener FAQs',
    });
  }
};

/**
 * Incrementar vista de FAQ
 */
exports.incrementFAQView = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE soporte_faq
       SET vistas = vistas + 1
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Vista registrada',
    });
  } catch (error) {
    console.error('Error en incrementFAQView:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar vista',
    });
  }
};

/**
 * Marcar FAQ como útil
 */
exports.markFAQAsUseful = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE soporte_faq
       SET util_count = util_count + 1
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Marcado como útil',
    });
  } catch (error) {
    console.error('Error en markFAQAsUseful:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar FAQ',
    });
  }
};

/**
 * Obtener estadísticas del chatbot
 */
exports.getStatistics = async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    // Estadísticas generales
    const [stats] = await db.query(
      `SELECT
         COUNT(DISTINCT session_id) as total_sesiones,
         COUNT(*) as total_mensajes,
         SUM(CASE WHEN problema_resuelto = TRUE THEN 1 ELSE 0 END) as problemas_resueltos,
         SUM(CASE WHEN convertido_pqr = TRUE THEN 1 ELSE 0 END) as tickets_creados,
         AVG(satisfaccion) as satisfaccion_promedio,
         tipo_consulta,
         COUNT(*) as cantidad
       FROM soporte_chat_historico
       WHERE created_at >= COALESCE(?, DATE_SUB(NOW(), INTERVAL 30 DAY))
         AND created_at <= COALESCE(?, NOW())
       GROUP BY tipo_consulta`,
      [desde || null, hasta || null]
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error en getStatistics:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
    });
  }
};

/**
 * Finalizar sesión de chat
 */
exports.endSession = async (req, res) => {
  try {
    const { sessionId, satisfaccion } = req.body;

    // Calcular duración
    const [session] = await db.query(
      `SELECT created_at FROM soporte_chat_sesiones WHERE session_id = ?`,
      [sessionId]
    );

    if (session.length > 0) {
      const duracionMinutos = Math.floor(
        (Date.now() - new Date(session[0].created_at).getTime()) / 60000
      );

      await db.query(
        `UPDATE soporte_chat_sesiones
         SET estado = 'finalizada',
             satisfaccion_final = ?,
             duracion_minutos = ?,
             finished_at = NOW()
         WHERE session_id = ?`,
        [satisfaccion || null, duracionMinutos, sessionId]
      );
    }

    res.json({
      success: true,
      message: 'Sesión finalizada',
    });
  } catch (error) {
    console.error('Error en endSession:', error);
    res.status(500).json({
      success: false,
      error: 'Error al finalizar sesión',
    });
  }
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Asegurar que existe una sesión
 */
async function ensureSession(sessionId, nombre, email, telefono, req) {
  const [existing] = await db.query(
    `SELECT id FROM soporte_chat_sesiones WHERE session_id = ?`,
    [sessionId]
  );

  if (existing.length === 0) {
    // Crear nueva sesión
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await db.query(
      `INSERT INTO soporte_chat_sesiones
       (session_id, nombre_usuario, email_usuario, telefono_usuario,
        ip_address, user_agent, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, nombre, email, telefono, ipAddress, userAgent, 'activa']
    );
  } else {
    // Actualizar datos de la sesión si se proporcionan
    if (nombre || email || telefono) {
      await db.query(
        `UPDATE soporte_chat_sesiones
         SET nombre_usuario = COALESCE(?, nombre_usuario),
             email_usuario = COALESCE(?, email_usuario),
             telefono_usuario = COALESCE(?, telefono_usuario)
         WHERE session_id = ?`,
        [nombre, email, telefono, sessionId]
      );
    }
  }
}

/**
 * Buscar FAQs relacionadas con el mensaje
 */
async function searchRelatedFAQs(message, limit = 3) {
  try {
    const [faqs] = await db.query(
      `SELECT id, pregunta, respuesta, categoria
       FROM soporte_faq
       WHERE activo = TRUE
         AND (
           MATCH(pregunta, respuesta, palabras_clave) AGAINST(? IN NATURAL LANGUAGE MODE)
           OR pregunta LIKE ?
           OR palabras_clave LIKE ?
         )
       ORDER BY util_count DESC, vistas DESC
       LIMIT ?`,
      [message, `%${message}%`, `%${message}%`, limit]
    );

    return faqs;
  } catch (error) {
    console.error('Error buscando FAQs relacionadas:', error);
    return [];
  }
}

/**
 * Generar número de radicado para PQR
 */
async function generarNumeroRadicado(connection) {
  const año = new Date().getFullYear();
  const [result] = await connection.query(
    `SELECT COUNT(*) as total FROM pqr WHERE YEAR(fecha_recepcion) = ?`,
    [año]
  );

  const consecutivo = (result[0].total + 1).toString().padStart(6, '0');
  return `PQR-${año}-${consecutivo}`;
}

module.exports = exports;
