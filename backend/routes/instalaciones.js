const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

// Importar rateLimiter con manejo de errores
let rateLimiter;
try {
  rateLimiter = require('../middleware/rateLimiter');
  console.log('✅ rateLimiter para instalaciones cargado');
} catch (error) {
  console.error('❌ Error cargando rateLimiter:', error.message);
  // Crear middleware dummy si falla
  rateLimiter = {
    instalaciones: (req, res, next) => next()
  };
}

// Verificar si existe el controlador de instalaciones
let InstalacionesController;
try {
  InstalacionesController = require('../controllers/instalacionesController');
  console.log('✅ InstalacionesController cargado');
} catch (error) {
  console.error('❌ InstalacionesController no encontrado:', error.message);
  // Crear controlador dummy
  InstalacionesController = {
    listar: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controlador de instalaciones no implementado',
        timestamp: new Date().toISOString()
      });
    },
    obtenerPorId: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método obtenerPorId no implementado',
        timestamp: new Date().toISOString()
      });
    },
    crear: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método crear no implementado',
        timestamp: new Date().toISOString()
      });
    },
    actualizar: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método actualizar no implementado',
        timestamp: new Date().toISOString()
      });
    },
    eliminar: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método eliminar no implementado',
        timestamp: new Date().toISOString()
      });
    },
    cambiarEstado: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método cambiarEstado no implementado',
        timestamp: new Date().toISOString()
      });
    },
    reagendar: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método reagendar no implementado',
        timestamp: new Date().toISOString()
      });
    },
    asignarInstalador: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método asignarInstalador no implementado',
        timestamp: new Date().toISOString()
      });
    },
    obtenerEstadisticas: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método obtenerEstadisticas no implementado',
        timestamp: new Date().toISOString()
      });
    },
    obtenerPendientesPorInstalador: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método obtenerPendientesPorInstalador no implementado',
        timestamp: new Date().toISOString()
      });
    },
    obtenerAgendaInstalador: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Método obtenerAgendaInstalador no implementado',
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Aplicar rate limiting
router.use(rateLimiter.instalaciones);

// Middleware para verificar roles
const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
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
  if (req.user.rol === 'instalador') {
    // Los instaladores solo pueden ver sus propias instalaciones
    if (req.params.instalador_id && parseInt(req.params.instalador_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes acceder a tus propias instalaciones',
        timestamp: new Date().toISOString()
      });
    }
    
    // Para listados, agregar filtro automático
    if (req.method === 'GET' && !req.params.id) {
      req.query.instalador_id = req.user.id;
    }
  }
  next();
};

// ==========================================
// RUTAS BÁSICAS
// ==========================================

/**
 * @route GET /api/v1/instalaciones
 * @desc Listar instalaciones con filtros y paginación
 * @access Administrador, Supervisor, Instalador (solo las propias)
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
 */
router.get('/estadisticas',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.obtenerEstadisticas
);

/**
 * @route GET /api/v1/instalaciones/instalador/:instalador_id/pendientes
 * @desc Obtener instalaciones pendientes de un instalador
 * @access Administrador, Supervisor, Instalador (solo las propias)
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
 */
router.get('/:id',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  // Verificación de acceso específico se maneja en el controlador
  InstalacionesController.obtenerPorId
);

/**
 * @route POST /api/v1/instalaciones
 * @desc Crear nueva instalación
 * @access Administrador, Supervisor
 */
router.post('/',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.crear
);

/**
 * @route PUT /api/v1/instalaciones/:id
 * @desc Actualizar instalación completa
 * @access Administrador, Supervisor
 */
router.put('/:id',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.actualizar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/estado
 * @desc Cambiar estado de instalación
 * @access Administrador, Supervisor, Instalador (solo las propias)
 */
router.patch('/:id/estado',
  verificarRol(['administrador', 'supervisor', 'instalador']),
  InstalacionesController.cambiarEstado
);

/**
 * @route PATCH /api/v1/instalaciones/:id/reagendar
 * @desc Reagendar instalación
 * @access Administrador, Supervisor
 */
router.patch('/:id/reagendar',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.reagendar
);

/**
 * @route PATCH /api/v1/instalaciones/:id/asignar-instalador
 * @desc Asignar instalador a una instalación
 * @access Administrador, Supervisor
 */
router.patch('/:id/asignar-instalador',
  verificarRol(['administrador', 'supervisor']),
  InstalacionesController.asignarInstalador
);

/**
 * @route DELETE /api/v1/instalaciones/:id
 * @desc Eliminar instalación
 * @access Administrador
 */
router.delete('/:id',
  verificarRol(['administrador']),
  InstalacionesController.eliminar
);

// ==========================================
// RUTA DE INFORMACIÓN
// ==========================================

/**
 * @route GET /api/v1/instalaciones/info
 * @desc Obtener información sobre las rutas de instalaciones disponibles
 * @access Private
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    message: 'API de Instalaciones - Sistema PSI',
    availableRoutes: {
      'GET /': 'Listar instalaciones con filtros',
      'GET /estadisticas': 'Estadísticas de instalaciones',
      'GET /instalador/:id/pendientes': 'Instalaciones pendientes por instalador',
      'GET /instalador/:id/agenda': 'Agenda del instalador',
      'GET /:id': 'Obtener instalación específica',
      'POST /': 'Crear nueva instalación',
      'PUT /:id': 'Actualizar instalación',
      'PATCH /:id/estado': 'Cambiar estado de instalación',
      'PATCH /:id/reagendar': 'Reagendar instalación',
      'PATCH /:id/asignar-instalador': 'Asignar instalador',
      'DELETE /:id': 'Eliminar instalación',
      'GET /info': 'Esta información'
    },
    roles: {
      administrador: 'Acceso completo a todas las funcionalidades',
      supervisor: 'Gestión y supervisión de instalaciones',
      instalador: 'Acceso limitado solo a sus propias instalaciones'
    },
    controllerStatus: InstalacionesController ? 'Funcional' : 'No implementado',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// MANEJO DE ERRORES
// ==========================================

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

console.log('🔧 Rutas de instalaciones configuradas correctamente');

module.exports = router;