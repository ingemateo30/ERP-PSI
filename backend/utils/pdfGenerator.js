// backend/utils/pdfGenerator.js - GENERADOR PDF EXACTO AL DISEÑO PSI ORIGINAL
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class PDFGenerator {
    static async generarFactura(facturaData, empresa) {
        return new Promise((resolve, reject) => {
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

                // CUPÓN PRINCIPAL (parte superior)
                yPosition = this.generarCuponPrincipal(doc, facturaData, empresa, yPosition);

                // Línea separadora punteada
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN CLIENTE (parte media)
                yPosition = this.generarCuponCliente(doc, facturaData, empresa, yPosition);

                // Línea separadora punteada
                yPosition += 15;
                this.dibujarLineaSeparadora(doc, yPosition);
                yPosition += 15;

                // CUPÓN BANCO (parte inferior)
                this.generarCuponBanco(doc, facturaData, empresa, yPosition);

                doc.end();

            } catch (error) {
                console.error('❌ Error generando PDF PSI:', error);
                reject(new Error(`Error generando PDF: ${error.message}`));
            }
        });
    }

    static generarCuponPrincipal(doc, factura, empresa, yInicial) {
        let y = yInicial;

        // === ENCABEZADO CON LOGO PSI ===
        this.dibujarLogoPSI(doc, 30, y);

        // Información de la empresa (centro-derecha)
        doc.fontSize(9).font('Helvetica-Bold')
            .text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8)
            .fontSize(8).font('Helvetica')
            .text('NIT: 901.582.657-3', 140, y + 22)
            .text('Registro único de TIC No. 96006732', 140, y + 34)
            .text('vigilado y regulado por el MINTIC', 140, y + 46);

        // FACTURA DE VENTA (esquina superior derecha)
        doc.fontSize(10).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', 470, y + 8)
            .fontSize(11).text(factura.numero_factura || '10P 00083055', 470, y + 24);

        y += 70;

        // === INFORMACIÓN DEL CLIENTE ===
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 30, y)
            .fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', 30, y + 15)
            .text(factura.cliente_direccion || 'CR 14A 21-63 ARBOLEDAS', 30, y + 30);

        y += 60;

        // === TABLA DE CONCEPTOS ===
        const alturaEncabezado = 18;
        const alturaFila = 18;

        // Encabezado de tabla con bordes
        doc.rect(30, y, 535, alturaEncabezado).stroke('#000000');

        // Columnas del encabezado
        doc.moveTo(160, y).lineTo(160, y + alturaEncabezado).stroke('#000000');
        doc.moveTo(240, y).lineTo(240, y + alturaEncabezado).stroke('#000000');
        doc.moveTo(290, y).lineTo(290, y + alturaEncabezado).stroke('#000000');
        doc.moveTo(370, y).lineTo(370, y + alturaEncabezado).stroke('#000000');

        // Texto del encabezado
        doc.fontSize(8).font('Helvetica-Bold')
            .text('Concepto', 35, y + 6)
            .text('Valor Mes', 165, y + 6)
            .text('Saldo', 245, y + 6)
            .text('PERIODO FACTURADO', 375, y + 6)
            .text('Desde', 375, y + 15)
            .text('Hasta', 450, y + 15);

        y += alturaEncabezado;

        // Datos de conceptos
        const conceptos = this.obtenerConceptosSimples(factura);

        conceptos.forEach((concepto, index) => {
            // Bordes de la fila
            doc.rect(30, y, 535, alturaFila).stroke('#cccccc');
            doc.moveTo(160, y).lineTo(160, y + alturaFila).stroke('#cccccc');
            doc.moveTo(240, y).lineTo(240, y + alturaFila).stroke('#cccccc');
            doc.moveTo(290, y).lineTo(290, y + alturaFila).stroke('#cccccc');
            doc.moveTo(370, y).lineTo(370, y + alturaFila).stroke('#cccccc');

            // Contenido de la fila
            doc.fontSize(8).font('Helvetica')
                .text(concepto.nombre, 35, y + 6)
                .text(this.formatearPesos(concepto.valor), 165, y + 6)
                .text('0', 245, y + 6);

            // Solo en la primera fila mostrar las fechas
            if (index === 0) {
                doc.text(this.formatearFecha(factura.fecha_desde) || '1-jul.-2025', 375, y + 6)
                    .text(this.formatearFecha(factura.fecha_hasta) || '31-jul.-2025', 450, y + 6);
            }

            y += alturaFila;
        });

        // Fila del total de conceptos
        doc.rect(30, y, 535, alturaFila).stroke('#000000');
        doc.moveTo(160, y).lineTo(160, y + alturaFila).stroke('#000000');
        doc.moveTo(240, y).lineTo(240, y + alturaFila).stroke('#000000');
        doc.moveTo(290, y).lineTo(290, y + alturaFila).stroke('#000000');
        doc.moveTo(370, y).lineTo(370, y + alturaFila).stroke('#000000');

        doc.fontSize(8).font('Helvetica-Bold')
            .text('TOTAL', 35, y + 6)
            .text(this.formatearPesos(factura.total), 165, y + 6)
            .text('PAGAR ANTES DE', 375, y + 6)
            .fontSize(9).text(this.formatearFecha(factura.fecha_vencimiento) || '16-jul.-2025', 450, y + 6);

        y += alturaFila + 15;

        // === TOTAL GRANDE ===
        const iva = Math.round((factura.total || 0) * 0.19 / 1.19);
        const subtotal = (factura.total || 0) - iva;

        const xLabel = 360;
        const xValue = 460;

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

        doc.text('Subtotal:', xLabel, y);
        doc.text(this.formatearMoneda(factura.subtotal), xValue, y);

        y += 15;
        doc.text('IVA (19%):', xLabel, y);
        doc.text(this.formatearMoneda(factura.iva), xValue, y);

        y += 15;

        // Total resaltado
        doc.rect(30, y, 535, 35).fill('#000000').stroke('#000000');
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff')
            .text('TOTAL A PAGAR', 40, y + 12)
            .fontSize(18).text(this.formatearMoneda(factura.total), 430, y + 10);

        y += 40;

        // === MENSAJES INFORMATIVOS ===
        doc.fillColor('#000000')
            .fontSize(8).font('Helvetica-Bold')
            .text('Pague su factura y evite suspensiones - Valor Reconexión $11.900', 30, y);

        y += 15;

        doc.fontSize(7).font('Helvetica')
            .text('Pague en: Caja Social(corresponsales),Finecoop,Comultrasan, Ahorramas o en línea (PSE) en www.psi.net.co', 30, y);

        return y + 20;
    }

    static generarCuponCliente(doc, factura, empresa, yInicial) {
        let y = yInicial;

        // Logo PSI
        this.dibujarLogoPSI(doc, 30, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA (esquina superior derecha)
        doc.fontSize(10).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', 470, y + 8)
            .fontSize(11).text(factura.numero_factura || '10P 00083055', 470, y + 24);

        y += 50;

        // Información del cliente
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 30, y)
            .fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', 30, y + 15)
            .text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', 30, y + 30);
// === PERIODO FACTURADO (derecha, con más margen hacia abajo en las fechas) ===
doc.fontSize(8).font('Helvetica-Bold')
   .text('PERIODO FACTURADO', 400, y);

y += 22; // ⬅️ Aumentamos el espacio antes de las fechas

doc.font('Helvetica')
   .text('Desde', 400, y)
   .text('Hasta', 470, y)
   .text(this.formatearFecha(factura.fecha_desde) || '1-jul.-2025', 400, y + 15)
   .text(this.formatearFecha(factura.fecha_hasta) || '31-jul.-2025', 470, y + 15);



        y += 55;

        // Caja de pago
        doc.rect(30, y, 535, 30).stroke('#000000');
        doc.moveTo(200, y).lineTo(200, y + 30).stroke('#000000');
        doc.moveTo(350, y).lineTo(350, y + 30).stroke('#000000');

        doc.fontSize(10).font('Helvetica-Bold')
            .text('PAGAR ANTES DE', 40, y + 12)
            .text(this.formatearFecha(factura.fecha_vencimiento) || '16-jul.-2025', 210, y + 12)
            .text('TOTAL', 360, y + 12)
            .fontSize(14).text(this.formatearMoneda(factura.total), 450, y + 8);

        return y + 40;
    }

    static generarCuponBanco(doc, factura, empresa, yInicial) {
        let y = yInicial;

        // Logo PSI
        this.dibujarLogoPSI(doc, 30, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA y TOTAL (esquina superior derecha)
        doc.fontSize(10).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', 470, y + 8)
            .fontSize(11).text(factura.numero_factura || '10P 00083055', 470, y + 24);

        y += 50;

        // Información del cliente
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 30, y)
            .fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', 30, y + 15)
            .text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', 30, y + 30);

        // TOTAL grande (derecha)
        doc.fontSize(12).font('Helvetica-Bold')
            .text('TOTAL', 450, y + 10)
            .fontSize(16).text(this.formatearMoneda(factura.total), 450, y + 25);

        y += 65;

        // Código de barras
        this.generarCodigoBarras(doc, 200, y, factura.identificacion_cliente);

        y += 45;

        // Mensaje de pago en línea
        doc.fontSize(10).font('Helvetica-Bold')
            .text('Pague la factura en línea www.psi.net.co', 30, y);

        y += 20;

        // Referencia de pago y Banco
        doc.rect(200, y, 200, 40).stroke('#000000');
        doc.fontSize(9).font('Helvetica-Bold')
            .text('Referencia de pago', 210, y + 8)
            .fontSize(12).text(factura.identificacion_cliente || '1005450340', 230, y + 22);

        // Texto "Banco" vertical
        doc.save();
        doc.translate(20, y + 20);
        doc.rotate(-90);
        doc.fontSize(12).font('Helvetica-Bold').text('Banco', 0, 0);
        doc.restore();

        y += 50;

        // Dirección empresa
        doc.fontSize(7).font('Helvetica')
            .text('Carrera 9 No. 9-94 WHATSAPP 3184550936', 30, y);

        return y + 20;
    }

    // === MÉTODOS AUXILIARES ===

    static dibujarLogoPSI(doc, x, y) {
    try {
        const logoPath = path.join(__dirname, '..', 'public', 'logo2.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x, y, { width: 80, height: 45 });
            console.log('✅ Logo PSI cargado:', logoPath);
        } else {
            throw new Error('Logo no encontrado');
        }
    } catch (err) {
        console.warn('⚠️ No se pudo cargar el logo, usando diseño alternativo:', err.message);
        doc.circle(x + 25, y + 22, 20).fill('#0066cc').stroke();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff').text('PSI', x + 15, y + 17);
        doc.fillColor('#000000');
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666').text('Crece con', x + 55, y + 8);
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

    static generarCodigoBarras(doc, x, y, referencia) {
        const codigo = (referencia || '1005450340').toString();
        let posX = x;

        // Generar patrón de barras más realista
        for (let i = 0; i < 80; i++) {
            const esBarraGruesa = (i % 7 === 0) || (i % 11 === 0);
            const altura = esBarraGruesa ? 30 : 25;
            const ancho = esBarraGruesa ? 3 : 1;

            // Alternar entre barras negras y espacios
            if (i % 2 === 0) {
                doc.rect(posX, y, ancho, altura).fill('#000000');
            }

            posX += ancho + 1;
        }

        // Texto del código debajo del código de barras
        doc.fontSize(9).font('Helvetica')
            .text(codigo, x + 20, y + 35);
    }

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

        // Si no hay conceptos, usar valores por defecto basados en los PDFs de ejemplo
        if (conceptos.length === 0) {
            const totalFactura = parseFloat(factura.total) || 59962;
            const interes = parseFloat(factura.interes) || 62;
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
                numero_factura: '10P 00083055',
                fecha_emision: '2025-07-01',
                fecha_vencimiento: '2025-07-16',
                fecha_desde: '2025-07-01',
                fecha_hasta: '2025-07-31',
                nombre_cliente: 'MATEO SALAZAR ORTIZ',
                identificacion_cliente: '1005450340',
                direccion_cliente: 'CR 14A 21-63 ARBOLEDAS',
                internet: 59900,
                interes: 62,
                total: 59962
            };

            const empresaTest = {
                empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
                empresa_nit: '901.582.657-3',
                empresa_direccion: 'Carrera 9 No. 9-94',
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