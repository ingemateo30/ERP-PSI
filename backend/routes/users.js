// backend/routes/users.js - VERSIÓN CORREGIDA Y FUNCIONAL

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Joi = require('joi');

// Middleware
const { authenticateToken, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/responses');
const pool = require('../config/database');

// Función de validación simple usando Joi
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return ApiResponse.validationError(res, error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })));
    }
    next();
  };
};

// Esquemas de validación
const updateProfileSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).trim().required(),
  telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional().allow(''),
  email: Joi.string().email().max(255).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

const createUserSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  nombre: Joi.string().min(2).max(100).required(),
  telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional().allow(''),
  rol: Joi.string().valid('administrador', 'supervisor', 'instalador').default('supervisor')
});

const updateUserSchema = Joi.object({
  email: Joi.string().email().max(255).optional(),
  nombre: Joi.string().min(2).max(100).optional(),
  telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).optional().allow(''),
  rol: Joi.string().valid('administrador', 'supervisor', 'instalador').optional(),
  activo: Joi.boolean().optional()
});

/**
 * @route GET /api/v1/users/profile
 * @desc Obtener perfil del usuario actual
 * @access Private
 */
router.get('/profile', 
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const connection = await pool.getConnection();

      const [users] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ? AND activo = 1
      `, [userId]);

      connection.release();

      if (users.length === 0) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      return ApiResponse.profileSuccess(res, users[0]);

    } catch (error) {
      logger.error('Error obteniendo perfil:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route PUT /api/v1/users/profile
 * @desc Actualizar perfil del usuario actual
 * @access Private
 */
router.put('/profile',
  authenticateToken,
  validate(updateProfileSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { nombre, telefono } = req.body;
      
      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [existingUser] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [userId]
      );

      if (existingUser.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      // Actualizar perfil
      await connection.execute(`
        UPDATE sistema_usuarios 
        SET nombre = ?, telefono = ?, updated_at = NOW() 
        WHERE id = ?
      `, [nombre, telefono || null, userId]);

      // Obtener usuario actualizado
      const [updatedUser] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [userId]);

      connection.release();

      logger.info(`Perfil actualizado: ${req.user.email}`, {
        userId: userId,
        updatedFields: { nombre, telefono }
      });

      return ApiResponse.updated(res, { user: updatedUser[0] }, 'Perfil actualizado exitosamente');

    } catch (error) {
      logger.error('Error actualizando perfil:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route POST /api/v1/users/change-password
 * @desc Cambiar contraseña del usuario actual
 * @access Private
 */
router.post('/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const connection = await pool.getConnection();

      // Obtener usuario con contraseña
      const [users] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [userId]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      const user = users[0];

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        connection.release();
        return ApiResponse.error(res, 'Contraseña actual incorrecta', 400);
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, userId]
      );

      connection.release();

      logger.info(`Contraseña cambiada: ${user.email}`, {
        userId: userId
      });

      return ApiResponse.success(res, null, 'Contraseña actualizada exitosamente');

    } catch (error) {
      logger.error('Error cambiando contraseña:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route GET /api/v1/users
 * @desc Obtener lista de usuarios (solo administradores)
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        rol = '', 
        activo = '' 
      } = req.query;

      const offset = (page - 1) * limit;
      const connection = await pool.getConnection();

      let whereConditions = [];
      let queryParams = [];

      // Filtro por búsqueda (nombre o email)
      if (search) {
        whereConditions.push('(nombre LIKE ? OR email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Filtro por rol
      if (rol) {
        whereConditions.push('rol = ?');
        queryParams.push(rol);
      }

      // Filtro por estado activo
      if (activo !== '') {
        whereConditions.push('activo = ?');
        queryParams.push(activo === 'true' ? 1 : 0);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Consultar usuarios con paginación
      const [users] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at 
        FROM sistema_usuarios 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), parseInt(offset)]);

      // Contar total de usuarios
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total FROM sistema_usuarios ${whereClause}
      `, queryParams);

      connection.release();

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return ApiResponse.success(res, {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }, 'Usuarios obtenidos exitosamente');

    } catch (error) {
      logger.error('Error obteniendo usuarios:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route GET /api/v1/users/:id
 * @desc Obtener usuario por ID (solo administradores)
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await pool.getConnection();

      const [users] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);

      connection.release();

      if (users.length === 0) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      return ApiResponse.success(res, { user: users[0] }, 'Usuario obtenido exitosamente');

    } catch (error) {
      logger.error('Error obteniendo usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route POST /api/v1/users
 * @desc Crear nuevo usuario (solo administradores)
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  requireRole('administrador'),
  validate(createUserSchema),
  async (req, res) => {
    try {
      const { email, password, nombre, telefono, rol } = req.body;
      const createdBy = req.user.id;

      const connection = await pool.getConnection();

      // Verificar si el email ya existe
      const [existingUsers] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'El email ya está registrado');
      }

      // Encriptar contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insertar nuevo usuario
      const [result] = await connection.execute(`
        INSERT INTO sistema_usuarios (email, password, nombre, telefono, rol, activo, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [email, hashedPassword, nombre, telefono || null, rol]);

      // Obtener el usuario creado (sin password)
      const [newUser] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [result.insertId]);

      connection.release();

      logger.info(`Usuario creado: ${email}`, {
        userId: result.insertId,
        createdBy: createdBy,
        rol: rol
      });

      return ApiResponse.created(res, { user: newUser[0] }, 'Usuario creado exitosamente');

    } catch (error) {
      logger.error('Error creando usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route PUT /api/v1/users/:id
 * @desc Actualizar usuario (solo administradores)
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  requireRole('administrador'),
  validate(updateUserSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.user.id;

      const connection = await pool.getConnection();

      // Verificar si el usuario existe
      const [existingUser] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (existingUser.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      // Si se actualiza email, verificar que no exista
      if (updates.email && updates.email !== existingUser[0].email) {
        const [emailCheck] = await connection.execute(
          'SELECT id FROM sistema_usuarios WHERE email = ? AND id != ?',
          [updates.email, id]
        );

        if (emailCheck.length > 0) {
          connection.release();
          return ApiResponse.conflict(res, 'El email ya está registrado por otro usuario');
        }
      }

      // Construir query de actualización dinámicamente
      const updateFields = [];
      const updateValues = [];

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(updates[key]);
        }
      });

      if (updateFields.length === 0) {
        connection.release();
        return ApiResponse.error(res, 'No hay campos para actualizar', 400);
      }

      updateValues.push(id);

      // Actualizar usuario
      await connection.execute(`
        UPDATE sistema_usuarios 
        SET ${updateFields.join(', ')}, updated_at = NOW() 
        WHERE id = ?
      `, updateValues);

      // Obtener usuario actualizado
      const [updatedUser] = await connection.execute(`
        SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);

      connection.release();

      logger.info(`Usuario actualizado: ${updatedUser[0].email}`, {
        userId: id,
        updatedBy: updatedBy,
        updates: updates
      });

      return ApiResponse.updated(res, { user: updatedUser[0] }, 'Usuario actualizado exitosamente');

    } catch (error) {
      logger.error('Error actualizando usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route POST /api/v1/users/:id/change-password
 * @desc Cambiar contraseña de otro usuario (solo administradores)
 * @access Private (Admin)
 */
router.post('/:id/change-password',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const changedBy = req.user.id;

      if (!newPassword || newPassword.length < 8) {
        return ApiResponse.validationError(res, [{
          field: 'newPassword',
          message: 'La nueva contraseña debe tener al menos 8 caracteres'
        }]);
      }

      const connection = await pool.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );

      connection.release();

      logger.info(`Contraseña cambiada para usuario: ${users[0].email}`, {
        userId: id,
        changedBy: changedBy
      });

      return ApiResponse.success(res, null, 'Contraseña actualizada exitosamente');

    } catch (error) {
      logger.error('Error cambiando contraseña de usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route POST /api/v1/users/:id/toggle-status
 * @desc Activar/desactivar usuario (solo administradores)
 * @access Private (Admin)
 */
router.post('/:id/toggle-status',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updatedBy = req.user.id;

      // No permitir que se desactive a sí mismo
      if (id == req.user.id) {
        return ApiResponse.error(res, 'No puedes cambiar tu propio estado', 400);
      }

      const connection = await pool.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email, activo FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      const currentStatus = users[0].activo;
      const newStatus = currentStatus ? 0 : 1;

      // Actualizar estado
      await connection.execute(
        'UPDATE sistema_usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );

      connection.release();

      const action = newStatus ? 'activado' : 'desactivado';
      
      logger.info(`Usuario ${action}: ${users[0].email}`, {
        userId: id,
        updatedBy: updatedBy,
        newStatus: newStatus
      });

      return ApiResponse.success(res, {
        activo: newStatus === 1
      }, `Usuario ${action} exitosamente`);

    } catch (error) {
      logger.error('Error cambiando estado de usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc Eliminar usuario (soft delete - cambiar a inactivo)
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBy = req.user.id;

      // No permitir auto-eliminación
      if (id == req.user.id) {
        return ApiResponse.error(res, 'No puedes eliminar tu propia cuenta', 400);
      }

      const connection = await pool.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Usuario no encontrado');
      }

      // Desactivar usuario en lugar de eliminarlo físicamente
      await connection.execute(
        'UPDATE sistema_usuarios SET activo = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      connection.release();

      logger.info(`Usuario eliminado (desactivado): ${users[0].email}`, {
        userId: id,
        deletedBy: deletedBy
      });

      return ApiResponse.success(res, null, 'Usuario eliminado exitosamente');

    } catch (error) {
      logger.error('Error eliminando usuario:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

/**
 * @route GET /api/v1/users/stats
 * @desc Obtener estadísticas de usuarios
 * @access Private (Admin)
 */
router.get('/stats',
  authenticateToken,
  requireRole('administrador'),
  async (req, res) => {
    try {
      const connection = await pool.getConnection();

      // Estadísticas generales
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_usuarios,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as usuarios_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as usuarios_inactivos,
          SUM(CASE WHEN rol = 'administrador' THEN 1 ELSE 0 END) as administradores,
          SUM(CASE WHEN rol = 'supervisor' THEN 1 ELSE 0 END) as supervisores,
          SUM(CASE WHEN rol = 'instalador' THEN 1 ELSE 0 END) as instaladores
        FROM sistema_usuarios
      `);

      // Usuarios creados en los últimos 30 días
      const [recentUsers] = await connection.execute(`
        SELECT COUNT(*) as usuarios_recientes
        FROM sistema_usuarios 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      // Último acceso promedio
      const [lastAccess] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN ultimo_acceso >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as activos_ultima_semana,
          COUNT(CASE WHEN ultimo_acceso >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as activos_ultimo_mes
        FROM sistema_usuarios 
        WHERE ultimo_acceso IS NOT NULL
      `);

      connection.release();

      return ApiResponse.success(res, {
        ...stats[0],
        usuarios_recientes: recentUsers[0].usuarios_recientes,
        actividad: lastAccess[0]
      }, 'Estadísticas de usuarios obtenidas exitosamente');

    } catch (error) {
      logger.error('Error obteniendo estadísticas de usuarios:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
);

module.exports = router;