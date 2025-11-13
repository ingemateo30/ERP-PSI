# 🤖 Asistente IA de Soporte - ERP-PSI

Sistema de soporte con chatbot de Inteligencia Artificial para resolver problemas básicos de clientes y crear tickets automáticamente cuando se requiera atención especializada.

---

## 📋 Características

✅ **Chatbot con IA Gratuita**
- Usa Google Gemini API (gratuita - 60 requests/min)
- Responde preguntas sobre problemas técnicos, facturación y servicios
- Funciona sin API key con respuestas predefinidas inteligentes

✅ **Página Pública de Soporte**
- No requiere login ni autenticación
- Accesible en: `/soporte`
- Diseño moderno y responsive

✅ **Solución de Problemas Básicos**
- Reinicio de router
- Problemas de conexión
- Cambio de contraseña WiFi
- Consultas de facturación
- Información sobre planes

✅ **Creación Automática de PQR**
- Detecta problemas complejos automáticamente
- Crea tickets con historial de conversación
- Integrado con sistema PQR existente

✅ **FAQs Interactivas**
- Preguntas frecuentes por categorías
- Sistema de valoración (útil/no útil)
- Búsqueda y filtros

---

## 🚀 Instalación

### 1. Backend

Instalar dependencias necesarias:

```bash
cd backend
npm install @google/generative-ai uuid
```

### 2. Base de Datos

Ejecutar el script de migración:

```bash
mysql -u root -p base_psi < backend/migrations/add_soporte_chatbot.sql
```

O importar manualmente desde phpMyAdmin/MySQL Workbench.

### 3. Configuración de API (Opcional)

Para usar Google Gemini API (recomendado):

1. Obtener API Key gratuita: https://ai.google.dev/
2. Agregar al archivo `.env` del backend:

```env
# API de Google Gemini (Opcional - Gratis)
GEMINI_API_KEY=tu_api_key_aqui
```

**Nota:** Si no configuras la API key, el sistema funcionará con respuestas predefinidas inteligentes.

### 4. Frontend

No se requieren dependencias adicionales en el frontend. Todas las librerías necesarias ya están instaladas.

---

## 📁 Archivos Creados

### Backend

```
backend/
├── controllers/
│   └── soporteController.js          # Controlador principal del chatbot
├── routes/
│   └── soporte.js                    # Rutas API públicas
├── services/
│   └── geminiService.js              # Servicio de IA (Google Gemini)
└── migrations/
    └── add_soporte_chatbot.sql       # Script de base de datos
```

### Frontend

```
frontend/src/
├── components/Soporte/
│   ├── SoportePage.js                # Página pública de soporte
│   └── ChatBot.js                    # Componente del chatbot
└── services/
    └── soporteService.js             # Servicio API para soporte
```

---

## 🎯 Uso

### Para Usuarios/Clientes

1. Acceder a: `http://tu-dominio/soporte`
2. Hacer clic en "Hablar con Asistente"
3. Escribir el problema o consulta
4. El chatbot responderá con soluciones
5. Si el problema es complejo, se puede crear un ticket

### Para Administradores

Los tickets creados desde el chatbot:
- Aparecen en el módulo PQR del sistema
- Tienen categoría automática según tipo de consulta
- Incluyen historial completo de la conversación
- Se marcan con medio de recepción: "chat"

---

## 🔧 API Endpoints

Todas las rutas son **públicas** (no requieren autenticación):

```
POST   /api/v1/soporte/chat              # Enviar mensaje al chatbot
POST   /api/v1/soporte/ticket            # Crear ticket desde chat
POST   /api/v1/soporte/resolved          # Marcar problema como resuelto
GET    /api/v1/soporte/faqs              # Obtener FAQs
POST   /api/v1/soporte/faqs/:id/view     # Registrar vista de FAQ
POST   /api/v1/soporte/faqs/:id/useful   # Marcar FAQ como útil
POST   /api/v1/soporte/session/end       # Finalizar sesión
GET    /api/v1/soporte/statistics        # Estadísticas del chatbot
```

---

## 📊 Base de Datos

### Tablas Creadas

1. **`soporte_chat_historico`**
   - Almacena todos los mensajes del chatbot
   - Incluye tipo de consulta y satisfacción

2. **`soporte_chat_sesiones`**
   - Sesiones de chat con duración y estado
   - Métricas de problemas resueltos

3. **`soporte_faq`**
   - Preguntas frecuentes por categoría
   - Sistema de métricas (vistas, útil)

4. **`soporte_problemas_comunes`**
   - Base de conocimiento de problemas
   - Soluciones paso a paso

### Datos Iniciales

El script incluye:
- 8 FAQs predefinidas
- 5 problemas comunes con soluciones
- Índices de búsqueda fulltext
- Vistas para estadísticas

---

## 🎨 Funcionalidades del Chatbot

### Problemas que Resuelve Automáticamente

| Problema | Solución Automática |
|----------|-------------------|
| Reinicio de router | Pasos detallados |
| Sin internet | Diagnóstico básico |
| Internet lento | Optimización WiFi |
| Cambio de contraseña WiFi | Guía paso a paso |
| Consulta de factura | Información y métodos de pago |
| Consulta de plan | Detalles del servicio |

### Problemas que Derivan a Ticket

- Fallas de hardware
- Problemas de infraestructura
- Configuraciones avanzadas
- Reclamos complejos de facturación
- Solicitudes de instalación

---

## 🔒 Seguridad

✅ **Validaciones Implementadas**
- Validación de inputs con `express-validator`
- Límite de caracteres en mensajes (1000)
- Sanitización de datos

✅ **Sin Autenticación Requerida**
- Sesiones anónimas con UUID
- No expone datos sensibles
- Rate limiting recomendado para producción

---

## 📈 Métricas y Estadísticas

El sistema registra automáticamente:
- Total de conversaciones
- Problemas resueltos vs derivados
- Satisfacción de usuarios
- FAQs más consultadas
- Tiempo promedio de sesión
- Tipo de consultas (técnica, facturación, comercial)

Acceder a estadísticas:
```
GET /api/v1/soporte/statistics?desde=2025-01-01&hasta=2025-12-31
```

---

## 🚀 Próximos Pasos (Opcional)

### Mejoras Recomendadas

1. **Rate Limiting**
   ```bash
   npm install express-rate-limit
   ```

2. **Análisis de Sentimiento**
   - Detectar clientes frustrados
   - Priorizar tickets automáticamente

3. **Integración con WhatsApp**
   - Usar Twilio API
   - Chatbot en WhatsApp Business

4. **Aprendizaje Automático**
   - Entrenar modelo con conversaciones exitosas
   - Mejorar tasa de resolución

5. **Notificaciones en Tiempo Real**
   - WebSockets para chat en vivo
   - Notificar agentes cuando se crea ticket

---

## 🐛 Troubleshooting

### El chatbot no responde

1. Verificar que el backend esté corriendo
2. Revisar console del navegador
3. Verificar conectividad de red
4. Si usa Gemini API, verificar la key

### Error al crear tablas

```sql
-- Verificar que las tablas no existan
SHOW TABLES LIKE 'soporte_%';

-- Si existen, eliminar y volver a crear
DROP TABLE IF EXISTS soporte_chat_historico;
DROP TABLE IF EXISTS soporte_chat_sesiones;
DROP TABLE IF EXISTS soporte_faq;
DROP TABLE IF EXISTS soporte_problemas_comunes;
```

### Problemas con CORS

Agregar al backend `.env`:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://tu-dominio.com
```

---

## 📝 Personalización

### Agregar Nuevas FAQs

```sql
INSERT INTO soporte_faq (pregunta, respuesta, categoria, palabras_clave, orden)
VALUES (
  '¿Tu pregunta?',
  'Tu respuesta detallada',
  'tecnica',
  'palabras,clave,busqueda',
  10
);
```

### Modificar Respuestas del Bot

Editar: `backend/services/geminiService.js`

```javascript
// Modificar el systemContext para cambiar personalidad del bot
this.systemContext = `Tu propio prompt...`;

// Agregar respuestas predefinidas
const responses = {
  'tu_keyword': {
    text: 'Tu respuesta personalizada',
    needsTicket: false
  }
};
```

---

## 📞 Soporte

Para consultas sobre este sistema:
- Revisar código en: `backend/controllers/soporteController.js`
- Documentación API: Rutas en `backend/routes/soporte.js`
- Frontend: `frontend/src/components/Soporte/`

---

## 📄 Licencia

Este módulo es parte del sistema ERP-PSI y sigue la misma licencia del proyecto principal.

---

## 🎉 Créditos

- **Google Gemini API**: IA conversacional gratuita
- **React + Tailwind CSS**: Frontend moderno
- **Express + MySQL**: Backend robusto

---

**Versión:** 1.0.0
**Fecha:** Noviembre 2025
**Estado:** ✅ Producción Ready
