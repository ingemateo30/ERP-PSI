-- =====================================================
-- Migración: Agregar plantilla de correo de bienvenida
-- Fecha: 2025-11-18
-- Descripción: Inserta la plantilla de correo de bienvenida con adjuntos
-- =====================================================

-- Verificar si ya existe la plantilla de bienvenida
-- Si existe, actualízala; si no, créala

INSERT INTO plantillas_correo (
  titulo,
  asunto,
  contenido,
  tipo,
  activo,
  created_at,
  updated_at
)
SELECT
  'Correo de Bienvenida con Documentos',
  'Bienvenido a {{empresa_nombre}} - PSI Telecomunicaciones',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .welcome-message {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .info-box {
      background: white;
      padding: 20px;
      border-left: 4px solid #667eea;
      margin: 20px 0;
    }
    .attachments-list {
      list-style: none;
      padding: 0;
    }
    .attachments-list li {
      padding: 10px;
      margin: 5px 0;
      background: white;
      border-radius: 5px;
    }
    .attachments-list li:before {
      content: "📎 ";
      margin-right: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .contact-info {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>¡Bienvenido a {{empresa_nombre}}!</h1>
  </div>

  <div class="content">
    <p class="welcome-message">
      Estimado/a <strong>{{nombre_cliente}}</strong>,
    </p>

    <p>
      Es un placer darte la bienvenida a nuestra familia de clientes de <strong>{{empresa_nombre}}</strong>.
      Agradecemos la confianza que has depositado en nosotros para brindarte los mejores servicios de telecomunicaciones.
    </p>

    <div class="info-box">
      <h3>📄 Documentos Adjuntos</h3>
      <p>Con este correo encontrarás los siguientes documentos importantes:</p>
      <ul class="attachments-list">
        <li><strong>Tu primera factura de servicio</strong> - Número: {{numero_factura}}</li>
        <li><strong>Tu contrato de prestación de servicios</strong> - Número: {{numero_contrato}}</li>
      </ul>
      <p style="margin-top: 15px;">
        <small>💡 Te recomendamos guardar estos documentos para futuras referencias.</small>
      </p>
    </div>

    <div class="info-box">
      <h3>🚀 Próximos Pasos</h3>
      <ol>
        <li><strong>Revisa tu factura:</strong> Verifica los detalles de tu plan y el valor a pagar</li>
        <li><strong>Lee tu contrato:</strong> Conoce tus derechos y responsabilidades</li>
        <li><strong>Espera la instalación:</strong> Nuestro equipo técnico se pondrá en contacto contigo pronto</li>
        <li><strong>Realiza tu primer pago:</strong> Antes de la fecha de vencimiento indicada en la factura</li>
      </ol>
    </div>

    <div class="contact-info">
      <h3>📞 ¿Necesitas Ayuda?</h3>
      <p>
        Estamos aquí para ayudarte. Si tienes alguna pregunta o necesitas asistencia,
        no dudes en contactarnos:
      </p>
      <p>
        <strong>Teléfono:</strong> {{telefono_soporte}}<br>
        <strong>Fecha:</strong> {{fecha_actual}}
      </p>
    </div>

    <p style="margin-top: 30px;">
      Gracias por elegirnos. Esperamos brindarte un excelente servicio.
    </p>

    <p>
      Cordialmente,<br>
      <strong>Equipo de {{empresa_nombre}}</strong>
    </p>
  </div>

  <div class="footer">
    <p>
      Este es un correo automático, por favor no responder a esta dirección.<br>
      Si necesitas contactarnos, utiliza los medios indicados arriba.
    </p>
    <p>
      &copy; {{fecha_actual}} {{empresa_nombre}}. Todos los derechos reservados.
    </p>
  </div>
</body>
</html>',
  'bienvenida',
  1,
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM plantillas_correo WHERE tipo = 'bienvenida' AND activo = 1
);

-- Verificar que la plantilla se insertó correctamente
SELECT
  id,
  titulo,
  asunto,
  tipo,
  activo,
  created_at
FROM plantillas_correo
WHERE tipo = 'bienvenida';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
