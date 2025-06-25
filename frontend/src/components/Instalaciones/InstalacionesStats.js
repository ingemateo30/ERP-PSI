// frontend/src/components/Instalaciones/InstalacionesStats.js

import React from 'react';
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
  RefreshCw
} from 'lucide-react';

const InstalacionesStats = ({ 
  estadisticas, 
  loading, 
  onRefresh 
}) => {
  
  // Función para formatear números
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('es-CO').format(num);
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para calcular porcentaje
  const calcularPorcentaje = (valor, total) => {
    if (!total || total === 0) return 0;
    return ((valor / total) * 100).toFixed(1);
  };

  // Función para obtener clase CSS según el estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completada': return 'text-green-600 bg-green-100';
      case 'programada': return 'text-blue-600 bg-blue-100';
      case 'en_proceso': return 'text-yellow-600 bg-yellow-100';
      case 'cancelada': return 'text-red-600 bg-red-100';
      case 'reagendada': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando estadísticas...</span>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">No hay estadísticas disponibles</p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Cargar Estadísticas
        </button>
      </div>
    );
  }

  const {
    totales,
    porEstado,
    porTipo,
    porInstalador,
    porCiudad,
    tendencias,
    metricas,
    vencidas
  } = estadisticas;

  return (
    <div className="space-y-6">
      {/* Header con botón de refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Estadísticas Detalladas</h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Instalaciones</p>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(totales?.total || 0)}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Completadas</p>
              <p className="text-2xl font-bold text-green-900">{formatNumber(totales?.completadas || 0)}</p>
              <p className="text-xs text-green-700">
                {calcularPorcentaje(totales?.completadas, totales?.total)}% del total
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-900">{formatNumber(totales?.en_proceso || 0)}</p>
              <p className="text-xs text-yellow-700">
                {calcularPorcentaje(totales?.en_proceso, totales?.total)}% del total
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">Vencidas</p>
              <p className="text-2xl font-bold text-red-900">{formatNumber(vencidas?.total || 0)}</p>
              <p className="text-xs text-red-700">Requieren atención</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Distribución por estado */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Distribución por Estado
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {porEstado && Object.entries(porEstado).map(([estado, cantidad]) => (
            <div key={estado} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(estado)}`}>
                {cantidad}
              </div>
              <p className="text-xs text-gray-600 mt-1 capitalize">
                {estado.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-500">
                {calcularPorcentaje(cantidad, totales?.total)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Distribución por tipo de instalación */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Tipos de Instalación
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {porTipo && Object.entries(porTipo).map(([tipo, cantidad]) => {
            const tipoLabels = {
              nueva: 'Nueva',
              migracion: 'Migración',
              upgrade: 'Upgrade',
              reparacion: 'Reparación'
            };
            
            return (
              <div key={tipo} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(cantidad)}</p>
                  <p className="text-sm text-gray-600">{tipoLabels[tipo] || tipo}</p>
                  <p className="text-xs text-gray-500">
                    {calcularPorcentaje(cantidad, totales?.total)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top instaladores */}
      {porInstalador && porInstalador.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Rendimiento por Instalador
          </h4>
          <div className="space-y-3">
            {porInstalador.slice(0, 5).map((instalador, index) => (
              <div key={instalador.instalador_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      {instalador.instalador_nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(instalador.completadas)} completadas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatNumber(instalador.total)}</p>
                  <p className="text-sm text-gray-600">total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribución por ciudad */}
      {porCiudad && porCiudad.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Distribución por Ciudad
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {porCiudad.slice(0, 6).map((ciudad) => (
              <div key={ciudad.ciudad_id} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{formatNumber(ciudad.total)}</p>
                  <p className="text-sm font-medium text-gray-700">{ciudad.ciudad_nombre}</p>
                  <p className="text-xs text-gray-500">
                    {calcularPorcentaje(ciudad.total, totales?.total)}% del total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas financieras */}
      {metricas && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Métricas Financieras
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">Ingresos Total</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(metricas.ingresos_total || 0)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Costo Promedio</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(metricas.costo_promedio || 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-800">Instalaciones/Día</p>
              <p className="text-2xl font-bold text-purple-900">
                {(metricas.promedio_dia || 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tendencias */}
      {tendencias && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Tendencias del Mes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">Crecimiento Mensual</p>
                <p className="text-xl font-bold text-green-900">
                  +{tendencias.crecimiento_porcentaje || 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-800">Este Mes</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatNumber(tendencias.este_mes || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstalacionesStats;