// frontend/src/components/Instalaciones/InstalacionModal.js - VERSIÓN LIMPIA Y ORGANIZADA

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
  Trash2
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
    coordenadas_lng: ''
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
    { id: 'general', nombre: 'General', icono: User },
    { id: 'ubicacion', nombre: 'Ubicación', icono: MapPin },
    { id: 'equipos', nombre: 'Equipos', icono: Package }
  ];

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (instalacion && modo !== 'crear') {
      cargarDatosInstalacion();
    }
  }, [instalacion, modo]);

  useEffect(() => {
    if (formData.cliente_id) {
      cargarServiciosCliente();
    }
  }, [formData.cliente_id]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      // Cargar instaladores
      const responseInstaladores = await instalacionesService.getInstaladores();
      if (responseInstaladores.success) {
        setInstaladores(responseInstaladores.instaladores || []);
      }

      // Cargar equipos
      const responseEquipos = await instalacionesService.getEquiposDisponibles();
      if (responseEquipos.success) {
        setEquiposDisponibles(responseEquipos.equipos || []);
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDatosInstalacion = () => {
    if (!instalacion) return;

    console.log('📋 Cargando datos de instalación:', instalacion);
    
    setFormData({
      cliente_id: instalacion.cliente_id || '',
      servicio_cliente_id: instalacion.servicio_cliente_id || '',
      instalador_id: instalacion.instalador_id || '',
      fecha_programada: instalacion.fecha_programada || '',
      hora_programada: instalacion.hora_programada || '09:00',
      direccion_instalacion: instalacion.direccion_instalacion || '',
      barrio: instalacion.barrio || '',
      telefono_contacto: instalacion.telefono_contacto || '',
      persona_recibe: instalacion.persona_recibe || '',
      tipo_instalacion: instalacion.tipo_instalacion || 'nueva',
      observaciones: instalacion.observaciones || '',
      equipos_instalados: procesarEquipos(instalacion.equipos_instalados),
      costo_instalacion: instalacion.costo_instalacion || 0,
      coordenadas_lat: instalacion.coordenadas_lat || '',
      coordenadas_lng: instalacion.coordenadas_lng || ''
    });

    // Establecer cliente seleccionado si existe
    if (instalacion.cliente_nombre) {
      setClienteSeleccionado({
        id: instalacion.cliente_id,
        nombre_completo: instalacion.cliente_nombre,
        identificacion: instalacion.cliente_identificacion,
        telefono: instalacion.cliente_telefono
      });
    }
  };

  const procesarEquipos = (equipos) => {
    if (!equipos) return [];
    if (Array.isArray(equipos)) return equipos;
    if (typeof equipos === 'string') {
      try {
        return JSON.parse(equipos);
      } catch (error) {
        console.warn('Error parseando equipos:', error);
        return [];
      }
    }
    return [];
  };

  const cargarServiciosCliente = async () => {
    try {
      const response = await instalacionesService.getServiciosCliente(formData.cliente_id);
      if (response.success) {
        setServiciosCliente(response.servicios || response.data || []);
      }
    } catch (error) {
      console.warn('Error cargando servicios del cliente:', error);
      setServiciosCliente([]);
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
      const response = await instalacionesService.buscarClientes(termino);
      if (response.success) {
        setClientes(response.clientes || response.data || []);
      }
    } catch (error) {
      console.warn('Error buscando clientes:', error);
      setClientes([]);
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
  };

  const limpiarClienteSeleccionado = () => {
    setClienteSeleccionado(null);
    handleChange('cliente_id', '');
    handleChange('servicio_cliente_id', '');
    setServiciosCliente([]);
  };

  // ==========================================
  // MANEJO DE EQUIPOS
  // ==========================================

  const agregarEquipo = () => {
    const nuevosEquipos = [...formData.equipos_instalados, {
      equipo_id: '',
      tipo: '',
      marca: '',
      modelo: '',
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

    // Si cambia el equipo, actualizar datos relacionados
    if (campo === 'equipo_id' && valor) {
      const equipo = equiposDisponibles.find(e => e.id === parseInt(valor));
      if (equipo) {
        equiposActualizados[index] = {
          ...equiposActualizados[index],
          tipo: equipo.tipo || '',
          marca: equipo.marca || '',
          modelo: equipo.modelo || ''
        };
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
      nuevosErrores.direccion_instalacion = 'La dirección es obligatoria';
    }

    if (!formData.telefono_contacto.trim()) {
      nuevosErrores.telefono_contacto = 'El teléfono es obligatorio';
    } else if (!/^[0-9+\-\s()]{7,20}$/.test(formData.telefono_contacto)) {
      nuevosErrores.telefono_contacto = 'Formato de teléfono inválido';
    }

    if (formData.costo_instalacion < 0) {
      nuevosErrores.costo_instalacion = 'El costo no puede ser negativo';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      setPestañaActiva('general');
      return;
    }

    setProcesando(true);
    
    try {
      let response;
      
      if (modo === 'crear') {
        response = await instalacionesService.createInstalacion(formData);
      } else if (modo === 'editar') {
        response = await instalacionesService.updateInstalacion(instalacion.id, formData);
      }

      if (response?.success) {
        if (onGuardar) {
          onGuardar(response.instalacion || response.data);
        }
        onCerrar();
      } else {
        throw new Error(response?.message || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error guardando instalación:', error);
      setErrores({ general: error.message || 'Error al guardar' });
    } finally {
      setProcesando(false);
    }
  };

  // ==========================================
  // RENDERIZADO DE PESTAÑAS
  // ==========================================

  const renderPestañaGeneral = () => (
    <div className="space-y-6">
      {/* Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente *
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{clienteSeleccionado?.nombre_completo || 'No especificado'}</p>
            <p className="text-sm text-gray-600">ID: {clienteSeleccionado?.identificacion || 'N/A'}</p>
          </div>
        ) : clienteSeleccionado ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-medium text-blue-900">{clienteSeleccionado.nombre_completo}</p>
              <p className="text-sm text-blue-600">ID: {clienteSeleccionado.identificacion}</p>
            </div>
            <button
              type="button"
              onClick={limpiarClienteSeleccionado}
              className="text-blue-600 hover:text-blue-800 text-sm"
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
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Servicio */}
      {formData.cliente_id && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Servicio *
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {serviciosCliente.find(s => s.id == formData.servicio_cliente_id)?.plan_nombre || 'No especificado'}
            </div>
          ) : (
            <select
              value={formData.servicio_cliente_id}
              onChange={(e) => handleChange('servicio_cliente_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar servicio...</option>
              {serviciosCliente.map(servicio => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.plan_nombre} - ${servicio.precio_mensual?.toLocaleString() || '0'}
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
            {instaladores.find(i => i.id == formData.instalador_id)?.nombre_completo || 'Sin asignar'}
          </div>
        ) : (
          <select
            value={formData.instalador_id}
            onChange={(e) => handleChange('instalador_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sin asignar</option>
            {instaladores.map(instalador => (
              <option key={instalador.id} value={instalador.id}>
                {instalador.nombre_completo}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha *
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
          
          {errores.fecha_programada && (
            <p className="mt-1 text-sm text-red-600">{errores.fecha_programada}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Instalación
        </label>
        
        {modo === 'ver' ? (
          <div className="p-3 bg-gray-50 rounded-lg">
            {formData.tipo_instalacion === 'nueva' ? 'Nueva' :
             formData.tipo_instalacion === 'migracion' ? 'Migración' :
             formData.tipo_instalacion === 'upgrade' ? 'Actualización' :
             formData.tipo_instalacion === 'reparacion' ? 'Reparación' :
             formData.tipo_instalacion}
          </div>
        ) : (
          <select
            value={formData.tipo_instalacion}
            onChange={(e) => handleChange('tipo_instalacion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="nueva">Nueva Instalación</option>
            <option value="migracion">Migración</option>
            <option value="upgrade">Actualización</option>
            <option value="reparacion">Reparación</option>
          </select>
        )}
      </div>

      {/* Costo */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Observaciones adicionales..."
          />
        )}
      </div>
    </div>
  );

  const renderPestañaUbicacion = () => (
    <div className="space-y-6">
      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección *
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Dirección completa..."
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nombre del barrio..."
          />
        )}
      </div>

      {/* Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono *
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Número de teléfono..."
            />
          )}
          
          {errores.telefono_contacto && (
            <p className="mt-1 text-sm text-red-600">{errores.telefono_contacto}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Persona que recibe
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre de la persona..."
            />
          )}
        </div>
      </div>

      {/* Coordenadas */}
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
              value={formData.coordenadas_lat}
              onChange={(e) => handleChange('coordenadas_lat', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 4.60971"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Longitud
          </label>
          
          {modo === 'ver' ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              {formData.coordenadas_lng || 'No especificada'}
            </div>
          ) : (
            <input
              type="number"
              step="any"
              value={formData.coordenadas_lng}
              onChange={(e) => handleChange('coordenadas_lng', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <h3 className="text-lg font-medium text-gray-900">Equipos</h3>
        
        {modo !== 'ver' && (
          <button
            type="button"
            onClick={agregarEquipo}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
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
                      {equipo.tipo || 'No especificado'}
                    </div>
                  ) : (
                    <select
                      value={equipo.equipo_id}
                      onChange={(e) => actualizarEquipo(index, 'equipo_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {equiposDisponibles.map(equipoDisp => (
                        <option key={equipoDisp.id} value={equipoDisp.id}>
                          {equipoDisp.tipo} - {equipoDisp.marca} {equipoDisp.modelo}
                        </option>
                      ))}
                    </select>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Serie..."
                    />
                  )}
                </div>

                <div className="md:col-span-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Observaciones..."
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

  // ==========================================
  // RENDER PRINCIPAL
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
            </h2>
            
            {instalacion && (
              <p className="text-sm text-gray-600 mt-1">
                ID: {instalacion.id} • Cliente: {clienteSeleccionado?.nombre_completo || instalacion.cliente_nombre}
              </p>
            )}
          </div>
          
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas - Solo en modo crear/editar */}
        {modo !== 'ver' && (
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
                  <p className="text-gray-600">Cargando...</p>
                </div>
              </div>
            ) : (
              <>
                {/* En modo ver, mostrar todo */}
                {modo === 'ver' ? (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                      {renderPestañaGeneral()}
                    </div>
                    
                    <hr className="border-gray-200" />
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Ubicación</h3>
                      {renderPestañaUbicacion()}
                    </div>
                    
                    <hr className="border-gray-200" />
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Equipos</h3>
                      {renderPestañaEquipos()}
                    </div>
                  </div>
                ) : (
                  /* En modo crear/editar, mostrar según pestaña activa */
                  <>
                    {pestañaActiva === 'general' && renderPestañaGeneral()}
                    {pestañaActiva === 'ubicacion' && renderPestañaUbicacion()}
                    {pestañaActiva === 'equipos' && renderPestañaEquipos()}
                  </>
                )}
              </>
            )}

            {/* Error general */}
            {errores.general && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
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
                  disabled={procesando}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                  {procesando ? 'Guardando...' : (modo === 'crear' ? 'Crear' : 'Actualizar')}
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