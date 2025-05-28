// frontend/src/components/Clients/ClientsManagement.js

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, Edit2, Eye, Trash2, Phone,
  Mail, MapPin, AlertCircle, CheckCircle, X, Loader2,
  Download, Upload, MoreHorizontal, UserCheck, UserX,
  Calendar, DollarSign, Wifi, Settings, ChevronRight
} from 'lucide-react';
import MainLayout from '../Layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiList } from '../../hooks/useApi';
import { clientsService } from '../../services/apiService';

const ClientsManagement = () => {
  const [selectedClients, setSelectedClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'view'
  const [selectedClient, setSelectedClient] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    sector_id: '',
    ciudad_id: ''
  });

  const { hasPermission } = useAuth();

  const {
    data: clients,
    pagination,
    loading,
    error,
    search,
    changePage,
    changeLimit,
    refresh
  } = useApiList(clientsService.getAll);

  const {
    data: stats,
    loading: statsLoading,
    execute: fetchStats
  } = useApi(clientsService.getStats);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (searchParams) => {
    search({ ...filters, ...searchParams });
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setModalType('create');
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setModalType('edit');
    setShowModal(true);
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setModalType('view');
    setShowModal(true);
  };

  const handleDeleteClient = async (client) => {
    if (window.confirm(`¿Estás seguro de eliminar al cliente "${client.nombre}"?`)) {
      try {
        await clientsService.delete(client.id);
        refresh();
      } catch (error) {
        alert(`Error eliminando cliente: ${error.message}`);
      }
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'suspendido':
        return 'bg-yellow-100 text-yellow-800';
      case 'cortado':
        return 'bg-red-100 text-red-800';
      case 'retirado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout 
      title="Gestión de Clientes" 
      subtitle="Administra y gestiona tu base de clientes"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Clientes"
          value={stats?.total_clientes || 0}
          icon={<Users size={24} className="text-[#0e6493]" />}
          color="#0e6493"
          loading={statsLoading}
        />
        <StatCard
          title="Clientes Activos"
          value={stats?.clientes_activos || 0}
          icon={<UserCheck size={24} className="text-green-600" />}
          color="#10b981"
          loading={statsLoading}
        />
        <StatCard
          title="Suspendidos"
          value={stats?.clientes_suspendidos || 0}
          icon={<UserX size={24} className="text-yellow-600" />}
          color="#f59e0b"
          loading={statsLoading}
        />
        <StatCard
          title="Nuevos (30 días)"
          value={stats?.clientes_recientes || 0}
          icon={<Calendar size={24} className="text-purple-600" />}
          color="#8b5cf6"
          loading={statsLoading}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          <div>
            <p className="font-medium">Error cargando clientes</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={refresh}
            className="ml-auto p-1 hover:bg-red-200 rounded"
          >
            <Loader2 size={16} />
          </button>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, identificación o teléfono..."
                value={filters.search}
                onChange={(e) => {
                  const newFilters = { ...filters, search: e.target.value };
                  setFilters(newFilters);
                  handleSearch(newFilters);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filters.estado}
                onChange={(e) => {
                  const newFilters = { ...filters, estado: e.target.value };
                  setFilters(newFilters);
                  handleSearch(newFilters);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cortado">Cortado</option>
                <option value="retirado">Retirado</option>
                <option value="inactivo">Inactivo</option>
              </select>

              <button
                onClick={() => {
                  setFilters({ search: '', estado: '', sector_id: '', ciudad_id: '' });
                  handleSearch({ search: '', estado: '', sector_id: '', ciudad_id: '' });
                }}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => alert('Exportar en desarrollo')}
              className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={16} className="mr-2" />
              Exportar
            </button>
            <button
              onClick={() => alert('Importar en desarrollo')}
              className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload size={16} className="mr-2" />
              Importar
            </button>
            {hasPermission('supervisor') && (
              <button
                onClick={handleCreateClient}
                className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Nuevo Cliente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-[#0e6493]" />
              <span className="ml-2">Cargando clientes...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay clientes
              </h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.estado 
                  ? 'No se encontraron clientes con los filtros aplicados'
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
              {hasPermission('supervisor') && !filters.search && !filters.estado && (
                <button
                  onClick={handleCreateClient}
                  className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                >
                  Agregar Primer Cliente
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#0e6493]/10 flex items-center justify-center">
                          <Users size={18} className="text-[#0e6493]" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.sector_nombre || 'Sin sector'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.identificacion}</div>
                      <div className="text-sm text-gray-500">{client.tipo_documento}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        {client.telefono && (
                          <div className="flex items-center mr-3">
                            <Phone size={14} className="mr-1 text-gray-400" />
                            {client.telefono}
                          </div>
                        )}
                      </div>
                      {client.correo && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail size={14} className="mr-1 text-gray-400" />
                          {client.correo}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.ciudad_nombre || 'Sin ciudad'}</div>
                      <div className="text-sm text-gray-500">{client.direccion}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.estado)}`}>
                        {client.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(client.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewClient(client)}
                          className="text-gray-600 hover:text-[#0e6493] transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        {hasPermission('supervisor') && (
                          <>
                            <button
                              onClick={() => handleEditClient(client)}
                              className="text-gray-600 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client)}
                              className="text-gray-600 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <div className="relative">
                          <button className="text-gray-600 hover:text-gray-800 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => changePage(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => changePage(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{pagination.totalItems}</span>{' '}
                  resultados
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={pagination.itemsPerPage}
                  onChange={(e) => changeLimit(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md text-sm px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="flex space-x-1">
                  <button
                    onClick={() => changePage(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (
                      page === 1 || 
                      page === pagination.totalPages || 
                      (page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => changePage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? 'z-10 bg-[#0e6493] border-[#0e6493] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === pagination.currentPage - 3 || 
                      page === pagination.currentPage + 3
                    ) {
                      return (
                        <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => changePage(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ClientModal
          type={modalType}
          client={selectedClient}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            refresh();
          }}
        />
      )}
    </MainLayout>
  );
};

// Componente StatCard
const StatCard = ({ title, value, icon, color, loading }) => (
  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        {loading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin h-4 w-4" />
            <span className="text-lg">Cargando...</span>
          </div>
        ) : (
          <p className="text-xl md:text-2xl font-bold">{value?.toLocaleString()}</p>
        )}
      </div>
      <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
    </div>
  </div>
);

// Componente Modal para Cliente
const ClientModal = ({ type, client, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    identificacion: '',
    tipo_documento: 'cedula',
    nombre: '',
    direccion: '',
    telefono: '',
    telefono_2: '',
    correo: '',
    barrio: '',
    estrato: '',
    estado: 'activo',
    observaciones: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (client) {
      setFormData({
        identificacion: client.identificacion || '',
        tipo_documento: client.tipo_documento || 'cedula',
        nombre: client.nombre || '',
        direccion: client.direccion || '',
        telefono: client.telefono || '',
        telefono_2: client.telefono_2 || '',
        correo: client.correo || '',
        barrio: client.barrio || '',
        estrato: client.estrato || '',
        estado: client.estado || 'activo',
        observaciones: client.observaciones || ''
      });
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      if (type === 'edit' && client) {
        await clientsService.update(client.id, formData);
      } else if (type === 'create') {
        await clientsService.create(formData);
      }
      onSave();
    } catch (error) {
      if (error.validationErrors) {
        setErrors(error.validationErrors);
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = type === 'view';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'create' ? 'Nuevo Cliente' : 
             type === 'edit' ? 'Editar Cliente' : 
             'Detalles del Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Información Básica
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.tipo_documento}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_documento: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="cedula">Cédula</option>
                    <option value="nit">NIT</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="extranjeria">Extranjería</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Identificación *
                  </label>
                  <input
                    type="text"
                    value={formData.identificacion}
                    onChange={(e) => setFormData(prev => ({ ...prev, identificacion: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                  {errors.identificacion && (
                    <p className="text-red-600 text-sm mt-1">{errors.identificacion}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  required
                />
                {errors.nombre && (
                  <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  required
                />
                {errors.direccion && (
                  <p className="text-red-600 text-sm mt-1">{errors.direccion}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={formData.barrio}
                    onChange={(e) => setFormData(prev => ({ ...prev, barrio: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estrato
                  </label>
                  <select
                    value={formData.estrato}
                    onChange={(e) => setFormData(prev => ({ ...prev, estrato: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Seleccionar</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                Información de Contacto
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono Principal
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono Secundario
                </label>
                <input
                  type="tel"
                  value={formData.telefono_2}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono_2: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData(prev => ({ ...prev, correo: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="cortado">Cortado</option>
                  <option value="retirado">Retirado</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  disabled={isReadOnly}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                  placeholder="Notas adicionales sobre el cliente..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    {type === 'create' ? 'Crear Cliente' : 'Guardar Cambios'}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientsManagement;