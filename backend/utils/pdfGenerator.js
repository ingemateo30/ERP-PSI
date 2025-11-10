// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const bwipjs = require('bwip-js'); // Para generar códigos de barras EAN-128

class PDFGenerator {
    
    /**
     * Genera un código de barras EAN-128 según el estándar colombiano
     * @param {string} numeroLocalizacion - Código EAN-13 asignado por GS1 Colombia
     * @param {string} referenciaPago - Identificación del cliente/factura
     * @param {number} valorPagar - Valor total a pagar
     * @param {string} fechaMaximaPago - Fecha límite de pago (YYYYMMDD)
     * @returns {Promise<Buffer>} - Buffer con la imagen PNG del código de barras
     */
    static async generarCodigoBarrasEAN128(numeroLocalizacion, referenciaPago, valorPagar, fechaMaximaPago) {
        try {
            // Validar que referenciaPago tenga número par de dígitos (requerido por EAN-128)
            let referenciaAjustada = referenciaPago.toString().padStart(2, '0');
            if (referenciaAjustada.length % 2 !== 0) {
                referenciaAjustada = '0' + referenciaAjustada;
            }

            // Validar que valorPagar tenga número par de dígitos
            let valorAjustado = Math.round(valorPagar).toString().padStart(2, '0');
            if (valorAjustado.length % 2 !== 0) {
                valorAjustado = '0' + valorAjustado;
            }

            // Construir la cadena de datos según el estándar (sin paréntesis en el símbolo)
            // Estructura: (415)EAN13(8020)Referencia(3900)Valor(96)Fecha
            const cadenaCompleta = 
                `415${numeroLocalizacion}` +      // (415) + 13 dígitos
                `8020${referenciaAjustada}` +     // (8020) + referencia (hasta 24 dígitos)
                `3900${valorAjustado}` +          // (3900) + valor sin decimales
                `96${fechaMaximaPago}`;           // (96) + fecha AAAAMMDD

            console.log('📊 Generando código de barras EAN-128:', {
                numeroLocalizacion,
                referenciaPago: referenciaAjustada,
                valor: valorAjustado,
                fecha: fechaMaximaPago,
                cadenaCompleta,
                longitud: cadenaCompleta.length
            });

            // Generar el código de barras usando bwip-js
            const buffer = await bwipjs.toBuffer({
                bcid: 'code128',           // Tipo de código (EAN-128 usa Code 128)
                text: cadenaCompleta,      // Datos a codificar
                scale: 3,                  // Factor de escala (3x)
                height: 12,                // Altura en milímetros (según estándar: 20-31.8mm)
                includetext: true,         // Mostrar texto legible debajo
                textxalign: 'center',      // Alinear texto al centro
                textsize: 10,              // Tamaño del texto
                textfont: 'Helvetica',     // Fuente
                paddingleft: 10,           // Margen izquierdo (zona de silencio: 5mm mínimo)
                paddingright: 10,          // Margen derecho (zona de silencio: 5mm mínimo)
                paddingtop: 2,
                paddingbottom: 2
            });

            console.log('✅ Código de barras EAN-128 generado exitosamente');
            return buffer;

        } catch (error) {
            console.error('❌ Error generando código de barras EAN-128:', error);
            throw new Error(`Error generando código de barras: ${error.message}`);
        }
    }

    /**
     * Versión mejorada que incluye el código de barras real en el cupón del banco
     */
    static async generarCodigoBarras(doc, x, y, factura) {
        try {
            // Datos para el código de barras según el estándar colombiano
            const numeroLocalizacion = '7709998000452'; // Tu código EAN-13 de GS1 Colombia
            const referenciaPago = factura.identificacion_cliente || factura.codigo_cliente;
            const valorPagar = Math.round(parseFloat(factura.total) || 0);
            const fechaMaximaPago = this.formatearFechaBarras(factura.fecha_vencimiento);

            // Generar el código de barras
            const codigoBarrasBuffer = await this.generarCodigoBarrasEAN128(
                numeroLocalizacion,
                referenciaPago,
                valorPagar,
                fechaMaximaPago
            );

            // Insertar la imagen del código de barras en el PDF
            doc.image(codigoBarrasBuffer, x, y, {
                width: 350,  // Ancho del código de barras
                height: 50   // Alto del código de barras
            });

            // Texto del código legible (con paréntesis según el estándar)
            const codigoLegible = `(415)${numeroLocalizacion}(8020)${referenciaPago}(3900)${valorPagar}(96)${fechaMaximaPago}`;
            
            doc.fontSize(7).font('Helvetica')
                .text(codigoLegible, x, y + 55, {
                    width: 350,
                    align: 'center'
                });

            console.log('✅ Código de barras insertado en el PDF');

        } catch (error) {
            console.error('⚠️ Error insertando código de barras, usando versión simulada:', error);
            // Fallback: usar el código simulado original
            this.generarCodigoBarrasSimulado(doc, x, y, factura.identificacion_cliente);
        }
    }

    /**
     * Versión de respaldo con código de barras simulado
     */
    static generarCodigoBarrasSimulado(doc, x, y, referencia) {
        const codigo = (referencia || '1005450340').toString();
        let posX = x;

        // Generar patrón de barras simulado
        for (let i = 0; i < 80; i++) {
            const esBarraGruesa = (i % 7 === 0) || (i % 11 === 0);
            const altura = esBarraGruesa ? 30 : 25;
            const ancho = esBarraGruesa ? 3 : 1;

            if (i % 2 === 0) {
                doc.rect(posX, y, ancho, altura).fill('#000000');
            }

            posX += ancho + 1;
        }

        doc.fontSize(9).font('Helvetica')
            .text(codigo, x + 20, y + 35);
    }

    /**
     * Formatea la fecha para el código de barras (AAAAMMDD)
     */
    static formatearFechaBarras(fecha) {
        if (!fecha) {
            // Fecha por defecto: hoy + 15 días
            const hoy = new Date();
            fecha = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000);
        }

        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            const año = fechaObj.getFullYear();
            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaObj.getDate()).padStart(2, '0');

            return `${año}${mes}${dia}`; // Formato: AAAAMMDD
        } catch (error) {
            console.warn('Error formateando fecha para código de barras:', error);
            // Retornar fecha actual como fallback
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            return `${año}${mes}${dia}`;
        }
    }

    /**
     * Actualiza el método generarCuponBanco para usar el código de barras real
     */
    static async generarCuponBanco(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const xOffset = 30;

        // Logo PSI
        this.dibujarLogoPSI(doc, xOffset, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA y TOTAL
        doc.fontSize(10).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', 470, y + 8, { align: 'right' })
            .fontSize(11).text(factura.numero_factura || '10P 00090951', 470, y + 24, { align: 'right' });

        y += 50;

        // Información del cliente
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', xOffset, y)
            .fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', xOffset, y + 15)
            .text(factura.direccion_cliente || 'CR 15A 21-01 APT 601 COLINAS DE SAN MARTIN', xOffset, y + 30);

        // TOTAL grande (derecha)
        doc.fontSize(12).font('Helvetica-Bold')
            .text('TOTAL', 450, y + 10)
            .fontSize(16).text(this.formatearMoneda(factura.total), 450, y + 25);

        y += 65;

        // 🔥 CÓDIGO DE BARRAS REAL EAN-128
        await this.generarCodigoBarras(doc, 100, y, factura);

        y += 70; // Ajustar según el tamaño del código de barras

        // Mensaje de pago en línea
        doc.fontSize(10).font('Helvetica-Bold')
            .text('Pague la factura en línea www.psi.net.co', xOffset, y);

        y += 20;

        // Referencia de pago y Banco
        doc.rect(200, y, 200, 40).stroke('#000000');
        doc.fontSize(9).font('Helvetica-Bold')
            .text('Referencia de pago', 210, y + 8)
            .fontSize(12).text(factura.identificacion_cliente || '1005450340', 230, y + 22);

        // Texto "Banco" vertical
        doc.save();
        doc.translate(xOffset - 10, y + 20);
        doc.rotate(-90);
        doc.fontSize(12).font('Helvetica-Bold').text('Banco', 0, 0);
        doc.restore();

        y += 50;

        // Dirección empresa
        doc.fontSize(7).font('Helvetica')
            .text('Carrera 9 No. 9-94 WHATSAPP 3184550936', xOffset, y);

        return y + 20;
    }

    /**
     * IMPORTANTE: Actualizar generarFactura para que sea async y espere los códigos de barras
     */
    static async generarFactura(facturaData, empresa) {
        return new Promise(async (resolve, reject) => { // Agregar async aquí
            try {
                console.log('📄 Generando PDF PSI para factura:', facturaData.numero_factura);

                if (!facturaData || !facturaData.numero_factura) {
                    throw new Error('Datos de factura inválidos');
                }

                const doc = new PDFDocument({
                    size: 'letter',
                    margin: 15,
                    info: {
                        Title: `Factura ${facturaData.numero_factura}`,
                        Author: 'PROVEEDOR DE TELECOMUNICACIONES SAS',
                        Subject: 'Factura de Servicios'
                    }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log('✅ PDF PSI generado exitosamente - Tamaño:', pdfBuffer.length, 'bytes');
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                let yPosition = 20;

                // CUPÓN PRINCIPAL
                yPosition = this.generarCuponPrincipal(doc, facturaData, empresa, yPosition);

                // Línea separadora
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN CLIENTE
                yPosition = this.generarCuponCliente(doc, facturaData, empresa, yPosition);

                // Línea separadora
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN BANCO (con código de barras real) - AWAIT aquí
                await this.generarCuponBanco(doc, facturaData, empresa, yPosition);

                doc.end();

            } catch (error) {
                console.error('❌ Error generando PDF PSI:', error);
                reject(new Error(`Error generando PDF: ${error.message}`));
            }
        });
    }

    // ... resto de métodos se mantienen igual
}

module.exports = PDFGenerator;