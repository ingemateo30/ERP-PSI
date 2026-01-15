// backend/services/ClienteCompletoService.js
// Servicio completo para crear clientes con servicios y documentos automáticos
// VERSIÓN CORREGIDA - Soluciona todos los errores de facturación

const { Database } = require('../models/Database');
const pool = require('../config/database');
const IVACalculatorService = require('./IVACalculatorService');

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

      // ✅ CORRECCIÓN 1: Manejar estructura del frontend (servicios array vs servicio singular)
      const serviciosData = datosCompletos.servicios || datosCompletos.sedes || [];
      let servicioData = datosCompletos.servicio;

      // Si no hay servicio singular pero sí servicios array, usar el primero
      if (!servicioData && serviciosData.length > 0) {
        const primerServicio = serviciosData[0];

        // Convertir estructura del frontend a lo que espera el backend
        servicioData = {
          plan_id: primerServicio.planInternetId || primerServicio.planTelevisionId || primerServicio.plan_id,
          tipo_permanencia: primerServicio.tipoContrato || 'sin_permanencia',
          precio_personalizado: primerServicio.precioInternetCustom || primerServicio.precioTelevisionCustom || primerServicio.precio_personalizado,
          fecha_activacion: primerServicio.fechaActivacion || primerServicio.fecha_activacion || new Date().toISOString().split('T')[0],
          observaciones: primerServicio.observaciones || ''
        };

        console.log('🔄 Convertido servicios array a servicio singular:', servicioData);
      }

      // 2. ✅ CORRECCIÓN 2: IMPLEMENTAR método asignarServicioCliente que estaba vacío
      const servicioId = await this.asignarServicioCliente(
        conexion,
        clienteId,
        servicioData,
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
          servicioData,
          createdBy
        );
        console.log(`✅ Contrato generado: ${documentos.contrato.numero}`);

        // Generar orden de instalación
        documentos.orden_instalacion = await this.generarOrdenInstalacionInterno(
          conexion,
          clienteId,
          servicioId,
          createdBy
        );
        console.log(`✅ Orden de instalación generada: ${documentos.orden_instalacion.numero}`);
      }

      // 4. GENERAR PRIMERA FACTURA AUTOMÁTICA
      documentos.factura = await this.generarPrimeraFacturaInternoCompleta(
        conexion,
        clienteId,
        servicioId,
        datosCompletos.cliente,
        servicioData,
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
        await this.enviarCorreoBienvenida(conexion, clienteId, datosCompletos.cliente);
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

    // ✅ Función auxiliar para manejar undefined/null/empty
    const limpiarValor = (valor) => {
      if (valor === undefined || valor === '' || valor === null) return null;
      if (typeof valor === 'string') return valor.trim() || null;
      return valor;
    };

    // Limpiar y validar datos antes de insertar
    const datosLimpios = {
      identificacion: limpiarValor(datosCliente.identificacion) || '',
      tipo_documento: datosCliente.tipo_documento || 'cedula',
      nombre: limpiarValor(datosCliente.nombre) || '',
      correo: limpiarValor(datosCliente.email) || limpiarValor(datosCliente.correo),
      telefono: limpiarValor(datosCliente.telefono) || '',
      telefono_2: limpiarValor(datosCliente.telefono_fijo) || limpiarValor(datosCliente.telefono_2),
      direccion: limpiarValor(datosCliente.direccion) || '',
      barrio: limpiarValor(datosCliente.barrio),
      estrato: datosCliente.estrato ? parseInt(datosCliente.estrato) : 3,
      ciudad_id: datosCliente.ciudad_id ? parseInt(datosCliente.ciudad_id) : null,
      sector_id: datosCliente.sector_id ? parseInt(datosCliente.sector_id) : null,
      observaciones: limpiarValor(datosCliente.observaciones),
      fecha_registro: datosCliente.fecha_inicio_contrato || new Date().toISOString().split('T')[0],
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
      datosLimpios.correo,
      datosLimpios.telefono,
      datosLimpios.telefono_2,
      datosLimpios.direccion,
      datosLimpios.barrio,
      datosLimpios.estrato,
      datosLimpios.ciudad_id,
      datosLimpios.sector_id,
      datosLimpios.observaciones,
      datosLimpios.fecha_registro,
      codigoUsuario,
      datosLimpios.created_by
    ];

    console.log('🔍 Query cliente:', query);
    console.log('🔍 Valores cliente:', valores);

    // ✅ Verificar que NO hay undefined en los parámetros
    const undefinedIndices = valores.map((param, index) =>
      param === undefined ? index : null
    ).filter(index => index !== null);

    if (undefinedIndices.length > 0) {
      console.error('❌ Parámetros undefined encontrados en índices:', undefinedIndices);
      throw new Error(`Parámetros undefined en la consulta SQL en posiciones: ${undefinedIndices.join(', ')}`);
    }

    const [resultado] = await conexion.execute(query, valores);

    console.log('✅ Cliente creado con ID:', resultado.insertId);
    return resultado.insertId;
  }

  /**
   * Asignar servicio al cliente con created_by
   */
  static async asignarServicioCliente(conexion, clienteId, datosServicio, createdBy = null) {
    console.log('🔌 Asignando servicio al cliente:', datosServicio);

    if (!datosServicio) {
      throw new Error('Datos del servicio son requeridos');
    }

    if (!datosServicio.plan_id) {
      throw new Error('ID del plan es requerido');
    }

    // ✅ Función auxiliar para manejar undefined/null/empty
    const limpiarValor = (valor) => {
      if (valor === undefined || valor === '' || valor === null) return null;
      if (typeof valor === 'string') return valor.trim() || null;
      return valor;
    };

    // Verificar que el plan existe
    const [planes] = await conexion.execute(
      'SELECT * FROM planes_servicio WHERE id = ? AND activo = 1',
      [datosServicio.plan_id]
    );

    if (planes.length === 0) {
      throw new Error(`Plan de servicio no encontrado o inactivo: ${datosServicio.plan_id}`);
    }

    const plan = planes[0];

    // Calcular precio final
    const precioFinal = datosServicio.precio_personalizado ?
      parseFloat(datosServicio.precio_personalizado) :
      plan.precio;

    // Preparar datos del servicio
    const datosLimpios = {
      cliente_id: clienteId,
      plan_id: parseInt(datosServicio.plan_id),
      precio_personalizado: precioFinal,
      direccion_servicio: limpiarValor(datosServicio.direccion_servicio) || 'Misma dirección del cliente',
      fecha_activacion: datosServicio.fecha_activacion || new Date().toISOString().split('T')[0],
      estado: 'activo',
      observaciones: limpiarValor(datosServicio.observaciones),
      created_by: createdBy ? parseInt(createdBy) : null
    };

    const query = `
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, precio_personalizado,
        fecha_activacion, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const valores = [
      datosLimpios.cliente_id,
      datosLimpios.plan_id,
      datosLimpios.precio_personalizado,
      datosLimpios.fecha_activacion,
      datosLimpios.estado,
      datosLimpios.observaciones,

    ];

    console.log('🔍 Query servicio:', query);
    console.log('🔍 Valores servicio:', valores);

    // ✅ Verificar que NO hay undefined en los parámetros
    const undefinedIndices = valores.map((param, index) =>
      param === undefined ? index : null
    ).filter(index => index !== null);

    if (undefinedIndices.length > 0) {
      console.error('❌ Parámetros undefined en servicio:', undefinedIndices);
      throw new Error(`Parámetros undefined en servicios_cliente en posiciones: ${undefinedIndices.join(', ')}`);
    }

    const [resultado] = await conexion.execute(query, valores);

    const servicioId = resultado.insertId;
    console.log('✅ Servicio creado con ID:', servicioId);

    return servicioId;
  }
  /**
   * Generar primera factura interna COMPLETA con todos los campos
   */
  static async generarPrimeraFacturaInternoCompleta(conexion, clienteId, servicioId, datosCliente, datosServicio, createdBy = null) {
    console.log('🧾 Generando primera factura COMPLETA...');

    try {
      // 1. Obtener configuración de empresa para resolución
      const [configEmpresa] = await conexion.execute(`
        SELECT resolucion_facturacion, prefijo_factura, consecutivo_factura,
               empresa_nombre, empresa_nit, porcentaje_iva
        FROM configuracion_empresa WHERE id = 1
      `);

      const config = configEmpresa[0] || {};

      // 2. Obtener datos del servicio y plan
      const [servicios] = await conexion.execute(`
        SELECT sc.*, ps.nombre as plan_nombre, ps.precio as precio_plan, ps.tipo
        FROM servicios_cliente sc
        JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.id = ?
      `, [servicioId]);

      if (servicios.length === 0) {
        throw new Error(`Servicio no encontrado: ${servicioId}`);
      }

      const servicio = servicios[0];

      // 3. Generar número de factura
      const numeroFactura = `${config.prefijo_factura || 'FAC'}${String(config.consecutivo_factura || 1).padStart(6, '0')}`;

      // 4. Calcular totales del servicio con IVA correcto
      const precioBaseServicio = parseFloat(servicio.precio_personalizado || servicio.precio_plan);

      // ✅ CALCULAR IVA DEL SERVICIO usando IVACalculatorService
      const calculoServicio = IVACalculatorService.calcularPrecioConIVA(
        precioBaseServicio,
        servicio.tipo,
        datosCliente.estrato
      );

      // ✅ Agregar costo de instalación si corresponde
      let costoInstalacion = 0;
      let ivaInstalacion = 0;
      if (datosServicio?.cobrar_instalacion !== false) {
        if (datosServicio?.valor_instalacion !== undefined && datosServicio?.valor_instalacion !== null) {
          costoInstalacion = parseFloat(datosServicio.valor_instalacion);
        } else {
          // Valores por defecto si no se especifica
          const tipoPermanencia = datosServicio?.tipo_permanencia || 'sin_permanencia';
          costoInstalacion = tipoPermanencia === 'con_permanencia' ? 50000 : 150000;
        }

        // ✅ CALCULAR IVA DE INSTALACIÓN (instalación siempre lleva IVA)
        const calculoInstalacion = IVACalculatorService.calcularPrecioConIVA(
          costoInstalacion,
          'reconexion', // La instalación se trata como reconexión (siempre IVA)
          datosCliente.estrato
        );
        ivaInstalacion = calculoInstalacion.valor_iva;
      }

      // ✅ Calcular totales correctamente
      const subtotal = calculoServicio.precio_sin_iva + costoInstalacion;
      const iva = calculoServicio.valor_iva + ivaInstalacion;
      const total = subtotal + iva;

      console.log('💰 Desglose de factura:', {
        servicio: {
          base: precioBaseServicio,
          iva: calculoServicio.valor_iva,
          total: calculoServicio.precio_con_iva
        },
        instalacion: {
          base: costoInstalacion,
          iva: ivaInstalacion,
          total: costoInstalacion + ivaInstalacion
        },
        factura: {
          subtotal,
          iva,
          total
        }
      });

      // ✅ Función auxiliar para manejar undefined/null/empty
      const limpiarValor = (valor) => {
        if (valor === undefined || valor === '' || valor === null) return null;
        if (typeof valor === 'string') return valor.trim() || null;
        return valor;
      };

      // 5. Insertar factura
      const queryFactura = `
        INSERT INTO facturas (
          numero_factura, cliente_id, fecha_emision, fecha_vencimiento,
          subtotal, iva, total, estado, resolucion, observaciones, created_by
        ) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'pendiente', ?, ?, ?)
      `;

      const valoresFactura = [
        numeroFactura,
        clienteId,
        subtotal,
        iva,
        total,
        limpiarValor(config.resolucion_facturacion),
        limpiarValor(datosServicio?.observaciones),
        createdBy || null
      ];

      console.log('🔍 Query factura:', queryFactura);
      console.log('🔍 Valores factura:', valoresFactura);

      // ✅ Verificar que NO hay undefined en los parámetros
      const undefinedIndices = valoresFactura.map((param, index) =>
        param === undefined ? index : null
      ).filter(index => index !== null);

      if (undefinedIndices.length > 0) {
        console.error('❌ Parámetros undefined en factura:', undefinedIndices);
        throw new Error(`Parámetros undefined en facturas en posiciones: ${undefinedIndices.join(', ')}`);
      }

      const [resultadoFactura] = await conexion.execute(queryFactura, valoresFactura);
      const facturaId = resultadoFactura.insertId;

      // 6. Insertar detalle de factura - SERVICIO con IVA
      const queryDetalleServicio = `
        INSERT INTO detalle_facturas (
          factura_id, servicio_cliente_id, concepto_nombre, cantidad,
          precio_unitario, subtotal, iva, total
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)
      `;

      const valoresDetalleServicio = [
        facturaId,
        servicioId,
        `${servicio.plan_nombre} - ${servicio.tipo}`,
        calculoServicio.precio_sin_iva,
        calculoServicio.precio_sin_iva,
        calculoServicio.valor_iva,
        calculoServicio.precio_con_iva
      ];

      await conexion.execute(queryDetalleServicio, valoresDetalleServicio);
      console.log(`✅ Detalle de servicio: Base=$${calculoServicio.precio_sin_iva}, IVA=$${calculoServicio.valor_iva}, Total=$${calculoServicio.precio_con_iva}`);

      // ✅ 6b. Insertar detalle de instalación si corresponde
      if (costoInstalacion > 0) {
        const queryDetalleInstalacion = `
          INSERT INTO detalle_facturas (
            factura_id, servicio_cliente_id, concepto_nombre, cantidad,
            precio_unitario, subtotal, iva, total
          ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)
        `;

        const valoresDetalleInstalacion = [
          facturaId,
          servicioId,
          'INSTALACION',
          costoInstalacion,
          costoInstalacion,
          ivaInstalacion,
          costoInstalacion + ivaInstalacion
        ];

        await conexion.execute(queryDetalleInstalacion, valoresDetalleInstalacion);
        console.log(`✅ Detalle de instalación: Base=$${costoInstalacion}, IVA=$${ivaInstalacion}, Total=$${costoInstalacion + ivaInstalacion}`);
      }

      // 7. Actualizar consecutivo
      await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_factura = consecutivo_factura + 1 
        WHERE id = 1
      `);

      console.log(`✅ Primera factura ${numeroFactura} generada con ID: ${facturaId}`);

      return {
        id: facturaId,
        numero_factura: numeroFactura,
        total: total,
        estado: 'pendiente'
      };

    } catch (error) {
      console.error('❌ Error generando primera factura:', error);
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


  static async generarOrdenInstalacionParaSede(conexion, clienteId, serviciosDeLaSede, sedeData, contratoId, createdBy) {
    try {
      console.log('🔧 Generando orden de instalación para múltiples servicios con trazabilidad completa...');

      //const numeroOrden = await this.generarNumeroOrden(conexion);

      // ✅ CORRECCIÓN 1: Calcular costo CORRECTO según tipo de contrato
      const tipoPermanencia = sedeData.tipoContrato || 'sin_permanencia';
      let costoInstalacionTotal = 0;

      // ✅ COSTO CORREGIDO: UNA sola instalación independiente de cantidad de servicios
      if (tipoPermanencia === 'sin_permanencia') {
        costoInstalacionTotal = 150000; // ✅ Una sola instalación de 150,000
      } else {
        costoInstalacionTotal = 50000;  // ✅ Una sola instalación de 50,000
      }

     // ✅ CALCULAR PRECIO TOTAL SUMANDO TODOS LOS SERVICIOS
const precioTotalContrato = serviciosDeLaSede.reduce((sum, s) => {
  return sum + parseFloat(s.precio || 0);
}, 0);

console.log(`💰 Precio total contrato: $${precioTotalContrato} (${serviciosDeLaSede.length} servicios)`);

const serviciosDescripcion = serviciosDeLaSede.map(s =>
  `${s.tipo?.toUpperCase() || 'SERVICIO'}: ${s.plan_nombre} ($${parseFloat(s.precio || 0).toLocaleString()})`
).join(' + ');

const observacionesContrato = JSON.stringify({
  sede_nombre: sedeData.nombre_sede || 'Sede Principal',
  direccion_sede: sedeData.direccion_servicio,
  contacto_sede: sedeData.contacto_sede,
  telefono_sede: sedeData.telefono_sede,
  servicios_incluidos: serviciosDescripcion,
  precio_mensual_total: precioTotalContrato, // ✅ AGREGADO: precio total
  cantidad_servicios: serviciosDeLaSede.length,
  observaciones_adicionales: sedeData.observaciones,
  tipo_permanencia: tipoPermanencia,
  meses_permanencia: mesesPermanencia,
  costo_instalacion_calculado: costoInstalacionTotal,
  detalle_calculo: {
    servicios_count: serviciosDeLaSede.length,
    costo_instalacion_unica: costoInstalacionTotal,
    formula: `Una instalación única de $${costoInstalacionTotal.toLocaleString()} para todos los servicios`
  }
});

      // Obtener datos del cliente para completar campos
      const [clienteData] = await conexion.execute(
        'SELECT nombre, direccion, barrio, telefono FROM clientes WHERE id = ?',
        [clienteId]
      );

      const cliente = clienteData[0] || {};

      const query = `
      INSERT INTO instalaciones (
        cliente_id, servicio_cliente_id, contrato_id,
        direccion_instalacion, barrio, telefono_contacto, persona_recibe,
        fecha_programada, hora_programada, tipo_instalacion,
        costo_instalacion, estado, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'programada', ?)
    `;

      // Programar para mañana
      const fechaProgramada = new Date();
      fechaProgramada.setDate(fechaProgramada.getDate() + 1);

      const parametros = [
        clienteId,
        JSON.stringify(serviciosIds), // ✅ CORRECCIÓN 2: JSON con todos los servicios
        contratoId, // ✅ CORRECCIÓN 3: ID del contrato guardado correctamente
        sedeData.direccion_servicio || cliente.direccion,
        cliente.barrio || sedeData.barrio || 'No especificado',
        sedeData.telefono_sede || cliente.telefono,
        sedeData.contacto_sede || cliente.nombre,
        fechaProgramada.toISOString().split('T')[0],
        '09:00:00',
        'nueva',
        costoInstalacionTotal, // ✅ CORRECCIÓN 1: Costo correcto
        observacionesInstalacion,

      ];

      const [resultado] = await conexion.execute(query, parametros);
      const instalacionId = resultado.insertId;

      console.log(`✅ Orden de instalación creada CORREGIDA:`, {
        instalacion_id: instalacionId,
        contrato_id: contratoId, // ✅ Confirmado que se guarda
        servicios_ids: serviciosIds, // ✅ Confirmado JSON con todos los servicios
        costo_correcto: costoInstalacionTotal, // ✅ Confirmado costo correcto
        servicios_incluidos: serviciosDeLaSede.length,
        tipo_permanencia: tipoPermanencia
      });

      return {
        id: instalacionId,
        numero: '0',
        contrato_id: contratoId,
        servicios_cliente_ids: serviciosIds,
        estado: 'programada',
        servicios_incluidos: serviciosDeLaSede.length,
        costo_total: costoInstalacionTotal
      };

    } catch (error) {
      console.error('❌ Error generando orden de instalación:', error);
      throw error;
    }
  }
  /**
    * Generar orden de instalación interna COMPLETA con DIRECCIÓN
    */
  static async generarOrdenInstalacionInterno(conexion, clienteId, serviciosDeLaSede, createdBy = null) {
    console.log('🔧 Generando orden de instalación CON DIRECCIÓN...');

    // Obtener datos del cliente
    const [clientes] = await conexion.execute(
      'SELECT nombre, direccion, barrio, telefono FROM clientes WHERE id = ?',
      [clienteId]
    );

    if (clientes.length === 0) {
      throw new Error('Cliente no encontrado');
    }

    const cliente = clientes[0];

    // ✅ Generar número de orden usando la función correcta (con formato y fecha del contrato)
    const numeroOrden = await this.generarNumeroOrden(conexion);

    const query = `
      INSERT INTO instalaciones (
        cliente_id, numero_orden, fecha_programada, hora_programada,
        direccion_instalacion, barrio, telefono_contacto,
        estado, observaciones, created_at
      ) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), '09:00:00', ?, ?, ?, 'programada', 'Instalación generada automáticamente', NOW())
    `;

    const valores = [
      clienteId,
      numeroOrden,
      cliente.direccion,
      cliente.barrio || '',
      cliente.telefono || ''
    ];

    console.log('🔍 Query instalación CON DIRECCIÓN:', query);
    console.log('🔍 Valores:', valores);

    const [resultado] = await conexion.execute(query, valores);
    const instalacionId = resultado.insertId;

    console.log(`✅ Instalación ${numeroOrden} creada - ID: ${instalacionId} - Dirección: ${cliente.direccion}`);

    return {
      id: instalacionId,
      numero: numeroOrden,
      fecha_programada: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      direccion: cliente.direccion,
      estado: 'programada'
    };
  }
  /**
   * Generar contrato interno
   */
  static async generarContratoInterno(conexion, clienteId, servicioId, datosServicio, createdBy = null) {
    console.log('📄 Generando contrato...');

    const numeroContrato = await this.generarNumeroContrato(conexion);

    // ✅ Función auxiliar para manejar undefined/null/empty
    const limpiarValor = (valor) => {
      if (valor === undefined || valor === '' || valor === null) return null;
      if (typeof valor === 'string') return valor.trim() || null;
      return valor;
    };

    // Obtener datos del plan para calcular permanencia
    const [planes] = await conexion.execute(`
      SELECT permanencia_minima_meses, costo_instalacion_permanencia, costo_instalacion_sin_permanencia
      FROM planes_servicio ps
      JOIN servicios_cliente sc ON ps.id = sc.plan_id
      WHERE sc.id = ?
    `, [servicioId]);

    const planData = planes[0] || {};
    const tipoPermanencia = datosServicio?.tipo_permanencia || 'sin_permanencia';
    const permanenciaMeses = tipoPermanencia === 'con_permanencia' ?
      (planData.permanencia_minima_meses || 6) : 0;

    // ✅ CORRECCIÓN: Usar valores de cobro de instalación separados de permanencia
    let costoInstalacion = 0;
    if (datosServicio?.cobrar_instalacion !== false) {
      // Si se debe cobrar instalación, usar el valor personalizado o el valor por defecto
      if (datosServicio?.valor_instalacion !== undefined && datosServicio?.valor_instalacion !== null) {
        costoInstalacion = parseFloat(datosServicio.valor_instalacion);
      } else {
        // Valores por defecto basados en tipo de permanencia
        costoInstalacion = tipoPermanencia === 'con_permanencia' ?
          (planData.costo_instalacion_permanencia || 50000) :
          (planData.costo_instalacion_sin_permanencia || 150000);
      }
    }

    // Fecha de vencimiento de permanencia
    const fechaVencimientoPermanencia = permanenciaMeses > 0 ?
      new Date(Date.now() + (permanenciaMeses * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] :
      null;

    const query = `
      INSERT INTO contratos (
        numero_contrato, cliente_id, servicio_id, tipo_contrato, tipo_permanencia, 
        permanencia_meses, costo_instalacion, fecha_generacion, 
        fecha_inicio, fecha_vencimiento_permanencia, estado, 
        generado_automaticamente, observaciones, created_by
      ) VALUES (?, ?, ?, 'servicio', ?, ?, ?, NOW(), NOW(), ?, 'activo', 1, ?, ?)
    `;

    const valores = [
      numeroContrato,
      clienteId,
      servicioId,
      tipoPermanencia,
      permanenciaMeses,
      costoInstalacion,
      fechaVencimientoPermanencia,
      limpiarValor(datosServicio?.observaciones),
      createdBy || null
    ];

    console.log('🔍 Query contrato:', query);
    console.log('🔍 Valores contrato:', valores);

    // ✅ Verificar que NO hay undefined en los parámetros
    const undefinedIndices = valores.map((param, index) =>
      param === undefined ? index : null
    ).filter(index => index !== null);

    if (undefinedIndices.length > 0) {
      console.error('❌ Parámetros undefined en contrato:', undefinedIndices);
      throw new Error(`Parámetros undefined en contratos en posiciones: ${undefinedIndices.join(', ')}`);
    }

    const [resultado] = await conexion.execute(query, valores);

    const contratoId = resultado.insertId;

    console.log(`✅ Contrato ${numeroContrato} creado con ID: ${contratoId}`);

    return {
      id: contratoId,
      numero: numeroContrato,
      tipo_permanencia: tipoPermanencia,
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

    // Fallback manual - INCLUIR FECHA como en el contrato
    const [configActual] = await conexion.execute(`
      SELECT prefijo_orden, consecutivo_orden
      FROM configuracion_empresa
      WHERE id = 1
    `);

    if (!configActual[0]) {
      throw new Error('Configuración de empresa no encontrada');
    }

    const { prefijo_orden, consecutivo_orden } = configActual[0];

    // ✅ CORRECCIÓN: Incluir año en el formato del número de orden (igual que contrato)
    const numeroOrden = `${prefijo_orden || 'ORD'}-${new Date().getFullYear()}-${String(consecutivo_orden).padStart(6, '0')}`;

    // Incrementar consecutivo
    await conexion.execute(`
      UPDATE configuracion_empresa
      SET consecutivo_orden = consecutivo_orden + 1
      WHERE id = 1
    `);

    console.log(`✅ Número de orden generado: ${numeroOrden}`);

    return numeroOrden;
  }

  /**
   * Generar número de contrato usando procedimiento almacenado
   */
  static async generarNumeroContrato(conexion) {
    try {
      console.log('🔢 Generando número de contrato...');

      // PASO 1: Obtener configuración actual con los nombres correctos de columnas
      const [configActual] = await conexion.execute(`
      SELECT 
        prefijo_contrato,
        consecutivo_contrato
      FROM configuracion_empresa 
      WHERE id = 1
    `);

      if (!configActual[0]) {
        throw new Error('Configuración de empresa no encontrada');
      }

      const { prefijo_contrato, consecutivo_contrato } = configActual[0];

      console.log(`📊 Configuración obtenida:`, {
        prefijo: prefijo_contrato,
        consecutivo: consecutivo_contrato
      });

      // PASO 2: Generar número con el formato correcto
      // Basado en tu BD: prefijo = "CON", consecutivo = 15
      // Resultado esperado: CON-2025-000015
      const numeroContrato = `${prefijo_contrato}-${new Date().getFullYear()}-${String(consecutivo_contrato).padStart(6, '0')}`;

      console.log(`📋 Número de contrato generado: ${numeroContrato}`);

      // PASO 3: Verificar que no existe (por seguridad)
      const [existe] = await conexion.execute(`
      SELECT COUNT(*) as count 
      FROM contratos 
      WHERE numero_contrato = ?
    `, [numeroContrato]);

      if (existe[0].count > 0) {
        console.warn(`⚠️ El número ${numeroContrato} ya existe! Incrementando consecutivo...`);

        // Incrementar e intentar de nuevo
        await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_contrato = consecutivo_contrato + 1 
        WHERE id = 1
      `);

        // Recursión para generar el siguiente número
        return await this.generarNumeroContrato(conexion);
      }

      // PASO 4: Incrementar el consecutivo DESPUÉS de verificar que está disponible
      await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_contrato = consecutivo_contrato + 1 
      WHERE id = 1
    `);

      console.log(`✅ Consecutivo actualizado de ${consecutivo_contrato} a ${consecutivo_contrato + 1}`);
      console.log(`✅ Número de contrato final: ${numeroContrato}`);

      return numeroContrato;

    } catch (error) {
      console.error('❌ Error generando número de contrato:', error);

      // FALLBACK: Generar número único con timestamp
      const timestamp = Date.now().toString().slice(-8);
      const numeroFallback = `CON-${new Date().getFullYear()}-${timestamp}`;

      console.log(`🔄 Usando número fallback: ${numeroFallback}`);
      return numeroFallback;
    }
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
   * Enviar correo de bienvenida con factura y contrato adjuntos
   */
  static async enviarCorreoBienvenida(conexion, clienteId, datosCliente) {
    console.log('📧 Enviando correo de bienvenida...');

    // Importar EmailService dinámicamente para evitar dependencias circulares
    const EmailService = require('./EmailService');

    try {
      const resultado = await EmailService.enviarCorreoBienvenida(clienteId, datosCliente, {
        conexion: conexion
      });

      if (resultado.enviado) {
        console.log(`✅ Correo de bienvenida enviado exitosamente a: ${resultado.destinatario}`);
        console.log(`📎 Adjuntos incluidos: ${resultado.adjuntos}`);
        return true;
      } else {
        console.warn(`⚠️ No se pudo enviar correo: ${resultado.motivo}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error enviando correo de bienvenida:', error);
      // No lanzar error para evitar que falle toda la transacción
      // El cliente se creó exitosamente, solo falló el envío del correo
      return false;
    }
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
      // Calcular paginación
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offsetNum = (pageNum - 1) * limitNum;

      // Query corregida
      const query = `
  SELECT 
    f.*,
    c.nombre AS cliente_nombre,
    c.identificacion AS cliente_identificacion,
    c.correo AS cliente_email,
    COUNT(*) OVER() AS total_registros
  FROM facturas f
  JOIN clientes c ON f.cliente_id = c.id
  ${whereClause}
  ORDER BY f.fecha_emision DESC
  LIMIT ${limitNum} OFFSET ${offsetNum}
`;

      // Ejecutar con los parámetros del WHERE (limit/offset ya están interpolados)




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

      // Validar y calcular paginación (nombres únicos para evitar redeclare)
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offsetNum = (pageNum - 1) * limitNum;

      // Query sin placeholders en LIMIT/OFFSET
      const query = `
  SELECT 
    c.*,
    ci.nombre AS ciudad_nombre,
    s.nombre AS sector_nombre,
    COUNT(sc.id) AS total_servicios,
    COUNT(CASE WHEN sc.estado = 'activo' THEN 1 END) AS servicios_activos,
    COUNT(*) OVER() AS total_registros
  FROM clientes c
  LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
  LEFT JOIN sectores s ON c.sector_id = s.id
  LEFT JOIN servicios_cliente sc ON c.id = sc.cliente_id
  ${whereClause}
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT ${limitNum} OFFSET ${offsetNum}
`;

      // Ejecutar pasando solo los params de WHERE (limit/offset ya están interpolados)





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
    WHERE cliente_id = ? AND estado IN ('suspendido', 'cortado', 'cancelado')
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

  static async crearClienteConServicios(datosCompletos, createdBy = null) {
    return await Database.transaction(async (conexion) => {
      console.log('🚀 Creando cliente con servicios agrupados por sede...');

      // 1. CREAR CLIENTE UNA SOLA VEZ
      const clienteId = await this.crearCliente(conexion, datosCompletos.cliente, createdBy);
      console.log(`✅ Cliente creado con ID: ${clienteId}`);

      const sedesCreadas = [];

      // 2. PROCESAR CADA SEDE (cada sede = 1 contrato + 1 factura)
      for (let i = 0; i < datosCompletos.servicios.length; i++) {
        const sedeData = datosCompletos.servicios[i];

        console.log(`🏢 Procesando sede: ${sedeData.nombre_sede || `Sede ${i + 1}`}`);

        // 2.1 Crear todos los servicios de esta sede
        const serviciosDeLaSede = await this.crearServiciosDeSede(
          conexion,
          clienteId,
          sedeData,
          createdBy
        );

        // 2.2 Crear UN SOLO contrato para todos los servicios de esta sede
        const contratoId = await this.generarContratoParaSede(
          conexion,
          clienteId,
          serviciosDeLaSede,
          sedeData,
          createdBy
        );

        // 2.3 Crear UNA SOLA factura para todos los servicios de esta sede
        const facturaId = await this.generarFacturaParaSede(
          conexion,
          clienteId,
          serviciosDeLaSede,
          sedeData,
          contratoId,
          createdBy
        );

        const instalacionid = await this.generarOrdenInstalacionInterno(
          conexion,
          clienteId,
          serviciosDeLaSede,
          createdBy
        );

        if (datosCompletos.opciones?.enviar_bienvenida) {
          await this.enviarCorreoBienvenida(conexion, clienteId, datosCompletos.cliente);
          console.log(`✅ Correo de bienvenida enviado`);
        }


        sedesCreadas.push({
          sede_nombre: sedeData.nombre_sede || `Sede ${i + 1}`,
          direccion: sedeData.direccion_servicio,
          servicios: serviciosDeLaSede,
          contrato_id: contratoId,
          factura_id: facturaId,
          instalacion_id: instalacionid,
          total_servicios: serviciosDeLaSede.length
        });
      }

      console.log(`🎉 Cliente creado con ${sedesCreadas.length} sede(s) independiente(s)`);

      return {
        cliente_id: clienteId,
        sedes_creadas: sedesCreadas,
        resumen: {
          total_sedes: sedesCreadas.length,
          total_contratos: sedesCreadas.length, // 1 contrato por sede
          total_facturas: sedesCreadas.length,  // 1 factura por sede
          total_instalaciones: sedesCreadas.length,  // 1 instalación por sede
          total_servicios: sedesCreadas.reduce((sum, sede) => sum + sede.total_servicios, 0)
        }
      };
    });
  }

  /**
 * Crear todos los servicios de UNA sede específica
 */
static async crearServiciosDeSede(conexion, clienteId, sedeData, createdBy) {
  const serviciosCreados = [];

  console.log('🔧 Procesando servicios de la sede:', {
    planInternetId: sedeData.planInternetId,
    planTelevisionId: sedeData.planTelevisionId,
    planesAdicionales: sedeData.planesAdicionales
  });

  // ✅ CORRECCIÓN: Crear array con TODOS los planes
  const todosLosPlanesIds = [];

  if (sedeData.planInternetId) {
    todosLosPlanesIds.push(parseInt(sedeData.planInternetId));
  }
  
  if (sedeData.planTelevisionId) {
    todosLosPlanesIds.push(parseInt(sedeData.planTelevisionId));
  }

  // ✅ AGREGAR PLANES ADICIONALES (el 3ro, 4to, etc.)
  if (sedeData.planesAdicionales && Array.isArray(sedeData.planesAdicionales)) {
    for (const planId of sedeData.planesAdicionales) {
      const planIdNum = parseInt(planId);
      if (!todosLosPlanesIds.includes(planIdNum)) {
        todosLosPlanesIds.push(planIdNum);
      }
    }
  }

  console.log(`📦 Total de planes a crear: ${todosLosPlanesIds.length}`, todosLosPlanesIds);

  // ✅ CREAR UN SERVICIO POR CADA PLAN
  for (const planId of todosLosPlanesIds) {
    const [planInfo] = await conexion.execute(
      'SELECT id, nombre, precio, tipo FROM planes_servicio WHERE id = ?',
      [planId]
    );

    if (planInfo.length === 0) {
      console.warn(`⚠️ Plan ${planId} no encontrado`);
      continue;
    }

    const plan = planInfo[0];
    const precioFinal = plan.precio; // Usar precio del plan

    const observacionesServicio = JSON.stringify({
      sede_nombre: sedeData.nombre_sede || 'Sede Principal',
      direccion_sede: sedeData.direccion_servicio || '',
      tipo_contrato: sedeData.tipoContrato || 'sin_permanencia',
      observaciones_adicionales: sedeData.observaciones || '',
      fecha_creacion: new Date().toISOString(),
      creado_desde_sede: true
    });

    const queryServicio = `
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, precio_personalizado, fecha_activacion,
        estado, observaciones
      ) VALUES (?, ?, ?, ?, 'activo', ?)
    `;

    const [resultado] = await conexion.execute(queryServicio, [
      clienteId,
      planId,
      precioFinal,
      sedeData.fechaActivacion || new Date().toISOString().split('T')[0],
      observacionesServicio
    ]);

    serviciosCreados.push({
      id: resultado.insertId,
      plan_id: planId,
      plan_nombre: plan.nombre,
      tipo: plan.tipo,
      precio: precioFinal
    });

    console.log(`  ✅ Servicio creado: ${plan.nombre} - $${precioFinal}`);
  }

  console.log(`✅ Total servicios creados: ${serviciosCreados.length}`);
  return serviciosCreados;
}

  /**
   * Crear un servicio individual
   */
  static async crearServicioIndividual(conexion, clienteId, config, createdBy) {
    // Obtener plan
    const [planes] = await conexion.execute(
      'SELECT * FROM planes_servicio WHERE id = ?',
      [config.plan_id]
    );

    if (planes.length === 0) {
      throw new Error(`Plan ${config.plan_id} no encontrado`);
    }

    const plan = planes[0];
    const precio = config.precio || plan.precio;

    // Crear observaciones con info de la sede
    const observaciones = JSON.stringify({
      sede_nombre: config.sede_data.nombre_sede,
      direccion_sede: config.sede_data.direccion_servicio,
      contacto_sede: config.sede_data.contacto_sede,
      telefono_sede: config.sede_data.telefono_sede,
      tipo_servicio: config.tipo
    });

    const query = `
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, fecha_activacion, precio_personalizado,
        observaciones, estado, created_at
      ) VALUES (?, ?, ?, ?, ?, 'activo', NOW())
    `;

    const [resultado] = await conexion.execute(query, [
      clienteId,
      config.plan_id,
      config.sede_data.fechaActivacion || new Date().toISOString().split('T')[0],
      precio,
      observaciones
    ]);

    return {
      id: resultado.insertId,
      plan_id: config.plan_id,
      plan_nombre: plan.nombre,
      tipo: config.tipo,
      precio: precio,
      sede_info: config.sede_data
    };
  }

 /**
 * Generar UN contrato para TODA la sede (Internet + TV)
 */
static async generarContratoParaSede(conexion, clienteId, serviciosDeLaSede, sedeData, createdBy) {
  console.log('📄 Generando contrato para sede - Corrección instalación única:', {
    cantidad_servicios: serviciosDeLaSede.length,
    tipo_contrato: sedeData.tipoContrato,
    servicios: serviciosDeLaSede.map(s => ({ id: s.id, tipo: s.tipo, plan: s.plan_nombre }))
  });

  const numeroContrato = await this.generarNumeroContrato(conexion);

  // ✅ CORRECCIÓN CRÍTICA: UNA SOLA INSTALACIÓN independientemente de la cantidad de servicios
  const tipoPermanencia = sedeData.tipoContrato || 'sin_permanencia';
  let costoInstalacionTotal = 0;

  // ✅ CÁLCULO CORRECTO: UNA SOLA INSTALACIÓN POR CLIENTE (no por servicio)
  if (tipoPermanencia === 'sin_permanencia') {
    // Sin permanencia: 150,000 IVA incluido - UNA SOLA VEZ
    costoInstalacionTotal = 150000;
  } else {
    // Con permanencia: 50,000 - UNA SOLA VEZ
    costoInstalacionTotal = 50000;
  }

  console.log(`💰 Cálculo CORREGIDO de instalación: UNA sola instalación de $${costoInstalacionTotal.toLocaleString()} para ${serviciosDeLaSede.length} servicio(s)`);

  let mesesPermanencia = 0;
  if (tipoPermanencia === 'con_permanencia') {
    mesesPermanencia = parseInt(sedeData.mesesPermanencia) || 6;
  }

  let fechaVencimientoPermanencia = null;
  if (tipoPermanencia === 'con_permanencia' && mesesPermanencia > 0) {
    const fechaInicio = new Date();
    fechaVencimientoPermanencia = new Date(fechaInicio.setMonth(fechaInicio.getMonth() + mesesPermanencia))
      .toISOString().split('T')[0];
  }

  // ✅ CALCULAR PRECIO TOTAL SUMANDO TODOS LOS SERVICIOS
  const precioTotalContrato = serviciosDeLaSede.reduce((sum, s) => {
    return sum + parseFloat(s.precio || 0);
  }, 0);

  console.log(`💰 Precio total contrato: $${precioTotalContrato} (${serviciosDeLaSede.length} servicios)`);

  const serviciosDescripcion = serviciosDeLaSede.map(s =>
    `${s.tipo?.toUpperCase() || 'SERVICIO'}: ${s.plan_nombre} ($${parseFloat(s.precio || 0).toLocaleString()})`
  ).join(' + ');

  const observacionesContrato = JSON.stringify({
    sede_nombre: sedeData.nombre_sede || 'Sede Principal',
    direccion_sede: sedeData.direccion_servicio,
    contacto_sede: sedeData.contacto_sede,
    telefono_sede: sedeData.telefono_sede,
    servicios_incluidos: serviciosDescripcion,
    precio_mensual_total: precioTotalContrato,
    cantidad_servicios: serviciosDeLaSede.length,
    observaciones_adicionales: sedeData.observaciones,
    tipo_permanencia: tipoPermanencia,
    meses_permanencia: mesesPermanencia,
    costo_instalacion_calculado: costoInstalacionTotal,
    detalle_calculo: {
      servicios_count: serviciosDeLaSede.length,
      costo_instalacion_unica: costoInstalacionTotal,
      formula: `Una instalación única de $${costoInstalacionTotal.toLocaleString()} para todos los servicios`
    }
  });

  // ✅ CORRECCIÓN: Usar JSON array para múltiples servicios en servicio_id
  const serviciosIds = serviciosDeLaSede.map(s => s.id);
  const servicioIdValue = JSON.stringify(serviciosIds);

  const query = `
    INSERT INTO contratos (
      numero_contrato, cliente_id, servicio_id, tipo_contrato, tipo_permanencia, 
      permanencia_meses, costo_instalacion, fecha_generacion, 
      fecha_inicio, fecha_vencimiento_permanencia, estado, 
      generado_automaticamente, observaciones, created_by
    ) VALUES (?, ?, ?, 'servicio', ?, ?, ?, NOW(), NOW(), ?, 'activo', 1, ?, ?)
  `;

  const [resultado] = await conexion.execute(query, [
    numeroContrato,
    clienteId,
    servicioIdValue,
    tipoPermanencia,
    mesesPermanencia,
    costoInstalacionTotal, // ✅ UNA SOLA INSTALACIÓN
    fechaVencimientoPermanencia,
    observacionesContrato,
    createdBy || 1
  ]);

  const contratoId = resultado.insertId;

  // Actualizar servicios con información del contrato
  for (const servicio of serviciosDeLaSede) {
    try {
      const observacionesServicio = servicio.observaciones
        ? JSON.parse(servicio.observaciones)
        : {};

      const observacionesActualizadas = JSON.stringify({
        ...observacionesServicio,
        numero_contrato: numeroContrato,
        contrato_id: contratoId,
        costo_instalacion_compartido: costoInstalacionTotal, // ✅ Mismo costo para todos
        parte_instalacion: `Instalación única de $${costoInstalacionTotal.toLocaleString()} compartida entre ${serviciosDeLaSede.length} servicio(s)`
      });

      await conexion.execute(
        'UPDATE servicios_cliente SET observaciones = ? WHERE id = ?',
        [observacionesActualizadas, servicio.id]
      );
    } catch (updateError) {
      console.error(`❌ Error actualizando servicio ${servicio.id}:`, updateError);
    }
  }

  console.log(`✅ Contrato ${numeroContrato} creado con instalación ÚNICA:`, {
    servicios_ids: serviciosIds,
    costo_instalacion_unica: costoInstalacionTotal,
    tipo_permanencia: tipoPermanencia,
    meses: mesesPermanencia
  });

  return contratoId;
}
  /**
   * Generar UNA factura para TODA la sede (Internet + TV)
   */
  static async generarFacturaParaSede(conexion, clienteId, serviciosDeLaSede, sedeData, contratoId, createdBy) {
    try {
      console.log('🧾 Generando factura para sede con todos los campos requeridos...');

      // 1. OBTENER CONFIGURACIÓN DE EMPRESA (resolución, prefijos, etc.)
      const [configEmpresa] = await conexion.execute(`
      SELECT 
        resolucion_facturacion, 
        prefijo_factura, 
        consecutivo_factura,
        dias_mora_corte,
        porcentaje_iva,
        empresa_nombre,
        empresa_nit
      FROM configuracion_empresa 
      WHERE id = 1
    `);

      const config = configEmpresa[0];
      if (!config) {
        throw new Error('Configuración de empresa no encontrada');
      }

      // 2. OBTENER DATOS COMPLETOS DEL CLIENTE
      const [clientes] = await conexion.execute(
        'SELECT * FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (clientes.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clientes[0];
      const estrato = parseInt(cliente.estrato) || 1;

      // 3. GENERAR NÚMERO DE FACTURA CON PREFIJO
      const numeroFactura = await this.generarNumeroFactura(conexion);

      // 4. CALCULAR FECHAS DEL PERÍODO SEGÚN REGLAS DE FACTURACIÓN
      const fechasFacturacion = this.calcularFechasFacturacion();

// 5. ✅ CALCULAR TOTALES CORRECTAMENTE - SUMA TODOS LOS SERVICIOS
let valorInternet = 0;
let valorTelevision = 0;
let valorIvaInternet = 0;
let valorIvaTelevision = 0;

console.log(`📊 Calculando totales para ${serviciosDeLaSede.length} servicio(s):`);

for (const servicio of serviciosDeLaSede) {
  const precio = parseFloat(servicio.precio || 0);
  
  // ✅ Detectar tipo desde plan_nombre si 'tipo' no está disponible
  let tipoServicio = servicio.tipo;
  
  if (!tipoServicio && servicio.plan_nombre) {
    const nombreLower = servicio.plan_nombre.toLowerCase();
    if (nombreLower.includes('internet') && nombreLower.includes('tv')) {
      tipoServicio = 'combo';
    } else if (nombreLower.includes('internet')) {
      tipoServicio = 'internet';
    } else if (nombreLower.includes('tv') || nombreLower.includes('televisión')) {
      tipoServicio = 'television';
    }
  }

  console.log(`  📌 ${servicio.plan_nombre} - Tipo: ${tipoServicio} - Precio: $${precio.toLocaleString()}`);

  // ✅ SEPARAR POR TIPO DE SERVICIO
  if (tipoServicio === 'internet' || tipoServicio === 'combo') {
    valorInternet += precio;
    // IVA solo para estratos 4, 5, 6
    if (estrato >= 4) {
      const ivaServicio = precio * (parseFloat(config.porcentaje_iva) / 100);
      valorIvaInternet += ivaServicio;
      console.log(`    💰 IVA Internet: $${ivaServicio.toLocaleString()}`);
    }
  } else if (tipoServicio === 'television') {
    valorTelevision += precio;
    // IVA solo para estratos 4, 5, 6
    if (estrato >= 4) {
      const ivaServicio = precio * (parseFloat(config.porcentaje_iva) / 100);
      valorIvaTelevision += ivaServicio;
      console.log(`    💰 IVA TV: $${ivaServicio.toLocaleString()}`);
    }
  } else {
    // Si no se detecta tipo, sumar a internet por defecto
    console.log(`    ⚠️ Tipo no detectado, sumando a internet por defecto`);
    valorInternet += precio;
    if (estrato >= 4) {
      valorIvaInternet += precio * (parseFloat(config.porcentaje_iva) / 100);
    }
  }
}

// ✅ CALCULAR TOTALES FINALES
const subtotal = valorInternet + valorTelevision;
const totalIva = valorIvaInternet + valorIvaTelevision;
const total = subtotal + totalIva;

console.log(`💰 TOTALES CALCULADOS:`);
console.log(`   Internet: $${valorInternet.toLocaleString()}`);
console.log(`   Televisión: $${valorTelevision.toLocaleString()}`);
console.log(`   Subtotal: $${subtotal.toLocaleString()}`);
console.log(`   IVA: $${totalIva.toLocaleString()}`);
console.log(`   TOTAL FACTURA: $${total.toLocaleString()}`);

console.log(`💰 TOTALES FACTURA: Internet=$${valorInternet}, TV=$${valorTelevision}, IVA=$${totalIva}, Total=$${total}`);
      // 6. CREAR DESCRIPCIÓN DE SERVICIOS PARA OBSERVACIONES
      const sedeNombre = sedeData.nombre_sede || 'Sede Principal';
      const serviciosFacturados = serviciosDeLaSede.map(s =>
        `${s.tipo.toUpperCase()}: ${s.plan_nombre} ($${s.precio.toLocaleString()})`
      ).join(' + ');
      const observacionesFactura = `Servicios para ${sedeNombre}: ${serviciosFacturados}`;

      // 7. INSERTAR FACTURA COMPLETA CON TODOS LOS CAMPOS
      const queryFactura = `
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento, 
        fecha_desde, fecha_hasta,
        internet, television, saldo_anterior, interes, reconexion, 
        descuento, varios, publicidad,
        s_internet, s_television, s_interes, s_reconexion, 
        s_descuento, s_varios, s_publicidad, s_iva,
        subtotal, iva, total, estado, contrato_id, 
        observaciones, referencia_pago, resolucion,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, NOW())
    `;

      const valoresFactura = [
        numeroFactura,                              // numero_factura
        clienteId,                                  // cliente_id
        cliente.identificacion,                     // identificacion_cliente
        cliente.nombre,                             // nombre_cliente
        fechasFacturacion.periodoFacturacion,       // periodo_facturacion (YYYY-MM)
        fechasFacturacion.fechaEmision,             // fecha_emision
        fechasFacturacion.fechaVencimiento,         // fecha_vencimiento
        fechasFacturacion.fechaDesde,               // fecha_desde
        fechasFacturacion.fechaHasta,               // fecha_hasta
        valorInternet,                              // internet
        valorTelevision,                            // television
        0,                                          // saldo_anterior
        0,                                          // interes
        0,                                          // reconexion
        0,                                          // descuento
        0,                                          // varios
        0,                                          // publicidad
        valorInternet,                              // s_internet (subtotal internet)
        valorTelevision,                            // s_television (subtotal tv)
        0,                                          // s_interes
        0,                                          // s_reconexion
        0,                                          // s_descuento
        0,                                          // s_varios
        0,                                          // s_publicidad
        totalIva,                                   // s_iva
        subtotal,                                   // subtotal
        totalIva,                                   // iva
        total,                                      // total
        contratoId,                                 // contrato_id
        observacionesFactura,                       // observaciones
        cliente.identificacion,                     // referencia_pago (misma cédula/identificación)
        config.resolucion_facturacion || 'DIAN-2024-001', // resolucion_facturacion
        createdBy || 1                              // created_by
      ];

      console.log('🔍 Query factura:', queryFactura);
      console.log('🔍 Valores factura:', valoresFactura);

      const [resultado] = await conexion.execute(queryFactura, valoresFactura);
      const facturaId = resultado.insertId;

      // 8. ACTUALIZAR CONSECUTIVO DE FACTURA EN CONFIGURACIÓN
      await conexion.execute(
        'UPDATE configuracion_empresa SET consecutivo_factura = consecutivo_factura + 1 WHERE id = 1'
      );

      console.log(`✅ Factura ${numeroFactura} creada exitosamente - Total: $${total.toLocaleString()}`);

      return facturaId;

    } catch (error) {
      console.error('❌ Error generando factura para sede:', error);
      throw error;
    }
  }

  /**
   * MÉTODO AUXILIAR: Calcular fechas de facturación según reglas de negocio
   */
  static calcularFechasFacturacion() {
    const fechaActual = new Date();

    // FECHA DE EMISIÓN: Hoy
    const fechaEmision = fechaActual.toISOString().split('T')[0];

    // FECHA DE VENCIMIENTO: 5 días después de la generación (como se solicita)
    const fechaVencimiento = new Date(fechaActual);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 5);

    // PERÍODO DE FACTURACIÓN: Si se crea el 14 de julio, el primer ciclo va hasta el 13 de agosto
    const fechaDesde = fechaActual.toISOString().split('T')[0]; // Desde hoy

    const fechaHasta = new Date(fechaActual);
    fechaHasta.setMonth(fechaHasta.getMonth() + 1); // Un mes después
    fechaHasta.setDate(fechaHasta.getDate() - 1);   // Un día antes (13 de agosto si se crea el 14 de julio)

    // PERÍODO FORMATO YYYY-MM
    const periodoFacturacion = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;

    return {
      fechaEmision: fechaEmision,
      fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
      fechaDesde: fechaDesde,
      fechaHasta: fechaHasta.toISOString().split('T')[0],
      periodoFacturacion: periodoFacturacion
    };
  }


  /*
   * AGREGAR NUEVA SEDE a cliente existente
   * (esto es para cuando el cliente regresa meses después)
   */
  static async agregarNuevaSedeACliente(clienteId, nuevaSedeData, createdBy = null) {
    return await Database.transaction(async (conexion) => {
      console.log(`🏢 Agregando nueva sede al cliente ${clienteId}`);

      // Verificar que el cliente existe
      const [clientes] = await conexion.execute(
        'SELECT * FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (clientes.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      // Crear servicios de la nueva sede
      const serviciosDeLaNuevaSede = await this.crearServiciosDeSede(
        conexion,
        clienteId,
        nuevaSedeData,
        createdBy
      );

      // Crear NUEVO contrato independiente
      const nuevoContratoId = await this.generarContratoParaSede(
        conexion,
        clienteId,
        serviciosDeLaNuevaSede,
        nuevaSedeData,
        createdBy
      );

      // Crear NUEVA factura independiente
      const nuevaFacturaId = await this.generarFacturaParaSede(
        conexion,
        clienteId,
        serviciosDeLaNuevaSede,
        nuevaSedeData,
        nuevoContratoId,
        createdBy
      );

      console.log(`✅ Nueva sede agregada - Contrato: ${nuevoContratoId}, Factura: ${nuevaFacturaId}`);

      return {
        cliente_id: clienteId,
        nueva_sede: {
          nombre: nuevaSedeData.nombre_sede,
          direccion: nuevaSedeData.direccion_servicio,
          servicios: serviciosDeLaNuevaSede,
          contrato_id: nuevoContratoId,
          factura_id: nuevaFacturaId
        }
      };
    });
  }

  /**
   * Listar todas las sedes de un cliente con sus servicios
   */
  static async listarSedesCliente(clienteId) {
    const conexion = await pool.getConnection();

    try {
      // Obtener todos los contratos del cliente con sus servicios
      const query = `
        SELECT 
          c.id as contrato_id,
          c.numero_contrato,
          c.fecha_generacion,
          c.tipo_permanencia,
          c.estado as estado_contrato,
          c.observaciones as contrato_observaciones,
          sc.id as servicio_id,
          sc.precio_personalizado,
          sc.observaciones as servicio_observaciones,
          ps.nombre as plan_nombre,
          ps.tipo as tipo_servicio,
          ps.precio as precio_plan,
          f.id as factura_id,
          f.numero_factura,
          f.total as factura_total,
          f.estado as estado_factura
        FROM contratos c
        LEFT JOIN servicios_cliente sc ON JSON_EXTRACT(sc.observaciones, '$.contrato_id') = c.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        LEFT JOIN facturas f ON f.contrato_id = c.id
        WHERE c.cliente_id = ? AND c.estado = 'activo'
        ORDER BY c.fecha_generacion DESC, sc.id
      `;

      const [resultados] = await conexion.execute(query, [clienteId]);

      // Agrupar por contrato (sede)
      const sedesAgrupadas = {};

      for (const row of resultados) {
        const contratoId = row.contrato_id;

        if (!sedesAgrupadas[contratoId]) {
          const contratoObs = JSON.parse(row.contrato_observaciones || '{}');

          sedesAgrupadas[contratoId] = {
            contrato_id: contratoId,
            numero_contrato: row.numero_contrato,
            fecha_contrato: row.fecha_generacion,
            tipo_permanencia: row.tipo_permanencia,
            estado_contrato: row.estado_contrato,
            sede_nombre: contratoObs.sede_nombre || 'Sede Principal',
            direccion_sede: contratoObs.direccion_sede,
            contacto_sede: contratoObs.contacto_sede,
            telefono_sede: contratoObs.telefono_sede,
            factura_id: row.factura_id,
            numero_factura: row.numero_factura,
            factura_total: row.factura_total,
            estado_factura: row.estado_factura,
            servicios: []
          };
        }

        if (row.servicio_id) {
          sedesAgrupadas[contratoId].servicios.push({
            servicio_id: row.servicio_id,
            tipo: row.tipo_servicio,
            plan_nombre: row.plan_nombre,
            precio: row.precio_personalizado || row.precio_plan
          });
        }
      }

      return Object.values(sedesAgrupadas);

    } finally {
      conexion.release();
    }
  }

  // Funciones auxiliares (mismas de antes)
  // FIX DEFINITIVO: Reemplazar el método generarNumeroContrato que usa el procedimiento defectuoso

  /**
   * MÉTODO CORREGIDO: NO usar procedimiento almacenado, generar directamente
   */
  static async generarNumeroContrato(conexion) {
    try {
      console.log('🔢 Generando número de contrato (MÉTODO CORREGIDO)...');

      // PASO 1: Obtener configuración actual DIRECTAMENTE (no procedimiento)
      const [configActual] = await conexion.execute(`
      SELECT 
        prefijo_contrato,
        consecutivo_contrato
      FROM configuracion_empresa 
      WHERE id = 1
    `);

      if (!configActual[0]) {
        throw new Error('Configuración de empresa no encontrada');
      }

      const { prefijo_contrato, consecutivo_contrato } = configActual[0];

      console.log('📊 Configuración actual:', {
        prefijo: prefijo_contrato,
        consecutivo: consecutivo_contrato
      });

      // PASO 2: Generar número usando los valores actuales
      // Con tu BD: prefijo = "CON", consecutivo = 15
      // Resultado: CON-2025-000015
      const year = new Date().getFullYear();
      const numeroContrato = `${prefijo_contrato}-${year}-${String(consecutivo_contrato).padStart(6, '0')}`;

      console.log(`📋 Número de contrato generado: ${numeroContrato}`);

      // PASO 3: Verificar que no existe (seguridad adicional)
      const [existe] = await conexion.execute(`
      SELECT COUNT(*) as count 
      FROM contratos 
      WHERE numero_contrato = ?
    `, [numeroContrato]);

      if (existe[0].count > 0) {
        console.warn(`⚠️ El número ${numeroContrato} YA EXISTE. Forzando incremento...`);

        // Si existe, incrementar el consecutivo y generar nuevamente
        await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_contrato = consecutivo_contrato + 1 
        WHERE id = 1
      `);

        // Llamada recursiva para generar el siguiente
        return await this.generarNumeroContrato(conexion);
      }

      // PASO 4: Incrementar consecutivo DESPUÉS de verificar disponibilidad
      await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_contrato = consecutivo_contrato + 1 
      WHERE id = 1
    `);

      console.log(`✅ Consecutivo actualizado de ${consecutivo_contrato} a ${consecutivo_contrato + 1}`);
      console.log(`✅ Número de contrato FINAL: ${numeroContrato}`);

      return numeroContrato;

    } catch (error) {
      console.error('❌ Error generando número de contrato:', error);

      // FALLBACK: Usar timestamp único si todo falla
      const timestamp = Date.now().toString().slice(-8);
      const numeroFallback = `CON-${new Date().getFullYear()}-${timestamp}`;

      console.log(`🔄 Usando número de emergencia: ${numeroFallback}`);
      return numeroFallback;
    }
  }

/**
 * Generar número de factura (MÉTODO CORREGIDO - Sin duplicados)
 */
static async generarNumeroFactura(conexion) {
  try {
    console.log('🔢 Generando número de factura (MÉTODO CORREGIDO)...');

    // PASO 1: Obtener configuración actual DIRECTAMENTE
    const [configActual] = await conexion.execute(`
      SELECT 
        prefijo_factura,
        consecutivo_factura
      FROM configuracion_empresa 
      WHERE id = 1
    `);

    if (!configActual[0]) {
      throw new Error('Configuración de empresa no encontrada');
    }

    const { prefijo_factura, consecutivo_factura } = configActual[0];

    console.log('📊 Configuración factura actual:', {
      prefijo: prefijo_factura,
      consecutivo: consecutivo_factura
    });

    // PASO 2: Generar número usando los valores actuales
    const numeroFactura = `${prefijo_factura || 'FAC'}${String(consecutivo_factura).padStart(6, '0')}`;

    console.log(`📋 Número de factura generado: ${numeroFactura}`);

    // PASO 3: Verificar que no existe (seguridad adicional)
    const [existe] = await conexion.execute(`
      SELECT COUNT(*) as count 
      FROM facturas 
      WHERE numero_factura = ?
    `, [numeroFactura]);

    if (existe[0].count > 0) {
      console.warn(`⚠️ La factura ${numeroFactura} YA EXISTE. Forzando incremento...`);

      // Si existe, incrementar el consecutivo y generar nuevamente
      await conexion.execute(`
        UPDATE configuracion_empresa 
        SET consecutivo_factura = consecutivo_factura + 1 
        WHERE id = 1
      `);

      // Llamada recursiva para generar el siguiente
      return await this.generarNumeroFactura(conexion);
    }

    // PASO 4: Incrementar consecutivo DESPUÉS de verificar disponibilidad
    await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_factura = consecutivo_factura + 1 
      WHERE id = 1
    `);

    console.log(`✅ Consecutivo factura actualizado de ${consecutivo_factura} a ${consecutivo_factura + 1}`);
    console.log(`✅ Número de factura FINAL: ${numeroFactura}`);

    return numeroFactura;

  } catch (error) {
    console.error('❌ Error generando número de factura:', error);

    // FALLBACK: Usar timestamp único si todo falla
    const timestamp = Date.now().toString().slice(-6);
    const numeroFallback = `FAC${timestamp}`;

    console.log(`🔄 Usando número de emergencia: ${numeroFallback}`);
    return numeroFallback;
  }
}
  /**
   * ✅ NUEVO: Agregar servicio a cliente existente
   * Este método permite agregar un nuevo servicio a un cliente que ya existe en el sistema
   */
  static async agregarServicioAClienteExistente(clienteId, datosServicio, createdBy = null) {
    return await Database.transaction(async (conexion) => {
      console.log(`🔌 Agregando servicio a cliente existente ${clienteId}...`);

      // 1. Verificar que el cliente existe
      const [clientes] = await conexion.execute(
        'SELECT * FROM clientes WHERE id = ?',
        [clienteId]
      );

      if (clientes.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const cliente = clientes[0];

      // 2. Convertir datos del servicio al formato esperado
      const servicioData = {
        planInternetId: datosServicio.planInternetId || datosServicio.plan_internet_id,
        planTelevisionId: datosServicio.planTelevisionId || datosServicio.plan_television_id,
        plan_id: datosServicio.plan_id,
        precioInternetCustom: datosServicio.precioInternetCustom || datosServicio.precio_internet_custom,
        precioTelevisionCustom: datosServicio.precioTelevisionCustom || datosServicio.precio_television_custom,
        precio_personalizado: datosServicio.precio_personalizado,
        tipoContrato: datosServicio.tipo_permanencia || 'sin_permanencia',
        mesesPermanencia: datosServicio.meses_permanencia || (datosServicio.tipo_permanencia === 'con_permanencia' ? 6 : 0),
        fechaActivacion: datosServicio.fecha_activacion || new Date().toISOString().split('T')[0],
        observaciones: datosServicio.observaciones || '',
        direccion_servicio: datosServicio.direccion_servicio || cliente.direccion,
        nombre_sede: datosServicio.nombre_sede || 'Servicio Adicional'
      };

      // 3. Crear los servicios
      const serviciosCreados = await this.crearServiciosDeSede(
        conexion,
        clienteId,
        servicioData,
        createdBy
      );

      if (serviciosCreados.length === 0) {
        throw new Error('No se pudo crear ningún servicio. Verifique que seleccionó al menos un plan.');
      }

      // 4. Generar contrato para el nuevo servicio
      const contratoId = await this.generarContratoParaSede(
        conexion,
        clienteId,
        serviciosCreados,
        servicioData,
        createdBy
      );

      // 5. Generar factura para el nuevo servicio
      const facturaId = await this.generarFacturaParaSede(
        conexion,
        clienteId,
        serviciosCreados,
        servicioData,
        contratoId,
        createdBy
      );

      // 6. Generar orden de instalación si se solicita
      let instalacionId = null;
      if (datosServicio.programar_instalacion !== false) {
        const instalacion = await this.generarOrdenInstalacionParaSede(
          conexion,
          clienteId,
          serviciosCreados,
          servicioData,
          contratoId,
          createdBy
        );
        instalacionId = instalacion.id;
      }

      console.log(`✅ Servicio agregado exitosamente al cliente ${clienteId}`);

      return {
        cliente_id: clienteId,
        servicios_creados: serviciosCreados,
        contrato_id: contratoId,
        factura_id: facturaId,
        instalacion_id: instalacionId,
        resumen: {
          cantidad_servicios: serviciosCreados.length,
          servicios: serviciosCreados.map(s => `${s.tipo}: ${s.plan_nombre}`).join(', ')
        }
      };
    });
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
