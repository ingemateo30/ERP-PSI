// frontend/src/components/Mapa/MapaClientes.jsx
// Mapa General de Clientes - Agrupado por ciudad

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Users, RefreshCw, Filter, Loader2, Map as MapIcon,
  Activity, BarChart3, Phone, Mail, Wifi, Tv, Building2,
  ChevronDown, ChevronRight, Search, Info, CheckCircle,
  XCircle, AlertCircle, Clock, User
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
// ICONO DE CIUDAD POR NÚMERO DE CLIENTES
// ==========================================
const crearIconoCiudad = (total, activos) => {
  const color = activos === 0 ? '#6B7280' : activos === total ? '#10B981' : '#F59E0B';
  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div style="
        background:${color};
        min-width:40px;
        height:40px;
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:0 6px;
      ">
        <span style="color:#fff;font-size:13px;font-weight:bold;white-space:nowrap">${total}</span>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22]
  });
};

// ==========================================
// AJUSTAR VISTA DEL MAPA
// ==========================================
const AjustarVista = ({ puntos }) => {
  const map = useMap();
  useEffect(() => {
    if (puntos?.length > 0) {
      const bounds = puntos.map(p => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  }, [puntos, map]);
  return null;
};

// ==========================================
// HELPERS
// ==========================================
const colorEstado = (estado) => ({
  activo: 'bg-green-100 text-green-800 border-green-200',
  suspendido: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cortado: 'bg-red-100 text-red-800 border-red-200',
  retirado: 'bg-gray-100 text-gray-700 border-gray-200',
}[estado] || 'bg-gray-100 text-gray-700 border-gray-200');

const colorEstadoServicio = (estado) => ({
  activo: 'text-green-700',
  suspendido: 'text-yellow-700',
  cortado: 'text-red-700',
  cancelado: 'text-gray-500',
}[estado] || 'text-gray-500');

const iconoPlan = (tipo) => tipo === 'television'
  ? <Tv className="w-3 h-3 inline mr-1" />
  : <Wifi className="w-3 h-3 inline mr-1" />;

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const MapaClientes = () => {
  const [ciudades, setCiudades] = useState([]);
  const [ciudadesMapa, setCiudadesMapa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodificando, setGeocodificando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const [error, setError] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [ciudadExpandida, setCiudadExpandida] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const CENTRO_MAPA = [6.4667, -73.2667]; // Socorro, Santander
  const ZOOM = 9;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.get('/clients/mapa');
      if (res.success && Array.isArray(res.data)) {
        setCiudades(res.data);
      }
    } catch (err) {
      console.error('❌ Error cargando mapa de clientes:', err);
      setError('Error cargando datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // GEOCODIFICACIÓN POR CIUDAD
  // ==========================================
  const geocodificarCiudad = async (ciudad, departamento) => {
    try {
      const query = [ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=co`;
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

  const geocodificarTodasCiudades = async () => {
    setGeocodificando(true);
    const total = ciudades.filter(c => c.ciudad_nombre !== 'Sin ciudad').length;
    setProgreso({ actual: 0, total });

    const resultados = [];
    let idx = 0;

    for (const ciudad of ciudades) {
      if (ciudad.ciudad_nombre === 'Sin ciudad') continue;
      idx++;
      setProgreso({ actual: idx, total });

      const coords = await geocodificarCiudad(ciudad.ciudad_nombre, ciudad.departamento_nombre);
      if (coords) {
        resultados.push({ ...ciudad, lat: coords.lat, lng: coords.lng });
      }

      // Pausa requerida por Nominatim
      await new Promise(r => setTimeout(r, 1000));
    }

    setCiudadesMapa(resultados);
    setGeocodificando(false);
    if (resultados.length > 0) setVistaActual('mapa');
  };

  // ==========================================
  // DATOS FILTRADOS
  // ==========================================
  const ciudadesFiltradas = useMemo(() => {
    let lista = ciudades;

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.map(ciudad => ({
        ...ciudad,
        clientes: ciudad.clientes.filter(c =>
          c.nombre.toLowerCase().includes(q) ||
          c.identificacion?.toLowerCase().includes(q) ||
          c.direccion?.toLowerCase().includes(q) ||
          c.telefono?.includes(q) ||
          c.correo?.toLowerCase().includes(q)
        )
      })).filter(ciudad => ciudad.clientes.length > 0 || ciudad.ciudad_nombre.toLowerCase().includes(q));
    }

    if (filtroEstado) {
      lista = lista.map(ciudad => ({
        ...ciudad,
        clientes: ciudad.clientes.filter(c => c.estado === filtroEstado)
      })).filter(ciudad => ciudad.clientes.length > 0);
    }

    return lista;
  }, [ciudades, busqueda, filtroEstado]);

  // Estadísticas globales
  const stats = useMemo(() => {
    const todos = ciudades.flatMap(c => c.clientes);
    return {
      totalCiudades: ciudades.length,
      totalClientes: todos.length,
      activos: todos.filter(c => c.estado === 'activo').length,
      suspendidos: todos.filter(c => c.estado === 'suspendido').length,
      cortados: todos.filter(c => c.estado === 'cortado').length,
      retirados: todos.filter(c => c.estado === 'retirado').length,
      conServicio: todos.filter(c => c.servicios?.length > 0).length,
    };
  }, [ciudades]);

  // ==========================================
  // RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ENCABEZADO */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MapPin className="w-7 h-7 text-blue-600" />
              Mapa General de Clientes
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Distribución de clientes por ciudad — {stats.totalClientes} clientes en {stats.totalCiudades} ciudades
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            {vistaActual === 'lista' && ciudades.length > 0 && (
              <button
                onClick={geocodificarTodasCiudades}
                disabled={geocodificando}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {geocodificando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Geocodificando {progreso.actual}/{progreso.total}...
                  </>
                ) : (
                  <>
                    <MapIcon className="w-4 h-4" />
                    Ver en Mapa
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setVistaActual('lista')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              vistaActual === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Vista Lista
          </button>
          <button
            onClick={() => setVistaActual('mapa')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              vistaActual === 'mapa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <MapIcon className="w-4 h-4 inline mr-2" />
            Vista Mapa
          </button>
        </div>

        {/* FILTROS */}
        {mostrarFiltros && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Buscar cliente</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Nombre, ID, dirección, teléfono..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado del cliente</label>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="cortado">Cortado</option>
                <option value="retirado">Retirado</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Ciudades', value: stats.totalCiudades, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-900', Icon: Building2, iconColor: 'text-blue-400' },
          { label: 'Total', value: stats.totalClientes, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-900', Icon: Users, iconColor: 'text-gray-400' },
          { label: 'Activos', value: stats.activos, color: 'bg-green-50 border-green-200', textColor: 'text-green-900', Icon: CheckCircle, iconColor: 'text-green-400' },
          { label: 'Suspendidos', value: stats.suspendidos, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-900', Icon: AlertCircle, iconColor: 'text-yellow-400' },
          { label: 'Cortados', value: stats.cortados, color: 'bg-red-50 border-red-200', textColor: 'text-red-900', Icon: XCircle, iconColor: 'text-red-400' },
          { label: 'Retirados', value: stats.retirados, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700', Icon: Clock, iconColor: 'text-gray-300' },
          { label: 'Con Servicio', value: stats.conServicio, color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-900', Icon: Wifi, iconColor: 'text-purple-400' },
        ].map(({ label, value, color, textColor, Icon, iconColor }) => (
          <div key={label} className={`${color} border rounded-xl p-3 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${textColor}`}>{value}</p>
              </div>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============================== VISTA MAPA ============================== */}
      {vistaActual === 'mapa' && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {ciudadesMapa.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <MapIcon className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Sin datos en el mapa</p>
              <p className="text-sm mt-1">
                Haz clic en <strong>"Ver en Mapa"</strong> desde la Vista Lista para geocodificar las ciudades.
              </p>
            </div>
          ) : (
            <MapContainer
              center={CENTRO_MAPA}
              zoom={ZOOM}
              style={{ height: '600px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <AjustarVista puntos={ciudadesMapa} />
              {ciudadesMapa.map((ciudad, idx) => (
                <Marker
                  key={idx}
                  position={[ciudad.lat, ciudad.lng]}
                  icon={crearIconoCiudad(ciudad.total_clientes, ciudad.clientes_activos)}
                >
                  <Popup minWidth={280} maxWidth={380} maxHeight={420}>
                    <div className="text-sm">
                      {/* Cabecera ciudad */}
                      <div className="font-bold text-base mb-1 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        {ciudad.ciudad_nombre}
                        {ciudad.departamento_nombre && (
                          <span className="text-gray-400 font-normal text-xs">— {ciudad.departamento_nombre}</span>
                        )}
                      </div>

                      {/* Mini-stats */}
                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {ciudad.total_clientes} total
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {ciudad.clientes_activos} activos
                        </span>
                        {ciudad.clientes_suspendidos > 0 && (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {ciudad.clientes_suspendidos} susp.
                          </span>
                        )}
                        {ciudad.clientes_cortados > 0 && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {ciudad.clientes_cortados} cortados
                          </span>
                        )}
                      </div>

                      {/* Lista de clientes */}
                      <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                        {ciudad.clientes.slice(0, 30).map(c => (
                          <div key={c.id} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-medium text-gray-800 text-xs leading-tight">{c.nombre}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${colorEstado(c.estado)}`}>
                                {c.estado}
                              </span>
                            </div>
                            {c.direccion && (
                              <p className="text-gray-500 text-xs mt-0.5 truncate">{c.direccion}{c.barrio ? ` — ${c.barrio}` : ''}</p>
                            )}
                            {c.telefono && (
                              <p className="text-gray-500 text-xs">{c.telefono}</p>
                            )}
                            {c.servicios?.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {c.servicios.map(sv => (
                                  <span
                                    key={sv.id}
                                    className={`text-xs flex items-center ${colorEstadoServicio(sv.estado)}`}
                                  >
                                    {iconoPlan(sv.tipo)}{sv.plan_nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {ciudad.clientes.length > 30 && (
                          <p className="text-center text-gray-400 text-xs py-1">
                            +{ciudad.clientes.length - 30} clientes más — usa la Vista Lista para ver todos
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      )}

      {/* ============================== VISTA LISTA ============================== */}
      {vistaActual === 'lista' && (
        <div className="space-y-4">
          {ciudadesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm">Ajusta los filtros o la búsqueda</p>
            </div>
          ) : (
            ciudadesFiltradas.map(ciudad => (
              <div key={ciudad.ciudad_nombre} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Cabecera ciudad */}
                <button
                  onClick={() => setCiudadExpandida(prev => prev === ciudad.ciudad_nombre ? null : ciudad.ciudad_nombre)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="text-left">
                      <span className="font-semibold text-gray-900">{ciudad.ciudad_nombre}</span>
                      {ciudad.departamento_nombre && (
                        <span className="ml-2 text-gray-400 text-sm">— {ciudad.departamento_nombre}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 flex-wrap justify-end">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {ciudad.clientes.length} clientes
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {ciudad.clientes_activos} activos
                      </span>
                      {ciudad.clientes_suspendidos > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {ciudad.clientes_suspendidos} susp.
                        </span>
                      )}
                      {ciudad.clientes_cortados > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {ciudad.clientes_cortados} cortados
                        </span>
                      )}
                    </div>
                    {ciudadExpandida === ciudad.ciudad_nombre
                      ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    }
                  </div>
                </button>

                {/* Tabla de clientes */}
                {ciudadExpandida === ciudad.ciudad_nombre && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Cliente</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Dirección</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Contacto</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Estado</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Servicios</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ciudad.clientes.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{c.nombre}</div>
                                <div className="text-gray-400 text-xs">{c.identificacion}</div>
                                {c.sector_nombre && (
                                  <div className="text-gray-400 text-xs">Sector: {c.sector_nombre}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                                <div className="truncate">{c.direccion || '—'}</div>
                                {c.barrio && <div className="text-xs text-gray-400 truncate">{c.barrio}</div>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {c.telefono && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    {c.telefono}
                                  </div>
                                )}
                                {c.correo && (
                                  <div className="flex items-center gap-1 text-xs mt-0.5 truncate max-w-[140px]">
                                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{c.correo}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${colorEstado(c.estado)}`}>
                                  {c.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {c.servicios?.length > 0 ? (
                                  <div className="space-y-1">
                                    {c.servicios.map(sv => (
                                      <div key={sv.id} className="flex items-center gap-1.5 text-xs">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                          sv.estado === 'activo' ? 'bg-green-500' :
                                          sv.estado === 'suspendido' ? 'bg-yellow-500' :
                                          sv.estado === 'cortado' ? 'bg-red-500' : 'bg-gray-300'
                                        }`} />
                                        {iconoPlan(sv.tipo)}
                                        <span className={colorEstadoServicio(sv.estado)}>{sv.plan_nombre}</span>
                                        <span className="text-gray-400">
                                          ${Number(sv.precio || 0).toLocaleString('es-CO')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">Sin servicios</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* NOTA INFORMATIVA */}
      {vistaActual === 'lista' && ciudadesFiltradas.length > 0 && (
        <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Haz clic en una ciudad para expandir sus clientes. Usa <strong>Ver en Mapa</strong> para geocodificar
            todas las ciudades y visualizarlas en el mapa (requiere conexión — usa API de OpenStreetMap gratuita).
          </span>
        </div>
      )}
    </div>
  );
};

export default MapaClientes;
