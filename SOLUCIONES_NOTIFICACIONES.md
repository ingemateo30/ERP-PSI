# SOLUCIONES: PROBLEMAS DE NOTIFICACIONES

## Problema #1: Notificación NO se crea al asignar instalador

### Ubicación
- **Archivo:** `/backend/routes/instalaciones.js`
- **Línea:** 1340-1409
- **Ruta:** `PATCH /:id/asignar-instalador`

### Código ACTUAL (incorrecto)
```javascript
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { instalador_id } = req.body;

            if (!instalador_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del instalador es requerido'
                });
            }

            // Verificar instalación
            const [instalacion] = await Database.query(
                'SELECT * FROM instalaciones WHERE id = ?',
                [id]
            );

            if (!instalacion) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            // Verificar instalador
            const [instalador] = await Database.query(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND rol IN ("instalador", "supervisor") AND activo = 1',
                [instalador_id]
            );

            if (!instalador) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalador no encontrado o no tiene permisos'
                });
            }

            // Actualizar
            await Database.query(
                'UPDATE instalaciones SET instalador_id = ?, updated_at = NOW() WHERE id = ?',
                [instalador_id, id]
            );

            // Obtener actualizada
            const [instalacionActualizada] = await Database.query(`
                SELECT i.*, c.nombre as cliente_nombre, u.nombre as instalador_nombre_completo
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
                WHERE i.id = ?
            `, [id]);

            res.json({
                success: true,
                message: 'Instalador asignado exitosamente',
                data: instalacionActualizada
            });
            // ❌ FALTA NOTIFICACIÓN AQUÍ

        } catch (error) {
            console.error('❌ Error asignando instalador:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);
```

### Código CORRECTO
```javascript
router.patch('/:id/asignar-instalador',
    requireRole('administrador', 'supervisor'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { instalador_id } = req.body;

            if (!instalador_id) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del instalador es requerido'
                });
            }

            // Verificar instalación
            const [instalacion] = await Database.query(
                'SELECT * FROM instalaciones WHERE id = ?',
                [id]
            );

            if (!instalacion) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalación no encontrada'
                });
            }

            // Verificar instalador
            const [instalador] = await Database.query(
                'SELECT * FROM sistema_usuarios WHERE id = ? AND rol IN ("instalador", "supervisor") AND activo = 1',
                [instalador_id]
            );

            if (!instalador) {
                return res.status(404).json({
                    success: false,
                    message: 'Instalador no encontrado o no tiene permisos'
                });
            }

            // Actualizar
            await Database.query(
                'UPDATE instalaciones SET instalador_id = ?, updated_at = NOW() WHERE id = ?',
                [instalador_id, id]
            );

            // Obtener actualizada
            const [instalacionActualizada] = await Database.query(`
                SELECT i.*, c.nombre as cliente_nombre, u.nombre as instalador_nombre_completo
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
                WHERE i.id = ?
            `, [id]);

            // ✅ AGREGAR NOTIFICACIÓN
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
                // No fallar la operación si falla la notificación
            }

            res.json({
                success: true,
                message: 'Instalador asignado exitosamente',
                data: instalacionActualizada
            });

        } catch (error) {
            console.error('❌ Error asignando instalador:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);
```

---

## Problema #2: Método obtenerInstalacionCompleta duplicado

### Ubicación
- **Archivo:** `/backend/controllers/instalacionesController.js`
- **Líneas:** 526 y 1149

### Código ACTUAL (incorrecto - duplicado)

**Línea 526:**
```javascript
static async obtenerInstalacionCompleta(connection, instalacionId) {
    const [instalaciones] = await connection.query(...);
    // ...
}
```

**Línea 1149:**
```javascript
static async obtenerInstalacionCompleta(id) {
    const [instalacion] = await Database.query(...);
    // ...
}
```

### Solución
Renombrar la primera versión a `obtenerInstalacionCompletaConConexion` y actualizar referencias:

```javascript
// LÍNEA 526 - Versión con conexión (para transacciones)
static async obtenerInstalacionCompletaConConexion(connection, instalacionId) {
    try {
        const [instalaciones] = await connection.query(
            `SELECT 
            i.*,
            c.nombre as cliente_nombre,
            c.email as cliente_email,
            c.telefono as cliente_telefono,
            c.documento as cliente_documento,
            sc.plan_id,
            sc.estado as servicio_estado,
            p.nombre as plan_nombre,
            p.velocidad as plan_velocidad,
            u.nombre as instalador_nombre,
            u.telefono as instalador_telefono,
            u.email as instalador_email
        FROM instalaciones i
        INNER JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes p ON sc.plan_id = p.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        WHERE i.id = ?`,
            [instalacionId]
        );

        if (!instalaciones || instalaciones.length === 0) {
            throw new Error('Instalación no encontrada');
        }

        const instalacion = instalaciones[0];

        // Parsear equipos_instalados si es string JSON
        if (typeof instalacion.equipos_instalados === 'string') {
            try {
                instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
            } catch (e) {
                instalacion.equipos_instalados = [];
            }
        }

        return instalacion;
    } catch (error) {
        console.error('Error obteniendo instalación completa con conexión:', error);
        throw error;
    }
}

// LÍNEA 1149 - Versión estática sin conexión
static async obtenerInstalacionCompleta(id) {
    try {
        const consulta = `
    SELECT 
      i.*,
      c.identificacion as cliente_identificacion,
      c.nombre as cliente_nombre,
      c.telefono as cliente_telefono,
      c.correo as cliente_email,
      u.nombre as instalador_nombre_completo,
      u.telefono as instalador_telefono,
      ps.nombre as plan_nombre,
      ps.tipo as plan_tipo,
      ps.precio as plan_precio
    FROM instalaciones i
    LEFT JOIN clientes c ON i.cliente_id = c.id
    LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
    LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
    LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
    WHERE i.id = ?
  `;

        const [instalacion] = await Database.query(consulta, [id]);

        if (instalacion) {
            // Procesar JSON fields
            if (instalacion.equipos_instalados) {
                try {
                    if (typeof instalacion.equipos_instalados === 'string') {
                        instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
                    }
                } catch (e) {
                    instalacion.equipos_instalados = [];
                }
            } else {
                instalacion.equipos_instalados = [];
            }

            if (instalacion.fotos_instalacion) {
                try {
                    instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
                } catch (e) {
                    instalacion.fotos_instalacion = [];
                }
            }
        }

        return instalacion;
    } catch (error) {
        console.error('Error obteniendo instalación completa:', error);
        return null;
    }
}
```

### Actualizar referencias
En la línea 492, cambiar:
```javascript
// ANTES
const instalacionCreada = await this.obtenerInstalacionCompleta(connection, instalacionId);

// DESPUÉS
const instalacionCreada = await this.obtenerInstalacionCompletaConConexion(connection, instalacionId);
```

---

## Problema #3: Filtrado incompleto de notificaciones por rol

### Ubicación
- **Archivo:** `/backend/models/notificacion.js`
- **Método:** `obtenerPorUsuario(usuarioId, rol, filtros)`
- **Línea:** 36-89

### Código ACTUAL (incorrecto)
```javascript
static async obtenerPorUsuario(usuarioId, rol, filtros = {}) {
    try {
      let query = `
        SELECT
          n.*,
          DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as fecha_formateada
        FROM notificaciones n
        WHERE (n.usuario_id = ? OR n.usuario_id IS NULL)
      `;

      const params = [usuarioId];

      // Filtrar por tipo si se proporciona
      if (filtros.tipo) {
        query += ' AND n.tipo = ?';
        params.push(filtros.tipo);
      }

      // Filtrar por leídas/no leídas
      if (filtros.leida !== undefined) {
        query += ' AND n.leida = ?';
        params.push(filtros.leida ? 1 : 0);
      }

      // Filtrar solo las últimas X horas/días según el rol
      if (rol === 'administrador' || rol === 'supervisor') {
        // Administradores y supervisores ven todas las notificaciones recientes
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (rol === 'instalador') {
        // ❌ PROBLEMA: Instaladores verían notificaciones de nuevo_cliente
        query += ' AND n.tipo IN ("nueva_instalacion", "instalacion_actualizada")';
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)';
      }

      query += ' ORDER BY n.created_at DESC';

      // Limitar resultados
      const limite = filtros.limite || 50;
      query += ` LIMIT ${parseInt(limite)}`;

      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();

      // Parsear datos adicionales
      return filas.map(fila => ({
        ...fila,
        datos_adicionales: fila.datos_adicionales ? JSON.parse(fila.datos_adicionales) : null
      }));
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      throw new Error(`Error al obtener notificaciones: ${error.message}`);
    }
  }
```

### Código CORRECTO
```javascript
static async obtenerPorUsuario(usuarioId, rol, filtros = {}) {
    try {
      let query = `
        SELECT
          n.*,
          DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') as fecha_formateada
        FROM notificaciones n
        WHERE 1=1
      `;

      const params = [];

      // Base de permisos según rol
      if (rol === 'administrador' || rol === 'supervisor') {
        // Admin y supervisor ven: específicas para ellos O globales (user_id IS NULL)
        query += ' AND (n.usuario_id = ? OR n.usuario_id IS NULL)';
        params.push(usuarioId);
        
        // Ven todos los tipos
        // Sin restricción adicional de tipo
        
        // Últimos 7 días
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        
      } else if (rol === 'instalador') {
        // Instaladores ven: específicas para ellos (NO globales)
        query += ' AND n.usuario_id = ?';
        params.push(usuarioId);
        
        // Solo ciertos tipos
        query += ' AND n.tipo IN ("nueva_instalacion", "instalacion_actualizada")';
        
        // Últimos 3 días
        query += ' AND n.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)';
      } else {
        // Otros usuarios solo ven sus notificaciones específicas
        query += ' AND n.usuario_id = ?';
        params.push(usuarioId);
      }

      // Filtrar por tipo si se proporciona (adicional al filtro de rol)
      if (filtros.tipo) {
        query += ' AND n.tipo = ?';
        params.push(filtros.tipo);
      }

      // Filtrar por leídas/no leídas
      if (filtros.leida !== undefined) {
        query += ' AND n.leida = ?';
        params.push(filtros.leida ? 1 : 0);
      }

      query += ' ORDER BY n.created_at DESC';

      // Limitar resultados
      const limite = filtros.limite || 50;
      query += ` LIMIT ${parseInt(limite)}`;

      const connection = await pool.getConnection();
      const [filas] = await connection.execute(query, params);
      connection.release();

      // Parsear datos adicionales
      return filas.map(fila => ({
        ...fila,
        datos_adicionales: fila.datos_adicionales ? JSON.parse(fila.datos_adicionales) : null
      }));
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      throw new Error(`Error al obtener notificaciones: ${error.message}`);
    }
  }
```

---

## Problema #4: Parámetro booleano poco robusto

### Ubicación
- **Archivo:** `/backend/controllers/notificacionesController.js`
- **Línea:** 13

### Código ACTUAL (débil)
```javascript
const filtros = {
  tipo: req.query.tipo,
  leida: req.query.leida !== undefined ? req.query.leida === 'true' : undefined,
  limite: req.query.limite || 50
};
```

### Código CORRECTO
```javascript
const filtros = {
  tipo: req.query.tipo,
  leida: req.query.leida !== undefined ? 
    (req.query.leida === 'true' || req.query.leida === '1' || req.query.leida === 'on') 
    : undefined,
  limite: req.query.limite || 50
};
```

---

## Problema #5: No hay notificación al crear usuario/instalador

### Ubicación
- **Archivo:** Controlador de usuarios (búscar)
- **Método:** Crear usuario

### Solución
Agregar al crear usuario:

```javascript
// En el controlador de usuarios, después de crear el usuario:
try {
  if (nuevoUsuario.rol === 'instalador') {
    const Notificacion = require('../models/notificacion');
    await Notificacion.crear({
      tipo: 'nuevo_instalador',
      titulo: 'Nuevo Instalador Registrado',
      mensaje: `Se ha registrado un nuevo instalador: ${nuevoUsuario.nombre}`,
      datos_adicionales: {
        usuario_id: nuevoUsuario.id,
        usuario_nombre: nuevoUsuario.nombre
      }
    });
    console.log('🔔 Notificación de nuevo instalador creada');
  }
} catch (notifError) {
  console.error('⚠️ Error creando notificación:', notifError);
}
```

---

## ORDEN DE PRIORIDAD PARA IMPLEMENTAR

1. **Problema #1 (CRÍTICO)** - 15 minutos
   - Archivos: `/backend/routes/instalaciones.js`
   - Cambios: 6 líneas de código

2. **Problema #2 (ALTO)** - 30 minutos
   - Archivos: `/backend/controllers/instalacionesController.js`
   - Cambios: Renombrar método + actualizar 2 referencias

3. **Problema #3 (MEDIO)** - 20 minutos
   - Archivos: `/backend/models/notificacion.js`
   - Cambios: Reescribir lógica de WHERE

4. **Problema #4 (BAJO)** - 5 minutos
   - Archivos: `/backend/controllers/notificacionesController.js`
   - Cambios: 1 línea

5. **Problema #5 (MEDIO)** - 15 minutos
   - Archivos: Controlador de usuarios
   - Cambios: 8 líneas de código

**Tiempo total estimado:** ~85 minutos

---

## TESTING

Después de implementar cada solución:

```bash
# 1. Crear nueva instalación
POST /api/v1/instalaciones

# 2. Asignar instalador
PATCH /api/v1/instalaciones/1/asignar-instalador
Body: { "instalador_id": 5 }

# 3. Verificar notificación como instalador
GET /api/v1/notificaciones
GET /api/v1/notificaciones/count

# 4. Ver en frontend
# Abre NotificationBell y verifica que aparezca la notificación
```
