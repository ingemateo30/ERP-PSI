// backend/services/FirmaPDFService.js
// Servicio para manejar firma digital de contratos PDF

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const Database = require('../config/database');

class FirmaPDFService {
  
  /**
   * Abrir contrato PDF para firma con tablet/dispositivo
   */
  static async abrirContratoParaFirma(contratoId) {
    try {
      const conexion = await Database.getConnection();
      
      // 1. Obtener datos del contrato
      const [contratos] = await conexion.execute(`
        SELECT 
          c.*,
          cl.nombre as cliente_nombre,
          cl.identificacion as cliente_identificacion
        FROM contratos c
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.id = ?
      `, [contratoId]);

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      
      // 2. Verificar si ya tiene PDF generado
      let rutaPDF = contrato.documento_pdf_path;
      
      if (!rutaPDF || !fs.existsSync(rutaPDF)) {
        // Generar PDF si no existe
        rutaPDF = await this.generarPDFContrato(contratoId);
      }

      // 3. Preparar datos para el visor de firma
      const datosVisor = {
        contrato_id: contratoId,
        numero_contrato: contrato.numero_contrato,
        cliente_nombre: contrato.cliente_nombre,
        cliente_identificacion: contrato.cliente_identificacion,
        ruta_pdf: rutaPDF,
        firmado: Boolean(contrato.firmado_cliente),
        fecha_firma: contrato.fecha_firma,
        url_visor: `/api/v1/contratos/${contratoId}/visor-firma`
      };

      conexion.release();
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

      // 1. Validar datos de la firma
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

      // 2. Obtener contrato actual
      const [contratos] = await conexion.execute(`
        SELECT * FROM contratos WHERE id = ?
      `, [contratoId]);

      if (contratos.length === 0) {
        throw new Error('Contrato no encontrado');
      }

      const contrato = contratos[0];
      
      // 3. Cargar PDF existente
      let rutaPDFOriginal = contrato.documento_pdf_path;
      if (!rutaPDFOriginal || !fs.existsSync(rutaPDFOriginal)) {
        rutaPDFOriginal = await this.generarPDFContrato(contratoId);
      }

      const pdfBytes = fs.readFileSync(rutaPDFOriginal);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // 4. Agregar firma al PDF
      await this.agregarFirmaAlPDF(pdfDoc, signature_base64, {
        firmado_por,
        cedula_firmante,
        fecha_firma: new Date().toLocaleDateString()
      });

      // 5. Guardar PDF firmado con nuevo nombre
      const nombreArchivoFirmado = `contrato_${contrato.numero_contrato}_firmado.pdf`;
      const rutaPDFFirmado = path.join(
        process.env.UPLOAD_DIR || './uploads/contratos',
        nombreArchivoFirmado
      );

      // Crear directorio si no existe
      const dirPDF = path.dirname(rutaPDFFirmado);
      if (!fs.existsSync(dirPDF)) {
        fs.mkdirSync(dirPDF, { recursive: true });
      }

      const pdfBytesModificado = await pdfDoc.save();
      fs.writeFileSync(rutaPDFFirmado, pdfBytesModificado);

      // 6. Actualizar base de datos
      await conexion.execute(`
        UPDATE contratos SET
          documento_pdf_path = ?,
          firmado_cliente = 1,
          fecha_firma = CURDATE(),
          observaciones = CONCAT(
            COALESCE(observaciones, ''), 
            '\n[FIRMA DIGITAL] Firmado por: ', ?, 
            ' - Cédula: ', ?, 
            ' - Fecha: ', NOW(),
            ' - Tipo: ', ?,
            CASE WHEN ? != '' THEN CONCAT(' - Observaciones: ', ?) ELSE '' END
          ),
          updated_at = NOW()
        WHERE id = ?
      `, [
        rutaPDFFirmado,
        firmado_por,
        cedula_firmante,
        tipo_firma,
        observaciones,
        observaciones,
        contratoId
      ]);

      await conexion.commit();

      console.log(`✅ Contrato ${contrato.numero_contrato} firmado digitalmente`);

      return {
        success: true,
        contrato_id: contratoId,
        numero_contrato: contrato.numero_contrato,
        pdf_firmado_path: rutaPDFFirmado,
        firmado_por: firmado_por,
        fecha_firma: new Date().toISOString(),
        mensaje: 'Contrato firmado y guardado exitosamente'
      };

    } catch (error) {
      await conexion.rollback();
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
      // Obtener la última página (donde normalmente está la firma)
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
        // Si falla PNG, intentar con JPG
        signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
      }

      // Dimensiones de la firma
      const signatureWidth = 150;
      const signatureHeight = 80;

      // Posición de la firma (ajustar según diseño del contrato)
      const x = width - signatureWidth - 50; // 50px desde el borde derecho
      const y = 120; // Desde abajo

      // Dibujar imagen de firma
      lastPage.drawImage(signatureImage, {
        x: x,
        y: y,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Agregar texto informativo de la firma
      lastPage.drawText(`Firmado digitalmente por: ${datosSignature.firmado_por}`, {
        x: x,
        y: y - 15,
        size: 8,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Cédula: ${datosSignature.cedula_firmante}`, {
        x: x,
        y: y - 28,
        size: 8,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Fecha: ${datosSignature.fecha_firma}`, {
        x: x,
        y: y - 41,
        size: 8,
        color: rgb(0, 0, 0),
      });

    } catch (error) {
      console.error('❌ Error agregando firma al PDF:', error);
      throw new Error('Error procesando la firma en el PDF');
    }
  }

  /**
   * Generar PDF del contrato si no existe
   */
  static async generarPDFContrato(contratoId) {
    // Usar el servicio existente ContratoPDFGenerator
    const ContratoPDFGenerator = require('../utils/ContratoPDFGenerator');
    
    try {
      const rutaPDF = await ContratoPDFGenerator.generarPDF(contratoId);
      
      // Actualizar ruta en base de datos
      const conexion = await Database.getConnection();
      await conexion.execute(`
        UPDATE contratos SET documento_pdf_path = ? WHERE id = ?
      `, [rutaPDF, contratoId]);
      conexion.release();

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
}

module.exports = FirmaPDFService;
