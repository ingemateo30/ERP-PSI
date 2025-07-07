// components/Facturas/FacturasStats.js - COMPLETO 100%
import React, { useEffect } from 'react';
import { useFacturasEstadisticas } from '../../hooks/useFacturacionManual';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users
} from 'lucide-react';

const FacturasStats = () => {
  const { estadisticas, loading, error, cargarEstadisticas, refrescar } = useFacturasEstadisticas();

  // Recargar estadísticas cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      refrescar();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [refrescar]);

  // Datos por defecto en caso de que no haya estadísticas
  const statsDefault = {
    total_facturas: 0,
    facturas_pendientes: 0,
    facturas_pagadas: 0,
    facturas_vencidas: 0,
    facturas_anuladas: 0,
    total_facturado: 0,
    total_cobrado: 0,
    total_pendiente: 0,
    total_vencido: 0,
    promedio_factura: 0,
    crecimiento_mes: 0,
    cartera_vencida_porcentaje: 0
  };

  const stats = estadisticas || statsDefault;

  // Formatear números como moneda
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  // Formatear números
  const formatearNumero = (valor) => {
    return new Intl.NumberFormat('es-CO').format(valor || 0);
  };

  // Formatear porcentaje
  const formatearPorcentaje = (valor) => {
    return `${(valor || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar estadísticas</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={refrescar}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Título de la sección */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Estadísticas de Facturación</h2>
        <button
          onClick={refrescar}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          disabled={loading}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Grid de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total de Facturas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Facturas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatearNumero(stats.total_facturas)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Facturado */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Facturado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatearMoneda(stats.total_facturado)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Cobrado */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cobrado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatearMoneda(stats.total_cobrado)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Pendiente */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pendiente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatearMoneda(stats.total_pendiente)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de estadísticas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Facturas Pagadas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Pagadas</p>
              <p className="text-2xl font-bold text-green-600">
                {formatearNumero(stats.facturas_pagadas)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Facturas Pendientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatearNumero(stats.facturas_pendientes)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Facturas Vencidas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Vencidas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatearNumero(stats.facturas_vencidas)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatearMoneda(stats.total_vencido)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Facturas Anuladas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Anuladas</p>
              <p className="text-2xl font-bold text-gray-600">
                {formatearNumero(stats.facturas_anuladas)}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Promedio por Factura */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Promedio por Factura</p>
              <p className="text-xl font-bold text-blue-600">
                {formatearMoneda(stats.promedio_factura)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Crecimiento del Mes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crecimiento del Mes</p>
              <p className={`text-xl font-bold ${
                (stats.crecimiento_mes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatearPorcentaje(stats.crecimiento_mes)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${
              (stats.crecimiento_mes || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {(stats.crecimiento_mes || 0) >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
        </div>

        {/* Cartera Vencida */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cartera Vencida</p>
              <p className="text-xl font-bold text-red-600">
                {formatearPorcentaje(stats.cartera_vencida_porcentaje)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores de rendimiento */}
      {stats.total_facturas > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicadores de Rendimiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tasa de Cobro */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Tasa de Cobro</p>
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-green-600"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${(stats.facturas_pagadas / stats.total_facturas * 100)}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(stats.facturas_pagadas / stats.total_facturas * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Facturas cobradas vs emitidas
              </p>
            </div>

            {/* Eficiencia de Cobranza */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Eficiencia de Cobranza</p>
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-600"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${stats.total_facturado > 0 ? (stats.total_cobrado / stats.total_facturado * 100) : 0}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">
                      {stats.total_facturado > 0 ? Math.round(stats.total_cobrado / stats.total_facturado * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Dinero efectivamente cobrado
              </p>
            </div>

            {/* Riesgo de Cartera */}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">Riesgo de Cartera</p>
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-red-600"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${Math.min(100, stats.cartera_vencida_porcentaje || 0)}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">
                      {formatearPorcentaje(stats.cartera_vencida_porcentaje)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Porcentaje de cartera en mora
              </p>
            </div>
          </div>

          {/* Resumen textual adicional */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded-lg">
              <h5 className="font-medium text-green-800 mb-1">Rendimiento Positivo</h5>
              <ul className="text-green-700 space-y-1">
                <li>• {stats.facturas_pagadas} facturas cobradas exitosamente</li>
                <li>• {formatearMoneda(stats.total_cobrado)} en ingresos confirmados</li>
                <li>• Tasa de cobro del {stats.total_facturas > 0 ? Math.round(stats.facturas_pagadas / stats.total_facturas * 100) : 0}%</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-1">Áreas de Atención</h5>
              <ul className="text-yellow-700 space-y-1">
                <li>• {stats.facturas_pendientes} facturas por cobrar</li>
                <li>• {stats.facturas_vencidas} facturas vencidas</li>
                <li>• {formatearMoneda(stats.total_pendiente)} en cartera pendiente</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Alertas y recomendaciones */}
      {stats.total_facturas > 0 && (
        <div className="mt-6 space-y-3">
          {/* Alerta de cartera vencida alta */}
          {(stats.cartera_vencida_porcentaje || 0) > 15 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Cartera Vencida Alta</h3>
                  <p className="text-sm text-red-700">
                    El {formatearPorcentaje(stats.cartera_vencida_porcentaje)} de su cartera está vencida. 
                    Se recomienda implementar estrategias de cobranza más agresivas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Alerta de muchas facturas pendientes */}
          {stats.facturas_pendientes > stats.facturas_pagadas && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <Clock className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Muchas Facturas Pendientes</h3>
                  <p className="text-sm text-yellow-700">
                    Tiene {stats.facturas_pendientes} facturas pendientes por cobrar. 
                    Considere revisar los procesos de cobranza y seguimiento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje positivo */}
          {(stats.cartera_vencida_porcentaje || 0) < 5 && stats.facturas_pagadas > stats.facturas_pendientes && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Excelente Gestión de Cobranza</h3>
                  <p className="text-sm text-green-700">
                    Su cartera está en excelente estado con baja morosidad y alta tasa de cobro. 
                    ¡Continúe con las buenas prácticas!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información de última actualización */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Última actualización: {new Date().toLocaleString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Las estadísticas se actualizan automáticamente cada 5 minutos
        </p>
      </div>
    </div>
  );
};

export default FacturasStats;