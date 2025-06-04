// frontend/src/components/Config/ConfigMain.js

import React, { useState, useEffect } from 'react';
import {
    Settings, Building2, MapPin, CreditCard, Wifi,
    PieChart, CheckCircle, AlertCircle, Users,
    Loader2, RefreshCw, ChevronRight, FileText, Mail
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const ConfigMain = () => {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const { hasPermission } = useAuth();

    useEffect(() => {
        loadConfigOverview();
    }, []);

    const loadConfigOverview = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await configService.getConfigOverview();
            setOverview(response.data);
        } catch (err) {
            console.error('Error cargando configuración:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadConfigOverview();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
                    <p className="text-gray-600">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    const configSections = [
        {
            id: 'company',
            title: 'Configuración de Empresa',
            description: 'Datos básicos de la empresa, facturación y parámetros generales',
            icon: <Building2 size={24} />,
            color: '#0e6493',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            completed: overview?.empresa_configurada || false,
            count: overview?.configuracion_empresa ? 1 : 0,
            total: 1,
            permission: 'administrador'
        },
        {
            id: 'geography',
            title: 'Gestión Geográfica',
            description: 'Departamentos, ciudades y sectores de cobertura',
            icon: <MapPin size={24} />,
            color: '#10b981',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            completed: (overview?.contadores?.sectores_activos || 0) > 0,
            count: (overview?.contadores?.departamentos || 0) +
                (overview?.contadores?.ciudades || 0) +
                (overview?.contadores?.sectores_activos || 0),
            total: 'Variable',
            permission: 'administrador'
        },
        {
            id: 'banks',
            title: 'Gestión de Bancos',
            description: 'Configuración de bancos para registro de pagos',
            icon: <CreditCard size={24} />,
            color: '#f59e0b',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            completed: (overview?.contadores?.bancos_activos || 0) > 0,
            count: overview?.contadores?.bancos_activos || 0,
            total: 'Variable',
            permission: 'administrador'
        },
        {
            id: 'service-plans',
            title: 'Planes de Servicio',
            description: 'Configuración de planes de internet, TV y combos',
            icon: <Wifi size={24} />,
            color: '#8b5cf6',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            completed: (overview?.contadores?.planes_activos || 0) > 0,
            count: overview?.contadores?.planes_activos || 0,
            total: 'Variable',
            permission: 'administrador'
        },
        {
            id: 'users',
            title: 'Gestión de Usuarios',
            description: 'Administración de usuarios del sistema y permisos',
            icon: <Users size={24} />,
            color: '#ef4444',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            completed: true, // Siempre hay al menos un usuario (el actual)
            count: 'Configurado',
            total: '',
            permission: 'administrador'
        },
        {
            id: 'reports',
            title: 'Configuración de Reportes',
            description: 'Configuración de reportes y métricas del sistema',
            icon: <PieChart size={24} />,
            color: '#06b6d4',
            bgColor: 'bg-cyan-50',
            borderColor: 'border-cyan-200',
            completed: false,
            count: 0,
            total: 'Pendiente',
            permission: 'supervisor'
        },
        {
            id: 'conceptos',
            title: 'Conceptos de Facturación',
            description: 'Configura los conceptos que se pueden facturar a los clientes',
            icon: <FileText size={24} />,
            color: '#8b5cf6',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            completed: (overview?.contadores?.conceptos_activos || 0) > 0,
            count: overview?.contadores?.conceptos_activos || 0,
            total: 'Variable',
            permission: 'administrador'
        },
        {
            id: 'plantillas-correo',
            title: 'Plantillas de Correo',
            description: 'Configuración de plantillas de correo electrónico para el sistema',
            icon: <Mail size={24} />,
            color: '#06b6d4',
            bgColor: 'bg-cyan-50',
            borderColor: 'border-cyan-200',
            completed: (overview?.contadores?.plantillas_activas || 0) > 0,
            count: overview?.contadores?.plantillas_activas || 0,
            total: 'Variable',
            permission: 'administrador'
        }
    ];

    // Filtrar secciones según permisos
    const allowedSections = configSections.filter(section =>
        hasPermission(section.permission)
    );

    const completedSections = allowedSections.filter(section => section.completed).length;
    const totalSections = allowedSections.length;
    const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;



    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Configuración del Sistema
                            </h1>
                            <p className="text-gray-600">
                                Gestiona la configuración básica del sistema ISP
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
                        <AlertCircle size={20} className="mr-2" />
                        <div>
                            <p className="font-medium">Error cargando configuración</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="ml-auto p-1 hover:bg-red-200 rounded"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                )}

                {/* Progress Overview */}
                <div className="mb-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Progreso de Configuración
                        </h2>
                        <span className="text-sm text-gray-600">
                            {completedSections} de {totalSections} completadas
                        </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                            className="bg-[#0e6493] h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-[#0e6493]">
                                {Math.round(progressPercentage)}%
                            </div>
                            <div className="text-sm text-gray-600">Completado</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {completedSections}
                            </div>
                            <div className="text-sm text-gray-600">Configuraciones Listas</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                                {totalSections - completedSections}
                            </div>
                            <div className="text-sm text-gray-600">Pendientes</div>
                        </div>
                    </div>
                </div>

                {/* Configuration Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allowedSections.map((section) => (
                        <ConfigCard
                            key={section.id}
                            section={section}
                            onClick={() => {
                                if (section.id === 'users') {
                                    window.location.href = '/admin/users';
                                } else if (section.id === 'reports') {
                                    alert('Configuración de reportes en desarrollo');
                                } else {
                                    window.location.href = `/config/${section.id}`;
                                }
                            }}
                        />
                    ))}
                </div>

                {/* Configuration Summary */}
                {overview && (
                    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Resumen de Configuración
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Departamentos:</span>
                                <span className="font-medium">{overview.contadores?.departamentos || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Ciudades:</span>
                                <span className="font-medium">{overview.contadores?.ciudades || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Sectores:</span>
                                <span className="font-medium">{overview.contadores?.sectores_activos || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Bancos:</span>
                                <span className="font-medium">{overview.contadores?.bancos_activos || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Planes:</span>
                                <span className="font-medium">{overview.contadores?.planes_activos || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Conceptos:</span>
                                <span className="font-medium">{overview.contadores?.conceptos_activos || 0}</span>
                            </div>
                        </div>

                        {overview.configuracion_completa && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                                <CheckCircle size={20} className="text-green-600 mr-2" />
                                <span className="text-green-800 font-medium">
                                    ¡Configuración básica completada! El sistema está listo para gestionar clientes.
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente de tarjeta de configuración
const ConfigCard = ({ section, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`${section.bgColor} ${section.borderColor} border-2 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${section.color}20`, color: section.color }}
                >
                    {section.icon}
                </div>
                <div className="flex items-center">
                    {section.completed ? (
                        <CheckCircle size={20} className="text-green-600" />
                    ) : (
                        <AlertCircle size={20} className="text-orange-500" />
                    )}
                    <ChevronRight size={16} className="ml-1 text-gray-400" />
                </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {section.title}
            </h3>

            <p className="text-gray-600 text-sm mb-4">
                {section.description}
            </p>

            <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    {typeof section.count === 'number' && typeof section.total === 'number'
                        ? `${section.count}/${section.total}`
                        : `${section.count} ${section.total}`}
                </span>
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${section.completed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                        }`}
                >
                    {section.completed ? 'Completado' : 'Pendiente'}
                </span>
            </div>
        </div>
    );
};

export default ConfigMain;