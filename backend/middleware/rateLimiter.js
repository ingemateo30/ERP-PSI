const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/responses');
const logger = require('../utils/logger');

/**
 * Configuración de rate limiting
 */

// Rate limiter global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar IP real considerando proxies
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit global excedido', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
    
    return ApiResponse.rateLimitExceeded(res);
  }
});

// Rate limiter para autenticación (más estricto)
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 5, // 5 intentos por ventana
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión, intenta de nuevo más tarde',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combinar IP y email para rate limiting más preciso
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const email = req.body?.email || '';
    return `${ip}:${email}`;
  },
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de autenticación excedido', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiados intentos de inicio de sesión');
  },
  skip: (req) => {
    // Skip rate limiting para IPs whitelistadas (opcional)
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    return whitelist.includes(req.ip);
  }
});

// Rate limiter para registro de usuarios
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: {
    success: false,
    message: 'Demasiados registros desde esta IP, intenta de nuevo más tarde',
    error: {
      code: 'REGISTER_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de registro excedido', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiados registros desde esta IP');
  }
});

// Rate limiter para cambio de contraseña
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 cambios por hora
  message: {
    success: false,
    message: 'Demasiados cambios de contraseña, intenta de nuevo más tarde',
    error: {
      code: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    },
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req) => {
    // Usar ID de usuario si está autenticado, sino IP
    return req.user?.id?.toString() || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de cambio de contraseña excedido', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiados cambios de contraseña');
  }
});

// Rate limiter para recuperación de contraseña
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 solicitudes por hora
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación de contraseña, intenta de nuevo más tarde',
    error: {
      code: 'FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    },
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req) => {
    const ip = req.ip;
    const email = req.body?.email || '';
    return `${ip}:${email}`;
  },
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de recuperación de contraseña excedido', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiadas solicitudes de recuperación');
  }
});

// Rate limiter para API general (menos estricto)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 requests por ventana para usuarios autenticados
  message: {
    success: false,
    message: 'Demasiadas solicitudes a la API, intenta de nuevo más tarde',
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    },
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req) => {
    // Usar ID de usuario si está autenticado, sino IP
    return req.user?.id?.toString() || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de API excedido', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiadas solicitudes a la API');
  }
});

// Rate limiter para subida de archivos
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 subidas por hora
  message: {
    success: false,
    message: 'Demasiadas subidas de archivos, intenta de nuevo más tarde',
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    },
    timestamp: new Date().toISOString()
  },
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  handler: (req, res) => {
    logger.logSecurity('warn', 'Rate limit de subida excedido', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.rateLimitExceeded(res, 'Demasiadas subidas de archivos');
  }
});

/**
 * Rate limiter dinámico basado en el comportamiento del usuario
 */
const createDynamicLimiter = (options = {}) => {
  const {
    baseWindowMs = 15 * 60 * 1000,
    baseMax = 100,
    suspiciousThreshold = 50,
    suspiciousMultiplier = 0.5
  } = options;

  return rateLimit({
    windowMs: baseWindowMs,
    max: (req) => {
      // Reducir límite para IPs sospechosas
      const isSuspicious = req.headers['x-suspicious'] === 'true';
      return isSuspicious ? Math.floor(baseMax * suspiciousMultiplier) : baseMax;
    },
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
      logger.logSecurity('warn', 'Rate limit dinámico excedido', {
        ip: req.ip,
        suspicious: req.headers['x-suspicious'] === 'true',
        userAgent: req.get('User-Agent')
      });
      
      return ApiResponse.rateLimitExceeded(res);
    }
  });
};

module.exports = {
  globalLimiter,
  authLimiter,
  registerLimiter,
  passwordLimiter,
  forgotPasswordLimiter,
  apiLimiter,
  uploadLimiter,
  createDynamicLimiter
};