# INVESTIGACIÓN EXHAUSTIVA: SISTEMA DE NOTIFICACIONES EN ERP-PSI

## RESUMEN EJECUTIVO

Se ha realizado una investigación exhaustiva del sistema de notificaciones en el proyecto ERP-PSI (frontend y backend). Se han identificado **5 problemas críticos** que explican por qué las notificaciones no se están mostrando correctamente.

---

## PROBLEMAS IDENTIFICADOS

### 1️⃣ PROBLEMA CRÍTICO: Notificación NO se crea al asignar un instalador

**Severidad:** CRÍTICA  
**Ubicación:** `/backend/routes/instalaciones.js` línea 1340-1409

**Descripción:**
Cuando se asigna un instalador a una instalación existente (ruta `PATCH /:id/asignar-instalador`), el sistema:
- ✅ Actualiza la base de datos
- ✅ Devuelve la respuesta
- ❌ **NO crea una notificación para el instalador**

**Código actual (líneas 1380-1399):**
```javascript
// Actualizar
await Database.query(
  'UPDATE instalaciones SET instalador_id = ?, updated_at = NOW() WHERE id = ?',
  [instalador_id, id]
);

// Obtener actualizada
const [instalacionActualizada] = await Database.query(`...`, [id]);

res.json({
  success: true,
  message: 'Instalador asignado exitosamente',
  data: instalacionActualizada
});
// ❌ FALTA: Crear notificación aquí
```

**Impacto:**
- El instalador nunca se entera de que fue asignado una nueva instalación
- No hay notificación visible en la campana del instalador
- El instalador solo ve la instalación si va directamente a "Mis Trabajos"

**Solución requerida:**
```javascript
// Después de actualizar la instalación, agregar:
try {
  const Notificacion = require('../models/notificacion');
  await Notificacion.notificarNuevaInstalacion(
    id,
    instalacionActualizada.cliente_nombre,
    instalador_id
  );
  console.log('🔔 Notificación de instalación asignada creada');
} catch (notifError) {
  console.error('⚠️ Error creando notificación:', notifError);
}
```

---

### 2️⃣ PROBLEMA CRÍTICO: Método obtenerInstalacionCompleta duplicado

**Severidad:** ALTA  
**Ubicación:** `/backend/controllers/instalacionesController.js` líneas 526 y 1149

**Descripción:**
Hay dos definiciones del mismo método estático:

```javascript
// Línea 526: Versión con conexión (para transacciones)
static async obtenerInstalacionCompleta(connection, instalacionId) {
    const [instalaciones] = await connection.query(...);
    // ...
}

// Línea 1149: Versión sin conexión (estática)
static async obtenerInstalacionCompleta(id) {
    const [instalacion] = await Database.query(...);
    // ...
}
```

**Problema:**
En JavaScript, la segunda definición **sobrescribe** la primera. Cuando en la línea 492 se intenta llamar:
```javascript
const instalacionCreada = await this.obtenerInstalacionCompleta(connection, instalacionId);
```

Se está llamando a la segunda definición que espera solo `id`, causando que `connection` (un objeto) sea tratado como ID, lo que genera errores.

**Impacto:**
- Posibles errores al crear instalaciones
- Comportamiento impredecible
- Las instalaciones creadas podrían no obtener todos los datos completos

---

### 3️⃣ PROBLEMA: Filtrado incompleto de notificaciones por rol

**Severidad:** MEDIA  
**Ubicación:** `/backend/models/notificacion.js` línea 36-89

**Descripción:**
El método `obtenerPorUsuario` no valida correctamente si una notificación debe ser visible para un usuario según su rol.

```javascript
// Línea 61-68: Filtrado por rol débil
if (rol === 'administrador' || rol === 'supervisor') {
  // Ven todas las notificaciones de los últimos 7 días
  query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
} else if (rol === 'instalador') {
  // Ven solo ciertos tipos
  query += ' AND n.tipo IN ("nueva_instalacion", "instalacion_actualizada")';
  query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)';
}
```

**Problema:**
Las notificaciones de `nuevo_cliente` se crean con `usuario_id = null` (para todos los de ese rol). Pero la consulta actual:
```javascript
WHERE (n.usuario_id = ? OR n.usuario_id IS NULL)
```

Esto significa que **los instaladores verían notificaciones de nuevo_cliente**, lo cual no es correcto.

**Impacto:**
- Instaladores ven notificaciones que no deberían ver
- Falta validación de rol en las notificaciones globales

**Solución requerida:**
```javascript
// Agregar validación adicional:
if (rol === 'instalador') {
  query += ' AND (n.usuario_id = ? OR n.usuario_id IS NULL)'; // Cambiar lógica
  // O mejor aún, NO permitir usuario_id IS NULL para instaladores
}
```

---

### 4️⃣ PROBLEMA: Problemas de conversión de parámetros booleanos

**Severidad:** BAJA  
**Ubicación:** `/backend/controllers/notificacionesController.js` línea 13

**Descripción:**
El parámetro `leida` se pasa como booleano desde el frontend pero llega como string en la URL query.

```javascript
// Frontend: { leida: false }
// URL: ?leida=false (string)

// Backend recibe:
leida: req.query.leida !== undefined ? req.query.leida === 'true' : undefined,
// Resultado: false (porque 'false' !== 'true')
```

**Problema:**
- Poco robusta: depende de la comparación de strings
- Si alguien pasa `leida=0` o `leida=no`, no funcionará correctamente

**Solución:**
```javascript
leida: req.query.leida !== undefined ? 
  (req.query.leida === 'true' || req.query.leida === '1' || req.query.leida === 'on')
  : undefined,
```

---

### 5️⃣ PROBLEMA: No hay notificación cuando se crea usuario/instalador

**Severidad:** MEDIA  
**Ubicación:** `/backend/controllers/` (usuarios/instaladores)

**Descripción:**
Cuando se crea un nuevo usuario de tipo "instalador", no se envía notificación a administradores/supervisores informándoles.

**Impacto:**
- Falta de notificación cuando se agrega nuevo instalador al sistema
- Los administradores no se enteran automáticamente

---

## FLUJO ACTUAL DE NOTIFICACIONES

### Backend - Creación de Notificaciones:

1. **Cuando se crea un nuevo CLIENTE**
   - Ubicación: `/backend/controllers/clienteController.js` línea 395-397
   - Se llama: `Notificacion.notificarNuevoCliente(clienteId, nombre)`
   - Resultado: Notificación global (`usuario_id = null`) para admin/supervisor

2. **Cuando se crea una nueva INSTALACIÓN**
   - Ubicación: `/backend/controllers/instalacionesController.js` línea 496-498
   - Se llama: `Notificacion.notificarNuevaInstalacion(instalacionId, clienteNombre, instalador_id)`
   - Resultado: Si hay instalador, notificación específica; si no, global

3. **Cuando se ASIGNA INSTALADOR a instalación existente**
   - ❌ **NO HAY NOTIFICACIÓN** (Problema 1)

### Backend - Obtención de Notificaciones:

1. **Endpoint:** `GET /api/v1/notificaciones`
2. **Controller:** `notificacionesController.obtenerNotificaciones()`
3. **Filtros aplicados:**
   - Admin/Supervisor: Últimos 7 días, todos los tipos
   - Instalador: Últimos 3 días, solo `nueva_instalacion` y `instalacion_actualizada`
4. **Problema:** No valida correctamente si el usuario debería ver notificaciones globales

### Frontend - Mostrar Notificaciones:

1. **Componente:** `/frontend/src/components/Notificaciones/NotificationBell.js`
2. **Polling:** Cada 30 segundos via `fetchCount()`
3. **Obtención:** Al abrir panel, llama `fetchNotificaciones()`
4. **Servicio:** `/frontend/src/services/notificacionesService.js`
5. **Mensaje "No tienes notificaciones nuevas":** Línea 221

---

## TABLA DE ARCHIVOS RELEVANTES

| Archivo | Ubicación | Función | Problema |
|---------|-----------|---------|----------|
| `notificacion.js` | `/backend/models/` | Modelo de datos | Problema 3 |
| `notificacionesController.js` | `/backend/controllers/` | Controlador API | Problema 4 |
| `notificaciones.js` | `/backend/routes/` | Rutas API | ✅ Bien |
| `instalacionesController.js` | `/backend/controllers/` | CRUD instalaciones | Problema 2 |
| `instalaciones.js` | `/backend/routes/` | Rutas instalaciones | Problema 1 |
| `clienteController.js` | `/backend/controllers/` | CRUD clientes | ✅ Bien |
| `NotificationBell.js` | `/frontend/src/components/Notificaciones/` | UI campanita | ✅ Bien (display correcto) |
| `notificacionesService.js` | `/frontend/src/services/` | API client | ✅ Bien |

---

## ENDPOINTS DE NOTIFICACIONES

| Método | Ruta | Función | Estado |
|--------|------|---------|--------|
| GET | `/api/v1/notificaciones` | Obtener notificaciones | ✅ Funciona |
| GET | `/api/v1/notificaciones/count` | Contar no leídas | ✅ Funciona |
| PUT | `/api/v1/notificaciones/:id/read` | Marcar como leída | ✅ Funciona |
| PUT | `/api/v1/notificaciones/mark-all-read` | Marcar todas leídas | ✅ Funciona |
| DELETE | `/api/v1/notificaciones/:id` | Eliminar | ✅ Funciona |
| POST | `/api/v1/notificaciones` | Crear (admin) | ✅ Funciona |

---

## ESQUEMA DE BASE DE DATOS

```sql
CREATE TABLE notificaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NULL,              -- NULL = para todos del rol
  tipo VARCHAR(50) NOT NULL,         -- nuevo_cliente, nueva_instalacion, etc
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON NULL,       -- { cliente_id, instalacion_id, etc }
  leida TINYINT(1) DEFAULT 0,
  fecha_lectura DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tipo (tipo),
  INDEX idx_leida (leida),
  FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id)
);
```

---

## RECOMENDACIONES

### Inmediatas (Críticas):
1. **Agregar notificación al asignar instalador** (Problema 1)
2. **Resolver conflicto de métodos duplicados** (Problema 2)
3. **Mejorar validación de rol para notificaciones globales** (Problema 3)

### Corto plazo:
4. Mejorar manejo de parámetros booleanos
5. Agregar notificaciones para creación de usuarios
6. Agregar tests para verificar creación de notificaciones

### Largo plazo:
- Implementar WebSocket en lugar de polling (más eficiente)
- Agregar preferencias de notificaciones por usuario
- Sistema de notificaciones por email para eventos importantes
- Notificaciones push del navegador

---

## PASOS PARA VERIFICAR

1. **Crear nueva instalación sin instalador:** ✅ Deberá crear notificación global
2. **Asignar instalador a instalación:** ❌ NO creará notificación (Problema 1)
3. **Como instalador, verificar notificaciones:** Verá la creada en paso 1, pero no la del paso 2
4. **Verificar "No tienes notificaciones nuevas":** Aparece correctamente (línea 221 NotificationBell.js)
5. **Polling cada 30 segundos:** Funciona correctamente

