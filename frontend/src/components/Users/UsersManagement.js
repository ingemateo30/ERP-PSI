// frontend/src/components/Users/UsersManagement.js

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, Edit2, Eye, Trash2, Shield,
  Mail, MapPin, AlertCircle, CheckCircle, X, Loader2,
  Download, Upload, MoreHorizontal, UserCheck, UserX,
  Calendar, Settings, Key, ToggleLeft, ToggleRight
} from 'lucide-react';
import MainLayout from '../Layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useApi, useApiList } from '../../hooks/useApi';
import { usersService } from '../../services/apiService';

const UsersManagement = () => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create', 'edit', 'view', 'changePassword'
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    rol: '',
    activo: ''
  });

  const { hasPermission, currentUser } = useAuth();

  const {
    data: users,
    pagination,
    loading,
    error,
    search,
    changePage,
    changeLimit,
    refresh
  } = useApiList(usersService.getAll);

  const {
    data: stats,
    loading: statsLoading,
    execute: fetchStats
  } = useApi(usersService.getStats);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (searchParams) => {
    search({ ...filters, ...searchParams });
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalType('create');
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setModalType('edit');
    setShowModal(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setModalType('view');
    setShowModal(true);
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setModalType('changePassword');
    setShowModal(true);
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      alert('No puedes cambiar tu propio estado');
      return;
    }

    try {
      await usersService.toggleStatus(user.id);
      refresh();
    } catch (error) {
      alert(`Error cambiando estado: ${error.message}`);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta');
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar al usuario "${user.nombre}"?`)) {
      try {
        await usersService.delete(user.id);
        refresh();
      } catch (error) {
        alert(`Error eliminando usuario: ${error.message}`);
      }
    }
  };

  const getRoleColor = (rol) => {
    switch (rol) {
      case 'administrador':
        return 'bg-red-100 text-red-800';
      case 'supervisor':
        return 'bg-yellow-100 text-yellow-800';
      case 'instalador':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (rol) => {
    switch (rol) {
      case 'administrador':
        return 'Administrador';
      case 'supervisor':
        return 'Supervisor';
      case 'instalador':
        return 'Instalador';
      default:
        return rol || 'Usuario';
    }
  };

  return (
    <MainLayout 
      title="Gestión de Usuarios" 
      subtitle="Administra los usuarios del sistema y sus permisos"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Usuarios"
          value={stats?.total_usuarios || 0}
          icon={<Users size={24} className="text-[#0e6493]" />}
          color="#0e6493"
          loading={statsLoading}
        />
        <StatCard
          title="Usuarios Activos"
          value={stats?.usuarios_activos || 0}
          icon={<UserCheck size={24} className="text-green-600" />}
          color="#10b981"
          loading={statsLoading}
        />
        <StatCard
          title="Administradores"
          value={stats?.administradores || 0}
          icon={<Shield size={24} className="text-red-600" />}
          color="#ef4444"
          loading={statsLoading}
        />
        <StatCard
          title="Nuevos (30 días)"
          value={stats?.usuarios_recientes || 0}
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
            <p className="font-medium">Error cargando usuarios</p>
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
                placeholder="Buscar por nombre o email..."
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
                value={filters.rol}
                onChange={(e) => {
                  const newFilters = { ...filters, rol: e.target.value };
                  setFilters(newFilters);
                  handleSearch(newFilters);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="">Todos los roles</option>
                <option value="administrador">Administrador</option>
                <option value="supervisor">Supervisor</option>
                <option value="instalador">Instalador</option>
              </select>

              <select
                value={filters.activo}
                onChange={(e) => {
                  const newFilters = { ...filters, activo: e.target.value };
                  setFilters(newFilters);
                  handleSearch(newFilters);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>

              <button
                onClick={() => {
                  setFilters({ search: '', rol: '', activo: '' });
                  handleSearch({ search: '', rol: '', activo: '' });
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
            {hasPermission('administrador') && (
              <button
                onClick={handleCreateUser}
                className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Nuevo Usuario
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-[#0e6493]" />
              <span className="ml-2">Cargando usuarios...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay usuarios
              </h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.rol || filters.activo
                  ? 'No se encontraron usuarios con los filtros aplicados'
                  : 'Comienza agregando usuarios al sistema'
                }
              </p>
              {hasPermission('administrador') && !filters.search && !filters.rol && !filters.activo && (
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
                >
                  Agregar Primer Usuario
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#0e6493]/10 flex items-center justify-center">
                          <Users size={18} className="text-[#0e6493]" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.telefono || 'Sin teléfono'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.rol)}`}>
                        <Shield size={12} className="inline mr-1" />
                        {getRoleLabel(user.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.ultimo_acceso 
                        ? new Date(user.ultimo_acceso).toLocaleDateString()
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-gray-600 hover:text-[#0e6493] transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        {hasPermission('administrador') && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-gray-600 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`transition-colors ${
                                user.activo 
                                  ? 'text-gray-600 hover:text-red-600' 
                                  : 'text-gray-600 hover:text-green-600'
                              }`}
                              title={user.activo ? 'Desactivar' : 'Activar'}
                              disabled={user.id === currentUser.id}
                            >
                              {user.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button
                              onClick={() => handleChangePassword(user)}
                              className="text-gray-600 hover:text-yellow-600 transition-colors"
                              title="Cambiar contraseña"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="text-gray-600 hover:text-red-600 transition-colors"
                              title="Eliminar"
                              disabled={user.id === currentUser.id}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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
        <UserModal
          type={modalType}
          user={selectedUser}
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

// Componente Modal para Usuario
const UserModal = ({ type, user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    telefono: '',
    rol: 'supervisor',
    activo: true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user && type !== 'create') {
      setFormData({
        email: user.email || '',
        password: '',
        confirmPassword: '',
        nombre: user.nombre || '',
        telefono: user.telefono || '',
        rol: user.rol || 'supervisor',
        activo: Boolean(user.activo)
      });
    }
  }, [user, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      if (type === 'changePassword') {
        if (!formData.password || formData.password !== formData.confirmPassword) {
          setErrors({ password: 'Las contraseñas no coinciden' });
          return;
        }
        await usersService.changePassword(user.id, { newPassword: formData.password });
      } else if (type === 'edit' && user) {
        const updateData = {
          email: formData.email,
          nombre: formData.nombre,
          telefono: formData.telefono,
          rol: formData.rol,
          activo: formData.activo
        };
        await usersService.update(user.id, updateData);
      } else if (type === 'create') {
        if (formData.password !== formData.confirmPassword) {
          setErrors({ password: 'Las contraseñas no coinciden' });
          return;
        }
        await usersService.create({
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          telefono: formData.telefono,
          rol: formData.rol
        });
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
  const isPasswordMode = type === 'changePassword';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'create' ? 'Nuevo Usuario' : 
             type === 'edit' ? 'Editar Usuario' : 
             type === 'changePassword' ? 'Cambiar Contraseña' :
             'Detalles del Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isPasswordMode && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                  )}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
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
                    Rol *
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value }))}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent disabled:bg-gray-100"
                    required
                  >
                    <option value="instalador">Instalador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>

              {type === 'edit' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                    disabled={isReadOnly}
                    className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded"
                  />
                  <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                    Usuario activo
                  </label>
                </div>
              )}
            </>
          )}

          {(type === 'create' || isPasswordMode) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isPasswordMode ? 'Nueva Contraseña *' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  required
                  minLength={8}
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  required
                />
              </div>
            </>
          )}

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
                    {type === 'create' ? 'Crear Usuario' :
                     type === 'changePassword' ? 'Cambiar Contraseña' :
                     'Guardar Cambios'}
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

export default UsersManagement;