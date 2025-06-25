// frontend/src/components/Instalaciones/InstalacionesStats.js

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Users,
    MapPin,
    DollarSign,
    RefreshCw,
    Eye,
    Download,
    Filter,
    PieChart,
    Activity
} from 'lucide-react';

// Servicios
import { instalacionesService } from '../../services/instalacionesService';

const InstalacionesStats = ({
    estadisticas: estadisticasExternas,
    loading: loadingExternas,
    onRefresh,
    filtros = {},
    permissions
}) => {
    // Estados locales para estadísticas internas
    const [estadisticasLocales, setEstadisticasLocales] = useState(null);
    const [loadingLocales, setLoadingLocales] = useState(false);
    const [error, setError] = useState(null);
    const [fechaActualizacion, setFechaActualizacion] = useState(null);

    // Usar estadísticas externas si están disponibles, sino cargar localmente
    const estadisticas = estadisticasExternas || estadisticasLocales;
    const loading = loadingExternas || loadingLocales;

    // Cargar estadísticas locales si no vienen desde arriba
    useEffect(() => {
        if (!estadisticasExternas && !loadingExternas) {
            cargarEstadisticas();
        }
    }, [estadisticasExternas, loadingExternas, filtros]);

    // Función para cargar estadísticas desde la API
    const cargarEstadisticas = async () => {
        if (loadingLocales) return;

        setLoadingLocales(true);
        setError(null);

        try {
            console.log('📊 Cargando estadísticas de instalaciones...');
            const response = await instalacionesService.getEstadisticas(filtros);

            if (response.success) {
                setEstadisticasLocales(response.data);
                setFechaActualizacion(new Date());
                console.log('✅ Estadísticas cargadas:', response.data);
            } else {
                throw new Error(response.message || 'Error cargando estadísticas');
            }
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            setError(error.message);
        } finally {
            setLoadingLocales(false);
        }
    };

    // Función para refrescar
    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        } else {
            cargarEstadisticas();
        }
    };

    // Funciones de formato
    const formatNumber = (num) => {
        if (num === undefined || num === null) return '0';
        return new Intl.NumberFormat('es-CO').format(num);
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const calcularPorcentaje = (valor, total) => {
        if (!total || total === 0) return 0;
        return ((valor / total) * 100).toFixed(1);
    };

    const getEstadoColor = (estado) => {
        const colores = {
            completada: 'text-green-600 bg-green-100',
            programada: 'text-blue-600 bg-blue-100',
            en_proceso: 'text-yellow-600 bg-yellow-100',
            cancelada: 'text-red-600 bg-red-100',
            reagendada: 'text-purple-600 bg-purple-100'
        };
        return colores[estado] || 'text-gray-600 bg-gray-100';
    };

    const getTrendIcon = (valor, comparacion) => {
        if (valor > comparacion) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (valor < comparacion) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <Activity className="w-4 h-4 text-gray-500" />;
    };

    // Componente de loading
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#0e6493] mr-3" />
                    <span className="text-lg text-gray-600">Cargando estadísticas...</span>
                </div>
            </div>
        );
    }

    // Componente de error
    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                    <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando estadísticas</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            </div>
        );
    }

    // Componente sin datos
    if (!estadisticas) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay estadísticas disponibles</h3>
                    <p className="text-gray-600 mb-4">No se encontraron datos para mostrar estadísticas</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90"
                    >
                        Cargar datos
                    </button>
                </div>
            </div>
        );
    }

    // Extraer datos de las estadísticas
    const {
        resumen = {},
        por_estado = {},
        por_instalador = [],
        por_ciudad = [],
        ingresos = {},
        rendimiento = {},
        tendencias = {}
    } = estadisticas;

    return (
        <div className="space-y-6">
            {/* Header con acciones */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-[#0e6493]" />
                        Estadísticas de Instalaciones
                    </h2>
                    {fechaActualizacion && (
                        <p className="text-sm text-gray-500 mt-1">
                            Última actualización: {fechaActualizacion.toLocaleString('es-CO')}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {permissions?.canExportStats && (
                        <button className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    )}

                    <button
                        onClick={handleRefresh}
                        className="px-3 py-2 text-sm font-medium text-white bg-[#0e6493] rounded-lg hover:bg-[#0e6493]/90 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total instalaciones */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Instalaciones</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                {formatNumber(resumen.total || 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>

                    {tendencias.total && (
                        <div className="flex items-center mt-4 text-sm">
                            {getTrendIcon(resumen.total, tendencias.total.anterior)}
                            <span className="ml-1 text-gray-600">
                                {calcularPorcentaje(
                                    Math.abs(resumen.total - tendencias.total.anterior),
                                    tendencias.total.anterior
                                )}% vs período anterior
                            </span>
                        </div>
                    )}
                </div>

                {/* Completadas */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Completadas</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">
                                {formatNumber(por_estado.completada || 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Tasa de éxito</span>
                            <span className="font-medium text-green-600">
                                {calcularPorcentaje(por_estado.completada, resumen.total)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pendientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-1">
                                {formatNumber((por_estado.programada || 0) + (por_estado.en_proceso || 0))}
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>

                    <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Programadas</span>
                            <span className="font-medium">{formatNumber(por_estado.programada || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">En proceso</span>
                            <span className="font-medium">{formatNumber(por_estado.en_proceso || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Ingresos */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Ingresos del Período</p>
                            <p className="text-3xl font-bold text-[#0e6493] mt-1">
                                {formatCurrency(ingresos.total || 0)}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-[#0e6493]" />
                        </div>
                    </div>

                    {ingresos.promedio && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Promedio por instalación</span>
                                <span className="font-medium text-[#0e6493]">
                                    {formatCurrency(ingresos.promedio)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Gráficos y detalles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Estado de instalaciones */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-[#0e6493]" />
                        Distribución por Estado
                    </h3>

                    <div className="space-y-3">
                        {Object.entries(por_estado).map(([estado, cantidad]) => (
                            <div key={estado} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(estado)}`}>
                                        {estado.charAt(0).toUpperCase() + estado.slice(1).replace('_', ' ')}
                                    </div>
                                    <span className="text-sm text-gray-600">{formatNumber(cantidad)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${calcularPorcentaje(cantidad, resumen.total)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {calcularPorcentaje(cantidad, resumen.total)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rendimiento por instalador */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#0e6493]" />
                        Top Instaladores
                    </h3>

                    <div className="space-y-4">
                        {por_instalador.slice(0, 5).map((instalador, index) => (
                            <div key={instalador.id || index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[#0e6493] text-white rounded-full flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {instalador.nombre || 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatNumber(instalador.completadas || 0)} completadas
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-medium text-gray-900">
                                        {calcularPorcentaje(instalador.completadas, instalador.total)}%
                                    </p>
                                    <p className="text-sm text-gray-500">efectividad</p>
                                </div>
                            </div>
                        ))}

                        {por_instalador.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                                No hay datos de instaladores disponibles
                            </div>
                        )}
                    </div>
                </div>

                {/* Distribución por ciudad */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#0e6493]" />
                        Instalaciones por Ciudad
                    </h3>

                    <div className="space-y-3">
                        {por_ciudad.slice(0, 6).map((ciudad, index) => (
                            <div key={ciudad.id || index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-[#0e6493] rounded-full"></div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {ciudad.nombre || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">{formatNumber(ciudad.total || 0)}</span>
                                    <span className="text-xs text-gray-500">
                                        ({calcularPorcentaje(ciudad.total, resumen.total)}%)
                                    </span>
                                </div>
                            </div>
                        ))}

                        {por_ciudad.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                                No hay datos de ciudades disponibles
                            </div>
                        )}
                    </div>
                </div>

                {/* Métricas de rendimiento */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#0e6493]" />
                        Métricas de Rendimiento
                    </h3>

                    <div className="space-y-4">
                        {/* Tiempo promedio */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Tiempo Promedio</p>
                                <p className="text-xs text-gray-600">Duración de instalación</p>
                            </div>
                            <span className="text-lg font-bold text-[#0e6493]">
                                {rendimiento.tiempo_promedio ? `${rendimiento.tiempo_promedio}h` : 'N/A'}
                            </span>
                        </div>

                        {/* Tasa de reagendamiento */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Tasa de Reagendamiento</p>
                                <p className="text-xs text-gray-600">Instalaciones reagendadas</p>
                            </div>
                            <span className="text-lg font-bold text-yellow-600">
                                {calcularPorcentaje(por_estado.reagendada, resumen.total)}%
                            </span>
                        </div>

                        {/* Tasa de cancelación */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Tasa de Cancelación</p>
                                <p className="text-xs text-gray-600">Instalaciones canceladas</p>
                            </div>
                            <span className="text-lg font-bold text-red-600">
                                {calcularPorcentaje(por_estado.cancelada, resumen.total)}%
                            </span>
                        </div>

                        {/* Satisfacción del cliente */}
                        {rendimiento.satisfaccion && (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Satisfacción</p>
                                    <p className="text-xs text-gray-600">Promedio general</p>
                                </div>
                                <span className="text-lg font-bold text-green-600">
                                    {rendimiento.satisfaccion}/5.0
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alertas y notificaciones */}
            {(por_estado.reagendada > 0 || por_estado.cancelada > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-yellow-800 mb-1">
                                Atención requerida
                            </h4>
                            <div className="text-sm text-yellow-700 space-y-1">
                                {por_estado.reagendada > 0 && (
                                    <p>• {formatNumber(por_estado.reagendada)} instalaciones han sido reagendadas</p>
                                )}
                                {por_estado.cancelada > 0 && (
                                    <p>• {formatNumber(por_estado.cancelada)} instalaciones han sido canceladas</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstalacionesStats;