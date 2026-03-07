-- Migración 004: Renombrar roles del sistema
-- Fecha: 2026-03-07
-- Cambios:
--   - Renombrar rol 'operador' → 'secretaria'
--   - Renombrar rol 'supervisor' → 'secretaria'
--   - Actualizar ENUM con los 3 roles válidos: administrador, instalador, secretaria

-- 1. Convertir usuarios con roles obsoletos a 'secretaria'
--    (operador y supervisor se unifican en secretaria)
UPDATE `sistema_usuarios`
  SET `rol` = 'secretaria'
  WHERE `rol` IN ('operador', 'supervisor');

-- 2. Modificar el ENUM para aceptar los nuevos valores
ALTER TABLE `sistema_usuarios`
  MODIFY COLUMN `rol`
    ENUM('administrador', 'instalador', 'secretaria')
    NOT NULL DEFAULT 'instalador';
