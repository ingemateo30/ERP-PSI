// backend/routes/notificaciones.js

const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificacionesController');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener notificaciones del usuario
router.get('/', notificacionesController.obtenerNotificaciones);

// Contar notificaciones no leídas
router.get('/count', notificacionesController.contarNoLeidas);

// Marcar todas como leídas
router.put('/mark-all-read', notificacionesController.marcarTodasComoLeidas);

// Marcar notificación específica como leída
router.put('/:id/read', notificacionesController.marcarComoLeida);

// Eliminar notificación
router.delete('/:id', notificacionesController.eliminarNotificacion);

// Crear notificación (solo administradores)
router.post('/', notificacionesController.crearNotificacion);

module.exports = router;
