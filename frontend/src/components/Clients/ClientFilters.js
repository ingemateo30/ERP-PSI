import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { CLIENT_STATES, CLIENT_STATE_LABELS } from '../../constants/clientConstants';
import { useConfig } from '../../hooks/useConfig';

const ClientFilters = ({ filters, onApplyFilters, onClearFilters }) => {
  const [localFilters, setLocalFilters] = useState({
    estado: '',
    identificacion: '',
    nombre: '',
    telefono: '',
    sector_id: '',
    ciudad_id: '',
    ...filters
  });

  const { sectors, cities, loading: configLoading } = useConfig();

  // Sincronizar con filtros externos
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      ...filters
    }));
  }, [filters]);

  // Manejar cambio de filtro
  const handleFilterChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    // Filtrar valores vacíos
    const activeFilters = Object.entries(localFilters).reduce((acc, [key, value]) => {
      if (value && value.toString().trim() !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    onApplyFilters(activeFilters);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    const clearedFilters = {
      estado: '',
      identificacion: '',
      nombre: '',
      telefono: '',
      sector_id: '',
      ciudad_id: ''
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  // Contar filtros activos
  const activeFiltersCount = Object.values(localFilters).filter(value => 
    value && value.toString().trim() !== ''
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Filtros de Búsqueda
        </h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
            Limpiar filtros ({activeFiltersCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Filtro por estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={localFilters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {Object.entries(CLIENT_STATE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por identificación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Identificación
          </label>
          <input
            type="text"
            value={localFilters.identificacion}
            onChange={(e) => handleFilterChange('identificacion', e.target.value)}
            placeholder="Buscar por identificación..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={localFilters.nombre}
            onChange={(e) => handleFilterChange('nombre', e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="text"
            value={localFilters.telefono}
            onChange={(e) => handleFilterChange('telefono', e.target.value)}
            placeholder="Buscar por teléfono..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro por sector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sector
          </label>
          <select
            value={localFilters.sector_id}
            onChange={(e) => handleFilterChange('sector_id', e.target.value)}
            disabled={configLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Todos los sectores</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.codigo} - {sector.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad
          </label>
          <select
            value={localFilters.ciudad_id}
            onChange={(e) => handleFilterChange('ciudad_id', e.target.value)}
            disabled={configLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Todas las ciudades</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.nombre} ({city.departamento})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleApplyFilters}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          Aplicar Filtros
        </button>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar Todo
          </button>
        )}
      </div>

      {/* Indicador de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <span className="font-medium">{activeFiltersCount}</span> filtro(s) activo(s):
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || value.toString().trim() === '') return null;
              
              let displayValue = value;
              let displayKey = key;

              // Personalizar display para ciertos campos
              if (key === 'estado') {
                displayValue = CLIENT_STATE_LABELS[value] || value;
                displayKey = 'Estado';
              } else if (key === 'sector_id') {
                const sector = sectors.find(s => s.id.toString() === value.toString());
                displayValue = sector ? `${sector.codigo} - ${sector.nombre}` : value;
                displayKey = 'Sector';
              } else if (key === 'ciudad_id') {
                const city = cities.find(c => c.id.toString() === value.toString());
                displayValue = city ? city.nombre : value;
                displayKey = 'Ciudad';
              } else if (key === 'identificacion') {
                displayKey = 'Identificación';
              } else if (key === 'nombre') {
                displayKey = 'Nombre';
              } else if (key === 'telefono') {
                displayKey = 'Teléfono';
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  <strong>{displayKey}:</strong> {displayValue}
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFilters;