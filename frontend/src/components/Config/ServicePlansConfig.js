import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Copy, ToggleLeft, ToggleRight,
  Wifi, Tv, Package, Users, DollarSign, Calendar, Settings,
  CheckCircle, XCircle, AlertCircle, Eye, Star, TrendingUp
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

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'internet',
    precio: '',
    precio_internet: '',
    precio_television: '',
    velocidad_subida: '',
    velocidad_bajada: '',
    canales_tv: '',
    descripcion: '',
    segmento: 'residencial',
    tecnologia: 'Fibra Óptica',
    permanencia_meses: '0',
    descuento_combo: '0',
    precio_instalacion: '42016',
    requiere_instalacion: true,
    aplica_iva: true,
    promocional: false,
    fecha_inicio_promocion: '',
    fecha_fin_promocion: ''
  });

  // Cargar datos al inicializar
  useEffect(() => {
    cargarPlanes();
    cargarEstadisticas();
  }, [filterTipo, filterSegmento, filterActivo, showPromocionales]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarPlanes = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('🔄 DEBUG: Iniciando carga de planes...');
    
    const params = {};
    if (filterTipo) params.tipo = filterTipo;
    if (filterSegmento) params.segmento = filterSegmento;
    if (filterActivo) params.activo = filterActivo;
    params.incluir_promocionales = showPromocionales;

    console.log('📊 DEBUG: Parámetros enviados:', params);
    
    const response = await configService.getServicePlans(params);
    
    console.log('📡 DEBUG: Respuesta completa del configService:', response);
    console.log('📡 DEBUG: response.success:', response?.success);
    console.log('📡 DEBUG: response.data:', response?.data);
    console.log('📡 DEBUG: Tipo de response.data:', typeof response?.data);
    console.log('📡 DEBUG: Es array response.data?:', Array.isArray(response?.data));
    
    // MANEJO ROBUSTO DE DIFERENTES ESTRUCTURAS DE RESPUESTA
    let planesData = [];
    
    if (response?.success && Array.isArray(response?.data)) {
      // Estructura estándar: { success: true, data: [...] }
      planesData = response.data;
      console.log('✅ DEBUG: Usando response.data (estructura estándar)');
    } else if (Array.isArray(response?.data)) {
      // Estructura alternativa: { data: [...] }
      planesData = response.data;
      console.log('✅ DEBUG: Usando response.data (sin success flag)');
    } else if (Array.isArray(response)) {
      // Respuesta directa como array
      planesData = response;
      console.log('✅ DEBUG: Usando response directo como array');
    } else if (response?.planes && Array.isArray(response.planes)) {
      // Estructura alternativa: { planes: [...] }
      planesData = response.planes;
      console.log('✅ DEBUG: Usando response.planes');
    } else {
      console.log('❌ DEBUG: No se encontró estructura de datos válida');
      console.log('❌ DEBUG: Estructura completa de response:', response);
      planesData = [];
    }
    
    console.log('🎯 DEBUG: Planes finales a mostrar:', planesData.length);
    console.log('🎯 DEBUG: Primer plan procesado:', planesData[0]);
    
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
      // Asegurar que los booleans sean booleans
      activo: Boolean(plan.activo),
      aplica_iva: Boolean(plan.aplica_iva),
      requiere_instalacion: Boolean(plan.requiere_instalacion),
      promocional: Boolean(plan.promocional),
      // Parsear JSON si es necesario
      conceptos_incluidos: typeof plan.conceptos_incluidos === 'string' 
        ? JSON.parse(plan.conceptos_incluidos || '{}') 
        : plan.conceptos_incluidos || {}
    }));
    
    setPlanes(planesFormateados);
    console.log('✅ DEBUG: Planes establecidos en el estado:', planesFormateados.length);
    
  } catch (error) {
    console.error('❌ DEBUG: Error en cargarPlanes:', error);
    console.error('❌ DEBUG: Error stack:', error.stack);
    setError('Error al cargar los planes de servicio: ' + error.message);
    setPlanes([]);
  } finally {
    setLoading(false);
  }
};

  const cargarEstadisticas = async () => {
    try {
      const response = await configService.getServicePlanStats();
      setStats(response.data.data);
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
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'internet',
      precio: '',
      precio_internet: '',
      precio_television: '',
      velocidad_subida: '',
      velocidad_bajada: '',
      canales_tv: '',
      descripcion: '',
      segmento: 'residencial',
      tecnologia: 'Fibra Óptica',
      permanencia_meses: '0',
      descuento_combo: '0',
      precio_instalacion: '42016',
      requiere_instalacion: true,
      aplica_iva: true,
      promocional: false,
      fecha_inicio_promocion: '',
      fecha_fin_promocion: ''
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
      const response = await configService.updateServicePlan(selectedPlan.id, formData)
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

  const handleDuplicatePlan = async (planId, nuevoCodigoP, nuevoNombre) => {
    try {
      
      /*await ConfigService.post(`/service-plans/${planId}/duplicate`, {
        nuevo_codigo: nuevoCodigoP,
        nuevo_nombre: nuevoNombre
      });*/
      await cargarPlanes();
      await cargarEstadisticas();
      alert('Plan duplicado exitosamente');
    } catch (error) {
      console.error('Error duplicando plan:', error);
      alert('Error al duplicar el plan: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStatus = async (planId, activo) => {
    try {
     const response = await configService.toggleServicePlanStatus(planId, activo);
      await cargarPlanes();
      await cargarEstadisticas();
      alert(`Plan ${activo ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar el estado del plan');
    }
  };

  const handleDeletePlan = async (planId) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar este plan?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              const response = await configService.deleteServicePlan(planId);
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
          label: 'No',
          onClick: () => { }
        }
      ]
    });
  };

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const filteredPlanes = planes.filter(plan => {
    const matchesSearch = plan.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.codigo.toLowerCase().includes(searchTerm.toLowerCase());
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
      fecha_fin_promocion: plan.fecha_fin_promocion || ''
    });
    setShowEditModal(true);
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'internet': return <Wifi size={20} className="text-blue-500" />;
      case 'television': return <Tv size={20} className="text-purple-500" />;
      case 'combo': return <Package size={20} className="text-green-500" />;
      default: return <Settings size={20} className="text-gray-500" />;
    }
  };

  const getTipoBadge = (tipo) => {
    const colors = {
      internet: 'bg-blue-100 text-blue-800',
      television: 'bg-purple-100 text-purple-800',
      combo: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </span>
    );
  };

  // ==========================================
  // COMPONENTES DE INTERFAZ
  // ==========================================

  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Planes</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_planes || 0}</p>
          </div>
          <Package className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Planes Activos</p>
            <p className="text-2xl font-bold text-green-600">{stats?.planes_activos || 0}</p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Precio Promedio</p>
            <p className="text-2xl font-bold text-blue-600">
              ${Math.round(stats?.precio_promedio || 0).toLocaleString()}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Promociones</p>
            <p className="text-2xl font-bold text-orange-600">{stats?.promociones_vigentes || 0}</p>
          </div>
          <Star className="h-8 w-8 text-orange-500" />
        </div>
      </div>
    </div>
  );

  const FilterBar = () => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Búsqueda */}
        <div className="md:col-span-2">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar planes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filtro por tipo */}
        <div>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="internet">Internet</option>
            <option value="television">Televisión</option>
            <option value="combo">Combo</option>
          </select>
        </div>

        {/* Filtro por segmento */}
        <div>
          <select
            value={filterSegmento}
            onChange={(e) => setFilterSegmento(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los segmentos</option>
            <option value="residencial">Residencial</option>
            <option value="empresarial">Empresarial</option>
          </select>
        </div>

        {/* Filtro por estado */}
        <div>
          <select
            value={filterActivo}
            onChange={(e) => setFilterActivo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>

        {/* Toggle promocionales */}
        <div className="flex items-center">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showPromocionales}
              onChange={(e) => setShowPromocionales(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Incluir promocionales</span>
          </label>
        </div>
      </div>
    </div>
  );

  const PlanCard = ({ plan }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${plan.activo ? 'border-green-500' : 'border-red-500'
      }`}>
      {/* Header del card */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          {getTipoIcon(plan.tipo)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{plan.nombre}</h3>
            <p className="text-sm text-gray-600">Código: {plan.codigo}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {getTipoBadge(plan.tipo)}
          {plan.promocional_vigente && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              <Star size={12} className="inline mr-1" />
              Promocional
            </span>
          )}
        </div>
      </div>

      {/* Precio principal */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">
            ${plan.precio.toLocaleString()}
          </span>
          <span className="text-sm text-gray-600">/mes</span>
          {plan.aplica_iva && (
            <span className="text-xs text-gray-500">+ IVA</span>
          )}
        </div>
        {plan.precio_con_iva && plan.precio_con_iva !== plan.precio && (
          <p className="text-sm text-gray-600">
            Con IVA: ${Math.round(plan.precio_con_iva).toLocaleString()}
          </p>
        )}
      </div>

      {/* Detalles del plan */}
      <div className="space-y-2 mb-4">
        {/* Información de Internet */}
        {(plan.tipo === 'internet' || plan.tipo === 'combo') && plan.velocidad_bajada && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Velocidad:</span>
            <span className="font-medium">{plan.velocidad_bajada}/{plan.velocidad_subida || 1} Mbps</span>
          </div>
        )}

        {/* Información de TV */}
        {(plan.tipo === 'television' || plan.tipo === 'combo') && plan.canales_tv && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Canales:</span>
            <span className="font-medium">{plan.canales_tv}</span>
          </div>
        )}

        {/* Segmento y tecnología */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Segmento:</span>
          <span className="font-medium capitalize">{plan.segmento}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tecnología:</span>
          <span className="font-medium">{plan.tecnologia}</span>
        </div>

        {/* Clientes activos */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Clientes:</span>
          <span className="font-medium flex items-center">
            <Users size={14} className="mr-1" />
            {plan.clientes_activos || 0}
          </span>
        </div>

        {/* Permanencia */}
        {plan.permanencia_meses > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Permanencia:</span>
            <span className="font-medium">{plan.permanencia_meses} meses</span>
          </div>
        )}

        {/* Descuento combo */}
        {plan.descuento_combo > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Descuento combo:</span>
            <span className="font-medium text-green-600">{plan.descuento_combo}%</span>
          </div>
        )}
      </div>

      {/* Precios desglosados para combos */}
      {plan.tipo === 'combo' && (plan.precio_internet > 0 || plan.precio_television > 0) && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-600 mb-2">Desglose del combo:</p>
          <div className="space-y-1 text-sm">
            {plan.precio_internet > 0 && (
              <div className="flex justify-between">
                <span>Internet:</span>
                <span>${plan.precio_internet.toLocaleString()}</span>
              </div>
            )}
            {plan.precio_television > 0 && (
              <div className="flex justify-between">
                <span>Televisión:</span>
                <span>${plan.precio_television.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Descripción */}
      {plan.descripcion && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{plan.descripcion}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.activo
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
            }`}>
            {plan.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(plan)}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            title="Editar plan"
          >
            <Edit size={16} />
          </button>

          <button
            onClick={() => {
              const nuevoCodigo = prompt('Código para el plan duplicado:', `${plan.codigo}_COPY`);
              const nuevoNombre = prompt('Nombre para el plan duplicado:', `${plan.nombre} (Copia)`);
              if (nuevoCodigo && nuevoNombre) {
                handleDuplicatePlan(plan.id, nuevoCodigo, nuevoNombre);
              }
            }}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
            title="Duplicar plan"
          >
            <Copy size={16} />
          </button>

          <button
            onClick={() => handleToggleStatus(plan.id, !plan.activo)}
            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${plan.activo ? 'text-red-600' : 'text-green-600'
              }`}
            title={plan.activo ? 'Desactivar' : 'Activar'}
          >
            {plan.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>

          <button
            onClick={() => handleDeletePlan(plan.id)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Eliminar plan"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const PlanFormModal = ({ isOpen, onClose, onSubmit, title, isEdit = false }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Formulario */}
            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isEdit}
                  >
                    <option value="internet">Internet</option>
                    <option value="television">Televisión</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Principal *
                  </label>
                  <input
                    type="number"
                    value={formData.precio}
                    onChange={(e) => handleInputChange('precio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Precio en pesos"
                  />
                </div>
              </div>

              {/* Precios desglosados para combos */}
              {formData.tipo === 'combo' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Desglose del Combo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Internet
                      </label>
                      <input
                        type="number"
                        value={formData.precio_internet}
                        onChange={(e) => handleInputChange('precio_internet', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio TV
                      </label>
                      <input
                        type="number"
                        value={formData.precio_television}
                        onChange={(e) => handleInputChange('precio_television', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
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
                        max="50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Especificaciones técnicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campos de Internet */}
                {(formData.tipo === 'internet' || formData.tipo === 'combo') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Velocidad Bajada (Mbps)
                      </label>
                      <input
                        type="number"
                        value={formData.velocidad_bajada}
                        onChange={(e) => handleInputChange('velocidad_bajada', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      />
                    </div>
                  </>
                )}

                {/* Campos de TV */}
                {(formData.tipo === 'television' || formData.tipo === 'combo') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Canales
                    </label>
                    <input
                      type="number"
                      value={formData.canales_tv}
                      onChange={(e) => handleInputChange('canales_tv', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Segmento
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
                  <input
                    type="text"
                    value={formData.tecnologia}
                    onChange={(e) => handleInputChange('tecnologia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Fibra Óptica, HFC, Satelital"
                  />
                </div>

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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Instalación
                  </label>
                  <input
                    type="number"
                    value={formData.precio_instalacion}
                    onChange={(e) => handleInputChange('precio_instalacion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción detallada del plan..."
                />
              </div>

              {/* Opciones adicionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.requiere_instalacion}
                      onChange={(e) => handleInputChange('requiere_instalacion', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Requiere instalación</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.aplica_iva}
                      onChange={(e) => handleInputChange('aplica_iva', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Aplica IVA</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.promocional}
                      onChange={(e) => handleInputChange('promocional', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Es promocional</span>
                  </label>
                </div>

                {/* Fechas promocionales */}
                {formData.promocional && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inicio promoción
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_inicio_promocion}
                        onChange={(e) => handleInputChange('fecha_inicio_promocion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fin promoción
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
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
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
    );
  };

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planes de Servicio</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los planes de internet, TV y combos para tus clientes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Nuevo Plan
        </button>
      </div>

      {/* Estadísticas */}
      {stats && <StatsCards />}

      {/* Filtros */}
      <FilterBar />

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlanes.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Empty state */}
      {filteredPlanes.length === 0 && !loading && (
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
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePlan}
        title="Crear Nuevo Plan de Servicio"
      />

      <PlanFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditPlan}
        title="Editar Plan de Servicio"
        isEdit={true}
      />
    </div>
  );
};

export default ServicePlansConfig;