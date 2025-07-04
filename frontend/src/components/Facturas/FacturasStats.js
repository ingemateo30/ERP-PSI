// components/Facturas/FacturasStats.js - Componente de estadísticas corregido
import React from 'react';
import { useFacturasEstadisticas } from '../../hooks/useFacturas';
import FacturasService from '../../services/facturasService';

const FacturasStats = () => {
  const { estadisticas, loading, error, refrescar } = useFacturasEstadisticas();

  // Componente de carga
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="flex items-center mb-4">
                <div className="h-6 w-6 bg-gray-200 rounded mr-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Componente de error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error al cargar estadísticas</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={refrescar}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm font-medium"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Si no hay estadísticas, usar valores por defecto
  const stats = estadisticas || {
    total: 0,
    pendientes: 0,
    pagadas: 0,
    vencidas: 0,
    anuladas: 0,
    valor_pendiente: 0,
    valor_pagado: 0,
    cartera_vencida: 0,
    facturadas_hoy: 0,
    facturado_mes_actual: 0
  };

  // Configuración de tarjetas principales
  const tarjetas = [
    {
      titulo: 'Total Facturas',
      valor: stats.total,
      icono: '📄',
      color: 'blue',
      descripcion: `${stats.facturadas_hoy || 0} facturadas hoy`
    },
    {
      titulo: 'Pendientes',
      valor: stats.pendientes,
      icono: '⏳',
      color: 'yellow',
      descripcion: FacturasService.formatearMoneda(stats.valor_pendiente || 0)
    },
    {
      titulo: 'Pagadas',
      valor: stats.pagadas,
      icono: '✅',
      color: 'green',
      descripcion: FacturasService.formatearMoneda(stats.valor_pagado || 0)
    },
    {
      titulo: 'Cartera Vencida',
      valor: stats.vencidas,
      icono: '⚠️',
      color: 'red',
      descripcion: FacturasService.formatearMoneda(stats.cartera_vencida || 0)
    }
  ];

  // Función para obtener colores de tarjetas
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

  // Calcular porcentajes para indicadores
  const totalValor = (stats.valor_pendiente || 0) + (stats.valor_pagado || 0);
  const porcentajeRecaudacion = totalValor > 0 
    ? ((stats.valor_pagado || 0) / totalValor * 100).toFixed(1)
    : '0';
  
  const porcentajeVencida = (stats.valor_pendiente || 0) > 0
    ? ((stats.cartera_vencida || 0) / (stats.valor_pendiente || 0) * 100).toFixed(1)
    : '0';

  const promedioMes = stats.facturado_mes_actual && new Date().getDate() > 0
    ? FacturasService.formatearMoneda(Math.round(stats.facturado_mes_actual / new Date().getDate()))
    : FacturasService.formatearMoneda(0);

  return (
    <div className="mb-8">
      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {tarjetas.map((tarjeta, index) => {
          const colores = obtenerColorTarjeta(tarjeta.color);
          
          return (
            <div
              key={index}
              className={`${colores.bg} ${colores.border} border rounded-lg p-6 transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`text-2xl ${colores.icon} mr-3`}>
                    {tarjeta.icono}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${colores.title}`}>
                      {tarjeta.titulo}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${colores.value}`}>
                    {FacturasService.formatearNumero(tarjeta.valor)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-sm ${colores.desc}`}>
                  {tarjeta.descripcion}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel de resumen financiero */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Resumen Financiero
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Valores monetarios */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Valores</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Facturado:</span>
                <span className="font-medium text-gray-900">
                  {FacturasService.formatearMoneda(totalValor)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recaudado:</span>
                <span className="font-medium text-green-600">
                  {FacturasService.formatearMoneda(stats.valor_pagado || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Por Cobrar:</span>
                <span className="font-medium text-yellow-600">
                  {FacturasService.formatearMoneda(stats.valor_pendiente || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cartera Vencida:</span>
                <span className="font-medium text-red-600">
                  {FacturasService.formatearMoneda(stats.cartera_vencida || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores de rendimiento */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Indicadores</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">% Recaudación:</span>
                <span className="font-medium text-gray-900">
                  {porcentajeRecaudacion}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">% Vencida:</span>
                <span className="font-medium text-red-600">
                  {porcentajeVencida}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Anuladas:</span>
                <span className="font-medium text-gray-600">
                  {FacturasService.formatearNumero(stats.anuladas || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Efectividad:</span>
                <span className={`font-medium ${
                  parseFloat(porcentajeRecaudacion) >= 80 
                    ? 'text-green-600' 
                    : parseFloat(porcentajeRecaudacion) >= 60 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {parseFloat(porcentajeRecaudacion) >= 80 ? 'Excelente' : 
                   parseFloat(porcentajeRecaudacion) >= 60 ? 'Buena' : 'Mejorable'}
                </span>
              </div>
            </div>
          </div>

          {/* Facturación del mes */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Este Mes</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Facturado:</span>
                <span className="font-medium text-blue-600">
                  {FacturasService.formatearMoneda(stats.facturado_mes_actual || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Nuevas Hoy:</span>
                <span className="font-medium text-green-600">
                  {FacturasService.formatearNumero(stats.facturadas_hoy || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Promedio/Día:</span>
                <span className="font-medium text-gray-600">
                  {promedioMes}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Meta Mes:</span>
                <span className="font-medium text-purple-600">
                  {FacturasService.formatearMoneda((stats.facturado_mes_actual || 0) * 1.2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso visual */}
        {totalValor > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-700">Estado de Facturación</h4>
              <span className="text-sm text-gray-600">
                {FacturasService.formatearMoneda(totalValor)} total
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div className="flex h-4">
                {/* Pagado */}
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{
                    width: `${(stats.valor_pagado / totalValor) * 100}%`
                  }}
                  title={`Pagado: ${FacturasService.formatearMoneda(stats.valor_pagado || 0)}`}
                ></div>
                
                {/* Vencido */}
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{
                    width: `${(stats.cartera_vencida / totalValor) * 100}%`
                  }}
                  title={`Vencido: ${FacturasService.formatearMoneda(stats.cartera_vencida || 0)}`}
                ></div>
                
                {/* Pendiente */}
                <div
                  className="bg-yellow-500 transition-all duration-300"
                  style={{
                    width: `${((stats.valor_pendiente - stats.cartera_vencida) / totalValor) * 100}%`
                  }}
                  title={`Pendiente: ${FacturasService.formatearMoneda((stats.valor_pendiente || 0) - (stats.cartera_vencida || 0))}`}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span>Pagado ({porcentajeRecaudacion}%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span>Pendiente</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span>Vencido ({porcentajeVencida}%)</span>
              </div>
            </div>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refrescar}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={() => window.open('/reportes/facturas', '_blank')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-sm font-medium"
            >
              📊 Ver Reportes
            </button>
            <button
              onClick={() => window.location.href = '/facturas?estado=vencida'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm font-medium"
            >
              ⚠️ Gestionar Vencidas
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje informativo si no hay datos */}
      {stats.total === 0 && (
        <div className="mt-6 text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-4xl mb-4 block">📋</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay facturas registradas
          </h3>
          <p className="text-gray-600">
            Comienza creando tu primera factura para ver las estadísticas aquí.
          </p>
        </div>
      )}
    </div>
  );
};

export default FacturasStats;