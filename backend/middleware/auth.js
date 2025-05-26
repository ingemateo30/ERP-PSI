const { JWTHelper } = require('../config/jwt');
const User = require('../models/User');
const ApiResponse = require('../utils/responses');
const logger = require('../utils/logger');

/**
 * Middleware de autenticación JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.logSecurity('warn', 'Intento de acceso sin token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      return ApiResponse.unauthorized(res, 'Token de acceso requerido');
    }

    // Verificar token
    const decoded = JWTHelper.verifyToken(token);
    
    // Buscar usuario en base de datos
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      logger.logSecurity('warn', 'Token válido pero usuario no encontrado', {
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return ApiResponse.unauthorized(res, 'Usuario no encontrado');
    }

    if (!user.activo) {
      logger.logSecurity('warn', 'Intento de acceso con usuario inactivo', {
        userId: user.id,
        email: user.email,
        ip: req.ip
      });
      return ApiResponse.forbidden(res, 'Cuenta desactivada');
    }

    // Agregar usuario a la request
    req.user = user;
    req.token = token;

    logger.logAuth('info', 'Acceso autorizado', {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      ip: req.ip,
      url: req.originalUrl
    });

    next();

  } catch (error) {
    logger.logSecurity('warn', 'Error en autenticación', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    });

    if (error.message === 'Token expirado') {
      return ApiResponse.unauthorized(res, 'Token expirado');
    } else if (error.message === 'Token inválido') {
      return ApiResponse.unauthorized(res, 'Token inválido');
    } else {
      return ApiResponse.unauthorized(res, 'Error de autenticación');
    }
  }
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = JWTHelper.verifyToken(token);
    const user = await User.findById(decoded.userId);
    
    if (user && user.activo) {
      req.user = user;
      req.token = token;
    }

    next();

  } catch (error) {
    // En autenticación opcional, continuamos sin usuario
    next();
  }
};

/**
 * Middleware de autorización por roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    if (!allowedRoles.includes(req.user.rol)) {
      logger.logSecurity('warn', 'Acceso denegado por rol insuficiente', {
        userId: req.user.id,
        userRole: req.user.rol,
        requiredRoles: allowedRoles,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return ApiResponse.forbidden(res, 'No tienes permisos para acceder a este recurso');
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario solo acceda a sus propios datos
 */
const requireOwnership = (userIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }

    const requestedUserId = parseInt(req.params[userIdParam]);
    const currentUserId = req.user.id;

    // Admin puede acceder a cualquier usuario
    if (req.user.rol === 'admin') {
      return next();
    }

    // El usuario solo puede acceder a sus propios datos
    if (requestedUserId !== currentUserId) {
      logger.logSecurity('warn', 'Intento de acceso a datos de otro usuario', {
        userId: currentUserId,
        attemptedUserId: requestedUserId,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return ApiResponse.forbidden(res, 'Solo puedes acceder a tus propios datos');
    }

    next();
  };
};

/**
 * Middleware para verificar refresh token
 */
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ApiResponse.unauthorized(res, 'Refresh token requerido');
    }

    // Verificar refresh token
    const decoded = JWTHelper.verifyRefreshToken(refreshToken);
    
    // Buscar usuario
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.activo) {
      logger.logSecurity('warn', 'Refresh token válido pero usuario no válido', {
        userId: decoded.userId,
        ip: req.ip
      });
      return ApiResponse.unauthorized(res, 'Usuario no válido');
    }

    req.user = user;
    req.refreshToken = refreshToken;

    next();

  } catch (error) {
    logger.logSecurity('warn', 'Error verificando refresh token', {
      error: error.message,
      ip: req.ip
    });

    if (error.message === 'Refresh token expirado') {
      return ApiResponse.unauthorized(res, 'Refresh token expirado');
    } else {
      return ApiResponse.unauthorized(res, 'Refresh token inválido');
    }
  }
};

/**
 * Middleware para extraer información del usuario del token (sin validar)
 */
const extractUserInfo = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Decodificar sin verificar (para logs, etc.)
      const decoded = require('jsonwebtoken').decode(token);
      if (decoded && decoded.userId) {
        req.tokenInfo = {
          userId: decoded.userId,
          email: decoded.email,
          rol: decoded.rol
        };
      }
    }

    next();
  } catch (error) {
    // Ignorar errores en extracción
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireOwnership,
  authenticateRefreshToken,
  extractUserInfo
};