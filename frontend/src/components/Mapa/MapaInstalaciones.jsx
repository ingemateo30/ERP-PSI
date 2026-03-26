// frontend/src/components/Mapa/MapaInstalaciones.jsx
// Mapa de Instalaciones - lookup por ciudad, sin geocoding externo

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, List, Map as MapIcon, Search, Filter,
  CheckCircle, Clock, XCircle, AlertCircle, RefreshCw,
  User, Package, Calendar, Navigation, Loader2
} from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ── City lookup table ─────────────────────────────────────────────────────────
const CIUDADES_CO = {
  'socorro': [6.4608, -73.2620],
  'san gil': [6.5566, -73.1354],
  'vélez': [6.0087, -73.6776], 'velez': [6.0087, -73.6776],
  'barbosa': [5.9333, -73.6167],
  'charalá': [6.2872, -73.1430], 'charala': [6.2872, -73.1430],
  'oiba': [6.2697, -73.2997],
  'guadalupe': [6.3113, -73.3538],
  'mogotes': [6.4866, -73.0225],
  'ocamonte': [6.3536, -73.2108],
  'suaita': [6.1072, -73.4447],
  'bucaramanga': [7.1193, -73.1227],
  'floridablanca': [7.0644, -73.0965],
  'girón': [7.0753, -73.1697], 'giron': [7.0753, -73.1697],
  'piedecuesta': [6.9876, -73.0508],
  'bogotá': [4.7110, -74.0721], 'bogota': [4.7110, -74.0721],
};

function resolverCoordenadas(inst) {
  if (inst.coordenadas_lat && inst.coordenadas_lng) {
    const lat = parseFloat(inst.coordenadas_lat);
    const lng = parseFloat(inst.coordenadas_lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng, precision: 'gps' };
    }
  }
  const ciudad = (inst.ciudad_nombre || '').toLowerCase().trim();
  if (ciudad && CIUDADES_CO[ciudad]) {
    return { lat: CIUDADES_CO[ciudad][0], lng: CIUDADES_CO[ciudad][1], precision: 'ciudad' };
  }
  return null;
}

function offsetAleatorio(lat, lng, idx) {
  const r = 0.003;
  const angle = (idx * 137.5) * Math.PI / 180;
  return { lat: lat + r * Math.cos(angle), lng: lng + r * Math.sin(angle) };
}

// ── Custom marker icons ───────────────────────────────────────────────────────
const COLORES_ESTADO = {
  programada: '#3B82F6',
  en_proceso: '#F59E0B',
  completada: '#10B981',
  cancelada: '#EF4444',
  reagendada: '#8B5CF6',
};

function crearIcono(estado) {
  const color = COLORES_ESTADO[estado] || '#6B7280';
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

// ── Map bounds adjuster ───────────────────────────────────────────────────────
function AjustarVista({ marcadores }) {
  const map = useMap();
  useEffect(() => {
    if (!marcadores || marcadores.length === 0) return;
    const bounds = marcadores.map(m => [m.coords.lat, m.coords.lng]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [marcadores, map]);
  return null;
}

// ── Status helpers ────────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  programada:  { label: 'Programada',  color: 'bg-blue-100 text-blue-800',   icon: Clock },
  en_proceso:  { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  completada:  { label: 'Completada',  color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelada:   { label: 'Cancelada',   color: 'bg-red-100 text-red-800',     icon: XCircle },
  reagendada:  { label: 'Reagendada',  color: 'bg-purple-100 text-purple-800', icon: RefreshCw },
};

function EstadoBadge({ estado, small = false }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${cfg.color} ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}>
      <Icon size={small ? 10 : 12} />
      {cfg.label}
    </span>
  );
}

function formatFecha(f) {
  if (!f) return '—';
  try {
    return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return f;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapaInstalaciones() {
  const { user } = useAuth();
  const [instalaciones, setInstalaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState('lista'); // 'lista' | 'mapa'
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ajustarVista, setAjustarVista] = useState(false);

  const cargarInstalaciones = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiService.getInstalaciones();
      setInstalaciones(Array.isArray(data) ? data : (data?.instalaciones || []));
    } catch (err) {
      console.error('Error cargando instalaciones:', err);
      setError('No se pudieron cargar las instalaciones. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInstalaciones();
  }, []);

  // Build marker list immediately from lookup table
  const marcadores = useMemo(() => {
    return instalaciones.map((inst, idx) => {
      const pos = resolverCoordenadas(inst);
      if (!pos) return null;
      const coords = pos.precision === 'ciudad'
        ? offsetAleatorio(pos.lat, pos.lng, idx)
        : { lat: pos.lat, lng: pos.lng };
      return { ...inst, coords, precision: pos.precision };
    }).filter(Boolean);
  }, [instalaciones]);

  // Filtered list for both views
  const instalacionesFiltradas = useMemo(() => {
    return instalaciones.filter(inst => {
      if (filtroEstado !== 'todos' && inst.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          (inst.cliente_nombre || '').toLowerCase().includes(q) ||
          (inst.direccion_instalacion || '').toLowerCase().includes(q) ||
          (inst.cliente_direccion || '').toLowerCase().includes(q) ||
          (inst.ciudad_nombre || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [instalaciones, filtroEstado, busqueda]);

  const marcadoresFiltrados = useMemo(() => {
    return marcadores.filter(m => {
      if (filtroEstado !== 'todos' && m.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          (m.cliente_nombre || '').toLowerCase().includes(q) ||
          (m.direccion_instalacion || '').toLowerCase().includes(q) ||
          (m.cliente_direccion || '').toLowerCase().includes(q) ||
          (m.ciudad_nombre || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [marcadores, filtroEstado, busqueda]);

  // Stats
  const stats = useMemo(() => {
    const total = instalaciones.length;
    const conGPS = marcadores.filter(m => m.precision === 'gps').length;
    const porCiudad = marcadores.filter(m => m.precision === 'ciudad').length;
    const sinUbicacion = total - marcadores.length;
    const porEstado = {};
    instalaciones.forEach(inst => {
      porEstado[inst.estado] = (porEstado[inst.estado] || 0) + 1;
    });
    return { total, conGPS, porCiudad, sinUbicacion, porEstado };
  }, [instalaciones, marcadores]);

  const handleVerMapa = () => {
    setVista('mapa');
    setAjustarVista(v => !v); // toggle to trigger AjustarVista
  };

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="text-blue-600" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mapa de Instalaciones</h1>
              <p className="text-sm text-gray-500">
                {cargando ? 'Cargando…' : `${stats.total} instalaciones · ${marcadores.length} ubicadas`}
              </p>
            </div>
          </div>
          <button
            onClick={cargarInstalaciones}
            disabled={cargando}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!cargando && !error && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-500">
              Total: <strong className="text-gray-900">{stats.total}</strong>
            </span>
            {Object.entries(stats.porEstado).map(([estado, count]) => (
              <span key={estado} className="text-gray-500">
                {ESTADO_CONFIG[estado]?.label || estado}:{' '}
                <strong style={{ color: COLORES_ESTADO[estado] || '#6B7280' }}>{count}</strong>
              </span>
            ))}
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              GPS exacto: <strong className="text-green-600">{stats.conGPS}</strong>
            </span>
            <span className="text-gray-500">
              Centro ciudad: <strong className="text-blue-600">{stats.porCiudad}</strong>
            </span>
            {stats.sinUbicacion > 0 && (
              <span className="text-gray-500">
                Sin ubicación: <strong className="text-gray-400">{stats.sinUbicacion}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente, dirección, ciudad…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Estado filter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden ml-auto">
          <button
            onClick={() => setVista('lista')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              vista === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={15} />
            Lista
          </button>
          <button
            onClick={handleVerMapa}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              vista === 'mapa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MapIcon size={15} />
            Mapa
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm">Cargando instalaciones…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-gray-600 text-center">{error}</p>
            <button
              onClick={cargarInstalaciones}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        ) : vista === 'lista' ? (
          <ListaInstalaciones instalaciones={instalacionesFiltradas} marcadores={marcadores} />
        ) : (
          <MapaView
            marcadoresFiltrados={marcadoresFiltrados}
            ajustarVista={ajustarVista}
          />
        )}
      </div>
    </div>
  );
}

// ── Lista view ────────────────────────────────────────────────────────────────
function ListaInstalaciones({ instalaciones, marcadores }) {
  const marcadoresMap = useMemo(() => {
    const m = {};
    marcadores.forEach(mk => { m[mk.id] = mk; });
    return m;
  }, [marcadores]);

  if (instalaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <MapPin size={40} className="text-gray-300" />
        <p className="text-gray-400">No hay instalaciones que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instalaciones.map(inst => {
          const mk = marcadoresMap[inst.id];
          return (
            <div key={inst.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: COLORES_ESTADO[inst.estado] || '#6B7280' }}
                  />
                  <span className="font-semibold text-gray-900 text-sm truncate">
                    {inst.cliente_nombre || 'Sin nombre'}
                  </span>
                </div>
                <EstadoBadge estado={inst.estado} small />
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-gray-500">
                {(inst.ciudad_nombre || inst.departamento_nombre) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span>{[inst.ciudad_nombre, inst.departamento_nombre].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {(inst.direccion_instalacion || inst.cliente_direccion) && (
                  <div className="flex items-start gap-1.5">
                    <Navigation size={11} className="flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{inst.direccion_instalacion || inst.cliente_direccion}</span>
                  </div>
                )}
                {inst.plan_nombre && (
                  <div className="flex items-center gap-1.5">
                    <Package size={11} className="flex-shrink-0" />
                    <span>{inst.plan_nombre}</span>
                  </div>
                )}
                {inst.instalador_nombre && (
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="flex-shrink-0" />
                    <span>{inst.instalador_nombre}</span>
                  </div>
                )}
                {(inst.fecha_programada || inst.fecha_realizada) && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="flex-shrink-0" />
                    <span>{formatFecha(inst.fecha_realizada || inst.fecha_programada)}</span>
                  </div>
                )}
              </div>

              {/* Precision badge */}
              {mk && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {mk.precision === 'gps' ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <span>📍</span> GPS exacto
                    </span>
                  ) : (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <span>🏙️</span> Centro ciudad
                    </span>
                  )}
                </div>
              )}
              {!mk && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Sin ubicación registrada</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mapa view ─────────────────────────────────────────────────────────────────
function MapaView({ marcadoresFiltrados, ajustarVista }) {
  const CENTER = [6.4608, -73.2620];
  const ZOOM = 11;

  if (marcadoresFiltrados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <MapPin size={40} className="text-gray-300" />
        <p className="text-gray-400">No hay instalaciones ubicadas para los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className="h-full" style={{ minHeight: '500px' }}>
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarVista marcadores={marcadoresFiltrados} key={ajustarVista} />
        {marcadoresFiltrados.map(inst => (
          <Marker
            key={inst.id}
            position={[inst.coords.lat, inst.coords.lng]}
            icon={crearIcono(inst.estado)}
          >
            <Popup maxWidth={280}>
              <div className="text-sm" style={{ minWidth: '220px' }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-gray-900 leading-tight">
                    {inst.cliente_nombre || 'Sin nombre'}
                  </span>
                  <EstadoBadge estado={inst.estado} small />
                </div>

                {/* Info rows */}
                <div className="space-y-1 text-xs text-gray-600">
                  {(inst.ciudad_nombre || inst.departamento_nombre) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} />
                      <span>{[inst.ciudad_nombre, inst.departamento_nombre].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {(inst.direccion_instalacion || inst.cliente_direccion) && (
                    <div className="flex items-start gap-1.5">
                      <Navigation size={11} className="mt-0.5 flex-shrink-0" />
                      <span>{inst.direccion_instalacion || inst.cliente_direccion}</span>
                    </div>
                  )}
                  {inst.plan_nombre && (
                    <div className="flex items-center gap-1.5">
                      <Package size={11} />
                      <span>{inst.plan_nombre}</span>
                    </div>
                  )}
                  {inst.instalador_nombre && (
                    <div className="flex items-center gap-1.5">
                      <User size={11} />
                      <span>{inst.instalador_nombre}</span>
                    </div>
                  )}
                  {(inst.fecha_programada || inst.fecha_realizada) && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} />
                      <span>{formatFecha(inst.fecha_realizada || inst.fecha_programada)}</span>
                    </div>
                  )}
                </div>

                {/* Precision */}
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                  {inst.precision === 'gps' ? (
                    <span className="text-green-600">📍 GPS exacto</span>
                  ) : (
                    <span className="text-blue-500">🏙️ Centro ciudad (aproximado)</span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
