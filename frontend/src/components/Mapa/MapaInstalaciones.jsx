// frontend/src/components/Mapa/MapaInstalaciones.jsx
// Mapa de Instalaciones - VERSIÓN CORREGIDA

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Navigation, Calendar, CheckCircle, Clock,
  XCircle, AlertCircle, Filter, RefreshCw,
  Home, Phone, User, Package, Loader2,
  BarChart3, Map as MapIcon, Activity, Info
} from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

// ==========================================
// FIX ICONOS LEAFLET
// ==========================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ==========================================
// ICONOS PERSONALIZADOS
// ==========================================
const crearIcono = (estado, numero) => {
  const colores = {
    programada: '#3B82F6',
    en_proceso: '#F59E0B',
    completada: '#10B981',
    cancelada: '#EF4444',
    reagendada: '#8B5CF6'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${colores[estado]||'#6B7280'};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:bold">${numero||''}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// ==========================================
// AJUSTAR VISTA DEL MAPA
// ==========================================
const AjustarVista = ({ instalaciones }) => {
  const map = useMap();
  
  useEffect(() => {
    if (instalaciones?.length > 0) {
      const bounds = instalaciones.map(i => [i.coordenadas.lat, i.coordenadas.lng]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [instalaciones, map]);
  
  return null;
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const MapaInstalaciones = () => {
  const { user } = useAuth();
  const [instalaciones, setInstalaciones] = useState([]);
  const [instalacionesMapa, setInstalacionesMapa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodificando, setGeocodificando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    instalador: '',
    fechaDesde: '',
    fechaHasta: '',
    busqueda: ''
  });
  const [busquedaTemp, setBusquedaTemp] = useState('');
  const [vistaActual, setVistaActual] = useState('lista');
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    programadas: 0,
    en_proceso: 0,
    completadas: 0,
    canceladas: 0,
    reagendadas: 0,
    con_direccion: 0
  });

  const CENTRO_MAPA = [6.4667, -73.2667]; // Socorro
  const ZOOM = 13;

  // Verificar si el usuario es instalador
  const esInstalador = user && user.rol === 'instalador';

  // Debounce para el campo de búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busqueda: busquedaTemp }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busquedaTemp]);

  useEffect(() => {
    cargarInstalaciones();
  }, [filtros]);

  const cargarInstalaciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.instalador) params.append('instalador_id', filtros.instalador);
      if (filtros.fechaDesde) params.append('fecha_desde', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fecha_hasta', filtros.fechaHasta);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);

      const res = await apiService.get(`/instalaciones?${params}`);
      console.log('📡 Respuesta API:', res);
      console.log('📡 Parámetros enviados:', params.toString());

      if (res.success && Array.isArray(res.data)) {
        console.log(`✅ Instalaciones cargadas: ${res.data.length}`);
        setInstalaciones(res.data);
        calcularEstadisticas(res.data);
      }
      setError(null);
    } catch (err) {
      console.error('❌ Error cargando instalaciones:', err);
      setError('Error cargando instalaciones');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (datos) => {
    const conDir = datos.filter(i => i.direccion_instalacion || i.cliente_direccion || i.direccion).length;
    console.log(`📊 Con dirección: ${conDir} de ${datos.length}`);
    
    setEstadisticas({
      total: datos.length,
      programadas: datos.filter(i => i.estado === 'programada').length,
      en_proceso: datos.filter(i => i.estado === 'en_proceso').length,
      completadas: datos.filter(i => i.estado === 'completada').length,
      canceladas: datos.filter(i => i.estado === 'cancelada').length,
      reagendadas: datos.filter(i => i.estado === 'reagendada').length,
      con_direccion: conDir
    });
  };

  const construirDireccion = (i) => {
    const dir = i.direccion_instalacion || i.cliente_direccion || i.direccion || '';
    const barrio = i.barrio || '';
    const ciudad = i.ciudad_nombre || '';
    const depto = i.departamento_nombre || '';

    const partes = [dir, barrio, ciudad, depto, 'Colombia'].filter(p => p);
    const direccionCompleta = partes.join(', ');

    console.log(`📍 Dirección construida para instalación ${i.id}:`, direccionCompleta);
    return direccionCompleta;
  };

  const geocodificar = async (direccion) => {
    try {
      console.log(`🔍 Geocodificando: ${direccion}`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=co`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
      const data = await res.json();
      
      if (data?.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        console.log(`✅ Coordenadas obtenidas:`, coords);
        return coords;
      }
      
      console.warn(`⚠️ No se encontraron coordenadas para: ${direccion}`);
      return null;
    } catch (error) {
      console.error(`❌ Error geocodificando:`, error);
      return null;
    }
  };

  const geocodificarTodas = async () => {
    console.log(`🚀 Iniciando geocodificación de ${instalaciones.length} instalaciones`);
    setGeocodificando(true);
    setProgreso({ actual: 0, total: instalaciones.length });
    
    const resultados = [];
    let exitos = 0;
    let fallos = 0;

    for (let i = 0; i < instalaciones.length; i++) {
      const inst = instalaciones[i];
      setProgreso({ actual: i + 1, total: instalaciones.length });
      
      const dir = construirDireccion(inst);
      
      if (!dir || dir === 'Colombia') {
        console.warn(`⚠️ Instalación ${inst.id} sin dirección válida`);
        fallos++;
        continue;
      }

      const coords = await geocodificar(dir);
      
      if (coords) {
        resultados.push({ 
          ...inst, 
          coordenadas: coords,
          direccion_completa: dir
        });
        exitos++;
        console.log(`✅ [${i+1}/${instalaciones.length}] Geocodificado: ${inst.cliente_nombre}`);
      } else {
        fallos++;
        console.warn(`❌ [${i+1}/${instalaciones.length}] Fallo: ${inst.cliente_nombre}`);
      }
      
      // Pausa de 1 segundo entre peticiones (requerimiento de Nominatim)
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`📊 Resumen: ${exitos} exitosas, ${fallos} fallidas de ${instalaciones.length} totales`);
    
    setInstalacionesMapa(resultados);
    setGeocodificando(false);
    
    alert(`✅ Geocodificación completada:\n${exitos} exitosas\n${fallos} fallidas de ${instalaciones.length} total`);
    
    if (resultados.length > 0) {
      setVistaActual('mapa');
    }
  };

  const colorEstado = (e) => ({
    programada: 'bg-blue-100 text-blue-800',
    en_proceso: 'bg-orange-100 text-orange-800',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-800',
    reagendada: 'bg-purple-100 text-purple-800'
  }[e] || 'bg-gray-100 text-gray-800');

  const formatFecha = (f) => {
    if (!f) return 'N/A';
    try {
      return new Date(f).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ENCABEZADO */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Mapa de Instalaciones
            </h1>
            <p className="text-gray-600">Visualiza instalaciones geográficamente (OpenStreetMap - Gratuito)</p>
            {esInstalador && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <Info className="w-4 h-4" />
                <span>Mostrando solo tus instalaciones asignadas</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setMostrarFiltros(!mostrarFiltros)} 
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
            
            <button 
              onClick={cargarInstalaciones} 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading && 'animate-spin'}`} />
              Actualizar
            </button>
            
            {vistaActual === 'lista' && instalaciones.length > 0 && (
              <button 
                onClick={geocodificarTodas} 
                disabled={geocodificando} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {geocodificando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Geocodificando {progreso.actual}/{progreso.total}...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Ver en Mapa
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          <button 
            onClick={() => setVistaActual('lista')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              vistaActual === 'lista' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Vista Lista
          </button>
          <button 
            onClick={() => setVistaActual('mapa')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              vistaActual === 'mapa' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MapIcon className="w-4 h-4 inline mr-2" />
            Vista Mapa
          </button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Programadas</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.programadas}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600">En Proceso</p>
              <p className="text-2xl font-bold text-orange-900">{estadisticas.en_proceso}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Completadas</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.completadas}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Canceladas</p>
              <p className="text-2xl font-bold text-red-900">{estadisticas.canceladas}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Reagendadas</p>
              <p className="text-2xl font-bold text-purple-900">{estadisticas.reagendadas}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-teal-50 p-4 rounded-lg shadow border border-teal-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-teal-600">Con Dirección</p>
              <p className="text-2xl font-bold text-teal-900">{estadisticas.con_direccion}</p>
            </div>
            <MapPin className="w-8 h-8 text-teal-400" />
          </div>
        </div>
      </div>

      {/* FILTROS */}
      {mostrarFiltros && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              value={busquedaTemp}
              onChange={e => setBusquedaTemp(e.target.value)}
              placeholder="Buscar cliente, dirección..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filtros.estado}
              onChange={e => setFiltros({...filtros, estado: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="programada">Programada</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reagendada">Reagendada</option>
            </select>

            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={e => setFiltros({...filtros, fechaDesde: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Fecha desde"
            />

            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={e => setFiltros({...filtros, fechaHasta: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Fecha hasta"
            />

            <button
              onClick={() => {
                setFiltros({estado:'',instalador:'',fechaDesde:'',fechaHasta:'',busqueda:''});
                setBusquedaTemp('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* VISTA DE LISTA */}
      {vistaActual === 'lista' && (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando instalaciones...</span>
          </div>
        ) : instalaciones.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay instalaciones para mostrar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instalaciones.map(i => (
              <div key={i.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {i.cliente_nombre || 'Sin nombre'}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorEstado(i.estado)}`}>
                    {i.estado}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {i.direccion_instalacion || i.cliente_direccion || i.direccion || 'Sin dirección'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatFecha(i.fecha_programada)}</span>
                  </div>
                  
                  {i.instalador_nombres && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{i.instalador_nombres}</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setInstalacionSeleccionada(i)} 
                  className="mt-3 w-full px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  Ver Detalles
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* VISTA DE MAPA */}
      {vistaActual === 'mapa' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {instalacionesMapa.length === 0 ? (
            <div className="p-12 text-center">
              <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mapa no disponible
              </h3>
              <p className="text-gray-600 mb-6">
                Debes geocodificar las direcciones primero para visualizarlas en el mapa
              </p>
              <button 
                onClick={geocodificarTodas} 
                disabled={geocodificando || instalaciones.length === 0} 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {geocodificando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Geocodificando {progreso.actual}/{progreso.total}...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-2" />
                    Geocodificar Direcciones
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Este proceso puede tardar algunos minutos (pausa de 1s entre peticiones por política de Nominatim)
              </p>
            </div>
          ) : (
            <div style={{ height: '600px', width: '100%' }}>
              <MapContainer 
                center={CENTRO_MAPA} 
                zoom={ZOOM} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <AjustarVista instalaciones={instalacionesMapa} />
                
                {instalacionesMapa.map((i, idx) => (
                  <Marker
                    key={i.id}
                    position={[i.coordenadas.lat, i.coordenadas.lng]}
                    icon={crearIcono(i.estado, idx + 1)}
                  >
                    <Popup maxWidth={300}>
                      <div className="p-2">
                        <h3 className="font-bold text-lg mb-2 text-gray-900">
                          {i.cliente_nombre || 'Sin nombre'}
                        </h3>
                        
                        <div className="space-y-1 text-sm mb-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorEstado(i.estado)}`}>
                            {i.estado}
                          </span>
                          
                          <div className="flex items-start gap-2 text-gray-700 mt-2">
                            <Home className="w-4 h-4 mt-1 flex-shrink-0" />
                            <span>{i.direccion_completa || construirDireccion(i)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{formatFecha(i.fecha_programada)}</span>
                          </div>
                          
                          {i.instalador_nombres && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span>{i.instalador_nombres}</span>
                            </div>
                          )}
                          
                          {i.plan_nombre && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Package className="w-4 h-4 flex-shrink-0" />
                              <span>{i.plan_nombre}</span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => setInstalacionSeleccionada(i)}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                        >
                          Ver Detalles Completos
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALLE */}
      {instalacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {instalacionSeleccionada.cliente_nombre || 'Sin nombre'}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Instalación #{instalacionSeleccionada.id}
                  </p>
                </div>
                <button
                  onClick={() => setInstalacionSeleccionada(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Estado
                    </label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colorEstado(instalacionSeleccionada.estado)}`}>
                      {instalacionSeleccionada.estado}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Dirección
                    </label>
                    <p className="text-gray-900">
                      {instalacionSeleccionada.direccion_instalacion || 
                       instalacionSeleccionada.cliente_direccion || 
                       instalacionSeleccionada.direccion ||
                       'Sin dirección'}
                    </p>
                  </div>

                  {(instalacionSeleccionada.barrio) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Barrio
                      </label>
                      <p className="text-gray-900">{instalacionSeleccionada.barrio}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha Programada
                    </label>
                    <p className="text-gray-900">{formatFecha(instalacionSeleccionada.fecha_programada)}</p>
                  </div>

                  {instalacionSeleccionada.hora_programada && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Hora
                      </label>
                      <p className="text-gray-900">{instalacionSeleccionada.hora_programada}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {instalacionSeleccionada.instalador_nombres && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Instalador
                      </label>
                      <p className="text-gray-900">{instalacionSeleccionada.instalador_nombres}</p>
                    </div>
                  )}

                  {(instalacionSeleccionada.telefono_contacto || instalacionSeleccionada.cliente_telefono) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Teléfono
                      </label>
                      <p className="text-gray-900">
                        {instalacionSeleccionada.telefono_contacto || instalacionSeleccionada.cliente_telefono}
                      </p>
                    </div>
                  )}

                  {instalacionSeleccionada.plan_nombre && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Plan de Servicio
                      </label>
                      <p className="text-gray-900">{instalacionSeleccionada.plan_nombre}</p>
                    </div>
                  )}

                  {instalacionSeleccionada.costo_instalacion && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Costo de Instalación
                      </label>
                      <p className="text-gray-900">
                        ${parseFloat(instalacionSeleccionada.costo_instalacion).toLocaleString('es-CO')}
                      </p>
                    </div>
                  )}

                  {instalacionSeleccionada.tipo_instalacion && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Tipo de Instalación
                      </label>
                      <p className="text-gray-900 capitalize">{instalacionSeleccionada.tipo_instalacion}</p>
                    </div>
                  )}
                </div>
              </div>

              {instalacionSeleccionada.observaciones && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Observaciones
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {instalacionSeleccionada.observaciones}
                  </p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setInstalacionSeleccionada(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaInstalaciones;