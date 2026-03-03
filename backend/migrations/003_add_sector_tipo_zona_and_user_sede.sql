-- Migración 003: Añadir tipo_zona a sectores y sede_id a sistema_usuarios
-- Fecha: 2026-03-03

-- 1. Añadir campo tipo_zona a la tabla sectores (urbano / rural)
ALTER TABLE `sectores`
  ADD COLUMN `tipo_zona` ENUM('urbano', 'rural') NOT NULL DEFAULT 'urbano'
  AFTER `nombre`;

-- 2. Añadir campo sede_id (ciudad_id) a sistema_usuarios
--    Referencia a la tabla ciudades; NULL = sin restricción de sede (admins)
ALTER TABLE `sistema_usuarios`
  ADD COLUMN `sede_id` INT(11) DEFAULT NULL AFTER `telefono`,
  ADD CONSTRAINT `fk_usuarios_sede` FOREIGN KEY (`sede_id`) REFERENCES `ciudades` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Ampliar el enum de rol para incluir 'operador'
ALTER TABLE `sistema_usuarios`
  MODIFY COLUMN `rol` ENUM('administrador','instalador','supervisor','operador') NOT NULL DEFAULT 'supervisor';
