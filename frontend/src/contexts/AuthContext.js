// frontend/src/contexts/AuthContext.js
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
  CLEAR_ERROR: 'CLEAR_ERROR'
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
        if (authService.isAuthenticated()) {
          // Verificar token con el servidor
          await authService.verifyToken();
          const user = authService.getUserFromToken();
          const token = authService.getToken();

          dispatch({
            type: AuthActions.SET_AUTHENTICATED,
            payload: { user, token }
          });
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

  // Función para iniciar sesión
  const login = async (email, password) => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      const response = await authService.login(email, password);
      const user = authService.getUserFromToken();
      const token = authService.getToken();

      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user, token }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Función para registrar usuario
  const register = async (userData) => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      const response = await authService.register(userData);
      const user = authService.getUserFromToken();
      const token = authService.getToken();

      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user, token }
      });

      return response;
    } catch (error) {
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    dispatch({ type: AuthActions.SET_LOADING });

    try {
      await authService.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
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
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: error.message
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
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: error.message
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
      dispatch({
        type: AuthActions.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Función para refrescar token
  const refreshToken = async () => {
    try {
      await authService.refreshToken();
      const user = authService.getUserFromToken();
      const token = authService.getToken();

      dispatch({
        type: AuthActions.SET_AUTHENTICATED,
        payload: { user, token }
      });
    } catch (error) {
      dispatch({ type: AuthActions.SET_UNAUTHENTICATED });
      throw error;
    }
  };

  // Valores del contexto
  const value = {
    // Estado
    ...state,
    isAuthenticated: state.status === AuthStates.AUTHENTICATED,
    
    // Acciones
    login,
    register,
    logout,
    clearError,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;