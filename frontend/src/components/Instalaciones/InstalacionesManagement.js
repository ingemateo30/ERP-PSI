// frontend/src/components/Instalaciones/InstalacionesManagement.js - ACTUALIZADO CON MODAL DE REAGENDAMIENTO

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
  RefreshCw,
  FileText
} from 'lucide-react';

import { instalacionesService } from '../../services/instalacionesService';
import { useAuth } from '../../contexts/AuthContext';
import InstalacionModal from './InstalacionModal';
import AsignarInstaladorModal from './AsignarInstaladorModal';
import ReagendarInstalacionModal from './ReagendarInstalacionModal'; // NUEVO IMPORT
import authService from '../../services/authService';

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

  // Estados para modales
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalModo, setModalModo] = useState('crear');
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  
  // ARREGLADO: Estados para modales adicionales  
  const [mostrarAsignarModal, setMostrarAsignarModal] = useState(false);
  const [mostrarReagendarModal, setMostrarReagendarModal] = useState(false); // NUEVO ESTADO

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
    cargarInstaladores();
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [filtros, paginacion.pagina_actual]);

  // Auto-limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ==========================================
  // FUNCIONES DE CARGA DE DATOS
  // ==========================================

const cargarDatos = useCallback(async () => {
  try {
    setCargando(true);
    setError(null);

    let response;

    // Si es instalador, usar endpoint específico
    if (user?.rol === 'instalador') {
      console.log('👷 Instalador detectado, cargando solo mis instalaciones');
      
      // ✅ Usar el servicio en lugar de fetch directo
      const apiResponse = await instalacionesService.getMisInstalaciones();
      
      response = {
        success: true,
        instalaciones: apiResponse.instalaciones || [],
        pagination: {
          total: apiResponse.instalaciones?.length || 0,
          totalPages: 1
        },
        estadisticas: {
          total: apiResponse.instalaciones?.length || 0,
          programadas: apiResponse.instalaciones?.filter(i => i.estado === 'programada').length || 0,
          en_proceso: apiResponse.instalaciones?.filter(i => i.estado === 'en_proceso').length || 0,
          completadas: apiResponse.instalaciones?.filter(i => i.estado === 'completada').length || 0,
          canceladas: apiResponse.instalaciones?.filter(i => i.estado === 'cancelada').length || 0,
          vencidas: apiResponse.instalaciones?.filter(i => {
            if (i.estado !== 'programada') return false;
            const fechaProgramada = new Date(i.fecha_programada);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            return fechaProgramada < hoy;
          }).length || 0
        }
      };
    } else {
      // Admin y supervisor usan el servicio normal
      const parametros = {
        page: paginacion.pagina_actual,
        limit: paginacion.registros_por_pagina,
        ...filtros
      };

      console.log('🔄 Cargando datos con parámetros:', parametros);
      response = await instalacionesService.getInstalaciones(parametros);
    }
    
    if (response.success) {
      setInstalaciones(response.instalaciones || []);
      setPaginacion(prev => ({
        ...prev,
        total_registros: response.pagination?.total || 0,
        total_paginas: response.pagination?.totalPages || 0
      }));
      setEstadisticas(response.estadisticas || {});
      console.log('✅ Datos cargados correctamente:', response.instalaciones?.length, 'instalaciones');
    } else {
      throw new Error(response.message || 'Error cargando instalaciones');
    }
  } catch (error) {
    console.error('❌ Error cargando instalaciones:', error);
    setError(`Error cargando datos: ${error.message}`);
    setInstalaciones([]);
  } finally {
    setCargando(false);
  }
}, [filtros, paginacion.pagina_actual, paginacion.registros_por_pagina, user]);  const cargarInstaladores = useCallback(async () => {
    try {
      const response = await instalacionesService.getInstaladores();
      if (response.success) {
        setInstaladores(response.instaladores || []);
      }
    } catch (error) {
      console.error('❌ Error cargando instaladores:', error);
    }
  }, []);

  // ARREGLADO: Función para cargar estadísticas
  const cargarEstadisticas = useCallback(async () => {
    try {
      const response = await instalacionesService.getEstadisticas();
      if (response.success) {
        setEstadisticas(response.estadisticas || {});
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  }, []);

  // ==========================================
  // FUNCIONES DE ACCIONES ARREGLADAS
  // ==========================================

  const abrirModal = (modo, instalacion = null) => {
    console.log(`📝 Abriendo modal en modo: ${modo}`, instalacion);

    setModalModo(modo);
    setInstalacionSeleccionada(instalacion);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setModalModo('crear');
    setInstalacionSeleccionada(null);
  };

const handleGuardarInstalacion = async (datosInstalacion) => {
  try {
    setProcesando(true);
    let response;
    
    if (modalModo === 'crear') {
      response = await instalacionesService.createInstalacion(datosInstalacion);
      setSuccess('Instalación creada exitosamente');
    } else if (modalModo === 'editar') {
      response = await instalacionesService.updateInstalacion(
        instalacionSeleccionada.id,
        datosInstalacion
      );
      setSuccess('Instalación actualizada exitosamente');
    }
    
    if (response.success) {
      cargarDatos();
      cargarEstadisticas();
      cerrarModal();
    }
  } catch (error) {
    console.error('❌ Error guardando instalación:', error);
    
    // Mostrar mensaje amigable
    if (error.message && error.message.includes('Ya existe una instalación pendiente')) {
      setError('⚠️ Este servicio ya tiene una instalación pendiente. Por favor, completa o cancela la instalación existente antes de crear una nueva.');
    } else if (error.message) {
      setError(`Error: ${error.message}`);
    } else {
      setError('Ocurrió un error desconocido al guardar la instalación.');
    }
    
    // RE-LANZAR el error para que lo capture onSubmit
    throw error;
  } finally {
    setProcesando(false);
  }
};
  // ARREGLADO: Función de ver detalles
  const verDetalles = (instalacion) => {
    console.log('👁️ Viendo detalles de instalación:', instalacion.id);
    abrirModal('ver', instalacion);
  };

  // ARREGLADO: Función de iniciar instalación solo para instaladores
  const iniciarInstalacion = async (instalacion) => {
    // Verificar que es instalador
    if (user.rol !== 'instalador') {
      setError('Solo los instaladores pueden iniciar instalaciones');
      return;
    }

    // Verificar que es su instalación
    if (instalacion.instalador_id !== user.id) {
      setError('Solo puedes iniciar instalaciones asignadas a ti');
      return;
    }

    if (!window.confirm('¿Confirmas que deseas iniciar esta instalación?')) {
      return;
    }

    try {
      setProcesando(true);

      const response = await instalacionesService.cambiarEstado(
        instalacion.id,
        'en_proceso',
        { observaciones: 'Instalación iniciada por el técnico' }
      );

      if (response.success) {
        setSuccess('Instalación iniciada exitosamente');
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      console.error('❌ Error iniciando instalación:', error);
      setError(`Error iniciando instalación: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // ARREGLADO: Función de asignar instalador
  const abrirAsignarInstalador = (instalacion) => {
    console.log('👷‍♂️ Abriendo modal para asignar instalador a:', instalacion.id);
    setInstalacionSeleccionada(instalacion);
    setMostrarAsignarModal(true);
  };

  const handleAsignarInstalador = async (instalacionId, instaladorId) => {
    try {
      setProcesando(true);

      const response = await instalacionesService.asignarInstalador(instalacionId, instaladorId);

      if (response.success) {
        setSuccess('Instalador asignado exitosamente');
        setMostrarAsignarModal(false);
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      console.error('❌ Error asignando instalador:', error);
      setError(`Error asignando instalador: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // NUEVO: Función para abrir modal de reagendamiento
  const abrirReagendarModal = (instalacion) => {
    console.log('📅 Abriendo modal para reagendar instalación:', instalacion.id);
    setInstalacionSeleccionada(instalacion);
    setMostrarReagendarModal(true);
  };

  // NUEVO: Función para manejar reagendamiento con modal
  const handleReagendarInstalacion = async (instalacionId, datosReagendamiento) => {
    try {
      setProcesando(true);

      const response = await instalacionesService.updateInstalacion(instalacionId, {
        fecha_programada: datosReagendamiento.fecha_programada,
        hora_programada: datosReagendamiento.hora_programada,
        estado: 'reagendada',
        observaciones: `${datosReagendamiento.motivo}${datosReagendamiento.observaciones ? '\n\nObservaciones adicionales: ' + datosReagendamiento.observaciones : ''}`
      });

      if (response.success) {
        setSuccess('Instalación reagendada exitosamente');
        setMostrarReagendarModal(false);
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      console.error('❌ Error reagendando instalación:', error);
      setError(`Error reagendando instalación: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // ARREGLADO: Función de cancelar
  const cancelarInstalacion = async (instalacion) => {
    const motivo = prompt('Ingresa el motivo de la cancelación:');
    if (!motivo) return;

    if (!window.confirm('¿Estás seguro de que deseas cancelar esta instalación?')) {
      return;
    }

    try {
      setProcesando(true);

      const response = await instalacionesService.cambiarEstado(
        instalacion.id,
        'cancelada',
        {
          motivo_cancelacion: motivo,
          observaciones: `Cancelada: ${motivo}`
        }
      );

      if (response.success) {
        setSuccess('Instalación cancelada exitosamente');
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      console.error('❌ Error cancelando instalación:', error);
      setError(`Error cancelando instalación: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // ARREGLADO: Función de eliminar
  const eliminarInstalacion = async (instalacion) => {
    // Solo administradores pueden eliminar
    if (user.rol !== 'administrador') {
      setError('Solo los administradores pueden eliminar instalaciones');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la instalación para ${instalacion.cliente_nombre}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setProcesando(true);

      const response = await instalacionesService.deleteInstalacion(instalacion.id);

      if (response.success) {
        setSuccess('Instalación eliminada exitosamente');
        cargarDatos();
        cargarEstadisticas();
      }
    } catch (error) {
      console.error('❌ Error eliminando instalación:', error);
      setError(`Error eliminando instalación: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // ARREGLADO: Función de exportar
 const exportarDatos = async () => {
  try {
    setProcesando(true);
    console.log('📊 Iniciando exportación...');

    const response = await instalacionesService.exportarInstalaciones({
      ...filtros,
      formato: 'excel'
    });

    if (!response || !response.data) {
      throw new Error('No se recibieron datos para exportar');
    }

    // Crear blob y descargar
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `instalaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setSuccess('📊 Archivo exportado exitosamente');
    
  } catch (error) {
    console.error('❌ Error exportando:', error);
    setError(`Error al exportar instalaciones: ${error.message}`);
  } finally {
    setProcesando(false);
  }
};

  // NUEVO: Función para generar orden de servicio PDF
  const generarOrdenServicioPDF = async (instalacion) => {
    try {
      setProcesando(true);
      setError('');
      
      console.log('📄 Generando orden PSI...');
      console.log('🔍 Instalación recibida:', instalacion);
      
      // Validaciones mejoradas
      if (!instalacion) {
        throw new Error('No se proporcionó información de la instalación');
      }
      
      if (!instalacion.id) {
        console.error('❌ Instalación sin ID:', instalacion);
        throw new Error('La instalación no tiene un ID válido');
      }
      
      console.log('📋 Procesando instalación ID:', instalacion.id);
      
      // Llamar al servicio
      const response = await instalacionesService.generarOrdenServicioPDF(instalacion.id);
      
      console.log('📊 Respuesta del servicio:', response);
      
      if (response && response.success && response.data) {
        console.log('✅ PDF recibido, tamaño:', response.data.size);
        
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PSI_${String(instalacion.id).padStart(6, '0')}.pdf`;
        
        // Agregar al DOM, hacer click y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL del blob
        window.URL.revokeObjectURL(url);
        
        setSuccess('Orden PSI generada y descargada exitosamente');
        console.log('✅ Descarga completada');
        
      } else {
        console.error('❌ Respuesta inválida:', response);
        throw new Error('No se pudo generar el PDF correctamente');
      }
      
    } catch (error) {
      console.error('❌ Error completo generando PDF:', error);
      setError(`Error generando orden PSI: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  // ==========================================
  // FUNCIONES DE FILTROS
  // ==========================================

  const aplicarFiltro = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginacion(prev => ({
      ...prev,
      pagina_actual: 1
    }));
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
    setPaginacion(prev => ({
      ...prev,
      pagina_actual: 1
    }));
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

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    // Extraer solo la parte de fecha (YYYY-MM-DD) para evitar conversión de zona horaria UTC
    const datePart = (typeof fecha === 'string' ? fecha : fecha.toISOString()).split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatearHora = (hora) => {
    if (!hora) return '-';
    return hora.substring(0, 5);
  };

  // Verificar si una instalación está vencida
  const estaVencida = (instalacion) => {
    if (instalacion.estado !== 'programada') return false;
    const fechaProgramada = new Date(instalacion.fecha_programada);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaProgramada < hoy;
  };

  // ARREGLADO: Verificar permisos para acciones
  const puedeEjecutarAccion = (accion, instalacion) => {
    switch (accion) {
      case 'iniciar':
        return user.rol === 'instalador' &&
          instalacion.instalador_id === user.id &&
          instalacion.estado === 'programada';
      case 'asignar':
        return (user.rol === 'administrador' || user.rol === 'supervisor' || user.rol === 'secretaria');
      case 'editar':
        return (user.rol === 'administrador' || user.rol === 'supervisor');
      case 'eliminar':
        return user.rol === 'administrador';
      case 'reagendar':
        return (user.rol === 'administrador' || user.rol === 'supervisor');
      case 'cancelar':
        return (user.rol === 'administrador' || user.rol === 'supervisor');
      case 'ver':
        return true; // Todos pueden ver
      case 'generar_pdf':
        // ✅ CORRECCIÓN: Operarios/instaladores NO pueden descargar orden de servicio
        return (user.rol === 'administrador' || user.rol === 'supervisor');
      default:
        return false;
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
  <h1 className="text-2xl font-bold text-gray-900">
    {user?.rol === 'instalador' ? 'Mis Instalaciones Asignadas' : 'Gestión de Instalaciones'}
  </h1>
  <p className="mt-1 text-sm text-gray-600">
    {user?.rol === 'instalador' 
      ? 'Instalaciones que me han sido asignadas' 
      : 'Administra las instalaciones de servicios'
    }
  </p>
</div>

            <div className="flex items-center space-x-3">
              {/* ARREGLADO: Botón exportar - Solo admin y supervisor */}
              {(user.rol === 'administrador' || user.rol === 'supervisor') && (
                <button
                  onClick={exportarDatos}
                  disabled={procesando}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {procesando ? 'Exportando...' : 'Exportar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <p className="text-green-800">{success}</p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-400 hover:text-green-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-900">
              {estadisticas.total || 0}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">
              {estadisticas.programadas || 0}
            </div>
            <div className="text-sm text-gray-600">Programadas</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {estadisticas.en_proceso || 0}
            </div>
            <div className="text-sm text-gray-600">En Proceso</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">
              {estadisticas.completadas || 0}
            </div>
            <div className="text-sm text-gray-600">Completadas</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-red-600">
              {estadisticas.canceladas || 0}
            </div>
            <div className="text-sm text-gray-600">Canceladas</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-orange-600">
              {estadisticas.vencidas || 0}
            </div>
            <div className="text-sm text-gray-600">Vencidas</div>
          </div>
        </div>
      </div>

      {/* Tabla de instalaciones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white rounded-lg border">
          {cargando ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : instalaciones.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay instalaciones
              </h3>
              <p className="text-gray-600 mb-4">
                Aún no hay instalaciones registradas
              </p>
            </div>
          ) : (
            <>
            {/* Vista móvil: tarjetas */}
            <div className="block md:hidden divide-y divide-gray-200">
              {instalaciones.map((instalacion) => (
                <div key={instalacion.id} className={`p-4 ${estaVencida(instalacion) ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{instalacion.cliente_nombre}</p>
                      <p className="text-xs text-gray-500">{instalacion.cliente_identificacion}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      instalacion.estado === 'programada' ? 'bg-blue-100 text-blue-800' :
                      instalacion.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-800' :
                      instalacion.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      instalacion.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {obtenerNombreEstado(instalacion.estado)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p><span className="font-medium">Fecha:</span> {formatearFecha(instalacion.fecha_programada)} {formatearHora(instalacion.hora_programada)}</p>
                    <p><span className="font-medium">Instalador:</span> {instalacion.instalador_nombre || 'Sin asignar'}</p>
                    {instalacion.direccion_instalacion && <p><span className="font-medium">Dirección:</span> {instalacion.direccion_instalacion}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {puedeEjecutarAccion('ver', instalacion) && (
                      <button onClick={() => verDetalles(instalacion)} className="text-blue-600 hover:text-blue-800" title="Ver detalles"><Eye className="w-4 h-4" /></button>
                    )}
                    {puedeEjecutarAccion('iniciar', instalacion) && (
                      <button onClick={() => iniciarInstalacion(instalacion)} className="text-green-600 hover:text-green-800" title="Iniciar"><Play className="w-4 h-4" /></button>
                    )}
                    {puedeEjecutarAccion('asignar', instalacion) && (
                      <button onClick={() => abrirAsignarInstalador(instalacion)} className="text-purple-600 hover:text-purple-800" title="Asignar"><UserPlus className="w-4 h-4" /></button>
                    )}
                    {puedeEjecutarAccion('cancelar', instalacion) && !['cancelada','completada'].includes(instalacion.estado) && (
                      <button onClick={() => cancelarInstalacion(instalacion)} className="text-red-600 hover:text-red-800" title="Cancelar"><XCircle className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
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
                      Instalador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {instalaciones.map((instalacion) => (
                    <tr key={instalacion.id} className={`hover:bg-gray-50 ${estaVencida(instalacion) ? 'bg-red-50' : ''}`}>

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
                          </div>
                        </div>
                      </td>

                      {/* Fecha/Hora */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatearFecha(instalacion.fecha_programada)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatearHora(instalacion.hora_programada)}
                        </div>
                      </td>

                      {/* Instalador */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {instalacion.instalador_nombre || 'Sin asignar'}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${instalacion.estado === 'programada' ? 'bg-blue-100 text-blue-800' :
                            instalacion.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-800' :
                              instalacion.estado === 'completada' ? 'bg-green-100 text-green-800' :
                                instalacion.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                                  instalacion.estado === 'reagendada' ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                          }`}>
                          {obtenerNombreEstado(instalacion.estado)}
                        </span>
                        {estaVencida(instalacion) && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Vencida
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Dirección */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {instalacion.direccion_instalacion}
                        </div>
                        {instalacion.barrio && (
                          <div className="text-sm text-gray-500">
                            {instalacion.barrio}
                          </div>
                        )}
                      </td>

                      {/* ARREGLADO: Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">

                          {/* Ver detalles - ARREGLADO */}
                          {puedeEjecutarAccion('ver', instalacion) && (
                            <button
                              onClick={() => verDetalles(instalacion)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Generar orden de servicio PDF - NUEVO */}
                          {puedeEjecutarAccion('generar_pdf', instalacion) && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('🔍 DEBUG - Instalación completa:', instalacion);
                                console.log('🔍 DEBUG - ID:', instalacion?.id);

                                if (!instalacion) {
                                  console.error('❌ Instalación es undefined');
                                  setError('Error: No se encontró información de la instalación');
                                  return;
                                }

                                if (!instalacion.id) {
                                  console.error('❌ Instalación no tiene ID:', instalacion);
                                  setError('Error: La instalación no tiene un ID válido');
                                  return;
                                }

                                generarOrdenServicioPDF(instalacion);
                              }}
                              disabled={procesando}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Generar orden PSI"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Iniciar instalación - ARREGLADO: Solo instaladores en sus instalaciones */}
                          {puedeEjecutarAccion('iniciar', instalacion) && (
                            <button
                              onClick={() => iniciarInstalacion(instalacion)}
                              disabled={procesando}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Iniciar instalación"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {/* Asignar instalador - ARREGLADO: Admin y supervisor */}
                          {puedeEjecutarAccion('asignar', instalacion) && (
                            <button
                              onClick={() => abrirAsignarInstalador(instalacion)}
                              disabled={procesando}
                              className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                              title="Asignar instalador"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}

                          {/* Editar - ARREGLADO: Admin y supervisor */}
                          {puedeEjecutarAccion('editar', instalacion) && (
                            <button
                              onClick={() => abrirModal('editar', instalacion)}
                              disabled={procesando}
                              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                              title="Editar instalación"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* NUEVO: Reagendar con modal - ARREGLADO: Admin y supervisor */}
                          {puedeEjecutarAccion('reagendar', instalacion) && instalacion.estado !== 'completada' && (
                            <button
                              onClick={() => abrirReagendarModal(instalacion)}
                              disabled={procesando}
                              className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                              title="Reagendar instalación"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancelar - ARREGLADO: Admin y supervisor */}
                          {puedeEjecutarAccion('cancelar', instalacion) &&
                            !['cancelada', 'completada'].includes(instalacion.estado) && (
                              <button
                                onClick={() => cancelarInstalacion(instalacion)}
                                disabled={procesando}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Cancelar instalación"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                          {/* Eliminar - ARREGLADO: Solo admin */}
                          {puedeEjecutarAccion('eliminar', instalacion) && (
                            <button
                              onClick={() => eliminarInstalacion(instalacion)}
                              disabled={procesando}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Eliminar instalación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>{/* fin desktop */}
            </>
          )}
        </div>

        {/* Paginación */}
        {!cargando && instalaciones.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {((paginacion.pagina_actual - 1) * paginacion.registros_por_pagina) + 1} a{' '}
              {Math.min(paginacion.pagina_actual * paginacion.registros_por_pagina, paginacion.total_registros)} de{' '}
              {paginacion.total_registros} registros
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPaginacion(prev => ({
                  ...prev,
                  pagina_actual: Math.max(1, prev.pagina_actual - 1)
                }))}
                disabled={paginacion.pagina_actual <= 1 || cargando}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <span className="px-3 py-2 text-sm text-gray-700">
                Página {paginacion.pagina_actual} de {paginacion.total_paginas}
              </span>

              <button
                onClick={() => setPaginacion(prev => ({
                  ...prev,
                  pagina_actual: Math.min(paginacion.total_paginas, prev.pagina_actual + 1)
                }))}
                disabled={paginacion.pagina_actual >= paginacion.total_paginas || cargando}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}

      {/* Modal principal de instalaciones - ARREGLADO */}
      {mostrarModal && (
        <InstalacionModal
          instalacion={instalacionSeleccionada}
          modo={modalModo}
          onCerrar={cerrarModal}
          onGuardar={handleGuardarInstalacion}
        />
      )}

      {/* Modal de asignar instalador - ARREGLADO */}
      {mostrarAsignarModal && (
        <AsignarInstaladorModal
          visible={mostrarAsignarModal}
          instalacion={instalacionSeleccionada}
          instaladores={instaladores}
          onAsignar={handleAsignarInstalador}
          onCerrar={() => setMostrarAsignarModal(false)}
          procesando={procesando}
        />
      )}

      {/* NUEVO: Modal de reagendar instalación */}
      {mostrarReagendarModal && (
        <ReagendarInstalacionModal
          visible={mostrarReagendarModal}
          instalacion={instalacionSeleccionada}
          onReagendar={handleReagendarInstalacion}
          onCerrar={() => setMostrarReagendarModal(false)}
          procesando={procesando}
        />
      )}
    </div>
  );
};

export default InstalacionesManagement;