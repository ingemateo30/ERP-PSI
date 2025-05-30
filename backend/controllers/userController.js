// backend/controllers/usersController.js - CONTROLADOR COMPLETO

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class UsersController {
  
  // ✅ OBTENER TODOS LOS USUARIOS
  static async getUsers(req, res) {
    try {
      console.log('🔍 BACKEND - getUsers llamado');
      console.log('🔍 BACKEND - Query params:', req.query);
      console.log('🔍 BACKEND - Usuario actual:', req.user);
      
      const { search, rol, activo, page = 1, limit = 10 } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios
      `;
      
      let countQuery = 'SELECT COUNT(*) as total FROM sistema_usuarios';
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
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }
      
      // Ordenación
      query += ' ORDER BY created_at DESC';
      
      // Paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
      
      console.log('🔍 BACKEND - Query SQL:', query);
      console.log('🔍 BACKEND - Params:', params);
      
      // Ejecutar consultas
      const [users] = await connection.execute(query, params);
      const [countResult] = await connection.execute(countQuery, params);
      
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / parseInt(limit));
      
      console.log('🔍 BACKEND - Usuarios encontrados:', users.length);
      
      connection.release();
      
      // Estructura de respuesta con paginación
      const response = {
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ BACKEND - Enviando respuesta:', {
        success: response.success,
        dataLength: response.data.length,
        pagination: response.pagination
      });
      
      return res.json(response);
      
    } catch (err) {
      console.error('❌ BACKEND - Error obteniendo usuarios:', err);
      logger.error('Error obteniendo usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ OBTENER USUARIO POR ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 BACKEND - getUserById:', id);
      
      const connection = await pool.getConnection();
      
      const [users] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);
      
      connection.release();
      
      if (users.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }
      
      return success(res, 'Usuario obtenido exitosamente', users[0]);
      
    } catch (err) {
      console.error('❌ BACKEND - Error obteniendo usuario:', err);
      logger.error('Error obteniendo usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ CREAR USUARIO
  static async createUser(req, res) {
    try {
      console.log('🔍 BACKEND - createUser body:', req.body);
      console.log('🔍 BACKEND - Usuario que crea:', req.user);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ BACKEND - Errores de validación:', errors.array());
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { email, password, nombre, telefono, rol } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar si ya existe un usuario con ese email
      const [existing] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ?',
        [email]
      );
      
      if (existing.length > 0) {
        connection.release();
        return error(res, 'Ya existe un usuario con ese email', 400);
      }
      
      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Insertar usuario
      const [result] = await connection.execute(`
        INSERT INTO sistema_usuarios (
          email, password, nombre, telefono, rol, activo, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [email, hashedPassword, nombre, telefono || null, rol]);
      
      // Obtener el usuario creado (sin password)
      const [newUser] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [result.insertId]);
      
      connection.release();
      
      console.log('✅ BACKEND - Usuario creado:', newUser[0]);
      
      logger.info('Usuario creado', {
        userId: result.insertId,
        email: email,
        nombre: nombre,
        rol: rol,
        createdBy: req.user.id
      });
      
      return success(res, 'Usuario creado exitosamente', newUser[0], 201);
      
    } catch (err) {
      console.error('❌ BACKEND - Error creando usuario:', err);
      logger.error('Error creando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ ACTUALIZAR USUARIO
  static async updateUser(req, res) {
    try {
      console.log('🔍 BACKEND - updateUser:', req.params.id, req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { id } = req.params;
      const { email, nombre, telefono, rol, activo } = req.body;
      
      // Verificar que no sea el propio usuario si se está desactivando
      if (activo === false && parseInt(id) === req.user.id) {
        return error(res, 'No puedes desactivar tu propia cuenta', 400);
      }
      
      const connection = await pool.getConnection();
      
      // Verificar que el usuario existe
      const [existing] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }
      
      // Verificar email único (excluyendo el usuario actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM sistema_usuarios WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return error(res, 'Ya existe otro usuario con ese email', 400);
      }
      
      // Actualizar usuario
      await connection.execute(`
        UPDATE sistema_usuarios SET
          email = ?, nombre = ?, telefono = ?, rol = ?, 
          activo = ?, updated_at = NOW()
        WHERE id = ?
      `, [email, nombre, telefono || null, rol, activo ? 1 : 0, id]);
      
      // Obtener usuario actualizado
      const [updated] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [id]);
      
      connection.release();
      
      console.log('✅ BACKEND - Usuario actualizado:', updated[0]);
      
      logger.info('Usuario actualizado', {
        userId: id,
        updatedBy: req.user.id
      });
      
      return success(res, 'Usuario actualizado exitosamente', updated[0]);
      
    } catch (err) {
      console.error('❌ BACKEND - Error actualizando usuario:', err);
      logger.error('Error actualizando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ CAMBIAR ESTADO (ACTIVAR/DESACTIVAR)
  static async toggleUserStatus(req, res) {
    try {
      console.log('🔍 BACKEND - toggleUserStatus:', req.params.id);
      
      const { id } = req.params;
      
      // Verificar que no sea el propio usuario
      if (parseInt(id) === req.user.id) {
        return error(res, 'No puedes cambiar el estado de tu propia cuenta', 400);
      }
      
      const connection = await pool.getConnection();
      
      const [user] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );
      
      if (user.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }
      
      const newStatus = user[0].activo ? 0 : 1;
      
      await connection.execute(
        'UPDATE sistema_usuarios SET activo = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, id]
      );
      
      connection.release();
      
      console.log('✅ BACKEND - Estado de usuario cambiado:', { userId: id, newStatus });
      
      logger.info('Estado de usuario cambiado', {
        userId: id,
        newStatus: newStatus,
        changedBy: req.user.id
      });
      
      return success(res, `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, {
        activo: newStatus === 1
      });
      
    } catch (err) {
      console.error('❌ BACKEND - Error cambiando estado del usuario:', err);
      logger.error('Error cambiando estado del usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ ELIMINAR USUARIO
  static async deleteUser(req, res) {
    try {
      console.log('🔍 BACKEND - deleteUser:', req.params.id);
      
      const { id } = req.params;
      
      // Verificar que no sea el propio usuario
      if (parseInt(id) === req.user.id) {
        return error(res, 'No puedes eliminar tu propia cuenta', 400);
      }
      
      const connection = await pool.getConnection();
      
      // Verificar que el usuario existe
      const [user] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );
      
      if (user.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }
      
      // Verificar si es el único administrador
      if (user[0].rol === 'administrador') {
        const [adminCount] = await connection.execute(
          'SELECT COUNT(*) as count FROM sistema_usuarios WHERE rol = "administrador" AND activo = 1'
        );
        
        if (adminCount[0].count <= 1) {
          connection.release();
          return error(res, 'No se puede eliminar el último administrador del sistema', 400);
        }
      }
      
      // Eliminar usuario
      await connection.execute(
        'DELETE FROM sistema_usuarios WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      console.log('✅ BACKEND - Usuario eliminado:', id);
      
      logger.info('Usuario eliminado', {
        userId: id,
        deletedBy: req.user.id
      });
      
      return success(res, 'Usuario eliminado exitosamente');
      
    } catch (err) {
      console.error('❌ BACKEND - Error eliminando usuario:', err);
      logger.error('Error eliminando usuario:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ CAMBIAR CONTRASEÑA
  static async changePassword(req, res) {
    try {
      console.log('🔍 BACKEND - changePassword para usuario:', req.params.id);
      console.log('🔍 BACKEND - Usuario actual:', req.user.id);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      const connection = await pool.getConnection();
      
      // Obtener usuario
      const [user] = await connection.execute(
        'SELECT * FROM sistema_usuarios WHERE id = ?',
        [id]
      );
      
      if (user.length === 0) {
        connection.release();
        return error(res, 'Usuario no encontrado', 404);
      }
      
      // Si es el propio usuario, verificar contraseña actual
      if (parseInt(id) === req.user.id) {
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user[0].password);
        if (!isCurrentPasswordValid) {
          connection.release();
          return error(res, 'La contraseña actual es incorrecta', 400);
        }
      }
      // Si es administrador cambiando contraseña de otro usuario, no necesita contraseña actual
      else if (req.user.rol !== 'administrador') {
        connection.release();
        return error(res, 'No tienes permisos para cambiar la contraseña de otro usuario', 403);
      }
      
      // Hash de la nueva contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Actualizar contraseña
      await connection.execute(
        'UPDATE sistema_usuarios SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      connection.release();
      
      console.log('✅ BACKEND - Contraseña cambiada para usuario:', id);
      
      logger.info('Contraseña cambiada', {
        userId: id,
        changedBy: req.user.id,
        isOwnPassword: parseInt(id) === req.user.id
      });
      
      return success(res, 'Contraseña cambiada exitosamente');
      
    } catch (err) {
      console.error('❌ BACKEND - Error cambiando contraseña:', err);
      logger.error('Error cambiando contraseña:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ OBTENER ESTADÍSTICAS DE USUARIOS
  static async getUserStats(req, res) {
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
          SUM(CASE WHEN rol = 'instalador' THEN 1 ELSE 0 END) as instaladores,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as usuarios_recientes
        FROM sistema_usuarios
      `);
      
      // Usuarios por rol
      const [roleStats] = await connection.execute(`
        SELECT 
          rol,
          COUNT(*) as total,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos
        FROM sistema_usuarios
        GROUP BY rol
        ORDER BY rol ASC
      `);
      
      // Actividad reciente
      const [recentActivity] = await connection.execute(`
        SELECT 
          id, nombre, email, ultimo_acceso, rol
        FROM sistema_usuarios
        WHERE ultimo_acceso IS NOT NULL AND activo = 1
        ORDER BY ultimo_acceso DESC
        LIMIT 5
      `);
      
      connection.release();
      
      return success(res, 'Estadísticas obtenidas exitosamente', {
        ...stats[0],
        por_rol: roleStats,
        actividad_reciente: recentActivity
      });
      
    } catch (err) {
      console.error('❌ BACKEND - Error obteniendo estadísticas de usuarios:', err);
      logger.error('Error obteniendo estadísticas de usuarios:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ OBTENER PERFIL DEL USUARIO ACTUAL
  static async getProfile(req, res) {
    try {
      console.log('🔍 BACKEND - getProfile para usuario:', req.user.id);
      
      const connection = await pool.getConnection();
      
      const [user] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [req.user.id]);
      
      connection.release();
      
      if (user.length === 0) {
        return error(res, 'Usuario no encontrado', 404);
      }
      
      return success(res, 'Perfil obtenido exitosamente', user[0]);
      
    } catch (err) {
      console.error('❌ BACKEND - Error obteniendo perfil:', err);
      logger.error('Error obteniendo perfil:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ✅ ACTUALIZAR PERFIL DEL USUARIO ACTUAL
  static async updateProfile(req, res) {
    try {
      console.log('🔍 BACKEND - updateProfile para usuario:', req.user.id);
      console.log('🔍 BACKEND - Datos a actualizar:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { nombre, telefono } = req.body;
      
      const connection = await pool.getConnection();
      
      // Actualizar perfil (no se permite cambiar email ni rol desde perfil)
      await connection.execute(`
        UPDATE sistema_usuarios SET
          nombre = ?, telefono = ?, updated_at = NOW()
        WHERE id = ?
      `, [nombre, telefono || null, req.user.id]);
      
      // Obtener perfil actualizado
      const [updated] = await connection.execute(`
        SELECT 
          id, email, nombre, telefono, rol, activo, 
          ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ?
      `, [req.user.id]);
      
      connection.release();
      
      console.log('✅ BACKEND - Perfil actualizado:', updated[0]);
      
      logger.info('Perfil actualizado', {
        userId: req.user.id
      });
      
      return success(res, 'Perfil actualizado exitosamente', updated[0]);
      
    } catch (err) {
      console.error('❌ BACKEND - Error actualizando perfil:', err);
      logger.error('Error actualizando perfil:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = UsersController;