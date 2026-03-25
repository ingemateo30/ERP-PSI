// frontend/src/components/Instalaciones/InstalacionModal.js - VERSIÓN MEJORADA CON DETALLES COMPLETOS

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  Package, 
  AlertCircle,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  FileText,
  DollarSign,
  Navigation,
  MessageSquare,
  Users,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

import { instalacionesService } from '../../services/instalacionesService';
import { useAuth } from '../../contexts/AuthContext';

const InstalacionModal = ({ 
  instalacion = null, 
  modo = 'crear', // crear, editar, ver
  onCerrar, 
  onGuardar 
}) => {
  
  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    servicio_cliente_id: '',
    instalador_id: '',
    fecha_programada: '',
    hora_programada: '09:00',
    direccion_instalacion: '',
    barrio: '',
    telefono_contacto: '',
    persona_recibe: '',
    tipo_instalacion: 'nueva',
    observaciones: '',
    equipos_instalados: [],
    costo_instalacion: 0,
    coordenadas_lat: '',
    coordenadas_lng: '',
    estado: 'programada'
  });

  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState({});
  const [pestañaActiva, setPestañaActiva] = useState('general');

  // Estados para datos auxiliares
  const [clientes, setClientes] = useState([]);
  const [serviciosCliente, setServiciosCliente] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  
  // Estados para búsqueda de cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const { user } = useAuth();

  // ==========================================
  // CONFIGURACIÓN DE PESTAÑAS
  // ==========================================
  
  const pestañas = [
    { id: 'general',  nombre: 'Información General', icono: User },
    { id: 'detalles', nombre: 'Detalles Técnicos',   icono: Settings },
    { id: 'ubicacion',nombre: 'Ubicación',            icono: MapPin },
    { id: 'fotos',    nombre: 'Fotos',                icono: Eye },
    { id: 'historial',nombre: 'Historial',            icono: Clock }
  ];

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    if (instalacion) {
      console.log('🔍 Cargando datos de instalación:', instalacion);
      const fechaProgramada = instalacion.fecha_programada
        ? instalacion.fecha_programada.split('T')[0]
        : '';
      setFormData({
        ...instalacion,
        fecha_programada: fechaProgramada,
        equipos_instalados: instalacion.equipos_instalados || [],
        costo_instalacion: instalacion.costo_instalacion || 0
      });

      if (instalacion.cliente_id) {
        buscarClientePorId(instalacion.cliente_id);
      }

      // En modo ver, cargar los detalles completos (incluyendo fotos) desde el API
      if (modo === 'ver' && instalacion.id) {
        cargarDetalleCompleto(instalacion.id);
      }
    }

    if (modo !== 'ver') {
      cargarDatosAuxiliares();
    }
  }, [instalacion, modo]);

  useEffect(() => {
    if (formData.cliente_id) {
      cargarServiciosCliente(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarDatosAuxiliares = useCallback(async () => {
    try {
      setCargando(true);
      
      const [clientesRes, instaladoresRes, equiposRes] = await Promise.all([
        instalacionesService.getClientes(),
        instalacionesService.getInstaladores(),
        instalacionesService.getEquiposDisponibles()
      ]);

      if (clientesRes.success) {
        setClientes(clientesRes.clientes || []);
      }
      
      if (instaladoresRes.success) {
        setInstaladores(instaladoresRes.instaladores || []);
      }
      
      if (equiposRes.success) {
        setEquiposDisponibles(equiposRes.equipos || []);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos auxiliares:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  const buscarClientePorId = async (clienteId) => {
    try {
      const response = await instalacionesService.getClienteById(clienteId);
      if (response.success) {
        setClienteSeleccionado(response.cliente);
      }
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
    }
  };

  const cargarServiciosCliente = async (clienteId) => {
    try {
      const response = await instalacionesService.getServiciosCliente(clienteId);
      if (response.success) {
        setServiciosCliente(response.servicios || []);
      }
    } catch (error) {
      console.error('❌ Error cargando servicios del cliente:', error);
    }
  };

  // Carga detalles completos (fotos, plan, etc.) cuando se visualiza una instalación
  const cargarDetalleCompleto = async (instalacionId) => {
    try {
      const response = await instalacionesService.getInstalacion(instalacionId);
      if (response.success && response.instalacion) {
        const det = response.instalacion;
        const fechaProgramada = det.fecha_programada
          ? det.fecha_programada.split('T')[0]
          : '';
        setFormData(prev => ({
          ...prev,
          ...det,
          fecha_programada: fechaProgramada,
          equipos_instalados: det.equipos_instalados || prev.equipos_instalados || [],
          fotos_instalacion: Array.isArray(det.fotos_instalacion)
            ? det.fotos_instalacion
            : (typeof det.fotos_instalacion === 'string' ? JSON.parse(det.fotos_instalacion || '[]') : [])
        }));
      }
    } catch (error) {
      console.error('❌ Error cargando detalle completo:', error);
    }
  };

  // ==========================================
  // FUNCIONES DE MANEJO DE FORMULARIO
  // ==========================================

  const handleChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Limpiar error del campo
    if (errores[campo]) {
      setErrores(prev => ({
        ...prev,
        [campo]: null
      }));
    }
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  
  console.log('🔵 handleSubmit ejecutado');
  console.log('🔵 Modo:', modo);
  console.log('🔵 User:', user);
  console.log('🔵 FormData:', formData);
  
  if (modo === 'ver') {
    onCerrar();
    return;
  }

  const erroresValidacion = validarFormulario();
  console.log('🔵 Errores de validación:', erroresValidacion);
  
  if (Object.keys(erroresValidacion).length > 0) {
    setErrores(erroresValidacion);
    console.log('❌ Validación falló');
    return;
  }

  console.log('🔵 Iniciando guardado...');
  setProcesando(true);
  
  try {
    console.log('🔵 Llamando onGuardar...');
    await onGuardar(formData);
    console.log('✅ Guardado exitoso');
  } catch (error) {
    console.error('❌ Error en submit:', error);
    
    // Mostrar mensaje amigable según el tipo de error
    if (error.message && error.message.includes('Ya existe una instalación pendiente')) {
      alert('⚠️ Este servicio ya tiene una instalación pendiente.\n\nPor favor, completa o cancela la instalación existante antes de crear una nueva.');
    } else if (error.message) {
      alert(`❌ Error al guardar la instalación:\n\n${error.message}`);
    } else {
      alert('❌ Ocurrió un error desconocido al guardar la instalación.');
    }
  } finally {
    setProcesando(false);
  }
};
const validarFormulario = () => {
  const errores = {};

  if (!formData.cliente_id) {
    errores.cliente_id = 'Debe seleccionar un cliente';
  }

  if (!formData.fecha_programada) {
    errores.fecha_programada = 'La fecha es obligatoria';
  }

  // ✅ CORREGIDO: Solo validar si estamos creando (modo crear)
  // En modo editar, permitir que estos campos estén vacíos temporalmente
  if (modo === 'crear') {
    if (!formData.direccion_instalacion?.trim()) {
      errores.direccion_instalacion = 'La dirección es obligatoria';
    }

    if (!formData.telefono_contacto?.trim()) {
      errores.telefono_contacto = 'El teléfono de contacto es obligatorio';
    }
  }

  return errores;
};
  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const obtenerNombreEstado = (estado) => {
    const nombres = {
      'programada': 'Programada',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada',
      'reagendada': 'Reagendada'
    };
    return nombres[estado] || estado;
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      'programada': 'bg-blue-100 text-blue-800',
      'en_proceso': 'bg-yellow-100 text-yellow-800',
      'completada': 'bg-green-100 text-green-800',
      'cancelada': 'bg-red-100 text-red-800',
      'reagendada': 'bg-orange-100 text-orange-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const datePart = (typeof fecha === 'string' ? fecha : fecha.toISOString()).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaCorta = (fecha) => {
    if (!fecha) return '-';
    const datePart = (typeof fecha === 'string' ? fecha : fecha.toISOString()).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO');
  };

  const formatearHora = (hora) => {
    if (!hora) return '-';
    return hora.substring(0, 5);
  };

  // ==========================================
  // COMPONENTES DE RENDERIZADO
  // ==========================================

  const renderEncabezado = () => (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {modo === 'ver' ? (
            <Eye className="w-8 h-8 text-blue-600" />
          ) : modo === 'editar' ? (
            <Settings className="w-8 h-8 text-orange-600" />
          ) : (
            <Plus className="w-8 h-8 text-green-600" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {modo === 'crear' && 'Nueva Instalación'}
            {modo === 'editar' && 'Editar Instalación'}
            {modo === 'ver' && `Instalación #${instalacion?.id || ''}`}
          </h3>
          <p className="text-sm text-gray-600">
            {modo === 'crear' && 'Programa una nueva instalación de servicio'}
            {modo === 'editar' && 'Modifica los datos de la instalación'}
            {modo === 'ver' && `Cliente: ${instalacion?.cliente_nombre || 'No especificado'}`}
          </p>
        </div>
      </div>

      {/* Estado de la instalación en modo ver */}
      {modo === 'ver' && instalacion?.estado && (
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${obtenerColorEstado(instalacion.estado)}`}>
            {obtenerNombreEstado(instalacion.estado)}
          </span>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Botón cerrar para otros modos */}
      {modo !== 'ver' && (
        <button
          onClick={onCerrar}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );

  const renderPestañas = () => (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {pestañas.map((pestaña) => {
          const Icono = pestaña.icono;
          const activa = pestañaActiva === pestaña.id;
          
          // En modo ver, ocultar pestañas que no tienen datos relevantes
          if (modo === 'ver') {
            if (pestaña.id === 'equipos' && (!formData.equipos_instalados || formData.equipos_instalados.length === 0)) {
              return null;
            }
          }
          
          return (
            <button
              key={pestaña.id}
              type="button"
              onClick={() => setPestañaActiva(pestaña.id)}
              className={`${
                activa
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Icono className="w-4 h-4" />
              <span>{pestaña.nombre}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderPestañaGeneral = () => (
    <div className="space-y-6">
      {modo === 'ver' ? (
        // Vista de solo lectura con información completa
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información del Cliente */}
<div className="bg-gray-50 p-4 rounded-lg">
  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
    <User className="w-4 h-4 mr-2" />
    Información del Cliente
  </h4>
  <div className="space-y-2">
    <div>
      <span className="text-sm text-gray-600">Nombre:</span>
      <p className="font-medium">{instalacion?.cliente_nombre || 'No especificado'}</p>
    </div>
    <div>
      <span className="text-sm text-gray-600">Identificación:</span>
      <p className="font-medium">{instalacion?.cliente_identificacion || 'No especificado'}</p>
    </div>
    <div>
      <span className="text-sm text-gray-600">Teléfono:</span>
      <p className="font-medium">{instalacion?.cliente_telefono || 'No especificado'}</p>
    </div>
    <div>
      <span className="text-sm text-gray-600">Dirección:</span>
      <p className="font-medium">{instalacion?.cliente_direccion || 'No especificada'}</p>
    </div>
    <div>
      <span className="text-sm text-gray-600">Email:</span>
      <p className="font-medium">{instalacion?.cliente_email || 'No especificado'}</p>
    </div>
  </div>
</div>

          {/* Información de la Programación */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Programación
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Fecha programada:</span>
                <p className="font-medium">{formatearFecha(instalacion?.fecha_programada)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Hora:</span>
                <p className="font-medium">{formatearHora(instalacion?.hora_programada)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tipo:</span>
                <p className="font-medium capitalize">{instalacion?.tipo_instalacion || 'Nueva'}</p>
              </div>
            </div>
          </div>

          {/* Información del Instalador */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Navigation className="w-4 h-4 mr-2" />
              Instalador Asignado
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Nombre:</span>
                <p className="font-medium">{instalacion?.instalador_nombre || 'Sin asignar'}</p>
              </div>
              {instalacion?.instalador_telefono && (
                <div>
                  <span className="text-sm text-gray-600">Teléfono:</span>
                  <p className="font-medium">{instalacion.instalador_telefono}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información de Contacto */}
<div className="bg-gray-50 p-4 rounded-lg">
  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
    <Phone className="w-4 h-4 mr-2" />
    Contacto en Instalación
  </h4>
  <div className="space-y-2">
    <div>
      <span className="text-sm text-gray-600">Teléfono:</span>
      <p className="font-medium">{instalacion?.telefono_contacto || 'No especificado'}</p>
    </div>
  </div>
</div>
        </div>
      ) : (
        // Formulario de edición/creación
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selección de Cliente */}
          <div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Cliente *
  </label>
  {/* Search filter for client selector */}
  <input
    type="text"
    value={busquedaCliente}
    onChange={e => setBusquedaCliente(e.target.value)}
    placeholder="Filtrar por nombre o identificación..."
    className="w-full px-3 py-2 mb-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
  />
  <select
    value={formData.cliente_id}
    onChange={(e) => handleChange('cliente_id', e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    size={6}
  >
    <option value="">— Seleccionar cliente —</option>
    {clientes
      .filter(c => {
        if (!busquedaCliente.trim()) return true;
        const q = busquedaCliente.toLowerCase();
        return (c.nombre || '').toLowerCase().includes(q) ||
               (c.identificacion || '').toLowerCase().includes(q);
      })
      .map(cliente => (
        <option key={cliente.id} value={cliente.id}>
          {cliente.nombre} — {cliente.identificacion}
        </option>
      ))}
  </select>
  {formData.cliente_id && clienteSeleccionado && (
    <p className="mt-1 text-xs text-green-600 font-medium">
      ✓ {clienteSeleccionado.nombre} ({clienteSeleccionado.identificacion})
    </p>
  )}
  {errores.cliente_id && (
    <p className="mt-1 text-sm text-red-600">{errores.cliente_id}</p>
  )}
</div>

          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha programada *
            </label>
            <input
              type="date"
              value={formData.fecha_programada}
              onChange={(e) => handleChange('fecha_programada', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errores.fecha_programada && (
              <p className="mt-1 text-sm text-red-600">{errores.fecha_programada}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora programada
            </label>
            <input
              type="time"
              value={formData.hora_programada}
              onChange={(e) => handleChange('hora_programada', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Tipo de instalación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de instalación
            </label>
            <select
              value={formData.tipo_instalacion}
              onChange={(e) => handleChange('tipo_instalacion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="nueva">Nueva instalación</option>
              <option value="reubicacion">Reubicación</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="reparacion">Reparación</option>
            </select>
          </div>

          {/* Instalador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instalador asignado
            </label>
            <select
              value={formData.instalador_id}
              onChange={(e) => handleChange('instalador_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar instalador...</option>
              {instaladores.map(instalador => (
                <option key={instalador.id} value={instalador.id}>
                  {instalador.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderPestañaDetalles = () => (
    <div className="space-y-6">
      {modo === 'ver' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detalles Técnicos */}
<div className="bg-gray-50 p-4 rounded-lg">
  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
    <Settings className="w-4 h-4 mr-2" />
    Detalles Técnicos
  </h4>
  <div className="grid grid-cols-2 gap-2">
    {[
      { label: 'IP Asignada',   val: formData?.ip_asignada },
      { label: 'MAC Address',   val: formData?.mac_address },
      { label: 'ONT ID',        val: formData?.ont_id },
      { label: 'TAP',           val: formData?.tap },
      { label: 'Plan',          val: formData?.plan_nombre },
      { label: 'Precio Plan',   val: formData?.plan_precio ? `$${Number(formData.plan_precio).toLocaleString('es-CO')}` : null },
      { label: 'Costo Instalación', val: formData?.costo_instalacion ? `$${Number(formData.costo_instalacion).toLocaleString('es-CO')}` : null },
      { label: 'Persona Recibe', val: formData?.persona_recibe },
    ].map(({ label, val }) => (
      <div key={label}>
        <span className="text-xs text-gray-500">{label}:</span>
        <p className="text-sm font-medium text-gray-800">{val || <span className="text-gray-400 italic">—</span>}</p>
      </div>
    ))}
  </div>
</div>


          {/* Fechas importantes */}
          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Historial de Fechas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">Creado:</span>
                <p className="font-medium">{formatearFechaCorta(instalacion?.created_at)}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Última actualización:</span>
                <p className="font-medium">{formatearFechaCorta(instalacion?.updated_at)}</p>
              </div>
              {instalacion?.fecha_completada && (
                <div>
                  <span className="text-sm text-gray-600">Completada:</span>
                  <p className="font-medium">{formatearFechaCorta(instalacion.fecha_completada)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Persona de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona que recibe
              </label>
              <input
                type="text"
                value={formData.persona_recibe}
                onChange={(e) => handleChange('persona_recibe', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre de quien recibe..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de contacto *
              </label>
              <input
                type="tel"
                value={formData.telefono_contacto}
                onChange={(e) => handleChange('telefono_contacto', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Teléfono..."
              />
              {errores.telefono_contacto && (
                <p className="mt-1 text-sm text-red-600">{errores.telefono_contacto}</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );

  const renderPestañaUbicacion = () => (
    <div className="space-y-6">
      {modo === 'ver' ? (
        <div className="space-y-4">
          {/* Dirección completa */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Dirección de Instalación
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Dirección:</span>
                <p className="font-medium">{instalacion?.direccion_instalacion || 'No especificada'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Barrio:</span>
                <p className="font-medium">{instalacion?.barrio || 'No especificado'}</p>
              </div>
              {instalacion?.ciudad && (
                <div>
                  <span className="text-sm text-gray-600">Ciudad:</span>
                  <p className="font-medium">{instalacion.ciudad}</p>
                </div>
              )}
            </div>
          </div>

          {/* Coordenadas si están disponibles */}
          {(instalacion?.coordenadas_lat || instalacion?.coordenadas_lng) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Navigation className="w-4 h-4 mr-2" />
                Coordenadas GPS
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Latitud:</span>
                  <p className="font-medium">{instalacion.coordenadas_lat}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Longitud:</span>
                  <p className="font-medium">{instalacion.coordenadas_lng}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección de instalación *
            </label>
            <textarea
              value={formData.direccion_instalacion}
              onChange={(e) => handleChange('direccion_instalacion', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Dirección completa de la instalación..."
            />
            {errores.direccion_instalacion && (
              <p className="mt-1 text-sm text-red-600">{errores.direccion_instalacion}</p>
            )}
          </div>

          {/* Barrio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barrio
            </label>
            <input
              type="text"
              value={formData.barrio}
              onChange={(e) => handleChange('barrio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Barrio o sector..."
            />
          </div>

          {/* Coordenadas GPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coordenada Latitud
              </label>
              <input
                type="text"
                value={formData.coordenadas_lat}
                onChange={(e) => handleChange('coordenadas_lat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 4.6097100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coordenada Longitud
              </label>
              <input
                type="text"
                value={formData.coordenadas_lng}
                onChange={(e) => handleChange('coordenadas_lng', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: -74.0817500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const renderPestañaHistorial = () => (
    <div className="space-y-6">
      {modo === 'ver' && instalacion ? (
        <div>
          {/* Observaciones */}
          {instalacion.observaciones && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Observaciones
              </h4>
              <p className="text-gray-700">{instalacion.observaciones}</p>
            </div>
          )}

          {/* Historial de cambios */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Historial de la Instalación
            </h4>
            <div className="space-y-3">
              {/* Creación */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Instalación creada</p>
                  <p className="text-sm text-gray-600">
                    {formatearFecha(instalacion.created_at)}
                    {instalacion.creado_por && ` por ${instalacion.creado_por}`}
                  </p>
                </div>
              </div>

              {/* Asignación de instalador */}
              {instalacion.instalador_nombre && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Instalador asignado</p>
                    <p className="text-sm text-gray-600">
                      {instalacion.instalador_nombre}
                    </p>
                  </div>
                </div>
              )}

              {/* Cambios de estado */}
              {instalacion.estado !== 'programada' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      instalacion.estado === 'completada' ? 'bg-green-400' :
                      instalacion.estado === 'cancelada' ? 'bg-red-400' :
                      instalacion.estado === 'en_proceso' ? 'bg-yellow-400' :
                      'bg-orange-400'
                    }`}></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Estado cambiado a: {obtenerNombreEstado(instalacion.estado)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatearFecha(instalacion.updated_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Completada */}
              {instalacion.fecha_completada && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Instalación completada</p>
                    <p className="text-sm text-gray-600">
                      {formatearFecha(instalacion.fecha_completada)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          {(instalacion.motivo_cancelacion || instalacion.observaciones_tecnicas) && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Información Adicional
              </h4>
              {instalacion.motivo_cancelacion && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-700">Motivo de cancelación:</span>
                  <p className="text-sm text-gray-600">{instalacion.motivo_cancelacion}</p>
                </div>
              )}
              {instalacion.observaciones_tecnicas && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Observaciones técnicas:</span>
                  <p className="text-sm text-gray-600">{instalacion.observaciones_tecnicas}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => handleChange('observaciones', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Observaciones adicionales sobre la instalación..."
          />
        </div>
      )}
    </div>
  );

  const renderPestañaFotos = () => {
    const fotos = formData.fotos_instalacion || [];
    const apiBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api/v1', '')
      : 'http://45.173.69.5:3000';

    return (
      <div className="space-y-4">
        {fotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Eye className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No hay fotos registradas para esta instalación</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">{fotos.length} foto(s) adjunta(s)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {fotos.map((foto, idx) => {
                const src = foto.startsWith('http') ? foto : `${apiBase}/${foto.replace(/^\//, '')}`;
                return (
                  <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={src}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

 const renderContenidoPestaña = () => {
    switch (pestañaActiva) {
      case 'general':
        return renderPestañaGeneral();
      case 'detalles':
        return renderPestañaDetalles();
      case 'fotos':
        return renderPestañaFotos();
      case 'ubicacion':
        return renderPestañaUbicacion();
      case 'historial':
        return renderPestañaHistorial();
      default:
        return renderPestañaGeneral();
    }
  };
  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
          {/* Encabezado */}
          {renderEncabezado()}

          {/* Pestañas */}
          {renderPestañas()}

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-6">
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando datos...</p>
                </div>
              </div>
            ) : (
              renderContenidoPestaña()
            )}
          </div>

          {/* Botones de acción */}
          {modo !== 'ver' && (
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onCerrar}
                disabled={procesando}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                type="submit"
                disabled={procesando || cargando}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  modo === 'crear' ? 'Crear Instalación' : 'Actualizar Instalación'
                )}
              </button>
            </div>
          )}

          {/* Solo botón cerrar en modo ver */}
          {modo === 'ver' && (
            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onCerrar}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default InstalacionModal;