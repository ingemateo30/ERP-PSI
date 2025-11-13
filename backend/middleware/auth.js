// backend/middleware/auth.js - Middleware de Autenticación CORREGIDO
const jwt = require('jsonwebtoken');
const { Database } = require('../models/Database');

/**
 * Middleware principal de autenticación
 * Verifica el token JWT y carga información del usuario
 */
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

    // Obtener información del usuario desde la base de datos
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

    console.log('✅ Usuario autenticado:', { 
      id: user.id, 
      nombre: user.nombre, 
      rol: user.rol 
    });
    
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

/**
 * ✅ CORREGIDO: Middleware para verificar roles específicos
 * Ahora acepta múltiples roles como argumentos
 * 
 * Uso: requireRole('administrador', 'supervisor')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('🔐 requireRole - Verificando acceso');
    console.log('🔐 Usuario:', req.user?.nombre, '(ID:', req.user?.id, ')');
    console.log('🔐 Rol del usuario:', req.user?.rol);
    console.log('🔐 Roles permitidos:', allowedRoles);

    // Verificar que el usuario esté autenticado
    if (!req.user) {
      console.log('❌ requireRole - Usuario no autenticado');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        timestamp: new Date().toISOString()
      });
    }

    // Normalizar roles para comparación (minúsculas y sin espacios)
    const userRole = (req.user.rol || '').toLowerCase().trim();
    const normalizedRoles = allowedRoles.map(role => 
      (role || '').toLowerCase().trim()
    );

    console.log('🔐 Rol normalizado usuario:', userRole);
    console.log('🔐 Roles permitidos normalizados:', normalizedRoles);

    // Verificar si el rol del usuario está en los roles permitidos
    if (!normalizedRoles.includes(userRole)) {
      console.log('❌ requireRole - Acceso DENEGADO');
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes',
        required_roles: allowedRoles,
        user_role: req.user.rol,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ requireRole - Acceso PERMITIDO');
    next();
  };
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, simplemente no carga el usuario
 * Útil para rutas públicas que pueden mostrar contenido diferente si hay usuario
 */
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
          console.log('✅ Usuario opcional autenticado:', req.user.nombre);
        }
      }
    }
  } catch (error) {
    // En autenticación opcional, no fallar si hay error
    console.log('⚠️ Token opcional inválido o expirado:', error.message);
  }
  
  next();
};

/**
 * Middleware helper para verificar si el usuario es administrador
 */
const requireAdmin = () => requireRole('administrador');

/**
 * Middleware helper para verificar si el usuario es supervisor o administrador
 */
const requireSupervisor = () => requireRole('administrador', 'supervisor');

/**
 * Middleware helper para verificar si el usuario es instalador, supervisor o administrador
 */
const requireInstalador = () => requireRole('administrador', 'supervisor', 'instalador');

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  // Helpers de conveniencia
  requireAdmin,
  requireSupervisor,
  requireInstalador
};