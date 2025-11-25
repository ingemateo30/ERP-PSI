// backend/utils/ContratoPDFGeneratorMINTIC.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGeneratorMINTIC {

  /**
   * Método principal para generar el Buffer del PDF
   */
  static async generarPDF(contratoData, empresaData, logoPath) {
    // 1. Generamos el contenido HTML
    const htmlContent = this.generarHTML(contratoData, empresaData, logoPath);

    // 2. Iniciamos el navegador para "imprimir" el PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 3. Cargamos el HTML
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 4. Generamos el PDF con formato Carta (Letter)
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true, // Para que salgan los colores de fondo (gris)
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });

    await browser.close();
    return pdfBuffer;
  }

  static generarHTML(contratoData, empresaData, logoPath = '') {
    // Formateadores
    const formatoMoneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const fechaHoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Cálculos de valores
    const precioInternet = parseFloat(contratoData.precio_internet || 0);
    const precioTV = parseFloat(contratoData.precio_television || 0);
    const valorTotal = precioInternet + precioTV;
    const permanencia = parseInt(contratoData.permanencia_meses || 1);
    
    // Lógica de servicios activos
    const tieneInternet = precioInternet > 0;
    const tieneTV = precioTV > 0;

    // Fecha de activación estimada (ej. 15 días)
    const fechaActivacion = new Date();
    fechaActivacion.setDate(fechaActivacion.getDate() + 15);
    const fechaActivacionStr = fechaActivacion.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Contrato PSI</title>
        <style>
            html { -webkit-print-color-adjust: exact; }
            body {
                font-family: Arial, sans-serif;
                font-size: 8px; /* Tamaño ajustado para igualar al PDF */
                margin: 0;
                padding: 0;
                color: #000;
                line-height: 1.1;
            }
            /* Estilos de Tablas y Bordes */
            .table-bordered {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
            }
            .table-bordered td {
                border: 1px solid #000;
                padding: 2px 4px;
                vertical-align: middle;
            }
            .bg-gray { background-color: #f2f2f2; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .bold { font-weight: bold; }
            
            /* Encabezado */
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
            .header-logo img { height: 45px; }
            .company-info { font-size: 10px; font-weight: bold; text-align: center; }
            
            /* Títulos de sección */
            .section-header {
                background-color: #e0e0e0;
                border: 1px solid #000;
                text-align: center;
                font-weight: bold;
                padding: 2px;
                margin-top: 5px;
                font-size: 8.5px;
            }

            /* Layout de columnas */
            .row { display: flex; width: 100%; gap: 5px; margin-top: 5px; }
            .col { flex: 1; display: flex; flex-direction: column; gap: 5px; }

            /* Cajas de contenido */
            .box { border: 1px solid #000; }
            .box-title { 
                background-color: #f2f2f2; 
                border-bottom: 1px solid #000; 
                font-weight: bold; 
                text-align: center; 
                padding: 2px;
            }
            .box-content { padding: 4px; text-align: justify; }

            /* Checkboxes simulados */
            .check-row { display: flex; align-items: center; justify-content: space-between; margin: 2px 0; }
            .square { 
                height: 10px; width: 10px; border: 1px solid #000; 
                display: inline-block; margin-right: 3px; text-align: center; line-height: 9px;
            }

            /* Salto de página */
            .page-break { page-break-before: always; }

            /* Firmas */
            .signature-area { margin-top: 20px; text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 200px; margin: 30px auto 5px auto; }
        </style>
    </head>
    <body>

        <table class="header-table">
            <tr>
                <td style="width: 25%;">
                    ${logoPath ? `<div class="header-logo"><img src="${logoPath}" /></div>` : '<h2 style="margin:0; color:#0056b3;">PSI</h2><span style="font-size:7px">Únete a PSI</span>'}
                </td>
                <td style="width: 50%;" class="company-info">
                    PROVEEDOR DE TELECOMUNICACIONES SAS<br>
                    <span style="font-weight:normal; font-size:9px;">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</span>
                </td>
                <td style="width: 25%;" class="text-right">
                    <div class="bold" style="font-size:9px;">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                    <div style="font-size:8px;">Contrato No. ${contratoData.numero_contrato || ''}</div>
                    <div style="font-size:8px;">Fecha: ${fechaHoy}</div>
                </td>
            </tr>
        </table>

        <div class="section-header">INFORMACIÓN DEL SUSCRIPTOR</div>
        <table class="table-bordered">
            <tr>
                <td class="bg-gray" style="width: 15%;">Departamento</td>
                <td style="width: 35%;">${contratoData.departamento_nombre || 'Santander'}</td>
                <td class="bg-gray" style="width: 15%;">Municipio</td>
                <td style="width: 35%;">${contratoData.ciudad_nombre || 'San Gil'}</td>
            </tr>
            <tr>
                <td class="bg-gray">Nombre</td>
                <td>${contratoData.cliente_nombre || ''}</td>
                <td class="bg-gray">Identificación</td>
                <td>${contratoData.cliente_identificacion || ''}</td>
            </tr>
            <tr>
                <td class="bg-gray">Teléfono</td>
                <td>${contratoData.cliente_telefono || ''}</td>
                <td class="bg-gray">Email</td>
                <td>${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
                <td class="bg-gray">Dir. Servicio</td>
                <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
                <td class="bg-gray">Dir. Suscriptor</td>
                <td>${contratoData.cliente_direccion || ''}</td>
                <td class="bg-gray">Estrato</td>
                <td>${contratoData.cliente_estrato || '2'}</td>
            </tr>
        </table>

        <div style="border: 1px solid #000; padding: 4px; margin-top: 5px; text-align: justify;">
            Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente <strong>${formatoMoneda.format(valorTotal)}</strong>. Este contrato tendrá vigencia de <strong>${permanencia} mes(es)</strong>, contados a partir del día de la instalación. El plazo máximo de instalación es de 15 días hábiles. Acepto que mi contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de 1 mes(es).
        </div>

        <div class="row">
            <div class="col">
                <div class="box">
                    <div class="box-title">EL SERVICIO</div>
                    <div class="box-content">
                        Con este contrato nos comprometemos a prestarle los servicios que usted elija*:
                        <div class="check-row">
                            <span><span class="square">${tieneInternet ? 'X' : ''}</span>Internet Fijo</span>
                            <span><span class="square">${tieneTV ? 'X' : ''}</span>Televisión</span>
                        </div>
                        <div class="check-row">
                            <span><span class="square"></span>Publicidad</span>
                            <span><span class="square"></span>Servicios Adicionales</span>
                        </div>
                        <div style="margin-top:4px;">Usted se compromete a pagar oportunamente el precio acordado. El servicio se activará a más tardar el día <strong>${fechaActivacionStr}</strong></div>
                    </div>
                </div>

                <div class="box">
                    <div class="box-title">CONDICIONES COMERCIALES</div>
                    <div class="box-content">
                        <div class="text-center bold">CARACTERÍSTICAS DEL PLAN</div>
                        ${tieneInternet ? `<div>INTERNET FIBRA ${formatoMoneda.format(precioInternet)} - ${contratoData.plan_nombre || '300 MEGAS'}</div>` : ''}
                        ${tieneTV ? `<div>TELEVISIÓN ${formatoMoneda.format(precioTV)} - ESTRATO ${contratoData.cliente_estrato}</div>` : ''}
                        <div style="font-size:7px; margin-top:3px;">CLAUSULA PERMANENCIA ${permanencia} MESES - MODEM EN CALIDAD DE PRESTAMO</div>
                    </div>
                </div>

                <div class="box" style="padding: 3px; font-weight: bold; text-align: center;">
                    Valor Total ${formatoMoneda.format(valorTotal)}
                </div>

                <div class="box">
                    <div class="box-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                    <div class="box-content">
                        <ol style="padding-left: 15px; margin: 0;">
                            <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora.</li>
                            <li>Suministrar información verdadera.</li>
                            <li>Hacer uso adecuado de los equipos y servicios.</li>
                            <li>No divulgar ni acceder a pornografía infantil (Consultar anexo).</li>
                            <li>Avisar a las autoridades robo o hurto de elementos de la red.</li>
                            <li>No cometer fraude.</li>
                        </ol>
                    </div>
                </div>
                
                <div class="box">
                    <div class="box-title">CALIDAD Y COMPENSACIÓN</div>
                    <div class="box-content">
                        Cuando se presente indisponibilidad del servicio o este se suspenda a pesar de su pago oportuno, lo compensaremos en su próxima factura. Consulte condiciones en www.psi.net.co/indicadoresdecalidad.
                    </div>
                </div>
                <div style="font-size: 7px;">* Espacio diligenciado por el usuario</div>
            </div>

            <div class="col">
                <div class="box">
                    <div class="box-title">CESIÓN</div>
                    <div class="box-content">
                        Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito... Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
                    </div>
                </div>

                <div class="box">
                    <div class="box-title">MODIFICACIÓN</div>
                    <div class="box-content">
                        Nosotros no podemos modificar el contrato sin su autorización. Usted puede en cualquier momento modificar los servicios contratados... con al menos 3 días hábiles de anterioridad al corte de facturación.
                    </div>
                </div>

                <div class="box">
                    <div class="box-title">SUSPENSIÓN</div>
                    <div class="box-content">
                        Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Si existe cláusula de permanencia, se prorrogará por el tiempo de la suspensión.
                    </div>
                </div>

                <div class="box">
                    <div class="box-title">TERMINACIÓN</div>
                    <div class="box-content">
                        Usted puede terminar el contrato en cualquier momento sin penalidades (salvo cláusula de permanencia). Debe avisar mínimo 3 días hábiles antes del corte. Su corte de facturación es el día 1 de cada mes.
                    </div>
                </div>
            </div>
        </div>

        <div class="page-break"></div>

        <div class="box">
            <div class="box-title">CONDICIONES GENERALES Y ANEXOS</div>
        </div>

        <div class="row">
            <div class="col">
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">PAGO Y FACTURACIÓN:</span> La factura debe llegar 5 días hábiles antes del pago. Si no paga a tiempo, suspenderemos el servicio. Contamos con 3 días para reconexión tras pago. Reporte a centrales de riesgo con 20 días de aviso previo. Reclamaciones antes de fecha de pago suspenden cobro del monto reclamado.<br>
                    <em>Con esta firma acepta recibir la factura por medios electrónicos.</em>
                </div>

                <div class="box">
                    <div class="box-title">MEDIOS DE ATENCIÓN</div>
                    <div class="box-content">
                        1. Oficinas físicas, web, redes, líneas telefónicas.<br>
                        2. Respuesta a PQR en máximo 15 días hábiles.<br>
                        3. <strong>Silencio administrativo positivo</strong> (aplica internet).<br>
                        4. Recurso de reposición y apelación ante la SIC (Internet) o ANTV (Televisión).
                    </div>
                </div>
                
                <div class="text-justify" style="margin-top: 5px;">
                    <span class="bold">CAMBIO DE DOMICILIO:</span> Posible si hay viabilidad técnica. Si no, puede ceder contrato o pagar cláusula permanencia.
                </div>
            </div>

            <div class="col">
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">RECONEXIÓN:</span> Cobro por costos de operación ($10.000 + IVA) si hubo suspensión por mora.
                </div>
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">RESPONSABILIDAD:</span> El usuario responde por el uso de la red y equipos. Equipos en desuso deben devolverse (política ambiental).
                </div>
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">TV:</span> Canales pueden variar por razones técnicas/comerciales.
                </div>
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">CAUSALES TERMINACIÓN:</span> No pago, fraude, fuerza mayor, uso inadecuado.
                </div>
                <div class="text-justify" style="margin-bottom: 5px;">
                    <span class="bold">TARIFAS:</span> Incremento anual máx 50%. <strong>MÉRITO EJECUTIVO:</strong> Este contrato presta mérito ejecutivo.
                </div>
            </div>
        </div>

        <div class="signature-area">
            <div style="border: 1px solid #000; display: inline-block; padding: 5px 20px;">
                <span class="bold">ACEPTACIÓN:</span> Firma del cliente o medio válido<br>
                CC/CE: ${contratoData.cliente_identificacion} &nbsp;&nbsp;|&nbsp;&nbsp; Fecha: ${fechaHoy}
            </div>
            <div style="font-size: 7px; margin-top: 5px;">Consulte régimen de protección en www.crcom.gov.co</div>
        </div>

        <div class="page-break"></div>

        <table class="header-table">
            <tr>
                <td style="width: 25%;">
                   ${logoPath ? `<div class="header-logo"><img src="${logoPath}" /></div>` : '<h2 style="margin:0; color:#0056b3;">PSI</h2>'}
                </td>
                <td style="width: 50%;" class="company-info">ANEXO DE PERMANENCIA</td>
                <td style="width: 25%;" class="text-right">
                    <div style="font-size:8px;">Contrato No. ${contratoData.numero_contrato}</div>
                </td>
            </tr>
        </table>

        <div class="section-header">INFORMACIÓN DEL SUSCRIPTOR</div>
        <table class="table-bordered">
            <tr>
                <td class="bg-gray" style="width:15%">Nombre</td>
                <td>${contratoData.cliente_nombre}</td>
                <td class="bg-gray" style="width:15%">Identificación</td>
                <td>${contratoData.cliente_identificacion}</td>
            </tr>
            <tr>
                <td class="bg-gray">Dirección</td>
                <td colspan="3">${contratoData.cliente_direccion}</td>
            </tr>
        </table>

        <div class="section-header" style="margin-top: 10px;">COMPROMISO DE PERMANENCIA MÍNIMA</div>
        <div class="box" style="margin-top: 5px; padding: 10px; text-align: justify; font-size: 9px; border: none;">
            Señor usuario, el presente contrato lo obliga a estar vinculado con <strong>PROVEEDOR DE TELECOMUNICACIONES SAS</strong> durante un tiempo de <strong>${permanencia} mes(es)</strong>. Además, cuando venza el plazo indicado, el presente contrato se renovará automáticamente indefinidamente.
            <br><br>
            En caso que usted decida terminar el contrato antes de que venza el periodo de permanencia mínima señalado, deberá pagar los valores que se determinan a continuación:
            <br><br>
            <div class="text-center box" style="padding: 10px; margin: 10px 0; font-weight: bold; background: #f9f9f9;">
                VALOR TERMINACIÓN = ((VALOR MENSUAL * MESES FALTANTES) / 2)
            </div>
            <br>
            Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado.
            <br><br>
            <strong>Prórroga:</strong> El usuario conoce y acepta la prórroga automática del plan tarifario.
        </div>

        <div class="signature-area" style="margin-top: 50px;">
            <div class="signature-line"></div>
            <div>Firma del usuario que celebró el contrato</div>
            <div class="bold">${contratoData.cliente_nombre}</div>
            <div>CC. ${contratoData.cliente_identificacion}</div>
        </div>

    </body>
    </html>
    `;
  }
}

module.exports = ContratoPDFGeneratorMINTIC;