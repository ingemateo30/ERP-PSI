const { Database } = require('./Database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.nombre = data.nombre;
    this.telefono = data.telefono;
    this.rol = data.rol;
    this.activo = data.activo;
    this.ultimo_acceso = data.ultimo_acceso;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    try {
      const sql = `
        SELECT id, email, password, nombre, telefono, rol, activo, 
               ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE email = ? AND activo = 1
      `;
      
      const users = await Database.query(sql, [email]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Error buscando usuario por email:', error.message);
      throw new Error('Error accediendo a la base de datos');
    }
  }

  // Buscar usuario por ID
  static async findById(id) {
    try {
      const sql = `
        SELECT id, email, nombre, telefono, rol, activo, 
               ultimo_acceso, created_at, updated_at
        FROM sistema_usuarios 
        WHERE id = ? AND activo = 1
      `;
      
      const users = await Database.query(sql, [id]);
      return users.length > 0 ? new User(users[0]) : null;
    } catch (error) {
      logger.error('Error buscando usuario por ID:', error.message);
      throw new Error('Error accediendo a la base de datos');
    }
  }

  // Crear nuevo usuario
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      const sql = `
        INSERT INTO sistema_usuarios (email, password, nombre, telefono, rol, activo)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userData.email,
        hashedPassword,
        userData.nombre,
        userData.telefono || null,
        userData.rol || 'supervisor',
        true
      ];
      
      const result = await Database.query(sql, params);
      
      if (result.insertId) {
        return await User.findById(result.insertId);
      }
      
      throw new Error('Error creando usuario');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El email ya está registrado');
      }
      logger.error('Error creando usuario:', error.message);
      throw new Error('Error creando usuario');
    }
  }

  // Verificar contraseña
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error verificando contraseña:', error.message);
      return false;
    }
  }

  // Actualizar último acceso
  static async updateLastAccess(userId) {
    try {
      const sql = `
        UPDATE sistema_usuarios 
        SET ultimo_acceso = NOW() 
        WHERE id = ?
      `;
      
      await Database.query(sql, [userId]);
    } catch (error) {
      logger.error('Error actualizando último acceso:', error.message);
      // No lanzar error, es información no crítica
    }
  }

  // Cambiar contraseña
  async changePassword(newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
      
      const sql = `
        UPDATE sistema_usuarios 
        SET password = ?, updated_at = NOW() 
        WHERE id = ?
      `;
      
      await Database.query(sql, [hashedPassword, this.id]);
      return true;
    } catch (error) {
      logger.error('Error cambiando contraseña:', error.message);
      throw new Error('Error actualizando contraseña');
    }
  }

  // Actualizar perfil
  async updateProfile(updateData) {
    try {
      const allowedFields = ['nombre', 'telefono'];
      const fields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (fields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }
      
      values.push(this.id);
      
      const sql = `
        UPDATE sistema_usuarios 
        SET ${fields.join(', ')}, updated_at = NOW() 
        WHERE id = ?
      `;
      
      await Database.query(sql, values);
      
      // Recargar datos
      const updatedUser = await User.findById(this.id);
      Object.assign(this, updatedUser);
      
      return true;
    } catch (error) {
      logger.error('Error actualizando perfil:', error.message);
      throw new Error('Error actualizando perfil');
    }
  }

  // Método para serializar (sin contraseña)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      nombre: this.nombre,
      telefono: this.telefono,
      rol: this.rol,
      activo: this.activo,
      ultimo_acceso: this.ultimo_acceso,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;