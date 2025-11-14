# Migración: Permitir Clientes con Múltiples Ubicaciones

## 📋 Descripción

Esta migración elimina el constraint UNIQUE de la columna `identificacion` en la tabla `clientes`, permitiendo que un mismo cliente (con la misma cédula/NIT) pueda tener servicios en diferentes direcciones o ciudades.

## 🔧 Requisitos Previos

1. **Verificar que el archivo `.env` existe y tiene las credenciales correctas:**
   ```bash
   cd /home/user/ERP-PSI/backend
   cat .env
   ```

   Debe contener:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=base_psi
   DB_USER=usuario
   DB_PASSWORD=sudo1234
   DB_CONNECTION_LIMIT=10
   ```

2. **Verificar que tienes acceso a MySQL con esas credenciales:**
   ```bash
   mysql -u usuario -psudo1234 base_psi -e "SELECT 1;"
   ```

## 🚀 Ejecutar la Migración

### Opción 1: Usando el script automático (Recomendado)

```bash
cd /home/user/ERP-PSI/backend
node migrations/ejecutar_migracion.js
```

**Salida esperada:**
```
Configuración de base de datos: { host: 'localhost', port: 3306, user: 'usuario', database: 'base_psi' }
✅ Conexión a MySQL establecida correctamente
🔄 Iniciando migración: Permitir clientes con múltiples direcciones...
📝 Ejecutando 3 statements...
   [1/3] Ejecutando...
   ✅ Statement 1 ejecutado correctamente
   [2/3] Ejecutando...
   ✅ Statement 2 ejecutado correctamente
   [3/3] Ejecutando...
   ✅ Statement 3 ejecutado correctamente
✅ Migración completada exitosamente

📋 RESUMEN DE CAMBIOS:
   - Eliminado UNIQUE constraint de columna identificacion
   - Ahora es posible crear múltiples clientes con la misma identificación
   - Cada cliente puede tener diferente dirección y ciudad
   - Se mantienen índices para búsquedas rápidas
```

### Opción 2: Ejecutar manualmente en MySQL

Si el script automático falla, puedes ejecutar el SQL manualmente:

```bash
mysql -u usuario -psudo1234 base_psi < migrations/001_permitir_clientes_multiples_direcciones.sql
```

O conectarte a MySQL y copiar/pegar el contenido del archivo:

```bash
mysql -u usuario -psudo1234 base_psi
```

Luego dentro de MySQL:
```sql
-- Eliminar el UNIQUE KEY de identificacion
ALTER TABLE `clientes` DROP INDEX `identificacion`;

-- Crear índice compuesto para búsquedas eficientes
CREATE INDEX `idx_identificacion_ciudad` ON `clientes` (`identificacion`, `ciudad_id`);
CREATE INDEX `idx_identificacion_direccion` ON `clientes` (`identificacion`(20), `direccion`(100));
```

## ✅ Verificar que la Migración se Ejecutó Correctamente

Ejecuta este comando para verificar los índices de la tabla:

```bash
mysql -u usuario -psudo1234 base_psi -e "SHOW INDEX FROM clientes WHERE Key_name LIKE '%identificacion%';"
```

**Resultado esperado:**

Deberías ver índices como:
- `idx_identificacion` (índice regular)
- `idx_identificacion_ciudad` (índice compuesto nuevo)
- `idx_identificacion_direccion` (índice compuesto nuevo)

**NO deberías ver:**
- `identificacion` con `Non_unique = 0` (esto sería el UNIQUE constraint)

## 🧪 Probar que Funciona

Después de ejecutar la migración, puedes probar creando un cliente duplicado:

```bash
mysql -u usuario -psudo1234 base_psi
```

```sql
-- Intenta insertar un cliente con identificación existente pero diferente dirección
INSERT INTO clientes (identificacion, tipo_documento, nombre, direccion, ciudad_id, estrato, fecha_registro)
VALUES ('1005450340', 'cedula', 'Mateo Salazar Ortiz', 'Carrera 50 #20-30', 6, '2', NOW());

-- Esto debería funcionar sin error
```

Para verificar:
```sql
-- Ver todas las ubicaciones de un cliente
SELECT id, identificacion, nombre, direccion, ciudad_id
FROM clientes
WHERE identificacion = '1005450340';
```

Deberías ver múltiples registros con la misma identificación.

## ⚠️ Solución de Problemas

### Error: "Access denied for user 'root'@'localhost'"

**Causa:** El script no está leyendo correctamente el archivo `.env`.

**Solución:**
1. Verifica que el archivo `.env` existe en `/home/user/ERP-PSI/backend/`
2. Verifica que tiene las credenciales correctas
3. Ejecuta manualmente con las credenciales correctas:
   ```bash
   mysql -u usuario -psudo1234 base_psi < migrations/001_permitir_clientes_multiples_direcciones.sql
   ```

### Error: "Can't DROP 'identificacion'; check that column/key exists"

**Causa:** El UNIQUE constraint ya fue eliminado previamente.

**Solución:** No hacer nada, la migración ya se aplicó. Verifica con:
```bash
mysql -u usuario -psudo1234 base_psi -e "SHOW CREATE TABLE clientes\G" | grep UNIQUE
```

### Error: "Duplicate key name 'idx_identificacion_ciudad'"

**Causa:** Los índices ya fueron creados.

**Solución:** La migración ya se aplicó correctamente. Puedes verificar con:
```bash
mysql -u usuario -psudo1234 base_psi -e "SHOW INDEX FROM clientes;"
```

## 🔄 Revertir la Migración (Rollback)

Si necesitas revertir la migración por algún motivo:

```sql
-- Eliminar los índices creados
ALTER TABLE `clientes` DROP INDEX `idx_identificacion_ciudad`;
ALTER TABLE `clientes` DROP INDEX `idx_identificacion_direccion`;

-- Restaurar el UNIQUE constraint
-- ADVERTENCIA: Esto fallará si ya existen clientes duplicados
ALTER TABLE `clientes` ADD UNIQUE KEY `identificacion` (`identificacion`);
```

## 📞 Soporte

Si tienes problemas ejecutando esta migración:

1. Verifica que tienes permisos para modificar la estructura de la tabla
2. Asegúrate de que no hay aplicaciones usando la base de datos durante la migración
3. Revisa los logs de MySQL para más detalles: `/var/log/mysql/error.log`
4. Contacta al equipo de desarrollo

---

**Archivo:** `001_permitir_clientes_multiples_direcciones.sql`
**Fecha:** 14 de noviembre de 2025
**Versión:** 1.0
