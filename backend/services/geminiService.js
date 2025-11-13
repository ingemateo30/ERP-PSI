/**
 * Servicio de IA usando Google Gemini API (GRATUITA)
 *
 * Límites del tier gratuito:
 * - 60 requests por minuto
 * - 1,500 requests por día
 *
 * Documentación: https://ai.google.dev/
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    // Inicializar con la API key desde variables de entorno
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY no configurada. El chatbot usará respuestas predefinidas.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Usar gemini-1.5-flash (más rápido y económico) o gemini-1.5-pro (más capaz)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    // Contexto del sistema para el chatbot
    this.systemContext = `Eres un asistente virtual de soporte técnico para un proveedor de servicios de Internet (ISP).

Tu rol es:
1. Ayudar a resolver problemas técnicos básicos de internet, WiFi y router
2. Responder preguntas sobre facturación y pagos
3. Proporcionar información sobre planes y servicios
4. Ser amable, claro y conciso en tus respuestas
5. Si el problema es complejo o requiere un técnico, debes indicar que se creará un ticket de soporte (PQR)

Guías de respuesta:
- Usa un lenguaje simple y accesible
- Proporciona pasos numerados para soluciones técnicas
- Sé empático con las frustraciones del cliente
- Si no estás seguro, mejor derivar a un ticket de soporte
- Nunca inventes información técnica que no sepas

Problemas que PUEDES resolver:
- Reinicio de router
- Verificación de cables
- Cambio de contraseña WiFi
- Problemas de velocidad básicos
- Consultas sobre facturación
- Información general sobre planes

Problemas que DEBES DERIVAR a ticket:
- Fallas de hardware
- Problemas de infraestructura externa
- Configuraciones avanzadas de red
- Reclamos complejos de facturación
- Solicitudes de instalación o cambio de plan`;
  }

  /**
   * Genera una respuesta usando Gemini AI
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      // Si no hay API key, usar respuestas predefinidas
      if (!this.genAI) {
        return this.getFallbackResponse(userMessage);
      }

      // Construir el historial de conversación
      const chat = this.model.startChat({
        history: this.buildChatHistory(conversationHistory),
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      // Enviar mensaje del usuario
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text,
        source: 'gemini',
        needsTicket: this.shouldCreateTicket(text, userMessage),
      };
    } catch (error) {
      console.error('Error en Gemini Service:', error);

      // Fallback a respuestas predefinidas si falla la API
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Construye el historial para Gemini
   */
  buildChatHistory(conversationHistory) {
    const history = [
      {
        role: 'user',
        parts: [{ text: this.systemContext }],
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido. Estoy listo para ayudar con soporte técnico de manera clara y eficiente.' }],
      },
    ];

    // Agregar historial previo
    conversationHistory.forEach((msg) => {
      history.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    });

    return history;
  }

  /**
   * Determina si se debe crear un ticket basado en la respuesta
   */
  shouldCreateTicket(response, userMessage) {
    const ticketKeywords = [
      'crear un ticket',
      'ticket de soporte',
      'derivar',
      'técnico especializado',
      'requiere un técnico',
      'contactar con soporte',
      'problema complejo',
      'no puedo resolver',
    ];

    const lowerResponse = response.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();

    // Verificar palabras clave en la respuesta
    const hasTicketKeywords = ticketKeywords.some(keyword =>
      lowerResponse.includes(keyword)
    );

    // Problemas que siempre requieren ticket
    const complexIssues = [
      'no enciende',
      'sin señal',
      'corte de servicio',
      'falla general',
      'problema de infraestructura',
      'cable cortado',
      'poste caído',
    ];

    const isComplexIssue = complexIssues.some(issue =>
      lowerMessage.includes(issue)
    );

    return hasTicketKeywords || isComplexIssue;
  }

  /**
   * Respuestas predefinidas cuando no hay API key o falla
   */
  getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    // Respuestas predefinidas basadas en palabras clave
    const responses = {
      reiniciar: {
        text: `Para reiniciar tu router, sigue estos pasos:

1. Desconecta el cable de alimentación del router
2. Espera 30 segundos completos
3. Vuelve a conectar el cable de alimentación
4. Espera 2-3 minutos hasta que todas las luces se estabilicen
5. Verifica tu conexión a internet

**Importante:** No presiones el botón de reset físico, ya que esto restaurará la configuración de fábrica.

¿Te funcionó esta solución?`,
        needsTicket: false,
      },
      'sin internet': {
        text: `Si no tienes internet, intenta lo siguiente:

1. Verifica que el router esté encendido (luces LED)
2. Revisa que todos los cables estén bien conectados
3. Reinicia el router (desconecta 30 segundos y vuelve a conectar)
4. Reinicia tu dispositivo
5. Intenta conectar otro dispositivo para verificar si es problema general

Si después de estos pasos sigues sin internet, puedo crear un ticket de soporte para que un técnico te ayude.

¿Quieres que cree el ticket?`,
        needsTicket: true,
      },
      lento: {
        text: `Si tu internet está lento, prueba esto:

1. Haz un test de velocidad en https://fast.com
2. Reinicia el router
3. Verifica cuántos dispositivos están conectados
4. Acerca tu dispositivo al router o usa cable Ethernet
5. Cierra aplicaciones que consuman mucho ancho de banda

¿Qué velocidad te dio el test? Si es mucho menor a tu plan contratado, puedo crear un ticket técnico.`,
        needsTicket: false,
      },
      factura: {
        text: `Para consultas sobre tu factura, puedo ayudarte con:

📄 **Ver fecha de vencimiento**
💳 **Métodos de pago disponibles**
📧 **Reenvío de factura**
❓ **Aclaración de cobros**

¿Con cuál de estas opciones necesitas ayuda? Por favor, ten a mano tu número de cliente o correo registrado.`,
        needsTicket: false,
      },
      'cambiar contraseña': {
        text: `Para cambiar la contraseña de tu WiFi:

1. Abre tu navegador e ingresa: **192.168.1.1**
2. Usuario: admin | Contraseña: admin (o la que hayas configurado)
3. Ve a la sección **"WiFi"** o **"Wireless"**
4. Busca **"Contraseña"** o **"Password"**
5. Ingresa tu nueva contraseña (mínimo 8 caracteres)
6. Guarda los cambios
7. Reconecta todos tus dispositivos con la nueva contraseña

**Importante:** Anota tu nueva contraseña en un lugar seguro.

¿Necesitas ayuda con algún paso específico?`,
        needsTicket: false,
      },
    };

    // Buscar coincidencia
    for (const [keyword, response] of Object.entries(responses)) {
      if (lowerMessage.includes(keyword)) {
        return {
          success: true,
          response: response.text,
          source: 'fallback',
          needsTicket: response.needsTicket,
        };
      }
    }

    // Respuesta genérica
    return {
      success: true,
      response: `¡Hola! Soy tu asistente virtual de soporte. Estoy aquí para ayudarte con:

🔧 **Problemas técnicos:** Internet, WiFi, router
💰 **Facturación:** Pagos, consultas, vencimientos
📦 **Planes:** Información sobre servicios

Por favor, cuéntame ¿con qué necesitas ayuda hoy?

**Ejemplos de preguntas:**
- "No tengo internet"
- "¿Cómo reinicio el router?"
- "Internet está muy lento"
- "¿Cuándo vence mi factura?"
- "Quiero cambiar mi contraseña WiFi"`,
      source: 'fallback',
      needsTicket: false,
    };
  }

  /**
   * Clasifica el tipo de consulta
   */
  classifyQuery(message) {
    const lowerMessage = message.toLowerCase();

    const categories = {
      tecnica: ['internet', 'wifi', 'router', 'conexion', 'señal', 'velocidad', 'lento', 'no funciona', 'reiniciar', 'contraseña'],
      facturacion: ['factura', 'pago', 'cobro', 'vencimiento', 'cuenta', 'valor', 'precio'],
      comercial: ['plan', 'servicio', 'contratar', 'cambiar plan', 'upgrade', 'velocidad contratada'],
      general: [],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Genera un resumen de la conversación para crear PQR
   */
  generateTicketSummary(conversationHistory) {
    const messages = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n\n');

    return {
      asunto: conversationHistory[0]?.content?.substring(0, 100) || 'Solicitud de soporte desde chatbot',
      descripcion: `**Resumen de conversación con chatbot:**\n\n${messages}\n\n---\n**Estado:** El chatbot no pudo resolver el problema y derivó a soporte técnico.`,
    };
  }
}

module.exports = new GeminiService();
