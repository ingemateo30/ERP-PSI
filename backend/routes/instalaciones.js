const express = require('express');
const router = express.Router();
const InstalacionesController = require('../controllers/instalacionesController');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Middleware de autenticación para todas las rutas
router.use(auth.verificarToken);

// Aplicar rate limiting
router.use(rateLimiter.instalaciones);

// Middleware para verificar roles
const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

// Middleware para verificar que instaladores solo vean sus instalaciones
const verificarAccesoInstalacion = (req, res, next) => {
  if (req.usuario.rol === 'instalador') {
    // Los instaladores solo pueden ver sus propias instalaciones
    if (req.params.instalador_id && parseInt(req.params.instalador_id) !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes acceder a tus propias instalaciones',
        timestamp: new Date().toISOString()
      });
    }
    
    // Para listados, agregar filtro automático
    if (req.method === 'GET' && !req.params.id) {
      req.query.instalador_id = req.usuario.id;
    }
  }
  next();
};

/**
 * @route GET /api/v1/instalaciones
 * @desc Listar instalaciones con filtros y paginación
 * @access Administrador, Supervisor, Instalador (solo las propias)
 * @query {number} pagina - Número de página (default: 1)
 * @query {number} limite - Elementos por página (default: 10, max: 100)
 * @query {string} estado - Filtrar por estado
 * @query {number} instalador_id - Filtrar por instalador
 * @query {string} fecha_desde - Filtrar desde fecha (YYYY-MM-DD)
 * @query {string} fecha_hasta - Filtrar hasta fecha (YYYY-MM-DD)
 * @query {string} tipo_instalacion - Filtrar por tipo
 * @query {number} ciudad_id - Filtrar por ciudad
 * @query {string} busqueda - Búsqueda general
 */
router.get('/', 
  verificarRol(['administrador', 'supervisor', 'instalador']),
  verificarAccesoInstalacion,
  InstalacionesController.listar
);

/**
 * @route GET /api/v1/instalaciones/estadisticas
 * @desc Obtener estadísticas de instalaciones
 * @access Administrador, Supervisor
 * @query {string} fecha_desde - Filtrar desde fecha (YYYY-MM-DD)
 * @query {string} fecha_hasta - Filtrar hasta fecha (YYYY-MM-DD)
 * @query {number} instalador_id - Filtrar por instalador
 */
router.get('/estadisticas',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.obtenerEstadisticas
);

/**
 * @route GET /api/v1/instalaciones/instalador/:instalador_id/pendientes
 * @desc Obtener instalaciones pendientes de un instalador
 * @access Administrador, Supervisor, Instalador (solo las propias)
 * @param {number} instalador_id - ID del instalador
 */
router.get('/instalador/:instalador_id/pendientes',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  verificarAccesoInstalacion,
  InstalacionesController.obtenerPendientesPorInstalador
);

/**
 * @route GET /api/v1/instalaciones/instalador/:instalador_id/agenda
 * @desc Obtener agenda del instalador
 * @access Administrador, Supervisor, Instalador (solo la propia)
 * @param {number} instalador_id - ID del instalador
 * @query {string} fecha_desde - Filtrar desde fecha (YYYY-MM-DD)
 * @query {string} fecha_hasta - Filtrar hasta fecha (YYYY-MM-DD)
 */
router.get('/instalador/:instalador_id/agenda',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  verificarAccesoInstalacion,
  InstalacionesController.obtenerAgendaInstalador
);

/**
 * @route GET /api/v1/instalaciones/:id
 * @desc Obtener instalación por ID
 * @access Administrador, Supervisor, Instalador (solo las propias)
 * @param {number} id - ID de la instalación
 */
router.get('/:id',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  async (req, res, next) => {
    // Verificar acceso específico para instaladores
    if (req.usuario.rol === 'instalador') {
      try {
        const Instalacion = require('../models/instalacion');
        const instalacion = await Instalacion.obtenerPorId(parseInt(req.params.id));
        
        if (!instalacion) {
          return res.status(404).json({
            success: false,
            message: 'Instalación no encontrada',
            timestamp: new Date().toISOString()
          });
        }

        if (instalacion.instalador_id !== req.usuario.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes acceder a tus propias instalaciones',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
          timestamp: new Date().toISOString()
        });
      }
    }
    next();
  },
  InstalacionesController.obtenerPorId
);

/**
 * @route POST /api/v1/instalaciones
 * @desc Crear nueva instalación
 * @access Administrador, Supervisor
 * @body {number} cliente_id - ID del cliente (requerido)
 * @body {number} plan_id - ID del plan (requerido)
 * @body {number} instalador_id - ID del instalador (opcional)
 * @body {string} fecha_programada - Fecha programada (requerido)
 * @body {string} direccion_instalacion - Dirección (requerido)
 * @body {string} barrio - Barrio (opcional)
 * @body {number} ciudad_id - ID de la ciudad (opcional)
 * @body {string} telefono_contacto - Teléfono de contacto (opcional)
 * @body {string} persona_recibe - Persona que recibe (opcional)
 * @body {string} tipo_instalacion - Tipo de instalación (opcional)
 * @body {string} observaciones - Observaciones (opcional)
 * @body {array} equipos_instalados - Equipos a instalar (opcional)
 * @body {number} coordenadas_lat - Latitud (opcional)
 * @body {number} coordenadas_lng - Longitud (opcional)
 * @body {number} costo_instalacion - Costo de instalación (opcional)
 */
router.post('/',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.crear
);

/**
 * @route PUT /api/v1/instalaciones/:id
 * @desc Actualizar instalación completa
 * @access Administrador, Supervisor
 * @param {number} id - ID de la instalación
 */
router.put('/:id',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.actualizar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/estado
 * @desc Cambiar estado de instalación
 * @access Administrador, Supervisor, Instalador (solo las propias)
 * @param {number} id - ID de la instalación
 * @body {string} estado - Nuevo estado (requerido)
 * @body {string} observaciones - Observaciones (opcional)
 * @body {string} fecha_realizada - Fecha de realización (requerido si estado es 'completada')
 * @body {array} equipos_instalados - Equipos instalados (opcional)
 * @body {array} fotos_instalacion - Fotos de la instalación (opcional)
 */
router.patch('/:id/estado',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  async (req, res, next) => {
    // Verificar acceso específico para instaladores
    if (req.usuario.rol === 'instalador') {
      try {
        const Instalacion = require('../models/instalacion');
        const instalacion = await Instalacion.obtenerPorId(parseInt(req.params.id));
        
        if (!instalacion) {
          return res.status(404).json({
            success: false,
            message: 'Instalación no encontrada',
            timestamp: new Date().toISOString()
          });
        }

        if (instalacion.instalador_id !== req.usuario.id) {
          return res.status(403).json({
            success: false,
            message: 'Solo puedes actualizar tus propias instalaciones',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
          timestamp: new Date().toISOString()
        });
      }
    }
    next();
  },
  InstalacionesController.cambiarEstado
);

/**
 * @route PATCH /api/v1/instalaciones/:id/reagendar
 * @desc Reagendar instalación
 * @access Administrador, Supervisor
 * @param {number} id - ID de la instalación
 * @body {string} nueva_fecha - Nueva fecha programada (requerido)
 * @body {string} motivo - Motivo del reagendamiento (opcional)
 */
router.patch('/:id/reagendar',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.reagendar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/asignar-instalador
 * @desc Asignar instalador a una instalación
 * @access Administrador, Supervisor
 * @param {number} id - ID de la instalación
 * @body {number} instalador_id - ID del instalador (requerido)
 */
router.patch('/:id/asignar-instalador',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.asignarInstalador
);

/**
 * @route DELETE /api/v1/instalaciones/:id
 * @desc Eliminar instalación
 * @access Administrador
 * @param {number} id - ID de la instalación
 */
router.delete('/:id',
  verificarRol(['administrador']),
  InstalacionesController.eliminar
);

// Middleware de manejo de errores específico para instalaciones
router.use((error, req, res, next) => {
  console.error('Error en rutas de instalaciones:', error);
  
  // Errores de validación de MySQL
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referencias inválidas en los datos proporcionados',
      timestamp: new Date().toISOString()
    });
  }

  // Error de duplicado
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe una instalación con estos datos',
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;