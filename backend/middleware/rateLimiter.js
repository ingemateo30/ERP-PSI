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
    30, // 30 intentos
    'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.'
  ),

  // Registro de usuarios - restrictivo
  register: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    15, // 15 intentos
    'Demasiados intentos de registro. Intenta de nuevo en 15 minutos.'
  ),

  // Login - restrictivo
  login: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    20, // máximo 20 intentos
    'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  ),

  // Refresh token - amplio
  refresh: createRateLimiter(
    5 * 60 * 1000, // 5 minutos
    60, // máximo 60 intentos
    'Demasiados intentos de refresh. Intenta de nuevo en 5 minutos.'
  ),

  // Recuperación de contraseña - restrictivo
  forgotPassword: createRateLimiter(
    60 * 60 * 1000, // 1 hora
    5, // máximo 5 intentos
    'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en 1 hora.'
  ),

  // Reset de contraseña - restrictivo
  resetPassword: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    10, // máximo 10 intentos
    'Demasiados intentos de restablecimiento. Intenta de nuevo en 15 minutos.'
  ),

  // APIs generales
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    500, // 500 requests
    'Demasiadas peticiones. Intenta nuevamente en 15 minutos.'
  ),

  // Facturación - amplio (se usa mucho al generar/consultar facturas)
  facturacion: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    300, // 300 requests
    'Demasiadas peticiones de facturación. Intenta nuevamente en 15 minutos.'
  ),

  // Reportes - moderado
  reportes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones de reportes. Intenta nuevamente en 15 minutos.'
  ),

  // Clientes - amplio (se consulta constantemente)
  clientes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    300, // 300 requests
    'Demasiadas peticiones de clientes. Intenta nuevamente en 15 minutos.'
  ),

  // Inventario - moderado
  inventario: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    200, // 200 requests
    'Demasiadas peticiones de inventario. Intenta nuevamente en 15 minutos.'
  ),

  // Instalaciones - amplio
  instalaciones: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    300, // 300 requests
    'Demasiadas peticiones de instalaciones. Intenta nuevamente en 15 minutos.'
  ),

  // Usuarios - moderado
  usuarios: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    150, // 150 requests
    'Demasiadas peticiones de usuarios. Intenta nuevamente en 15 minutos.'
  ),

  // Configuración - moderado
  configuracion: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    50, // 50 requests
    'Demasiadas peticiones de configuración. Intenta nuevamente en 15 minutos.'
  ),

  // PQR - amplio
  pqr: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    200, // 200 requests
    'Demasiadas peticiones de PQR. Intenta nuevamente en 15 minutos.'
  ),

  // Incidencias - amplio
  incidencias: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    200, // 200 requests
    'Demasiadas peticiones de incidencias. Intenta nuevamente en 15 minutos.'
  ),

  // Plantillas de correo - moderado
  plantillas: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones de plantillas. Intenta nuevamente en 15 minutos.'
  ),

  // Conceptos de facturación - moderado
  conceptos: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones de conceptos. Intenta nuevamente en 15 minutos.'
  ),

  // Bancos - moderado
  bancos: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones de bancos. Intenta nuevamente en 15 minutos.'
  ),

  // Geografía (departamentos, ciudades) - amplio
  geografia: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    300, // 300 requests
    'Demasiadas peticiones geográficas. Intenta nuevamente en 15 minutos.'
  ),

  // Planes de servicio - amplio
  planes: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    200, // 200 requests
    'Demasiadas peticiones de planes. Intenta nuevamente en 15 minutos.'
  )
};

// Rate limiter global de respaldo
const globalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  1000, // 1000 requests globales
  'Límite de peticiones globales excedido. Intenta nuevamente en 15 minutos.'
);

// Limiter específico para uploads de archivos
const uploadsLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  30, // 30 uploads
  'Demasiados uploads. Intenta nuevamente en 15 minutos.'
);

// Limiter para operaciones críticas
const criticasLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  20, // 20 operaciones
  'Demasiadas operaciones críticas. Intenta nuevamente en 15 minutos.'
);

// Limiter para búsquedas intensivas
const busquedasLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutos
  150, // 150 búsquedas
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