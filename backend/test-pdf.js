// test-pdf.js - Script para probar la generación de PDF
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PDFTester {
  constructor(baseURL = 'http://localhost:3000', token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  // Método para obtener token de autenticación
  async login(email = 'admin@empresa.com', password = 'admin123') {
    try {
      console.log('🔐 Iniciando sesión...');
      
      const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        this.token = response.data.data.tokens.accessToken;
        console.log('✅ Login exitoso');
        return true;
      } else {
        console.error('❌ Error en login:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de conexión en login:', error.message);
      return false;
    }
  }

  // Probar PDF con datos de ejemplo
  async probarPDFEjemplo() {
    try {
      console.log('\n🧪 === PROBANDO PDF CON DATOS DE EJEMPLO ===');
      
      const headers = {};
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await axios.get(`${this.baseURL}/api/v1/facturas/test-pdf`, {
        headers,
        responseType: 'arraybuffer'
      });

      if (response.status === 200) {
        // Guardar PDF
        const nombreArchivo = `factura_test_${Date.now()}.pdf`;
        const rutaArchivo = path.join(__dirname, 'temp', nombreArchivo);
        
        // Crear directorio si no existe
        const dirTemp = path.dirname(rutaArchivo);
        if (!fs.existsSync(dirTemp)) {
          fs.mkdirSync(dirTemp, { recursive: true });
        }

        fs.writeFileSync(rutaArchivo, response.data);
        
        console.log('✅ PDF generado exitosamente');
        console.log(`📁 Archivo guardado en: ${rutaArchivo}`);
        console.log(`📊 Tamaño del archivo: ${(response.data.length / 1024).toFixed(2)} KB`);
        
        return rutaArchivo;
      } else {
        console.error('❌ Error al generar PDF:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error en prueba de PDF:', error.response?.data || error.message);
      return null;
    }
  }

  // Probar PDF con factura real
  async probarPDFFactura(facturaId) {
    try {
      console.log(`\n📄 === PROBANDO PDF DE FACTURA ID: ${facturaId} ===`);
      
      const headers = {};
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await axios.get(`${this.baseURL}/api/v1/facturas/${facturaId}/pdf`, {
        headers,
        responseType: 'arraybuffer'
      });

      if (response.status === 200) {
        // Guardar PDF
        const nombreArchivo = `factura_${facturaId}_${Date.now()}.pdf`;
        const rutaArchivo = path.join(__dirname, 'temp', nombreArchivo);
        
        // Crear directorio si no existe
        const dirTemp = path.dirname(rutaArchivo);
        if (!fs.existsSync(dirTemp)) {
          fs.mkdirSync(dirTemp, { recursive: true });
        }

        fs.writeFileSync(rutaArchivo, response.data);
        
        console.log('✅ PDF de factura generado exitosamente');
        console.log(`📁 Archivo guardado en: ${rutaArchivo}`);
        console.log(`📊 Tamaño del archivo: ${(response.data.length / 1024).toFixed(2)} KB`);
        
        return rutaArchivo;
      } else {
        console.error('❌ Error al generar PDF de factura:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error en PDF de factura:', error.response?.data || error.message);
      return null;
    }
  }

  // Listar facturas disponibles
  async listarFacturas() {
    try {
      console.log('\n📋 === LISTANDO FACTURAS DISPONIBLES ===');
      
      const headers = {};
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await axios.get(`${this.baseURL}/api/v1/facturas?limit=5`, {
        headers
      });

      if (response.data.success) {
        const facturas = response.data.data.facturas;
        
        if (facturas.length > 0) {
          console.log('📄 Facturas encontradas:');
          facturas.forEach(factura => {
            console.log(`  - ID: ${factura.id} | Número: ${factura.numero_factura} | Cliente: ${factura.nombre_cliente} | Total: $${factura.total}`);
          });
          return facturas;
        } else {
          console.log('📭 No hay facturas en el sistema');
          return [];
        }
      } else {
        console.error('❌ Error al listar facturas:', response.data.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error al conectar:', error.response?.data || error.message);
      return [];
    }
  }

  // Prueba completa
  async ejecutarPruebaCompleta() {
    console.log('🚀 === INICIANDO PRUEBA COMPLETA DE PDF ===\n');

    // 1. Login (opcional)
    // await this.login();

    // 2. Probar PDF con datos de ejemplo
    const pdfEjemplo = await this.probarPDFEjemplo();
    
    if (!pdfEjemplo) {
      console.log('❌ Falló la prueba con datos de ejemplo. Revisa la configuración.');
      return;
    }

    // 3. Listar facturas reales
    const facturas = await this.listarFacturas();
    
    // 4. Si hay facturas, probar con una real
    if (facturas.length > 0) {
      const primeraFactura = facturas[0];
      await this.probarPDFFactura(primeraFactura.id);
    }

    console.log('\n🎉 === PRUEBA COMPLETA FINALIZADA ===');
  }
}

// Ejecutar pruebas
async function main() {
  // Configurar tu URL base del servidor
  const tester = new PDFTester('http://localhost:3000'); // Cambia el puerto si es necesario
  
  await tester.ejecutarPruebaCompleta();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PDFTester;