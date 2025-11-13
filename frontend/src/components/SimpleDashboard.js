// frontend/src/components/SimpleDashboard.js
import ModalDetalleInstalacion from './Instalaciones/ModalDetalleInstalacion';
import ModalCompletarInstalacion from './Instalador/ModalCompletarInstalacion';
import React, { useState, useEffect } from 'react';
import { facturacionManualService } from '../services/facturacionManualService';
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
// DASHBOARD PARA SUPERVISORES CON DATOS REALES - VERSIÓN CORREGIDA FINAL
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
    const [ingresosMensuales, setIngresosMensuales] = useState([]);

    useEffect(() => {
        cargarDatosSupervisor();
    }, []);

    const cargarDatosSupervisor = async () => {
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

            // 1. Obtener estadísticas de clientes
            const clientesResponse = await fetch(`${process.env.REACT_APP_API_URL}/clients/stats`, {
                headers
            });
            const clientesData = await clientesResponse.json();

            // 2. Obtener estadísticas de facturas
            const facturasResponse = await fetch(`${process.env.REACT_APP_API_URL}/facturas/stats`, {
                headers
            });
            const facturasData = await facturasResponse.json();

            // 3. Obtener planes de servicio
            const planesResponse = await fetch(`${process.env.REACT_APP_API_URL}/config/service-plans`, {
                headers
            });
            const planesData = await planesResponse.json();

            console.log('📊 SUPERVISOR - Datos obtenidos:', {
                clientes: clientesData,
                facturas: facturasData,
                planes: planesData
            });

            // Procesar y establecer estadísticas
            if (clientesData.success) {
                const clientesActivos = clientesData.data?.activos || 0;

                // Calcular facturación del mes actual y tasa de cobranza
                let facturacionMes = 0;
                let tasaCobranza = 0;

                if (facturasData.success && facturasData.data) {
                    // Intentar obtener del stats primero
                    facturacionMes = facturasData.data.total_mes_actual || 0;
                    
                    // Si viene en 0, lo calcularemos después con las facturas
                    console.log('💰 SUPERVISOR - Facturación mes desde stats:', facturacionMes);
                    
                    // Calcular tasa de cobranza (pagadas / total * 100)
                    const totalFacturas = facturasData.data.total || 1;
                    const facturasPagadas = facturasData.data.pagadas || 0;
                    tasaCobranza = Math.round((facturasPagadas / totalFacturas) * 100);
                }

                const serviciosActivos = planesData.success ? 
                    planesData.data?.filter(plan => plan.activo).length || 0 : 0;

                setSupervisorStats({
                    clientesActivos: clientesActivos,
                    facturacionMes: facturacionMes,
                    serviciosActivos: serviciosActivos,
                    tasaCobranza: tasaCobranza
                });
            }

            // 4. ✅ OBTENER TODAS LAS FACTURAS USANDO EL SERVICE
            try {
                console.log('📡 SUPERVISOR - Obteniendo facturas para gráfica...');
                
                // Usar el servicio de facturación manual con límite alto
                const responseFacturas = await facturacionManualService.obtenerFacturas({
                    limit: 1000,
                    page: 1
                });

                console.log('📦 SUPERVISOR - Respuesta del service:', responseFacturas);

                // Extraer las facturas de la respuesta
                const facturas = responseFacturas?.facturas || [];
                
                console.log('✅ SUPERVISOR - Total facturas obtenidas:', facturas.length);
                console.log('📋 SUPERVISOR - Muestra de facturas completas:', facturas.slice(0, 2));

                if (facturas.length === 0) {
                    console.warn('⚠️ No hay facturas en el sistema');
                    setIngresosMensuales([]);
                    return;
                }

                // Filtrar solo facturas PAGADAS de los últimos 30 días
                const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                
                const facturasPagadas = facturas.filter(factura => {
                    // Verificar estado (puede venir como "Pagada" o "pagada")
                    const esPagada = factura.estado?.toLowerCase() === 'pagada';
                    
                    if (!esPagada) {
                        return false;
                    }
                    
                    // Obtener fecha (priorizar fecha_pago, luego fecha_emision)
                    const fechaStr = factura.fecha_pago || factura.fecha_emision;
                    
                    if (!fechaStr) {
                        console.warn('⚠️ Factura sin fecha:', factura);
                        return false;
                    }
                    
                    try {
                        const fechaFactura = new Date(fechaStr);
                        return fechaFactura >= hace30Dias;
                    } catch (error) {
                        console.error('❌ Error parseando fecha:', fechaStr, error);
                        return false;
                    }
                });
                
                console.log('💰 SUPERVISOR - Facturas pagadas últimos 30 días:', facturasPagadas.length);
                
                if (facturasPagadas.length > 0) {
                    console.log('📋 SUPERVISOR - Primera factura pagada COMPLETA:', facturasPagadas[0]);
                }

                if (facturasPagadas.length === 0) {
                    console.warn('⚠️ No hay facturas pagadas en los últimos 30 días');
                    setIngresosMensuales([]);
                } else {
                    // 🔧 CALCULAR FACTURACIÓN DEL MES ACTUAL (facturas pagadas del mes en curso)
                    const inicioMesActual = new Date();
                    inicioMesActual.setDate(1);
                    inicioMesActual.setHours(0, 0, 0, 0);
                    
                    const facturasMesActual = facturasPagadas.filter(factura => {
                        const fechaStr = factura.fecha_pago || factura.fecha_emision;
                        const fecha = new Date(fechaStr);
                        return fecha >= inicioMesActual;
                    });
                    
                    const totalMesActual = facturasMesActual.reduce((sum, factura) => {
                        const monto = parseFloat(factura.total || 0);
                        return sum + monto;
                    }, 0);
                    
                    console.log('📅 SUPERVISOR - Facturas del mes actual:', facturasMesActual.length);
                    console.log('💵 SUPERVISOR - Total facturado mes actual:', totalMesActual);
                    
                    // Actualizar el stat de facturación del mes
                    setSupervisorStats(prev => ({
                        ...prev,
                        facturacionMes: totalMesActual
                    }));
                    
                    // Agrupar por fecha y sumar montos
                    const ingresosPorFecha = {};
                    
                    facturasPagadas.forEach(factura => {
                        const fechaStr = factura.fecha_pago || factura.fecha_emision;
                        const fecha = new Date(fechaStr);
                        
                        // Formatear fecha para agrupar
                        const fechaFormateada = fecha.toLocaleDateString('es-CO', { 
                            day: '2-digit', 
                            month: 'short' 
                        });
                        
                        if (!ingresosPorFecha[fechaFormateada]) {
                            ingresosPorFecha[fechaFormateada] = {
                                fecha: fechaFormateada,
                                fechaCompleta: fecha,
                                monto: 0
                            };
                        }
                        
                        // 🔧 CORRECCIÓN: Probar múltiples nombres de campo para el monto
                        const monto = parseFloat(
                            factura.monto_total || 
                            factura.total || 
                            factura.valor_total || 
                            factura.monto || 
                            0
                        );
                        
                        console.log(`💰 SUPERVISOR - Procesando factura ${factura.numero_factura || factura.id}:`, {
                            monto_total: factura.monto_total,
                            total: factura.total,
                            valor_total: factura.valor_total,
                            monto: factura.monto,
                            montoParseado: monto,
                            todosLosCampos: Object.keys(factura)
                        });
                        
                        ingresosPorFecha[fechaFormateada].monto += monto;
                    });
                    
                    // Convertir a array y ordenar cronológicamente
                    const datosGrafica = Object.values(ingresosPorFecha)
                        .sort((a, b) => a.fechaCompleta - b.fechaCompleta)
                        .map(({ fecha, monto }) => ({ 
                            fecha, 
                            monto: Math.round(monto) // Redondear para mejor visualización
                        }));
                    
                    console.log('📈 SUPERVISOR - Datos procesados para gráfica:', datosGrafica);
                    console.log('💵 SUPERVISOR - Total ingresos:', datosGrafica.reduce((sum, d) => sum + d.monto, 0));
                    
                    setIngresosMensuales(datosGrafica);
                }
                
            } catch (errorFacturas) {
                console.error('❌ Error obteniendo facturas para gráfica:', errorFacturas);
                console.error('Stack:', errorFacturas.stack);
                setIngresosMensuales([]);
            }

        } catch (error) {
            console.error('❌ Error cargando datos del supervisor:', error);
            console.error('Stack:', error.stack);
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
                    onClick={() => navigate('/reportes-regulatorios')}
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
                {/* Stats Cards para Supervisor - DATOS REALES */}
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
                        value={`$${supervisorStats.facturacionMes.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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

                {/* Gráfica de ingresos del mes - MEJORADA Y VISUAL */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-[#0e6493]">Ingresos Últimos 30 Días</h2>
                        <span className="text-sm text-gray-500">
                            {ingresosMensuales.length} {ingresosMensuales.length === 1 ? 'día' : 'días'} con ingresos
                        </span>
                    </div>
                    
                    {ingresosMensuales.length === 0 ? (
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                            <div className="text-center">
                                <TrendingUp size={48} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">No hay datos de ingresos</p>
                                <p className="text-sm text-gray-400">Los datos aparecerán cuando haya facturas pagadas</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Gráfica de Barras Mejorada */}
                            <div className="h-96 relative pl-16 pr-4">
                                {/* Grid de fondo */}
                                <div className="absolute inset-0 flex flex-col justify-between pb-16 pl-16 pr-4 pointer-events-none">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="border-t border-gray-200"></div>
                                    ))}
                                </div>

                                {/* Leyenda del eje Y - AJUSTADA */}
                                <div className="absolute left-0 top-0 bottom-16 w-14 flex flex-col justify-between text-xs text-gray-500">
                                    {[...Array(6)].map((_, i) => {
                                        const maxMonto = Math.max(...ingresosMensuales.map(item => item.monto));
                                        const valor = Math.round((maxMonto / 5) * (5 - i));
                                        return (
                                            <span key={i} className="text-right pr-2">
                                                ${valor >= 1000000 
                                                    ? `${(valor / 1000000).toFixed(1)}M` 
                                                    : `${(valor / 1000).toFixed(0)}k`}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Barras - CON VALORES DENTRO */}
                                <div className="relative h-full flex items-end justify-start gap-6 pb-16 overflow-x-auto">
                                    {ingresosMensuales.map((item, index) => {
                                        const maxMonto = Math.max(...ingresosMensuales.map(i => i.monto));
                                        const altura = maxMonto > 0 ? (item.monto / maxMonto) * 100 : 5;
                                        
                                        // Calcular color basado en el monto (gradiente)
                                        const intensidad = Math.round((item.monto / maxMonto) * 100);
                                        const color = `hsl(200, 70%, ${Math.max(30, 80 - intensidad/2)}%)`;
                                        
                                        return (
                                            <div key={index} className="flex flex-col items-center min-w-[80px] group">
                                                {/* Barra con animación */}
                                                <div className="relative flex-1 w-full flex items-end">
                                                    <div
                                                        className="w-full rounded-t-lg transition-all duration-500 ease-out hover:opacity-90 cursor-pointer shadow-lg relative flex flex-col justify-end items-center pb-3"
                                                        style={{ 
                                                            height: `${Math.max(altura, 15)}%`,
                                                            backgroundColor: color,
                                                            minHeight: '50px'
                                                        }}
                                                    >
                                                        {/* VALOR DENTRO DE LA BARRA */}
                                                        <div className="text-white font-bold text-xs drop-shadow-lg">
                                                            ${item.monto >= 1000000 
                                                                ? `${(item.monto / 1000000).toFixed(1)}M`
                                                                : `${(item.monto / 1000).toFixed(0)}k`}
                                                        </div>
                                                        
                                                        {/* Tooltip mejorado */}
                                                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 
                                                                      bg-gray-900 text-white px-3 py-2 rounded-lg 
                                                                      opacity-0 group-hover:opacity-100 transition-opacity 
                                                                      whitespace-nowrap z-20 shadow-xl">
                                                            <div className="text-xs font-medium mb-1">{item.fecha}</div>
                                                            <div className="text-sm font-bold">
                                                                ${item.monto.toLocaleString('es-CO')}
                                                            </div>
                                                            {/* Flechita del tooltip */}
                                                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 
                                                                          w-2 h-2 bg-gray-900 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Etiqueta de fecha mejorada */}
                                                <div className="mt-3 text-center">
                                                    <span className="text-xs text-gray-600 font-medium block">
                                                        {item.fecha}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ✅ RESUMEN DE TOTALES MEJORADO Y CORREGIDO */}
                            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Total Período con Desglose */}
                                <div className="text-center p-4 bg-blue-50 rounded-lg hover:shadow-md transition-shadow">
                                    <p className="text-sm text-gray-600 mb-2">
                                        Total Período ({ingresosMensuales.length} {ingresosMensuales.length === 1 ? 'día' : 'días'})
                                    </p>
                                    <p className="text-2xl font-bold text-[#0e6493]">
                                        ${ingresosMensuales.reduce((acc, item) => acc + item.monto, 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    {ingresosMensuales.length > 0 && ingresosMensuales.length <= 5 && (
                                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                            {ingresosMensuales.map(i => `$${i.monto.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`).join(' + ')}
                                        </p>
                                    )}
                                </div>

                                {/* Promedio por Día con Explicación */}
                                <div className="text-center p-4 bg-green-50 rounded-lg hover:shadow-md transition-shadow">
                                    <p className="text-sm text-gray-600 mb-2">Promedio por Día</p>
                                    <p className="text-2xl font-bold text-green-700">
                                        ${ingresosMensuales.length > 0 
                                            ? Math.round(ingresosMensuales.reduce((acc, item) => acc + item.monto, 0) / ingresosMensuales.length).toLocaleString('es-CO')
                                            : '0'
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Calculado sobre {ingresosMensuales.length} {ingresosMensuales.length === 1 ? 'día' : 'días'} con facturación
                                    </p>
                                </div>

                                {/* Día Máximo con Fecha */}
                                <div className="text-center p-4 bg-purple-50 rounded-lg hover:shadow-md transition-shadow">
                                    <p className="text-sm text-gray-600 mb-2">Día con Mayor Ingreso</p>
                                    <p className="text-2xl font-bold text-purple-700">
                                        ${Math.max(...ingresosMensuales.map(i => i.monto)).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        📅 {ingresosMensuales.find(i => i.monto === Math.max(...ingresosMensuales.map(m => m.monto)))?.fecha || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {/* Indicador de estado */}
                            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span>Datos actualizados en tiempo real</span>
                            </div>
                        </>
                    )}
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