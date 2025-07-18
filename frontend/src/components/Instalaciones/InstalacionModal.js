// frontend/src/components/Instalaciones/InstalacionModal.js - VERSIÓN COMPLETA

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Clock, 
  Package, 
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  Eye,
  Edit3
} from 'lucide-react';

import { instalacionesService } from '../../services/instalacionesService';
import { useAuth } from '../../contexts/AuthContext';

const InstalacionModal = ({ 
  instalacion = null, 
  modo = 'crear', // crear, editar, ver, completar, reagendar
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
    hora_programada: '',
    direccion_instalacion: '',
    barrio: '',
    telefono_contacto: '',
    persona_recibe: '',
    tipo_instalacion: 'nueva',
    observaciones: '',
    equipos_instalados: [],
    costo_instalacion: 0,
    coordenadas_lat: '',
    coordenadas_lng: ''
  });

  const [datosCompletacion, setDatosCompletacion] = useState({
    fecha_realizada: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    equipos_finales: [],
    fotos_instalacion: [],
    observaciones_finales: ''
  });

  // Estados de UI
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState({});
  const [pestañaActiva, setPestañaActiva] = useState('general');

  // Estados para datos auxiliares
  const [clientes, setClientes] = useState([]);
  const [serviciosCliente, setServiciosCliente] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  
  // Estados para búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const { user } = useAuth();

  // ==========================================
  // CONFIGURACIÓN DE PESTAÑAS
  // ==========================================
  
  const pestañas = [
    { id: 'general', nombre: 'Información General', icono: User },
    { id: 'ubicacion', nombre: 'Ubicación', icono: MapPin },
    { id: 'equipos', nombre: 'Equipos', icono: Package },
    ...(modo === 'completar' ? [{ id: 'completacion', nombre: 'Completar', icono: CheckCircle }] : [])
  ];

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (instalacion) {
      cargarDatosInstalacion(instalacion);
    }
  }, [instalacion]);

  useEffect(() => {
    if (formData.cliente_id) {
      cargarServiciosCliente(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  // ==========================================
  // CARGA DE DATOS
  // ==========================================

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      // Cargar instaladores
      const responseInstaladores = await instalacionesService.getInstaladores();
      if (responseInstaladores.success) {
        setInstaladores(responseInstaladores.instaladores);
      }

      // Cargar equipos disponibles
      const responseEquipos = await instalacionesService.getEquiposDisponibles();
      if (responseEquipos.success) {
        setEquiposDisponibles(responseEquipos.equipos);
      }

    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    } finally {
      setCargando(false);
    }
  };

 const cargarDatosInstalacion = (instalacion) => {
  console.log('📋 Cargando datos de instalación:', instalacion);
  
  // ✅ Manejar servicio_cliente_id múltiple
  let servicioClienteId = instalacion.servicio_cliente_id;
  
  // Si es un JSON array, tomar el primer elemento para compatibilidad
  if (typeof servicioClienteId === 'string' && servicioClienteId.startsWith('[')) {
    try {
      const serviciosArray = JSON.parse(servicioClienteId);
      servicioClienteId = serviciosArray[0] || '';
    } catch (error) {
      console.warn('Error parseando servicios múltiples:', error);
      servicioClienteId = '';
    }
  }

  setFormData({
    cliente_id: instalacion.cliente_id || '',
    servicio_cliente_id: servicioClienteId,
    fecha_programada: instalacion.fecha_programada || '',
    hora_programada: instalacion.hora_programada || '09:00',
    direccion_instalacion: instalacion.direccion_instalacion || '',
    barrio: instalacion.barrio || '',
    telefono_contacto: instalacion.telefono_contacto || '',
    persona_recibe: instalacion.persona_recibe || '',
    tipo_instalacion: instalacion.tipo_instalacion || 'nueva',
    estado: instalacion.estado || 'programada',
    equipos_requeridos: Array.isArray(instalacion.equipos_requeridos) ? 
      instalacion.equipos_requeridos : 
      (typeof instalacion.equipos_requeridos === 'string' ? 
        JSON.parse(instalacion.equipos_requeridos || '[]') : []),
    observaciones: instalacion.observaciones || '',
    // ✅ CORRECCIÓN: Usar costo calculado correctamente
    costo_instalacion: instalacion.costo_instalacion || 0,
    coordenadas_lat: instalacion.coordenadas_lat || '',
    coordenadas_lng: instalacion.coordenadas_lng || ''
  });

  // Mostrar información de múltiples servicios si existe
  if (instalacion.observaciones) {
    try {
      const obs = JSON.parse(instalacion.observaciones);
      if (obs.cantidad_servicios > 1) {
        console.log(`📊 Instalación para ${obs.cantidad_servicios} servicios:`, obs.servicios_descripcion);
      }
    } catch (error) {
      console.warn('Error parseando observaciones:', error);
    }
  }

  // Si hay información del cliente, cargarla
  if (instalacion.cliente_nombre) {
    setClienteSeleccionado({
      id: instalacion.cliente_id,
      nombre_completo: instalacion.cliente_nombre,
      identificacion: instalacion.cliente_identificacion,
      telefono: instalacion.cliente_telefono
    });
  }
};

  const cargarServiciosCliente = async (clienteId) => {
    try {
      const response = await instalacionesService.getServiciosCliente(clienteId);
      if (response.success) {
        setServiciosCliente(response.data);
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
    }
  };

  // ==========================================
  // MANEJO DEL FORMULARIO
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

  const buscarClientes = useCallback(async (termino) => {
    if (termino.length < 2) {
      setClientes([]);
      return;
    }
    
    try {
      const response = await instalacionesService.getClientes(termino);
      if (response.success) {
        setClientes(response.data);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    }
  }, []);

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    handleChange('cliente_id', cliente.id);
    setBusquedaCliente('');
    setClientes([]);
    
    // Prellenar datos del cliente
    if (cliente.telefono && !formData.telefono_contacto) {
      handleChange('telefono_contacto', cliente.telefono);
    }
    if (cliente.direccion && !formData.direccion_instalacion) {
      handleChange('direccion_instalacion', cliente.direccion);
    }
  };

  // ==========================================
  // MANEJO DE EQUIPOS
  // ==========================================

  const agregarEquipo = () => {
    const nuevosEquipos = [...formData.equipos_instalados, {
      equipo_id: '',
      equipo_codigo: '',
      equipo_nombre: '',
      cantidad: 1,
      numero_serie: '',
      observaciones: ''
    }];
    handleChange('equipos_instalados', nuevosEquipos);
  };

  const actualizarEquipo = (index, campo, valor) => {
    const equiposActualizados = [...formData.equipos_instalados];
    equiposActualizados[index] = {
      ...equiposActualizados[index],
      [campo]: valor
    };

    // Si cambia el equipo, actualizar nombre y código
    if (campo === 'equipo_id' && valor) {
      const equipo = equiposDisponibles.find(e => e.id === parseInt(valor));
      if (equipo) {
        equiposActualizados[index].equipo_codigo = equipo.codigo;
        equiposActualizados[index].equipo_nombre = equipo.nombre;
      }
    }

    handleChange('equipos_instalados', equiposActualizados);
  };

  const eliminarEquipo = (index) => {
    const equiposActualizados = formData.equipos_instalados.filter((_, i) => i !== index);
    handleChange('equipos_instalados', equiposActualizados);
  };

  // ==========================================
  // VALIDACIÓN Y ENVÍO
  // ==========================================

  const validarFormulario = () => {
    const nuevosErrores = {};

    // Validaciones básicas
    if (!formData.cliente_id) {
      nuevosErrores.cliente_id = 'El cliente es obligatorio';
    }

    if (!formData.servicio_cliente_id) {
      nuevosErrores.servicio_cliente_id = 'El servicio del cliente es obligatorio';
    }

    if (!formData.fecha_programada) {
      nuevosErrores.fecha_programada = 'La fecha programada es obligatoria';
    } else {
      const fecha = new Date(formData.fecha_programada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fecha < hoy && modo === 'crear') {
        nuevosErrores.fecha_programada = 'La fecha no puede ser anterior a hoy';
      }
    }

    if (!formData.direccion_instalacion.trim()) {
      nuevosErrores.direccion_instalacion = 'La dirección de instalación es obligatoria';
    }

    if (!formData.telefono_contacto.trim()) {
      nuevosErrores.telefono_contacto = 'El teléfono de contacto es obligatorio';
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(formData.telefono_contacto)) {
      nuevosErrores.telefono_contacto = 'Formato de teléfono inválido';
    }

    if (formData.costo_instalacion < 0) {
      nuevosErrores.costo_instalacion = 'El costo no puede ser negativo';
    }

    // Validaciones específicas para completar
    if (modo === 'completar') {
      if (!datosCompletacion.fecha_realizada) {
        nuevosErrores.fecha_realizada = 'La fecha de realización es obligatoria';
      }
      if (!datosCompletacion.hora_inicio) {
        nuevosErrores.hora_inicio = 'La hora de inicio es obligatoria';
      }
      if (!datosCompletacion.hora_fin) {
        nuevosErrores.hora_fin = 'La hora de fin es obligatoria';
      }
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      setPestañaActiva('general'); // Ir a la primera pestaña donde pueden estar los errores
      return;
    }

    setProcesando(true);
    
    try {
      let response;
      
      if (modo === 'crear') {
        response = await instalacionesService.createInstalacion(formData);
      } else if (modo === 'editar') {
        response = await instalacionesService.updateInstalacion(instalacion.id, formData);
      } else if (modo === 'completar') {
        // Combinar datos de formulario con datos de completación
        const datosCompletos = {
          ...formData,
          ...datosCompletacion,
          estado: 'completada'
        };
        response = await instalacionesService.cambiarEstado(instalacion.id, 'completada', datosCompletos);
      } else if (modo === 'reagendar') {
        response = await instalacionesService.reagendarInstalacion(
          instalacion.id,
          formData.fecha_programada,
          formData.hora_programada,
          formData.observaciones
        );
      }

      if (response && response.success) {
        if (onGuardar) {
          onGuardar(response.instalacion);
        }
        onCerrar();
      }
    } catch (error) {
      console.error('Error guardando instalación:', error);
      setErrores({ general: error.message || 'Error al guardar la instalación' });
    } finally {
      setProcesando(false);
    }
  };

  // ==========================================
  // RENDERIZADO DE PESTAÑAS
  // ==========================================

  const renderPestañaGeneral = () => (
    <div className="space-y-6">
      {/* Selección de Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente *
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{clienteSeleccionado?.nombre_completo}</p>
            <p className="text-sm text-gray-600">ID: {clienteSeleccionado?.identificacion}</p>
          </div>
        ) : clienteSeleccionado ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-blue-900">{clienteSeleccionado.nombre_completo}</p>
              <p className="text-sm text-blue-600">ID: {clienteSeleccionado.identificacion}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClienteSeleccionado(null);
                handleChange('cliente_id', '');
                handleChange('servicio_cliente_id', '');
                setServiciosCliente([]);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={busquedaCliente}
              onChange={(e) => {
                setBusquedaCliente(e.target.value);
                buscarClientes(e.target.value);
              }}
              placeholder="Buscar cliente por nombre, ID o teléfono..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {clientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{cliente.nombre_completo}</div>
                    <div className="text-sm text-gray-600">
                      ID: {cliente.identificacion} • Tel: {cliente.telefono}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {errores.cliente_id && (
          <p className="mt-1 text-sm text-red-600">{errores.cliente_id}</p>
        )}
      </div>

      {/* Servicio del Cliente */}
      {formData.cliente_id && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Servicio del Cliente *
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {serviciosCliente.find(s => s.id === formData.servicio_cliente_id)?.plan_nombre || 'No especificado'}
            </div>
          ) : (
            <select
              value={formData.servicio_cliente_id}
              onChange={(e) => handleChange('servicio_cliente_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar servicio...</option>
              {serviciosCliente.map(servicio => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.plan_nombre} - ${servicio.precio_mensual?.toLocaleString()}
                </option>
              ))}
            </select>
          )}
          
          {errores.servicio_cliente_id && (
            <p className="mt-1 text-sm text-red-600">{errores.servicio_cliente_id}</p>
          )}
        </div>
      )}

      {/* Instalador */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instalador
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            {instaladores.find(i => i.id === formData.instalador_id)?.nombre_completo || 'Sin asignar'}
          </div>
        ) : (
          <select
            value={formData.instalador_id}
            onChange={(e) => handleChange('instalador_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin asignar</option>
            {instaladores.map(instalador => (
              <option key={instalador.id} value={instalador.id}>
                {instalador.nombre_completo} ({instalador.instalaciones_activas} activas)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Programada *
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.fecha_programada ? 
                new Date(formData.fecha_programada).toLocaleDateString('es-CO') : 
                'No especificada'
              }
            </div>
          ) : (
            <input
              type="date"
              value={formData.fecha_programada}
              onChange={(e) => handleChange('fecha_programada', e.target.value)}
              min={modo === 'crear' ? new Date().toISOString().split('T')[0] : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          {errores.fecha_programada && (
            <p className="mt-1 text-sm text-red-600">{errores.fecha_programada}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora Programada
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.hora_programada || 'No especificada'}
            </div>
          ) : (
            <input
              type="time"
              value={formData.hora_programada}
              onChange={(e) => handleChange('hora_programada', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      {/* Tipo de Instalación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Instalación
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            {formData.tipo_instalacion === 'nueva' ? 'Nueva Instalación' :
             formData.tipo_instalacion === 'migracion' ? 'Migración' :
             formData.tipo_instalacion === 'upgrade' ? 'Actualización' :
             formData.tipo_instalacion === 'reparacion' ? 'Reparación' :
             formData.tipo_instalacion}
          </div>
        ) : (
          <select
            value={formData.tipo_instalacion}
            onChange={(e) => handleChange('tipo_instalacion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="nueva">Nueva Instalación</option>
            <option value="migracion">Migración</option>
            <option value="upgrade">Actualización</option>
            <option value="reparacion">Reparación</option>
          </select>
        )}
      </div>

      {/* Costo de Instalación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Costo de Instalación
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            ${formData.costo_instalacion?.toLocaleString() || '0'}
          </div>
        ) : (
          <input
            type="number"
            min="0"
            step="1000"
            value={formData.costo_instalacion}
            onChange={(e) => handleChange('costo_instalacion', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        )}
        
        {errores.costo_instalacion && (
          <p className="mt-1 text-sm text-red-600">{errores.costo_instalacion}</p>
        )}
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg min-h-[80px]">
            {formData.observaciones || 'Sin observaciones'}
          </div>
        ) : (
          <textarea
            value={formData.observaciones}
            onChange={(e) => handleChange('observaciones', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observaciones adicionales..."
          />
        )}
      </div>
    </div>
  );

  const renderPestañaUbicacion = () => (
    <div className="space-y-6">
      {/* Dirección de Instalación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección de Instalación *
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            {formData.direccion_instalacion || 'No especificada'}
          </div>
        ) : (
          <textarea
            value={formData.direccion_instalacion}
            onChange={(e) => handleChange('direccion_instalacion', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dirección completa de la instalación..."
          />
        )}
        
        {errores.direccion_instalacion && (
          <p className="mt-1 text-sm text-red-600">{errores.direccion_instalacion}</p>
        )}
      </div>

      {/* Barrio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Barrio
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            {formData.barrio || 'No especificado'}
          </div>
        ) : (
          <input
            type="text"
            value={formData.barrio}
            onChange={(e) => handleChange('barrio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del barrio..."
          />
        )}
      </div>

      {/* Información de Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono de Contacto *
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.telefono_contacto || 'No especificado'}
            </div>
          ) : (
            <input
              type="tel"
              value={formData.telefono_contacto}
              onChange={(e) => handleChange('telefono_contacto', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de teléfono..."
            />
          )}
          
          {errores.telefono_contacto && (
            <p className="mt-1 text-sm text-red-600">{errores.telefono_contacto}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Persona que Recibe
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.persona_recibe || 'No especificada'}
            </div>
          ) : (
            <input
              type="text"
              value={formData.persona_recibe}
              onChange={(e) => handleChange('persona_recibe', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre de la persona..."
            />
          )}
        </div>
      </div>

      {/* Coordenadas GPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Latitud
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.coordenadas_lat || 'No especificada'}
            </div>
          ) : (
            <input
              type="number"
              step="any"
              value={formData.coordenadas_lng}
              onChange={(e) => handleChange('coordenadas_lng', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: -74.08175"
            />
          )}
        </div>
      </div>

      {(formData.coordenadas_lat && formData.coordenadas_lng) && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            📍 Coordenadas: {formData.coordenadas_lat}, {formData.coordenadas_lng}
          </p>
        </div>
      )}
    </div>
  );

  const renderPestañaEquipos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Equipos para Instalación</h3>
        
        {modo !== 'ver' && (
          <button
            type="button"
            onClick={agregarEquipo}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Equipo
          </button>
        )}
      </div>

      {formData.equipos_instalados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No hay equipos asignados</p>
          {modo !== 'ver' && (
            <button
              type="button"
              onClick={agregarEquipo}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Agregar primer equipo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {formData.equipos_instalados.map((equipo, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-gray-900">Equipo #{index + 1}</h4>
                
                {modo !== 'ver' && (
                  <button
                    type="button"
                    onClick={() => eliminarEquipo(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo
                  </label>
                  
                  {modo === 'ver' ? (
                    <div className="p-2 bg-gray-50 rounded text-sm">
                      {equipo.equipo_nombre || 'No especificado'}
                    </div>
                  ) : (
                    <select
                      value={equipo.equipo_id}
                      onChange={(e) => actualizarEquipo(index, 'equipo_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar equipo...</option>
                      {equiposDisponibles.map(equipoDisp => (
                        <option key={equipoDisp.id} value={equipoDisp.id}>
                          {equipoDisp.codigo} - {equipoDisp.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  
                  {modo === 'ver' ? (
                    <div className="p-2 bg-gray-50 rounded text-sm">
                      {equipo.cantidad || 1}
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={equipo.cantidad}
                      onChange={(e) => actualizarEquipo(index, 'cantidad', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Serie
                  </label>
                  
                  {modo === 'ver' ? (
                    <div className="p-2 bg-gray-50 rounded text-sm">
                      {equipo.numero_serie || 'No especificado'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={equipo.numero_serie}
                      onChange={(e) => actualizarEquipo(index, 'numero_serie', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Serie del equipo..."
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  
                  {modo === 'ver' ? (
                    <div className="p-2 bg-gray-50 rounded text-sm">
                      {equipo.observaciones || 'Sin observaciones'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={equipo.observaciones}
                      onChange={(e) => actualizarEquipo(index, 'observaciones', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Observaciones del equipo..."
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPestañaCompletacion = () => (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="font-medium text-green-900 mb-2">Completar Instalación</h3>
        <p className="text-sm text-green-700">
          Registra los detalles finales de la instalación completada.
        </p>
      </div>

      {/* Fecha y Horas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Realización *
          </label>
          <input
            type="date"
            value={datosCompletacion.fecha_realizada}
            onChange={(e) => setDatosCompletacion(prev => ({
              ...prev,
              fecha_realizada: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errores.fecha_realizada && (
            <p className="mt-1 text-sm text-red-600">{errores.fecha_realizada}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora de Inicio *
          </label>
          <input
            type="time"
            value={datosCompletacion.hora_inicio}
            onChange={(e) => setDatosCompletacion(prev => ({
              ...prev,
              hora_inicio: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errores.hora_inicio && (
            <p className="mt-1 text-sm text-red-600">{errores.hora_inicio}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora de Fin *
          </label>
          <input
            type="time"
            value={datosCompletacion.hora_fin}
            onChange={(e) => setDatosCompletacion(prev => ({
              ...prev,
              hora_fin: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errores.hora_fin && (
            <p className="mt-1 text-sm text-red-600">{errores.hora_fin}</p>
          )}
        </div>
      </div>

      {/* Observaciones Finales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones de Completación
        </label>
        <textarea
          value={datosCompletacion.observaciones_finales}
          onChange={(e) => setDatosCompletacion(prev => ({
            ...prev,
            observaciones_finales: e.target.value
          }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Detalles de la instalación completada, problemas encontrados, etc..."
        />
      </div>
    </div>
  );

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {modo === 'crear' && 'Nueva Instalación'}
              {modo === 'editar' && 'Editar Instalación'}
              {modo === 'ver' && 'Detalles de Instalación'}
              {modo === 'completar' && 'Completar Instalación'}
              {modo === 'reagendar' && 'Reagendar Instalación'}
            </h2>
            
            {instalacion && (
              <p className="text-sm text-gray-600 mt-1">
                ID: {instalacion.id} • 
                Cliente: {clienteSeleccionado?.nombre_completo}
              </p>
            )}
          </div>
          
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        {pestañas.length > 1 && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {pestañas.map(pestaña => {
                const Icono = pestaña.icono;
                return (
                  <button
                    key={pestaña.id}
                    type="button"
                    onClick={() => setPestañaActiva(pestaña.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      pestañaActiva === pestaña.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icono className="w-4 h-4 mr-2" />
                    {pestaña.nombre}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando datos...</p>
                </div>
              </div>
            ) : (
              <>
                {(pestañaActiva === 'general' || modo === 'ver') && renderPestañaGeneral()}
                {pestañaActiva === 'ubicacion' && renderPestañaUbicacion()}
                {pestañaActiva === 'equipos' && renderPestañaEquipos()}
                {pestañaActiva === 'completacion' && renderPestañaCompletacion()}
              </>
            )}

            {/* Error general */}
            {errores.general && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-800">{errores.general}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {modo !== 'ver' && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onCerrar}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando || cargando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {procesando && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {modo === 'crear' && 'Crear Instalación'}
                  {modo === 'editar' && 'Actualizar'}
                  {modo === 'completar' && 'Completar'}
                  {modo === 'reagendar' && 'Reagendar'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default InstalacionModal;
        