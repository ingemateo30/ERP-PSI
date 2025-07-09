// backend/services/ClienteCompletoService.js
// Servicio completo para crear clientes con servicios y documentos automáticos

const { Database } = require('../models/Database');
const pool = require('../config/database');

class ClienteCompletoService {
  /**
   * Crear cliente completo con servicio y documentos automáticos
   */
  static async crearClienteCompleto(datosCompletos) {
    return await Database.transaction(async (conexion) => {
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
      
      if (datosCompletos.opciones?.generar_documentos) {
        // Generar contrato
        documentos.contrato = await this.generarContratoInterno(
          conexion, 
          clienteId, 
          servicioId
        );
        console.log(`✅ Contrato generado: ${documentos.contrato.numero}`);

        // Generar orden de instalación
        documentos.orden_instalacion = await this.generarOrdenInstalacionInterno(
          conexion, 
          clienteId, 
          servicioId
        );
        console.log(`✅ Orden de instalación generada: ${documentos.orden_instalacion.numero}`);
      }

      // 4. GENERAR PRIMERA FACTURA AUTOMÁTICA
      documentos.factura = await this.generarPrimeraFacturaInterno(
        conexion, 
        clienteId, 
        servicioId, 
        datosCompletos.cliente,
        datosCompletos.servicio
      );
      console.log(`✅ Primera factura generada: ${documentos.factura.numero_factura}`);

      // 5. PROGRAMAR INSTALACIÓN (si se solicita)
      if (datosCompletos.opciones?.programar_instalacion) {
        await this.programarInstalacionInterno(conexion, clienteId, servicioId);
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
   * Crear cliente en la base de datos
   */
  static async crearCliente(conexion, datosCliente) {
    console.log('📝 Datos del cliente recibidos:', datosCliente);

    // Limpiar y validar datos antes de insertar
    const datosLimpios = {
      identificacion: datosCliente.identificacion?.toString().trim() || '',
      tipo_documento: datosCliente.tipo_documento || 'cedula',
      nombre: datosCliente.nombre?.toString().trim() || '',
      email: datosCliente.email?.toString().trim() || '',
      telefono: datosCliente.telefono?.toString().trim() || '',
      telefono_fijo: datosCliente.telefono_fijo?.toString().trim() || null,
      direccion: datosCliente.direccion?.toString().trim() || '',
      barrio: datosCliente.barrio?.toString().trim() || null,
      estrato: datosCliente.estrato ? parseInt(datosCliente.estrato) : null,
      ciudad_id: datosCliente.ciudad_id ? parseInt(datosCliente.ciudad_id) : null,
      sector_id: datosCliente.sector_id ? parseInt(datosCliente.sector_id) : null,
      observaciones: datosCliente.observaciones?.toString().trim() || null
    };

    // Validar campos requeridos
    if (!datosLimpios.identificacion) {
      throw new Error('La identificación es requerida');
    }
    if (!datosLimpios.nombre) {
      throw new Error('El nombre es requerido');
    }
    if (!datosLimpios.email) {
      throw new Error('El email es requerido');
    }
    if (!datosLimpios.telefono) {
      throw new Error('El teléfono es requerido');
    }
    if (!datosLimpios.direccion) {
      throw new Error('La dirección es requerida');
    }
    if (!datosLimpios.ciudad_id) {
      throw new Error('La ciudad es requerida');
    }

    console.log('✅ Datos limpios para insertar:', datosLimpios);

    const query = `
      INSERT INTO clientes (
        identificacion, tipo_documento, nombre, correo, telefono, 
        telefono_2, direccion, barrio, estrato, ciudad_id, 
        sector_id, observaciones, fecha_registro, estado, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'activo', NOW())
    `;

    const valores = [
      datosLimpios.identificacion,
      datosLimpios.tipo_documento,
      datosLimpios.nombre,
      datosLimpios.email,
      datosLimpios.telefono,
      datosLimpios.telefono_fijo,
      datosLimpios.direccion,
      datosLimpios.barrio,
      datosLimpios.estrato,
      datosLimpios.ciudad_id,
      datosLimpios.sector_id,
      datosLimpios.observaciones
    ];

    const [resultado] = await conexion.execute(query, valores);
    console.log('✅ Cliente insertado con ID:', resultado.insertId);
    
    return resultado.insertId;
  }

  /**
   * Asignar servicio al cliente
   */
  static async asignarServicioCliente(conexion, clienteId, datosServicio) {
    console.log('🔧 Datos del servicio recibidos:', datosServicio);

    // Obtener datos del plan
    const [planes] = await conexion.execute(
      'SELECT * FROM planes_servicio WHERE id = ?',
      [datosServicio.plan_id]
    );

    if (planes.length === 0) {
      throw new Error('Plan de servicio no encontrado');
    }

    const plan = planes[0];
    console.log('📋 Plan encontrado:', plan);

    // Limpiar y validar datos del servicio
    let datosLimpios = {
      cliente_id: parseInt(clienteId),
      plan_id: parseInt(datosServicio.plan_id),
      fecha_activacion: datosServicio.fecha_activacion || new Date().toISOString().split('T')[0],
      precio_personalizado: datosServicio.precio_personalizado ? parseFloat(datosServicio.precio_personalizado) : null,
      observaciones: datosServicio.observaciones?.toString().trim()
    };

    // Usar método auxiliar para limpiar datos
    datosLimpios = this.limpiarDatosParaMySQL(datosLimpios);

    console.log('✅ Datos del servicio limpios:', datosLimpios);

    const query = `
      INSERT INTO servicios_cliente (
        cliente_id, plan_id, fecha_activacion, estado, 
        precio_personalizado, observaciones, created_at
      ) VALUES (?, ?, ?, 'activo', ?, ?, NOW())
    `;

    const valores = [
      datosLimpios.cliente_id,
      datosLimpios.plan_id,
      datosLimpios.fecha_activacion,
      datosLimpios.precio_personalizado,
      datosLimpios.observaciones
    ];

    console.log('🔍 Query servicio SQL:', query);
    console.log('🔍 Valores servicio antes de validar:', valores);

    // Validar valores para MySQL
    const valoresValidados = this.validarValoresParaMySQL(valores);

    console.log('🔍 Valores servicio validados:', valoresValidados);

    const [resultado] = await conexion.execute(query, valoresValidados);
    console.log('✅ Servicio insertado con ID:', resultado.insertId);
    
    return resultado.insertId;
  }

  /**
   * Generar contrato interno
   */
  static async generarContratoInterno(conexion, clienteId, servicioId) {
    const numeroContrato = await this.generarNumeroContrato(conexion);
    
    // Verificar si existe tabla contratos, si no, simplemente retornar datos
    try {
      const query = `
        INSERT INTO contratos (
          cliente_id, servicio_id, numero_contrato, tipo_contrato,
          fecha_generacion, estado, generado_automaticamente
        ) VALUES (?, ?, ?, 'servicio', NOW(), 'activo', 1)
      `;

      await conexion.execute(query, [clienteId, servicioId, numeroContrato]);
    } catch (error) {
      console.warn('⚠️ Tabla contratos no existe, saltando generación de contrato');
    }

    return {
      numero: numeroContrato,
      tipo: 'servicio',
      fecha_generacion: new Date()
    };
  }

  /**
   * Generar orden de instalación interna
   */
  static async generarOrdenInstalacionInterno(conexion, clienteId, servicioId) {
    const numeroOrden = await this.generarNumeroOrdenInstalacion(conexion);
    
    // Verificar si existe tabla ordenes_instalacion, si no, usar instalaciones
    try {
      const query = `
        INSERT INTO instalaciones (
          cliente_id, servicio_cliente_id, numero_orden, estado,
          fecha_creacion, fecha_programada, prioridad
        ) VALUES (?, ?, ?, 'pendiente', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 'normal')
      `;

      await conexion.execute(query, [clienteId, servicioId, numeroOrden]);
    } catch (error) {
      console.warn('⚠️ Error creando orden de instalación:', error.message);
    }

    return {
      numero: numeroOrden,
      estado: 'pendiente',
      fecha_programada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // +2 días
    };
  }

  /**
   * Generar primera factura interna
   */
  static async generarPrimeraFacturaInterno(conexion, clienteId, servicioId, datosCliente, datosServicio) {
    console.log('🧾 Generando primera factura...');
    
    const numeroFactura = await this.generarNumeroFactura(conexion);
    
    // Obtener datos del servicio y plan
    const [servicios] = await conexion.execute(`
      SELECT sc.*, ps.nombre as plan_nombre, ps.precio as plan_precio
      FROM servicios_cliente sc
      JOIN planes_servicio ps ON sc.plan_id = ps.id
      WHERE sc.id = ?
    `, [servicioId]);

    if (servicios.length === 0) {
      throw new Error('Servicio no encontrado');
    }

    const servicio = servicios[0];
    console.log('📋 Servicio para facturar:', servicio);

    // Calcular valores de la factura
    const valor = servicio.precio_personalizado || servicio.plan_precio;
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // +30 días

    // Limpiar datos para la factura
    const datosFactura = {
      cliente_id: parseInt(clienteId),
      numero_factura: numeroFactura.toString(),
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      subtotal: parseFloat(valor),
      impuestos: 0,
      total: parseFloat(valor),
      estado: 'pendiente',
      observaciones: 'Primera factura automática',
      generada_automaticamente: 1
    };

    console.log('💰 Datos de la factura:', datosFactura);

    // Crear factura
    const queryFactura = `
      INSERT INTO facturas (
        cliente_id, numero_factura, fecha_emision, fecha_vencimiento,
        subtotal, iva, total, estado, observaciones, created_at
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, NOW())
    `;

    const valoresFactura = [
      datosFactura.cliente_id,
      datosFactura.numero_factura,
      datosFactura.fecha_vencimiento,
      datosFactura.subtotal,
      datosFactura.impuestos,
      datosFactura.total,
      datosFactura.estado,
      datosFactura.observaciones,
    ];

    console.log('🔍 Query factura SQL:', queryFactura);
    console.log('🔍 Valores factura a insertar:', valoresFactura);

    const [resultadoFactura] = await conexion.execute(queryFactura, valoresFactura);
    const facturaId = resultadoFactura.insertId;

    console.log('✅ Factura creada con ID:', facturaId);

    // Crear detalle de factura
    try {
      const queryDetalle = `
        INSERT INTO detalle_facturas (
          factura_id, concepto_id, descripcion, cantidad,
          precio_unitario, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const valoresDetalle = [
        facturaId,
        1, // concepto_id por defecto
        `Plan ${servicio.plan_nombre} - Primer mes`,
        1,
        datosFactura.subtotal,
        datosFactura.subtotal
      ];

      console.log('🔍 Query detalle SQL:', queryDetalle);
      console.log('🔍 Valores detalle a insertar:', valoresDetalle);

      await conexion.execute(queryDetalle, valoresDetalle);
      console.log('✅ Detalle de factura creado');

    } catch (error) {
      console.warn('⚠️ Error creando detalle de factura:', error.message);
      // No lanzar error para que no falle toda la creación
    }

    return {
      numero_factura: numeroFactura,
      total: valor,
      fecha_vencimiento: fechaVencimiento,
      estado: 'pendiente'
    };
  }

  /**
   * Programar instalación interna
   */
  static async programarInstalacionInterno(conexion, clienteId, servicioId) {
    // Buscar técnico disponible (lógica simplificada)
    const [tecnicos] = await conexion.execute(`
      SELECT id FROM sistema_usuarios 
      WHERE rol = 'instalador' AND activo = 1 
      ORDER BY RAND() LIMIT 1
    `);

    if (tecnicos.length > 0) {
      const fechaInstalacion = new Date();
      fechaInstalacion.setDate(fechaInstalacion.getDate() + 2); // +2 días

      try {
        const query = `
          UPDATE instalaciones 
          SET instalador_id = ?, fecha_programada = ?, estado = 'programada'
          WHERE cliente_id = ? AND servicio_cliente_id = ?
        `;

        await conexion.execute(query, [
          tecnicos[0].id, fechaInstalacion, clienteId, servicioId
        ]);
      } catch (error) {
        console.warn('⚠️ Error programando instalación:', error.message);
      }
    }
  }

  /**
   * Enviar correo de bienvenida
   */
  static async enviarCorreoBienvenida(clienteId, datosCliente) {
    try {
      // Aquí implementarías la lógica de envío de correo
      // Por ahora solo simulamos el envío
      console.log(`📧 Enviando correo de bienvenida a ${datosCliente.email}`);
      
      // TODO: Implementar envío real de correo con plantillas
      return {
        enviado: true,
        email: datosCliente.email,
        fecha_envio: new Date()
      };
    } catch (error) {
      console.error('❌ Error enviando correo de bienvenida:', error);
      // No lanzamos error para que no falle toda la creación
      return { enviado: false, error: error.message };
    }
  }
  /**
   * Obtener cliente completo con todos sus datos
   */
  static async obtenerClienteCompleto(clienteId) {
    const conexion = await pool.getConnection();
    
    try {
      // Cliente básico
      const [clientes] = await conexion.execute(`
        SELECT c.*, ci.nombre as ciudad_nombre, s.nombre as sector_nombre
        FROM clientes c
        LEFT JOIN ciudades ci ON c.ciudad_id = ci.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        WHERE c.id = ?
      `, [clienteId]);

      if (clientes.length === 0) {
        return null;
      }

      const cliente = clientes[0];

      // Servicios
      const [servicios] = await conexion.execute(`
        SELECT cs.*, ps.nombre as plan_nombre, ps.descripcion as plan_descripcion,
               ps.velocidad_bajada, ps.velocidad_subida
        FROM servicios_cliente cs
        JOIN planes_servicio ps ON cs.plan_id = ps.id
        WHERE cs.cliente_id = ?
        ORDER BY cs.created_at DESC
      `, [clienteId]);

      // Facturas recientes
      const [facturas] = await conexion.execute(`
        SELECT * FROM facturas 
        WHERE cliente_id = ? 
        ORDER BY fecha_emision DESC 
        LIMIT 5
      `, [clienteId]);

      return {
        cliente,
        servicios,
        facturas
      };

    } finally {
      conexion.release();
    }
  }

  /**
   * Generar contrato para un cliente existente
   */
  static async generarContrato(clienteId, tipoContrato = 'servicio') {
    const conexion = await Database.conexion();
    
    try {
      await conexion.beginTransaction();

      const numeroContrato = await this.generarNumeroContrato(conexion);
      
      const query = `
        INSERT INTO contratos (
          cliente_id, numero_contrato, tipo_contrato,
          fecha_generacion, estado, generado_automaticamente
        ) VALUES (?, ?, ?, NOW(), 'activo', 0)
      `;

      await conexion.execute(query, [clienteId, numeroContrato, tipoContrato]);
      
      await conexion.commit();

      return {
        numero: numeroContrato,
        tipo: tipoContrato,
        fecha_generacion: new Date()
      };

    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  static limpiarDatosParaMySQL(objeto) {
    const objetoLimpio = {};
    
    for (const [clave, valor] of Object.entries(objeto)) {
      if (valor === undefined || valor === '') {
        objetoLimpio[clave] = null;
      } else if (typeof valor === 'string') {
        objetoLimpio[clave] = valor.trim();
      } else {
        objetoLimpio[clave] = valor;
      }
    }
    
    return objetoLimpio;
  }

  static validarValoresParaMySQL(valores) {
    return valores.map((valor, index) => {
      if (valor === undefined) {
        console.warn(`⚠️ Valor undefined en posición ${index}, convirtiendo a null`);
        return null;
      }
      return valor;
    });
  }

  static async generarNumeroContrato(conexion) {
    const año = new Date().getFullYear();
    
    try {
      const [ultimo] = await conexion.execute(`
        SELECT numero_contrato FROM contratos 
        WHERE numero_contrato LIKE 'CONT-${año}-%' 
        ORDER BY id DESC LIMIT 1
      `);

      let siguiente = 1;
      if (ultimo.length > 0) {
        const numeroActual = parseInt(ultimo[0].numero_contrato.split('-')[2]);
        siguiente = numeroActual + 1;
      }

      return `CONT-${año}-${siguiente.toString().padStart(6, '0')}`;
    } catch (error) {
      // Si no existe la tabla contratos, generar número básico
      return `CONT-${año}-${Date.now().toString().slice(-6)}`;
    }
  }

  /**
   * Generar número de orden de instalación único
   */
  static async generarNumeroOrdenInstalacion(conexion) {
    const año = new Date().getFullYear();
    
    try {
      const [ultimo] = await conexion.execute(`
        SELECT numero_orden FROM instalaciones 
        WHERE numero_orden LIKE 'INST-${año}-%' 
        ORDER BY id DESC LIMIT 1
      `);

      let siguiente = 1;
      if (ultimo.length > 0 && ultimo[0].numero_orden) {
        const numeroActual = parseInt(ultimo[0].numero_orden.split('-')[2]);
        siguiente = numeroActual + 1;
      }

      return `INST-${año}-${siguiente.toString().padStart(6, '0')}`;
    } catch (error) {
      // Si hay error, generar número básico
      return `INST-${año}-${Date.now().toString().slice(-6)}`;
    }
  }

  /**
   * Generar número de factura único
   */
 static async generarNumeroFactura(conexion) {
  try {
    console.log('📄 Generando número de factura usando configuración empresa...');
    
    // Obtener configuración de la empresa
    const [configEmpresa] = await conexion.execute(`
      SELECT 
        prefijo_factura,
        consecutivo_factura
      FROM configuracion_empresa 
      WHERE id = 1
      LIMIT 1
    `);

    if (configEmpresa.length === 0) {
      console.warn('⚠️ No hay configuración de empresa, creando configuración por defecto...');
      
      // Crear configuración por defecto
      await conexion.execute(`
        INSERT INTO configuracion_empresa (
          id, licencia, empresa_nombre, prefijo_factura, consecutivo_factura
        ) VALUES (1, 'DEFAULT', 'EMPRESA PSI', 'FAC', 1)
        ON DUPLICATE KEY UPDATE
        prefijo_factura = COALESCE(prefijo_factura, 'FAC'),
        consecutivo_factura = COALESCE(consecutivo_factura, 1)
      `);
      
      // Usar valores por defecto
      const numeroFactura = `FAC000001`;
      console.log(`📄 Número generado con configuración por defecto: ${numeroFactura}`);
      return numeroFactura;
    }

    const config = configEmpresa[0];
    const prefijo = config.prefijo_factura || 'FAC';
    const consecutivo = config.consecutivo_factura || 1;

    // Generar número con formato: PREFIJO + CONSECUTIVO (6 dígitos)
    const numeroFactura = `${prefijo}${consecutivo.toString().padStart(6, '0')}`;

    // Actualizar el consecutivo para la próxima factura
    await conexion.execute(`
      UPDATE configuracion_empresa 
      SET consecutivo_factura = consecutivo_factura + 1
      WHERE id = 1
    `);

    console.log(`📄 Número de factura generado: ${numeroFactura} (próximo consecutivo: ${consecutivo + 1})`);
    
    return numeroFactura;

  } catch (error) {
    console.error('❌ Error generando número de factura:', error);
    // Fallback con timestamp
    const fallback = `FAC${Date.now().toString().slice(-6)}`;
    console.log(`📄 Usando número de fallback: ${fallback}`);
    return fallback;
  }
}
  /**
   * Obtener servicios de un cliente
   */
  static async obtenerServiciosCliente(clienteId) {
    const conexion = await pool.getConnection();
    
    try {
      const [servicios] = await conexion.execute(`
        SELECT sc.*, ps.nombre as plan_nombre, ps.descripcion as plan_descripcion,
               ps.velocidad_bajada, ps.velocidad_subida, ps.precio as plan_precio
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
   * Cambiar plan de un cliente
   */
  static async cambiarPlanCliente(clienteId, nuevosPlanData) {
    return await Database.transaction(async (conexion) => {
      // Obtener servicio activo actual
      const [servicioActual] = await conexion.execute(`
        SELECT * FROM servicios_cliente 
        WHERE cliente_id = ? AND estado = 'activo'
        ORDER BY created_at DESC LIMIT 1
      `, [clienteId]);

      if (servicioActual.length === 0) {
        throw new Error('Cliente no tiene servicios activos');
      }

      // Finalizar servicio actual
      await conexion.execute(`
        UPDATE servicios_cliente 
        SET estado = 'cambiado', fecha_suspension = NOW()
        WHERE id = ?
      `, [servicioActual[0].id]);

      // Crear nuevo servicio
      const servicioId = await this.asignarServicioCliente(conexion, clienteId, {
        plan_id: nuevosPlanData.plan_id,
        precio_personalizado: nuevosPlanData.precio_personalizado,
        fecha_activacion: nuevosPlanData.fecha_cambio || new Date(),
        observaciones: nuevosPlanData.observaciones || 'Cambio de plan'
      });

      return {
        servicio_anterior_id: servicioActual[0].id,
        servicio_nuevo_id: servicioId,
        fecha_cambio: new Date()
      };
    });
  }

  /**
   * Suspender servicio de un cliente
   */
  static async suspenderServicio(clienteId, datosSuspension) {
    return await Database.transaction(async (conexion) => {
      // Actualizar estado del servicio
      const [resultado] = await conexion.execute(`
        UPDATE servicios_cliente 
        SET estado = 'suspendido', 
            observaciones = CONCAT(IFNULL(observaciones, ''), '\nSuspendido: ', ?)
        WHERE cliente_id = ? AND estado = 'activo'
      `, [datosSuspension.motivo, clienteId]);

      if (resultado.affectedRows === 0) {
        throw new Error('No se encontró servicio activo para suspender');
      }

      return {
        cliente_id: clienteId,
        estado: 'suspendido',
        fecha_suspension: datosSuspension.fecha_suspension,
        motivo: datosSuspension.motivo
      };
    });
  }

  /**
   * Reactivar servicio de un cliente
   */
  static async reactivarServicio(clienteId, datosReactivacion) {
    return await Database.transaction(async (conexion) => {
      // Actualizar estado del servicio
      const [resultado] = await conexion.execute(`
        UPDATE servicios_cliente 
        SET estado = 'activo', 
            observaciones = CONCAT(IFNULL(observaciones, ''), '\nReactivado: ', ?)
        WHERE cliente_id = ? AND estado = 'suspendido'
      `, [datosReactivacion.observaciones || 'Reactivación manual', clienteId]);

      if (resultado.affectedRows === 0) {
        throw new Error('No se encontró servicio suspendido para reactivar');
      }

      return {
        cliente_id: clienteId,
        estado: 'activo',
        fecha_reactivacion: datosReactivacion.fecha_reactivacion,
        observaciones: datosReactivacion.observaciones
      };
    });
  }

  /**
   * Generar contrato para cliente existente
   */
  static async generarContrato(clienteId, tipoContrato = 'servicio') {
    return await Database.transaction(async (conexion) => {
      const numeroContrato = await this.generarNumeroContrato(conexion);
      
      try {
        const query = `
          INSERT INTO contratos (
            cliente_id, numero_contrato, tipo_contrato,
            fecha_generacion, estado, generado_automaticamente
          ) VALUES (?, ?, ?, NOW(), 'activo', 0)
        `;

        await conexion.execute(query, [clienteId, numeroContrato, tipoContrato]);
      } catch (error) {
        console.warn('⚠️ Error creando contrato en BD:', error.message);
      }

      return {
        numero: numeroContrato,
        tipo: tipoContrato,
        fecha_generacion: new Date()
      };
    });
  }

  /**
   * Generar orden de instalación para cliente existente
   */
  static async generarOrdenInstalacion(clienteId, fechaInstalacion = null) {
    return await Database.transaction(async (conexion) => {
      const numeroOrden = await this.generarNumeroOrdenInstalacion(conexion);
      
      // Obtener servicio activo del cliente
      const [servicios] = await conexion.execute(`
        SELECT id FROM servicios_cliente 
        WHERE cliente_id = ? AND estado = 'activo'
        ORDER BY created_at DESC LIMIT 1
      `, [clienteId]);

      if (servicios.length === 0) {
        throw new Error('Cliente no tiene servicios activos');
      }

      const servicioId = servicios[0].id;
      const fechaProgramada = fechaInstalacion || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      try {
        const query = `
          INSERT INTO instalaciones (
            cliente_id, servicio_cliente_id, numero_orden, estado,
            fecha_creacion, fecha_programada, prioridad
          ) VALUES (?, ?, ?, 'pendiente', NOW(), ?, 'normal')
        `;

        await conexion.execute(query, [clienteId, servicioId, numeroOrden, fechaProgramada]);
      } catch (error) {
        console.warn('⚠️ Error creando orden de instalación:', error.message);
      }

      return {
        numero: numeroOrden,
        estado: 'pendiente',
        fecha_programada: fechaProgramada
      };
    });
  }

  /**
   * Generar factura inmediata para un cliente
   */
  static async generarFacturaInmediata(clienteId, conceptosAdicionales = []) {
    return await Database.transaction(async (conexion) => {
      // Obtener datos del cliente y servicio
      const [clientes] = await conexion.execute(`
        SELECT c.*, sc.precio_personalizado, ps.nombre as plan_nombre, ps.precio as plan_precio
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
      const numeroFactura = await this.generarNumeroFactura(conexion);
      
      let subtotal = parseFloat(cliente.precio_personalizado || cliente.plan_precio);
      
      // Agregar conceptos adicionales
      for (const concepto of conceptosAdicionales) {
        subtotal += parseFloat(concepto.valor || 0);
      }

      const impuestos = 0; // Calcular según configuración
      const total = subtotal + impuestos;

      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      // Crear factura
      const queryFactura = `
        INSERT INTO facturas (
          cliente_id, numero_factura, fecha_emision, fecha_vencimiento,
          subtotal, impuestos, total, estado, observaciones,
          generada_automaticamente, created_at
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, 'pendiente', 'Factura inmediata', 0, NOW())
      `;

      const [resultadoFactura] = await conexion.execute(queryFactura, [
        clienteId, numeroFactura, fechaVencimiento, subtotal, impuestos, total
      ]);

      const facturaId = resultadoFactura.insertId;

      // Crear detalle principal
      try {
        await conexion.execute(`
          INSERT INTO detalle_facturas (
            factura_id, concepto_id, descripcion, cantidad,
            precio_unitario, subtotal
          ) VALUES (?, 1, ?, 1, ?, ?)
        `, [facturaId, `Plan ${cliente.plan_nombre}`, cliente.precio_personalizado || cliente.plan_precio, cliente.precio_personalizado || cliente.plan_precio]);

        // Crear detalles adicionales
        for (const concepto of conceptosAdicionales) {
          await conexion.execute(`
            INSERT INTO detalle_facturas (
              factura_id, concepto_id, descripcion, cantidad,
              precio_unitario, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            facturaId, 
            concepto.concepto_id || 2, 
            concepto.descripcion, 
            concepto.cantidad || 1,
            concepto.valor,
            concepto.valor * (concepto.cantidad || 1)
          ]);
        }
      } catch (error) {
        console.warn('⚠️ Error creando detalles de factura:', error.message);
      }

      return {
        numero_factura: numeroFactura,
        total: total,
        fecha_vencimiento: fechaVencimiento,
        estado: 'pendiente'
      };
    });
  }
  /**
   * Obtener facturas generadas desde cliente completo
   */
static async obtenerFacturasGeneradas(filtros = {}) {
    const conexion = await pool.getConnection();
    
    try {
      const { page = 1, limit = 10, estado, cliente_id } = filtros;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE f.generada_automaticamente = 1';
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
          c.email as cliente_email,
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
          ORDER BY fecha_pago DESC
        `, [facturaId]);
        
        factura.pagos = pagos;
      } catch (error) {
        console.warn('⚠️ Tabla pagos no existe o error consultando:', error.message);
        factura.pagos = [];
      }

      return factura;

    } finally {
      conexion.release();
    }
  }

  /**
   * Obtener contratos generados
   */
  static async obtenerContratosGenerados(filtros = {}) {
    const conexion = await pool.getConnection();
    
    try {
      const { page = 1, limit = 10, cliente_id } = filtros;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      let params = [];

      if (cliente_id) {
        whereClause += ' AND c.cliente_id = ?';
        params.push(parseInt(cliente_id));
      }

      // Intentar consultar contratos (puede que la tabla no exista)
      try {
        const query = `
          SELECT 
            c.*,
            cl.nombre as cliente_nombre,
            cl.identificacion as cliente_identificacion,
            COUNT(*) OVER() as total_registros
          FROM contratos c
          JOIN clientes cl ON c.cliente_id = cl.id
          ${whereClause}
          ORDER BY c.fecha_generacion DESC
          LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);

        const [contratos] = await conexion.execute(query, params);
        const totalRegistros = contratos.length > 0 ? contratos[0].total_registros : 0;

        return {
          contratos: contratos.map(c => {
            const { total_registros, ...contratoLimpio } = c;
            return contratoLimpio;
          }),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(totalRegistros),
            totalPages: Math.ceil(totalRegistros / limit)
          }
        };

      } catch (error) {
        console.warn('⚠️ Tabla contratos no existe:', error.message);
        return {
          contratos: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
          }
        };
      }

    } finally {
      conexion.release();
    }
  }
  /**
   * Previsualizar primera factura
   */
  static async previsualizarPrimeraFactura(datos) {
    const conexion = await pool.getConnection();
    
    try {
      // Obtener datos del plan
      const [planes] = await conexion.execute(
        'SELECT * FROM planes_servicio WHERE id = ?',
        [datos.servicio.plan_id]
      );

      if (planes.length === 0) {
        throw new Error('Plan de servicio no encontrado');
      }

      const plan = planes[0];
      const precio = datos.servicio.precio_personalizado || plan.precio;
      
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      return {
        cliente: {
          nombre: datos.cliente.nombre,
          identificacion: datos.cliente.identificacion,
          email: datos.cliente.email
        },
        servicio: {
          plan_nombre: plan.nombre,
          precio: precio,
          descripcion: plan.descripcion
        },
        factura: {
          subtotal: precio,
          impuestos: 0,
          total: precio,
          fecha_vencimiento: fechaVencimiento
        }
      };

    } finally {
      conexion.release();
    }
  }
}



module.exports = ClienteCompletoService;