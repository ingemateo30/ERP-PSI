-- Migración 004: Renombrar roles del sistema
-- Fecha: 2026-03-07
-- Cambios:
--   - Renombrar rol 'operador' → 'secretaria'
--   - Renombrar rol 'supervisor' → 'secretaria'
--   - Dejar solo 3 roles válidos: administrador, instalador, secretaria

-- PASO 1: Ampliar ENUM para incluir 'secretaria' junto con los valores actuales
ALTER TABLE `sistema_usuarios`
  MODIFY COLUMN `rol`
    ENUM('administrador', 'instalador', 'supervisor', 'operador', 'secretaria')
    NOT NULL DEFAULT 'instalador';

-- PASO 2: Migrar usuarios con roles obsoletos a 'secretaria'
UPDATE `sistema_usuarios`
  SET `rol` = 'secretaria'
  WHERE `rol` IN ('operador', 'supervisor');

-- PASO 3: Reducir ENUM a solo los 3 roles definitivos
ALTER TABLE `sistema_usuarios`
  MODIFY COLUMN `rol`
    ENUM('administrador', 'instalador', 'secretaria')
    NOT NULL DEFAULT 'instalador';
