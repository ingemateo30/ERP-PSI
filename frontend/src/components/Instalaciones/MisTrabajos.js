import ModalDetalleInstalacion from './ModalDetalleInstalacion';// frontend/src/components/Instalaciones/MisTrabajos.js
import apiService from '../../services/apiService';
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Wrench,
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
  Package,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ModalCompletarInstalacion from '../Instalador/ModalCompletarInstalacion';


const MisTrabajos = () => {
  const { user } = useAuth();
  const [instalaciones, setInstalaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  
  // Modal de Iniciar/Continuar
  const [modalCompletarOpen, setModalCompletarOpen] = useState(false);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  
  // Modal de Detalle (solo lectura)
  const [modalDetalle, setModalDetalle] = useState(false);
  const [instalacionDetalle, setInstalacionDetalle] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    pendientes: 0,
    en_proceso: 0,
    completadas_hoy: 0
  });

  // Cargar trabajos del instalador
  const cargarTrabajos = async () => {
  try {
    setCargando(true);
    setError(null);

    // ✅ Usar el mismo endpoint que el Dashboard
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/instalador/mis-instalaciones`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      const todasInstalaciones = data.instalaciones || [];
      
      // Filtrar según el estado seleccionado
      let instalacionesFiltradas = todasInstalaciones;
      if (filtroEstado === 'pendiente') {
        instalacionesFiltradas = todasInstalaciones.filter(inst => inst.estado === 'programada');
      } else if (filtroEstado === 'en_proceso') {
        instalacionesFiltradas = todasInstalaciones.filter(inst => inst.estado === 'en_proceso');
      } else if (filtroEstado === 'completada') {
        instalacionesFiltradas = todasInstalaciones.filter(inst => inst.estado === 'completada');
      }
      // Si es 'todas', no filtra
      
      setInstalaciones(instalacionesFiltradas);

      // ✅ ARREGLADO: Calcular estadísticas con TODAS las instalaciones
      const stats = {
        pendientes: todasInstalaciones.filter(inst => inst.estado === 'programada').length,
        en_proceso: todasInstalaciones.filter(inst => inst.estado === 'en_proceso').length,
        completadas_hoy: todasInstalaciones.filter(inst => {
          if (inst.estado !== 'completada') return false;

          // Usar fecha_completada o fecha_realizada
          const fechaStr = inst.fecha_completada || inst.fecha_realizada;
          return esHoy(fechaStr);
        }).length
      };

      console.log('📊 MIS TRABAJOS - Estadísticas calculadas:', stats);
      setEstadisticas(stats);
    }
  } catch (err) {
    console.error('Error cargando trabajos:', err);
    setError('Error cargando trabajos');
  } finally {
    setCargando(false);
  }
};

  useEffect(() => {
    if (user?.id) {
      cargarTrabajos();
    }
  }, [user?.id, filtroEstado]);

  const esHoy = (fecha) => {
    if (!fecha) return false;
    const hoyDate = new Date();
    const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}-${String(hoyDate.getDate()).padStart(2, '0')}`;
    const fechaComparar = (typeof fecha === 'string' ? fecha : fecha.toISOString()).split('T')[0];
    return hoy === fechaComparar;
  };

const abrirModal = (instalacion) => {
  setInstalacionSeleccionada(instalacion);
  setModalCompletarOpen(true);
};
const cerrarModal = () => {
  setModalCompletarOpen(false);
  setInstalacionSeleccionada(null);
  cargarTrabajos();
};

  const getEstadoColor = (estado) => {
    const colores = {
      'programada': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'en_proceso': 'bg-blue-100 text-blue-800 border-blue-300',
      'completada': 'bg-green-100 text-green-800 border-green-300',
      'cancelada': 'bg-red-100 text-red-800 border-red-300'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getEstadoIcono = (estado) => {
    switch (estado) {
      case 'programada': return <Clock size={18} className="text-yellow-600" />;
      case 'en_proceso': return <Play size={18} className="text-blue-600" />;
      case 'completada': return <CheckCircle size={18} className="text-green-600" />;
      case 'cancelada': return <XCircle size={18} className="text-red-600" />;
      default: return <AlertCircle size={18} className="text-gray-600" />;
    }
  };

  if (cargando && instalaciones.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-[#0e6493] mb-4" />
          <p className="text-gray-600">Cargando trabajos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-[#0e6493] to-[#0e6493]/80 rounded-xl p-6 shadow-lg text-white">
        <h1 className="text-3xl font-bold mb-2">Mis Trabajos del Día</h1>
        <p className="text-lg opacity-90">
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pendientes</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.pendientes}</p>
            </div>
            <Clock className="text-yellow-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">En Proceso</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.en_proceso}</p>
            </div>
            <Play className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completadas Hoy</p>
              <p className="text-3xl font-bold text-gray-800">{estadisticas.completadas_hoy}</p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <Filter size={20} className="text-gray-600 flex-shrink-0" />
          <button
            onClick={() => setFiltroEstado('pendiente')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              filtroEstado === 'pendiente'
                ? 'bg-[#0e6493] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltroEstado('en_proceso')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              filtroEstado === 'en_proceso'
                ? 'bg-[#0e6493] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En Proceso
          </button>
          <button
            onClick={() => setFiltroEstado('completada')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              filtroEstado === 'completada'
                ? 'bg-[#0e6493] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completadas
          </button>
          <button
            onClick={() => setFiltroEstado('todas')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              filtroEstado === 'todas'
                ? 'bg-[#0e6493] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Lista de Trabajos */}
      {instalaciones.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No hay trabajos {filtroEstado !== 'todas' ? filtroEstado + 's' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {instalaciones.map((instalacion) => (
            <div
              key={instalacion.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Header del trabajo */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {instalacion.cliente_nombre}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(instalacion.estado)}`}>
                        {getEstadoIcono(instalacion.estado)}
                        <span className="ml-1">{instalacion.estado.toUpperCase()}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Tipo: {instalacion.tipo_instalacion} • Plan: {instalacion.plan_nombre}
                    </p>
                  </div>
                </div>

                {/* Información del trabajo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dirección</p>
                      <p className="text-sm text-gray-600">{instalacion.direccion_instalacion}</p>
                      {instalacion.barrio && (
                        <p className="text-xs text-gray-500">Barrio: {instalacion.barrio}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Contacto</p>
                      <p className="text-sm text-gray-600">{instalacion.telefono_contacto}</p>
                      {instalacion.persona_recibe && (
                        <p className="text-xs text-gray-500">Recibe: {instalacion.persona_recibe}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Fecha Programada</p>
                      <p className="text-sm text-gray-600">
                        {instalacion.fecha_programada
                          ? new Date(instalacion.fecha_programada.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Hora</p>
                      <p className="text-sm text-gray-600">
                        {instalacion.hora_programada?.substring(0, 5) || 'No especificada'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {instalacion.observaciones && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Observaciones:</p>
                    <p className="text-sm text-gray-600">{instalacion.observaciones}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  {instalacion.estado === 'programada' && (
                    <button
                      onClick={() => abrirModal(instalacion)}
                      className="flex items-center space-x-2 bg-[#0e6493] hover:bg-[#0a4d6e] text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Play size={18} />
                      <span>Iniciar Instalación</span>
                    </button>
                  )}

                  {instalacion.estado === 'en_proceso' && (
                    <button
                      onClick={() => abrirModal(instalacion)}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      <Wrench size={18} />
                      <span>Continuar Instalación</span>
                    </button>
                  )}

                 <button
  onClick={() => {
    setInstalacionDetalle(instalacion);
    setModalDetalle(true);
  }}
  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
>
  <Eye size={18} />
  <span>Ver Detalles</span>
</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Instalación */}
      <ModalCompletarInstalacion
  isOpen={modalCompletarOpen}
  onClose={cerrarModal}
  instalacion={instalacionSeleccionada}
  onSuccess={cargarTrabajos}
/>

      {/* Modal de Detalle */}
      {modalDetalle && instalacionDetalle && (
        <ModalDetalleInstalacion
          isOpen={modalDetalle}
          onClose={() => {
            setModalDetalle(false);
            setInstalacionDetalle(null);
          }}
          instalacion={instalacionDetalle}
        />
      )}
    </div>
  );
};

export default MisTrabajos;