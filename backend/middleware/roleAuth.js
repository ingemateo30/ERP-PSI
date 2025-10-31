// backend/middleware/roleAuth.js

/**
 * Middleware para verificar roles de usuario
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const rolUsuario = (req.user.rol || '').toLowerCase().trim();

      console.log('🔐 Verificando rol:', {
        usuario: req.user.nombre,
        rolUsuario,
        rolesPermitidos
      });

      const tienePermiso = rolesPermitidos.some(rol => 
        rol.toLowerCase().trim() === rolUsuario
      );

      if (!tienePermiso) {
        console.log('❌ Acceso denegado - Rol insuficiente');
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          requiredRoles: rolesPermitidos,
          userRole: rolUsuario
        });
      }

      console.log('✅ Acceso permitido');
      next();
    } catch (error) {
      console.error('Error en verificación de rol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
};

const PERMISOS = {
  administrador: {
    configuracion: true,
    usuarios: true,
    reportes: true,
    estadisticas: true,
    eliminar: true,
    crear: true,
    editar: true,
    ver: true
  },
   supervisor: {
    configuracion: false,      // ❌ NO puede acceder a config
    usuarios: false,            // ❌ NO puede gestionar usuarios
    reportes: false,            // ❌ NO puede ver reportes
    estadisticas: false,        // ❌ NO puede ver estadísticas
    eliminar: false,            // ❌ NO puede eliminar
    crear: false,               // ❌ NO puede crear en CONFIG
    editar: false,              // ❌ NO puede editar en CONFIG
    ver: true,                  // ✅ SÍ puede VER (solo lectura)
    // Permisos específicos para otras secciones
    crear_cliente: true,        // ✅ Puede crear clientes
    editar_cliente: true,       // ✅ Puede editar clientes
    ver_facturacion: true,      // ✅ Puede ver facturación
    crear_factura: true         // ✅ Puede crear facturas
  },
  instalador: {
    configuracion: false,
    usuarios: false,
    reportes: false,
    estadisticas: false,
    eliminar: false,
    crear: false,
    editar: false,
    ver: true
  }
};

const verificarPermiso = (permiso) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const rolUsuario = (req.user.rol || '').toLowerCase().trim();
      const permisosRol = PERMISOS[rolUsuario] || {};

      if (!permisosRol[permiso]) {
        return res.status(403).json({
          success: false,
          message: `No tienes permiso para: ${permiso}`,
          userRole: rolUsuario
        });
      }

      next();
    } catch (error) {
      console.error('Error en verificación de permiso:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
};

module.exports = {
  verificarRol,
  verificarPermiso,
  PERMISOS
};