// backend/utils/ContratoPDFGeneratorMINTIC.js
// Generador de PDF de contratos EXACTAMENTE IGUAL al modelo Word
// Replicación pixel-perfect del documento original

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGeneratorMINTIC {

  /**
   * Generar HTML EXACTAMENTE igual al Word
   */
  static generarHTML(contratoData, empresaData, logoPath = '') {
    const fechaHoy = new Date().toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Determinar servicios contratados
    const servicios = this.determinarServicios(contratoData);

    // Calcular valores
    const precioInternet = parseFloat(contratoData.precio_internet || 0);
    const precioTelevision = parseFloat(contratoData.precio_television || 0);
    const valorTotal = precioInternet + precioTelevision;

    // Determinar permanencia
    const permanenciaMeses = parseInt(contratoData.permanencia_meses || 1);
    const tienePermanencia = permanenciaMeses > 1;

    // Fecha de activación (15 días hábiles después)
    const fechaActivacion = new Date();
    fechaActivacion.setDate(fechaActivacion.getDate() + 15);
    const fechaActivacionStr = fechaActivacion.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato PSI - ${contratoData.numero_contrato}</title>
    <style>
        @page {
            size: Letter;
            margin: 16mm 19mm 5mm 19mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Calibri, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.15;
            color: #000;
        }

        .page {
            width: 100%;
            page-break-after: always;
        }

        .page:last-child {
            page-break-after: avoid;
        }

        /* HEADER */
        .header {
            width: 100%;
            margin-bottom: 3mm;
            border-bottom: 2px solid #000;
            padding-bottom: 2mm;
        }

        .header-content {
            display: table;
            width: 100%;
        }

        .header-left {
            display: table-cell;
            width: 15%;
            vertical-align: middle;
        }

        .logo-img {
            height: 42px;
            width: auto;
        }

        .header-center {
            display: table-cell;
            width: 60%;
            text-align: center;
            vertical-align: middle;
        }

        .company-name {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 1px;
        }

        .company-nit {
            font-size: 10pt;
            margin-bottom: 0;
        }

        .header-right {
            display: table-cell;
            width: 25%;
            text-align: right;
            vertical-align: top;
        }

        .contract-title {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 2px;
        }

        .contract-date {
            font-size: 10pt;
            padding: 1px 3px;
            border: 1px solid #000;
            display: inline-block;
        }

        /* TABLA INFO SUSCRIPTOR */
        .info-section-title {
            background: #d9d9d9;
            border: 1px solid #000;
            padding: 3px;
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            margin: 3mm 0 2mm 0;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
            margin-bottom: 3mm;
        }

        .info-table td {
            border: 1px solid #bfbfbf;
            padding: 3px 5px;
            vertical-align: middle;
        }

        .info-table .label-cell {
            font-weight: bold;
            background: #f2f2f2;
            width: 18%;
        }

        .info-table .value-cell {
            width: 32%;
        }

        /* TEXTO INTRO */
        .intro-text {
            font-size: 10pt;
            text-align: justify;
            line-height: 1.15;
            margin-bottom: 2mm;
        }

        .city-name {
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 3mm;
        }

        /* DOS COLUMNAS */
        .two-columns {
            display: table;
            width: 100%;
            table-layout: fixed;
        }

        .column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 0 2mm;
        }

        .column:first-child {
            border-right: 1px solid #bfbfbf;
            padding-left: 0;
            padding-right: 3mm;
        }

        .column:last-child {
            padding-right: 0;
            padding-left: 3mm;
        }

        /* CAJAS DE CONTENIDO */
        .content-box {
            border: 1px solid #000;
            margin-bottom: 3mm;
        }

        .box-title {
            background: #f2f2f2;
            border-bottom: 1px solid #000;
            padding: 2px 4px;
            font-weight: bold;
            font-size: 10pt;
            text-align: center;
        }

        .box-content {
            padding: 4px 5px;
            font-size: 9.5pt;
            line-height: 1.15;
            text-align: justify;
        }

        /* CHECKBOXES */
        .service-checkboxes {
            display: flex;
            gap: 8px;
            margin: 3px 0;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .checkbox {
            width: 12px;
            height: 12px;
            border: 1.5px solid #000;
            display: inline-block;
            text-align: center;
            line-height: 10px;
            font-size: 9pt;
            font-weight: bold;
        }

        .checkbox.checked::before {
            content: "✓";
        }

        /* VALOR TOTAL */
        .valor-total {
            border: 1px solid #000;
            padding: 3px;
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            margin: 3mm 0;
        }

        /* LISTA NUMERADA */
        .numbered-list {
            counter-reset: item;
            list-style: none;
            padding-left: 0;
            margin: 3px 0;
        }

        .numbered-list li {
            counter-increment: item;
            margin-bottom: 3px;
            padding-left: 18px;
            position: relative;
        }

        .numbered-list li::before {
            content: counter(item) ")";
            font-weight: bold;
            position: absolute;
            left: 0;
        }

        /* NOTA PEQUEÑA */
        .small-note {
            font-size: 8pt;
            margin-top: 3mm;
        }

        /* PÁGINA 2 - TEXTO LEGAL */
        .legal-content {
            font-size: 9.5pt;
            text-align: justify;
            line-height: 1.15;
        }

        .legal-content p {
            margin-bottom: 3mm;
        }

        .legal-content strong {
            font-weight: bold;
        }

        /* CAJA DE MEDIOS DE ATENCIÓN */
        .contact-box {
            border: 1px solid #000;
            padding: 5mm;
            margin: 4mm 0;
        }

        .contact-title {
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 3mm;
        }

        .contact-item {
            display: flex;
            margin-bottom: 3mm;
            align-items: flex-start;
        }

        .contact-number {
            min-width: 25px;
            height: 25px;
            border: 1.5px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 5px;
            flex-shrink: 0;
        }

        .contact-text {
            flex: 1;
            font-size: 9.5pt;
            line-height: 1.15;
            text-align: justify;
        }

        /* FIRMA */
        .signature-section {
            margin-top: 5mm;
            text-align: center;
        }

        .signature-note {
            font-size: 8pt;
            margin-bottom: 2mm;
        }

        .signature-title {
            font-weight: bold;
            font-size: 9.5pt;
            margin-bottom: 2mm;
        }

        .signature-box {
            border: 1px solid #000;
            display: inline-block;
            padding: 2px 8px;
            margin-bottom: 3mm;
        }

        .signature-box table {
            border-collapse: collapse;
            font-size: 9.5pt;
        }

        .signature-box td {
            padding: 3px 8px;
            border-right: 1px solid #000;
        }

        .signature-box td:last-child {
            border-right: none;
        }

        .signature-line {
            width: 280px;
            height: 25px;
            border-bottom: 2px solid #000;
            margin: 0 auto 3mm auto;
        }

        .footer-note {
            font-size: 8pt;
            text-align: center;
            margin-top: 3mm;
        }
    </style>
</head>
<body>
    <!-- ============================================ -->
    <!-- PÁGINA 1 -->
    <!-- ============================================ -->
    <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy, logoPath)}

        <!-- Información del Suscriptor -->
        <div class="info-section-title">INFORMACIÒN DEL SUSCRIPTOR</div>
        <table class="info-table">
            <tr>
                <td class="label-cell">Contrato No.</td>
                <td class="value-cell">${contratoData.numero_contrato || ''}</td>
                <td class="label-cell"><strong>Departamento</strong></td>
                <td class="value-cell">${contratoData.departamento_nombre || 'Santander'}</td>
            </tr>
            <tr>
                <td class="label-cell">Nombre</td>
                <td class="value-cell">${contratoData.cliente_nombre || ''}</td>
                <td class="label-cell"><strong>Municipio</strong></td>
                <td class="value-cell">${contratoData.ciudad_nombre || 'San Gil'}</td>
            </tr>
            <tr>
                <td class="label-cell">Identificación</td>
                <td class="value-cell">${contratoData.cliente_identificacion || ''}</td>
                <td class="label-cell"><strong>Correo electrónico</strong></td>
                <td class="value-cell">${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Teléfono de contacto</td>
                <td class="value-cell">${contratoData.cliente_telefono || ''}</td>
                <td class="label-cell"><strong>Estrato</strong></td>
                <td class="value-cell">${contratoData.cliente_estrato || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Dirección servicio</td>
                <td colspan="3" class="value-cell">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Dirección suscriptor</td>
                <td colspan="3" class="value-cell">${contratoData.cliente_direccion || ''}</td>
            </tr>
        </table>

        <!-- Texto introductorio -->
        <p class="intro-text">
            Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente $${this.formatearPrecio(valorTotal)}. Este contrato tendrá vigencia de ${permanenciaMeses} mes(es), contados a partir del día de la instalación. El plazo máximo de instalación es de 15 días hábiles. Acepto que mi contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de ${permanenciaMeses} mes(es).
        </p>

        <p class="city-name">${contratoData.ciudad_nombre || 'San Gil'}</p>

        <!-- Dos columnas -->
        <div class="two-columns">
            <!-- COLUMNA IZQUIERDA -->
            <div class="column">
                <!-- EL SERVICIO -->
                <div class="content-box">
                    <div class="box-title">EL SERVICIO</div>
                    <div class="box-content">
                        <p>Con este contrato nos comprometemos a prestarle los servicios que usted elija*:</p>
                        <div class="service-checkboxes">
                            <div class="checkbox-item">
                                <span class="checkbox ${servicios.internet ? 'checked' : ''}"></span>
                                Internet Fijo
                            </div>
                            <div class="checkbox-item">
                                <span class="checkbox ${servicios.television ? 'checked' : ''}"></span>
                                Televisión
                            </div>
                            <div class="checkbox-item">
                                <span class="checkbox"></span>
                                Publicidad
                            </div>
                        </div>
                        <p style="margin-top: 3px;">
                            Servicios adicionales__________________________
                        </p>
                        <p style="margin-top: 3px;">
                            Usted se compromete a pagar oportunamente el precio acordado. El servicio se activará a más tardar el día <strong>${fechaActivacionStr}</strong>
                        </p>
                    </div>
                </div>

                <!-- CONDICIONES COMERCIALES -->
                <div class="content-box">
                    <div class="box-title">CONDICIONES COMERCIALES</div>
                    <div class="box-content">
                        <p style="font-weight: bold; margin-bottom: 3px;">CARACTERÍSTICAS DEL PLAN</p>
                        ${this.generarDetallesServicios(contratoData, servicios)}
                        ${tienePermanencia ? `<p style="margin-top: 3px;"><strong>CLAUSULA PERMENENCIA ${permanenciaMeses} MEESES-MODEN EN CALIDAD DE PRESTAMO</strong></p>` : ''}
                    </div>
                </div>

                <div class="valor-total">
                    Valor Total $${this.formatearPrecio(valorTotal)}
                </div>

                <!-- PRINCIPALES OBLIGACIONES -->
                <div class="content-box">
                    <div class="box-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                    <div class="box-content">
                        <ol class="numbered-list">
                            <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.</li>
                            <li>Suministrar información verdadera.</li>
                            <li>Hacer uso adecuado de los equipos y los servicios.</li>
                            <li>No divulgar ni acceder a pornografía infantil (Consultar anexo).</li>
                            <li>Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.</li>
                            <li>No cometer o ser partícipe de actividades de fraude.</li>
                        </ol>
                    </div>
                </div>

                <!-- CALIDAD Y COMPENSACIÓN -->
                <div class="content-box">
                    <div class="box-title">CALIDAD Y COMPENSACIÓN</div>
                    <div class="box-content">
                        Cuando se presente indisponibilidad del servicio o este se suspenda a pesar de su pago oportuno, lo compensaremos en su próxima factura. Debemos cumplir con las condiciones de calidad definidas por la CRC. Consúltelas en la página: www.psi.net.co/indicadoresdecalidad.
                    </div>
                </div>

                <p class="small-note">* Espacio dilingenciado por el usuario</p>
            </div>

            <!-- COLUMNA DERECHA -->
            <div class="column">
                <!-- CESIÓN -->
                <div class="content-box">
                    <div class="box-title">CESIÓN</div>
                    <div class="box-content">
                        Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito a través de nuestros Medios de Atención, acompañada de la aceptación por escrito de la persona a la que se hará la cesión. Dentro de los 15 días hábiles siguientes, analizaremos su solicitud y le daremos una respuesta. Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
                    </div>
                </div>

                <!-- MODIFICACIÓN -->
                <div class="content-box">
                    <div class="box-title">MODIFICACIÓN</div>
                    <div class="box-content">
                        Nosotros no podemos modificar el contrato sin su autorización. Esto incluye que no podemos cobrarle servicios que no haya aceptado expresamente. Si esto ocurre tiene derecho a terminar el contrato, incluso estando vigente la cláusula de permanencia mínima, sin la obligación de pagar suma alguna por este concepto. No obstante, usted puede en cualquier momento modificar los servicios contratados. Dicha modificación se hará efectiva en el período de facturación siguiente, para lo cual deberá presentar la solicitud de modificación por lo menos 3 días hábiles de anterioridad al corte de facturación.
                    </div>
                </div>

                <!-- SUSPENSIÓN -->
                <div class="content-box">
                    <div class="box-title">SUSPENSIÓN</div>
                    <div class="box-content">
                        Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Para esto debe presentar la solicitud antes del inicio del ciclo de facturación que desea suspender. Si existe una cláusula de permanencia mínima, su vigencia se prorrogará por el tiempo que dure la suspensión.
                    </div>
                </div>

                <!-- TERMINACIÓN -->
                <div class="content-box">
                    <div class="box-title">TERMINACIÓN</div>
                    <div class="box-content">
                        Usted puede terminar el contrato en cualquier momento sin penalidades. Para esto debe realizar una solicitud a través de cualquiera de nuestros Medios de Atención mínimo 3 días hábiles antes del corte de facturación (su corte de facturación es el día 1 de cada mes). Si presenta la solicitud con una anticipación menor, la terminación del servicio se dará en el siguiente período de facturación. Así mismo, usted puede cancelar cualquiera de los servicios contratados, para lo que le informaremos las condiciones en las que serán prestados los servicios no cancelados y actualizaremos el contrato. Así mismo, si el operador no inicia la prestación de servicio en el plazo acordado, usted puede pedir la restitución de su dinero y la terminación del contrato.
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${this.generarPagina2(contratoData, empresaData, fechaHoy, logoPath)}
    ${tienePermanencia ? this.generarPagina3Permanencia(contratoData, empresaData, fechaHoy, logoPath, permanenciaMeses) : ''}
</body>
</html>`;
  }

  static generarEncabezado(contratoData, empresaData, fechaHoy, logoPath) {
    return `
        <div class="header">
            <div class="header-content">
                <div class="header-left">
                    <img src="${logoPath}" class="logo-img" alt="Logo PSI" />
                </div>
                <div class="header-center">
                    <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES SAS</div>
                    <div class="company-nit">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
                </div>
                <div class="header-right">
                    <div class="contract-title">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                    <div class="contract-date">Fecha: ${fechaHoy}</div>
                </div>
            </div>
        </div>`;
  }

  static generarDetallesServicios(contratoData, servicios) {
    let detalles = '';

    if (servicios.internet) {
      const nombreServicio = contratoData.servicio_nombre || contratoData.internet_data?.nombre || 'INTERNET FIBRA 300 MEGAS';
      detalles += `<p><strong>INTERNET FIBRA $ ${this.formatearPrecio(contratoData.precio_internet)}</strong> ${nombreServicio} ESTRATO ${contratoData.cliente_estrato || '1,2,3'}</p>`;
    }

    if (servicios.television) {
      detalles += `<p><strong>TELEVISION $ ${this.formatearPrecio(contratoData.precio_television)}</strong> TELEVISION $${this.formatearPrecio(contratoData.precio_television)} ESTRATO ${contratoData.cliente_estrato || '1,2,3'} + IVA</p>`;
    }

    return detalles;
  }

  static generarPagina2(contratoData, empresaData, fechaHoy, logoPath) {
    return `
    <!-- ============================================ -->
    <!-- PÁGINA 2 -->
    <!-- ============================================ -->
    <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy, logoPath)}

        <div class="legal-content">
            <p><strong>PAGO Y FACTURACIÓN</strong><br/>
            La factura le debe llegar como mínimo 5 días hábiles antes de la fecha de pago. Si no llega, puede solicitarla a través de nuestros Medios de Atención y debe pagarla oportunamente. Si no paga a tiempo, previo aviso, suspenderemos su servicio hasta que pague sus saldos pendientes. Contamos con 3 días hábiles luego de su pago para reconectarle el servicio. Si no paga a tiempo, también podemos reportar su deuda a las centrales de riesgo. Para esto tenemos que avisarle por lo menos con 20 días calendario de anticipación. Si paga luego de este reporte tenemos la obligación dentro del mes de seguimiento de informar su pago para que ya no aparezca reportado. Si tiene un reclamo sobre su factura, puede presentarlo antes de la fecha de pago y en ese caso no debe pagar las sumas reclamadas hasta que resolvamos su solicitud. Si ya pagó, tiene 6 meses para presentar la reclamación.</p>

            <p><strong>CAMBIO DE DOMICILIO</strong><br/>
            Usted puede cambiar de domicilio y continuar con el servicio siempre que sea técnicamente posible. Si desde el punto de vista técnico no es viable el traslado del servicio, usted puede ceder su contrato a un tercero o terminarlo pagando el valor de la cláusula de permanencia mínima si esta vigente.</p>

            <p><strong>COBRO POR RECONEXIÓN DEL SERVICIO</strong><br/>
            En caso de suspensión del servicio por mora en el pago, podremos cobrarle un valor por reconexión que corresponderá estrictamente a los costos asociados a la operación de reconexión. En caso de servicios, empaquetados procede máximo un cobro de reconexión por cada tipo de conexión empleado en la prestación de los servicios. Costo reconexión: $10.000 + iva.</p>

            <p>El usuario es el ÚNICO responsable por el contenido y la información que se curse a través de la red y del uso que se haga de los equipos o de los servicios.</p>

            <p>Los equipos de comunicaciones que ya no use son desechos que no deben ser botados a la caneca, consulte nuestra política de recolección de aparatos en desuso.</p>

            <p><strong>LOS CANALES DE TELEVISIÓN:</strong> se debe entender como ofertas generales no caracterizadas por ningún canal; por lo anterior el usuario expresamente autoriza a PSI para que, por razones de orden técnico o comercial, suprima, amplíe o modifique los canales que componen la programación del servicio que recibe el usuario.</p>

            <p><strong>SUSPENSIÓN Y TERMINACIÓN POR:</strong> incumpliendo de sus obligaciones, incluyendo el no pago de 1 o más facturas consecutivas; Fuerza mayor/caso fortuito; Uso inadecuado de la red o del servicio; Por prevencion de fraude; no viabilidad técnica o económica para prestar el servicio; iregularidades en los documentos suministrados; o por evolución tecnológica.</p>

            <p><strong>EL USUARIO RESPONDE POR:</strong> los equipos entregados para prestación y operación del servicio y autoriza el cobro de su reposición por daño o pérdida. Deberá entregarlos a la terminación del contrato del modo establecido en la regulación, de no hacerlo pagará el valor comercial de los mismos.</p>

            <p><strong>LAS TARIFAS:</strong> podrán incrementar por mes o año sin superar el 50% de la tarifa antes del incremento.</p>

            <p><strong>EL INTERÉS DE MORA:</strong> es el máximo legal, se cobrarán los gastos de cobranza judicial y extrajudicial.</p>

            <p><strong>NO RESPONDEMOS:</strong> por lucro cesante, daño indirecto, incidentales o consecuenciales.</p>

            <p><strong>ESTE CONTRATO PRESTA MÉRITO EJECUTIVO:</strong> para hacer exigibles las obligaciones y prestaciones contenidas en él.</p>
        </div>

        <!-- Caja de medios de atención -->
        <div class="contact-box">
            <div class="contact-title">CÓMO COMUNICARSE CON NOSOTROS<br/>(MEDIOS DE ATENCIÓN)</div>

            <div class="contact-item">
                <div class="contact-number">1</div>
                <div class="contact-text">Nuestros medios de atención son: oficinas físicas, página web, redes sociales y líneas telefónicas gratuitas.</div>
            </div>

            <div class="contact-item">
                <div class="contact-number">2</div>
                <div class="contact-text">Presente cualquier queja, petición/reclamo o recurso a través de estos medios y le responderemos en máximo 15 días hábiles.</div>
            </div>

            <div class="contact-item">
                <div class="contact-number">3</div>
                <div class="contact-text">Cuando su queja o petición sea por los servicios de internet, y esté relacionada con actos de negativa del contrato, suspensión del servicio, terminación del contrato, corte y facturación; usted puede insistir en su solicitud ante nosotros, dentro de los 10 días hábiles siguientes a la respuesta, y pedir que si no llegamos a una solución satisfactoria para usted, enviemos su reclamo directamente a la SIC (Superintendencia de Industria y comercio) quien resolverá de manera definitiva su solicitud. Esto se llama recurso de reposición y en subsidio apelación.</div>
            </div>

            <div class="contact-item">
                <div class="contact-number">4</div>
                <div class="contact-text">Cuando su queja o petición sea por el servicio de televisión, puede enviar la misma a la Autoridad Nacional de Televisión, para que esta Entidad resuelva su solicitud.</div>
            </div>

            <p style="margin-top: 3mm; font-size: 9.5pt;">Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama silencio administrativo positivo y aplica para internet.</p>

            <p style="text-align: center; font-weight: bold; margin-top: 3mm; font-size: 9.5pt;">Si no está de acuerdo con nuestra respuesta</p>
        </div>

        <!-- Firma -->
        <div class="signature-section">
            <p class="signature-note">Con esta firma acepta recibir la factura por medios electrónicos</p>
            <p class="signature-title">Aceptación contrato mediante firma o cualquier otro medio válido</p>
            <div class="signature-box">
                <table>
                    <tr>
                        <td><strong>CC/CE</strong> ${contratoData.cliente_identificacion || ''}</td>
                        <td><strong>FECHA</strong> ${fechaHoy}</td>
                    </tr>
                </table>
            </div>
            <div class="signature-line"></div>
            <p class="footer-note">Consulte el régimen de protección de usuarios en www.crcom.gov.co</p>
        </div>
    </div>`;
  }

  static generarPagina3Permanencia(contratoData, empresaData, fechaHoy, logoPath, meses) {
    return `
    <!-- ============================================ -->
    <!-- PÁGINA 3 - ANEXO DE PERMANENCIA -->
    <!-- ============================================ -->
    <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy, logoPath)}

        <!-- Información del Suscriptor (repetida) -->
        <div class="info-section-title">INFORMACIÒN DEL SUSCRIPTOR</div>
        <table class="info-table">
            <tr>
                <td class="label-cell">Contrato No.</td>
                <td class="value-cell">${contratoData.numero_contrato || ''}</td>
                <td class="label-cell"><strong>Departamento</strong></td>
                <td class="value-cell">${contratoData.departamento_nombre || 'Santander'}</td>
            </tr>
            <tr>
                <td class="label-cell">Nombre</td>
                <td class="value-cell">${contratoData.cliente_nombre || ''}</td>
                <td class="label-cell"><strong>Municipio</strong></td>
                <td class="value-cell">${contratoData.ciudad_nombre || 'San Gil'}</td>
            </tr>
            <tr>
                <td class="label-cell">Identificación</td>
                <td class="value-cell">${contratoData.cliente_identificacion || ''}</td>
                <td class="label-cell"><strong>Correo electrónico</strong></td>
                <td class="value-cell">${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Teléfono de contacto</td>
                <td class="value-cell">${contratoData.cliente_telefono || ''}</td>
                <td class="label-cell"><strong>Estrato</strong></td>
                <td class="value-cell">${contratoData.cliente_estrato || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Dirección servicio</td>
                <td colspan="3" class="value-cell">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
                <td class="label-cell">Dirección suscriptor</td>
                <td colspan="3" class="value-cell">${contratoData.cliente_direccion || ''}</td>
            </tr>
        </table>

        <p class="city-name">${contratoData.ciudad_nombre || 'San Gil'}</p>
        <p style="text-align: center; font-size: 10pt; margin-bottom: 3mm;">Estrato ${contratoData.cliente_estrato || ''}</p>

        <!-- Anexo de Permanencia -->
        <div class="info-section-title">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
        <p class="intro-text" style="margin-top: 3mm;">
            Señor usuario, el presente contrato lo obliga a estar vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. durante un tiempo de ${meses} mes(es), además cuando venza el plazo indicado, el presente contrato se renovará en forma automática indefinidamente, y finalmente, en caso que usted decida terminar el contrato antes de que venza el periodo de permanencia mínima señalado usted deberá pagar los valores que se determinan en el siguiente punto. En caso de que el usuario que celebró el contrato lo dé por terminado antes del vencimiento del periodo estipulado, pagará una suma equivalente al valor del servicio mensual por los meses faltantes para la termininacion de la permanencia mínima, dividido en dos; su forma es: VALOR POR TERMINADO DEL CONTRATO=((VALOR DEL SERVICIO MENSUAL * MESES FALTANTES PARA COMPLETAR LA PERMANENCIA) / 2). Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado en la presente cláusula, y queda vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. de acuerdo con las condiciones del presente contrato. Prórroga: El usuario que celebró el contrato conoce y acepta la prórroga automática del plan tarifario estipulada en el clausurado del contrato.
        </p>

        <div class="signature-line" style="margin-top: 40mm;"></div>
        <p style="text-align: center; font-weight: bold; font-size: 9.5pt;">Firma del usuario que celebró el contrato</p>
    </div>`;
  }

  static determinarServicios(contratoData) {
    const precioInternet = parseFloat(contratoData.precio_internet || 0);
    const precioTelevision = parseFloat(contratoData.precio_television || 0);

    return {
      internet: precioInternet > 0,
      television: precioTelevision > 0
    };
  }

  static formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(Math.round(precio || 0));
  }

  /**
   * Generar PDF completo del contrato como buffer (para adjuntar a correos)
   */
  static async generarPDFCompleto(datosContrato) {
    let logoPath = '';
    try {
      const logoFilePath = path.join(__dirname, '../public/logo2.png');
      const logoBuffer = await fs.readFile(logoFilePath);
      const logoBase64 = logoBuffer.toString('base64');
      logoPath = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
      console.warn('⚠️  No se pudo cargar el logo para contrato:', error.message);
    }

    const html = this.generarHTML(datosContrato, datosContrato.empresa || {}, logoPath);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '19mm',
          bottom: '5mm',
          left: '19mm'
        }
      });

      console.log(`✅ PDF del contrato generado como buffer - Tamaño: ${pdfBuffer.length} bytes`);
      return pdfBuffer;

    } finally {
      await browser.close();
    }
  }

  /**
   * Generar PDF del contrato
   */
  static async generarPDF(contratoData, empresaData, rutaSalida) {
    let logoPath = '';
    try {
      const logoFilePath = path.join(__dirname, '../public/logo2.png');
      const logoBuffer = await fs.readFile(logoFilePath);
      const logoBase64 = logoBuffer.toString('base64');
      logoPath = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
      console.warn('⚠️  No se pudo cargar el logo, se usará el HTML sin logo:', error.message);
    }

    const html = this.generarHTML(contratoData, empresaData, logoPath);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: rutaSalida,
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '16mm',
          right: '19mm',
          bottom: '5mm',
          left: '19mm'
        }
      });

      console.log(`✅ PDF del contrato generado: ${rutaSalida}`);

    } finally {
      await browser.close();
    }
  }
}

module.exports = ContratoPDFGeneratorMINTIC;
