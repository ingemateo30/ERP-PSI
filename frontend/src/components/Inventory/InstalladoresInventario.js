// frontend/src/components/Inventory/InstalladoresInventario.js
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Package, RefreshCw, Search, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import apiService from '../../services/apiService';

const ESTADO_COLORS = {
  disponible: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Disponible'  },
  asignado:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Asignado'    },
  instalado:  { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Instalado'   },
  dañado:     { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Dañado'      },
};

const TIPO_ICONS = {
  router: '📡', decodificador: '📺', cable: '🔌',
  antena: '📶', splitter: '🔀', amplificador: '🔊', otro: '📦',
};

const InstalladoresInventario = () => {
  const [instaladores,   setInstaladores]   = useState([]);
  const [equiposPor,     setEquiposPor]     = useState({}); // instaladorId → equipos[]
  const [loading,        setLoading]        = useState(true);
  const [loadingEquipos, setLoadingEquipos] = useState({});
  const [error,          setError]          = useState('');
  const [busqueda,       setBusqueda]       = useState('');
  const [expandido,      setExpandido]      = useState(null);

  const cargarInstaladores = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.get('/inventory/installers');
      if (res.success) {
        setInstaladores(res.message || []);
      }
    } catch (e) {
      setError('Error al cargar instaladores: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarInstaladores(); }, [cargarInstaladores]);

  const cargarEquiposInstalador = async (instaladorId) => {
    if (equiposPor[instaladorId]) {
      // toggle
      setExpandido(expandido === instaladorId ? null : instaladorId);
      return;
    }
    setLoadingEquipos(prev => ({ ...prev, [instaladorId]: true }));
    try {
      const res = await apiService.get(`/inventory/installer/${instaladorId}/equipment`);
      if (res.success || Array.isArray(res.message)) {
        setEquiposPor(prev => ({ ...prev, [instaladorId]: res.message || res.data || [] }));
      }
    } catch (e) {
      console.error('Error cargando equipos:', e);
    } finally {
      setLoadingEquipos(prev => ({ ...prev, [instaladorId]: false }));
      setExpandido(instaladorId);
    }
  };

  const filtrados = instaladores.filter(ins => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (ins.nombre || '').toLowerCase().includes(q) ||
           (ins.email || '').toLowerCase().includes(q) ||
           (ins.ciudad_nombre || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Instaladores
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{instaladores.length} instaladores activos</p>
        </div>
        <button
          onClick={cargarInstaladores}
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
          placeholder="Buscar instalador por nombre, email o ciudad..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Lista de instaladores */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p>Sin instaladores registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(ins => {
            const isExpanded = expandido === ins.id;
            const equipos = equiposPor[ins.id] || [];
            const cargandoEq = loadingEquipos[ins.id];

            return (
              <div key={ins.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Cabecera del instalador */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                      {(ins.nombre || '').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{ins.nombre}</p>
                      <p className="text-xs text-gray-500">{ins.email} {ins.ciudad_nombre ? `· ${ins.ciudad_nombre}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Resumen de equipos */}
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                      {['asignado', 'instalado'].map(estado => {
                        const count = Number(ins[`equipos_${estado}s`] || ins[`total_${estado}`] || 0);
                        if (count === 0) return null;
                        const c = ESTADO_COLORS[estado] || {};
                        return (
                          <span key={estado} className={`px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
                            {count} {c.label}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => cargarEquiposInstalador(ins.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {cargandoEq ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      {isExpanded ? 'Ocultar' : 'Ver equipos'}
                    </button>
                  </div>
                </div>

                {/* Equipos del instalador */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    {equipos.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-4">
                        Sin equipos asignados actualmente
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {equipos.map(eq => {
                          const ec = ESTADO_COLORS[eq.estado] || {};
                          return (
                            <div key={eq.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-sm font-medium text-gray-800 leading-tight">
                                  {TIPO_ICONS[eq.tipo] || '📦'} {eq.nombre}
                                </span>
                                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${ec.bg} ${ec.text}`}>
                                  {ec.label || eq.estado}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{eq.codigo}</p>
                              {eq.ubicacion_cliente && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{eq.ubicacion_cliente}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InstalladoresInventario;
