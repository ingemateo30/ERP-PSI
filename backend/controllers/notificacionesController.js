// backend/controllers/notificacionesController.js

const Notificacion = require('../models/notificacion');

// Obtener notificaciones del usuario actual
exports.obtenerNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = (req.user.rol || req.user.role || '').toLowerCase();

    const filtros = {
      tipo: req.query.tipo,
      leida: req.query.leida !== undefined ? req.query.leida === 'true' : undefined,
      limite: req.query.limite || 50
    };

    console.log('📋 Obteniendo notificaciones:', {
      usuarioId,
      rol,
      query: req.query,
      filtros
    });

    const notificaciones = await Notificacion.obtenerPorUsuario(usuarioId, rol, filtros);

    console.log('✅ Notificaciones obtenidas:', notificaciones.length);

    res.json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('❌ Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message
    });
  }
};

// Contar notificaciones no leídas
exports.contarNoLeidas = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = (req.user.rol || req.user.role || '').toLowerCase();

    const total = await Notificacion.contarNoLeidas(usuarioId, rol);

    res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('Error al contar notificaciones no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al contar notificaciones no leídas',
      error: error.message
    });
  }
};

// Marcar notificación como leída
exports.marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const resultado = await Notificacion.marcarComoLeida(id, usuarioId);

    if (resultado) {
      res.json({
        success: true,
        message: 'Notificación marcada como leída'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída',
      error: error.message
    });
  }
};

// Marcar todas las notificaciones como leídas
exports.marcarTodasComoLeidas = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const cantidad = await Notificacion.marcarTodasComoLeidas(usuarioId);

    res.json({
      success: true,
      message: `${cantidad} notificaciones marcadas como leídas`,
      data: { cantidad }
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas como leídas',
      error: error.message
    });
  }
};

// Eliminar notificación
exports.eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const resultado = await Notificacion.eliminar(id, usuarioId);

    if (resultado) {
      res.json({
        success: true,
        message: 'Notificación eliminada'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: error.message
    });
  }
};

// Crear notificación manual (solo administradores)
exports.crearNotificacion = async (req, res) => {
  try {
    const { usuario_id, tipo, titulo, mensaje, datos_adicionales } = req.body;

    // Validar que el usuario sea administrador
    const rol = (req.user.rol || req.user.role || '').toLowerCase();
    if (rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear notificaciones'
      });
    }

    const notificacionId = await Notificacion.crear({
      usuario_id,
      tipo,
      titulo,
      mensaje,
      datos_adicionales
    });

    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: { id: notificacionId }
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación',
      error: error.message
    });
  }
};
