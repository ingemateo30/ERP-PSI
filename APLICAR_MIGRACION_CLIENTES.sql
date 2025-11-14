-- ========================================================================
-- SCRIPT PARA RESOLVER EL ERROR DE CLIENTES DUPLICADOS
-- ========================================================================
-- Este script elimina el constraint UNIQUE de la columna identificacion
-- para permitir que un mismo cliente pueda tener múltiples ubicaciones
-- ========================================================================

USE jelcom_internet;

-- 1. Verificar índices actuales
SELECT
    INDEX_NAME,
    NON_UNIQUE,
    COLUMN_NAME,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'jelcom_internet'
  AND TABLE_NAME = 'clientes'
  AND COLUMN_NAME = 'identificacion';

-- 2. Eliminar el UNIQUE KEY si existe
-- (Si da error "Can't DROP 'identificacion'; check that column/key exists",
--  significa que ya fue eliminado y puedes continuar)
ALTER TABLE `clientes` DROP INDEX `identificacion`;

-- 3. Crear índice regular para búsquedas rápidas (si no existe)
-- Este índice permite búsquedas eficientes sin la restricción UNIQUE
-- (Si da error "Duplicate key name", significa que ya existe y puedes continuar)
CREATE INDEX `idx_identificacion` ON `clientes` (`identificacion`);

-- 4. Crear índices compuestos para optimizar búsquedas
-- (Si da error "Duplicate key name", significa que ya existen y puedes continuar)
CREATE INDEX `idx_identificacion_ciudad` ON `clientes` (`identificacion`, `ciudad_id`);
CREATE INDEX `idx_identificacion_direccion` ON `clientes` (`identificacion`(20), `direccion`(100));

-- 5. Verificar que los cambios se aplicaron correctamente
SELECT
    INDEX_NAME,
    NON_UNIQUE,
    COLUMN_NAME,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'jelcom_internet'
  AND TABLE_NAME = 'clientes'
  AND COLUMN_NAME = 'identificacion';

-- 6. Buscar clientes duplicados existentes
SELECT
    identificacion,
    COUNT(*) as cantidad,
    GROUP_CONCAT(id ORDER BY id) as ids,
    GROUP_CONCAT(nombre ORDER BY id SEPARATOR ' | ') as nombres,
    GROUP_CONCAT(CONCAT(direccion, ' - ', IFNULL(barrio, 'N/A')) ORDER BY id SEPARATOR ' | ') as ubicaciones
FROM clientes
GROUP BY identificacion
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- ========================================================================
-- RESULTADO ESPERADO:
-- ========================================================================
-- Después de ejecutar este script:
-- 1. La columna identificacion ya NO tendrá restricción UNIQUE
-- 2. Se podrán crear clientes con la misma identificación en diferentes ubicaciones
-- 3. Los errores "Duplicate entry for key 'clientes.identificacion'" desaparecerán
-- 4. Las búsquedas seguirán siendo rápidas gracias a los índices
-- ========================================================================

-- ========================================================================
-- IMPORTANTE:
-- ========================================================================
-- Si ya tienes clientes duplicados en la base de datos y quieres limpiarlos:
-- 1. Identifica cuáles son duplicados reales (mismo nombre, dirección, etc)
-- 2. Decide cuál mantener y cuál eliminar
-- 3. Actualiza las referencias en otras tablas (facturas, servicios, etc)
-- 4. Elimina los registros duplicados
-- ========================================================================
