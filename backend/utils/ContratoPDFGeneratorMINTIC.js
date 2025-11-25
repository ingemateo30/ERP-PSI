// backend/utils/ContratoPDFGeneratorMINTIC.js
// Generador de PDF de contratos según modelo MINTIC
// Formato de 2-3 páginas con diseño a 2 columnas

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGeneratorMINTIC {

  /**
   * Generar HTML del contrato según modelo MINTIC
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
    const costoInstalacion = parseFloat(contratoData.costo_instalacion || 0);
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato PSI - ${contratoData.numero_contrato}</title>
    <style>
        @page {
            size: Letter;
            margin: 8mm 10mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 8.5px;
            line-height: 1.2;
            color: #000;
        }

        .page {
            width: 100%;
            min-height: 100vh;
            page-break-after: always;
            position: relative;
        }

        .page:last-child {
            page-break-after: avoid;
        }

        /* Header con logo */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }

        .logo-container {
            flex: 1;
            display: flex;
            justify-content: flex-start;
            align-items: center;
        }

        .logo-img {
            height: 50px;
            width: auto;
        }

        .company-title {
            text-align: center;
            flex: 1;
        }

        .company-name {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 2px;
        }

        .company-nit {
            font-size: 8px;
            color: #333;
        }

        .contract-header {
            text-align: right;
            flex: 1;
        }

        .contract-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .contract-date {
            font-size: 8px;
            padding: 2px 4px;
            border: 1px solid #000;
        }

        /* Layout a dos columnas */
        .two-columns {
            display: table;
            width: 100%;
            table-layout: fixed;
        }

        .column {
            display: table-cell;
            vertical-align: top;
            padding: 0 5px;
        }

        .column:first-child {
            border-right: 1px solid #ccc;
            padding-right: 8px;
        }

        .column:last-child {
            padding-left: 8px;
        }

        /* Sección de información */
        .info-section {
            background: #f0f0f0;
            padding: 4px;
            margin-bottom: 6px;
            border: 1px solid #000;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
            font-size: 8px;
        }

        .info-table td {
            padding: 2px 4px;
            border: 1px solid #ccc;
        }

        .info-table td:first-child {
            font-weight: bold;
            background: #f9f9f9;
            width: 35%;
        }

        /* Cajas de contenido */
        .content-box {
            border: 1px solid #000;
            padding: 6px;
            margin-bottom: 6px;
            font-size: 8px;
            line-height: 1.3;
        }

        .box-title {
            font-weight: bold;
            font-size: 8.5px;
            margin-bottom: 4px;
            text-align: center;
            background: #f0f0f0;
            padding: 3px;
            margin: -6px -6px 4px -6px;
        }

        .box-content {
            text-align: justify;
        }

        /* Checkboxes */
        .service-checkboxes {
            display: flex;
            gap: 10px;
            margin: 4px 0;
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .checkbox {
            width: 11px;
            height: 11px;
            border: 1px solid #000;
            display: inline-block;
            text-align: center;
            line-height: 9px;
            font-size: 8px;
            font-weight: bold;
        }

        .checkbox.checked {
            background: #000;
            color: #fff;
        }

        /* Valor destacado */
        .valor-total {
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            padding: 4px;
            border: 1px solid #000;
            margin: 6px 0;
        }

        /* Numeración */
        .numbered-list {
            counter-reset: item;
            list-style: none;
            padding-left: 15px;
        }

        .numbered-list li {
            counter-increment: item;
            margin-bottom: 3px;
        }

        .numbered-list li::before {
            content: counter(item) ") ";
            font-weight: bold;
        }

        /* Firma */
        .signature-section {
            margin-top: 15px;
            text-align: center;
        }

        .signature-box {
            border: 1px solid #000;
            padding: 3px;
            display: inline-block;
            margin-bottom: 5px;
        }

        .signature-line {
            border-bottom: 2px solid #000;
            width: 250px;
            margin: 15px auto 5px auto;
        }

        .signature-text {
            font-size: 8px;
            font-weight: bold;
        }

        .footer-note {
            font-size: 7px;
            text-align: center;
            margin-top: 10px;
        }

        /* Textos en negrita */
        strong {
            font-weight: bold;
        }

        /* Espaciado de párrafos */
        p {
            margin-bottom: 4px;
        }

        .small-text {
            font-size: 7.5px;
        }
    </style>
</head>
<body>
    <!-- ============================================ -->
    <!-- PÁGINA 1 -->
    <!-- ============================================ -->
    <div class="page">
        <!-- Header -->
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy, logoPath)}

        <!-- Información del Suscriptor - Ocupa todo el ancho -->
        <div class="info-section">INFORMACIÒN DEL SUSCRIPTOR</div>
        <table class="info-table">
            <tr>
                <td>Contrato No.</td>
                <td>${contratoData.numero_contrato || ''}</td>
                <td><strong>Departamento</strong></td>
                <td>${contratoData.departamento_nombre || 'Santander'}</td>
            </tr>
            <tr>
                <td>Nombre</td>
                <td>${contratoData.cliente_nombre || ''}</td>
                <td><strong>Municipio</strong></td>
                <td>${contratoData.ciudad_nombre || 'San Gil'}</td>
            </tr>
            <tr>
                <td>Identificación</td>
                <td>${contratoData.cliente_identificacion || ''}</td>
                <td><strong>Correo electrónico</strong></td>
                <td>${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
                <td>Teléfono de contacto</td>
                <td>${contratoData.cliente_telefono || ''}</td>
                <td><strong>Estrato</strong></td>
                <td>${contratoData.cliente_estrato || ''}</td>
            </tr>
            <tr>
                <td>Dirección servicio</td>
                <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
                <td>Dirección suscriptor</td>
                <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
        </table>

        <!-- Texto introductorio - Ocupa todo el ancho -->
        <p class="box-content" style="margin-bottom: 6px; text-align: justify;">
            Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente $${Math.round(valorTotal)}. Este contrato tendrá vigencia de ${permanenciaMeses} mes(es), contados a partir del día de la instalación. El plazo máximo de instalación es de 15 días hábiles. Acepto que mi contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de ${permanenciaMeses} mes(es).
        </p>

        <p style="text-align: center; font-weight: bold; font-size: 8px; margin-bottom: 6px;">${contratoData.ciudad_nombre || 'San Gil'}</p>

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
                                <span class="checkbox ${servicios.internet ? 'checked' : ''}">${servicios.internet ? '✓' : ''}</span>
                                Internet Fijo
                            </div>
                            <div class="checkbox-item">
                                <span class="checkbox ${servicios.television ? 'checked' : ''}">${servicios.television ? '✓' : ''}</span>
                                Televisión
                            </div>
                            <div class="checkbox-item">
                                <span class="checkbox"></span>
                                Publicidad
                            </div>
                        </div>
                        <p style="margin-top: 4px;">
                            Servicios adicionales__________________________
                        </p>
                        <p style="margin-top: 4px;">
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
                        ${tienePermanencia ? `<p style="margin-top: 4px;"><strong>CLAUSULA PERMENENCIA ${permanenciaMeses} MEESES-MODEN EN CALIDAD DE PRESTAMO</strong></p>` : ''}
                    </div>
                </div>

                <div class="valor-total">
                    Valor Total $${this.formatearPrecio(valorTotal)}
                </div>

                <!-- PRINCIPALES OBLIGACIONES -->
                <div class="content-box">
                    <div class="box-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                    <ol class="numbered-list">
                        <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.</li>
                        <li>Suministrar información verdadera.</li>
                        <li>Hacer uso adecuado de los equipos y los servicios.</li>
                        <li>No divulgar ni acceder a pornografía infantil (Consultar anexo).</li>
                        <li>Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.</li>
                        <li>No cometer o ser partícipe de actividades de fraude.</li>
                    </ol>
                </div>

                <!-- CALIDAD Y COMPENSACIÓN -->
                <div class="content-box">
                    <div class="box-title">CALIDAD Y COMPENSACIÓN</div>
                    <div class="box-content">
                        Cuando se presente indisponibilidad del servicio o este se suspenda a pesar de su pago oportuno, lo compensaremos en su próxima factura. Debemos cumplir con las condiciones de calidad definidas por la CRC. Consúltelas en la página: www.psi.net.co/indicadoresdecalidad.
                    </div>
                </div>

                <p class="small-text" style="margin-top: 6px;">* Espacio dilingenciado por el usuario</p>
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
    ${tienePermanencia ? this.generarPagina3Permanencia(contratoData, empresaData, fechaHoy, logoPath, permanenciaMeses, valorTotal) : ''}
</body>
</html>`;
  }

  static generarEncabezado(contratoData, empresaData, fechaHoy, logoPath) {
    return `
        <div class="header">
            <div class="logo-container">
                <img src="${logoPath}" class="logo-img" alt="Logo PSI" />
            </div>
            <div class="company-title">
                <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES SAS</div>
                <div class="company-nit">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
            </div>
            <div class="contract-header">
                <div class="contract-title">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                <div class="contract-date">Fecha: ${fechaHoy}</div>
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

        <!-- Todo el contenido sin columnas -->
        <div style="font-size: 8px; text-align: justify; line-height: 1.3;">
            <p style="margin-bottom: 8px;">
                <strong>PAGO Y FACTURACIÓN</strong><br/>
                La factura le debe llegar como mínimo 5 días hábiles antes de la fecha de pago. Si no llega, puede solicitarla a través de nuestros Medios de Atención y debe pagarla oportunamente. Si no paga a tiempo, previo aviso, suspenderemos su servicio hasta que pague sus saldos pendientes. Contamos con 3 días hábiles luego de su pago para reconectarle el servicio. Si no paga a tiempo, también podemos reportar su deuda a las centrales de riesgo. Para esto tenemos que avisarle por lo menos con 20 días calendario de anticipación. Si paga luego de este reporte tenemos la obligación dentro del mes de seguimiento de informar su pago para que ya no aparezca reportado. Si tiene un reclamo sobre su factura, puede presentarlo antes de la fecha de pago y en ese caso no debe pagar las sumas reclamadas hasta que resolvamos su solicitud. Si ya pagó, tiene 6 meses para presentar la reclamación.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>CAMBIO DE DOMICILIO</strong><br/>
                Usted puede cambiar de domicilio y continuar con el servicio siempre que sea técnicamente posible. Si desde el punto de vista técnico no es viable el traslado del servicio, usted puede ceder su contrato a un tercero o terminarlo pagando el valor de la cláusula de permanencia mínima si esta vigente.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>COBRO POR RECONEXIÓN DEL SERVICIO</strong><br/>
                En caso de suspensión del servicio por mora en el pago, podremos cobrarle un valor por reconexión que corresponderá estrictamente a los costos asociados a la operación de reconexión. En caso de servicios, empaquetados procede máximo un cobro de reconexión por cada tipo de conexión empleado en la prestación de los servicios. Costo reconexión: $10.000 + iva.
            </p>

            <p style="margin-bottom: 8px;">
                El usuario es el ÚNICO responsable por el contenido y la información que se curse a través de la red y del uso que se haga de los equipos o de los servicios.
            </p>

            <p style="margin-bottom: 8px;">
                Los equipos de comunicaciones que ya no use son desechos que no deben ser botados a la caneca, consulte nuestra política de recolección de aparatos en desuso.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>LOS CANALES DE TELEVISIÓN:</strong> se debe entender como ofertas generales no caracterizadas por ningún canal; por lo anterior el usuario expresamente autoriza a PSI para que, por razones de orden técnico o comercial, suprima, amplíe o modifique los canales que componen la programación del servicio que recibe el usuario.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>SUSPENSIÓN Y TERMINACIÓN POR:</strong> incumpliendo de sus obligaciones, incluyendo el no pago de 1 o más facturas consecutivas; Fuerza mayor/caso fortuito; Uso inadecuado de la red o del servicio; Por prevencion de fraude; no viabilidad técnica o económica para prestar el servicio; iregularidades en los documentos suministrados; o por evolución tecnológica.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>EL USUARIO RESPONDE POR:</strong> los equipos entregados para prestación y operación del servicio y autoriza el cobro de su reposición por daño o pérdida. Deberá entregarlos a la terminación del contrato del modo establecido en la regulación, de no hacerlo pagará el valor comercial de los mismos.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>LAS TARIFAS:</strong> podrán incrementar por mes o año sin superar el 50% de la tarifa antes del incremento.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>EL INTERÉS DE MORA:</strong> es el máximo legal, se cobrarán los gastos de cobranza judicial y extrajudicial.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>NO RESPONDEMOS:</strong> por lucro cesante, daño indirecto, incidentales o consecuenciales.
            </p>

            <p style="margin-bottom: 8px;">
                <strong>ESTE CONTRATO PRESTA MÉRITO EJECUTIVO:</strong> para hacer exigibles las obligaciones y prestaciones contenidas en él.
            </p>

            <div style="margin-top: 12px; border: 1px solid #000; padding: 8px;">
                <p style="font-weight: bold; text-align: center; margin-bottom: 6px;">CÓMO COMUNICARSE CON NOSOTROS<br/>(MEDIOS DE ATENCIÓN)</p>

                <div style="display: flex; align-items: flex-start; margin-bottom: 4px;">
                    <div style="min-width: 20px; height: 20px; border: 1px solid #000; text-align: center; line-height: 18px; font-weight: bold; margin-right: 5px;">1</div>
                    <div>Nuestros medios de atención son: oficinas físicas, página web, redes sociales y líneas telefónicas gratuitas.</div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 4px;">
                    <div style="min-width: 20px; height: 20px; border: 1px solid #000; text-align: center; line-height: 18px; font-weight: bold; margin-right: 5px;">2</div>
                    <div>Presente cualquier queja, petición/reclamo o recurso a través de estos medios y le responderemos en máximo 15 días hábiles.</div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 4px;">
                    <div style="min-width: 20px; height: 20px; border: 1px solid #000; text-align: center; line-height: 18px; font-weight: bold; margin-right: 5px;">3</div>
                    <div>Cuando su queja o petición sea por los servicios de internet, y esté relacionada con actos de negativa del contrato, suspensión del servicio, terminación del contrato, corte y facturación; usted puede insistir en su solicitud ante nosotros, dentro de los 10 días hábiles siguientes a la respuesta, y pedir que si no llegamos a una solución satisfactoria para usted, enviemos su reclamo directamente a la SIC (Superintendencia de Industria y comercio) quien resolverá de manera definitiva su solicitud. Esto se llama recurso de reposición y en subsidio apelación.</div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 4px;">
                    <div style="min-width: 20px; height: 20px; border: 1px solid #000; text-align: center; line-height: 18px; font-weight: bold; margin-right: 5px;">4</div>
                    <div>Cuando su queja o petición sea por el servicio de televisión, puede enviar la misma a la Autoridad Nacional de Televisión, para que esta Entidad resuelva su solicitud.</div>
                </div>

                <p style="margin-top: 6px;">Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama silencio administrativo positivo y aplica para internet.</p>

                <p style="font-weight: bold; text-align: center; margin-top: 8px;">Si no está de acuerdo con nuestra respuesta</p>
            </div>
        </div>

        <!-- Firma -->
        <div class="signature-section">
            <p style="font-size: 7px; text-align: center; margin-bottom: 5px;">Con esta firma acepta recibir la factura por medios electrónicos</p>
            <p style="font-weight: bold; font-size: 8px; margin-bottom: 5px;">Aceptación contrato mediante firma o cualquier otro medio válido</p>
            <div class="signature-box">
                <table style="border-collapse: collapse; font-size: 8px;">
                    <tr>
                        <td style="padding: 3px 10px; border-right: 1px solid #000;"><strong>CC/CE</strong> ${contratoData.cliente_identificacion || ''}</td>
                        <td style="padding: 3px 10px;"><strong>FECHA</strong> ${fechaHoy}</td>
                    </tr>
                </table>
            </div>
            <div class="signature-line"></div>
            <p class="footer-note">Consulte el régimen de protección de usuarios en www.crcom.gov.co</p>
        </div>
    </div>`;
  }

  static generarPagina3Permanencia(contratoData, empresaData, fechaHoy, logoPath, meses, valorMensual) {
    return `
    <!-- ============================================ -->
    <!-- PÁGINA 3 - ANEXO DE PERMANENCIA -->
    <!-- ============================================ -->
    <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy, logoPath)}

        <!-- Información del Suscriptor (repetida) -->
        <div class="info-section">INFORMACIÒN DEL SUSCRIPTOR</div>
        <table class="info-table">
            <tr>
                <td>Contrato No.</td>
                <td>${contratoData.numero_contrato || ''}</td>
                <td><strong>Departamento</strong></td>
                <td>${contratoData.departamento_nombre || 'Santander'}</td>
            </tr>
            <tr>
                <td>Nombre</td>
                <td>${contratoData.cliente_nombre || ''}</td>
                <td><strong>Municipio</strong></td>
                <td>${contratoData.ciudad_nombre || 'San Gil'}</td>
            </tr>
            <tr>
                <td>Identificación</td>
                <td>${contratoData.cliente_identificacion || ''}</td>
                <td><strong>Correo electrónico</strong></td>
                <td>${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
                <td>Teléfono de contacto</td>
                <td>${contratoData.cliente_telefono || ''}</td>
                <td><strong>Estrato</strong></td>
                <td>${contratoData.cliente_estrato || ''}</td>
            </tr>
            <tr>
                <td>Dirección servicio</td>
                <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
                <td>Dirección suscriptor</td>
                <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
        </table>

        <p style="text-align: center; font-weight: bold; font-size: 8px; margin: 6px 0;">${contratoData.ciudad_nombre || 'San Gil'}</p>
        <p style="text-align: center; font-size: 8px; margin-bottom: 8px;">Estrato ${contratoData.cliente_estrato || ''}</p>

        <!-- Anexo de Permanencia -->
        <div class="info-section">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
        <div class="box-content" style="text-align: justify; margin-top: 8px; font-size: 8px; line-height: 1.3;">
            Señor usuario, el presente contrato lo obliga a estar vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. durante un tiempo de ${meses} mes(es), además cuando venza el plazo indicado, el presente contrato se renovará en forma automática indefinidamente, y finalmente, en caso que usted decida terminar el contrato antes de que venza el periodo de permanencia mínima señalado usted deberá pagar los valores que se determinan en el siguiente punto. En caso de que el usuario que celebró el contrato lo dé por terminado antes del vencimiento del periodo estipulado, pagará una suma equivalente al valor del servicio mensual por los meses faltantes para la termininacion de la permanencia mínima, dividido en dos; su forma es: VALOR POR TERMINADO DEL CONTRATO=((VALOR DEL SERVICIO MENSUAL * MESES FALTANTES PARA COMPLETAR LA PERMANENCIA) / 2). Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado en la presente cláusula, y queda vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. de acuerdo con las condiciones del presente contrato. Prórroga: El usuario que celebró el contrato conoce y acepta la prórroga automática del plan tarifario estipulada en el clausurado del contrato.
        </div>

        <!-- Firma -->
        <div class="signature-line" style="margin-top: 40px;"></div>
        <p class="signature-text" style="text-align: center;">Firma del usuario que celebró el contrato</p>
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
    return new Intl.NumberFormat('es-CO').format(precio || 0);
  }

  /**
   * Generar PDF del contrato
   */
  static async generarPDF(contratoData, empresaData, rutaSalida) {
    // Cargar logo como base64
    let logoPath = '';
    try {
      const logoFilePath = path.join(__dirname, '../../frontend/public/logo.png');
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
          top: '8mm',
          right: '10mm',
          bottom: '8mm',
          left: '10mm'
        }
      });

      console.log(`✅ PDF del contrato generado: ${rutaSalida}`);

    } finally {
      await browser.close();
    }
  }
}

module.exports = ContratoPDFGeneratorMINTIC;
