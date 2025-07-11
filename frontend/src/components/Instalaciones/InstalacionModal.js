// frontend/src/components/Instalaciones/InstalacionModal.js

import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, User, MapPin, Phone, Wrench, 
  Search, Plus, Trash2, AlertCircle, CheckCircle,
  Camera, Upload, FileText, DollarSign
} from 'lucide-react';

import { instalacionesService, instalacionesHelpers } from '../../services/instalacionesService';

const InstalacionModal = ({ modo, instalacion, onGuardar, onCerrar, procesando = false }) => {
  // Estados del formulario
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
    coordenadas_lat: null,
    coordenadas_lng: null,
    contrato_id: null,
    tipo_orden: 'instalacion'
  });

  // Estados auxiliares
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [pestañaActiva, setPestañaActiva] = useState('general');

  // Datos para selects
  const [clientes, setClientes] = useState([]);
  const [serviciosCliente, setServiciosCliente] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);

  // Estados para búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Estados para completar instalación
  const [datosCompletacion, setDatosCompletacion] = useState({
    fecha_realizada: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    equipos_finales: [],
    fotos_instalacion: [],
    observaciones_finales: ''
  });

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
      cargarServiciosCliente(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  // ==========================================
  // CARGA DE DATOS
  // ==========================================

  const cargarDatosIniciales = async () => {
    try {
      setCargando(true);
      
      const [clientesRes, instaladoresRes, equiposRes] = await Promise.all([
        instalacionesService.getClientes(),
        instalacionesService.getInstaladores(),
        instalacionesService.getEquiposDisponibles()
      ]);

      if (clientesRes.success) setClientes(clientesRes.data);
      if (instaladoresRes.success) setInstaladores(instaladoresRes.data);
      if (equiposRes.success) setEquiposDisponibles(equiposRes.data);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDatosInstalacion = () => {
    if (!instalacion) return;

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
      equipos_instalados: instalacion.equipos_instalados || [],
      costo_instalacion: instalacion.costo_instalacion || 0,
      coordenadas_lat: instalacion.coordenadas_lat,
      coordenadas_lng: instalacion.coordenadas_lng,
      contrato_id: instalacion.contrato_id,
      tipo_orden: instalacion.tipo_orden || 'instalacion'
    });

    // Cargar datos del cliente si existe
    if (instalacion.cliente_nombre) {
      setClienteSeleccionado({
        id: instalacion.cliente_id,
        nombre: instalacion.cliente_nombre,
        identificacion: instalacion.cliente_identificacion,
        telefono: instalacion.cliente_telefono
      });
    }

    // Para modo completar, cargar datos adicionales
    if (modo === 'completar') {
      setDatosCompletacion(prev => ({
        ...prev,
        hora_inicio: instalacion.hora_inicio || '',
        equipos_finales: instalacion.equipos_instalados || []
      }));
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

  const buscarClientes = async (termino) => {
    if (termino.length < 2) return;
    
    try {
      const response = await instalacionesService.getClientes(termino);
      if (response.success) {
        setClientes(response.data);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    }
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    handleChange('cliente_id', cliente.id);
    setBusquedaCliente('');
    
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

    if (formData.telefono_contacto && !/^[0-9+\-\s()]{7,20}$/.test(formData.telefono_contacto)) {
      nuevosErrores.telefono_contacto = 'Formato de teléfono inválido';
    }

    if (formData.costo_instalacion < 0) {
      nuevosErrores.costo_instalacion = 'El costo no puede ser negativo';
    }

    // Validaciones específicas para completar instalación
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
      return;
    }

    try {
      if (modo === 'completar') {
        // Completar instalación
        await instalacionesService.completarInstalacion(instalacion.id, {
          ...datosCompletacion,
          equipos_instalados: datosCompletacion.equipos_finales,
          observaciones: datosCompletacion.observaciones_finales
        });
      } else {
        // Crear o actualizar
        await onGuardar(formData);
      }
    } catch (error) {
      console.error('Error en submit:', error);
    }
  };

  // ==========================================
  // MANEJO DE GEOLOCALIZACIÓN
  // ==========================================

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleChange('coordenadas_lat', position.coords.latitude);
        handleChange('coordenadas_lng', position.coords.longitude);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener la ubicación');
      }
    );
  };

  // ==========================================
  // RENDER DE PESTAÑAS
  // ==========================================

  const renderPestañaGeneral = () => (
    <div className="space-y-6">
      {/* Selección de Cliente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente *
        </label>
        {clienteSeleccionado ? (
          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
            <div>
              <div className="font-medium">{clienteSeleccionado.nombre}</div>
              <div className="text-sm text-gray-500">{clienteSeleccionado.identificacion}</div>
            </div>
            {modo === 'crear' && (
              <button
                type="button"
                onClick={() => {
                  setClienteSeleccionado(null);
                  handleChange('cliente_id', '');
                  setServiciosCliente([]);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente por nombre o identificación..."
              value={busquedaCliente}
              onChange={(e) => {
                setBusquedaCliente(e.target.value);
                buscarClientes(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            
            {busquedaCliente && clientes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{cliente.nombre}</div>
                    <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {errores.cliente_id && (
          <p className="text-red-600 text-sm mt-1">{errores.cliente_id}</p>
        )}
      </div>

      {/* Servicio del Cliente */}
      {formData.cliente_id && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Servicio *
          </label>
          <select
            value={formData.servicio_cliente_id}
            onChange={(e) => handleChange('servicio_cliente_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccione un servicio</option>
            {serviciosCliente.map(servicio => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.plan_nombre} - {servicio.estado}
              </option>
            ))}
          </select>
          {errores.servicio_cliente_id && (
            <p className="text-red-600 text-sm mt-1">{errores.servicio_cliente_id}</p>
          )}
        </div>
      )}

      {/* Instalador */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instalador
        </label>
        <select
          value={formData.instalador_id}
          onChange={(e) => handleChange('instalador_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Sin asignar</option>
          {instaladores.map(instalador => (
            <option key={instalador.id} value={instalador.id}>
              {instalador.nombres} {instalador.apellidos}
            </option>
          ))}
        </select>
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Programada *
          </label>
          <input
            type="date"
            value={formData.fecha_programada}
            onChange={(e) => handleChange('fecha_programada', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errores.fecha_programada && (
            <p className="text-red-600 text-sm mt-1">{errores.fecha_programada}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora Programada
          </label>
          <input
            type="time"
            value={formData.hora_programada}
            onChange={(e) => handleChange('hora_programada', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tipo de Instalación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Instalación
        </label>
        <select
          value={formData.tipo_instalacion}
          onChange={(e) => handleChange('tipo_instalacion', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="nueva">Nueva Instalación</option>
          <option value="migracion">Migración</option>
          <option value="upgrade">Actualización</option>
          <option value="reparacion">Reparación</option>
        </select>
      </div>

      {/* Costo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Costo de Instalación
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="number"
            value={formData.costo_instalacion}
            onChange={(e) => handleChange('costo_instalacion', parseFloat(e.target.value) || 0)}
            min="0"
            step="1000"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {errores.costo_instalacion && (
          <p className="text-red-600 text-sm mt-1">{errores.costo_instalacion}</p>
        )}
      </div>
    </div>
  );

  const renderPestañaUbicacion = () => (
    <div className="space-y-6">
      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección de Instalación
        </label>
        <textarea
          value={formData.direccion_instalacion}
          onChange={(e) => handleChange('direccion_instalacion', e.target.value)}
          rows={3}
          placeholder="Ingrese la dirección completa..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Datos de Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono de Contacto
          </label>
          <input
            type="tel"
            value={formData.telefono_contacto}
            onChange={(e) => handleChange('telefono_contacto', e.target.value)}
            placeholder="3001234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errores.telefono_contacto && (
            <p className="text-red-600 text-sm mt-1">{errores.telefono_contacto}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Persona que Recibe
          </label>
          <input
            type="text"
            value={formData.persona_recibe}
            onChange={(e) => handleChange('persona_recibe', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Coordenadas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Coordenadas GPS
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="number"
            value={formData.coordenadas_lat || ''}
            onChange={(e) => handleChange('coordenadas_lat', parseFloat(e.target.value) || null)}
            placeholder="Latitud"
            step="any"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            value={formData.coordenadas_lng || ''}
            onChange={(e) => handleChange('coordenadas_lng', parseFloat(e.target.value) || null)}
            placeholder="Longitud"
            step="any"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={obtenerUbicacion}
            className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MapPin className="w-4 h-4 mr-2" />
            GPS
          </button>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones
        </label>
        <textarea
          value={formData.observaciones}
          onChange={(e) => handleChange('observaciones', e.target.value)}
          rows={4}
          placeholder="Observaciones adicionales sobre la instalación..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderPestañaEquipos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Equipos para Instalación</h3>
        <button
          type="button"
          onClick={agregarEquipo}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Equipo
        </button>
      </div>

      {formData.equipos_instalados.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">No hay equipos agregados</p>
          <button
            type="button"
            onClick={agregarEquipo}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Agregar primer equipo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.equipos_instalados.map((equipo, index) => (
            <div key={index} className="border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium">Equipo #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => eliminarEquipo(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo
                  </label>
                  <select
                    value={equipo.equipo_id}
                    onChange={(e) => actualizarEquipo(index, 'equipo_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccione un equipo</option>
                    {equiposDisponibles.map(equipoDisp => (
                      <option key={equipoDisp.id} value={equipoDisp.id}>
                        {equipoDisp.codigo} - {equipoDisp.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={equipo.cantidad}
                    onChange={(e) => actualizarEquipo(index, 'cantidad', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Serie
                  </label>
                  <input
                    type="text"
                    value={equipo.numero_serie}
                    onChange={(e) => actualizarEquipo(index, 'numero_serie', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    value={equipo.observaciones}
                    onChange={(e) => actualizarEquipo(index, 'observaciones', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
          <div>
            <h3 className="font-medium text-blue-900">Completar Instalación</h3>
            <p className="text-blue-700 text-sm">Registre los detalles finales de la instalación</p>
          </div>
        </div>
      </div>

      {/* Fechas y Horas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Realizada *
          </label>
          <input
            type="date"
            value={datosCompletacion.fecha_realizada}
            onChange={(e) => setDatosCompletacion(prev => ({ ...prev, fecha_realizada: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errores.fecha_realizada && (
            <p className="text-red-600 text-sm mt-1">{errores.fecha_realizada}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora Inicio *
          </label>
          <input
            type="time"
            value={datosCompletacion.hora_inicio}
            onChange={(e) => setDatosCompletacion(prev => ({ ...prev, hora_inicio: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errores.hora_inicio && (
            <p className="text-red-600 text-sm mt-1">{errores.hora_inicio}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora Fin *
          </label>
          <input
            type="time"
            value={datosCompletacion.hora_fin}
            onChange={(e) => setDatosCompletacion(prev => ({ ...prev, hora_fin: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errores.hora_fin && (
            <p className="text-red-600 text-sm mt-1">{errores.hora_fin}</p>
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
          onChange={(e) => setDatosCompletacion(prev => ({ ...prev, observaciones_finales: e.target.value }))}
          rows={4}
          placeholder="Detalles de la instalación, problemas encontrados, recomendaciones..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  const obtenerTituloModal = () => {
    switch (modo) {
      case 'crear': return 'Nueva Instalación';
      case 'editar': return 'Editar Instalación';
      case 'ver': return 'Detalles de Instalación';
      case 'completar': return 'Completar Instalación';
      case 'reagendar': return 'Reagendar Instalación';
      default: return 'Instalación';
    }
  };

  const pestañas = [
    { id: 'general', nombre: 'General', icono: FileText },
    { id: 'ubicacion', nombre: 'Ubicación', icono: MapPin },
    { id: 'equipos', nombre: 'Equipos', icono: Wrench }
  ];

  if (modo === 'completar') {
    pestañas.push({ id: 'completacion', nombre: 'Completación', icono: CheckCircle });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {obtenerTituloModal()}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Pestañas */}
        {modo !== 'ver' && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {pestañas.map((pestaña) => {
                const Icono = pestaña.icono;
                return (
                  <button
                    key={pestaña.id}
                    onClick={() => setPestañaActiva(pestaña.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
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