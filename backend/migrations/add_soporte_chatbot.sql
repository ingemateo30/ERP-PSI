-- =====================================================
-- TABLAS PARA SISTEMA DE SOPORTE CON CHATBOT IA
-- =====================================================

-- Tabla para almacenar historial de conversaciones del chatbot
CREATE TABLE IF NOT EXISTS `soporte_chat_historico` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL,
  `nombre_usuario` VARCHAR(255) NULL,
  `email_usuario` VARCHAR(255) NULL,
  `telefono_usuario` VARCHAR(20) NULL,
  `cliente_id` INT NULL,
  `mensaje_usuario` TEXT NOT NULL,
  `respuesta_ia` TEXT NOT NULL,
  `tipo_consulta` VARCHAR(50) NULL COMMENT 'tecnica, facturacion, comercial, general',
  `problema_resuelto` BOOLEAN DEFAULT FALSE,
  `satisfaccion` INT NULL COMMENT 'Rating 1-5',
  `convertido_pqr` BOOLEAN DEFAULT FALSE,
  `pqr_id` INT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_email (email_usuario),
  INDEX idx_tipo (tipo_consulta),
  INDEX idx_fecha (created_at),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (pqr_id) REFERENCES pqr(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para FAQs (Preguntas Frecuentes)
CREATE TABLE IF NOT EXISTS `soporte_faq` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `pregunta` TEXT NOT NULL,
  `respuesta` TEXT NOT NULL,
  `categoria` VARCHAR(50) NOT NULL COMMENT 'tecnica, facturacion, comercial, general',
  `palabras_clave` TEXT NULL COMMENT 'Palabras clave separadas por comas',
  `orden` INT DEFAULT 0,
  `activo` BOOLEAN DEFAULT TRUE,
  `vistas` INT DEFAULT 0,
  `util_count` INT DEFAULT 0 COMMENT 'Cuántas veces se marcó como útil',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categoria (categoria),
  INDEX idx_activo (activo),
  INDEX idx_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para sesiones de chat
CREATE TABLE IF NOT EXISTS `soporte_chat_sesiones` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` VARCHAR(100) UNIQUE NOT NULL,
  `nombre_usuario` VARCHAR(255) NULL,
  `email_usuario` VARCHAR(255) NULL,
  `telefono_usuario` VARCHAR(20) NULL,
  `cliente_id` INT NULL,
  `estado` ENUM('activa', 'finalizada', 'escalada') DEFAULT 'activa',
  `problemas_resueltos` INT DEFAULT 0,
  `mensajes_count` INT DEFAULT 0,
  `satisfaccion_final` INT NULL,
  `duracion_minutos` INT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `finished_at` TIMESTAMP NULL,
  INDEX idx_session (session_id),
  INDEX idx_estado (estado),
  INDEX idx_email (email_usuario),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para problemas comunes y soluciones automatizadas
CREATE TABLE IF NOT EXISTS `soporte_problemas_comunes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `categoria` VARCHAR(50) NOT NULL,
  `palabras_clave` TEXT NOT NULL COMMENT 'Palabras clave para detectar el problema',
  `solucion_pasos` JSON NOT NULL COMMENT 'Array de pasos para resolver',
  `requiere_tecnico` BOOLEAN DEFAULT FALSE,
  `prioridad` ENUM('baja', 'media', 'alta') DEFAULT 'media',
  `veces_usado` INT DEFAULT 0,
  `tasa_exito` DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Porcentaje de éxito',
  `activo` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categoria (categoria),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DATOS INICIALES - FAQs
-- =====================================================

INSERT INTO `soporte_faq` (`pregunta`, `respuesta`, `categoria`, `palabras_clave`, `orden`, `activo`) VALUES
('¿Cómo reinicio mi router?',
 'Para reiniciar tu router sigue estos pasos:\n1. Desconecta el cable de alimentación del router\n2. Espera 30 segundos\n3. Vuelve a conectar el cable de alimentación\n4. Espera 2-3 minutos hasta que todas las luces se estabilicen\n5. Verifica que tu internet funcione correctamente\n\n**Nota:** No uses el botón de reset físico, ya que esto restaura la configuración de fábrica.',
 'tecnica',
 'reiniciar,router,reinicio,apagar,prender,internet no funciona',
 1, TRUE),

('¿Qué hago si no tengo señal de internet?',
 'Si no tienes señal de internet, prueba lo siguiente:\n1. Verifica que el router esté encendido (luces LED)\n2. Revisa que los cables estén bien conectados\n3. Reinicia el router (ver FAQ de reinicio)\n4. Reinicia tu dispositivo (PC, celular, etc.)\n5. Verifica que no haya cortes de servicio programados\n\nSi después de estos pasos sigue sin funcionar, podemos crear un reporte técnico para que un especialista te ayude.',
 'tecnica',
 'sin internet,no hay señal,sin conexion,no conecta,internet caído',
 2, TRUE),

('¿Cómo cambio mi contraseña del WiFi?',
 'Para cambiar tu contraseña WiFi:\n1. Ingresa a la configuración del router desde tu navegador: http://192.168.1.1\n2. Usuario: admin | Contraseña: admin (o la que hayas configurado)\n3. Ve a la sección "WiFi" o "Wireless"\n4. Busca "Contraseña" o "Password"\n5. Ingresa tu nueva contraseña (mínimo 8 caracteres)\n6. Guarda los cambios y reconecta tus dispositivos\n\n**Importante:** Anota tu nueva contraseña en un lugar seguro.',
 'tecnica',
 'cambiar contraseña,password wifi,clave wifi,modificar contraseña',
 3, TRUE),

('¿Cuándo vence mi factura?',
 'Para consultar la fecha de vencimiento de tu factura:\n- Revisa el correo electrónico que te enviamos con la factura\n- La fecha de vencimiento aparece en la parte superior de la factura\n- También puedes consultar en nuestro portal web con tu número de cliente\n\n¿Necesitas que busquemos tu factura? Por favor proporciona tu número de cliente o correo electrónico registrado.',
 'facturacion',
 'fecha vencimiento,cuando vence,factura,pago,vencimiento',
 4, TRUE),

('¿Cómo puedo pagar mi factura?',
 'Tenemos varios métodos de pago disponibles:\n\n**Opciones en línea:**\n- Transferencia bancaria\n- PSE\n- Tarjeta de crédito/débito\n\n**Opciones presenciales:**\n- Efectivo en puntos autorizados\n- Bancos corresponsales\n\n**Datos para transferencia:**\nTe los enviaremos por correo junto con tu número de referencia.\n\n¿Necesitas ayuda con algún método específico?',
 'facturacion',
 'pagar factura,como pago,metodos de pago,pagar cuenta,opciones pago',
 5, TRUE),

('Mi internet está lento, ¿qué hago?',
 'Si tu internet está lento, intenta lo siguiente:\n\n1. **Test de velocidad:** Prueba en https://fast.com para verificar la velocidad real\n2. **Reinicia el router** (ver FAQ de reinicio)\n3. **Verifica dispositivos conectados:** Demasiados dispositivos pueden afectar la velocidad\n4. **Cambia de canal WiFi** si hay muchas redes cerca\n5. **Ubica mejor el router:** Evita paredes gruesas y electrodomésticos\n6. **Usa cable Ethernet** para mejor estabilidad\n\n¿Después de esto sigue lento? Podemos crear un reporte técnico.',
 'tecnica',
 'internet lento,velocidad baja,slow,conexion lenta,tarda mucho',
 6, TRUE),

('¿Qué plan de internet tengo contratado?',
 'Para consultar tu plan actual necesito verificar tus datos.\n\n¿Puedes proporcionarme tu:\n- Número de cliente, o\n- Correo electrónico registrado, o\n- Número de cédula\n\nCon esta información podré consultar tu plan, velocidad contratada y servicios adicionales.',
 'comercial',
 'mi plan,que plan tengo,plan contratado,velocidad contratada',
 7, TRUE),

('¿Cómo solicito un cambio de plan?',
 'Para cambiar tu plan de internet:\n\n1. **Conoce los planes disponibles** en nuestro sitio web\n2. **Verifica la disponibilidad** en tu zona\n3. **Solicita el cambio** mediante:\n   - Este chat (te ayudaré a crear la solicitud)\n   - Llamada a servicio al cliente\n   - Correo electrónico\n\n¿Te gustaría que creara una solicitud de cambio de plan? Necesitaré algunos datos adicionales.',
 'comercial',
 'cambiar plan,upgrade,mejorar plan,aumentar velocidad,otro plan',
 8, TRUE);

-- =====================================================
-- DATOS INICIALES - Problemas Comunes
-- =====================================================

INSERT INTO `soporte_problemas_comunes` (`nombre`, `descripcion`, `categoria`, `palabras_clave`, `solucion_pasos`, `requiere_tecnico`, `prioridad`) VALUES
('Reinicio de Router',
 'El router necesita ser reiniciado para restablecer la conexión',
 'tecnica',
 'reiniciar,router,reinicio,no internet,sin conexion',
 JSON_ARRAY(
   'Paso 1: Desconecta el cable de alimentación del router',
   'Paso 2: Espera 30 segundos completos',
   'Paso 3: Vuelve a conectar el cable de alimentación',
   'Paso 4: Espera 2-3 minutos hasta que todas las luces LED se estabilicen',
   'Paso 5: Verifica tu conexión a internet'
 ),
 FALSE, 'media'),

('Verificación de Cables',
 'Verificar que todos los cables estén correctamente conectados',
 'tecnica',
 'no enciende,sin luces,cables,conexiones',
 JSON_ARRAY(
   'Paso 1: Verifica que el cable de alimentación esté conectado al router y al tomacorriente',
   'Paso 2: Asegúrate que el cable de red (WAN) esté conectado al puerto correcto',
   'Paso 3: Si usas cable Ethernet, verifica que esté bien conectado',
   'Paso 4: Revisa que no haya cables dañados o rotos',
   'Paso 5: Intenta conectar en otro tomacorriente'
 ),
 FALSE, 'media'),

('Optimización de WiFi',
 'Mejorar la señal y velocidad del WiFi',
 'tecnica',
 'wifi lento,señal debil,velocidad baja,mala conexion wifi',
 JSON_ARRAY(
   'Paso 1: Ubica el router en un lugar central y elevado',
   'Paso 2: Aleja el router de electrodomésticos (microondas, teléfonos inalámbricos)',
   'Paso 3: Reduce el número de dispositivos conectados simultáneamente',
   'Paso 4: Cambia el canal WiFi desde la configuración del router',
   'Paso 5: Considera usar cable Ethernet para dispositivos fijos'
 ),
 FALSE, 'baja'),

('Problema de Autenticación',
 'No puede conectarse por contraseña incorrecta',
 'tecnica',
 'contraseña incorrecta,no puedo conectar,password wrong,clave wifi',
 JSON_ARRAY(
   'Paso 1: Verifica que estés usando la contraseña correcta (distingue mayúsculas/minúsculas)',
   'Paso 2: Busca la contraseña en la etiqueta del router',
   'Paso 3: Si cambiaste la contraseña, asegúrate de usar la nueva',
   'Paso 4: Intenta olvidar la red en tu dispositivo y volver a conectar',
   'Paso 5: Si no recuerdas la contraseña, puedo ayudarte a restablecerla'
 ),
 FALSE, 'media'),

('Corte Masivo del Servicio',
 'Verificar si hay un corte general en la zona',
 'tecnica',
 'sin servicio,corte,internet caido,falla general',
 JSON_ARRAY(
   'Paso 1: Verificando el estado del servicio en tu zona...',
   'Paso 2: Consultando reportes de otros usuarios en el área',
   'Paso 3: Si hay un corte confirmado, te notificaremos el tiempo estimado de reparación',
   'Paso 4: Si no hay cortes reportados, procederemos con diagnóstico individual'
 ),
 TRUE, 'alta');

-- =====================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================

-- Índice para búsqueda de palabras clave en FAQs
ALTER TABLE soporte_faq ADD FULLTEXT INDEX idx_fulltext_faq (pregunta, respuesta, palabras_clave);

-- Índice para búsqueda de palabras clave en problemas comunes
ALTER TABLE soporte_problemas_comunes ADD FULLTEXT INDEX idx_fulltext_problemas (nombre, descripcion, palabras_clave);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para estadísticas del chatbot
CREATE OR REPLACE VIEW vista_estadisticas_chatbot AS
SELECT
    DATE(created_at) as fecha,
    COUNT(*) as total_conversaciones,
    SUM(CASE WHEN problema_resuelto = TRUE THEN 1 ELSE 0 END) as problemas_resueltos,
    SUM(CASE WHEN convertido_pqr = TRUE THEN 1 ELSE 0 END) as pqrs_creados,
    AVG(satisfaccion) as satisfaccion_promedio,
    tipo_consulta,
    COUNT(DISTINCT session_id) as sesiones_unicas
FROM soporte_chat_historico
GROUP BY DATE(created_at), tipo_consulta;

-- Vista para FAQs más útiles
CREATE OR REPLACE VIEW vista_faq_populares AS
SELECT
    id,
    pregunta,
    categoria,
    vistas,
    util_count,
    ROUND((util_count / NULLIF(vistas, 0)) * 100, 2) as tasa_utilidad
FROM soporte_faq
WHERE activo = TRUE
ORDER BY vistas DESC, util_count DESC;

-- =====================================================
-- FIN DE SCRIPT
-- =====================================================
