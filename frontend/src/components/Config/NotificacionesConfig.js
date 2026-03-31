// frontend/src/components/Config/NotificacionesConfig.js
// Panel de configuración: LabsMobile SMS + Web Push Notifications

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Bell, CheckCircle, XCircle, AlertCircle,
  Loader2, Send, RefreshCw, Eye, EyeOff, Key, Smartphone,
  Zap, Settings, TestTube
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '/api/v1';
const getToken = () => localStorage.getItem('accessToken');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const apiFetch = async (path, opts = {}) => {
  const r = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  });
  return r.json();
};

// ─── Sección SMS ──────────────────────────────────────────────────────────────
const SeccionSMS = () => {
  const [estado, setEstado] = useState(null);
  const [config, setConfig] = useState({ labsmobile_user: '', labsmobile_token: '', labsmobile_sender: '' });
  const [guardando, setGuardando] = useState(false);
  const [testTel, setTestTel] = useState('');
  const [testMsg, setTestMsg] = useState('Mensaje de prueba desde PSI ERP');
  const [enviando, setEnviando] = useState(false);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);

  const mostrarFeedback = (tipo, texto) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 5000);
  };

  const cargarEstado = useCallback(async () => {
    const d = await apiFetch('/sms/estado');
    setEstado(d);
  }, []);

  const cargarConfig = useCallback(async () => {
    try {
      const d = await apiFetch('/config/company');
      const cfg = d.data?.config || {};
      setConfig({
        labsmobile_user:   cfg.labsmobile_user   || '',
        labsmobile_token:  cfg.labsmobile_token  || '',
        labsmobile_sender: cfg.labsmobile_sender || ''
      });
    } catch (_) {}
    setCargandoConfig(false);
  }, []);

  useEffect(() => {
    cargarEstado();
    cargarConfig();
  }, [cargarEstado, cargarConfig]);

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      const d = await apiFetch('/config/company', {
        method: 'PUT',
        body: JSON.stringify({
          labsmobile_user:   config.labsmobile_user.trim(),
          labsmobile_token:  config.labsmobile_token.trim(),
          labsmobile_sender: config.labsmobile_sender.trim(),
          sms_activo: !!(config.labsmobile_user.trim() && config.labsmobile_token.trim()) ? 1 : 0
        })
      });
      if (d.success) {
        mostrarFeedback('success', 'Configuración SMS guardada correctamente');
        cargarEstado();
      } else {
        mostrarFeedback('error', d.message || 'Error al guardar');
      }
    } catch (e) {
      mostrarFeedback('error', e.message);
    }
    setGuardando(false);
  };

  const enviarPrueba = async () => {
    if (!testTel || !testMsg) return;
    setEnviando(true);
    try {
      const d = await apiFetch('/sms/enviar', {
        method: 'POST',
        body: JSON.stringify({ telefonos: testTel, mensaje: testMsg })
      });
      if (d.success) {
        mostrarFeedback('success', `SMS enviado exitosamente al ${testTel}`);
      } else {
        mostrarFeedback('error', d.message || 'Error al enviar SMS');
      }
    } catch (e) {
      mostrarFeedback('error', e.message);
    }
    setEnviando(false);
  };

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        estado?.configurado
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        {estado?.configurado
          ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          : <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        }
        <div>
          <p className={`font-medium text-sm ${estado?.configurado ? 'text-green-700' : 'text-amber-700'}`}>
            {estado?.configurado ? 'LabsMobile configurado' : 'LabsMobile no configurado'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{estado?.mensaje}</p>
        </div>
        <button onClick={cargarEstado} className="ml-auto p-1.5 rounded hover:bg-black/5">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
          feedback.tipo === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.tipo === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {feedback.texto}
        </div>
      )}

      {/* Formulario de credenciales */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Key size={16} />
          Credenciales LabsMobile
        </h4>
        <p className="text-xs text-gray-500">
          Obtén tus credenciales en{' '}
          <span className="text-blue-600 font-medium">labsmobile.com → Mi cuenta → API</span>
        </p>

        {cargandoConfig ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <Loader2 size={16} className="animate-spin" /> Cargando configuración...
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario / Email LabsMobile
              </label>
              <input
                type="email"
                value={config.labsmobile_user}
                onChange={e => setConfig(p => ({ ...p, labsmobile_user: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token API
              </label>
              <div className="relative">
                <input
                  type={mostrarToken ? 'text' : 'password'}
                  value={config.labsmobile_token}
                  onChange={e => setConfig(p => ({ ...p, labsmobile_token: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                  placeholder="Token de la API LabsMobile"
                />
                <button
                  type="button"
                  onClick={() => setMostrarToken(p => !p)}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número remitente <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={config.labsmobile_sender}
                onChange={e => setConfig(p => ({ ...p, labsmobile_sender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                placeholder="Ej: 573001234567 (usa el del plan si está vacío)"
              />
            </div>

            <button
              onClick={guardarConfig}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg text-sm hover:bg-[#0a5273] disabled:opacity-50 transition-colors"
            >
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Settings size={15} />}
              {guardando ? 'Guardando...' : 'Guardar credenciales'}
            </button>
          </div>
        )}
      </div>

      {/* Prueba de envío */}
      <div className="border-t border-gray-200 pt-5 space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <TestTube size={16} />
          Enviar SMS de prueba
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Número destino</label>
            <input
              type="tel"
              value={testTel}
              onChange={e => setTestTel(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493]"
              placeholder="3001234567"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mensaje</label>
            <input
              type="text"
              value={testMsg}
              onChange={e => setTestMsg(e.target.value.slice(0, 160))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0e6493]"
              maxLength={160}
            />
          </div>
        </div>
        <button
          onClick={enviarPrueba}
          disabled={enviando || !testTel || !estado?.configurado}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {enviando ? 'Enviando...' : 'Enviar SMS prueba'}
        </button>
        {!estado?.configurado && (
          <p className="text-xs text-amber-600">Guarda las credenciales primero para poder enviar el SMS de prueba.</p>
        )}
      </div>
    </div>
  );
};

// ─── Sección Push Notifications ───────────────────────────────────────────────
const SeccionPush = () => {
  const [estadoServidor, setEstadoServidor] = useState(null);
  const [permiso, setPermiso] = useState(null);
  const [suscrito, setSuscrito] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [suscribiendo, setSuscribiendo] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const mostrarFeedback = (tipo, texto) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 5000);
  };

  const verificarEstado = useCallback(async () => {
    // Estado del servidor
    const d = await apiFetch('/push/estado');
    setEstadoServidor(d);

    // Estado local del navegador
    if ('Notification' in window) {
      setPermiso(Notification.permission);
    }
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSuscrito(!!sub);
      } catch (_) {}
    }
  }, []);

  useEffect(() => { verificarEstado(); }, [verificarEstado]);

  const generarVapid = async () => {
    setGenerando(true);
    try {
      const d = await apiFetch('/push/generar-vapid', { method: 'POST' });
      if (d.success) {
        mostrarFeedback('success', 'Claves VAPID generadas correctamente. Reinicia el servidor backend para aplicarlas.');
        verificarEstado();
      } else {
        mostrarFeedback('error', d.message);
      }
    } catch (e) {
      mostrarFeedback('error', e.message);
    }
    setGenerando(false);
  };

  const suscribirNotificaciones = async () => {
    setSuscribiendo(true);
    try {
      const { suscribirse } = await import('../../services/pushService');
      await suscribirse();
      setSuscrito(true);
      setPermiso('granted');
      mostrarFeedback('success', '¡Notificaciones push activadas en este navegador!');
    } catch (e) {
      mostrarFeedback('error', e.message || 'Error al activar notificaciones');
      if (e.message?.includes('denegado')) setPermiso('denied');
    }
    setSuscribiendo(false);
  };

  const cancelarSuscripcion = async () => {
    setSuscribiendo(true);
    try {
      const { cancelarSuscripcion: cancel } = await import('../../services/pushService');
      await cancel();
      setSuscrito(false);
      mostrarFeedback('success', 'Notificaciones push desactivadas');
    } catch (e) {
      mostrarFeedback('error', e.message);
    }
    setSuscribiendo(false);
  };

  const enviarPrueba = async () => {
    try {
      const d = await apiFetch('/push/test', { method: 'POST' });
      if (d.success) {
        mostrarFeedback('success', 'Notificación de prueba enviada. Revisa tu navegador.');
      } else {
        mostrarFeedback('error', d.message);
      }
    } catch (e) {
      mostrarFeedback('error', e.message);
    }
  };

  const vapidOk = estadoServidor?.data?.vapid_configurado;
  const webpushOk = estadoServidor?.data?.web_push_disponible;

  return (
    <div className="space-y-6">
      {/* Estado del servidor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-3 rounded-lg border text-sm ${webpushOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 font-medium mb-0.5">
            {webpushOk ? <CheckCircle size={14} className="text-green-600" /> : <XCircle size={14} className="text-red-500" />}
            <span className={webpushOk ? 'text-green-700' : 'text-red-700'}>web-push</span>
          </div>
          <p className="text-xs text-gray-500">{webpushOk ? 'Paquete instalado' : 'npm install web-push'}</p>
        </div>

        <div className={`p-3 rounded-lg border text-sm ${vapidOk ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 font-medium mb-0.5">
            {vapidOk ? <CheckCircle size={14} className="text-green-600" /> : <AlertCircle size={14} className="text-amber-600" />}
            <span className={vapidOk ? 'text-green-700' : 'text-amber-700'}>Claves VAPID</span>
          </div>
          <p className="text-xs text-gray-500">{vapidOk ? 'Configuradas' : 'Sin configurar'}</p>
        </div>

        <div className={`p-3 rounded-lg border text-sm ${suscrito ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2 font-medium mb-0.5">
            {suscrito ? <CheckCircle size={14} className="text-green-600" /> : <Smartphone size={14} className="text-gray-500" />}
            <span className={suscrito ? 'text-green-700' : 'text-gray-600'}>Este navegador</span>
          </div>
          <p className="text-xs text-gray-500">{suscrito ? 'Suscrito' : 'No suscrito'}</p>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
          feedback.tipo === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {feedback.tipo === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {feedback.texto}
        </div>
      )}

      {/* Paso 1: Generar VAPID */}
      {!vapidOk && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-amber-800 flex items-center gap-2">
            <Key size={16} /> Paso 1 — Generar claves VAPID
          </h4>
          <p className="text-xs text-amber-700">
            Las claves VAPID se generan una sola vez y se guardan en la base de datos.
            Son necesarias para que el servidor pueda enviar push notifications al navegador.
          </p>
          <button
            onClick={generarVapid}
            disabled={generando || !webpushOk}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {generando ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {generando ? 'Generando...' : 'Generar claves VAPID'}
          </button>
          {!webpushOk && (
            <p className="text-xs text-red-600">
              Primero instala el paquete: <code className="bg-red-100 px-1 rounded">npm install web-push</code> en el servidor backend.
            </p>
          )}
        </div>
      )}

      {/* Paso 2: Suscribir navegador */}
      {vapidOk && (
        <div className="border border-[#0e6493]/20 bg-[#0e6493]/5 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-[#0e6493] flex items-center gap-2">
            <Bell size={16} /> Activar notificaciones en este navegador
          </h4>

          {permiso === 'denied' ? (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle size={16} />
              Permiso bloqueado en el navegador. Ve a configuración del sitio y permite notificaciones.
            </div>
          ) : suscrito ? (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle size={16} />
                Notificaciones activas en este navegador
              </div>
              <button
                onClick={enviarPrueba}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
              >
                <Send size={13} /> Probar
              </button>
              <button
                onClick={cancelarSuscripcion}
                disabled={suscribiendo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-xs hover:bg-red-50"
              >
                {suscribiendo ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Desactivar
              </button>
            </div>
          ) : (
            <button
              onClick={suscribirNotificaciones}
              disabled={suscribiendo}
              className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg text-sm hover:bg-[#0a5273] disabled:opacity-50 transition-colors"
            >
              {suscribiendo ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              {suscribiendo ? 'Activando...' : 'Activar notificaciones push'}
            </button>
          )}

          <p className="text-xs text-gray-500">
            Recibirás notificaciones aunque no tengas el sistema abierto en pantalla.
            Cada usuario debe activar las notificaciones en su navegador.
          </p>
        </div>
      )}

      {/* Info suscripciones */}
      {estadoServidor?.data && (
        <p className="text-xs text-gray-500">
          Total suscripciones activas en el sistema: <strong>{estadoServidor.data.total_suscripciones}</strong>
        </p>
      )}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const NotificacionesConfig = () => {
  const [tab, setTab] = useState('sms');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="text-[#0e6493]" size={20} />
          Notificaciones
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configura SMS (LabsMobile) y notificaciones push del navegador
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('sms')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'sms'
              ? 'border-[#0e6493] text-[#0e6493]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={16} />
          SMS — LabsMobile
        </button>
        <button
          onClick={() => setTab('push')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'push'
              ? 'border-[#0e6493] text-[#0e6493]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell size={16} />
          Push Notifications
        </button>
      </div>

      {/* Contenido */}
      <div className="p-5">
        {tab === 'sms' ? <SeccionSMS /> : <SeccionPush />}
      </div>
    </div>
  );
};

export default NotificacionesConfig;
