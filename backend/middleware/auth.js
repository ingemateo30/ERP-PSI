// backend/middleware/auth.js - VERSIÓN SIMPLIFICADA

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware de autenticación básico
 */
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

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en base de datos
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute(
      'SELECT id, email, nombre, telefono, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
      [decoded.userId || decoded.id]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    const user = users[0];
    req.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      telefono: user.telefono,
      rol: user.rol,
      role: user.rol, // Para compatibilidad con frontend
      activo: user.activo
    };
    
    req.token = token;

    next();

  } catch (error) {
    console.error('Error en autenticación:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

/**
 * Middleware de autorización por roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    const userRole = req.user.rol || req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};