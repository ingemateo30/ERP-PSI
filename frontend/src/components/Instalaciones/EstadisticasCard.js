// frontend/src/components/Instalaciones/EstadisticasCard.js

import React from 'react';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  RotateCcw, TrendingUp, Users, DollarSign, Activity
} from 'lucide-react';

const EstadisticasCard = ({ estadisticas, onFiltrarPorEstado }) => {
  
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  const calcularPorcentaje = (valor, total) => {
    if (total === 0) return 0;
    return Math.round((valor / total) * 100);
  };

  const estadisticasPrincipales = [
    {
      id: 'total',
      titulo: 'Total',
      valor: estadisticas.total || 0,
      icono: Activity,
      color: 'bg-gray-100 text-gray-800',
      onClick: () => onFiltrarPorEstado('')
    },
    {
      id: 'programadas',
      titulo: 'Programadas',
      valor: estadisticas.programadas || 0,
      icono: Calendar,
      color: 'bg-blue-100 text-blue-800',
      porcentaje: calcularPorcentaje(estadisticas.programadas, estadisticas.total),
      onClick: () => onFiltrarPorEstado('programada')
    },
    {
      id: 'en_proceso',
      titulo: 'En Proceso',
      valor: estadisticas.en_proceso || 0,
      icono: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      porcentaje: calcularPorcentaje(estadisticas.en_proceso, estadisticas.total),
      onClick: () => onFiltrarPorEstado('en_proceso')
    },
    {
      id: 'completadas',
      titulo: 'Completadas',
      valor: estadisticas.completadas || 0,
      icono: CheckCircle,
      color: 'bg-green-100 text-green-800',
      porcentaje: calcularPorcentaje(estadisticas.completadas, estadisticas.total),
      onClick: () => onFiltrarPorEstado('completada')
    },
    {
      id: 'canceladas',
      titulo: 'Canceladas',
      valor: estadisticas.canceladas || 0,
      icono: XCircle,
      color: 'bg-red-100 text-red-800',
      porcentaje: calcularPorcentaje(estadisticas.canceladas, estadisticas.total),
      onClick: () => onFiltrarPorEstado('cancelada')
    },
    {
      id: 'reagendadas',
      titulo: 'Reagendadas',
      valor: estadisticas.reagendadas || 0,
      icono: RotateCcw,
      color: 'bg-purple-100 text-purple-800',
      porcentaje: calcularPorcentaje(estadisticas.reagendadas, estadisticas.total),
      onClick: () => onFiltrarPorEstado('reagendada')
    }
  ];

  const estadisticasSecundarias = [
    {
      titulo: 'Vencidas',
      valor: estadisticas.vencidas || 0,
      icono: AlertTriangle,
      color: 'text-red-600',
      descripcion: 'Instalaciones vencidas pendientes'
    },
    {
      titulo: 'Hoy',
      valor: estadisticas.hoy || 0,
      icono: Calendar,
      color: 'text-blue-600',
      descripcion: 'Instalaciones programadas para hoy'
    },
    {
      titulo: 'Esta Semana',
      valor: estadisticas.esta_semana || 0,
      icono: Calendar,
      color: 'text-green-600',
      descripcion: 'Instalaciones de esta semana'
    },
    {
      titulo: 'Este Mes',
      valor: estadisticas.este_mes || 0,
      icono: TrendingUp,
      color: 'text-purple-600',
      descripcion: 'Instalaciones de este mes'
    }
  ];

  const porcentajeExito = estadisticas.total > 0 
    ? Math.round((estadisticas.completadas / estadisticas.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Estadísticas de Instalaciones
        </h2>
        <p className="text-sm text-gray-600">
          Resumen del estado actual de las instalaciones
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {estadisticasPrincipales.map((stat) => {
          const Icono = stat.icono;
          return (
            <div
              key={stat.id}
              onClick={stat.onClick}
              className="cursor-pointer group bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-colors border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    {stat.titulo}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.valor}
                  </p>
                  {stat.porcentaje !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      {stat.porcentaje}% del total
                    </p>
                  )}
                </div>
                <div className={`flex-shrink-0 p-2 rounded-lg ${stat.color}`}>
                  <Icono className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estadísticas temporales */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Vista Temporal
          </h3>
          <div className="space-y-3">
            {estadisticasSecundarias.map((stat, index) => {
              const Icono = stat.icono;
              return (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Icono className={`w-4 h-4 mr-3 ${stat.color}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {stat.titulo}
                      </p>
                      <p className="text-xs text-gray-500">
                        {stat.descripcion}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {stat.valor}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Métricas financieras y de rendimiento */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Métricas de Rendimiento
          </h3>
          <div className="space-y-4">
            {/* Porcentaje de éxito */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Tasa de Éxito
                </span>
                <span className="text-lg font-bold text-green-600">
                  {porcentajeExito}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${porcentajeExito}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Instalaciones completadas vs total
              </p>
            </div>

            {/* Costo promedio */}
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-3 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Costo Promedio
                  </p>
                  <p className="text-xs text-gray-500">
                    Por instalación
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatearMoneda(estadisticas.costo_promedio)}
              </span>
            </div>

            {/* Costo total */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-3 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Valor Total
                  </p>
                  <p className="text-xs text-gray-500">
                    Ingresos por instalaciones
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatearMoneda(estadisticas.costo_total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {estadisticas.vencidas > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Instalaciones Vencidas
              </h4>
              <p className="text-sm text-red-700">
                Tienes {estadisticas.vencidas} instalación(es) vencida(s) que requieren atención inmediata.
              </p>
            </div>
          </div>
        </div>
      )}

      {estadisticas.hoy > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Instalaciones de Hoy
              </h4>
              <p className="text-sm text-blue-700">
                Tienes {estadisticas.hoy} instalación(es) programada(s) para hoy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasCard;