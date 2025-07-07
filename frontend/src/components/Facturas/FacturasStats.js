// frontend/src/components/Facturas/FacturasStats.js - CORREGIDO

import React from 'react';
import { useFacturasEstadisticas } from '../../hooks/useFacturas';
// CORREGIDO: Importación correcta del service
import { facturasService } from '../../services/facturasService';

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

  // Calcular totales y porcentajes
  const totalValor = (stats.valor_pendiente || 0) + (stats.valor_pagado || 0) + (stats.cartera_vencida || 0);
  const porcentajeRecaudacion = facturasService.calcularPorcentaje(stats.valor_pagado || 0, totalValor);
  const porcentajeVencida = facturasService.calcularPorcentaje(stats.cartera_vencida || 0, totalValor);

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
      descripcion: facturasService.formatearMoneda(stats.valor_pendiente || 0)
    },
    {
      titulo: 'Pagadas',
      valor: stats.pagadas,
      icono: '✅',
      color: 'green',
      descripcion: facturasService.formatearMoneda(stats.valor_pagado || 0)
    },
    {
      titulo: 'Vencidas',
      valor: stats.vencidas,
      icono: '🚨',
      color: 'red',
      descripcion: facturasService.formatearMoneda(stats.cartera_vencida || 0)
    }
  ];

  // Función para obtener clases de color
  const obtenerClaseColor = (color) => {
    const colores = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      red: 'bg-red-50 border-red-200 text-red-700'
    };
    return colores[color] || colores.blue;
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas principales de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tarjetas.map((tarjeta, index) => (
          <div
            key={index}
            className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${obtenerClaseColor(tarjeta.color)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  {tarjeta.titulo}
                </h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {facturasService.formatearNumero(tarjeta.valor)}
                </p>
              </div>
              <div className="text-3xl">
                {tarjeta.icono}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {tarjeta.descripcion}
            </p>
          </div>
        ))}
      </div>

      {/* Panel de resumen financiero */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📊</span>
          Resumen Financiero
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Valores monetarios */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Valores</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Facturado:</span>
                <span className="font-medium text-gray-900">
                  {facturasService.formatearMoneda(totalValor)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Recaudado:</span>
                <span className="font-medium text-green-600">
                  {facturasService.formatearMoneda(stats.valor_pagado || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Por Cobrar:</span>
                <span className="font-medium text-yellow-600">
                  {facturasService.formatearMoneda(stats.valor_pendiente || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cartera Vencida:</span>
                <span className="font-medium text-red-600">
                  {facturasService.formatearMoneda(stats.cartera_vencida || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores de rendimiento */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Indicadores</h4>
            <div className="space-y-4">
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
                  {facturasService.formatearNumero(stats.anuladas || 0)}
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

          {/* Gráfico simple de barras */}
          <div>
            <h4 className="font-medium text-gray-700 mb-4">Distribución</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pagadas</span>
                  <span>{facturasService.calcularPorcentaje(stats.pagadas, stats.total)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${facturasService.calcularPorcentaje(stats.pagadas, stats.total)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pendientes</span>
                  <span>{facturasService.calcularPorcentaje(stats.pendientes, stats.total)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${facturasService.calcularPorcentaje(stats.pendientes, stats.total)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Vencidas</span>
                  <span>{facturasService.calcularPorcentaje(stats.vencidas, stats.total)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${facturasService.calcularPorcentaje(stats.vencidas, stats.total)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refrescar}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
            >
              <span className="mr-2">🔄</span>
              Actualizar
            </button>
            <button
              onClick={() => window.open('/reportes/facturas', '_blank')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-sm font-medium"
            >
              <span className="mr-2">📊</span>
              Ver Reportes
            </button>
            <button
              onClick={() => window.location.href = '/facturas?estado=vencida'}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm font-medium"
            >
              <span className="mr-2">⚠️</span>
              Gestionar Vencidas
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje informativo si no hay datos */}
      {stats.total === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay facturas registradas
          </h3>
          <p className="text-gray-600">
            Comienza creando tu primera factura para ver las estadísticas aquí.
          </p>
          <button
            onClick={() => window.location.href = '/facturas/nueva'}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium"
          >
            Crear Primera Factura
          </button>
        </div>
      )}
    </div>
  );
};

export default FacturasStats;