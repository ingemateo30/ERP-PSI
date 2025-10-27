// frontend/src/components/Config/ConceptosConfig.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search,
  ArrowLeft, Loader2, AlertCircle, CheckCircle, X, DollarSign,
  Calculator, Tag, TrendingUp, Package, Tv, Wifi
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import configService from '../../services/configService';

const ConceptosConfig = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Estados principales
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total_conceptos: 0,
    conceptos_activos: 0,
    conceptos_inactivos: 0,
    tipos: 0
});
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  
  // Estados para modal
  const [showModal, setShowModal] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    valor_base: '',
    aplica_iva: true,
    porcentaje_iva: '',
    descripcion: '',
    tipo: 'internet',
    activo: true
  });

  // Verificar permisos
  useEffect(() => {
    if (!hasPermission('administrador')) {
      navigate('/dashboard');
      return;
    }
  }, [hasPermission, navigate]);

  // Cargar datos iniciales
  useEffect(() => {
    loadConceptos();
    loadStats();
  }, []);

  const loadConceptos = async () => {
    console.log('🔄 Iniciando carga de conceptos...');
    setLoading(true);
    setError(null);
    
    try {
      const response = await configService.getConceptos();
      
      console.log('📡 Respuesta completa de la API:', response);
      
      let conceptosData = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        conceptosData = response.data;
        console.log('✅ Usando response.data como array');
      } else if (response && Array.isArray(response.message)) {
        conceptosData = response.message;
        console.log('✅ Usando response.message como array');
      } else if (Array.isArray(response)) {
        conceptosData = response;
        console.log('✅ Usando response directamente como array');
      } else {
        console.error('❌ Estructura de datos inesperada:', response);
        setError('Estructura de respuesta no reconocida del servidor');
        conceptosData = [];
      }
      
      // Procesar datos correctamente
      const processedConceptos = conceptosData.map(concepto => ({
        ...concepto,
        valor_base: parseFloat(concepto.valor_base) || 0,
        porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
        aplica_iva: Boolean(concepto.aplica_iva),
        activo: Boolean(concepto.activo),
        uso_facturas: concepto.uso_facturas || 0
      }));
      
      setConceptos(processedConceptos);
      console.log('✅ Conceptos cargados correctamente:', processedConceptos.length);
      
    } catch (err) {
      console.error('❌ Error cargando conceptos:', err);
      setError(err.message || 'Error desconocido al cargar conceptos');
      setConceptos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await configService.getConceptosStats();
      if (response && response.success && response.data) {
        const { general, por_tipo } = response.data;
        setStats({
          total_conceptos: general.total_general || 0,
          conceptos_activos: general.activos_general || 0,
          conceptos_inactivos: general.inactivos_general || 0,
          tipos: por_tipo ? por_tipo.length : 0
        });
      }
    } catch (err) {
      console.warn('⚠️ Error cargando estadísticas:', err);
    }
};

  // Filtrar conceptos
  const filteredConceptos = useMemo(() => {
    if (!Array.isArray(conceptos)) {
      return [];
    }

    return conceptos.filter(concepto => {
      const matchesSearch = !searchTerm || 
        (concepto.nombre && concepto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (concepto.codigo && concepto.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (concepto.descripcion && concepto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = !filterType || concepto.tipo === filterType;
      const matchesActivo = filterActivo === '' || concepto.activo.toString() === filterActivo;
      
      return matchesSearch && matchesType && matchesActivo;
    });
  }, [conceptos, searchTerm, filterType, filterActivo]);

  // Funciones auxiliares para UI
  const getTypeColor = (tipo) => {
    switch (tipo) {
      case 'internet':
        return 'border-blue-500 bg-blue-50';
      case 'television':
        return 'border-purple-500 bg-purple-50';
      case 'reconexion':
        return 'border-orange-500 bg-orange-50';
      case 'interes':
        return 'border-red-500 bg-red-50';
      case 'descuento':
        return 'border-green-500 bg-green-50';
      case 'varios':
        return 'border-gray-500 bg-gray-50';
      case 'publicidad':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'internet':
        return <Wifi size={20} className="text-blue-600" />;
      case 'television':
        return <Tv size={20} className="text-purple-600" />;
      case 'reconexion':
        return <Package size={20} className="text-orange-600" />;
      case 'interes':
        return <TrendingUp size={20} className="text-red-600" />;
      case 'descuento':
        return <Tag size={20} className="text-green-600" />;
      case 'varios':
        return <FileText size={20} className="text-gray-600" />;
      case 'publicidad':
        return <DollarSign size={20} className="text-yellow-600" />;
      default:
        return <FileText size={20} className="text-gray-600" />;
    }
  };

  const getTypeLabel = (tipo) => {
    switch (tipo) {
      case 'internet':
        return 'Internet';
      case 'television':
        return 'Televisión';
      case 'reconexion':
        return 'Reconexión';
      case 'interes':
        return 'Intereses';
      case 'descuento':
        return 'Descuentos';
      case 'varios':
        return 'Varios';
      case 'publicidad':
        return 'Publicidad';
      default:
        return tipo;
    }
  };

  // Handlers para acciones
  const handleCreate = () => {
    setEditingConcepto(null);
    setFormData({
      codigo: '',
      nombre: '',
      valor_base: '',
      aplica_iva: true,
      porcentaje_iva: '',
      descripcion: '',
      tipo: 'internet',
      activo: true
    });
    setShowModal(true);
  };

  const handleEdit = (concepto) => {
    setEditingConcepto(concepto);
    setFormData({
      codigo: concepto.codigo || '',
      nombre: concepto.nombre || '',
      valor_base: concepto.valor_base?.toString() || '',
      aplica_iva: Boolean(concepto.aplica_iva),
      porcentaje_iva: concepto.porcentaje_iva?.toString() || '',
      descripcion: concepto.descripcion || '',
      tipo: concepto.tipo || 'internet',
      activo: Boolean(concepto.activo)
    });
    setShowModal(true);
  };

  const handleDelete = async (concepto) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el concepto "${concepto.nombre}"?`)) {
      return;
    }

    try {
      await configService.deleteConcepto(concepto.id);
      await loadConceptos();
      await loadStats();
    } catch (err) {
      console.error('Error eliminando concepto:', err);
      setError(err.message);
    }
  };

  const handleToggleStatus = async (concepto) => {
    try {
      await configService.toggleConcepto(concepto.id);
      await loadConceptos();
      await loadStats();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const conceptoData = {
        codigo: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        valor_base: formData.valor_base ? parseFloat(formData.valor_base) : 0,
        aplica_iva: formData.aplica_iva,
        porcentaje_iva: formData.porcentaje_iva ? parseFloat(formData.porcentaje_iva) : 0,
        descripcion: formData.descripcion.trim() || null,
        tipo: formData.tipo,
        activo: formData.activo
      };

      if (editingConcepto) {
        await configService.updateConcepto(editingConcepto.id, conceptoData);
      } else {
        await configService.createConcepto(conceptoData);
      }

      setShowModal(false);
      await loadConceptos();
      await loadStats();
    } catch (err) {
      console.error('Error guardando concepto:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando conceptos de facturación...</p>
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
                  Conceptos de Facturación
                </h1>
                <p className="text-gray-600">
                  Administra los conceptos que se pueden facturar
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {conceptos.length} conceptos cargados, {filteredConceptos.length} filtrados
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Nuevo Concepto
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Conceptos</p>
                  <p className="text-xl font-bold">{stats.total_conceptos}</p>
                </div>
                <FileText size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Activos</p>
                  <p className="text-xl font-bold">{stats.conceptos_activos}</p>
                </div>
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactivos</p>
                  <p className="text-xl font-bold">{stats.conceptos_inactivos}</p>
                </div>
                <X size={24} className="text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tipos</p>
                  <p className="text-xl font-bold">{stats.por_tipo?.length || 0}</p>
                </div>
                <Calculator size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <div>
              <p className="font-medium">Error cargando conceptos</p>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              onClick={loadConceptos}
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
                placeholder="Buscar conceptos por nombre, código o descripción..."
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
              <option value="reconexion">Reconexión</option>
              <option value="interes">Intereses</option>
              <option value="descuento">Descuentos</option>
              <option value="varios">Varios</option>
              <option value="publicidad">Publicidad</option>
            </select>
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Conceptos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConceptos.map((concepto) => (
            <div
              key={concepto.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                concepto.activo 
                  ? `${getTypeColor(concepto.tipo)} hover:shadow-lg` 
                  : 'border-gray-400 opacity-75'
              } transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    concepto.activo ? getTypeColor(concepto.tipo).split(' ')[1] : 'bg-gray-100'
                  }`}>
                    {getTypeIcon(concepto.tipo)}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{concepto.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {concepto.codigo} • {getTypeLabel(concepto.tipo)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleToggleStatus(concepto)}
                    className={`p-1 rounded transition-colors ${
                      concepto.activo 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={concepto.activo ? 'Desactivar' : 'Activar'}
                  >
                    {concepto.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleEdit(concepto)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(concepto)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Valor base destacado */}
              {concepto.valor_base > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-[#0e6493]">
                      ${concepto.valor_base.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600 ml-1">
                      {concepto.aplica_iva ? `+ ${concepto.porcentaje_iva}% IVA` : 'Sin IVA'}
                    </span>
                  </div>
                </div>
              )}

              {/* Detalles del concepto */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    concepto.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {concepto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Aplica IVA:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    concepto.aplica_iva 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {concepto.aplica_iva ? `${concepto.porcentaje_iva}%` : 'No'}
                  </span>
                </div>

                {concepto.uso_facturas !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uso en facturas:</span>
                    <span className="font-medium">{concepto.uso_facturas}</span>
                  </div>
                )}

                {concepto.descripcion && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-600 text-xs">{concepto.descripcion}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredConceptos.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterType || filterActivo ? 'No se encontraron conceptos' : 'No hay conceptos configurados'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType || filterActivo
                ? 'Intenta con otros términos de búsqueda o filtros'
                : 'Comienza agregando tu primer concepto de facturación'
              }
            </p>
            {!searchTerm && !filterType && !filterActivo && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
              >
                Agregar Concepto
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ConceptoModal
          concepto={editingConcepto}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
};

// Componente Modal para Concepto
const ConceptoModal = ({ concepto, formData, setFormData, onSubmit, onClose, submitting }) => {
  const isEditing = Boolean(concepto);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar Concepto' : 'Nuevo Concepto de Facturación'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código *
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="INT, TV, REC, etc."
                maxLength={10}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Código único para identificar el concepto
              </p>
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
                <option value="reconexion">Reconexión</option>
                <option value="interes">Intereses por Mora</option>
                <option value="descuento">Descuentos</option>
                <option value="varios">Varios</option>
                <option value="publicidad">Publicidad</option>
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
              placeholder="Nombre descriptivo del concepto"
              maxLength={100}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Base (COP)
              </label>
              <input
                type="number"
                value={formData.valor_base}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_base: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor base del concepto (opcional)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje IVA (%)
              </label>
              <input
                type="number"
                value={formData.porcentaje_iva}
                onChange={(e) => setFormData(prev => ({ ...prev, porcentaje_iva: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="19.00"
                min="0"
                max="100"
                step="0.01"
                disabled={!formData.aplica_iva}
              />
              <p className="text-xs text-gray-500 mt-1">
                Porcentaje de IVA aplicable
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplica_iva"
                checked={formData.aplica_iva}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  aplica_iva: e.target.checked,
                  porcentaje_iva: e.target.checked ? prev.porcentaje_iva : ''
                }))}
                className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded"
              />
              <label htmlFor="aplica_iva" className="ml-2 block text-sm text-gray-900">
                Aplica IVA
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="h-4 w-4 text-[#0e6493] focus:ring-[#0e6493] border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                Concepto activo
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              placeholder="Descripción opcional del concepto..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.descripcion.length}/500 caracteres
            </p>
          </div>

          {/* Vista previa del cálculo */}
          {formData.valor_base && parseFloat(formData.valor_base) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Vista Previa del Cálculo</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Valor Base:</span>
                  <span className="font-medium">${parseFloat(formData.valor_base || 0).toLocaleString()}</span>
                </div>
                {formData.aplica_iva && formData.porcentaje_iva && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-blue-700">IVA ({formData.porcentaje_iva}%):</span>
                      <span className="font-medium">
                        ${((parseFloat(formData.valor_base || 0) * parseFloat(formData.porcentaje_iva || 0)) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-300 pt-1">
                      <span className="text-blue-900 font-medium">Total:</span>
                      <span className="font-bold">
                        ${(parseFloat(formData.valor_base || 0) + ((parseFloat(formData.valor_base || 0) * parseFloat(formData.porcentaje_iva || 0)) / 100)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.codigo.trim() || !formData.nombre.trim()}
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
                  {isEditing ? 'Actualizar Concepto' : 'Crear Concepto'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConceptosConfig;