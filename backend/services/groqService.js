/**
 * Servicio de IA usando Groq API con modelo Llama 3.3 (70B)
 *
 * Groq ofrece inferencia ultra-rápida:
 * - Modelo: llama-3.3-70b-versatile
 * - Rate limit free tier: ~30 req/min, 14,400 req/día
 * - Latencia: ~250ms por respuesta (vs 2-3s de otros)
 *
 * Documentación: https://console.groq.com/docs/
 * API compatible con OpenAI format
 *
 * Requiere: GROQ_API_KEY en variables de entorno
 */

const https = require('https');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = 'llama-3.3-70b-versatile';
    this.apiHost = 'api.groq.com';
    this.apiPath = '/openai/v1/chat/completions';

    if (!this.apiKey) {
      console.warn('⚠️  GROQ_API_KEY no configurada. El chatbot usará respuestas predefinidas.');
      console.warn('   Obtén tu API key gratuita en: https://console.groq.com/keys');
    } else {
      console.log(`✅ Groq Service iniciado con modelo: ${this.model}`);
    }

    // ─── CONTEXTO DEL SISTEMA ────────────────────────────────────────────────
    this.systemPrompt = `Eres el asistente virtual de soporte técnico de PSI (Proveedor de Servicios de Internet), empresa ISP ubicada en Santander, Colombia.

## IDENTIDAD
- Nombre: Asistente PSI
- Tono: Amable, claro, empático y profesional. Español colombiano natural.
- Formato: Usa **negritas** para puntos clave, listas numeradas para pasos, bullet points para opciones.
- Límite: Máximo 250 palabras por respuesta, salvo que el problema lo requiera.

## SOPORTE TÉCNICO COMPLETO

### Diagnóstico de conectividad
- Sin internet → verificar luces router, reiniciar correctamente (30 seg sin alimentación, NO botón reset), revisar cables coaxial/fibra, probar otro dispositivo
- Internet lento → test en fast.com, verificar dispositivos conectados, acercar al router, cerrar apps segundo plano, reiniciar router
- WiFi no aparece → reiniciar router, verificar luz WiFi, botón físico WiFi, banda 2.4/5GHz
- Solo funciona en algunos dispositivos → problema del dispositivo, olvidar red y reconectar, revisar drivers de red
- Conexión intermitente → revisión de cables, interferencias WiFi, actualizar firmware router

### Configuración de router
- Cambiar contraseña WiFi: 192.168.1.1 (o 192.168.0.1) → admin/admin → Wireless → Security
- Cambiar nombre red (SSID): misma ruta que contraseña
- Abrir puertos (port forwarding): Avanzado → NAT → Virtual Server
- Priorizar dispositivos (QoS): Avanzado → QoS → agregar MAC del dispositivo
- Modo puente (bridge): requiere técnico especializado
- Acceso remoto al router: requiere configurar DDNS, riesgoso sin conocimientos

### Significado luces router
- 🟢 Power fija: normal
- 🟢 Internet/WAN fija o parpadeando: conexión activa, normal
- 🔴 Internet/WAN roja: sin señal del proveedor → reiniciar; si persiste → ticket técnico
- 🟡 Internet amarilla/naranja: conectando, espera 3 min
- ⚪ WiFi apagada: desactivado, buscar botón físico o configuración

### Velocidad y rendimiento
- Test velocidad: fast.com o speedtest.net
- Si resultado < 70% del plan contratado fuera de hora pico → crear ticket
- Hora pico (mayor congestión): 7–10 PM, es normal una baja leve
- Optimizar: cable Ethernet > WiFi 5GHz > WiFi 2.4GHz
- Streaming 4K requiere mínimo 25 Mbps estables

### Problemas específicos
- Netflix/YouTube lento: liberar ancho de banda, verificar plan, probar cable
- Videollamadas con cortes: priorizar con QoS, usar cable, verificar upload
- Gaming con lag: ping alto → usar cable, verificar latencia con ping 8.8.8.8
- VPN no funciona: algunos routers bloquean protocolos VPN, configurar pass-through
- Cámaras IP no conectan: verificar IP estática, abrir puertos en router
- Smart TV sin internet: verificar DNS (8.8.8.8), reiniciar TV y router

### Fallas de infraestructura
- Luz roja persistente después de 2 reinicios → problema externo, crear ticket urgente
- Vecinos también sin internet → posible falla masiva en sector, reportar con dirección
- Ruido en la línea / señal débil → revisión técnica necesaria
- Cable físicamente dañado (roto, mordido, aplastado) → requiere técnico

## FACTURACIÓN

### Pagos
- Canales: Bancolombia, Davivienda, Banco de Bogotá, AV Villas (ventanilla y app)
- Puntos de pago: Efecty, Baloto, Su Red, Paga Todo
- En línea: portal de clientes PSI (tarjeta o PSE)
- Oficina PSI: efectivo o tarjeta
- Código de pago: está en la factura física o correo de factura

### Mora y suspensión
- Día 1-5: recordatorio de pago
- Día 6-15: suspensión del servicio
- Día +30: corte definitivo
- Reactivación: pagar factura vencida + enviar comprobante por WhatsApp → 1-4 horas hábiles
- Acuerdo de pago: llamar antes del corte

### Consultas de factura
- Llega al correo 5 días antes del vencimiento (revisar spam)
- No llegó: actualizar correo llamando o en oficina
- Doble cobro: verificar con número de factura, escalar si se confirma
- IVA: estratos 1-2-3 tienen exención parcial según plan y regulación

## SERVICIOS COMERCIALES

### Planes disponibles
- Residencial: Básico (navegación/redes), Estándar (streaming HD/trabajo remoto), Premium (4K/gaming/múltiples dispositivos)
- Empresarial: IP fija, velocidad garantizada, soporte prioritario
- Combos Internet + TV: disponibles según zona
- Tarifas exactas y disponibilidad: consultar con ventas según dirección

### Cambios de servicio
- Cambio de plan: llamar ventas o ir a oficina con cédula
- Upgrade (más velocidad): puede aplicar desde el día siguiente
- Downgrade: aplica desde el siguiente período (verificar permanencia)
- Nueva instalación: verificar cobertura → visita técnica 48-72h → firma contrato (cédula requerida)
- Traslado: avisar 5 días antes, verificar cobertura nueva dirección, costo según plan
- Cancelación: solicitud escrita + cédula titular + devolver equipo + estar al día

## HORARIOS DE ATENCIÓN
- 📞 Teléfono y 💬 WhatsApp: Lunes-Sábado 7AM-8PM
- 🏢 Oficina: Lunes-Viernes 8AM-5PM, Sábados 8AM-12PM
- 🤖 Chatbot: 24/7

## CUÁNDO CREAR TICKET (needsTicket: true)
- Luz roja persistente después de 2 reinicios correctos
- Sin internet después de seguir todos los pasos de diagnóstico
- Velocidad < 70% del plan durante más de 24h fuera de hora pico
- Equipo físicamente dañado o sin encender
- Servicio cortado habiendo pagado (con comprobante)
- Doble cobro confirmado
- Falla masiva en sector
- Solicitud de instalación, traslado o cancelación
- Cambio de plan que requiere visita técnica

## REGLAS
1. Pregunta siempre si la solución funcionó después de dar pasos técnicos
2. Si el cliente está frustrado, empatiza primero: "Entiendo lo frustrante que es esto..."
3. Nunca inventes tarifas, fechas específicas ni datos técnicos que no sepas con certeza
4. Si no sabes algo, di que lo derivarás a un agente
5. Usa emojis con moderación: 🔧 🌐 💳 ✅ 📞`;
  }

  /**
   * Llama a la API de Groq usando https nativo (sin dependencias externas)
   */
  _callGroqAPI(messages) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 600,
        temperature: 0.6,
        top_p: 0.9,
        stream: false,
      });

      const options = {
        hostname: this.apiHost,
        port: 443,
        path: this.apiPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`Groq API error ${res.statusCode}: ${parsed.error?.message || data}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Error parseando respuesta Groq: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => reject(new Error(`Error de red Groq: ${e.message}`)));
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Timeout conectando con Groq API (15s)'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Genera una respuesta usando Groq + Llama 3.3
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      if (!this.apiKey) {
        return this.getFallbackResponse(userMessage);
      }

      // Construir mensajes en formato OpenAI
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.buildMessageHistory(conversationHistory),
        { role: 'user', content: userMessage },
      ];

      const data = await this._callGroqAPI(messages);
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('Respuesta vacía de Groq');
      }

      return {
        success: true,
        response: text,
        source: 'groq-llama3.3',
        model: this.model,
        needsTicket: this.shouldCreateTicket(text, userMessage),
      };
    } catch (error) {
      console.error('Error en Groq Service:', error.message);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Análisis IA de un PQR/ticket para auto-clasificación y sugerencia de respuesta
   * Usado internamente por el sistema de tickets
   */
  async analyzePQR(descripcion, asunto, categoria) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const prompt = `Eres un sistema experto en soporte técnico ISP. Analiza este ticket de soporte y responde SOLO en JSON válido sin markdown.

Ticket:
- Asunto: ${asunto}
- Categoría: ${categoria}
- Descripción: ${descripcion}

Responde con este JSON exacto:
{
  "prioridad_sugerida": "baja|media|alta|critica",
  "categoria_confirmada": "tecnico|facturacion|comercial|atencion_cliente|otros",
  "resumen": "resumen en máximo 2 oraciones",
  "solucion_rapida": "pasos básicos que puede intentar el cliente antes de visita técnica, o null si no aplica",
  "requiere_visita_tecnica": true|false,
  "tiempo_respuesta_sugerido": "inmediato|2h|24h|48h",
  "etiquetas": ["tag1", "tag2"]
}`;

      const data = await this._callGroqAPI([
        { role: 'system', content: 'Eres un clasificador de tickets de soporte ISP. Responde ÚNICAMENTE con JSON válido.' },
        { role: 'user', content: prompt },
      ]);

      const text = data.choices?.[0]?.message?.content || '';

      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Error analizando PQR con IA:', error.message);
      return null;
    }
  }

  /**
   * Genera una respuesta sugerida para un agente de soporte
   * Usado en el módulo de gestión de tickets
   */
  async generateAgentResponse(descripcion, asunto, historialPrevio = '') {
    if (!this.apiKey) {
      return null;
    }

    try {
      const contextoPrevio = historialPrevio
        ? `\nHistorial previo:\n${historialPrevio}`
        : '';

      const data = await this._callGroqAPI([
        {
          role: 'system',
          content: `Eres un agente experto de soporte ISP de PSI en Colombia.
Genera respuestas profesionales, empáticas y con soluciones concretas en español colombiano.
La respuesta debe estar lista para enviar al cliente (máximo 200 palabras).`,
        },
        {
          role: 'user',
          content: `Genera una respuesta profesional para este ticket de soporte:

Asunto: ${asunto}
Descripción del cliente: ${descripcion}${contextoPrevio}

La respuesta debe:
1. Saludar al cliente por su caso
2. Reconocer el problema
3. Dar solución concreta o próximos pasos
4. Cerrar amablemente indicando que pueden contactar si necesitan más ayuda`,
        },
      ]);

      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('Error generando respuesta de agente:', error.message);
      return null;
    }
  }

  /**
   * Diagnóstico asistido por IA para técnicos de campo
   */
  async technicalDiagnosis(sintomas, tipoServicio, equipoInfo = '') {
    if (!this.apiKey) {
      return null;
    }

    try {
      const data = await this._callGroqAPI([
        {
          role: 'system',
          content: `Eres un experto en redes y telecomunicaciones con 15 años de experiencia en ISPs colombianos.
Ayudas a técnicos de campo a diagnosticar problemas en redes de fibra óptica y cable coaxial.
Responde en español técnico pero claro, con pasos de diagnóstico específicos.`,
        },
        {
          role: 'user',
          content: `Síntomas reportados: ${sintomas}
Tipo de servicio: ${tipoServicio}
Información del equipo: ${equipoInfo || 'No especificado'}

Proporciona:
1. Posibles causas (ordenadas de mayor a menor probabilidad)
2. Pasos de diagnóstico en campo
3. Herramientas o equipos necesarios
4. Criterios para escalar a nivel 2`,
        },
      ]);

      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('Error en diagnóstico técnico IA:', error.message);
      return null;
    }
  }

  /**
   * Construye el historial de mensajes para la API
   */
  buildMessageHistory(conversationHistory) {
    return conversationHistory
      .slice(-10) // Máximo últimos 10 mensajes para no exceder tokens
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Determina si se debe crear un ticket de soporte
   */
  shouldCreateTicket(response, userMessage) {
    const ticketKeywords = [
      'crear un ticket',
      'ticket de soporte',
      'técnico especializado',
      'requiere visita técnica',
      'necesitas un técnico',
      'derivar a soporte',
      'no puedo resolver',
      'escalar',
      'enviar técnico',
    ];

    const complexIssues = [
      'no enciende',
      'sin señal',
      'corte de servicio',
      'falla general',
      'cable cortado',
      'poste caído',
      'falla masiva',
      'sin internet desde hace',
      'luz roja',
    ];

    const lowerResponse = response.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();

    return (
      ticketKeywords.some((k) => lowerResponse.includes(k)) ||
      complexIssues.some((k) => lowerMessage.includes(k))
    );
  }

  /**
   * Clasifica el tipo de consulta
   */
  classifyQuery(message) {
    const lower = message.toLowerCase();

    const categories = {
      tecnica: ['internet', 'wifi', 'router', 'conexion', 'señal', 'velocidad', 'lento', 'no funciona', 'reiniciar', 'contraseña', 'luz', 'cable', 'fibra', 'ping', 'latencia', 'desconecta', 'intermitente'],
      facturacion: ['factura', 'pago', 'cobro', 'vencimiento', 'cuenta', 'valor', 'precio', 'mora', 'suspendido', 'cortado', 'reactivar', 'deuda', 'saldo'],
      comercial: ['plan', 'servicio', 'contratar', 'cambiar plan', 'upgrade', 'instalacion', 'traslado', 'cancelar', 'nuevo servicio', 'megas'],
    };

    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some((k) => lower.includes(k))) {
        return cat;
      }
    }

    return 'general';
  }

  /**
   * Genera resumen del ticket para crear PQR
   */
  generateTicketSummary(conversationHistory) {
    const messages = conversationHistory
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content)
      .join('\n\n');

    return {
      asunto: conversationHistory[0]?.content?.substring(0, 100) || 'Solicitud de soporte desde chatbot',
      descripcion: `**Resumen de conversación con chatbot (Groq/Llama 3.3):**\n\n${messages}\n\n---\n**Estado:** El chatbot no pudo resolver el problema y derivó a soporte técnico.`,
    };
  }

  /**
   * Respuestas predefinidas para cuando no hay API key o falla Groq
   */
  getFallbackResponse(userMessage) {
    const q = userMessage
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const matches = (keywords) => keywords.some((k) => q.includes(k));

    if (matches(['reinici', 'apag', 'prender', 'reset router'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `Para reiniciar el router correctamente:

1. **Desconecta** el cable de alimentación del tomacorriente
2. Espera **30 segundos completos**
3. Vuelve a conectar el cable
4. Espera **2–3 minutos** hasta que las luces se estabilicen
5. Verifica la conexión desde tu dispositivo

⚠️ **No presiones el botón de reset** (agujero pequeño) — borra toda la configuración y requiere técnico para restaurarla.

¿Después de reiniciar recuperaste el internet?`,
      };
    }

    if (matches(['no tengo internet', 'sin internet', 'no hay internet', 'no funciona el internet', 'se fue el internet', 'sin conexion'])) {
      return {
        success: true, needsTicket: true, source: 'fallback',
        response: `Vamos a diagnosticar el problema paso a paso:

**Paso 1 — Verifica el router**
- ¿La luz de "Internet" o "WAN" está **roja o apagada**?

**Paso 2 — Reinicia el router**
- Desconecta el cable de alimentación, espera 30 segundos y vuelve a conectar
- Espera 3 minutos antes de probar

**Paso 3 — Verifica cables**
- Asegúrate de que el cable coaxial o de fibra esté bien conectado

**Paso 4 — Prueba otro dispositivo**
- Si otro dispositivo tampoco tiene internet, el problema es de la línea

Si después de estos pasos sigue sin internet, necesitamos enviar un técnico. ¿Quieres que cree un ticket de soporte?`,
      };
    }

    if (matches(['lento', 'despacio', 'baja velocidad', 'buffering', 'se congela', 'tarda'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `Si el internet está lento, prueba esto en orden:

1. **Test de velocidad:** Entra a fast.com y anota el resultado
2. **Reinicia el router:** Desconecta 30 segundos y vuelve a conectar
3. **Reduce dispositivos:** Desconecta los que no estés usando
4. **Acércate al router** o usa cable Ethernet
5. **Cierra apps** que descarguen en segundo plano

📊 Si la velocidad es **menor al 70%** de tu plan en horario normal, podemos crear un ticket técnico.

¿Cuál fue tu resultado en fast.com?`,
      };
    }

    if (matches(['contrasena wifi', 'clave wifi', 'cambiar contrasena', 'password wifi'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `Para cambiar la contraseña WiFi:

1. Abre un navegador y ve a **192.168.1.1** (o 192.168.0.1)
2. Usuario: **admin** | Contraseña: **admin**
3. Ve a la sección **"WiFi"** o **"Wireless"**
4. Encuentra el campo **"Contraseña"** o **"Password"**
5. Escribe tu nueva contraseña (mínimo 8 caracteres)
6. Guarda los cambios
7. Reconecta todos tus dispositivos con la nueva clave

💡 Toma foto de la nueva contraseña para no olvidarla.

¿Pudiste acceder a la página del router?`,
      };
    }

    if (matches(['pagar', 'donde pago', 'como pago', 'metodo de pago'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `Puedes pagar tu factura PSI en:

🏦 **Bancos:** Bancolombia, Davivienda, Banco de Bogotá, AV Villas
🏪 **Puntos de pago:** Efecty, Baloto, Su Red, Paga Todo
💻 **Portal PSI:** pago con tarjeta o PSE
🏢 **Oficina PSI:** efectivo o tarjeta

El **código de pago** está en tu factura o en el correo que te enviamos.

¿Necesitas que te explique alguno de estos métodos?`,
      };
    }

    if (matches(['suspendido', 'cortado', 'reactivar', 'reconexion'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `Para reactivar tu servicio suspendido:

1. Realiza el pago de la factura vencida
2. Envía el **comprobante de pago** por WhatsApp a PSI
3. La reactivación toma **1–4 horas hábiles**

¿Ya realizaste el pago? Si hay algún problema con tu factura, puedo ayudarte.`,
      };
    }

    if (matches(['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `¡Hola! 👋 Bienvenido al soporte de **PSI**.

Estoy aquí para ayudarte con:
- 🔧 **Técnico:** Internet, WiFi, router, velocidad, configuración
- 💳 **Facturación:** Pagos, facturas, mora, reconexión
- 📦 **Servicios:** Planes, instalación, traslado, cambio de plan

¿Con qué puedo ayudarte hoy?`,
      };
    }

    if (matches(['gracias', 'muchas gracias', 'perfecto', 'excelente', 'listo'])) {
      return {
        success: true, needsTicket: false, source: 'fallback',
        response: `¡Con mucho gusto! 😊 Me alegra haberte podido ayudar.

Si tienes otra consulta, no dudes en escribir. ¡Que tengas un excelente día!`,
      };
    }

    // Respuesta genérica
    return {
      success: true,
      source: 'fallback',
      needsTicket: false,
      response: `Entiendo tu consulta. Puedo ayudarte con:

🔧 **Técnico:** "no tengo internet", "internet lento", "cómo reinicio el router", "cambiar clave WiFi"
💳 **Facturación:** "¿dónde pago?", "servicio suspendido", "no me llegó la factura"
📦 **Servicios:** "qué planes tienen", "quiero cambiar de plan", "cómo solicito instalación"
⏰ **Atención:** "horarios", "número de contacto", "reportar falla en mi sector"

Por favor **cuéntame con más detalle** qué problema tienes y te doy una respuesta específica.`,
    };
  }
}

module.exports = new GroqService();
