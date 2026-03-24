// frontend/src/components/Instalaciones/SeguimientoTecnicos.jsx
// Panel de supervisión de técnicos: agenda diaria + mapa en tiempo real + rutas Google Maps

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  User, Phone, MapPin, Navigation, Clock, CheckCircle,
  AlertCircle, RefreshCw, Calendar, ChevronDown, ChevronUp,
  Play, XCircle, ExternalLink, Map, Radio
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { geocodificarLote } from '../../services/geocodingService';

const API       = '/api/v1/instalaciones/seguimiento-tecnicos';
const API_VIVO  = '/api/v1/instalaciones/ubicaciones-en-vivo';

// ─── Iconos Leaflet ───────────────────────────────────────────────────────────
const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const iconInstalacion = {
  programada: makeIcon('#3b82f6'),
  en_proceso:  makeIcon('#f59e0b'),
  completada:  makeIcon('#22c55e'),
  cancelada:   makeIcon('#ef4444'),
  reagendada:  makeIcon('#a855f7'),
};

const iconTecnico = (nombre) =>
  L.divIcon({
    className: '',
    html: `<div style="background:#0e6493;color:white;border-radius:50%;width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)">
      ${nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

// ─── Ajustar mapa a todos los puntos ─────────────────────────────────────────
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
};

// ─── Constantes de estado ────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  programada: { label: 'Programada',  bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  en_proceso: { label: 'En proceso',  bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  completada: { label: 'Completada',  bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  cancelada:  { label: 'Cancelada',   bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  reagendada: { label: 'Reagendada',  bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
};

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.programada;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Reloj de tiempo transcurrido (en_proceso) ───────────────────────────────
const ElapsedTimer = ({ horaInicio }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!horaInicio) return;
    const hh = horaInicio.slice(0, 2);
    const mm = horaInicio.slice(3, 5);
    const ss = horaInicio.slice(6, 8) || '00';

    const calcular = () => {
      const ahora = new Date();
      // Construir la hora de inicio en la fecha de hoy (hora LOCAL del cliente)
      const inicio = new Date(
        ahora.getFullYear(), ahora.getMonth(), ahora.getDate(),
        parseInt(hh), parseInt(mm), parseInt(ss)
      );
      const diff = Math.max(0, Math.floor((ahora - inicio) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0
        ? `${h}h ${String(m).padStart(2, '0')}m`
        : `${m}m ${String(s).padStart(2, '0')}s`
      );
    };

    calcular();
    const id = setInterval(calcular, 1000);
    return () => clearInterval(id);
  }, [horaInicio]);

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
      <Clock size={11} className="animate-pulse" />
      {elapsed || '…'}
    </span>
  );
};

// ─── Bloque de horas para cada instalación ───────────────────────────────────
const BloqueHoras = ({ inst }) => {
  const fmt = (t) => {
    if (!t) return null;
    // TIME puede venir como "HH:MM:SS" o "HH:MM"
    const str = typeof t === 'string' ? t : String(t);
    return str.slice(0, 5);
  };
  const prog   = fmt(inst.hora_programada);
  const inicio = fmt(inst.hora_inicio);
  const fin    = fmt(inst.hora_fin);

  return (
    <div className="flex flex-col items-end gap-0.5 text-xs flex-shrink-0 min-w-[90px]">
      {prog && (
        <span className="flex items-center gap-1 text-gray-500" title="Hora programada">
          <span className="text-gray-400 text-[10px] font-medium w-10 text-right">Prog.</span>
          <span className="font-mono font-medium">{prog}</span>
        </span>
      )}
      {inicio && (
        <span className="flex items-center gap-1 text-blue-700" title="Hora inicio">
          <span className="text-blue-400 text-[10px] font-medium w-10 text-right">Inicio</span>
          <span className="font-mono font-semibold">{inicio}</span>
        </span>
      )}
      {fin && (
        <span className="flex items-center gap-1 text-green-700" title="Hora fin">
          <span className="text-green-500 text-[10px] font-medium w-10 text-right">Fin</span>
          <span className="font-mono font-semibold">{fin}</span>
        </span>
      )}
      {inst.estado === 'en_proceso' && inst.hora_inicio && (
        <ElapsedTimer horaInicio={inst.hora_inicio} />
      )}
    </div>
  );
};

// ─── Card de técnico ─────────────────────────────────────────────────────────
const TecnicoCard = ({ tecnico, vivoData }) => {
  const [expanded, setExpanded] = useState(true);
  const { resumen } = tecnico;
  const progreso = resumen.total > 0 ? Math.round((resumen.completadas / resumen.total) * 100) : 0;

  // URL de ruta diaria Google Maps
  const rutaDiariaUrl = (() => {
    const pts = tecnico.instalaciones.filter(i => i.coordenadas);
    if (pts.length === 0) return null;
    const destinos = pts.map(i => `${i.coordenadas.lat},${i.coordenadas.lng}`);
    if (destinos.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${destinos[0]}`;
    }
    const ultimo = destinos.pop();
    return `https://www.google.com/maps/dir/?api=1&waypoints=${destinos.join('|')}&destination=${ultimo}`;
  })();

  const vivo = vivoData?.find(v => v.instalador_id === tecnico.id);
  const mins = vivo ? parseInt(vivo.minutos_desde_actualizacion) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {tecnico.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            {/* Indicador GPS en vivo */}
            {vivo && mins !== null && mins <= 10 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full animate-pulse" title="GPS activo" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tecnico.nombre}</p>
            {tecnico.telefono && (
              <a href={`tel:${tecnico.telefono}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                onClick={e => e.stopPropagation()}>
                <Phone size={11} /> {tecnico.telefono}
              </a>
            )}
            {vivo && (
              <p className="text-xs text-gray-400 mt-0.5">
                <Radio size={10} className="inline mr-1 text-green-500" />
                GPS hace {mins}m · {vivo.precision_metros ? `±${vivo.precision_metros}m` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="text-blue-700 font-medium">{resumen.programadas} pend.</span>
            <span className="text-yellow-700 font-medium">{resumen.en_proceso} activas</span>
            <span className="text-green-700 font-medium">{resumen.completadas} listas</span>
          </div>

          <div className="hidden md:block w-24">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${progreso}%` }} />
            </div>
            <p className="text-xs text-gray-500 text-center mt-0.5">{progreso}%</p>
          </div>

          {rutaDiariaUrl && (
            <a href={rutaDiariaUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
              title="Ver ruta del día en Google Maps">
              <Navigation size={13} />
              <span className="hidden sm:inline">Ruta del día</span>
            </a>
          )}

          {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Lista de instalaciones */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {tecnico.instalaciones.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin instalaciones programadas hoy</p>
          ) : (
            tecnico.instalaciones.map((inst, idx) => (
              <div key={inst.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 ${inst.estado === 'en_proceso' ? 'bg-yellow-50/40' : ''}`}>
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 truncate">{inst.cliente_nombre}</span>
                    <Badge estado={inst.estado} />
                  </div>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <MapPin size={11} />
                    {inst.direccion || 'Sin dirección'}{inst.barrio ? `, ${inst.barrio}` : ''}{inst.ciudad ? ` — ${inst.ciudad}` : ''}
                  </p>
                  {inst.plan_nombre && (
                    <p className="text-xs text-gray-400 mt-0.5">{inst.plan_nombre} · {inst.tipo_orden || inst.tipo_instalacion}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <BloqueHoras inst={inst} />
                  {inst.google_maps_url && (
                    <a href={inst.google_maps_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800" title="Navegar a esta ubicación">
                      <ExternalLink size={12} /> Ir
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Mapa en tiempo real ──────────────────────────────────────────────────────
const MapaEnVivo = ({ tecnicos, ubicacionesVivas }) => {
  // Recoger todos los puntos con coordenadas
  const puntos = [];
  tecnicos.forEach(t => t.instalaciones.forEach(i => {
    if (i.coordenadas) puntos.push([i.coordenadas.lat, i.coordenadas.lng]);
  }));
  ubicacionesVivas.forEach(v => puntos.push([parseFloat(v.lat), parseFloat(v.lng)]));

  const centro = puntos.length > 0 ? puntos[0] : [4.5709, -74.2973]; // Colombia

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Radio size={16} className="text-green-500" />
          Mapa en tiempo real
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Técnicos GPS</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> En proceso</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Completada</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Programada</span>
        </div>
      </div>

      <MapContainer center={centro} zoom={puntos.length > 0 ? 13 : 7} style={{ height: 'clamp(280px, 50vw, 420px)', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {puntos.length > 0 && <FitBounds points={puntos} />}

        {/* Marcadores de instalaciones */}
        {tecnicos.map(t =>
          t.instalaciones.map(inst =>
            inst.coordenadas ? (
              <Marker
                key={`inst-${inst.id}`}
                position={[inst.coordenadas.lat, inst.coordenadas.lng]}
                icon={iconInstalacion[inst.estado] || iconInstalacion.programada}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{inst.cliente_nombre}</p>
                    <p className="text-gray-600">{inst.direccion}{inst.barrio ? `, ${inst.barrio}` : ''}</p>
                    <p className="text-gray-500 mt-1">
                      <span className="font-medium">Técnico:</span> {t.nombre}
                    </p>
                    {inst.hora_programada && (
                      <p className="text-gray-500">
                        <span className="font-medium">Prog:</span> {inst.hora_programada.slice(0, 5)}
                        {inst.hora_inicio && <> · <span className="font-medium">Inicio:</span> {inst.hora_inicio.slice(0, 5)}</>}
                        {inst.hora_fin && <> · <span className="font-medium">Fin:</span> {inst.hora_fin.slice(0, 5)}</>}
                      </p>
                    )}
                    <p className={`mt-1 font-medium ${ESTADO_CONFIG[inst.estado]?.text || 'text-gray-600'}`}>
                      {ESTADO_CONFIG[inst.estado]?.label || inst.estado}
                    </p>
                    {inst.google_maps_url && (
                      <a href={inst.google_maps_url} target="_blank" rel="noopener noreferrer"
                        className="block mt-1 text-blue-600 hover:underline text-xs">
                        Abrir en Google Maps
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : null
          )
        )}

        {/* Línea de ruta por técnico (instalaciones completadas/en proceso) */}
        {tecnicos.map(t => {
          const pts = t.instalaciones
            .filter(i => i.coordenadas && ['completada', 'en_proceso'].includes(i.estado))
            .map(i => [i.coordenadas.lat, i.coordenadas.lng]);
          return pts.length > 1 ? (
            <Polyline key={`ruta-${t.id}`} positions={pts} color="#0e6493" weight={2} opacity={0.5} dashArray="5,5" />
          ) : null;
        })}

        {/* Marcadores GPS en vivo de técnicos */}
        {ubicacionesVivas.map(v => (
          <Marker
            key={`vivo-${v.instalador_id}`}
            position={[parseFloat(v.lat), parseFloat(v.lng)]}
            icon={iconTecnico(v.nombre)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{v.nombre}</p>
                {v.telefono && <p className="text-gray-600">{v.telefono}</p>}
                <p className="text-gray-500 mt-1">
                  GPS actualizado hace {v.minutos_desde_actualizacion} min
                  {v.precision_metros ? ` · ±${v.precision_metros}m` : ''}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const SeguimientoTecnicos = () => {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [ubicacionesVivas, setUbicacionesVivas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState(null);
  const [fecha, setFecha]     = useState(new Date().toISOString().split('T')[0]);
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const intervalVivo = useRef(null);

  const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res  = await fetch(`${API}?fecha=${fecha}`, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Cache-Control': 'no-store' }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Error cargando datos');

      const datosBase = json.data;
      setDatos(datosBase);

      // Geocodificar instalaciones que no tienen coordenadas guardadas
      const sinCoords = [];
      datosBase?.tecnicos?.forEach(t => {
        t.instalaciones.forEach(inst => {
          if (!inst.coordenadas?.lat) {
            sinCoords.push({
              id:          inst.id,
              direccion:   inst.direccion_instalacion,
              barrio:      inst.barrio,
              ciudad:      inst.ciudad_nombre,
              departamento:null
            });
          }
        });
      });

      if (sinCoords.length > 0) {
        await geocodificarLote(sinCoords, {
          onResultado: (id, coords) => {
            setDatos(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                tecnicos: prev.tecnicos.map(t => ({
                  ...t,
                  instalaciones: t.instalaciones.map(inst =>
                    inst.id === id ? { ...inst, coordenadas: coords } : inst
                  )
                }))
              };
            });
          }
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  const cargarVivo = useCallback(async () => {
    try {
      const res  = await fetch(API_VIVO, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (json.success) setUbicacionesVivas(json.data || []);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Polling GPS cada 15 s
  useEffect(() => {
    cargarVivo();
    intervalVivo.current = setInterval(cargarVivo, 15000);
    return () => clearInterval(intervalVivo.current);
  }, [cargarVivo]);

  // Auto-refresh instalaciones cada 60 s
  useEffect(() => {
    const id = setInterval(cargar, 60000);
    return () => clearInterval(id);
  }, [cargar]);

  const totalInstalaciones = datos?.total_instalaciones ?? 0;
  const completadas = datos?.tecnicos?.reduce((s, t) => s + t.resumen.completadas, 0) ?? 0;
  const enProceso   = datos?.tecnicos?.reduce((s, t) => s + t.resumen.en_proceso, 0) ?? 0;

  const tecnicosConGPS = ubicacionesVivas.length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Map size={22} className="text-blue-600" />
            Seguimiento de Técnicos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Agenda diaria · mapa en tiempo real · rutas Google Maps
            {tecnicosConGPS > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <Radio size={12} className="animate-pulse" />
                {tecnicosConGPS} técnico{tecnicosConGPS > 1 ? 's' : ''} con GPS activo
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button onClick={cargar} disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={() => setMostrarMapa(m => !m)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            <Map size={14} />
            {mostrarMapa ? 'Ocultar mapa' : 'Ver mapa'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {datos && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Técnicos activos',    value: datos.total_tecnicos,  color: 'blue',   icon: <User size={18} /> },
            { label: 'Total instalaciones', value: totalInstalaciones,    color: 'gray',   icon: <Calendar size={18} /> },
            { label: 'Completadas',         value: completadas,           color: 'green',  icon: <CheckCircle size={18} /> },
            { label: 'En proceso',          value: enProceso,             color: 'yellow', icon: <Play size={18} /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-${stat.color}-100 flex items-center justify-center text-${stat.color}-600`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading */}
      {cargando && (
        <div className="flex justify-center py-12">
          <RefreshCw size={28} className="animate-spin text-blue-500" />
        </div>
      )}

      {!cargando && datos && (
        <>
          {/* Mapa en tiempo real */}
          {mostrarMapa && (
            <MapaEnVivo tecnicos={datos.tecnicos} ubicacionesVivas={ubicacionesVivas} />
          )}

          {/* Cards por técnico */}
          {datos.tecnicos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <User size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay técnicos con instalaciones para esta fecha</p>
            </div>
          ) : (
            <div className="space-y-4">
              {datos.tecnicos.map(tecnico => (
                <TecnicoCard
                  key={tecnico.id}
                  tecnico={tecnico}
                  vivoData={ubicacionesVivas}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SeguimientoTecnicos;
