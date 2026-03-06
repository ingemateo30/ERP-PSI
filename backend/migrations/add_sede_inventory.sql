-- Migración: Agregar campo 'sede' a inventario y usuarios
-- Aplicar este script en la base de datos base_psi

-- 1. Agregar columna 'sede' a inventario_equipos
ALTER TABLE `inventario_equipos`
  ADD COLUMN `sede` VARCHAR(100) DEFAULT NULL COMMENT 'Sede a la que pertenece el equipo' AFTER `ubicacion`;

-- 2. Agregar columna 'sede' a sistema_usuarios
ALTER TABLE `sistema_usuarios`
  ADD COLUMN `sede` VARCHAR(100) DEFAULT NULL COMMENT 'Sede asignada al usuario' AFTER `rol`;

-- 3. Actualizar sede por defecto para datos existentes
UPDATE `inventario_equipos` SET `sede` = 'Sede Principal' WHERE `sede` IS NULL;
UPDATE `sistema_usuarios` SET `sede` = 'Sede Principal' WHERE `sede` IS NULL;
