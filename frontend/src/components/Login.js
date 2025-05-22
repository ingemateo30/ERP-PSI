import React, { useState } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const LoginComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Intento de inicio de sesión:', { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-4xl flex shadow-2xl rounded-3xl overflow-hidden">
        <div
          className="hidden md:block w-1/2"
          style={{
            backgroundImage: 'url("/fondo2.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
        </div>
        <div className="w-full md:w-1/2 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/30 relative overflow-hidden">
        
          <div className="absolute -inset-0.5 bg-gradient-to-tr from-white/50 to-transparent opacity-20 pointer-events-none"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#0e6493]/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#e21f25]/10 rounded-full blur-3xl"></div>

          <div className="text-center mb-8 relative">
            <h2 className="text-4xl font-bold text-[#0e6493] mb-2 transform transition-transform duration-300 hover:scale-105 drop-shadow-md">
              PSI Login
            </h2>
            <p className="text-gray-600/90 backdrop-blur-sm">Acceso Seguro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0e6493] mb-2 drop-shadow-sm">
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/60 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0e6493]/70 transition duration-300 hover:border-[#0e6493]/40"
                placeholder="tu.correo@ejemplo.com"
                required
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-[#0e6493] mb-2 drop-shadow-sm">
                Contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/60 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0e6493]/70 transition duration-300 hover:border-[#0e6493]/40 pr-12"
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-[#0e6493] hover:text-[#e21f25] transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded bg-white/70"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-900/80">
                  Recuérdame
                </label>
              </div>
              <div>
                <a
                  href="#"
                  className="text-sm text-[#e21f25] hover:text-[#e21f25]/80 transition drop-shadow-sm"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <button
              type="submit"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="w-full flex justify-center items-center py-3 px-4 border border-[#0e6493]/30 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0e6493]/80 backdrop-blur-md hover:bg-[#0e6493]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] transition duration-300 ease-in-out transform hover:scale-105"
            >
              <LogIn className={`mr-2 transition-transform ${isHovered ? 'animate-bounce' : ''}`} size={20} />
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <p className="text-sm text-gray-600/90 backdrop-blur-sm">
              ¿No tienes una cuenta?{' '}
              <a
                href="/dashboard"
                className="font-medium text-[#e21f25] hover:text-[#e21f25]/80 transition drop-shadow-sm"
              >
                Regístrate
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;