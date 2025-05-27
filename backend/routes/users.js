
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

/**
 * @route GET /api/users/profile
 * @desc Obtener perfil del usuario actual
 * @access Private
 */

router.get('/profile', 
  authMiddleware,
  userController.getProfile
);

/**
 * @route PUT /api/users/profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */

router.put('/profile', 
  authMiddleware,
  rateLimiter.updateProfile,
  validateUser.updateProfile,
  userController.updateProfile
);

/**
 * @route GET /api/users/:id
 * @desc Obtener usuario por ID (solo administradores)
 * @access Private (Admin)
 */

router.get('/:id', 
  authMiddleware,
  validateUser.isAdmin,
  userController.getUserById
);

/**
 * @route GET /api/users
 * @desc Obtener lista de usuarios (solo administradores)
 * @access Private (Admin)
 */

router.get('/', 
  authMiddleware,
  validateUser.isAdmin,
  userController.getAllUsers
);

/**
 * @route PUT /api/users/:id
 * @desc Actualizar usuario (solo administradores)
 * @access Private (Admin)
 */

router.put('/:id', 
  authMiddleware,
  validateUser.isAdmin,
  validateUser.updateUser,
  userController.updateUser
);

/**
 * @route DELETE /api/users/:id
 * @desc Eliminar usuario (solo administradores)
 * @access Private (Admin)
 */

router.delete('/:id', 
  authMiddleware,
  validateUser.isAdmin,
  userController.deleteUser
);

/**
 * @route POST /api/users/:id/toggle-status
 * @desc Activar/desactivar usuario (solo administradores)
 * @access Private (Admin)
 */

router.post('/:id/toggle-status', 
  authMiddleware,
  validateUser.isAdmin,
  userController.toggleUserStatus
);

/**
 * @route DELETE /api/users/profile
 * @desc Eliminar cuenta propia
 * @access Private
 */

router.delete('/profile', 
  authMiddleware,
  validateUser.deleteAccount,
  userController.deleteOwnAccount
);

/**
 * @route GET /api/users/search/:query
 * @desc Buscar usuarios (solo administradores)
 * @access Private (Admin)
 */

router.get('/search/:query', 
  authMiddleware,
  validateUser.isAdmin,
  userController.searchUsers
);

module.exports = router;
