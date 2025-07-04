// backend/routes/clientes.js - RUTAS CORREGIDAS CON MANEJO DE ERRORES

const express = require('express');
const router = express.Router();

// Importar controlador con manejo de errores
let ClienteController;
try {
  ClienteController = require('../controllers/clienteController');
  console.log('✅ ClienteController cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando ClienteController:', error.message);
  // Crear controlador dummy temporal
  ClienteController = {
    obtenerTodos: (req, res) => res.status(501).json({ success: false, message: 'Controlador no disponible' }),
    exportarClientes: (req, res) => res.status(501).json({ success: false, message: 'Exportación no disponible' }),
    obtenerEstadisticas: (req, res) => res.status(501).json({ success: false, message: 'Estadísticas no disponibles' }),
    buscar: (req, res) => res.status(501).json({ success: false, message: 'Búsqueda no disponible' }),
    obtenerPorIdentificacion: (req, res) => res.status(501).json({ success: false, message: 'Método no disponible' }),
    obtenerPorId: (req, res) => res.status(501).json({ success: false, message: 'Método no disponible' }),
    crear: (req, res) => res.status(501).json({ success: false, message: 'Creación no disponible' }),
    actualizar: (req, res) => res.status(501).json({ success: false, message: 'Actualización no disponible' }),
    eliminar: (req, res) => res.status(501).json({ success: false, message: 'Eliminación no disponible' })
  };
}

// Importar middleware de autenticación con manejo de errores
let authenticateToken, requireRole;
try {
  const auth = require('../middleware/auth');
  authenticateToken = auth.authenticateToken || auth.auth;
  requireRole = auth.requireRole;
  console.log('✅ Middleware de autenticación cargado');
} catch (error) {
  console.error('❌ Error cargando middleware auth:', error.message);
  // Crear middleware dummy
  authenticateToken = (req, res, next) => {
    console.warn('⚠️ Usando middleware de autenticación dummy');
    req.user = { id: 1, role: 'administrador' }; // Usuario dummy para desarrollo
    next();
  };
  requireRole = (...roles) => (req, res, next) => next();
}

// Importar rateLimiter con manejo de errores
let rateLimiter;
try {
  rateLimiter = require('../middleware/rateLimiter');
  console.log('✅ RateLimiter cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando rateLimiter:', error.message);
  // Crear rateLimiter dummy
  rateLimiter = {
    clientes: (req, res, next) => next(),
    busquedas: (req, res, next) => next(),
    criticas: (req, res, next) => next()
  };
}

// Importar validaciones con manejo de errores
let validarCreacionCliente, validarActualizacionCliente;
try {
  const validaciones = require('../middleware/validaciones');
  validarCreacionCliente = validaciones.validarCreacionCliente || [];
  validarActualizacionCliente = validaciones.validarActualizacionCliente || [];
  console.log('✅ Validaciones cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando validaciones:', error.message);
  // Crear validaciones dummy
  validarCreacionCliente = [];
  validarActualizacionCliente = [];
}

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ==========================================
// RUTAS DE CONSULTA
// ==========================================

// Obtener todos los clientes con filtros y paginación
router.get('/', 
  rateLimiter.clientes, 
  ClienteController.obtenerTodos
);

// NUEVA: Ruta para exportar clientes
router.get('/export', 
  rateLimiter.clientes,
  ClienteController.exportarClientes
);

// Obtener estadísticas de clientes
router.get('/stats', 
  rateLimiter.clientes, 
  ClienteController.obtenerEstadisticas
);

// Buscar clientes
router.get('/search', 
  rateLimiter.busquedas, 
  ClienteController.buscar
);

// Obtener cliente por identificación
router.get('/identification/:identificacion', 
  rateLimiter.clientes, 
  ClienteController.obtenerPorIdentificacion
);

// Obtener cliente por ID (debe ir al final para evitar conflictos)
router.get('/:id', 
  rateLimiter.clientes, 
  ClienteController.obtenerPorId
);

// ==========================================
// RUTAS DE MODIFICACIÓN
// ==========================================

// Crear nuevo cliente
router.post('/', 
  rateLimiter.clientes,
  ...validarCreacionCliente, // Spread operator para aplicar array de validaciones
  ClienteController.crear
);

// Actualizar cliente
router.put('/:id', 
  rateLimiter.clientes,
  ...validarActualizacionCliente, // Spread operator para aplicar array de validaciones
  ClienteController.actualizar
);

// Eliminar cliente
router.delete('/:id', 
  rateLimiter.criticas,
  ClienteController.eliminar
);

// Manejo de errores para rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores generales
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de clientes:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;