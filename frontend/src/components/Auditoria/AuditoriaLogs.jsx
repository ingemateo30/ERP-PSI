// frontend/src/components/Auditoria/AuditoriaLogs.jsx
// Visor de logs de auditoría — solo administradores

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Clock, User, Database, Activity, ChevronDown, ChevronUp, X
} from 'lucide-react';
import authService from '../../services/authService';

const API = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';

const COLORES_ACCION = {
  LOGIN_OK:              'bg-green-100 text-green-800',
  LOGIN_FALLIDO:         'bg-red-100 text-red-800',
  PAGO_REGISTRADO:       'bg-blue-100 text-blue-800',
  INSTALACION_INICIADA:  'bg-yellow-100 text-yellow-800',
  INSTALACION_COMPLETADA:'bg-green-100 text-green-800',
  INSTALACION_CANCELADA: 'bg-red-100 text-red-800',
  ANULAR_FACTURA:        'bg-red-100 text-red-800',
  PAGO_FACTURA:          'bg-blue-100 text-blue-800',
};

function colorAccion(accion) {
  return COLORES_ACCION[accion] || 'bg-gray-100 text-gray-700';
}

function DiffViewer({ antes, despues }) {
  if (!antes && !despues) return null;
  const keys = [...new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])];
  return (
    <div className="mt-2 text-xs font-mono">
      {keys.map(k => {
        const a = antes?.[k];
        const d = despues?.[k];
        const changed = JSON.stringify(a) !== JSON.stringify(d);
        return (
          <div key={k} className={`flex gap-2 py-0.5 px-1 rounded ${changed ? 'bg-yellow-50' : ''}`}>
            <span className="text-gray-500 min-w-[120px] shrink-0">{k}:</span>
            {antes && <span className="text-red-600 line-through opacity-70 truncate max-w-[180px]">{a == null ? '—' : String(a)}</span>}
            {changed && despues && <span className="text-green-700 truncate max-w-[180px]">{d == null ? '—' : String(d)}</span>}
            {!changed && <span className="text-gray-700 truncate max-w-[220px]">{a == null ? '—' : String(a)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.datos_anteriores || log.datos_nuevos;
  const fecha = new Date(log.created_at).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition-colors">
        <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">{fecha}</td>
        <td className="py-2 px-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorAccion(log.accion)}`}>
            {log.accion}
          </span>
        </td>
        <td className="py-2 px-3 text-sm text-gray-800">{log.usuario_nombre || <span className="text-gray-400 italic">Sistema</span>}</td>
        <td className="py-2 px-3 text-xs text-gray-600">{log.tabla_afectada || '—'}</td>
        <td className="py-2 px-3 text-xs text-gray-500">{log.registro_id || '—'}</td>
        <td className="py-2 px-3 text-xs text-gray-500">{log.ip_address || '—'}</td>
        <td className="py-2 px-3">
          {hasDiff && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[#0e6493] hover:text-[#0e6493]/80 flex items-center gap-1 text-xs"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Ocultar' : 'Ver diff'}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={7} className="py-2 px-3">
            <DiffViewer antes={log.datos_anteriores} despues={log.datos_nuevos} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditoriaLogs() {
  const [logs, setLogs]               = useState([]);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, limit: 50, pages: 1 });
  const [loading, setLoading]         = useState(false);
  const [acciones, setAcciones]       = useState([]);
  const [tablas, setTablas]           = useState([]);
  const [filtrosOpen, setFiltrosOpen] = useState(false);

  const [filtros, setFiltros] = useState({
    accion: '', usuario_id: '', tabla: '',
    fecha_desde: '', fecha_hasta: '', busqueda: ''
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = authService.getToken();
      const params = new URLSearchParams({ page, limit: 50, ...filtros });
      // remove empty params
      [...params.keys()].forEach(k => { if (!params.get(k)) params.delete(k); });
      const res = await fetch(`${API}/auditoria?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Error cargando auditoría:', e);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  useEffect(() => {
    const token = authService.getToken();
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/auditoria/acciones`, { headers }).then(r => r.json()),
      fetch(`${API}/auditoria/tablas`,   { headers }).then(r => r.json()),
    ]).then(([a, t]) => {
      if (a.success) setAcciones(a.data);
      if (t.success) setTablas(t.data);
    }).catch(() => {});
  }, []);

  const setFiltro = (key, val) => setFiltros(f => ({ ...f, [key]: val }));
  const limpiarFiltros = () => setFiltros({ accion: '', usuario_id: '', tabla: '', fecha_desde: '', fecha_hasta: '', busqueda: '' });

  const activeFiltros = Object.values(filtros).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0e6493]/10 flex items-center justify-center">
            <Shield size={20} className="text-[#0e6493]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Logs de Auditoría</h1>
            <p className="text-sm text-gray-500">{pagination.total.toLocaleString()} registros totales</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltrosOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${filtrosOpen || activeFiltros ? 'bg-[#0e6493] text-white border-[#0e6493]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter size={14} />
            Filtros
            {activeFiltros > 0 && (
              <span className="ml-1 bg-white text-[#0e6493] rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                {activeFiltros}
              </span>
            )}
          </button>
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      {filtrosOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Búsqueda general */}
            <div className="lg:col-span-2 relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={filtros.busqueda}
                onChange={e => setFiltro('busqueda', e.target.value)}
                className="pl-8 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#0e6493] outline-none"
              />
            </div>

            {/* Acción */}
            <select
              value={filtros.accion}
              onChange={e => setFiltro('accion', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-[#0e6493] outline-none"
            >
              <option value="">Todas las acciones</option>
              {acciones.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Tabla */}
            <select
              value={filtros.tabla}
              onChange={e => setFiltro('tabla', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-[#0e6493] outline-none"
            >
              <option value="">Todas las tablas</option>
              {tablas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Fecha desde */}
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={e => setFiltro('fecha_desde', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-[#0e6493] outline-none"
            />

            {/* Fecha hasta */}
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={e => setFiltro('fecha_hasta', e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-[#0e6493] outline-none"
            />
          </div>

          {activeFiltros > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={limpiarFiltros}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X size={14} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resumen de acciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Activity size={16} />, label: 'Total registros', value: pagination.total, color: 'blue' },
          { icon: <User size={16} />, label: 'Página actual', value: `${pagination.page} / ${pagination.pages}`, color: 'green' },
          { icon: <Clock size={16} />, label: 'Mostrando', value: logs.length, color: 'yellow' },
          { icon: <Database size={16} />, label: 'Por página', value: pagination.limit, color: 'purple' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-${s.color}-100 flex items-center justify-center text-${s.color}-600`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-sm font-semibold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Fecha / Hora</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Acción</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Usuario</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Tabla</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">IP</th>
                <th className="py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-sm">Cargando registros...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No se encontraron registros</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Página {pagination.page} de {pagination.pages} ({pagination.total.toLocaleString()} registros)
            </p>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const half = Math.floor(Math.min(5, pagination.pages) / 2);
                let start = Math.max(1, pagination.page - half);
                const end = Math.min(pagination.pages, start + 4);
                start = Math.max(1, end - 4);
                return start + i;
              }).map(p => (
                <button
                  key={p}
                  onClick={() => fetchLogs(p)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium ${p === pagination.page ? 'bg-[#0e6493] text-white border-[#0e6493]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
