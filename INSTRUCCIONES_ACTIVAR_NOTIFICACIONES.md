# Instrucciones para Activar el Sistema de Notificaciones

## Problema Actual
El sistema de notificaciones está implementado pero el backend en producción necesita ser actualizado.

## Solución - Pasos a seguir:

### 1. Conectarse al servidor de producción

```bash
ssh usuario@45.173.69.5
```

### 2. Ir al directorio del proyecto

```bash
cd /ruta/del/proyecto/ERP-PSI
```

### 3. Hacer pull de los cambios

```bash
git pull origin claude/add-notification-bell-011CV62bHhrLxR2YokA6X3V1
```

### 4. Crear la tabla de notificaciones en la base de datos

**Opción A - Usando el script automático:**
```bash
cd backend
node migrations/run_migration.js
```

**Opción B - Manualmente con MySQL:**
```bash
mysql -u root -p base_psi < backend/migrations/create_notificaciones_table.sql
```

**Opción C - Desde phpMyAdmin o cualquier cliente MySQL:**
Ejecutar el siguiente SQL:

```sql
CREATE TABLE IF NOT EXISTS notificaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NULL COMMENT 'NULL significa para todos los usuarios con ese rol',
  tipo VARCHAR(50) NOT NULL COMMENT 'nuevo_cliente, nueva_instalacion, instalacion_actualizada, etc',
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON NULL COMMENT 'Información adicional como IDs, enlaces, etc',
  leida TINYINT(1) DEFAULT 0,
  fecha_lectura DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tipo (tipo),
  INDEX idx_leida (leida),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. Verificar que la tabla se creó

```bash
mysql -u root -p base_psi -e "DESCRIBE notificaciones;"
```

Deberías ver la estructura de la tabla.

### 6. Reiniciar el backend

**Si estás usando PM2:**
```bash
pm2 restart backend
# o
pm2 restart all
```

**Si estás usando systemd:**
```bash
sudo systemctl restart erp-backend
```

**Si estás usando screen o tmux:**
```bash
# Encontrar el proceso
ps aux | grep node | grep index.js

# Matar el proceso (reemplaza XXXX con el PID)
kill XXXX

# Iniciar de nuevo
cd /ruta/del/proyecto/ERP-PSI/backend
node index.js
# o
screen -S backend
node index.js
# Ctrl+A, D para detach
```

**Si está corriendo directamente:**
```bash
# Encontrar el proceso
ps aux | grep "node index.js"

# Matar el proceso
pkill -f "node index.js"

# Iniciar de nuevo
cd backend
node index.js &
```

### 7. Verificar que el backend está corriendo con las nuevas rutas

```bash
curl http://45.173.69.5/api/v1/notificaciones/count \
  -H "Authorization: Bearer TU_TOKEN_JWT"
```

Si recibes una respuesta JSON (no 404), las rutas están funcionando correctamente.

### 8. Verificar en el navegador

1. Recargar la aplicación frontend (F5)
2. La campanita debería funcionar sin errores 404
3. Crear un cliente nuevo para probar
4. Ver que aparece la notificación

## Troubleshooting

### Error: "Cannot find module"
```bash
cd backend
npm install
```

### Error: "Table already exists"
Esto es normal si ya ejecutaste la migración. Puedes ignorarlo.

### Error: "Access denied for user"
Verifica las credenciales de MySQL en el archivo `.env`:
```bash
cd backend
cat .env | grep DB_
```

### Las notificaciones no aparecen
1. Verifica que la tabla existe: `DESCRIBE notificaciones;`
2. Verifica que el backend está corriendo: `ps aux | grep node`
3. Verifica los logs del backend
4. Abre la consola del navegador (F12) y busca errores

## Resumen de Cambios

Los siguientes archivos fueron modificados/creados:
- `backend/models/notificacion.js` (nuevo)
- `backend/controllers/notificacionesController.js` (nuevo)
- `backend/routes/notificaciones.js` (nuevo)
- `backend/migrations/create_notificaciones_table.sql` (nuevo)
- `backend/index.js` (modificado - agregada ruta de notificaciones)
- `backend/controllers/clienteController.js` (modificado - crea notificaciones)
- `backend/controllers/instalacionesController.js` (modificado - crea notificaciones)
- `frontend/src/components/Notificaciones/NotificationBell.js` (nuevo)
- `frontend/src/components/Layout/MainLayout.js` (modificado - integra campanita)

## ¿Necesitas ayuda?

Si tienes problemas, revisa:
1. Los logs del backend
2. La consola del navegador (F12)
3. El archivo `NOTIFICACIONES_README.md` para más detalles
