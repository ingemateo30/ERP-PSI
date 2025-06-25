// frontend/src/components/Instalaciones/InstalacionesFilters.js

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Clock,
  Filter,
  RotateCcw
} from 'lucide-react';

const InstalacionesFilters = ({ 
  filters, 
  onApplyFilters, 
  onClearFilters, 
  permissions 
}) => {
  // Estados locales para el formulario de filtros
  const [localFilters, setLocalFilters] = useState({
    estado: '',
    tipo_instalacion: '',
    instalador_id: '',
    ciudad_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    vencidas: false,
    busqueda: ''
  });

  // Estados para listas de opciones
  const [instaladores, setInstaladores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Sincronizar filtros externos con estado local
  useEffect(() => {
    setLocalFilters(prevState => ({
      ...prevState,
      ...filters
    }));
  }, [filters]);

  // Cargar opciones al montar el componente
  useEffect(() => {
    cargarOpciones();
  }, []);

  // Cargar instaladores y ciudades
  const cargarOpciones = async () => {
    setLoadingOptions(true);
    try {
     
      setInstaladores([
        { id: 1, nombres: 'Juan', apellidos: 'Pérez' },
        { id: 2, nombres: 'María', apellidos: 'González' },
        { id: 3, nombres: 'Carlos', apellidos: 'Rodríguez' }
      ]);
      
      setCiudades([
        { id: 1, nombre: 'Bogotá' },
        { id: 2, nombre: 'Medellín' },
        { id: 3, nombre: 'Cali' },
        { id: 4, nombre: 'Barranquilla' }
      ]);
    } catch (error) {
      console.error('Error cargando opciones de filtros:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Manejar cambios en los filtros
  const handleFilterChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    // Filtrar valores vacíos
    const filtrosLimpios = Object.entries(localFilters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== false && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    onApplyFilters(filtrosLimpios);
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    const filtrosVacios = {
      estado: '',
      tipo_instalacion: '',
      instalador_id: '',
      ciudad_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      vencidas: false,
      busqueda: ''
    };
    setLocalFilters(filtrosVacios);
    onClearFilters();
  };

  // Verificar si hay filtros activos
  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== '' && value !== false && value !== null && value !== undefined
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filtros de Búsqueda</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Filtro por Estado */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Clock className="w-4 h-4 inline mr-1" />
            Estado
          </label>
          <select
            value={localFilters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
            <option value="reagendada">Reagendada</option>
          </select>
        </div>

        {/* Filtro por Tipo de Instalación */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Instalación
          </label>
          <select
            value={localFilters.tipo_instalacion}
            onChange={(e) => handleFilterChange('tipo_instalacion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Todos los tipos</option>
            <option value="nueva">Nueva Instalación</option>
            <option value="migracion">Migración</option>
            <option value="upgrade">Upgrade</option>
            <option value="reparacion">Reparación</option>
          </select>
        </div>

        {/* Filtro por Instalador */}
        {permissions.canViewAll && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="w-4 h-4 inline mr-1" />
              Instalador
            </label>
            <select
              value={localFilters.instalador_id}
              onChange={(e) => handleFilterChange('instalador_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loadingOptions}
            >
              <option value="">Todos los instaladores</option>
              {instaladores.map(instalador => (
                <option key={instalador.id} value={instalador.id}>
                  {instalador.nombres} {instalador.apellidos}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtro por Ciudad */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 inline mr-1" />
            Ciudad
          </label>
          <select
            value={localFilters.ciudad_id}
            onChange={(e) => handleFilterChange('ciudad_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            disabled={loadingOptions}
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map(ciudad => (
              <option key={ciudad.id} value={ciudad.id}>
                {ciudad.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Fecha Desde */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 inline mr-1" />
            Desde
          </label>
          <input
            type="date"
            value={localFilters.fecha_desde}
            onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro Fecha Hasta */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 inline mr-1" />
            Hasta
          </label>
          <input
            type="date"
            value={localFilters.fecha_hasta}
            onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Checkbox para instalaciones vencidas */}
        <div className="space-y-2 flex items-end">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.vencidas}
              onChange={(e) => handleFilterChange('vencidas', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Solo vencidas
            </span>
          </label>
        </div>

        {/* Campo de búsqueda general */}
        <div className="space-y-2 lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            <Search className="w-4 h-4 inline mr-1" />
            Búsqueda General
          </label>
          <input
            type="text"
            placeholder="Buscar por cliente, dirección, teléfono..."
            value={localFilters.busqueda}
            onChange={(e) => handleFilterChange('busqueda', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Limpiar Filtros
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aplicar Filtros
        </button>
      </div>

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Filtros activos:</strong> {Object.keys(filters).length} filtro(s) aplicado(s)
          </p>
        </div>
      )}
    </div>
  );
};

export default InstalacionesFilters;