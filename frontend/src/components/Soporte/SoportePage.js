import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, HelpCircle, Zap, Shield, Phone, Mail,
  ChevronDown, ChevronUp, ThumbsUp, Search, Clock,
  Building2, Wifi, CreditCard, Settings, BookOpen,
  AlertCircle, CheckCircle, FileText, Users, Headphones,
} from 'lucide-react';
import ChatBot from './ChatBot';
import * as soporteService from '../../services/soporteService';

// ── FAQs locales robustas (fallback si la BD falla) ──────────────────────────
const FAQ_LOCAL = [
  {
    id: 'l1', categoria: 'tecnica',
    pregunta: '¿Cómo reinicio el router correctamente?',
    respuesta: `Sigue estos pasos:\n\n1. Desconecta el cable de alimentación del router\n2. Espera 30 segundos completos\n3. Vuelve a conectar el cable de alimentación\n4. Espera 2–3 minutos hasta que las luces se estabilicen\n5. Verifica tu conexión desde un dispositivo\n\n⚠️ No presiones el botón de reset (agujero pequeño) — eso borra toda la configuración.`,
  },
  {
    id: 'l2', categoria: 'tecnica',
    pregunta: 'No tengo internet, ¿qué hago primero?',
    respuesta: `Revisa estos puntos en orden:\n\n1. ¿Las luces del router están encendidas?\n2. ¿El cable coaxial o fibra está bien conectado?\n3. Reinicia el router (desconecta 30 seg, vuelve a conectar)\n4. Reinicia también tu dispositivo\n5. Conecta otro dispositivo para confirmar si el problema es general\n\nSi después de todo esto sigue sin internet, contacta soporte técnico para que un técnico lo revise.`,
  },
  {
    id: 'l3', categoria: 'tecnica',
    pregunta: '¿Por qué mi internet está lento?',
    respuesta: `Causas comunes y soluciones:\n\n• Muchos dispositivos conectados → Desconecta los que no usas\n• Router lejos del dispositivo → Acércate o usa cable Ethernet\n• Aplicaciones descargando en segundo plano → Ciérralas\n• Router caliente → Colócalo en lugar ventilado\n• Hora pico (7–10 PM) → La velocidad puede bajar levemente\n\nHaz un test en fast.com. Si obtienes menos del 70% de tu velocidad contratada durante horario normal, contáctanos.`,
  },
  {
    id: 'l4', categoria: 'tecnica',
    pregunta: '¿Cómo cambio la contraseña de mi WiFi?',
    respuesta: `Desde tu navegador:\n\n1. Ingresa a 192.168.1.1 (o 192.168.0.1)\n2. Usuario: admin | Contraseña: admin\n3. Busca la sección "WiFi" o "Wireless"\n4. Cambia el campo "Contraseña" o "Password"\n5. Guarda los cambios\n6. Reconecta todos tus dispositivos con la nueva clave\n\n💡 Usa una contraseña de al menos 8 caracteres con letras y números.`,
  },
  {
    id: 'l5', categoria: 'facturacion',
    pregunta: '¿Dónde puedo pagar mi factura?',
    respuesta: `Puedes pagar en:\n\n🏦 **Bancos:** Bancolombia, Davivienda, Banco de Bogotá (ventanilla o app)\n💳 **En línea:** Desde tu portal de cliente en nuestro sitio web\n🏪 **Efecty y Baloto:** En cualquier punto autorizado\n🏢 **Oficina PSI:** En nuestro punto de atención directa\n\nEl código de pago está en tu factura física o digital.`,
  },
  {
    id: 'l6', categoria: 'facturacion',
    pregunta: '¿Cuándo se genera mi factura mensual?',
    respuesta: `Las facturas se generan según tu fecha de corte, que fue asignada al momento de la instalación.\n\nPuedes consultar tu fecha exacta:\n• En tu contrato de servicio\n• Llamando a nuestra línea de atención\n• En el portal web de clientes\n\nLa factura llega por correo electrónico 5 días antes del vencimiento.`,
  },
  {
    id: 'l7', categoria: 'facturacion',
    pregunta: '¿Qué pasa si me atraso en el pago?',
    respuesta: `El proceso cuando hay mora:\n\n• **Día 1–5 después del vencimiento:** Se envía recordatorio por correo/WhatsApp\n• **Día 6–15:** El servicio puede ser suspendido temporalmente\n• **Más de 30 días:** El servicio se corta y puede haber cobro de reconexión\n\nSi tienes dificultades de pago, contáctanos antes del vencimiento para acordar un plan de pago.`,
  },
  {
    id: 'l8', categoria: 'comercial',
    pregunta: '¿Cómo solicito un cambio de plan?',
    respuesta: `Para cambiar tu plan actual:\n\n1. Llama a nuestra línea de ventas\n2. Escríbenos por WhatsApp corporativo\n3. Visita nuestra oficina con tu cédula\n\nEl cambio se aplica desde el siguiente período de facturación. Si es upgrade (mayor velocidad), puede aplicar de inmediato según disponibilidad técnica en tu zona.`,
  },
  {
    id: 'l9', categoria: 'comercial',
    pregunta: '¿Cómo solicito una nueva instalación?',
    respuesta: `Para solicitar el servicio:\n\n1. Llámanos o escríbenos con tu dirección completa\n2. Verificamos cobertura en tu zona\n3. Agendamos la visita técnica (normalmente en 48–72 horas)\n4. El técnico instala el equipo y configura todo\n5. Firmas el contrato y comienzas a disfrutar el servicio\n\nCosto de instalación: según el plan contratado (algunos planes incluyen instalación gratis).`,
  },
  {
    id: 'l10', categoria: 'general',
    pregunta: '¿Cuáles son los horarios de atención al cliente?',
    respuesta: `Horarios de atención:\n\n📞 **Línea telefónica:** Lunes a Sábado 7:00 AM – 8:00 PM\n💬 **WhatsApp:** Lunes a Sábado 7:00 AM – 8:00 PM\n🏢 **Oficina:** Lunes a Viernes 8:00 AM – 5:00 PM, Sábados 8:00 AM – 12:00 PM\n🤖 **Chatbot:** 24/7 para preguntas frecuentes\n\nEmergencias técnicas fuera de horario: disponible según contrato.`,
  },
  {
    id: 'l11', categoria: 'tecnica',
    pregunta: '¿Qué significan las luces del router?',
    respuesta: `Guía de luces LED:\n\n🟢 **Luz verde fija (Power):** Router encendido y funcionando\n🟢 **Luz verde fija/parpadeante (Internet):** Conexión activa\n🔴 **Luz roja (Internet):** Sin conexión al proveedor — llama a soporte\n🟡 **Luz amarilla (Internet):** Conectando, espera 2 minutos\n🟢 **Luz WiFi parpadeando:** Tráfico de datos (normal)\n\nSi la luz de Internet está roja por más de 5 minutos después de reiniciar, es una falla de red externa — contáctanos.`,
  },
  {
    id: 'l12', categoria: 'general',
    pregunta: '¿Cómo reporto una falla masiva en mi sector?',
    respuesta: `Si sospechas que hay una falla en tu sector:\n\n1. Confirma con un vecino si también tiene el problema\n2. Llama a nuestra línea de soporte indicando tu dirección\n3. También puedes escribir al WhatsApp corporativo\n4. Nuestro equipo verifica la red y envía técnicos si es falla externa\n\nLas fallas masivas generalmente se resuelven en 2–6 horas según complejidad.`,
  },
];

const CATEGORIAS = [
  { value: 'todas',       label: 'Todas',       Icon: HelpCircle,  color: 'blue'   },
  { value: 'tecnica',     label: 'Técnica',     Icon: Wifi,        color: 'purple' },
  { value: 'facturacion', label: 'Facturación', Icon: CreditCard,  color: 'green'  },
  { value: 'comercial',   label: 'Comercial',   Icon: Building2,   color: 'orange' },
  { value: 'general',     label: 'General',     Icon: BookOpen,    color: 'gray'   },
];

const COLOR_CAT = {
  blue:   { pill: 'bg-blue-100 text-blue-700 border-blue-200',   active: 'bg-blue-600 text-white border-blue-600' },
  purple: { pill: 'bg-purple-100 text-purple-700 border-purple-200', active: 'bg-purple-600 text-white border-purple-600' },
  green:  { pill: 'bg-green-100 text-green-700 border-green-200',  active: 'bg-green-600 text-white border-green-600' },
  orange: { pill: 'bg-orange-100 text-orange-700 border-orange-200',active: 'bg-orange-600 text-white border-orange-600' },
  gray:   { pill: 'bg-gray-100 text-gray-700 border-gray-200',    active: 'bg-gray-700 text-white border-gray-700' },
};

// ── Componente FAQ ────────────────────────────────────────────────────────────
const FaqItem = ({ faq, expanded, onToggle, onUseful }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-md">
    <button
      onClick={() => onToggle(faq.id)}
      className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
    >
      <span className="font-medium text-gray-900 text-sm">{faq.pregunta}</span>
      {expanded ? (
        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </button>
    {expanded && (
      <div className="px-5 pb-4 border-t border-gray-100 bg-gray-50">
        <p className="pt-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {faq.respuesta}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {faq.vistas > 0 && <span>{faq.vistas} vistas</span>}
            {faq.util_count > 0 && <span>· {faq.util_count} útiles</span>}
          </div>
          {onUseful && (
            <button
              onClick={() => onUseful(faq.id)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ThumbsUp className="w-3 h-3" /> Fue útil
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const SoportePage = () => {
  const [faqs,            setFaqs]            = useState(FAQ_LOCAL);
  const [categoria,       setCategoria]       = useState('todas');
  const [expandedFaq,     setExpandedFaq]     = useState(null);
  const [busqueda,        setBusqueda]        = useState('');
  const [faqsUtiles,      setFaqsUtiles]      = useState(new Set());
  const searchRef = useRef(null);
  const chatRef   = useRef(null);

  const preguntarAlChat = useCallback((texto) => {
    chatRef.current?.send(texto);
    // Scroll suave hacia el chat en móvil
    document.getElementById('chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Cargar FAQs desde backend (complementa las locales)
  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await soporteService.getFAQs({ categoria, limit: 30 });
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setFaqs(res.data);
        }
      } catch {
        // Usar FAQ_LOCAL como fallback — ya está en estado inicial
      }
    };
    cargar();
  }, [categoria]);

  const faqsFiltradas = faqs.filter(f => {
    const matchCat = categoria === 'todas' || f.categoria === categoria;
    const q = busqueda.toLowerCase();
    const matchBusq = !q || f.pregunta.toLowerCase().includes(q) || f.respuesta.toLowerCase().includes(q);
    return matchCat && matchBusq;
  });

  const toggleFaq = (id) => {
    setExpandedFaq(prev => prev === id ? null : id);
    try { soporteService.incrementFAQView(id); } catch {}
  };

  const marcarUtil = async (id) => {
    if (faqsUtiles.has(id)) return;
    try { await soporteService.markFAQAsUseful(id); } catch {}
    setFaqsUtiles(prev => new Set([...prev, id]));
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-[#0e6493] via-[#0a5278] to-[#074062] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Headphones className="w-6 h-6" />
                </div>
                <span className="text-blue-200 text-sm font-medium tracking-wide uppercase">Centro de Soporte PSI</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">¿En qué podemos ayudarte?</h1>
              <p className="text-blue-100 max-w-xl">
                Resuelve problemas técnicos, consultas de facturación o información de servicios.
                Nuestro asistente IA está disponible 24/7.
              </p>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Respuesta', value: '< 2 min', Icon: Clock },
                { label: 'Disponibilidad', value: '24 / 7', Icon: CheckCircle },
                { label: 'Satisfacción', value: '97 %', Icon: ThumbsUp },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1 text-blue-200" />
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CANALES RÁPIDOS ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              Icon: Phone,
              label: 'Teléfono',
              value: 'Línea de atención',
              sub: 'Lun–Sáb 7:00 AM – 8:00 PM',
              iconBg: 'bg-blue-600',
            },
            {
              Icon: MessageCircle,
              label: 'WhatsApp',
              value: 'Chat corporativo',
              sub: 'Respuesta inmediata',
              iconBg: 'bg-green-600',
            },
            {
              Icon: Mail,
              label: 'Correo',
              value: 'soporte@psi.com.co',
              sub: 'Respuesta en 4–8 horas',
              iconBg: 'bg-purple-600',
            },
          ].map(({ Icon, label, value, sub, iconBg }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`${iconBg} text-white p-3 rounded-xl flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-gray-900 text-sm">{value}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL: FAQ (izq) + CHAT (der) ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── PANEL IZQUIERDO: FAQ ── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0e6493]" />
                Preguntas Frecuentes
              </h2>
              <span className="text-xs text-gray-400">{faqsFiltradas.length} artículos</span>
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar en preguntas frecuentes..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0e6493] focus:border-transparent bg-white shadow-sm"
              />
            </div>

            {/* Categorías */}
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORIAS.map(({ value, label, Icon, color }) => {
                const cls = COLOR_CAT[color];
                const active = categoria === value;
                return (
                  <button
                    key={value}
                    onClick={() => setCategoria(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? cls.active : cls.pill}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Lista FAQs */}
            <div className="space-y-2">
              {faqsFiltradas.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-medium">Sin resultados</p>
                  <p className="text-sm">Intenta con otras palabras o pregúntale al asistente</p>
                </div>
              ) : (
                faqsFiltradas.map(faq => (
                  <FaqItem
                    key={faq.id}
                    faq={faq}
                    expanded={expandedFaq === faq.id}
                    onToggle={toggleFaq}
                    onUseful={faqsUtiles.has(faq.id) ? null : marcarUtil}
                  />
                ))
              )}
            </div>

            {/* Temas de ayuda adicionales */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { Icon: Zap,       title: 'Soporte Técnico', color: 'bg-purple-100 text-purple-700',
                  items: [
                    { label: 'Reinicio de router',      q: '¿Cómo reinicio el router?' },
                    { label: 'Problemas WiFi',           q: 'El WiFi no aparece o no conecta' },
                    { label: 'Internet lento',           q: '¿Por qué está lento mi internet?' },
                    { label: 'Sin internet',             q: 'No tengo internet, ¿qué hago?' },
                  ]},
                { Icon: CreditCard, title: 'Facturación',  color: 'bg-green-100 text-green-700',
                  items: [
                    { label: 'Ver mi factura',           q: '¿Cómo consulto mi factura?' },
                    { label: 'Métodos de pago',          q: '¿Dónde y cómo puedo pagar?' },
                    { label: 'Servicio suspendido',      q: 'Mi servicio está suspendido, ¿qué hago?' },
                    { label: 'Acuerdo de pago',          q: '¿Puedo hacer un acuerdo de pago?' },
                  ]},
                { Icon: Settings,  title: 'Configuración', color: 'bg-orange-100 text-orange-700',
                  items: [
                    { label: 'Cambiar clave WiFi',       q: '¿Cómo cambio la contraseña del WiFi?' },
                    { label: 'Luces del router',         q: '¿Qué significan las luces del router?' },
                    { label: 'Dispositivo no conecta',   q: 'Un dispositivo no se conecta al WiFi' },
                    { label: 'Velocidad de mi plan',     q: '¿Cómo sé qué velocidad tiene mi plan?' },
                  ]},
                { Icon: Users,     title: 'Mi Servicio',   color: 'bg-blue-100 text-blue-700',
                  items: [
                    { label: 'Cambiar de plan',          q: '¿Cómo solicito un cambio de plan?' },
                    { label: 'Nueva instalación',        q: '¿Cómo solicito una nueva instalación?' },
                    { label: 'Traslado de servicio',     q: '¿Cómo traslado el servicio a otra dirección?' },
                    { label: 'Cancelar servicio',        q: '¿Cómo cancelo el servicio?' },
                  ]},
              ].map(({ Icon, title, items, color }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`${color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map(({ label, q }) => (
                      <li key={label}
                        onClick={() => preguntarAlChat(q)}
                        className="text-xs text-gray-600 flex items-center gap-2 cursor-pointer hover:text-[#0e6493] group transition-colors py-0.5"
                        title={`Preguntar: ${q}`}
                      >
                        <span className="w-1.5 h-1.5 bg-gray-300 group-hover:bg-[#0e6493] rounded-full flex-shrink-0 transition-colors" />
                        {label}
                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#0e6493]">Preguntar →</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ── PANEL DERECHO: CHAT EMBEBIDO ── */}
          <div id="chat-panel" className="w-full lg:w-[400px] flex-shrink-0 sticky top-4">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              <ChatBot ref={chatRef} isOpen={true} standalone={true} />
            </div>
            {/* Nota debajo del chat */}
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 px-1">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Tu conversación es privada. Si el asistente no puede resolver tu problema, puedes crear un ticket para que un agente humano te contacte.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SoportePage;
