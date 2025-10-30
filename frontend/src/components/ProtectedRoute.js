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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {/* Icono de acceso denegado */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h2>

          {/* Descripción */}
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a esta página.
          </p>

          {/* Información de roles */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Rol requerido:
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {requiredRole}
                </p>
              </div>
            </div>
            <div className="flex items-start mt-3">
              <Lock className="w-5 h-5 text-gray-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Tu rol actual:
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {userRole || 'No definido'}
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Volver Atrás
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors font-medium"
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;