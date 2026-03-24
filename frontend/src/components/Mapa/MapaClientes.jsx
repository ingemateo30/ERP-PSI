// frontend/src/components/Mapa/MapaClientes.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Users, RefreshCw, Filter, Loader2,
  Activity, Phone, Mail, Wifi, Tv, Building2,
  ChevronDown, ChevronRight, Search, CheckCircle,
  XCircle, AlertCircle, Clock, List
} from 'lucide-react';
import apiService from '../../services/apiService';
import { geocodificarLote } from '../../services/geocodingService';

// ── Fix iconos Leaflet ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ── Icono de marcador individual por cliente ────────────────────────────────
const crearIconoCliente = (estado) => {
  const colores = {
    activo:    '#10B981',
    suspendido:'#F59E0B',
    cortado:   '#EF4444',
    retirado:  '#6B7280',
  };
  const color = colores[estado] || '#6B7280';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:14px;height:14px;
      border-radius:50%;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.4);
      cursor:pointer;
    "></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
    popupAnchor:[0, -10]
  });
};

// ── Icono de marcador por ciudad ────────────────────────────────────────────
const crearIconoCiudad = (total, activos) => {
  const pct   = total > 0 ? activos / total : 0;
  const color = total === 0 ? '#6B7280' : pct >= 0.8 ? '#10B981' : pct >= 0.4 ? '#F59E0B' : '#EF4444';
  const size  = Math.max(42, Math.min(68, 38 + Math.log2(total + 1) * 5));
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;
      border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 3px 12px rgba(0,0,0,.4);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      cursor:pointer;
    ">
      <span style="color:#fff;font-size:${size > 52 ? 15 : 13}px;font-weight:800;line-height:1">${total}</span>
      <span style="color:rgba(255,255,255,.85);font-size:9px;line-height:1;margin-top:1px">clientes</span>
    </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 4)]
  });
};

// ── Ajustar bounds del mapa ─────────────────────────────────────────────────
const AjustarVista = ({ puntos }) => {
  const map = useMap();
  useEffect(() => {
    if (puntos?.length > 1) {
      map.fitBounds(puntos.map(p => [p.lat, p.lng]), { padding: [60, 60], maxZoom: 12 });
    } else if (puntos?.length === 1) {
      map.setView([puntos[0].lat, puntos[0].lng], 11);
    }
  }, [puntos, map]);
  return null;
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const badgeEstado = est => ({
  activo:    'bg-green-100 text-green-800 border-green-200',
  suspendido:'bg-yellow-100 text-yellow-800 border-yellow-200',
  cortado:   'bg-red-100 text-red-800 border-red-200',
  retirado:  'bg-gray-100 text-gray-600 border-gray-200',
}[est] || 'bg-gray-100 text-gray-600 border-gray-200');

const colorSv = est => ({
  activo:'text-green-700', suspendido:'text-yellow-600',
  cortado:'text-red-600', cancelado:'text-gray-400',
}[est] || 'text-gray-400');

const CACHE_KEY      = 'mapaClientes_geocache';
const CACHE_KEY_BARRIO = 'mapaClientes_geocache_barrio'; // persistente en localStorage
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 días

const leerCache = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return {}; }
    return data;
  } catch { return {}; }
};

const guardarCache = (data) => {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

// Cache de barrios en localStorage (sobrevive recarga de página)
const leerCacheBarrio = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY_BARRIO);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY_BARRIO); return {}; }
    return data;
  } catch { return {}; }
};

const guardarCacheBarrio = (data) => {
  try { localStorage.setItem(CACHE_KEY_BARRIO, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

// ═══════════════════════════════════════════════════════════════════════════
const MapaClientes = () => {
  const [ciudades,          setCiudades]          = useState([]);
  const [ciudadesMapa,      setCiudadesMapa]      = useState([]);
  const [clientesMapa,      setClientesMapa]      = useState([]); // vista individual
  const [loading,           setLoading]           = useState(true);
  const [geocodificando,    setGeocodificando]    = useState(false);
  const [geocodIndividual,  setGeocodIndividual]  = useState(false);
  const [progreso,          setProgreso]          = useState({ actual: 0, total: 0 });
  const [error,             setError]             = useState(null);
  const [vistaActual,       setVistaActual]       = useState('mapa');
  const [modoIndividual,    setModoIndividual]    = useState(false); // marcadores individuales
  const [busqueda,          setBusqueda]          = useState('');
  const [filtroEstado,      setFiltroEstado]      = useState('');
  const [ciudadExpandida,   setCiudadExpandida]   = useState(null);
  const [mostrarFiltros,    setMostrarFiltros]    = useState(false);
  const [panelCiudad,       setPanelCiudad]       = useState(null);

  const CENTRO = [6.4667, -73.2667];

  // ── Cargar datos ─────────────────────────────────────────────────────────
  const cargarDatos = useCallback(async (limpiarCache = false) => {
    try {
      setLoading(true);
      setError(null);
      if (limpiarCache) { sessionStorage.removeItem(CACHE_KEY); localStorage.removeItem(CACHE_KEY_BARRIO); setCiudadesMapa([]); setClientesMapa([]); }
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
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Auto-geocodificar ciudades al cargar ─────────────────────────────────
  useEffect(() => {
    if (ciudades.length === 0) return;
    geocodificarCiudades(ciudades);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudades]);

  // ── Geocodificar clientes individuales cuando se activa el modo ──────────
  useEffect(() => {
    if (modoIndividual && ciudades.length > 0) {
      geocodificarClientesIndividuales();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoIndividual, ciudades]);

  const geocodificarCiudades = async (listaCiudades) => {
    const cache = leerCache();
    const pendientes = listaCiudades.filter(
      c => c.ciudad_nombre !== 'Sin ciudad' && !cache[c.ciudad_nombre]
    );

    // Ya tenemos todo en caché
    if (pendientes.length === 0) {
      aplicarCoordenadas(listaCiudades, cache);
      return;
    }

    setGeocodificando(true);
    setProgreso({ actual: 0, total: pendientes.length });

    const nuevoCache = { ...cache };
    let idx = 0;

    for (const ciudad of pendientes) {
      idx++;
      setProgreso({ actual: idx, total: pendientes.length });
      const coords = await geocodificarUna(ciudad.ciudad_nombre, ciudad.departamento_nombre);
      if (coords) nuevoCache[ciudad.ciudad_nombre] = coords;
      if (idx < pendientes.length) await new Promise(r => setTimeout(r, 1100));
    }

    guardarCache(nuevoCache);
    setGeocodificando(false);
    aplicarCoordenadas(listaCiudades, nuevoCache);
  };

  const aplicarCoordenadas = (listaCiudades, cache) => {
    const resultado = listaCiudades
      .filter(c => cache[c.ciudad_nombre])
      .map(c => ({ ...c, ...cache[c.ciudad_nombre] }));
    setCiudadesMapa(resultado);
  };

  const geocodificarUna = async (ciudad, departamento) => {
    try {
      const q = [ciudad, departamento, 'Colombia'].filter(Boolean).join(', ');
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=co`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'ERP-PSI/1.0' } });
      const data = await res.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    } catch { return null; }
  };

  // ── Clientes individuales ─────────────────────────────────────────────────
  // 1. Clientes con GPS real de instalación → exacto (sin llamada API)
  // 2. Resto → geocodificación por dirección completa via servicio compartido
  //            (con cache localStorage persistente, solo geocodifica una vez)
  const señalAbortRef = useRef(null);

  const geocodificarClientesIndividuales = useCallback(async () => {
    if (ciudades.length === 0) return;

    // Cancelar geocodificación previa si el usuario alterna el modo
    señalAbortRef.current?.abort();
    const ctrl = new AbortController();
    señalAbortRef.current = ctrl;

    const todosConCiudad = ciudades.flatMap(ciudad =>
      ciudad.clientes.map(cl => ({
        ...cl,
        ciudad_nombre:       ciudad.ciudad_nombre,
        departamento_nombre: ciudad.departamento_nombre
      }))
    );

    // Mapa mutable id → coords para actualización en streaming
    const coordsMap = {};

    // Clientes con GPS real desde BD
    todosConCiudad.forEach(cl => {
      if (cl.lat != null && cl.lng != null) coordsMap[cl.id] = { lat: cl.lat, lng: cl.lng };
    });

    // Mostrar de inmediato los que tienen GPS real
    setClientesMapa(todosConCiudad.filter(cl => coordsMap[cl.id]).map(cl => ({ ...cl, ...coordsMap[cl.id] })));

    const sinGPS = todosConCiudad.filter(cl => cl.lat == null || cl.lng == null);
    if (sinGPS.length === 0) return;

    // Prepara lote para el servicio de geocodificación
    const lote = sinGPS.map(cl => ({
      id:          cl.id,
      direccion:   cl.direccion,
      barrio:      cl.barrio,
      ciudad:      cl.ciudad_nombre,
      departamento:cl.departamento_nombre
    }));

    setGeocodIndividual(true);

    await geocodificarLote(lote, {
      señalAbort: ctrl.signal,
      onProgreso: (actual, total) => setProgreso({ actual, total }),
      onResultado: (id, coords) => {
        coordsMap[id] = coords;
        // Actualizar mapa en streaming: ya geocodificados + pendientes sin coords aún
        setClientesMapa(
          todosConCiudad
            .filter(cl => coordsMap[cl.id])
            .map(cl => ({ ...cl, lat: coordsMap[cl.id].lat, lng: coordsMap[cl.id].lng }))
        );
      }
    });

    if (!ctrl.signal.aborted) {
      setGeocodIndividual(false);
      setProgreso({ actual: 0, total: 0 });
    }
  }, [ciudades]); // eslint-disable-line

  // ── Stats globales ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todos = ciudades.flatMap(c => c.clientes);
    return {
      totalCiudades: ciudades.length,
      total:         todos.length,
      activos:       todos.filter(c => c.estado === 'activo').length,
      suspendidos:   todos.filter(c => c.estado === 'suspendido').length,
      cortados:      todos.filter(c => c.estado === 'cortado').length,
      retirados:     todos.filter(c => c.estado === 'retirado').length,
    };
  }, [ciudades]);

  // ── Ciudades filtradas (vista lista) ─────────────────────────────────────
  const ciudadesFiltradas = useMemo(() => {
    let lista = ciudades;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.map(c => ({
        ...c,
        clientes: c.clientes.filter(cl =>
          cl.nombre?.toLowerCase().includes(q) ||
          cl.identificacion?.toLowerCase().includes(q) ||
          cl.direccion?.toLowerCase().includes(q) ||
          cl.telefono?.includes(q)
        )
      })).filter(c => c.clientes.length > 0 || c.ciudad_nombre.toLowerCase().includes(q));
    }
    if (filtroEstado) {
      lista = lista.map(c => ({
        ...c,
        clientes: c.clientes.filter(cl => cl.estado === filtroEstado)
      })).filter(c => c.clientes.length > 0);
    }
    return lista;
  }, [ciudades, busqueda, filtroEstado]);

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">

      {/* ── CABECERA ── */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Mapa General de Clientes
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.total} clientes · {stats.totalCiudades} ciudades
              {geocodificando && (
                <span className="ml-2 text-blue-600 font-medium">
                  · Geocodificando {progreso.actual}/{progreso.total}...
                </span>
              )}
              {modoIndividual && clientesMapa.length > 0 && (
                <span className="ml-2 text-green-600 font-medium">
                  · {clientesMapa.length} clientes en mapa
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setVistaActual('mapa')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  vistaActual === 'mapa' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Mapa
              </button>
              <button
                onClick={() => setVistaActual('lista')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  vistaActual === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" /> Lista
              </button>
            </div>

            <button
              onClick={() => setMostrarFiltros(f => !f)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                mostrarFiltros ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filtros
            </button>
            {vistaActual === 'mapa' && (
              <button
                onClick={() => setModoIndividual(m => !m)}
                className={`px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  modoIndividual
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title="Alternar entre marcadores por ciudad e individuales por cliente"
              >
                <MapPin className="w-3.5 h-3.5" />
                {modoIndividual ? 'Por ciudad' : 'Individual'}
              </button>
            )}
            <button
              onClick={() => cargarDatos(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t border-gray-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar cliente por nombre, ID, teléfono..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 min-w-[150px]"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="cortado">Cortado</option>
              <option value="retirado">Retirado</option>
            </select>
          </div>
        )}
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-0 border-b border-gray-200 bg-white">
        {[
          { label: 'Ciudades',    value: stats.totalCiudades, cls: 'text-blue-700',  bg: 'bg-blue-50',   Icon: Building2   },
          { label: 'Total',       value: stats.total,         cls: 'text-gray-800',  bg: 'bg-gray-50',   Icon: Users       },
          { label: 'Activos',     value: stats.activos,       cls: 'text-green-700', bg: 'bg-green-50',  Icon: CheckCircle },
          { label: 'Suspendidos', value: stats.suspendidos,   cls: 'text-yellow-700',bg: 'bg-yellow-50', Icon: AlertCircle },
          { label: 'Cortados',    value: stats.cortados,      cls: 'text-red-700',   bg: 'bg-red-50',    Icon: XCircle     },
          { label: 'Retirados',   value: stats.retirados,     cls: 'text-gray-600',  bg: 'bg-gray-50',   Icon: Clock       },
        ].map(({ label, value, cls, bg, Icon }) => (
          <div key={label} className={`${bg} border-r border-gray-200 last:border-r-0 px-4 py-2.5 flex items-center gap-2`}>
            <Icon className={`w-4 h-4 flex-shrink-0 ${cls}`} />
            <div>
              <p className="text-xs text-gray-500 leading-none">{label}</p>
              <p className={`text-lg font-bold leading-tight ${cls}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ════════════════ VISTA MAPA ════════════════ */}
      {vistaActual === 'mapa' && (
        <div className="flex flex-1 relative overflow-hidden" style={{ minHeight: '520px' }}>

          {/* Overlay de progreso geocodificación */}
          {(geocodificando || geocodIndividual) && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-gray-700">
                {geocodIndividual ? 'Localizando clientes en el mapa...' : 'Localizando ciudades en el mapa...'}
              </p>
              <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progreso.total > 0 ? (progreso.actual / progreso.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {progreso.actual} / {progreso.total} {geocodIndividual ? 'direcciones' : 'ciudades'}
              </p>
            </div>
          )}

          {/* Mapa */}
          <div className="flex-1">
            <MapContainer
              center={CENTRO}
              zoom={8}
              style={{ height: '100%', width: '100%', minHeight: '520px' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {!modoIndividual && ciudadesMapa.length > 0 && <AjustarVista puntos={ciudadesMapa} />}
              {modoIndividual && clientesMapa.length > 0 && <AjustarVista puntos={clientesMapa} />}

              {/* Marcadores agrupados por ciudad */}
              {!modoIndividual && ciudadesMapa.map((ciudad, idx) => (
                <Marker
                  key={idx}
                  position={[ciudad.lat, ciudad.lng]}
                  icon={crearIconoCiudad(ciudad.total_clientes, ciudad.clientes_activos)}
                  eventHandlers={{ click: () => setPanelCiudad(ciudad) }}
                >
                  <Popup minWidth={260} maxWidth={340} maxHeight={380}>
                    <div className="text-sm">
                      <div className="font-bold text-base mb-1">
                        {ciudad.ciudad_nombre}
                        {ciudad.departamento_nombre && (
                          <span className="text-gray-400 font-normal text-xs ml-1">— {ciudad.departamento_nombre}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{ciudad.total_clientes} total</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{ciudad.clientes_activos} activos</span>
                        {ciudad.clientes_suspendidos > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">{ciudad.clientes_suspendidos} susp.</span>}
                        {ciudad.clientes_cortados > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">{ciudad.clientes_cortados} cortados</span>}
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1.5">
                        {ciudad.clientes.slice(0, 20).map(c => (
                          <div key={c.id} className="border border-gray-100 rounded-lg px-2 py-1.5 bg-gray-50">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-medium text-gray-800 text-xs">{c.nombre}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badgeEstado(c.estado)}`}>{c.estado}</span>
                            </div>
                            {c.direccion && <p className="text-gray-400 text-xs truncate">{c.direccion}</p>}
                            {c.servicios?.filter(sv => sv.estado === 'activo').map(sv => (
                              <span key={sv.id} className="text-xs text-green-700 mr-2">
                                {sv.tipo === 'television' ? '📺' : '📶'} {sv.plan_nombre}
                              </span>
                            ))}
                          </div>
                        ))}
                        {ciudad.clientes.length > 20 && (
                          <p className="text-center text-gray-400 text-xs py-1">+{ciudad.clientes.length - 20} más</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Marcadores individuales por cliente */}
              {modoIndividual && clientesMapa.map(c => (
                <Marker
                  key={c.id}
                  position={[c.lat, c.lng]}
                  icon={crearIconoCliente(c.estado)}
                >
                  <Popup minWidth={220} maxWidth={280}>
                    <div className="text-sm">
                      <div className="font-bold text-gray-900 mb-1">{c.nombre}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${badgeEstado(c.estado)}`}>{c.estado}</span>
                      {c.identificacion && <p className="text-gray-500 text-xs mt-1">{c.identificacion}</p>}
                      {c.direccion && <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0"/>{c.direccion}{c.barrio ? `, ${c.barrio}` : ''}</p>}
                      {c.ciudad_nombre && <p className="text-gray-500 text-xs mt-0.5">{c.ciudad_nombre}</p>}
                      {c.telefono && <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0"/>{c.telefono}</p>}
                      {c.servicios?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {c.servicios.map(sv => (
                            <div key={sv.id} className={`text-xs flex items-center gap-1 ${colorSv(sv.estado)}`}>
                              {sv.tipo === 'television' ? '📺' : '📶'} {sv.plan_nombre}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Leyenda modo individual */}
              {modoIndividual && clientesMapa.length === 0 && !geocodIndividual && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 z-[500] pointer-events-none">
                  No hay clientes con dirección geocodificable
                </div>
              )}
            </MapContainer>
          </div>

          {/* Panel lateral ciudad seleccionada */}
          {panelCiudad && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{panelCiudad.ciudad_nombre}</p>
                  {panelCiudad.departamento_nombre && (
                    <p className="text-xs text-gray-500">{panelCiudad.departamento_nombre}</p>
                  )}
                </div>
                <button onClick={() => setPanelCiudad(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">&times;</button>
              </div>

              {/* mini stats ciudad */}
              <div className="grid grid-cols-2 gap-0 border-b border-gray-200">
                {[
                  { label: 'Total',       val: panelCiudad.total_clientes,      cls: 'text-gray-800' },
                  { label: 'Activos',     val: panelCiudad.clientes_activos,    cls: 'text-green-700' },
                  { label: 'Suspendidos', val: panelCiudad.clientes_suspendidos,cls: 'text-yellow-700' },
                  { label: 'Cortados',    val: panelCiudad.clientes_cortados,   cls: 'text-red-700' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="px-3 py-2 border-r border-b border-gray-100 last:border-r-0">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-lg font-bold ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Lista de clientes */}
              <div className="flex-1 overflow-y-auto">
                {panelCiudad.clientes.map(c => (
                  <div key={c.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex justify-between items-start gap-1 mb-0.5">
                      <span className="font-medium text-gray-900 text-sm leading-tight">{c.nombre}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badgeEstado(c.estado)}`}>{c.estado}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c.identificacion}</p>
                    {c.direccion && <p className="text-xs text-gray-500 truncate">{c.direccion}{c.barrio ? ` · ${c.barrio}` : ''}</p>}
                    {c.telefono && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />{c.telefono}
                      </p>
                    )}
                    {c.servicios?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.servicios.map(sv => (
                          <span key={sv.id} className={`text-xs flex items-center gap-0.5 ${colorSv(sv.estado)}`}>
                            {sv.tipo === 'television' ? <Tv className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                            {sv.plan_nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ VISTA LISTA ════════════════ */}
      {vistaActual === 'lista' && (
        <div className="flex-1 p-4 md:p-6 space-y-3">
          {ciudadesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3" />
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm">Ajusta los filtros o la búsqueda</p>
            </div>
          ) : (
            ciudadesFiltradas.map(ciudad => (
              <div key={ciudad.ciudad_nombre} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setCiudadExpandida(p => p === ciudad.ciudad_nombre ? null : ciudad.ciudad_nombre)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900">{ciudad.ciudad_nombre}</span>
                    {ciudad.departamento_nombre && (
                      <span className="text-gray-400 text-sm">— {ciudad.departamento_nombre}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">{ciudad.clientes.length}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">{ciudad.clientes_activos} activos</span>
                    {ciudad.clientes_suspendidos > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">{ciudad.clientes_suspendidos} susp.</span>}
                    {ciudad.clientes_cortados > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">{ciudad.clientes_cortados} cort.</span>}
                    {ciudadExpandida === ciudad.ciudad_nombre
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {ciudadExpandida === ciudad.ciudad_nombre && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Cliente</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Dirección</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Contacto</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Estado</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Servicios</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {ciudad.clientes.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900 text-xs">{c.nombre}</div>
                              <div className="text-gray-400 text-xs">{c.identificacion}</div>
                              {c.sector_nombre && <div className="text-gray-400 text-xs">{c.sector_nombre}</div>}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 max-w-[160px]">
                              <div className="truncate text-xs">{c.direccion || '—'}</div>
                              {c.barrio && <div className="text-xs text-gray-400 truncate">{c.barrio}</div>}
                            </td>
                            <td className="px-4 py-2.5">
                              {c.telefono && <div className="flex items-center gap-1 text-xs text-gray-600"><Phone className="w-3 h-3 text-gray-400" />{c.telefono}</div>}
                              {c.correo && <div className="flex items-center gap-1 text-xs text-gray-500 truncate max-w-[130px]"><Mail className="w-3 h-3 text-gray-400 flex-shrink-0" /><span className="truncate">{c.correo}</span></div>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${badgeEstado(c.estado)}`}>{c.estado}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              {c.servicios?.length > 0 ? (
                                <div className="space-y-0.5">
                                  {c.servicios.map(sv => (
                                    <div key={sv.id} className="flex items-center gap-1 text-xs">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sv.estado === 'activo' ? 'bg-green-500' : sv.estado === 'suspendido' ? 'bg-yellow-500' : sv.estado === 'cortado' ? 'bg-red-500' : 'bg-gray-300'}`} />
                                      {sv.tipo === 'television' ? <Tv className="w-3 h-3 text-gray-400" /> : <Wifi className="w-3 h-3 text-gray-400" />}
                                      <span className={colorSv(sv.estado)}>{sv.plan_nombre}</span>
                                      <span className="text-gray-400">${Number(sv.precio || 0).toLocaleString('es-CO')}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MapaClientes;
