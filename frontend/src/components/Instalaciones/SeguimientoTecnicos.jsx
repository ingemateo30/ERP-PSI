// frontend/src/components/Instalaciones/SeguimientoTecnicos.jsx
// Panel de supervisión de técnicos: agenda diaria + ruta Google Maps

import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Phone, MapPin, Navigation, Clock, CheckCircle,
  AlertCircle, RefreshCw, Calendar, ChevronDown, ChevronUp,
  Play, XCircle, ExternalLink, Map
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API = '/api/v1/instalaciones/seguimiento-tecnicos';

const ESTADO_CONFIG = {
  programada:  { label: 'Programada',  bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  en_proceso:  { label: 'En proceso',  bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  completada:  { label: 'Completada',  bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  cancelada:   { label: 'Cancelada',   bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
  reagendada:  { label: 'Reagendada',  bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
};

const estadoIcon = (estado) => {
  if (estado === 'completada') return <CheckCircle size={14} className="text-green-600" />;
  if (estado === 'en_proceso') return <Play size={14} className="text-yellow-600" />;
  if (estado === 'cancelada')  return <XCircle size={14} className="text-red-600" />;
  return <Clock size={14} className="text-blue-600" />;
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

const TecnicoCard = ({ tecnico }) => {
  const [expanded, setExpanded] = useState(true);
  const { resumen } = tecnico;
  const progreso = resumen.total > 0 ? Math.round((resumen.completadas / resumen.total) * 100) : 0;

  // URL de ruta completa para el día (Google Maps directions con waypoints)
  const rutaDiariaUrl = (() => {
    const conCoordenadas = tecnico.instalaciones.filter(i => i.coordenadas);
    if (conCoordenadas.length === 0) return null;
    const destinos = conCoordenadas.map(i => `${i.coordenadas.lat},${i.coordenadas.lng}`);
    if (destinos.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${destinos[0]}`;
    }
    const ultimo = destinos.pop();
    return `https://www.google.com/maps/dir/?api=1&waypoints=${destinos.join('|')}&destination=${ultimo}`;
  })();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header técnico */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {tecnico.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{tecnico.nombre}</p>
            {tecnico.telefono && (
              <a
                href={`tel:${tecnico.telefono}`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                <Phone size={11} /> {tecnico.telefono}
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Resumen mini */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="text-blue-700 font-medium">{resumen.programadas} pend.</span>
            <span className="text-yellow-700 font-medium">{resumen.en_proceso} activas</span>
            <span className="text-green-700 font-medium">{resumen.completadas} listas</span>
          </div>

          {/* Barra de progreso */}
          <div className="hidden md:block w-24">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-0.5">{progreso}%</p>
          </div>

          {/* Botón ruta diaria */}
          {rutaDiariaUrl && (
            <a
              href={rutaDiariaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
              title="Ver ruta diaria en Google Maps"
            >
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
              <div key={inst.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                {/* Número de orden */}
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {estadoIcon(inst.estado)}
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

                {/* Hora y navegación */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {inst.hora_programada && (
                    <span className="text-xs text-gray-600 font-mono">
                      {inst.hora_programada.slice(0, 5)}
                      {inst.hora_fin && ` → ${inst.hora_fin.slice(0, 5)}`}
                    </span>
                  )}
                  {inst.google_maps_url && (
                    <a
                      href={inst.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      title="Navegar a esta ubicación"
                    >
                      <ExternalLink size={12} />
                      Ir
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

const SeguimientoTecnicos = () => {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const res = await fetch(`${API}?fecha=${fecha}`, {
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Error cargando datos');
      setDatos(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalInstalaciones = datos?.total_instalaciones ?? 0;
  const completadas = datos?.tecnicos?.reduce((s, t) => s + t.resumen.completadas, 0) ?? 0;
  const enProceso  = datos?.tecnicos?.reduce((s, t) => s + t.resumen.en_proceso, 0) ?? 0;
  const pendientes = datos?.tecnicos?.reduce((s, t) => s + t.resumen.programadas, 0) ?? 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Map size={22} className="text-blue-600" />
            Seguimiento de Técnicos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Agenda diaria y rutas por instalador</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={cargar}
            disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Stats globales */}
      {datos && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Técnicos activos', value: datos.total_tecnicos, color: 'blue', icon: <User size={18} /> },
            { label: 'Total instalaciones', value: totalInstalaciones, color: 'gray', icon: <Calendar size={18} /> },
            { label: 'Completadas', value: completadas, color: 'green', icon: <CheckCircle size={18} /> },
            { label: 'En proceso', value: enProceso, color: 'yellow', icon: <Play size={18} /> },
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

      {/* Cards por técnico */}
      {!cargando && datos && (
        datos.tecnicos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay técnicos con instalaciones para esta fecha</p>
          </div>
        ) : (
          <div className="space-y-4">
            {datos.tecnicos.map(tecnico => (
              <TecnicoCard key={tecnico.id} tecnico={tecnico} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default SeguimientoTecnicos;
