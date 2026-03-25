// frontend/src/components/Inventory/MovimientosInventario.js
import React, { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, ArrowRightLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import apiService from '../../services/apiService';

const ACCION_COLORS = {
  asignado:    { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Asignado'    },
  devuelto:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Devuelto'    },
  instalado:   { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Instalado'   },
  creado:      { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Creado'      },
  actualizado: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Actualizado' },
  dañado:      { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Dañado'      },
};

const TIPO_ICONS = {
  router: '📡', decodificador: '📺', cable: '🔌',
  antena: '📶', splitter: '🔀', amplificador: '🔊', otro: '📦',
};

const MovimientosInventario = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [busqueda, setBusqueda]       = useState('');
  const [pagina, setPagina]           = useState(1);
  const [total, setTotal]             = useState(0);
  const LIMITE = 50;

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const offset = (pagina - 1) * LIMITE;
      const res = await apiService.get(`/inventory/movimientos?limit=${LIMITE}&offset=${offset}`);
      if (res.success) {
        setMovimientos(res.data.movimientos || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
      setError('Error al cargar movimientos: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = movimientos.filter(m => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (m.equipo_nombre || '').toLowerCase().includes(q) ||
           (m.equipo_codigo || '').toLowerCase().includes(q) ||
           (m.instalador_nombre || '').toLowerCase().includes(q) ||
           (m.usuario_nombre || '').toLowerCase().includes(q) ||
           (m.descripcion || '').toLowerCase().includes(q);
  });

  const totalPaginas = Math.ceil(total / LIMITE);

  const formatFecha = (f) => {
    if (!f) return '—';
    return new Date(f).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            Movimientos Recientes
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} movimientos registrados</p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por equipo, instalador, usuario..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p>Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Instalador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(m => {
                  const ac = ACCION_COLORS[m.accion] || { bg: 'bg-gray-100', text: 'text-gray-700', label: m.accion };
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatFecha(m.fecha_movimiento)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ac.bg} ${ac.text}`}>
                          {ac.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {TIPO_ICONS[m.equipo_tipo] || '📦'} {m.equipo_nombre}
                        </div>
                        <div className="text-xs text-gray-400">{m.equipo_codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{m.instalador_nombre || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-gray-700">{m.usuario_nombre || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.descripcion || <span className="text-gray-400 italic">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagina} de {totalPaginas} · {total} movimientos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosInventario;
