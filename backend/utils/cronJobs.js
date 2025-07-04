// backend/utils/cronJobs.js - TAREAS PROGRAMADAS PARA FACTURACIÓN AUTOMÁTICA
const cron = require('node-cron');
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

class CronJobs {

  /**
   * Inicializar todas las tareas programadas
   */
  static inicializar() {
    console.log('🕐 Inicializando tareas programadas...');

    // Facturación mensual automática - cada día 1 del mes a las 06:00
    this.facturacionMensual();
    
    // Procesamiento de intereses - diario a las 02:00
    this.procesamientoIntereses();
    
    // Actualización de estados - diario a las 01:00
    this.actualizacionEstados();
    
    // Corte de servicios por mora - diario a las 03:00
    this.corteServicios();
    
    // Limpieza de logs antiguos - semanal los domingos a las 04:00
    this.limpiezaLogs();

    console.log('✅ Todas las tareas programadas configuradas');
  }

  /**
   * Facturación mensual automática
   * Se ejecuta el día 1 de cada mes a las 06:00 AM
   */
  static facturacionMensual() {
    // Cron: minuto(0) hora(6) día(1) mes(*) día_semana(*)
    cron.schedule('0 6 1 * *', async () => {
      try {
        console.log('🔄 INICIANDO FACTURACIÓN MENSUAL AUTOMÁTICA...');
        console.log(`📅 Fecha: ${new Date().toISOString()}`);
        
        const resultado = await FacturacionAutomaticaService.generarFacturacionMensual();
        
        console.log('📊 RESULTADO FACTURACIÓN MENSUAL:');
        console.log(`   ✅ Exitosas: ${resultado.exitosas}`);
        console.log(`   ❌ Fallidas: ${resultado.fallidas}`);
        
        if (resultado.errores.length > 0) {
          console.log('🚨 ERRORES ENCONTRADOS:');
          resultado.errores.forEach((error, index) => {
            console.log(`   ${index + 1}. Cliente ${error.cliente_id} (${error.nombre}): ${error.error}`);
          });
        }

        // Registrar en logs del sistema
        await this.registrarLogSistema('FACTURACION_MENSUAL', {
          exitosas: resultado.exitosas,
          fallidas: resultado.fallidas,
          errores_count: resultado.errores.length
        });

        // Enviar notificación por email a administradores (opcional)
        // await this.enviarNotificacionAdmin('Facturación Mensual Completada', resultado);

      } catch (error) {
        console.error('❌ ERROR EN FACTURACIÓN MENSUAL AUTOMÁTICA:', error);
        
        await this.registrarLogSistema('FACTURACION_MENSUAL_ERROR', {
          error: error.message,
          stack: error.stack
        });
      }
    }, {
      timezone: 'America/Bogota' // Zona horaria de Colombia
    });

    console.log('📅 Tarea programada: Facturación mensual (día 1 de cada mes a las 06:00)');
  }

  /**
   * Procesamiento diario de intereses y saldos
   * Se ejecuta todos los días a las 02:00 AM
   */
  static procesamientoIntereses() {
    // Cron: minuto(0) hora(2) día(*) mes(*) día_semana(*)
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('💰 INICIANDO PROCESAMIENTO DE INTERESES...');
        
        await FacturacionAutomaticaService.procesarSaldosEIntereses();
        
        console.log('✅ Procesamiento de intereses completado');
        
        await this.registrarLogSistema('PROCESAMIENTO_INTERESES', {
          fecha_procesamiento: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ ERROR EN PROCESAMIENTO DE INTERESES:', error);
        
        await this.registrarLogSistema('PROCESAMIENTO_INTERESES_ERROR', {
          error: error.message
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('💰 Tarea programada: Procesamiento de intereses (diario a las 02:00)');
  }

  /**
   * Actualización de estados de facturas
   * Se ejecuta todos los días a las 01:00 AM
   */
  static actualizacionEstados() {
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('🔄 ACTUALIZANDO ESTADOS DE FACTURAS...');
        
        // Marcar facturas como vencidas
        const resultadoVencidas = await Database.query(`
          UPDATE facturas 
          SET estado = 'vencida', updated_at = NOW()
          WHERE estado = 'pendiente' 
          AND fecha_vencimiento < CURDATE()
          AND activo = '1'
        `);

        const facturasVencidas = resultadoVencidas.affectedRows || 0;

        // Actualizar estados de servicios por mora prolongada
        const config = await Database.query('SELECT dias_mora_corte FROM configuracion_empresa WHERE id = 1');
        const diasCorte = config[0]?.dias_mora_corte || 30;

        const resultadoServicios = await Database.query(`
          UPDATE servicios_cliente sc
          JOIN clientes c ON sc.cliente_id = c.id
          JOIN facturas f ON c.id = f.cliente_id
          SET sc.estado = 'suspendido'
          WHERE f.estado IN ('pendiente', 'vencida')
          AND DATEDIFF(CURDATE(), f.fecha_vencimiento) >= ?
          AND sc.estado = 'activo'
          AND sc.activo = 1
          AND f.activo = '1'
        `, [diasCorte]);

        const serviciosSuspendidos = resultadoServicios.affectedRows || 0;

        console.log(`📊 Estados actualizados:`);
        console.log(`   📄 Facturas marcadas como vencidas: ${facturasVencidas}`);
        console.log(`   📡 Servicios suspendidos por mora: ${serviciosSuspendidos}`);

        await this.registrarLogSistema('ACTUALIZACION_ESTADOS', {
          facturas_vencidas: facturasVencidas,
          servicios_suspendidos: serviciosSuspendidos
        });

      } catch (error) {
        console.error('❌ ERROR ACTUALIZANDO ESTADOS:', error);
        
        await this.registrarLogSistema('ACTUALIZACION_ESTADOS_ERROR', {
          error: error.message
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('🔄 Tarea programada: Actualización de estados (diario a las 01:00)');
  }

  /**
   * Corte de servicios por mora prolongada
   * Se ejecuta todos los días a las 03:00 AM
   */
  static corteServicios() {
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('✂️ VERIFICANDO CORTES DE SERVICIO...');
        
        const config = await Database.query('SELECT dias_mora_corte FROM configuracion_empresa WHERE id = 1');
        const diasCorte = config[0]?.dias_mora_corte || 30;

        // Obtener clientes con mora superior al límite configurado
        const clientesParaCorte = await Database.query(`
          SELECT DISTINCT 
            c.id, 
            c.nombre, 
            c.identificacion,
            COUNT(f.id) as facturas_vencidas,
            SUM(f.total) as total_deuda,
            MAX(DATEDIFF(CURDATE(), f.fecha_vencimiento)) as dias_mora_maxima
          FROM clientes c
          JOIN facturas f ON c.id = f.cliente_id
          JOIN servicios_cliente sc ON c.id = sc.cliente_id
          WHERE f.estado IN ('pendiente', 'vencida')
          AND DATEDIFF(CURDATE(), f.fecha_vencimiento) >= ?
          AND sc.estado IN ('activo', 'suspendido')
          AND sc.activo = 1
          AND f.activo = '1'
          GROUP BY c.id
          HAVING total_deuda > 0
        `, [diasCorte]);

        let serviciosCortados = 0;

        for (const cliente of clientesParaCorte) {
          // Cortar servicios del cliente
          await Database.query(
            'UPDATE servicios_cliente SET estado = "cortado", updated_at = NOW() WHERE cliente_id = ? AND activo = 1',
            [cliente.id]
          );

          serviciosCortados++;

          console.log(`✂️ Servicio cortado: ${cliente.nombre} (${cliente.identificacion}) - Mora: ${cliente.dias_mora_maxima} días - Deuda: $${cliente.total_deuda}`);

          // Opcional: Crear registro de corte
          await Database.query(`
            INSERT INTO cortes_servicio (cliente_id, motivo, dias_mora, valor_deuda, fecha_corte, created_at)
            VALUES (?, 'MORA_AUTOMATICA', ?, ?, CURDATE(), NOW())
          `, [cliente.id, cliente.dias_mora_maxima, cliente.total_deuda]);
        }

        console.log(`✂️ Total servicios cortados: ${serviciosCortados}`);

        await this.registrarLogSistema('CORTE_SERVICIOS', {
          clientes_procesados: clientesParaCorte.length,
          servicios_cortados: serviciosCortados,
          dias_mora_limite: diasCorte
        });

      } catch (error) {
        console.error('❌ ERROR EN CORTE DE SERVICIOS:', error);
        
        await this.registrarLogSistema('CORTE_SERVICIOS_ERROR', {
          error: error.message
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('✂️ Tarea programada: Corte de servicios (diario a las 03:00)');
  }

  /**
   * Limpieza de logs antiguos
   * Se ejecuta los domingos a las 04:00 AM
   */
  static limpiezaLogs() {
    // Cron: minuto(0) hora(4) día(*) mes(*) día_semana(0=domingo)
    cron.schedule('0 4 * * 0', async () => {
      try {
        console.log('🧹 INICIANDO LIMPIEZA DE LOGS...');
        
        // Eliminar logs del sistema mayores a 90 días
        const resultadoLogs = await Database.query(`
          DELETE FROM logs_sistema 
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `);

        // Eliminar historial de inventario mayor a 1 año
        const resultadoInventario = await Database.query(`
          DELETE FROM inventario_historial 
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        `);

        // Archivar facturas anuladas muy antiguas (opcional)
        const resultadoFacturas = await Database.query(`
          UPDATE facturas 
          SET activo = '0' 
          WHERE estado = 'anulada' 
          AND created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
          AND activo = '1'
        `);

        console.log(`🧹 Limpieza completada:`);
        console.log(`   📝 Logs eliminados: ${resultadoLogs.affectedRows || 0}`);
        console.log(`   📦 Historial inventario eliminado: ${resultadoInventario.affectedRows || 0}`);
        console.log(`   📄 Facturas archivadas: ${resultadoFacturas.affectedRows || 0}`);

        await this.registrarLogSistema('LIMPIEZA_DATOS', {
          logs_eliminados: resultadoLogs.affectedRows || 0,
          inventario_eliminado: resultadoInventario.affectedRows || 0,
          facturas_archivadas: resultadoFacturas.affectedRows || 0
        });

      } catch (error) {
        console.error('❌ ERROR EN LIMPIEZA DE LOGS:', error);
        
        await this.registrarLogSistema('LIMPIEZA_DATOS_ERROR', {
          error: error.message
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('🧹 Tarea programada: Limpieza de logs (domingos a las 04:00)');
  }

  /**
   * Registrar eventos en logs del sistema
   */
  static async registrarLogSistema(tipo, datos) {
    try {
      await Database.query(`
        INSERT INTO logs_sistema (tipo, descripcion, datos_json, created_at)
        VALUES (?, ?, ?, NOW())
      `, [tipo, `Tarea automática: ${tipo}`, JSON.stringify(datos)]);
    } catch (error) {
      console.error('❌ Error registrando log del sistema:', error);
    }
  }

  /**
   * Enviar notificación a administradores (opcional)
   */
  static async enviarNotificacionAdmin(asunto, datos) {
    try {
      // Obtener emails de administradores
      const administradores = await Database.query(`
        SELECT email FROM sistema_usuarios 
        WHERE rol = 'administrador' 
        AND email IS NOT NULL 
        AND activo = 1
      `);

      if (administradores.length === 0) {
        console.log('⚠️ No hay administradores con email configurado');
        return;
      }

      // Aquí integrarías con tu servicio de email preferido
      // Ejemplo con nodemailer, SendGrid, etc.
      
      console.log(`📧 Notificación enviada a ${administradores.length} administradores: ${asunto}`);

    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
    }
  }

  /**
   * Tarea manual para facturación específica de un cliente
   */
  static async facturarClienteEspecifico(clienteId, fechaInicio = null) {
    try {
      console.log(`🧾 Facturando cliente específico ${clienteId}...`);
      
      const factura = await FacturacionAutomaticaService.crearFacturaInicialCliente(
        clienteId,
        fechaInicio || new Date()
      );

      console.log(`✅ Factura creada: ${factura.numero_factura}`);
      return factura;

    } catch (error) {
      console.error(`❌ Error facturando cliente ${clienteId}:`, error);
      throw error;
    }
  }

  /**
   * Verificar estado del sistema de facturación
   */
  static async verificarSaludSistema() {
    try {
      console.log('🔍 Verificando salud del sistema de facturación...');

      const verificaciones = {
        base_datos: false,
        configuracion_empresa: false,
        clientes_activos: 0,
        servicios_activos: 0,
        facturas_pendientes: 0,
        espacio_disco: 'N/A'
      };

      // Verificar conexión a base de datos
      try {
        await Database.query('SELECT 1');
        verificaciones.base_datos = true;
      } catch (error) {
        console.error('❌ Error de conexión a base de datos');
      }

      // Verificar configuración de empresa
      try {
        const config = await Database.query('SELECT * FROM configuracion_empresa WHERE id = 1');
        verificaciones.configuracion_empresa = config.length > 0;
      } catch (error) {
        console.error('❌ Error verificando configuración de empresa');
      }

      // Contar registros importantes
      try {
        const stats = await Database.query(`
          SELECT 
            (SELECT COUNT(*) FROM clientes WHERE activo = 1) as clientes_activos,
            (SELECT COUNT(*) FROM servicios_cliente WHERE activo = 1 AND estado = 'activo') as servicios_activos,
            (SELECT COUNT(*) FROM facturas WHERE estado = 'pendiente' AND activo = '1') as facturas_pendientes
        `);

        if (stats[0]) {
          verificaciones.clientes_activos = stats[0].clientes_activos;
          verificaciones.servicios_activos = stats[0].servicios_activos;
          verificaciones.facturas_pendientes = stats[0].facturas_pendientes;
        }
      } catch (error) {
        console.error('❌ Error obteniendo estadísticas');
      }

      console.log('📊 Estado del sistema:', verificaciones);

      await this.registrarLogSistema('VERIFICACION_SALUD', verificaciones);

      return verificaciones;

    } catch (error) {
      console.error('❌ Error verificando salud del sistema:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de rendimiento de facturación
   */
  static async generarReporteRendimiento() {
    try {
      console.log('📊 Generando reporte de rendimiento...');

      const hoy = new Date();
      const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));

      const reporte = await Database.query(`
        SELECT 
          DATE(created_at) as fecha,
          COUNT(*) as facturas_creadas,
          SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as facturas_pagadas,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as facturas_pendientes,
          SUM(CASE WHEN estado = 'anulada' THEN 1 ELSE 0 END) as facturas_anuladas,
          AVG(total) as promedio_factura,
          SUM(total) as total_facturado
        FROM facturas 
        WHERE created_at >= ? AND activo = '1'
        GROUP BY DATE(created_at)
        ORDER BY fecha DESC
        LIMIT 30
      `, [hace30Dias.toISOString().split('T')[0]]);

      console.log(`📈 Reporte generado con ${reporte.length} días de datos`);

      await this.registrarLogSistema('REPORTE_RENDIMIENTO', {
        dias_procesados: reporte.length,
        fecha_inicio: hace30Dias.toISOString().split('T')[0],
        fecha_fin: hoy.toISOString().split('T')[0]
      });

      return reporte;

    } catch (error) {
      console.error('❌ Error generando reporte de rendimiento:', error);
      throw error;
    }
  }

  /**
   * Detener todas las tareas programadas
   */
  static detenerTareas() {
    cron.getTasks().forEach(task => {
      task.stop();
    });
    console.log('🛑 Todas las tareas programadas han sido detenidas');
  }

  /**
   * Obtener estado de las tareas programadas
   */
  static obtenerEstadoTareas() {
    const tareas = cron.getTasks();
    const estado = {
      total_tareas: tareas.size,
      tareas_activas: 0,
      ultima_verificacion: new Date().toISOString()
    };

    tareas.forEach(task => {
      if (task.running) {
        estado.tareas_activas++;
      }
    });

    return estado;
  }
}

module.exports = CronJobs;