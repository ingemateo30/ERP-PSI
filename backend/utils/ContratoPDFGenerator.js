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
        @page {
            size: Letter;
            margin: 10mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            margin: 0;
            padding: 0;
        }
        
        .page {
            width: 100%;
            min-height: 100vh;
            margin: 0;
            padding: 0;
            page-break-after: always;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
        }
        
        .company-info {
            text-align: center;
            flex: 1;
        }
        
        .company-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .company-subtitle {
            font-size: 10px;
            color: #666;
        }
        
        .contract-title {
            text-align: right;
            font-size: 11px;
            font-weight: bold;
        }
        
        .info-section {
            margin-bottom: 15px;
        }
        
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
        
        .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 8px;
        }
        
        .checkbox-group {
            margin: 10px 0;
        }
        
        .checkbox {
            margin: 5px 0;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .checkbox-box {
            width: 12px;
            height: 12px;
            border: 1px solid #000;
            display: inline-block;
            text-align: center;
            line-height: 10px;
            font-size: 8px;
            font-weight: bold;
        }
        
        .checkbox-box.checked {
            background-color: #000;
            color: white;
        }
        
        .text-content {
            font-size: 9px;
            line-height: 1.4;
            margin: 10px 0;
            text-align: justify;
        }
        
        .obligations-list {
            font-size: 9px;
            line-height: 1.4;
        }
        
        .obligations-list ol {
            margin: 0;
            padding-left: 20px;
        }
        
        .obligations-list li {
            margin-bottom: 5px;
        }
        
        .terms-section {
            margin: 15px 0;
        }
        
        .terms-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 5px;
            text-decoration: underline;
        }
        
        .terms-content {
            font-size: 9px;
            line-height: 1.4;
            text-align: justify;
            margin-bottom: 10px;
        }
        
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
        
        .signature-text {
            text-align: center;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .signature-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        .signature-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
        }
        
        .footer-text {
            font-size: 8px;
            text-align: center;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <!-- PÁGINA 1 -->
    <div class="page">
        <!-- Header -->
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
        
        <!-- Información del Suscriptor -->
        ${this.generarInformacionSuscriptor(contratoData)}
        
        <!-- El Servicio -->
        ${this.generarSeccionServicio(contratoData, servicios)}
        
        <!-- Condiciones Comerciales -->
        ${this.generarCondicionesComerciales(contratoData)}
        
        <!-- Obligaciones del Usuario -->
        ${this.generarObligacionesUsuario()}
    </div>

    <!-- PÁGINA 2 -->
    <div class="page">
        <!-- Header repetido -->
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
        
        <!-- Términos adicionales -->
        ${this.generarTerminosAdicionales()}
        
        <!-- Medios de Atención -->
        ${this.generarMediosAtencion()}
        
        <!-- Sección de firmas -->
        ${this.generarSeccionFirmas(contratoData, fechaHoy)}
    </div>

    ${contratoData.tipo_permanencia === 'con_permanencia' ? this.generarPaginaPermanencia(contratoData, empresaData, fechaHoy) : ''}
</body>
</html>`;
  }

  static generarEncabezado(contratoData, empresaData, fechaHoy) {
    return `
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
                <div class="company-subtitle">NIT: ${empresaData.empresa_nit || '901.582.657-3'}</div>
            </div>
            <div class="contract-title">
                CONTRATO ÚNICO DE SERVICIOS FIJOS.<br/>
                <div style="border: 1px solid #000; padding: 2px; margin-top: 3px;">
                    Fecha: ${fechaHoy}
                </div>
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
                        <td>${contratoData.departamento_nombre || 'Santander'}</td>
                    </tr>
                    <tr>
                        <td>Nombre</td>
                        <td>${contratoData.cliente_nombre || ''}</td>
                        <td>Municipio</td>
                        <td>${contratoData.ciudad_nombre || 'San Gil'}</td>
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
                El servicio se activará a más tardar el _____ día(s) hábiles.
            </div>
        </div>`;
  }

 static generarCondicionesComerciales(contratoData) {
  return `
    <div class="section-box">
      <div class="section-title">CONDICIONES COMERCIALES</div>
      <div class="section-title" style="font-size: 10px;">CARACTERÍSTICAS DEL PLAN</div>
      <div class="text-content">
        <strong>Plan:</strong> ${contratoData.plan_nombre || 'Plan de Servicio'}<br/>
        <strong>Valor mensual (sin IVA):</strong> $${this.formatearPrecio(contratoData.plan_precio || 0)}<br/>
        <strong>Valor mensual (con IVA):</strong> $${this.formatearPrecio((contratoData.plan_precio || 0) * 1.19)}<br/>
        ${contratoData.velocidad_bajada ? `<strong>Velocidad de descarga:</strong> ${contratoData.velocidad_bajada} Mbps<br/>` : ''}
        ${contratoData.velocidad_subida ? `<strong>Velocidad de subida:</strong> ${contratoData.velocidad_subida} Mbps<br/>` : ''}
        ${contratoData.canales_tv ? `<strong>Canales de TV:</strong> ${contratoData.canales_tv}<br/>` : ''}
        ${contratoData.plan_descripcion ? `<strong>Descripción:</strong> ${contratoData.plan_descripcion}<br/>` : ''}
        <strong>Costo de instalación:</strong> $${this.formatearPrecio(contratoData.costo_instalacion || 0)}<br/>
        ${contratoData.tipo_permanencia === 'con_permanencia' ? `<strong>Permanencia mínima:</strong> ${contratoData.permanencia_meses || 0} meses<br/>` : ''}
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
                    <li>No divulgar ni acceder a pornografía infantil (Consultar anexo).</li>
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
                Si quiere ceder este contrato a otra persona, debe presentar una solicitud por escrito a través de nuestros Medios de Atención, acompañada de la aceptación por escrito de la persona a la que se hará la cesión. Dentro de los 15 días hábiles siguientes, analizaremos su solicitud y le daremos una respuesta. Si se acepta la cesión queda liberado de cualquier responsabilidad con nosotros.
            </div>

            <div class="terms-title">MODIFICACIÓN</div>
            <div class="terms-content">
                Nosotros no podemos modificar el contrato sin su autorización. Esto incluye que no podemos cobrarle servicios que no haya aceptado expresamente. Si esto ocurre tiene derecho a terminar el contrato, incluso estando vigente la cláusula de permanencia mínima, sin la obligación de pagar suma alguna por este concepto.
            </div>

            <div class="terms-title">SUSPENSIÓN</div>
            <div class="terms-content">
                Usted tiene derecho a solicitar la suspensión del servicio por un máximo de 2 meses al año. Para esto debe presentar la solicitud antes del inicio del ciclo de facturación siguiente que desea suspender.
            </div>

            <div class="terms-title">TERMINACIÓN</div>
            <div class="terms-content">
                Usted puede terminar el contrato en cualquier momento sin penalidades. Para esto debe realizar una solicitud a través de nuestros Medios de Atención mínimo 3 días hábiles antes del corte de facturación.
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
                    <li>Presente cualquier queja, petición/reclamo o recurso a través de estos medios y le responderemos en máximo 15 días hábiles.</li>
                    <li>Si no respondemos es porque aceptamos su petición o reclamo. Esto se llama silencio administrativo positivo y aplica para internet.</li>
                    <li>Si no está de acuerdo con nuestra respuesta, puede enviar su reclamo directamente a la SIC (Superintendencia de Industria y Comercio).</li>
                </ol>
            </div>
        </div>`;
  }

  static generarSeccionFirmas(contratoData, fechaHoy) {
    return `
        <div class="signature-section">
            <div class="text-content">
                Aceptación contrato mediante firma o cualquier otro medio válido
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
                Consulte el régimen de protección de usuarios en www.crcom.gov.co
            </div>
        </div>`;
  }

  static generarPaginaPermanencia(contratoData, empresaData, fechaHoy) {
    return `
    <!-- PÁGINA 3 - ANEXO DE PERMANENCIA -->
    <div class="page">
        <!-- Header Página 3 -->
        ${this.generarEncabezado(contratoData, empresaData, fechaHoy)}
        
        <!-- Información del Suscriptor - Repetida -->
        ${this.generarInformacionSuscriptor(contratoData)}

        <div class="section-box">
            <div class="section-title">ANEXO DE COMPROMISO DE PERMANENCIA MÍNIMA</div>
            <div class="text-content">
                Señor usuario, el presente contrato lo obliga a estar vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. durante un tiempo de ${contratoData.permanencia_meses || 6} mes(es), además cuando venza el plazo indicado, el presente contrato se renovará en forma automática indefinidamente, y finalmente, en caso que usted decida terminar el contrato antes de que venza el período de permanencia mínima señalado usted deberá pagar los valores que se determinan en el siguiente punto.
                <br/><br/>
                En caso de que el usuario que celebró el contrato lo dé por terminado antes del vencimiento del período estipulado, pagará una suma equivalente al valor del servicio mensual por los meses faltantes para la terminación de la permanencia mínima, dividido en dos; su forma es:
                <br/><br/>
                <strong>VALOR POR TERMINADO DEL CONTRATO = ((VALOR DEL SERVICIO MENSUAL * MESES FALTANTES PARA COMPLETAR LA PERMANENCIA) / 2).</strong>
                <br/><br/>
                Una vez esta condición sea aceptada expresamente por usted, debe permanecer con el contrato por el tiempo acordado en la presente cláusula, y queda vinculado con PROVEEDOR DE TELECOMUNICACIONES SAS. de acuerdo con las condiciones del presente contrato.
                <br/><br/>
                <strong>Prórroga:</strong> El usuario que celebró el contrato conoce y acepta la prórroga automática del plan tarifario estipulada en el clausurado del contrato.
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
      }
    }

    return servicios;
  }

  static formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(precio || 0);
  }
}

module.exports = ContratoPDFGenerator;