const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/database');

// Importar utilidades con manejo de errores
let logger, ApiResponse, PasswordUtils;

try {
  logger = require('../utils/logger');
} catch (error) {
  // Logger básico si no existe el archivo
  logger = {
    logAuth: (level, message, data) => console.log(`[${level.toUpperCase()}] ${message}`, data),
    error: (message, error) => console.error(message, error),
    logSecurity: (level, message, data) => console.log(`[SECURITY-${level.toUpperCase()}] ${message}`, data)
  };
}

try {
  ApiResponse = require('../utils/responses');
} catch (error) {
  // ApiResponse básico si no existe el archivo
  ApiResponse = {
    loginSuccess: (res, user, tokens) => res.json({
      success: true,
      message: 'Login exitoso',
      data: { user, tokens }
    }),
    success: (res, data, message) => res.json({
      success: true,
      message: message || 'Operación exitosa',
      data
    }),
    error: (res, message, status = 500) => res.status(status).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    }),
    validationError: (res, errors) => res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors,
      timestamp: new Date().toISOString()
    }),
    unauthorized: (res, message) => res.status(401).json({
      success: false,
      message: message || 'No autorizado',
      timestamp: new Date().toISOString()
    }),
    notFound: (res, message) => res.status(404).json({
      success: false,
      message: message || 'No encontrado',
      timestamp: new Date().toISOString()
    }),
    logoutSuccess: (res) => res.json({
      success: true,
      message: 'Logout exitoso'
    }),
    profileSuccess: (res, user) => res.json({
      success: true,
      data: { user }
    })
  };
}

try {
  PasswordUtils = require('../utils/password');
} catch (error) {
  // PasswordUtils básico si no existe el archivo
  PasswordUtils = {
    validatePassword: (password) => ({
      isValid: password && password.length >= 8,
      errors: password && password.length >= 8 ? [] : ['La contraseña debe tener al menos 8 caracteres']
    }),
    hashPassword: async (password) => await bcrypt.hash(password, 12)
  };
}

class AuthController {

  // Login de usuario
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }

      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const connection = await pool.getConnection();

      // Buscar usuario activo
      const [users] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE email = ? AND activo = 1',
        [email]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.unauthorized(res, 'Credenciales inválidas');
      }

      const user = users[0];

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        connection.release();
        logger.logAuth('warning', 'Intento de login fallido', {
          email: email,
          ip: clientIP,
          userAgent: userAgent
        });
        return ApiResponse.unauthorized(res, 'Credenciales inválidas');
      }

      // Generar tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          rol: user.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const refreshToken = jwt.sign(
        {
          userId: user.id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Actualizar último acceso
      await connection.execute(
        'UPDATE sistema_usuarios SET ultimo_acceso = NOW() WHERE id = ?',
        [user.id]
      );

      connection.release();

      logger.logAuth('info', 'Login exitoso', {
        userId: user.id,
        email: user.email,
        rol: user.rol,
        ip: clientIP,
        userAgent: userAgent
      });

      // Configurar cookie segura para refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });

      // Respuesta exitosa
      return ApiResponse.loginSuccess(res,
        {
          id: user.id,
          email: user.email,
          nombre: user.nombres || user.nombre,
          apellidos: user.apellidos,
          telefono: user.telefono,
          rol: user.rol,
          ultimo_acceso: user.ultimo_acceso
        },
        {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      );

    } catch (error) {
      logger.error('Error en login:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Registro de nuevo usuario
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }

      const { email, password, nombre, telefono, rol = 'supervisor' } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const passwordValidation = PasswordUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return ApiResponse.validationError(res, passwordValidation.errors.map(error => ({
          field: 'password',
          message: error
        })));
      }

      const connection = await pool.getConnection();

      const [existingUsers] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        connection.release();
        return ApiResponse.error(res, 'El usuario ya existe', 409);
      }

      // Hashear contraseña
      const hashedPassword = await PasswordUtils.hashPassword(password);

      // Crear usuario
      const [result] = await connection.execute(
        `INSERT INTO sistema_usuarios (
          email, password, nombres, telefono, rol, activo, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [email, hashedPassword, nombre, telefono, rol]
      );

      const userId = result.insertId;

      connection.release();

      logger.logAuth('info', 'Registro exitoso', {
        userId: userId,
        email: email,
        rol: rol,
        ip: clientIP,
        userAgent: userAgent
      });

      return ApiResponse.success(res, {
        user: {
          id: userId,
          email: email,
          nombre: nombre,
          telefono: telefono,
          rol: rol
        }
      }, 'Usuario registrado exitosamente');

    } catch (error) {
      logger.error('Error en registro:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Renovar token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const cookieRefreshToken = req.cookies.refreshToken;

      const tokenToUse = refreshToken || cookieRefreshToken;

      if (!tokenToUse) {
        return ApiResponse.unauthorized(res, 'Token de actualización requerido');
      }

      // Verificar refresh token
      const decoded = jwt.verify(tokenToUse, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return ApiResponse.unauthorized(res, 'Token de actualización inválido');
      }

      const connection = await pool.getConnection();

      const [users] = await connection.execute(
        'SELECT id, email, nombres, apellidos, telefono, rol FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [decoded.userId]
      );

      connection.release();

      if (users.length === 0) {
        return ApiResponse.unauthorized(res, 'Usuario no válido');
      }

      const user = users[0];

      // Generar nuevo access token
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          rol: user.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Generar nuevo refresh token
      const newRefreshToken = jwt.sign(
        {
          userId: user.id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Actualizar cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return ApiResponse.success(res, {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        },
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombres,
          apellidos: user.apellidos,
          telefono: user.telefono,
          rol: user.rol
        }
      }, 'Token actualizado exitosamente');

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token de actualización inválido');
      }

      logger.error('Error renovando token:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Cerrar sesión
  static async logout(req, res) {
    try {
      const user = req.user;

      res.clearCookie('refreshToken');

      logger.logAuth('info', 'Logout exitoso', {
        userId: user.id,
        email: user.email
      });

      return ApiResponse.logoutSuccess(res);

    } catch (error) {
      logger.error('Error en logout:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener información del usuario actual
  static async me(req, res) {
    try {
      const user = req.user;

      const connection = await pool.getConnection();

      const [users] = await connection.execute(`
        SELECT id, email, nombres, apellidos, telefono, rol, activo, ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [user.id]);

      connection.release();

      if (users.length === 0) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      return ApiResponse.profileSuccess(res, users[0]);

    } catch (error) {
      logger.error('Error obteniendo información del usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Cambiar contraseña del usuario actual
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Validar nueva contraseña
      const passwordValidation = PasswordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return ApiResponse.validationError(res, passwordValidation.errors.map(error => ({
          field: 'newPassword',
          message: error
        })));
      }

      const connection = await pool.getConnection();

      const [users] = await connection.execute(
        'SELECT password FROM sistema_usuarios WHERE id = ?',
        [user.id]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      const userRecord = users[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, userRecord.password);

      if (!isValidPassword) {
        connection.release();
        return ApiResponse.error(res, 'Contraseña actual incorrecta', 400);
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, user.id]
      );

      connection.release();

      logger.logSecurity('info', 'Contraseña actualizada', {
        userId: user.id,
        email: user.email
      });

      return ApiResponse.success(res, null, 'Contraseña actualizada exitosamente');

    } catch (error) {
      logger.error('Error cambiando contraseña:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Verificar token
  static async verify(req, res) {
    try {
      const user = req.user;

      return ApiResponse.success(res, {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol
        },
        isValid: true
      }, 'Token válido');

    } catch (error) {
      logger.error('Error verificando token:', error);
      return ApiResponse.unauthorized(res, 'Token inválido');
    }
  }

  // Solicitar recuperación de contraseña
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const connection = await pool.getConnection();

      const [users] = await connection.execute(
        'SELECT id, email, nombres FROM sistema_usuarios WHERE email = ? AND activo = 1',
        [email]
      );

      connection.release();

      // Siempre responder exitosamente por seguridad (no revelar si el email existe)
      if (!users || users.length === 0) {
        return ApiResponse.success(res, null, 'Si el email existe, recibirás instrucciones para restablecer tu contraseña');
      }

      const user = users[0];

      // Generar token de recuperación
      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // TODO: Enviar email con el token
      // Por ahora solo logueamos el token para desarrollo
      console.log('🔑 Token de recuperación para', email, ':', resetToken);

      logger.logSecurity('info', 'Solicitud de recuperación de contraseña', {
        userId: user.id,
        email: user.email
      });

      return ApiResponse.success(res, {
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña',
        // En desarrollo, incluir el token para pruebas
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });

    } catch (error) {
      logger.error('Error en forgot password:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Restablecer contraseña con token
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.purpose !== 'password-reset') {
        return ApiResponse.error(res, 'Token inválido para esta operación', 400);
      }

      // Validar nueva contraseña
      const passwordValidation = PasswordUtils.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return ApiResponse.validationError(res, passwordValidation.errors.map(error => ({
          field: 'newPassword',
          message: error
        })));
      }

      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [users] = await connection.execute(
        'SELECT id, email FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [decoded.userId]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      const user = users[0];

      // Hashear nueva contraseña
      const hashedPassword = await PasswordUtils.hashPassword(newPassword);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, decoded.userId]
      );

      connection.release();

      logger.logSecurity('info', 'Contraseña restablecida', {
        userId: user.id,
        email: user.email
      });

      return ApiResponse.success(res, null, 'Contraseña restablecida exitosamente');

    } catch (error) {
      logger.error('Error en reset password:', error);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Token inválido o expirado', 400);
      }

      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = AuthController;