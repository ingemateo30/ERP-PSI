import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  X,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Loader2,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import * as soporteService from '../../services/soporteService';

const ChatBot = ({ isOpen, onClose, standalone = false }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userInfo, setUserInfo] = useState({ nombre: '', email: '', telefono: '' });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensaje de bienvenida
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: `¡Hola! 👋 Soy tu asistente virtual de soporte.

Estoy aquí para ayudarte con:

🔧 **Problemas técnicos:** Internet, WiFi, router
💰 **Facturación:** Pagos, consultas, vencimientos
📦 **Planes:** Información sobre servicios

¿En qué puedo ayudarte hoy?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Agregar mensaje del usuario
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Construir historial para contexto
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Preparar payload (solo enviar campos con valores)
      const payload = {
        message: userMessage,
        conversationHistory: conversationHistory,
      };

      // Agregar campos opcionales solo si tienen valor
      if (sessionId) payload.sessionId = sessionId;
      if (userInfo.nombre && userInfo.nombre.trim()) payload.nombre = userInfo.nombre;
      if (userInfo.email && userInfo.email.trim()) payload.email = userInfo.email;
      if (userInfo.telefono && userInfo.telefono.trim()) payload.telefono = userInfo.telefono;

      // Enviar mensaje a la API
      const response = await soporteService.sendMessage(payload);

      // Guardar session ID
      if (!sessionId) {
        setSessionId(response.data.sessionId);
      }

      // Agregar respuesta del asistente
      const assistantMsg = {
        id: response.data.messageId,
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        needsTicket: response.data.needsTicket,
        tipoConsulta: response.data.tipoConsulta,
        relatedFAQs: response.data.relatedFAQs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentMessageId(response.data.messageId);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);

      // Mensaje de error
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'error',
          content:
            'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Marcar como resuelto
  const handleMarkResolved = async (messageId) => {
    try {
      await soporteService.markAsResolved({
        messageId: messageId,
        sessionId: sessionId,
        satisfaccion: 5,
      });

      // Actualizar mensaje
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, resolved: true } : msg
        )
      );

      // Mensaje de confirmación
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: '¡Excelente! Me alegra haber podido ayudarte. ¿Hay algo más en lo que pueda asistirte?',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error al marcar como resuelto:', error);
    }
  };

  // Crear ticket
  const handleCreateTicket = () => {
    if (!userInfo.nombre || !userInfo.email) {
      setShowUserForm(true);
    } else {
      setShowTicketForm(true);
    }
  };

  // Enviar formulario de ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    try {
      const response = await soporteService.createTicketFromChat({
        sessionId: sessionId,
        nombre: userInfo.nombre,
        email: userInfo.email,
        telefono: userInfo.telefono,
        categoria: 'tecnico',
        prioridad: 'media',
      });

      setShowTicketForm(false);

      // Mensaje de confirmación
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: `✅ **Ticket creado exitosamente**

**Número de radicado:** ${response.data.numeroRadicado}

Tu solicitud ha sido registrada y será atendida por nuestro equipo de soporte a la brevedad posible.

Te contactaremos al correo: **${userInfo.email}**

¿Hay algo más en lo que pueda ayudarte?`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error al crear ticket:', error);
      alert('Error al crear el ticket. Por favor, intenta nuevamente.');
    }
  };

  // Guardar información del usuario
  const handleSaveUserInfo = (e) => {
    e.preventDefault();
    setShowUserForm(false);
    setShowTicketForm(true);
  };

  // Formatear mensaje (soporte para markdown simple)
  const formatMessage = (content) => {
    return content
      .split('\n')
      .map((line, idx) => {
        // Negrita **texto**
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Listas numeradas
        if (/^\d+\./.test(line)) {
          return <li key={idx} dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '') }} />;
        }

        // Encabezados ##
        if (line.startsWith('##')) {
          return <h3 key={idx} className="font-bold text-lg mt-2 mb-1">{line.replace('##', '').trim()}</h3>;
        }

        return <p key={idx} dangerouslySetInnerHTML={{ __html: line }} className="mb-1" />;
      });
  };

  if (!isOpen && !standalone) return null;

  return (
    <div
      className={`${
        standalone
          ? 'w-full h-full'
          : 'fixed bottom-20 right-4 w-96 h-[600px] shadow-2xl rounded-lg overflow-hidden border border-gray-300'
      } bg-white flex flex-col z-50`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Asistente de Soporte</h3>
            <p className="text-xs text-blue-100">En línea • Responde en segundos</p>
          </div>
        </div>
        {!standalone && (
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.role === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-5 h-5" />
              ) : message.role === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            {/* Message bubble */}
            <div
              className={`flex-1 ${
                message.role === 'user' ? 'flex justify-end' : ''
              }`}
            >
              <div
                className={`inline-block max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.role === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-white text-gray-800 shadow-md border border-gray-200'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {formatMessage(message.content)}
                </div>

                {/* Timestamp */}
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {/* Acciones para mensajes del asistente */}
                {message.role === 'assistant' && !message.resolved && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {/* Botón: ¿Te sirvió? */}
                    <button
                      onClick={() => handleMarkResolved(message.id)}
                      className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      ¿Te sirvió?
                    </button>

                    {/* Botón: Crear ticket */}
                    {message.needsTicket && (
                      <button
                        onClick={handleCreateTicket}
                        className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-200 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Crear ticket
                      </button>
                    )}
                  </div>
                )}

                {/* Confirmación de resuelto */}
                {message.resolved && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Problema resuelto</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-gray-700" />
            </div>
            <div className="bg-white rounded-lg p-3 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Escribiendo...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-white border-t border-gray-200"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Modal: Formulario de usuario */}
      {showUserForm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Información de contacto</h3>
            <p className="text-gray-600 mb-4">
              Para crear un ticket, necesitamos algunos datos de contacto:
            </p>
            <form onSubmit={handleSaveUserInfo}>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={userInfo.nombre}
                  onChange={(e) =>
                    setUserInfo({ ...userInfo, nombre: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Correo electrónico *"
                  value={userInfo.email}
                  onChange={(e) =>
                    setUserInfo({ ...userInfo, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Teléfono (opcional)"
                  value={userInfo.telefono}
                  onChange={(e) =>
                    setUserInfo({ ...userInfo, telefono: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de ticket */}
      {showTicketForm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Crear ticket de soporte</h3>
            <p className="text-gray-600 mb-4">
              Se creará un ticket con toda la conversación actual y nuestro
              equipo te contactará pronto.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-sm">
                <strong>Nombre:</strong> {userInfo.nombre}
              </p>
              <p className="text-sm">
                <strong>Email:</strong> {userInfo.email}
              </p>
              {userInfo.telefono && (
                <p className="text-sm">
                  <strong>Teléfono:</strong> {userInfo.telefono}
                </p>
              )}
            </div>
            <form onSubmit={handleSubmitTicket}>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Crear ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
