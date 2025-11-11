// frontend/src/components/SimpleDashboard.js
import ModalDetalleInstalacion from './Instalaciones/ModalDetalleInstalacion';
import ModalCompletarInstalacion from './Instalador/ModalCompletarInstalacion';
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
// DASHBOARD PARA ADMINISTRADORES CON DATOS REALES
// ===================================
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    // Estados para datos reales
    const [loading, setLoading] = useState(true);
    const [adminStats, setAdminStats] = useState({
        totalUsuarios: 0,
        usuariosActivos: 0,
        configuracionCompleta: 0,
        ultimoBackup: 'Cargando...'
    });
    const [configuracionPendiente, setConfiguracionPendiente] = useState([]);

    // Cargar datos reales al montar el componente
    useEffect(() => {
        cargarDatosAdmin();
    }, []);

    const cargarDatosAdmin = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                console.error('❌ No hay token disponible');
                setLoading(false);
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 1. Obtener estadísticas de configuración
            const configResponse = await fetch(`${process.env.REACT_APP_API_URL}/config/overview`, {
                headers
            });
            const configData = await configResponse.json();
            
            console.log('📊 Config Overview:', configData);

            if (configData.success) {
                const overview = configData.data;
                
                // ✅ ACTUALIZAR: Leer desde contadores
                setAdminStats(prev => ({
                    ...prev,
                    totalUsuarios: overview.contadores?.total_usuarios || 0,
                    usuariosActivos: overview.contadores?.usuarios_activos || 0,
                    configuracionCompleta: Math.round(overview.porcentaje_completado || 0)
                }));

                // ✅ ACTUALIZAR: Leer desde contadores
                const modulosConfig = [
                    { 
                        modulo: 'Configuración de Empresa', 
                        completado: overview.empresa_configurada ? 100 : 0, 
                        urgente: !overview.empresa_configurada 
                    },
                    { 
                        modulo: 'Bancos y Formas de Pago', 
                        completado: overview.contadores?.bancos_activos 
                            ? Math.round((overview.contadores.bancos_activos / Math.max(overview.contadores.bancos_total || 1, 1)) * 100) 
                            : 0, 
                        urgente: overview.contadores?.bancos_activos === 0 
                    },
                    { 
                        modulo: 'Conceptos de Facturación', 
                        completado: overview.contadores?.conceptos_activos 
                            ? Math.round((overview.contadores.conceptos_activos / Math.max(overview.contadores.conceptos_activos, 1)) * 100) 
                            : 0, 
                        urgente: overview.contadores?.conceptos_activos === 0 
                    },
                    { 
                        modulo: 'Planes de Servicio', 
                        completado: overview.contadores?.planes_activos 
                            ? Math.round((overview.contadores.planes_activos / Math.max(overview.contadores.planes_total || 1, 1)) * 100) 
                            : 0, 
                        urgente: overview.contadores?.planes_activos === 0 
                    }
                ];
                
                setConfiguracionPendiente(modulosConfig);
            }

            // 2. Obtener información del último backup
            try {
                const backupResponse = await fetch(`${process.env.REACT_APP_API_URL}/sistema/backup/ultimo`, {
                    headers
                });
                const backupData = await backupResponse.json();
                
                console.log('💾 Último Backup:', backupData);

                if (backupData.success && backupData.ultimo_backup) {
                    setAdminStats(prev => ({
                        ...prev,
                        ultimoBackup: backupData.ultimo_backup.tiempo_transcurrido || 'Hace mucho'
                    }));
                } else {
                    setAdminStats(prev => ({
                        ...prev,
                        ultimoBackup: 'Sin backups'
                    }));
                }
            } catch (error) {
                console.error('❌ Error obteniendo último backup:', error);
                setAdminStats(prev => ({
                    ...prev,
                    ultimoBackup: 'Error al cargar'
                }));
            }

        } catch (error) {
            console.error('❌ Error cargando datos del admin:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Función para generar backup
    const generarBackup = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/sistema/backup/generar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`✅ Backup generado exitosamente!\n\n📁 Archivo: ${data.archivo}\n💾 Tamaño: ${data.tamano}\n📅 Fecha: ${data.fecha}`);
                // Recargar datos después de generar backup
                cargarDatosAdmin();
            } else {
                alert('❌ Error al generar backup: ' + data.message);
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión al generar backup');
        }
    };

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
                    ¿Qué quieres hacer hoy?, gestiona y configura todo el sistema
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

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0e6493] mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando estadísticas...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards para Admin con datos reales */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Total Usuarios"
                            value={adminStats.totalUsuarios}
                            icon={<Users size={24} className="text-[#0e6493]" />}
                            change="Registrados"
                            color="#0e6493"
                        />
                        <StatCard
                            title="Usuarios Activos"
                            value={adminStats.usuariosActivos}
                            icon={<UserCheck size={24} className="text-[#10b981]" />}
                            change={`${Math.round((adminStats.usuariosActivos / Math.max(adminStats.totalUsuarios, 1)) * 100)}%`}
                            color="#10b981"
                        />
                        <StatCard
                            title="Config. Completa"
                            value={`${adminStats.configuracionCompleta}%`}
                            icon={<Settings size={24} className="text-[#f59e0b]" />}
                            change={adminStats.configuracionCompleta < 100 ? 'Pendiente' : 'Completo'}
                            color="#f59e0b"
                        />
                        <StatCard
                            title="Último Backup"
                            value={adminStats.ultimoBackup}
                            icon={<Database size={24} className="text-[#6366f1]" />}
                            change="Automático"
                            color="#6366f1"
                        />
                    </div>

                    {/* Configuración pendiente con datos reales */}
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
                            description="Generar backup de la base de datos"
                            icon={<Database size={32} className="text-[#10b981]" />}
                            onClick={generarBackup}
                            color="#10b981"
                        />
                    </div>
                </>
            )}
        </>
    );
};

// ===================================
// DASHBOARD PARA SUPERVISORES CON DATOS REALES
// ===================================
const SupervisorDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [supervisorStats, setSupervisorStats] = useState({
        clientesActivos: 0,
        facturacionMes: 0,
        serviciosActivos: 0,
        tasaCobranza: 0
    });
    const [reportesRecientes, setReportesRecientes] = useState([]);

    useEffect(() => {
        cargarDatosSupervisor();
    }, []);

    const cargarDatosSupervisor = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // Obtener estadísticas del dashboard (usar el endpoint de estadísticas si existe)
            const response = await fetch(`${process.env.REACT_APP_API_URL}/config/overview`, {
                headers
            });
            const data = await response.json();

            if (data.success) {
                const overview = data.data;
                
                setSupervisorStats({
                    clientesActivos: overview.contadores?.clientes_activos || 0,
                    facturacionMes: 0, // Agregar endpoint específico de facturación
                    serviciosActivos: overview.contadores?.planes_activos || 0,
                    tasaCobranza: 0 // Agregar endpoint específico de cobranza
                });
            }

            // Simular reportes recientes (reemplazar con endpoint real cuando esté disponible)
            setReportesRecientes([
                { nombre: 'Facturación Mes Actual', fecha: new Date().toISOString().split('T')[0], estado: 'Completado' },
                { nombre: 'Clientes Activos', fecha: new Date().toISOString().split('T')[0], estado: 'En proceso' },
                { nombre: 'Servicios por Sector', fecha: new Date().toISOString().split('T')[0], estado: 'Pendiente' },
                { nombre: 'Ingresos Mensuales', fecha: new Date().toISOString().split('T')[0], estado: 'Completado' }
            ]);

        } catch (error) {
            console.error('❌ Error cargando datos del supervisor:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    ¿Qué quieres hacer hoy?, Controla las operaciones del negocio
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

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0e6493] mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando estadísticas...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards para Supervisor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Clientes Activos"
                            value={supervisorStats.clientesActivos.toLocaleString()}
                            icon={<Users size={24} className="text-[#0e6493]" />}
                            change="Total"
                            color="#0e6493"
                        />
                        <StatCard
                            title="Facturación Mes"
                            value={`$${supervisorStats.facturacionMes.toLocaleString()}`}
                            icon={<DollarSign size={24} className="text-[#10b981]" />}
                            change="Mes actual"
                            color="#10b981"
                        />
                        <StatCard
                            title="Servicios Activos"
                            value={supervisorStats.serviciosActivos.toLocaleString()}
                            icon={<Wifi size={24} className="text-[#6366f1]" />}
                            change="Planes"
                            color="#6366f1"
                        />
                        <StatCard
                            title="Tasa Cobranza"
                            value={`${supervisorStats.tasaCobranza}%`}
                            icon={<TrendingUp size={24} className="text-[#f59e0b]" />}
                            change="Promedio"
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
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            reporte.estado === 'Completado' ? 'bg-green-100 text-green-800' :
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
            )}
        </>
    );
};
// ===================================
// DASHBOARD PARA INSTALADORES
// ===================================
const InstaladorDashboard = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [trabajosHoy, setTrabajosHoy] = useState([]);
    const [estadisticas, setEstadisticas] = useState({
        pendientesHoy: 0,
        completadasSemana: 0,
        equiposAsignados: 0
    });
    const [loading, setLoading] = useState(true);
    const [modalCompletarOpen, setModalCompletarOpen] = useState(false);
    const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
     const [modalDetalle, setModalDetalle] = useState(false);
    const [instalacionDetalle, setInstalacionDetalle] = useState(null);

    useEffect(() => {
        cargarDatos();
    }, []);

 const cargarDatos = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            console.log('🔍 DASHBOARD - Token obtenido:', token ? 'EXISTS' : 'MISSING');
            console.log('🔍 DASHBOARD - Current User:', currentUser);
            
            if (!token) {
                console.error('❌ DASHBOARD - No hay token disponible');
                setLoading(false);
                return;
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            
            // Cargar TODAS las instalaciones del instalador
            console.log('📡 DASHBOARD - Haciendo petición a mis instalaciones...');
            console.log('📡 DASHBOARD - URL:', `${process.env.REACT_APP_API_URL}/instalador/mis-instalaciones`);
            
            const respuestaTrabajos = await fetch(`${process.env.REACT_APP_API_URL}/instalador/mis-instalaciones`, {
                headers
            });
            
            console.log('📊 DASHBOARD - Status trabajos:', respuestaTrabajos.status);
            console.log('📊 DASHBOARD - OK:', respuestaTrabajos.ok);
            
            const dataTrabajos = await respuestaTrabajos.json();
            console.log('📦 DASHBOARD - Data trabajos:', dataTrabajos);
            
            if (dataTrabajos.success) {
                const instalaciones = dataTrabajos.instalaciones || [];
                
                // Filtrar solo instalaciones pendientes y en proceso (los "trabajos activos")
                const trabajosActivos = instalaciones.filter(inst => 
                    inst.estado === 'programada' || inst.estado === 'en_proceso'
                );
                
                setTrabajosHoy(trabajosActivos);
                console.log('✅ DASHBOARD - Trabajos activos cargados:', trabajosActivos.length);
                
                // Calcular estadísticas desde las instalaciones
                const pendientes = instalaciones.filter(inst => inst.estado === 'programada').length;
                const completadas = instalaciones.filter(inst => inst.estado === 'completada').length;
                
                setEstadisticas({
                    pendientesHoy: pendientes,
                    completadasSemana: completadas,
                    equiposAsignados: estadisticas.equiposAsignados || 0
                });
            } else {
                console.error('❌ DASHBOARD - Error en trabajos:', dataTrabajos.message);
            }

            // Cargar estadísticas de equipos
            console.log('📡 DASHBOARD - Haciendo petición a estadísticas...');
            console.log('📡 DASHBOARD - URL:', `${process.env.REACT_APP_API_URL}/instalador/estadisticas`);
            
            const respuestaEstadisticas = await fetch(`${process.env.REACT_APP_API_URL}/instalador/estadisticas`, {
                headers
            });
            
            console.log('📊 DASHBOARD - Status estadísticas:', respuestaEstadisticas.status);
            
            const dataEstadisticas = await respuestaEstadisticas.json();
            console.log('📦 DASHBOARD - Data estadísticas:', dataEstadisticas);
            
            if (dataEstadisticas.success && dataEstadisticas.estadisticas) {
                setEstadisticas(prev => ({
                    ...prev,
                    equiposAsignados: dataEstadisticas.estadisticas.equiposAsignados || 0
                }));
                console.log('✅ DASHBOARD - Estadísticas de equipos cargadas');
            }
            
        } catch (error) {
            console.error('❌ DASHBOARD - Error cargando datos:', error);
            console.error('❌ DASHBOARD - Error stack:', error.stack);
        } finally {
            setLoading(false);
        }
    };

    const iniciarTrabajo = async (trabajoId) => {
        try {
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                alert('❌ No hay token de autenticación');
                return;
            }
            
            console.log('🚀 DASHBOARD - Iniciando trabajo ID:', trabajoId);
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/instalador/instalacion/${trabajoId}/iniciar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            console.log('📦 DASHBOARD - Respuesta iniciar trabajo:', data);
            
            if (data.success) {
                alert('✅ Instalación iniciada exitosamente');
                cargarDatos();
            } else {
                alert('❌ Error al iniciar instalación: ' + (data.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('❌ DASHBOARD - Error iniciando trabajo:', error);
            alert('❌ Error de conexión al iniciar instalación');
        }
    };

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
                    ¿Qué quieres hacer hoy? Gestiona tus trabajos de campo
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/mis-trabajos')}
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
                        <span className="text-sm md:text-base">Mis Equipos</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards para Instalador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Pendientes Hoy"
                    value={estadisticas.pendientesHoy}
                    icon={<Clock size={24} className="text-[#f59e0b]" />}
                    change="Programadas"
                    color="#f59e0b"
                />
                <StatCard
                    title="Completadas"
                    value={estadisticas.completadasSemana}
                    icon={<CheckCircle size={24} className="text-[#10b981]" />}
                    change="Esta semana"
                    color="#10b981"
                />
                <StatCard
                    title="Equipos Asignados"
                    value={estadisticas.equiposAsignados}
                    icon={<Package size={24} className="text-[#0e6493]" />}
                    change="En tu poder"
                    color="#0e6493"
                />
            </div>

            {/* Trabajos de hoy */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-[#0e6493]">Trabajos de Hoy</h2>
                    <span className="text-sm text-gray-500">{new Date().toLocaleDateString('es-CO')}</span>
                </div>
                
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0e6493] mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando trabajos...</p>
                    </div>
                ) : trabajosHoy.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-gray-500">🎉 No tienes trabajos programados para hoy</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {trabajosHoy.map((trabajo) => (
                            <div key={trabajo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 flex-1">
                                    <div className={`w-3 h-3 rounded-full ${
                                        trabajo.estado === 'en_proceso' ? 'bg-yellow-500' :
                                        trabajo.tipo_orden === 'instalacion' ? 'bg-blue-500' :
                                        trabajo.tipo_orden === 'mantenimiento' ? 'bg-orange-500' : 'bg-red-500'
                                    }`}></div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{trabajo.cliente_nombre}</p>
                                        <p className="text-sm text-gray-500 flex items-center">
                                            <MapPin size={14} className="mr-1" />
                                            {trabajo.direccion}
                                        </p>
                                        {trabajo.telefono_contacto && (
                                            <p className="text-sm text-gray-500">📞 {trabajo.telefono_contacto}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right ml-4">
                                    <p className="font-medium text-[#0e6493]">{trabajo.hora}</p>
                                    <p className="text-sm text-gray-500 capitalize">{trabajo.tipo_orden?.replace('_', ' ')}</p>
                                    {trabajo.estado === 'programada' && (
                                        <button
                                            onClick={() => iniciarTrabajo(trabajo.id)}
                                            className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                                        >
                                            Iniciar
                                        </button>
                                    )}
                                    {trabajo.estado === 'en_proceso' && (
  <button
    onClick={() => {
      setInstalacionSeleccionada(trabajo);
      setModalCompletarOpen(true);
    }}
    className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
  >
    Completar
  </button>
)}
<button
  onClick={() => {
    setInstalacionDetalle(trabajo);
    setModalDetalle(true);
  }}
  className="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
>
  Ver Detalle
</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

           {/* Modal Completar Instalación */}
            <ModalCompletarInstalacion
                isOpen={modalCompletarOpen}
                onClose={() => setModalCompletarOpen(false)}
                instalacion={instalacionSeleccionada}
                onSuccess={cargarDatos}
            />

            {/* Modal de Detalle */}
            <ModalDetalleInstalacion
                isOpen={modalDetalle}
                onClose={() => {
                    setModalDetalle(false);
                    setInstalacionDetalle(null);
                }}
                instalacion={instalacionDetalle}
            />
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