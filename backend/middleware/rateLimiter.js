const rateLimit = require('express-rate-limit');

// Configuración base para rate limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Exportar objeto rateLimiter con todas las configuraciones
const rateLimiter = {
  register: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // máximo 5 intentos
    'Demasiados intentos de registro. Intenta de nuevo en 15 minutos.'
  ),
  
  login: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    10, // máximo 10 intentos
    'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  ),
  
  refresh: createRateLimiter(
    5 * 60 * 1000, // 5 minutos
    20, // máximo 20 intentos
    'Demasiados intentos de refresh. Intenta de nuevo en 5 minutos.'
  ),
  
  forgotPassword: createRateLimiter(
    60 * 60 * 1000, // 1 hora
    3, // máximo 3 intentos
    'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en 1 hora.'
  ),
  
  resetPassword: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // máximo 5 intentos
    'Demasiados intentos de restablecimiento. Intenta de nuevo en 15 minutos.'
  )
};

module.exports = { rateLimiter };