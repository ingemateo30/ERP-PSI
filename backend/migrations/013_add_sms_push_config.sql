-- Migración 013: SMS (LabsMobile) y Push Notifications
-- Compatible con MySQL 5.7+

DROP PROCEDURE IF EXISTS migrar_013;

DELIMITER $$
CREATE PROCEDURE migrar_013()
BEGIN
  -- labsmobile_user
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'labsmobile_user'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN labsmobile_user VARCHAR(150) NULL COMMENT 'Usuario/email LabsMobile';
  END IF;

  -- labsmobile_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'labsmobile_token'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN labsmobile_token VARCHAR(150) NULL COMMENT 'Token API LabsMobile';
  END IF;

  -- labsmobile_sender
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'labsmobile_sender'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN labsmobile_sender VARCHAR(20) NULL COMMENT 'Número remitente LabsMobile (opcional)';
  END IF;

  -- sms_activo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'sms_activo'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN sms_activo TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = SMS habilitado';
  END IF;

  -- vapid_public_key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'vapid_public_key'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN vapid_public_key TEXT NULL COMMENT 'Clave pública VAPID';
  END IF;

  -- vapid_private_key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'vapid_private_key'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN vapid_private_key TEXT NULL COMMENT 'Clave privada VAPID';
  END IF;

  -- push_activo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_empresa' AND COLUMN_NAME = 'push_activo'
  ) THEN
    ALTER TABLE configuracion_empresa ADD COLUMN push_activo TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Push notifications habilitadas';
  END IF;

  -- Tabla push_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'push_subscriptions'
  ) THEN
    CREATE TABLE push_subscriptions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      usuario_id INT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent VARCHAR(255) NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_push_usuario FOREIGN KEY (usuario_id) REFERENCES sistema_usuarios(id) ON DELETE CASCADE
    );
  END IF;

END$$
DELIMITER ;

CALL migrar_013();
DROP PROCEDURE IF EXISTS migrar_013;
