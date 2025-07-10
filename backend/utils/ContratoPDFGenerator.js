// backend/utils/ContratoPDFGenerator.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGenerator {
  
  /**
   * Generar contrato PSI con el template exacto
   */
  static async generarContrato(contrato, empresa) {
    let browser;
    try {
      console.log(`📄 Generando contrato PSI: ${contrato.numero_contrato}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Configurar página para A4
      await page.setViewport({ width: 794, height: 1123 });

      // Generar HTML del contrato
      const html = this.generarHTMLContrato(contrato, empresa);
      
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1.5cm',
          right: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });

      console.log(`✅ Contrato PSI generado exitosamente`);
      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error generando contrato PSI:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generar HTML del contrato PSI exacto al original
   */
  static generarHTMLContrato(contrato, empresa) {
    const fechaHoy = new Date().toLocaleDateString('es-CO');
    
    // Determinar servicios contratados
    const servicios = this.determinarServicios(contrato);
    
    // Generar condiciones comerciales del plan
    const condicionesComerciales = this.generarCondicionesComerciales(contrato);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato Único de Servicios Fijos - PSI</title>
    <style>
        @page {
            size: A4;
            margin: 1.5cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 9px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
            color: #000;
        }
        
        .page {
            width: 100%;
            min-height: 297mm;
            page-break-after: always;
            position: relative;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo {
            width: 60px;
            height: 45px;
            background: linear-gradient(45deg, #1e40af, #3b82f6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            border-radius: 4px;
        }
        
        .company-info {
            text-align: center;
            flex: 1;
            margin: 0 15px;
        }
        
        .company-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 2px;
        }
        
        .company-subtitle {
            font-size: 9px;
            margin-bottom: 1px;
        }
        
        .contract-title {
            text-align: right;
            font-weight: bold;
            font-size: 11px;
        }
        
        .info-section {
            background-color: #f8f8f8;
            border: 1px solid #000;
            margin: 10px 0;
        }
        
        .info-title {
            background-color: #e0e0e0;
            padding: 4px 8px;
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid #000;
            font-size: 10px;
        }
        
        .info-content {
            padding: 8px;
        }
        
        .form-row {
            display: flex;
            margin-bottom: 6px;
            align-items: center;
        }
        
        .form-label {
            font-weight: bold;
            min-width: 80px;
            margin-right: 5px;
        }
        
        .form-value {
            border-bottom: 1px solid #000;
            padding: 2px 4px;
            flex: 1;
            min-height: 12px;
        }
        
        .checkbox-group {
            display: flex;
            gap: 15px;
            margin: 6px 0;
        }
        
        .checkbox {
            display: flex;
            align-items: center;
            gap: 3px;
        }
        
        .checkbox-box {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
            text-align: center;
            line-height: 10px;
        }
        
        .checked {
            background-color: #000;
            color: white;
        }
        
        .section-box {
            border: 1px solid #000;
            margin: 8px 0;
            padding: 6px;
            background-color: #fafafa;
        }
        
        .section-title {
            font-weight: bold;
            text-align: center;
            margin-bottom: 6px;
            font-size: 10px;
        }
        
        .text-content {
            text-align: justify;
            line-height: 1.3;
        }
        
        .signature-section {
            margin-top: 40px;
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 20px auto 5px auto;
            height: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
        }
        
        td {
            padding: 3px;
            vertical-align: top;
        }
        
        .permanencia-section {
            margin-top: 20px;
            page-break-before: always;
        }
    </style>
</head>
<body>
    <!-- PÁGINA 1 -->
    <div class="page">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">PSI</div>
                <div style="font-size: 8px; color: #666;">
                    Conecta<br/>
                    <span style="color: #e74c3c;">*</span>
                </div>
            </div>
            <div class="company-info">
                <div class="company-title">PROVEEDOR DE TELECOMUNICACIONES</div>
                <div class="company-subtitle">NIT: ${empresa.empresa_nit || '901.582.657-3'}</div>
            </div>
            <div class="contract-title">
                CONTRATO ÚNICO DE SERVICIOS FIJOS.<br/>
                <div style="border: 1px solid #000; padding: 2px; margin-top: 3px;">
                    Fecha: ${fechaHoy}
                </div>
            </div>
        </div>

        <!-- Información del Suscriptor -->
        <div class="info-section">
            <div class="info-title">INFORMACIÓN DEL SUSCRIPTOR</div>
            <div class="info-content">
                <table>
                    <tr>
                        <td style="width: 15%;"><strong>Contrato No.</strong></td>
                        <td style="width: 35%; border-bottom: 1px solid #000;">${contrato.numero_contrato}</td>
                        <td style="width: 15%;"><strong>Departamento</strong></td>
                        <td style="width: 35%; border-bottom: 1px solid #000;">${contrato.departamento_nombre || 'Santander'}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Nombre</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_nombre}</td>
                        <td><strong>Municipio</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.ciudad_nombre || 'San Gil'}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Identificación</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_identificacion}</td>
                        <td><strong>Correo electrónico</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_email || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Teléfono de contacto</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_telefono || ''}</td>
                        <td><strong>Estrato</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_estrato || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Dirección servicio</strong></td>
                        <td colspan="3" style="border-bottom: 1px solid #000;">${contrato.cliente_direccion || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Dirección suscriptor</strong></td>
                        <td colspan="3" style="border-bottom: 1px solid #000;">${contrato.cliente_direccion || ''}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Contenido principal en dos columnas -->
        <div style="display: flex; gap: 10px;">
            <!-- Columna izquierda -->
            <div style="flex: 1;">
                <!-- Texto del contrato -->
                <div class="text-content" style="font-size: 8px; margin-bottom: 10px;">
                    Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente _______. Este contrato tendrá vigencia de 6 mes(es), contados a partir del día de la instalación. El plazo máximo de instalación es de ____ días hábiles. Acepto que el contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de 6 mes(es).
                </div>

                <!-- El Servicio -->
                <div class="section-box">
                    <div class="section-title">EL SERVICIO</div>
                    <div style="font-size: 8px;">
                        <p>Con este contrato nos comprometemos a prestarle los servicios que usted elija*:</p>
                        <div class="checkbox-group">
                            <div class="checkbox">
                                <span class="checkbox-box ${servicios.internet ? 'checked' : ''}">
                                    ${servicios.internet ? '✓' : ''}
                                </span>
                                <span>Internet Fijo</span>
                            </div>
                            <div class="checkbox">
                                <span class="checkbox-box ${servicios.television ? 'checked' : ''}">
                                    ${servicios.television ? '✓' : ''}
                                </span>
                                <span>Televisión</span>
                            </div>
                            <div class="checkbox">
                                <span class="checkbox-box ${servicios.publicidad ? 'checked' : ''}">
                                    ${servicios.publicidad ? '✓' : ''}
                                </span>
                                <span>Publicidad</span>
                            </div>
                        </div>
                        <p style="margin-top: 8px;"><strong>Servicios adicionales:</strong></p>
                        <div style="border-bottom: 1px solid #000; min-height: 12px; margin-bottom: 8px;"></div>
                        <p>Usted se compromete a pagar oportunamente el precio acordado. El servicio se activará a más tardar el ___________</p>
                        <div style="border-bottom: 1px solid #000; min-height: 12px;"></div>
                    </div>
                </div>

                <!-- Condiciones Comerciales -->
                <div class="section-box">
                    <div class="section-title">CONDICIONES COMERCIALES<br/>CARACTERÍSTICAS DEL PLAN</div>
                    <div style="font-size: 8px; min-height: 80px;">
                        ${condicionesComerciales}
                    </div>
                </div>

                <!-- Obligaciones del Usuario -->
                <div class="section-box">
                    <div class="section-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                    <div style="font-size: 8px;">
                        1) Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.<br/>
                        2) Suministrar información verdadera.<br/>
                        3) Hacer uso adecuado de los equipos y los servicios.<br/>
                        4) No divulgar ni acceder a pornografía infantil (Consultar anexo).<br/>
                        5) Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.<br/>
                        6) No cometer o ser partícipe de actividades de fraude.
                    </div>
                </div>

                <!-- Calidad y Compensación -->
                <div class="section-box">
                    <div class="section-title">CALIDAD Y COMPENSACIÓN</div>
                    <div style="font-size: 8px;">
                        Cuando se presente indisponibilidad del servicio o éste se suspenda a causa de su pago oportuno, lo compensaremos en su próxima factura. Debemos cumplir con las condiciones de calidad definidas por la CRC. Consúltelas en la página: www.psi.net.co/indicadoresdecalidad.
                        <br/><br/>
                        <strong>* Espacio diligenciado por el usuario</strong>
                    </div>
                </div>
            </div>

            <!-- Columna derecha -->
            <div style="flex: 1;">
                <!-- Cesión -->
                <div class="section-box">
                    <div class="section-title">CESIÓN</div>
                    <div style="font-size: 8px;">
                        Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito a través de nuestros Medios de Atención, acompañada de la aceptación por escrito de la persona a la que se hará la cesión. Dentro de los 15 días hábiles siguientes, analizaremos su solicitud y le daremos una respuesta. Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
                    </div>
                </div>

                <!-- Modificación -->
                <div class="section-box">
                    <div class="section-title">MODIFICACIÓN</div>
                    <div style="font-size: 8px;">
                        Nosotros no podemos modificar el contrato sin su autorización. Esto incluye que no podemos cobrarle servicios que no haya aceptado expresamente. Si esto ocurre tiene derecho a terminar el contrato, incluso estando vigente la cláusula de permanencia mínima, sin la obligación de pagar suma alguna por este concepto. No obstante, usted puede en cualquier momento modificar los servicios contratados. Dicha modificación se hará efectiva en el periodo de facturación siguiente, para lo cual deberá presentar la solicitud de modificación por lo menos 3 días hábiles de anterioridad al corte de facturación.
                    </div>
                </div>

                <!-- Suspensión -->
                <div class="section-box">
                    <div class="section-title">SUSPENSIÓN</div>
                    <div style="font-size: 8px;">
                        Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Para esto debe presentar la solicitud antes del inicio del ciclo de facturación que desea suspender. Si existe una cláusula de permanencia mínima, su vigencia se prorrogará por el tiempo que dure la suspensión.
                    </div>
                </div>

                <!-- Terminación -->
                <div class="section-box">
                    <div class="section-title">TERMINACIÓN</div>
                    <div style="font-size: 8px;">
                        Usted puede terminar el contrato en cualquier momento sin penalidades. Para esto debe realizar una solicitud a través de nuestros Medios de Atención mínimo 3 días hábiles antes del corte de facturación (su corte de facturación es el día 1 de cada mes). Si presenta la solicitud con una anticipación menor, la terminación del servicio se dará en el siguiente periodo de facturación. Así mismo, usted puede cancelar cualquiera de los servicios contratados, para lo que le informaremos las condiciones en las que serán prestados los servicios no cancelados y actualizaremos el contrato. Así mismo, si el operador no inicia la prestación de servicio en el plazo acordado, usted puede pedir la restitución de su dinero y la terminación del contrato.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- PÁGINA 2 -->
    <div class="page">
        <!-- Header Página 2 -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="display: flex; gap: 10px;">
                <div style="border: 1px solid #000; padding: 8px; text-align: center;">
                    <div style="font-weight: bold; font-size: 10px;">PAGO Y FACTURACIÓN</div>
                    <div style="font-size: 8px; text-align: justify; margin-top: 5px;">
                        La factura le debe llegar como mínimo 5 días hábiles antes de la fecha de pago. Si no llega, puede descargarla a través de nuestros Medios de Atención y debe pagarla oportunamente. Si no paga a tiempo, previo aviso, suspenderemos su servicio hasta que cancele los saldos pendientes. Contamos con 3 días hábiles luego de su pago para reconectarle el servicio. Si no paga a tiempo, también podemos reportar su deuda a las centrales de riesgo. Para esto tenemos que avisarle por lo menos con 20 días calendario de anticipación. Si paga en el reporte tenemos la obligación dentro del mes de seguimiento de informar su pago para que ya no aparezca reportado. Si tiene un reclamo sobre su factura, puede presentarlo antes de la fecha de pago y en ese caso no debe pagar las sumas reclamadas hasta que resolvamos su solicitud. Si ya pagó, tiene 6 meses para presentar la reclamación.
                    </div>
                </div>
                <div style="border: 1px solid #000; padding: 8px; text-align: center;">
                    <div style="font-weight: bold; font-size: 10px;">CAMBIO DE DOMICILIO</div>
                    <div style="font-size: 8px; text-align: justify; margin-top: 5px;">
                        Usted puede cambiar de domicilio y continuar con el servicio siempre que sea técnicamente posible. Desde el punto de vista técnico no es viable el traslado del servicio, usted puede ceder su contrato a un tercero o terminarlo pagando el valor de la cláusula de permanencia mínima si está vigente.
                    </div>
                </div>
            </div>
        </div>

        <div style="border: 1px solid #000; padding: 8px; margin-bottom: 15px;">
            <div style="font-weight: bold; font-size: 10px; text-align: center; margin-bottom: 8px;">COBRO POR RECONEXIÓN DEL SERVICIO</div>
            <div style="font-size: 8px; text-align: justify;">
                En caso de suspensión del servicio por mora en el pago, podremos cobrarle un valor por reconexión que corresponde estrictamente a los costos asociados a la operación de reconexión. En caso de servicios empaquetados procede máximo un cobro de reconexión por cada tipo de conexión empleado en la prestación de los servicios. Costo reconexión: $10.000 + iva.
                <br/><br/>
                El usuario es el ÚNICO responsable por el contenido y la información que se curse a través de la red y el uso que se haga de los equipos o de los servicios.
                <br/><br/>
                Los equipos de comunicaciones que ya no use son desechos que no deben ser botados a la caneca, consulte nuestra política de recolección de aparatos en desuso.
            </div>
        </div>

        <!-- Medios de Atención -->
        <div style="border: 1px solid #000; padding: 8px; margin-bottom: 15px;">
            <div style="font-weight: bold; font-size: 10px; text-align: center; margin-bottom: 8px;">CÓMO COMUNICARSE CON NOSOTROS<br/>(MEDIOS DE ATENCIÓN)</div>
            
            <div style="display: flex; gap: 8px;">
                <div style="flex: 1; font-size: 8px;">
                    <div style="background: #f0f0f0; padding: 4px; margin-bottom: 4px; font-weight: bold;">1</div>
                    <div>Nuestros medios de atención son: oficinas físicas, página web, redes sociales y líneas telefónicas gratuitas.</div>
                    
                    <div style="background: #f0f0f0; padding: 4px; margin: 8px 0 4px 0; font-weight: bold;">2</div>
                    <div>Presente cualquier queja, petición/reclamo o recurso a través de estos medios y le responderemos en máximo 15 días hábiles.</div>
                    
                    <div style="background: #f0f0f0; padding: 4px; margin: 8px 0 4px 0; font-weight: bold;">3</div>
                    <div>Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama silencio administrativo positivo y aplica para internet.</div>
                    
                    <div style="background: #f0f0f0; padding: 4px; margin: 8px 0 4px 0; font-weight: bold;">4</div>
                    <div>Si no está de acuerdo con nuestra respuesta</div>
                    
                    <div style="font-size: 7px; margin-top: 8px; text-align: justify;">
                        Cuando su queja o petición sea por los servicios de internet y esté relacionada con actos de negativa del contrato, corte y facturación; usted puede insistir en su solicitud ante nosotros, dentro de los 10 días hábiles siguientes a la respuesta, y pedir que si no llegamos a una solución satisfactoria para usted, enviemos su reclamo directamente a la SIC (Superintendencia de Industria y comercio) quien resolverá de manera definitiva su solicitud. Si se llama recurso de reposición y en subsidio apelación. Cuando su queja o petición sea por el servicio de televisión, puede enviar la misma a la Autoridad Nacional de Televisión, para que esta Entidad resuelva su solicitud.
                    </div>
                </div>
                
                <div style="flex: 1; font-size: 8px;">
                    <div>LOS CANALES DE TELEVISIÓN: se debe entender como ofertas generales no caracterizadas por ningún canal; por lo anterior el usuario expresamente autoriza a PSI para que, por razones de orden técnico o comercial, suprima, amplíe o modifique los canales que componen la programación del servicio que recibe el usuario. SUSPENSIÓN Y TERMINACIÓN POR: incumplimiento de sus obligaciones, incluyendo el no pago de 1 o más facturas consecutivas; Fuerza mayor/caso fortuito; Uso inadecuado de la red o del servicio; Por prevención de fraude; no viabilidad técnica o económica para prestar el servicio; regularidades en los documentos suministrados; o por equívoca tecnológica. EL USUARIO RESPONDE POR: los equipos entregados para prestación y operación del servicio y autoriza el cobro de su reposición por daño o pérdida. Deberá entregarlos a la terminación del contrato del modo establecido en la regulación, de no hacerlo pagará el valor comercial de los mismos. LAS TARIFAS: podrán incrementar por mes o año sin superar el 50% de la tarifa antes del incremento, el INTERÉS DE MORA: es el máximo legal, se cobrarán los gastos de cobranza judicial y extrajudicial. NO RESPONDEMOS: por lucro cesante, daño indirecto, incidentales o consecuenciales. ESTE CONTRATO PRESTA MÉRITO EJECUTIVO: para hacer exigibles las obligaciones y prestaciones contenidas en el.</div>
                </div>
            </div>
        </div>

        <!-- Firma y aceptación -->
        <div style="margin-top: 40px;">
            <div style="border: 1px solid #000; padding: 8px; text-align: center;">
                <div style="font-size: 8px; margin-bottom: 10px;">
                    Con esta firma acepta recibir la factura por medios electrónicos
                </div>
                
                <div style="font-weight: bold; font-size: 9px; margin-bottom: 15px;">
                    Aceptación contrato mediante firma o cualquier otro medio válido
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <div style="text-align: center;">
                        <div style="border-bottom: 1px solid #000; width: 150px; height: 20px; margin-bottom: 5px;"></div>
                        <div style="font-size: 8px; font-weight: bold;">CC/CE</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="border-bottom: 1px solid #000; width: 150px; height: 20px; margin-bottom: 5px;"></div>
                        <div style="font-size: 8px; font-weight: bold;">FECHA</div>
                    </div>
                </div>
                
                <div style="font-size: 7px; margin-top: 10px;">
                    Consulte el régimen de protección de usuarios en www.crcom.gov.co
                </div>
            </div>
        </div>
    </div>

    ${contrato.tipo_permanencia === 'con_permanencia' ? this.generarPaginaPermanencia(contrato, empresa, fechaHoy) : ''}
</body>
</html>`;
  }

  /**
   * Generar página de permanencia (solo si aplica)
   */
  static generarPaginaPermanencia(contrato, empresa, fechaHoy) {
    return `
    <!-- PÁGINA 3 - ANEXO DE PERMANENCIA -->
    <div class="page">
        <!-- Header Página 3 -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">PSI</div>
                <div style="font-size: 8px; color: #666;">
                    Conecta<br/>
                    <span style="color: #e74c3c;">*</span>
                </div>
            </div>
            <div class="company-info">
                <div class="company-title">PROVEEDOR DE TELECOMUNICACIONES</div>
                <div class="company-subtitle">NIT: ${empresa.empresa_nit || '901.582.657-3'}</div>
            </div>
            <div class="contract-title">
                CONTRATO ÚNICO DE SERVICIOS FIJOS.<br/>
                <div style="border: 1px solid #000; padding: 2px; margin-top: 3px;">
                    Fecha: ${fechaHoy}
                </div>
            </div>
        </div>

        <!-- Información del Suscriptor - Repetida -->
        <div class="info-section">
            <div class="info-title">INFORMACIÓN DEL SUSCRIPTOR</div>
            <div class="info-content">
                <table>
                    <tr>
                        <td style="width: 15%;"><strong>Contrato No.</strong></td>
                        <td style="width: 35%; border-bottom: 1px solid #000;">${contrato.numero_contrato}</td>
                        <td style="width: 15%;"><strong>Departamento</strong></td>
                        <td style="width: 35%; border-bottom: 1px solid #000;">${contrato.departamento_nombre || 'Santander'}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Nombre</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_nombre}</td>
                        <td><strong>Municipio</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.ciudad_nombre || 'San Gil'}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Identificación</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_identificacion}</td>
                        <td><strong>Correo electrónico</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_email || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Teléfono de contacto</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_telefono || ''}</td>
                        <td><strong>Estrato</strong></td>
                        <td style="border-bottom: 1px solid #000;">${contrato.cliente_estrato || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Dirección servicio</strong></td>
                        <td colspan="3" style="border-bottom: 1px solid #000;">${contrato.cliente_direccion || ''}</td>
                    </tr>
                    <tr><td colspan="4" style="height: 8px;"></td></tr>
                    <tr>
                        <td><strong>Dirección suscriptor</strong></td>
                        <td colspan="3" style="border-bottom: 1px solid #000;">${contrato.cliente_direccion || ''}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Anexo de Permanencia -->
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin: 20px 0;">
            ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA
        </div>

        <div style="text-align: justify; font-size: 9px; line-height: 1.4;">
            <p>
                Señor usuario, el presente contrato lo obliga a estar vinculado con 
                PROVEEDOR DE TELECOMUNICACIONES SAS. durante un tiempo de <strong>${contrato.permanencia_meses}</strong> 
                mes(es), además cuando venza el plazo indicado, el presente contrato 
                se renovará en forma automática indefinidamente, y finalmente, en 
                caso que usted decida terminar el contrato antes de que venza el 
                período de permanencia mínima señalado usted deberá pagar los 
                valores que se determinan en el siguiente punto. En caso de que el 
                usuario que celebró el contrato lo dé por terminado antes del 
                vencimiento del período estipulado, pagará una suma equivalente al 
                valor del servicio mensual por los meses faltantes para la terminación 
                de la permanencia mínima, dividido en dos; su forma es: <strong>VALOR POR 
                TERMINADO DEL CONTRATO=((VALOR DEL SERVICIO MENSUAL * 
                MESES FALTANTES PARA COMPLETAR LA PERMANENCIA) / 2)</strong>. Una vez 
                esta condición sea aceptada expresamente por usted, debe 
                permanecer con el contrato por el tiempo acordado en la presente 
                cláusula, y queda vinculado con PROVEEDOR DE 
                TELECOMUNICACIONES SAS. de acuerdo con las condiciones del 
                presente contrato. Prórroga: El usuario que celebró el contrato conoce 
                y acepta la prórroga automática del plan tarifario estipulada en el 
                clausurado del contrato.
            </p>
        </div>

        <!-- Línea de firma -->
        <div style="margin-top: 80px;">
            <div style="border-bottom: 2px solid #000; width: 400px; margin: 0 auto; height: 30px;"></div>
            <div style="text-align: center; font-weight: bold; margin-top: 10px;">
                Firma del usuario que celebró el contrato
            </div>
        </div>
    </div>`;
  }

  /**
   * Determinar servicios contratados basado en el plan
   */
  static determinarServicios(contrato) {
    const servicios = {
      internet: false,
      television: false,
      publicidad: false
    };

    if (contrato.plan_tipo) {
      switch (contrato.plan_tipo.toLowerCase()) {
        case 'internet':
          servicios.internet = true;
          break;
        case 'television':
          servicios.television = true;
          break;
        case 'combo':
          servicios.internet = true;
          servicios.television = true;
          break;
      }
    }

    return servicios;
  }

  /**
   * Generar condiciones comerciales del plan
   */
  static generarCondicionesComerciales(contrato) {
    let condiciones = `<strong>Plan:</strong> ${contrato.plan_nombre || 'N/A'}<br/>`;
    condiciones += `<strong>Precio mensual:</strong> ${this.formatearPrecio(contrato.plan_precio || 0)}<br/>`;
    
    if (contrato.velocidad_bajada) {
      condiciones += `<strong>Velocidad de descarga:</strong> ${contrato.velocidad_bajada} Mbps<br/>`;
    }
    
    if (contrato.velocidad_subida) {
      condiciones += `<strong>Velocidad de subida:</strong> ${contrato.velocidad_subida} Mbps<br/>`;
    }
    
    if (contrato.canales_tv) {
      condiciones += `<strong>Canales de TV:</strong> ${contrato.canales_tv}<br/>`;
    }
    
    if (contrato.plan_descripcion) {
      condiciones += `<strong>Descripción:</strong> ${contrato.plan_descripcion}<br/>`;
    }
    
    condiciones += `<strong>Costo de instalación:</strong> ${this.formatearPrecio(contrato.costo_instalacion || 0)}<br/>`;
    
    if (contrato.tipo_permanencia === 'con_permanencia') {
      condiciones += `<strong>Permanencia mínima:</strong> ${contrato.permanencia_meses || 0} meses<br/>`;
    }

    return condiciones;
  }

  /**
   * Formatear precio con separadores de miles
   */
  static formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(precio);
  }
}

module.exports = ContratoPDFGenerator;