// utils/psiInvoicePDFGenerator.js - Factura PSI Una Sola Hoja Minimalista
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PSIInvoicePDFGenerator {

    static async generar(factura, empresa, logoPath = null) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔧 Generando factura PSI en una sola hoja...');

                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 20,
                        bottom: 20,
                        left: 30,
                        right: 30
                    }
                });

                const chunks = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log(`✅ Factura PSI generada. Tamaño: ${pdfBuffer.length} bytes`);
                    resolve(pdfBuffer);
                });

                doc.on('error', error => {
                    console.error('❌ Error en generación:', error);
                    reject(error);
                });

                // Generar toda la factura en una sola página
                this.generarFacturaCompletaUnaHoja(doc, factura, empresa, logoPath);

                doc.end();

            } catch (error) {
                console.error('❌ Error:', error);
                reject(error);
            }
        });
    }

    static generarFacturaCompletaUnaHoja(doc, factura, empresa, logoPath) {
        let y = 30;

        // === SECCIÓN 1: FACTURA PRINCIPAL (altura: 280px) ===
        y = this.generarSeccionPrincipal(doc, factura, empresa, logoPath, y);
        
        // Línea separadora
        this.dibujarLineaCorte(doc, y + 5);
        y += 15;

        // === SECCIÓN 2: CUPÓN CLIENTE (altura: 80px) ===
        y = this.generarSeccionCliente(doc, factura, empresa, y);
        
        // Línea separadora
        this.dibujarLineaCorte(doc, y + 5);
        y += 15;

        // === SECCIÓN 3: CUPÓN BANCO (altura: 100px) ===
        this.generarSeccionBanco(doc, factura, empresa, y);
    }

    static generarSeccionPrincipal(doc, factura, empresa, logoPath, yInicial) {
        let y = yInicial;

        // Header empresa con logo
        if (logoPath && fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, 40, y, { width: 60, height: 45 });
            } catch (error) {
                console.warn('⚠️ Logo no disponible');
            }
        }

        // Información empresa
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
           .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 110, y);
        
        doc.fontSize(8).font('Helvetica').fillColor('#000000')
           .text(`NIT: ${empresa.empresa_nit || '901.582.657-3'}`, 110, y + 15)
           .text(`Tel: ${empresa.empresa_telefono || '3184550936'}`, 110, y + 26)
           .text(`Dirección: ${empresa.empresa_direccion || 'Carrera 9 No. 9-94'}`, 110, y + 37);

        // Cuadro factura electrónica
        doc.rect(420, y, 110, 50).stroke('#000000');
        doc.fontSize(8).font('Helvetica-Bold')
           .text('Factura Electrónica de', 425, y + 5)
           .text('Venta No.', 425, y + 14)
           .fontSize(10).fillColor('#000000').text(factura.numero_factura || 'PSI000001', 425, y + 24)
           .fontSize(7).text('Fecha Factura', 425, y + 36)
           .text(this.formatearFecha(factura.fecha_emision), 425, y + 44);

        y += 65;

        // Información del cliente
        doc.rect(40, y, 490, 60).stroke('#000000');
        doc.moveTo(280, y).lineTo(280, y + 60).stroke('#000000');
        doc.moveTo(40, y + 15).lineTo(530, y + 15).stroke('#000000');
        
        doc.fontSize(8).font('Helvetica-Bold')
           .text('Señores:', 45, y + 3)
           .text('Observaciones/detalle:', 285, y + 3);

        doc.font('Helvetica').fontSize(9)
           .text(factura.nombre_cliente || '-', 45, y + 20)
           .text(`CC: ${factura.identificacion_cliente || '-'}`, 45, y + 32)
           .text(factura.direccion_cliente || '-', 45, y + 44);

        doc.fontSize(8).font('Helvetica-Bold')
           .text('FECHA VENCIMIENTO:', 285, y + 20)
           .fontSize(9).text(this.formatearFecha(factura.fecha_vencimiento), 285, y + 32);

        y += 70;

        // Tabla de conceptos
        doc.rect(40, y, 490, 18).fill('#e8e8e8').stroke('#000000');
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000')
           .text('Item', 45, y + 6)
           .text('U/M', 70, y + 6)
           .text('Descripción', 100, y + 6)
           .text('Cantidad', 280, y + 6)
           .text('Vlr. Unitario', 320, y + 6)
           .text('%IVA', 380, y + 6)
           .text('Vlr. IVA', 410, y + 6)
           .text('Valor Total', 460, y + 6);

        // Líneas verticales del header
        const columnasX = [70, 100, 280, 320, 380, 410, 460];
        columnasX.forEach(x => {
            doc.moveTo(x, y).lineTo(x, y + 18).stroke('#000000');
        });

        y += 18;

        // Conceptos
        const conceptos = this.obtenerConceptosFactura(factura);
        conceptos.forEach((concepto, index) => {
            doc.rect(40, y, 490, 15).stroke('#cccccc');
            
            columnasX.forEach(x => {
                doc.moveTo(x, y).lineTo(x, y + 15).stroke('#cccccc');
            });

            doc.fontSize(7).font('Helvetica').fillColor('#000000')
               .text((index + 1).toString(), 45, y + 5)
               .text('UN', 72, y + 5)
               .text(concepto.concepto, 105, y + 5)
               .text('1.00', 285, y + 5)
               .text(this.formatearNumero(concepto.valor), 325, y + 5)
               .text('0.00', 385, y + 5)
               .text('0.00', 415, y + 5)
               .text(this.formatearNumero(concepto.valor), 465, y + 5);

            y += 15;
        });

        // Filas vacías (mínimo 2)
        const filasVacias = Math.max(0, 2 - conceptos.length);
        for (let i = 0; i < filasVacias; i++) {
            doc.rect(40, y, 490, 15).stroke('#cccccc');
            columnasX.forEach(x => {
                doc.moveTo(x, y).lineTo(x, y + 15).stroke('#cccccc');
            });
            y += 15;
        }

        y += 5;

        // Totales
        doc.rect(350, y, 180, 50).stroke('#000000');
        doc.moveTo(350, y + 12).lineTo(530, y + 12).stroke('#000000');
        doc.moveTo(350, y + 24).lineTo(530, y + 24).stroke('#000000');
        doc.moveTo(350, y + 36).lineTo(530, y + 36).stroke('#000000');
        doc.moveTo(450, y).lineTo(450, y + 50).stroke('#000000');

        doc.fontSize(8).font('Helvetica-Bold')
           .text('VALOR BRUTO:', 355, y + 3)
           .text('IVA:', 355, y + 15)
           .text('SUBTOTAL:', 355, y + 27)
           .text('VALOR NETO:', 355, y + 39);

        doc.font('Helvetica')
           .text(this.formatearNumero(factura.total), 455, y + 3)
           .text('0.00', 455, y + 15)
           .text(this.formatearNumero(factura.total), 455, y + 27)
           .fontSize(9).font('Helvetica-Bold').text(this.formatearNumero(factura.total), 455, y + 39);

        // Información adicional
        doc.fontSize(7).font('Helvetica')
           .text(`Período: ${this.extraerPeriodo(factura.periodo_facturacion)}`, 45, y + 10)
           .text('Forma de Pago: Contado', 45, y + 20)
           .text('Medio de Pago: Efectivo', 45, y + 30);

        y += 60;

        // Información legal
        doc.fontSize(6).font('Helvetica')
           .text(`SON: ${this.numeroALetras(factura.total)} PESOS M/L`, 45, y);

        y += 10;
        doc.rect(45, y, 440, 20).stroke('#000000');
        doc.fontSize(6).font('Helvetica')
           .text('NO CONTRIBUYENTE DEL IMPUESTO SOBRE LAS VENTAS.', 50, y + 3)
           .text(`Resolución DIAN: ${empresa.resolucion_facturacion || 'No especificada'}`, 50, y + 11);

        return y + 30;
    }

    static generarSeccionCliente(doc, factura, empresa, yInicial) {
        let y = yInicial;

        doc.fontSize(8).font('Helvetica-Bold')
           .text('CUPÓN CLIENTE - CONSERVAR', 40, y);

        y += 12;

        doc.rect(40, y, 490, 50).stroke('#000000');
        doc.moveTo(250, y).lineTo(250, y + 50).stroke('#000000');
        doc.moveTo(400, y).lineTo(400, y + 50).stroke('#000000');

        // Cliente
        doc.fontSize(7).font('Helvetica-Bold')
           .text('Cliente:', 45, y + 5)
           .font('Helvetica').text(factura.nombre_cliente || '-', 45, y + 15)
           .font('Helvetica-Bold').text('CC:', 45, y + 25)
           .font('Helvetica').text(factura.identificacion_cliente || '-', 65, y + 25)
           .font('Helvetica-Bold').text('Dirección:', 45, y + 35)
           .font('Helvetica').text(factura.direccion_cliente || '-', 85, y + 35);

        // Factura
        doc.font('Helvetica-Bold')
           .text('Factura No:', 255, y + 5)
           .font('Helvetica').text(factura.numero_factura || '-', 255, y + 15)
           .font('Helvetica-Bold').text('Fecha:', 255, y + 25)
           .font('Helvetica').text(this.formatearFecha(factura.fecha_emision), 255, y + 35);

        // Total
        doc.font('Helvetica-Bold')
           .text('TOTAL:', 405, y + 15)
           .fontSize(10).text(this.formatearMoneda(factura.total), 405, y + 28);

        return y + 60;
    }

    static generarSeccionBanco(doc, factura, empresa, yInicial) {
        let y = yInicial;

        doc.fontSize(8).font('Helvetica-Bold')
           .text('CUPÓN BANCO - ENTREGAR EN ENTIDAD FINANCIERA', 40, y);

        y += 12;

        // Código de barras
        this.generarCodigoBarras(doc, 40, y, factura.identificacion_cliente);

        y += 25;

        // Información de pago
        doc.rect(40, y, 490, 50).stroke('#000000');
        doc.moveTo(200, y).lineTo(200, y + 50).stroke('#000000');
        doc.moveTo(350, y).lineTo(350, y + 50).stroke('#000000');

        // Pagador
        doc.fontSize(7).font('Helvetica-Bold')
           .text('PAGADOR:', 45, y + 5)
           .font('Helvetica').text(factura.nombre_cliente || '-', 45, y + 15)
           .text(`CC: ${factura.identificacion_cliente || '-'}`, 45, y + 25)
           .text(factura.direccion_cliente || '-', 45, y + 35);

        // Referencia
        doc.rect(205, y + 10, 140, 30).fill('#f5f5f5').stroke('#000000');
        doc.font('Helvetica-Bold')
           .text('REFERENCIA', 220, y + 18)
           .fontSize(9).text(factura.identificacion_cliente || '-', 220, y + 28);

        // Total
        doc.fontSize(8).font('Helvetica-Bold')
           .text('TOTAL:', 355, y + 18)
           .fontSize(12).text(this.formatearMoneda(factura.total), 355, y + 30);

        y += 60;

        doc.fontSize(6).font('Helvetica')
           .text('Pague en línea: www.psi.net.co', 40, y);

        return y + 15;
    }

    // === MÉTODOS AUXILIARES ===

    static dibujarLineaCorte(doc, y) {
        doc.dash(2, { space: 2 });
        doc.moveTo(30, y).lineTo(570, y).stroke('#cccccc');
        doc.undash();
        doc.fontSize(6).fillColor('#999999').text('✂ CORTAR AQUÍ', 40, y - 3);
    }

    static generarCodigoBarras(doc, x, y, referencia) {
        const codigo = (referencia || '1234567890').toString();
        let posX = x;
        
        for (let i = 0; i < 30; i++) {
            const altura = 12 + (i % 3) * 2;
            doc.rect(posX, y, 1, altura).fill('#000000');
            posX += 2;
        }
        
        doc.fontSize(6).font('Helvetica')
           .text(codigo, x, y + 15);
    }

    static obtenerConceptosFactura(factura) {
        const conceptos = [];
        
        const servicios = [
            { campo: 'internet', nombre: 'SERVICIO DE INTERNET' },
            { campo: 'television', nombre: 'SERVICIO DE TELEVISION' },
            { campo: 'telefonia', nombre: 'SERVICIO DE TELEFONIA' },
            { campo: 'saldo_anterior', nombre: 'SALDO ANTERIOR' },
            { campo: 'interes', nombre: 'INTERESES DE MORA' },
            { campo: 'reconexion', nombre: 'RECONEXION' }
        ];

        servicios.forEach(servicio => {
            const valor = factura[servicio.campo];
            if (valor && valor > 0) {
                conceptos.push({
                    concepto: servicio.nombre,
                    valor: valor
                });
            }
        });

        if (conceptos.length === 0) {
            conceptos.push({
                concepto: 'SERVICIO DE INTERNET',
                valor: factura.total || 59900
            });
        }

        return conceptos;
    }

    static extraerPeriodo(periodo) {
        if (!periodo) return '06/05/2025 - 05/06/2025';
        return periodo;
    }

    static formatearMoneda(valor) {
        if (!valor || isNaN(valor)) return '$0';
        return `$${Math.abs(valor).toLocaleString('es-CO')}`;
    }

    static formatearNumero(valor) {
        if (!valor || isNaN(valor)) return '0.00';
        return Math.abs(valor).toLocaleString('es-CO', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }

    static formatearFecha(fecha) {
        if (!fecha) return '04/05/2023';
        
        try {
            const date = new Date(fecha);
            const dia = date.getDate().toString().padStart(2, '0');
            const mes = (date.getMonth() + 1).toString().padStart(2, '0');
            const año = date.getFullYear();
            return `${dia}/${mes}/${año}`;
        } catch {
            return '04/05/2023';
        }
    }

    static numeroALetras(numero) {
        if (numero < 1000) return 'MENOS DE MIL';
        if (numero < 100000) return 'MILES';
        return 'VARIOS MILES';
    }

    static validarDatos(factura, empresa) {
        const errores = [];
        if (!factura?.numero_factura) errores.push('Número de factura requerido');
        if (!factura?.nombre_cliente) errores.push('Nombre del cliente requerido');
        if (factura?.total === undefined) errores.push('Total de factura requerido');
        if (!empresa?.empresa_nombre) errores.push('Nombre de empresa requerido');

        if (errores.length > 0) {
            throw new Error(`Errores de validación: ${errores.join(', ')}`);
        }
        return true;
    }

    static async generarEjemploSimple() {
        const facturaEjemplo = {
            numero_factura: 'PSI124450',
            fecha_emision: new Date('2025-05-06'),
            fecha_vencimiento: new Date('2025-05-11'),
            periodo_facturacion: '06/05/2025 - 05/06/2025',
            nombre_cliente: 'JUAN SEBASTIAN GALEANO GALAN',
            identificacion_cliente: '1140886424',
            direccion_cliente: 'CRA 50 76 - 19',
            telefono_cliente: '3147783510',
            internet: 59900,
            total: 59900
        };

        const empresaEjemplo = {
            empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
            empresa_nit: '901.582.657-3',
            empresa_direccion: 'VIA 40 #36-135',
            empresa_telefono: '3303780',
            resolucion_facturacion: 'Resolución DIAN 18764 del 15-SEP-2020'
        };

        return await this.generar(facturaEjemplo, empresaEjemplo);
    }

    static async guardarPDF(pdfBuffer, nombreArchivo = 'factura_psi_simple.pdf') {
        try {
            const dirTemp = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(dirTemp)) {
                fs.mkdirSync(dirTemp, { recursive: true });
            }

            const rutaCompleta = path.join(dirTemp, nombreArchivo);
            fs.writeFileSync(rutaCompleta, pdfBuffer);

            console.log(`📄 Factura guardada en: ${rutaCompleta}`);
            return rutaCompleta;
        } catch (error) {
            console.error('❌ Error guardando PDF:', error);
            throw error;
        }
    }
}

module.exports = PSIInvoicePDFGenerator;