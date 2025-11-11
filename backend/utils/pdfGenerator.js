// backend/utils/pdfGenerator.js - GENERADOR PDF MEJORADO CON DISEÑO REORGANIZADO
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const bwipjs = require('bwip-js');

/**
 * Clase para generar la factura de venta en formato PDF
 * con diseño reorganizado de tres cupones de PSI.
 */
class PDFGenerator {
    /**
     * Genera el buffer del documento PDF de la factura.
     * @param {object} facturaData - Datos de la factura.
     * @param {object} empresa - Datos de la empresa.
     * @returns {Promise<Buffer>} - Buffer del PDF generado.
     */
    static async generarFactura(facturaData, empresa) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('📄 Generando PDF PSI para factura:', facturaData.numero_factura);

                if (!facturaData || !facturaData.numero_factura) {
                    throw new Error('Datos de factura inválidos');
                }

                // Crear documento PDF tamaño carta
                const doc = new PDFDocument({
                    size: 'letter',
                    margin: 15,
                    info: {
                        Title: `Factura ${facturaData.numero_factura}`,
                        Author: 'PROVEEDOR DE TELECOMUNICACIONES SAS',
                        Subject: 'Factura de Servicios'
                    }
                });

                // Capturar chunks del PDF
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log('✅ PDF PSI generado exitosamente - Tamaño:', pdfBuffer.length, 'bytes');
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                let yPosition = 20;

                // CUPÓN PRINCIPAL (parte superior) - Solo tabla con bordes
                yPosition = this.generarCuponPrincipal(doc, facturaData, empresa, yPosition);

                // Línea separadora punteada
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN CLIENTE (parte media) - Con código de barras
                yPosition = await this.generarCuponCliente(doc, facturaData, empresa, yPosition);

                // Línea separadora punteada
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN BANCO (parte inferior) - Con referencia de pago
                await this.generarCuponBanco(doc, facturaData, empresa, yPosition);

                doc.end();

            } catch (error) {
                console.error('❌ Error generando PDF PSI:', error);
                reject(new Error(`Error generando PDF: ${error.message}`));
            }
        });
    }

    /**
     * Dibuja el cupón principal (parte superior) - Diseño reorganizado con tabla centrada a la izquierda y fechas en recuadros a la derecha.
     */
    static generarCuponPrincipal(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const xOffset = 30;
        const pageWidth = 570;
        const anchoUtil = 550; // Ancho útil considerando márgenes

        // === ENCABEZADO CON LOGO PSI ===
        this.dibujarLogoPSIReal(doc, xOffset, y);

        // Información de la empresa CENTRADA y más pequeña
        const centroX = 306; // Centro de la página (612/2)
        doc.fontSize(7).font('Helvetica-Bold')
            .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 150, y + 5, { align: 'center', width: 300 })
            .fontSize(6).font('Helvetica')
            .text(`NIT: ${empresa.empresa_nit || '901582657-3'}`, 150, y + 15, { align: 'center', width: 300 })
            .text('Registro único de TIC No. 96006732', 150, y + 23, { align: 'center', width: 300 })
            .text('vigilado y regulado por el MINTIC', 150, y + 31, { align: 'center', width: 300 });

        // FACTURA DE VENTA y NÚMERO con Referencia de pago (esquina superior derecha, más separado)
        doc.fontSize(9).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', 460, y + 5)
            .fontSize(10).text(factura.numero_factura || 'FAC000011', 460, y + 18);
        
        doc.fontSize(7).font('Helvetica')
            .text('Referencia de pago:', 460, y + 32)
            .font('Helvetica-Bold')
            .text(factura.identificacion_cliente || '1005450340', 460, y + 42);

        y += 65;

        // === INFORMACIÓN DEL CLIENTE ===
        doc.fontSize(10).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', xOffset, y)
            .fontSize(8).font('Helvetica')
            .text(`ID Cliente ${factura.identificacion_cliente || '1005450340'} / ${factura.codigo_cliente || '200'}`, xOffset, y + 14)
            .text(`Dirección: ${factura.direccion_cliente || 'CR 15A 21-01 APT 601 COLINAS DE SAN MARTIN'}`, xOffset, y + 26);

        y += 45;

        // === DISEÑO DE DOS COLUMNAS: TABLA A LA IZQUIERDA, FECHAS A LA DERECHA ===
        const yTablaInicio = y;
        
        // COLUMNA IZQUIERDA: TABLA DE CONCEPTOS (ocupa la mitad)
        const alturaEncabezado = 18;
        const alturaFila = 18;
        const colConcepto = xOffset;
        const colValor = 170;
        const colSaldo = 230;
        const anchoTabla = 250; // Mitad de la página

        // COLUMNA DERECHA: PERIODO FACTURADO (mucho más arriba)
        const xDerecha = colConcepto + anchoTabla + 40;
        const anchoDerecha = 235;
        let yDerecha = yTablaInicio - 20; // Mucho más arriba

        // PERIODO FACTURADO (título sin recuadro, más pequeño)
        doc.fontSize(7).font('Helvetica-Bold')
            .text('PERIODO FACTURADO', xDerecha, yDerecha, { align: 'center', width: anchoDerecha });

        yDerecha += 12;

        // Subtítulos "Desde" y "Hasta" (sin recuadro, más pequeños)
        const anchoRecuadroFecha = (anchoDerecha - 5) / 2; // Dividir en dos columnas
        doc.fontSize(6).font('Helvetica')
            .text('Desde', xDerecha, yDerecha, { align: 'center', width: anchoRecuadroFecha })
            .text('Hasta', xDerecha + anchoRecuadroFecha + 5, yDerecha, { align: 'center', width: anchoRecuadroFecha });

        yDerecha += 10;

        // Recuadros con fechas lado a lado
        // Fecha desde (recuadro izquierdo)
        doc.rect(xDerecha, yDerecha, anchoRecuadroFecha, 22).stroke('#000000');
        doc.fontSize(8).font('Helvetica-Bold')
            .text(this.formatearFecha(factura.fecha_desde) || '8-nov.-2025', xDerecha + 2, yDerecha + 8, { align: 'center', width: anchoRecuadroFecha - 4 });

        // Fecha hasta (recuadro derecho)
        doc.rect(xDerecha + anchoRecuadroFecha + 5, yDerecha, anchoRecuadroFecha, 22).stroke('#000000');
        doc.fontSize(8).font('Helvetica-Bold')
            .text(this.formatearFecha(factura.fecha_hasta) || '7-dic.-2025', xDerecha + anchoRecuadroFecha + 7, yDerecha + 8, { align: 'center', width: anchoRecuadroFecha - 4 });

        yDerecha += 32;

        // PAGAR ANTES DE - Recuadro con título y fecha EN UNA SOLA FILA CENTRADO
        const alturaRecuadroPago = 25;
        doc.rect(xDerecha, yDerecha, anchoDerecha, alturaRecuadroPago).stroke('#000000');
        
        // Texto centrado en el recuadro
        doc.fontSize(12).font('Helvetica-Bold')
            .text('PAGAR ANTES DE  ' + (this.formatearFecha(factura.fecha_vencimiento) || '13-nov.-2025'), xDerecha + 5, yDerecha + 8, { align: 'center', width: anchoDerecha - 10 });

        // AHORA DIBUJAR LA TABLA
        // Encabezado de tabla con bordes NEGROS
        doc.rect(colConcepto, yTablaInicio, anchoTabla, alturaEncabezado).stroke('#000000');
        
        // Líneas divisorias verticales NEGRAS
        doc.moveTo(colValor, yTablaInicio).lineTo(colValor, yTablaInicio + alturaEncabezado).stroke('#000000');
        doc.moveTo(colSaldo, yTablaInicio).lineTo(colSaldo, yTablaInicio + alturaEncabezado).stroke('#000000');

        // Texto del encabezado
        doc.fontSize(7).font('Helvetica-Bold')
            .text('Concepto', colConcepto + 5, yTablaInicio + 6)
            .text('Valor Mes', colValor + 5, yTablaInicio + 6)
            .text('Saldo', colSaldo + 5, yTablaInicio + 6);

        y = yTablaInicio + alturaEncabezado;

        // Datos de conceptos CON LÍNEAS NEGRAS
        const conceptos = this.obtenerConceptosSimples(factura);

        conceptos.forEach((concepto, index) => {
            // Bordes de la fila NEGROS
            doc.rect(colConcepto, y, anchoTabla, alturaFila).stroke('#000000');
            doc.moveTo(colValor, y).lineTo(colValor, y + alturaFila).stroke('#000000');
            doc.moveTo(colSaldo, y).lineTo(colSaldo, y + alturaFila).stroke('#000000');

            // Contenido de la fila
            doc.fontSize(7).font('Helvetica')
                .text(concepto.nombre, colConcepto + 5, y + 6)
                .text(this.formatearPesos(concepto.valor), colValor + 5, y + 6)
                .text('0', colSaldo + 5, y + 6);

            y += alturaFila;
        });

        // Fila del TOTAL (con bordes NEGROS)
        const totalPagar = this.formatearMoneda(factura.total);
        doc.rect(colConcepto, y, anchoTabla, alturaFila + 5).stroke('#000000');
        doc.moveTo(colValor, y).lineTo(colValor, y + alturaFila + 5).stroke('#000000');
        doc.moveTo(colSaldo, y).lineTo(colSaldo, y + alturaFila + 5).stroke('#000000');

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
            .text('TOTAL', colConcepto + 5, y + 8)
            .fontSize(10).text(totalPagar, colValor + 5, y + 8);

        const yFinTablaConceptos = y + alturaFila + 5;


        // Continuar después de la tabla de conceptos con más separación
        y = Math.max(yFinTablaConceptos, yDerecha + 30) + 10; // Más separación entre recuadros y barra negra

        // Continuar después de la tabla de conceptos

        // === BARRA NEGRA DE LADO A LADO CON TOTAL A PAGAR ===
        doc.rect(xOffset, y, anchoUtil, 25).fillAndStroke('#000000', '#000000');

        doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff')
            .text('Pague su factura y evite suspensiones - Valor Reconexión $11.900', xOffset + 10, y + 8, { align: 'center', width: anchoUtil - 20 });

        y += 30;

        // === MENSAJE DE PAGO (sin recuadro negro, centrado y más grande) ===
        doc.fillColor('#000000')
            .fontSize(8).font('Helvetica')
            .text('Pague en: Caja Social (corresponsales), Finecoop, Comultrasan, efecty convenio No113760, Ahorramas o en línea (PSE) en www.psi.net.co', xOffset, y, { align: 'center', width: anchoUtil });

        // === TEXTO VERTICAL EN EL COSTADO DERECHO ===
        doc.save();
        doc.translate(580, yTablaInicio + 60);
        doc.rotate(-90);
        doc.fontSize(5).font('Helvetica')
            .text('vigilado y regulado por el MINTIC', 0, 0);
        doc.fontSize(5)
            .text('Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022', 0, 8);
        doc.restore();

        return y + 20;
    }

    /**
     * Dibuja el cupón para el cliente (parte media) - Con código de barras incluido.
     */
    static async generarCuponCliente(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const xOffset = 30;

        // Logo PSI
        this.dibujarLogoPSIReal(doc, xOffset, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA
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

        // PERIODO FACTURADO (derecha)
        const yPeriodo = y - 10;
        doc.fontSize(8).font('Helvetica-Bold')
            .text('PERIODO FACTURADO', 400, yPeriodo);

        doc.font('Helvetica')
            .text('Desde', 400, yPeriodo + 15)
            .text('Hasta', 470, yPeriodo + 15)
            .text(this.formatearFecha(factura.fecha_desde) || '1-nov.-2025', 400, yPeriodo + 30)
            .text(this.formatearFecha(factura.fecha_hasta) || '30-nov.-2025', 470, yPeriodo + 30);

        y += 55;

        // Caja de pago (PAGAR ANTES DE / TOTAL)
        doc.rect(xOffset, y, 535, 30).stroke('#000000');
        doc.moveTo(200, y).lineTo(200, y + 30).stroke('#000000');
        doc.moveTo(350, y).lineTo(350, y + 30).stroke('#000000');

        doc.fontSize(10).font('Helvetica-Bold')
            .text('PAGAR ANTES DE', xOffset + 10, y + 12)
            .text(this.formatearFecha(factura.fecha_vencimiento) || '16-nov.-2025', 210, y + 12)
            .text('TOTAL', 360, y + 12)
            .fontSize(14).text(this.formatearMoneda(factura.total), 450, y + 8);

        y += 45;

        // === CÓDIGO DE BARRAS EN ESTE CUPÓN ===
        await this.generarCodigoBarras(doc, 200, y, factura);
        
        y += 70;

        // Mensaje de pago en línea
        doc.fontSize(8).font('Helvetica')
            .text('Pague la factura en línea www.psi.net.co', xOffset, y, { align: 'center', width: 535 });

        return y + 20;
    }

    /**
     * Dibuja el cupón para el banco/corresponsal (parte inferior) - Con recuadro de referencia de pago.
     */
    static async generarCuponBanco(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const xOffset = 30;

        // Logo PSI
        this.dibujarLogoPSIReal(doc, xOffset, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA y NÚMERO
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

        // === RECUADRO DE REFERENCIA DE PAGO - BIEN CENTRADO Y LETRA MÁS GRANDE ===
        const anchoRecuadro = 280;
        const altoRecuadro = 60;
        const xRecuadro = (612 - anchoRecuadro) / 2; // Centrado en la página

        doc.rect(xRecuadro, y, anchoRecuadro, altoRecuadro).stroke('#000000');
        
        doc.fontSize(10).font('Helvetica-Bold')
            .text('Referencia de pago', xRecuadro + 10, y + 15, { align: 'center', width: anchoRecuadro - 20 });
        
        doc.fontSize(16).font('Helvetica-Bold')
            .text(factura.identificacion_cliente || '123223', xRecuadro + 10, y + 32, { align: 'center', width: anchoRecuadro - 20 });

        // Texto "Banco" a la IZQUIERDA del recuadro, PEQUEÑO
        doc.fontSize(7).font('Helvetica')
            .text('Banco', xRecuadro - 40, y + 25);

        y += altoRecuadro + 20;

        // Mensaje de pago
        doc.fontSize(9).font('Helvetica')
            .text('Pague en: Caja Social (corresponsales), Finecoop, Comultrasan, efecty convenio No113760', xOffset, y, { align: 'center', width: 535 });

        y += 15;

        // Dirección empresa
        doc.fontSize(7).font('Helvetica')
            .text('Carrera 9 No. 9-94 WHATSAPP 3184550936', xOffset, y, { align: 'center', width: 535 });

        return y + 20;
    }

    // === MÉTODOS AUXILIARES ===

    /**
     * Dibuja el logo PSI REAL desde archivo (logo2.png)
     */
    static dibujarLogoPSIReal(doc, x, y) {
        try {
            // Intentar cargar el logo real
            const logoPath = path.join(__dirname, '..', 'public', 'logo2.png');
            
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, x, y, { width: 80, height: 45 });
                console.log('✅ Logo PSI cargado desde:', logoPath);
            } else {
                console.warn('⚠️ Logo no encontrado en:', logoPath);
                // Intentar rutas alternativas
                const rutasAlternativas = [
                    path.join(__dirname, 'public', 'logo2.png'),
                    path.join(__dirname, '..', '..', 'public', 'logo2.png'),
                    path.join(process.cwd(), 'public', 'logo2.png'),
                    path.join(process.cwd(), 'backend', 'public', 'logo2.png')
                ];

                let logoEncontrado = false;
                for (const ruta of rutasAlternativas) {
                    if (fs.existsSync(ruta)) {
                        doc.image(ruta, x, y, { width: 80, height: 45 });
                        console.log('✅ Logo PSI cargado desde ruta alternativa:', ruta);
                        logoEncontrado = true;
                        break;
                    }
                }

                if (!logoEncontrado) {
                    throw new Error('Logo no encontrado en ninguna ruta');
                }
            }
        } catch (err) {
            console.warn('⚠️ No se pudo cargar el logo, usando diseño alternativo:', err.message);
            // Dibujo alternativo del logo "PSI"
            doc.circle(x + 25, y + 22, 20).fill('#0056b3').stroke();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff').text('PSI', x + 15, y + 17);
            doc.fillColor('#000000');
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666').text('PROVEEDOR', x + 55, y + 8);
            doc.fillColor('#000000');
        }
    }

    static dibujarLineaSeparadora(doc, y) {
        // Línea punteada de borde a borde
        doc.dash(2, { space: 3 });
        doc.moveTo(20, y).lineTo(590, y).stroke('#cccccc');
        doc.undash();

        // Símbolo de tijeras
        doc.fontSize(10).fillColor('#999999')
            .text('✂', 10, y - 5);

        // Resetear color
        doc.fillColor('#000000');
    }

    /**
     * Genera un código de barras EAN-128 real según el estándar colombiano
     */
    static async generarCodigoBarrasEAN128(numeroLocalizacion, referenciaPago, valorPagar, fechaMaximaPago) {
        try {
            // Validar que referenciaPago tenga número par de dígitos
            let referenciaAjustada = referenciaPago.toString().padStart(2, '0');
            if (referenciaAjustada.length % 2 !== 0) {
                referenciaAjustada = '0' + referenciaAjustada;
            }

            // Validar que valorPagar tenga número par de dígitos
            let valorAjustado = Math.round(valorPagar).toString().padStart(2, '0');
            if (valorAjustado.length % 2 !== 0) {
                valorAjustado = '0' + valorAjustado;
            }

            // Construir cadena según estándar (sin paréntesis en el símbolo)
            const cadenaCompleta = 
                `415${numeroLocalizacion}` +      // (415) + 13 dígitos EAN-13
                `8020${referenciaAjustada}` +     // (8020) + referencia
                `3900${valorAjustado}` +          // (3900) + valor
                `96${fechaMaximaPago}`;           // (96) + fecha AAAAMMDD

            console.log('📊 Código de barras EAN-128:', {
                referencia: referenciaAjustada,
                valor: valorAjustado,
                fecha: fechaMaximaPago,
                longitud: cadenaCompleta.length
            });

            // Generar código de barras
            const buffer = await bwipjs.toBuffer({
                bcid: 'code128',
                text: cadenaCompleta,
                scale: 3,
                height: 12,
                includetext: true,
                textxalign: 'center',
                textsize: 10,
                textfont: 'Helvetica',
                paddingleft: 10,
                paddingright: 10,
                paddingtop: 2,
                paddingbottom: 2
            });

            return buffer;
        } catch (error) {
            console.error('❌ Error generando código de barras:', error);
            throw error;
        }
    }

    /**
     * Formatea fecha para código de barras (AAAAMMDD)
     */
    static formatearFechaBarras(fecha) {
        if (!fecha) {
            const hoy = new Date();
            fecha = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000);
        }

        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            const año = fechaObj.getFullYear();
            const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaObj.getDate()).padStart(2, '0');
            return `${año}${mes}${dia}`;
        } catch (error) {
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            return `${año}${mes}${dia}`;
        }
    }

    /**
     * Genera código de barras EAN-128 en el PDF
     */
    static async generarCodigoBarras(doc, x, y, factura) {
        try {
            // Tu código EAN-13 de GS1 Colombia (REEMPLAZA CON EL TUYO REAL)
            const numeroLocalizacion = '7709998284111';
            
            // Obtener datos de la factura
            const referenciaPago = factura.identificacion_cliente || factura.codigo_cliente || '1005450340';
            const valorPagar = Math.round(parseFloat(factura.total) || 62097);
            const fechaMaximaPago = this.formatearFechaBarras(factura.fecha_vencimiento);

            // Generar código de barras real
            const codigoBarrasBuffer = await this.generarCodigoBarrasEAN128(
                numeroLocalizacion,
                referenciaPago,
                valorPagar,
                fechaMaximaPago
            );

            // Insertar en el PDF
            doc.image(codigoBarrasBuffer, x - 50, y, {
                width: 350,
                height: 50
            });

            // Texto legible con paréntesis (según estándar)
            const codigoLegible = `(415)${numeroLocalizacion}(8020)${referenciaPago}(3900)${valorPagar}(96)${fechaMaximaPago}`;
            doc.fontSize(7).font('Helvetica')
                .text(codigoLegible, x - 50, y + 55, {
                    width: 350,
                    align: 'center'
                });

            console.log('✅ Código de barras EAN-128 insertado');

        } catch (error) {
            console.error('⚠️ Error generando código de barras real, usando versión simulada:', error);
            // Fallback: código simulado
            this.generarCodigoBarrasSimulado(doc, x, y, factura.identificacion_cliente);
        }
    }

    /**
     * Código de barras simulado (fallback)
     */
    static generarCodigoBarrasSimulado(doc, x, y, referencia) {
        const codigo = (referencia || '1005450340').toString();
        let posX = x;

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
     * Obtiene los conceptos de la factura.
     */
    static obtenerConceptosSimples(factura) {
        const conceptos = [];

        // Mapear servicios con orden específico
        const serviciosOrdenados = [
            { campo: 'internet', nombre: 'INTERNET' },
            { campo: 'television', nombre: 'TELEVISION' },
            { campo: 'telefonia', nombre: 'TELEFONIA' },
            { campo: 'saldo_anterior', nombre: 'SALDO ANTERIOR' },
            { campo: 'interes', nombre: 'INTERES' },
            { campo: 'reconexion', nombre: 'RECONEXION' },
            { campo: 'varios', nombre: 'VARIOS' }
        ];

        serviciosOrdenados.forEach(servicio => {
            const valor = parseFloat(factura[servicio.campo]) || 0;
            if (valor > 0) {
                conceptos.push({
                    nombre: servicio.nombre,
                    valor: valor
                });
            }
        });

        // Si no hay conceptos, usar valores por defecto
        if (conceptos.length === 0) {
            const totalFactura = parseFloat(factura.total) || 62097;
            const interes = parseFloat(factura.interes) || 2197;
            const internet = totalFactura - interes;

            conceptos.push({
                nombre: 'INTERNET',
                valor: internet
            });

            if (interes > 0) {
                conceptos.push({
                    nombre: 'INTERES',
                    valor: interes
                });
            }
        }

        return conceptos;
    }

    static formatearMoneda(valor) {
        if (!valor || isNaN(valor)) return '$0';
        const numero = Math.abs(parseFloat(valor));
        return `$${numero.toLocaleString('es-CO')}`;
    }

    static formatearPesos(valor) {
        if (!valor || isNaN(valor)) return '0';
        const numero = Math.abs(parseFloat(valor));
        return numero.toLocaleString('es-CO');
    }

    static formatearFecha(fecha) {
        if (!fecha) return '';

        try {
            const fechaObj = new Date(fecha);
            const dia = fechaObj.getDate();
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            const mes = meses[fechaObj.getMonth()];
            const año = fechaObj.getFullYear();

            return `${dia}-${mes}.-${año}`;
        } catch (error) {
            console.warn('Error formateando fecha:', error);
            return '';
        }
    }

    // Método de prueba con datos exactos del ejemplo
    static async probarGeneradorPSI() {
        try {
            console.log('🧪 Iniciando prueba del generador PSI...');

            const facturaTest = {
                numero_factura: '10P 00090951',
                fecha_emision: '2025-11-01',
                fecha_vencimiento: '2025-11-16',
                fecha_desde: '2025-11-01',
                fecha_hasta: '2025-11-30',
                nombre_cliente: 'MATEO SALAZAR ORTIZ',
                identificacion_cliente: '1005450340',
                codigo_cliente: '200',
                direccion_cliente: 'CR 15A 21-01 APT 601 COLINAS DE SAN MARTIN',
                internet: 59900, 
                interes: 2197,
                total: 62097
            };

            const empresaTest = {
                empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
                empresa_nit: '901.582.657-3',
                empresa_direccion: 'Carrera 9 No 9-94',
                empresa_telefono: '3184550936'
            };

            const doc = await this.generarFactura(facturaTest, empresaTest);
            console.log('✅ Prueba completada exitosamente');
            return doc;
        } catch (error) {
            console.error('❌ Error en prueba PSI:', error);
            throw error;
        }
    }

    // Método para validar datos antes de generar
    static validarDatos(factura, empresa) {
        const errores = [];

        if (!factura?.numero_factura) errores.push('Número de factura requerido');
        if (!factura?.nombre_cliente) errores.push('Nombre del cliente requerido');
        if (factura?.total === undefined || factura?.total === null) errores.push('Total de factura requerido');
        if (!empresa?.empresa_nombre) errores.push('Nombre de empresa requerido');

        if (errores.length > 0) {
            console.error('❌ Errores de validación:', errores);
            throw new Error(`Errores de validación: ${errores.join(', ')}`);
        }

        console.log('✅ Validación de datos exitosa');
        return true;
    }

    // Método para depuración
    static debugFactura(factura) {
        console.log('🔍 Debug de factura:', {
            numero: factura.numero_factura,
            cliente: factura.nombre_cliente,
            identificacion: factura.identificacion_cliente,
            total: factura.total,
            servicios: {
                internet: factura.internet,
                television: factura.television,
                telefonia: factura.telefonia,
                interes: factura.interes
            }
        });
    }
}

module.exports = PDFGenerator;