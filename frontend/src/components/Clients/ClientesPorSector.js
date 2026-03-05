// frontend/src/components/Clients/ClientesPorSector.js
// Página que lista clientes agrupados por tipo de zona (urbano/rural), ciudad y sector

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Users, Building2, ChevronDown, ChevronRight,
  RefreshCw, Search, Filter, X, Home, Wifi, Phone, Mail,
  CheckCircle, AlertCircle, XCircle, Clock, UserMinus
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

const getToken = () => localStorage.getItem('accessToken');

const ESTADO_CONFIG = {
  activo:     { label: 'Activo',     color: 'bg-green-100 text-green-800',  icon: CheckCircle },
  suspendido: { label: 'Suspendido', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  cortado:    { label: 'Cortado',    color: 'bg-red-100 text-red-800',       icon: XCircle },
  retirado:   { label: 'Retirado',   color: 'bg-gray-100 text-gray-800',    icon: UserMinus },
  inactivo:   { label: 'Inactivo',   color: 'bg-gray-100 text-gray-600',    icon: AlertCircle },
};

const ZONA_CONFIG = {
  urbano: { label: 'Urbano', color: 'bg-blue-100 text-blue-700 border-blue-200',  icon: Building2 },
  rural:  { label: 'Rural',  color: 'bg-green-100 text-green-700 border-green-200', icon: Home },
  sin_zona: { label: 'Sin zona', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: MapPin },
};

// ── Badge de estado ────────────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

// ── Fila de cliente ────────────────────────────────────────────────
const ClienteRow = ({ cliente }) => (
  <div className="flex items-start justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{cliente.nombre}</p>
      <p className="text-xs text-gray-500">{cliente.tipo_documento?.toUpperCase()} {cliente.identificacion}</p>
      {cliente.direccion && (
        <p className="text-xs text-gray-400 truncate mt-0.5">
          <MapPin size={10} className="inline mr-1" />{cliente.direccion}
          {cliente.barrio ? ` - ${cliente.barrio}` : ''}
        </p>
      )}
    </div>
    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
      <EstadoBadge estado={cliente.estado} />
      {cliente.telefono && (
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Phone size={10} />{cliente.telefono}
        </span>
      )}
    </div>
  </div>
);

// ── Sección de sector ──────────────────────────────────────────────
const SectorCard = ({ sector }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
          <Wifi size={16} className="text-gray-600" />
          <span className="font-medium text-gray-800 text-sm">
            {sector.sector_codigo ? `[${sector.sector_codigo}] ` : ''}{sector.sector_nombre}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
          <Users size={12} />{sector.total} cliente{sector.total !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100">
          {sector.clientes.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 text-center">Sin clientes</p>
          ) : (
            sector.clientes.map(c => <ClienteRow key={c.id} cliente={c} />)
          )}
        </div>
      )}
    </div>
  );
};

// ── Sección de zona (urbano / rural) ──────────────────────────────
const ZonaSection = ({ zona }) => {
  const [expanded, setExpanded] = useState(true);
  const cfg = ZONA_CONFIG[zona.tipo_zona] || ZONA_CONFIG.sin_zona;
  const IconoZona = cfg.icon;
  const totalClientes = zona.sectores.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.color.includes('border') ? '' : 'border-gray-200'}`}>
      <button
        onClick={() => setExpanded(p => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 border-b transition-colors text-left ${cfg.color}`}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <IconoZona size={18} />
          <span className="font-semibold capitalize">{cfg.label}</span>
          <span className="text-xs font-normal opacity-70">({zona.sectores.length} sector{zona.sectores.length !== 1 ? 'es' : ''})</span>
        </div>
        <span className="text-sm font-medium">
          {totalClientes} cliente{totalClientes !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="p-3 space-y-2 bg-white">
          {zona.sectores.map(sector => (
            <SectorCard key={sector.sector_id || 'sin'} sector={sector} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Sección de ciudad / sede ───────────────────────────────────────
const CiudadSection = ({ ciudad }) => {
  const [expanded, setExpanded] = useState(true);
  const totalClientes = ciudad.zonas.reduce(
    (sum, z) => sum + z.sectores.reduce((s2, sec) => s2 + sec.total, 0),
    0
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#0e6493] text-white hover:bg-[#0e6493]/90 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <Building2 size={20} />
          <div>
            <p className="font-bold text-lg">{ciudad.ciudad_nombre}</p>
            {ciudad.departamento_nombre && (
              <p className="text-xs text-white/70">{ciudad.departamento_nombre}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm bg-white/20 rounded-full px-3 py-1">
            {ciudad.zonas.length} zona{ciudad.zonas.length !== 1 ? 's' : ''}
          </span>
          <span className="text-sm bg-white/20 rounded-full px-3 py-1 flex items-center gap-1">
            <Users size={14} />{totalClientes}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {ciudad.zonas.map(zona => (
            <ZonaSection key={zona.tipo_zona} zona={zona} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────
const ClientesPorSector = () => {
  const [data, setData] = useState([]);
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroCiudad) params.append('ciudad_id', filtroCiudad);
      if (filtroZona)   params.append('tipo_zona', filtroZona);
      if (filtroEstado) params.append('estado', filtroEstado);

      const res = await fetch(`${API_URL}/clientes/por-sector?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Error al cargar datos');

      setData(json.data || []);
      setCiudadesDisponibles(json.ciudades_disponibles || []);
      setTotalClientes(json.total_clientes || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtroCiudad, filtroZona, filtroEstado]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Filtro de búsqueda local por nombre/identificación
  const dataFiltrada = busqueda.trim().length >= 2
    ? data.map(ciudad => ({
        ...ciudad,
        zonas: ciudad.zonas.map(zona => ({
          ...zona,
          sectores: zona.sectores.map(sector => ({
            ...sector,
            clientes: sector.clientes.filter(c =>
              c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
              c.identificacion.includes(busqueda)
            )
          })).filter(s => s.clientes.length > 0)
        })).filter(z => z.sectores.length > 0)
      })).filter(ci => ci.zonas.length > 0)
    : data;

  const limpiarFiltros = () => {
    setFiltroCiudad('');
    setFiltroZona('');
    setFiltroEstado('');
    setBusqueda('');
  };

  const hayFiltros = filtroCiudad || filtroZona || filtroEstado || busqueda;

  return (
    <div className="space-y-4">
      {/* Encabezado y stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0e6493]/10 rounded-lg flex items-center justify-center">
            <MapPin className="text-[#0e6493]" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Clientes por Sector</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Cargando...' : `${totalClientes} clientes en ${data.length} ciudad${data.length !== 1 ? 'es' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showFilters ? 'bg-[#0e6493] text-white border-[#0e6493]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filtros
            {hayFiltros && <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</span>}
          </button>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>

            {/* Ciudad */}
            <select
              value={filtroCiudad}
              onChange={e => setFiltroCiudad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Todas las ciudades</option>
              {ciudadesDisponibles.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            {/* Tipo de zona */}
            <select
              value={filtroZona}
              onChange={e => setFiltroZona(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Urbano y Rural</option>
              <option value="urbano">Urbano</option>
              <option value="rural">Rural</option>
            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="cortado">Cortado</option>
              <option value="retirado">Retirado</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-[#0e6493]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={cargarDatos}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : dataFiltrada.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Users size={40} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">No se encontraron clientes</p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="mt-2 text-sm text-[#0e6493] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div>
          {dataFiltrada.map(ciudad => (
            <CiudadSection key={ciudad.ciudad_id || 'sin-ciudad'} ciudad={ciudad} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientesPorSector;
