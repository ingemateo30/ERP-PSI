// frontend/src/components/SimpleDashboard.js

import React, { useState, useEffect } from 'react';
import { 
  Bell, Menu, Search, Settings, User, Activity, 
  Users, Calendar, ChevronUp, LogOut, ChevronDown, X,
  DollarSign, TrendingUp, UserCheck, Wifi, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LogoutButton from './LogoutButton';

const SimpleDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { currentUser, logout, hasPermission } = useAuth();

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

  // Datos de ejemplo para el dashboard
  const exampleStats = {
    totalIngresos: 24780000,
    clientesActivos: 324,
    serviciosActivos: 298,
    tasaCobranza: 96.2
  };

  const exampleChartData = [
    { mes: 'Ene', ingresos: 4000000, gastos: 2400000, clientes: 240 },
    { mes: 'Feb', ingresos: 3000000, gastos: 1398000, clientes: 210 },
    { mes: 'Mar', ingresos: 2000000, gastos: 1800000, clientes: 290 },
    { mes: 'Abr', ingresos: 2780000, gastos: 1908000, clientes: 200 },
    { mes: 'May', ingresos: 1890000, gastos: 1800000, clientes: 218 },
    { mes: 'Jun', ingresos: 2390000, gastos: 1800000, clientes: 250 }
  ];

  const exampleProjects = [
    { id: 1, nombre: 'Instalación Sector Norte', progreso: 75, estado: 'En proceso', responsable: 'María López' },
    { id: 2, nombre: 'Migración de equipos', progreso: 45, estado: 'En proceso', responsable: 'Juan Pérez' },
    { id: 3, nombre: 'Actualización de red', progreso: 90, estado: 'Casi completo', responsable: 'Ana García' },
    { id: 4, nombre: 'Expansión Zona Sur', progreso: 30, estado: 'Iniciado', responsable: 'Carlos Ruiz' }
  ];

  // Items del menú lateral
  const menuItems = [
    { icon: <Activity size={22} />, label: 'Dashboard', active: true },
    { icon: <Users size={22} />, label: 'Clientes' },
    { icon: <DollarSign size={22} />, label: 'Facturación' },
    { icon: <Wifi size={22} />, label: 'Servicios' },
    { icon: <TrendingUp size={22} />, label: 'Reportes' },
    { icon: <Calendar size={22} />, label: 'Instalaciones' },
    { icon: <Settings size={22} />, label: 'Configuración' }
  ];

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
        
        <nav className="mt-16 flex-1 px-2">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center px-4 py-3 my-1 rounded-xl transition duration-300 cursor-pointer ${
                item.active
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-[#0e6493]/50 hover:text-white text-white/80'
              }`}
              onClick={() => {
                if (!item.active) {
                  alert(`Funcionalidad "${item.label}" en desarrollo`);
                }
              }}
            >
              <div className="flex items-center justify-center">
                {item.icon}
              </div>
              {sidebarOpen && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
            </div>
          ))}
        </nav>
        
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10 mt-auto">
            <LogoutButton variant="ghost" className="text-white hover:bg-white/20 w-full justify-start" />
          </div>
        )}
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
                      onClick={() => window.location.href = '/profile'}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <User size={16} className="mr-2" />
                      Ver perfil
                    </button>
                    <button 
                      onClick={() => alert('Configuración en desarrollo')}
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

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          {/* Welcome Message */}
          <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              ¡Hola, {currentUser?.nombre || 'Usuario'}!
            </h1>
            <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
              ¿Qué quieres hacer hoy?
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              <button 
                onClick={() => alert('Gestión de clientes en desarrollo')}
                className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
              >
                <Users size={18} className="mr-2" />
                <span className="text-sm md:text-base">Gestionar clientes</span>
              </button>
              <button 
                onClick={() => alert('Facturación en desarrollo')}
                className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
              >
                <DollarSign size={18} className="mr-2" />
                <span className="text-sm md:text-base">Ver facturación</span>
              </button>
              <button 
                onClick={() => alert('Reportes en desarrollo')}
                className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
              >
                <TrendingUp size={18} className="mr-2" />
                <span className="text-sm md:text-base">Generar informes</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Ingresos Totales"
              value={`$${exampleStats.totalIngresos.toLocaleString()}`}
              icon={<DollarSign size={24} className="text-[#0e6493]" />}
              change="+12%"
              color="#0e6493"
            />
            
            <StatCard
              title="Clientes Activos"
              value={exampleStats.clientesActivos.toLocaleString()}
              icon={<UserCheck size={24} className="text-[#e21f25]" />}
              change="+8%"
              color="#e21f25"
            />
            
            <StatCard
              title="Servicios Activos"
              value={exampleStats.serviciosActivos.toLocaleString()}
              icon={<Wifi size={24} className="text-[#0e6493]" />}
              change="+5%"
              color="#0e6493"
            />
            
            <StatCard
              title="Tasa de Cobranza"
              value={`${exampleStats.tasaCobranza}%`}
              icon={<TrendingUp size={24} className="text-[#10b981]" />}
              change="+2%"
              color="#10b981"
            />
          </div>

          {/* Chart Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">
                Ingresos Mensuales
              </h2>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Gráfico de ingresos</p>
                  <p className="text-sm text-gray-400">Datos de ejemplo</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">
                Clientes por Mes
              </h2>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Users size={48} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Gráfico de clientes</p>
                  <p className="text-sm text-gray-400">Datos de ejemplo</p>
                </div>
              </div>
            </div>
          </div>

          {/* Projects table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="px-4 py-3 flex justify-between items-center border-b">
              <h2 className="text-lg font-semibold text-[#0e6493]">Proyectos Activos</h2>
              <button 
                onClick={() => alert('Ver todos los proyectos en desarrollo')}
                className="px-4 py-2 text-sm rounded-lg text-white bg-[#0e6493] hover:bg-[#0e6493]/90 transition-colors"
              >
                Ver Todos
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proyecto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsable
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exampleProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${project.progreso}%`,
                              backgroundColor: project.progreso > 66 ? '#0e6493' : project.progreso > 33 ? '#f59e0b' : '#e21f25'
                            }}
                          ></div>
                        </div>
                        <span className="text-xs ml-1">{project.progreso}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.estado === 'Casi completo'
                            ? 'bg-blue-100 text-blue-800'
                            : project.estado === 'En proceso'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {project.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.responsable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Componente StatCard
const StatCard = ({ title, value, icon, change, color }) => (
  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl md:text-2xl font-bold">{value}</p>
      </div>
      <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
    </div>
    {change && (
      <div className="mt-2 flex items-center text-sm">
        <ChevronUp size={16} className="text-green-500" />
        <span className="text-green-500 font-medium">{change} </span>
        <span className="text-gray-500 ml-1">vs mes anterior</span>
      </div>
    )}
  </div>
);

export default SimpleDashboard;