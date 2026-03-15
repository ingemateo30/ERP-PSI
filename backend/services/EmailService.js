// backend/services/EmailService.js
// Servicio para envío de correos electrónicos con soporte para adjuntos

const nodemailer = require('nodemailer');
const pool = require('../config/database');
const PDFGenerator = require('../utils/pdfGenerator');
const ContratoPDFGeneratorMINTIC = require('../utils/ContratoPDFGeneratorMINTIC');
const IVACalculatorService = require('./IVACalculatorService');

class EmailService {
  /**
   * Crear transporte de nodemailer con configuración de entorno
   */
  static crearTransporte() {
    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    // Si no hay configuración, usar modo testing (ethereal)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Configuración de email no encontrada. Usando modo de prueba.');
      return null;
    }

    return nodemailer.createTransport(config);
  }

  /**
   * Obtener plantilla de correo de la base de datos
   */
  static async obtenerPlantilla(tipo = 'bienvenida') {
    const conexion = await pool.getConnection();

    try {
      const [plantillas] = await conexion.execute(
        'SELECT * FROM plantillas_correo WHERE tipo = ? AND activo = 1 LIMIT 1',
        [tipo]
      );

      if (plantillas.length === 0) {
        // Plantilla por defecto si no existe en BD
        return {
          asunto: 'Bienvenido a PSI Telecomunicaciones',
          contenido: `
            <h2>¡Bienvenido {{nombre_cliente}}!</h2>
            <p>Nos complace darte la bienvenida a nuestra familia de clientes de PSI Telecomunicaciones.</p>
            <p>Adjunto encontrarás:</p>
            <ul>
              <li>Tu primera factura de servicio</li>
              <li>Tu contrato de prestación de servicios</li>
            </ul>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>Saludos cordiales,<br>
            <strong>{{empresa_nombre}}</strong><br>
            Tel: {{telefono_soporte}}</p>
          `
        };
      }

      return plantillas[0];
    } finally {
      conexion.release();
    }
  }

  /**
   * Reemplazar variables en plantilla de correo
   */
  static reemplazarVariables(contenido, variables) {
    let resultado = contenido;

    for (const [clave, valor] of Object.entries(variables)) {
      const regex = new RegExp(`{{${clave}}}`, 'g');
      resultado = resultado.replace(regex, valor || '');
    }

    return resultado;
  }

  /**
   * Obtener configuración de empresa
   */
  static async obtenerConfiguracionEmpresa() {
    const conexion = await pool.getConnection();

    try {
      const [config] = await conexion.execute(
        'SELECT * FROM configuracion_empresa WHERE id = 1'
      );

      if (config.length === 0) {
        return {
          empresa_nombre: 'PSI Telecomunicaciones',
          empresa_nit: 'NIT',
          telefono_soporte: 'Contacto'
        };
      }

      return config[0];
    } finally {
      conexion.release();
    }
  }

  /**
   * Generar PDF de factura como buffer
   */
   static async generarPDFFactura(facturaId, conexionExistente = null) {

    const conexion = conexionExistente || await pool.getConnection();

    try {
      // Obtener datos completos de la factura
      const [facturas] = await conexion.execute(`
        SELECT
          f.*,
          c.nombre as cliente_nombre,
          c.identificacion as cliente_identificacion,
          c.direccion as cliente_direccion,
          c.telefono as cliente_telefono,
          c.correo as cliente_email,
          c.barrio as cliente_barrio
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = ?
      `, [facturaId]);

      if (facturas.length === 0) {
        throw new Error('Factura no encontrada');
      }

      const factura = facturas[0];

      // Obtener configuración de empresa
      const empresa = await this.obtenerConfiguracionEmpresa();

      // Generar PDF usando PDFGenerator
      const pdfBuffer = await PDFGenerator.generarFactura(factura, empresa);

      return pdfBuffer;
    } finally {
      if (!conexionExistente) {

        conexion.release();

      }
    }
  }

  /**
 * Generar PDF de contrato como buffer
 */
static async generarPDFContrato(contratoId, conexionExistente = null) {
  const conexion = conexionExistente || await pool.getConnection();

  try {
    // ✅ CORRECCIÓN: Query completa con JOINs para ciudad, departamento, sector
    const [contratos] = await conexion.execute(`
      SELECT
        co.*,
        c.nombre as cliente_nombre,
        c.identificacion as cliente_identificacion,
        c.direccion as cliente_direccion,
        c.telefono as cliente_telefono,
        c.correo as cliente_email,
        c.estrato as cliente_estrato,
        c.barrio as cliente_barrio,
        ciu.nombre as ciudad_nombre,
        dep.nombre as departamento_nombre,
        sec.nombre as sector_nombre
      FROM contratos co
      JOIN clientes c ON co.cliente_id = c.id
      LEFT JOIN ciudades ciu ON c.ciudad_id = ciu.id
      LEFT JOIN departamentos dep ON ciu.departamento_id = dep.id
      LEFT JOIN sectores sec ON c.sector_id = sec.id
      WHERE co.id = ?
    `, [contratoId]);

    if (contratos.length === 0) {
      throw new Error('Contrato no encontrado');
    }

    const contrato = contratos[0];

    // Obtener servicios del contrato
    let servicios = [];
    try {
      const servicioId = contrato.servicio_id;

      // Verificar si es un array JSON o un ID simple
      let servicioIds = [];
      if (servicioId.startsWith('[')) {
        servicioIds = JSON.parse(servicioId);
      } else {
        servicioIds = [parseInt(servicioId)];
      }

      // ✅ CORRECCIÓN: Obtener TODOS los datos de los planes
      if (servicioIds.length > 0) {
        const placeholders = servicioIds.map(() => '?').join(',');
        const [serviciosData] = await conexion.execute(`
          SELECT
            sc.*,
            ps.nombre as plan_nombre,
            ps.tipo as tipo_servicio,
            ps.precio as precio_plan,
            ps.velocidad_bajada,
            ps.velocidad_subida,
            ps.canales_tv,
            ps.tecnologia,
            ps.aplica_iva
          FROM servicios_cliente sc
          JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.id IN (${placeholders})
        `, servicioIds);

        servicios = serviciosData;
      }
    } catch (error) {
      console.error('❌ Error obteniendo servicios del contrato:', error);
    }

    // Obtener configuración de empresa
    const empresa = await this.obtenerConfiguracionEmpresa();

    // ✅ Calcular IVA correctamente según estrato del cliente (igual que ContratosController)
    const clienteEstrato = parseInt(contrato.cliente_estrato) || 3;
    const serviciosConIVA = servicios.map(servicio => {
      const precioBase = parseFloat(servicio.precio_personalizado || servicio.precio_plan || servicio.precio || 0);
      const tipoServicio = servicio.tipo_servicio || servicio.tipo || 'internet';
      const ivaInfo = IVACalculatorService.determinarIVA(tipoServicio, clienteEstrato);
      const valorIVA = ivaInfo.aplica ? Math.round(precioBase * (ivaInfo.porcentaje / 100)) : 0;
      const precioConIVA = precioBase + valorIVA;

      return {
        plan_nombre: servicio.plan_nombre,
        tipo: tipoServicio,
        tipo_servicio: tipoServicio,
        precio_plan: precioBase,
        precio: precioBase,
        precio_con_iva: precioConIVA,
        valor_iva: valorIVA,
        velocidad_bajada: servicio.velocidad_bajada,
        velocidad_subida: servicio.velocidad_subida,
        canales_tv: servicio.canales_tv,
        tecnologia: servicio.tecnologia,
        descripcion: servicio.descripcion,
        aplica_iva: ivaInfo.aplica,
        porcentaje_iva: ivaInfo.porcentaje
      };
    });

    // ✅ CORRECCIÓN: Preparar datos COMPLETOS para el generador de PDF
    const datosContrato = {
      ...contrato,
      servicios: serviciosConIVA,
      empresa: empresa,
      // ✅ CRÍTICO: Incluir explícitamente estos campos
      departamento: contrato.departamento_nombre || '',
      ciudad: contrato.ciudad_nombre || '',
      sector: contrato.sector_nombre || '',
      estrato: contrato.cliente_estrato || 3,
      barrio: contrato.cliente_barrio || ''
    };

    console.log('📄 Generando PDF del contrato con datos completos:', {
      numero_contrato: contrato.numero_contrato,
      cliente: contrato.cliente_nombre,
      ciudad: datosContrato.ciudad,
      departamento: datosContrato.departamento,
      estrato: datosContrato.estrato,
      servicios: servicios.length
    });

    // Generar PDF usando ContratoPDFGenerator
    const pdfBuffer = await ContratoPDFGeneratorMINTIC.generarPDFCompleto(datosContrato);

    return pdfBuffer;
  } finally {
    if (!conexionExistente) {
      conexion.release();
    }
  }
}
  /**
   * Enviar correo de bienvenida con primera factura y contrato adjuntos
   */
  static async enviarCorreoBienvenida(clienteId, datosCliente, opciones = {}) {
    console.log(`📧 Preparando correo de bienvenida para cliente ${clienteId}...`);

    // Aceptar conexión existente o crear una nueva
    const conexionProvista = opciones.conexion;
    const conexion = conexionProvista || await pool.getConnection();

    try {
      // 1. Obtener datos completos del cliente
      const [clientes] = await conexion.execute(
        'SELECT * FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (clientes.length === 0) {
        throw new Error(`Cliente no encontrado con ID: ${clienteId}`);
      }

      const cliente = clientes[0];

      // Validar que el cliente tenga email
      if (!cliente.correo || cliente.correo === '') {
        console.warn('⚠️ Cliente sin correo electrónico. No se puede enviar email de bienvenida.');
        return {
          enviado: false,
          motivo: 'Cliente sin correo electrónico'
        };
      }

      // 2. Obtener la última factura del cliente
      const [facturas] = await conexion.execute(`
        SELECT id, numero_factura, total
        FROM facturas
        WHERE cliente_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [clienteId]);

      // 3. Obtener el último contrato del cliente
      const [contratos] = await conexion.execute(`
        SELECT id, numero_contrato
        FROM contratos
        WHERE cliente_id = ?
        ORDER BY fecha_generacion DESC
        LIMIT 1
      `, [clienteId]);

      // 4. Obtener plantilla de correo
      const plantilla = await this.obtenerPlantilla('bienvenida');

      // 5. Obtener configuración de empresa
      const empresa = await this.obtenerConfiguracionEmpresa();

      // 6. Preparar variables para reemplazar en la plantilla
      const variables = {
        nombre_cliente: cliente.nombre,
        fecha_actual: new Date().toLocaleDateString('es-CO'),
        empresa_nombre: empresa.empresa_nombre || 'PSI Telecomunicaciones',
        telefono_soporte: empresa.telefono_soporte || empresa.empresa_telefono || 'Contacto',
        numero_factura: facturas.length > 0 ? facturas[0].numero_factura : 'N/A',
        numero_contrato: contratos.length > 0 ? contratos[0].numero_contrato : 'N/A'
      };

      // 7. Reemplazar variables en el contenido
      const asunto = this.reemplazarVariables(plantilla.asunto, variables);
      const contenidoHTML = this.reemplazarVariables(plantilla.contenido, variables);

      // 8. Crear transporte de email
      const transporte = this.crearTransporte();

      if (!transporte) {
        console.error('❌ No se pudo crear transporte de email. Verifique configuración.');
        return {
          enviado: false,
          motivo: 'Configuración de email no disponible'
        };
      }

      // 9. Preparar adjuntos (PDFs)
      const adjuntos = [];

      // Adjuntar factura si existe
      if (facturas.length > 0) {
        try {
          const pdfFactura = await this.generarPDFFactura(facturas[0].id, conexion);

          adjuntos.push({

            filename: `Factura_${facturas[0].numero_factura}.pdf`,

            content: pdfFactura,

            contentType: 'application/pdf'

          });

          console.log(`✅ PDF de factura generado: ${facturas[0].numero_factura}`);

        } catch (error) {

          console.error('❌ Error generando PDF de factura:', error);

        }

      }

 

      // Adjuntar contrato si existe

      if (contratos.length > 0) {

        try {

          const pdfContrato = await this.generarPDFContrato(contratos[0].id, conexion);
          adjuntos.push({
            filename: `Contrato_${contratos[0].numero_contrato}.pdf`,
            content: pdfContrato,
            contentType: 'application/pdf'
          });
          console.log(`✅ PDF de contrato generado: ${contratos[0].numero_contrato}`);
        } catch (error) {
          console.error('❌ Error generando PDF de contrato:', error);
        }
      }

      // 10. Preparar opciones del correo
      const mailOptions = {
        from: `"${empresa.empresa_nombre || 'PSI'}" <${process.env.EMAIL_USER}>`,
        to: cliente.correo,
        subject: asunto,
        html: contenidoHTML,
        attachments: adjuntos
      };

      // 11. Enviar correo
      console.log(`📤 Enviando correo a: ${cliente.correo}`);
      const info = await transporte.sendMail(mailOptions);

      console.log(`✅ Correo de bienvenida enviado exitosamente: ${info.messageId}`);

      // 12. Registrar envío en base de datos (opcional)
      try {
        await conexion.execute(`
          INSERT INTO notificaciones (
            tipo, destinatario, asunto, mensaje, estado,
            cliente_id, created_at
          ) VALUES (?, ?, ?, ?, 'enviado', ?, NOW())
        `, [
          'email_bienvenida',
          cliente.correo,
          asunto,
          'Correo de bienvenida con factura y contrato adjuntos',
          clienteId
        ]);
      } catch (error) {
        console.warn('⚠️ No se pudo registrar notificación en BD:', error.message);
      }

      return {
        enviado: true,
        messageId: info.messageId,
        destinatario: cliente.correo,
        adjuntos: adjuntos.length
      };

    } catch (error) {
      console.error('❌ Error enviando correo de bienvenida:', error);

      // Registrar error en base de datos
      try {
        await conexion.execute(`
          INSERT INTO notificaciones (
            tipo, destinatario, asunto, mensaje, estado,
            cliente_id, created_at
          ) VALUES (?, ?, ?, ?, 'fallido', ?, NOW())
        `, [
          'email_bienvenida',
          datosCliente.email || datosCliente.correo || 'desconocido',
          'Error en envío',
          error.message,
          clienteId
        ]);
      } catch (dbError) {
        console.warn('⚠️ No se pudo registrar error en BD:', dbError.message);
      }

      throw error;
    } finally {
      // Solo liberar la conexión si no fue provista externamente
      if (!conexionProvista) {
        conexion.release();
      }
    }
  }

  /**
   * Enviar factura por correo
   */
  static async enviarFactura(facturaId, emailDestino = null) {
    console.log(`📧 Enviando factura ${facturaId}...`);

    const conexion = await pool.getConnection();

    try {
      // Obtener datos de la factura y cliente
      const [facturas] = await conexion.execute(`
        SELECT
          f.*,
          c.nombre as cliente_nombre,
          c.correo as cliente_email
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = ?
      `, [facturaId]);

      if (facturas.length === 0) {
        throw new Error('Factura no encontrada');
      }

      const factura = facturas[0];
      const destinatario = emailDestino || factura.cliente_email;

      if (!destinatario) {
        throw new Error('No se especificó destinatario de correo');
      }

      // Generar PDF
      const pdfBuffer = await this.generarPDFFactura(facturaId);

      // Obtener configuración de empresa
      const empresa = await this.obtenerConfiguracionEmpresa();

      // Crear transporte
      const transporte = this.crearTransporte();

      if (!transporte) {
        throw new Error('Configuración de email no disponible');
      }

      // Obtener plantilla de correo para facturas (con fallback)
      const plantilla = await this.obtenerPlantilla('factura');
      const variables = {
        nombre_cliente: factura.cliente_nombre,
        numero_factura: factura.numero_factura,
        total_factura: `$${parseFloat(factura.total).toLocaleString('es-CO')}`,
        fecha_vencimiento: new Date(factura.fecha_vencimiento).toLocaleDateString('es-CO'),
        empresa_nombre: empresa.empresa_nombre || 'PSI Telecomunicaciones',
        telefono_soporte: empresa.telefono || '',
        periodo_facturacion: factura.periodo_facturacion || ''
      };

      const asunto = this.reemplazarVariables(
        plantilla.asunto || `Factura ${factura.numero_factura} - ${empresa.empresa_nombre}`,
        variables
      );
      const contenidoHTML = this.reemplazarVariables(
        plantilla.contenido || `
          <h2>Factura de Servicio</h2>
          <p>Estimado/a {{nombre_cliente}},</p>
          <p>Adjunto encontrará su factura <strong>{{numero_factura}}</strong> por un valor de <strong>{{total_factura}}</strong>.</p>
          <p>Fecha de vencimiento: {{fecha_vencimiento}}</p>
          <p>Saludos cordiales,<br>{{empresa_nombre}}</p>
        `,
        variables
      );

      // Preparar y enviar correo
      const mailOptions = {
        from: `"${empresa.empresa_nombre || 'PSI'}" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: asunto,
        html: contenidoHTML,
        attachments: [{
          filename: `Factura_${factura.numero_factura}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      };

      const info = await transporte.sendMail(mailOptions);

      console.log(`✅ Factura enviada exitosamente: ${info.messageId}`);

      return {
        enviado: true,
        messageId: info.messageId,
        destinatario: destinatario
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Enviar notificación de vencimiento de factura
   */
  static async enviarNotificacionVencimiento(facturaId) {
    console.log(`📧 Enviando notificación de vencimiento para factura ${facturaId}...`);

    const conexion = await pool.getConnection();

    try {
      const [facturas] = await conexion.execute(`
        SELECT
          f.*,
          c.nombre as cliente_nombre,
          c.correo as cliente_email
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = ? AND f.estado = 'pendiente'
      `, [facturaId]);

      if (facturas.length === 0) {
        console.warn('Factura no encontrada o ya pagada');
        return { enviado: false };
      }

      const factura = facturas[0];

      if (!factura.cliente_email) {
        console.warn('Cliente sin correo electrónico');
        return { enviado: false };
      }

      const empresa = await this.obtenerConfiguracionEmpresa();
      const transporte = this.crearTransporte();

      if (!transporte) {
        throw new Error('Configuración de email no disponible');
      }

      const diasVencidos = Math.floor((new Date() - new Date(factura.fecha_vencimiento)) / (1000 * 60 * 60 * 24));

      const mailOptions = {
        from: `"${empresa.empresa_nombre || 'PSI'}" <${process.env.EMAIL_USER}>`,
        to: factura.cliente_email,
        subject: `Recordatorio: Factura ${factura.numero_factura} ${diasVencidos > 0 ? 'VENCIDA' : 'por vencer'}`,
        html: `
          <h2>Recordatorio de Pago</h2>
          <p>Estimado/a ${factura.cliente_nombre},</p>
          <p>Le recordamos que su factura <strong>${factura.numero_factura}</strong> ${diasVencidos > 0 ? `está vencida hace ${diasVencidos} días` : 'está próxima a vencer'}.</p>
          <p><strong>Valor a pagar:</strong> $${parseFloat(factura.total).toLocaleString('es-CO')}</p>
          <p><strong>Fecha de vencimiento:</strong> ${new Date(factura.fecha_vencimiento).toLocaleDateString('es-CO')}</p>
          <p>Por favor, realice su pago a la mayor brevedad para evitar suspensión del servicio.</p>
          <p>Saludos cordiales,<br>${empresa.empresa_nombre}</p>
        `
      };

      const info = await transporte.sendMail(mailOptions);

      console.log(`✅ Notificación de vencimiento enviada: ${info.messageId}`);

      return {
        enviado: true,
        messageId: info.messageId
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Enviar notificación a administradores
   */
  static async enviarNotificacionAdmin(asunto, mensaje, datos = {}) {
    console.log(`📧 Enviando notificación a administradores: ${asunto}`);

    const emailsAdmin = (process.env.EMAIL_ADMIN || '').split(',').filter(e => e.trim());

    if (emailsAdmin.length === 0) {
      console.warn('⚠️ No hay emails de administrador configurados');
      return { enviado: false };
    }

    const transporte = this.crearTransporte();

    if (!transporte) {
      throw new Error('Configuración de email no disponible');
    }

    const empresa = await this.obtenerConfiguracionEmpresa();

    const mailOptions = {
      from: `"${empresa.empresa_nombre || 'PSI'} - Sistema" <${process.env.EMAIL_USER}>`,
      to: emailsAdmin.join(','),
      subject: `[ADMIN] ${asunto}`,
      html: `
        <h2>${asunto}</h2>
        <p>${mensaje}</p>
        ${datos && Object.keys(datos).length > 0 ? `
          <h3>Datos adicionales:</h3>
          <pre>${JSON.stringify(datos, null, 2)}</pre>
        ` : ''}
        <hr>
        <small>Este es un mensaje automático del sistema ERP-PSI</small>
      `
    };

    const info = await transporte.sendMail(mailOptions);

    console.log(`✅ Notificación a admins enviada: ${info.messageId}`);

    return {
      enviado: true,
      messageId: info.messageId,
      destinatarios: emailsAdmin.length
    };
  }
}

module.exports = EmailService;
