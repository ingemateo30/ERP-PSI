# Pasos para Activar el Envío de Correos

## 1. Ejecutar la Migración SQL

Primero, ejecuta la migración para crear la plantilla de correo en la base de datos:

```bash
mysql -u tu_usuario -p erp_psi < backend/migrations/add_welcome_email_template.sql
```

O si usas phpMyAdmin/MySQL Workbench, copia y ejecuta el contenido del archivo:
`backend/migrations/add_welcome_email_template.sql`

Verificar que se creó:
```sql
SELECT * FROM plantillas_correo WHERE tipo = 'bienvenida';
```

## 2. Configurar Variables de Entorno

Crea el archivo `backend/.env` (si no existe) con las siguientes variables:

### Para Gmail (RECOMENDADO para pruebas):

```env
# Base de datos (probablemente ya las tienes)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=erp_psi
DB_PORT=3306

# Email - CONFIGURACIÓN OBLIGATORIA
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=mateo.s3009@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion_aqui
EMAIL_FROM=noreply@psi.com
EMAIL_FROM_NAME=PSI Telecomunicaciones
EMAIL_ADMIN=mateo.s3009@gmail.com

# JWT (probablemente ya lo tienes)
JWT_SECRET=tu_secreto_aqui
PORT=3001
```

### ⚠️ IMPORTANTE - Configurar Gmail:

1. Ve a tu cuenta de Google: https://myaccount.google.com/security
2. Habilita "Verificación en 2 pasos"
3. Ve a "Contraseñas de aplicaciones": https://myaccount.google.com/apppasswords
4. Genera una contraseña de aplicación para "Correo"
5. Copia esa contraseña de 16 caracteres (ejemplo: "abcd efgh ijkl mnop")
6. Pégala en `EMAIL_PASSWORD` **sin espacios**: `abcdefghijklmnop`

## 3. Reiniciar el Servidor

```bash
cd backend
npm start
# O si usas PM2:
pm2 restart backend
```

## 4. Probar el Envío

Crea un nuevo cliente y asegúrate de:
- ✅ Marcar la opción "Enviar correo de bienvenida"
- ✅ Ingresar un email válido en el campo "email" del cliente
- ✅ Revisar los logs del servidor

Deberías ver en los logs:
```
📧 Enviando correo de bienvenida...
✅ PDF de factura generado: FAC000XXX
✅ PDF de contrato generado: CON-2025-000XXX
📤 Enviando correo a: email@example.com
✅ Correo de bienvenida enviado exitosamente: <message-id>
```

## Verificar Estado

### Ver en la base de datos si se registró el envío:
```sql
SELECT * FROM notificaciones
WHERE tipo = 'email_bienvenida'
ORDER BY created_at DESC
LIMIT 5;
```

### Troubleshooting

**Si ves "⚠️ Configuración de email no encontrada":**
- Verifica que el archivo `.env` exista en `backend/.env`
- Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` estén configurados
- Reinicia el servidor

**Si ves "Error: Invalid login":**
- Estás usando tu contraseña normal de Gmail
- Necesitas usar una "Contraseña de aplicación" (ver paso 2)

**Si no ves ningún log de email:**
- Ejecuta `git pull` y reinicia el servidor
- Verifica que la opción "enviar_bienvenida" esté marcada en el frontend
