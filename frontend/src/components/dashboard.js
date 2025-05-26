import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Bell, Menu, Search, Settings, User, Activity, Briefcase, PieChart, Users, Calendar, ChevronUp, LogOut, ChevronDown, X } from 'lucide-react';

const data = [
    { name: 'Ene', ingresos: 4000, gastos: 2400, clientes: 240 },
    { name: 'Feb', ingresos: 3000, gastos: 1398, clientes: 210 },
    { name: 'Mar', ingresos: 2000, gastos: 9800, clientes: 290 },
    { name: 'Abr', ingresos: 2780, gastos: 3908, clientes: 200 },
    { name: 'May', ingresos: 1890, gastos: 4800, clientes: 218 },
    { name: 'Jun', ingresos: 2390, gastos: 3800, clientes: 250 },
    { name: 'Jul', ingresos: 3490, gastos: 4300, clientes: 210 },
];

const projectData = [
    { id: 1, nombre: 'Implementación ERP', progreso: 75, estado: 'En proceso', responsable: 'María López' },
    { id: 2, nombre: 'Migración de datos', progreso: 45, estado: 'En proceso', responsable: 'Juan Pérez' },
    { id: 3, nombre: 'Actualización de servidores', progreso: 90, estado: 'Casi completo', responsable: 'Ana García' },
    { id: 4, nombre: 'Desarrollo app móvil', progreso: 30, estado: 'Iniciado', responsable: 'Carlos Ruiz' },
];

const Dashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const userName = "Carlos Rodríguez";

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

            <div className={`fixed md:relative z-30 backdrop-blur-xl bg-gradient-to-b from-[#0e6493]/95 to-[#0e6493]/85 border border-white/10 shadow-lg transition-all duration-300 ease-in-out h-screen flex flex-col ${sidebarOpen ? 'translate-x-0 w-64' : 'translate-x-0 md:translate-x-0 w-0 md:w-20'
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
                    {[
                        { icon: <Activity size={22} />, label: 'Dashboard', active: true },
                        { icon: <Briefcase size={22} />, label: 'Proyectos' },
                        { icon: <Users size={22} />, label: 'Clientes' },
                        { icon: <PieChart size={22} />, label: 'Informes' },
                        { icon: <Calendar size={22} />, label: 'Calendario' },
                        { icon: <Settings size={22} />, label: 'Configuración' }
                    ].map((item, index) => (
                        <div
                            key={index}
                            className={`flex items-center px-4 py-3 my-1 rounded-xl transition duration-300 cursor-pointer ${item.active
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
                        <div className="flex items-center text-white/80 hover:text-white cursor-pointer transition-all">
                            <LogOut size={20} />
                            <span className="ml-3">Cerrar sesión</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden relative" onClick={handleContentClick}>
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-4 py-3 flex items-center justify-between">
                        {/* Logo y toggle del menú */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition duration-300"
                            >
                                <Menu size={22} className="text-gray-600" />
                            </button>

                            {/* Logo en el navbar */}
                            <div className="flex items-center">
                                <img
                                    src="/logo2.png"
                                    alt="Logo"
                                    className="h-14 w-auto object-contain scale-x-105"
                                />

                                <span className="ml-2 text-xl font-semibold text-[#0e6493] hidden sm:block">Administrativo</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Búsqueda - solo visible en pantallas medianas o grandes */}
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

                            {/* Icono de búsqueda en móvil */}
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
                                    <span className="ml-2 font-medium hidden sm:block">{userName}</span>
                                    <ChevronDown size={16} className="ml-1 hidden sm:block" />
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                                            <User size={16} className="mr-2" />
                                            Ver perfil
                                        </a>
                                        <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                                            <Settings size={16} className="mr-2" />
                                            Configuración
                                        </a>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center">
                                            <LogOut size={16} className="mr-2" />
                                            Cerrar sesión
                                        </a>
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
                        {/* Decoraciones de fondo */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                        <h1 className="text-2xl md:text-3xl font-bold mb-2">¡Hola, {userName}!</h1>
                        <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">¿Qué quieres hacer hoy?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                            <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                                <Briefcase size={18} className="mr-2" />
                                <span className="text-sm md:text-base">Gestionar proyectos</span>
                            </button>
                            <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                                <Users size={18} className="mr-2" />
                                <span className="text-sm md:text-base">Ver clientes</span>
                            </button>
                            <button className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start">
                                <PieChart size={18} className="mr-2" />
                                <span className="text-sm md:text-base">Generar informes</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#0e6493' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Ingresos Totales</p>
                                    <p className="text-xl md:text-2xl font-bold">$24,780</p>
                                </div>
                                <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(14, 100, 147, 0.1)' }}>
                                    <Activity size={24} className="text-[#0e6493]" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm">
                                <ChevronUp size={16} className="text-green-500" />
                                <span className="text-green-500 font-medium">12% </span>
                                <span className="text-gray-500 ml-1">vs mes anterior</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#e21f25' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Nuevos Clientes</p>
                                    <p className="text-xl md:text-2xl font-bold">324</p>
                                </div>
                                <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(226, 31, 37, 0.1)' }}>
                                    <Users size={24} className="text-[#e21f25]" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm">
                                <ChevronUp size={16} className="text-green-500" />
                                <span className="text-green-500 font-medium">8% </span>
                                <span className="text-gray-500 ml-1">vs mes anterior</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#0e6493' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Proyectos Activos</p>
                                    <p className="text-xl md:text-2xl font-bold">12</p>
                                </div>
                                <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(14, 100, 147, 0.1)' }}>
                                    <Briefcase size={24} className="text-[#0e6493]" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm">
                                <ChevronUp size={16} className="text-green-500" />
                                <span className="text-green-500 font-medium">5% </span>
                                <span className="text-gray-500 ml-1">vs mes anterior</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: '#e21f25' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tasa de Éxito</p>
                                    <p className="text-xl md:text-2xl font-bold">96%</p>
                                </div>
                                <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(226, 31, 37, 0.1)' }}>
                                    <PieChart size={24} className="text-[#e21f25]" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm">
                                <ChevronUp size={16} className="text-green-500" />
                                <span className="text-green-500 font-medium">2% </span>
                                <span className="text-gray-500 ml-1">vs mes anterior</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                            <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">Ingresos vs Gastos</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                            <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">Clientes por Mes</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar
                                            dataKey="clientes"
                                            fill="#0e6493"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Projects table */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="px-4 py-3 flex justify-between items-center border-b">
                            <h2 className="text-lg font-semibold text-[#0e6493]">Proyectos Activos</h2>
                            <button className="px-4 py-2 text-sm rounded-lg text-white bg-[#0e6493] hover:bg-[#0e6493]/90 transition-colors">
                                Ver Todos
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {projectData.map((project) => (
                                        <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.nombre}</td>
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
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.estado === 'Casi completo'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : project.estado === 'En proceso'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {project.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.responsable}</td>
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

export default Dashboard;