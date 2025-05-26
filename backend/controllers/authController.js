const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const Database = require('../models/Database');

class AuthController {
  // Iniciar sesión
  static async login(req, res) {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Buscar usuario en la base de datos
      const connection = await Database.getConnection();
      
      const [users] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE email = ? AND activo = 1',
        [email]
      );

      if (users.length === 0) {
        logger.warn(`Intento de login fallido - Usuario no encontrado: ${email}`, {
          ip: clientIP,
          userAgent: userAgent
        });
        return error(res, 'Credenciales inválidas', 401);
      }

      const user = users[0];

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        logger.warn(`Intento de login fallido - Contraseña incorrecta: ${email}`, {
          ip: clientIP,
          userAgent: userAgent
        });
        return error(res, 'Credenciales inválidas', 401);
      }

      // Generar tokens
      const accessToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          rol: user.rol,
          nombre: user.nombre
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email 
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Actualizar último acceso
      await connection.execute(
        'UPDATE sistema_usuarios SET ultimo_acceso = NOW() WHERE id = ?',
        [user.id]
      );

      // Registrar log de acceso exitoso
      logger.info(`Login exitoso: ${email}`, {
        userId: user.id,
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

      await connection.end();

      // Retornar respuesta exitosa (sin incluir la contraseña)
      const { password: _, ...userWithoutPassword } = user;
      
      return success(res, 'Login exitoso', {
        user: userWithoutPassword,
        accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });

    } catch (err) {
      logger.error('Error en login:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Renovar token de acceso
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return error(res, 'Token de renovación requerido', 401);
      }

      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Buscar usuario
      const connection = await Database.getConnection();
      const [users] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [decoded.id]
      );

      if (users.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }

      const user = users[0];

      // Generar nuevo access token
      const newAccessToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          rol: user.rol,
          nombre: user.nombre
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      await connection.end();

      logger.info(`Token renovado para usuario: ${user.email}`, {
        userId: user.id
      });

      return success(res, 'Token renovado exitosamente', {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });

    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return error(res, 'Token de renovación inválido', 401);
      }
      
      logger.error('Error renovando token:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Cerrar sesión
  static async logout(req, res) {
    try {
      const user = req.user;

      // Limpiar cookie del refresh token
      res.clearCookie('refreshToken');

      logger.info(`Logout exitoso: ${user.email}`, {
        userId: user.id
      });

      return success(res, 'Logout exitoso');

    } catch (err) {
      logger.error('Error en logout:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener información del usuario actual
  static async me(req, res) {
    try {
      const user = req.user;

      // Buscar información completa del usuario
      const connection = await Database.getConnection();
      const [users] = await connection.execute(
        'SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at FROM sistema_usuarios WHERE id = ?',
        [user.id]
      );

      await connection.end();

      if (users.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }

      return success(res, 'Información del usuario', users[0]);

    } catch (err) {
      logger.error('Error obteniendo información del usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Cambiar contraseña
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Buscar usuario
      const connection = await Database.getConnection();
      const [users] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [user.id]
      );

      if (users.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }

      const userRecord = users[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, userRecord.password);
      
      if (!isValidPassword) {
        return error(res, 'Contraseña actual incorrecta', 400);
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, user.id]
      );

      await connection.end();

      logger.info(`Contraseña actualizada para usuario: ${user.email}`, {
        userId: user.id
      });

      return success(res, 'Contraseña actualizada exitosamente');

    } catch (err) {
      logger.error('Error cambiando contraseña:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = AuthController;