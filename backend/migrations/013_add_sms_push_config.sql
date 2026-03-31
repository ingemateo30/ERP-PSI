-- Migración 013: Agregar configuración LabsMobile SMS y VAPID para Push Notifications

-- Credenciales LabsMobile en tabla de configuración de empresa
ALTER TABLE configuracion_empresa
  ADD COLUMN IF NOT EXISTS labsmobile_user VARCHAR(150) NULL COMMENT 'Usuario/email LabsMobile',
  ADD COLUMN IF NOT EXISTS labsmobile_token VARCHAR(150) NULL COMMENT 'Token API LabsMobile',
  ADD COLUMN IF NOT EXISTS labsmobile_sender VARCHAR(20) NULL COMMENT 'Número remitente LabsMobile (opcional)',
  ADD COLUMN IF NOT EXISTS sms_activo TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = SMS habilitado';

-- Claves VAPID para Web Push Notifications
ALTER TABLE configuracion_empresa
  ADD COLUMN IF NOT EXISTS vapid_public_key TEXT NULL COMMENT 'Clave pública VAPID',
  ADD COLUMN IF NOT EXISTS vapid_private_key TEXT NULL COMMENT 'Clave privada VAPID',
  ADD COLUMN IF NOT EXISTS push_activo TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Push notifications habilitadas';

-- Tabla para guardar suscripciones push de usuarios
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_endpoint (usuario_id, endpoint(255)),
  FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id) ON DELETE CASCADE
);
