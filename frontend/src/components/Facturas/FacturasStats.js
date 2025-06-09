// components/Facturas/FacturasStats.js
import React from 'react';
import { useFacturasEstadisticas } from '../../hooks/useFacturas';
import FacturasService from '../../services/facturasService';

const FacturasStats = () => {
  const { estadisticas, loading, error, refrescar } = useFacturasEstadisticas();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-red-600">⚠️</span>
          <span className="text-red-800">Error al cargar estadísticas: {error}</span>
          <button
            onClick={refrescar}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return null;
  }

  const tarjetas = [
    {
      titulo: 'Total Facturas',
      valor: estadisticas.total || 0,
      icono: '📄',
      color: 'blue',
      descripcion: `${estadisticas.facturadas_hoy || 0} facturadas hoy`
    },
    {
      titulo: 'Pendientes',
      valor: estadisticas.pendientes || 0,
      icono: '⏳',
      color: 'yellow',
      descripcion: FacturasService.formatearMoneda(estadisticas.valor_pendiente || 0)
    },
    {
      titulo: 'Pagadas',
      valor: estadisticas.pagadas || 0,
      icono: '✅',
      color: 'green',
      descripcion: FacturasService.formatearMoneda(estadisticas.valor_pagado || 0)
    },
    {
      titulo: 'Cartera Vencida',
      valor: estadisticas.vencidas || 0,
      icono: '⚠️',
      color: 'red',
      descripcion: FacturasService.formatearMoneda(estadisticas.cartera_vencida || 0)
    }
  ];

  const obtenerColorTarjeta = (color) => {
    const colores = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        value: 'text-blue-800',
        desc: 'text-blue-600'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'text-yellow-600',
        title: 'text-yellow-900',
        value: 'text-yellow-800',
        desc: 'text-yellow-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        value: 'text-green-800',
        desc: 'text-green-600'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        value: 'text-red-800',
        desc: 'text-red-600'
      }
    };
    return colores[color] || colores.blue;
  };

  return (
    <div className="mb-8">
      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {tarjetas.map((tarjeta, index) => {
          const colores = obtenerColorTarjeta(tarjeta.color);
          
          return (
            <div
              key={index}
              className={`${colores.bg} ${colores.border} border rounded-lg p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${colores.title}`}>
                    {tarjeta.titulo}
                  </p>
                  <p className={`text-2xl font-bold ${colores.value} mt-1`}>
                    {tarjeta.valor.toLocaleString()}
                  </p>
                  <p className={`text-sm ${colores.desc} mt-1`}>
                    {tarjeta.descripcion}
                  </p>
                </div>
                <div className={`text-2xl ${colores.icon}`}>
                  {tarjeta.icono}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Resumen Financiero</h3>
          <button
            onClick={refrescar}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
          >
            🔄 Actualizar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Resumen de valores */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Valores por Estado</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Facturado Total:</span>
                <span className="font-medium text-gray-900">
                  {FacturasService.formatearMoneda((estadisticas.valor_pendiente || 0) + (estadisticas.valor_pagado || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recaudado:</span>
                <span className="font-medium text-green-600">
                  {FacturasService.formatearMoneda(estadisticas.valor_pagado || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Por Cobrar:</span>
                <span className="font-medium text-yellow-600">
                  {FacturasService.formatearMoneda(estadisticas.valor_pendiente || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cartera Vencida:</span>
                <span className="font-medium text-red-600">
                  {FacturasService.formatearMoneda(estadisticas.cartera_vencida || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores de rendimiento */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Indicadores</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">% Recaudación:</span>
                <span className="font-medium text-gray-900">
                  {estadisticas.valor_pagado && (estadisticas.valor_pendiente + estadisticas.valor_pagado) > 0
                    ? `${((estadisticas.valor_pagado / (estadisticas.valor_pendiente + estadisticas.valor_pagado)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">% Vencida:</span>
                <span className="font-medium text-red-600">
                  {estadisticas.cartera_vencida && estadisticas.valor_pendiente > 0
                    ? `${((estadisticas.cartera_vencida / estadisticas.valor_pendiente) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Anuladas:</span>
                <span className="font-medium text-gray-600">
                  {estadisticas.anuladas || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Facturación del mes */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Este Mes</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Facturado:</span>
                <span className="font-medium text-blue-600">
                  {FacturasService.formatearMoneda(estadisticas.facturado_mes_actual || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Nuevas Hoy:</span>
                <span className="font-medium text-green-600">
                  {estadisticas.facturadas_hoy || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Promedio/Día:</span>
                <span className="font-medium text-gray-600">
                  {estadisticas.facturado_mes_actual && new Date().getDate() > 0
                    ? FacturasService.formatearMoneda(Math.round(estadisticas.facturado_mes_actual / new Date().getDate()))
                    : '$0'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso visual */}
        {(estadisticas.valor_pendiente > 0 || estadisticas.valor_pagado > 0) && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-700 mb-2">Estado de Facturación</h4>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(estadisticas.valor_pagado / (estadisticas.valor_pendiente + estadisticas.valor_pagado)) * 100}%`
                  }}
                ></div>
                <div
                  className="bg-red-500"
                  style={{
                    width: `${(estadisticas.cartera_vencida / (estadisticas.valor_pendiente + estadisticas.valor_pagado)) * 100}%`
                  }}
                ></div>
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${((estadisticas.valor_pendiente - estadisticas.cartera_vencida) / (estadisticas.valor_pendiente + estadisticas.valor_pagado)) * 100}%`
                  }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>🟢 Pagado</span>
              <span>🟡 Pendiente</span>
              <span>🔴 Vencido</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturasStats;