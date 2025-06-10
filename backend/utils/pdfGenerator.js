// utils/psiInvoicePDFGenerator.js - Replicación exacta del diseño PSI
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PSIInvoicePDFGenerator {

    static async generar(factura, empresa) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔧 Generando factura estilo PSI...');

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

                this.generarFacturaPrincipal(doc, factura, empresa);
                this.generarCuponCliente(doc, factura, empresa);
                this.generarCuponBanco(doc, factura, empresa);

                doc.end();

            } catch (error) {
                console.error('❌ Error:', error);
                reject(error);
            }
        });
    }

    static generarFacturaPrincipal(doc, factura, empresa) {
        // === ENCABEZADO EMPRESA ===
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 50, 30);

        doc.fontSize(10)
           .font('Helvetica')
           .text(`NIT: ${empresa.empresa_nit || '901.582.657-3'}`, 50, 45);

        doc.text(`${factura.numero_factura || '10P 00081047'}`, 450, 30);

        if (empresa.registro_tic) {
            doc.text(`Registro unico de tic No. ${empresa.registro_tic}`, 50, 60);
        }

        doc.text('vigilado y regulado por el MINITIC', 50, 75);

        // === INFORMACIÓN DEL CLIENTE ===
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 50, 110);

        doc.fontSize(10)
           .font('Helvetica')
           .text(factura.identificacion_cliente || '1005450340', 50, 125);

        doc.text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', 50, 140);

        // === DATOS DE FACTURACIÓN A LA DERECHA ===
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FACTURA DE VENTA', 400, 110);

        doc.fontSize(9)
           .font('Helvetica')
           .text('PERIODO FACTURADO', 400, 130);

        const [fechaInicio, fechaFin] = this.extraerPeriodo(factura.periodo_facturacion);
        doc.text('Desde', 400, 145);
        doc.text('Hasta', 450, 145);
        doc.text(fechaInicio, 400, 160);
        doc.text(fechaFin, 450, 160);

        doc.text('PAGAR ANTES DE', 400, 180);
        doc.text(this.formatearFechaCorta(factura.fecha_vencimiento), 400, 195);

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('TOTAL', 400, 215);
        doc.text(this.formatearMoneda(factura.total || 0), 400, 230);

        // === TABLA DE CONCEPTOS ===
        const tableY = 260;
        
        // Encabezados
        doc.rect(50, tableY, 500, 25);
        doc.stroke();

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text('Concepto', 60, tableY + 8);
        doc.text('Valor Mes', 300, tableY + 8);
        doc.text('Saldo', 450, tableY + 8);

        // Filas de conceptos
        let currentY = tableY + 25;
        const conceptos = this.obtenerConceptosFactura(factura);

        conceptos.forEach(concepto => {
            doc.rect(50, currentY, 500, 25);
            doc.stroke();

            doc.fontSize(9)
               .font('Helvetica')
               .text(concepto.concepto, 60, currentY + 8);
            
            doc.text(this.formatearMonedaSinSigno(concepto.valor), 300, currentY + 8);
            doc.text('0', 460, currentY + 8);

            currentY += 25;
        });

        // Fila total
        doc.rect(50, currentY, 500, 25);
        doc.stroke();

        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text('TOTAL', 60, currentY + 8);
        doc.text(this.formatearMoneda(factura.total || 0), 400, currentY + 8);

        // === MENSAJE DE PAGO ===
        const mensajeY = currentY + 50;
        doc.rect(50, mensajeY, 500, 25)
           .fill('black');

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('white')
           .text(`Pague su factura y evite suspensiones - Valor Reconexión $${this.formatearNumero(factura.valor_reconexion || 11900)}`, 
                 60, mensajeY + 8);

        doc.fillColor('black');

        doc.fontSize(9)
           .font('Helvetica')
           .text('Pague en: Caja Social(corresponsales),Finecoop,Comultrasan, Ahorramas o en linea (PSE) en www.psi.net.co', 
                 50, mensajeY + 40);

        return mensajeY + 70;
    }

    static generarCuponCliente(doc, factura, empresa) {
        const startY = 460;

        // === ENCABEZADO CUPÓN CLIENTE ===
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 50, startY);

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FACTURA DE VENTA', 400, startY);
        
        doc.text(`${factura.numero_factura || '10P 00081047'}`, 400, startY + 15);

        // === INFORMACIÓN DEL CLIENTE ===
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 50, startY + 35);

        doc.fontSize(10)
           .font('Helvetica')
           .text(factura.identificacion_cliente || '1005450340', 50, startY + 50);

        doc.text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', 50, startY + 65);

        // === PERÍODO Y TOTAL ===
        doc.fontSize(9)
           .font('Helvetica')
           .text('PERIODO FACTURADO', 300, startY + 35);

        const [fechaInicio, fechaFin] = this.extraerPeriodo(factura.periodo_facturacion);
        
        doc.rect(300, startY + 50, 60, 20);
        doc.stroke();
        doc.text('Desde', 305, startY + 55);
        doc.text(fechaInicio, 305, startY + 65);

        doc.rect(360, startY + 50, 60, 20);
        doc.stroke();
        doc.text('Hasta', 365, startY + 55);
        doc.text(fechaFin, 365, startY + 65);

        doc.rect(430, startY + 50, 120, 20);
        doc.stroke();
        doc.text('PAGAR ANTES DE', 435, startY + 55);
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(this.formatearFechaCorta(factura.fecha_vencimiento), 435, startY + 65);

        // === TOTAL DESTACADO ===
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('TOTAL', 300, startY + 90);
        doc.text(this.formatearMoneda(factura.total || 0), 300, startY + 105);

        return startY + 140;
    }

    static generarCuponBanco(doc, factura, empresa) {
        const startY = 620;

        // === CÓDIGO DE BARRAS (simulado) ===
        // Generar líneas verticales para simular código de barras
        for (let i = 0; i < 200; i++) {
            const x = 50 + i * 2.5;
            const height = Math.random() > 0.5 ? 40 : 30;
            doc.rect(x, startY, 1, height)
               .fill('black');
        }

        // === INFORMACIÓN BANCARIA ===
        const bancoY = startY + 60;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('black')
           .text(empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.', 50, bancoY);

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FACTURA DE VENTA', 400, bancoY);
        
        doc.text(`${factura.numero_factura || '10P 00081047'}`, 400, bancoY + 15);

        // === CLIENTE BANCO ===
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(factura.nombre_cliente || 'MATEO SALAZAR ORTIZ', 50, bancoY + 35);

        doc.fontSize(10)
           .font('Helvetica')
           .text(factura.identificacion_cliente || '1005450340', 50, bancoY + 50);

        doc.text(factura.direccion_cliente || 'CR 14A 21-63 ARBOLEDAS', 50, bancoY + 65);

        // === TOTAL BANCO ===
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('TOTAL', 400, bancoY + 35);
        doc.text(this.formatearMoneda(factura.total || 0), 400, bancoY + 50);

        // === INFORMACIÓN DE PAGO EN LÍNEA ===
        const pagoY = bancoY + 90;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Pague la factura en línea www.psi.net.co', 50, pagoY);

        // === REFERENCIA DE PAGO ===
        doc.rect(200, pagoY + 30, 200, 40);
        doc.stroke();

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Referencia de pago', 210, pagoY + 40);
        
        doc.fontSize(14)
           .text(factura.identificacion_cliente || '1005450340', 210, pagoY + 55);

        // === ETIQUETA BANCO ===
        doc.fontSize(8)
           .font('Helvetica')
           .text('Banco', 30, pagoY + 50, { rotate: 90 });

        return pagoY + 100;
    }

    // === MÉTODOS AUXILIARES ===

    static obtenerConceptosFactura(factura) {
        const conceptos = [];

        // Mapeo de servicios
        const servicios = [
            { campo: 'internet', nombre: 'INTERNET' },
            { campo: 'television', nombre: 'TELEVISION' },
            { campo: 'telefonia', nombre: 'TELEFONIA' },
            { campo: 'saldo_anterior', nombre: 'SALDO ANTERIOR' },
            { campo: 'interes', nombre: 'INTERESES' },
            { campo: 'reconexion', nombre: 'RECONEXION' },
            { campo: 'varios', nombre: 'VARIOS' },
            { campo: 'publicidad', nombre: 'PUBLICIDAD' }
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

        // Si no hay conceptos, usar uno genérico basado en el PDF
        if (conceptos.length === 0) {
            conceptos.push({
                concepto: 'INTERNET',
                valor: factura.total || 59900
            });
        }

        return conceptos;
    }

    static extraerPeriodo(periodo) {
        if (!periodo) {
            const hoy = new Date();
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 6);
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 5);
            
            return [
                this.formatearFechaCorta(inicioMes),
                this.formatearFechaCorta(finMes)
            ];
        }

        // Intentar extraer fechas del período
        const partes = periodo.split(/[-\/]/);
        if (partes.length >= 2) {
            return [partes[0].trim(), partes[1].trim()];
        }

        return ['6-may.-2025', '5-jun.-2025'];
    }

    static formatearMoneda(valor) {
        if (!valor || isNaN(valor)) return '$0';
        
        const numero = Math.abs(valor);
        return `$${numero.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
    }

    static formatearMonedaSinSigno(valor) {
        if (!valor || isNaN(valor)) return '0';
        
        const numero = Math.abs(valor);
        return numero.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    }

    static formatearNumero(valor) {
        if (!valor || isNaN(valor)) return '0';
        
        const numero = Math.abs(valor);
        return numero.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    }

    static formatearFechaCorta(fecha) {
        if (!fecha) return '11-may.-2025';
        
        try {
            const date = new Date(fecha);
            const meses = [
                'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
            ];
            
            const dia = date.getDate();
            const mes = meses[date.getMonth()];
            const año = date.getFullYear();
            
            return `${dia}-${mes}.-${año}`;
        } catch {
            return '11-may.-2025';
        }
    }

    static validarDatos(factura, empresa) {
        const errores = [];

        if (!factura) {
            errores.push('Datos de factura requeridos');
        } else {
            if (!factura.numero_factura) errores.push('Número de factura requerido');
            if (!factura.nombre_cliente) errores.push('Nombre del cliente requerido');
            if (factura.total === undefined || factura.total === null) {
                errores.push('Total de factura requerido');
            }
        }

        if (!empresa) {
            errores.push('Datos de empresa requeridos');
        } else {
            if (!empresa.empresa_nombre) errores.push('Nombre de empresa requerido');
            if (!empresa.empresa_nit) errores.push('NIT de empresa requerido');
        }

        if (errores.length > 0) {
            throw new Error(`Errores de validación: ${errores.join(', ')}`);
        }

        return true;
    }

    // Método para generar ejemplo idéntico al PDF
    static async generarEjemploOriginal() {
        const facturaEjemplo = {
            numero_factura: '10P 00081047',
            fecha_emision: new Date('2025-05-06'),
            fecha_vencimiento: new Date('2025-05-11'),
            periodo_facturacion: '6-may.-2025 5-jun.-2025',
            nombre_cliente: 'MATEO SALAZAR ORTIZ',
            identificacion_cliente: '1005450340',
            direccion_cliente: 'CR 14A 21-63 ARBOLEDAS',
            telefono_cliente: '200',
            internet: 59900,
            subtotal: 59900,
            iva: 0,
            total: 59900,
            valor_reconexion: 11900
        };

        const empresaEjemplo = {
            empresa_nombre: 'PROVEEDOR DE TELECOMUNICACIONES SAS.',
            empresa_nit: '901.582.657-3',
            empresa_direccion: 'Carrera 9 No. 9-94 WHATSAPP 3184550936',
            empresa_ciudad: 'Socorro',
            empresa_departamento: 'Santander',
            empresa_telefono: '3184550936',
            registro_tic: '96006732',
            resolucion_facturacion: 'Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022'
        };

        return await this.generar(facturaEjemplo, empresaEjemplo);
    }

    static async guardarPDF(pdfBuffer, nombreArchivo = 'factura_psi.pdf') {
        try {
            const dirTemp = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(dirTemp)) {
                fs.mkdirSync(dirTemp, { recursive: true });
            }

            const rutaCompleta = path.join(dirTemp, nombreArchivo);
            fs.writeFileSync(rutaCompleta, pdfBuffer);
            
            console.log(`📄 Factura PSI guardada en: ${rutaCompleta}`);
            return rutaCompleta;
        } catch (error) {
            console.error('❌ Error guardando PDF:', error);
            throw error;
        }
    }
}

module.exports = PSIInvoicePDFGenerator;