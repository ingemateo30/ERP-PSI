const db = require('../config/database');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const consultaClienteController = {

  // 🔐 Validar cliente con documento, teléfono y email
  validarCliente: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { numeroDocumento, telefono, email } = req.body;

      console.log('🔍 Validando cliente:', { numeroDocumento, telefono, email });

      const connection = await db.getConnection();

      const [clientes] = await connection.query(`
        SELECT
          id, identificacion, nombre, correo, telefono,
          direccion, barrio, estado, fecha_registro
        FROM clientes
        WHERE identificacion = ?
          AND (telefono = ? OR telefono_2 = ?)
          AND correo = ?
        LIMIT 1
      `, [numeroDocumento, telefono, telefono, email]);

      connection.release();

      if (clientes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado. Verifica tus datos.'
        });
      }

      const cliente = clientes[0];

      // Generar token temporal (válido por 30 minutos)
      const token = jwt.sign(
        {
          clienteId: cliente.id,
          identificacion: cliente.identificacion,
          tipo: 'cliente_publico'
        },
        process.env.JWT_SECRET || 'secret_key_psi_2024',
        { expiresIn: '30m' }
      );

      console.log('✅ Cliente validado:', cliente.nombre);

      return res.json({
        success: true,
        message: 'Cliente verificado correctamente',
        token: token,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          identificacion: cliente.identificacion,
          email: cliente.correo,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          estado: cliente.estado,
          fecha_registro: cliente.fecha_registro
        }
      });

    } catch (error) {
      console.error('❌ Error validando cliente:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al validar cliente'
      });
    }
  },

  // 📄 Obtener facturas del cliente
  obtenerFacturas: async (req, res) => {
    try {
      const { clienteId } = req.clientePublico;

      const connection = await db.getConnection();

      const [facturas] = await connection.query(`
        SELECT
          id, numero_factura, fecha_emision, fecha_vencimiento,
          subtotal, iva, total, estado, metodo_pago, fecha_pago,
          observaciones, periodo_facturacion
        FROM facturas
        WHERE cliente_id = ?
        ORDER BY fecha_emision DESC
        LIMIT 50
      `, [clienteId]);

      connection.release();

      console.log(`📄 Facturas encontradas para cliente ${clienteId}:`, facturas.length);

      return res.json({
        success: true,
        data: facturas
      });

    } catch (error) {
      console.error('❌ Error obteniendo facturas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener facturas'
      });
    }
  },

  // 📋 Obtener contratos del cliente
  obtenerContratos: async (req, res) => {
    try {
      const { clienteId } = req.clientePublico;

      const connection = await db.getConnection();

      const [contratos] = await connection.query(`
        SELECT
          c.id, c.numero_contrato, c.fecha_inicio, c.fecha_fin,
          c.tipo_permanencia, c.permanencia_meses, c.estado,
          c.documento_pdf_path as pdf_url, c.observaciones,
          ps.nombre as plan_nombre, ps.precio as plan_precio
        FROM contratos c
        LEFT JOIN servicios_cliente sc ON c.servicio_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.cliente_id = ?
        ORDER BY c.fecha_inicio DESC
      `, [clienteId]);

      connection.release();

      console.log(`📋 Contratos encontrados para cliente ${clienteId}:`, contratos.length);

      return res.json({
        success: true,
        data: contratos
      });

    } catch (error) {
      console.error('❌ Error obteniendo contratos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener contratos'
      });
    }
  },

  // 🔧 Obtener servicios activos
  obtenerServicios: async (req, res) => {
    try {
      const { clienteId } = req.clientePublico;

      const connection = await db.getConnection();

      const [servicios] = await connection.query(`
        SELECT
          sc.id, sc.estado, sc.fecha_activacion,
          ps.nombre as plan_nombre, ps.tipo, ps.precio,
          ps.velocidad_subida, ps.velocidad_bajada, ps.canales_tv
        FROM servicios_cliente sc
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ?
        ORDER BY sc.fecha_activacion DESC
      `, [clienteId]);

      connection.release();

      console.log(`🔧 Servicios encontrados para cliente ${clienteId}:`, servicios.length);

      return res.json({
        success: true,
        data: servicios
      });

    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener servicios'
      });
    }
  },

  // 🔨 Obtener instalaciones
  obtenerInstalaciones: async (req, res) => {
    try {
      const { clienteId } = req.clientePublico;
      const connection = await db.getConnection();
      
      const [instalaciones] = await connection.query(`
        SELECT
          i.id, i.fecha_programada, i.fecha_realizada, i.estado,
          i.observaciones,
          su.nombre as tecnico_nombre
        FROM instalaciones i
        LEFT JOIN sistema_usuarios su ON i.instalador_id = su.id
        WHERE i.cliente_id = ?
        ORDER BY i.fecha_programada DESC
      `, [clienteId]);
      
      connection.release();

      console.log(`🔨 Instalaciones encontradas para cliente ${clienteId}:`, instalaciones.length);
      
      return res.json({
        success: true,
        data: instalaciones
      });
    } catch (error) {
      console.error('❌ Error obteniendo instalaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener instalaciones'
      });
    }
  },

// 📄 Descargar PDF del contrato
descargarPDF: async (req, res) => {
  try {
    const { contratoId } = req.params;
    
    if (!req.clientePublico || !req.clientePublico.clienteId) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }
    
    const clienteId = req.clientePublico.clienteId;
    console.log(`📄 Generando PDF de contrato ${contratoId} para cliente ${clienteId}`);

    const connection = await db.getConnection();

    // Verificar que el contrato pertenece al cliente
    const [contratos] = await connection.query(
      'SELECT * FROM contratos WHERE id = ? AND cliente_id = ?',
      [contratoId, clienteId]
    );

    if (contratos.length === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false,
        message: 'Contrato no encontrado' 
      });
    }

    const contrato = contratos[0];

    // ✅ SI YA TIENE PDF GUARDADO, INTENTAR DEVOLVERLO
    if (contrato.documento_pdf_path && contrato.documento_pdf_path.trim() !== '') {
      const fs = require('fs').promises;
      const path = require('path');
      
      const pdfPath = path.join(__dirname, '..', contrato.documento_pdf_path);
      
      try {
        const pdfBuffer = await fs.readFile(pdfPath);
        connection.release();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Contrato-${contrato.numero_contrato}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        console.log('✅ PDF de contrato enviado desde archivo guardado');
        return res.send(pdfBuffer);
      } catch (fileError) {
        console.log('⚠️ No se pudo leer PDF guardado, generando nuevo...');
      }
    }

    // ✅ OBTENER DATOS COMPLETOS DEL CONTRATO PARA GENERAR PDF
    const [datosCompletos] = await connection.query(`
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.identificacion as cliente_identificacion,
        cl.tipo_documento as cliente_tipo_identificacion,
        cl.telefono as cliente_telefono,
        cl.correo as cliente_email,
        cl.direccion as cliente_direccion,
        cl.estrato as cliente_estrato,
        ci.nombre as ciudad_nombre,
        d.nombre as departamento_nombre
      FROM contratos c
      JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN ciudades ci ON cl.ciudad_id = ci.id
      LEFT JOIN departamentos d ON ci.departamento_id = d.id
      WHERE c.id = ?
    `, [contratoId]);

    if (datosCompletos.length === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false,
        message: 'Datos del contrato no encontrados' 
      });
    }

    const contratoData = datosCompletos[0];

    // Obtener observaciones como objeto
    let observaciones = {};
    try {
      observaciones = JSON.parse(contratoData.observaciones || '{}');
    } catch (e) {
      console.warn('⚠️ No se pudo parsear observaciones del contrato');
    }

    // ✅ OBTENER INFORMACIÓN DE SERVICIOS DEL CONTRATO
    let servicioId = contratoData.servicio_id;
    let serviciosInfo = [];
    
    // Verificar si servicio_id es un JSON array o un ID simple
    try {
      const serviciosIds = JSON.parse(servicioId);
      if (Array.isArray(serviciosIds)) {
        // Múltiples servicios
        const [servicios] = await connection.query(`
          SELECT sc.*, ps.nombre as plan_nombre, ps.precio, ps.tipo
          FROM servicios_cliente sc
          JOIN planes_servicio ps ON sc.plan_id = ps.id
          WHERE sc.id IN (?)
        `, [serviciosIds]);
        serviciosInfo = servicios;
      }
    } catch (parseError) {
      // Es un ID simple, no JSON
      const [servicios] = await connection.query(`
        SELECT sc.*, ps.nombre as plan_nombre, ps.precio, ps.tipo
        FROM servicios_cliente sc
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.id = ?
      `, [servicioId]);
      serviciosInfo = servicios;
    }

    connection.release();

    // ✅ CALCULAR PRECIOS DE SERVICIOS
    let precioInternet = 0;
    let precioTelevision = 0;
    let servicioNombre = '';

    for (const servicio of serviciosInfo) {
      const precio = parseFloat(servicio.precio_personalizado || servicio.precio || 0);
      const tipo = (servicio.tipo || '').toLowerCase();
      
      if (tipo.includes('internet')) {
        precioInternet += precio;
        servicioNombre += `Internet ${servicio.plan_nombre} `;
      } else if (tipo.includes('tv') || tipo.includes('television')) {
        precioTelevision += precio;
        servicioNombre += `TV ${servicio.plan_nombre} `;
      } else {
        // Si no se identifica el tipo, sumarlo a internet por defecto
        precioInternet += precio;
        servicioNombre += `${servicio.plan_nombre} `;
      }
    }

    // Si no hay servicios encontrados, usar observaciones
    if (serviciosInfo.length === 0) {
      precioInternet = parseFloat(observaciones.precio_mensual_total) || 0;
      servicioNombre = observaciones.servicios_incluidos || 'SERVICIO CONTRATADO';
    }

// ✅ PREPARAR DATOS EN EL FORMATO EXACTO QUE ESPERA generarHTML
const ContratoPDFGeneratorMINTIC = require('../utils/ContratoPDFGeneratorMINTIC');

const datosPDF = {
  // Campos que generarHTML busca directamente
  numero_contrato: contratoData.numero_contrato,
  cliente_nombre: contratoData.cliente_nombre,
  cliente_identificacion: contratoData.cliente_identificacion,
  cliente_tipo_identificacion: contratoData.cliente_tipo_identificacion || 'CC',
  cliente_telefono: contratoData.cliente_telefono || '',
  cliente_email: contratoData.cliente_email || '',
  cliente_direccion: observaciones.direccion_sede || contratoData.cliente_direccion || '',
  cliente_estrato: parseInt(contratoData.cliente_estrato) || 1,
  
  // Fechas
  fecha_generacion: contratoData.fecha_generacion || contratoData.fecha_inicio,
  created_at: contratoData.fecha_generacion || contratoData.fecha_inicio,
  fecha_inicio: contratoData.fecha_inicio,
  
  // Tipo de contrato
  tipo_permanencia: contratoData.tipo_permanencia || 'sin_permanencia',
  permanencia_meses: parseInt(contratoData.permanencia_meses) || 1,
  
  // Ubicación
  ciudad_nombre: contratoData.ciudad_nombre || 'San Gil',
  departamento_nombre: contratoData.departamento_nombre || 'Santander',
  
  // Precios (nombres que busca el generador)
  precio_internet: precioInternet,
  precio_television: precioTelevision,
  servicio_nombre: servicioNombre.trim() || 'SERVICIO CONTRATADO',
  
  // Empresa (objeto vacío si no existe)
  empresa: {}
};

console.log('📄 Datos mapeados para generarHTML:', JSON.stringify(datosPDF, null, 2));

// ✅ GENERAR PDF
console.log('🔄 Iniciando generación de PDF...');
const pdfBuffer = await ContratoPDFGeneratorMINTIC.generarPDFCompleto(datosPDF);

console.log('📊 Tipo de dato recibido:', typeof pdfBuffer);
console.log('📊 Es Buffer?', Buffer.isBuffer(pdfBuffer));
console.log('📊 Tiene length?', pdfBuffer?.length);

if (!pdfBuffer || pdfBuffer.length === 0) {
  throw new Error('Buffer de PDF vacío');
}

// ✅ CONVERTIR A BUFFER SI ES NECESARIO
let bufferFinal = pdfBuffer;
if (!Buffer.isBuffer(pdfBuffer)) {
  console.log('⚠️ Convirtiendo a Buffer...');
  if (typeof pdfBuffer === 'string') {
    // Si es string base64
    bufferFinal = Buffer.from(pdfBuffer, 'base64');
  } else if (pdfBuffer.type === 'Buffer' && Array.isArray(pdfBuffer.data)) {
    // Si es objeto Buffer serializado
    bufferFinal = Buffer.from(pdfBuffer.data);
  } else {
    // Intentar conversión directa
    bufferFinal = Buffer.from(pdfBuffer);
  }
}

console.log('✅ PDF de contrato listo - Tamaño:', bufferFinal.length, 'bytes');
console.log('✅ Es Buffer ahora?', Buffer.isBuffer(bufferFinal));

// ✅ CONFIGURAR HEADERS CORRECTAMENTE
res.set({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `attachment; filename="Contrato-${contratoData.numero_contrato}.pdf"`,
  'Content-Length': bufferFinal.length,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// ✅ ENVIAR BUFFER COMO BINARIO
return res.end(bufferFinal, 'binary');

  } catch (error) {
    console.error('❌ Error generando PDF de contrato:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      message: 'Error al generar el PDF del contrato',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},
// 🧾 Obtener detalle de factura
obtenerDetalleFactura: async (req, res) => {
  try {
    const { facturaId } = req.params;
    const clienteId = req.clientePublico.clienteId;

    const connection = await db.getConnection();

    // Obtener factura
    const [facturas] = await connection.query(
      `SELECT * FROM facturas WHERE id = ? AND cliente_id = ?`,
      [facturaId, clienteId]
    );

    if (facturas.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const factura = facturas[0];

    // Obtener detalles de la factura
    const [detalles] = await connection.query(
      `SELECT 
        df.*,
        ps.nombre as plan_nombre,
        ps.tipo as tipo_servicio
      FROM detalle_facturas df
      LEFT JOIN servicios_cliente sc ON df.servicio_cliente_id = sc.id
      LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE df.factura_id = ?`,
      [facturaId]
    );

    connection.release();

    console.log('✅ Detalle de factura obtenido:', {
      factura_id: facturaId,
      numero_factura: factura.numero_factura,
      total_detalles: detalles.length
    });

    res.json({
      success: true,
      factura: {
        id: factura.id,
        numero_factura: factura.numero_factura,
        fecha_emision: factura.fecha_emision,
        fecha_vencimiento: factura.fecha_vencimiento,
        periodo_facturacion: factura.periodo_facturacion,
        subtotal: parseFloat(factura.subtotal || 0),
        iva: parseFloat(factura.iva || 0),
        total: parseFloat(factura.total || 0),
        estado: factura.estado,
        observaciones: factura.observaciones
      },
      detalles: detalles.map(d => ({
        id: d.id,
        concepto: d.concepto_nombre || d.plan_nombre || 'Servicio',
        tipo_servicio: d.tipo_servicio,
        cantidad: d.cantidad || 1,
        precio_unitario: parseFloat(d.precio_unitario || 0),
        descuento: parseFloat(d.descuento || 0),
        subtotal: parseFloat(d.subtotal || 0),
        iva: parseFloat(d.iva || 0),
        total: parseFloat(d.total || 0)
      }))
    });

  } catch (error) {
    console.error('❌ Error en obtenerDetalleFactura:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener detalles de la factura',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
},

// 📄 Descargar PDF de factura
descargarFacturaPDF: async (req, res) => {
  try {
    const { facturaId } = req.params;
    
    // ✅ VERIFICAR QUE EL MIDDLEWARE PASÓ EL clienteId
    if (!req.clientePublico || !req.clientePublico.clienteId) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }
    
    const clienteId = req.clientePublico.clienteId;

    console.log(`📄 Generando PDF de factura ${facturaId} para cliente ${clienteId}`);

    const connection = await db.getConnection();

    // Verificar que la factura pertenece al cliente
    const [facturas] = await connection.query(
      'SELECT * FROM facturas WHERE id = ? AND cliente_id = ?',
      [facturaId, clienteId]
    );

    if (facturas.length === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false,
        message: 'Factura no encontrada' 
      });
    }

    const factura = facturas[0];

// Generar PDF usando PDFGenerator
const PDFGenerator = require('../utils/pdfGenerator');

// Obtener datos de empresa
const [empresaData] = await connection.query('SELECT * FROM configuracion_empresa WHERE id = 1');
const empresa = empresaData[0] || {};

const pdfBuffer = await PDFGenerator.generarFactura(factura, empresa);

    connection.release();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Buffer de PDF vacío');
    }

    console.log('✅ PDF de factura generado - Tamaño:', pdfBuffer.length, 'bytes');

    // Configurar headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Factura-${factura.numero_factura}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error generando PDF de factura:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error al generar el PDF de la factura',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
};

module.exports = consultaClienteController;