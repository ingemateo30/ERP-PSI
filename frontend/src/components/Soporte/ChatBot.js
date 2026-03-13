import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Send, X, Bot, User, AlertCircle, CheckCircle,
  FileText, Loader2, Wifi, CreditCard, Settings,
  RotateCcw, ThumbsUp, ThumbsDown, Copy, Check,
} from 'lucide-react';
import * as soporteService from '../../services/soporteService';

// ── Sugerencias rápidas ────────────────────────────────────────────────────
const SUGERENCIAS = [
  { label: '📡 Sin internet',        text: 'No tengo internet, ¿qué hago?' },
  { label: '🐌 Internet lento',      text: '¿Por qué está lento mi internet?' },
  { label: '🔄 Reiniciar router',    text: '¿Cómo reinicio el router correctamente?' },
  { label: '💳 Pagar factura',       text: '¿Dónde y cómo pago mi factura?' },
  { label: '🔑 Cambiar clave WiFi',  text: '¿Cómo cambio la contraseña del WiFi?' },
  { label: '📦 Ver planes',          text: '¿Qué planes de internet tienen disponibles?' },
  { label: '🔴 Luz roja router',     text: '¿Qué significa la luz roja en mi router?' },
  { label: '📶 Mejorar señal WiFi',  text: '¿Cómo puedo mejorar la señal del WiFi en mi casa?' },
  { label: '🎮 Reducir ping',        text: '¿Cómo reduzco el lag y el ping para jugar?' },
  { label: '📞 Contactar soporte',   text: '¿Cuáles son los horarios y canales de atención?' },
];

// ── Formato markdown simple ────────────────────────────────────────────────
const FormatMsg = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let listBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-1 space-y-0.5 pl-1">
        {listBuf.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-black/10 rounded px-1 text-xs font-mono">$1</code>');

    if (/^#{1,3}\s/.test(raw)) {
      flushList();
      elements.push(
        <p key={idx} className="font-bold text-sm mt-2 mb-0.5"
          dangerouslySetInnerHTML={{ __html: line.replace(/^#+\s/, '') }} />
      );
    } else if (/^[•\-\*]\s/.test(raw) || /^\d+\.\s/.test(raw)) {
      listBuf.push(line.replace(/^[•\-\*\d\.]\s+/, ''));
    } else if (raw.trim() === '') {
      flushList();
      if (elements.length && elements[elements.length - 1]?.type !== 'div') {
        elements.push(<div key={`sp-${idx}`} className="h-1" />);
      }
    } else {
      flushList();
      elements.push(
        <p key={idx} className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line }} />
      );
    }
  });
  flushList();
  return <>{elements}</>;
};

// ── Burbuja de mensaje ─────────────────────────────────────────────────────
const Bubble = ({ msg, onResolved, onTicket }) => {
  const [copied, setCopied] = useState(false);
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';

  const copy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-[#0e6493] text-white' : isError ? 'bg-red-500 text-white' : 'bg-gradient-to-br from-[#0e6493] to-blue-700 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser  ? 'bg-[#0e6493] text-white rounded-tr-sm' :
          isError ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm' :
                    'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm'
        }`}>
          {isUser
            ? <p className="text-sm">{msg.content}</p>
            : <FormatMsg text={msg.content} />
          }

          <p className={`text-xs mt-1.5 ${isUser ? 'text-blue-200' : 'text-gray-400'} text-right`}>
            {new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Acciones post-mensaje del bot */}
        {!isUser && !isError && !msg.resolved && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            <button onClick={copy}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <span className="text-gray-200">|</span>
            <button onClick={() => onResolved(msg.id)}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors">
              <ThumbsUp className="w-3 h-3" /> Resolvió mi duda
            </button>
            {msg.needsTicket && (
              <>
                <span className="text-gray-200">|</span>
                <button onClick={onTicket}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 transition-colors">
                  <FileText className="w-3 h-3" /> Crear ticket
                </button>
              </>
            )}
          </div>
        )}
        {msg.resolved && (
          <div className="flex items-center gap-1 text-xs text-green-600 pl-1">
            <CheckCircle className="w-3 h-3" /> Marcado como resuelto
          </div>
        )}
      </div>
    </div>
  );
};

// ── Indicador "escribiendo" ────────────────────────────────────────────────
const Typing = () => (
  <div className="flex gap-2">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0e6493] to-blue-700 flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-white" />
    </div>
    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// ── Modal ticket ───────────────────────────────────────────────────────────
const TicketModal = ({ userInfo, setUserInfo, step, setStep, onSubmit, onClose, ticketError }) => (
  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-20">
    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">
          {step === 'info' ? 'Verificar identidad' : 'Confirmar ticket'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === 'info' ? (
        <form onSubmit={e => { e.preventDefault(); setStep('confirm'); }} className="p-5 space-y-3">
          <p className="text-sm text-gray-500">
            Ingresa tu número de identificación para verificar que eres usuario de PSI:
          </p>
          <div>
            <input
              type="text"
              placeholder="Número de cédula *"
              required
              minLength={5}
              value={userInfo.identificacion}
              onChange={e => setUserInfo(p => ({ ...p, identificacion: e.target.value.trim() }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1 pl-1">Con esto buscamos tu cuenta en el sistema</p>
          </div>
          <input
            type="tel"
            placeholder="Teléfono (opcional, ayuda a encontrarte)"
            value={userInfo.telefono}
            onChange={e => setUserInfo(p => ({ ...p, telefono: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
          />
          {ticketError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              {ticketError}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!userInfo.identificacion}
              className="flex-1 py-2.5 bg-[#0e6493] text-white rounded-xl text-sm font-medium hover:bg-[#0a5278] transition-colors disabled:opacity-40">
              Continuar
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="p-5">
          <p className="text-sm text-gray-500 mb-3">Se creará un ticket con la conversación actual:</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm mb-4">
            <p><span className="text-gray-500">Cédula:</span> <strong>{userInfo.identificacion}</strong></p>
            {userInfo.telefono && <p><span className="text-gray-500">Tel:</span> <strong>{userInfo.telefono}</strong></p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('info')}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Atrás
            </button>
            <button type="submit"
              className="flex-1 py-2.5 bg-[#0e6493] text-white rounded-xl text-sm font-medium hover:bg-[#0a5278] transition-colors">
              Crear ticket
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const ChatBot = forwardRef(({ isOpen, onClose, standalone = false }, ref) => {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sessionId,  setSessionId]  = useState(null);
  const [userInfo,   setUserInfo]   = useState({ identificacion: '', telefono: '' });
  const [ticketStep, setTicketStep] = useState(null); // null | 'info' | 'confirm'
  const [ticketError, setTicketError] = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const scrollBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollBottom(); }, [messages, loading, scrollBottom]);

  // Mensaje de bienvenida
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola! 👋 Soy el asistente virtual de **PSI**.\n\nEstoy aquí para ayudarte con:\n\n• Problemas técnicos de internet o WiFi\n• Consultas de facturación y pagos\n• Información sobre planes y servicios\n• Trámites y solicitudes\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const enviarMensaje = async (texto) => {
    const msg = (texto || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      // Construir payload omitiendo campos vacíos para evitar errores de validación
      const payload = { message: msg, conversationHistory: history };
      if (sessionId)           payload.sessionId  = sessionId;
      if (userInfo.nombre)     payload.nombre     = userInfo.nombre;
      if (userInfo.email)      payload.email      = userInfo.email;
      if (userInfo.telefono)   payload.telefono   = userInfo.telefono;
      const res = await soporteService.sendMessage(payload);

      if (!sessionId) setSessionId(res.data.sessionId);

      setMessages(prev => [...prev, {
        id:          res.data.messageId,
        role:        'assistant',
        content:     res.data.response,
        timestamp:   new Date(),
        needsTicket: res.data.needsTicket,
        tipoConsulta:res.data.tipoConsulta,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id:        Date.now(),
        role:      'error',
        content:   'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const marcarResuelto = async (msgId) => {
    try { await soporteService.markAsResolved({ messageId: msgId, sessionId, satisfaccion: 5 }); } catch {}
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, resolved: true } : m));
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'assistant', timestamp: new Date(),
      content: '¡Me alegra haber podido ayudarte! ✅\n\n¿Tienes alguna otra consulta en la que pueda asistirte?',
    }]);
  };

  const crearTicket = async (e) => {
    e.preventDefault();
    setTicketError('');
    try {
      const res = await soporteService.createTicketFromChat({
        sessionId,
        identificacion: userInfo.identificacion,
        telefono: userInfo.telefono || undefined,
        categoria: 'tecnico',
        prioridad: 'media',
      });
      setTicketStep(null);
      setUserInfo({ identificacion: '', telefono: '' });
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant', timestamp: new Date(),
        content:
          `✅ **Ticket creado correctamente**\n\n` +
          `**Radicado:** ${res.data?.numeroRadicado || 'PSI-' + Date.now()}\n\n` +
          `Un agente de soporte revisará tu caso y se comunicará contigo a la brevedad.\n\n` +
          `¿Necesitas algo más?`,
      }]);
    } catch (err) {
      // err puede ser el objeto lanzado por soporteService (error.response.data)
      const data = err?.response?.data || err;
      if (data?.notClient) {
        // No es cliente: mostrar en el modal (paso 'info') y en el chat
        setTicketStep('info');
        setTicketError(
          data.message ||
          'No encontramos tu número en el sistema. Verifica tu cédula o comunícate directamente con PSI.'
        );
      } else {
        setTicketStep(null);
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'error', timestamp: new Date(),
          content: '❌ Error al crear el ticket. Por favor intenta de nuevo o comunícate con nosotros directamente.',
        }]);
      }
    }
  };

  const limpiarChat = () => {
    setMessages([]);
    setSessionId(null);
    setTimeout(() => setMessages([{
      id: 'welcome2', role: 'assistant', timestamp: new Date(),
      content: '¡Hola de nuevo! ¿En qué puedo ayudarte?',
    }]), 100);
  };

  // Exponer send() para uso externo — siempre apunta a la versión actual de enviarMensaje
  useImperativeHandle(ref, () => ({
    send: (texto) => enviarMensaje(texto),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  if (!isOpen && !standalone) return null;

  return (
    <div className={`${standalone ? 'h-[620px]' : 'fixed bottom-20 right-4 w-96 h-[580px] shadow-2xl'} bg-white flex flex-col overflow-hidden rounded-2xl relative`}>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0e6493] to-[#0a5278] text-white px-4 py-3 flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Asistente PSI</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-blue-100">En línea · Groq / Llama 3.3</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={limpiarChat} title="Nueva conversación"
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
          {!standalone && onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            onResolved={marcarResuelto}
            onTicket={() => setTicketStep('info')}
          />
        ))}
        {loading && <Typing />}
        <div ref={endRef} />
      </div>

      {/* Chips de sugerencias (solo si hay pocos mensajes) */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Preguntas frecuentes:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGERENCIAS.map(s => (
              <button key={s.text} onClick={() => enviarMensaje(s.text)}
                className="text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full hover:border-[#0e6493] hover:text-[#0e6493] transition-colors shadow-sm">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); enviarMensaje(); }}
        className="px-3 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe tu consulta..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 disabled:opacity-50"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="bg-[#0e6493] text-white p-1.5 rounded-lg disabled:opacity-40 hover:bg-[#0a5278] transition-colors flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-1.5">
          Groq · Llama 3.3 · Respuestas orientativas
        </p>
      </form>

      {/* Modal ticket */}
      {ticketStep && (
        <TicketModal
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          step={ticketStep}
          setStep={setTicketStep}
          onSubmit={crearTicket}
          onClose={() => { setTicketStep(null); setTicketError(''); }}
          ticketError={ticketError}
        />
      )}
    </div>
  );
});

ChatBot.displayName = 'ChatBot';
export default ChatBot;
