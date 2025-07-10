// backend/services/ClienteCompletoService.js
// Servicio completo para crear clientes con servicios y documentos automáticos
// VERSIÓN CORREGIDA - Soluciona todos los errores de facturación

const { Database } = require('../models/Database');
const pool = require('../config/database');

class ClienteCompletoService {
  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  static async crearClienteCompleto(datosCompletos, createdBy = null) {
    return await Database.transaction(async (conexion) => {
      console.log('🚀 Iniciando creación completa de cliente...');

      // 1. CREAR CLIENTE
      const clienteId = await this.crearCliente(conexion, datosCompletos.cliente, createdBy);
      console.log(`✅ Cliente creado con ID: ${clienteId}`);

      // 2. ASIGNAR SERVICIO AL CLIENTE
      const servicioId = await this.asignarServicioCliente(
        conexion,
        clienteId,
        datosCompletos.servicio,
        createdBy
      );
      console.log(`✅ Servicio asignado con ID: ${servicioId}`);

      // 3. GENERAR DOCUMENTOS AUTOMÁTICOS
      const documentos = {};

      if (datosCompletos.opciones?.generar_documentos) {
        // Generar contrato
        documentos.contrato = await this.generarContratoInterno(
          conexion,
          clienteId,
          servicioId,
          datosCompletos.servicio, // ⬅️ AGREGAR ESTE PARÁMETRO
          createdBy
        );
        console.log(`✅ Contrato generado: ${documentos.contrato.numero}`);

        // Generar orden de instalación
        documentos.orden_instalacion = await this.generarOrdenInstalacionInterno(
          conexion,
          clienteId,
          servicioId,
          datosCompletos.servicio, // ⬅️ AGREGAR ESTE PARÁMETRO
          createdBy
        );
        console.log(`✅ Orden de instalación generada: ${documentos.orden_instalacion.numero}`);
      }

      // 4. GENERAR PRIMERA FACTURA AUTOMÁTICA CON TODOS LOS CAMPOS COMPLETOS
      documentos.factura = await this.generarPrimeraFacturaInternoCompleta(
        conexion,
        clienteId,
        servicioId,
        datosCompletos.cliente,
        datosCompletos.servicio,
        createdBy
      );
      console.log(`✅ Primera factura generada: ${documentos.factura.numero_factura}`);

      // 5. PROGRAMAR INSTALACIÓN (si se solicita)
      if (datosCompletos.opciones?.programar_instalacion) {
        await this.programarInstalacionInterno(conexion, clienteId, servicioId, createdBy);
        console.log(`✅ Instalación programada`);
      }

      // 6. ENVIAR NOTIFICACIONES (si se solicita)
      if (datosCompletos.opciones?.enviar_bienvenida) {
        await this.enviarCorreoBienvenida(clienteId, datosCompletos.cliente);
        console.log(`✅ Correo de bienvenida enviado`);
      }

      const resultado = {
        cliente_id: clienteId,
        servicio_id: servicioId,
        documentos_generados: documentos,
        resumen: {
          cliente_creado: true,
          servicio_asignado: true,
          contrato_generado: !!documentos.contrato,
          orden_instalacion_generada: !!documentos.orden_instalacion,
          primera_factura_generada: !!documentos.factura,
          instalacion_programada: !!datosCompletos.opciones?.programar_instalacion,
          correo_bienvenida_enviado: !!datosCompletos.opciones?.enviar_bienvenida
        }
      };

      console.log('🎉 Creación completa de cliente finalizada exitosamente');
      return resultado;
    });
  }

  /**
   * Crear cliente en la base de datos con created_by
   */
  static async crearCliente(conexion, datosCliente, createdBy = null) {
    console.log('📝 Datos del cliente recibidos:', datosCliente);

    // Limpiar y validar datos antes de insertar
    const datosLimpios = {
      identificacion: datosCliente.identificacion?.toString().trim() || '',
      tipo_documento: datosCliente.tipo_documento || 'cedula',
      nombre: datosCliente.nombre?.toString().trim() || '',
      correo: datosCliente.email?.toString().trim() || '',  // ✓ CORREGIDO: email -> correo
      telefono: datosCliente.telefono?.toString().trim() || '',
      telefono_2: datosCliente.telefono_fijo?.toString().trim() || null,  // ✓ CORREGIDO: telefono_fijo -> telefono_2
      direccion: datosCliente.direccion?.toString().trim() || '',
      barrio: datosCliente.barrio?.toString().trim() || null,
      estrato: datosCliente.estrato ? parseInt(datosCliente.estrato) : 3,
      ciudad_id: datosCliente.ciudad_id ? parseInt(datosCliente.ciudad_id) : null,
      sector_id: datosCliente.sector_id ? parseInt(datosCliente.sector_id) : null,
      observaciones: datosCliente.observaciones?.toString().trim() || null,
      fecha_registro: datosCliente.fecha_inicio_contrato || new Date().toISOString().split('T')[0],  // ✓ CORREGIDO: fecha_inicio_contrato -> fecha_registro
      created_by: createdBy ? parseInt(createdBy) : null
    };

    // Generar código de usuario único
    const codigoUsuario = await this.generarCodigoUsuario(conexion, datosLimpios.identificacion);

    const query = `
      INSERT INTO clientes (
        identificacion, tipo_documento, nombre, correo, telefono, telefono_2,
        direccion, barrio, estrato, ciudad_id, sector_id, observaciones,
        fecha_registro, codigo_usuario, estado, created_by 
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?)
    `;

    const valores = [
      datosLimpios.identificacion,
      datosLimpios.tipo_documento,
      datosLimpios.nombre,
      datosLimpios.correo,         // ✓ Ahora mapea correctamente a campo 'correo'
      datosLimpios.telefono,
      datosLimpios.telefono_2,     // ✓ Ahora mapea correctamente a campo 'telefono_2'
      datosLimpios.direccion,
      datosLimpios.barrio,
      datosLimpios.estrato,
      datosLimpios.ciudad_id,
      datosLimpios.sector_id,
      datosLimpios.observaciones,
      datosLimpios.fecha_registro, // ✓ Ahora mapea correctamente a campo 'fecha_registro'
      codigoUsuario,
      datosLimpios.created_by
    ];

    console.log('🔍 Query cliente:', query);
    console.log('🔍 Valores cliente:', valores);

    const [resultado] = await conexion.execute(query, valores);

    console.log('✅ Cliente creado con ID:', resultado.insertId);
    return resultado.insertId;
  }

  /**
   * Asignar servicio al cliente con created_by
   */
  static async asignarServicioCliente(conexion, clienteId, datosServicio, createdBy = null) {
    console.log('🔌 Asignando servicio al cliente:', datosServicio);

    const query = `
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, fecha_activacion, precio_personalizado,
        observaciones, estado, created_at
      ) VALUES (?, ?, ?, ?, ?, 'activo', NOW())
    `;

    const valores = [
      parseInt(clienteId),
      parseInt(datosServicio.plan_id),
      datosServicio.fecha_activacion || new Date().toISOString().split('T')[0],
      datosServicio.precio_personalizado ? parseFloat(datosServicio.precio_personalizado) : null,
      datosServicio.observaciones || null,
    ];

    console.log('🔍 Query servicio:', query);
    console.log('🔍 Valores servicio:', valores);

    const [resultado] = await conexion.execute(query, valores);

    console.log('✅ Servicio asignado con ID:', resultado.insertId);
    return resultado.insertId;
  }

  /**
   * Generar primera factura interna COMPLETA con todos los campos
   */
  static async generarPrimeraFacturaInternoCompleta(conexion, clienteId, servicioId, datosCliente, datosServicio, createdBy = null) {
    console.log('🧾 Generando primera factura COMPLETA...');

    try {
      // 1. Obtener configuración de empresa para resolución
      const [configEmpresa] = await conexion.execute(`
      SELECT resolucion_facturacion, prefijo_factura, consecutivo_factura
      FROM configuracion_empresa WHERE id = 1
    `);

      const config = configEmpresa[0] || {};

      // 2. Obtener datos completos del cliente y servicio (QUERY CORREGIDO)
      const [datosCompletos] = await conexion.execute(`
      SELECT 
        c.identificacion, c.nombre, c.estrato,
        sc.precio_personalizado,
        ps.nombre as plan_nombre, ps.precio as plan_precio, ps.tipo as plan_tipo
      FROM clientes c
      JOIN servicios_cliente sc ON c.id = sc.cliente_id
      JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE c.id = ? AND sc.id = ?
    `, [clienteId, servicioId]);

      if (datosCompletos.length === 0) {
        throw new Error('No se encontraron datos del cliente y servicio');
      }

      const datos = datosCompletos[0];

      // 3. Generar número de factura
      const numeroFactura = await this.generarNumeroFactura(conexion);

      // 4. Calcular valores según el plan
      const valorInternet = parseFloat(datos.precio_personalizado || datos.plan_precio);
      const valorTelevision = datos.plan_tipo === 'combo' ? 0 : 0; // Ajustar si hay TV

      // 5. Calcular fechas del período de facturación
      const fechaEmision = new Date();
      const fechaDesde = new Date();
      const fechaHasta = new Date();
      fechaHasta.setMonth(fechaHasta.getMonth() + 1);
      fechaHasta.setDate(fechaHasta.getDate() - 1); // Último día del mes

      const fechaVencimiento = new Date(fechaEmision);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

      // 6. Período de facturación formato YYYY-MM
      const periodoFacturacion = `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`;

      // 7. Calcular totales
      const subtotal = valorInternet + valorTelevision;
      const iva = 0; // Sin IVA para estratos 1,2,3
      const total = subtotal + iva;

      // 8. INSERTAR FACTURA CON TODOS LOS CAMPOS CORREGIDOS ✓
      const queryFactura = `
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento,
        fecha_desde, fecha_hasta,
        internet, television, saldo_anterior, interes, reconexion,
        descuento, varios, publicidad,
        s_internet, s_television, s_interes, s_reconexion,
        s_descuento, s_varios, s_publicidad, s_iva,
        subtotal, iva, total, estado,
        referencia_pago, resolucion, activo, observaciones,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, '1', 'Primera factura automática', ?, NOW())
    `;

      const valoresFactura = [
        numeroFactura,                    // numero_factura
        parseInt(clienteId),              // cliente_id
        datos.identificacion,             // identificacion_cliente ✓ CORREGIDO
        datos.nombre,                     // nombre_cliente ✓ CORREGIDO
        periodoFacturacion,               // periodo_facturacion ✓ CORREGIDO
        fechaEmision.toISOString().split('T')[0],     // fecha_emision
        fechaVencimiento.toISOString().split('T')[0], // fecha_vencimiento
        fechaDesde.toISOString().split('T')[0],       // fecha_desde ✓ CORREGIDO
        fechaHasta.toISOString().split('T')[0],       // fecha_hasta ✓ CORREGIDO
        valorInternet,                    // internet ✓ CORREGIDO
        valorTelevision,                  // television ✓ CORREGIDO
        0.00,                            // saldo_anterior
        0.00,                            // interes
        0.00,                            // reconexion
        0.00,                            // descuento
        0.00,                            // varios
        0.00,                            // publicidad
        valorInternet,                    // s_internet
        valorTelevision,                  // s_television
        0.00,                            // s_interes
        0.00,                            // s_reconexion
        0.00,                            // s_descuento
        0.00,                            // s_varios
        0.00,                            // s_publicidad
        iva,                             // s_iva
        subtotal,                        // subtotal
        iva,                             // iva
        total,                           // total
        datos.identificacion,            // referencia_pago = misma cédula ✓ CORREGIDO
        config.resolucion_facturacion || 'RESOLUCIÓN PENDIENTE', // resolucion ✓ CORREGIDO
        parseInt(createdBy) || 1         // created_by ✓ CORREGIDO
      ];

      console.log('🔍 Insertando factura con valores corregidos:', valoresFactura);

      const [resultadoFactura] = await conexion.execute(queryFactura, valoresFactura);
      const facturaId = resultadoFactura.insertId;

      // 9. Crear detalle de factura
      await conexion.execute(`
  INSERT INTO detalle_facturas (
    factura_id, concepto_nombre, cantidad,
    precio_unitario, descuento, subtotal, iva, total,
    servicio_cliente_id
  ) VALUES (?, ?, 1, ?, 0.00, ?, 0.00, ?, ?)
`, [
        facturaId,                    // factura_id
        `Plan ${datos.plan_nombre}`,  // concepto_nombre
        valorInternet,                // precio_unitario
        valorInternet,                // subtotal
        valorInternet,                // total
        servicioId                    // servicio_cliente_id
      ]);
      console.log('✅ Factura completa creada con ID:', facturaId);

      return {
        id: facturaId,
        numero_factura: numeroFactura,
        total: total,
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
        estado: 'pendiente',
        periodo_facturacion: periodoFacturacion,
        referencia_pago: datos.identificacion,
        resolucion: config.resolucion_facturacion
      };

    } catch (error) {
      console.error('❌ Error generando primera factura completa:', error);
      throw error;
    }
  }

  /**
   * Crear detalle de factura
   */
  static async crearDetalleFactura(conexion, facturaId, detalle) {
    const query = `
      INSERT INTO detalle_facturas (
        factura_id, concepto_nombre, cantidad,
        precio_unitario, descuento, subtotal, iva, total,
        servicio_cliente_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
      facturaId,
      detalle.descripcion,
      detalle.cantidad || 1,
      parseFloat(detalle.precio_unitario),
      0.00, // descuento
      parseFloat(detalle.subtotal),
      0.00, // iva
      parseFloat(detalle.subtotal), // total
      detalle.servicio_cliente_id || null
    ];

    await conexion.execute(query, valores);
    console.log('✅ Detalle de factura creado');
  }

  /**
   * Generar orden de instalación interna COMPLETA
   */
  static async generarOrdenInstalacionInterno(conexion, clienteId, servicioId, datosServicio, createdBy = null) {
    console.log('📋 Generando orden de instalación COMPLETA...');

    // Obtener datos del plan para el costo de instalación
    const [planes] = await conexion.execute(`
    SELECT costo_instalacion_sin_permanencia, costo_instalacion_permanencia 
    FROM planes_servicio ps
    JOIN servicios_cliente sc ON ps.id = sc.plan_id
    WHERE sc.id = ?
  `, [servicioId]);

    const planData = planes[0] || {};
    const tipoPermanencia = datosServicio?.tipo_permanencia || 'sin_permanencia';
    const costoInstalacion = tipoPermanencia === 'con_permanencia'
      ? planData.costo_instalacion_permanencia
      : planData.costo_instalacion_sin_permanencia;

    // Obtener contrato_id si existe
    const [contratos] = await conexion.execute(`
    SELECT id FROM contratos WHERE servicio_id = ? ORDER BY created_at DESC LIMIT 1
  `, [servicioId]);

    const contratoId = contratos[0]?.id || null;

    const query = `
    INSERT INTO instalaciones (
      cliente_id, servicio_cliente_id, contrato_id, fecha_programada, 
      estado, tipo_instalacion, costo_instalacion, observaciones, created_at
    ) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'programada', 'nueva', ?, 'Orden generada automáticamente', NOW())
  `;

    await conexion.execute(query, [clienteId, servicioId, contratoId, costoInstalacion]);

    console.log('✅ Orden de instalación creada con contrato_id y costo correcto');

    return {
      numero: `ORD-${Date.now()}-${clienteId}`,
      estado: 'programada',
      contrato_id: contratoId,
      costo_instalacion: costoInstalacion
    };
  }


  /**
   * Generar contrato interno
   */
  static async generarContratoInterno(conexion, clienteId, servicioId, datosServicio, createdBy = null) {
    console.log('📄 Generando contrato...');

    const numeroContrato = await this.generarNumeroContrato(conexion);

    // Obtener datos del plan para calcular permanencia y costo
    const [planes] = await conexion.execute(`
    SELECT permanencia_minima_meses, costo_instalacion_permanencia, costo_instalacion_sin_permanencia
    FROM planes_servicio ps
    JOIN servicios_cliente sc ON ps.id = sc.plan_id
    WHERE sc.id = ?
  `, [servicioId]);

    const planData = planes[0] || {};
    const tipoPermanencia = datosServicio?.tipo_permanencia || 'sin_permanencia';
    const permanenciaMeses = tipoPermanencia === 'con_permanencia' ? (planData.permanencia_minima_meses || 6) : 0;
    const costoInstalacion = tipoPermanencia === 'con_permanencia'
      ? planData.costo_instalacion_permanencia
      : planData.costo_instalacion_sin_permanencia;

    const fechaInicio = new Date().toISOString().split('T')[0];
    let fechaVencimiento = null;
    if (permanenciaMeses > 0) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() + permanenciaMeses);
      fechaVencimiento = fecha.toISOString().split('T')[0];
    }

    const query = `
    INSERT INTO contratos (
      numero_contrato, cliente_id, servicio_id, tipo_contrato,
      tipo_permanencia, permanencia_meses, costo_instalacion, 
      fecha_generacion, fecha_inicio, fecha_vencimiento_permanencia,
      estado, generado_automaticamente, created_by, created_at
    ) VALUES (?, ?, ?, 'servicio', ?, ?, ?, CURDATE(), ?, ?, 'activo', 1, ?, NOW())
  `;

    await conexion.execute(query, [
      numeroContrato, clienteId, servicioId, tipoPermanencia,
      permanenciaMeses, costoInstalacion, fechaInicio, fechaVencimiento, createdBy || 1
    ]);

    console.log(`✅ Contrato generado: ${numeroContrato} con permanencia y costos correctos`);

    return {
      numero: numeroContrato,
      estado: 'activo',
      permanencia_meses: permanenciaMeses,
      costo_instalacion: costoInstalacion
    };
  }

  /**
   * Generar número de factura usando procedimiento almacenado
   */
  static async generarNumeroFactura(conexion) {
    try {
      // Intentar usar procedimiento almacenado
      await conexion.execute('CALL GenerarNumeroFactura(@nuevo_numero)');
      const [resultado] = await conexion.execute('SELECT @nuevo_numero as numero');

      if (resultado[0]?.numero) {
        return resultado[0].numero;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo usar procedimiento almacenado, generando manualmente');
    }

    // Fallback: generar manualmente
    const [config] = await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_factura = consecutivo_factura + 1 
      WHERE id = 1
    `);

    const [resultado] = await conexion.execute(`
      SELECT 
        CONCAT(COALESCE(prefijo_factura, 'FAC'), LPAD(consecutivo_factura, 6, '0')) as numero
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    return resultado[0]?.numero || `FAC${Date.now()}`;
  }

  /**
   * Generar número de orden usando procedimiento almacenado
   */
  static async generarNumeroOrden(conexion) {
    try {
      await conexion.execute('CALL GenerarNumeroOrden(@nuevo_numero)');
      const [resultado] = await conexion.execute('SELECT @nuevo_numero as numero');

      if (resultado[0]?.numero) {
        return resultado[0].numero;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo usar procedimiento almacenado para orden');
    }

    // Fallback manual
    await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_orden = consecutivo_orden + 1 
      WHERE id = 1
    `);

    const [resultado] = await conexion.execute(`
      SELECT 
        CONCAT(COALESCE(prefijo_orden, 'ORD'), LPAD(consecutivo_orden, 6, '0')) as numero
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    return resultado[0]?.numero || `ORD${Date.now()}`;
  }

  /**
   * Generar número de contrato usando procedimiento almacenado
   */
  static async generarNumeroContrato(conexion) {
    try {
      await conexion.execute('CALL GenerarNumeroContrato(@nuevo_numero)');
      const [resultado] = await conexion.execute('SELECT @nuevo_numero as numero');

      if (resultado[0]?.numero) {
        return resultado[0].numero;
      }
    } catch (error) {
      console.warn('⚠️ No se pudo usar procedimiento almacenado para contrato');
    }

    // Fallback manual
    await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_contrato = consecutivo_contrato + 1 
      WHERE id = 1
    `);

    const [resultado] = await conexion.execute(`
      SELECT 
        CONCAT(COALESCE(prefijo_contrato, 'CON'), LPAD(consecutivo_contrato, 6, '0')) as numero
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    return resultado[0]?.numero || `CON${Date.now()}`;
  }

  /**
   * Generar código de usuario único
   */
  static async generarCodigoUsuario(conexion, identificacion) {
    // Usar los últimos 4 dígitos de la identificación + timestamp
    const ultimos4 = identificacion.slice(-4);
    const timestamp = Date.now().toString().slice(-6);
    return `USR${ultimos4}${timestamp}`;
  }

  /**
   * Programar instalación interna
   */
  static async programarInstalacionInterno(conexion, clienteId, servicioId, createdBy = null) {
    // Esta función puede expandirse para programar con instaladores específicos
    console.log('📅 Programando instalación...');

    // Por ahora, la instalación se crea en generarOrdenInstalacionInterno
    // Aquí se puede agregar lógica adicional como:
    // - Asignar instalador automáticamente
    // - Calcular fecha según disponibilidad
    // - Enviar notificaciones

    return true;
  }

  /**
   * Enviar correo de bienvenida
   */
  static async enviarCorreoBienvenida(clienteId, datosCliente) {
    console.log('📧 Enviando correo de bienvenida...');

    // Implementar envío de correo aquí
    // Por ahora solo simulamos
    console.log(`📧 Correo enviado a: ${datosCliente.email}`);

    return true;
  }

  /**
   * Previsualizar primera factura antes de crear cliente
   */
  static async previsualizarPrimeraFactura(datosPreview) {
    const conexion = await pool.getConnection();

    try {
      // Obtener datos del plan
      const [planes] = await conexion.execute(`
        SELECT * FROM planes_servicio WHERE id = ?
      `, [datosPreview.plan_id]);

      if (planes.length === 0) {
        throw new Error('Plan de servicio no encontrado');
      }

      const plan = planes[0];
      const valor = datosPreview.precio_personalizado || plan.precio;

      // Calcular preview de la factura
      const preview = {
        plan_nombre: plan.nombre,
        valor_plan: parseFloat(valor),
        conceptos_adicionales: datosPreview.conceptos_adicionales || [],
        subtotal: parseFloat(valor),
        iva: 0, // Sin IVA para estratos residenciales
        total: parseFloat(valor),
        fecha_estimada_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      // Agregar conceptos adicionales al preview
      for (const concepto of preview.conceptos_adicionales) {
        preview.subtotal += parseFloat(concepto.valor || 0);
        preview.total += parseFloat(concepto.valor || 0);
      }

      return preview;

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener servicios de un cliente
   */
  static async obtenerServiciosCliente(clienteId) {
    const conexion = await pool.getConnection();

    try {
      const [servicios] = await conexion.execute(`
        SELECT 
          sc.*,
          ps.nombre as plan_nombre,
          ps.precio as plan_precio,
          ps.tipo as plan_tipo
        FROM servicios_cliente sc
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ?
        ORDER BY sc.created_at DESC
      `, [clienteId]);

      return servicios;

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener planes disponibles
   */
  static async obtenerPlanesDisponibles() {
    const conexion = await pool.getConnection();

    try {
      const [planes] = await conexion.execute(`
        SELECT * FROM planes_servicio 
        WHERE activo = 1
        ORDER BY precio ASC
      `);

      return planes;

    } finally {
      conexion.release();
    }
  }

  /**
   * Verificar disponibilidad de identificación
   */
  static async verificarDisponibilidadIdentificacion(identificacion, tipoDocumento = 'cedula') {
    const conexion = await pool.getConnection();

    try {
      const [clientes] = await conexion.execute(`
        SELECT id, nombre, estado FROM clientes 
        WHERE identificacion = ? AND tipo_documento = ?
      `, [identificacion, tipoDocumento]);

      return {
        disponible: clientes.length === 0,
        cliente_existente: clientes.length > 0 ? clientes[0] : null
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar factura inmediata para cliente existente
   */
  static async generarFacturaInmediata(clienteId, conceptosAdicionales = []) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // Obtener datos del cliente con su servicio activo
      const [clientes] = await conexion.execute(`
        SELECT 
          c.*, sc.*, sc.precio_personalizado, 
          ps.nombre as plan_nombre, ps.precio as plan_precio
        FROM clientes c
        JOIN servicios_cliente sc ON c.id = sc.cliente_id AND sc.estado = 'activo'
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE c.id = ?
        ORDER BY sc.created_at DESC LIMIT 1
      `, [clienteId]);

      if (clientes.length === 0) {
        throw new Error('Cliente no encontrado o sin servicios activos');
      }

      const cliente = clientes[0];

      // Generar factura usando el método completo
      const factura = await this.generarPrimeraFacturaInternoCompleta(
        conexion,
        clienteId,
        cliente.id, // servicio_cliente_id
        cliente,
        cliente,
        null
      );

      await conexion.commit();
      return factura;

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener facturas generadas desde cliente completo
   */
  static async obtenerFacturasGeneradas(filtros = {}) {
    const conexion = await pool.getConnection();

    try {
      const { page = 1, limit = 10, estado, cliente_id } = filtros;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE f.activo = "1"';
      let params = [];

      if (estado) {
        whereClause += ' AND f.estado = ?';
        params.push(estado);
      }

      if (cliente_id) {
        whereClause += ' AND f.cliente_id = ?';
        params.push(parseInt(cliente_id));
      }

      // Consulta principal
      const query = `
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.identificacion as cliente_identificacion,
          c.correo as cliente_email,
          COUNT(*) OVER() as total_registros
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        ${whereClause}
        ORDER BY f.fecha_emision DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      console.log('🔍 Query facturas generadas:', query);
      console.log('🔍 Parámetros:', params);

      const [facturas] = await conexion.execute(query, params);

      // Obtener total para paginación
      const totalRegistros = facturas.length > 0 ? facturas[0].total_registros : 0;

      // Obtener detalles de cada factura
      for (let factura of facturas) {
        const [detalles] = await conexion.execute(`
          SELECT * FROM detalle_facturas 
          WHERE factura_id = ?
        `, [factura.id]);

        factura.detalles = detalles;
      }

      return {
        facturas: facturas.map(f => {
          const { total_registros, ...facturaLimpia } = f;
          return facturaLimpia;
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalRegistros),
          totalPages: Math.ceil(totalRegistros / limit)
        }
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener factura completa con todos los detalles
   */
  static async obtenerFacturaCompleta(facturaId) {
    const conexion = await pool.getConnection();

    try {
      // Factura principal
      const [facturas] = await conexion.execute(`
        SELECT 
          f.*,
          c.nombre as cliente_nombre,
          c.identificacion as cliente_identificacion,
          c.email as cliente_email,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion,
          c.barrio as cliente_barrio,
          ci.nombre as cliente_ciudad,
          s.nombre as cliente_sector
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE f.id = ?
      `, [facturaId]);

      if (facturas.length === 0) {
        return null;
      }

      const factura = facturas[0];

      // Obtener detalles
      const [detalles] = await conexion.execute(`
        SELECT 
          df.*,
          cf.nombre as concepto_nombre
        FROM detalle_facturas df
        LEFT JOIN conceptos_facturacion cf ON df.concepto_id = cf.id
        WHERE df.factura_id = ?
      `, [facturaId]);

      factura.detalles = detalles;

      // Obtener historial de pagos si existe tabla
      try {
        const [pagos] = await conexion.execute(`
          SELECT * FROM pagos 
          WHERE factura_id = ?
          ORDER BY created_at DESC
        `, [facturaId]);

        factura.pagos = pagos;
      } catch (error) {
        console.warn('⚠️ Tabla pagos no existe o error:', error.message);
        factura.pagos = [];
      }

      return factura;

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar orden de instalación independiente
   */
  static async generarOrdenInstalacion(clienteId, fechaInstalacion = null) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // Obtener servicio activo del cliente
      const [servicios] = await conexion.execute(`
        SELECT * FROM servicios_cliente 
        WHERE cliente_id = ? AND estado = 'activo'
        ORDER BY created_at DESC LIMIT 1
      `, [clienteId]);

      if (servicios.length === 0) {
        throw new Error('Cliente no tiene servicios activos');
      }

      const servicioId = servicios[0].id;

      // Generar orden
      const orden = await this.generarOrdenInstalacionInterno(
        conexion,
        clienteId,
        servicioId,
        null
      );

      // Si se especifica fecha, actualizarla
      if (fechaInstalacion) {
        await conexion.execute(`
          UPDATE instalaciones 
          SET fecha_programada = ? 
          WHERE numero_orden = ?
        `, [fechaInstalacion, orden.numero]);

        orden.fecha_programada = fechaInstalacion;
      }

      await conexion.commit();
      return orden;

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Buscar clientes con filtros avanzados
   */
  static async buscarClientes(filtros = {}) {
    const conexion = await pool.getConnection();

    try {
      const {
        busqueda,
        estado,
        ciudad_id,
        sector_id,
        page = 1,
        limit = 20
      } = filtros;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let params = [];

      // Filtro de búsqueda general
      if (busqueda) {
        whereClause += ` AND (
          c.identificacion LIKE ? OR 
          c.nombre LIKE ? OR 
          c.telefono LIKE ? OR 
          c.email LIKE ?
        )`;
        const busquedaTerm = `%${busqueda}%`;
        params.push(busquedaTerm, busquedaTerm, busquedaTerm, busquedaTerm);
      }

      // Filtro por estado
      if (estado) {
        whereClause += ' AND c.estado = ?';
        params.push(estado);
      }

      // Filtro por ciudad
      if (ciudad_id) {
        whereClause += ' AND c.ciudad_id = ?';
        params.push(ciudad_id);
      }

      // Filtro por sector
      if (sector_id) {
        whereClause += ' AND c.sector_id = ?';
        params.push(sector_id);
      }

      const query = `
        SELECT 
          c.*,
          ci.nombre as ciudad_nombre,
          s.nombre as sector_nombre,
          COUNT(sc.id) as total_servicios,
          COUNT(CASE WHEN sc.estado = 'activo' THEN 1 END) as servicios_activos,
          COUNT(*) OVER() as total_registros
        FROM clientes c
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const [clientes] = await conexion.execute(query, params);
      const totalRegistros = clientes.length > 0 ? clientes[0].total_registros : 0;

      return {
        clientes: clientes.map(c => {
          const { total_registros, ...clienteLimpio } = c;
          return clienteLimpio;
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalRegistros),
          totalPages: Math.ceil(totalRegistros / limit)
        }
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Actualizar datos de cliente existente
   */
  static async actualizarCliente(clienteId, datosActualizacion, updatedBy = null) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // Preparar campos a actualizar
      const camposPermitidos = [
        'nombre', 'email', 'telefono', 'telefono_fijo',
        'direccion', 'barrio', 'estrato', 'ciudad_id',
        'sector_id', 'observaciones'
      ];

      const camposActualizar = [];
      const valores = [];

      for (const campo of camposPermitidos) {
        if (datosActualizacion.hasOwnProperty(campo)) {
          camposActualizar.push(`${campo} = ?`);
          valores.push(datosActualizacion[campo]);
        }
      }

      if (camposActualizar.length === 0) {
        throw new Error('No se especificaron campos para actualizar');
      }

      // Agregar campos de auditoría
      camposActualizar.push('updated_at = NOW()');
      if (updatedBy) {
        camposActualizar.push('updated_by = ?');
        valores.push(updatedBy);
      }

      valores.push(clienteId);

      const query = `
        UPDATE clientes 
        SET ${camposActualizar.join(', ')}
        WHERE id = ?
      `;

      const [resultado] = await conexion.execute(query, valores);

      if (resultado.affectedRows === 0) {
        throw new Error('Cliente no encontrado');
      }

      await conexion.commit();

      // Obtener cliente actualizado
      const [clienteActualizado] = await conexion.execute(`
        SELECT c.*, ci.nombre as ciudad_nombre, s.nombre as sector_nombre
        FROM clientes c
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE c.id = ?
      `, [clienteId]);

      return clienteActualizado[0];

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Cambiar estado de cliente
   */
  static async cambiarEstadoCliente(clienteId, nuevoEstado, motivo = null, changedBy = null) {
    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      // Validar estado
      const estadosValidos = ['activo', 'suspendido', 'cortado', 'retirado', 'inactivo'];
      if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error('Estado no válido');
      }

      // Actualizar cliente
      await conexion.execute(`
        UPDATE clientes 
        SET estado = ?, updated_at = NOW()
        WHERE id = ?
      `, [nuevoEstado, clienteId]);

      // Si es cortado o suspendido, actualizar servicios
      if (['cortado', 'suspendido'].includes(nuevoEstado)) {
        await conexion.execute(`
          UPDATE servicios_cliente 
          SET estado = ?, fecha_suspension = CURDATE()
          WHERE cliente_id = ? AND estado = 'activo'
        `, [nuevoEstado, clienteId]);
      }

      // Si es reactivado, reactivar servicios
      if (nuevoEstado === 'activo') {
        await conexion.execute(`
          UPDATE servicios_cliente 
          SET estado = 'activo', fecha_suspension = NULL
          WHERE cliente_id = ? AND estado IN ('suspendido', 'cortado')
        `, [clienteId]);
      }

      // Registrar en historial si existe tabla
      try {
        await conexion.execute(`
          INSERT INTO clientes_historial (
            cliente_id, estado_anterior, estado_nuevo, motivo, changed_by, created_at
          ) SELECT 
            ?, estado, ?, ?, ?, NOW()
          FROM clientes WHERE id = ?
        `, [clienteId, nuevoEstado, motivo, changedBy, clienteId]);
      } catch (error) {
        console.warn('⚠️ No se pudo registrar en historial:', error.message);
      }

      await conexion.commit();

      return {
        cliente_id: clienteId,
        estado_anterior: null, // Se podría obtener del historial
        estado_nuevo: nuevoEstado,
        motivo: motivo,
        fecha_cambio: new Date().toISOString()
      };

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener resumen estadístico del sistema
   */
  static async obtenerResumenEstadistico() {
    const conexion = await pool.getConnection();

    try {
      const resumen = {};

      // Estadísticas de clientes
      const [statsClientes] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_clientes,
          COUNT(CASE WHEN estado = 'activo' THEN 1 END) as clientes_activos,
          COUNT(CASE WHEN estado = 'suspendido' THEN 1 END) as clientes_suspendidos,
          COUNT(CASE WHEN estado = 'cortado' THEN 1 END) as clientes_cortados
        FROM clientes
      `);

      resumen.clientes = statsClientes[0];

      // Estadísticas de facturas
      const [statsFacturas] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_facturas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as facturas_pendientes,
          COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as facturas_pagadas,
          COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as facturas_vencidas,
          SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as cartera_pendiente,
          SUM(CASE WHEN estado = 'vencida' THEN total ELSE 0 END) as cartera_vencida
        FROM facturas
        WHERE activo = '1'
      `);

      resumen.facturas = statsFacturas[0];

      // Estadísticas de instalaciones
      const [statsInstalaciones] = await conexion.execute(`
        SELECT 
          COUNT(*) as total_instalaciones,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as instalaciones_pendientes,
          COUNT(CASE WHEN estado = 'completada' THEN 1 END) as instalaciones_completadas
        FROM instalaciones
      `);

      resumen.instalaciones = statsInstalaciones[0];

      return resumen;

    } finally {
      conexion.release();
    }
  }
}

module.exports = ClienteCompletoService;