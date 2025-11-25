// backend/utils/ContratoPDFGeneratorMINTIC.js

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGeneratorMINTIC {

  static async generarHTML(contratoData, empresaData, logoPath = '') {
    // Formateo de fechas y valores
    const fechaHoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Cálculos básicos
    const precioInternet = parseFloat(contratoData.precio_internet || 0);
    const precioTelevision = parseFloat(contratoData.precio_television || 0);
    const valorTotal = precioInternet + precioTelevision;
    const permanenciaMeses = parseInt(contratoData.permanencia_meses || 1);
    const tienePermanencia = permanenciaMeses > 0; // Se asume que siempre se genera si el contrato lo pide

    // Fecha activación estimada (15 días hábiles)
    const fechaActivacion = new Date();
    fechaActivacion.setDate(fechaActivacion.getDate() + 15);
    const fechaActivacionStr = fechaActivacion.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    // Determinar servicios para los checkboxes
    const tieneInternet = precioInternet > 0;
    const tieneTV = precioTelevision > 0;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato Único</title>
    <style>
        @page {
            size: Letter;
            margin: 10mm 10mm; /* Márgenes ajustados al PDF */
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: Arial, Helvetica, sans-serif; /* Misma letra */
            font-size: 8px; /* Tamaño letra similar al PDF denso */
            line-height: 1.1;
            color: #000;
            margin: 0;
            padding: 0;
        }
        .page-break {
            page-break-after: always;
            height: 0;
            display: block;
            clear: both;
        }
        
        /* HEADER */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
        }
        .header-logo {
            width: 20%;
            vertical-align: top;
        }
        .header-logo img {
            max-width: 100px;
            max-height: 50px;
        }
        .header-center {
            width: 50%;
            text-align: center;
            vertical-align: middle;
        }
        .header-right {
            width: 30%;
            text-align: right;
            vertical-align: top;
        }
        .company-name { font-weight: bold; font-size: 10px; }
        .contract-title { font-weight: bold; font-size: 10px; margin-bottom: 2px; }
        
        /* TABLAS DE INFORMACIÓN */
        .section-title {
            background-color: #e6e6e6; /* Gris claro de fondo */
            font-weight: bold;
            text-align: center;
            border: 1px solid #000;
            padding: 2px;
            font-size: 8.5px;
            margin-top: 5px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 5px;
        }
        .info-table td {
            border: 1px solid #000;
            padding: 2px 4px;
            vertical-align: middle;
        }
        .label {
            font-weight: bold;
            width: 1%;
            white-space: nowrap;
            background-color: #f9f9f9;
        }
        
        /* TEXTO INTRODUCTORIO */
        .intro-text {
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 5px;
            text-align: justify;
        }

        /* COLUMNAS */
        .columns-container {
            display: flex;
            width: 100%;
            gap: 5px;
        }
        .column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        /* CAJAS DE CONTENIDO (BORDERS) */
        .content-box {
            border: 1px solid #000;
            padding: 0; /* Title está adentro */
        }
        .box-header {
            background-color: #e6e6e6;
            font-weight: bold;
            text-align: center;
            padding: 2px;
            border-bottom: 1px solid #000;
        }
        .box-body {
            padding: 4px;
            text-align: justify;
        }

        /* CHECKBOXES */
        .checkbox-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        .cb-item { display: flex; align-items: center; }
        .square {
            width: 10px; height: 10px; border: 1px solid #000;
            display: inline-block; margin-right: 3px;
            text-align: center; line-height: 8px; font-size: 8px;
        }

        /* LISTAS */
        ol { margin: 0; padding-left: 15px; }
        li { margin-bottom: 2px; }

        /* TOTAL */
        .total-box {
            border: 1px solid #000;
            padding: 3px;
            font-weight: bold;
            text-align: center;
            background: #fff;
            margin: 5px 0;
        }

        /* FIRMAS */
        .signature-section {
            margin-top: 10px;
            text-align: center;
        }
        .signature-box {
            border: 1px solid #000;
            display: inline-block;
            padding: 5px 20px;
            margin-top: 5px;
        }
        .footer-link {
            text-align: center;
            font-size: 7px;
            margin-top: 5px;
        }
        
        /* UTILS */
        .bold { font-weight: bold; }
        .center { text-align: center; }
        .justify { text-align: justify; }
        .uppercase { text-transform: uppercase; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td class="header-logo">
                ${logoPath ? `<img src="${logoPath}" alt="Logo">` : '<div class="bold" style="font-size:14px">PSI</div>'}
                <div style="font-size: 7px; margin-top: 2px;">Únete a PSI</div>
            </td>
            <td class="header-center">
                <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES S.A.S</div>
                <div style="font-size: 9px;">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
            </td>
            <td class="header-right">
                <div class="contract-title">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                <div>Contrato No. <span class="bold">${contratoData.numero_contrato}</span></div>
                <div>Fecha: ${fechaHoy}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">INFORMACIÓN DEL SUSCRIPTOR</div>
    <table class="info-table">
        <tr>
            <td class="label">Departamento</td>
            <td>${contratoData.departamento_nombre || 'Santander'}</td>
            <td class="label">Municipio</td>
            <td>${contratoData.ciudad_nombre || 'San Gil'}</td>
        </tr>
        <tr>
            <td class="label">Nombre</td>
            <td>${contratoData.cliente_nombre}</td>
            <td class="label">Identificación</td>
            <td>${contratoData.cliente_identificacion}</td>
        </tr>
        <tr>
            <td class="label">Teléfono de contacto</td>
            <td>${contratoData.cliente_telefono}</td>
            <td class="label">Correo electrónico</td>
            <td>${contratoData.cliente_email}</td>
        </tr>
        <tr>
            <td class="label">Dirección servicio</td>
            <td colspan="3">${contratoData.cliente_direccion}</td>
        </tr>
        <tr>
            <td class="label">Dirección suscriptor</td>
            <td>${contratoData.cliente_direccion}</td> <td class="label">Estrato</td>
            <td>${contratoData.cliente_estrato || '2'}</td>
        </tr>
    </table>

    <div class="intro-text">
        Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente <strong>$${this.formatMoney(valorTotal)}</strong>.
        Este contrato tendrá vigencia de <strong>${permanenciaMeses} mes(es)</strong>, contados a partir del día de la instalación.
        El plazo máximo de instalación es de 15 días hábiles. Acepto que mi contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de 1 mes(es).
    </div>

    <div class="columns-container">
        <div class="column">
            
            <div class="content-box">
                <div class="box-header">EL SERVICIO</div>
                <div class="box-body">
                    Con este contrato nos comprometemos a prestarle los servicios que usted elija*:
                    <div class="checkbox-row">
                        <div class="cb-item"><span class="square">${tieneInternet ? 'X' : ''}</span>Internet Fijo</div>
                        <div class="cb-item"><span class="square">${tieneTV ? 'X' : ''}</span>Televisión</div>
                    </div>
                    <div class="checkbox-row">
                        <div class="cb-item"><span class="square"></span>Servicios adicionales</div>
                        <div class="cb-item"><span class="square"></span>Publicidad</div>
                    </div>
                    <div style="margin-top: 4px;">
                        Usted se compromete a pagar oportunamente el precio acordado. El servicio se activará a más tardar el día <strong>${fechaActivacionStr}</strong>
                    </div>
                </div>
            </div>

            <div class="content-box">
                <div class="box-header">CONDICIONES COMERCIALES</div>
                <div class="box-body">
                    <div class="bold center" style="margin-bottom: 2px;">CARACTERÍSTICAS DEL PLAN</div>
                    ${tieneInternet ? `<div>INTERNET FIBRA $${this.formatMoney(precioInternet)} - ${contratoData.plan_nombre || 'INTERNET FIBRA'}</div>` : ''}
                    ${tieneTV ? `<div>TELEVISION $${this.formatMoney(precioTelevision)} - ESTRATO ${contratoData.cliente_estrato}</div>` : ''}
                    <div style="margin-top: 3px; font-size: 7px;">
                        CLAUSULA PERMANENCIA ${permanenciaMeses} MESES - MODEM EN CALIDAD DE PRESTAMO
                    </div>
                </div>
            </div>

            <div class="total-box">
                Valor Total $${this.formatMoney(valorTotal)}
            </div>

            <div class="content-box">
                <div class="box-header">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                <div class="box-body">
                    <ol>
                        <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.</li>
                        <li>Suministrar información verdadera.</li>
                        <li>Hacer uso adecuado de los equipos y los servicios.</li>
                        <li>No divulgar ni acceder a pornografia infantil (Consultar anexo).</li>
                        <li>Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.</li>
                        <li>No cometer o ser partícipe de actividades de fraude.</li>
                    </ol>
                </div>
            </div>

            <div class="content-box">
                <div class="box-header">CALIDAD Y COMPENSACIÓN</div>
                <div class="box-body">
                    Cuando se presente indisponibilidad del servicio o este se suspenda a pesar de Su pago oportuno, lo compensaremos en su próxima factura. Debemos cumplir con las condiciones de calidad definidas por la CRC.
                    Consúltelas en www.psi.net.co/indicadoresdecalidad.
                </div>
            </div>
            <div style="font-size: 7px; margin-top: 2px;">* Espacio diligenciado por el usuario</div>

        </div>

        <div class="column">
            
            <div class="content-box">
                <div class="box-header">CESIÓN</div>
                <div class="box-body">
                    Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito a través de nuestros Medios de Atención, acompañada de la aceptación por escrito de la persona a la que se hará la cesión.
                    Dentro de los 15 días hábiles siguientes, analizaremos su solicitud y le daremos una respuesta. Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
                </div>
            </div>

            <div class="content-box">
                <div class="box-header">MODIFICACIÓN</div>
                <div class="box-body">
                    Nosotros no podemos modificar el contrato sin su autorización. Esto incluye que no podemos cobrarle servicios que no haya aceptado expresamente. Si esto ocurre tiene derecho a terminar el contrato, incluso estando vigente la cláusula de permanencia mínima, sin la obligación de pagar suma alguna por este concepto. No obstante, usted puede en cualquier momento modificar los servicios contratados. Dicha modificación se hará efectiva en el período de facturación siguiente, para lo cual deberá presentar la solicitud de modificación por lo menos 3 días hábiles de anterioridad al corte de facturación.
                </div>
            </div>

            <div class="content-box">
                <div class="box-header">SUSPENSIÓN</div>
                <div class="box-body">
                    Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Para esto debe presentar la solicitud antes del inicio del ciclo de facturación que desea suspender. Si existe una cláusula de permanencia mínima, su vigencia se prorrogará por el tiempo que dure la suspensión.
                </div>
            </div>

            <div class="content-box">
                <div class="box-header">TERMINACIÓN</div>
                <div class="box-body">
                    Usted puede terminar el contrato en cualquier momento sin penalidades. Para esto debe realizar una solicitud a través de cualquiera de nuestros Medios de Atención mínimo 3 días hábiles antes del corte de facturación (su corte de facturación es el día 1 de cada mes). Si presenta la solicitud con una anticipación menor, la terminación del servicio se dará en el siguiente período de facturación. Así mismo, usted puede cancelar cualquiera de los servicios contratados, para lo que le informaremos las condiciones en las que serán prestados los servicios no cancelados y actualizaremos el contrato.
                </div>
            </div>

        </div>
    </div>

    <div class="page-break"></div>

    <table class="header-table" style="border-bottom: 1px solid #000; margin-bottom: 10px;">
        <tr>
            <td class="header-logo"><div class="bold">PSI</div></td>
            <td class="header-center"><div class="bold">ANEXO CONDICIONES GENERALES</div></td>
            <td class="header-right">${contratoData.numero_contrato}</td>
        </tr>
    </table>

    <div class="columns-container">
        <div class="column">
            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">PAGO Y FACTURACIÓN:</span> La factura le debe llegar como minimo 5 días hábiles antes de la fecha de pago. Si no llega, puede solicitarla a través de nuestros Medios de Atención y debe pagarla oportunamente. Si no paga a tiempo, previo aviso, suspenderemos su servicio hasta que pague sus saldos pendientes. Contamos con 3 días hábiles luego de su pago para reconectarle el servicio. Si no paga a tiempo, también podemos reportar su deuda a las centrales de riesgo. Para esto tenemos que avisarle por lo menos con 20 dias calendario de anticipación. Si paga luego de este reporte tenemos la obligación dentro del mes de seguimiento de informar su pago para que ya no aparezca reportado. Si tiene un reclamo sobre su factura, puede presentarlo antes de la fecha de pago y en ese caso no debe pagar las sumas reclamadas hasta que resolvamos su solicitud. Si ya pagó, tiene 6 meses para presentar la reclamación.
                <br><em>Con esta firma acepta recibir la factura por medios electrónicos.</em>
            </div>

            <div class="content-box" style="margin-bottom: 8px;">
                <div class="box-header">CÓMO COMUNICARSE CON NOSOTROS (MEDIOS DE ATENCIÓN)</div>
                <div class="box-body">
                    <ol style="padding-left: 20px;">
                        <li>Nuestros medios de atención son: oficinas fisicas, página web, redes sociales y lineas telefónicas gratuitas.</li>
                        <li>Presente cualquier queja, petición/reclamo o recurso a través de estos medios y le responderemos en máximo 15 días hábiles.</li>
                        <li>Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama <strong>silencio administrativo positivo</strong> y aplica para internet.</li>
                    </ol>
                    <div style="margin-top: 4px;">
                        <strong>Si no está de acuerdo con nuestra respuesta:</strong> Cuando su queja o petición sea por los servicios de internet, y esté relacionada con actos de negativa del contrato, suspensión del servicio, terminación del contrato, corte y facturación usted puede insistir en su solicitud ante nosotros, dentro de los 10 días hábiles siguientes a la respuesta, y pedir que si no llegamos a una solución satisfactoria para usted, enviemos su reclamo directamente a la SIC (Superintendencia de Industria y comercio). Esto se llama recurso de reposición y en subsidio apelación.
                    </div>
                </div>
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">CAMBIO DE DOMICILIO:</span> Usted puede cambiar de domicilio y continuar con el servicio siempre que sea técnicamente posible. Si desde el punto de vista técnico no es viable el traslado del servicio, usted puede ceder su contrato a un tercero o terminarlo pagando el valor de la cláusula de permanencia mínima si esta vigente.
            </div>
        </div>

        <div class="column">
            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">COBRO POR RECONEXIÓN DEL SERVICIO:</span> En caso de suspensión del servicio por mora en el pago, podremos cobrarle un valor por reconexión que corresponderá estrictamente a los costos asociados a la operación de reconexión. En caso de servicios empaquetados procede máximo un cobro de reconexión. Costo reconexión: $10.000 + iva.
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                El usuario es el ÚNICO responsable por el contenido y la información que se curse a través de la red y del uso que se haga de los equipos o de los servicios. Los equipos de comunicaciones que ya no use son desechos que no deben ser botados a la caneca, consulte nuestra política de recolección.
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">LOS CANALES DE TELEVISIÓN:</span> se debe entender como ofertas generales no caracterizadas por ningún canal; por lo anterior el usuario expresamente autoriza a PSI para que, por razones de orden técnico o comercial, suprima, amplie o modifique los canales.
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">SUSPENSIÓN Y TERMINACIÓN POR:</span> incumpliendo de sus obligaciones, incluyendo el no pago de 1 o más facturas consecutivas, Fuerza mayor/caso fortuito: Uso inadecuado de la red o del servicio; Por prevencion de fraude; no viabilidad técnica.
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">EL USUARIO RESPONDE POR:</span> los equipos entregados para prestación y operación del servicio y autoriza el cobro de su reposición por daño o pérdida. Deberá entregarlos a la terminación del contrato, de no hacerlo pagará el valor comercial.
            </div>

            <div class="justify" style="margin-bottom: 8px;">
                <span class="bold">LAS TARIFAS:</span> podrán incrementar por mes o año sin superar el 50% de la tarifa antes del incremento.
                <br><span class="bold">EL INTERÉS DE MORA:</span> es el máximo legal.
                <br><span class="bold">ESTE CONTRATO PRESTA MÉRITO EJECUTIVO.</span>
            </div>
        </div>
    </div>

    <div class="signature-section">
        <div class="bold">Aceptación contrato mediante firma o cualquier otro medio válido</div>
        <div class="signature-box">
             <span class="bold">CC/CE:</span> ${contratoData.cliente_identificacion} &nbsp;&nbsp;&nbsp; 
             <span class="bold">FECHA:</span> ${fechaHoy}
        </div>
        <div class="footer-link">Consulte el régimen de protección de usuarios en www.crcom.gov.co</div>
    </div>

    <div class="page-break"></div>

    <table class="header-table">
        <tr>
            <td class="header-logo">
                ${logoPath ? `<img src="${logoPath}" alt="Logo">` : '<div class="bold" style="font-size:14px">PSI</div>'}
            </td>
            <td class="header-center">
                <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES SAS</div>
                <div style="font-size: 9px;">NIT: ${empresaData.empresa_nit}</div>
            </td>
            <td class="header-right">
                <div class="contract-title">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                <div>Contrato No. <span class="bold">${contratoData.numero_contrato}</span></div>
            </td>
        </tr>
    </table>

    <div class="section-title">INFORMACIÓN DEL SUSCRIPTOR</div>
    <table class="info-table">
        <tr>
            <td class="label">Nombre</td>
            <td>${contratoData.cliente_nombre}</td>
            <td class="label">Identificación</td>
            <td>${contratoData.cliente_identificacion}</td>
        </tr>
        <tr>
            <td class="label">Departamento</td>
            <td>${contratoData.departamento_nombre}</td>
            <td class="label">Municipio</td>
            <td>${contratoData.ciudad_nombre}</td>
        </tr>
        <tr>
            <td class="label">Dirección</td>
            <td colspan="3">${contratoData.cliente_direccion}</td>
        </tr>
    </table>

    <div class="section-title" style="margin-top: 15px;">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
    <div class="content-box" style="margin-top: 5px; border: none;">
        <div class="box-body" style="font-size: 9px; line-height: 1.4;">
            Señor usuario, el presente contrato lo obliga a estar vinculado con <strong>PROVEEDOR DE TELECOMUNICACIONES SAS</strong> durante un tiempo de <strong>${permanenciaMeses} mes(es)</strong>. Además, cuando venza el plazo indicado, el presente contrato se renovará en forma automática indefinidamente.
            <br><br>
            En caso que usted decida terminar el contrato antes de que venza el periodo de permanencia mínima señalado, usted deberá pagar los valores que se determinan a continuación. En caso de que el usuario que celebró el contrato lo dé por terminado antes del vencimiento del periodo estipulado, pagará una suma equivalente al valor del servicio mensual por los meses faltantes para la terminación de la permanencia mínima, dividido en dos.
            <br><br>
            Su fórmula es:
            <div class="center bold" style="margin: 10px 0; border: 1px dashed #000; padding: 5px;">
                VALOR TERMINACIÓN = ((VALOR MENSUAL * MESES FALTANTES) / 2)
            </div>
            Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado en la presente cláusula, y queda vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS de acuerdo con las condiciones del presente contrato.
            <br><br>
            <strong>Prórroga:</strong> El usuario que celebró el contrato conoce y acepta la prórroga automática del plan tarifario estipulada en el clausulado del contrato.
        </div>
    </div>

    <div class="signature-section" style="margin-top: 50px;">
        <div style="border-top: 1px solid #000; width: 250px; margin: 0 auto;"></div>
        <div style="margin-top: 5px;">Firma del usuario que celebró el contrato</div>
    </div>

</body>
</html>
    `;
  }

  static formatMoney(amount) {
    return new Intl.NumberFormat('es-CO').format(amount);
  }
}

module.exports = ContratoPDFGeneratorMINTIC;