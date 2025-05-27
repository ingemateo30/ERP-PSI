// frontend/src/components/LogoutButton.js
import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LogoutButton = ({ 
  variant = 'default', 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const { logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Estilos según variante
  const variants = {
    default: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    outline: 'border-red-600 text-red-600 hover:bg-red-50 bg-transparent',
    ghost: 'text-red-600 hover:bg-red-50 bg-transparent border-transparent',
    minimal: 'text-gray-600 hover:text-red-600 bg-transparent border-transparent'
  };

  // Tamaños
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };

  const baseClasses = `
    inline-flex items-center justify-center rounded-lg border transition-colors 
    duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 
    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut || isLoading}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      title="Cerrar sesión"
    >
      {isLoggingOut ? (
        <Loader2 
          size={iconSizes[size]} 
          className={`animate-spin ${showText ? 'mr-2' : ''}`} 
        />
      ) : (
        <LogOut 
          size={iconSizes[size]} 
          className={showText ? 'mr-2' : ''} 
        />
      )}
      {showText && (
        <span>
          {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
        </span>
      )}
    </button>
  );
};

export default LogoutButton;