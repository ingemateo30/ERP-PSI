# Sistema de Notificaciones Push

## Descripción

Se ha implementado un sistema completo de notificaciones push en tiempo real para la aplicación ERP-PSI. El sistema notifica a los usuarios sobre:

- **Nuevos clientes registrados** - Visible para Administradores y Supervisores
- **Nuevas instalaciones programadas** - Visible para Administradores, Supervisores e Instaladores

## Componentes Implementados

### Backend

#### 1. Modelo de Notificaciones (`backend/models/notificacion.js`)
- Gestión completa de notificaciones
- Métodos para crear, leer, actualizar y eliminar notificaciones
- Filtrado por rol de usuario
- Métodos específicos para notificar nuevos clientes e instalaciones

#### 2. Controlador de Notificaciones (`backend/controllers/notificacionesController.js`)
- `GET /api/v1/notificaciones` - Obtener notificaciones del usuario
- `GET /api/v1/notificaciones/count` - Contar notificaciones no leídas
- `PUT /api/v1/notificaciones/:id/read` - Marcar como leída
- `PUT /api/v1/notificaciones/mark-all-read` - Marcar todas como leídas
- `DELETE /api/v1/notificaciones/:id` - Eliminar notificación
- `POST /api/v1/notificaciones` - Crear notificación (solo admin)

#### 3. Rutas (`backend/routes/notificaciones.js`)
- Endpoints configurados y protegidos con autenticación

#### 4. Integración en Controladores
- **ClienteController**: Crea notificación automática al registrar nuevo cliente
- **InstalacionesController**: Crea notificación automática al programar instalación

### Frontend

#### 1. Componente NotificationBell (`frontend/src/components/Notificaciones/NotificationBell.js`)
- Campanita interactiva en el header
- Badge con contador de notificaciones no leídas
- Panel desplegable con lista de notificaciones
- Acciones: marcar como leída, eliminar, marcar todas como leídas
- Navegación automática al hacer clic en notificación
- Polling automático cada 30 segundos
- Formateo de fechas relativas (hace X minutos/horas/días)

#### 2. Integración en MainLayout
- Reemplaza el botón de campanita estático
- Completamente funcional y conectado al backend

### Base de Datos

#### Tabla `notificaciones`
```sql
CREATE TABLE notificaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NULL,  -- NULL = para todos los usuarios del rol
  tipo VARCHAR(50) NOT NULL,  -- nuevo_cliente, nueva_instalacion, etc
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON NULL,  -- Info adicional (IDs, enlaces, etc)
  leida TINYINT(1) DEFAULT 0,
  fecha_lectura DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tipo (tipo),
  INDEX idx_leida (leida),
  INDEX idx_created_at (created_at),

  FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id) ON DELETE CASCADE
);
```

## Instalación

### 1. Crear la tabla en la base de datos

**Opción A - Script automático:**
```bash
cd backend
node migrations/run_migration.js
```

**Opción B - Manual:**
Ejecutar el SQL que está en `backend/migrations/create_notificaciones_table.sql`

### 2. Verificar dependencias del backend
```bash
cd backend
npm install
```

### 3. Verificar dependencias del frontend
```bash
cd frontend
npm install
```

### 4. Reiniciar el servidor
```bash
# Backend
cd backend
npm start

# Frontend (en otra terminal)
cd frontend
npm run dev
```

## Uso

### Para Usuarios

1. **Ver notificaciones**: Hacer clic en la campanita en el header
2. **Marcar como leída**: Hacer clic en el ícono de check (✓)
3. **Eliminar**: Hacer clic en el ícono de basura (🗑️)
4. **Ver detalle**: Hacer clic en la notificación para navegar al recurso
5. **Marcar todas como leídas**: Botón "Marcar todas" en el header del panel

### Tipos de Notificaciones por Rol

- **Administrador**: Ve todas las notificaciones (clientes e instalaciones)
- **Supervisor**: Ve todas las notificaciones (clientes e instalaciones)
- **Instalador**: Solo ve notificaciones de instalaciones asignadas o nuevas

### Comportamiento

- **Polling**: El sistema verifica nuevas notificaciones cada 30 segundos automáticamente
- **Badge**: Muestra el número de notificaciones no leídas (máximo 99+)
- **Navegación**: Al hacer clic en una notificación, se marca como leída y navega al recurso correspondiente
- **Persistencia**: Las notificaciones se mantienen hasta que el usuario las elimine o se ejecute limpieza automática (30 días por defecto)

## Personalización

### Agregar nuevos tipos de notificaciones

1. **Backend** - Crear método en `backend/models/notificacion.js`:
```javascript
static async notificarNuevoEvento(eventoId, eventoNombre) {
  try {
    const notificacion = {
      tipo: 'nuevo_evento',
      titulo: 'Nuevo Evento',
      mensaje: `Se ha creado un nuevo evento: ${eventoNombre}`,
      datos_adicionales: {
        evento_id: eventoId,
        evento_nombre: eventoNombre
      }
    };

    return await this.crear(notificacion);
  } catch (error) {
    console.error('Error al notificar nuevo evento:', error);
    throw error;
  }
}
```

2. **Backend** - Llamar en el controlador correspondiente:
```javascript
const Notificacion = require('../models/notificacion');
await Notificacion.notificarNuevoEvento(eventoId, nombre);
```

3. **Frontend** - Agregar icono en `NotificationBell.js`:
```javascript
const getNotificationIcon = (tipo) => {
  switch (tipo) {
    case 'nuevo_cliente':
      return <Users size={20} className="text-green-500" />;
    case 'nueva_instalacion':
      return <Wrench size={20} className="text-blue-500" />;
    case 'nuevo_evento':  // <-- Agregar aquí
      return <Calendar size={20} className="text-purple-500" />;
    default:
      return <Bell size={20} className="text-gray-500" />;
  }
};
```

4. **Frontend** - Agregar navegación en `handleNotificationClick`:
```javascript
const handleNotificationClick = (notificacion) => {
  marcarComoLeida(notificacion.id);

  if (notificacion.datos_adicionales) {
    const datos = notificacion.datos_adicionales;

    if (notificacion.tipo === 'nuevo_cliente' && datos.cliente_id) {
      navigate(`/clients/${datos.cliente_id}`);
      setIsOpen(false);
    } else if (notificacion.tipo === 'nueva_instalacion' && datos.instalacion_id) {
      navigate(`/instalaciones`);
      setIsOpen(false);
    } else if (notificacion.tipo === 'nuevo_evento' && datos.evento_id) {  // <-- Agregar aquí
      navigate(`/eventos/${datos.evento_id}`);
      setIsOpen(false);
    }
  }
};
```

## Características Técnicas

- ✅ Notificaciones en tiempo real con polling
- ✅ Filtrado por rol de usuario
- ✅ Marcado individual y masivo como leídas
- ✅ Eliminación de notificaciones
- ✅ Navegación automática a recursos
- ✅ Badge con contador animado
- ✅ Fechas relativas (hace X minutos/horas/días)
- ✅ Iconos diferenciados por tipo
- ✅ Panel responsive y accesible
- ✅ Integración completa con sistema de permisos
- ✅ Limpieza automática de notificaciones antiguas

## Notas Importantes

- Las notificaciones se crean automáticamente al registrar clientes o programar instalaciones
- El polling se ejecuta solo cuando hay un usuario autenticado
- Las notificaciones antiguas (más de 30 días) se pueden limpiar con el método `Notificacion.limpiarAntiguas()`
- Se recomienda configurar un cron job para limpieza periódica

## Soporte

Para problemas o preguntas sobre el sistema de notificaciones:
1. Verificar que la tabla `notificaciones` existe en la base de datos
2. Verificar que el backend está corriendo y accesible
3. Revisar la consola del navegador para errores de red
4. Verificar permisos del usuario

## Futuras Mejoras Sugeridas

- [ ] WebSocket en lugar de polling para notificaciones en tiempo real instantáneas
- [ ] Notificaciones push del navegador (Web Push API)
- [ ] Configuración de preferencias de notificaciones por usuario
- [ ] Sonido/vibración al recibir notificación
- [ ] Categorización y filtrado avanzado
- [ ] Email para notificaciones importantes
- [ ] Panel de administración para envío masivo de notificaciones
