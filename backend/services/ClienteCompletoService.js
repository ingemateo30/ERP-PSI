// backend/services/ClienteCompletoService.js
// Servicio para crear clientes completos con servicios y documentos automáticos

const { Database } = require('../models/Database');

class ClienteCompletoService {

  /**
   * ============================================
   * CREACIÓN COMPLETA DE CLIENTE
   * ============================================
   */

  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  static async crearClienteCompleto(datosCompletos) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      console.log('🚀 Iniciando creación completa de cliente...');

      // 1. CREAR CLIENTE
      const clienteId = await this.crearCliente(conexion, datosCompletos.cliente);
      console.log(`✅ Cliente creado con ID: ${clienteId}`);

      // 2. ASIGNAR SERVICIO AL CLIENTE
      const servicioId = await this.asignarServicioCliente(
        conexion, 
        clienteId, 
        datosCompletos.servicio
      );
      console.log(`✅ Servicio asignado con ID: ${servicioId}`);

      // 3. GENERAR DOCUMENTOS AUTOMÁTICOS
      const documentos = {};
      
      if (datosCompletos.opciones.generar_documentos) {
        // Generar contrato
        documentos.contrato = await this.generarContrato(
          conexion, 
          clienteId, 
          servicioId
        );
        console.log(`✅ Contrato generado: ${documentos.contrato.numero}`);

        // Generar orden de instalación
        documentos.orden_instalacion = await this.generarOrdenInstalacion(
          conexion, 
          clienteId, 
          servicioId
        );
        console.log(`✅ Orden de instalación generada: ${documentos.orden_instalacion.numero}`);
      }

      // 4. GENERAR PRIMERA FACTURA AUTOMÁTICA
      documentos.factura = await this.generarPrimeraFactura(
        conexion, 
        clienteId, 
        servicioId, 
        datosCompletos.cliente,
        datosCompletos.servicio
      );
      console.log(`✅ Primera factura generada: ${documentos.factura.numero_factura}`);

      // 5. PROGRAMAR INSTALACIÓN (si se solicita)
      if (datosCompletos.opciones.programar_instalacion) {
        await this.programarInstalacion(conexion, clienteId, servicioId);
        console.log(`✅ Instalación programada`);
      }

      await conexion.commit();

      // 6. ENVIAR EMAIL DE BIENVENIDA (después del commit)
      let emailEnviado = false;
      if (datosCompletos.opciones.enviar_bienvenida && datosCompletos.cliente.email) {
        try {
          await this.enviarEmailBienvenida(clienteId, datosCompletos.cliente);
          emailEnviado = true;
          console.log(`✅ Email de bienvenida enviado`);
        } catch (emailError) {
          console.warn(`⚠️ Error enviando email de bienvenida:`, emailError.message);
        }
      }

      return {
        cliente_id: clienteId,
        servicio_id: servicioId,
        documentos_generados: documentos,
        email_enviado: emailEnviado,
        message: 'Cliente creado exitosamente con todos los documentos'
      };

    } catch (error) {
      await conexion.rollback();
      console.error('❌ Error en creación completa:', error);
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * ============================================
   * CREACIÓN DE CLIENTE
   * ============================================
   */

  static async crearCliente(conexion, datosCliente) {
    const fechaActual = new Date().toISOString().split('T')[0];

    const [resultado] = await conexion.execute(`
      INSERT INTO clientes (
        identificacion, tipo_documento, nombre, email, telefono, telefono_fijo,
        direccion, barrio, estrato, ciudad_id, sector_id, observaciones,
        fecha_inicio_contrato, estado, activo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', 1, NOW())
    `, [
      datosCliente.identificacion,
      datosCliente.tipo_documento || 'cedula',
      datosCliente.nombre,
      datosCliente.email,
      datosCliente.telefono,
      datosCliente.telefono_fijo || null,
      datosCliente.direccion,
      datosCliente.barrio || null,
      datosCliente.estrato || '3',
      datosCliente.ciudad_id,
      datosCliente.sector_id || null,
      datosCliente.observaciones || null,
      datosCliente.fecha_inicio_contrato || fechaActual
    ]);

    return resultado.insertId;
  }

  /**
   * ============================================
   * ASIGNACIÓN DE SERVICIO
   * ============================================
   */

  static async asignarServicioCliente(conexion, clienteId, datosServicio) {
    const [resultado] = await conexion.execute(`
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, fecha_activacion, estado, 
        precio_personalizado, observaciones, created_at
      ) VALUES (?, ?, ?, 'activo', ?, ?, NOW())
    `, [
      clienteId,
      datosServicio.plan_id,
      datosServicio.fecha_activacion,
      datosServicio.precio_personalizado || null,
      datosServicio.observaciones || null
    ]);

    return resultado.insertId;
  }

  /**
   * ============================================
   * GENERACIÓN DE CONTRATO
   * ============================================
   */

  static async generarContrato(conexion, clienteId, servicioId) {
    // Obtener consecutivo de contrato
    const [configEmpresa] = await conexion.execute(
      'SELECT consecutivo_contrato FROM configuracion_empresa LIMIT 1'
    );
    
    const numeroContrato = `CT-${String(configEmpresa[0].consecutivo_contrato).padStart(6, '0')}`;
    
    // Actualizar consecutivo
    await conexion.execute(
      'UPDATE configuracion_empresa SET consecutivo_contrato = consecutivo_contrato + 1'
    );

    // Crear registro de contrato (si existe tabla contratos)
    // Por ahora, solo actualizamos el cliente con el número de contrato
    await conexion.execute(`
      UPDATE clientes SET contrato = ? WHERE id = ?
    `, [numeroContrato, clienteId]);

    return {
      numero: numeroContrato,
      cliente_id: clienteId,
      servicio_id: servicioId,
      fecha_generacion: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * ============================================
   * GENERACIÓN DE ORDEN DE INSTALACIÓN
   * ============================================
   */

  static async generarOrdenInstalacion(conexion, clienteId, servicioId) {
    const fechaActual = new Date().toISOString().split('T')[0];
    const fechaProgramada = new Date();
    fechaProgramada.setDate(fechaProgramada.getDate() + 3); // 3 días después
    
    const [resultado] = await conexion.execute(`
      INSERT INTO instalaciones (
        cliente_id, servicio_cliente_id, fecha_programada, 
        estado, observaciones, created_at
      ) VALUES (?, ?, ?, 'programada', 'Instalación generada automáticamente', NOW())
    `, [
      clienteId,
      servicioId,
      fechaProgramada.toISOString().split('T')[0]
    ]);

    return {
      id: resultado.insertId,
      numero: `INST-${String(resultado.insertId).padStart(6, '0')}`,
      cliente_id: clienteId,
      servicio_id: servicioId,
      fecha_programada: fechaProgramada.toISOString().split('T')[0]
    };
  }

  /**
   * ============================================
   * GENERACIÓN DE PRIMERA FACTURA
   * ============================================
   */

  static async generarPrimeraFactura(conexion, clienteId, servicioId, datosCliente, datosServicio) {
    // Obtener datos completos del cliente y servicio
    const [clienteCompleto] = await conexion.execute(`
      SELECT c.*, ps.nombre as plan_nombre, ps.precio as plan_precio, ps.tipo as plan_tipo
      FROM clientes c
      INNER JOIN servicios_cliente sc ON c.id = sc.cliente_id
      INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE c.id = ? AND sc.id = ?
    `, [clienteId, servicioId]);

    if (clienteCompleto.length === 0) {
      throw new Error('No se encontraron datos del cliente y servicio');
    }

    const cliente = clienteCompleto[0];
    
    // Calcular período de facturación según reglas PSI
    const fechaActivacion = new Date(datosServicio.fecha_activacion);
    const fechaDesde = new Date(fechaActivacion);
    const fechaHasta = new Date(fechaActivacion);
    fechaHasta.setDate(fechaHasta.getDate() + 30); // Primer período de 30 días

    const fechaEmision = new Date();
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 15); // 15 días para pagar

    // Calcular conceptos de facturación
    const conceptos = this.calcularConceptosPrimeraFactura(cliente, datosServicio);
    
    // Calcular totales
    const totales = this.calcularTotalesFactura(conceptos, cliente.estrato);

    // Generar número de factura
    const [configFactura] = await conexion.execute(
      'SELECT consecutivo_factura FROM configuracion_empresa LIMIT 1'
    );
    
    const numeroFactura = `FAC${String(configFactura[0].consecutivo_factura).padStart(6, '0')}`;
    
    // Actualizar consecutivo
    await conexion.execute(
      'UPDATE configuracion_empresa SET consecutivo_factura = consecutivo_factura + 1'
    );

    // Crear factura
    const [facturaResult] = await conexion.execute(`
      INSERT INTO facturas (
        numero_factura, cliente_id, identificacion_cliente, nombre_cliente,
        periodo_facturacion, fecha_emision, fecha_vencimiento, fecha_desde, fecha_hasta,
        internet, television, varios, s_internet, s_television, s_varios, s_iva,
        subtotal, iva, total, estado, observaciones, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, 1, NOW())
    `, [
      numeroFactura,
      clienteId,
      cliente.identificacion,
      cliente.nombre,
      `${fechaEmision.getFullYear()}-${String(fechaEmision.getMonth() + 1).padStart(2, '0')}`,
      fechaEmision.toISOString().split('T')[0],
      fechaVencimiento.toISOString().split('T')[0],
      fechaDesde.toISOString().split('T')[0],
      fechaHasta.toISOString().split('T')[0],
      totales.internet,
      totales.television,
      totales.varios,
      totales.s_internet,
      totales.s_television,
      totales.s_varios,
      totales.s_iva,
      totales.subtotal,
      totales.iva,
      totales.total,
      `Primera factura - Período: ${fechaDesde.toISOString().split('T')[0]} al ${fechaHasta.toISOString().split('T')[0]}`
    ]);

    const facturaId = facturaResult.insertId;

    // Crear detalles de factura
    await this.crearDetallesFactura(conexion, facturaId, conceptos, servicioId);

    return {
      id: facturaId,
      numero_factura: numeroFactura,
      cliente_id: clienteId,
      servicio_id: servicioId,
      subtotal: totales.subtotal,
      iva: totales.iva,
      total: totales.total,
      fecha_emision: fechaEmision.toISOString().split('T')[0],
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      conceptos_incluidos: conceptos.map(c => c.concepto)
    };
  }

  /**
   * ============================================
   * CÁLCULO DE CONCEPTOS PRIMERA FACTURA
   * ============================================
   */

  static calcularConceptosPrimeraFactura(cliente, datosServicio) {
    const conceptos = [];
    
    // 1. SERVICIO PRINCIPAL (30 días)
    const precioServicio = parseFloat(datosServicio.precio_personalizado) || parseFloat(cliente.plan_precio);
    
    conceptos.push({
      tipo: cliente.plan_tipo,
      concepto: `${cliente.plan_nombre} - Primer período (30 días)`,
      cantidad: 1,
      precio_unitario: precioServicio,
      valor: precioServicio,
      aplica_iva: this.determinarAplicacionIVA(cliente.plan_tipo, cliente.estrato),
      porcentaje_iva: this.determinarAplicacionIVA(cliente.plan_tipo, cliente.estrato) ? 19 : 0
    });

    // 2. CARGO DE INSTALACIÓN
    const valorInstalacion = 42016; // Valor fijo según instrucciones
    
    conceptos.push({
      tipo: 'varios',
      concepto: 'Cargo por instalación',
      cantidad: 1,
      precio_unitario: valorInstalacion,
      valor: valorInstalacion,
      aplica_iva: true,
      porcentaje_iva: 19
    });

    return conceptos;
  }

  /**
   * ============================================
   * CÁLCULO DE TOTALES DE FACTURA
   * ============================================
   */

  static calcularTotalesFactura(conceptos, estrato) {
    let internet = 0, television = 0, varios = 0;
    let s_internet = 0, s_television = 0, s_varios = 0;
    let totalIva = 0;

    conceptos.forEach(concepto => {
      const valor = concepto.valor;
      const valorIva = concepto.aplica_iva ? Math.round(valor * (concepto.porcentaje_iva / 100)) : 0;

      // Clasificar por tipo
      switch (concepto.tipo) {
        case 'internet':
          internet += valor;
          s_internet += valor;
          break;
        case 'television':
          television += valor;
          s_television += valor;
          break;
        case 'combo':
          internet += valor;
          s_internet += valor;
          break;
        default:
          varios += valor;
          s_varios += valor;
      }

      totalIva += valorIva;
    });

    const subtotal = s_internet + s_television + s_varios;
    const total = subtotal + totalIva;

    return {
      internet,
      television,
      varios,
      s_internet,
      s_television, 
      s_varios,
      s_iva: totalIva,
      subtotal,
      iva: totalIva,
      total
    };
  }

  /**
   * ============================================
   * CREAR DETALLES DE FACTURA
   * ============================================
   */

  static async crearDetallesFactura(conexion, facturaId, conceptos, servicioId) {
    for (const concepto of conceptos) {
      const valorIva = concepto.aplica_iva ? 
        Math.round(concepto.valor * (concepto.porcentaje_iva / 100)) : 0;

      await conexion.execute(`
        INSERT INTO detalle_facturas (
          factura_id, concepto_nombre, cantidad, precio_unitario,
          subtotal, iva, total, servicio_cliente_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        facturaId,
        concepto.concepto,
        concepto.cantidad,
        concepto.precio_unitario,
        concepto.valor,
        valorIva,
        concepto.valor + valorIva,
        concepto.tipo !== 'varios' ? servicioId : null
      ]);
    }
  }

  /**
   * ============================================
   * DETERMINAR APLICACIÓN DE IVA
   * ============================================
   */

  static determinarAplicacionIVA(tipoServicio, estrato) {
    const estratoNumerico = parseInt(estrato) || 4;

    switch (tipoServicio) {
      case 'internet':
        // Internet: No aplica IVA en estratos 1, 2 y 3
        return estratoNumerico > 3;
      
      case 'television':
        // TV: Siempre aplica IVA del 19%
        return true;
      
      case 'combo':
        // Combo: Aplica IVA solo si estrato > 3
        return estratoNumerico > 3;
      
      default:
        return false;
    }
  }

  /**
   * ============================================
   * PROGRAMAR INSTALACIÓN
   * ============================================
   */

  static async programarInstalacion(conexion, clienteId, servicioId) {
    // Verificar si ya existe una instalación programada
    const [instalacionExistente] = await conexion.execute(`
      SELECT id FROM instalaciones 
      WHERE cliente_id = ? AND servicio_cliente_id = ?
    `, [clienteId, servicioId]);

    if (instalacionExistente.length > 0) {
      // Ya existe, solo actualizamos el estado
      await conexion.execute(`
        UPDATE instalaciones 
        SET estado = 'programada', observaciones = 'Instalación programada automáticamente'
        WHERE id = ?
      `, [instalacionExistente[0].id]);
    }
    // Si no existe, ya se creó en generarOrdenInstalacion
  }

  /**
   * ============================================
   * ENVÍO DE EMAIL DE BIENVENIDA
   * ============================================
   */

  static async enviarEmailBienvenida(clienteId, datosCliente) {
    try {
      // Intentar importar el servicio de email
      const EmailService = require('./EmailService');
      
      const datosEmail = {
        destinatario: datosCliente.email,
        nombre_cliente: datosCliente.nombre,
        empresa_nombre: 'PSI - Proveedor de Telecomunicaciones',
        telefono_soporte: '318-455-0936'
      };

      await EmailService.enviarEmailBienvenida(datosEmail);
      
    } catch (error) {
      // Si no existe el servicio de email, solo registrar el intento
      console.log('📧 Email de bienvenida registrado para envío posterior');
      throw new Error('Servicio de email no disponible - email registrado para envío posterior');
    }
  }

  /**
   * ============================================
   * CAMBIO DE PLAN DE CLIENTE EXISTENTE
   * ============================================
   */

  /**
   * Cambiar plan de servicio de un cliente existente
   */
  static async cambiarPlanCliente(clienteId, nuevosPlanData) {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      // 1. Obtener servicio activo actual
      const [servicioActual] = await conexion.execute(`
        SELECT sc.*, ps.nombre as plan_actual
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ? AND sc.estado = 'activo'
        LIMIT 1
      `, [clienteId]);

      if (servicioActual.length === 0) {
        throw new Error('Cliente no tiene servicios activos');
      }

      // 2. Marcar servicio actual como cancelado
      await conexion.execute(`
        UPDATE servicios_cliente 
        SET estado = 'cancelado', fecha_suspension = NOW()
        WHERE id = ?
      `, [servicioActual[0].id]);

      // 3. Crear nuevo servicio
      const nuevoServicioId = await this.asignarServicioCliente(
        conexion, 
        clienteId, 
        nuevosPlanData
      );

      // 4. Opcional: Generar factura proporcional si es necesario
      // (esto dependería de las reglas de negocio específicas)

      await conexion.commit();

      return {
        cliente_id: clienteId,
        servicio_anterior_id: servicioActual[0].id,
        nuevo_servicio_id: nuevoServicioId,
        message: `Plan cambiado exitosamente de ${servicioActual[0].plan_actual} al nuevo plan`
      };

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  /**
   * ============================================
   * OBTENER SERVICIOS DE CLIENTE
   * ============================================
   */

  static async obtenerServiciosCliente(clienteId) {
    const conexion = await Database.conexion();
    
    try {
      const [servicios] = await conexion.execute(`
        SELECT 
          sc.*,
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          ps.velocidad_bajada,
          ps.velocidad_subida,
          ps.canales_tv
        FROM servicios_cliente sc
        INNER JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE sc.cliente_id = ?
        ORDER BY sc.fecha_activacion DESC
      `, [clienteId]);

      return servicios;

    } finally {
      conexion.release();
    }
  }
}

module.exports = ClienteCompletoService;