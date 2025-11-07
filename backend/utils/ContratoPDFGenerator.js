// backend/utils/ContratoPDFGenerator.js
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ContratoPDFGenerator {

  static generarHTML(contratoData, empresaData) {
    const fechaHoy = new Date().toLocaleDateString('es-CO');
    const servicios = this.determinarServicios(contratoData);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato ${empresaData.empresa_nombre || 'Proveedor de Telecomunicaciones'} - ${contratoData.numero_contrato}</title>
  <style>

    /* ============================
       CONFIGURACIÓN GENERAL
    ============================ */
    @page {
      size: Letter;
      margin: 12mm;
    }

    body {
      font-family: 'Arial', sans-serif;
      font-size: 10px;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 0;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      padding: 10px;
      box-sizing: border-box;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* ============================
       ENCABEZADO DEL CONTRATO
    ============================ */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.8px solid #000;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .logo {
      font-size: 26px;
      font-weight: bold;
      color: #000;
      letter-spacing: 1px;
    }

    .company-info {
      text-align: center;
      flex: 1;
    }

    .company-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .company-subtitle {
      font-size: 9px;
    }

    .contract-title {
      text-align: right;
      font-size: 10px;
      font-weight: bold;
      line-height: 1.3;
    }

    .contract-box {
      border: 1px solid #000;
      padding: 3px;
      margin-top: 4px;
      display: inline-block;
    }

    /* ============================
       SECCIONES DEL DOCUMENTO
    ============================ */
    .section-box {
      border: 1px solid #000;
      margin-top: 10px;
      padding: 8px;
    }

    .section-title {
      font-weight: bold;
      font-size: 10.5px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #000;
      padding: 4px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .text-content {
      text-align: justify;
      font-size: 9.5px;
      margin-top: 4px;
    }

    /* ============================
       TABLAS DE INFORMACIÓN
    ============================ */
    .info-section {
      border: 1px solid #000;
      margin-top: 10px;
    }

    .info-title {
      font-size: 10.5px;
      font-weight: bold;
      background-color: #f2f2f2;
      border-bottom: 1px solid #000;
      padding: 4px;
    }

    .info-content table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.3px;
    }

    .info-content td {
      padding: 3px 4px;
      border: 1px solid #ccc;
    }

    .info-content td:first-child {
      font-weight: bold;
      background-color: #fafafa;
      width: 25%;
    }

    /* ============================
       SERVICIOS (CHECKBOX)
    ============================ */
    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 9.5px;
    }

    .checkbox-box {
      width: 12px;
      height: 12px;
      border: 1px solid #000;
      text-align: center;
      line-height: 12px;
      font-size: 8px;
      font-weight: bold;
    }

    .checkbox-box.checked {
      background-color: #000;
      color: white;
    }

    /* ============================
       LISTAS DE OBLIGACIONES / TÉRMINOS
    ============================ */
    .obligations-list ol {
      margin: 5px 0;
      padding-left: 18px;
    }

    .obligations-list li {
      margin-bottom: 5px;
      text-align: justify;
    }

    .terms-section {
      margin: 10px 0;
    }

    .terms-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 3px;
      font-size: 9.5px;
    }

    /* ============================
       FIRMAS
    ============================ */
    .signature-section {
      margin-top: 20px;
      border-top: 1px solid #000;
      padding-top: 10px;
    }

    .signature-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 10px;
    }

    .signature-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
    }

    .signature-line {
      border-bottom: 1.5px solid #000;
      width: 280px;
      margin: 20px auto 5px auto;
    }

    .signature-text {
      text-align: center;
      font-weight: bold;
      margin-top: 5px;
    }

    .footer-text {
      font-size: 8.5px;
      text-align: center;
      margin-top: 8px;
    }

  </style>
</head>

<body>

  <!-- PÁGINA 1 -->
  <div class="page">
    ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
    ${this.generarInformacionSuscriptor(contratoData)}
    ${this.generarSeccionServicio(contratoData, servicios)}
    ${this.generarCondicionesComerciales(contratoData)}
    ${this.generarObligacionesUsuario()}
  </div>

  <!-- PÁGINA 2 -->
  <div class="page">
    ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
    ${this.generarTerminosAdicionales()}
    ${this.generarMediosAtencion()}
    ${this.generarSeccionFirmas(contratoData, fechaHoy)}
  </div>

  ${contratoData.tipo_permanencia === 'con_permanencia'
    ? this.generarPaginaPermanencia(contratoData, empresaData, fechaHoy)
    : ''}

</body>
</html>`;
  }
  // ============================
  // ENCABEZADO
  // ============================
  static generarEncabezado(contratoData, empresaData, fechaHoy) {
    return `
      <div class="header">
        <div class="logo-section">
          <div class="logo">${empresaData.empresa_nombre?.split(" ")[0] || 'PSI'}</div>
        </div>
        <div class="company-info">
          <div class="company-title">${empresaData.empresa_nombre?.toUpperCase() || 'PROVEEDOR DE TELECOMUNICACIONES SAS'}</div>
          <div class="company-subtitle">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
        </div>
        <div class="contract-title">
          CONTRATO ÚNICO DE SERVICIOS FIJOS<br/>
          <div class="contract-box">FECHA: ${fechaHoy}</div>
        </div>
      </div>`;
  }

  // ============================
  // INFORMACIÓN DEL SUSCRIPTOR
  // ============================
  static generarInformacionSuscriptor(contratoData) {
    return `
      <div class="info-section">
        <div class="info-title">INFORMACIÓN DEL SUSCRIPTOR</div>
        <div class="info-content">
          <table>
            <tr>
              <td>Contrato No.</td>
              <td>${contratoData.numero_contrato || ''}</td>
              <td>Departamento</td>
              <td>${contratoData.departamento_nombre || ''}</td>
            </tr>
            <tr>
              <td>Nombre</td>
              <td>${contratoData.cliente_nombre || ''}</td>
              <td>Municipio</td>
              <td>${contratoData.ciudad_nombre || ''}</td>
            </tr>
            <tr>
              <td>Identificación</td>
              <td>${contratoData.cliente_identificacion || ''}</td>
              <td>Correo electrónico</td>
              <td>${contratoData.cliente_email || ''}</td>
            </tr>
            <tr>
              <td>Teléfono de contacto</td>
              <td>${contratoData.cliente_telefono || ''}</td>
              <td>Estrato</td>
              <td>${contratoData.cliente_estrato || ''}</td>
            </tr>
            <tr>
              <td>Dirección del servicio</td>
              <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
              <td>Dirección del suscriptor</td>
              <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
          </table>
        </div>
      </div>`;
  }

  // ============================
  // EL SERVICIO
  // ============================
  static generarSeccionServicio(contratoData, servicios) {
    return `
      <div class="section-box">
        <div class="section-title">EL SERVICIO</div>
        <div class="text-content">
          Con este contrato, ${contratoData.empresa_nombre || 'el proveedor'} se compromete a prestarle los servicios que usted elija:
        </div>
        <div class="checkbox-group">
          <div class="checkbox">
            <span class="checkbox-box ${servicios.internet ? 'checked' : ''}">
              ${servicios.internet ? '✓' : ''}
            </span> Internet Fijo
          </div>
          <div class="checkbox">
            <span class="checkbox-box ${servicios.television ? 'checked' : ''}">
              ${servicios.television ? '✓' : ''}
            </span> Televisión
          </div>
          <div class="checkbox">
            <span class="checkbox-box ${servicios.publicidad ? 'checked' : ''}">
              ${servicios.publicidad ? '✓' : ''}
            </span> Publicidad
          </div>
        </div>
        <div class="text-content">
          Usted se compromete a pagar oportunamente el precio acordado. 
          El servicio se activará en un plazo máximo de ______ día(s) hábiles a partir de la instalación.
        </div>
      </div>`;
  }

  // ============================
  // CONDICIONES COMERCIALES
  // ============================
  static generarCondicionesComerciales(contratoData) {
    const valorSinIva = contratoData.plan_precio || 0;
    const valorConIva = valorSinIva * 1.19;

    return `
      <div class="section-box">
        <div class="section-title">CONDICIONES COMERCIALES</div>
        <div class="text-content">
          <strong>Plan:</strong> ${contratoData.plan_nombre || 'Plan de Servicio'}<br/>
          <strong>Valor mensual (sin IVA):</strong> $${this.formatearPrecio(valorSinIva)}<br/>
          <strong>Valor mensual (con IVA 19%):</strong> $${this.formatearPrecio(valorConIva)}<br/>
          ${contratoData.velocidad_bajada ? `<strong>Velocidad de descarga:</strong> ${contratoData.velocidad_bajada} Mbps<br/>` : ''}
          ${contratoData.velocidad_subida ? `<strong>Velocidad de subida:</strong> ${contratoData.velocidad_subida} Mbps<br/>` : ''}
          ${contratoData.plan_descripcion ? `<strong>Descripción:</strong> ${contratoData.plan_descripcion}<br/>` : ''}
          <strong>Costo de instalación:</strong> $${this.formatearPrecio(contratoData.costo_instalacion || 0)}<br/>
          ${contratoData.tipo_permanencia === 'con_permanencia' 
            ? `<strong>Permanencia mínima:</strong> ${contratoData.permanencia_meses || 0} meses<br/>` 
            : ''}
        </div>
      </div>`;
  }

  // ============================
  // OBLIGACIONES DEL USUARIO
  // ============================
  static generarObligacionesUsuario() {
    return `
      <div class="section-box">
        <div class="section-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
        <div class="obligations-list">
          <ol>
            <li>Pagar oportunamente los servicios prestados, incluyendo intereses de mora en caso de incumplimiento.</li>
            <li>Suministrar información veraz, completa y actualizada al proveedor.</li>
            <li>Usar los servicios de manera adecuada y conforme a la ley.</li>
            <li>No divulgar ni acceder a contenidos ilegales o de pornografía infantil.</li>
            <li>Informar a las autoridades cualquier hecho de robo o daño de equipos de red.</li>
            <li>No realizar ni permitir actos de fraude o manipulación indebida del servicio.</li>
          </ol>
        </div>
      </div>`;
  }

  // ============================
  // TÉRMINOS ADICIONALES (Cesión, Modificación, Suspensión, Terminación)
  // ============================
  static generarTerminosAdicionales() {
    return `
      <div class="section-box">
        <div class="section-title">TÉRMINOS Y CONDICIONES ADICIONALES</div>
        <div class="terms-section">
          <div class="terms-title">CESIÓN</div>
          <div class="text-content">
            Si desea ceder este contrato a otra persona, deberá presentar solicitud escrita junto con la aceptación
            del nuevo suscriptor. La empresa responderá en un plazo máximo de quince (15) días hábiles. En caso de
            aceptación, quedará liberado de toda obligación posterior.
          </div>
        </div>
        <div class="terms-section">
          <div class="terms-title">MODIFICACIÓN</div>
          <div class="text-content">
            El proveedor no podrá modificar unilateralmente las condiciones de este contrato, ni cobrar servicios no
            solicitados o aceptados expresamente. Si esto ocurre, el usuario podrá dar por terminado el contrato sin
            penalidades, incluso durante la vigencia de cláusulas de permanencia mínima.
          </div>
        </div>
        <div class="terms-section">
          <div class="terms-title">SUSPENSIÓN</div>
          <div class="text-content">
            El usuario podrá solicitar suspensión temporal del servicio por un máximo de dos (2) meses al año. La solicitud
            deberá presentarse antes del inicio del ciclo de facturación que se desea suspender.
          </div>
        </div>
        <div class="terms-section">
          <div class="terms-title">TERMINACIÓN</div>
          <div class="text-content">
            El usuario podrá terminar este contrato en cualquier momento sin penalidades, mediante solicitud presentada
            con al menos tres (3) días hábiles de antelación al corte de facturación.
          </div>
        </div>
      </div>`;
  }
  // ============================
  // MEDIOS DE ATENCIÓN
  // ============================
  static generarMediosAtencion() {
    return `
      <div class="section-box">
        <div class="section-title">CÓMO COMUNICARSE CON NOSOTROS (MEDIOS DE ATENCIÓN)</div>
        <div class="obligations-list">
          <ol>
            <li>Podrá comunicarse con nosotros a través de nuestras oficinas físicas, líneas telefónicas gratuitas, página web o redes sociales oficiales.</li>
            <li>Podrá presentar solicitudes, peticiones, quejas o reclamos (PQRs) a través de estos canales.</li>
            <li>Recibirá respuesta dentro de los quince (15) días hábiles siguientes a la radicación. Si no recibe respuesta en ese tiempo, se entenderá aceptada su petición conforme al silencio administrativo positivo.</li>
            <li>Si no está de acuerdo con nuestra respuesta, podrá acudir ante la <strong>Superintendencia de Industria y Comercio (SIC)</strong> para hacer valer sus derechos.</li>
          </ol>
        </div>
      </div>`;
  }

  // ============================
  // SECCIÓN DE FIRMAS
  // ============================
  static generarSeccionFirmas(contratoData, fechaHoy) {
    return `
      <div class="signature-section">
        <div class="text-content">
          Aceptación del contrato mediante firma o cualquier otro medio válido en derecho.
        </div>
        <table class="signature-table">
          <tr>
            <td><strong>CC/CE</strong></td>
            <td><strong>FECHA</strong></td>
          </tr>
          <tr>
            <td>${contratoData.cliente_identificacion || ''}</td>
            <td>${fechaHoy}</td>
          </tr>
        </table>
        <div class="signature-line"></div>
        <div class="signature-text">Firma del usuario que celebró el contrato</div>
        <div class="footer-text">
          Consulte el Régimen de Protección de Usuarios en <strong>www.crcom.gov.co</strong>
        </div>
      </div>`;
  }

  // ============================
  // PÁGINA 3: ANEXO DE PERMANENCIA MÍNIMA
  // ============================
  static generarPaginaPermanencia(contratoData, empresaData, fechaHoy) {
    return `
      <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
        ${this.generarInformacionSuscriptor(contratoData)}

        <div class="section-box">
          <div class="section-title">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
          <div class="text-content">
            Señor usuario, el presente contrato lo obliga a estar vinculado con
            <strong>${empresaData.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS'}</strong>
            durante un tiempo de <strong>${contratoData.permanencia_meses || 6}</strong> mes(es).
            <br/><br/>
            Al vencimiento del plazo indicado, el presente contrato se renovará en forma automática e indefinida,
            salvo que el usuario manifieste por escrito su decisión de no continuar con el servicio antes del vencimiento
            del periodo pactado.
            <br/><br/>
            En caso de que el usuario dé por terminado el contrato antes del vencimiento del periodo de permanencia mínima,
            deberá pagar una suma equivalente al valor mensual del servicio multiplicado por los meses faltantes para
            completar la permanencia, dividido en dos (2), conforme a la siguiente fórmula:
            <br/><br/>
            <strong>VALOR POR TERMINACIÓN ANTICIPADA = ((VALOR MENSUAL DEL SERVICIO * MESES FALTANTES) / 2)</strong>
            <br/><br/>
            Una vez aceptada esta condición, el usuario deberá permanecer vinculado durante el tiempo acordado.
            En caso de renovación automática, las condiciones se mantendrán bajo los mismos términos y tarifas,
            salvo acuerdo expreso de modificación entre las partes.
            <br/><br/>
            <strong>PRÓRROGA:</strong> El usuario conoce y acepta que el contrato podrá renovarse automáticamente al finalizar
            el periodo inicial, conforme a la normatividad vigente expedida por la Comisión de Regulación de Comunicaciones (CRC).
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-text">Firma del usuario que celebró el contrato</div>
        </div>
      </div>`;
  }

  // ============================
  // UTILIDADES
  // ============================
  static determinarServicios(contratoData) {
    const servicios = {
      internet: false,
      television: false,
      publicidad: false
    };

    if (contratoData.plan_tipo) {
      switch (contratoData.plan_tipo.toLowerCase()) {
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
        case 'publicidad':
          servicios.publicidad = true;
          break;
      }
    }

    return servicios;
  }

  static formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(precio || 0);
  }
}

module.exports = ContratoPDFGenerator;
