-- Migración 007: Agregar columna firma_instalador a instalaciones
-- Almacena la firma digital del técnico instalador (base64 PNG) al completar la instalación

ALTER TABLE instalaciones
  ADD COLUMN IF NOT EXISTS firma_instalador LONGTEXT DEFAULT NULL COMMENT 'Firma digital del instalador en base64 (PNG), capturada al completar instalación';
