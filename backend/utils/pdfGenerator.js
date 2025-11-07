// backend/utils/pdfGenerator.js - GENERADOR PDF EXACTO AL DISEÑO PSI ORIGINAL
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

class PDFGenerator {
    static async generarFactura(facturaData, empresa) {
        return new Promise((resolve, reject) => {
            try {
                // Validación estricta para asegurar que el diseño se vea bien
                this.validarDatos(facturaData, empresa);

                console.log('📄 Generando PDF PSI para factura:', facturaData.numero_factura);

                // Crear documento PDF tamaño carta
                const doc = new PDFDocument({
                    size: 'letter',
                    // Margen reducido para replicar el diseño compacto
                    margin: 20, 
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

                let yPosition = 25;

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
        const MARGIN_LEFT = 30;
        const PAGE_WIDTH = 612 - 2 * doc.page.margins.left; // Ancho efectivo

        // === ENCABEZADO CON LOGO PSI ===
        const LOGO_HEIGHT = 45;
        this.dibujarLogoPSI(doc, MARGIN_LEFT, y);

        // Información de la empresa (centro-derecha)
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);
        
        doc.font('Helvetica').fontSize(8);
        doc.text('NIT: 901.582.657-3', 140, y + 20);
        doc.text('Registro único de TIC No. 96006732', 140, y + 30);
        doc.text('vigilado y regulado por el MINTIC', 140, y + 40);

        // FACTURA DE VENTA (esquina superior derecha)
        const X_FACTURA = 470;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('FACTURA DE VENTA', X_FACTURA, y + 8);
        doc.fontSize(11).text(factura.numero_factura || '10P 00083055', X_FACTURA, y + 24);

        y += 70; // Espacio después del encabezado

        // === INFORMACIÓN DEL CLIENTE Y PERIODO ===
        const Y_CLIENTE = y;

        // Cliente (Izquierda)
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', MARGIN_LEFT, Y_CLIENTE);
        
        doc.fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', MARGIN_LEFT, Y_CLIENTE + 15)
            // Usamos un ancho limitado para la dirección
            .text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', MARGIN_LEFT, Y_CLIENTE + 30, { width: 300 });

        // Periodo y Vencimiento (Derecha)
        const X_PERIODO = 380;
        const X_FECHA = 470;
        
        doc.fontSize(8).font('Helvetica-Bold')
            .text('PERIODO FACTURADO', X_PERIODO, Y_CLIENTE);

        doc.font('Helvetica')
            .text('Desde', X_PERIODO, Y_CLIENTE + 12)
            .text('Hasta', X_FECHA, Y_CLIENTE + 12)
            .text(this.formatearFecha(factura.fecha_desde) || '1-jul.-2025', X_PERIODO, Y_CLIENTE + 25)
            .text(this.formatearFecha(factura.fecha_hasta) || '31-jul.-2025', X_FECHA, Y_CLIENTE + 25);
            
        doc.font('Helvetica-Bold')
            .text('PAGAR ANTES DE', X_PERIODO, Y_CLIENTE + 45)
            .font('Helvetica').fontSize(10)
            .text(this.formatearFecha(factura.fecha_vencimiento) || '16-jul.-2025', X_FECHA, Y_CLIENTE + 45);

        y = Y_CLIENTE + 75; // Nueva posición Y después del bloque de cliente/periodo

        // === TABLA DE CONCEPTOS ===
        const ALTURA_ENCABEZADO = 18;
        const ALTURA_FILA = 18;
        const ANCHO_TABLA = 535;

        // Coordenadas X de las columnas
        const COL_X = [MARGIN_LEFT, 150, 250, 320, 420, MARGIN_LEFT + ANCHO_TABLA]; 
        
        // 1. Encabezado de tabla (Borde superior e inferior grueso)
        doc.lineWidth(1).rect(COL_X[0], y, ANCHO_TABLA, ALTURA_ENCABEZADO).stroke('#000000');
        
        // Separadores verticales (delgados)
        doc.lineWidth(0.5).moveTo(COL_X[1], y).lineTo(COL_X[1], y + ALTURA_ENCABEZADO).stroke('#000000');
        doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ALTURA_ENCABEZADO).stroke('#000000');
        doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ALTURA_ENCABEZADO).stroke('#000000');
        // Dividir periodo facturado
        doc.moveTo(COL_X[4], y).lineTo(COL_X[4], y + ALTURA_ENCABEZADO).stroke('#000000'); 
        
        // Texto del encabezado
        doc.fontSize(8).font('Helvetica-Bold')
            .text('Concepto', COL_X[0] + 5, y + 6)
            .text('Valor Mes', COL_X[1] + 5, y + 6)
            .text('Saldo', COL_X[2] + 5, y + 6)
            .text('PERIODO', COL_X[3] + 5, y + 2)
            .text('FACTURADO', COL_X[3] + 5, y + 10)
            .text('IVA', COL_X[4] + 5, y + 6); // Agregando IVA para completar el diseño estándar

        y += ALTURA_ENCABEZADO;

        // 2. Datos de conceptos
        const conceptos = this.obtenerConceptosSimples(factura);

        conceptos.forEach((concepto, index) => {
            // Bordes de la fila (Delgados y solo verticales)
            doc.lineWidth(0.5).rect(COL_X[0], y, ANCHO_TABLA, ALTURA_FILA).stroke('#cccccc');
            doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ALTURA_FILA).stroke('#cccccc');
            doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ALTURA_FILA).stroke('#cccccc');
            doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ALTURA_FILA).stroke('#cccccc');
            doc.moveTo(COL_X[4], y).lineTo(COL_X[4], y + ALTURA_FILA).stroke('#cccccc');

            // Contenido de la fila
            doc.fontSize(8).font('Helvetica').fillColor('#000000')
                .text(concepto.nombre, COL_X[0] + 5, y + 6)
                .text(this.formatearPesos(concepto.valor), COL_X[1] + 5, y + 6, { align: 'left' })
                .text('0', COL_X[2] + 5, y + 6) // Asume saldo 0
                .text(this.formatearPesos(concepto.iva || 0), COL_X[4] + 5, y + 6);

            // Periodo (solo en la primera fila)
            if (index === 0) {
                 doc.font('Helvetica').fontSize(8).fillColor('#000000');
                 doc.text(this.formatearFecha(factura.fecha_desde) || '1-jul.-2025', COL_X[3] + 5, y + 6, { width: 45 });
                 doc.text(this.formatearFecha(factura.fecha_hasta) || '31-jul.-2025', COL_X[4] - 35, y + 6, { width: 45 });
            }

            y += ALTURA_FILA;
        });

        // 3. Fila del TOTAL de conceptos (Bordes gruesos)
        doc.lineWidth(1).rect(COL_X[0], y, ANCHO_TABLA, ALTURA_FILA).stroke('#000000');
        doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ALTURA_FILA).stroke('#000000');
        doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ALTURA_FILA).stroke('#000000');
        doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ALTURA_FILA).stroke('#000000');
        doc.moveTo(COL_X[4], y).lineTo(COL_X[4], y + ALTURA_FILA).stroke('#000000');
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('TOTAL', COL_X[0] + 5, y + 5)
            .text(this.formatearMoneda(factura.total), COL_X[1] + 5, y + 5, { align: 'left' })
            .text('PAGAR ANTES DE:', COL_X[3] + 5, y + 5)
            .fontSize(10).text(this.formatearFecha(factura.fecha_vencimiento) || '16-jul.-2025', COL_X[4] + 5, y + 5);

        y += ALTURA_FILA + 10;

        // === MENSAJES INFORMATIVOS ===
        doc.fillColor('#000000')
            .fontSize(8).font('Helvetica-Bold')
            .text('Pague su factura y evite suspensiones - Valor Reconexión $11.900', MARGIN_LEFT, y);

        y += 15;
        // Ajustar el texto de pago para incluir la información del PDF
        doc.fontSize(7).font('Helvetica')
            .text('Pague en: Caja Social (corresponsales), Finecoop, Comultrasan, efecty convenio No113760, Ahorramas o en linea (PSE) en www.psi.net.co', MARGIN_LEFT, y, { width: 535 });

        return y + 20;
    }

    static generarCuponCliente(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const MARGIN_LEFT = 30;
        
        // Logo PSI
        this.dibujarLogoPSI(doc, MARGIN_LEFT, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA
        const X_FACTURA = 470;
        doc.fontSize(9).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', X_FACTURA, y + 8);
        doc.fontSize(11).text(factura.numero_factura || '10P 00083055', X_FACTURA, y + 24);

        y += 50;

        // Información del cliente
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', MARGIN_LEFT, y);
        
        doc.fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', MARGIN_LEFT, y + 15)
            .text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', MARGIN_LEFT, y + 30);
            
        // Periodo facturado (Derecha)
        const X_PERIODO = 380;
        const X_FECHA = 470;

        doc.fontSize(8).font('Helvetica-Bold')
            .text('PERIODO FACTURADO', X_PERIODO, y + 10); // Alineación ajustada
            
        doc.font('Helvetica').fontSize(8)
            .text('Desde', X_PERIODO, y + 25)
            .text('Hasta', X_FECHA, y + 25)
            .text(this.formatearFecha(factura.fecha_desde) || '1-jul.-2025', X_PERIODO, y + 35)
            .text(this.formatearFecha(factura.fecha_hasta) || '31-jul.-2025', X_FECHA, y + 35);


        y += 75; // Posición para la caja de pago

        // Caja de pago
        const X_TOTAL = 440;
        const ANCHO_CAJA = 535;

        doc.lineWidth(1).rect(MARGIN_LEFT, y, ANCHO_CAJA, 30).stroke('#000000');
        doc.moveTo(200, y).lineTo(200, y + 30).stroke('#000000');
        doc.moveTo(X_TOTAL - 10, y).lineTo(X_TOTAL - 10, y + 30).stroke('#000000'); // Separador para TOTAL

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
            .text('PAGAR ANTES DE', MARGIN_LEFT + 10, y + 10)
            .text(this.formatearFecha(factura.fecha_vencimiento) || '16-jul.-2025', 210, y + 10)
            .text('TOTAL', X_TOTAL, y + 12, { align: 'left', width: 40 });
        
        doc.fontSize(14).text(this.formatearMoneda(factura.total), X_TOTAL + 45, y + 8);

        return y + 40;
    }

    static generarCuponBanco(doc, factura, empresa, yInicial) {
        let y = yInicial;
        const MARGIN_LEFT = 30;

        // Logo PSI
        this.dibujarLogoPSI(doc, MARGIN_LEFT, y);

        // Información empresa
        doc.fontSize(9).font('Helvetica-Bold')
            .text('PROVEEDOR DE TELECOMUNICACIONES SAS.', 140, y + 8);

        // FACTURA DE VENTA
        const X_FACTURA = 470;
        doc.fontSize(9).font('Helvetica-Bold')
            .text('FACTURA DE VENTA', X_FACTURA, y + 8);
        doc.fontSize(11).text(factura.numero_factura || '10P 00083055', X_FACTURA, y + 24);

        y += 60;

        // Información del cliente (Izquierda)
        doc.fontSize(11).font('Helvetica-Bold')
            .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', MARGIN_LEFT, y);
        
        doc.fontSize(9).font('Helvetica')
            .text(factura.identificacion_cliente || '1005450340', MARGIN_LEFT, y + 15)
            .text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', MARGIN_LEFT, y + 30);

        // TOTAL grande (Derecha)
        const X_TOTAL = 450;
        doc.fontSize(10).font('Helvetica-Bold')
            .text('TOTAL', X_TOTAL, y + 5)
            .fontSize(16).text(this.formatearMoneda(factura.total), X_TOTAL, y + 20);

        y += 70; // Espacio para código de barras

        // Código de barras
        const X_BARCODE = 150; // Posición ajustada para mejor centralización
        this.generarCodigoBarras(doc, X_BARCODE, y, factura.identificacion_cliente);

        y += 50; // Después del código de barras y su texto

        // Mensaje de pago en línea
        doc.fontSize(9).font('Helvetica-Bold')
            .text('Pague la factura en línea www.psi.net.co', MARGIN_LEFT, y);

        y += 20;

        // Referencia de pago y Banco
        const Y_REFERENCIA = y;
        const ANCHO_REF = 200;
        
        // Caja de Referencia
        doc.lineWidth(1).rect(X_BARCODE, Y_REFERENCIA, ANCHO_REF, 40).stroke('#000000');
        
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000')
            .text('Referencia de pago', X_BARCODE + 10, Y_REFERENCIA + 5);
            
        doc.fontSize(12).font('Helvetica-Bold')
            .text(factura.identificacion_cliente || '1005450340', X_BARCODE + 10, Y_REFERENCIA + 20);

        // Texto "Banco" vertical (A la izquierda de la caja)
        doc.save();
        doc.translate(X_BARCODE - 10, Y_REFERENCIA + 20);
        doc.rotate(-90);
        doc.fontSize(10).font('Helvetica-Bold').text('Banco', 0, 0);
        doc.restore();

        y += 50;

        // Dirección empresa (Pie de página del cupón)
        doc.fontSize(7).font('Helvetica')
            .text('Carrera 9 No. 9-94 WHATSAPP 3184550936', MARGIN_LEFT, y);
            
        // Mensaje de facturación
        doc.fontSize(6).font('Helvetica')
            .text('Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022 vigilado y regulado por el MINITIC', MARGIN_LEFT + 250, y, { align: 'right', width: 300 });

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
        // Usar texto de placeholder más fiel
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#0066cc').text('PSI', x, y + 5);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('Únete a PS', x + 5, y + 28);
        doc.fillColor('#000000');
    }
}

    static dibujarLineaSeparadora(doc, y) {
        // Línea punteada de borde a borde
        doc.dash(2, { space: 3 });
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke('#cccccc');
        doc.undash();

        // Símbolo de tijeras
        doc.fontSize(10).fillColor('#999999')
            .text('✂', doc.page.width / 2 - 5, y - 5);

        // Resetear color
        doc.fillColor('#000000');
    }

    static generarCodigoBarras(doc, x, y, referencia) {
        const codigo = (referencia || '1005450340').toString();
        let posX = x;

        // Generar patrón de barras más denso y variable
        for (let i = 0; i < 90; i++) {
            const esBarraGruesa = (i % 5 === 0);
            const altura = 35; 
            const ancho = esBarraGruesa ? 2.5 : 0.8; 
            
            // Alternar entre barras negras y espacios
            if (i % 2 === 0) {
                doc.rect(posX, y, ancho, altura).fill('#000000');
            }

            posX += ancho;
        }

        // Texto del código debajo del código de barras
        doc.fontSize(9).font('Helvetica')
            .text(codigo, x + 30, y + 40);
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
                    valor: valor,
                    iva: servicio.campo !== 'interes' ? Math.round(valor * 0.19 / 1.19) : 0 // Calcular un IVA simulado
                });
            }
        });

        // Simulación por defecto basada en el PDF de ejemplo
        if (conceptos.length === 0) {
            const totalFactura = parseFloat(factura.total) || 62097;
            const interes = parseFloat(factura.interes) || 2197;
            const internet = (totalFactura - interes) || 59900;
            
            conceptos.push({
                nombre: 'INTERNET',
                valor: internet,
                iva: Math.round(internet * 0.19 / 1.19)
            });

            if (interes > 0) {
                conceptos.push({
                    nombre: 'INTERES',
                    valor: interes,
                    iva: 0
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
        // Formateo de pesos sin el símbolo de moneda para la tabla
        return numero.toLocaleString('es-CO'); 
    }

    static formatearFecha(fecha) {
        if (!fecha) return '';

        try {
            const fechaObj = new Date(fecha);
            // Si la fecha es inválida, se devuelve una cadena vacía
            if (isNaN(fechaObj)) return ''; 
            
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

    // Método de prueba con datos exactos del ejemplo del PDF
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
                direccion_cliente: 'CR 15A 21-01 APT 601 COLINAS DE SAN MARTIN',
                // Valores del PDF de ejemplo
                internet: 59900, 
                interes: 2197, 
                total: 62097
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
}

module.exports = PDFGenerator;