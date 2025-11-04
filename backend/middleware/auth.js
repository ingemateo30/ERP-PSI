// backend/middleware/auth.js - Middleware de Autenticación
const jwt = require('jsonwebtoken');
const { Database } = require('../models/Database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log('🔍 Auth Header completo:', authHeader);
    console.log('🔍 Tipo de authHeader:', typeof authHeader);
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('🔑 Token extraído:', token ? `${token.substring(0, 30)}...` : 'NO HAY TOKEN');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado exitosamente:', { userId: decoded.userId, rol: decoded.rol });
    
    // Verificar que el usuario aún existe y está activo
    const [user] = await Database.query(
      'SELECT id, email, nombre, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo',
        timestamp: new Date().toISOString()
      });
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol
    };

    console.log('✅ Usuario autenticado:', { id: user.id, nombre: user.nombre, rol: user.rol });
    next();
  } catch (error) {
    console.error('❌ Error en autenticación:', error.name, '-', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error de autenticación',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Convertir a array si no lo es
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    if (!rolesArray.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        required_roles: rolesArray,
        user_role: req.user.rol,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};
// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const [user] = await Database.query(
        'SELECT id, email, nombre, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [decoded.userId]
      );

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol
        };
      }
    }
  } catch (error) {
    // En autenticación opcional, no fallar si hay error
    console.log('Token opcional inválido o expirado');
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};