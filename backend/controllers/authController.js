const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class AuthController {
    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return error(res, 'Datos de entrada inválidos', 400, errors.array());
            }

            const { email, password } = req.body;
            const clientIP = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            const connection = await pool.getConnection();

            const [users] = await connection.execute(
                'SELECT * FROM sistema_usuarios WHERE email = ? AND activo = 1',
                [email]
            );

            if (users.length === 0) {
                logger.warn(`Intento de login fallido - Usuario no encontrado: ${email}`, {
                    ip: clientIP,
                    userAgent: userAgent
                });
                connection.release();
                return error(res, 'Credenciales inválidas', 401);
            }

            const user = users[0];

            const isValidPassword = await bcrypt.compare(password, user.password);

            if (!isValidPassword) {
                logger.warn(`Intento de login fallido - Contraseña incorrecta: ${email}`, {
                    ip: clientIP,
                    userAgent: userAgent
                });
                connection.release();
                return error(res, 'Credenciales inválidas', 401);
            }

            const tokenPayload = {
                userId: user.id,
                id: user.id,              // Frontend espera 'id'
                email: user.email,
                role: user.rol,           // Frontend espera 'role'
                rol: user.rol,            // Mantener 'rol' para backend
                nombre: user.nombre
            };

            const accessToken = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '24h' }
            );

            const refreshToken = jwt.sign(
                { userId: user.id, id: user.id, email: user.email },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
            );

        
            await connection.execute(
                'UPDATE sistema_usuarios SET ultimo_acceso = NOW() WHERE id = ?',
                [user.id]
            );

            logger.info(`Login exitoso: ${email}`, {
                userId: user.id,
                rol: user.rol,
                ip: clientIP,
                userAgent: userAgent
            });

            
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            const { password: _, ...userWithoutPassword } = user;

            connection.release();

            
            return res.status(200).json({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        nombre: user.nombre,
                        telefono: user.telefono,
                        role: user.rol,  // Frontend espera 'role'
                        rol: user.rol,   // Backend usa 'rol'
                        activo: user.activo,
                        ultimo_acceso: user.ultimo_acceso
                    }
                },
                token: accessToken,        
                accessToken: accessToken, 
                expiresIn: process.env.JWT_EXPIRE || '24h'
            });

        } catch (err) {
            logger.error('Error en login:', err);
            return error(res, 'Error interno del servidor', 500);
        }
    }

    static async verify(req, res) {
        try {
            const user = req.user;
            
            return success(res, 'Token válido', {
                user: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    role: user.rol,
                    rol: user.rol
                },
                isValid: true
            });

        } catch (err) {
            logger.error('Error verificando token:', err);
            return error(res, 'Token inválido', 401);
        }
    }


    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.cookies;

            if (!refreshToken) {
                return error(res, 'Token de renovación requerido', 401);
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            const connection = await pool.getConnection();
            const [users] = await connection.execute(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND activo = 1',
                [decoded.userId || decoded.id]
            );

            if (users.length === 0) {
                connection.release();
                return error(res, 'Usuario no encontrado', 404);
            }

            const user = users[0];

            // Generar nuevo access token con estructura correcta
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
                { expiresIn: process.env.JWT_EXPIRE || '24h' }
            );

            connection.release();

            logger.info(`Token renovado para usuario: ${user.email}`, {
                userId: user.id
            });

            // CORREGIDO: Estructura compatible con frontend
            return res.status(200).json({
                success: true,
                message: 'Token renovado exitosamente',
                token: newAccessToken,
                accessToken: newAccessToken,
                expiresIn: process.env.JWT_EXPIRE || '24h'
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

            const connection = await pool.getConnection();
            const [users] = await connection.execute(
                'SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at FROM sistema_usuarios WHERE id = ?',
                [user.id]
            );

            connection.release();

            if (users.length === 0) {
                return error(res, 'Usuario no encontrado', 404);
            }

            const userData = users[0];

            return success(res, 'Información del usuario', {
                user: {
                    id: userData.id,
                    email: userData.email,
                    nombre: userData.nombre,
                    telefono: userData.telefono,
                    role: userData.rol,  // Frontend espera 'role'
                    rol: userData.rol,   // Backend usa 'rol'
                    activo: userData.activo,
                    ultimo_acceso: userData.ultimo_acceso,
                    created_at: userData.created_at
                }
            });

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

            const connection = await pool.getConnection();
            const [users] = await connection.execute(
                'SELECT * FROM sistema_usuarios WHERE id = ?',
                [user.id]
            );

            if (users.length === 0) {
                connection.release();
                return error(res, 'Usuario no encontrado', 404);
            }

            const userRecord = users[0];

            const isValidPassword = await bcrypt.compare(currentPassword, userRecord.password);

            if (!isValidPassword) {
                connection.release();
                return error(res, 'Contraseña actual incorrecta', 400);
            }

            const saltRounds = 12;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

            await connection.execute(
                'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
                [hashedNewPassword, user.id]
            );

            connection.release();

            logger.info(`Contraseña actualizada para usuario: ${user.email}`, {
                userId: user.id
            });

            return success(res, 'Contraseña actualizada exitosamente');

        } catch (err) {
            logger.error('Error cambiando contraseña:', err);
            return error(res, 'Error interno del servidor', 500);
        }
    }

    // Registro - CORREGIDO
    static async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return error(res, 'Datos de entrada inválidos', 400, errors.array());
            }

            const { email, password, nombre, telefono, rol = 'supervisor' } = req.body;
            const clientIP = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            const connection = await pool.getConnection();

            const [existingUsers] = await connection.execute(
                'SELECT id FROM sistema_usuarios WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                connection.release();
                return error(res, 'El usuario ya existe con este email', 409);
            }

            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const [result] = await connection.execute(
                `INSERT INTO sistema_usuarios (email, password, nombre, telefono, rol, activo, created_at) 
                 VALUES (?, ?, ?, ?, ?, 1, NOW())`,
                [email, hashedPassword, nombre, telefono, rol]
            );

            const userId = result.insertId;

            logger.info(`Usuario registrado exitosamente: ${email}`, {
                userId: userId,
                rol: rol,
                ip: clientIP,
                userAgent: userAgent
            });

            connection.release();

            return success(res, 'Usuario registrado exitosamente', {
                user: {
                    id: userId,
                    email,
                    nombre,
                    telefono,
                    role: rol,
                    rol: rol,
                    activo: 1
                }
            }, 201);

        } catch (err) {
            logger.error('Error en registro:', err);
            return error(res, 'Error interno del servidor', 500);
        }
    }
}

module.exports = AuthController;