-- Migración 005: Permite cliente_id NULL en tabla pqr
-- Razón: tickets generados desde el chatbot pueden ser de usuarios
-- anónimos que aún no son clientes registrados en el sistema.
-- El nombre, email y teléfono del usuario se almacenan en el campo
-- observaciones del PQR hasta que el agente lo vincule con un cliente.

ALTER TABLE pqr
  MODIFY COLUMN cliente_id INT NULL;

-- Índice para buscar tickets sin cliente asignado
ALTER TABLE pqr
  ADD COLUMN IF NOT EXISTS nombre_usuario_externo VARCHAR(255) NULL COMMENT 'Nombre si el usuario no es cliente registrado',
  ADD COLUMN IF NOT EXISTS email_usuario_externo  VARCHAR(255) NULL COMMENT 'Email si el usuario no es cliente registrado',
  ADD COLUMN IF NOT EXISTS telefono_usuario_externo VARCHAR(50) NULL COMMENT 'Teléfono si el usuario no es cliente registrado';
