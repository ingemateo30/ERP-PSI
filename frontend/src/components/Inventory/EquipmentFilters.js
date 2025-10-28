// frontend/src/components/Inventory/EquipmentFilters.js

import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';

const EquipmentFilters = ({ filters, onFilterChange, userRole, onExport }) => {
  const [instaladores, setInstaladores] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Constantes locales como fallback
  const EQUIPMENT_TYPES = [
    { value: 'router', label: 'Router' },
    { value: 'decodificador', label: 'Decodificador' },
    { value: 'cable', label: 'Cable' },
    { value: 'antena', label: 'Antena' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'amplificador', label: 'Amplificador' },
    { value: 'otro', label: 'Otro' }
  ];

  const EQUIPMENT_STATES = [
    { value: 'disponible', label: 'Disponible', color: 'green' },
    { value: 'asignado', label: 'Asignado', color: 'blue' },
    { value: 'instalado', label: 'Instalado', color: 'purple' },
    { value: 'dañado', label: 'Dañado', color: 'red' },
    { value: 'perdido', label: 'Perdido', color: 'gray' },
    { value: 'mantenimiento', label: 'Mantenimiento', color: 'yellow' },
    { value: 'devuelto', label: 'Devuelto', color: 'indigo' }
  ];

  // Obtener tipos y estados del servicio con fallback
  const getEquipmentTypes = () => {
    try {
      return inventoryService.EQUIPMENT_TYPES || EQUIPMENT_TYPES;
    } catch (error) {
      console.warn('Error accediendo a EQUIPMENT_TYPES:', error);
      return EQUIPMENT_TYPES;
    }
  };

  const getEquipmentStates = () => {
    try {
      return inventoryService.EQUIPMENT_STATES || EQUIPMENT_STATES;
    } catch (error) {
      console.warn('Error accediendo a EQUIPMENT_STATES:', error);
      return EQUIPMENT_STATES;
    }
  };

  // Cargar instaladores
  useEffect(() => {
    if (userRole !== 'instalador') {
      loadInstaladores();
    }
  }, [userRole]);

  const loadInstaladores = async () => {
    try {
      console.log('🔄 Cargando instaladores...');
      const response = await inventoryService.getActiveInstallers();
      console.log('📥 Respuesta de instaladores:', response);

      // ✅ MANEJO ROBUSTO DE LA RESPUESTA
      let instaladoresList = [];

      if (response) {
        if (response.success && response.message) {
          instaladoresList = response.message;
        } else if (response.data) {
          instaladoresList = response.data;
        } else if (Array.isArray(response)) {
          instaladoresList = response;
        } else if (response.message && Array.isArray(response.message)) {
          instaladoresList = response.message;
        }
      }

      // ✅ VERIFICACIÓN ADICIONAL: Asegurar que tienen el campo nombre
      instaladoresList = instaladoresList.map(instalador => ({
        ...instalador,
        nombre: instalador.nombre || `${instalador.nombres || ''} ${instalador.apellidos || ''}`.trim()
      }));

      console.log(`✅ ${instaladoresList.length} instaladores cargados:`, instaladoresList);
      setInstaladores(instaladoresList);

    } catch (error) {
      console.error('❌ Error cargando instaladores:', error);
      console.error('❌ Detalles del error:', error.response?.data || error.message);
      setInstaladores([]);
    }
  };

  // Manejar cambios en filtros
  const handleFilterChange = (field, value) => {
    onFilterChange({
      [field]: value
    });
  };

  // Limpiar filtros
  const clearFilters = () => {
    onFilterChange({
      search: '',
      tipo: '',
      estado: '',
      instalador_id: ''
    });
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = filters.search || filters.tipo || filters.estado || filters.instalador_id;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Filtros básicos */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Búsqueda */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por código, nombre, marca..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {filters.search && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tipo */}
          <div className="w-full sm:w-48">
            <select
              value={filters.tipo}
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              {getEquipmentTypes().map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="w-full sm:w-48">
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los estados</option>
              {getEquipmentStates().map(state => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center space-x-2">
          {/* Botón de filtros avanzados */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${showAdvanced
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
            </svg>
            Filtros
          </button>

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpiar
            </button>
          )}

          {/* Exportar (solo para supervisores y administradores) */}
          {userRole !== 'instalador' && (
            <button
               onClick={onExport}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              title="Exportar datos"
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Instalador */}
            {userRole !== 'instalador' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instalador
                </label>
                <select
                  value={filters.instalador_id}
                  onChange={(e) => handleFilterChange('instalador_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los instaladores</option>
                  {instaladores.map(instalador => (
                    <option key={instalador.id} value={instalador.id}>
                      {instalador.nombre} ({instalador.equipos_asignados} equipos)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtros rápidos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtros rápidos
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => handleFilterChange('estado', 'disponible')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${filters.estado === 'disponible'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  📦 Solo disponibles
                </button>
                <button
                  onClick={() => handleFilterChange('estado', 'asignado')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${filters.estado === 'asignado'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  👤 Solo asignados
                </button>
                <button
                  onClick={() => handleFilterChange('estado', 'dañado')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${filters.estado === 'dañado'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  🔧 Solo dañados
                </button>
              </div>
            </div>

            {/* Resumen de filtros */}
            {hasActiveFilters && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtros activos
                </label>
                <div className="space-y-1">
                  {filters.search && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Búsqueda: "{filters.search}"
                      <button
                        onClick={() => handleFilterChange('search', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {filters.tipo && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1">
                      Tipo: {getEquipmentTypes().find(t => t.value === filters.tipo)?.label}
                      <button
                        onClick={() => handleFilterChange('tipo', '')}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {filters.estado && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">
                      Estado: {getEquipmentStates().find(s => s.value === filters.estado)?.label}
                      <button
                        onClick={() => handleFilterChange('estado', '')}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {filters.instalador_id && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-1">
                      Instalador: {instaladores.find(i => i.id == filters.instalador_id)?.nombre}
                      <button
                        onClick={() => handleFilterChange('instalador_id', '')}
                        className="ml-1 text-yellow-600 hover:text-yellow-800"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentFilters;