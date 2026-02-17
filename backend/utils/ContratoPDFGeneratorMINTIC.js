// backend/utils/ContratoPDFGeneratorMINTIC.js
// Generador de PDF de contratos IDÉNTICO al modelo Word de PSI
// **VERSIÓN CORREGIDA** - Replica exactamente el formato del modelo real
// **AJUSTE PÁGINA 2** - Optimizado para que todo quepa en una sola hoja

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGeneratorMINTIC {

  static generarHTML(contratoData, empresaData, logoPath = '') {
    // Usar fecha de generación del contrato, no la fecha actual
    const fechaGeneracion = contratoData.created_at || contratoData.fecha_generacion || new Date();
    const fechaHoy = new Date(fechaGeneracion).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Calcular fecha de activación: 15 días después de la generación
    const fechaActivacion = new Date(fechaGeneracion);
    fechaActivacion.setDate(fechaActivacion.getDate() + 15);
    const fechaActivacionTexto = fechaActivacion.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ✅ CORRECCIÓN: Calcular el total sumando TODOS los servicios
const servicios = this.determinarServicios(contratoData);

// Calcular valor total y valor IVA sumando TODOS los servicios
let valorTotal = 0;
let valorTotalIVA = 0;
let valorTotalConIVA = 0;
if (contratoData.servicios && Array.isArray(contratoData.servicios)) {
  contratoData.servicios.forEach(servicio => {
    const precioBase = parseFloat(servicio.precio_plan || servicio.precio || 0);
    const valorIVA = parseFloat(servicio.valor_iva || 0);
    valorTotal += precioBase;
    valorTotalIVA += valorIVA;
    valorTotalConIVA += servicio.precio_con_iva ? parseFloat(servicio.precio_con_iva) : (precioBase + valorIVA);
  });
}

// Verificar si algún servicio aplica IVA
let algunServicioConIVA = false;
if (contratoData.servicios && Array.isArray(contratoData.servicios)) {
  algunServicioConIVA = contratoData.servicios.some(servicio =>
    servicio.aplica_iva === 1 || servicio.aplica_iva === true
  );
}
const textoIVATotal = algunServicioConIVA ? ` + IVA ($${this.formatearPrecio(valorTotalIVA)})` : '';

console.log('💰 Valor total calculado para contrato:', {
  numero_contrato: contratoData.numero_contrato,
  cantidad_servicios: contratoData.servicios?.length || 0,
  valor_total: valorTotal,
  aplica_iva: algunServicioConIVA
});

const permanenciaMeses = parseInt(contratoData.permanencia_meses || 1);
const tienePermanencia = permanenciaMeses > 1;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato PSI - ${contratoData.numero_contrato}</title>
    <style>
        @page {
            size: Letter;
            margin: 19mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Calibri, Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.1;
            color: #000;
        }

        /* ENCABEZADO */
        .header {
            display: flex;
            align-items: flex-start;
            margin-bottom: 3mm;
        }

        .header-left {
            width: 15%;
        }

        .logo-img {
            width: 100%;
            max-width: 80px;
        }

        .header-center {
            width: 55%;
            text-align: center;
            padding: 0 10px;
        }

        .company-name {
            font-size: 9pt;
            font-weight: bold;
        }

        .company-nit {
            font-size: 9pt;
        }

        .header-right {
            width: 30%;
            text-align: right;
        }

        .contract-title {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 2mm;
        }

        .contract-date {
            font-size: 9pt;
        }

        /* SECCIÓN INFORMACIÓN DEL SUSCRIPTOR */
        .section-title {
            background-color: #d0d0d0;
            text-align: center;
            font-weight: bold;
            font-size: 9pt;
            padding: 2px;
            margin: 3mm 0 2mm 0;
            border: 1px solid #000;
        }

        /* INFORMACIÓN DEL SUSCRIPTOR - FORMATO SIMPLE */
        .info-block {
            margin-bottom: 3mm;
            font-size: 9pt;
            line-height: 1.3;
        }

        .info-line {
            margin-bottom: 1.5mm;
        }

        .info-label {
            font-weight: bold;
            display: inline;
        }

        .info-value {
            display: inline;
            margin-left: 3px;
        }

        /* TEXTO INTRO */
        .intro-box {
            border: 1px solid #000;
            padding: 3px 4px;
            margin-bottom: 2mm;
        }

        .intro-text {
            text-align: justify;
            font-size: 8.5pt;
            line-height: 1.2;
        }

        .city-name {
            text-align: center;
            font-weight: bold;
            font-size: 9pt;
            margin: 2mm 0;
        }

        /* COLUMNAS - USANDO CSS COLUMNS */
        .two-columns {
            column-count: 2;
            column-gap: 6mm;
            min-height: 400px;
        }

        /* PÁGINA 2 - OPTIMIZADA PARA UNA SOLA HOJA */
        .two-columns-page2 {
            column-count: 2;
            column-gap: 4mm;
            min-height: 250px;
        }

        .column-content {
            break-inside: avoid-column;
            margin-bottom: 1.5mm;
        }

        /* CAJAS DE CONTENIDO */
        .content-box {
            margin-bottom: 2mm;
            break-inside: avoid;
        }

        .box-title {
            background-color: #d0d0d0;
            border: 1px solid #000;
            padding: 2px;
            font-weight: bold;
            font-size: 9pt;
            text-align: center;
            margin-bottom: 1mm;
        }

        .box-content {
            padding: 0;
            font-size: 8.5pt;
            line-height: 1.1;
            text-align: justify;
        }

        .box-content p {
            margin-bottom: 2px;
        }

        /* CAJAS PÁGINA 2 - MÁS COMPACTAS */
        .content-box-page2 {
            margin-bottom: 1.5mm;
            break-inside: avoid;
        }

        .box-content-page2 {
            padding: 0;
            font-size: 7.5pt;
            line-height: 1.05;
            text-align: justify;
        }

        .box-content-page2 p {
            margin-bottom: 1.5px;
        }

        /* CHECKBOXES */
        .checkboxes {
            margin: 2px 0;
        }

        .checkbox {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 1.5px solid #000;
            margin-right: 2px;
            text-align: center;
            line-height: 8px;
            font-size: 8pt;
        }

        .checkbox.checked::before {
            content: "✓";
        }

        /* VALOR TOTAL */
        .valor-total {
            border: 1px solid #000;
            padding: 2px;
            text-align: center;
            font-weight: bold;
            margin: 2mm 0;
            font-size: 8.5pt;
        }

        /* LISTA NUMERADA */
        .numbered-list {
            list-style: none;
            counter-reset: item;
            padding-left: 0;
            margin: 2px 0;
        }

        .numbered-list li {
            counter-increment: item;
            margin-bottom: 2px;
            padding-left: 15px;
            position: relative;
            font-size: 7.5pt;
        }

        .numbered-list li::before {
            content: counter(item) ")";
            position: absolute;
            left: 0;
            font-weight: bold;
        }

        /* PÁGINA 2 - SIN COLUMNAS */
        .page-break {
            page-break-after: always;
        }

        .legal-text {
            font-size: 7.5pt;
            text-align: justify;
            line-height: 1.15;
        }

        .legal-text p {
            margin-bottom: 2mm;
        }

        .legal-text strong {
            font-weight: bold;
        }

        /* CAJA DE CONTACTO - OPTIMIZADA */
        .contact-box {
            border: 1px solid #000;
            padding: 2mm;
            margin: 2mm 0 3mm 0;
        }

        .contact-title {
            text-align: center;
            font-weight: bold;
            font-size: 8.5pt;
            margin-bottom: 1.5mm;
        }

        .contact-item {
            display: flex;
            margin-bottom: 1.5mm;
            align-items: flex-start;
        }

        .contact-number {
            min-width: 18px;
            height: 18px;
            border: 1.5px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 3px;
            flex-shrink: 0;
            font-size: 7.5pt;
        }

        .contact-text {
            flex: 1;
            font-size: 7pt;
            line-height: 1.1;
            text-align: justify;
        }

        /* FIRMA - COMPACTA */
        .signature-section {
            margin-top: 6mm;
            text-align: center;
        }

        .signature-note {
            font-size: 7.5pt;
            margin-bottom: 1.5mm;
        }

        .signature-title {
            font-weight: bold;
            font-size: 8.5pt;
            margin-bottom: 1.5mm;
        }

        .signature-data {
            border: 1px solid #000;
            display: inline-block;
            padding: 2px 8px;
            margin-bottom: 1.5mm;
            font-size: 7.5pt;
        }

        .signature-line {
            width: 250px;
            height: 60px;
            border-bottom: 2px solid #000;
            margin: 8mm auto 1.5mm auto;
            position: relative;
            display: flex;
            align-items: flex-end;
        }

        .footer-text {
            font-size: 7pt;
            text-align: center;
        }

        .small-note {
            font-size: 7pt;
            font-style: italic;
            margin-top: 2mm;
        }
    </style>
</head>
<body>
    <!-- PÁGINA 1 -->
    <div class="page">
        ${this.generarEncabezado(logoPath, fechaHoy)}
        
        <!-- INFORMACIÓN DEL SUSCRIPTOR -->
        <div class="section-title">INFORMACIÒN DEL SUSCRIPTOR</div>
        
        <div class="info-block">
            <div class="info-line">
                <span class="info-label">Contrato No.</span>
                <span class="info-value">${contratoData.numero_contrato || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Departamento</span>
                <span class="info-value">${contratoData.departamento_nombre || 'Santander'}</span>
                <span class="info-label" style="margin-left: 30px;">Municipio</span>
                <span class="info-value">${contratoData.ciudad_nombre || 'San Gil'}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Nombre</span>
                <span class="info-value">${contratoData.cliente_nombre || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Correo electrónico</span>
                <span class="info-value">${contratoData.cliente_email || ''}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Identificación</span>
                <span class="info-value">${contratoData.cliente_identificacion || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Teléfono de contacto</span>
                <span class="info-value">${contratoData.cliente_telefono || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Estrato</span>
                <span class="info-value">${contratoData.cliente_estrato || ''}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Dirección servicio</span>
                <span class="info-value">${contratoData.cliente_direccion || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Dirección suscriptor</span>
                <span class="info-value">${contratoData.cliente_direccion || ''}</span>
            </div>
        </div>

        <div class="intro-box">
            <p class="intro-text">
                Este contrato explica las condiciones para la prestación de los servicios entre usted y PROVEEDOR DE TELECOMUNICACIONES SAS, por el que pagará mínimo mensualmente $${this.formatearPrecio(valorTotal)}${textoIVATotal}. Este contrato tendrá vigencia de ${permanenciaMeses} mes(es), contados a partir del día de la instalación. El plazo máximo de instalación es de 15 días hábiles. Acepto que mi contrato se renueve sucesiva y automáticamente por un plazo igual al inicial de ${permanenciaMeses} mes(es).
            </p>
        </div>

        <p class="city-name">${contratoData.ciudad_nombre || 'San Gil'}</p>

        <!-- DOS COLUMNAS -->
        <div class="two-columns">
            ${this.generarColumnasContenido(contratoData, servicios, valorTotal, tienePermanencia, permanenciaMeses, fechaActivacionTexto, textoIVATotal)}
        </div>
    </div>

    ${this.generarPagina2(logoPath, fechaHoy, contratoData)}
    ${tienePermanencia ? this.generarPagina3Permanencia(logoPath, fechaHoy, contratoData, permanenciaMeses) : ''}
</body>
</html>`;
  }

  static generarEncabezado(logoPath, fecha) {
    return `
        <div class="header">
            <div class="header-left">
                <img src="${logoPath}" class="logo-img" alt="Logo" />
            </div>
            <div class="header-center">
                <div class="company-name">PROVEEDOR DE TELECOMUNICACIONES</div>
                <div class="company-nit">NIT: 901.582.657-3</div>
            </div>
            <div class="header-right">
                <div class="contract-title">CONTRATO ÚNICO DE SERVICIOS FIJOS</div>
                <div class="contract-date">Fecha ${fecha}</div>
            </div>
        </div>`;
  }

  static generarColumnasContenido(contratoData, servicios, valorTotal, tienePermanencia, meses, fechaActivacionTexto, textoIVATotal = '') {
    return `
            <!-- COLUMNA IZQUIERDA -->
            <div class="column-content">
                <div class="content-box">
                    <div class="box-title">EL SERVICIO</div>
                    <div class="box-content">
                        <p>Con este contrato nos comprometemos a prestarle los servicios que usted elija*:</p>
                        <div class="checkboxes">
                            <span class="checkbox ${servicios.internet ? 'checked' : ''}"></span> Internet Fijo
                            <span class="checkbox ${servicios.television ? 'checked' : ''}" style="margin-left: 10px;"></span> Televisión
                            <span class="checkbox" style="margin-left: 10px;"></span> Publicidad
                        </div>
                        <p>Servicios adicionales_____________________________</p>
                        <p>Usted se compromete a pagar oportunamente el precio acordado. El servicio se activará a más tardar el día ${fechaActivacionTexto}</p>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">CONDICIONES COMERCIALES</div>
                    <div class="box-content">
                        <p>Los servicios contratados estarán sujetos a las tarifas y condiciones establecidas en este documento.</p>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">CARACTERÍSTICAS DEL PLAN</div>
                    <div class="box-content">
                        ${this.generarDetallesServicios(contratoData, servicios)}
                        ${tienePermanencia ? `<p><strong>CLAUSULA PERMENENCIA ${meses} MEESES-MODEN EN CALIDAD DE PRESTAMO</strong></p>` : ''}
                    </div>
                </div>

                <div class="valor-total">
                    Valor Total $${this.formatearPrecio(algunServicioConIVA ? valorTotalConIVA : valorTotal)}${textoIVATotal}
                </div>

                <div class="content-box">
                    <div class="box-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
                    <div class="box-content">
                        <ol class="numbered-list">
                            <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.</li>
                            <li>Suministrar información verdadera.</li>
                            <li>Hacer uso adecuado de los equipos y los servicios. </li>
                            <li>No divulgar ni acceder a pornografía infantil (Consultar anexo). </li>
                            <li>Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.</li>
                            <li>No cometer o ser partícipe de actividades de fraude.</li>
                        </ol>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">CALIDAD Y COMPENSACIÓN</div>
                    <div class="box-content">
                        Cuando se presente indisponibilidad del servicio o este se suspenda a pesar de su pago oportuno, lo compensaremos en su próxima factura. Debemos cumplir con las condiciones de calidad definidas por la CRC. Consúltelas en la página: www.psi.net.co/indicadoresdecalidad.
                    </div>
                </div>

                <p class="small-note">* Espacio dilingenciado por el usuario</p>
            </div>

            <!-- COLUMNA DERECHA -->
            <div class="column-content">
                <div class="content-box">
                    <div class="box-title">CESIÓN</div>
                    <div class="box-content">
                        Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito a través de nuestros Medios de Atención, acompañada de la aceptación por escrito de la persona a la que se hará la cesión. Dentro de los 15 días hábiles siguientes, analizaremos su solicitud y le daremos una respuesta. Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">MODIFICACIÓN</div>
                    <div class="box-content">
                        Nosotros no podemos modificar el contrato sin su autorización. Esto incluye que no podemos cobrarle servicios que no haya aceptado expresamente. Si esto ocurre tiene derecho a terminar el contrato, incluso estando vigente la cláusula de permanencia mínima, sin la obligación de pagar suma alguna por este concepto. No obstante, usted puede en cualquier momento modificar los servicios contratados. Dicha modificación se hará efectiva en el período de facturación siguiente, para lo cual deberá presentar la solicitud de modificación por lo menos 3 días hábiles de anterioridad al corte de facturación.
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">SUSPENSIÓN</div>
                    <div class="box-content">
                        Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Para esto debe presentar la solicitud antes del inicio del ciclo de facturación que desea suspender. Si existe una cláusula de permanencia mínima, su vigencia se prorrogará por el tiempo que dure la suspensión.
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-title">TERMINACIÓN</div>
                    <div class="box-content">
                        Usted puede terminar el contrato en cualquier momento sin penalidades. Para esto debe realizar una solicitud a través de cualquiera de nuestros Medios de Atención mínimo 3 días hábiles antes del corte de facturación (su corte de facturación es el día 1 de cada mes). Si presenta la solicitud con una anticipación menor, la terminación del servicio se dará en el siguiente período de facturación. Así mismo, usted puede cancelar cualquiera de los servicios contratados, para lo que le informaremos las condiciones en las que serán prestados los servicios no cancelados y actualizaremos el contrato. Así mismo, si el operador no inicia la prestación de servicio en el plazo acordado, usted puede pedir la restitución de su dinero y la terminación del contrato.
                    </div>
                </div>
            </div>`;
  }

static generarDetallesServicios(contratoData, servicios) {
  // ✅ CORRECCIÓN: Usar el array de servicios con datos completos
  const listaServicios = contratoData.servicios || [];
  let detalles = '';

  if (listaServicios.length === 0) {
    return '<p>Sin servicios configurados</p>';
  }

  listaServicios.forEach(servicio => {
    const nombrePlan = servicio.plan_nombre || servicio.nombre || 'Servicio';
    const tipoPlan = servicio.tipo_servicio || servicio.tipo || '';
    const precioPlan = parseFloat(servicio.precio_plan || servicio.precio || 0);
    const velocidadBajada = servicio.velocidad_bajada || '';
    const velocidadSubida = servicio.velocidad_subida || '';
    const canalesTV = servicio.canales_tv || '';
    const tecnologia = servicio.tecnologia || '';
    const aplicaIVA = servicio.aplica_iva === 1 || servicio.aplica_iva === true;
    const estrato = contratoData.estrato || contratoData.cliente_estrato || '3';

    const tipo = tipoPlan.toLowerCase();

    const valorIVA = parseFloat(servicio.valor_iva || 0);
    const precioConIVA = parseFloat(servicio.precio_con_iva || (precioPlan + valorIVA));
    const textoIVA = aplicaIVA ? ` + IVA($${this.formatearPrecio(valorIVA)}) = $${this.formatearPrecio(precioConIVA)}` : '';

    if (tipo.includes('internet') || tipo.includes('combo')) {
      let caracteristicas = [];
      if (velocidadBajada) caracteristicas.push(`${velocidadBajada}MB`);
      if (tecnologia) caracteristicas.push(tecnologia);

      const detalleVelocidad = caracteristicas.length > 0 ? caracteristicas.join(' ') : 'Internet';

      detalles += `<p><strong>INTERNET FIBRA $ ${this.formatearPrecio(precioPlan)}${textoIVA}</strong> ${nombrePlan} ${detalleVelocidad} ESTRATO ${estrato}</p>`;
    }

    if (tipo.includes('tv') || tipo.includes('television')) {
      let caracteristicas = [];
      if (canalesTV) caracteristicas.push(`${canalesTV} canales`);

      const detalleCanales = caracteristicas.length > 0 ? caracteristicas.join(' ') : '';

      detalles += `<p><strong>TELEVISION $ ${this.formatearPrecio(precioPlan)}${textoIVA}</strong> ${nombrePlan} ${detalleCanales} ESTRATO ${estrato}</p>`;
    }
  });

  return detalles || '<p>Sin detalles de servicio</p>';
}

  static generarPagina2(logoPath, fecha, contratoData) {
    return `
    <div class="page-break"></div>
    <div class="page">
        ${this.generarEncabezado(logoPath, fecha)}
        
        <!-- PÁGINA 2 EN DOS COLUMNAS - OPTIMIZADA -->
        <div class="two-columns-page2">
            <!-- COLUMNA IZQUIERDA -->
            <div class="column-content">
                <div class="content-box-page2">
                    <div class="box-title">PAGO Y FACTURACIÓN</div>
                    <div class="box-content-page2">
                        <p>La factura le debe llegar como mínimo 5 días hábiles antes de la fecha de pago. Si no llega, puede solicitarla a través de nuestros Medios de Atención y debe pagarla oportunamente. Si no paga a tiempo, previo aviso, suspenderemos su servicio hasta que pague sus saldos pendientes. Contamos con 3 días hábiles luego de su pago para reconectarle el servicio. Si no paga a tiempo, también podemos reportar su deuda a las centrales de riesgo. Para esto tenemos que avisarle por lo menos con 20 días calendario de anticipación. Si paga luego de este reporte tenemos la obligación dentro del mes de seguimiento de informar su pago para que ya no aparezca reportado. Si tiene un reclamo sobre su factura, puede presentarlo antes de la fecha de pago y en ese caso no debe pagar las sumas reclamadas hasta que resolvamos su solicitud. Si ya pagó, tiene 6 meses para presentar la reclamación.</p>
                    </div>
                </div>

                <div class="content-box-page2">
                    <div class="box-title">CAMBIO DE DOMICILIO</div>
                    <div class="box-content-page2">
                        <p>Usted puede cambiar de domicilio y continuar con el servicio siempre que sea técnicamente posible. Si desde el punto de vista técnico no es viable el traslado del servicio, usted puede ceder su contrato a un tercero o terminarlo pagando el valor de la cláusula de permanencia mínima si esta vigente.</p>
                    </div>
                </div>

                <div class="content-box-page2">
                    <div class="box-title">COBRO POR RECONEXIÓN DEL SERVICIO</div>
                    <div class="box-content-page2">
                        <p>En caso de suspensión del servicio por mora en el pago, podremos cobrarle un valor por reconexión que corresponderá estrictamente a los costos asociados a la operación de reconexión. En caso de servicios, empaquetados procede máximo un cobro de reconexión por cada tipo de conexión empleado en la prestación de los servicios. Costo reconexión: $10.000 + iva.</p>
                        <p>El usuario es el ÚNICO responsable por el contenido y la información que se curse a través de la red y del uso que se haga de los equipos o de los servicios.</p>
                        <p>Los equipos de comunicaciones que ya no use son desechos que no deben ser botados a la caneca, consulte nuestra política de recolección de aparatos en desuso.</p>
                    </div>
                </div>
            </div>

            <!-- COLUMNA DERECHA -->
            <div class="column-content">
                <div class="content-box-page2">
                    <div class="box-title">LOS CANALES DE TELEVISIÓN</div>
                    <div class="box-content-page2">
                        <p>Se debe entender como ofertas generales no caracterizadas por ningún canal; por lo anterior el usuario expresamente autoriza a PSI para que, por razones de orden técnico o comercial, suprima, amplíe o modifique los canales que componen la programación del servicio que recibe el usuario.</p>
                    </div>
                </div>

                <div class="content-box-page2">
                    <div class="box-title">SUSPENSIÓN Y TERMINACIÓN POR</div>
                    <div class="box-content-page2">
                        <p>Incumpliendo de sus obligaciones, incluyendo el no pago de 1 o más facturas consecutivas; Fuerza mayor/caso fortuito; Uso inadecuado de la red o del servicio; Por prevencion de fraude; no viabilidad técnica o económica para prestar el servicio; iregularidades en los documentos suministrados; o por evolución tecnológica.</p>
                    </div>
                </div>

                <div class="content-box-page2">
                    <div class="box-title">EL USUARIO RESPONDE POR</div>
                    <div class="box-content-page2">
                        <p>Los equipos entregados para prestación y operación del servicio y autoriza el cobro de su reposición por daño o pérdida. Deberá entregarlos a la terminación del contrato del modo establecido en la regulación, de no hacerlo pagará el valor comercial de los mismos.</p>
                    </div>
                </div>

                <div class="content-box-page2">
                    <div class="box-title">INFORMACIÓN ADICIONAL</div>
                    <div class="box-content-page2">
                        <p><strong>LAS TARIFAS:</strong> podrán incrementar por mes o año sin superar el 50% de la tarifa antes del incremento.</p>
                        <p><strong>EL INTERÉS DE MORA:</strong> es el máximo legal, se cobrarán los gastos de cobranza judicial y extrajudicial.</p>
                        <p><strong>NO RESPONDEMOS:</strong> por lucro cesante, daño indirecto, incidentales o consecuenciales.</p>
                        <p><strong>ESTE CONTRATO PRESTA MÉRITO EJECUTIVO:</strong> para hacer exigibles las obligaciones y prestaciones contenidas en él.</p>
                    </div>
                </div>
            </div>
        </div>

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
                <div class="contact-text">Cuando su queja o petición sea por los servicios de internet, y esté relacionada con actos de negativa del contrato, suspensión del servicio, terminación del contrato, corte y facturación; usted puede insistir en su solicitud ante nosotros, dentro de los 10 días hábiles siguientes a la respuesta, y pedir que si no llegamos a una solución satisfactoria para usted, enviemos su reclamo directamente a la SIC (Superintendencia de Industria y comercio) quien resolverá de manera definitiva su solicitud. Esto se llama recurso de reposición y en subsidio apelación. </div>
            </div>
            <div class="contact-item">
                <div class="contact-number">4</div>
                <div class="contact-text">Cuando su queja o petición sea por el servicio de televisión, puede enviar la misma a la Autoridad Nacional de Televisión, para que esta Entidad resuelva su solicitud.</div>
            </div>
            <p style="margin-top: 1.5mm; font-size: 7pt;">Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama silencio administrativo positivo y aplica para internet.</p>
            <p style="text-align: center; font-weight: bold; margin-top: 1.5mm; font-size: 7.5pt;">Si no está de acuerdo con nuestra respuesta</p>
        </div>

        <div class="signature-section">
            <p class="signature-note">Con esta firma acepta recibir la factura por medios electrónicos</p>
            <p class="signature-title">Aceptación contrato mediante firma o cualquier otro medio válido</p>
            <div class="signature-data">
                <strong>CC/CE</strong> ${contratoData.cliente_identificacion || ''} | <strong>FECHA</strong> ${fecha}
            </div>
            <div class="signature-line"></div>
            <p class="footer-text">Consulte el régimen de protección de usuarios en www.crcom.gov.co</p>
        </div>
    </div>`;
  }

  static generarPagina3Permanencia(logoPath, fecha, contratoData, meses) {
    return `
    <div class="page-break"></div>
    <div class="page">
        ${this.generarEncabezado(logoPath, fecha)}
        
        <div class="section-title">INFORMACIÒN DEL SUSCRIPTOR</div>
        
        <div class="info-block">
            <div class="info-line">
                <span class="info-label">Contrato No.</span>
                <span class="info-value">${contratoData.numero_contrato || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Departamento</span>
                <span class="info-value">${contratoData.departamento_nombre || 'Santander'}</span>
                <span class="info-label" style="margin-left: 30px;">Municipio</span>
                <span class="info-value">${contratoData.ciudad_nombre || 'San Gil'}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Nombre</span>
                <span class="info-value">${contratoData.cliente_nombre || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Correo electrónico</span>
                <span class="info-value">${contratoData.cliente_email || ''}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Identificación</span>
                <span class="info-value">${contratoData.cliente_identificacion || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Teléfono de contacto</span>
                <span class="info-value">${contratoData.cliente_telefono || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Estrato</span>
                <span class="info-value">${contratoData.cliente_estrato || ''}</span>
            </div>

            <div class="info-line">
                <span class="info-label">Dirección servicio</span>
                <span class="info-value">${contratoData.cliente_direccion || ''}</span>
                <span class="info-label" style="margin-left: 30px;">Dirección suscriptor</span>
                <span class="info-value">${contratoData.cliente_direccion || ''}</span>
            </div>
        </div>

        <p class="city-name">${contratoData.ciudad_nombre || 'San Gil'}</p>
        <p style="text-align: center; font-size: 11pt; margin-bottom: 5mm;">Estrato ${contratoData.cliente_estrato || ''}</p>

        <div class="section-title">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
        
        <p class="intro-text" style="margin-top: 5mm;">
            Señor usuario, el presente contrato lo obliga a estar vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. durante un tiempo de ${meses} mes(es), además cuando venza el plazo indicado, el presente contrato se renovará en forma automática indefinidamente, y finalmente, en caso que usted decida terminar el contrato antes de que venza el periodo de permanencia mínima señalado usted deberá pagar los valores que se determinan en el siguiente punto. En caso de que el usuario que celebró el contrato lo dé por terminado antes del vencimiento del periodo estipulado, pagará una suma equivalente al valor del servicio mensual por los meses faltantes para la termininacion de la permanencia mínima, dividido en dos; su forma es: VALOR POR TERMINADO DEL CONTRATO=((VALOR DEL SERVICIO MENSUAL * MESES FALTANTES PARA COMPLETAR LA PERMANENCIA) / 2). Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado en la presente cláusula, y queda vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. de acuerdo con las condiciones del presente contrato. Prórroga: El usuario que celebró el contrato conoce y acepta la prórroga automática del plan tarifario estipulada en el clausurado del contrato.
        </p>

        <div style="height: 50mm;"></div>
        <div class="signature-line"></div>
        <p style="text-align: center; font-weight: bold; font-size: 10pt;">Firma del usuario que celebró el contrato</p>
    </div>`;
  }

static determinarServicios(contratoData) {
  // ✅ CORRECCIÓN: Usar el array de servicios que viene del contrato
  const servicios = contratoData.servicios || [];
  
  let tieneInternet = false;
  let tieneTelevision = false;

  servicios.forEach(servicio => {
    const tipo = (servicio.tipo_servicio || servicio.tipo || '').toLowerCase();
    if (tipo.includes('internet') || tipo.includes('combo')) {
      tieneInternet = true;
    }
    if (tipo.includes('tv') || tipo.includes('television')) {
      tieneTelevision = true;
    }
  });

  return {
    internet: tieneInternet,
    television: tieneTelevision
  };
}

  static formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(Math.round(precio || 0));
  }

  static async generarPDFCompleto(datosContrato) {
    let logoPath = '';
    try {
      const logoFilePath = path.join(__dirname, '../assets/logo2.png');
      const logoBuffer = await fs.readFile(logoFilePath);
      logoPath = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.warn('⚠️  Logo no encontrado');
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
        margin: { top: '19mm', right: '19mm', bottom: '19mm', left: '19mm' }
      });
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  static async generarPDF(contratoData, empresaData, rutaSalida) {
    const pdfBuffer = await this.generarPDFCompleto(contratoData);
    await fs.writeFile(rutaSalida, pdfBuffer);
    console.log(`✅ PDF generado: ${rutaSalida}`);
  }
}

module.exports = ContratoPDFGeneratorMINTIC;