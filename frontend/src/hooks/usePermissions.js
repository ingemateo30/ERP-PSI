// frontend/src/hooks/usePermissions.js

import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { userRole } = useAuth();

  const normalizedRole = (userRole || '').toLowerCase().trim();

  const PERMISOS_POR_ROL = {
    administrador: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
      configuracion: true,
      usuarios: true,
      reportes: true,
      estadisticas: true
    },
    supervisor: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
      configuracion: false,
      usuarios: false,
      reportes: false,
      estadisticas: false
    },
    instalador: {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      configuracion: false,
      usuarios: false,
      reportes: false,
      estadisticas: false
    }
  };

  const tienePermiso = (permiso) => {
    const permisosRol = PERMISOS_POR_ROL[normalizedRole] || {};
    return permisosRol[permiso] === true;
  };

  return {
    userRole: normalizedRole,
    tienePermiso,
    puedeVer: tienePermiso('ver'),
    puedeCrear: tienePermiso('crear'),
    puedeEditar: tienePermiso('editar'),
    puedeEliminar: tienePermiso('eliminar'),
    puedeAccederConfiguracion: tienePermiso('configuracion'),
    puedeAccederUsuarios: tienePermiso('usuarios'),
    puedeAccederReportes: tienePermiso('reportes'),
    puedeAccederEstadisticas: tienePermiso('estadisticas'),
    esAdministrador: normalizedRole === 'administrador',
    esSupervisor: normalizedRole === 'supervisor',
    esInstalador: normalizedRole === 'instalador'
  };
};

export default usePermissions;