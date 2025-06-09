// utils/pdfGenerator.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class FacturaPDFGenerator {
  static async generar(facturaData, empresaConfig, opciones = {}) {
    let browser;
    
    try {
      console.log('🚀 Iniciando generación de PDF...');
      
      // Configuración de Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();
      
      // Configurar viewport
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      console.log('📄 Generando HTML de la factura...');
      const html = this.generarHTML(facturaData, empresaConfig);
      
      // Cargar el HTML
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('🖨️ Generando PDF...');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '5mm',
          right: '5mm',
          bottom: '5mm',
          left: '5mm'
        }
      });

      console.log('✅ PDF generado exitosamente');
      return pdf;

    } catch (error) {
      console.error('❌ Error al generar PDF:', error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static generarHTML(factura, empresa) {
    const conceptos = this.obtenerConceptosFactura(factura);
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${factura.numero_factura}</title>
    <style>
        ${this.getCSS()}
    </style>
</head>
<body>
    <div class="page-container">
        
        <!-- DESPRENDIBLE 1: CLIENTE -->
        <div class="desprendible cliente-copy">
            <div class="desprendible-header">
                <div class="logo-empresa">
                    <img src="data:image/svg+xml;base64,${this.generarLogoBase64()}" alt="PSI" class="logo" />
                    <div class="empresa-info">
                        <div class="empresa-nombre">${empresa.empresa_nombre || 'PSI'}</div>
                        <div class="empresa-nit">NIT: ${empresa.empresa_nit || '901.582.657-3'}</div>
                    </div>
                </div>
                <div class="factura-info">
                    <div class="factura-numero">${factura.numero_factura}</div>
                    <div class="factura-label">FACTURA DE VENTA</div>
                </div>
            </div>
            
            <div class="cliente-datos">
                <div class="cliente-nombre">${factura.nombre_cliente}</div>
                <div class="cliente-id">${factura.identificacion_cliente}</div>
                <div class="cliente-direccion">${factura.cliente_direccion || ''}</div>
            </div>
            
            <div class="periodo-pago">
                <div class="periodo">
                    <span>Período:</span> ${this.formatearFechaCorta(factura.fecha_desde)} - ${this.formatearFechaCorta(factura.fecha_hasta)}
                </div>
                <div class="vencimiento">
                    <span>Pagar antes de:</span> <strong>${this.formatearFechaCorta(factura.fecha_vencimiento)}</strong>
                </div>
            </div>
            
            <div class="conceptos-mini">
                ${conceptos.slice(0, 3).map(concepto => `
                    <div class="concepto-linea">
                        <span>${concepto.nombre}</span>
                        <span>${this.formatearMoneda(concepto.valor + concepto.saldo)}</span>
                    </div>
                `).join('')}
                ${conceptos.length > 3 ? '<div class="concepto-linea"><span>Otros conceptos</span><span>+</span></div>' : ''}
            </div>
            
            <div class="total-desprendible">
                <div class="total-linea">
                    <span>TOTAL</span>
                    <span class="total-valor">${this.formatearMoneda(factura.total)}</span>
                </div>
            </div>
            
            <div class="pago-info-mini">
                <div class="referencia">Ref. Pago: <strong>${factura.identificacion_cliente}</strong></div>
                <div class="opciones-pago">PSE: www.psi.net.co | Corresponsales</div>
            </div>
            
            <div class="barcode-mini">
                <div class="barcode">${this.generarCodigoBarrasCorto()}</div>
            </div>
            
            <div class="copy-label">COPIA CLIENTE</div>
        </div>

        <!-- DESPRENDIBLE 2: BANCO -->
        <div class="desprendible banco-copy">
            <div class="desprendible-header">
                <div class="logo-empresa">
                    <img src="data:image/svg+xml;base64,${this.generarLogoBase64()}" alt="PSI" class="logo" />
                    <div class="empresa-info">
                        <div class="empresa-nombre">${empresa.empresa_nombre || 'PSI'}</div>
                        <div class="empresa-nit">NIT: ${empresa.empresa_nit || '901.582.657-3'}</div>
                    </div>
                </div>
                <div class="factura-info">
                    <div class="factura-numero">${factura.numero_factura}</div>
                    <div class="factura-label">FACTURA DE VENTA</div>
                </div>
            </div>
            
            <div class="cliente-datos">
                <div class="cliente-nombre">${factura.nombre_cliente}</div>
                <div class="cliente-id">${factura.identificacion_cliente}</div>
                <div class="cliente-direccion">${factura.cliente_direccion || ''}</div>
            </div>
            
            <div class="periodo-pago">
                <div class="periodo">
                    <span>Período:</span> ${this.formatearFechaCorta(factura.fecha_desde)} - ${this.formatearFechaCorta(factura.fecha_hasta)}
                </div>
                <div class="vencimiento">
                    <span>Pagar antes de:</span> <strong>${this.formatearFechaCorta(factura.fecha_vencimiento)}</strong>
                </div>
            </div>
            
            <div class="total-desprendible">
                <div class="total-linea grande">
                    <span>TOTAL A PAGAR</span>
                    <span class="total-valor">${this.formatearMoneda(factura.total)}</span>
                </div>
                <div class="referencia-pago">
                    <span>Referencia:</span> <strong>${factura.identificacion_cliente}</strong>
                </div>
            </div>
            
            <div class="banco-info">
                <div class="banco-instrucciones">
                    <div>Recibido por: ________________</div>
                    <div>Fecha: ___________</div>
                    <div>Sello:</div>
                </div>
            </div>
            
            <div class="barcode-mini">
                <div class="barcode">${this.generarCodigoBarrasCorto()}</div>
            </div>
            
            <div class="copy-label">COPIA BANCO</div>
        </div>

        <!-- DESPRENDIBLE 3: EMPRESA -->
        <div class="desprendible empresa-copy">
            <div class="desprendible-header">
                <div class="logo-empresa">
                    <img src="data:image/svg+xml;base64,${this.generarLogoBase64()}" alt="PSI" class="logo" />
                    <div class="empresa-info">
                        <div class="empresa-nombre">${empresa.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS.'}</div>
                        <div class="empresa-nit">NIT: ${empresa.empresa_nit || '901.582.657-3'}</div>
                        <div class="empresa-direccion">${empresa.empresa_direccion || 'Carrera 9 No. 9-94'}</div>
                        <div class="empresa-contacto">WhatsApp: ${empresa.empresa_telefono || '3184550936'}</div>
                    </div>
                </div>
                <div class="factura-info">
                    <div class="factura-numero">${factura.numero_factura}</div>
                    <div class="factura-label">FACTURA DE VENTA</div>
                </div>
            </div>
            
            <div class="cliente-datos">
                <div class="cliente-nombre">${factura.nombre_cliente}</div>
                <div class="cliente-id">${factura.identificacion_cliente}</div>
                <div class="cliente-direccion">${factura.cliente_direccion || ''}</div>
            </div>
            
            <div class="periodo-pago">
                <div class="periodo">
                    <span>Período Facturado:</span> ${this.formatearFechaCorta(factura.fecha_desde)} - ${this.formatearFechaCorta(factura.fecha_hasta)}
                </div>
                <div class="vencimiento">
                    <span>Pagar antes de:</span> <strong>${this.formatearFechaCorta(factura.fecha_vencimiento)}</strong>
                </div>
            </div>
            
            <div class="conceptos-detalle">
                <div class="conceptos-header">
                    <span>Concepto</span>
                    <span>Valor</span>
                </div>
                ${conceptos.map(concepto => `
                    <div class="concepto-linea">
                        <span>${concepto.nombre}</span>
                        <span>${this.formatearMoneda(concepto.valor + concepto.saldo)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="total-desprendible">
                <div class="total-linea grande">
                    <span>TOTAL</span>
                    <span class="total-valor">${this.formatearMoneda(factura.total)}</span>
                </div>
            </div>
            
            <div class="pago-info-completa">
                <div class="warning">⚠️ Pague su factura y evite suspensiones - Valor Reconexión ${this.formatearMoneda(empresa.valor_reconexion || 11900)}</div>
                <div class="opciones">Pague en: Caja Social, Finecoop, Comultrasan, Ahorramas o PSE en www.psi.net.co</div>
                <div class="referencia">Referencia de pago: <strong>${factura.identificacion_cliente}</strong></div>
            </div>
            
            <div class="barcode-mini">
                <div class="barcode">${this.generarCodigoBarrasCorto()}</div>
            </div>
            
            <div class="footer-regulatorio">
                <div class="vigilado">Vigilado y regulado por el MINTIC</div>
                <div class="resolucion">Facturación desde 10.001 hasta 37600 prefijo 10 del 26-SEP-2022</div>
                <div class="registro">Registro único de TIC No. ${empresa.licencia_internet || '96006732'}</div>
            </div>
            
            <div class="copy-label">COPIA EMPRESA</div>
        </div>
        
    </div>
</body>
</html>`;
  }

  static getCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 9px;
            line-height: 1.2;
            color: #333;
            background: white;
        }

        .page-container {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
        }

        .desprendible {
            flex: 1;
            padding: 8mm;
            border-bottom: 1px dashed #999;
            position: relative;
            display: flex;
            flex-direction: column;
            min-height: 90mm;
        }

        .desprendible:last-child {
            border-bottom: none;
        }

        /* Headers */
        .desprendible-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #ddd;
        }

        .logo-empresa {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .logo {
            width: 32px;
            height: 32px;
            border-radius: 4px;
        }

        .empresa-info {
            font-size: 8px;
            line-height: 1.3;
        }

        .empresa-nombre {
            font-weight: bold;
            font-size: 9px;
            color: #1e3a8a;
            margin-bottom: 1px;
        }

        .empresa-nit {
            font-weight: 600;
            margin-bottom: 1px;
        }

        .empresa-direccion, .empresa-contacto {
            font-size: 7px;
            color: #666;
        }

        .factura-info {
            text-align: right;
            min-width: 80px;
        }

        .factura-numero {
            font-size: 11px;
            font-weight: bold;
            background: #1e3a8a;
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            margin-bottom: 2px;
        }

        .factura-label {
            font-size: 7px;
            font-weight: bold;
            color: #1e3a8a;
        }

        /* Cliente */
        .cliente-datos {
            margin-bottom: 8px;
            font-size: 8px;
        }

        .cliente-nombre {
            font-weight: bold;
            font-size: 9px;
            margin-bottom: 2px;
        }

        .cliente-id {
            font-weight: 600;
            margin-bottom: 1px;
        }

        .cliente-direccion {
            font-size: 7px;
            color: #666;
        }

        /* Período */
        .periodo-pago {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 7px;
            background: #f8f9fa;
            padding: 4px 6px;
            border-radius: 3px;
        }

        .vencimiento {
            color: #dc2626;
            font-weight: bold;
        }

        /* Conceptos Mini */
        .conceptos-mini {
            margin-bottom: 8px;
            font-size: 7px;
        }

        .concepto-linea {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
            padding: 1px 0;
        }

        /* Conceptos Detalle */
        .conceptos-detalle {
            margin-bottom: 8px;
            font-size: 7px;
            border: 1px solid #ddd;
            border-radius: 3px;
        }

        .conceptos-header {
            display: flex;
            justify-content: space-between;
            background: #1e3a8a;
            color: white;
            padding: 3px 6px;
            font-weight: bold;
            font-size: 7px;
        }

        .conceptos-detalle .concepto-linea {
            padding: 2px 6px;
            border-bottom: 1px solid #eee;
        }

        .conceptos-detalle .concepto-linea:last-child {
            border-bottom: none;
        }

        /* Total */
        .total-desprendible {
            margin-bottom: 8px;
        }

        .total-linea {
            display: flex;
            justify-content: space-between;
            background: #1e3a8a;
            color: white;
            padding: 4px 8px;
            font-weight: bold;
            border-radius: 3px;
        }

        .total-linea.grande {
            font-size: 10px;
            padding: 6px 8px;
        }

        .total-valor {
            font-family: monospace;
        }

        .referencia-pago {
            text-align: center;
            font-size: 8px;
            margin-top: 4px;
            padding: 3px;
            background: #f8f9fa;
            border-radius: 3px;
        }

        /* Pago Info */
        .pago-info-mini {
            margin-bottom: 8px;
            font-size: 7px;
            text-align: center;
        }

        .referencia {
            margin-bottom: 2px;
        }

        .opciones-pago {
            color: #666;
        }

        .pago-info-completa {
            margin-bottom: 8px;
            font-size: 7px;
        }

        .warning {
            background: #fef3c7;
            color: #92400e;
            padding: 4px;
            border-radius: 3px;
            margin-bottom: 3px;
            text-align: center;
            font-weight: bold;
        }

        .opciones {
            margin-bottom: 3px;
            text-align: center;
        }

        .referencia {
            text-align: center;
            background: #f8f9fa;
            padding: 3px;
            border-radius: 3px;
        }

        /* Banco Info */
        .banco-info {
            margin-bottom: 8px;
            font-size: 7px;
        }

        .banco-instrucciones {
            background: #f8f9fa;
            padding: 6px;
            border-radius: 3px;
        }

        .banco-instrucciones div {
            margin-bottom: 3px;
        }

        /* Barcode */
        .barcode-mini {
            margin-bottom: 8px;
            text-align: center;
        }

        .barcode {
            font-family: monospace;
            font-size: 10px;
            letter-spacing: 1px;
            background: #f8f9fa;
            padding: 4px;
            border-radius: 3px;
        }

        /* Footer */
        .footer-regulatorio {
            margin-bottom: 8px;
            font-size: 6px;
            text-align: center;
            color: #666;
            line-height: 1.3;
        }

        .footer-regulatorio div {
            margin-bottom: 1px;
        }

        .vigilado {
            font-weight: bold;
            color: #1e3a8a;
        }

        /* Copy Labels */
        .copy-label {
            position: absolute;
            bottom: 2mm;
            right: 2mm;
            font-size: 6px;
            color: #999;
            font-weight: bold;
            transform: rotate(-90deg);
            transform-origin: center;
        }

        /* Diferenciación por tipo */
        .cliente-copy {
            background: #f8fffe;
            border-left: 3px solid #10b981;
        }

        .banco-copy {
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
        }

        .empresa-copy {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
        }

        /* Print Styles */
        @page {
            margin: 0;
            size: A4;
        }

        @media print {
            .page-container {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
            }

            .desprendible {
                page-break-inside: avoid;
            }
        }
    `;
  }

  static generarLogoBase64() {
    const logoSVG = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="4" fill="url(#logoGrad)"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">PSI</text>
    </svg>`;
    
    return Buffer.from(logoSVG).toString('base64');
  }

  static obtenerConceptosFactura(factura) {
    const conceptos = [];
    
    if (parseFloat(factura.internet) > 0) {
      conceptos.push({ nombre: 'INTERNET', valor: parseFloat(factura.internet), saldo: 0 });
    }
    if (parseFloat(factura.television) > 0) {
      conceptos.push({ nombre: 'TELEVISIÓN', valor: parseFloat(factura.television), saldo: 0 });
    }
    if (parseFloat(factura.saldo_anterior) > 0) {
      conceptos.push({ nombre: 'SALDO ANTERIOR', valor: 0, saldo: parseFloat(factura.saldo_anterior) });
    }
    if (parseFloat(factura.interes) > 0) {
      conceptos.push({ nombre: 'INTERESES', valor: parseFloat(factura.interes), saldo: 0 });
    }
    if (parseFloat(factura.reconexion) > 0) {
      conceptos.push({ nombre: 'RECONEXIÓN', valor: parseFloat(factura.reconexion), saldo: 0 });
    }
    if (parseFloat(factura.descuento) > 0) {
      conceptos.push({ nombre: 'DESCUENTO', valor: parseFloat(factura.descuento), saldo: 0 });
    }

    if (conceptos.length === 0) {
      conceptos.push({ nombre: 'INTERNET', valor: parseFloat(factura.total) || 0, saldo: 0 });
    }

    return conceptos;
  }

  static generarCodigoBarrasCorto() {
    return '||| || | ||| | || |||';
  }

  static formatearFechaCorta(fecha) {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  static formatearMoneda(valor) {
    if (!valor || valor === 0) return '$0';
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(valor);
    } catch (error) {
      return `$${valor}`;
    }
  }

  static calcularTotales(factura) {
    return {
      total: parseFloat(factura.total) || 0
    };
  }

  static async guardarPDF(pdfBuffer, nombreArchivo) {
    try {
      const rutaArchivo = path.join(process.cwd(), 'temp', nombreArchivo);
      
      const dirTemp = path.dirname(rutaArchivo);
      if (!fs.existsSync(dirTemp)) {
        fs.mkdirSync(dirTemp, { recursive: true });
      }
      
      fs.writeFileSync(rutaArchivo, pdfBuffer);
      console.log(`📁 PDF guardado en: ${rutaArchivo}`);
      return rutaArchivo;
    } catch (error) {
      console.error('❌ Error al guardar PDF:', error);
      throw error;
    }
  }
}

module.exports = FacturaPDFGenerator;