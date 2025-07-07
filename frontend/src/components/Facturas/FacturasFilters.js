// components/Facturas/FacturasFilters.js - Corregido
import React, { useState, useEffect, useCallback } from 'react';
import { useFacturasBusqueda } from '../../hooks/useFacturacionManual';
import { ESTADOS_FACTURA } from '../../hooks/useFacturacionManual';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  User,
  DollarSign,
  FileText,
  MapPin,
  RefreshCw
} from 'lucide-react';

const FacturasFilters = ({ onBuscar, onLimpiar, filtrosIniciales = {}, loading }) => {
  const { buscar, resultados, loading: searchLoading } = useFacturasBusqueda();
  
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    cliente_id: '',
    numero_factura: '',
    ruta: '',
    monto_min: '',
    monto_max: '',
    periodo_facturacion: '',
    vencimiento_desde: '',
    vencimiento_hasta: '',
    ...filtrosIniciales
  });

  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);

  // Actualizar filtros cuando cambien los iniciales
  useEffect(() => {
    setFiltros(prev => ({
      ...prev,
      ...filtrosIniciales
    }));
  }, [filtrosIniciales]);

  // Manejar cambios en los filtros
  const handleFilterChange = useCallback((campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  // Manejar envío de filtros
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    // Filtrar valores vacíos
    const filtrosLimpios = Object.fromEntries(
      Object.entries(filtros).filter(([key, value]) => value !== '' && value !== null && value !== undefined)
    );
    
    console.log('🔍 Aplicando filtros desde FacturasFilters:', filtrosLimpios);
    
    if (onBuscar) {
      onBuscar(filtrosLimpios);
    }
  }, [filtros, onBuscar]);

  // Limpiar filtros
  const handleLimpiar = useCallback(() => {
    const filtrosVacios = {
      search: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      cliente_id: '',
      numero_factura: '',
      ruta: '',
      monto_min: '',
      monto_max: '',
      periodo_facturacion: '',
      vencimiento_desde: '',
      vencimiento_hasta: ''
    };
    
    setFiltros(filtrosVacios);
    setFiltrosAvanzados(false);
    
    if (onLimpiar) {
      onLimpiar();
    }
  }, [onLimpiar]);

  // Búsqueda rápida
  const handleBusquedaRapida = useCallback(() => {
    if (filtros.search.trim()) {
      buscar({ search: filtros.search.trim() });
    }
  }, [filtros.search, buscar]);

  // Estados de factura para el selector
  const estadosFactura = [
    { value: '', label: 'Todos los estados' },
    { value: ESTADOS_FACTURA.PENDIENTE, label: 'Pendiente' },
    { value: ESTADOS_FACTURA.PAGADA, label: 'Pagada' },
    { value: ESTADOS_FACTURA.VENCIDA, label: 'Vencida' },
    { value: ESTADOS_FACTURA.ANULADA, label: 'Anulada' },
    { value: ESTADOS_FACTURA.PARCIAL, label: 'Pago Parcial' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filtros de Búsqueda
        </h3>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setFiltrosAvanzados(!filtrosAvanzados)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filtrosAvanzados
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filtrosAvanzados ? 'Filtros Básicos' : 'Filtros Avanzados'}
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Filtros Básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda General */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Búsqueda General
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buscar por cliente, número de factura..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBusquedaRapida();
                  }
                }}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {estadosFactura.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ruta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ruta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={filtros.ruta}
                onChange={(e) => handleFilterChange('ruta', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Ruta 1, Centro..."
              />
            </div>
          </div>
        </div>

        {/* Filtros de Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fecha Emisión Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emisión Desde
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fecha Emisión Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emisión Hasta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Vencimiento Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimiento Desde
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filtros.vencimiento_desde}
                onChange={(e) => handleFilterChange('vencimiento_desde', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Vencimiento Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimiento Hasta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={filtros.vencimiento_hasta}
                onChange={(e) => handleFilterChange('vencimiento_hasta', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Filtros Avanzados */}
        {filtrosAvanzados && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Filtros Avanzados</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Número de Factura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Factura
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filtros.numero_factura}
                    onChange={(e) => handleFilterChange('numero_factura', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: PSI-2024-001"
                  />
                </div>
              </div>

              {/* Período de Facturación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período de Facturación
                </label>
                <input
                  type="month"
                  value={filtros.periodo_facturacion}
                  onChange={(e) => handleFilterChange('periodo_facturacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Monto Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Mínimo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={filtros.monto_min}
                    onChange={(e) => handleFilterChange('monto_min', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Monto Máximo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Máximo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={filtros.monto_max}
                    onChange={(e) => handleFilterChange('monto_max', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="999999"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {Object.values(filtros).some(v => v !== '') && (
              <span>
                Filtros activos: {Object.values(filtros).filter(v => v !== '').length}
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleLimpiar}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2 inline" />
              Limpiar
            </button>
            
            <button
              type="button"
              onClick={handleBusquedaRapida}
              disabled={!filtros.search.trim() || searchLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Buscando...
                </div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2 inline" />
                  Búsqueda Rápida
                </>
              )}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Aplicando...
                </div>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2 inline" />
                  Aplicar Filtros
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Resultados de búsqueda rápida */}
      {resultados.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Resultados de Búsqueda Rápida ({resultados.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {resultados.slice(0, 5).map((factura) => (
              <div
                key={factura.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  // Aplicar filtro específico para esta factura
                  handleFilterChange('numero_factura', factura.numero_factura);
                  handleSubmit({ preventDefault: () => {} });
                }}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {factura.numero_factura}
                  </p>
                  <p className="text-xs text-gray-600">
                    {factura.nombre_cliente} - {factura.fecha_emision}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${factura.total?.toLocaleString('es-CO') || '0'}
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    factura.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    factura.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                    factura.estado === 'vencida' ? 'bg-red-100 text-red-800' :
                    factura.estado === 'anulada' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {factura.estado}
                  </span>
                </div>
              </div>
            ))}
            {resultados.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                Y {resultados.length - 5} resultados más...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasFilters;