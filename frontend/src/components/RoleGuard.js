// frontend/src/components/RoleGuard.js

import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const RoleGuard = ({ 
  children, 
  allowedRoles = [], 
  hideForRoles = [], 
  permission = null,
  fallback = null 
}) => {
  const { userRole, tienePermiso } = usePermissions();

  if (permission) {
    if (!tienePermiso(permission)) {
      return fallback;
    }
    return <>{children}</>;
  }

  if (hideForRoles.length > 0) {
    const isBlocked = hideForRoles.some(role => 
      role.toLowerCase().trim() === userRole
    );
    if (isBlocked) {
      return fallback;
    }
  }

  if (allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some(role => 
      role.toLowerCase().trim() === userRole
    );
    if (!isAllowed) {
      return fallback;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;