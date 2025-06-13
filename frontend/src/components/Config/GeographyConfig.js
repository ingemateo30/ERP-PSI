// frontend/src/components/Config/GeographyConfig.js - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, ToggleLeft, ToggleRight, Search,
  ArrowLeft, Loader2, AlertCircle, CheckCircle, X, Building2,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const GeographyConfig = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [cities, setCities] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Verificar permisos
  useEffect(() => {
    if (!hasPermission('administrador')) {
      navigate('/dashboard');
      return;
    }
  }, [hasPermission, navigate]);

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando datos geográficos...');

      const [deptsResponse, citiesResponse, sectorsResponse] = await Promise.all([
        configService.getDepartments(),
        configService.getCities(),
        configService.getSectors()
      ]);

      console.log('📊 Respuestas:', {
        departments: deptsResponse,
        cities: citiesResponse,
        sectors: sectorsResponse
      });

      setDepartments(deptsResponse.data || []);
      setCities(citiesResponse.data || []);
      setSectors(sectorsResponse.data || []);
    } catch (err) {
      console.error('❌ Error cargando datos geográficos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CORREGIDO: Función para crear elementos
  const handleCreate = (type) => {
    console.log('🆕 Creando nuevo:', type);

    setModalType(type);
    setEditingItem(null);

    // Inicializar datos del formulario según el tipo
    let initialData = {};

    switch (type) {
      case 'department':
        initialData = { codigo: '', nombre: '' };
        break;
      case 'city':
        initialData = { departamento_id: '', codigo: '', nombre: '' };
        break;
      case 'sector':
        initialData = { codigo: '', nombre: '', ciudad_id: '' };
        break;
      default:
        initialData = {};
    }

    console.log('📝 Datos iniciales del formulario:', initialData);
    setFormData(initialData);
    setShowModal(true);
  };

  const handleEdit = (item, type) => {
    console.log('✏️ Editando:', { item, type });

    setModalType(type);
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  // CORREGIDO: Función de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('📤 Enviando formulario:', {
      modalType,
      formData,
      editingItem
    });

    // Validaciones básicas
    if (!formData.codigo || !formData.nombre) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    // Validación específica para ciudades
    if (modalType === 'city' && !formData.departamento_id) {
      alert('Por favor selecciona un departamento');
      return;
    }

    try {
      setSubmitting(true);

      let response;

      switch (modalType) {
        case 'department':
          if (editingItem) {
            response = await configService.updateDepartment(editingItem.id, formData);
            // Actualizar la lista local
            setDepartments(prev => prev.map(dept =>
              dept.id === editingItem.id ? { ...dept, ...formData } : dept
            ));
          } else {
            response = await configService.createDepartment(formData);
            // Agregar a la lista local
            if (response.success && response.data) {
              setDepartments(prev => [response.data, ...prev]);
            }
          }
          break;

        case 'city':
          if (editingItem) {
            response = await configService.updateCity(editingItem.id, formData);
            // Actualizar la lista local
            setCities(prev => prev.map(city =>
              city.id === editingItem.id ? { ...city, ...formData } : city
            ));
          } else {
            console.log('🏙️ Creando nueva ciudad:', formData);
            response = await configService.createCity(formData);
            console.log('📥 Respuesta crear ciudad:', response);

            // Agregar a la lista local
            if (response.success && response.data) {
              setCities(prev => [response.data, ...prev]);
            }
          }
          break;

        case 'sector':
          if (editingItem) {
            response = await configService.updateSector(editingItem.id, formData);
            // Actualizar la lista local
            setSectors(prev => prev.map(sector =>
              sector.id === editingItem.id ? { ...sector, ...formData } : sector
            ));
          } else {
            console.log('🏘️ Creando nuevo sector:', formData);
            response = await configService.createSector(formData);
            console.log('📥 Respuesta crear sector:', response);

            // Agregar a la lista local
            if (response.success && response.data) {
              setSectors(prev => [response.data, ...prev]);
            }
          }
          break;
      }

      if (response && response.success) {
        console.log('✅ Operación exitosa');
        setShowModal(false);
        setFormData({});
        setEditingItem(null);

        // Recargar datos para asegurar sincronización
        await loadAllData();
      } else {
        console.error('❌ Error en la respuesta:', response);
        alert(response?.message || 'Error al guardar');
      }

    } catch (err) {
      console.error('❌ Error guardando:', err);
      alert(err.message || 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSector = async (sector) => {
    try {
      console.log('🔄 Cambiando estado del sector:', sector.id);
      await configService.toggleSector(sector.id);
      setSectors(prev => prev.map(s =>
        s.id === sector.id ? { ...s, activo: !s.activo } : s
      ));
    } catch (err) {
      console.error('❌ Error cambiando estado del sector:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (item, type) => {
    if (!window.confirm(`¿Estás seguro de eliminar este ${type}?`)) {
      return;
    }

    try {
      let response;
      switch (type) {
        case 'department':
          response = await configService.deleteDepartment(item.id);
          if (response.success) {
            setDepartments(prev => prev.filter(d => d.id !== item.id));
          }
          break;
        case 'city':
          response = await configService.deleteCity(item.id);
          if (response.success) {
            setCities(prev => prev.filter(c => c.id !== item.id));
          }
          break;
        case 'sector':
          response = await configService.deleteSector(item.id);
          if (response.success) {
            setSectors(prev => prev.filter(s => s.id !== item.id));
          }
          break;
      }
    } catch (err) {
      console.error('Error eliminando:', err);
      alert(err.message);
    }
  };

  // Filtrar datos según pestañas y búsquedas
  const getFilteredData = () => {
    switch (activeTab) {
      case 'departments':
        return departments.filter(dept =>
          dept.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dept.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );

      case 'cities':
        let filteredCities = cities;
        if (selectedDepartment) {
          filteredCities = filteredCities.filter(city =>
            city.departamento_id == selectedDepartment
          );
        }
        if (searchTerm) {
          filteredCities = filteredCities.filter(city =>
            city.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            city.codigo.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return filteredCities;

      case 'sectors':
        let filteredSectors = sectors;
        if (selectedCity) {
          filteredSectors = filteredSectors.filter(sector =>
            sector.ciudad_id == selectedCity
          );
        }
        if (searchTerm) {
          filteredSectors = filteredSectors.filter(sector =>
            sector.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sector.codigo.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        return filteredSectors;

      default:
        return [];
    }
  };

  // CORREGIDO: Función para obtener el tipo singular
  const getSingularType = (tabName) => {
    switch (tabName) {
      case 'departments':
        return 'department';
      case 'cities':
        return 'city';
      case 'sectors':
        return 'sector';
      default:
        return tabName.slice(0, -1);
    }
  };

  // CORREGIDO: Función para obtener etiquetas en español
  const getSpanishLabel = (type) => {
    switch (type) {
      case 'department':
        return 'Departamento';
      case 'city':
        return 'Ciudad';
      case 'sector':
        return 'Sector';
      default:
        return type;
    }
  };

  const tabs = [
    { id: 'departments', label: 'Departamentos', icon: <Building2 size={16} /> },
    { id: 'cities', label: 'Ciudades', icon: <MapPin size={16} /> },
    { id: 'sectors', label: 'Sectores', icon: <MapPin size={16} /> }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando configuración geográfica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/config')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Gestión Geográfica
                </h1>
                <p className="text-gray-600">
                  Administra departamentos, ciudades y sectores
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCreate(getSingularType(activeTab))}
              className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nuevo {getSpanishLabel(getSingularType(activeTab))}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <div>
              <p className="font-medium">Error cargando datos</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={loadAllData}
              className="ml-auto p-1 hover:bg-red-200 rounded"
            >
              <Loader2 size={16} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex space-x-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                  setSelectedDepartment('');
                  setSelectedCity('');
                }}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                  ? 'bg-[#0e6493] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === 'departments' ? 'departamentos' : activeTab === 'cities' ? 'ciudades' : 'sectores'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>

            {/* Filtro por departamento para ciudades */}
            {activeTab === 'cities' && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="">Todos los departamentos</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* Filtro por ciudad para sectores */}
            {activeTab === 'sectors' && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.nombre} - {city.departamento_nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredData().map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${activeTab === 'sectors'
                ? (item.activo ? 'border-green-500' : 'border-gray-400')
                : 'border-blue-500'
                } hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <MapPin size={20} className="text-[#0e6493]" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{item.nombre}</h3>
                    <p className="text-sm text-gray-500">Código: {item.codigo}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {activeTab === 'sectors' && (
                    <button
                      onClick={() => handleToggleSector(item)}
                      className={`p-1 rounded transition-colors ${item.activo
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      title={item.activo ? 'Desactivar' : 'Activar'}
                    >
                      {item.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(item, getSingularType(activeTab))}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item, getSingularType(activeTab))}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {activeTab === 'departments' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ciudades:</span>
                    <span className="font-medium">{item.total_ciudades || 0}</span>
                  </div>
                )}

                {activeTab === 'cities' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departamento:</span>
                      <span className="font-medium">{item.departamento_nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sectores:</span>
                      <span className="font-medium">{item.total_sectores || 0}</span>
                    </div>
                  </>
                )}

                {activeTab === 'sectors' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ciudad:</span>
                      <span className="font-medium">{item.ciudad_nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Clientes:</span>
                      <span className="font-medium">{item.total_clientes || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {getFilteredData().length === 0 && (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron resultados' : `No hay ${activeTab} configurados`}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Intenta con otros términos de búsqueda'
                : `Comienza agregando tu primer ${getSpanishLabel(getSingularType(activeTab)).toLowerCase()}`
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => handleCreate(getSingularType(activeTab))}
                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                Agregar {getSpanishLabel(getSingularType(activeTab))}
              </button>
            )}
          </div>
        )}
      </div>

      {/* CORREGIDO: Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingItem
                  ? `Editar ${getSpanishLabel(modalType)}`
                  : `Nuevo ${getSpanishLabel(modalType)}`
                }
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo departamento para ciudades */}
              {modalType === 'city' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento *
                  </label>
                  <select
                    value={formData.departamento_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      departamento_id: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona un departamento</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campo ciudad para sectores */}
              {modalType === 'sector' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <select
                    value={formData.ciudad_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ciudad_id: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  >
                    <option value="">Sin ciudad específica</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.nombre} - {city.departamento_nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campo código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    codigo: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder={
                    modalType === 'department' ? '11' :
                      modalType === 'city' ? '11001' :
                        '001'
                  }
                  maxLength={modalType === 'sector' ? 3 : 10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {modalType === 'department' && 'Código DANE del departamento (ej: 11 para Bogotá)'}
                  {modalType === 'city' && 'Código DANE de la ciudad (ej: 11001 para Bogotá)'}
                  {modalType === 'sector' && 'Código interno del sector (máximo 3 caracteres)'}
                </p>
              </div>

              {/* Campo nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    nombre: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder={
                    modalType === 'department' ? 'Cundinamarca' :
                      modalType === 'city' ? 'Bogotá' :
                        'Centro'
                  }
                  maxLength={100}
                  required
                />
              </div>

              {/* Debug info en desarrollo */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 p-2 rounded text-xs">
                  <strong>Debug:</strong>
                  <pre>{JSON.stringify({ modalType, formData }, null, 2)}</pre>
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !formData.codigo?.trim() ||
                    !formData.nombre?.trim() ||
                    (modalType === 'city' && !formData.departamento_id)
                  }
                  className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="mr-2" />
                      {editingItem ? 'Actualizar' : 'Crear'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeographyConfig;