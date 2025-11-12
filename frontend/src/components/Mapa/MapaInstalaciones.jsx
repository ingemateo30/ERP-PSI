// frontend/src/components/Mapa/MapaInstalaciones.jsx
// Mapa de Instalaciones - 100% GRATUITO con OpenStreetMap

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Navigation, Calendar, CheckCircle, Clock, 
  XCircle, AlertCircle, Filter, Search, RefreshCw, 
  Home, Phone, User, Package, Loader2,
  BarChart3, Map as MapIcon, Activity
} from 'lucide-react';
import apiService from '../../services/apiService';

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
// AJUSTAR VISTA
// ==========================================
const AjustarVista = ({ instalaciones }) => {
  const map = useMap();
  
  useEffect(() => {
    if (instalaciones?.length > 0) {
      const bounds = instalaciones.map(i => [i.coordenadas.lat, i.coordenadas.lng]);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [instalaciones, map]);
  
  return null;
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const MapaInstalaciones = () => {
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
      if (filtros.busqueda) params.append('q', filtros.busqueda);
      
      const res = await apiService.get(`/instalaciones?${params}`);
      if (res.success && Array.isArray(res.data)) {
        setInstalaciones(res.data);
        calcularEstadisticas(res.data);
      }
      setError(null);
    } catch (err) {
      setError('Error cargando instalaciones');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (datos) => {
    const conDir = datos.filter(i => i.direccion_instalacion || i.cliente_direccion || i.direccion).length;
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
    const partes = [dir, i.barrio, i.ciudad_nombre || 'Socorro', i.departamento_nombre || 'Santander', 'Colombia'];
    return partes.filter(p => p).join(', ');
  };

  const geocodificar = async (direccion) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=co`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
      const data = await res.json();
      if (data?.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const geocodificarTodas = async () => {
    setGeocodificando(true);
    setProgreso({ actual: 0, total: instalaciones.length });
    const resultados = [];
    let exitos = 0;

    for (let i = 0; i < instalaciones.length; i++) {
      const inst = instalaciones[i];
      setProgreso({ actual: i + 1, total: instalaciones.length });
      const dir = construirDireccion(inst);
      if (!dir) continue;

      const coords = await geocodificar(dir);
      if (coords) {
        resultados.push({ ...inst, coordenadas: coords });
        exitos++;
      }
      await new Promise(r => setTimeout(r, 1000)); // Pausa requerida por Nominatim
    }

    setInstalacionesMapa(resultados);
    setGeocodificando(false);
    alert(`✅ Geocodificación: ${exitos} exitosas de ${instalaciones.length}`);
    if (resultados.length > 0) setVistaActual('mapa');
  };

  const colorEstado = (e) => ({
    programada: 'bg-blue-100 text-blue-800',
    en_proceso: 'bg-orange-100 text-orange-800',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-800',
    reagendada: 'bg-purple-100 text-purple-800'
  }[e] || 'bg-gray-100 text-gray-800');

  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO') : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Mapa de Instalaciones
            </h1>
            <p className="text-gray-600">Visualiza instalaciones geográficamente (OpenStreetMap - Gratuito)</p>
          </div>
          
          <div className="flex gap-3">
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
            <button onClick={cargarInstalaciones} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${loading && 'animate-spin'}`} />
              Actualizar
            </button>
            {vistaActual === 'lista' && instalaciones.length > 0 && (
              <button onClick={geocodificarTodas} disabled={geocodificando} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                {geocodificando ? <><Loader2 className="w-5 h-5 animate-spin" />Geocodificando {progreso.actual}/{progreso.total}...</> : <><Navigation className="w-5 h-5" />Ver Mapa</>}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setVistaActual('lista')} className={`px-4 py-2 rounded-lg font-medium ${vistaActual === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            <Activity className="w-4 h-4 inline mr-2" />Lista
          </button>
          <button onClick={() => setVistaActual('mapa')} className={`px-4 py-2 rounded-lg font-medium ${vistaActual === 'mapa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}>
            <MapIcon className="w-4 h-4 inline mr-2" />Mapa
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          { label: 'Total', valor: estadisticas.total, icono: BarChart3, color: 'gray' },
          { label: 'Programadas', valor: estadisticas.programadas, icono: Clock, color: 'blue' },
          { label: 'En Proceso', valor: estadisticas.en_proceso, icono: Activity, color: 'orange' },
          { label: 'Completadas', valor: estadisticas.completadas, icono: CheckCircle, color: 'green' },
          { label: 'Canceladas', valor: estadisticas.canceladas, icono: XCircle, color: 'red' },
          { label: 'Reagendadas', valor: estadisticas.reagendadas, icono: AlertCircle, color: 'purple' },
          { label: 'Con Dirección', valor: estadisticas.con_direccion, icono: MapPin, color: 'teal' }
        ].map(({ label, valor, icono: Icon, color }) => (
          <div key={label} className={`bg-${color}-50 p-4 rounded-lg shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm text-${color}-600`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-900`}>{valor}</p>
              </div>
              <Icon className={`w-8 h-8 text-${color}-400`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input type="text" value={filtros.busqueda} onChange={e => setFiltros({...filtros, busqueda: e.target.value})} placeholder="Buscar..." className="px-3 py-2 border rounded-lg" />
            <select value={filtros.estado} onChange={e => setFiltros({...filtros, estado: e.target.value})} className="px-3 py-2 border rounded-lg">
              <option value="">Todos los estados</option>
              <option value="programada">Programada</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reagendada">Reagendada</option>
            </select>
            <input type="date" value={filtros.fechaDesde} onChange={e => setFiltros({...filtros, fechaDesde: e.target.value})} className="px-3 py-2 border rounded-lg" />
            <input type="date" value={filtros.fechaHasta} onChange={e => setFiltros({...filtros, fechaHasta: e.target.value})} className="px-3 py-2 border rounded-lg" />
            <button onClick={() => setFiltros({estado:'',instalador:'',fechaDesde:'',fechaHasta:'',busqueda:''})} className="px-4 py-2 bg-gray-100 rounded-lg">Limpiar</button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

      {/* Lista */}
      {vistaActual === 'lista' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /><span className="ml-3">Cargando...</span></div>
        ) : instalaciones.length === 0 ? (
          <div className="text-center py-12"><MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No hay instalaciones</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instalaciones.map(i => (
              <div key={i.id} className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{i.cliente_nombre || 'Sin nombre'}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs ${colorEstado(i.estado)}`}>{i.estado}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Home className="w-4 h-4" />{i.direccion_instalacion || i.cliente_direccion || 'Sin dirección'}</div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatFecha(i.fecha_programada)}</div>
                  {i.instalador_nombres && <div className="flex items-center gap-2"><User className="w-4 h-4" />{i.instalador_nombres}</div>}
                </div>
                <button onClick={() => setInstalacionSeleccionada(i)} className="mt-3 w-full px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Ver Detalles</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Mapa */}
      {vistaActual === 'mapa' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {instalacionesMapa.length === 0 ? (
            <div className="p-12 text-center">
              <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Mapa no disponible</h3>
              <p className="text-gray-600 mb-6">Geocodifica las direcciones primero</p>
              <button onClick={geocodificarTodas} disabled={geocodificando || instalaciones.length === 0} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {geocodificando ? <>Geocodificando {progreso.actual}/{progreso.total}...</> : <>Geocodificar Ahora</>}
              </button>
              <p className="text-sm text-gray-500 mt-4">Proceso puede tardar según cantidad de instalaciones (pausa de 1s entre peticiones por política de Nominatim)</p>
            </div>
          ) : (
            <div style={{ height: '600px' }}>
              <MapContainer center={CENTRO_MAPA} zoom={ZOOM} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />
                <AjustarVista instalaciones={instalacionesMapa} />
                {instalacionesMapa.map((i, idx) => (
                  <Marker key={i.id} position={[i.coordenadas.lat, i.coordenadas.lng]} icon={crearIcono(i.estado, idx+1)}>
                    <Popup maxWidth={300}>
                      <div className="p-2">
                        <h3 className="font-bold text-lg mb-2">{i.cliente_nombre || 'Sin nombre'}</h3>
                        <div className="space-y-1 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${colorEstado(i.estado)}`}>{i.estado}</span>
                          <div className="flex items-start gap-2"><Home className="w-4 h-4 mt-1" />{construirDireccion(i)}</div>
                          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />{formatFecha(i.fecha_programada)}</div>
                          {i.instalador_nombres && <div className="flex items-center gap-2"><User className="w-4 h-4" />{i.instalador_nombres}</div>}
                          {i.plan_nombre && <div className="flex items-center gap-2"><Package className="w-4 h-4" />{i.plan_nombre}</div>}
                        </div>
                        <button onClick={() => setInstalacionSeleccionada(i)} className="mt-3 w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Ver Detalles</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {instalacionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-bold">{instalacionSeleccionada.cliente_nombre}</h2>
              <button onClick={() => setInstalacionSeleccionada(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-500">Estado</label><span className={`inline-block px-3 py-1 rounded-full text-sm ${colorEstado(instalacionSeleccionada.estado)}`}>{instalacionSeleccionada.estado}</span></div>
              <div><label className="block text-sm font-medium text-gray-500">Dirección</label><p>{instalacionSeleccionada.direccion_instalacion || 'N/A'}</p></div>
              <div><label className="block text-sm font-medium text-gray-500">Fecha</label><p>{formatFecha(instalacionSeleccionada.fecha_programada)}</p></div>
              <div><label className="block text-sm font-medium text-gray-500">Instalador</label><p>{instalacionSeleccionada.instalador_nombres || 'N/A'}</p></div>
            </div>
            {instalacionSeleccionada.observaciones && (
              <div className="mt-4"><label className="block text-sm font-medium text-gray-500">Observaciones</label><p>{instalacionSeleccionada.observaciones}</p></div>
            )}
            <button onClick={() => setInstalacionSeleccionada(null)} className="mt-6 w-full px-4 py-2 border rounded-lg hover:bg-gray-50">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaInstalaciones;