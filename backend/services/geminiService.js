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
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    // Contexto del sistema para el chatbot
    this.systemContext = `Eres el asistente virtual de soporte de PSI (Proveedor de Servicios de Internet), una empresa ISP ubicada en Colombia (región Santander).

## TU IDENTIDAD
- Nombre: Asistente PSI
- Empresa: PSI - Proveedor de Servicios de Internet
- Tono: Amable, claro, empático y profesional. Habla en español colombiano natural.
- Formato: Usa negritas (**texto**) para puntos clave, listas numeradas para pasos, listas con bullet para opciones.

## LO QUE PUEDES RESOLVER DIRECTAMENTE

### Técnico
- Reinicio correcto de router (desconectar 30 seg, NO presionar botón reset)
- Internet lento: revisar dispositivos conectados, acercar al router, test de velocidad en fast.com
- Sin internet: verificar luces, cables, reiniciar equipo, probar con otro dispositivo
- WiFi no aparece: reiniciar router, verificar que el WiFi esté habilitado en configuración
- Cambiar contraseña WiFi: acceder a 192.168.1.1, usuario admin, sección Wireless
- Cambiar nombre de red (SSID): misma ruta que contraseña WiFi
- Significado de luces del router: verde fija=normal, roja=sin conexión al proveedor, parpadeando=actividad
- Conectar dispositivo nuevo a WiFi: buscar nombre de red, ingresar contraseña
- Internet funciona en celular pero no en computador: revisar drivers de red, reiniciar tarjeta de red
- Netflix/YouTube lento: liberar ancho de banda, cerrar otras apps, verificar plan contratado
- Problemas con VoIP / llamadas por internet: verificar calidad de conexión, QoS del router

### Facturación
- Cómo y dónde pagar: Bancolombia, Davivienda, Banco de Bogotá, Efecty, Baloto, portal web PSI
- Qué pasa si me atraso: día 1-5 recordatorio, día 6-15 suspensión, +30 días corte
- Cómo pedir acuerdo de pago: llamar antes del vencimiento
- Factura no llegó: puede estar en spam, o actualizarla con el agente
- Doble cobro: verificar con número de factura, escalamos si se confirma
- IVA en el servicio: depende del estrato (estratos 1,2,3 tienen exención parcial según plan)

### Comercial / Servicios
- Información de planes: tenemos planes de internet por fibra y cable coaxial, desde básico hasta empresarial
- Cómo solicitar cambio de plan: llamar a ventas o venir a oficina con cédula
- Nueva instalación: verificamos cobertura, agenda visita técnica en 48-72 horas
- Traslado de servicio: requiere visita técnica, avisar con 5 días de anticipación
- Cancelación: debe hacerse en persona o por escrito, revisar cláusula de permanencia

### General
- Horarios de atención: L-S 7AM-8PM teléfono/WhatsApp, L-V 8AM-5PM oficina, S 8AM-12PM
- Cómo reportar falla masiva: llamar indicando dirección, también WhatsApp corporativo
- Cómo actualizar datos de contacto: llamar o ir a oficina con cédula

## CUÁNDO CREAR TICKET (needsTicket: true)
- Internet sin señal después de reiniciar correctamente 2 veces
- Luces del router en rojo persistente (falla de red externa)
- Equipo físicamente dañado o sin encender
- Corte de servicio por error (cliente pagó pero sigue cortado)
- Velocidad muy inferior al plan por más de 24 horas
- Reclamo de cobro doble confirmado
- Solicitud de nueva instalación o traslado

## REGLAS DE RESPUESTA
1. Sé conciso: máximo 200 palabras por respuesta salvo que el problema lo requiera
2. Siempre pregunta si la solución funcionó cuando das pasos técnicos
3. Nunca inventes datos técnicos, tarifas o fechas específicas
4. Si el cliente está frustrado, primero empatiza antes de dar la solución
5. Si no sabes algo, di que lo derivarás a un agente en lugar de inventar
6. Usa emojis con moderación: 🔧 🌐 💳 ✅ para hacer el texto más visual`;
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
   * Respuestas predefinidas completas para ISP — usadas cuando no hay API key o falla Gemini
   */
  getFallbackResponse(userMessage) {
    const q = userMessage.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes

    const matches = (keywords) => keywords.some(k => q.includes(k));

    // ── TÉCNICO ────────────────────────────────────────────────────────────
    if (matches(['reinici', 'apag', 'prender', 'reset router'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para reiniciar el router correctamente:

1. **Desconecta** el cable de alimentación (el que va al tomacorriente)
2. Espera **30 segundos completos**
3. Vuelve a conectar el cable
4. Espera **2–3 minutos** hasta que las luces se estabilicen
5. Verifica la conexión desde tu dispositivo

⚠️ **No presiones el botón de reset** (agujero pequeño) — eso borra toda la configuración y requiere un técnico para restaurarla.

¿Después de reiniciar recuperaste el internet?` };
    }

    if (matches(['no tengo internet', 'sin internet', 'no hay internet', 'no funciona el internet', 'perdí la conexion', 'perdi conexion', 'sin conexion', 'se fue el internet'])) {
      return { success: true, needsTicket: true, source: 'fallback', response:
`Entiendo, vamos a diagnosticar el problema paso a paso:

**Paso 1 — Verifica el router**
- ¿Las luces del router están encendidas?
- ¿La luz de "Internet" o "WAN" está **roja o apagada**?

**Paso 2 — Reinicia el router**
- Desconecta el cable de alimentación, espera 30 segundos y vuelve a conectar
- Espera 3 minutos antes de probar

**Paso 3 — Verifica cables**
- Asegúrate de que el cable coaxial o de fibra esté bien conectado al router

**Paso 4 — Prueba con otro dispositivo**
- Si otro dispositivo tampoco tiene internet, el problema es del router o la línea

Si después de estos pasos sigue sin internet, necesitamos enviar un técnico. ¿Quieres que cree un ticket de soporte?` };
    }

    if (matches(['lento', 'despacio', 'tarda', 'demora', 'baja velocidad', 'poca velocidad', 'no carga', 'buffering', 'se congela'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Si el internet está lento, prueba esto en orden:

1. **Test de velocidad:** Entra a fast.com y anota el resultado
2. **Reinicia el router:** Desconecta 30 segundos y vuelve a conectar
3. **Reduce dispositivos:** Desconecta los que no estés usando
4. **Acércate al router** o conéctate por cable Ethernet
5. **Cierra aplicaciones** que descarguen en segundo plano (actualizaciones, backups en la nube, torrents)
6. **Hora del día:** Entre 7–10 PM hay mayor demanda — es normal una ligera baja

📊 Si la velocidad en fast.com es **menor al 70%** de tu plan durante horario normal (fuera de hora pico), podemos crear un ticket técnico para revisión.

¿Cuál fue tu resultado en el test de velocidad?` };
    }

    if (matches(['wifi no aparece', 'no veo la red', 'red no aparece', 'no encuentro el wifi', 'desaparecio el wifi'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Si la red WiFi no aparece en tus dispositivos:

1. **Reinicia el router** (desconecta 30 segundos)
2. Verifica que la **luz de WiFi** del router esté encendida (puede estar apagada o parpadeando)
3. En el router, busca si hay un **botón físico de WiFi** que esté desactivado
4. Asegúrate de que tu dispositivo esté buscando redes de **2.4 GHz y 5 GHz**
5. Si tienes router doble banda, puede que solo esté activa una de las dos

Si después de reiniciar el router la luz de WiFi no enciende, podría ser una falla del equipo. ¿La luz de WiFi está encendida en tu router?` };
    }

    if (matches(['contrasena wifi', 'clave wifi', 'cambiar contrasena', 'cambiar clave wifi', 'nueva contrasena', 'password wifi'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para cambiar la contraseña de tu WiFi:

1. Abre un navegador (Chrome, Firefox, etc.)
2. En la barra de dirección escribe: **192.168.1.1** (algunos routers usan 192.168.0.1)
3. Usuario: **admin** | Contraseña: **admin** (si no la has cambiado)
4. Busca la sección **"WiFi"**, **"Wireless"** o **"Inalámbrico"**
5. Encuentra el campo **"Contraseña"** o **"Password"** o **"Clave de seguridad"**
6. Escribe tu nueva contraseña (mínimo 8 caracteres, mezcla letras y números)
7. Guarda los cambios
8. Reconecta todos tus dispositivos con la nueva clave

💡 Anota la nueva contraseña en un lugar seguro o toma una foto.

¿Pudiste acceder a la página del router?` };
    }

    if (matches(['luces', 'led', 'luz roja', 'luz verde', 'que significa la luz', 'parpadea'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Guía de luces del router PSI:

🟢 **Power (verde fija):** Router encendido y funcionando correctamente
🟢 **Internet / WAN (verde fija o parpadeando):** Conexión activa con el proveedor — **normal**
🔴 **Internet / WAN (roja):** Sin conexión al proveedor — reinicia el router; si persiste, llama a soporte
🟡 **Internet (amarilla/naranja):** Conectando, espera 2–3 minutos
🟢 **WiFi (parpadeando rápido):** Transmitiendo datos — **completamente normal**
⚪ **WiFi (apagada):** El WiFi está desactivado — busca botón WiFi o actívalo desde la configuración

**Luz roja de Internet persistente** después de reiniciar indica una falla en la línea externa que requiere técnico. ¿Cuál luz tienes encendida actualmente?` };
    }

    if (matches(['no conecta', 'no se conecta', 'no puedo conectar', 'dispositivo no conecta', 'computador no conecta', 'celular no conecta'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Pasos para resolver problemas de conexión:

**Si es un solo dispositivo:**
1. Activa y desactiva el WiFi en el dispositivo
2. "Olvidar" la red WiFi y volver a conectarte
3. Reinicia el dispositivo
4. Si es computador: desactiva y activa el adaptador de red en el panel de control
5. Verifica que estés usando la contraseña correcta

**Si son todos los dispositivos:**
1. El problema es el router — reinícialo (desconecta 30 seg)
2. Si persiste, puede ser una falla de la línea

¿El problema es con un dispositivo específico o con todos?` };
    }

    // ── FACTURACIÓN ────────────────────────────────────────────────────────
    if (matches(['pagar', 'pago', 'donde pago', 'como pago', 'metodo de pago', 'forma de pago'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Puedes pagar tu factura PSI en los siguientes canales:

🏦 **Bancos (ventanilla o app móvil):**
- Bancolombia · Davivienda · Banco de Bogotá · AV Villas

🏪 **Puntos de pago:**
- Efecty · Baloto · Su Red · Paga Todo

💻 **En línea:**
- Portal de clientes PSI (pago con tarjeta o PSE)

🏢 **Oficina PSI:**
- Pago en efectivo o tarjeta directamente

📱 **Nequi / Daviplata:** Consulta disponibilidad con nuestro equipo

El **código de pago** está impreso en tu factura física o en el correo de factura.

¿Necesitas que te explique alguno de estos métodos en detalle?` };
    }

    if (matches(['factura', 'cobro', 'deuda', 'valor factura', 'cuanto debo', 'saldo'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para consultar tu factura y estado de cuenta:

📧 **Por correo:** La factura llega al correo registrado en tu contrato 5 días antes del vencimiento (revisa también la carpeta de spam)

📞 **Por teléfono:** Llama a nuestra línea de atención con tu número de cédula o contrato

🏢 **Oficina:** Visítanos con tu documento de identidad

💡 Si tienes una **aclaración de cobro** (crees que hay un error en tu factura), es mejor llamarnos directamente para revisarlo — en casos confirmados, ajustamos la factura.

¿Tienes una pregunta específica sobre tu factura?` };
    }

    if (matches(['suspendido', 'cortado', 'suspension', 'corte', 'no tengo servicio por pago', 'reactivar', 'reconexion'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Si tu servicio está suspendido o cortado por mora:

**Para reactivar el servicio:**
1. Realiza el pago de la factura vencida (incluyendo cargos de mora si aplica)
2. Envía el comprobante de pago por WhatsApp o correo a PSI
3. La reactivación puede tomar entre **1–4 horas hábiles** después de recibir el comprobante

**Costo de reconexión:** Depende del tiempo de corte y el plan — consulta con nuestro equipo.

**¿Problemas para pagar?** Si estás en una situación difícil, llámanos *antes* del corte — podemos acordar un plan de pago.

¿Tu servicio está suspendido o cortado, y ya realizaste el pago?` };
    }

    // ── COMERCIAL ──────────────────────────────────────────────────────────
    if (matches(['planes', 'plan', 'velocidad', 'megas', 'que planes tienen', 'quiero contratar', 'nuevo servicio'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`PSI ofrece planes de internet para todos los perfiles:

🏠 **Planes Residenciales:**
- Básico: ideal para navegación y redes sociales
- Estándar: streaming HD y trabajo desde casa
- Premium: múltiples dispositivos, streaming 4K, gaming

🏢 **Planes Empresariales:**
- Con IP fija, mayor velocidad garantizada y soporte prioritario

📺 **Combos Internet + TV:** Disponibles según tu zona

Para conocer las **tarifas exactas y disponibilidad en tu dirección**, llama a nuestra línea de ventas o visita la oficina.

¿Estás buscando un plan para hogar o empresa?` };
    }

    if (matches(['instalacion', 'instalar', 'quiero instalar', 'nueva instalacion', 'contratar servicio'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para solicitar una nueva instalación de PSI:

1. **Verificar cobertura:** Llama o escríbenos con tu dirección completa
2. **Elegir plan:** Te asesoramos según tu uso y presupuesto
3. **Agendar visita técnica:** Normalmente en **48–72 horas hábiles**
4. **Instalación:** El técnico instala y configura todo el equipo
5. **Firma de contrato:** En el mismo momento de la instalación

📋 **Documentos necesarios:** Cédula del titular, contrato de arriendo o escritura si aplica

💰 **Costo de instalación:** Varía según el plan — algunos planes incluyen instalación sin costo.

¿En qué dirección necesitas el servicio?` };
    }

    if (matches(['cambiar plan', 'subir plan', 'bajar plan', 'mejorar plan', 'upgrade', 'downgrade'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para cambiar tu plan actual de PSI:

**Opciones para solicitar el cambio:**
- 📞 Llamar a nuestra línea de ventas
- 💬 WhatsApp corporativo
- 🏢 Visitar la oficina con tu cédula

**¿Cuándo aplica el cambio?**
- **Upgrade (mayor velocidad):** Puede aplicar desde el día siguiente según disponibilidad técnica
- **Downgrade (menor velocidad):** Aplica desde el siguiente período de facturación

⚠️ **Verificar permanencia:** Si tienes contrato con permanencia mínima, un downgrade puede generar penalidad. Consúltanos antes.

¿Quieres subir o bajar la velocidad de tu plan?` };
    }

    if (matches(['cancelar', 'dar de baja', 'retirar servicio', 'no quiero mas el servicio'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para cancelar el servicio de PSI:

📋 **El proceso requiere:**
1. Solicitud por escrito (en oficina o correo oficial)
2. Presentar cédula del titular del contrato
3. Devolver el equipo en buen estado (router, decodificador si aplica)
4. Estar al día con pagos pendientes

⚠️ **Cláusula de permanencia:** Si estás en período de permanencia mínima (generalmente 12 meses desde la instalación), puede aplicar una penalidad por cancelación anticipada.

Te recomendamos llamarnos primero — en muchos casos podemos solucionar el motivo de la cancelación o ofrecerte un mejor plan.

¿Hay algún problema específico que te llevó a querer cancelar?` };
    }

    if (matches(['traslado', 'cambio de direccion', 'me mudo', 'nueva direccion'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Para trasladar el servicio a una nueva dirección:

1. **Avísanos con al menos 5 días de anticipación** antes de mudarte
2. Verificamos si hay **cobertura** en la nueva dirección
3. Agendamos la visita técnica de traslado (retiro en dirección actual + instalación en nueva)
4. **Costo:** Puede tener un costo de visita técnica — consultamos según el plan

📞 Llama o escríbenos con tu nueva dirección para verificar cobertura primero.

¿Ya tienes la nueva dirección confirmada?` };
    }

    // ── GENERAL ────────────────────────────────────────────────────────────
    if (matches(['horario', 'atencion', 'cuando atienden', 'oficina', 'horario de atencion'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`Horarios de atención de PSI:

📞 **Línea telefónica:** Lunes a Sábado 7:00 AM – 8:00 PM
💬 **WhatsApp corporativo:** Lunes a Sábado 7:00 AM – 8:00 PM
🏢 **Oficina:** Lunes a Viernes 8:00 AM – 5:00 PM · Sábados 8:00 AM – 12:00 PM
🤖 **Este chatbot:** Disponible 24/7

Para **emergencias técnicas** (sin señal, falla masiva) fuera de horario, dejamos un mensaje de voz o WhatsApp y nuestro equipo responde a primera hora.` };
    }

    if (matches(['falla masiva', 'sector', 'vecinos sin internet', 'todos sin internet', 'caida masiva'])) {
      return { success: true, needsTicket: true, source: 'fallback', response:
`Si sospechas que hay una falla en tu sector:

1. **Confirma con vecinos** si también están sin internet
2. **Llama a soporte** indicando tu dirección completa
3. **WhatsApp corporativo:** Escríbenos con tu nombre, dirección y descripción del problema

Nuestro equipo técnico verifica el estado de la red en tu zona y si hay una falla masiva, despacha técnicos de inmediato.

⏱️ Las fallas masivas generalmente se resuelven en **2–6 horas** según la complejidad.

¿Confirmaste con algún vecino que también tiene el problema?` };
    }

    // ── SALUDO / GENÉRICO ──────────────────────────────────────────────────
    if (matches(['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'saludos'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`¡Hola! 👋 Bienvenido al soporte de **PSI**.

Estoy aquí para ayudarte con:
- 🔧 **Técnico:** Internet, WiFi, router, luces del equipo
- 💳 **Facturación:** Pagos, facturas, mora, reconexión
- 📦 **Servicios:** Planes, instalación, traslado, cambio de plan

¿Con qué puedo ayudarte hoy?` };
    }

    if (matches(['gracias', 'muchas gracias', 'genial', 'perfecto', 'excelente', 'ok', 'entendido', 'listo'])) {
      return { success: true, needsTicket: false, source: 'fallback', response:
`¡Con mucho gusto! 😊 Me alegra haberte podido ayudar.

Si en algún momento tienes otra consulta, no dudes en escribir. ¡Que tengas un excelente día!` };
    }

    // ── FALLBACK GENÉRICO ──────────────────────────────────────────────────
    return {
      success: true,
      source: 'fallback',
      needsTicket: false,
      response: `Entiendo tu consulta. Permíteme orientarte mejor — puedo ayudarte con:

🔧 **Técnico:** "No tengo internet", "internet lento", "cómo reinicio el router", "cambiar clave WiFi"
💳 **Facturación:** "¿dónde pago?", "mi servicio está suspendido", "no me llegó la factura"
📦 **Servicios:** "qué planes tienen", "quiero cambiar de plan", "cómo solicito una instalación"
⏰ **Atención:** "horarios", "número de contacto", "reportar falla en mi sector"

Por favor, **cuéntame con más detalle** qué problema tienes o qué necesitas, y te doy una respuesta específica.`,
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
