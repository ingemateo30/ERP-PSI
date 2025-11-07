const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const path = require('path');
const fs = require('fs');

class PDFGenerator {

    static async generarFactura(factura, empresa) {
        return new Promise(async (resolve, reject) => {
            try {
                // Crear PDF tamaño carta exacto (en pixeles 612x792)
                const doc = new PDFDocument({
                    size: [612, 792],
                    margin: 0
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // === FONDO PLANTILLA ===
                const backgroundPath = path.join(__dirname, '..', 'public', 'plantilla_factura.png');
                doc.image(backgroundPath, 0, 0, { width: 612, height: 792 });

                // === FUNCIONES ===
                const fp = v => (parseFloat(v) || 0).toLocaleString('es-CO');       // números sin $
                const fm = v => '$' + (parseFloat(v) || 0).toLocaleString('es-CO'); // totales con $
                const ff = fecha => {
                    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                    const d = new Date(fecha);
                    return `${d.getDate()}-${meses[d.getMonth()]}-${d.getFullYear()}`;
                };

                // === CUPÓN PRINCIPAL ===
                doc.font('Helvetica-Bold').fontSize(10).text(factura.nombre_cliente, 100, 145);
                doc.font('Helvetica').fontSize(9).text(factura.identificacion_cliente, 100, 160);
                doc.text(factura.direccion_cliente, 100, 175);
                doc.text(factura.codigo_cliente, 260, 160);

                doc.fontSize(8).text(ff(factura.fecha_desde), 385, 250);
                doc.text(ff(factura.fecha_hasta), 455, 250);

                // PAGAR ANTES DE
                doc.font('Helvetica-Bold').fontSize(10).text(ff(factura.fecha_vencimiento), 455, 273);

                // Servicios
                doc.font('Helvetica').fontSize(9)
                    .text(fp(factura.internet), 330, 330)
                    .text(fp(factura.interes), 330, 348);

                // TOTAL CUPÓN PRINCIPAL
                doc.font('Helvetica-Bold').fontSize(14).text(fm(factura.total), 455, 378);

                // === CUPÓN CLIENTE (CENTRO) ===
                doc.font('Helvetica-Bold').fontSize(10).text(ff(factura.fecha_vencimiento), 405, 490);
                doc.fontSize(14).text(fm(factura.total), 455, 515);

                // === CUPÓN BANCO (ABAJO) ===
                doc.font('Helvetica-Bold').fontSize(14).text(fm(factura.total), 455, 665);

                // Referencia de pago grande
                doc.font('Helvetica-Bold').fontSize(16)
                    .text(factura.identificacion_cliente, 260, 745, { width: 120, align: 'center' });

                // === CÓDIGO DE BARRAS REAL CODE128 ===
                const barcodePNG = await bwipjs.toBuffer({
                    bcid: 'code128',
                    text: factura.identificacion_cliente.toString(),
                    scale: 2,
                    height: 30,
                    includetext: false
                });

                // Insertar código de barras (posición exacta cupón cliente)
                doc.image(barcodePNG, 160, 560, { width: 300 });

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFGenerator;
