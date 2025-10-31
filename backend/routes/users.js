// backend/routes/users.js - RUTAS COMPLETAS DE USUARIOS

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

// Controlador y middleware
const UsersController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { verificarRol } = require('../middleware/roleAuth');

// Validaciones
const userValidation = {
  create: [
    body('email')
      .isEmail()
      .withMessage('Debe ser un correo electrónico válido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    body('nombre')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('telefono')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('El teléfono no puede tener más de 20 caracteres'),
    body('rol')
      .isIn(['administrador', 'supervisor', 'instalador'])
      .withMessage('El rol debe ser administrador, supervisor o instalador')
  ],
  
  update: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un correo electrónico válido')
      .normalizeEmail(),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('telefono')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('El teléfono no puede tener más de 20 caracteres'),
    body('rol')
      .optional()
      .isIn(['administrador', 'supervisor', 'instalador'])
      .withMessage('El rol debe ser administrador, supervisor o instalador'),
    body('activo')
      .optional()
      .isBoolean()
      .withMessage('Activo debe ser verdadero o falso')
  ],
  
  profile: [
    body('email')
      .optional()
      .isEmail()
      .withMessage('Debe ser un correo electrónico válido')
      .normalizeEmail(),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('telefono')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('El teléfono no puede tener más de 20 caracteres')
  ],
  
  changePassword: [
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número')
  ],
  
  changeOwnPassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('La contraseña actual es requerida'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    body('confirmNewPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        return true;
      })
  ],
  
  id: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('El ID debe ser un número entero válido')
  ]
};

// ==========================================
// RUTAS PÚBLICAS (solo para administradores)
// ==========================================

/**
 * @route GET /api/v1/users
 * @desc Obtener lista de usuarios con filtros y paginación
 * @access Private (Admin/Supervisor)
 * @params ?search, ?rol, ?activo, ?page, ?limit, ?sort, ?order
 */
router.get('/',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  UsersController.getUsers
);

/**
 * @route GET /api/v1/users/stats
 * @desc Obtener estadísticas de usuarios
 * @access Private (Admin/Supervisor)
 */
router.get('/stats',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  UsersController.getUserStats
);

/**
 * @route GET /api/v1/users/profile
 * @desc Obtener perfil del usuario actual
 * @access Private (Todos los roles)
 */
router.get('/profile',
  authenticateToken,
  UsersController.getProfile
);

/**
 * @route PUT /api/v1/users/profile
 * @desc Actualizar perfil del usuario actual
 * @access Private (Todos los roles)
 */
router.put('/profile',
  authenticateToken,
  userValidation.profile,
  UsersController.updateProfile
);

/**
 * @route POST /api/v1/users/profile/change-password
 * @desc Cambiar contraseña propia
 * @access Private (Todos los roles)
 */
router.post('/profile/change-password',
  authenticateToken,
  userValidation.changeOwnPassword,
  UsersController.changeOwnPassword
);

/**
 * @route GET /api/v1/users/:id
 * @desc Obtener usuario por ID
 * @access Private (Admin/Supervisor)
 */
router.get('/:id',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  userValidation.id,
  UsersController.getUserById
);

/**
 * @route POST /api/v1/users
 * @desc Crear nuevo usuario
 * @access Private (Admin/Supervisor)
 */
router.post('/',
  authenticateToken,
  requireRole('administrador', 'supervisor'),
  userValidation.create,
  UsersController.createUser
);

/**
 * @route PUT /api/v1/users/:id
 * @desc Actualizar usuario
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  verificarRol('administrador'),
  userValidation.id,
  userValidation.update,
  UsersController.updateUser
);

/**
 * @route POST /api/v1/users/:id/change-password
 * @desc Cambiar contraseña de un usuario específico
 * @access Private (Admin)
 */
router.post('/:id/change-password',
  authenticateToken,
  verificarRol('administrador'),
  userValidation.id,
  userValidation.changePassword,
  UsersController.changePassword
);

/**
 * @route POST /api/v1/users/:id/toggle-status
 * @desc Activar/desactivar usuario
 * @access Private (Admin)
 */
router.post('/:id/toggle-status',
  authenticateToken,
  verificarRol('administrador'),
  userValidation.id,
  UsersController.toggleUserStatus
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Eliminar usuario
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  verificarRol('administrador'),
  userValidation.id,
  UsersController.deleteUser
);

module.exports = router;