# Migración: Agregar columna numero_orden a instalaciones

## Descripción
Esta migración agrega la columna `numero_orden` a la tabla `instalaciones` para almacenar el número único de orden con formato `ORD-YYYY-XXXXXX`.

## ⚠️ IMPORTANTE
El código es **backward compatible** y funciona sin esta columna, pero para aprovechar completamente la funcionalidad del número de orden, debe ejecutar esta migración.

## Opción 1: Ejecutar migración SQL directamente

```bash
mysql -u root -p erp_psi < backend/migrations/002_add_numero_orden_instalaciones.sql
```

## Opción 2: Ejecutar desde MySQL CLI

```bash
mysql -u root -p erp_psi
```

Luego copiar y pegar el contenido del archivo `backend/migrations/002_add_numero_orden_instalaciones.sql`

## Opción 3: Usar el script Node.js (requiere dependencias instaladas)

```bash
cd backend
npm install  # Solo si no está instalado
node scripts/run-migration.js
```

## Verificación

Después de ejecutar la migración, verificar que la columna existe:

```sql
USE erp_psi;
SHOW COLUMNS FROM instalaciones WHERE Field = 'numero_orden';
```

Debería mostrar:
```
+--------------+-------------+------+-----+---------+-------+
| Field        | Type        | Null | Key | Default | Extra |
+--------------+-------------+------+-----+---------+-------+
| numero_orden | varchar(50) | YES  | MUL | NULL    |       |
+--------------+-------------+------+-----+---------+-------+
```

## Reiniciar servidor backend

Después de ejecutar la migración, reiniciar el servidor backend:

```bash
pm2 restart backend
```

O si usa nodemon/desarrollo:
```bash
# Se reiniciará automáticamente
```

## Rollback (si es necesario)

Para revertir la migración:

```sql
USE erp_psi;
ALTER TABLE instalaciones DROP COLUMN IF EXISTS numero_orden;
DROP INDEX IF EXISTS idx_numero_orden ON instalaciones;
```
