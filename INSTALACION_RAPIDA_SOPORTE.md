# 🚀 Instalación Rápida - Asistente IA de Soporte

## Pasos para Activar el Sistema

### 1️⃣ Instalar Dependencias Backend

```bash
cd backend
npm install @google/generative-ai uuid
```

### 2️⃣ Ejecutar Script de Base de Datos

**Opción A - Línea de comandos:**
```bash
mysql -u root -p base_psi < backend/migrations/add_soporte_chatbot.sql
```

**Opción B - phpMyAdmin:**
1. Abrir phpMyAdmin
2. Seleccionar base de datos `base_psi`
3. Ir a "Importar"
4. Seleccionar archivo: `backend/migrations/add_soporte_chatbot.sql`
5. Ejecutar

### 3️⃣ Configurar API de Gemini (Opcional pero Recomendado)

1. Obtener API Key gratuita:
   - Ir a: https://ai.google.dev/
   - Hacer clic en "Get API Key"
   - Crear proyecto y copiar la key

2. Agregar al archivo `backend/.env`:
   ```env
   # API de Google Gemini (Gratis - 60 requests/min)
   GEMINI_API_KEY=AIzaSy...tu_key_aqui
   ```

**Nota:** Si no configuras la key, el chatbot funcionará con respuestas predefinidas.

### 4️⃣ Reiniciar el Backend

```bash
# Si estás en desarrollo
npm run dev

# Si estás en producción
pm2 restart backend
```

### 5️⃣ Acceder al Sistema

Abrir en el navegador:
```
http://localhost:3000/soporte
```

O en producción:
```
http://tu-dominio.com/soporte
```

---

## ✅ Verificación

### Verificar Tablas en BD

```sql
USE base_psi;
SHOW TABLES LIKE 'soporte_%';
```

Deberías ver:
- ✅ soporte_chat_historico
- ✅ soporte_chat_sesiones
- ✅ soporte_faq
- ✅ soporte_problemas_comunes

### Verificar FAQs Cargadas

```sql
SELECT COUNT(*) FROM soporte_faq;
```

Resultado esperado: `8 rows`

### Probar API

```bash
curl -X GET http://localhost:3000/api/v1/soporte/faqs
```

---

## 🎯 Funcionalidades Listas

✅ Página pública de soporte: `/soporte`
✅ Chatbot con IA (o respuestas predefinidas)
✅ 8 FAQs precargadas
✅ 5 problemas comunes con soluciones
✅ Creación automática de PQR
✅ Sistema de satisfacción de usuario
✅ Estadísticas y métricas

---

## 📊 Datos Precargados

### Preguntas Frecuentes (8)
1. ¿Cómo reinicio mi router?
2. ¿Qué hago si no tengo señal de internet?
3. ¿Cómo cambio mi contraseña del WiFi?
4. ¿Cuándo vence mi factura?
5. ¿Cómo puedo pagar mi factura?
6. Mi internet está lento, ¿qué hago?
7. ¿Qué plan de internet tengo contratado?
8. ¿Cómo solicito un cambio de plan?

### Problemas Comunes (5)
1. Reinicio de Router (paso a paso)
2. Verificación de Cables
3. Optimización de WiFi
4. Problema de Autenticación
5. Corte Masivo del Servicio

---

## 🔧 Configuración Avanzada (Opcional)

### Cambiar Límites de Gemini

Editar: `backend/services/geminiService.js`

```javascript
generationConfig: {
  maxOutputTokens: 500,  // Cambiar aquí
  temperature: 0.7,      // Creatividad (0-1)
  topP: 0.8,
  topK: 40,
}
```

### Personalizar Respuestas

Editar: `backend/services/geminiService.js`

```javascript
this.systemContext = `
Eres un asistente virtual...
[Personalizar aquí]
`;
```

---

## 🐛 Problemas Comunes

### Error: "Cannot find module '@google/generative-ai'"
**Solución:**
```bash
cd backend
npm install @google/generative-ai
```

### Error: "Table 'soporte_chat_historico' doesn't exist"
**Solución:**
```bash
mysql -u root -p base_psi < backend/migrations/add_soporte_chatbot.sql
```

### El chatbot no responde
**Solución:**
1. Abrir DevTools (F12)
2. Ver console y Network
3. Verificar que backend esté corriendo en puerto 3000

### CORS Error
**Solución:**
Agregar al `backend/.env`:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://tu-dominio.com
```

---

## 📞 URLs Importantes

| Recurso | URL |
|---------|-----|
| Página de Soporte | `/soporte` |
| API FAQs | `/api/v1/soporte/faqs` |
| API Chat | `/api/v1/soporte/chat` |
| Estadísticas | `/api/v1/soporte/statistics` |

---

## ✅ Todo Listo!

El sistema de Asistente IA de Soporte está completamente funcional.

**Próximo paso:** Prueba accediendo a `/soporte` y chatea con el asistente! 🎉

Para más información, ver: `ASISTENTE_SOPORTE_README.md`
