// frontend/src/components/Traslados/TrasladosManagement.js
// Gestión de traslados (cambios de dirección) de clientes ISP

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Plus, Search, ChevronDown, ChevronUp, CheckCircle,
  XCircle, Clock, Loader2, AlertCircle, RefreshCw, Filter,
  ArrowRight, User, Phone, Home, Truck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = '/api/v1';

const TrasladosManagement = () => {
  const { user } = useAuth();
  const token = () => localStorage.getItem('accessToken');

  // ── Listado ──────────────────────────────────────────────────────────────
  const [traslados, setTraslados] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSede, setFiltroSede] = useState('');

  // ── Datos auxiliares ─────────────────────────────────────────────────────
  const [ciudades, setCiudades] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  // ── Modales ──────────────────────────────────────────────────────────────
  const [showCrear, setShowCrear] = useState(false);
  const [showCompletar, setShowCompletar] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const LIMIT = 20;
  const esAdmin = ['administrador', 'supervisor', 'secretaria'].includes(user?.rol);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    cargarCiudades();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    cargarTraslados();
  }, [page, filtroEstado, filtroSede]);

  const cargarCiudades = async () => {
    try {
      const r = await fetch(`${API_URL}/config/cities`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      setCiudades(d?.data || d?.ciudades || []);
    } catch { /* silencioso */ }
  };

  const cargarEstadisticas = async () => {
    try {
      const r = await fetch(`${API_URL}/traslados/estadisticas`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (d.success) setEstadisticas(d.data);
    } catch { /* silencioso */ }
  };

  const cargarTraslados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page,
        limit: LIMIT,
        ...(filtroEstado && { estado: filtroEstado }),
        ...(filtroSede && { sede_id: filtroSede }),
        ...(busqueda && { search: busqueda })
      });
      const r = await fetch(`${API_URL}/traslados?${params}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      if (d.success) {
        setTraslados(d.data.traslados || []);
        setTotal(d.data.total || 0);
      } else {
        setError(d.message || 'Error cargando traslados');
      }
    } catch (err) {
      setError('Error de conexión al cargar traslados');
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroSede, busqueda]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPage(1);
    cargarTraslados();
  };

  const colorEstado = (estado) => {
    const m = {
      programada: 'bg-blue-100 text-blue-800',
      reagendada: 'bg-yellow-100 text-yellow-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return m[estado] || 'bg-gray-100 text-gray-800';
  };

  const labelEstado = (estado) => {
    const m = {
      programada: 'Programado',
      reagendada: 'Reagendado',
      completada: 'Completado',
      cancelada: 'Cancelado'
    };
    return m[estado] || estado;
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Traslados de Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestión de cambios de dirección con o sin cargo de instalación
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={() => setShowCrear(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Traslado
          </button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: estadisticas.total || 0, color: 'blue' },
            { label: 'Programados', value: estadisticas.programados || 0, color: 'yellow' },
            { label: 'Completados', value: estadisticas.completados || 0, color: 'green' },
            { label: 'Cancelados', value: estadisticas.cancelados || 0, color: 'red' }
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg shadow-sm border p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente o dirección..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="programada">Programado</option>
            <option value="reagendada">Reagendado</option>
            <option value="completada">Completado</option>
            <option value="cancelada">Cancelado</option>
          </select>
          {user?.rol !== 'instalador' && ciudades.length > 0 && (
            <select
              value={filtroSede}
              onChange={e => { setFiltroSede(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las sedes</option>
              {ciudades.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => { setBusqueda(''); setFiltroEstado(''); setFiltroSede(''); setPage(1); cargarTraslados(); cargarEstadisticas(); }}
            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Cargando traslados...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 p-6 text-red-700 bg-red-50">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {!loading && !error && traslados.length === 0 && (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No hay traslados registrados</p>
            <p className="text-gray-400 text-sm mt-1">
              {busqueda || filtroEstado ? 'Prueba cambiando los filtros' : 'Crea el primer traslado con el botón de arriba'}
            </p>
          </div>
        )}

        {!loading && !error && traslados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Dirección anterior</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nueva dirección</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  {esAdmin && <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traslados.map(t => (
                  <React.Fragment key={t.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono">#{t.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.cliente_nombre || 'N/A'}</div>
                        {t.cliente_telefono && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {t.cliente_telefono}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {t.direccion_anterior || '—'}
                        {t.ciudad_anterior && (
                          <span className="block text-xs text-gray-400">{t.ciudad_anterior}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {t.direccion_nueva || t.direccion_instalacion || '—'}
                        {t.ciudad_nueva && (
                          <span className="block text-xs text-gray-400">{t.ciudad_nueva}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {t.fecha_programada
                          ? new Date(t.fecha_programada + 'T12:00:00').toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(t.estado)}`}>
                          {labelEstado(t.estado)}
                        </span>
                        {parseFloat(t.costo_instalacion) > 0 ? (
                          <span className="ml-2 text-xs text-amber-600 font-medium">Con cargo</span>
                        ) : null}
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {(t.estado === 'programada' || t.estado === 'reagendada') && (
                              <>
                                <button
                                  onClick={() => { setTrasladoSeleccionado(t); setShowCompletar(true); }}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" /> Completar
                                </button>
                                <button
                                  onClick={() => { setTrasladoSeleccionado(t); setShowCancelar(true); }}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" /> Cancelar
                                </button>
                              </>
                            )}
                            {t.estado === 'completada' && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Completado
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {expandedRow === t.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={esAdmin ? 7 : 6} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Dirección anterior</p>
                              <p className="text-gray-600">{t.direccion_anterior || 'No registrada'}</p>
                              <p className="text-gray-500 text-xs">{[t.ciudad_anterior].filter(Boolean).join(' › ')}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <ArrowRight className="w-4 h-4 text-blue-600" /> Nueva dirección
                              </p>
                              <p className="text-gray-600">{t.direccion_nueva || t.direccion_instalacion || 'No registrada'}</p>
                              <p className="text-gray-500 text-xs">{[t.ciudad_nueva, t.sector_nuevo].filter(Boolean).join(' › ')}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Detalles</p>
                              <p className="text-gray-600">
                                {parseFloat(t.costo_instalacion) > 0 ? '✅ Se cobra instalación' : '⛔ Sin cargo de instalación'}
                              </p>
                              <p className="text-gray-600">
                                {t.actualizar_direccion_cliente ? '🔄 Actualiza dirección del cliente' : '📍 No actualiza dirección'}
                              </p>
                              {t.observaciones && (
                                <p className="text-gray-500 mt-1 italic">"{t.observaciones}"</p>
                              )}
                              {t.tecnico_nombre && (
                                <p className="text-gray-600 mt-1">Técnico: {t.tecnico_nombre}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              {total} traslado(s) · Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nuevo traslado */}
      {showCrear && (
        <ModalCrearTraslado
          ciudades={ciudades}
          token={token}
          onClose={() => setShowCrear(false)}
          onSuccess={() => {
            setShowCrear(false);
            setPage(1);
            cargarTraslados();
            cargarEstadisticas();
          }}
        />
      )}

      {/* Modal: Completar traslado */}
      {showCompletar && trasladoSeleccionado && (
        <ModalCompletarTraslado
          traslado={trasladoSeleccionado}
          token={token}
          onClose={() => { setShowCompletar(false); setTrasladoSeleccionado(null); }}
          onSuccess={() => {
            setShowCompletar(false);
            setTrasladoSeleccionado(null);
            cargarTraslados();
            cargarEstadisticas();
          }}
        />
      )}

      {/* Modal: Cancelar traslado */}
      {showCancelar && trasladoSeleccionado && (
        <ModalCancelarTraslado
          traslado={trasladoSeleccionado}
          token={token}
          onClose={() => { setShowCancelar(false); setTrasladoSeleccionado(null); }}
          onSuccess={() => {
            setShowCancelar(false);
            setTrasladoSeleccionado(null);
            cargarTraslados();
            cargarEstadisticas();
          }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Crear Traslado
// ═══════════════════════════════════════════════════════════════════════════
const ModalCrearTraslado = ({ ciudades, token, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [sectores, setSectoresModal] = useState([]);

  const [form, setForm] = useState({
    cliente_id: '',
    direccion_nueva: '',
    ciudad_nueva_id: '',
    sector_nuevo_id: '',
    fecha_programada: new Date().toISOString().split('T')[0],
    cobra_instalacion: false,
    actualizar_direccion: true,
    observaciones: ''
  });

  // Búsqueda de cliente con debounce
  useEffect(() => {
    if (!busquedaCliente || busquedaCliente.trim().length < 2) {
      setClientes([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const r = await fetch(
          `/api/v1/clientes?search=${encodeURIComponent(busquedaCliente.trim())}&limit=10&page=1`,
          { headers: { Authorization: `Bearer ${token()}` } }
        );
        const d = await r.json();
        const lista = d?.data?.clientes || d?.data || [];
        setClientes(Array.isArray(lista) ? lista : []);
      } catch { setClientes([]); }
      finally { setBuscandoCliente(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [busquedaCliente]);

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setForm(prev => ({ ...prev, cliente_id: c.id }));
    setClientes([]);
    setBusquedaCliente('');
  };

  const handleCiudadChange = async (e) => {
    const ciudadId = e.target.value;
    setForm(f => ({ ...f, ciudad_nueva_id: ciudadId, sector_nuevo_id: '' }));
    setSectoresModal([]);
    if (!ciudadId) return;
    try {
      const r = await fetch(`/api/v1/config/sectores-por-ciudad/${ciudadId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const d = await r.json();
      setSectoresModal(d?.data || d?.sectores || []);
    } catch { setSectoresModal([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) { setError('Debe seleccionar un cliente'); return; }
    if (!form.direccion_nueva.trim()) { setError('Ingrese la nueva dirección'); return; }

    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/v1/traslados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) {
        onSuccess();
      } else {
        setError(d.message || 'Error al crear traslado');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Nuevo Traslado</h2>
              <p className="text-sm text-gray-500">Registrar cambio de dirección de cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Búsqueda de cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">{clienteSeleccionado.nombre}</p>
                  <p className="text-sm text-green-700">
                    {clienteSeleccionado.identificacion} · {clienteSeleccionado.telefono || 'Sin teléfono'}
                  </p>
                  {clienteSeleccionado.direccion && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Home className="w-3 h-3" /> Dirección actual: {clienteSeleccionado.direccion}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setClienteSeleccionado(null); setForm(f => ({ ...f, cliente_id: '' })); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={e => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar cliente por nombre o cédula..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {buscandoCliente && (
                  <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                )}
                {clientes.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-900">{c.nombre}</p>
                        <p className="text-xs text-gray-500">{c.identificacion} · {c.telefono}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nueva dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.direccion_nueva}
              onChange={e => setForm(f => ({ ...f, direccion_nueva: e.target.value }))}
              placeholder="Ej: Calle 45 # 12-30 Apto 302"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          {/* Ciudad y sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Ciudad</label>
              <select
                value={form.ciudad_nueva_id}
                onChange={handleCiudadChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Seleccionar ciudad</option>
                {ciudades.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
              <select
                value={form.sector_nuevo_id}
                onChange={e => setForm(f => ({ ...f, sector_nuevo_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={!form.ciudad_nueva_id}
              >
                <option value="">Seleccionar sector</option>
                {sectores.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha programada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada</label>
            <input
              type="date"
              value={form.fecha_programada}
              onChange={e => setForm(f => ({ ...f, fecha_programada: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Opciones ISP */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="font-medium text-amber-800 text-sm">Opciones del traslado</p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.cobra_instalacion}
                onChange={e => setForm(f => ({ ...f, cobra_instalacion: e.target.checked }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Cobrar cargo de instalación</p>
                <p className="text-xs text-gray-500">Si está activo, se agrega el costo de instalación a la próxima factura del cliente.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.actualizar_direccion}
                onChange={e => setForm(f => ({ ...f, actualizar_direccion: e.target.checked }))}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Actualizar dirección del cliente al completar</p>
                <p className="text-xs text-gray-500">Al marcar el traslado como completado, la dirección principal del cliente se actualizará automáticamente.</p>
              </div>
            </label>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              placeholder="Motivo del traslado, instrucciones especiales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Traslado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Completar Traslado
// ═══════════════════════════════════════════════════════════════════════════
const ModalCompletarTraslado = ({ traslado, token, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const handleCompletar = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/v1/traslados/${traslado.id}/completar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ observaciones_finales: observaciones })
      });
      const d = await r.json();
      if (d.success) {
        onSuccess();
      } else {
        setError(d.message || 'Error al completar traslado');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Completar Traslado</h3>
              <p className="text-sm text-gray-500">Traslado #{traslado.id}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-1">
            <p><strong>Cliente:</strong> {traslado.cliente_nombre}</p>
            {traslado.nueva_direccion && (
              <p><strong>Nueva dirección:</strong> {traslado.nueva_direccion}</p>
            )}
            {traslado.actualizar_direccion_cliente ? (
              <p className="text-blue-700">✅ Se actualizará la dirección del cliente</p>
            ) : (
              <p className="text-gray-500">⚠️ No se actualizará la dirección del cliente</p>
            )}
            {traslado.cobrar_instalacion && (
              <p className="text-amber-700">💰 Se cobrará cargo de instalación</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de cierre</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Ej: Instalación completada sin inconvenientes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCompletar}
              disabled={loading}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Marcar como Completado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Cancelar Traslado
// ═══════════════════════════════════════════════════════════════════════════
const ModalCancelarTraslado = ({ traslado, token, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [motivo, setMotivo] = useState('');

  const handleCancelar = async () => {
    if (!motivo.trim()) { setError('Ingrese un motivo de cancelación'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/v1/traslados/${traslado.id}/cancelar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ motivo })
      });
      const d = await r.json();
      if (d.success) {
        onSuccess();
      } else {
        setError(d.message || 'Error al cancelar traslado');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cancelar Traslado</h3>
              <p className="text-sm text-gray-500">Traslado #{traslado.id} · {traslado.cliente_nombre}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de cancelación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Explique por qué se cancela el traslado..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              onClick={handleCancelar}
              disabled={loading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cancelar Traslado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrasladosManagement;
