import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Calendar, Clock, MapPin, User, Phone,
  Wrench, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Eye, Edit, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';

// Constantes
const ESTADOS_INSTALACION = {
  PROGRAMADA: 'programada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REAGENDADA: 'reagendada'
};

const ESTADOS_LABELS = {
  programada: 'Programada',
  en_proceso: 'En Proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reagendada: 'Reagendada'
};

const ESTADOS_COLORS = {
  programada: 'bg-blue-100 text-blue-800',
  en_proceso: 'bg-yellow-100 text-yellow-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  reagendada: 'bg-purple-100 text-purple-800'
};

const InstalacionesManagement = () => {
  // Estados principales
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    tipo_instalacion: '',
    instalador_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  // Estados de paginación
  const [paginacion, setPaginacion] = useState({
    pagina_actual: 1,
    total_paginas: 1,
    total_registros: 0,
    registros_por_pagina: 20
  });
  
  // Estados de modales
  const [mostrarModal, setMostrarModal] = useState(false);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  const [modoModal, setModoModal] = useState('crear'); // crear, ver, editar
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados de estadísticas
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    completadas: 0,
    programadas: 0,
    en_proceso: 0,
    canceladas: 0,
    reagendadas: 0
  });
  
  // Estados para formulario
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
    costo_instalacion: 0
  });

  // Estados auxiliares
  const [instaladores, setInstaladores] = useState([]);
  const [clientes, setClientes] = useState([]);

  // ==========================================
  // EFECTOS Y CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarDatos();
    cargarInstaladores();
  }, [filtros, paginacion.pagina_actual]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        pagina: paginacion.pagina_actual.toString(),
        limite: paginacion.registros_por_pagina.toString(),
        ...filtros
      });

      const response = await fetch(`/api/v1/instalaciones?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar instalaciones');

      const data = await response.json();
      
      if (data.success) {
        setInstalaciones(data.data.instalaciones);
        setPaginacion(prev => ({
          ...prev,
          ...data.data.paginacion
        }));
        
        calcularEstadisticas(data.data.instalaciones);
      }

    } catch (error) {
      console.error('Error cargando instalaciones:', error);
      setError('Error al cargar las instalaciones');
    } finally {
      setLoading(false);
    }
  };

  const cargarInstaladores = async () => {
    try {
      const response = await fetch('/api/v1/usuarios?rol=instalador', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInstaladores(data.data.usuarios || []);
        }
      }
    } catch (error) {
      console.error('Error cargando instaladores:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await fetch('/api/v1/instalaciones/estadisticas', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEstadisticas(data.data.resumen);
        }
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const calcularEstadisticas = (instalacionesData) => {
    const stats = instalacionesData.reduce((acc, instalacion) => {
      acc.total++;
      acc[instalacion.estado] = (acc[instalacion.estado] || 0) + 1;
      return acc;
    }, { total: 0 });

    setEstadisticas(stats);
  };

  // ==========================================
  // MANEJADORES DE EVENTOS
  // ==========================================

  const manejarCambioFiltro = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      estado: '',
      tipo_instalacion: '',
      instalador_id: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
  };

  const manejarCambioPagina = (nuevaPagina) => {
    setPaginacion(prev => ({
      ...prev,
      pagina_actual: nuevaPagina
    }));
  };

  const abrirModal = (modo, instalacion = null) => {
    setModoModal(modo);
    setInstalacionSeleccionada(instalacion);
    setMostrarModal(true);
    
    if (instalacion && modo === 'editar') {
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
        costo_instalacion: instalacion.costo_instalacion || 0
      });
    } else if (modo === 'crear') {
      setFormData({
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
        costo_instalacion: 0
      });
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setInstalacionSeleccionada(null);
    setModoModal('crear');
    setFormData({
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
      costo_instalacion: 0
    });
  };

  const manejarCambioFormulario = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = modoModal === 'crear' 
        ? '/api/v1/instalaciones'
        : `/api/v1/instalaciones/${instalacionSeleccionada.id}`;
      
      const method = modoModal === 'crear' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message || 'Operación exitosa');
        cerrarModal();
        cargarDatos();
      } else {
        setError(result.message || 'Error en la operación');
      }

    } catch (error) {
      console.error('Error en formulario:', error);
      setError('Error al procesar la solicitud');
    }
  };

  const cambiarEstado = async (id, nuevoEstado, observaciones = '') => {
    try {
      const response = await fetch(`/api/v1/instalaciones/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ estado: nuevoEstado, observaciones })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message || 'Estado actualizado');
        cargarDatos();
      } else {
        setError(result.message || 'Error al cambiar estado');
      }

    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError('Error al cambiar el estado');
    }
  };

  const eliminarInstalacion = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta instalación?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/instalaciones/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(result.message || 'Instalación eliminada');
        cargarDatos();
      } else {
        setError(result.message || 'Error al eliminar');
      }

    } catch (error) {
      console.error('Error eliminando:', error);
      setError('Error al eliminar la instalación');
    }
  };

  // ==========================================
  // COMPONENTES AUXILIARES
  // ==========================================

  const EstadoBadge = ({ estado }) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADOS_COLORS[estado]}`}>
      {ESTADOS_LABELS[estado]}
    </span>
  );

  const TarjetaEstadistica = ({ titulo, valor, icono: Icono, color = "blue" }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icono className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{titulo}</p>
          <p className="text-2xl font-bold text-gray-900">{valor}</p>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <button
            onClick={() => setError('')}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <XCircle className="w-5 h-5" />
          </button>
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <button
            onClick={() => setSuccess('')}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          {success}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Instalaciones</h1>
            <p className="mt-2 text-gray-600">
              Administra y supervisa todas las instalaciones de servicios
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => cargarDatos()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => abrirModal('crear')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Instalación
            </button>
          </div>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <TarjetaEstadistica
            titulo="Total"
            valor={estadisticas.total || 0}
            icono={Wrench}
            color="gray"
          />
          <TarjetaEstadistica
            titulo="Programadas"
            valor={estadisticas.programadas || 0}
            icono={Calendar}
            color="blue"
          />
          <TarjetaEstadistica
            titulo="En Proceso"
            valor={estadisticas.en_proceso || 0}
            icono={Clock}
            color="yellow"
          />
          <TarjetaEstadistica
            titulo="Completadas"
            valor={estadisticas.completadas || 0}
            icono={CheckCircle}
            color="green"
          />
          <TarjetaEstadistica
            titulo="Reagendadas"
            valor={estadisticas.reagendadas || 0}
            icono={RefreshCw}
            color="purple"
          />
          <TarjetaEstadistica
            titulo="Canceladas"
            valor={estadisticas.canceladas || 0}
            icono={XCircle}
            color="red"
          />
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, dirección o identificación..."
                  value={filtros.busqueda}
                  onChange={(e) => manejarCambioFiltro('busqueda', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Botones de filtro */}
            <div className="flex space-x-2">
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Panel de filtros expandible */}
        {mostrarFiltros && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filtros.estado}
                  onChange={(e) => manejarCambioFiltro('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADOS_LABELS).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>{etiqueta}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={filtros.tipo_instalacion}
                  onChange={(e) => manejarCambioFiltro('tipo_instalacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="nueva">Nueva Instalación</option>
                  <option value="migracion">Migración</option>
                  <option value="upgrade">Actualización</option>
                  <option value="reparacion">Reparación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instalador
                </label>
                <select
                  value={filtros.instalador_id}
                  onChange={(e) => manejarCambioFiltro('instalador_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los instaladores</option>
                  {instaladores.map(instalador => (
                    <option key={instalador.id} value={instalador.id}>
                      {instalador.nombres} {instalador.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => manejarCambioFiltro('fecha_desde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => manejarCambioFiltro('fecha_hasta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de instalaciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instalador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                      Cargando instalaciones...
                    </div>
                  </td>
                </tr>
              ) : instalaciones.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No se encontraron instalaciones
                  </td>
                </tr>
              ) : (
                instalaciones.map((instalacion) => (
                  <tr key={instalacion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {instalacion.cliente_nombre_completo}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instalacion.identificacion}
                        </div>
                        {instalacion.cliente_telefono && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="w-3 h-3 mr-1" />
                            {instalacion.cliente_telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(instalacion.fecha_programada).toLocaleDateString('es-CO')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {instalacion.hora_programada || 'Sin hora'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EstadoBadge estado={instalacion.estado} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {instalacion.tipo_instalacion?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {instalacion.instalador_nombre_completo || 'Sin asignar'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="truncate max-w-xs">
                          {instalacion.direccion_instalacion || 'Sin dirección'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => abrirModal('ver', instalacion)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', instalacion)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => cambiarEstado(instalacion.id, 'completada')}
                          className="text-green-600 hover:text-green-900"
                          title="Marcar como completada"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarInstalacion(instalacion.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {paginacion.total_paginas > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => manejarCambioPagina(paginacion.pagina_actual - 1)}
                  disabled={paginacion.pagina_actual === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => manejarCambioPagina(paginacion.pagina_actual + 1)}
                  disabled={paginacion.pagina_actual === paginacion.total_paginas}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {(paginacion.pagina_actual - 1) * paginacion.registros_por_pagina + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(paginacion.pagina_actual * paginacion.registros_por_pagina, paginacion.total_registros)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{paginacion.total_registros}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => manejarCambioPagina(paginacion.pagina_actual - 1)}
                      disabled={paginacion.pagina_actual === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {/* Números de página */}
                    {Array.from({ length: Math.min(5, paginacion.total_paginas) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => manejarCambioPagina(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === paginacion.pagina_actual
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => manejarCambioPagina(paginacion.pagina_actual + 1)}
                      disabled={paginacion.pagina_actual === paginacion.total_paginas}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear/editar/ver instalación */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {modoModal === 'crear' && 'Nueva Instalación'}
                  {modoModal === 'editar' && 'Editar Instalación'}
                  {modoModal === 'ver' && 'Detalles de Instalación'}
                </h3>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              {modoModal === 'ver' ? (
                // Vista de solo lectura
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Información del Cliente</h4>
                      <div className="space-y-2">
                        <p><span className="font-medium">Cliente:</span> {instalacionSeleccionada?.cliente_nombre_completo}</p>
                        <p><span className="font-medium">Identificación:</span> {instalacionSeleccionada?.identificacion}</p>
                        <p><span className="font-medium">Teléfono:</span> {instalacionSeleccionada?.cliente_telefono || 'No especificado'}</p>
                        <p><span className="font-medium">Email:</span> {instalacionSeleccionada?.cliente_email || 'No especificado'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Información de la Instalación</h4>
                      <div className="space-y-2">
                        <p><span className="font-medium">Fecha:</span> {new Date(instalacionSeleccionada?.fecha_programada).toLocaleDateString('es-CO')}</p>
                        <p><span className="font-medium">Hora:</span> {instalacionSeleccionada?.hora_programada || 'No especificada'}</p>
                        <p><span className="font-medium">Estado:</span> <EstadoBadge estado={instalacionSeleccionada?.estado} /></p>
                        <p><span className="font-medium">Tipo:</span> {instalacionSeleccionada?.tipo_instalacion}</p>
                        <p><span className="font-medium">Instalador:</span> {instalacionSeleccionada?.instalador_nombre_completo || 'Sin asignar'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Dirección y Contacto</h4>
                    <div className="space-y-2">
                      <p><span className="font-medium">Dirección:</span> {instalacionSeleccionada?.direccion_instalacion || 'No especificada'}</p>
                      <p><span className="font-medium">Barrio:</span> {instalacionSeleccionada?.barrio || 'No especificado'}</p>
                      <p><span className="font-medium">Teléfono de contacto:</span> {instalacionSeleccionada?.telefono_contacto || 'No especificado'}</p>
                      <p><span className="font-medium">Persona que recibe:</span> {instalacionSeleccionada?.persona_recibe || 'No especificada'}</p>
                    </div>
                  </div>
                  
                  {instalacionSeleccionada?.observaciones && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-2">Observaciones</h4>
                      <p className="text-gray-700">{instalacionSeleccionada.observaciones}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Formulario para crear/editar
                <form onSubmit={manejarSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cliente ID *
                      </label>
                      <input
                        type="number"
                        value={formData.cliente_id}
                        onChange={(e) => manejarCambioFormulario('cliente_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Servicio Cliente ID *
                      </label>
                      <input
                        type="number"
                        value={formData.servicio_cliente_id}
                        onChange={(e) => manejarCambioFormulario('servicio_cliente_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instalador
                      </label>
                      <select
                        value={formData.instalador_id}
                        onChange={(e) => manejarCambioFormulario('instalador_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sin asignar</option>
                        {instaladores.map(instalador => (
                          <option key={instalador.id} value={instalador.id}>
                            {instalador.nombres} {instalador.apellidos}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Instalación
                      </label>
                      <select
                        value={formData.tipo_instalacion}
                        onChange={(e) => manejarCambioFormulario('tipo_instalacion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="nueva">Nueva Instalación</option>
                        <option value="migracion">Migración</option>
                        <option value="upgrade">Actualización</option>
                        <option value="reparacion">Reparación</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Programada *
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_programada}
                        onChange={(e) => manejarCambioFormulario('fecha_programada', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora Programada
                      </label>
                      <input
                        type="time"
                        value={formData.hora_programada}
                        onChange={(e) => manejarCambioFormulario('hora_programada', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección de Instalación
                      </label>
                      <input
                        type="text"
                        value={formData.direccion_instalacion}
                        onChange={(e) => manejarCambioFormulario('direccion_instalacion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Dirección completa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barrio
                      </label>
                      <input
                        type="text"
                        value={formData.barrio}
                        onChange={(e) => manejarCambioFormulario('barrio', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre del barrio"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono_contacto}
                        onChange={(e) => manejarCambioFormulario('telefono_contacto', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3001234567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Persona que Recibe
                      </label>
                      <input
                        type="text"
                        value={formData.persona_recibe}
                        onChange={(e) => manejarCambioFormulario('persona_recibe', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nombre completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Costo de Instalación
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costo_instalacion}
                        onChange={(e) => manejarCambioFormulario('costo_instalacion', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => manejarCambioFormulario('observaciones', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Comentarios adicionales sobre la instalación..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      {modoModal === 'crear' ? 'Crear Instalación' : 'Actualizar Instalación'}
                    </button>
                  </div>
                </form>
              )}
              
              {modoModal === 'ver' && (
                <div className="flex justify-end pt-6">
                  <button
                    onClick={cerrarModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstalacionesManagement;