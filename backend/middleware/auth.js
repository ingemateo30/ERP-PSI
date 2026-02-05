// backend/middleware/auth.js - Middleware de Autenticación FINAL
const jwt = require('jsonwebtoken');
const { Database } = require('../models/Database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // Soportar token desde header Authorization O desde query string (para abrir PDFs en nueva pestaña)
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado:', decoded);

    // Soportar tanto 'id' como 'userId' por compatibilidad
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido: falta ID de usuario'
      });
    }

    const [user] = await Database.query(
      'SELECT id, email, nombre, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
      [userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo',
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

// ✅ MEJORADO: Middleware para verificar roles específicos
// Acepta AMBOS formatos:
// - requireRole('admin', 'supervisor')  ← Múltiples argumentos
// - requireRole(['admin', 'supervisor']) ← Array
const requireRole = (...args) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // ✅ MANEJAR AMBOS FORMATOS
    let roles;
    
    // Si el primer argumento es un array, usar ese array
    if (Array.isArray(args[0])) {
      roles = args[0];
    } else {
      // Si no, usar todos los argumentos como roles individuales
      roles = args;
    }

    // Verificar que el rol del usuario esté en la lista permitida
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        required_roles: roles,
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
      
      // Soportar tanto 'id' como 'userId'
      const userId = decoded.id || decoded.userId;
      
      if (userId) {
        const [user] = await Database.query(
          'SELECT id, email, nombre, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
          [userId]
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