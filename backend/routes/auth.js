// backend/routes/auth.js - VERSIÓN CORREGIDA SIN ERRORES

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Importar middleware básico (sin validaciones complejas por ahora)
const rateLimit = require('express-rate-limit');

// Rate limiters simplificados
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { error: 'Demasiados intentos de registro. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de autenticación básico
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario
    const pool = require('../config/database');
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute(
      'SELECT id, email, nombre, telefono, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
      [decoded.userId || decoded.id]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * @route POST /api/v1/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', 
  registerLimiter,
  AuthController.register
);

/**
 * @route POST /api/v1/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  loginLimiter,
  AuthController.login
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  authenticateToken,
  AuthController.logout
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refrescar token JWT
 * @access Private
 */
router.post('/refresh', 
  AuthController.refreshToken
);

/**
 * @route GET /api/v1/auth/verify
 * @desc Verificar token JWT válido
 * @access Private
 */
router.get('/verify', 
  authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: req.user
      }
    });
  }
);

/**
 * @route GET /api/v1/auth/me
 * @desc Obtener información del usuario actual
 * @access Private
 */
router.get('/me', 
  authenticateToken,
  AuthController.me
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Cambiar contraseña (usuario autenticado)
 * @access Private
 */
router.post('/change-password', 
  authenticateToken,
  AuthController.changePassword
);

module.exports = router;