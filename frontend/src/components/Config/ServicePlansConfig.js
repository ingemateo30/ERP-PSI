//VERSIÓN CORREGIDA basada en la estructura REAL de la base de datos

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Copy, ToggleLeft, ToggleRight,
  Wifi, Tv, Package, Users, DollarSign, Calendar, Settings,
  CheckCircle, XCircle, AlertCircle, Eye, Star, TrendingUp,
  Upload, Download, RefreshCw, Tag, Shield, Clock, Percent
} from 'lucide-react';
import configService from '../../services/configService';
import confirmAlert from 'react-confirm-alert';

const ServicePlansConfig = () => {
  // Estados principales
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSegmento, setFilterSegmento] = useState('');
  const [filterActivo, setFilterActivo] = useState('1');
  const [showPromocionales, setShowPromocionales] = useState(true);
  const [orderBy, setOrderBy] = useState('orden_visualizacion');

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Estado del formulario - BASADO EN LA ESTRUCTURA REAL DE LA BD
  const [formData, setFormData] = useState({
    // Campos básicos obligatorios
    codigo: '',
    nombre: '',
    tipo: 'internet',
    precio: '',

    // Campos técnicos
    velocidad_subida: '',
    velocidad_bajada: '',
    canales_tv: '',
    descripcion: '',

    // Campos de configuración
    aplica_iva: true,
    activo: true,

    // Campos de precios específicos
    precio_internet: '',
    precio_television: '',
    precio_instalacion: '42016',
    requiere_instalacion: true,

    // Campos de segmentación
    segmento: 'residencial',
    tecnologia: 'Fibra Óptica',
    permanencia_meses: '0',
    descuento_combo: '0',

    // Campos JSON y configuración avanzada
    conceptos_incluidos: '',
    orden_visualizacion: '0',

    // Campos promocionales
    promocional: false,
    fecha_inicio_promocion: '',
    fecha_fin_promocion: '',

    // CAMPOS NUEVOS REALES DE LA BD
    aplica_iva_estrato_123: false,
    aplica_iva_estrato_456: true,
    precio_internet_sin_iva: '',
    precio_television_sin_iva: '',
    precio_internet_con_iva: '',
    precio_television_con_iva: '',
    costo_instalacion_permanencia: '50000',
    costo_instalacion_sin_permanencia: '150000',
    permanencia_minima_meses: '6',
    aplica_permanencia: true
  });

  // Cargar datos al inicializar
  useEffect(() => {
    cargarPlanes();
    cargarEstadisticas();
  }, [filterTipo, filterSegmento, filterActivo, showPromocionales, orderBy]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarPlanes = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Cargando planes de servicio...');

      const params = {};
      if (filterTipo) params.tipo = filterTipo;
      if (filterSegmento) params.segmento = filterSegmento;
      if (filterActivo) params.activo = filterActivo;
      params.incluir_promocionales = showPromocionales;
      params.orden = orderBy;

      const response = await configService.getServicePlans(params);

      // MANEJO ROBUSTO DE DIFERENTES ESTRUCTURAS DE RESPUESTA
      let planesData = [];

      if (response?.success && Array.isArray(response?.data)) {
        planesData = response.data;
      } else if (Array.isArray(response?.data)) {
        planesData = response.data;
      } else if (Array.isArray(response)) {
        planesData = response;
      } else if (response?.planes && Array.isArray(response.planes)) {
        planesData = response.planes;
      } else {
        console.error('Estructura de datos no válida:', response);
        planesData = [];
      }

      // PROCESAR LOS DATOS PARA ASEGURAR TIPOS CORRECTOS
      const planesFormateados = planesData.map(plan => ({
        ...plan,
        // Asegurar que los números sean números
        precio: parseFloat(plan.precio) || 0,
        precio_internet: parseFloat(plan.precio_internet) || 0,
        precio_television: parseFloat(plan.precio_television) || 0,
        velocidad_bajada: parseInt(plan.velocidad_bajada) || 0,
        velocidad_subida: parseInt(plan.velocidad_subida) || 0,
        canales_tv: parseInt(plan.canales_tv) || 0,
        permanencia_meses: parseInt(plan.permanencia_meses) || 0,
        descuento_combo: parseFloat(plan.descuento_combo) || 0,
        precio_instalacion: parseFloat(plan.precio_instalacion) || 0,
        orden_visualizacion: parseInt(plan.orden_visualizacion) || 0,

        // Campos nuevos numéricos
        precio_internet_sin_iva: parseFloat(plan.precio_internet_sin_iva) || 0,
        precio_television_sin_iva: parseFloat(plan.precio_television_sin_iva) || 0,
        precio_internet_con_iva: parseFloat(plan.precio_internet_con_iva) || 0,
        precio_television_con_iva: parseFloat(plan.precio_television_con_iva) || 0,
        costo_instalacion_permanencia: parseFloat(plan.costo_instalacion_permanencia) || 0,
        costo_instalacion_sin_permanencia: parseFloat(plan.costo_instalacion_sin_permanencia) || 0,
        permanencia_minima_meses: parseInt(plan.permanencia_minima_meses) || 0,

        // Asegurar que los booleans sean booleans
        activo: Boolean(plan.activo),
        aplica_iva: Boolean(plan.aplica_iva),
        requiere_instalacion: Boolean(plan.requiere_instalacion),
        promocional: Boolean(plan.promocional),
        aplica_iva_estrato_123: Boolean(plan.aplica_iva_estrato_123),
        aplica_iva_estrato_456: Boolean(plan.aplica_iva_estrato_456),
        aplica_permanencia: Boolean(plan.aplica_permanencia),

        // Parsear JSON si es necesario
        conceptos_incluidos: typeof plan.conceptos_incluidos === 'string'
          ? JSON.parse(plan.conceptos_incluidos || '{}')
          : plan.conceptos_incluidos || {}
      }));

      setPlanes(planesFormateados);
      console.log(`✅ ${planesFormateados.length} planes cargados exitosamente`);

    } catch (error) {
      console.error('❌ Error cargando planes:', error);
      setError('Error al cargar los planes de servicio: ' + error.message);
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await configService.getServicePlanStats();
      setStats(response?.data?.data || response?.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // ==========================================
  // FUNCIONES DE MANEJO DE FORMULARIO
  // ==========================================

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calcular precios para combos
    if (field === 'tipo' && value === 'combo') {
      const precio = parseFloat(formData.precio) || 0;
      if (precio > 0) {
        setFormData(prev => ({
          ...prev,
          precio_internet: Math.round(precio * 0.65),
          precio_television: Math.round(precio * 0.35),
          descuento_combo: '15'
        }));
      }
    }

    // Auto-calcular precios individuales
    if (field === 'precio' && formData.tipo === 'combo') {
      const precio = parseFloat(value) || 0;
      if (precio > 0) {
        setFormData(prev => ({
          ...prev,
          precio_internet: Math.round(precio * 0.65),
          precio_television: Math.round(precio * 0.35)
        }));
      }
    }

    // Auto-calcular precios con y sin IVA
    if (field === 'precio_internet') {
      const precio = parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        precio_internet_sin_iva: precio,
        precio_internet_con_iva: Math.round(precio * 1.19)
      }));
    }

    if (field === 'precio_television') {
      const precio = parseFloat(value) || 0;
      setFormData(prev => ({
        ...prev,
        precio_television_sin_iva: Math.round(precio / 1.19),
        precio_television_con_iva: precio
      }));
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
      aplica_iva: true,
      activo: true,
      precio_internet: '',
      precio_television: '',
      precio_instalacion: '42016',
      requiere_instalacion: true,
      segmento: 'residencial',
      tecnologia: 'Fibra Óptica',
      permanencia_meses: '0',
      descuento_combo: '0',
      conceptos_incluidos: '',
      orden_visualizacion: '0',
      promocional: false,
      fecha_inicio_promocion: '',
      fecha_fin_promocion: '',
      aplica_iva_estrato_123: false,
      aplica_iva_estrato_456: true,
      precio_internet_sin_iva: '',
      precio_television_sin_iva: '',
      precio_internet_con_iva: '',
      precio_television_con_iva: '',
      costo_instalacion_permanencia: '50000',
      costo_instalacion_sin_permanencia: '150000',
      permanencia_minima_meses: '6',
      aplica_permanencia: true
    });
  };

  // ==========================================
  // FUNCIONES CRUD
  // ==========================================

  const handleCreatePlan = async () => {
    try {
      const response = await configService.createServicePlan(formData);
      await cargarPlanes();
      await cargarEstadisticas();
      setShowCreateModal(false);
      resetForm();
      alert('Plan creado exitosamente');
    } catch (error) {
      console.error('Error creando plan:', error);
      alert('Error al crear el plan: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditPlan = async () => {
    try {
      if (!selectedPlan) return;

      const response = await configService.updateServicePlan(selectedPlan.id, formData);
      await cargarPlanes();
      await cargarEstadisticas();
      setShowEditModal(false);
      setSelectedPlan(null);
      resetForm();
      alert('Plan actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando plan:', error);
      alert('Error al actualizar el plan: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStatus = async (planId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await configService.toggleServicePlanStatus(planId, newStatus);
      await cargarPlanes();
      await cargarEstadisticas();
      alert(`Plan ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer.',
      buttons: [
        {
          label: 'Sí, eliminar',
          onClick: async () => {
            try {
              await configService.deleteServicePlan(planId);
              await cargarPlanes();
              await cargarEstadisticas();
              alert('Plan eliminado exitosamente');
            } catch (error) {
              console.error('Error eliminando plan:', error);
              alert('Error al eliminar el plan: ' + (error.response?.data?.message || error.message));
            }
          }
        },
        {
          label: 'Cancelar',
          onClick: () => { }
        }
      ]
    });
  };

  const handleDuplicatePlan = async (plan) => {
    try {
      const nuevoCodigo = prompt('Ingrese el nuevo código para el plan duplicado:', `${plan.codigo}_COPY`);
      if (!nuevoCodigo) return;

      const nuevoNombre = prompt('Ingrese el nuevo nombre para el plan duplicado:', `${plan.nombre} (Copia)`);
      if (!nuevoNombre) return;

      const planDuplicado = {
        ...plan,
        codigo: nuevoCodigo,
        nombre: nuevoNombre,
        promocional: false,
        fecha_inicio_promocion: '',
        fecha_fin_promocion: ''
      };

      delete planDuplicado.id;
      delete planDuplicado.created_at;
      delete planDuplicado.updated_at;

      await configService.createServicePlan(planDuplicado);
      await cargarPlanes();
      await cargarEstadisticas();
      alert('Plan duplicado exitosamente');
    } catch (error) {
      console.error('Error duplicando plan:', error);
      alert('Error al duplicar el plan');
    }
  };

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const filteredPlanes = planes.filter(plan => {
    const matchesSearch = plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const openEditModal = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      codigo: plan.codigo,
      nombre: plan.nombre,
      tipo: plan.tipo,
      precio: plan.precio.toString(),
      precio_internet: plan.precio_internet?.toString() || '',
      precio_television: plan.precio_television?.toString() || '',
      velocidad_subida: plan.velocidad_subida?.toString() || '',
      velocidad_bajada: plan.velocidad_bajada?.toString() || '',
      canales_tv: plan.canales_tv?.toString() || '',
      descripcion: plan.descripcion || '',
      segmento: plan.segmento || 'residencial',
      tecnologia: plan.tecnologia || 'Fibra Óptica',
      permanencia_meses: plan.permanencia_meses?.toString() || '0',
      descuento_combo: plan.descuento_combo?.toString() || '0',
      precio_instalacion: plan.precio_instalacion?.toString() || '42016',
      requiere_instalacion: plan.requiere_instalacion || false,
      aplica_iva: plan.aplica_iva || false,
      promocional: plan.promocional || false,
      fecha_inicio_promocion: plan.fecha_inicio_promocion || '',
      fecha_fin_promocion: plan.fecha_fin_promocion || '',
      orden_visualizacion: plan.orden_visualizacion?.toString() || '0',

      // CAMPOS NUEVOS REALES
      aplica_iva_estrato_123: plan.aplica_iva_estrato_123 || false,
      aplica_iva_estrato_456: plan.aplica_iva_estrato_456 || true,
      precio_internet_sin_iva: plan.precio_internet_sin_iva?.toString() || '',
      precio_television_sin_iva: plan.precio_television_sin_iva?.toString() || '',
      precio_internet_con_iva: plan.precio_internet_con_iva?.toString() || '',
      precio_television_con_iva: plan.precio_television_con_iva?.toString() || '',
      costo_instalacion_permanencia: plan.costo_instalacion_permanencia?.toString() || '50000',
      costo_instalacion_sin_permanencia: plan.costo_instalacion_sin_permanencia?.toString() || '150000',
      permanencia_minima_meses: plan.permanencia_minima_meses?.toString() || '6',
      aplica_permanencia: plan.aplica_permanencia || true,

      conceptos_incluidos: typeof plan.conceptos_incluidos === 'object'
        ? JSON.stringify(plan.conceptos_incluidos, null, 2)
        : plan.conceptos_incluidos || ''
    });
    setShowEditModal(true);
  };

  const openViewModal = (plan) => {
    setSelectedPlan(plan);
    setShowViewModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'internet': return <Wifi className="w-4 h-4" />;
      case 'television': return <Tv className="w-4 h-4" />;
      case 'combo': return <Package className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'internet': return 'bg-blue-100 text-blue-800';
      case 'television': return 'bg-purple-100 text-purple-800';
      case 'combo': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ==========================================
  // COMPONENTE RENDERIZADO
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Cargando planes de servicio...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header con estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Planes</p>
                <p className="text-2xl font-bold">{stats.total_planes || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold">{stats.planes_activos || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Clientes</p>
                <p className="text-2xl font-bold">{stats.total_clientes || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold">
                  {stats.precio_promedio ? formatPrice(stats.precio_promedio) : '$0'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles superiores */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar planes por código, nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="internet">Internet</option>
              <option value="television">Televisión</option>
              <option value="combo">Combo</option>
            </select>

            <select
              value={filterSegmento}
              onChange={(e) => setFilterSegmento(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los segmentos</option>
              <option value="residencial">Residencial</option>
              <option value="empresarial">Empresarial</option>
            </select>

            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="1">Solo activos</option>
              <option value="0">Solo inactivos</option>
            </select>

            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="orden_visualizacion">Orden de visualización</option>
              <option value="nombre">Nombre</option>
              <option value="precio">Precio</option>
              <option value="created_at">Fecha de creación</option>
            </select>
          </div>

          {/* Botón crear */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Plan
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Lista de planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlanes.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => openEditModal(plan)}
            onView={() => openViewModal(plan)}
            onToggleStatus={() => handleToggleStatus(plan.id, plan.activo)}
            onDelete={() => handleDeletePlan(plan.id)}
            onDuplicate={() => handleDuplicatePlan(plan)}
            formatPrice={formatPrice}
            getTypeIcon={getTypeIcon}
            getTypeColor={getTypeColor}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredPlanes.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterTipo || filterSegmento
              ? 'No se encontraron planes'
              : 'No hay planes configurados'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterTipo || filterSegmento
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer plan de servicio'}
          </p>
          {!searchTerm && !filterTipo && !filterSegmento && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primer Plan
            </button>
          )}
        </div>
      )}

      {/* Modales */}
      <PlanFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        onSubmit={handleCreatePlan}
        title="Crear Nuevo Plan de Servicio"
        formData={formData}
        handleInputChange={handleInputChange}
        isEdit={false}
      />

      <PlanFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPlan(null);
          resetForm();
        }}
        onSubmit={handleEditPlan}
        title="Editar Plan de Servicio"
        formData={formData}
        handleInputChange={handleInputChange}
        isEdit={true}
      />

      <PlanViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        formatPrice={formatPrice}
        getTypeIcon={getTypeIcon}
        getTypeColor={getTypeColor}
      />
    </div>
  );
};

// ==========================================
// COMPONENTE TARJETA DE PLAN
// ==========================================

const PlanCard = ({
  plan,
  onEdit,
  onView,
  onToggleStatus,
  onDelete,
  onDuplicate,
  formatPrice,
  getTypeIcon,
  getTypeColor
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${getTypeColor(plan.tipo)} mr-3`}>
              {getTypeIcon(plan.tipo)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{plan.nombre}</h3>
              <p className="text-sm text-gray-600">{plan.codigo}</p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end gap-1">
            {plan.promocional && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                <Star className="w-3 h-3 mr-1" />
                Promocional
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${plan.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {plan.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Precio principal */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(plan.precio)}
            <span className="text-sm text-gray-600 font-normal">/mes</span>
          </div>
          {plan.aplica_iva && (
            <p className="text-sm text-gray-600">
              {formatPrice(plan.precio * 1.19)} con IVA
            </p>
          )}
        </div>

        {/* Especificaciones técnicas */}
        <div className="space-y-2 mb-4">
          {plan.tipo === 'internet' || plan.tipo === 'combo' ? (
            <div className="flex items-center text-sm text-gray-600">
              <Wifi className="w-4 h-4 mr-2" />
              {plan.velocidad_bajada}↓ / {plan.velocidad_subida}↑ Mbps
            </div>
          ) : null}

          {plan.tipo === 'television' || plan.tipo === 'combo' ? (
            <div className="flex items-center text-sm text-gray-600">
              <Tv className="w-4 h-4 mr-2" />
              {plan.canales_tv} canales
            </div>
          ) : null}

          {plan.permanencia_meses > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              Permanencia: {plan.permanencia_meses} meses
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <Shield className="w-4 h-4 mr-2" />
            {plan.segmento} • {plan.tecnologia}
          </div>
        </div>

        {/* Información adicional */}
        {plan.descripcion && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {plan.descripcion}
          </p>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={onView}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye size={16} />
            </button>

            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Editar plan"
            >
              <Edit size={16} />
            </button>

            <button
              onClick={onDuplicate}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Duplicar plan"
            >
              <Copy size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleStatus}
              className={`p-2 rounded-lg transition-colors ${plan.activo
                ? 'text-red-600 hover:bg-red-100'
                : 'text-green-600 hover:bg-green-100'
                }`}
              title={plan.activo ? 'Desactivar' : 'Activar'}
            >
              {plan.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            </button>

            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Eliminar plan"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL DE FORMULARIO (CREAR/EDITAR)
// ==========================================

const PlanFormModal = ({ isOpen, onClose, onSubmit, title, formData, handleInputChange, isEdit }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">

              {/* INFORMACIÓN BÁSICA */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Información Básica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: INT50, TV_PREM, COMBO1"
                      disabled={isEdit}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre descriptivo del plan"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Servicio *
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="internet">Internet</option>
                      <option value="television">Televisión</option>
                      <option value="combo">Combo (Internet + TV)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Segmento *
                    </label>
                    <select
                      value={formData.segmento}
                      onChange={(e) => handleInputChange('segmento', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="residencial">Residencial</option>
                      <option value="empresarial">Empresarial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tecnología
                    </label>
                    <select
                      value={formData.tecnologia}
                      onChange={(e) => handleInputChange('tecnologia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Fibra Óptica">Fibra Óptica</option>
                      <option value="HFC (Cable)">HFC (Cable)</option>
                      <option value="Satelital">Satelital</option>
                      <option value="Wireless">Wireless</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      value={formData.orden_visualizacion}
                      onChange={(e) => handleInputChange('orden_visualizacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Descripción detallada del plan de servicio"
                  />
                </div>
              </div>

              {/* PRECIOS Y FACTURACIÓN */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Precios y Facturación
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Principal *
                    </label>
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => handleInputChange('precio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {(formData.tipo === 'combo' || formData.tipo === 'internet') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Internet
                        </label>
                        <input
                          type="number"
                          value={formData.precio_internet}
                          onChange={(e) => handleInputChange('precio_internet', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Internet Sin IVA
                        </label>
                        <input
                          type="number"
                          value={formData.precio_internet_sin_iva}
                          onChange={(e) => handleInputChange('precio_internet_sin_iva', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Internet Con IVA
                        </label>
                        <input
                          type="number"
                          value={formData.precio_internet_con_iva}
                          onChange={(e) => handleInputChange('precio_internet_con_iva', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}

                  {(formData.tipo === 'combo' || formData.tipo === 'television') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Televisión
                        </label>
                        <input
                          type="number"
                          value={formData.precio_television}
                          onChange={(e) => handleInputChange('precio_television', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio TV Sin IVA
                        </label>
                        <input
                          type="number"
                          value={formData.precio_television_sin_iva}
                          onChange={(e) => handleInputChange('precio_television_sin_iva', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio TV Con IVA
                        </label>
                        <input
                          type="number"
                          value={formData.precio_television_con_iva}
                          onChange={(e) => handleInputChange('precio_television_con_iva', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Instalación
                    </label>
                    <input
                      type="number"
                      value={formData.precio_instalacion}
                      onChange={(e) => handleInputChange('precio_instalacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      placeholder="42016.00"
                    />
                  </div>

                  {formData.tipo === 'combo' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descuento Combo (%)
                      </label>
                      <input
                        type="number"
                        value={formData.descuento_combo}
                        onChange={(e) => handleInputChange('descuento_combo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permanencia (meses)
                    </label>
                    <input
                      type="number"
                      value={formData.permanencia_meses}
                      onChange={(e) => handleInputChange('permanencia_meses', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="36"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Configuración de IVA */}
                <div className="mt-4">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Configuración de IVA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="aplica_iva"
                        checked={formData.aplica_iva}
                        onChange={(e) => handleInputChange('aplica_iva', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="aplica_iva" className="ml-2 text-sm text-gray-700">
                        Aplica IVA General
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="aplica_iva_estrato_123"
                        checked={formData.aplica_iva_estrato_123}
                        onChange={(e) => handleInputChange('aplica_iva_estrato_123', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="aplica_iva_estrato_123" className="ml-2 text-sm text-gray-700">
                        IVA Estratos 1, 2, 3
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="aplica_iva_estrato_456"
                        checked={formData.aplica_iva_estrato_456}
                        onChange={(e) => handleInputChange('aplica_iva_estrato_456', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="aplica_iva_estrato_456" className="ml-2 text-sm text-gray-700">
                        IVA Estratos 4, 5, 6
                      </label>
                    </div>
                  </div>
                </div>

                {/* Configuración de Instalación y Permanencia */}
                <div className="mt-4">
                  <h4 className="text-md font-medium text-gray-800 mb-3">Configuración de Instalación y Permanencia</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Costo Instalación Con Permanencia
                      </label>
                      <input
                        type="number"
                        value={formData.costo_instalacion_permanencia}
                        onChange={(e) => handleInputChange('costo_instalacion_permanencia', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        placeholder="50000.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Costo Instalación Sin Permanencia
                      </label>
                      <input
                        type="number"
                        value={formData.costo_instalacion_sin_permanencia}
                        onChange={(e) => handleInputChange('costo_instalacion_sin_permanencia', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        placeholder="150000.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permanencia Mínima (meses)
                      </label>
                      <input
                        type="number"
                        value={formData.permanencia_minima_meses}
                        onChange={(e) => handleInputChange('permanencia_minima_meses', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="36"
                        placeholder="6"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requiere_instalacion"
                        checked={formData.requiere_instalacion}
                        onChange={(e) => handleInputChange('requiere_instalacion', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requiere_instalacion" className="ml-2 text-sm text-gray-700">
                        Requiere instalación
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="aplica_permanencia"
                        checked={formData.aplica_permanencia}
                        onChange={(e) => handleInputChange('aplica_permanencia', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="aplica_permanencia" className="ml-2 text-sm text-gray-700">
                        Aplica permanencia
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ESPECIFICACIONES TÉCNICAS */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Wifi className="w-5 h-5 mr-2" />
                  Especificaciones Técnicas
                </h3>

                {(formData.tipo === 'internet' || formData.tipo === 'combo') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Velocidad Bajada (Mbps)
                      </label>
                      <input
                        type="number"
                        value={formData.velocidad_bajada}
                        onChange={(e) => handleInputChange('velocidad_bajada', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Velocidad Subida (Mbps)
                      </label>
                      <input
                        type="number"
                        value={formData.velocidad_subida}
                        onChange={(e) => handleInputChange('velocidad_subida', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}

                {(formData.tipo === 'television' || formData.tipo === 'combo') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canales de TV
                      </label>
                      <input
                        type="number"
                        value={formData.canales_tv}
                        onChange={(e) => handleInputChange('canales_tv', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="120"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CONFIGURACIÓN PROMOCIONAL */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Configuración Promocional
                </h3>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="promocional"
                    checked={formData.promocional}
                    onChange={(e) => handleInputChange('promocional', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="promocional" className="ml-2 text-sm font-medium text-gray-700">
                    Este es un plan promocional
                  </label>
                </div>

                {formData.promocional && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Inicio Promoción
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_inicio_promocion}
                        onChange={(e) => handleInputChange('fecha_inicio_promocion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Fin Promoción
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_fin_promocion}
                        onChange={(e) => handleInputChange('fecha_fin_promocion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* CONCEPTOS INCLUIDOS (JSON) */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Conceptos Incluidos (JSON)
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conceptos Incluidos en formato JSON
                  </label>
                  <textarea
                    value={formData.conceptos_incluidos}
                    onChange={(e) => handleInputChange('conceptos_incluidos', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows="6"
                    placeholder='{"tipo_principal": "internet", "instalacion": 42016, "internet": {"precio": 50000, "velocidad": "50 Mbps"}}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato JSON válido. Ejemplo: {JSON.stringify({ "tipo_principal": "internet", "instalacion": 42016 })}
                  </p>
                </div>
              </div>

              {/* RESUMEN Y VISTA PREVIA */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Vista Previa del Plan
                </h3>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{formData.nombre || 'Nombre del Plan'}</h4>
                      <p className="text-sm text-gray-600">{formData.codigo || 'CODIGO'} • {formData.segmento} • {formData.tecnologia}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formData.precio ? new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0
                        }).format(formData.precio) : '$0'}
                        <span className="text-sm font-normal text-gray-600">/mes</span>
                      </div>
                      {formData.aplica_iva && formData.precio && (
                        <p className="text-sm text-gray-600">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(formData.precio * 1.19)} con IVA
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {(formData.tipo === 'internet' || formData.tipo === 'combo') && formData.velocidad_bajada && (
                      <div className="flex items-center text-gray-600">
                        <Wifi className="w-4 h-4 mr-2" />
                        Internet: {formData.velocidad_bajada}↓/{formData.velocidad_subida}↑ Mbps
                      </div>
                    )}

                    {(formData.tipo === 'television' || formData.tipo === 'combo') && formData.canales_tv && (
                      <div className="flex items-center text-gray-600">
                        <Tv className="w-4 h-4 mr-2" />
                        TV: {formData.canales_tv} canales
                      </div>
                    )}

                    {formData.permanencia_meses > 0 && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        Permanencia: {formData.permanencia_meses} meses
                      </div>
                    )}
                  </div>

                  {formData.descripcion && (
                    <p className="text-sm text-gray-600 mt-3">{formData.descripcion}</p>
                  )}

                  {/* Mostrar configuración de IVA */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Configuración de IVA:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className={`px-2 py-1 rounded ${formData.aplica_iva ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        IVA General: {formData.aplica_iva ? 'Sí' : 'No'}
                      </div>
                      <div className={`px-2 py-1 rounded ${formData.aplica_iva_estrato_123 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        IVA Estratos 1,2,3: {formData.aplica_iva_estrato_123 ? 'Sí' : 'No'}
                      </div>
                      <div className={`px-2 py-1 rounded ${formData.aplica_iva_estrato_456 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        IVA Estratos 4,5,6: {formData.aplica_iva_estrato_456 ? 'Sí' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* Mostrar configuración de instalación */}
                  {formData.requiere_instalacion && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Costos de Instalación:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          Con permanencia: {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(formData.costo_instalacion_permanencia || 0)}
                        </div>
                        <div className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                          Sin permanencia: {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(formData.costo_instalacion_sin_permanencia || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Footer con botones */}
          <div className="border-t p-6">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEdit ? 'Actualizar Plan' : 'Crear Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL DE VISUALIZACIÓN DE PLAN
// ==========================================

const PlanViewModal = ({ isOpen, onClose, plan, formatPrice, getTypeIcon, getTypeColor }) => {
  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${getTypeColor(plan.tipo)} mr-4`}>
                {getTypeIcon(plan.tipo)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{plan.nombre}</h2>
                <p className="text-gray-600">{plan.codigo} • {plan.segmento} • {plan.tecnologia}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Información principal */}
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información General</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{plan.tipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Segmento:</span>
                      <span className="font-medium">{plan.segmento}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tecnología:</span>
                      <span className="font-medium">{plan.tecnologia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`font-medium ${plan.activo ? 'text-green-600' : 'text-red-600'}`}>
                        {plan.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Orden visualización:</span>
                      <span className="font-medium">{plan.orden_visualizacion}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Precios</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precio base:</span>
                      <span className="font-medium">{formatPrice(plan.precio)}</span>
                    </div>
                    {plan.aplica_iva && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Con IVA:</span>
                        <span className="font-medium">{formatPrice(plan.precio * 1.19)}</span>
                      </div>
                    )}
                    {plan.precio_instalacion > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Instalación:</span>
                        <span className="font-medium">{formatPrice(plan.precio_instalacion)}</span>
                      </div>
                    )}
                    {plan.permanencia_meses > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Permanencia:</span>
                        <span className="font-medium">{plan.permanencia_meses} meses</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Precios específicos de componentes */}
                {(plan.precio_internet > 0 || plan.precio_television > 0) && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Precios por Componente</h3>
                    <div className="space-y-2">
                      {plan.precio_internet > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Internet:</span>
                            <span className="font-medium">{formatPrice(plan.precio_internet)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Internet sin IVA:</span>
                            <span className="font-medium">{formatPrice(plan.precio_internet_sin_iva || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Internet con IVA:</span>
                            <span className="font-medium">{formatPrice(plan.precio_internet_con_iva || 0)}</span>
                          </div>
                        </>
                      )}
                      {plan.precio_television > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Televisión:</span>
                            <span className="font-medium">{formatPrice(plan.precio_television)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TV sin IVA:</span>
                            <span className="font-medium">{formatPrice(plan.precio_television_sin_iva || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TV con IVA:</span>
                            <span className="font-medium">{formatPrice(plan.precio_television_con_iva || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {plan.descripcion && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
                    <p className="text-gray-700">{plan.descripcion}</p>
                  </div>
                )}
              </div>

              {/* Especificaciones técnicas */}
              <div className="space-y-6">
                {(plan.tipo === 'internet' || plan.tipo === 'combo') && (
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Wifi className="w-5 h-5 mr-2" />
                      Especificaciones Internet
                    </h3>
                    <div className="space-y-2">
                      {plan.velocidad_bajada && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Velocidad bajada:</span>
                          <span className="font-medium">{plan.velocidad_bajada} Mbps</span>
                        </div>
                      )}
                      {plan.velocidad_subida && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Velocidad subida:</span>
                          <span className="font-medium">{plan.velocidad_subida} Mbps</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(plan.tipo === 'television' || plan.tipo === 'combo') && (
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Tv className="w-5 h-5 mr-2" />
                      Especificaciones TV
                    </h3>
                    <div className="space-y-2">
                      {plan.canales_tv && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Canales:</span>
                          <span className="font-medium">{plan.canales_tv}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Configuración de IVA */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Percent className="w-5 h-5 mr-2" />
                    Configuración de IVA
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA general:</span>
                      <span className="font-medium">{plan.aplica_iva ? 'Sí' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA estratos 1,2,3:</span>
                      <span className="font-medium">{plan.aplica_iva_estrato_123 ? 'Sí' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA estratos 4,5,6:</span>
                      <span className="font-medium">{plan.aplica_iva_estrato_456 ? 'Sí' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Configuración de instalación y permanencia */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Instalación y Permanencia
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Requiere instalación:</span>
                      <span className="font-medium">{plan.requiere_instalacion ? 'Sí' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aplica permanencia:</span>
                      <span className="font-medium">{plan.aplica_permanencia ? 'Sí' : 'No'}</span>
                    </div>
                    {plan.costo_instalacion_permanencia > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Costo con permanencia:</span>
                        <span className="font-medium">{formatPrice(plan.costo_instalacion_permanencia)}</span>
                      </div>
                    )}
                    {plan.costo_instalacion_sin_permanencia > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Costo sin permanencia:</span>
                        <span className="font-medium">{formatPrice(plan.costo_instalacion_sin_permanencia)}</span>
                      </div>
                    )}
                    {plan.permanencia_minima_meses > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Permanencia mínima:</span>
                        <span className="font-medium">{plan.permanencia_minima_meses} meses</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información promocional */}
                {plan.promocional && (
                  <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-600" />
                      Plan Promocional
                    </h3>
                    <div className="space-y-2">
                      {plan.fecha_inicio_promocion && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Inicio promoción:</span>
                          <span className="font-medium">
                            {new Date(plan.fecha_inicio_promocion).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      )}
                      {plan.fecha_fin_promocion && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fin promoción:</span>
                          <span className="font-medium">
                            {new Date(plan.fecha_fin_promocion).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conceptos incluidos */}
                {plan.conceptos_incluidos && Object.keys(plan.conceptos_incluidos).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Conceptos Incluidos</h3>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border">
                      {JSON.stringify(plan.conceptos_incluidos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Fechas de creación y modificación */}
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Creado:</span>
                  <span className="font-medium">
                    {plan.created_at ? new Date(plan.created_at).toLocaleString('es-CO') : 'No disponible'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última modificación:</span>
                  <span className="font-medium">
                    {plan.updated_at ? new Date(plan.updated_at).toLocaleString('es-CO') : 'No disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePlansConfig;