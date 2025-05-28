// frontend/src/components/Dashboard.js - VERSIÓN MEJORADA CON BACKEND

import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Bell, Menu, Search, Settings, User, Activity, Briefcase, PieChart as PieChartIcon, 
  Users, Calendar, ChevronUp, LogOut, ChevronDown, X, AlertCircle, RefreshCw,
  DollarSign, TrendingUp, UserCheck, Wifi, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApi, useApiList } from '../hooks/useApi';
import { reportsService, clientsService } from '../services/apiService';
import LogoutButton from './LogoutButton';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { currentUser, logout, hasPermission } = useAuth();

  // APIs para datos del dashboard
  const {
    data: dashboardStats,
    loading: statsLoading,
    error: statsError,
    execute: fetchStats
  } = useApi(reportsService.getFinancial);

  const {
    data: clientsStats,
    loading: clientsLoading,
    execute: fetchClientsStats
  } = useApi(clientsService.getStats);

  const {
    data: recentClients,
    loading: recentClientsLoading,
    execute: fetchRecentClients
  } = useApiList(clientsService.getAll, { limit: 5, sort: 'created_at', order: 'desc' });

  // Estados para gráficos
  const [chartData, setChartData] = useState([]);
  const [clientsChartData, setClientsChartData] = useState([]);

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

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats({ period: '6months' }),
        fetchClientsStats(),
        fetchRecentClients()
      ]);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    }
  };

  // Procesar datos para gráficos
  useEffect(() => {
    if (dashboardStats && dashboardStats.monthlyData) {
      setChartData(dashboardStats.monthlyData);
    }
  }, [dashboardStats]);

  useEffect(() => {
    if (clientsStats && clientsStats.por_sector) {
      setClientsChartData(clientsStats.por_sector);
    }
  }, [clientsStats]);

  const handleContentClick = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  // Datos por defecto mientras cargan
  const defaultStats = {
    total_ingresos: 0,
    total_clientes: 0,
    servicios_activos: 0,
    tasa_cobranza: 0
  };

  const stats = dashboardStats || defaultStats;
  const clientStats = clientsStats || { clientes_activos: 0, clientes_suspendidos: 0 };

  // Items del menú lateral según permisos
  const menuItems = [
    { icon: <Activity size={22} />, label: 'Dashboard', active: true, permission: null },
    { icon: <Users size={22} />, label: 'Clientes', permission: 'clients' },
    { icon: <DollarSign size={22} />, label: 'Facturación', permission: 'invoices' },
    { icon: <Briefcase size={22} />, label: 'Servicios', permission: 'services' },
    { icon: <PieChartIcon size={22} />, label: 'Reportes', permission: 'reports' },
    { icon: <Wifi size={22} />, label: 'Instalaciones', permission: 'installations' },
    { icon: <Calendar size={22} />, label: 'Calendario', permission: null },
    { icon: <Settings size={22} />, label: 'Configuración', permission: 'admin' }
  ].filter(item => !item.permission || hasPermission(item.permission));

  // Colores para gráficos
  const COLORS = ['#0e6493', '#e21f25', '#f59e0b', '#10b981', '#8b5cf6'];

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

              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-full hover:bg-gray-100 relative transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
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
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                      <User size={16} className="mr-2" />
                      Ver perfil
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                      <Settings size={16} className="mr-2" />
                      Configuración
                    </a>
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
              {hasPermission('clients') && (
                <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                  <Users size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Gestionar clientes</span>
                </button>
              )}
              {hasPermission('invoices') && (
                <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                  <DollarSign size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Ver facturación</span>
                </button>
              )}
              {hasPermission('reports') && (
                <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                  <PieChartIcon size={18} className="mr-2" />
                  <span className="text-sm md:text-base">Generar informes</span>
                </button>
              )}
            </div>
          </div>

          {/* Error handling */}
          {(statsError || clientsStats?.error) && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center space-x-2">
              <AlertCircle size={20} />
              <div>
                <p className="font-medium">Error cargando datos</p>
                <p className="text-sm">
                  {statsError || clientsStats?.error || 'Error desconocido'}
                </p>
              </div>
              <button 
                onClick={handleRefresh}
                className="ml-auto p-1 hover:bg-red-200 rounded"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Ingresos Totales"
              value={`$${(stats.total_ingresos || 0).toLocaleString()}`}
              icon={<DollarSign size={24} className="text-[#0e6493]" />}
              change="+12%"
              loading={statsLoading}
              color="#0e6493"
            />
            
            <StatCard
              title="Clientes Activos"
              value={(clientStats.clientes_activos || 0).toLocaleString()}
              icon={<UserCheck size={24} className="text-[#e21f25]" />}
              change="+8%"
              loading={clientsLoading}
              color="#e21f25"
            />
            
            <StatCard
              title="Servicios Activos"
              value={(stats.servicios_activos || 0).toLocaleString()}
              icon={<Wifi size={24} className="text-[#0e6493]" />}
              change="+5%"
              loading={statsLoading}
              color="#0e6493"
            />
            
            <StatCard
              title="Tasa de Cobranza"
              value={`${(stats.tasa_cobranza || 0).toFixed(1)}%`}
              icon={<TrendingUp size={24} className="text-[#10b981]" />}
              change="+2%"
              loading={statsLoading}
              color="#10b981"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ingresos Chart */}
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">
                Ingresos vs Gastos (6 meses)
              </h2>
              {statsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-[#0e6493]" />
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#0e6493"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gastos"
                        stroke="#e21f25"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Clientes por Sector */}
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">
                Clientes por Sector
              </h2>
              {clientsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-[#0e6493]" />
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientsChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_clientes"
                      >
                        {clientsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Recent Clients Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="px-4 py-3 flex justify-between items-center border-b">
              <h2 className="text-lg font-semibold text-[#0e6493]">Clientes Recientes</h2>
              <button className="px-4 py-2 text-sm rounded-lg text-white bg-[#0e6493] hover:bg-[#0e6493]/90 transition-colors">
                Ver Todos
              </button>
            </div>
            
            {recentClientsLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="animate-spin h-6 w-6 text-[#0e6493]" />
                <span className="ml-2">Cargando clientes...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Identificación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Registro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentClients?.data?.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{client.nombre}</div>
                            <div className="text-sm text-gray-500">{client.telefono}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.identificacion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.estado === 'activo'
                              ? 'bg-green-100 text-green-800'
                              : client.estado === 'suspendido'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {client.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(client.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Componente StatCard
const StatCard = ({ title, value, icon, change, loading, color }) => (
  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        {loading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-lg">Cargando...</span>
          </div>
        ) : (
          <p className="text-xl md:text-2xl font-bold">{value}</p>
        )}
      </div>
      <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
    </div>
    {!loading && change && (
      <div className="mt-2 flex items-center text-sm">
        <ChevronUp size={16} className="text-green-500" />
        <span className="text-green-500 font-medium">{change} </span>
        <span className="text-gray-500 ml-1">vs mes anterior</span>
      </div>
    )}
  </div>
);

export default Dashboard;