const rateLimit = require('express-rate-limit');

// Configuración base para rate limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { 
      success: false,
      message,
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.round(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Configuraciones específicas de rate limiting
const rateLimiters = {
  // Autenticación - más restrictivo
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    10, // 10 intentos
    'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.'
  ),

  // Registro de usuarios - muy restrictivo
  register: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // 5 intentos
    'Demasiados intentos de registro. Intenta de nuevo en 15 minutos.'
  ),
  
  // Login - restrictivo
  login: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    10, // máximo 10 intentos
    'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  ),
  
  // Refresh token - moderado
  refresh: createRateLimiter(
    5 * 60 * 1000, // 5 minutos
    20, // máximo 20 intentos
    'Demasiados intentos de refresh. Intenta de nuevo en 5 minutos.'
  ),
  
  // Recuperación de contraseña - muy restrictivo
  forgotPassword: createRateLimiter(
    60 * 60 * 1000, // 1 hora
    3, // máximo 3 intentos
    'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en 1 hora.'
  ),
  
  // Reset de contraseña - restrictivo
  resetPassword: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // máximo 5 intentos
    'Demasiados intentos de restablecimiento. Intenta de nuevo en 15 minutos.'
  ),

  // APIs generales
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones. Intenta nuevamente en 15 minutos.'
  ),

  // Facturación - moderado
  facturacion: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    50, // 50 requests
    'Demasiadas peticiones de facturación. Intenta nuevamente en 15 minutos.'
  ),

  // Reportes - restrictivo
  reportes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    20, // 20 requests
    'Demasiadas peticiones de reportes. Intenta nuevamente en 15 minutos.'
  ),

  // Clientes - moderado
  clientes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    60, // 60 requests
    'Demasiadas peticiones de clientes. Intenta nuevamente en 15 minutos.'
  ),

  // Inventario - moderado
  inventario: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    40, // 40 requests
    'Demasiadas peticiones de inventario. Intenta nuevamente en 15 minutos.'
  ),

  // Instalaciones - moderado
  instalaciones: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    50, // 50 requests
    'Demasiadas peticiones de instalaciones. Intenta nuevamente en 15 minutos.'
  ),

  // Usuarios - restrictivo
  usuarios: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    30, // 30 requests
    'Demasiadas peticiones de usuarios. Intenta nuevamente en 15 minutos.'
  ),

  // Configuración - muy restrictivo
  configuracion: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    10, // 10 requests
    'Demasiadas peticiones de configuración. Intenta nuevamente en 15 minutos.'
  ),

  // PQR - moderado
  pqr: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    40, // 40 requests
    'Demasiadas peticiones de PQR. Intenta nuevamente en 15 minutos.'
  ),

  // Incidencias - moderado
  incidencias: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    40, // 40 requests
    'Demasiadas peticiones de incidencias. Intenta nuevamente en 15 minutos.'
  ),

  // Plantillas de correo - restrictivo
  plantillas: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    20, // 20 requests
    'Demasiadas peticiones de plantillas. Intenta nuevamente en 15 minutos.'
  ),

  // Conceptos de facturación - restrictivo
  conceptos: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    25, // 25 requests
    'Demasiadas peticiones de conceptos. Intenta nuevamente en 15 minutos.'
  ),

  // Bancos - restrictivo
  bancos: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    20, // 20 requests
    'Demasiadas peticiones de bancos. Intenta nuevamente en 15 minutos.'
  ),

  // Geografía (departamentos, ciudades) - moderado
  geografia: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    60, // 60 requests
    'Demasiadas peticiones geográficas. Intenta nuevamente en 15 minutos.'
  ),

  // Planes de servicio - moderado
  planes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    40, // 40 requests
    'Demasiadas peticiones de planes. Intenta nuevamente en 15 minutos.'
  )
};

// Rate limiter global de respaldo
const globalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  200, // 200 requests globales
  'Límite de peticiones globales excedido. Intenta nuevamente en 15 minutos.'
);

// Limiter específico para uploads de archivos
const uploadsLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  10, // 10 uploads
  'Demasiados uploads. Intenta nuevamente en 15 minutos.'
);

// Limiter para operaciones críticas
const criticasLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  5, // 5 operaciones
  'Demasiadas operaciones críticas. Intenta nuevamente en 15 minutos.'
);

// Limiter para búsquedas intensivas
const busquedasLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutos
  30, // 30 búsquedas
  'Demasiadas búsquedas. Intenta nuevamente en 5 minutos.'
);

// Exportar todos los limiters directamente
module.exports = {
  // Rate limiters principales
  ...rateLimiters,
  
  // Limiters adicionales
  global: globalLimiter,
  uploads: uploadsLimiter,
  criticas: criticasLimiter,
  busquedas: busquedasLimiter,
  
  // Función helper para crear limiters personalizados
  createCustomLimiter: createRateLimiter,
  
  // Para compatibilidad con código existente que importa { rateLimiter }
  rateLimiter: {
    ...rateLimiters,
    global: globalLimiter,
    uploads: uploadsLimiter,
    criticas: criticasLimiter,
    busquedas: busquedasLimiter
  }
};