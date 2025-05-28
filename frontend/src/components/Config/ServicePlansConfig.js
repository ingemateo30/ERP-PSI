// frontend/src/components/Config/ServicePlansConfig.js

import React, { useState, useEffect } from 'react';
import {
  Wifi, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search,
  ArrowLeft, Loader2, AlertCircle, CheckCircle, X, Tv, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const ServicePlansConfig = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'internet',
    precio: '',
    velocidad_subida: '',
    velocidad_bajada: '',
    canales_tv: '',
    descripcion: '',
    aplica_iva: true
  });
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

  // Cargar planes
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await configService.getServicePlans();
      setPlans(response.data || []);
    } catch (err) {
      console.error('Error cargando planes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'internet',
      precio: '',
      velocidad_subida: '',
      velocidad_bajada: '',
      canales_tv: '',
      descripcion: '',
      aplica_iva: true
    });
  };

  const handleCreate = () => {
    setEditingPlan(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      codigo: plan.codigo,
      nombre: plan.nombre,
      tipo: plan.tipo,
      precio: plan.precio.toString(),
      velocidad_subida: plan.velocidad_subida?.toString() || '',
      velocidad_bajada: plan.velocidad_bajada?.toString() || '',
      canales_tv: plan.canales_tv?.toString() || '',
      descripcion: plan.descripcion || '',
      aplica_iva: Boolean(plan.aplica_iva)
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo.trim() || !formData.nombre.trim() || !formData.precio) {
      return;
    }

    try {
      setSubmitting(true);
      
      const submitData = {
        codigo: formData.codigo.trim(),
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        precio: parseFloat(formData.precio),
        velocidad_subida: formData.velocidad_subida ? parseInt(formData.velocidad_subida) : null,
        velocidad_bajada: formData.velocidad_bajada ? parseInt(formData.velocidad_bajada) : null,
        canales_tv: formData.canales_tv ? parseInt(formData.canales_tv) : null,
        descripcion: formData.descripcion.trim() || null,
        aplica_iva: formData.aplica_iva
      };
      
      if (editingPlan) {
        await configService.updateServicePlan(editingPlan.id, submitData);
        setPlans(prev => prev.map(plan => 
          plan.id === editingPlan.id 
            ? { ...plan, ...submitData }
            : plan
        ));
      } else {
        const response = await configService.createServicePlan(submitData);
        setPlans(prev => [response.data, ...prev]);
      }
      
      setShowModal(false);
      resetForm();
      setEditingPlan(null);
      
    } catch (err) {
      console.error('Error guardando plan:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      await configService.toggleServicePlan(plan.id);
      setPlans(prev => prev.map(p => 
        p.id === plan.id 
          ? { ...p, activo: !p.activo }
          : p
      ));
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`¿Estás seguro de eliminar el plan "${plan.nombre}"?`)) {
      return;
    }

    try {
      await configService.deleteServicePlan(plan.id);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch (err) {
      console.error('Error eliminando plan:', err);
      alert(err.message);
    }
  };

  // Filtrar planes
  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || plan.tipo === filterType;
    return matchesSearch && matchesType;
  });

  // Obtener icono según tipo
  const getTypeIcon = (type) => {
    switch (type) {
      case 'internet':
        return <Wifi size={20} className="text-blue-600" />;
      case 'television':
        return <Tv size={20} className="text-purple-600" />;
      case 'combo':
        return <Package size={20} className="text-green-600" />;
      default:
        return <Wifi size={20} className="text-gray-600" />;
    }
  };

  // Obtener color según tipo
  const getTypeColor = (type) => {
    switch (type) {
      case 'internet':
        return 'border-blue-500 bg-blue-50';
      case 'television':
        return 'border-purple-500 bg-purple-50';
      case 'combo':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando planes de servicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
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
                  Planes de Servicio
                </h1>
                <p className="text-gray-600">
                  Administra los planes de internet, TV y combos
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nuevo Plan
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <div>
              <p className="font-medium">Error cargando planes</p>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={loadPlans}
              className="ml-auto p-1 hover:bg-red-200 rounded"
            >
              <Loader2 size={16} />
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar planes por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="internet">Internet</option>
              <option value="television">Televisión</option>
              <option value="combo">Combo</option>
            </select>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                plan.activo 
                  ? `${getTypeColor(plan.tipo)} hover:shadow-lg` 
                  : 'border-gray-400 opacity-75'
              } transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    plan.activo ? getTypeColor(plan.tipo).split(' ')[1] : 'bg-gray-100'
                  }`}>
                    {getTypeIcon(plan.tipo)}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{plan.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {plan.codigo} • {plan.tipo.charAt(0).toUpperCase() + plan.tipo.slice(1)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`p-1 rounded transition-colors ${
                      plan.activo 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={plan.activo ? 'Desactivar' : 'Activar'}
                  >
                    {plan.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Precio destacado */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <span className="text-2xl font-bold text-[#0e6493]">
                    ${plan.precio.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    {plan.aplica_iva ? '+ IVA' : 'Sin IVA'}
                  </span>
                </div>
              </div>

              {/* Detalles del plan */}
              <div className="space-y-2 text-sm">
                {plan.tipo === 'internet' || plan.tipo === 'combo' ? (
                  <>
                    {plan.velocidad_bajada && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Descarga:</span>
                        <span className="font-medium">{plan.velocidad_bajada} Mbps</span>
                      </div>
                    )}
                    {plan.velocidad_subida && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subida:</span>
                        <span className="font-medium">{plan.velocidad_subida} Mbps</span>
                      </div>
                    )}
                  </>
                ) : null}

                {(plan.tipo === 'television' || plan.tipo === 'combo') && plan.canales_tv && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Canales:</span>
                    <span className="font-medium">{plan.canales_tv}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    plan.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Clientes:</span>
                  <span className="font-medium">{plan.clientes_suscritos || 0}</span>
                </div>

                {plan.descripcion && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-600 text-xs">{plan.descripcion}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPlans.length === 0 && !loading && (
          <div className="text-center py-12">
            <Wifi size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType ? 'No se encontraron planes' : 'No hay planes configurados'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType
                ? 'Intenta con otros términos de búsqueda o filtros'
                : 'Comienza agregando tu primer plan de servicio'
              }
            </p>
            {!searchTerm && !filterType && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                Agregar Plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPlan ? 'Editar Plan' : 'Nuevo Plan de Servicio'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="INT30"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    required
                  >
                    <option value="internet">Internet</option>
                    <option value="television">Televisión</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Internet 30MB"
                  maxLength={255}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio (COP) *
                  </label>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="65000"
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="aplica_iva"
                    checked={formData.aplica_iva}
                    onChange={(e) => setFormData(prev => ({ ...prev, aplica_iva: e.target.checked }))}
                    className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded"
                  />
                  <label htmlFor="aplica_iva" className="ml-2 block text-sm text-gray-900">
                    Aplica IVA
                  </label>
                </div>
              </div>

              {/* Campos específicos para internet/combo */}
              {(formData.tipo === 'internet' || formData.tipo === 'combo') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Velocidad Bajada (Mbps)
                    </label>
                    <input
                      type="number"
                      value={formData.velocidad_bajada}
                      onChange={(e) => setFormData(prev => ({ ...prev, velocidad_bajada: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="30"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Velocidad Subida (Mbps)
                    </label>
                    <input
                      type="number"
                      value={formData.velocidad_subida}
                      onChange={(e) => setFormData(prev => ({ ...prev, velocidad_subida: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                      placeholder="5"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {/* Campo específico para TV/combo */}
              {(formData.tipo === 'television' || formData.tipo === 'combo') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Canales
                  </label>
                  <input
                    type="number"
                    value={formData.canales_tv}
                    onChange={(e) => setFormData(prev => ({ ...prev, canales_tv: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                    placeholder="120"
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Descripción opcional del plan..."
                />
              </div>

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
                  disabled={submitting || !formData.codigo.trim() || !formData.nombre.trim() || !formData.precio}
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
                      {editingPlan ? 'Actualizar' : 'Crear Plan'}
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

export default ServicePlansConfig;