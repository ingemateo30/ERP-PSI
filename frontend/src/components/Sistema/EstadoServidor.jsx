// frontend/src/components/Sistema/EstadoServidor.jsx
// Monitor de Estado del Servidor — Panel de Administración

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Server, Cpu, HardDrive, MemoryStick, Activity,
  RefreshCw, Database, Clock, Terminal, CheckCircle,
  XCircle, AlertTriangle, Wifi, Zap, BarChart2, Info
} from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const pct = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.min(Math.max(n, 0), 100);
};

const barColor = (percent) => {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const barBg = (percent) => {
  if (percent >= 90) return 'bg-red-100';
  if (percent >= 70) return 'bg-yellow-100';
  return 'bg-emerald-100';
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const UsageBar = ({ label, value, max, unit = '', percent }) => {
  const p = percent !== undefined ? pct(percent) : max > 0 ? pct((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-800 font-semibold">
          {value !== undefined ? `${value}${unit}` : '—'}
          {max !== undefined && max !== null ? ` / ${max}${unit}` : ''}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
            p >= 90 ? 'bg-red-100 text-red-700' :
            p >= 70 ? 'bg-yellow-100 text-yellow-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>{p.toFixed(1)}%</span>
        </span>
      </div>
      <div className={`h-2.5 rounded-full ${barBg(p)}`}>
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${barColor(p)}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
};

const Card = ({ icon, title, children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      <div className="text-[#0e6493]">{icon}</div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

const StatRow = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm font-medium text-gray-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const DBBadge = ({ estado, latencia }) => {
  const ok = estado === 'conectada';
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
      {ok
        ? <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        : <XCircle size={18} className="text-red-600 shrink-0" />}
      <div>
        <p className={`text-sm font-semibold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {ok ? 'Conectada' : 'Error de conexión'}
        </p>
        {ok && latencia !== undefined && (
          <p className="text-xs text-emerald-600">Latencia: {latencia} ms</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const EstadoServidor = () => {
  const { currentUser } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logArchivo, setLogArchivo] = useState(0);
  const logRef = useRef(null);
  const intervalRef = useRef(null);

  const cargarEstado = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const resp = await apiService.get('/sistema/estado');
      if (resp?.success && resp?.data) {
        setDatos(resp.data);
        setUltimaActualizacion(new Date());
      } else {
        setError('Respuesta inesperada del servidor');
      }
    } catch (err) {
      setError(err.message || 'Error al obtener el estado del servidor');
    } finally {
      setCargando(false);
    }
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(cargarEstado, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, cargarEstado]);

  // Auto-scroll al fondo del log cuando cambia el archivo seleccionado
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logArchivo, datos]);

  const archivosLog = datos?.pm2_logs?.archivos ?? [];
  const archivoActual = archivosLog[logArchivo];

  const formatearFecha = (d) =>
    d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">
            {ultimaActualizacion
              ? `Última actualización: ${formatearFecha(ultimaActualizacion)}`
              : 'Obteniendo datos…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-[#0e6493]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-600">Auto (30s)</span>
          </label>
          <button
            onClick={cargarEstado}
            disabled={cargando}
            className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 disabled:opacity-60 transition-colors text-sm font-medium"
          >
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error al obtener datos</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Skeleton / Loading ── */}
      {cargando && !datos && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dashboard ── */}
      {datos && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* Disco */}
            <Card icon={<HardDrive size={20} />} title="Disco">
              {datos.disco?.error ? (
                <p className="text-sm text-red-500">{datos.disco.error}</p>
              ) : (
                <>
                  <UsageBar
                    label="Espacio en disco"
                    percent={parseFloat(datos.disco?.uso_porcentaje)}
                  />
                  <div className="mt-3 space-y-0">
                    <StatRow label="Sistema de archivos" value={datos.disco?.sistema_archivos} mono />
                    <StatRow label="Tamaño total" value={datos.disco?.tamano} />
                    <StatRow label="Usado" value={datos.disco?.usado} />
                    <StatRow label="Disponible" value={datos.disco?.disponible} />
                    <StatRow label="Montado en" value={datos.disco?.montado_en} mono />
                  </div>
                </>
              )}
            </Card>

            {/* RAM */}
            <Card icon={<MemoryStick size={20} />} title="Memoria RAM">
              {datos.ram?.error ? (
                <p className="text-sm text-red-500">{datos.ram.error}</p>
              ) : (
                <>
                  <UsageBar
                    label="RAM usada"
                    value={datos.ram?.usado_gb}
                    max={datos.ram?.total_gb}
                    unit=" GB"
                    percent={parseFloat(datos.ram?.uso_porcentaje)}
                  />
                  <div className="mt-3">
                    <StatRow label="Total" value={`${datos.ram?.total_gb} GB`} />
                    <StatRow label="Usado" value={`${datos.ram?.usado_gb} GB`} />
                    <StatRow label="Libre" value={`${datos.ram?.libre_gb} GB`} />
                  </div>
                </>
              )}
            </Card>

            {/* CPU */}
            <Card icon={<Cpu size={20} />} title="CPU">
              {datos.cpu?.error ? (
                <p className="text-sm text-red-500">{datos.cpu.error}</p>
              ) : (
                <>
                  <UsageBar
                    label="Uso estimado (1 min)"
                    percent={parseFloat(datos.cpu?.uso_porcentaje)}
                  />
                  <div className="mt-3">
                    <StatRow label="Modelo" value={datos.cpu?.modelo} />
                    <StatRow label="Núcleos" value={datos.cpu?.num_nucleos} />
                    <StatRow label="Velocidad" value={`${datos.cpu?.velocidad_mhz} MHz`} />
                    <StatRow label="Carga 1 min" value={datos.cpu?.carga_1min} mono />
                    <StatRow label="Carga 5 min" value={datos.cpu?.carga_5min} mono />
                    <StatRow label="Carga 15 min" value={datos.cpu?.carga_15min} mono />
                  </div>
                </>
              )}
            </Card>

            {/* Uptime */}
            <Card icon={<Clock size={20} />} title="Tiempo de actividad">
              {datos.uptime?.error ? (
                <p className="text-sm text-red-500">{datos.uptime.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-500 uppercase font-semibold mb-1">Proceso Node.js</p>
                    <p className="text-lg font-bold text-blue-700 font-mono">{datos.uptime?.proceso_formato}</p>
                    <p className="text-xs text-blue-400 mt-0.5">{datos.uptime?.proceso_segundos?.toLocaleString()} segundos</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs text-indigo-500 uppercase font-semibold mb-1">Sistema operativo</p>
                    <p className="text-lg font-bold text-indigo-700 font-mono">{datos.uptime?.sistema_formato}</p>
                    <p className="text-xs text-indigo-400 mt-0.5">{datos.uptime?.sistema_segundos?.toLocaleString()} segundos</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Node.js */}
            <Card icon={<Zap size={20} />} title="Node.js">
              {datos.nodejs?.error ? (
                <p className="text-sm text-red-500">{datos.nodejs.error}</p>
              ) : (
                <>
                  {datos.nodejs?.memoria && (
                    <>
                      <UsageBar
                        label="Heap usado"
                        value={datos.nodejs.memoria.heap_usado_mb}
                        max={datos.nodejs.memoria.heap_total_mb}
                        unit=" MB"
                        percent={parseFloat(datos.nodejs.memoria.heap_porcentaje)}
                      />
                      <div className="mt-2">
                        <StatRow label="Versión" value={datos.nodejs?.version} mono />
                        <StatRow label="Plataforma" value={`${datos.nodejs?.plataforma} (${datos.nodejs?.arquitectura})`} />
                        <StatRow label="PID" value={datos.nodejs?.pid} mono />
                        <StatRow label="RSS" value={`${datos.nodejs.memoria.rss_mb} MB`} />
                        <StatRow label="Heap total" value={`${datos.nodejs.memoria.heap_total_mb} MB`} />
                        <StatRow label="Heap usado" value={`${datos.nodejs.memoria.heap_usado_mb} MB`} />
                        <StatRow label="Externo" value={`${datos.nodejs.memoria.externo_mb} MB`} />
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>

            {/* Base de datos + Conexiones */}
            <Card icon={<Database size={20} />} title="Base de datos">
              {datos.base_datos?.error && datos.base_datos?.estado !== 'conectada' ? (
                <div className="space-y-3">
                  <DBBadge estado="error" />
                  <p className="text-xs text-red-500 font-mono break-all">{datos.base_datos.error}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <DBBadge estado={datos.base_datos?.estado} latencia={datos.base_datos?.latencia_ms} />
                  <div>
                    <StatRow label="Host" value={datos.base_datos?.host} mono />
                    <StatRow label="Base de datos" value={datos.base_datos?.nombre} mono />
                  </div>
                  {datos.conexiones && !datos.conexiones.error && (
                    <div className="bg-gray-50 rounded-lg p-3 mt-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1">
                        <Wifi size={12} /> Conexiones activas
                      </p>
                      <StatRow label="Sockets Node.js" value={datos.conexiones?.conexiones_node} />
                      <StatRow label="TCP establecidas" value={datos.conexiones?.conexiones_establecidas} />
                    </div>
                  )}
                </div>
              )}
            </Card>

          </div>

          {/* ── PM2 Logs ── */}
          <Card icon={<Terminal size={20} />} title="Logs PM2">
            {!datos.pm2_logs?.encontrado ? (
              <div className="flex items-center gap-3 text-gray-400 bg-gray-50 rounded-lg p-4">
                <Info size={18} />
                <div>
                  <p className="font-medium text-gray-600">No se encontraron logs de PM2</p>
                  <p className="text-sm">Directorio buscado: {datos.pm2_logs?.directorio ?? 'N/A'}</p>
                  {datos.pm2_logs?.error && <p className="text-xs text-red-400 mt-1">{datos.pm2_logs.error}</p>}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 font-mono">{datos.pm2_logs.directorio}</p>
                  {archivosLog.length > 1 && (
                    <div className="flex gap-1 flex-wrap">
                      {archivosLog.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setLogArchivo(i)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition-colors font-mono ${
                            logArchivo === i
                              ? 'bg-[#0e6493] text-white border-[#0e6493]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#0e6493] hover:text-[#0e6493]'
                          }`}
                        >
                          {f.archivo}
                        </button>
                      ))}
                    </div>
                  )}
                  {archivosLog.length === 1 && (
                    <span className="text-xs text-gray-500 font-mono">{archivosLog[0]?.archivo}</span>
                  )}
                </div>

                {archivoActual?.error ? (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-600">{archivoActual.error}</div>
                ) : (
                  <div
                    ref={logRef}
                    className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-y-auto h-72 whitespace-pre-wrap break-all"
                  >
                    {archivoActual?.lineas?.length > 0
                      ? archivoActual.lineas.map((linea, i) => {
                          // Colorear líneas de error en rojo
                          const esError = /error|Error|ERROR|exception|Exception|EXCEPTION|fatal|FATAL/.test(linea);
                          const esWarn  = /warn|Warn|WARN/.test(linea);
                          return (
                            <div
                              key={i}
                              className={esError ? 'text-red-400' : esWarn ? 'text-yellow-400' : ''}
                            >
                              {linea}
                            </div>
                          );
                        })
                      : <span className="text-gray-500">(log vacío)</span>
                    }
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Timestamp ── */}
          <p className="text-xs text-gray-400 text-right font-mono">
            Datos del servidor: {datos.timestamp ? new Date(datos.timestamp).toLocaleString('es-CO') : '—'}
          </p>
        </>
      )}
    </div>
  );
};

export default EstadoServidor;
