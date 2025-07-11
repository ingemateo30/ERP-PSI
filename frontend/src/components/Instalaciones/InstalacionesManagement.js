// frontend/src/components/Instalaciones/InstalacionesManagement.js - VERSIÓN CORREGIDA COMPLETA

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  RotateCcw,
  XCircle,
  CheckCircle,
  Play,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import { instalacionesService } from '../../services/instalacionesService';
import { useAuth } from '../../contexts/AuthContext';
import InstalacionModal from './InstalacionModal';

// Constantes
const ESTADOS_INSTALACION = {
  PROGRAMADA: 'programada',
  EN_PROCESO: 'en_proceso',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
  REAGENDADA: 'reagendada'
};

const InstalacionesManagement = () => {
  
  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  
  const [instalaciones, setInstalaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estados para modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalModo, setModalModo] = useState('crear');
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    instalador_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    vencidas: false
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Estados para paginación
  const [paginacion, setPaginacion] = useState({
    pagina_actual: 1,
    registros_por_pagina: 20,
    total_registros: 0,
    total_paginas: 0
  });

  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    programadas: 0,
    en_proceso: 0,
    completadas: 0,
    canceladas: 0,
    vencidas: 0
  });

  // Estados para datos auxiliares
  const [instaladores, setInstaladores] = useState([]);

  const { user, hasPermission } = useAuth();

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    cargarDatos();
    cargarDatosAuxiliares();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [filtros, paginacion.pagina_actual, paginacion.registros_por_pagina]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      cargarDatos(false); // Sin loading para refresh automático
    }, 30000);

    return () => clearInterval(interval);
  }, [filtros, paginacion.pagina_actual]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

 const cargarDatos = async (mostrarCargando = true) => {
  try {
    if (mostrarCargando) setCargando(true);
    setError(null);

    const params = {
      page: paginacion.pagina_actual,
      limit: paginacion.registros_por_pagina,
      ...filtros
    };

    console.log('📡 Cargando datos con parámetros:', params);

    const response = await instalacionesService.getInstalaciones(params);
    
    console.log('📥 Respuesta del servicio:', response);

    if (response.success) {
      // Asegurar que instalaciones sea siempre un array
      const instalacionesData = Array.isArray(response.instalaciones) 
        ? response.instalaciones 
        : Array.isArray(response.data) 
          ? response.data 
          : [];
      
      console.log('📋 Instalaciones procesadas:', instalacionesData);
      setInstalaciones(instalacionesData);
      
      if (response.pagination) {
        setPaginacion(prev => ({
          ...prev,
          total_registros: response.pagination.total || 0,
          total_paginas: response.pagination.totalPages || 0
        }));
      }

      if (response.estadisticas) {
        setEstadisticas(response.estadisticas);
      }
    } else {
      console.error('❌ Error en respuesta del servicio:', response);
      setError(response.message || 'Error cargando instalaciones');
      setInstalaciones([]); // Asegurar que sea un array vacío
    }
  } catch (error) {
    console.error('❌ Error cargando instalaciones:', error);
    setError('Error cargando instalaciones: ' + error.message);
    setInstalaciones([]); // Asegurar que sea un array vacío en caso de error
  } finally {
    if (mostrarCargando) setCargando(false);
  }
};

  const cargarDatosAuxiliares = async () => {
    try {
      // Cargar instaladores
      const responseInstaladores = await instalacionesService.getInstaladores();
      if (responseInstaladores.success) {
        setInstaladores(responseInstaladores.instaladores);
      }
    } catch (error) {
      console.error('Error cargando datos auxiliares:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await instalacionesService.getEstadisticas(filtros);
      if (response.success) {
        setEstadisticas(response.estadisticas);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // ==========================================
  // MANEJO DE FILTROS
  // ==========================================

  const aplicarFiltros = (nuevosFiltros) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      estado: '',
      instalador_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      vencidas: false
    });
    setPaginacion(prev => ({ ...prev, pagina_actual: 1 }));
  };

  // ==========================================
  // MANEJO DE MODAL
  // ==========================================

  const abrirModal = (modo, instalacion = null) => {
    setModalModo(modo);
    setInstalacionSeleccionada(instalacion);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setModalModo('crear');
    setInstalacionSeleccionada(null);
  };

  const handleGuardarInstalacion = (instalacionActualizada) => {
    if (modalModo === 'crear') {
      setInstalaciones(prev => [instalacionActualizada, ...prev]);
      setSuccess('Instalación creada exitosamente');
    } else {
      setInstalaciones(prev => 
        prev.map(inst => 
          inst.id === instalacionActualizada.id ? instalacionActualizada : inst
        )
      );
      setSuccess('Instalación actualizada exitosamente');
    }
    
    cargarEstadisticas();
    cerrarModal();
  };

  // ==========================================
  // ACCIONES DE INSTALACIONES
  // ==========================================

  const asignarInstalador = async (instalacionId, instaladorId) => {
    try {
      setProcesando(true);
      
      const response = await instalacionesService.asignarInstalador(instalacionId, instaladorId);
      
      if (response.success) {
        setInstalaciones(prev => 
          prev.map(inst => 
            inst.id === instalacionId ? { ...inst, ...response.instalacion } : inst
          )
        );
        setSuccess('Instalador asignado exitosamente');
      }
    } catch (error) {
      setError('Error asignando instalador: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoInstalacion = async (instalacionId, nuevoEstado, datosAdicionales = {}) => {
    try {
      setProcesando(true);
      
      const response = await instalacionesService.cambiarEstado(instalacionId, nuevoEstado, datosAdicionales);
      
      if (response.success) {
        setInstalaciones(prev => 
          prev.map(inst => 
            inst.id === instalacionId ? { ...inst, ...response.instalacion } : inst
          )
        );
        setSuccess(`Estado cambiado a: ${nuevoEstado}`);
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error cambiando estado: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarInstalacion = async (instalacion) => {
    const confirmado = window.confirm(
      `¿Estás seguro de que deseas eliminar la instalación del cliente ${instalacion.cliente_nombre}?`
    );

    if (!confirmado) {
      return;
    }

    try {
      setProcesando(true);
      
      const response = await instalacionesService.deleteInstalacion(instalacion.id);
      
      if (response.success) {
        setInstalaciones(prev => prev.filter(inst => inst.id !== instalacion.id));
        setSuccess('Instalación eliminada exitosamente');
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error eliminando instalación: ' + error.message);
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
    if (motivo !== null && motivo.trim() !== '') {
      try {
        const response = await instalacionesService.cancelarInstalacion(instalacion.id, motivo);
        if (response.success) {
          setInstalaciones(prev => 
            prev.map(inst => 
              inst.id === instalacion.id ? { ...inst, ...response.instalacion } : inst
            )
          );
          setSuccess('Instalación cancelada exitosamente');
          cargarEstadisticas();
        }
      } catch (error) {
        setError('Error cancelando instalación: ' + error.message);
      }
    }
  };

  const reagendarInstalacion = async (instalacion) => {
    const nuevaFecha = window.prompt('Nueva fecha (YYYY-MM-DD):');
    if (!nuevaFecha) return;
    
    const nuevaHora = window.prompt('Nueva hora (HH:MM):');
    if (!nuevaHora) return;
    
    try {
      const response = await instalacionesService.reagendarInstalacion(
        instalacion.id, 
        nuevaFecha, 
        nuevaHora, 
        'Reagendada por usuario'
      );
      
      if (response.success) {
        setInstalaciones(prev => 
          prev.map(inst => 
            inst.id === instalacion.id ? { ...inst, ...response.instalacion } : inst
          )
        );
        setSuccess('Instalación reagendada exitosamente');
        cargarEstadisticas();
      }
    } catch (error) {
      setError('Error reagendando instalación: ' + error.message);
    }
  };

  const mostrarAsignarInstalador = (instalacion) => {
    const instaladorId = window.prompt(
      `Selecciona instalador para ${instalacion.cliente_nombre}:\n` +
      instaladores.map((inst, idx) => `${idx + 1}. ${inst.nombre_completo}`).join('\n') +
      '\nIngresa el número:'
    );
    
    if (instaladorId) {
      const indice = parseInt(instaladorId) - 1;
      if (indice >= 0 && indice < instaladores.length) {
        asignarInstalador(instalacion.id, instaladores[indice].id);
      }
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
      setError('Error exportando reporte: ' + error.message);
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

  const obtenerClasesEstado = (estado) => {
    switch (estado) {
      case ESTADOS_INSTALACION.PROGRAMADA:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ESTADOS_INSTALACION.EN_PROCESO:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ESTADOS_INSTALACION.COMPLETADA:
        return 'bg-green-100 text-green-800 border-green-200';
      case ESTADOS_INSTALACION.CANCELADA:
        return 'bg-red-100 text-red-800 border-red-200';
      case ESTADOS_INSTALACION.REAGENDADA:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-800">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-800">{success}</span>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Instalaciones</h1>
          <p className="text-gray-600 mt-1">
            Administra y da seguimiento a las instalaciones de servicios
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => cargarDatos()}
            disabled={cargando}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          <button
            onClick={exportarReporte}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>

          {hasPermission(['administrador', 'supervisor']) && (
            <button
              onClick={() => abrirModal('crear')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Instalación
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Wrench className="w-8 h-8 text-gray-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Programadas</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.programadas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticas.en_proceso || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.completadas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Canceladas</p>
              <p className="text-2xl font-bold text-red-900">{estadisticas.canceladas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-2xl font-bold text-orange-900">{estadisticas.vencidas || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, dirección, teléfono..."
                  value={filtros.busqueda}
                  onChange={(e) => aplicarFiltros({ busqueda: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <select
              value={filtros.estado}
              onChange={(e) => aplicarFiltros({ estado: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="programada">Programadas</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="reagendada">Reagendadas</option>
            </select>

            {/* Filtro por instalador */}
            <select
              value={filtros.instalador_id}
              onChange={(e) => aplicarFiltros({ instalador_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los instaladores</option>
              <option value="sin_asignar">Sin asignar</option>
              {instaladores.map(instalador => (
                <option key={instalador.id} value={instalador.id}>
                  {instalador.nombre_completo}
                </option>
              ))}
            </select>

            {/* Botón vencidas */}
            <button
              onClick={() => aplicarFiltros({ vencidas: !filtros.vencidas })}
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
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando instalaciones...</p>
              </div>
            </div>
          ) : instalaciones.length === 0 ? (
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
              {!Object.values(filtros).some(v => v) && hasPermission(['administrador', 'supervisor']) && (
                <button
                  onClick={() => abrirModal('crear')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear Primera Instalación
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {instalaciones.map(instalacion => (
                <div key={instalacion.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          #{instalacion.id}
                        </span>
                        
                        <span className={`px-2 py-1 text-xs rounded-full border ${obtenerClasesEstado(instalacion.estado)}`}>
                          <div className="flex items-center">
                            {obtenerIconoEstado(instalacion.estado)}
                            <span className="ml-1 capitalize">{instalacion.estado}</span>
                          </div>
                        </span>

                        {instalacion.fecha_programada && new Date(instalacion.fecha_programada) < new Date() && 
                         !['completada', 'cancelada'].includes(instalacion.estado) && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full border border-orange-200">
                            Vencida
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {instalacion.cliente_nombre || 'Cliente no especificado'}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          ID: {instalacion.cliente_identificacion || 'N/A'}
                        </div>

                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {instalacion.telefono_contacto || 'Sin teléfono'}
                        </div>

                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {instalacion.direccion_instalacion || 'Sin dirección'}
                        </div>

                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {instalacion.fecha_programada ? 
                            new Date(instalacion.fecha_programada).toLocaleDateString('es-CO') : 
                            'Sin fecha'
                          }
                          {instalacion.hora_programada && ` - ${instalacion.hora_programada}`}
                        </div>
                      </div>

                      {instalacion.instalador_nombre && (
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          Instalador: {instalacion.instalador_nombre}
                        </div>
                      )}

                      {instalacion.observaciones && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Observaciones:</span> {instalacion.observaciones}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Ver detalles */}
                      <button
                        onClick={() => abrirModal('ver', instalacion)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Editar */}
                      {hasPermission(['administrador', 'supervisor']) && 
                       !['completada', 'cancelada'].includes(instalacion.estado) && (
                        <button
                          onClick={() => abrirModal('editar', instalacion)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Asignar instalador */}
                      {hasPermission(['administrador', 'supervisor']) && 
                       !instalacion.instalador_id && 
                       !['completada', 'cancelada'].includes(instalacion.estado) && (
                        <button
                          onClick={() => mostrarAsignarInstalador(instalacion)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                          title="Asignar instalador"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Iniciar instalación */}
                      {instalacion.estado === 'programada' && instalacion.instalador_id && (
                        <button
                          onClick={() => iniciarInstalacion(instalacion)}
                          className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-lg transition-colors"
                          title="Iniciar instalación"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      {/* Completar instalación */}
                      {instalacion.estado === 'en_proceso' && (
                        <button
                          onClick={() => completarInstalacion(instalacion)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                          title="Completar instalación"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reagendar */}
                      {hasPermission(['administrador', 'supervisor']) && 
                       !['completada', 'cancelada'].includes(instalacion.estado) && (
                        <button
                          onClick={() => reagendarInstalacion(instalacion)}
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Reagendar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancelar */}
                      {hasPermission(['administrador', 'supervisor']) && 
                       !['completada', 'cancelada'].includes(instalacion.estado) && (
                        <button
                          onClick={() => cancelarInstalacion(instalacion)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                          title="Cancelar instalación"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Eliminar */}
                      {hasPermission(['administrador']) && (
                        <button
                          onClick={() => eliminarInstalacion(instalacion)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                          title="Eliminar instalación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        {paginacion.total_paginas > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {((paginacion.pagina_actual - 1) * paginacion.registros_por_pagina) + 1} a{' '}
                {Math.min(paginacion.pagina_actual * paginacion.registros_por_pagina, paginacion.total_registros)} de{' '}
                {paginacion.total_registros} resultados
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => cambiarPagina(paginacion.pagina_actual - 1)}
                  disabled={paginacion.pagina_actual <= 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, paginacion.total_paginas) }, (_, i) => {
                    let pageNum;
                    if (paginacion.total_paginas <= 5) {
                      pageNum = i + 1;
                    } else if (paginacion.pagina_actual <= 3) {
                      pageNum = i + 1;
                    } else if (paginacion.pagina_actual >= paginacion.total_paginas - 2) {
                      pageNum = paginacion.total_paginas - 4 + i;
                    } else {
                      pageNum = paginacion.pagina_actual - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => cambiarPagina(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg ${
                          pageNum === paginacion.pagina_actual
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => cambiarPagina(paginacion.pagina_actual + 1)}
                  disabled={paginacion.pagina_actual >= paginacion.total_paginas}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de instalación */}
      {mostrarModal && (
        <InstalacionModal
          instalacion={instalacionSeleccionada}
          modo={modalModo}
          onCerrar={cerrarModal}
          onGuardar={handleGuardarInstalacion}
        />
      )}
    </div>
  );
};

export default InstalacionesManagement;