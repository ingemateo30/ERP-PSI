import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, User, Lock, Building, Monitor, Coffee, Wifi, Shield, Zap, Globe, Server, Database, Cloud, Star, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Hooks de navegación y autenticación
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Referencias para animación
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);

  // Seguir movimiento del mouse para efecto 3D sutil
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Limpiar errores después de un tiempo
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

    if (!formData.email) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El correo electrónico no es válido';
    }

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

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

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

      setTimeout(() => {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 1000);

    } catch (loginError) {
      console.error('Error en login:', loginError);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      <style jsx>{`
        /* Animaciones principales */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        
        @keyframes slideIn {
          0% { transform: translateX(-50px) scale(0.9); opacity: 0; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        
        @keyframes fadeInUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(14, 100, 147, 0.3); }
          50% { box-shadow: 0 0 25px rgba(14, 100, 147, 0.5); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0, -10px, 0); }
          70% { transform: translate3d(0, -5px, 0); }
        }
        
        /* Clases de animación */
        .floating-icon {
          animation: float 8s ease-in-out infinite;
        }
        
        .pulse-icon {
          animation: pulse 4s ease-in-out infinite;
        }
        
        .sparkle-icon {
          animation: sparkle 3s ease-in-out infinite;
        }
        
        .slide-in {
          animation: slideIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .glow-effect {
          animation: glow 3s ease-in-out infinite;
        }
        
        .success-animation {
          animation: bounce 0.6s ease-out;
        }
        
        .error-animation {
          animation: shake 0.5s ease-out;
        }
        
        /* Estilos de labels flotantes */
        .floating-label {
          position: absolute;
          left: 56px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          background: white;
          padding: 0 8px;
          font-size: 14px;
          z-index: 10;
          display: flex;
          align-items: center;
        }
        
        .floating-label.active {
          top: -8px;
          left: 12px;
          font-size: 11px;
          color: #0e6493;
          font-weight: 600;
          transform: translateY(0) scale(0.95);
          text-shadow: 0 0 8px rgba(14, 100, 147, 0.3);
        }
        
        .floating-label.active .label-icon {
          display: none;
        }
        
        .floating-label.error {
          color: #dc2626;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.3);
        }
        
        /* Estilos de inputs */
        .input-field {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          border: 2px solid #e5e7eb;
          background: white;
          transform: translateY(0);
          position: relative;
          overflow: hidden;
        }
        
        .input-field::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(14, 100, 147, 0.1), transparent);
          transition: left 0.6s;
        }
        
        .input-field:focus::before {
          left: 100%;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #0e6493;
          box-shadow: 0 0 0 4px rgba(14, 100, 147, 0.1), 0 8px 16px rgba(14, 100, 147, 0.2);
          transform: translateY(-2px) scale(1.01);
        }
        
        .input-field.error {
          border-color: #dc2626;
          box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1), 0 8px 16px rgba(220, 38, 38, 0.2);
        }
        
        /* Estilos del botón */
        .login-button {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform: translateY(0);
          box-shadow: 0 8px 20px rgba(14, 100, 147, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s;
        }
        
        .login-button:hover:not(:disabled)::before {
          left: 100%;
        }
        
        .login-button:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 28px rgba(14, 100, 147, 0.4), 0 0 20px rgba(14, 100, 147, 0.2);
        }
        
        .login-button:active:not(:disabled) {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 6px 16px rgba(14, 100, 147, 0.3);
        }
        
        /* Contenedor principal con sombras mejoradas */
        .login-container {
          box-shadow: 
            0 32px 64px -12px rgba(0, 0, 0, 0.25),
            0 25px 50px -12px rgba(14, 100, 147, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Panel izquierdo con colores del layout */
        .geometric-bg {
          background: linear-gradient(135deg, #0e6493 0%, #0e6493 50%, #0e6493 100%);
          position: relative;
        }
        
        .geometric-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        /* Laptop illustration con colores del layout */
        .illustration-laptop {
          background: linear-gradient(135deg, #0e6493 0%, #0e6493 100%);
          border-radius: 12px;
          padding: 12px;
          transform: perspective(1000px) rotateX(12deg) rotateY(-3deg);
          box-shadow: 0 25px 50px rgba(14, 100, 147, 0.3);
        }
        
        .laptop-screen {
          background: white;
          border-radius: 8px;
          aspect-ratio: 16/10;
          overflow: hidden;
        }
        
        /* Efectos hover */
        .icon-container {
          position: relative;
          transition: all 0.3s ease;
        }
        
        .icon-container:hover {
          transform: scale(1.15) rotate(8deg);
        }
      `}</style>

      {/* Contenedor principal con mejores sombras */}
      <div 
        ref={containerRef}
        className="w-full max-w-6xl flex bg-white/95 rounded-3xl login-container overflow-hidden relative backdrop-blur-sm slide-in"
        style={{
          transform: `perspective(1000px) rotateY(${(mousePosition.x - 50) * 0.02}deg) rotateX(${(mousePosition.y - 50) * -0.02}deg)`
        }}
      >

        {/* Panel izquierdo - Ilustración */}
        <div className="hidden lg:flex lg:w-1/2 geometric-bg p-12 flex-col justify-center items-center relative">
          
          {/* Iconos flotantes de fondo - partículas blancas */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Shield className="absolute top-16 left-16 text-white/15 floating-icon" size={24} style={{ animationDelay: '0s' }} />
            <Server className="absolute top-28 right-28 text-white/15 floating-icon" size={20} style={{ animationDelay: '1s' }} />
            <Database className="absolute bottom-40 left-24 text-white/15 floating-icon" size={22} style={{ animationDelay: '2s' }} />
            <Cloud className="absolute bottom-28 right-40 text-white/15 floating-icon" size={18} style={{ animationDelay: '3s' }} />
            <Globe className="absolute top-2/5 left-1/4 text-white/12 pulse-icon" size={16} style={{ animationDelay: '1.5s' }} />
            <Zap className="absolute top-3/5 right-1/4 text-white/15 sparkle-icon" size={14} style={{ animationDelay: '2.5s' }} />
            <Star className="absolute bottom-2/5 left-2/5 text-white/12 sparkle-icon" size={12} style={{ animationDelay: '4s' }} />
            <Sparkles className="absolute top-1/4 right-2/5 text-white/15 pulse-icon" size={10} style={{ animationDelay: '3.5s' }} />
          </div>
          
          {/* Header con logo */}
          <div className="absolute top-6 left-6 flex items-center fade-in-up z-30" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-3 overflow-hidden glow-effect shadow-lg">
              <img 
                src="logo2.png" 
                alt="Logo Empresa" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <Building 
                size={20} 
                className="text-[#0e6493] hidden" 
                style={{ display: 'none' }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">PSI</h1>
              <p className="text-white/80 text-xs">Sistema de Gestión Empresarial</p>
            </div>
          </div>

          {/* Ilustración central */}
          <div className="flex flex-col items-center justify-center h-full fade-in-up mt-16" style={{ animationDelay: '0.4s' }}>
            
            {/* Laptop illustration */}
            <div className="mb-6 relative">
              <div className="illustration-laptop w-64 h-40 mb-4 hover:scale-105 transition-transform duration-500">
                <div className="laptop-screen flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {/* Barra de carga animada con color del layout */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0e6493] to-[#0e6493] transform -translate-x-full animate-pulse"></div>
                    
                    {/* Grid animado */}
                    <div className="grid grid-cols-3 gap-2 p-4">
                      {[...Array(9)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-5 bg-[#0e6493]/30 rounded-md hover:bg-[#0e6493]/50 transition-colors duration-300 cursor-pointer"
                          style={{ 
                            animationDelay: `${i * 0.1}s`,
                            animation: 'fadeInUp 0.6s ease-out forwards'
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Elementos decorativos */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm icon-container glow-effect">
                <Coffee size={14} className="text-white" />
              </div>
              
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-[#0e6493]/30 rounded-full flex items-center justify-center backdrop-blur-sm icon-container pulse-icon">
                <Wifi size={12} className="text-white" />
              </div>
              
              <div className="absolute top-1/4 -right-3 w-5 h-5 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-sm sparkle-icon">
                <Monitor size={10} className="text-white" />
              </div>
            </div>

            {/* Texto descriptivo */}
            <div className="text-center text-white max-w-sm fade-in-up" style={{ animationDelay: '0.6s' }}>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Bienvenido a PSI
              </h2>
              <p className="text-white/90 leading-relaxed">
                Plataforma completa para gestionar clientes, servicios, facturación y monitoreo de red en tiempo real.
              </p>
            </div>

            {/* Badges de características */}
            <div className="flex flex-wrap gap-2 mt-6 justify-center fade-in-up" style={{ animationDelay: '0.8s' }}>
              <span className="px-3 py-1.5 bg-white/20 rounded-full text-white/95 text-xs backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 cursor-pointer hover:scale-105">
                <Shield className="inline mr-1" size={12} />
                CRM Integrado
              </span>
              <span className="px-3 py-1.5 bg-white/20 rounded-full text-white/95 text-xs backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 cursor-pointer hover:scale-105">
                <Database className="inline mr-1" size={12} />
                Facturación
              </span>
              <span className="px-3 py-1.5 bg-[#0e6493]/30 rounded-full text-white/95 text-xs backdrop-blur-sm border border-[#0e6493]/40 hover:bg-[#0e6493]/40 transition-all duration-300 cursor-pointer hover:scale-105">
                <Zap className="inline mr-1" size={12} />
                Reportes
              </span>
            </div>
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center bg-white/60 backdrop-blur-sm relative">
          
          <div className="max-w-md mx-auto w-full relative z-10">

            {/* Título */}
            <div className="text-center mb-10 fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-[#0e6493] to-[#1e7ba8] bg-clip-text text-transparent">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600 text-lg">
                Ingresa tus credenciales para continuar
              </p>
              <div className="w-16 h-1 bg-gradient-to-r from-[#0e6493] to-[#0e6493] mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="mb-8 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 text-green-800 rounded-xl flex items-center space-x-3 success-animation">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold">{successMessage}</span>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="mb-8 p-5 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 text-red-800 rounded-xl flex items-center space-x-3 error-animation">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Campo Email */}
              <div className="relative fade-in-up" style={{ animationDelay: '0.5s' }}>
                <label
                  htmlFor="email"
                  className={`floating-label ${
                    formData.email || focusedField === 'email' ? 'active' : ''
                  } ${validationErrors.email ? 'error' : ''}`}
                >
                  <User className="label-icon mr-2" size={14} />
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                    <User className={`h-6 w-6 transition-all duration-300 ${
                      focusedField === 'email' ? 'text-[#0e6493] scale-110' : 'text-gray-400'
                    } ${validationErrors.email ? 'text-red-500' : ''}`} />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-16 pr-5 py-5 rounded-xl input-field text-lg ${
                      validationErrors.email ? 'error' : ''
                    }`}
                    disabled={isLoading}
                    ref={emailInputRef}
                  />
                </div>
                {validationErrors.email && (
                  <p className="mt-3 text-sm text-red-600 flex items-center font-medium">
                    <AlertCircle size={18} className="mr-2" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Campo Contraseña */}
              <div className="relative fade-in-up" style={{ animationDelay: '0.7s' }}>
                <label
                  htmlFor="password"
                  className={`floating-label ${
                    formData.password || focusedField === 'password' ? 'active' : ''
                  } ${validationErrors.password ? 'error' : ''}`}
                >
                  <Lock className="label-icon mr-2" size={14} />
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-20">
                    <Lock className={`h-6 w-6 transition-all duration-300 ${
                      focusedField === 'password' ? 'text-[#0e6493] scale-110' : 'text-gray-400'
                    } ${validationErrors.password ? 'text-red-500' : ''}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-16 pr-16 py-5 rounded-xl input-field text-lg ${
                      validationErrors.password ? 'error' : ''
                    }`}
                    disabled={isLoading}
                    ref={passwordInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-[#0e6493] transition-all duration-300 transform hover:scale-110 z-20"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-3 text-sm text-red-600 flex items-center font-medium">
                    <AlertCircle size={18} className="mr-2" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Forgot password con hover al color del layout */}
              <div className="text-left fade-in-up" style={{ animationDelay: '0.9s' }}>
                <button
                  type="button"
                  onClick={() => alert('Funcionalidad de recuperación en desarrollo')}
                  className="text-base text-[#0e6493] hover:text-[#0e6493]/80 transition-all duration-300 font-semibold hover:scale-105 transform"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón de login con colores del layout */}
              <button
                type="submit"
                ref={buttonRef}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-5 px-8 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-[#0e6493] to-[#0e6493]/90 hover:from-[#0e6493]/90 hover:to-[#0e6493] focus:outline-none focus:ring-4 focus:ring-[#0e6493]/30 disabled:opacity-50 disabled:cursor-not-allowed login-button fade-in-up"
                style={{ animationDelay: '1.1s' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 animate-spin" size={24} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-3 transition-transform duration-300 group-hover:translate-x-2" size={24} />
                    <span>Iniciar Sesión</span>
                    <Sparkles className="ml-3 opacity-70" size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;