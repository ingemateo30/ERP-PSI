// frontend/src/components/Instalaciones/InstalacionesManagement.js

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Calendar, Clock, MapPin, User, Phone,
  Wrench, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Eye, Edit, Trash2, ChevronLeft, ChevronRight, Download,
  Play, Pause, Check, X, RotateCcw, BarChart3
} from 'lucide-react';

import { instalacionesService, instalacionesHelpers } from '../../services/instalacionesService';
import InstalacionModal from './InstalacionModal';
import InstalacionesFilters from './InstalacionesFilters';
//import InstalacionCard from './InstalacionCard';
import EstadisticasCard from './EstadisticasCard';

// Constantes
const ESTADOS_INSTALACION = {
  PROGRAMADA: 'programada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REAGENDADA: 'reagendada'
};

const TIPOS_INSTALACION = {
  NUEVA: 'nueva',
  MIGRACION: 'migracion',
  UPGRADE: 'upgrade',
  REPARACION: 'reparacion'
};

const InstalacionesManagement = () => {
  // Estados principales
  const [instalaciones, setInstalaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);
  const abrirModalAsignar = (instalacion) => {
  setInstalacionSeleccionada(instalacion);
  setMostrarModalAsignar(true);
};
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    tipo_instalacion: '',
    instalador_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    vencidas: false
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
    reagendadas: 0,
    vencidas: 0,
    hoy: 0
  });

  // Estados auxiliares
  const [procesando, setProcesando] = useState(false);
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(true);

  // ==========================================
  // EFECTOS Y CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarDatos();
    cargarEstadisticas();
  }, [filtros, paginacion.pagina_actual]);

  useEffect(() => {
    // Actualizar cada 5 minutos
    const intervalo = setInterval(() => {
      cargarDatos(false); // Sin mostrar loading
    }, 300000);

    return () => clearInterval(intervalo);
  }, [filtros, paginacion.pagina_actual]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

  const cargarDatos = async (mostrarCarga = true) => {
    try {
      if (mostrarCarga) setLoading(true);
      setError('');
      
      const params = {
        pagina: paginacion.pagina_actual,
        limite: paginacion.registros_por_pagina,
        ...filtros
      };

      const response = await instalacionesService.getInstalaciones(params);
      
      if (response.success) {
        setInstalaciones(response.data.instalaciones);
        setPaginacion(prev => ({
          ...prev,
          ...response.data.paginacion
        }));
      }

    } catch (error) {
      console.error('Error cargando instalaciones:', error);
      setError('Error al cargar las instalaciones: ' + error.message);
    } finally {
      if (mostrarCarga) setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await instalacionesService.getEstadisticas(filtros);
      
      if (response.success && response.data.resumen) {
        setEstadisticas(response.data.resumen);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // ==========================================
  // MANEJO DE FILTROS
  // ==========================================

  const aplicarFiltros = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
    setMostrarFiltros(false);
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      estado: '',
      tipo_instalacion: '',
      instalador_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      vencidas: false
    });
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
  };

  const handleBusquedaRapida = (valor) => {
    setFiltros(prev => ({ ...prev, busqueda: valor }));
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
  };

  // ==========================================
  // ACCIONES DE INSTALACIONES
  // ==========================================

  const abrirModal = (modo, instalacion = null) => {
    setModoModal(modo);
    setInstalacionSeleccionada(instalacion);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setInstalacionSeleccionada(null);
    setModoModal('crear');
  };

  const handleGuardarInstalacion = async (datosInstalacion) => {
    try {
      setProcesando(true);
      
      let response;
      if (modoModal === 'crear') {
        response = await instalacionesService.createInstalacion(datosInstalacion);
      } else if (modoModal === 'editar') {
        response = await instalacionesService.updateInstalacion(
          instalacionSeleccionada.id, 
          datosInstalacion
        );
      }

      if (response.success) {
        setSuccess(`Instalación ${modoModal === 'crear' ? 'creada' : 'actualizada'} exitosamente`);
        cerrarModal();
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error al guardar instalación: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoInstalacion = async (id, nuevoEstado, datosAdicionales = {}) => {
    try {
      setProcesando(true);
      
      const response = await instalacionesService.cambiarEstado(id, nuevoEstado, datosAdicionales);
      
      if (response.success) {
        setSuccess(`Estado cambiado a: ${instalacionesHelpers.formatearEstado(nuevoEstado)}`);
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error al cambiar estado: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarInstalacion = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta instalación?')) {
      return;
    }

    try {
      setProcesando(true);
      
      const response = await instalacionesService.deleteInstalacion(id);
      
      if (response.success) {
        setSuccess('Instalación eliminada exitosamente');
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error al eliminar instalación: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // ==========================================
  // ACCIONES RÁPIDAS
  // ==========================================

  const iniciarInstalacion = (instalacion) => {
    cambiarEstadoInstalacion(instalacion.id, ESTADOS_INSTALACION.EN_PROCESO, {
      hora_inicio: new Date().toTimeString().split(' ')[0].substring(0, 5),
      observaciones: 'Instalación iniciada'
    });
  };

  const completarInstalacion = (instalacion) => {
    abrirModal('completar', instalacion);
  };

  const cancelarInstalacion = async (instalacion) => {
  const motivo = window.prompt('Motivo de cancelación:');
  if (motivo !== null) {
    await cambiarEstadoInstalacion(instalacion.id, 'cancelada', {
      observaciones: motivo
    });
  }
};

 const reagendarInstalacion = async (instalacion) => {
  const nuevaFecha = window.prompt('Nueva fecha (YYYY-MM-DD):');
  const nuevaHora = window.prompt('Nueva hora (HH:MM):');
  
  if (nuevaFecha && nuevaHora) {
    await cambiarEstadoInstalacion(instalacion.id, 'reagendada', {
      fecha_programada: nuevaFecha,
      hora_programada: nuevaHora,
      observaciones: 'Reagendada'
    });
  }
};


  // ==========================================
  // MANEJO DE PAGINACIÓN
  // ==========================================

  const cambiarPagina = (nuevaPagina) => {
    setPaginacion(prev => ({ ...prev, pagina_actual: nuevaPagina }));
  };

  const cambiarLimite = (nuevoLimite) => {
    setPaginacion(prev => ({ 
      ...prev, 
      registros_por_pagina: nuevoLimite,
      pagina_actual: 1 
    }));
  };

  // ==========================================
  // UTILIDADES
  // ==========================================

  const exportarReporte = async () => {
    try {
      await instalacionesService.exportarReporte(filtros, 'excel');
      setSuccess('Reporte descargado exitosamente');
    } catch (error) {
      setError('Error al exportar reporte: ' + error.message);
    }
  };

  const obtenerIconoEstado = (estado) => {
    switch (estado) {
      case ESTADOS_INSTALACION.PROGRAMADA:
        return <Calendar className="w-4 h-4" />;
      case ESTADOS_INSTALACION.EN_PROCESO:
        return <Play className="w-4 h-4" />;
      case ESTADOS_INSTALACION.COMPLETADA:
        return <CheckCircle className="w-4 h-4" />;
      case ESTADOS_INSTALACION.CANCELADA:
        return <XCircle className="w-4 h-4" />;
      case ESTADOS_INSTALACION.REAGENDADA:
        return <RotateCcw className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const limpiarMensajes = () => {
    setError('');
    setSuccess('');
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading && instalaciones.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 text-lg">Cargando instalaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Gestión de Instalaciones
            </h1>
            <p className="text-gray-600">
              Administra y programa las instalaciones de servicios
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setMostrarEstadisticas(!mostrarEstadisticas)}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {mostrarEstadisticas ? 'Ocultar' : 'Mostrar'} Estadísticas
            </button>
            
            <button
              onClick={exportarReporte}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>
    
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={limpiarMensajes} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-800">{success}</span>
          </div>
          <button onClick={limpiarMensajes} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Estadísticas */}
      {mostrarEstadisticas && (
        <EstadisticasCard 
          estadisticas={estadisticas}
          onFiltrarPorEstado={(estado) => aplicarFiltros({ ...filtros, estado })}
        />
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda rápida */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente, dirección, persona que recibe..."
                value={filtros.busqueda}
                onChange={(e) => handleBusquedaRapida(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filtros.estado}
              onChange={(e) => aplicarFiltros({ ...filtros, estado: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="programada">Programadas</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="reagendada">Reagendadas</option>
            </select>

            <button
              onClick={() => aplicarFiltros({ ...filtros, vencidas: !filtros.vencidas })}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                filtros.vencidas
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {filtros.vencidas ? 'Mostrando vencidas' : 'Solo vencidas'}
            </button>

            <button
              onClick={() => setMostrarFiltros(true)}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              <Filter className="w-4 h-4 mr-2" />
              Más filtros
            </button>

            <button
              onClick={limpiarFiltros}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de instalaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header de la tabla */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Instalaciones ({paginacion.total_registros})
            </h2>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <select
                value={paginacion.registros_por_pagina}
                onChange={(e) => cambiarLimite(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">por página</span>
            </div>
          </div>
        </div>

        {/* Contenido de la tabla */}
        <div className="overflow-x-auto">
          {instalaciones.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay instalaciones
              </h3>
              <p className="text-gray-600 mb-4">
                {Object.values(filtros).some(v => v) 
                  ? 'No se encontraron instalaciones con los filtros aplicados'
                  : 'Comienza creando tu primera instalación'
                }
              </p>
              {!Object.values(filtros).some(v => v) && (
                <button
                  onClick={() => abrirModal('crear')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Instalación
                </button>
              )}
            </div>
          ) : (
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
                    Costo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instalaciones.map((instalacion) => {
                  const esVencida = instalacionesHelpers.esVencida(instalacion.fecha_programada, instalacion.estado);
                  
                  return (
                    <tr key={instalacion.id} className={`hover:bg-gray-50 ${esVencida ? 'bg-red-50' : ''}`}>
                      {/* Cliente */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {instalacion.cliente_nombre}
                            </div>
                            <div className="text-sm text-gray-500">
                              {instalacion.cliente_identificacion}
                            </div>
                            {instalacion.cliente_telefono && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {instalacion.cliente_telefono}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fecha/Hora */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(instalacion.fecha_programada).toLocaleDateString('es-ES')}
                        </div>
                        {instalacion.hora_programada && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {instalacion.hora_programada}
                          </div>
                        )}
                        {esVencida && (
                          <div className="text-xs text-red-600 font-medium">
                            Vencida
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {obtenerIconoEstado(instalacion.estado)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${instalacionesHelpers.getClasesEstado(instalacion.estado)}`}>
                            {instalacionesHelpers.formatearEstado(instalacion.estado)}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {instalacionesHelpers.formatearTipo(instalacion.tipo_instalacion)}
                        </span>
                        {instalacion.plan_nombre && (
                          <div className="text-xs text-gray-500">
                            {instalacion.plan_nombre}
                          </div>
                        )}
                      </td>

                      {/* Instalador */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {instalacion.instalador_nombre_completo ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-900">
                                {instalacion.instalador_nombre_completo}
                              </div>
                              {instalacion.instalador_telefono && (
                                <div className="text-xs text-gray-500">
                                  {instalacion.instalador_telefono}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>

                      {/* Dirección */}
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            {instalacion.direccion_instalacion && (
                              <div className="text-gray-900">
                                {instalacion.direccion_instalacion}
                              </div>
                            )}
                            {instalacion.barrio && (
                              <div className="text-gray-500">
                                {instalacion.barrio}
                              </div>
                            )}
                            {instalacion.persona_recibe && (
                              <div className="text-xs text-gray-500">
                                Recibe: {instalacion.persona_recibe}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Costo */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0
                        }).format(instalacion.costo_instalacion || 0)}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Ver */}
                          <button
                            onClick={() => abrirModal('ver', instalacion)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Acciones por estado */}
                          {instalacion.estado === ESTADOS_INSTALACION.PROGRAMADA && (
                            <>
                              <button
                                onClick={() => iniciarInstalacion(instalacion)}
                                className="text-green-600 hover:text-green-900"
                                title="Iniciar instalación"
                                disabled={procesando}
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => abrirModal('editar', instalacion)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => reagendarInstalacion(instalacion)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Reagendar"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {instalacion.estado === ESTADOS_INSTALACION.EN_PROCESO && (
                            <>
                              <button
                                onClick={() => completarInstalacion(instalacion)}
                                className="text-green-600 hover:text-green-900"
                                title="Completar instalación"
                                disabled={procesando}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {['programada', 'en_proceso', 'reagendada'].includes(instalacion.estado) && (
                            <button
                              onClick={() => cancelarInstalacion(instalacion)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancelar instalación"
                              disabled={procesando}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {['programada', 'cancelada'].includes(instalacion.estado) && (
                            <button
                              onClick={() => eliminarInstalacion(instalacion.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                              disabled={procesando}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {paginacion.total_paginas > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => cambiarPagina(paginacion.pagina_actual - 1)}
                  disabled={!paginacion.tiene_anterior}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => cambiarPagina(paginacion.pagina_actual + 1)}
                  disabled={!paginacion.tiene_siguiente}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="font-medium">{paginacion.total_registros}</span>{' '}
                    resultados
                  </p>
                </div>
                
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => cambiarPagina(paginacion.pagina_actual - 1)}
                      disabled={!paginacion.tiene_anterior}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* Números de página */}
                    {Array.from({ length: Math.min(paginacion.total_paginas, 5) }, (_, i) => {
                      let pageNumber;
                      if (paginacion.total_paginas <= 5) {
                        pageNumber = i + 1;
                      } else if (paginacion.pagina_actual <= 3) {
                        pageNumber = i + 1;
                      } else if (paginacion.pagina_actual >= paginacion.total_paginas - 2) {
                        pageNumber = paginacion.total_paginas - 4 + i;
                      } else {
                        pageNumber = paginacion.pagina_actual - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => cambiarPagina(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNumber === paginacion.pagina_actual
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => cambiarPagina(paginacion.pagina_actual + 1)}
                      disabled={!paginacion.tiene_siguiente}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {mostrarModal && (
        <InstalacionModal
          modo={modoModal}
          instalacion={instalacionSeleccionada}
          onGuardar={handleGuardarInstalacion}
          onCerrar={cerrarModal}
          procesando={procesando}
        />
      )}

      {mostrarFiltros && (
        <InstalacionesFilters
          filtros={filtros}
          onAplicarFiltros={aplicarFiltros}
          onCerrar={() => setMostrarFiltros(false)}
        />
      )}
    </div>
  );
};

export default InstalacionesManagement;