import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, User, Lock, Building } from 'lucide-react';

const LoginComponent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  // Referencias para animación
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const buttonRef = useRef(null);

  // Efecto para animar los elementos al cargar
  useEffect(() => {
    const elements = [
      emailInputRef.current,
      passwordInputRef.current,
      buttonRef.current,
    ];

    elements.forEach((el, i) => {
      if (el) {
        setTimeout(() => {
          el.style.opacity = 1;
          el.style.transform = 'translateY(0)';
        }, 150 * i);
      }
    });
  }, []);

  // Simulación de funciones del contexto para el demo
  const clearError = () => setError('');

  // Limpiar errores después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

  // Animación al enfocar un campo
  const handleFocus = (e) => {
    const label = e.target.previousElementSibling;
    if (label) {
      label.style.transform = 'translateY(-24px)';
      label.style.fontSize = '0.75rem';
      label.style.color = '#0e6493';
    }
  };

  // Animación al perder el foco
  const handleBlur = (e) => {
    const label = e.target.previousElementSibling;
    if (label && !e.target.value) {
      label.style.transform = 'translateY(0)';
      label.style.fontSize = '1rem';
      label.style.color = '#6b7280';
    }
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulación de login para el demo
    setTimeout(() => {
      if (formData.email === 'admin@empresa.com' && formData.password === 'password') {
        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...');
        setIsLoading(false);

        // Animación de éxito
        if (buttonRef.current) {
          buttonRef.current.classList.add('animate-pulse');
          setTimeout(() => {
            if (buttonRef.current) {
              buttonRef.current.classList.remove('animate-pulse');
            }
          }, 1500);
        }
      } else {
        setError('Credenciales incorrectas');
        setIsLoading(false);

        // Animación de error
        if (buttonRef.current) {
          buttonRef.current.classList.add('shake');
          setTimeout(() => {
            if (buttonRef.current) {
              buttonRef.current.classList.remove('shake');
            }
          }, 500);
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <style jsx>{`
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        
        .floating-label {
          position: absolute;
          left: 44px;
          top: 14px;
          color: #6b7280;
          pointer-events: none;
          transition: all 0.2s ease-out;
        }
        
        .input-field {
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          box-shadow: 0 0 0 3px rgba(14, 100, 147, 0.2);
        }
        
        .login-container {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }
        
        .illustration-container {
          position: relative;
          overflow: hidden;
        }
        
        .illustration-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
          transform: rotate(30deg);
          animation: rotate 20s linear infinite;
        }
        
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Contenedor principal */}
      <div className="w-full max-w-6xl flex bg-white rounded-3xl login-container overflow-hidden">

        {/* Panel izquierdo - Imagen */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0e6493] to-[#1e7ba8] p-8 flex-col justify-center items-center illustration-container">
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 w-4/5">
              <img
                src="fondo2.png"
                alt="Login Illustration"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Decoración animada */}
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm animate-ping-slow"></div>
          <div className="absolute top-1/4 right-20 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm animate-bounce"></div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">

            {/* Encabezado animado */}
            <div className="text-center mb-8 transform transition-all duration-500 hover:scale-105">

              <h2 className="text-3xl font-bold text-[#0e6493] mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-gray-500">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center space-x-2 animate-fade-in">
                <CheckCircle size={20} />
                <span className="text-sm">{successMessage}</span>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center space-x-2 animate-fade-in">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Campo Email */}
              <div className="space-y-2 relative">
                <label
                  htmlFor="email"
                  className="floating-label"
                  style={{
                    transform: formData.email ? 'translateY(-24px)' : 'translateY(0)',
                    fontSize: formData.email ? '0.75rem' : '1rem',
                    color: formData.email ? '#0e6493' : '#6b7280'
                  }}
                >
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none input-field ${validationErrors.email
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-[#0e6493] focus:border-[#0e6493]'
                      }`}
                    placeholder=""
                    disabled={isLoading}
                    ref={emailInputRef}
                    style={{ opacity: 0, transform: 'translateY(20px)', transition: 'all 0.4s ease' }}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-600 flex items-center space-x-1 animate-fade-in">
                    <AlertCircle size={16} />
                    <span>{validationErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-2 relative">
                <label
                  htmlFor="password"
                  className="floating-label"
                  style={{
                    transform: formData.password ? 'translateY(-24px)' : 'translateY(0)',
                    fontSize: formData.password ? '0.75rem' : '1rem',
                    color: formData.password ? '#0e6493' : '#6b7280'
                  }}
                >
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none input-field ${validationErrors.password
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-[#0e6493] focus:border-[#0e6493]'
                      }`}
                    placeholder=""
                    disabled={isLoading}
                    ref={passwordInputRef}
                    style={{ opacity: 0, transform: 'translateY(20px)', transition: 'all 0.4s ease 0.1s' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#0e6493] transition transform hover:scale-110"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-red-600 flex items-center space-x-1 animate-fade-in">
                    <AlertCircle size={16} />
                    <span>{validationErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Recordar y Olvidé contraseña */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded transform transition hover:scale-105"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600 hover:text-gray-800 transition">
                    Recordarme
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-[#0e6493] hover:text-[#0e6493]/80 transition transform hover:-translate-y-0.5"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón de login */}
              <button
                type="submit"
                ref={buttonRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isLoading}
                className={`w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-[#0e6493] to-[#1e7ba8] hover:from-[#0d5a7f] hover:to-[#186c94] focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:ring-offset-2 transition-all duration-300 transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  transition: 'all 0.4s ease 0.2s',
                  boxShadow: isHovered ? '0 10px 20px -5px rgba(14, 100, 147, 0.3)' : '0 4px 6px -1px rgba(14, 100, 147, 0.1)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={20} />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 transition-transform group-hover:translate-x-1" size={20} />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>

            {/* Enlaces adicionales */}
            <div className="mt-8 text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">¿Necesitas ayuda?</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Contacta con soporte técnico
                </p>
                <button
                  type="button"
                  className="text-sm text-[#0e6493] hover:text-[#0e6493]/80 transition transform hover:-translate-y-0.5"
                >
                  soporte@empresa.com
                </button>
              </div>
            </div>

            {/* Información de desarrollo */}
            <div className="mt-8 p-4 bg-blue-50 rounded-xl text-xs text-blue-800 border border-blue-100 animate-fade-in">
              <p className="font-medium mb-1">Demo - Credenciales de prueba:</p>
              <p>Usuario: admin@empresa.com</p>
              <p>Contraseña: password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;