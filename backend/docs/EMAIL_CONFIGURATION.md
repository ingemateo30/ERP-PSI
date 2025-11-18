# Configuración de Envío de Correos Electrónicos

## Descripción

Este documento describe cómo configurar el sistema de envío de correos electrónicos para el ERP PSI, incluyendo el envío de correos de bienvenida con factura y contrato adjuntos al crear nuevos clientes.

## Características Implementadas

### ✅ Correo de Bienvenida
- Se envía automáticamente al crear un nuevo cliente
- Incluye mensaje personalizado con datos del cliente
- Adjunta la primera factura en formato PDF
- Adjunta el contrato de servicios en formato PDF
- Usa plantillas HTML personalizables desde la base de datos

### ✅ Funcionalidades Adicionales del EmailService
- Envío de facturas individuales
- Notificaciones de vencimiento de facturas
- Notificaciones a administradores
- Sistema de plantillas con variables reemplazables

## Configuración Paso a Paso

### 1. Instalar Dependencias

Las dependencias ya están instaladas. Verificar con:

```bash
cd backend
npm list nodemailer
```

### 2. Configurar Variables de Entorno

Crear el archivo `.env` en la carpeta `backend/` basándose en `.env.example`:

```bash
cp .env.example .env
```

#### Configuración para Gmail:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
EMAIL_FROM=noreply@psi.com
EMAIL_FROM_NAME=PSI Telecomunicaciones
EMAIL_ADMIN=admin@psi.com
```

**Importante para Gmail:**
1. Habilita la verificación en 2 pasos en tu cuenta de Google
2. Ve a: https://myaccount.google.com/apppasswords
3. Genera una "Contraseña de aplicación" para "Correo"
4. Usa esa contraseña (16 caracteres) en `EMAIL_PASSWORD`

#### Configuración para SendGrid:

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=tu_sendgrid_api_key
EMAIL_FROM=noreply@psi.com
EMAIL_FROM_NAME=PSI Telecomunicaciones
EMAIL_ADMIN=admin@psi.com
```

#### Configuración para Mailgun:

```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_usuario_mailgun
EMAIL_PASSWORD=tu_contraseña_mailgun
EMAIL_FROM=noreply@psi.com
EMAIL_FROM_NAME=PSI Telecomunicaciones
EMAIL_ADMIN=admin@psi.com
```

### 3. Ejecutar Migración de Base de Datos

Ejecutar el script SQL para crear la plantilla de bienvenida:

```bash
mysql -u root -p erp_psi < migrations/add_welcome_email_template.sql
```

O ejecutarlo desde MySQL Workbench/phpMyAdmin copiando el contenido del archivo:
```
backend/migrations/add_welcome_email_template.sql
```

### 4. Verificar Configuración

Puedes verificar que la plantilla se creó correctamente:

```sql
SELECT * FROM plantillas_correo WHERE tipo = 'bienvenida';
```

### 5. Reiniciar el Servidor

```bash
cd backend
npm start
```

## Uso

### Envío Automático al Crear Cliente

El correo se envía automáticamente cuando:
1. Se crea un nuevo cliente desde el formulario web
2. La opción "Enviar correo de bienvenida" está marcada
3. El cliente tiene un correo electrónico válido
4. Las credenciales de email están configuradas

### Envío Manual Programático

```javascript
const EmailService = require('./services/EmailService');

// Enviar correo de bienvenida
await EmailService.enviarCorreoBienvenida(clienteId, datosCliente);

// Enviar factura específica
await EmailService.enviarFactura(facturaId, 'email@example.com');

// Enviar notificación de vencimiento
await EmailService.enviarNotificacionVencimiento(facturaId);

// Enviar notificación a administradores
await EmailService.enviarNotificacionAdmin(
  'Título del mensaje',
  'Contenido del mensaje',
  { dato1: 'valor1', dato2: 'valor2' }
);
```

## Personalización de Plantillas

### Variables Disponibles

Las plantillas soportan las siguientes variables que se reemplazan automáticamente:

- `{{nombre_cliente}}` - Nombre completo del cliente
- `{{fecha_actual}}` - Fecha actual formateada
- `{{empresa_nombre}}` - Nombre de la empresa (de configuración_empresa)
- `{{telefono_soporte}}` - Teléfono de soporte
- `{{numero_factura}}` - Número de la primera factura
- `{{numero_contrato}}` - Número del contrato
- `{{valor_factura}}` - Valor de la factura (para notificaciones)
- `{{fecha_vencimiento}}` - Fecha de vencimiento (para notificaciones)

### Editar Plantilla desde la Base de Datos

```sql
UPDATE plantillas_correo
SET
  asunto = 'Nuevo asunto del correo',
  contenido = '<html>... nuevo HTML ...</html>',
  activo = 1
WHERE tipo = 'bienvenida';
```

### Crear Nuevas Plantillas

```sql
INSERT INTO plantillas_correo (titulo, asunto, contenido, tipo, activo, created_at, updated_at)
VALUES (
  'Notificación de Corte',
  'Aviso de suspensión de servicio',
  '<html>... contenido HTML ...</html>',
  'corte',
  1,
  NOW(),
  NOW()
);
```

## Estructura de Archivos

```
backend/
├── services/
│   ├── EmailService.js              # Servicio principal de correos
│   └── ClienteCompletoService.js    # Integración con creación de clientes
├── utils/
│   ├── pdfGenerator.js              # Generador de PDFs de facturas
│   └── ContratoPDFGenerator.js      # Generador de PDFs de contratos
├── migrations/
│   └── add_welcome_email_template.sql  # Script de migración
├── docs/
│   └── EMAIL_CONFIGURATION.md       # Esta documentación
├── .env.example                     # Ejemplo de configuración
└── package.json                     # Dependencias (nodemailer incluido)
```

## Solución de Problemas

### Error: "Configuration de email no disponible"

**Causa:** Falta configuración en el archivo `.env`

**Solución:**
1. Verifica que existe el archivo `.env` en `backend/`
2. Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` están configurados
3. Reinicia el servidor

### Error: "Invalid login" o "Authentication failed" con Gmail

**Causa:** Usando contraseña normal en lugar de contraseña de aplicación

**Solución:**
1. Habilita verificación en 2 pasos en tu cuenta de Google
2. Genera una contraseña de aplicación: https://myaccount.google.com/apppasswords
3. Usa esa contraseña de 16 caracteres en `EMAIL_PASSWORD`

### Error: "Client sin correo electrónico"

**Causa:** El cliente no tiene un correo registrado

**Solución:**
1. Asegúrate de que el campo "email" o "correo" está lleno al crear el cliente
2. El sistema registrará el intento fallido pero no bloqueará la creación del cliente

### Correos no se envían pero no hay errores

**Causa:** Puede estar en modo de prueba

**Solución:**
1. Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` están configurados en `.env`
2. Verifica los logs del servidor para mensajes de advertencia
3. Prueba con un servicio como SendGrid o Mailgun si Gmail no funciona

### PDFs no se adjuntan

**Causa:** Error generando los PDFs

**Solución:**
1. Verifica que existen los archivos:
   - `backend/utils/pdfGenerator.js`
   - `backend/utils/ContratoPDFGenerator.js`
2. Verifica que la factura y contrato se crearon correctamente en la base de datos
3. Revisa los logs para ver errores específicos de generación de PDF

## Monitoreo y Logs

El sistema registra todos los intentos de envío en la tabla `notificaciones`:

```sql
SELECT
  tipo,
  destinatario,
  asunto,
  estado,
  created_at
FROM notificaciones
WHERE tipo = 'email_bienvenida'
ORDER BY created_at DESC
LIMIT 10;
```

Estados posibles:
- `enviado` - Correo enviado exitosamente
- `fallido` - Error en el envío
- `pendiente` - En cola de envío (si se implementa cola)

## Mejoras Futuras

- [ ] Implementar cola de correos con Bull o similar
- [ ] Agregar reintentos automáticos en caso de fallo
- [ ] Implementar tracking de apertura de correos
- [ ] Agregar estadísticas de envío
- [ ] Implementar webhooks para notificaciones de entrega

## Soporte

Si necesitas ayuda adicional:
1. Revisa los logs del servidor
2. Verifica la configuración de variables de entorno
3. Consulta la documentación de nodemailer: https://nodemailer.com/
4. Verifica que el servicio de correo elegido permita el envío desde aplicaciones

---

**Última actualización:** 2025-11-18
**Versión del documento:** 1.0
