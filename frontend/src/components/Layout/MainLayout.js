// frontend/src/components/Layout/MainLayout.js

import React, { useState, useEffect } from 'react';
import { 
  Bell, Menu, Search, Settings, User, Activity, 
  Users, Calendar, ChevronUp, LogOut, ChevronDown, X,
  DollarSign, TrendingUp, UserCheck, Wifi, Loader2,
  Building2, CreditCard, MapPin, PieChart as PieChartIcon,
  Package, FileText, Wrench, BarChart3, Home
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import LogoutButton from '../LogoutButton';
import { ConfigSidebarNotification } from '../Config/ConfigNotifications';

const MainLayout = ({ children, title, subtitle, showWelcome = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { currentUser, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Estilos CSS para ocultar scrollbar
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;  /* Safari and Chrome */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleContentClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Items del menú lateral según permisos
  const menuItems = [
    { 
      icon: <Home size={22} />, 
      label: 'Dashboard', 
      path: '/dashboard',
      permission: null 
    },
    { 
      icon: <Users size={22} />, 
      label: 'Clientes', 
      path: '/clients',
      permission: 'supervisor' 
    },
    { 
      icon: <DollarSign size={22} />, 
      label: 'Facturación', 
      path: '/invoices',
      permission: 'supervisor' 
    },
    { 
      icon: <Wifi size={22} />, 
      label: 'Servicios', 
      path: '/services',
      permission: 'supervisor' 
    },
    { 
      icon: <PieChartIcon size={22} />, 
      label: 'Reportes', 
      path: '/reports',
      permission: 'supervisor' 
    },
    { 
      icon: <Wrench size={22} />, 
      label: 'Instalaciones', 
      path: '/installations',
      permission: 'instalador' 
    },
    { 
      icon: <Package size={22} />, 
      label: 'Inventario', 
      path: '/inventory',
      permission: 'supervisor' 
    },
    { 
      icon: <Calendar size={22} />, 
      label: 'Calendario', 
      path: '/calendar',
      permission: null 
    },
    { 
      icon: <Settings size={22} />, 
      label: 'Configuración', 
      path: '/config',
      permission: 'administrador' 
    }
  ].filter(item => !item.permission || hasPermission(item.permission));

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const isActivePath = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileOpen && !event.target.closest('.profile-menu')) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative z-30 backdrop-blur-xl bg-gradient-to-b from-[#0e6493]/95 to-[#0e6493]/85 border border-white/10 shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col ${
        sidebarOpen ? 'translate-x-0 w-64' : 'translate-x-0 md:translate-x-0 w-0 md:w-20'
      } overflow-hidden`}>
        {isMobile && sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 top-4 p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
          >
            <X size={18} />
          </button>
        )}
        
        <nav className="mt-16 flex-1 px-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center px-4 py-3 my-1 rounded-xl transition duration-300 cursor-pointer ${
                isActivePath(item.path)
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-[#0e6493]/50 hover:text-white text-white/80'
              }`}
              onClick={() => handleMenuClick(item.path)}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              {sidebarOpen && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
            </div>
          ))}
        </nav>
        
        {/* Notificaciones de configuración - Solo cuando sidebar está abierto */}
        {sidebarOpen && hasPermission('administrador') && (
          <div className="px-2 pb-2">
            <ConfigSidebarNotification />
          </div>
        )}
        
        {/* Botón de logout - Siempre visible en la parte inferior */}
        <div className="p-4 border-t border-white/10 mt-auto flex-shrink-0">
          {sidebarOpen ? (
            <LogoutButton variant="ghost" className="text-white hover:bg-white/20 w-full justify-start" />
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative" onClick={handleContentClick}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition duration-300"
              >
                <Menu size={22} className="text-gray-600" />
              </button>

              <div className="flex items-center">
                <img
                  src="/logo2.png"
                  alt="Logo"
                  className="h-14 w-auto object-contain scale-x-105"
                />
                <span className="ml-2 text-xl font-semibold text-[#0e6493] hidden sm:block">
                  Administrativo
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden md:block relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493]/70 w-40 lg:w-64 transition-all"
                  style={{ borderColor: '#0e6493' }}
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search size={18} />
                </div>
              </div>

              <button className="md:hidden p-2 rounded-full hover:bg-gray-100">
                <Search size={20} />
              </button>

              <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#e21f25]"></span>
              </button>

              <div className="w-px h-6 bg-gray-300 hidden sm:block"></div>

              {/* Menú de perfil */}
              <div className="relative profile-menu">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0e6493]/10 flex items-center justify-center overflow-hidden border border-[#0e6493]/30">
                    <User size={18} className="text-[#0e6493]" />
                  </div>
                  <span className="ml-2 font-medium hidden sm:block">
                    {currentUser?.nombre || 'Usuario'}
                  </span>
                  <ChevronDown size={16} className="ml-1 hidden sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{currentUser?.nombre}</p>
                      <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/profile')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <User size={16} className="mr-2" />
                      Ver perfil
                    </button>
                    <button 
                      onClick={() => navigate('/config')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <Settings size={16} className="mr-2" />
                      Configuración
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut size={16} className="mr-2" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Message (opcional) */}
        {showWelcome && (
          <div className="m-4 mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              ¡Hola, {currentUser?.nombre || 'Usuario'}!
            </h1>
            <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
              ¿Qué quieres hacer hoy?
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              {hasPermission('supervisor') && (
                <button 
                  onClick={() => navigate('/clients')}
                  className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                >
                  <Users size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Gestionar clientes</span>
                </button>
              )}
              {hasPermission('supervisor') && (
                <button 
                  onClick={() => navigate('/invoices')}
                  className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                >
                  <DollarSign size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Ver facturación</span>
                </button>
              )}
              {hasPermission('supervisor') && (
                <button 
                  onClick={() => navigate('/reports')}
                  className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                >
                  <PieChartIcon size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Generar informes</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;