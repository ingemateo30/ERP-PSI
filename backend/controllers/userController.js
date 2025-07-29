// backend/controllers/usersController.js - CONTROLADOR COMPLETO DE USUARIOS

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class UsersController {

  // Obtener todos los usuarios (con filtros)
  static async getUsers(req, res) {
    try {
      const { search, rol, activo, page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;

      const connection = await pool.getConnection();

      console.log("page:", page, "limit:", limit);
     

      let query = `
        SELECT 
          id, email, nombre, telefono, rol, activo, ultimo_acceso, 
          created_at, updated_at
        FROM sistema_usuarios
      `;

      let whereConditions = [];
      let params = [];

      // Filtros
      if (search) {
        whereConditions.push('(nombre LIKE ? OR email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (rol) {
        whereConditions.push('rol = ?');
        params.push(rol);
      }

      if (activo !== undefined) {
        whereConditions.push('activo = ?');
        params.push(activo === 'true' ? 1 : 0);
      }

      if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Ordenamiento
      const validSorts = ['nombre', 'email', 'rol', 'created_at', 'ultimo_acceso'];
      const validOrders = ['ASC', 'DESC'];

      const finalSort = validSorts.includes(sort) ? sort : 'created_at';
      const finalOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

      query += ` ORDER BY ${finalSort} ${finalOrder}`;

      // Paginación
      const offset = (parseInt(page) - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [users] = await connection.execute(query, params);

      // Contar total para paginación
      let countQuery = 'SELECT COUNT(*) as total FROM sistema_usuarios';
      let countParams = [];

      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
        countParams = params.slice(0, -2); // Remover LIMIT y OFFSET
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;

      connection.release();

      // Calcular paginación
      const totalPages = Math.ceil(total / parseInt(limit));
      const currentPage = parseInt(page);

      return success(res, 'Usuarios obtenidos exitosamente', {
        users,
        pagination: {
          currentPage,
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      });

    } catch (err) {
      logger.error('Error obteniendo usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener usuario por ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      const [users] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, ultimo_acceso, 
          created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);

      connection.release();

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

      const connection = await pool.getConnection();

      // Verificar si el email ya existe
      const [existingUsers] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        connection.release();
        return error(res, 'Ya existe un usuario con ese correo electrónico', 400);
      }

      // Verificar permisos para crear usuarios con ciertos roles
      const userRole = req.user.rol;

      if (rol === 'administrador' && userRole !== 'administrador') {
        connection.release();
        return error(res, 'Solo los administradores pueden crear otros administradores', 403);
      }

      if (userRole === 'supervisor' && (rol === 'administrador' || rol === 'supervisor')) {
        connection.release();
        return error(res, 'Los supervisores solo pueden crear instaladores', 403);
      }

      // Encriptar contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Crear usuario
      const [result] = await connection.execute(`
        INSERT INTO sistema_usuarios (
          email, password, nombre, telefono, rol, activo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [email, hashedPassword, nombre, telefono || null, rol]);

      // Obtener usuario creado (sin password)
      const [newUser] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [result.insertId]);

      connection.release();

      logger.info('Usuario creado exitosamente', {
        userId: result.insertId,
        email: email,
        nombre: nombre,
        rol: rol,
        createdBy: req.user.id
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

      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [existingUsers] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (existingUsers.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      const existingUser = existingUsers[0];

      // Verificar permisos
      const currentUserRole = req.user.rol;
      const currentUserId = req.user.id;

      // No permitir que un usuario se desactive a sí mismo
      if (currentUserId == id && activo === false) {
        connection.release();
        return error(res, 'No puedes desactivar tu propia cuenta', 400);
      }

      // Verificar permisos de rol
      if (rol && rol !== existingUser.rol) {
        if (currentUserRole !== 'administrador') {
          connection.release();
          return error(res, 'Solo los administradores pueden cambiar roles', 403);
        }

        if (rol === 'administrador' && currentUserRole !== 'administrador') {
          connection.release();
          return error(res, 'Solo los administradores pueden asignar el rol de administrador', 403);
        }
      }

      // Verificar que el email no esté en uso por otro usuario
      if (email && email !== existingUser.email) {
        const [emailCheck] = await connection.execute(
          'SELECT id FROM sistema_usuarios WHERE email = ? AND id != ?',
          [email, id]
        );

        if (emailCheck.length > 0) {
          connection.release();
          return error(res, 'Ya existe otro usuario con ese correo electrónico', 400);
        }
      }

      // Actualizar usuario
      await connection.execute(`
        UPDATE sistema_usuarios 
        SET email = ?, nombre = ?, telefono = ?, rol = ?, activo = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        email || existingUser.email,
        nombre || existingUser.nombre,
        telefono || existingUser.telefono,
        rol || existingUser.rol,
        activo !== undefined ? (activo ? 1 : 0) : existingUser.activo,
        id
      ]);

      // Obtener usuario actualizado
      const [updatedUser] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, ultimo_acceso, 
          created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);

      connection.release();

      logger.info('Usuario actualizado exitosamente', {
        userId: id,
        updatedBy: req.user.id,
        changes: { email, nombre, telefono, rol, activo }
      });

      return success(res, 'Usuario actualizado exitosamente', updatedUser[0]);

    } catch (err) {
      logger.error('Error actualizando usuario:', err);
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

      const { id } = req.params;
      const { newPassword } = req.body;

      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [users] = await connection.execute(
        'SELECT id, rol FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Verificar permisos (solo admin puede cambiar password de otros, o el propio usuario)
      if (req.user.id != id && req.user.rol !== 'administrador') {
        connection.release();
        return error(res, 'No tienes permisos para cambiar la contraseña de este usuario', 403);
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

      logger.info('Contraseña cambiada exitosamente', {
        userId: id,
        changedBy: req.user.id
      });

      return success(res, 'Contraseña actualizada exitosamente');

    } catch (err) {
      logger.error('Error cambiando contraseña:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Activar/desactivar usuario
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [users] = await connection.execute(
        'SELECT id, activo, email FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      const user = users[0];

      // No permitir que un usuario se desactive a sí mismo
      if (req.user.id == id) {
        connection.release();
        return error(res, 'No puedes cambiar el estado de tu propia cuenta', 400);
      }

      // Solo administradores pueden cambiar estados
      if (req.user.rol !== 'administrador') {
        connection.release();
        return error(res, 'Solo los administradores pueden cambiar el estado de usuarios', 403);
      }

      const newStatus = user.activo ? 0 : 1;

      await connection.execute(
        'UPDATE sistema_usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );

      connection.release();

      logger.info('Estado de usuario cambiado', {
        userId: id,
        newStatus: newStatus,
        changedBy: req.user.id
      });

      return success(res, `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, {
        activo: newStatus === 1
      });

    } catch (err) {
      logger.error('Error cambiando estado de usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Eliminar usuario
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Verificar que el usuario existe
      const [users] = await connection.execute(
        'SELECT id, email, rol FROM sistema_usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      const user = users[0];

      // No permitir que un usuario se elimine a sí mismo
      if (req.user.id == id) {
        connection.release();
        return error(res, 'No puedes eliminar tu propia cuenta', 400);
      }

      // Solo administradores pueden eliminar usuarios
      if (req.user.rol !== 'administrador') {
        connection.release();
        return error(res, 'Solo los administradores pueden eliminar usuarios', 403);
      }

      // Verificar si el usuario tiene datos asociados
      const [associations] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM clientes WHERE created_by = ?) as clientes,
          (SELECT COUNT(*) FROM facturas WHERE created_by = ?) as facturas,
          (SELECT COUNT(*) FROM logs_sistema WHERE usuario_id = ?) as logs
      `, [id, id, id]);

      const hasAssociations = associations[0].clientes > 0 ||
        associations[0].facturas > 0 ||
        associations[0].logs > 0;

      if (hasAssociations) {
        connection.release();
        return error(res, 'No se puede eliminar el usuario porque tiene datos asociados. Considera desactivarlo en su lugar.', 400);
      }

      // Eliminar usuario
      await connection.execute('DELETE FROM sistema_usuarios WHERE id = ?', [id]);

      connection.release();

      logger.info('Usuario eliminado exitosamente', {
        userId: id,
        userEmail: user.email,
        deletedBy: req.user.id
      });

      return success(res, 'Usuario eliminado exitosamente');

    } catch (err) {
      logger.error('Error eliminando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener perfil del usuario actual
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const connection = await pool.getConnection();

      const [users] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, ultimo_acceso, 
          created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [userId]);

      if (users.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Obtener estadísticas del usuario
      const [stats] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM clientes WHERE created_by = ?) as clientes_creados,
          (SELECT COUNT(*) FROM facturas WHERE created_by = ?) as facturas_creadas,
          (SELECT COUNT(*) FROM logs_sistema WHERE usuario_id = ?) as acciones_registradas,
          (SELECT COUNT(*) FROM sistema_usuarios WHERE rol = ?) as usuarios_mismo_rol
      `, [userId, userId, userId, req.user.rol]);

      connection.release();

      const userProfile = {
        ...users[0],
        estadisticas: stats[0]
      };

      return success(res, 'Perfil obtenido exitosamente', userProfile);

    } catch (err) {
      logger.error('Error obteniendo perfil:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar perfil del usuario actual
  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { nombre, telefono, email } = req.body;

      const connection = await pool.getConnection();

      // Verificar que el email no esté en uso por otro usuario
      if (email && email !== req.user.email) {
        const [emailCheck] = await connection.execute(
          'SELECT id FROM sistema_usuarios WHERE email = ? AND id != ?',
          [email, userId]
        );

        if (emailCheck.length > 0) {
          connection.release();
          return error(res, 'Ya existe otro usuario con ese correo electrónico', 400);
        }
      }

      // Actualizar perfil
      await connection.execute(`
        UPDATE sistema_usuarios 
        SET nombre = ?, telefono = ?, email = ?, updated_at = NOW()
        WHERE id = ?
      `, [nombre, telefono || null, email, userId]);

      // Obtener perfil actualizado
      const [updatedUser] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, ultimo_acceso, 
          created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [userId]);

      connection.release();

      logger.info('Perfil actualizado exitosamente', {
        userId: userId,
        changes: { nombre, telefono, email }
      });

      return success(res, 'Perfil actualizado exitosamente', updatedUser[0]);

    } catch (err) {
      logger.error('Error actualizando perfil:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Cambiar contraseña propia
  static async changeOwnPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      const connection = await pool.getConnection();

      // Obtener contraseña actual
      const [users] = await connection.execute(
        'SELECT password FROM sistema_usuarios WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);

      if (!isValidPassword) {
        connection.release();
        return error(res, 'La contraseña actual es incorrecta', 400);
      }

      // Encriptar nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
      );

      connection.release();

      logger.info('Usuario cambió su propia contraseña', {
        userId: userId
      });

      return success(res, 'Contraseña actualizada exitosamente');

    } catch (err) {
      logger.error('Error cambiando contraseña propia:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener estadísticas de usuarios
  static async getUserStats(req, res) {
    try {
      const connection = await pool.getConnection();

      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_usuarios,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as usuarios_activos,
          SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as usuarios_inactivos,
          SUM(CASE WHEN rol = 'administrador' THEN 1 ELSE 0 END) as administradores,
          SUM(CASE WHEN rol = 'supervisor' THEN 1 ELSE 0 END) as supervisores,
          SUM(CASE WHEN rol = 'instalador' THEN 1 ELSE 0 END) as instaladores,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as usuarios_recientes,
          SUM(CASE WHEN ultimo_acceso >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as usuarios_activos_semana
        FROM sistema_usuarios
      `);

      connection.release();

      return success(res, 'Estadísticas obtenidas exitosamente', stats[0]);

    } catch (err) {
      logger.error('Error obteniendo estadísticas de usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = UsersController;