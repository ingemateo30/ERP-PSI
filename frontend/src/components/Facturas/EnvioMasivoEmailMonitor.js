// frontend/src/components/Facturas/EnvioMasivoEmailMonitor.js
// Monitor de envío masivo de facturas por email

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, CheckCircle, XCircle, AlertTriangle, Clock,
  RefreshCw, Play, ChevronDown, ChevronUp, Loader2, Users,
  Eye, RotateCcw
} from 'lucide-react';
import { facturasService } from '../../services/facturasService';

const ESTADOS_COLOR = {
  pendiente:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
  en_proceso:  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'En proceso' },
  completado:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completado' },
  error:       { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Error' },
};

const Badge = ({ estado }) => {
  const cfg = ESTADOS_COLOR[estado] || ESTADOS_COLOR.pendiente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const BarraProgreso = ({ total, enviados, fallidos, sinEmail }) => {
  if (!total) return null;
  const pctEnviados = Math.round((enviados / total) * 100);
  const pctFallidos = Math.round((fallidos / total) * 100);
  return (
    <div className="w-full">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
        <div className="bg-green-500 transition-all" style={{ width: `${pctEnviados}%` }} title={`Enviados: ${enviados}`} />
        <div className="bg-red-400 transition-all" style={{ width: `${pctFallidos}%` }} title={`Fallidos: ${fallidos}`} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span className="text-green-600">{enviados} enviados</span>
        {fallidos > 0 && <span className="text-red-500">{fallidos} fallidos</span>}
        {sinEmail > 0 && <span className="text-gray-400">{sinEmail} sin email</span>}
        <span>{pctEnviados}%</span>
      </div>
    </div>
  );
};

const EnvioMasivoEmailMonitor = () => {
  const [lotes, setLotes]               = useState([]);
  const [loteActivo, setLoteActivo]     = useState(null);
  const [estadoActivo, setEstadoActivo] = useState(null);
  const [erroresActivo, setErroresActivo] = useState([]);
  const [showErrores, setShowErrores]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [iniciando, setIniciando]       = useState(false);
  const [periodo, setPeriodo]           = useState('');
  const [mensaje, setMensaje]           = useState(null);
  const pollingRef = useRef(null);

  // Período por defecto = mes siguiente
  useEffect(() => {
    const hoy = new Date();
    const mesSig = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    setPeriodo(`${mesSig.getFullYear()}-${String(mesSig.getMonth() + 1).padStart(2, '0')}`);
    cargarLotes();
  }, []);

  const cargarLotes = useCallback(async () => {
    try {
      const res = await facturasService.listarLotesEnvioMasivo();
      if (res.success) setLotes(res.data || []);
    } catch (e) {
      console.error('Error cargando lotes:', e);
    }
  }, []);

  const cargarEstadoLote = useCallback(async (loteId) => {
    try {
      const res = await facturasService.obtenerEstadoLoteEnvio(loteId);
      if (res.success) setEstadoActivo(res.data);
    } catch (e) {
      console.error('Error cargando estado:', e);
    }
  }, []);

  // Polling automático cuando hay un lote en proceso
  useEffect(() => {
    if (loteActivo && estadoActivo?.estado === 'en_proceso') {
      pollingRef.current = setInterval(() => {
        cargarEstadoLote(loteActivo);
        cargarLotes();
      }, 3000);
    } else {
      clearInterval(pollingRef.current);
      if (loteActivo && estadoActivo?.estado === 'completado') {
        cargarLotes(); // Refrescar lista cuando completa
      }
    }
    return () => clearInterval(pollingRef.current);
  }, [loteActivo, estadoActivo?.estado, cargarEstadoLote, cargarLotes]);

  const handleSeleccionarLote = async (loteId) => {
    setLoteActivo(loteId);
    setShowErrores(false);
    setErroresActivo([]);
    await cargarEstadoLote(loteId);
  };

  const handleIniciarEnvio = async () => {
    if (!periodo) { setMensaje({ tipo: 'error', texto: 'Seleccione un período' }); return; }
    setIniciando(true);
    setMensaje(null);
    try {
      const res = await facturasService.iniciarEnvioMasivo(periodo);
      if (res.success) {
        setMensaje({ tipo: 'success', texto: res.message });
        setLoteActivo(res.data.lote_id);
        await cargarEstadoLote(res.data.lote_id);
        await cargarLotes();
      } else {
        setMensaje({ tipo: 'error', texto: res.message });
      }
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message || 'Error al iniciar envío' });
    } finally {
      setIniciando(false);
    }
  };

  const handleReintentar = async (loteId) => {
    try {
      const res = await facturasService.reintentarFallidosEnvio(loteId);
      if (res.success) {
        setMensaje({ tipo: 'success', texto: res.message });
        await cargarEstadoLote(loteId);
      }
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  const handleVerErrores = async (loteId) => {
    setShowErrores(!showErrores);
    if (!showErrores) {
      try {
        const res = await facturasService.obtenerErroresLoteEnvio(loteId);
        if (res.success) setErroresActivo(res.data || []);
      } catch (e) { console.error(e); }
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  };

  const formatearDuracion = (seg) => {
    if (!seg) return '-';
    if (seg < 60) return `${seg}s`;
    return `${Math.floor(seg / 60)}m ${seg % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Envío Masivo de Facturas</h2>
          <p className="text-sm text-gray-500">Enviar facturas generadas a todos los clientes por email</p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {mensaje.tipo === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="text-sm">{mensaje.texto}</span>
          <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setMensaje(null)}>✕</button>
        </div>
      )}

      {/* Panel iniciar envío */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-600" />
          Iniciar nuevo envío masivo
        </h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período de facturación <span className="text-gray-400">(mes al que pertenecen las facturas)</span>
            </label>
            <input
              type="month"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleIniciarEnvio}
            disabled={iniciando || !periodo}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {iniciando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {iniciando ? 'Iniciando...' : 'Iniciar envío'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Solo envía facturas pendientes o vencidas del período seleccionado que tengan email registrado.
        </p>
      </div>

      {/* Estado del lote activo */}
      {loteActivo && estadoActivo && (
        <div className={`bg-white border-2 rounded-lg p-5 ${estadoActivo.estado === 'en_proceso' ? 'border-blue-300' : estadoActivo.estado === 'completado' ? 'border-green-300' : 'border-gray-200'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-800">Lote #{estadoActivo.id}</span>
                <Badge estado={estadoActivo.estado} />
                {estadoActivo.estado === 'en_proceso' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Período: <strong>{estadoActivo.periodo}</strong> ·
                Inicio: {formatearFecha(estadoActivo.fecha_inicio)} ·
                Duración: {formatearDuracion(estadoActivo.duracion_segundos)}
              </p>
            </div>
            <div className="flex gap-2">
              {estadoActivo.estado === 'en_proceso' && (
                <button onClick={() => cargarEstadoLote(loteActivo)} className="p-2 text-gray-400 hover:text-blue-600 rounded">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {estadoActivo.fallidos > 0 && estadoActivo.estado === 'completado' && (
                <button
                  onClick={() => handleReintentar(loteActivo)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reintentar fallidos
                </button>
              )}
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: estadoActivo.total_facturas, color: 'text-gray-800', icon: <Users className="w-4 h-4" /> },
              { label: 'Enviados', value: estadoActivo.enviados, color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> },
              { label: 'Fallidos', value: estadoActivo.fallidos, color: 'text-red-500', icon: <XCircle className="w-4 h-4" /> },
              { label: 'Sin email', value: estadoActivo.sin_email, color: 'text-gray-400', icon: <AlertTriangle className="w-4 h-4" /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="text-center bg-gray-50 rounded-lg p-3">
                <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
                <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          <BarraProgreso
            total={estadoActivo.total_facturas}
            enviados={estadoActivo.enviados}
            fallidos={estadoActivo.fallidos}
            sinEmail={estadoActivo.sin_email}
          />

          {/* Detalle errores */}
          {estadoActivo.fallidos > 0 && (
            <div className="mt-4">
              <button
                onClick={() => handleVerErrores(loteActivo)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
              >
                {showErrores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <Eye className="w-4 h-4" />
                {showErrores ? 'Ocultar errores' : `Ver ${estadoActivo.fallidos} errores`}
              </button>
              {showErrores && erroresActivo.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-red-700">Cliente</th>
                        <th className="text-left px-3 py-2 text-red-700">Factura</th>
                        <th className="text-left px-3 py-2 text-red-700">Email</th>
                        <th className="text-left px-3 py-2 text-red-700">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {erroresActivo.map(e => (
                        <tr key={e.id} className="border-t border-red-100 hover:bg-red-50">
                          <td className="px-3 py-1.5">{e.cliente_nombre}</td>
                          <td className="px-3 py-1.5">{e.numero_factura}</td>
                          <td className="px-3 py-1.5 text-gray-400">{e.email_destino || 'Sin email'}</td>
                          <td className="px-3 py-1.5 text-red-600">{e.mensaje_error || e.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Historial de lotes */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Historial de envíos
          </h3>
          <button onClick={cargarLotes} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {lotes.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay envíos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lotes.map(lote => (
              <div
                key={lote.id}
                onClick={() => handleSeleccionarLote(lote.id)}
                className={`flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${loteActivo === lote.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">Lote #{lote.id}</span>
                    <Badge estado={lote.estado} />
                    {lote.iniciado_automaticamente ? (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Auto</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lote.periodo} · {formatearFecha(lote.created_at)}
                    {lote.usuario_nombre && ` · Por: ${lote.usuario_nombre}`}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-green-600 font-medium">{lote.enviados}/{lote.total_facturas} enviados</div>
                  {lote.fallidos > 0 && <div className="text-red-400">{lote.fallidos} fallidos</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvioMasivoEmailMonitor;
