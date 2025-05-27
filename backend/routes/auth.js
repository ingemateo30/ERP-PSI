const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { 
  validate, 
  loginSchema, 
  registerSchema, 
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema 
} = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public
 */
router.post('/register', 
  //rateLimiter.register,
  //validateRegister,
  AuthController.register
);

/**
 * @route POST /api/auth/login
 * @desc Iniciar sesión
 * @access Public
 */
router.post('/login', 
  rateLimiter.login,
  validate(loginSchema),
  AuthController.login
);

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', 
  //authMiddleware,
  AuthController.logout
);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar token JWT
 * @access Private
 */
router.post('/refresh', 
  //rateLimiter.refresh,
  //authMiddleware,
  AuthController.refreshToken
);

/**
 * @route GET /api/auth/verify
 * @desc Verificar token JWT válido
 * @access Private
 */


/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar restablecimiento de contraseña
 * @access Public
 */


/**
 * @route POST /api/auth/reset-password
 * @desc Restablecer contraseña con token
 * @access Public
 */


/**
 * @route POST /api/auth/change-password
 * @desc Cambiar contraseña (usuario autenticado)
 * @access Private
 */
router.post('/change-password', 
  //uthMiddleware,
  //validateAuth.changePassword,
  AuthController.changePassword
);

module.exports = router;