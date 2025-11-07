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
  <title>Contrato PSI - ${contratoData.numero_contrato}</title>
  <style>
    @page { size: Letter; margin: 10mm; }
    body {
      font-family: Arial, sans-serif;
      font-size: 9px;
      line-height: 1.3;
      margin: 0; padding: 0;
      color: #000;
    }

    .page { width: 100%; min-height: 100vh; margin: 0; padding: 0; page-break-after: always; }
    .page:last-child { page-break-after: avoid; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 10px 0 20px 0;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    .logo-section { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 24px; font-weight: bold; color: #000; }

    .company-info { text-align: center; flex: 1; }
    .company-title { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
    .company-subtitle { font-size: 10px; color: #666; }

    .contract-title { text-align: right; font-size: 11px; font-weight: bold; }

    .info-section { margin-bottom: 15px; }
    .info-title {
      font-size: 11px;
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 5px;
      border: 1px solid #000;
      margin-bottom: 5px;
    }

    .info-content table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    .info-content td {
      padding: 3px 5px;
      border: 1px solid #ccc;
    }
    .info-content td:first-child {
      font-weight: bold;
      background-color: #f9f9f9;
      width: 25%;
    }

    .section-box {
      border: 1px solid #000;
      margin: 10px 0;
      padding: 10px;
    }

    .section-title { font-weight: bold; font-size: 11px; margin-bottom: 8px; }

    .checkbox-group { margin: 10px 0; }
    .checkbox { margin: 5px 0; display: flex; align-items: center; gap: 5px; }
    .checkbox-box {
      width: 12px; height: 12px; border: 1px solid #000;
      text-align: center; line-height: 10px; font-size: 8px; font-weight: bold;
    }
    .checkbox-box.checked { background-color: #000; color: white; }

    .text-content {
      font-size: 9px;
      line-height: 1.4;
      margin: 10px 0;
      text-align: justify;
    }

    .obligations-list { font-size: 9px; line-height: 1.4; }
    .obligations-list ol { margin: 0; padding-left: 20px; }
    .obligations-list li { margin-bottom: 5px; }

    .terms-section { margin: 15px 0; }
    .terms-title { font-weight: bold; font-size: 10px; margin-bottom: 5px; text-decoration: underline; }
    .terms-content { font-size: 9px; line-height: 1.4; text-align: justify; margin-bottom: 10px; }

    .signature-section {
      margin-top: 40px;
      border-top: 1px solid #000;
      padding-top: 20px;
    }

    .signature-line {
      border-bottom: 2px solid #000;
      width: 300px;
      height: 30px;
      margin: 20px auto;
    }
    .signature-text { text-align: center; font-weight: bold; margin-top: 10px; }

    .signature-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .signature-table td { border: 1px solid #000; padding: 8px; text-align: center; }

    .footer-text { font-size: 8px; text-align: center; margin-top: 10px; }
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
  static generarEncabezado(contratoData, empresaData, fechaHoy) {
    return `
      <div class="header">
        <div class="logo-section">
          <div class="logo">PSI</div>
        </div>
        <div class="company-info">
          <div class="company-title">${empresaData.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS'}</div>
          <div class="company-subtitle">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
        </div>
        <div class="contract-title">
          CONTRATO ÚNICO DE SERVICIOS FIJOS.<br/>
          <div style="border: 1px solid #000; padding: 2px; margin-top: 3px;">Fecha: ${fechaHoy}</div>
        </div>
      </div>`;
  }

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
              <td>Dirección servicio</td>
              <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
            <tr>
              <td>Dirección suscriptor</td>
              <td colspan="3">${contratoData.cliente_direccion || ''}</td>
            </tr>
          </table>
        </div>
      </div>`;
  }

  static generarSeccionServicio(contratoData, servicios) {
    return `
      <div class="section-box">
        <div class="section-title">EL SERVICIO</div>
        <div class="text-content">
          Con este contrato nos comprometemos a prestarle los servicios que usted elija*:
        </div>
        <div class="checkbox-group">
          <div class="checkbox">
            <span class="checkbox-box ${servicios.internet ? 'checked' : ''}">
              ${servicios.internet ? '✓' : ''}
            </span>
            Internet Fijo
          </div>
          <div class="checkbox">
            <span class="checkbox-box ${servicios.television ? 'checked' : ''}">
              ${servicios.television ? '✓' : ''}
            </span>
            Televisión
          </div>
          <div class="checkbox">
            <span class="checkbox-box ${servicios.publicidad ? 'checked' : ''}">
              ${servicios.publicidad ? '✓' : ''}
            </span>
            Publicidad
          </div>
        </div>
        <div class="text-content">
          Usted se compromete a pagar oportunamente el precio acordado.
          El servicio se activará a más tardar dentro de los quince (15) días hábiles siguientes a la firma del contrato.
        </div>
      </div>`;
  }

  static generarCondicionesComerciales(contratoData) {
    const valorSinIva = contratoData.plan_precio || 0;
    const valorConIva = valorSinIva * 1.19;

    return `
      <div class="section-box">
        <div class="section-title">CONDICIONES COMERCIALES</div>
        <div class="section-title" style="font-size: 10px;">CARACTERÍSTICAS DEL PLAN</div>
        <div class="text-content">
          <strong>Plan:</strong> ${contratoData.plan_nombre || 'Plan de Servicio'}<br/>
          <strong>Valor mensual (sin IVA):</strong> $${this.formatearPrecio(valorSinIva)}<br/>
          <strong>Valor mensual (con IVA 19%):</strong> $${this.formatearPrecio(valorConIva)}<br/>
          ${contratoData.velocidad_bajada ? `<strong>Velocidad de descarga:</strong> ${contratoData.velocidad_bajada} Mbps<br/>` : ''}
          ${contratoData.velocidad_subida ? `<strong>Velocidad de subida:</strong> ${contratoData.velocidad_subida} Mbps<br/>` : ''}
          ${contratoData.canales_tv ? `<strong>Canales de TV:</strong> ${contratoData.canales_tv}<br/>` : ''}
          ${contratoData.plan_descripcion ? `<strong>Descripción:</strong> ${contratoData.plan_descripcion}<br/>` : ''}
          <strong>Costo de instalación:</strong> $${this.formatearPrecio(contratoData.costo_instalacion || 0)}<br/>
          ${contratoData.tipo_permanencia === 'con_permanencia'
            ? `<strong>Permanencia mínima:</strong> ${contratoData.permanencia_meses || 0} meses<br/>`
            : ''}
        </div>
      </div>`;
  }

  static generarObligacionesUsuario() {
    return `
      <div class="section-box">
        <div class="section-title">PRINCIPALES OBLIGACIONES DEL USUARIO</div>
        <div class="obligations-list">
          <ol>
            <li>Pagar oportunamente los servicios prestados, incluyendo los intereses de mora cuando haya incumplimientos.</li>
            <li>Suministrar información verdadera.</li>
            <li>Hacer uso adecuado de los equipos y los servicios.</li>
            <li>No divulgar, almacenar ni acceder a material pornográfico infantil conforme al Código Penal Colombiano.</li>
            <li>Avisar a las autoridades cualquier evento de robo o hurto de elementos de la red, como el cable.</li>
            <li>No cometer o ser partícipe de actividades de fraude.</li>
          </ol>
        </div>
      </div>`;
  }

  static generarTerminosAdicionales() {
    return `
      <div class="terms-section">
        <div class="terms-title">CESIÓN</div>
        <div class="terms-content">
          Si desea ceder este contrato a otra persona, deberá presentar una solicitud por escrito a través de nuestros medios de atención,
          acompañada de la aceptación expresa del nuevo titular. Dentro de los quince (15) días hábiles siguientes a la recepción de la solicitud,
          analizaremos su petición y le daremos una respuesta. Si la cesión es aprobada, quedará liberado de cualquier responsabilidad futura frente al proveedor.
        </div>

        <div class="terms-title">MODIFICACIÓN</div>
        <div class="terms-content">
          El proveedor no podrá modificar el contrato sin su autorización expresa. Esto incluye que no se podrán cobrar servicios no solicitados.
          Si se presenta una modificación unilateral, usted tendrá derecho a terminar el contrato, incluso si existe cláusula de permanencia mínima,
          sin pago de penalidad alguna.
        </div>

        <div class="terms-title">SUSPENSIÓN</div>
        <div class="terms-content">
          Usted podrá solicitar la suspensión temporal del servicio hasta por dos (2) meses al año calendario.
          La solicitud deberá presentarse con al menos cinco (5) días hábiles de antelación al inicio del período que se desea suspender.
        </div>

        <div class="terms-title">TERMINACIÓN</div>
        <div class="terms-content">
          El contrato podrá darse por terminado en cualquier momento por el suscriptor.
          Si existe cláusula de permanencia mínima vigente y decide terminarlo antes del vencimiento,
          deberá pagar una suma equivalente al valor mensual del servicio por los meses faltantes, dividido en dos (2).
          Una vez vencido el periodo de permanencia, el contrato se renovará automáticamente por periodos iguales,
          salvo que el usuario manifieste su voluntad de no continuar antes del inicio del siguiente periodo de facturación.
        </div>
      </div>`;
  }
  static generarMediosAtencion() {
    return `
      <div class="section-box">
        <div class="section-title">CÓMO COMUNICARSE CON NOSOTROS (MEDIOS DE ATENCIÓN)</div>
        <div class="obligations-list">
          <ol>
            <li>Nuestros medios de atención son: oficinas físicas, página web, redes sociales y líneas telefónicas gratuitas.</li>
            <li>Podrá presentar peticiones, quejas, reclamos o recursos a través de cualquiera de estos medios.</li>
            <li>Recibirá respuesta en un plazo máximo de quince (15) días hábiles contados a partir del día siguiente de su recepción.</li>
            <li>Si no obtiene respuesta dentro del plazo, se entenderá aceptada su petición conforme al principio del silencio administrativo positivo.</li>
            <li>Si no está de acuerdo con la respuesta, podrá acudir ante la Superintendencia de Industria y Comercio (SIC) para la resolución del conflicto.</li>
          </ol>
        </div>
      </div>`;
  }

  static generarSeccionFirmas(contratoData, fechaHoy) {
    return `
      <div class="signature-section">
        <div class="text-content">
          Aceptación del contrato mediante firma o cualquier otro medio válido en derecho:
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

  static generarPaginaPermanencia(contratoData, empresaData, fechaHoy) {
    return `
      <!-- PÁGINA 3 - ANEXO DE PERMANENCIA -->
      <div class="page">
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
        ${this.generarInformacionSuscriptor(contratoData)}

        <div class="section-box">
          <div class="section-title">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
          <div class="text-content">
            Señor usuario, el presente contrato lo obliga a estar vinculado con
            <strong>${empresaData.empresa_nombre || 'PROVEEDOR DE TELECOMUNICACIONES SAS'}</strong> durante un tiempo de
            <strong>${contratoData.permanencia_meses || 6}</strong> mes(es).  
            Al vencimiento del plazo indicado, el presente contrato se renovará en forma automática por periodos iguales,
            salvo manifestación expresa en contrario del usuario antes de la renovación.
            <br/><br/>
            En caso de que el usuario decida terminar el contrato antes del vencimiento del período de permanencia mínima,
            deberá pagar una suma equivalente al valor mensual del servicio multiplicado por los meses faltantes,
            dividido en dos (2), conforme a la siguiente fórmula:
            <br/><br/>
            <strong>VALOR POR TERMINACIÓN ANTICIPADA = ((VALOR DEL SERVICIO MENSUAL * MESES FALTANTES) / 2)</strong>
            <br/><br/>
            Esta condición se considera expresamente aceptada al momento de la firma del presente contrato y tiene
            fuerza vinculante durante el periodo acordado de permanencia mínima.
            <br/><br/>
            <strong>PRÓRROGA:</strong> El usuario conoce y acepta la prórroga automática del plan tarifario estipulada
            en las cláusulas del contrato, conforme a la normatividad vigente.
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-line"></div>
          <div class="signature-text">Firma del usuario que celebró el contrato</div>
        </div>
      </div>`;
  }

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
