import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Package,
  FileText, Wrench, AlertTriangle, CheckCircle, Clock,
  BarChart3, PieChart, Activity, RefreshCw, Calendar,
  ArrowUp, ArrowDown, Minus, Download, Filter
} from 'lucide-react';
import estadisticasService from '../../services/estadisticasService';

const EstadisticasGeneral = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    cargarEstadisticas();
  }, [filtros]);

  const cargarEstadisticas = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await estadisticasService.getDashboard(filtros);
      
      if (response.success) {
        setEstadisticas(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Error al cargar las estadísticas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    cargarEstadisticas();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-[#0e6493] mx-auto mb-4" />
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Error al cargar estadísticas</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  const { financieras, clientes, operacionales, tendencias } = estadisticas;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Estadísticas</h1>
          <p className="text-gray-600 mt-1">
            Periodo: {new Date(filtros.fecha_desde).toLocaleDateString('es-CO')} - {new Date(filtros.fecha_hasta).toLocaleDateString('es-CO')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* KPIs Financieros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Facturado */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Mes Actual
            </span>
          </div>
          <h3 className="text-sm font-medium mb-2 opacity-90">Total Facturado</h3>
          <p className="text-3xl font-bold mb-2">
            {estadisticasService.formatCurrency(financieras?.periodo?.total_facturado || 0)}
          </p>
          <div className="flex items-center text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>{financieras?.periodo?.total_facturas || 0} facturas</span>
          </div>
        </div>

        {/* Total Recaudado */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              {estadisticasService.formatPercentage(financieras?.periodo?.tasa_recaudo || 0)}
            </span>
          </div>
          <h3 className="text-sm font-medium mb-2 opacity-90">Total Recaudado</h3>
          <p className="text-3xl font-bold mb-2">
            {estadisticasService.formatCurrency(financieras?.periodo?.total_recaudado || 0)}
          </p>
          <div className="flex items-center text-sm">
            <Activity className="w-4 h-4 mr-1" />
            <span>Tasa de recaudo</span>
          </div>
        </div>

        {/* Cartera Vencida */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Mora
            </span>
          </div>
          <h3 className="text-sm font-medium mb-2 opacity-90">Cartera Vencida</h3>
          <p className="text-3xl font-bold mb-2">
            {estadisticasService.formatCurrency(financieras?.cartera?.cartera_vencida || 0)}
          </p>
          <div className="flex items-center text-sm">
            <Users className="w-4 h-4 mr-1" />
            <span>{financieras?.cartera?.clientes_con_deuda || 0} clientes</span>
          </div>
        </div>

        {/* Clientes Activos */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
              Total
            </span>
          </div>
          <h3 className="text-sm font-medium mb-2 opacity-90">Clientes Activos</h3>
          <p className="text-3xl font-bold mb-2">
            {estadisticasService.formatNumber(clientes?.resumen?.activos || 0)}
          </p>
          <div className="flex items-center text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>{clientes?.resumen?.nuevos_mes || 0} nuevos este mes</span>
          </div>
        </div>
      </div>

      {/* Distribución de Cartera */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartera por Edades */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 text-[#0e6493] mr-2" />
            Distribución de Cartera
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">1-30 días</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {estadisticasService.formatCurrency(financieras?.cartera?.mora_1_30_dias || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">31-60 días</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {estadisticasService.formatCurrency(financieras?.cartera?.mora_31_60_dias || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-700">Más de 60 días</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {estadisticasService.formatCurrency(financieras?.cartera?.mora_mayor_60_dias || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 text-[#0e6493] mr-2" />
            Métodos de Pago
          </h3>
          <div className="space-y-3">
            {financieras?.pagos?.por_metodo?.map((metodo, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{metodo.metodo_pago || 'N/A'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{metodo.cantidad}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {estadisticasService.formatCurrency(metodo.monto_total || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Operacionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Instalaciones */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span className="text-xs font-medium text-gray-500">Este Mes</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Instalaciones</h3>
          <p className="text-2xl font-bold text-gray-900">
            {operacionales?.instalaciones?.completadas || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            de {operacionales?.instalaciones?.total_instalaciones || 0} total
          </p>
        </div>

        {/* Inventario */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-6 h-6 text-green-600" />
            <span className="text-xs font-medium text-gray-500">Disponible</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Equipos</h3>
          <p className="text-2xl font-bold text-gray-900">
            {operacionales?.inventario?.disponibles || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            de {operacionales?.inventario?.total_equipos || 0} total
          </p>
        </div>

        {/* PQR */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-6 h-6 text-yellow-600" />
            <span className="text-xs font-medium text-gray-500">Abiertas</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">PQR</h3>
          <p className="text-2xl font-bold text-gray-900">
            {operacionales?.pqr?.abiertas || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {estadisticasService.formatPercentage(operacionales?.pqr?.tasa_resolucion || 0)} resueltas
          </p>
        </div>

        {/* Contratos */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-6 h-6 text-purple-600" />
            <span className="text-xs font-medium text-gray-500">Vigentes</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Contratos</h3>
          <p className="text-2xl font-bold text-gray-900">
            {operacionales?.contratos?.activos || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {operacionales?.contratos?.con_permanencia || 0} con permanencia
          </p>
        </div>
      </div>

      {/* Distribución de Clientes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 text-[#0e6493] mr-2" />
          Distribución de Clientes por Estado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{clientes?.resumen?.activos || 0}</p>
            <p className="text-sm text-gray-600">Activos</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{clientes?.resumen?.suspendidos || 0}</p>
            <p className="text-sm text-gray-600">Suspendidos</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{clientes?.resumen?.cortados || 0}</p>
            <p className="text-sm text-gray-600">Cortados</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Minus className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{clientes?.resumen?.retirados || 0}</p>
            <p className="text-sm text-gray-600">Retirados</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{clientes?.resumen?.nuevos_mes || 0}</p>
            <p className="text-sm text-gray-600">Nuevos (mes)</p>
          </div>
        </div>
      </div>

      {/* Top Sectores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sectores por Clientes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Activos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientes?.distribucion?.por_sectores?.slice(0, 5).map((sector, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {sector.codigo} - {sector.sector}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{sector.ciudad}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{sector.total_clientes}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{sector.clientes_activos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasGeneral;