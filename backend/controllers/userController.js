const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const Database = require('../models/Database');

class UserController {
  // Obtener todos los usuarios
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '', rol = '', activo = '' } = req.query;
      const offset = (page - 1) * limit;

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

      const connection = await Database.getConnection();

      // Consultar usuarios con paginación
      const [users] = await connection.execute(
        `SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at 
         FROM sistema_usuarios 
         ${whereClause}
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), parseInt(offset)]
      );

      // Contar total de usuarios
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM sistema_usuarios ${whereClause}`,
        queryParams
      );

      await connection.end();

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return success(res, 'Lista de usuarios obtenida exitosamente', {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (err) {
      logger.error('Error obteniendo usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener un usuario por ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const connection = await Database.getConnection();
      const [users] = await connection.execute(
        'SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      await connection.end();

      if (users.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }

      return success(res, 'Usuario obtenido exitosamente', users[0]);

    } catch (err) {
      logger.error('Error obteniendo usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Crear nuevo usuario
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const { email, password, nombre, telefono, rol } = req.body;
      const createdBy = req.user.id;

      const connection = await Database.getConnection();

      // Verificar si el email ya existe
      const [existingUsers] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        await connection.end();
        return error(res, 'El email ya está registrado', 400);
      }

      // Encriptar contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insertar nuevo usuario
      const [result] = await connection.execute(
        `INSERT INTO sistema_usuarios (email, password, nombre, telefono, rol, activo, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [email, hashedPassword, nombre, telefono || null, rol]
      );

      // Obtener el usuario creado
      const [newUser] = await connection.execute(
        'SELECT id, email, nombre, telefono, rol, activo, created_at FROM sistema_usuarios WHERE id = ?',
        [result.insertId]
      );

      await connection.end();

      logger.info(`Usuario creado: ${email}`, {
        userId: result.insertId,
        createdBy: createdBy,
        rol: rol
      });

      return success(res, 'Usuario creado exitosamente', newUser[0], 201);

    } catch (err) {
      logger.error('Error creando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar usuario
  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const { id } = req.params;
      const { email, nombre, telefono, rol, activo } = req.body;
      const updatedBy = req.user.id;

      const connection = await Database.getConnection();

      // Verificar si el usuario existe
      const [existingUser] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (existingUser.length === 0) {
        await connection.end();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Verificar si el email ya está en uso por otro usuario
      if (email !== existingUser[0].email) {
        const [emailCheck] = await connection.execute(
          'SELECT id FROM sistema_usuarios WHERE email = ? AND id != ?',
          [email, id]
        );

        if (emailCheck.length > 0) {
          await connection.end();
          return error(res, 'El email ya está registrado por otro usuario', 400);
        }
      }

      // Actualizar usuario
      await connection.execute(
        `UPDATE sistema_usuarios 
         SET email = ?, nombre = ?, telefono = ?, rol = ?, activo = ?, updated_at = NOW() 
         WHERE id = ?`,
        [email, nombre, telefono || null, rol, activo ? 1 : 0, id]
      );

      // Obtener usuario actualizado
      const [updatedUser] = await connection.execute(
        'SELECT id, email, nombre, telefono, rol, activo, ultimo_acceso, created_at, updated_at FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      await connection.end();

      logger.info(`Usuario actualizado: ${email}`, {
        userId: id,
        updatedBy: updatedBy
      });

      return success(res, 'Usuario actualizado exitosamente', updatedUser[0]);

    } catch (err) {
      logger.error('Error actualizando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Cambiar contraseña de otro usuario (solo administradores)
  static async changeUserPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const { id } = req.params;
      const { newPassword } = req.body;
      const changedBy = req.user.id;

      // Solo administradores pueden cambiar contraseñas de otros usuarios
      if (req.user.rol !== 'administrador') {
        return error(res, 'No tienes permisos para realizar esta acción', 403);
      }

      const connection = await Database.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        await connection.end();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );

      await connection.end();

      logger.info(`Contraseña cambiada para usuario: ${users[0].email}`, {
        userId: id,
        changedBy: changedBy
      });

      return success(res, 'Contraseña actualizada exitosamente');

    } catch (err) {
      logger.error('Error cambiando contraseña de usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Activar/Desactivar usuario
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const updatedBy = req.user.id;

      // Solo administradores pueden cambiar el estado de usuarios
      if (req.user.rol !== 'administrador') {
        return error(res, 'No tienes permisos para realizar esta acción', 403);
      }

      const connection = await Database.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email, activo FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        await connection.end();
        return error(res, 'Usuario no encontrado', 404);
      }

      const currentStatus = users[0].activo;
      const newStatus = currentStatus ? 0 : 1;

      // Actualizar estado
      await connection.execute(
        'UPDATE sistema_usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );

      await connection.end();

      const action = newStatus ? 'activado' : 'desactivado';
      
      logger.info(`Usuario ${action}: ${users[0].email}`, {
        userId: id,
        updatedBy: updatedBy,
        newStatus: newStatus
      });

      return success(res, `Usuario ${action} exitosamente`, {
        activo: newStatus === 1
      });

    } catch (err) {
      logger.error('Error cambiando estado de usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Eliminar usuario (soft delete - cambiar a inactivo)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const deletedBy = req.user.id;

      // Solo administradores pueden eliminar usuarios
      if (req.user.rol !== 'administrador') {
        return error(res, 'No tienes permisos para realizar esta acción', 403);
      }

      // No permitir auto-eliminación
      if (id == req.user.id) {
        return error(res, 'No puedes eliminar tu propia cuenta', 400);
      }

      const connection = await Database.getConnection();

      // Verificar si el usuario existe
      const [users] = await connection.execute(
        'SELECT email FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        await connection.end();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Desactivar usuario en lugar de eliminarlo físicamente
      await connection.execute(
        'UPDATE sistema_usuarios SET activo = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      await connection.end();

      logger.info(`Usuario eliminado (desactivado): ${users[0].email}`, {
        userId: id,
        deletedBy: deletedBy
      });

      return success(res, 'Usuario eliminado exitosamente');

    } catch (err) {
      logger.error('Error eliminando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener estadísticas de usuarios
  static async getUserStats(req, res) {
    try {
      const connection = await Database.getConnection();

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

      await connection.end();

      return success(res, 'Estadísticas de usuarios obtenidas exitosamente', {
        ...stats[0],
        usuarios_recientes: recentUsers[0].usuarios_recientes,
        actividad: lastAccess[0]
      });

    } catch (err) {
      logger.error('Error obteniendo estadísticas de usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = UserController;