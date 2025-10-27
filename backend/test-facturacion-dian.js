// =========================================
// PRUEBA DE FACTURACIÓN ELECTRÓNICA - DIAN
// =========================================
// Este archivo simula el proceso completo de facturación electrónica
// incluyendo generación de XML, CUFE, firma digital y envío a DIAN
//
// UBICACIÓN: backend/test-facturacion-dian.js
// EJECUTAR: node test-facturacion-dian.js
// =========================================
require('dotenv').config();
const crypto = require('crypto');
const { Database } = require('./models/Database');

// Colores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function separador(titulo) {
  console.log('\n' + '='.repeat(70));
  log(`  ${titulo}`, colors.bright + colors.cyan);
  console.log('='.repeat(70) + '\n');
}

// ==========================================
// CONFIGURACIÓN DE LA EMPRESA (SIMULATED)
// ==========================================
const EMPRESA_CONFIG = {
  nit: '900123456',
  razon_social: 'PSI TELECOMUNICACIONES S.A.S',
  nombre_comercial: 'PSI',
  direccion: 'Calle 32E #11-13',
  ciudad: 'San Gil',
  departamento: 'Santander',
  telefono: '3024773516',
  email: 'facturacion@psi.com.co',
  
  // Certificado digital (SIMULADO - en producción debe ser real)
  certificado: {
    ruta: '/path/to/certificado.pfx',
    password: 'password_certificado',
    serial: '123456789ABCDEF'
  },
  
  // Resolución de facturación DIAN
  resolucion: {
    numero: 'DIAN-2024-001',
    fecha: '2024-01-01',
    prefijo: 'FAC',
    desde: 1,
    hasta: 100000,
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2025-12-31',
    clave_tecnica: 'abc123xyz789' // Clave técnica de la DIAN
  },
  
  // Ambiente DIAN
  ambiente: 'HABILITACION', // HABILITACION o PRODUCCION
  
  // URLs DIAN (Pruebas)
  dian_urls: {
    habilitacion: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
    produccion: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc'
  }
};

// ==========================================
// FUNCIÓN: GENERAR CUFE
// ==========================================
/**
 * Genera el CUFE (Código Único de Factura Electrónica)
 * según el algoritmo definido por la DIAN
 */
function generarCUFE(datosFactura) {
  log('🔐 Generando CUFE...', colors.yellow);
  
  // Componentes del CUFE según especificación DIAN
  const componentes = [
    datosFactura.numero_factura,                          // Número de factura
    datosFactura.fecha_emision.replace(/[-:]/g, ''),     // Fecha sin separadores
    datosFactura.hora_emision.replace(/:/g, ''),         // Hora sin separadores
    datosFactura.subtotal.toFixed(2),                    // Subtotal con 2 decimales
    '01',                                                 // Código impuesto (01 = IVA)
    datosFactura.iva.toFixed(2),                         // Valor IVA
    '04',                                                 // Código impuesto consumo (04 = No aplica)
    '0.00',                                               // Valor impuesto consumo
    '03',                                                 // Código retención (03 = No aplica)
    '0.00',                                               // Valor retención
    datosFactura.total.toFixed(2),                       // Total factura
    EMPRESA_CONFIG.nit,                                   // NIT emisor
    datosFactura.cliente_identificacion,                 // Identificación cliente
    EMPRESA_CONFIG.resolucion.clave_tecnica,             // Clave técnica
    EMPRESA_CONFIG.ambiente                               // Ambiente
  ];
  
  // Concatenar componentes
  const cadena = componentes.join('');
  
  // Generar hash SHA-384
  const hash = crypto.createHash('sha384').update(cadena).digest('hex');
  
  log(`✅ CUFE generado: ${hash}`, colors.green);
  
  return hash;
}

// ==========================================
// FUNCIÓN: GENERAR XML FACTURA ELECTRÓNICA
// ==========================================
function generarXMLFactura(factura, cliente) {
  log('📄 Generando XML de factura electrónica...', colors.yellow);
  
  const fecha = new Date();
  const fechaEmision = factura.fecha_emision || fecha.toISOString().split('T')[0];
  const horaEmision = fecha.toTimeString().split(' ')[0];
  
  // Calcular CUFE
  const datosCUFE = {
    numero_factura: factura.numero_factura,
    fecha_emision: fechaEmision,
    hora_emision: horaEmision,
    subtotal: factura.subtotal || 0,
    iva: factura.iva || 0,
    total: factura.total || 0,
    cliente_identificacion: cliente.identificacion
  };
  
  const cufe = generarCUFE(datosCUFE);
  
  // Generar XML según especificación DIAN (UBL 2.1)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  
  <!-- Extensiones (firma digital) -->
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- Aquí iría la firma digital XML-DSig -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  
  <!-- Información de la factura -->
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>${factura.numero_factura}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${fechaEmision}</cbc:IssueDate>
  <cbc:IssueTime>${horaEmision}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  
  <!-- Periodo de facturación -->
  <cac:InvoicePeriod>
    <cbc:StartDate>${factura.fecha_desde}</cbc:StartDate>
    <cbc:EndDate>${factura.fecha_hasta}</cbc:EndDate>
  </cac:InvoicePeriod>
  
  <!-- Emisor (Empresa) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="31" schemeName="NIT">${EMPRESA_CONFIG.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${EMPRESA_CONFIG.razon_social}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:AddressLine>${EMPRESA_CONFIG.direccion}</cbc:AddressLine>
          <cbc:CityName>${EMPRESA_CONFIG.ciudad}</cbc:CityName>
          <cbc:CountrySubentity>${EMPRESA_CONFIG.departamento}</cbc:CountrySubentity>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:TaxLevelCode>O-13</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Cliente -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="13" schemeName="CC">${cliente.identificacion}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${cliente.nombres} ${cliente.apellidos}</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:AddressLine>${cliente.direccion}</cbc:AddressLine>
          <cbc:CityName>${cliente.ciudad || EMPRESA_CONFIG.ciudad}</cbc:CityName>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Totales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${factura.subtotal || 0}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${factura.subtotal || 0}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${factura.total || 0}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${factura.total || 0}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Impuestos totales -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${factura.iva || 0}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${factura.subtotal || 0}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${factura.iva || 0}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Líneas de detalle -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${factura.internet || 0}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Servicio de Internet</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${factura.internet || 0}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  
  <cac:InvoiceLine>
    <cbc:ID>2</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${factura.television || 0}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Servicio de Televisión</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">${factura.television || 0}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  
</Invoice>`;
  
  log('✅ XML generado exitosamente', colors.green);
  log(`📦 Tamaño del XML: ${xml.length} bytes`, colors.cyan);
  
  return { xml, cufe };
}

// ==========================================
// FUNCIÓN: FIRMAR XML (SIMULADO)
// ==========================================
function firmarXML(xml) {
  log('✍️  Firmando XML digitalmente...', colors.yellow);
  
  // En producción, aquí se usaría un certificado digital real
  // y la librería xml-crypto o similar
  
  // SIMULACIÓN
  const hash = crypto.createHash('sha256').update(xml).digest('base64');
  
  log('✅ XML firmado digitalmente', colors.green);
  log(`🔒 Firma (simulada): ${hash.substring(0, 50)}...`, colors.cyan);
  
  return {
    xml_firmado: xml,
    firma: hash,
    certificado_serial: EMPRESA_CONFIG.certificado.serial
  };
}

// ==========================================
// FUNCIÓN: ENVIAR A LA DIAN (SIMULADO)
// ==========================================
async function enviarALaDIAN(xmlFirmado, cufe) {
  log('📡 Enviando factura a la DIAN...', colors.yellow);
  
  // En producción, aquí se haría la petición SOAP a la DIAN
  // usando librerías como 'soap' o 'axios'
  
  // SIMULACIÓN DE RESPUESTA EXITOSA
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simular latencia
  
  const respuestaDIAN = {
    exitoso: true,
    codigo_respuesta: '00',
    mensaje: 'Factura electrónica aceptada por la DIAN',
    cufe: cufe,
    fecha_validacion: new Date().toISOString(),
    ambiente: EMPRESA_CONFIG.ambiente,
    numero_seguimiento: `DIAN-${Date.now()}`
  };
  
  log('✅ Factura aceptada por la DIAN', colors.green);
  log(`📋 Código de respuesta: ${respuestaDIAN.codigo_respuesta}`, colors.cyan);
  log(`🔍 Número de seguimiento: ${respuestaDIAN.numero_seguimiento}`, colors.cyan);
  
  return respuestaDIAN;
}

// ==========================================
// FUNCIÓN: GUARDAR EN BASE DE DATOS
// ==========================================
async function guardarFacturaElectronica(facturaId, cufe, respuestaDIAN, xml) {
  log('💾 Guardando información en base de datos...', colors.yellow);
  
  try {
    // Actualizar factura con datos de facturación electrónica
    await Database.query(`
      UPDATE facturas 
      SET 
        cufe = ?,
        xml_factura = ?,
        estado_dian = ?,
        fecha_envio_dian = ?,
        numero_seguimiento_dian = ?,
        respuesta_dian = ?
      WHERE id = ?
    `, [
      cufe,
      xml,
      respuestaDIAN.codigo_respuesta,
      respuestaDIAN.fecha_validacion,
      respuestaDIAN.numero_seguimiento,
      JSON.stringify(respuestaDIAN),
      facturaId
    ]);
    
    log('✅ Información guardada en BD', colors.green);
    
  } catch (error) {
    log('⚠️  Error guardando en BD (normal si columnas no existen):', colors.yellow);
    log(`   ${error.message}`, colors.yellow);
    log('   Las columnas necesarias son: cufe, xml_factura, estado_dian, fecha_envio_dian, numero_seguimiento_dian, respuesta_dian', colors.yellow);
  }
}

// ==========================================
// PRUEBA PRINCIPAL
// ==========================================
async function probarFacturacionElectronica() {
  separador('PRUEBA DE FACTURACIÓN ELECTRÓNICA - DIAN');
  
  try {
    // 1. Obtener una factura para probar
    log('🔍 Buscando factura para probar...', colors.yellow);
    
    const facturas = await Database.query(`
      SELECT 
        f.*,
        c.identificacion as cliente_identificacion,
        c.nombres as cliente_nombres,
        c.apellidos as cliente_apellidos,
        c.direccion as cliente_direccion,
        c.email as cliente_email
      FROM facturas f
      INNER JOIN clientes c ON f.cliente_id = c.id
      WHERE f.activo = 1
      ORDER BY f.id DESC
      LIMIT 1
    `);
    
    if (facturas.length === 0) {
      log('❌ No hay facturas para probar', colors.red);
      log('💡 Crea primero una factura desde el sistema', colors.yellow);
      return;
    }
    
    const factura = facturas[0];
    const cliente = {
      identificacion: factura.cliente_identificacion,
      nombres: factura.cliente_nombres,
      apellidos: factura.cliente_apellidos,
      direccion: factura.cliente_direccion,
      email: factura.cliente_email
    };
    
    log('✅ Factura seleccionada:', colors.green);
    log(`   - Número: ${factura.numero_factura}`);
    log(`   - Cliente: ${cliente.nombres} ${cliente.apellidos}`);
    log(`   - Total: $${factura.total.toLocaleString('es-CO')}`);
    
    await esperar(1500);
    
    // 2. Generar XML
    separador('PASO 1: GENERACIÓN DE XML UBL 2.1');
    const { xml, cufe } = generarXMLFactura(factura, cliente);
    
    log('\n📄 Vista previa del XML (primeros 500 caracteres):', colors.cyan);
    console.log(xml.substring(0, 500) + '...\n');
    
    await esperar(1500);
    
    // 3. Firmar XML
    separador('PASO 2: FIRMA DIGITAL DEL XML');
    const { xml_firmado, firma } = firmarXML(xml);
    
    await esperar(1500);
    
    // 4. Enviar a DIAN
    separador('PASO 3: ENVÍO A LA DIAN');
    log(`🌐 Ambiente: ${EMPRESA_CONFIG.ambiente}`, colors.cyan);
    log(`🔗 URL: ${EMPRESA_CONFIG.dian_urls.habilitacion}`, colors.cyan);
    
    const respuestaDIAN = await enviarALaDIAN(xml_firmado, cufe);
    
    await esperar(1500);
    
    // 5. Guardar en BD
    separador('PASO 4: GUARDAR INFORMACIÓN');
    await guardarFacturaElectronica(factura.id, cufe, respuestaDIAN, xml);
    
    // 6. Resumen final
    separador('RESUMEN DE FACTURACIÓN ELECTRÓNICA');
    
    log('✅ PROCESO COMPLETADO EXITOSAMENTE\n', colors.green + colors.bright);
    
    log('📋 Información de la factura electrónica:', colors.cyan);
    log(`   - Número factura: ${factura.numero_factura}`);
    log(`   - CUFE: ${cufe}`);
    log(`   - Estado DIAN: ${respuestaDIAN.codigo_respuesta} - ${respuestaDIAN.mensaje}`);
    log(`   - Seguimiento: ${respuestaDIAN.numero_seguimiento}`);
    log(`   - Ambiente: ${EMPRESA_CONFIG.ambiente}`);
    
    log('\n⚠️  IMPORTANTE:', colors.yellow + colors.bright);
    log('   Esta es una SIMULACIÓN del proceso real.', colors.yellow);
    log('   Para producción necesitas:', colors.yellow);
    log('   1. ✅ Certificado digital válido (.pfx)', colors.yellow);
    log('   2. ✅ Software de firma digital (ej: xml-crypto)', colors.yellow);
    log('   3. ✅ Credenciales DIAN (NIT, software ID, PIN)', colors.yellow);
    log('   4. ✅ Resolución de facturación vigente', colors.yellow);
    log('   5. ✅ Habilitación en ambiente de pruebas DIAN', colors.yellow);
    log('   6. ✅ Implementar cliente SOAP para DIAN', colors.yellow);
    
    log('\n📚 Recursos útiles:', colors.cyan);
    log('   - Documentación DIAN: https://www.dian.gov.co/');
    log('   - Especificación UBL 2.1: http://docs.oasis-open.org/');
    log('   - Validador DIAN: https://catalogo-vpfe.dian.gov.co/');
    
  } catch (error) {
    log('\n❌ ERROR EN LA PRUEBA', colors.red + colors.bright);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// EJECUTAR
// ==========================================
if (require.main === module) {
  log('\n╔══════════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║   SISTEMA DE PRUEBAS - FACTURACIÓN ELECTRÓNICA DIAN COLOMBIA    ║', colors.bright + colors.cyan);
  log('╚══════════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);
  
  probarFacturacionElectronica();
}

module.exports = {
  generarCUFE,
  generarXMLFactura,
  firmarXML,
  enviarALaDIAN,
  guardarFacturaElectronica
};