const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_EXPIRE || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  issuer: 'isp-system',
  audience: 'isp-users'
};

// Validar que los secrets estén configurados
if (!jwtConfig.secret || !jwtConfig.refreshSecret) {
  logger.error('JWT secrets no configurados en variables de entorno');
  process.exit(1);
}

if (jwtConfig.secret.length < 32) {
  logger.error('JWT_SECRET debe tener al menos 32 caracteres');
  process.exit(1);
}

class JWTHelper {
  static generateToken(payload) {
    try {
      return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
    } catch (error) {
      logger.error('Error generando token JWT:', error.message);
      throw new Error('Error generando token de acceso');
    }
  }

  static generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, jwtConfig.refreshSecret, {
        expiresIn: jwtConfig.refreshExpiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
    } catch (error) {
      logger.error('Error generando refresh token:', error.message);
      throw new Error('Error generando token de renovación');
    }
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      } else {
        throw new Error('Error verificando token');
      }
    }
  }

  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, jwtConfig.refreshSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Refresh token inválido');
      } else {
        throw new Error('Error verificando refresh token');
      }
    }
  }

  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = { JWTHelper, jwtConfig };