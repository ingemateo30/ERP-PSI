-- Migración 006: Agregar campo ont_id a la tabla clientes
-- Uso: Identificador ONT/GPON para gestión de corte y reconexión de servicio
-- (reemplaza o complementa la lógica basada en ip_asignada)

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS ont_id VARCHAR(50) DEFAULT NULL COMMENT 'Identificador ONT/GPON para corte de servicio (reemplaza IP en redes FTTH)';

-- Índice para búsqueda por ONT
CREATE INDEX IF NOT EXISTS idx_clientes_ont_id ON clientes(ont_id);
