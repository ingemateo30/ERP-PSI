const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateAuth, validateLogin, validateRegister } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', 
  rateLimiter.register,
  validateRegister,
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  rateLimiter.login,
  validateLogin,
  authController.login
);

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  authMiddleware,
  authController.logout
);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar token JWT
 * @access Private
 */
router.post('/refresh', 
  rateLimiter.refresh,
  authMiddleware,
  authController.refreshToken
);

/**
 * @route GET /api/auth/verify
 * @desc Verificar token JWT válido
 * @access Private
 */
router.get('/verify', 
  authMiddleware,
  authController.verifyToken
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar restablecimiento de contraseña
 * @access Public
 */
router.post('/forgot-password', 
  rateLimiter.forgotPassword,
  validateAuth.email,
  authController.forgotPassword
);

/**
 * @route POST /api/auth/reset-password
 * @desc Restablecer contraseña con token
 * @access Public
 */
router.post('/reset-password', 
  rateLimiter.resetPassword,
  validateAuth.resetPassword,
  authController.resetPassword
);

/**
 * @route POST /api/auth/change-password
 * @desc Cambiar contraseña (usuario autenticado)
 * @access Private
 */
router.post('/change-password', 
  authMiddleware,
  validateAuth.changePassword,
  authController.changePassword
);

module.exports = router;