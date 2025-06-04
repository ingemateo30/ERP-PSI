import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, AlertTriangle, TrendingUp } from 'lucide-react';
import { clientService } from '../../services/clientService';

const ClientStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    suspendidos: 0,
    cortados: 0,
    retirados: 0,
    inactivos: 0,
    nuevos_hoy: 0,
    nuevos_semana: 0,
    nuevos_mes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await clientService.getClientStats();
      if (response.success) {
        // Asegurar que todos los valores sean números válidos
        const safeStats = {
          total: response.data.total || 0,
          activos: response.data.activos || 0,
          suspendidos: response.data.suspendidos || 0,
          cortados: response.data.cortados || 0,
          retirados: response.data.retirados || 0,
          inactivos: response.data.inactivos || 0,
          nuevos_hoy: response.data.nuevos_hoy || 0,
          nuevos_semana: response.data.nuevos_semana || 0,
          nuevos_mes: response.data.nuevos_mes || 0
        };
        setStats(safeStats);
        setError(null);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función helper para formatear números de forma segura
  const formatNumber = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  // Calcular porcentajes de forma segura
  const total = Number(stats.total) || 0;
  const activos = Number(stats.activos) || 0;
  const suspendidos = Number(stats.suspendidos) || 0;
  const cortados = Number(stats.cortados) || 0;
  
  const activePercentage = total > 0 ? ((activos / total) * 100).toFixed(1) : 0;
  const suspendedPercentage = total > 0 ? ((suspendidos / total) * 100).toFixed(1) : 0;
  const cutPercentage = total > 0 ? ((cortados / total) * 100).toFixed(1) : 0;

  const statCards = [
    {
      title: 'Total Clientes',
      value: formatNumber(stats.total),
      subtitle: '100% de la base',
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconColor: 'text-blue-500'
    },
    {
      title: 'Clientes Activos',
      value: formatNumber(stats.activos),
      subtitle: `${activePercentage}% del total`,
      icon: UserCheck,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconColor: 'text-green-500'
    },
    {
      title: 'Suspendidos',
      value: formatNumber(stats.suspendidos),
      subtitle: `${suspendedPercentage}% del total`,
      icon: AlertTriangle,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      iconColor: 'text-yellow-500'
    },
    {
      title: 'Cortados',
      value: formatNumber(stats.cortados),
      subtitle: `${cutPercentage}% del total`,
      icon: UserX,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      iconColor: 'text-red-500'
    },
    {
      title: 'Nuevos Este Mes',
      value: formatNumber(stats.nuevos_mes),
      subtitle: `${formatNumber(stats.nuevos_semana)} esta semana`,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconColor: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-lg shadow p-6 border border-gray-100 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.textColor} mb-1`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <IconComponent className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estadísticas adicionales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen de Estados
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatNumber(stats.activos)}</p>
            <p className="text-xs text-gray-500">Activos</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatNumber(stats.suspendidos)}</p>
            <p className="text-xs text-gray-500">Suspendidos</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-red-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatNumber(stats.cortados)}</p>
            <p className="text-xs text-gray-500">Cortados</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatNumber(stats.retirados)}</p>
            <p className="text-xs text-gray-500">Retirados</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 bg-slate-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatNumber(stats.inactivos)}</p>
            <p className="text-xs text-gray-500">Inactivos</p>
          </div>
        </div>
      </div>

      {/* Métricas de crecimiento */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Nuevos Clientes
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {formatNumber(stats.nuevos_hoy)}
            </div>
            <p className="text-sm text-gray-600">Hoy</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {formatNumber(stats.nuevos_semana)}
            </div>
            <p className="text-sm text-gray-600">Esta Semana</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {formatNumber(stats.nuevos_mes)}
            </div>
            <p className="text-sm text-gray-600">Este Mes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientStats;