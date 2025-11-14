// frontend/src/contexts/AuthContext.js - VERSIÓN MEJORADA

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

// Estados de autenticación
const AuthStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error'
};

// Acciones del reducer
const AuthActions = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_UNAUTHENTICATED: 'SET_UNAUTHENTICATED',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER'
};

// Estado inicial
const initialState = {
  status: AuthStates.IDLE,
  user: null,
  token: null,
  error: null,
  isLoading: false
};

// Reducer para manejar el estado de autenticación
function authReducer(state, action) {
  switch (action.type) {
    case AuthActions.SET_LOADING:
      return {
        ...state,
        status: AuthStates.LOADING,
        isLoading: true,
        error: null
      };

    case AuthActions.SET_AUTHENTICATED:
      return {
        ...state,
        status: AuthStates.AUTHENTICATED,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null
      };

    case AuthActions.SET_UNAUTHENTICATED:
      return {
        ...state,
        status: AuthStates.UNAUTHENTICATED,
        user: null,
        token: null,
        isLoading: false,
        error: null
      };

    case AuthActions.SET_ERROR:
      return {
        ...state,
        status: AuthStates.ERROR,
        error: action.payload,
        isLoading: false
      };

    case AuthActions.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AuthActions.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    default:
      return state;
  }
}

// Crear contexto
const AuthContext = createContext();

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: AuthActions.SET_LOADING });

      try {
        // Verificar si hay token almacenado
        if (authService.isAuthenticated()) {
          const token = authService.getToken();
          let user = authService.getCurrentUserInfo();

          // Si no hay información de usuario, obtenerla del servidor
          if (!user) {
            try {
              const response = await authService.getCurrentUser();
              user = response.user || response.data?.user;
            } catch (error) {
              console.error('Error obteniendo usuario actual:', error);
              // Si falla, extraer del token
              user = authService.getUserFromToken();
            }
          }

          if (user && token) {
            dispatch({
              type: AuthActions.SET_AUTHENTICATED,
              payload: { user, token }
            });
          } else {
            dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
          }
        } else {
          dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error);
        authService.removeToken();
        dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh del token
  useEffect(() => {
    let refreshTimer;

    const setupTokenRefresh = () => {
      const token = authService.getToken();
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;
        
        // Refrescar 5 minutos antes de que expire
        const refreshTime = timeUntilExpiry - (5 * 60 * 1000);

        if (refreshTime > 0) {
          refreshTimer = setTimeout(async () => {
            try {
              await refreshToken();
            } catch (error) {
              console.error('Error auto-refrescando token:', error);
              logout();
            }
          }, refreshTime);
        }
      } catch (error) {
        console.error('Error calculando tiempo de refresh:', error);
      }
    };

    if (state.status === AuthStates.AUTHENTICATED) {
      setupTokenRefresh();
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [state.status, state.token]);

  // Función para iniciar sesión
 const login = async (email, password) => {
  dispatch({ type: AuthActions.SET_LOADING });

  try {
    const response = await authService.login(email, password);
    
    console.log('🔍 AuthContext - Respuesta recibida:', response);
    
    // Extraer token y usuario de la respuesta correctamente
    let token, user;
    
    if (response.success && response.data) {
      token = response.data.tokens?.accessToken;
      user = response.data.user;
    } else {
      token = response.token || response.accessToken;
      user = response.data?.user || response.user;
    }

    console.log('🔍 AuthContext - Token extraído:', token ? 'EXISTS' : 'MISSING');
    console.log('🔍 AuthContext - User extraído:', user ? 'EXISTS' : 'MISSING');

    if (!user && token) {
      user = authService.getUserFromToken();
    }

    if (user && token) {
      console.log('✅ AuthContext - Login exitoso, actualizando estado');
      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user, token }
      });
      
      // ✅ NUEVO: Forzar redirección según rol INMEDIATAMENTE
      const userRole = (user.rol || user.role).toLowerCase();
      
      // Limpiar historial de navegación
      window.history.replaceState(null, '', window.location.pathname);
      
      // Redirigir según rol
      setTimeout(() => {
        if (userRole === 'instalador') {
          window.location.href = '/instalador/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 100);
      
    } else {
      console.error('❌ AuthContext - Faltan datos: user=', !!user, 'token=', !!token);
      throw new Error('Respuesta de login inválida');
    }

    return response;
  } catch (error) {
    console.error('❌ AuthContext - Error en login:', error);
    const errorMessage = error.message || 'Error al iniciar sesión';
    dispatch({
      type: AuthActions.SET_ERROR,
      payload: errorMessage
    });
    throw error;
  }
};
  // Función para registrar usuario
  // En tu AuthContext.js - REEMPLAZA el método register

const register = async (userData) => {
  dispatch({ type: AuthActions.SET_LOADING });

  try {
    const response = await authService.register(userData);
    
    // Extraer token y usuario de la respuesta correctamente
    let token, user;
    
    if (response.success && response.data) {
      // Si incluye auto-login
      if (response.data.tokens) {
        token = response.data.tokens.accessToken;
        user = response.data.user;
      } else {
        // Solo registro, sin auto-login
        user = response.data.user || response.data;
      }
    } else {
      // Fallback para otras estructuras
      token = response.token || response.accessToken;
      user = response.data?.user || response.user;
    }

    if (!user && token) {
      user = authService.getUserFromToken();
    }

    if (user && token) {
      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user, token }
      });
    } else {
      // Si no devuelve token (registro sin auto-login)
      dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
    }

    return response;
  } catch (error) {
    const errorMessage = error.message || 'Error al registrar usuario';
    dispatch({
      type: AuthActions.SET_ERROR,
      payload: errorMessage
    });
    throw error;
  }
};

 // Función para cerrar sesión
const logout = async () => {
  dispatch({ type: AuthActions.SET_LOADING });

  try {
    // Intentar logout en el servidor
    await authService.logout();
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  } finally {
    // Limpiar estado
    dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
    
    // ✅ CRÍTICO: Limpiar completamente la navegación y forzar ir al login
    // Esto evita que intente volver a la última página visitada
    window.history.pushState(null, '', '/login');
    window.location.href = '/login';
  }
};

  // Función para limpiar errores
  const clearError = () => {
    dispatch({ type: AuthActions.CLEAR_ERROR });
  };

  // Función para solicitar restablecimiento de contraseña
  const forgotPassword = async (email) => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      const response = await authService.forgotPassword(email);
      dispatch({ type: AuthActions.CLEAR_ERROR });
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al solicitar restablecimiento';
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: errorMessage
      });
      throw error;
    }
  };

  // Función para restablecer contraseña
  const resetPassword = async (token, password) => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      const response = await authService.resetPassword(token, password);
      dispatch({ type: AuthActions.CLEAR_ERROR });
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al restablecer contraseña';
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: errorMessage
      });
      throw error;
    }
  };

  // Función para cambiar contraseña
  const changePassword = async (currentPassword, newPassword) => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      dispatch({ type: AuthActions.CLEAR_ERROR });
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cambiar contraseña';
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: errorMessage
      });
      throw error;
    }
  };

  // Función para refrescar token
  // En tu AuthContext.js - REEMPLAZA el método refreshToken

const refreshToken = async () => {
  try {
    const response = await authService.refreshToken();
    
    // Extraer token de la respuesta correctamente
    let token;
    
    if (response.success && response.data && response.data.tokens) {
      token = response.data.tokens.accessToken;
    } else {
      token = response.token || response.accessToken;
    }
    
    if (token) {
      // Mantener usuario actual, solo actualizar token
      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user: state.user, token }
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error refrescando token:', error);
    dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
    throw error;
  }
};

  // Función para actualizar información del usuario
  const updateUser = async (userData) => {
    try {
      // Aquí podrías llamar a un endpoint de actualización
      // const response = await userService.updateProfile(userData);
      
      // Por ahora, actualizar solo localmente
      dispatch({
        type: AuthActions.UPDATE_USER,
        payload: userData
      });
      
      // También actualizar en localStorage
      const updatedUser = { ...state.user, ...userData };
      authService.setUser(updatedUser);
      
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  };

  // En tu AuthContext.js, REEMPLAZA la función hasPermission por esta:

// Función para verificar permisos
const hasPermission = (requiredRole) => {
  if (!state.user) {
    console.log('❌ hasPermission: No hay usuario');
    return false;
  }
  
  const userRole = (state.user.role || state.user.rol || '').toLowerCase().trim();
  
  console.log('🔍 hasPermission:', {
    userRole,
    requiredRole
  });
  
  // Si no se requiere rol específico, permitir acceso
  if (!requiredRole) {
    console.log('✅ hasPermission: Sin requisito de rol');
    return true;
  }
  
  // El administrador SIEMPRE tiene acceso a todo
  if (userRole === 'administrador') {
    console.log('✅ hasPermission: Usuario es ADMINISTRADOR');
    return true;
  }
  
  // Normalizar el rol requerido y verificar
  const normalizedRequired = requiredRole.toLowerCase().trim();
  
  // Soportar múltiples roles separados por coma
  const rolesPermitidos = normalizedRequired.split(',').map(r => r.trim());
  
  const hasAccess = rolesPermitidos.includes(userRole);
  
  console.log(hasAccess ? '✅ hasPermission: Acceso permitido' : '❌ hasPermission: Acceso denegado');
  
  return hasAccess;
};
  // Función para verificar si el usuario puede acceder a un recurso específico
  const canAccess = (resource, action = 'read') => {
    if (!state.user) return false;
    
    const userRole = state.user.role || state.user.rol;
    
    // Definir permisos por rol y recurso
    const permissions = {
      'administrador': ['*'], // Acceso total
      'supervisor': ['clients', 'invoices', 'payments', 'reports'],
      'instalador': ['clients', 'installations'],
      'usuario': ['profile']
    };
    
    const userPermissions = permissions[userRole] || [];
    return userPermissions.includes('*') || userPermissions.includes(resource);
  };

  // Valores del contexto
  const value = {
    // Estado
    ...state,
    isAuthenticated: state.status === AuthStates.AUTHENTICATED,
    
    // Información del usuario
    currentUser: state.user,
    userRole: state.user?.role || state.user?.rol,
    
    // Acciones de autenticación
    login,
    register,
    logout,
    clearError,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken,
    getToken: () => authService.getToken(),  // <-- AGREGADO
    
    // Gestión de usuario
    updateUser,
    
    // Utilidades de permisos
    hasPermission,
    canAccess,
    
    // Estados derivados
    isAdmin: state.user?.role === 'administrador' || state.user?.rol === 'administrador',
    isSupervisor: state.user?.role === 'supervisor' || state.user?.rol === 'supervisor',
    isInstaller: state.user?.role === 'instalador' || state.user?.rol === 'instalador'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;