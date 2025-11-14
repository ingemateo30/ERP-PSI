// frontend/src/components/ProtectedRoute.js - VERSIÓN CORREGIDA COMPLETA

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, currentUser, userRole } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - Estado:', {
    isAuthenticated,
    isLoading,
    currentUser: !!currentUser,
    userRole,
    requiredRole,
    path: location.pathname
  });

  // Mostrar loader mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600 text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated || !currentUser) {
    console.log('❌ ProtectedRoute - Usuario no autenticado, redirigiendo a /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // CORRECCIÓN CRÍTICA: Si no se requiere rol específico, permitir acceso
  if (!requiredRole) {
    console.log('✅ ProtectedRoute - Sin requisito de rol, acceso permitido');
    return children;
  }

  // Normalizar roles para comparación
  const normalizedUserRole = (userRole || '').toLowerCase().trim();
  const normalizedRequiredRole = (requiredRole || '').toLowerCase().trim();

  console.log('🔍 ProtectedRoute - Verificando roles:', {
    normalizedUserRole,
    normalizedRequiredRole
  });

  // CORRECCIÓN: Administrador siempre tiene acceso a todo
  if (normalizedUserRole === 'administrador') {
    console.log('✅ ProtectedRoute - Usuario es ADMINISTRADOR, acceso total permitido');
    return children;
  }

  // Verificar roles múltiples (separados por coma)
  const rolesPermitidos = normalizedRequiredRole.split(',').map(r => r.trim());
  
  if (rolesPermitidos.includes(normalizedUserRole)) {
    console.log('✅ ProtectedRoute - Rol coincide, acceso permitido');
    return children;
  }

 // Si llegó aquí, no tiene permisos
  console.log('❌ ProtectedRoute - Acceso denegado por falta de permisos');

  // ✅ CAMBIO: Redirigir automáticamente según el rol en lugar de mostrar pantalla de error
  const dashboardMap = {
    'instalador': '/instalador/dashboard',
    'supervisor': '/dashboard',
    'administrador': '/dashboard'
  };

  const redirectPath = dashboardMap[normalizedUserRole] || '/dashboard';
  
  console.log(`🔄 ProtectedRoute - Redirigiendo a: ${redirectPath}`);
  
  return <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;