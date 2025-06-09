// frontend/src/components/SimpleDashboard.js

import React, { useState, useEffect } from 'react';
import {
    DollarSign, TrendingUp, UserCheck, Wifi, Users,
    ChevronUp, PieChart as PieChartIcon, Settings,
    Wrench, Calendar, Clock, CheckCircle, AlertTriangle,
    Package, MapPin, Activity, FileText, CreditCard,
    Shield, Database, BarChart3, TypeIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MainLayout from './Layout/MainLayout';

const SimpleDashboard = () => {
    const { currentUser, hasPermission } = useAuth();
    const navigate = useNavigate();

    // Renderizar dashboard según el rol
    const renderDashboardByRole = () => {
        if (hasPermission('administrador')) {
            return <AdminDashboard />;
        } else if (hasPermission('supervisor')) {
            return <SupervisorDashboard />;
        } else if (hasPermission('instalador')) {
            return <InstaladorDashboard />;
        } else if (hasPermission('operador')) {
            return <OperadorDashboard />;
        } else {
            return <DefaultDashboard />;
        }
    };

    return (
        <MainLayout title="Dashboard" subtitle="Resumen general del sistema" showWelcome={false}>
            {renderDashboardByRole()}
        </MainLayout>
    );
};

// ===================================
// DASHBOARD PARA ADMINISTRADORES
// ===================================
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const adminStats = {
        totalUsuarios: 12,
        usuariosActivos: 10,
        configuracionCompleta: 85,
        ultimoBackup: '2 horas'
    };

    const configuracionPendiente = [
        { modulo: 'Configuración de Empresa', completado: 90, urgente: false },
        { modulo: 'Bancos y Formas de Pago', completado: 75, urgente: true },
        { modulo: 'Conceptos de Facturación', completado: 60, urgente: false },
        { modulo: 'Planes de Servicio', completado: 40, urgente: true }
    ];

    return (
        <>
            {/* Welcome Message específico para Admin */}
            <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    ¡Hola, {currentUser?.nombre || 'Usuario'}!
                </h1>
                <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
                    ¿Qué quieres hacer hoy?,gestiona y configura todo el sistema
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/config')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Settings size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Configuración</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Shield size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Usuarios</span>
                    </button>
                    <button
                        onClick={() => navigate('/reportes-regulatorios')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <BarChart3 size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Reportes</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards para Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Usuarios"
                    value={adminStats.totalUsuarios}
                    icon={<Users size={24} className="text-[#0e6493]" />}
                    change="+2"
                    color="#0e6493"
                />
                <StatCard
                    title="Usuarios Activos"
                    value={adminStats.usuariosActivos}
                    icon={<UserCheck size={24} className="text-[#10b981]" />}
                    change="83%"
                    color="#10b981"
                />
                <StatCard
                    title="Config. Completa"
                    value={`${adminStats.configuracionCompleta}%`}
                    icon={<Settings size={24} className="text-[#f59e0b]" />}
                    change="+15%"
                    color="#f59e0b"
                />
                <StatCard
                    title="Último Backup"
                    value={adminStats.ultimoBackup}
                    icon={<Database size={24} className="text-[#6366f1]" />}
                    change="OK"
                    color="#6366f1"
                />
            </div>

            {/* Configuración pendiente */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-[#0e6493] mb-4">Estado de Configuración</h2>
                <div className="space-y-4">
                    {configuracionPendiente.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${item.urgente ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <span className="font-medium">{item.modulo}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-[#0e6493] h-2 rounded-full transition-all"
                                        style={{ width: `${item.completado}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-600 min-w-[3rem]">{item.completado}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Accesos rápidos para admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <QuickAccessCard
                    title="Gestión de Usuarios"
                    description="Administrar usuarios y permisos"
                    icon={<Shield size={32} className="text-[#0e6493]" />}
                    onClick={() => navigate('/admin/users')}
                    color="#0e6493"
                />
                <QuickAccessCard
                    title="Configuración Global"
                    description="Configurar parámetros del sistema"
                    icon={<Settings size={32} className="text-[#e21f25]" />}
                    onClick={() => navigate('/config')}
                    color="#e21f25"
                />
                <QuickAccessCard
                    title="Respaldos y Seguridad"
                    description="Gestionar backups y seguridad"
                    icon={<Database size={32} className="text-[#10b981]" />}
                    onClick={() => alert('Funcionalidad en desarrollo')}
                    color="#10b981"
                />
            </div>
        </>
    );
};

// ===================================
// DASHBOARD PARA SUPERVISORES
// ===================================
const SupervisorDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const supervisorStats = {
        clientesActivos: 324,
        facturacionMes: 24780000,
        serviciosActivos: 298,
        tasaCobranza: 96.2
    };

    const reportesRecientes = [
        { nombre: 'Facturación Mayo', fecha: '2024-05-31', estado: 'Completado' },
        { nombre: 'Clientes Morosos', fecha: '2024-06-01', estado: 'Pendiente' },
        { nombre: 'Servicios Activos', fecha: '2024-06-02', estado: 'En proceso' },
        { nombre: 'Ingresos por Sector', fecha: '2024-06-03', estado: 'Completado' }
    ];

    return (
        <>
            {/* Welcome Message para Supervisor */}
            <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    ¡Hola, {currentUser?.nombre || 'Usuario'}!
                </h1>
                <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
                    ¿Qué quieres hacer hoy?,Controla las operaciones del negocio
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/clients')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Users size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Clientes</span>
                    </button>
                    <button
                        onClick={() => navigate('/invoices')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <CreditCard size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Facturación</span>
                    </button>
                    <button
                        onClick={() => navigate('/reports')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <PieChartIcon size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Reportes</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards para Supervisor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Clientes Activos"
                    value={supervisorStats.clientesActivos.toLocaleString()}
                    icon={<Users size={24} className="text-[#0e6493]" />}
                    change="+8%"
                    color="#0e6493"
                />
                <StatCard
                    title="Facturación Mes"
                    value={`$${supervisorStats.facturacionMes.toLocaleString()}`}
                    icon={<DollarSign size={24} className="text-[#10b981]" />}
                    change="+12%"
                    color="#10b981"
                />
                <StatCard
                    title="Servicios Activos"
                    value={supervisorStats.serviciosActivos.toLocaleString()}
                    icon={<Wifi size={24} className="text-[#6366f1]" />}
                    change="+5%"
                    color="#6366f1"
                />
                <StatCard
                    title="Tasa Cobranza"
                    value={`${supervisorStats.tasaCobranza}%`}
                    icon={<TrendingUp size={24} className="text-[#f59e0b]" />}
                    change="+2%"
                    color="#f59e0b"
                />
            </div>

            {/* Reportes recientes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Gráfico de ingresos */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">Ingresos del Mes</h2>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center">
                            <TrendingUp size={48} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500">Gráfico de ingresos</p>
                            <p className="text-sm text-gray-400">Datos actualizados</p>
                        </div>
                    </div>
                </div>

                {/* Reportes recientes */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h2 className="text-lg font-semibold mb-4 text-[#0e6493]">Reportes Recientes</h2>
                    <div className="space-y-3">
                        {reportesRecientes.map((reporte, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div>
                                    <p className="font-medium text-gray-900">{reporte.nombre}</p>
                                    <p className="text-sm text-gray-500">{reporte.fecha}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${reporte.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                                    reporte.estado === 'En proceso' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {reporte.estado}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

// ===================================
// DASHBOARD PARA INSTALADORES
// ===================================
const InstaladorDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const instaladorStats = {
        instalacionesPendientes: 8,
        instalacionesCompletadas: 15,
        mantenimientosProgramados: 5,
        equiposDisponibles: 24
    };

    const trabajosHoy = [
        { cliente: 'María González', direccion: 'Calle 15 #23-45', hora: '09:00', tipo: 'Instalación' },
        { cliente: 'Juan Pérez', direccion: 'Carrera 8 #12-34', hora: '11:30', tipo: 'Mantenimiento' },
        { cliente: 'Ana Rodríguez', direccion: 'Avenida 20 #45-67', hora: '14:00', tipo: 'Instalación' },
        { cliente: 'Carlos Ruiz', direccion: 'Calle 22 #33-11', hora: '16:30', tipo: 'Reparación' }
    ];

    return (
        <>
            {/* Welcome Message para Instalador */}
            <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    ¡Hola, {currentUser?.nombre || 'Usuario'}!
                </h1>
                <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
                    ¿Qué quieres hacer hoy?,Gestiona tus trabajos de campo
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/installations')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Wrench size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Mis Trabajos</span>
                    </button>
                    <button
                        onClick={() => navigate('/calendar')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Calendar size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Calendario</span>
                    </button>
                    <button
                        onClick={() => navigate('/inventory')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Package size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Inventario</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards para Instalador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Pendientes"
                    value={instaladorStats.instalacionesPendientes}
                    icon={<Clock size={24} className="text-[#f59e0b]" />}
                    change="2 hoy"
                    color="#f59e0b"
                />
                <StatCard
                    title="Completadas"
                    value={instaladorStats.instalacionesCompletadas}
                    icon={<CheckCircle size={24} className="text-[#10b981]" />}
                    change="3 esta semana"
                    color="#10b981"
                />
                <StatCard
                    title="Mantenimientos"
                    value={instaladorStats.mantenimientosProgramados}
                    icon={<TypeIcon size={24} className="text-[#6366f1]" />}
                    change="2 mañana"
                    color="#6366f1"
                />
                <StatCard
                    title="Equipos Disponibles"
                    value={instaladorStats.equiposDisponibles}
                    icon={<Package size={24} className="text-[#0e6493]" />}
                    change="En almacén"
                    color="#0e6493"
                />
            </div>

            {/* Trabajos de hoy */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-[#0e6493]">Trabajos de Hoy</h2>
                    <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="space-y-3">
                    {trabajosHoy.map((trabajo, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${trabajo.tipo === 'Instalación' ? 'bg-blue-500' :
                                    trabajo.tipo === 'Mantenimiento' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}></div>
                                <div>
                                    <p className="font-medium text-gray-900">{trabajo.cliente}</p>
                                    <p className="text-sm text-gray-500 flex items-center">
                                        <MapPin size={14} className="mr-1" />
                                        {trabajo.direccion}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-[#0e6493]">{trabajo.hora}</p>
                                <p className="text-sm text-gray-500">{trabajo.tipo}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

// ===================================
// DASHBOARD PARA OPERADORES
// ===================================
const OperadorDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const operadorStats = {
        llamadasHoy: 23,
        ticketsAbiertos: 12,
        clientesAtendidos: 18,
        tiempoPromedio: '4.5 min'
    };

    return (
        <>
            {/* Welcome Message para Operador */}
            <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Panel de Atención al Cliente
                </h1>
                <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
                    Gestiona la atención y soporte
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/clients')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <Users size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Consultar Clientes</span>
                    </button>
                    <button
                        onClick={() => alert('Funcionalidad en desarrollo')}
                        className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center justify-center sm:justify-start"
                    >
                        <FileText size={18} className="mr-2" />
                        <span className="text-sm md:text-base">Tickets</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards para Operador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Llamadas Hoy"
                    value={operadorStats.llamadasHoy}
                    icon={<Activity size={24} className="text-[#0e6493]" />}
                    change="+5"
                    color="#0e6493"
                />
                <StatCard
                    title="Tickets Abiertos"
                    value={operadorStats.ticketsAbiertos}
                    icon={<AlertTriangle size={24} className="text-[#f59e0b]" />}
                    change="3 urgentes"
                    color="#f59e0b"
                />
                <StatCard
                    title="Clientes Atendidos"
                    value={operadorStats.clientesAtendidos}
                    icon={<UserCheck size={24} className="text-[#10b981]" />}
                    change="Hoy"
                    color="#10b981"
                />
                <StatCard
                    title="Tiempo Promedio"
                    value={operadorStats.tiempoPromedio}
                    icon={<Clock size={24} className="text-[#6366f1]" />}
                    change="Óptimo"
                    color="#6366f1"
                />
            </div>

            {/* Panel de tickets pendientes */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-[#0e6493] mb-4">Tickets Pendientes</h2>
                <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Sistema de tickets en desarrollo</p>
                    <button
                        onClick={() => alert('Funcionalidad próximamente')}
                        className="mt-4 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                    >
                        Ver Todos los Tickets
                    </button>
                </div>
            </div>
        </>
    );
};

// ===================================
// DASHBOARD POR DEFECTO
// ===================================
const DefaultDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    return (
        <>
            <div className="mb-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl p-5 shadow-lg text-white overflow-hidden relative">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    ¡Bienvenido, {currentUser?.nombre}!
                </h1>
                <p className="text-lg md:text-xl mb-4 md:mb-6 opacity-90">
                    Tu rol no tiene permisos específicos configurados
                </p>

                <button
                    onClick={() => navigate('/profile')}
                    className="bg-white/20 hover:bg-white/30 transition-all rounded-lg py-2 md:py-3 px-3 md:px-4 backdrop-blur-sm flex items-center"
                >
                    <Users size={18} className="mr-2" />
                    <span className="text-sm md:text-base">Ver Mi Perfil</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Users size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Limitado</h2>
                <p className="text-gray-600 mb-4">
                    Contacta al administrador para obtener los permisos necesarios
                </p>
                <button
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                >
                    Ver Mi Perfil
                </button>
            </div>
        </>
    );
};

// ===================================
// COMPONENTES AUXILIARES
// ===================================
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
                <span className="text-gray-600 font-medium">{change}</span>
            </div>
        )}
    </div>
);

const QuickAccessCard = ({ title, description, icon, onClick, color }) => (
    <div
        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer border-l-4"
        style={{ borderLeftColor: color }}
        onClick={onClick}
    >
        <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                {icon}
            </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
        <div className="mt-4 text-right">
            <span className="text-sm font-medium" style={{ color }}>
                Acceder →
            </span>
        </div>
    </div>
);

export default SimpleDashboard;