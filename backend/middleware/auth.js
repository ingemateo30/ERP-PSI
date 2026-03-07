// backend/middleware/auth.js - Middleware de Autenticación FINAL
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

    let user;
    try {
      [user] = await Database.query(
        `SELECT su.id, su.email, su.nombre, su.rol, su.activo, su.sede_id,
                c.nombre AS sede_nombre
         FROM sistema_usuarios su
         LEFT JOIN ciudades c ON su.sede_id = c.id
         WHERE su.id = ? AND su.activo = 1`,
        [userId]
      );
    } catch (colError) {
      // Si sede_id aún no existe (migración pendiente), usar query básica
      [user] = await Database.query(
        'SELECT id, email, nombre, rol, activo FROM sistema_usuarios WHERE id = ? AND activo = 1',
        [userId]
      );
    }

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
      rol: user.rol,
      sede_id: user.sede_id || null,
      // sede contiene el nombre de la ciudad para filtrar inventario
      sede: user.sede_nombre || null
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

    // Manejar ambos formatos: array o múltiples argumentos
    let roles;
    if (Array.isArray(args[0])) {
      roles = args[0];
    } else {
      roles = args;
    }

    // 'secretaria' hereda los permisos de 'supervisor' para compatibilidad
    const expandedRoles = [...roles];
    if (roles.includes('supervisor') && !expandedRoles.includes('secretaria')) {
      expandedRoles.push('secretaria');
    }

    if (!expandedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        required_roles: expandedRoles,
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