// frontend/src/components/Config/ServicePlansConfig.js
// VERSIÓN OPTIMIZADA - Sin campos obsoletos: precio_instalacion, permanencia_meses, conceptos_incluidos

import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Wifi, Tv, Package, DollarSign,
  Users, Zap, Calendar, Settings, Copy, ToggleLeft,
  ToggleRight, AlertCircle, Check, X, Filter, Search,
  ChevronDown, ChevronRight, Eye, Clock
} from 'lucide-react';
import configService from '../../services/configService';

const ServicePlansConfig = () => {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [planes, setPlanes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [estadisticas, setEstadisticas] = useState({});

  // Estados del formulario - SIN CAMPOS OBSOLETOS
  const [formData, setFormData] = useState({
    // Campos básicos
    codigo: '',
    nombre: '',
    tipo: 'internet',
    precio: '',
    velocidad_subida: '',
    velocidad_bajada: '',
    canales_tv: '',
    descripcion: '',
    segmento: 'residencial',
    tecnologia: 'Fibra Óptica',
    descuento_combo: '0',
    requiere_instalacion: true,
    aplica_iva: false,
    promocional: false,
    fecha_inicio_promocion: '',
    fecha_fin_promocion: '',
    orden_visualizacion: '0',

    // ✅ CAMPOS ACTUALES (Costos de instalación específicos)
    costo_instalacion_permanencia: '50000',
    costo_instalacion_sin_permanencia: '150000',
    permanencia_minima_meses: '6',
    aplica_permanencia: true,

    // Campos de precios específicos
    precio_internet: '',
    precio_television: '',
    aplica_iva_estrato_123: false,
    aplica_iva_estrato_456: true,
    precio_internet_sin_iva: '',
    precio_television_sin_iva: '',
    precio_internet_con_iva: '',
    precio_television_con_iva: ''
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ==========================================
  // EFECTOS Y CARGA DE DATOS
  // ==========================================

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [planesResponse, statsResponse] = await Promise.all([
        configService.getServicePlans({ activo: null }), // ✅ Mostrar TODOS los planes (activos e inactivos)
        configService.getServicePlansStats()
      ]);

      if (planesResponse.success) {
        setPlanes(planesResponse.data || []);
      }

      if (statsResponse.success) {
        setEstadisticas(statsResponse.data || {});
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };
  const cargarEstadisticas = async () => {
    try {
      const response = await configService.getServicePlansStats();
      if (response.success) {
        setEstadisticas(response.data || {});
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // ==========================================
  // FUNCIONES DE FORMULARIO
  // ==========================================

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpiar error del campo modificado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Auto-calcular precios con IVA cuando cambian precios base
    if (field === 'precio_internet' || field === 'precio_television') {
      calcularPreciosConIVA(field, value);
    }
  };

  const calcularPreciosConIVA = (field, value) => {
    const precio = parseFloat(value) || 0;
    const ivaEstratos456 = 0.19; // 19%

    if (field === 'precio_internet') {
      setFormData(prev => ({
        ...prev,
        precio_internet_sin_iva: precio.toString(),
        precio_internet_con_iva: (precio * (1 + ivaEstratos456)).toFixed(2)
      }));
    } else if (field === 'precio_television') {
      setFormData(prev => ({
        ...prev,
        precio_television_sin_iva: precio.toString(),
        precio_television_con_iva: (precio * (1 + ivaEstratos456)).toFixed(2)
      }));
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!formData.codigo.trim()) {
      nuevosErrores.codigo = 'El código es requerido';
    }

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es requerido';
    }

    if (!formData.precio || parseFloat(formData.precio) <= 0) {
      nuevosErrores.precio = 'El precio debe ser mayor a 0';
    }

    // Validaciones específicas por tipo
    if (formData.tipo === 'internet' || formData.tipo === 'combo') {
      if (!formData.velocidad_bajada || parseInt(formData.velocidad_bajada) <= 0) {
        nuevosErrores.velocidad_bajada = 'La velocidad de bajada es requerida';
      }
    }

    if (formData.tipo === 'television' || formData.tipo === 'combo') {
      if (!formData.canales_tv || parseInt(formData.canales_tv) <= 0) {
        nuevosErrores.canales_tv = 'El número de canales es requerido';
      }
    }

    // Validar costos de instalación
    if (parseFloat(formData.costo_instalacion_permanencia) < 0) {
      nuevosErrores.costo_instalacion_permanencia = 'El costo no puede ser negativo';
    }

    if (parseFloat(formData.costo_instalacion_sin_permanencia) < 0) {
      nuevosErrores.costo_instalacion_sin_permanencia = 'El costo no puede ser negativo';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const limpiarFormulario = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo: 'internet',
      precio: '',
      velocidad_subida: '',
      velocidad_bajada: '',
      canales_tv: '',
      descripcion: '',
      segmento: 'residencial',
      tecnologia: 'Fibra Óptica',
      descuento_combo: '0',
      requiere_instalacion: true,
      aplica_iva: false,
      promocional: false,
      fecha_inicio_promocion: '',
      fecha_fin_promocion: '',
      orden_visualizacion: '0',

      // ✅ VALORES POR DEFECTO OPTIMIZADOS
      costo_instalacion_permanencia: '50000',
      costo_instalacion_sin_permanencia: '150000',
      permanencia_minima_meses: '6',
      aplica_permanencia: true,

      precio_internet: '',
      precio_television: '',
      aplica_iva_estrato_123: false,
      aplica_iva_estrato_456: true,
      precio_internet_sin_iva: '',
      precio_television_sin_iva: '',
      precio_internet_con_iva: '',
      precio_television_con_iva: ''
    });
    setErrors({});
    setSelectedPlan(null);
  };

  // ==========================================
  // FUNCIONES CRUD
  // ==========================================

  const handleSave = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setSaving(true);

      // ✅ PREPARAR DATOS SIN CAMPOS OBSOLETOS
      const planData = {
        codigo: formData.codigo,
        nombre: formData.nombre,
        tipo: formData.tipo,
        precio: parseFloat(formData.precio),
        velocidad_subida: parseInt(formData.velocidad_subida) || null,
        velocidad_bajada: parseInt(formData.velocidad_bajada) || null,
        canales_tv: parseInt(formData.canales_tv) || null,
        descripcion: formData.descripcion || null,
        segmento: formData.segmento,
        tecnologia: formData.tecnologia,
        descuento_combo: parseFloat(formData.descuento_combo) || 0,
        requiere_instalacion: formData.requiere_instalacion,
        aplica_iva: formData.aplica_iva,
        promocional: formData.promocional,
        fecha_inicio_promocion: formData.fecha_inicio_promocion || null,
        fecha_fin_promocion: formData.fecha_fin_promocion || null,
        orden_visualizacion: parseInt(formData.orden_visualizacion) || 0,

        // ✅ CAMPOS ACTUALES DE INSTALACIÓN
        costo_instalacion_permanencia: parseFloat(formData.costo_instalacion_permanencia) || 50000,
        costo_instalacion_sin_permanencia: parseFloat(formData.costo_instalacion_sin_permanencia) || 150000,
        permanencia_minima_meses: parseInt(formData.permanencia_minima_meses) || 6,
        aplica_permanencia: formData.aplica_permanencia,

        // Precios específicos
        precio_internet: parseFloat(formData.precio_internet) || 0,
        precio_television: parseFloat(formData.precio_television) || 0,
        aplica_iva_estrato_123: formData.aplica_iva_estrato_123,
        aplica_iva_estrato_456: formData.aplica_iva_estrato_456,
        precio_internet_sin_iva: parseFloat(formData.precio_internet_sin_iva) || 0,
        precio_television_sin_iva: parseFloat(formData.precio_television_sin_iva) || 0,
        precio_internet_con_iva: parseFloat(formData.precio_internet_con_iva) || 0,
        precio_television_con_iva: parseFloat(formData.precio_television_con_iva) || 0
      };

      let response;
      if (selectedPlan) {
        response = await configService.updateServicePlan(selectedPlan.id, planData);
      } else {
        response = await configService.createServicePlan(planData);
      }

      if (response.success) {
        await cargarDatos();
        setShowModal(false);
        limpiarFormulario();
        alert(selectedPlan ? 'Plan actualizado exitosamente' : 'Plan creado exitosamente');
      } else {
        alert(response.message || 'Error al guardar el plan');
      }
    } catch (error) {
      console.error('Error guardando plan:', error);
      alert('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`¿Estás seguro de eliminar el plan "${plan.nombre}"?`)) {
      return;
    }

    try {
      const response = await configService.deleteServicePlan(plan.id);
      if (response.success) {
        await cargarDatos();
        alert('Plan eliminado exitosamente');
      } else {
        alert(response.message || 'Error al eliminar el plan');
      }
    } catch (error) {
      console.error('Error eliminando plan:', error);
      alert('Error al eliminar el plan');
    }
  };

  const handleToggleStatus = async (plan) => {
    try {
      const response = await configService.toggleServicePlanStatus(plan.id, !plan.activo);
      if (response.success) {
        await cargarDatos();
      } else {
        alert(response.message || 'Error cambiando estado del plan');
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error cambiando estado del plan');
    }
  };

  const handleDuplicate = async (plan) => {
    const nuevoCodigo = prompt('Código para el plan duplicado:', `${plan.codigo}_COPY`);
    const nuevoNombre = prompt('Nombre para el plan duplicado:', `${plan.nombre} (Copia)`);

    if (!nuevoCodigo || !nuevoNombre) return;

    try {
      const response = await configService.duplicateServicePlan(plan.id, {
        nuevo_codigo: nuevoCodigo,
        nuevo_nombre: nuevoNombre
      });

      if (response.success) {
        await cargarDatos();
        await cargarEstadisticas();
        alert('Plan duplicado exitosamente');
      } else {
        alert(response.message || 'Error duplicando plan');
      }
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
      plan.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || plan.tipo === filterType;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && plan.activo) ||
      (filterStatus === 'inactive' && !plan.activo); // ✅ AGREGAR ESTA LÍNEA
    return matchesSearch && matchesFilter && matchesStatus; // ✅ AGREGAR && matchesStatus
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
      descuento_combo: plan.descuento_combo?.toString() || '0',
      requiere_instalacion: plan.requiere_instalacion || false,
      aplica_iva: plan.aplica_iva || false,
      promocional: plan.promocional || false,
      fecha_inicio_promocion: plan.fecha_inicio_promocion || '',
      fecha_fin_promocion: plan.fecha_fin_promocion || '',
      orden_visualizacion: plan.orden_visualizacion?.toString() || '0',

      // ✅ CAMPOS ACTUALES OPTIMIZADOS
      aplica_iva_estrato_123: plan.aplica_iva_estrato_123 || false,
      aplica_iva_estrato_456: plan.aplica_iva_estrato_456 || true,
      precio_internet_sin_iva: plan.precio_internet_sin_iva?.toString() || '',
      precio_television_sin_iva: plan.precio_television_sin_iva?.toString() || '',
      precio_internet_con_iva: plan.precio_internet_con_iva?.toString() || '',
      precio_television_con_iva: plan.precio_television_con_iva?.toString() || '',
      costo_instalacion_permanencia: plan.costo_instalacion_permanencia?.toString() || '50000',
      costo_instalacion_sin_permanencia: plan.costo_instalacion_sin_permanencia?.toString() || '150000',
      permanencia_minima_meses: plan.permanencia_minima_meses?.toString() || '6',
      aplica_permanencia: plan.aplica_permanencia ?? true
    });
    setShowModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'internet': return <Wifi className="w-5 h-5" />;
      case 'television': return <Tv className="w-5 h-5" />;
      case 'combo': return <Package className="w-5 h-5" />;
      default: return <Wifi className="w-5 h-5" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando planes de servicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{estadisticas.total_planes || 0}</div>
            <div className="text-sm text-gray-600">Total Planes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{estadisticas.planes_activos || 0}</div>
            <div className="text-sm text-gray-600">Planes Activos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{estadisticas.promociones_vigentes || 0}</div>
            <div className="text-sm text-gray-600">Promociones</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{formatPrice(estadisticas.precio_promedio)}</div>
            <div className="text-sm text-gray-600">Precio Promedio</div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar planes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="internet">Internet</option>
              <option value="television">Televisión</option>

            </select>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Solo activos</option>
                <option value="inactive">Solo inactivos</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              limpiarFormulario();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Plan
          </button>
        </div>
      </div>

      {/* Lista de planes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlanes.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg shadow-sm border overflow-hidden transition-all duration-200 ${plan.activo
              ? 'bg-white border-gray-200'
              : 'bg-gray-50 border-gray-300 opacity-75'
              }`}
          >
            {/* Header del plan */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(plan.tipo)}`}>
                    {getTypeIcon(plan.tipo)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{plan.nombre}</h3>
                    <p className="text-sm text-gray-600">Código: {plan.codigo}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`p-1 rounded transition-colors ${plan.activo
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    title={plan.activo ? 'Desactivar' : 'Activar'}
                  >
                    {plan.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(plan)}
                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Precio principal */}
              <div className="text-center py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{formatPrice(plan.precio)}</div>
                <div className="text-sm text-gray-600">
                  {plan.segmento === 'residencial' ? 'Residencial' : 'Empresarial'}
                </div>
              </div>
            </div>

            {/* Especificaciones técnicas */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Especificaciones
              </h4>
              <div className="space-y-2 text-sm">
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
                {plan.canales_tv && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Canales TV:</span>
                    <span className="font-medium">{plan.canales_tv}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tecnología:</span>
                  <span className="font-medium">{plan.tecnologia}</span>
                </div>
              </div>
            </div>

            {/* ✅ SECCIÓN OPTIMIZADA: Instalación y Permanencia */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Instalación y Permanencia
              </h4>
              <div className="space-y-2 text-sm">
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
                    <span className="font-medium text-green-600">{formatPrice(plan.costo_instalacion_permanencia)}</span>
                  </div>
                )}
                {plan.costo_instalacion_sin_permanencia > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Costo sin permanencia:</span>
                    <span className="font-medium text-blue-600">{formatPrice(plan.costo_instalacion_sin_permanencia)}</span>
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

            {/* Estado y etiquetas */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {plan.promocional && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Promocional
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Orden: {plan.orden_visualizacion || 0}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedPlan ? 'Editar Plan' : 'Nuevo Plan de Servicio'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  limpiarFormulario();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* COLUMNA 1: Información Básica */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>
                  </div>

                  {/* Código y Nombre */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código del Plan *
                      </label>
                      <input
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.codigo ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Ej: INT100"
                      />
                      {errors.codigo && <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Plan *
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nombre ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Ej: Internet 100MB"
                      />
                      {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
                    </div>
                  </div>

                  {/* Tipo y Segmento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Servicio *
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => handleInputChange('tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="internet">Internet</option>
                        <option value="television">Televisión</option>

                      </select>
                    </div>

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
                  </div>

                  {/* Precio y Tecnología */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Base *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.precio}
                        onChange={(e) => handleInputChange('precio', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.precio ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="45000"
                      />
                      {errors.precio && <p className="mt-1 text-sm text-red-600">{errors.precio}</p>}
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
                        <option value="FTTH (Fibra al Hogar)">FTTH (Fibra al Hogar)</option>
                        <option value="Satelital">Satelital</option>
                      </select>
                    </div>
                  </div>

                  {/* Especificaciones técnicas según tipo */}
                  {(formData.tipo === 'internet' || formData.tipo === 'combo') && (
                    <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-md font-medium text-blue-900 mb-3">Especificaciones de Internet</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">
                            Velocidad Bajada (Mbps) *
                          </label>
                          <input
                            type="number"
                            value={formData.velocidad_bajada}
                            onChange={(e) => handleInputChange('velocidad_bajada', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.velocidad_bajada ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="100"
                          />
                          {errors.velocidad_bajada && <p className="mt-1 text-sm text-red-600">{errors.velocidad_bajada}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">
                            Velocidad Subida (Mbps)
                          </label>
                          <input
                            type="number"
                            value={formData.velocidad_subida}
                            onChange={(e) => handleInputChange('velocidad_subida', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.tipo === 'television' || formData.tipo === 'combo') && (
                    <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-md font-medium text-purple-900 mb-3">Especificaciones de TV</h4>
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Número de Canales *
                        </label>
                        <input
                          type="number"
                          value={formData.canales_tv}
                          onChange={(e) => handleInputChange('canales_tv', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.canales_tv ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="50"
                        />
                        {errors.canales_tv && <p className="mt-1 text-sm text-red-600">{errors.canales_tv}</p>}
                      </div>
                    </div>
                  )}

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción detallada del plan..."
                    />
                  </div>
                </div>

                {/* COLUMNA 2: Configuración Avanzada */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="text-lg font-medium text-gray-900">Configuración Avanzada</h3>
                  </div>

                  {/* ✅ SECCIÓN OPTIMIZADA: Costos de Instalación */}
                  <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-orange-900 mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Instalación y Permanencia
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-orange-700">
                          Requiere instalación
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('requiere_instalacion', !formData.requiere_instalacion)}
                          className={`w-12 h-6 rounded-full transition-colors ${formData.requiere_instalacion ? 'bg-orange-600' : 'bg-gray-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.requiere_instalacion ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-orange-700">
                          Aplica permanencia
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('aplica_permanencia', !formData.aplica_permanencia)}
                          className={`w-12 h-6 rounded-full transition-colors ${formData.aplica_permanencia ? 'bg-orange-600' : 'bg-gray-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.aplica_permanencia ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      {formData.requiere_instalacion && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">
                              Costo instalación CON permanencia
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.costo_instalacion_permanencia}
                              onChange={(e) => handleInputChange('costo_instalacion_permanencia', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="50000"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">
                              Costo instalación SIN permanencia
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.costo_instalacion_sin_permanencia}
                              onChange={(e) => handleInputChange('costo_instalacion_sin_permanencia', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="150000"
                            />
                          </div>
                        </>
                      )}

                      {formData.aplica_permanencia && (
                        <div>
                          <label className="block text-sm font-medium text-orange-700 mb-2">
                            Permanencia mínima (meses)
                          </label>
                          <input
                            type="number"
                            value={formData.permanencia_minima_meses}
                            onChange={(e) => handleInputChange('permanencia_minima_meses', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="6"
                            min="1"
                            max="24"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuración de IVA */}
                  <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-green-900 mb-4">
                      Configuración de IVA
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-green-700">
                          IVA estratos 1, 2, 3
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('aplica_iva_estrato_123', !formData.aplica_iva_estrato_123)}
                          className={`w-12 h-6 rounded-full transition-colors ${formData.aplica_iva_estrato_123 ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.aplica_iva_estrato_123 ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-green-700">
                          IVA estratos 4, 5, 6
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('aplica_iva_estrato_456', !formData.aplica_iva_estrato_456)}
                          className={`w-12 h-6 rounded-full transition-colors ${formData.aplica_iva_estrato_456 ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.aplica_iva_estrato_456 ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="internet">Internet</option>
                    <option value="television">Televisión</option>
                    {/* ELIMINAR: <option value="combo">Combo</option> */}
                  </select>

                  {/* Configuración promocional */}
                  <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-yellow-900 mb-4">
                      Configuración Promocional
                    </h4>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-yellow-700">
                          Plan promocional
                        </label>
                        <button
                          type="button"
                          onClick={() => handleInputChange('promocional', !formData.promocional)}
                          className={`w-12 h-6 rounded-full transition-colors ${formData.promocional ? 'bg-yellow-600' : 'bg-gray-300'
                            }`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.promocional ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                      </div>

                      {formData.promocional && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-yellow-700 mb-2">
                              Fecha inicio
                            </label>
                            <input
                              type="date"
                              value={formData.fecha_inicio_promocion}
                              onChange={(e) => handleInputChange('fecha_inicio_promocion', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-yellow-700 mb-2">
                              Fecha fin
                            </label>
                            <input
                              type="date"
                              value={formData.fecha_fin_promocion}
                              onChange={(e) => handleInputChange('fecha_fin_promocion', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuración adicional */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orden de visualización
                      </label>
                      <input
                        type="number"
                        value={formData.orden_visualizacion}
                        onChange={(e) => handleInputChange('orden_visualizacion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Orden en que aparece en listados (menor número = mayor prioridad)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    limpiarFormulario();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {selectedPlan ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {selectedPlan ? 'Actualizar Plan' : 'Crear Plan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mensaje si no hay planes */}
      {filteredPlanes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No se encontraron planes' : 'No hay planes configurados'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Intenta cambiar los filtros de búsqueda'
              : 'Comienza creando tu primer plan de servicio'
            }
          </p>
          {(!searchTerm && filterType === 'all') && (
            <button
              onClick={() => {
                limpiarFormulario();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ServicePlansConfig;