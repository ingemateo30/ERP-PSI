// frontend/src/components/Login.js - VERSIÓN MEJORADA

import React, { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const LoginComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener la ruta de destino después del login
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Limpiar errores y mensajes después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};

    // Validar email
    if (!formData.email) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El correo electrónico no es válido';
    }

    // Validar contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar cambios en los campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar errores específicos del campo
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // Limpiar error general si existe
    if (error) {
      clearError();
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...');
      
      // La redirección se maneja en el useEffect cuando cambia isAuthenticated
    } catch (error) {
      console.error('Error en login:', error);
      // El error se maneja automáticamente en el contexto
    }
  };

  // Determinar el tipo de error para mostrar mensaje apropiado
  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    
    // Mapear errores comunes a mensajes amigables
    const errorMap = {
      'Credenciales inválidas': 'Email o contraseña incorrectos',
      'Usuario no encontrado o inactivo': 'Tu cuenta no está activa. Contacta al administrador.',
      'Token expirado': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      'Error interno del servidor': 'Problema del servidor. Intenta nuevamente.',
      'Network Error': 'Error de conexión. Verifica tu internet.',
      'fetch': 'Error de conexión con el servidor'
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.includes(key)) {
        return message;
      }
    }

    return error;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-4xl flex shadow-2xl rounded-3xl overflow-hidden">
        {/* Panel izquierdo con imagen */}
        <div
          className="hidden md:block w-1/2"
          style={{
            backgroundImage: 'url("/fondo2.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Panel derecho con formulario */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/30 relative overflow-hidden">
          {/* Efectos de fondo */}
          <div className="absolute -inset-0.5 bg-gradient-to-tr from-white/50 to-transparent opacity-20 pointer-events-none"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#0e6493]/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#e21f25]/10 rounded-full blur-3xl"></div>

          {/* Título */}
          <div className="text-center mb-8 relative">
            <h2 className="text-4xl font-bold text-[#0e6493] mb-2 transform transition-transform duration-300 hover:scale-105 drop-shadow-md">
              PSI Login
            </h2>
            <p className="text-gray-600/90 backdrop-blur-sm">Acceso Seguro</p>
          </div>

          {/* Mensaje de éxito */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-100/80 backdrop-blur-sm border border-green-300/50 text-green-800 rounded-lg flex items-center space-x-2">
              <CheckCircle size={20} />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          {/* Mensaje de error general */}
          {error && (
            <div className="mb-6 p-4 bg-red-100/80 backdrop-blur-sm border border-red-300/50 text-red-800 rounded-lg flex items-center space-x-2">
              <AlertCircle size={20} />
              <div>
                <p className="text-sm font-medium">Error de autenticación</p>
                <p className="text-sm">{getErrorMessage(error)}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0e6493] mb-2 drop-shadow-sm">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/50 backdrop-blur-sm border shadow-inner rounded-xl focus:outline-none focus:ring-2 transition duration-300 ${
                  validationErrors.email
                    ? 'border-red-300 focus:ring-red-500/70'
                    : 'border-white/60 focus:ring-[#0e6493]/70 hover:border-[#0e6493]/40'
                }`}
                placeholder="tu.correo@ejemplo.com"
                disabled={isLoading}
                autoComplete="email"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle size={16} />
                  <span>{validationErrors.email}</span>
                </p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-[#0e6493] mb-2 drop-shadow-sm">
                Contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white/50 backdrop-blur-sm border shadow-inner rounded-xl focus:outline-none focus:ring-2 transition duration-300 pr-12 ${
                  validationErrors.password
                    ? 'border-red-300 focus:ring-red-500/70'
                    : 'border-white/60 focus:ring-[#0e6493]/70 hover:border-[#0e6493]/40'
                }`}
                placeholder="Ingresa tu contraseña"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-[#0e6493] hover:text-[#e21f25] transition"
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle size={16} />
                  <span>{validationErrors.password}</span>
                </p>
              )}
            </div>

            {/* Opciones adicionales */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded bg-white/70"
                  disabled={isLoading}
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-900/80">
                  Recuérdame
                </label>
              </div>
              <div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#e21f25] hover:text-[#e21f25]/80 transition drop-shadow-sm"
                  tabIndex={isLoading ? -1 : 0}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-[#0e6493]/30 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0e6493]/80 backdrop-blur-md hover:bg-[#0e6493]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                isLoading ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={20} />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className={`mr-2 transition-transform ${isHovered ? 'animate-bounce' : ''}`} size={20} />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Enlaces adicionales */}
          <div className="mt-6 space-y-3 text-center relative z-10">
            {/* Enlace de registro */}
            {process.env.REACT_APP_ENABLE_REGISTRATION === 'true' && (
              <p className="text-sm text-gray-600/90 backdrop-blur-sm">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="font-medium text-[#e21f25] hover:text-[#e21f25]/80 transition drop-shadow-sm"
                  tabIndex={isLoading ? -1 : 0}
                >
                  Regístrate
                </Link>
              </p>
            )}

            {/* Información de soporte */}
            <div className="border-t border-white/20 pt-3">
              <p className="text-xs text-gray-500/80">
                ¿Necesitas ayuda?{' '}
                <a 
                  href={process.env.REACT_APP_SUPPORT_URL || 'mailto:soporte@tuisp.com'}
                  className="text-[#0e6493] hover:text-[#0e6493]/80 transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contacta soporte
                </a>
              </p>
            </div>
          </div>

          {/* Información de desarrollo (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-yellow-100/80 rounded-lg text-xs text-yellow-800">
              <p className="font-medium">Modo Desarrollo</p>
              <p>Usuario: admin@empresa.com</p>
              <p>Contraseña: [establecida en base de datos]</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;