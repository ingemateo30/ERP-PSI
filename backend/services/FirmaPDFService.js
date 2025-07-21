// backend/services/FirmaPDFService.js - DEFINITIVO CORREGIDO
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const Database = require('../config/database');

class FirmaPDFService {
  
  /**
   * Abrir contrato PDF para firma - CONSULTA SQL DEFINITIVA CORRECTA
   */
  static async abrirContratoParaFirma(contratoId) {
    try {
      
      
      console.log(`📋 Abriendo contrato ${contratoId} para firma...`);
      
      // CONSULTA SQL CORRECTA con estructura REAL de la base de datos
      const [contratos] = await Database.query(`
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion,
          cl.telefono as cliente_telefono,
          cl.correo as cliente_email,
          cl.direccion as cliente_direccion,
          cl.barrio as cliente_barrio,
          ps.nombre as servicio_nombre,
          ps.descripcion as servicio_descripcion,
          ps.precio as servicio_precio,
          ps.tipo as servicio_tipo,
          sc.precio_personalizado as precio_personalizado,
          sc.fecha_activacion as fecha_activacion_servicio
        FROM contratos c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.id = ?
      `, [contratoId]);

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      
      // Verificar si ya tiene PDF generado
      let rutaPDF = contrato.documento_pdf_path;
      let pdfExiste = false;
      
      if (rutaPDF && fs.existsSync(rutaPDF)) {
        pdfExiste = true;
        console.log('📁 PDF existente encontrado:', rutaPDF);
      } else {
        console.log('📄 PDF no existe, se generará cuando sea necesario');
      }

      // Preparar datos para el visor de firma con campos REALES
      const datosVisor = {
        contrato_id: parseInt(contratoId),
        numero_contrato: contrato.numero_contrato,
        cliente_nombre: contrato.cliente_nombre,
        cliente_identificacion: contrato.cliente_identificacion,
        cliente_telefono: contrato.cliente_telefono,
        cliente_email: contrato.cliente_email,
        cliente_direccion: contrato.cliente_direccion,
        cliente_barrio: contrato.cliente_barrio,
        servicio_nombre: contrato.servicio_nombre,
        servicio_tipo: contrato.servicio_tipo,
        servicio_precio: contrato.precio_personalizado || contrato.servicio_precio,
        fecha_activacion_servicio: contrato.fecha_activacion_servicio,
        fecha_inicio: contrato.fecha_inicio,
        fecha_fin: contrato.fecha_fin,
        tipo_permanencia: contrato.tipo_permanencia,
        permanencia_meses: contrato.permanencia_meses,
        costo_instalacion: contrato.costo_instalacion,
        estado: contrato.estado,
        ruta_pdf: rutaPDF,
        pdf_existe: pdfExiste,
        firmado: Boolean(contrato.firmado_cliente),
        fecha_firma: contrato.fecha_firma,
        observaciones: contrato.observaciones
      };
      console.log('✅ Contrato abierto para firma exitosamente');
      return datosVisor;

    } catch (error) {
      console.error('❌ Error abriendo contrato para firma:', error);
      throw error;
    }
  }

  /**
   * Procesar firma digital/tablet y guardar PDF firmado
   */
  static async procesarFirmaYGuardarPDF(contratoId, datosSignature) {
    const conexion = await Database.getConnection();
    
    try {
      await conexion.beginTransaction();

      console.log(`🖊️ Procesando firma del contrato ${contratoId}...`);

      // Validar datos de la firma
      const { 
        signature_base64, 
        firmado_por, 
        cedula_firmante, 
        tipo_firma = 'digital',
        observaciones = '' 
      } = datosSignature;

      if (!signature_base64 || !firmado_por || !cedula_firmante) {
        throw new Error('Datos de firma incompletos');
      }

      // Obtener contrato actual
      const [contratos] = await conexion.execute(`
        SELECT * FROM contratos WHERE id = ?
      `, [contratoId]);

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      
      // Verificar que no esté ya firmado
      if (contrato.firmado_cliente) {
        throw new Error('Este contrato ya ha sido firmado');
      }

      // Cargar PDF existente o generar uno nuevo
      let rutaPDFOriginal = contrato.documento_pdf_path;
      
      if (!rutaPDFOriginal || !fs.existsSync(rutaPDFOriginal)) {
        console.log('📄 Generando PDF original del contrato...');
        rutaPDFOriginal = await this.generarPDFContrato(contratoId);
      }

      // Crear directorio para PDFs firmados
      const uploadsDir = path.join(process.cwd(), 'uploads', 'contratos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Procesar PDF con firma
      const pdfBytes = fs.readFileSync(rutaPDFOriginal);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Agregar firma al PDF
      await this.agregarFirmaAlPDF(pdfDoc, signature_base64, {
        firmado_por,
        cedula_firmante,
        fecha_firma: new Date().toLocaleDateString('es-CO'),
        observaciones
      });

      // Guardar PDF firmado con nuevo nombre
      const nombreArchivoFirmado = `contrato_${contrato.numero_contrato}_firmado_${Date.now()}.pdf`;
      const rutaPDFFirmado = path.join(uploadsDir, nombreArchivoFirmado);

      const pdfBytesModificado = await pdfDoc.save();
      fs.writeFileSync(rutaPDFFirmado, pdfBytesModificado);

      console.log('💾 PDF firmado guardado en:', rutaPDFFirmado);

      // Actualizar base de datos
      const observacionesActualizadas = `${contrato.observaciones || ''}\n[FIRMA DIGITAL] Firmado por: ${firmado_por} - Cédula: ${cedula_firmante} - Fecha: ${new Date().toLocaleString('es-CO')} - Tipo: ${tipo_firma}${observaciones ? ` - Obs: ${observaciones}` : ''}`;

      await conexion.execute(`
        UPDATE contratos SET
          documento_pdf_path = ?,
          firmado_cliente = 1,
          fecha_firma = CURDATE(),
          observaciones = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        rutaPDFFirmado,
        observacionesActualizadas,
        contratoId
      ]);

      await conexion.commit();

      console.log(`✅ Contrato ${contrato.numero_contrato} firmado digitalmente`);

      return {
        success: true,
        contrato_id: parseInt(contratoId),
        numero_contrato: contrato.numero_contrato,
        pdf_firmado_path: rutaPDFFirmado,
        firmado_por: firmado_por,
        cedula_firmante: cedula_firmante,
        fecha_firma: new Date().toISOString(),
        mensaje: 'Contrato firmado y guardado exitosamente'
      };

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error procesando firma:', error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Agregar firma visual al PDF
   */
  static async agregarFirmaAlPDF(pdfDoc, signatureBase64, datosSignature) {
    try {
      console.log('🖊️ Agregando firma visual al PDF...');
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Convertir base64 a imagen
      const signatureImageBytes = Buffer.from(
        signatureBase64.replace(/^data:image\/\w+;base64,/, ''), 
        'base64'
      );
      
      let signatureImage;
      try {
        signatureImage = await pdfDoc.embedPng(signatureImageBytes);
      } catch (pngError) {
        try {
          signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
        } catch (jpgError) {
          console.error('❌ Error con formato de imagen:', jpgError);
          throw new Error('Formato de imagen no soportado. Use PNG o JPG.');
        }
      }

      // Dimensiones de la firma
      const signatureWidth = 120;
      const signatureHeight = 60;
      const x = width - signatureWidth - 60;
      const y = 100;

      // Dibujar imagen de firma
      lastPage.drawImage(signatureImage, {
        x: x,
        y: y,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Agregar texto informativo
      const fontSize = 8;
      const lineHeight = 12;
      
      lastPage.drawText(`Firmado digitalmente por:`, {
        x: x,
        y: y - 15,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`${datosSignature.firmado_por}`, {
        x: x,
        y: y - 15 - lineHeight,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Cédula: ${datosSignature.cedula_firmante}`, {
        x: x,
        y: y - 15 - (lineHeight * 2),
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Fecha: ${datosSignature.fecha_firma}`, {
        x: x,
        y: y - 15 - (lineHeight * 3),
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      if (datosSignature.observaciones) {
        lastPage.drawText(`Obs: ${datosSignature.observaciones.substring(0, 30)}`, {
          x: x,
          y: y - 15 - (lineHeight * 4),
          size: fontSize - 1,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      console.log('✅ Firma agregada al PDF exitosamente');

    } catch (error) {
      console.error('❌ Error agregando firma al PDF:', error);
      throw new Error('Error procesando la firma en el PDF: ' + error.message);
    }
  }

  /**
   * Generar PDF del contrato si no existe
   */
  static async generarPDFContrato(contratoId) {
    try {
      console.log(`📄 Generando PDF original para contrato ${contratoId}...`);
      
      const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
      const rutaPDF = await ContratoPDFGenerator.generarPDF(contratoId);
      
      // Actualizar ruta en base de datos
      const conexion = await Database.getConnection();
      await conexion.execute(`
        UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
      `, [rutaPDF, contratoId]);
      conexion.release();

      console.log('✅ PDF original generado:', rutaPDF);
      return rutaPDF;
      
    } catch (error) {
      console.error('❌ Error generando PDF del contrato:', error);
      throw error;
    }
  }

  /**
   * Obtener URL para descargar PDF firmado
   */
  static async obtenerURLDescargaPDF(contratoId) {
    try {
      const conexion = await Database.getConnection();
      
      const [contratos] = await conexion.execute(`
        SELECT documento_pdf_path, numero_contrato, firmado_cliente
        FROM contratos WHERE id = ?
      `, [contratoId]);

      conexion.release();

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      
      if (!contrato.documento_pdf_path || !fs.existsSync(contrato.documento_pdf_path)) {
        throw new Error('PDF del contrato no existe');
      }

      return {
        url_descarga: `/api/v1/contratos/${contratoId}/descargar-pdf`,
        numero_contrato: contrato.numero_contrato,
        firmado: Boolean(contrato.firmado_cliente),
        ruta_archivo: contrato.documento_pdf_path
      };

    } catch (error) {
      console.error('❌ Error obteniendo URL de descarga:', error);
      throw error;
    }
  }

  /**
   * Verificar estado del PDF
   */
  static async verificarEstadoPDF(contratoId) {
    try {
      const conexion = await Database.getConnection();
      
      const [contratos] = await conexion.execute(`
        SELECT 
          documento_pdf_path, 
          numero_contrato, 
          firmado_cliente,
          fecha_firma
        FROM contratos WHERE id = ?
      `, [contratoId]);

      conexion.release();

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      const pdfExiste = contrato.documento_pdf_path && fs.existsSync(contrato.documento_pdf_path);
      
      let tamanoArchivo = 0;
      if (pdfExiste) {
        const stats = fs.statSync(contrato.documento_pdf_path);
        tamanoArchivo = stats.size;
      }

      return {
        pdf_existe: pdfExiste,
        numero_contrato: contrato.numero_contrato,
        firmado: Boolean(contrato.firmado_cliente),
        fecha_firma: contrato.fecha_firma,
        ruta_archivo: contrato.documento_pdf_path,
        tamano_bytes: tamanoArchivo,
        tamano_mb: (tamanoArchivo / (1024 * 1024)).toFixed(2)
      };

    } catch (error) {
      console.error('❌ Error verificando estado del PDF:', error);
      throw error;
    }
  }
}

module.exports = FirmaPDFService;