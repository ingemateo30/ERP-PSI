// backend/controllers/authController.js - VERSIÓN CORREGIDA Y COMPLETA

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/responses');
const PasswordUtils = require('../utils/password');
const pool = require('../config/database');

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
                [email.toLowerCase().trim()]
            );

            if (users.length === 0) {
                logger.logSecurity('warn', 'Intento de login fallido - Usuario no encontrado', {
                    email: email,
                    ip: clientIP,
                    userAgent: userAgent
                });
                connection.release();
                return ApiResponse.unauthorized(res, 'Credenciales inválidas');
            }

            const user = users[0];

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                logger.logSecurity('warn', 'Intento de login fallido - Contraseña incorrecta', {
                    email: email,
                    userId: user.id,
                    ip: clientIP,
                    userAgent: userAgent
                });
                connection.release();
                return ApiResponse.unauthorized(res, 'Credenciales inválidas');
            }

            // Generar tokens
            const tokenPayload = {
                userId: user.id,
                id: user.id,
                email: user.email,
                role: user.rol,
                rol: user.rol,
                nombre: user.nombre
            };

            const accessToken = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRE || '24h',
                    issuer: 'isp-system',
                    audience: 'isp-users'
                }
            );

            const refreshToken = jwt.sign(
                {
                    userId: user.id,
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_REFRESH_SECRET,
                {
                    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
                    issuer: 'isp-system',
                    audience: 'isp-users'
                }
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
                // Objeto user (exactamente como lo espera ApiResponse.loginSuccess)
                {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    telefono: user.telefono,
                    rol: user.rol,
                    ultimo_acceso: user.ultimo_acceso
                },
                // Objeto tokens (exactamente como lo espera ApiResponse.loginSuccess)
                {
                    accessToken,
                    refreshToken,
                    expiresIn: process.env.JWT_EXPIRE || '24h'
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

            // Validar fortaleza de contraseña
            const passwordValidation = PasswordUtils.validatePassword(password);
            if (!passwordValidation.isValid) {
                return ApiResponse.validationError(res, passwordValidation.errors.map(error => ({
                    field: 'password',
                    message: error
                })));
            }

            const connection = await pool.getConnection();

            // Verificar si el email ya existe
            const [existingUsers] = await connection.execute(
                'SELECT id FROM sistema_usuarios WHERE email = ?',
                [email.toLowerCase().trim()]
            );

            if (existingUsers.length > 0) {
                connection.release();
                return ApiResponse.conflict(res, 'El email ya está registrado');
            }

            // Encriptar contraseña
            const hashedPassword = await PasswordUtils.hashPassword(password);

            // Insertar nuevo usuario
            const [result] = await connection.execute(`
                INSERT INTO sistema_usuarios (email, password, nombre, telefono, rol, activo, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
            `, [
                email.toLowerCase().trim(),
                hashedPassword,
                nombre.trim(),
                telefono || null,
                rol
            ]);

            // Obtener usuario creado
            const [newUser] = await connection.execute(`
                SELECT id, email, nombre, telefono, rol, activo, created_at
                FROM sistema_usuarios 
                WHERE id = ?
            `, [result.insertId]);

            connection.release();

            logger.logAuth('info', 'Usuario registrado exitosamente', {
                userId: result.insertId,
                email: email,
                rol: rol,
                ip: clientIP,
                userAgent: userAgent
            });

            return ApiResponse.created(res, {
                user: newUser[0]
            }, 'Usuario registrado exitosamente');

        } catch (error) {
            logger.error('Error en registro:', error);
            return ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    }

    // Renovar token de acceso
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.cookies;

            if (!refreshToken) {
                return ApiResponse.unauthorized(res, 'Token de renovación requerido');
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
                issuer: 'isp-system',
                audience: 'isp-users'
            });

            const connection = await pool.getConnection();

            const [users] = await connection.execute(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND activo = 1',
                [decoded.userId || decoded.id]
            );

            if (users.length === 0) {
                connection.release();
                return ApiResponse.unauthorized(res, 'Usuario no encontrado');
            }

            const user = users[0];

            // Generar nuevo access token
            const newAccessToken = jwt.sign(
                {
                    userId: user.id,
                    id: user.id,
                    email: user.email,
                    role: user.rol,
                    rol: user.rol,
                    nombre: user.nombre
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRE || '24h',
                    issuer: 'isp-system',
                    audience: 'isp-users'
                }
            );

            // Generar nuevo refresh token
            const newRefreshToken = jwt.sign(
                {
                    userId: user.id,
                    id: user.id,
                    email: user.email
                },
                process.env.JWT_REFRESH_SECRET,
                {
                    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
                    issuer: 'isp-system',
                    audience: 'isp-users'
                }
            );

            connection.release();

            // Actualizar cookie
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            logger.logAuth('info', 'Token renovado exitosamente', {
                userId: user.id,
                email: user.email
            });

            return ApiResponse.tokenRefreshed(res, {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: process.env.JWT_EXPIRE || '24h'
            });

        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return ApiResponse.unauthorized(res, 'Token de renovación inválido');
            }

            logger.error('Error renovando token:', error);
            return ApiResponse.error(res, 'Error interno del servidor', 500);
        }
    }

    // Cerrar sesión
    static async logout(req, res) {
        try {
            const user = req.user;

            // Limpiar cookie
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
                SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at
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
                'SELECT * FROM sistema_usuarios WHERE id = ?',
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
                    telefono: user.telefono,
                    role: user.rol,
                    rol: user.rol,
                    activo: user.activo
                },
                isValid: true
            }, 'Token válido');

        } catch (error) {
            logger.error('Error verificando token:', error);
            return ApiResponse.unauthorized(res, 'Token inválido');
        }
    }
}

module.exports = AuthController;