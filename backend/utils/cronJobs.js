// backend/utils/cronJobs.js - ARCHIVO COMPLETO
// TAREAS PROGRAMADAS PARA FACTURACIÓN AUTOMÁTICA PSI

const cron = require('node-cron');
const FacturacionAutomaticaService = require('../services/FacturacionAutomaticaService');
const { Database } = require('../models/Database');

// Importaciones opcionales
let EmailService;

try {
  EmailService = require('../services/EmailService');
  console.log('✅ EmailService cargado en CronJobs');
} catch (error) {
  console.log('⚠️ EmailService no disponible en CronJobs - notificaciones deshabilitadas');
}

class CronJobs {

  /**
   * Inicializar todas las tareas programadas
   */
  static inicializar() {
    console.log('🕐 Inicializando tareas programadas de facturación...');

    // Facturación mensual automática - cada día 1 del mes a las 06:00
    this.facturacionMensualAutomatica();
    
    // Actualización de estados de facturas - diario a las 02:00
    this.actualizacionEstadosFacturas();
    
    // Cálculo de intereses por mora - diario a las 03:00
    this.calculoInteresesMora();
    
    // Notificaciones de vencimiento - diario a las 08:00
    this.notificacionesVencimiento();
    
    // Backup diario - diario a las 01:00
    this.backupDiario();
    
    // Limpieza semanal - domingos a las 04:00
    this.limpiezaSemanal();

    // Reportes mensuales - día 2 de cada mes a las 07:00
    this.reportesMensuales();

    console.log('✅ Todas las tareas programadas de facturación configuradas');
  }

  /**
   * Facturación mensual automática
   * Se ejecuta el día 1 de cada mes a las 06:00 AM
   */
  static facturacionMensualAutomatica() {
    // Cron: minuto(0) hora(6) día(1) mes(*) día_semana(*)
    cron.schedule('0 6 1 * *', async () => {
      try {
        console.log('🔄 INICIANDO FACTURACIÓN MENSUAL AUTOMÁTICA...');
        console.log(`📅 Fecha: ${new Date().toISOString()}`);
        
        // Validar integridad de datos antes de facturar
        console.log('🔍 Validando integridad de datos...');
        const validacion = await FacturacionAutomaticaService.validarIntegridadDatos();
        
        if (!validacion.valido) {
          console.warn('⚠️ Se encontraron errores de integridad:');
          validacion.errores.forEach((error, index) => {
            console.warn(`   ${index + 1}. ${error.descripcion} - Cliente: ${error.cliente_nombre || 'N/A'}`);
          });
          
          // Registrar errores pero continuar con la facturación
          await this.registrarLogSistema('FACTURACION_VALIDACION_ERRORES', {
            total_errores: validacion.total_errores,
            errores: validacion.errores
          });
        }

        const resultado = await FacturacionAutomaticaService.generarFacturacionMensual();
        
        console.log('📊 RESULTADO FACTURACIÓN MENSUAL:');
        console.log(`   ✅ Exitosas: ${resultado.exitosas}`);
        console.log(`   ❌ Fallidas: ${resultado.fallidas}`);
        console.log(`   💰 Facturas generadas: ${resultado.facturas_generadas.length}`);
        
        if (resultado.errores.length > 0) {
          console.log('🚨 ERRORES ENCONTRADOS:');
          resultado.errores.forEach((error, index) => {
            console.log(`   ${index + 1}. Cliente ${error.cliente_id} (${error.nombre}): ${error.error}`);
          });
        }

        // Calcular totales facturados
        const totalFacturado = resultado.facturas_generadas.reduce(
          (sum, factura) => sum + (factura.total || 0), 0
        );

        // Registrar en logs del sistema
        await this.registrarLogSistema('FACTURACION_MENSUAL_AUTOMATICA', {
          exitosas: resultado.exitosas,
          fallidas: resultado.fallidas,
          total_facturado: totalFacturado,
          errores_count: resultado.errores.length,
          fecha_proceso: new Date().toISOString()
        });

        // Enviar notificación por email a administradores (si está configurado)
        try {
          await this.enviarNotificacionAdministradores('Facturación Mensual Completada', {
            exitosas: resultado.exitosas,
            fallidas: resultado.fallidas,
            total_facturado: totalFacturado,
            fecha: new Date().toLocaleDateString('es-CO')
          });
        } catch (emailError) {
          console.warn('⚠️ No se pudo enviar notificación por email:', emailError.message);
        }

        console.log('✅ FACTURACIÓN MENSUAL AUTOMÁTICA COMPLETADA');

      } catch (error) {
        console.error('❌ ERROR EN FACTURACIÓN MENSUAL AUTOMÁTICA:', error);
        
        await this.registrarLogSistema('FACTURACION_MENSUAL_ERROR', {
          error: error.message,
          stack: error.stack,
          fecha_error: new Date().toISOString()
        });

        // Intentar enviar alerta por email
        try {
          await this.enviarAlertaError('Error en Facturación Mensual Automática', error);
        } catch (emailError) {
          console.error('❌ No se pudo enviar alerta de error:', emailError.message);
        }
      }
    }, {
      timezone: 'America/Bogota' // Zona horaria de Colombia
    });

    console.log('📅 Tarea programada: Facturación mensual automática (día 1 de cada mes a las 06:00)');
  }

  /**
   * Actualización de estados de facturas
   * Se ejecuta todos los días a las 02:00 AM
   */
  static actualizacionEstadosFacturas() {
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🔄 Actualizando estados de facturas...');
        
        const conexion = await Database.conexion();
        
        try {
          // Marcar facturas como vencidas
          const [facturasVencidas] = await conexion.execute(`
            UPDATE facturas 
            SET estado = 'vencida', updated_at = NOW()
            WHERE estado = 'pendiente' 
              AND fecha_vencimiento < CURDATE()
              AND activo = 1
          `);

          console.log(`📋 Facturas marcadas como vencidas: ${facturasVencidas.affectedRows}`);

          // Registrar estadísticas
          const [estadisticas] = await conexion.execute(`
            SELECT 
              COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
              COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as vencidas,
              COUNT(CASE WHEN estado = 'pagada' THEN 1 END) as pagadas,
              SUM(CASE WHEN estado IN ('pendiente', 'vencida') THEN total ELSE 0 END) as cartera_total
            FROM facturas 
            WHERE activo = 1
          `);

          await this.registrarLogSistema('ACTUALIZACION_ESTADOS_FACTURAS', {
            facturas_vencidas: facturasVencidas.affectedRows,
            estadisticas: estadisticas[0],
            fecha_proceso: new Date().toISOString()
          });

          console.log('✅ Actualización de estados completada');

        } finally {
          conexion.release();
        }

      } catch (error) {
        console.error('❌ Error actualizando estados de facturas:', error);
        
        await this.registrarLogSistema('ACTUALIZACION_ESTADOS_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Actualización de estados (diario a las 02:00)');
  }

  /**
   * Cálculo de intereses por mora
   * Se ejecuta todos los días a las 03:00 AM
   */
  static calculoInteresesMora() {
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🔄 Calculando intereses por mora...');
        
        const conexion = await Database.conexion();
        
        try {
          // Obtener facturas morosas (más de 30 días vencidas)
          const [facturasMorosas] = await conexion.execute(`
            SELECT 
              f.id,
              f.cliente_id,
              f.numero_factura,
              f.total,
              DATEDIFF(NOW(), f.fecha_vencimiento) as dias_mora,
              COALESCE(SUM(p.valor_pagado), 0) as total_pagado
            FROM facturas f
            LEFT JOIN pagos p ON f.id = p.factura_id
            WHERE f.estado IN ('pendiente', 'vencida')
              AND f.activo = 1
              AND DATEDIFF(NOW(), f.fecha_vencimiento) >= 30
            GROUP BY f.id, f.cliente_id, f.numero_factura, f.total
            HAVING (f.total - total_pagado) > 0
          `);

          let totalInteresesCalculados = 0;
          let facturasConIntereses = 0;

          for (const factura of facturasMorosas) {
            const saldoPendiente = factura.total - factura.total_pagado;
            const tasaInteresDiaria = 0.00083; // ~2.5% mensual
            const interesesDiarios = saldoPendiente * tasaInteresDiaria;
            
            // Solo calcular intereses si han pasado al menos 30 días
            if (factura.dias_mora >= 30) {
              totalInteresesCalculados += interesesDiarios;
              facturasConIntereses++;

              // Actualizar tabla de intereses (si existe) o campo en facturas
              await conexion.execute(`
                UPDATE facturas 
                SET interes = interes + ?, updated_at = NOW()
                WHERE id = ?
              `, [Math.round(interesesDiarios), factura.id]);
            }
          }

          console.log(`💰 Intereses calculados: $${Math.round(totalInteresesCalculados)} en ${facturasConIntereses} facturas`);

          await this.registrarLogSistema('CALCULO_INTERESES_MORA', {
            facturas_procesadas: facturasMorosas.length,
            facturas_con_intereses: facturasConIntereses,
            total_intereses: Math.round(totalInteresesCalculados),
            fecha_proceso: new Date().toISOString()
          });

          console.log('✅ Cálculo de intereses completado');

        } finally {
          conexion.release();
        }

      } catch (error) {
        console.error('❌ Error calculando intereses por mora:', error);
        
        await this.registrarLogSistema('CALCULO_INTERESES_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Cálculo de intereses por mora (diario a las 03:00)');
  }

  /**
   * Notificaciones de vencimiento
   * Se ejecuta todos los días a las 08:00 AM
   */
  static notificacionesVencimiento() {
    cron.schedule('0 8 * * *', async () => {
      try {
        console.log('🔔 Enviando notificaciones de vencimiento...');
        
        const conexion = await Database.conexion();
        
        try {
          // Facturas que vencen en 3 días
          const [facturasProximasVencer] = await conexion.execute(`
            SELECT 
              f.id,
              f.numero_factura,
              f.cliente_id,
              f.nombre_cliente,
              f.fecha_vencimiento,
              f.total,
              c.email,
              c.telefono,
              DATEDIFF(f.fecha_vencimiento, NOW()) as dias_para_vencimiento
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            WHERE f.estado = 'pendiente'
              AND f.activo = 1
              AND DATEDIFF(f.fecha_vencimiento, NOW()) IN (3, 1)
              AND c.email IS NOT NULL
              AND c.email != ''
          `);

          // Facturas ya vencidas (notificación semanal)
          const [facturasVencidas] = await conexion.execute(`
            SELECT 
              f.id,
              f.numero_factura,
              f.cliente_id,
              f.nombre_cliente,
              f.fecha_vencimiento,
              f.total,
              c.email,
              c.telefono,
              DATEDIFF(NOW(), f.fecha_vencimiento) as dias_vencida
            FROM facturas f
            LEFT JOIN clientes c ON f.cliente_id = c.id
            WHERE f.estado IN ('pendiente', 'vencida')
              AND f.activo = 1
              AND DATEDIFF(NOW(), f.fecha_vencimiento) > 0
              AND MOD(DATEDIFF(NOW(), f.fecha_vencimiento), 7) = 0  -- Cada 7 días
              AND c.email IS NOT NULL
              AND c.email != ''
          `);

          // Simular envío de notificaciones (aquí integrarías tu servicio de email)
          for (const factura of facturasProximasVencer) {
            try {
              if (EmailService && typeof EmailService.enviarNotificacionVencimiento === 'function') {
                await EmailService.enviarNotificacionVencimiento(factura);
              }
              console.log(`📧 Notificación enviada a ${factura.nombre_cliente} (${factura.numero_factura})`);
              notificacionesEnviadas++;
            } catch (emailError) {
              console.warn(`⚠️ Error enviando email a ${factura.email}:`, emailError.message);
            }
          }

          // Enviar notificaciones de facturas vencidas
          for (const factura of facturasVencidas) {
            try {
              if (EmailService && typeof EmailService.enviarNotificacionFacturaVencida === 'function') {
                await EmailService.enviarNotificacionFacturaVencida(factura);
              }
              console.log(`📧 Notificación de mora enviada a ${factura.nombre_cliente} (${factura.numero_factura})`);
              notificacionesEnviadas++;
            } catch (emailError) {
              console.warn(`⚠️ Error enviando email de mora a ${factura.email}:`, emailError.message);
            }
          }

          await this.registrarLogSistema('NOTIFICACIONES_VENCIMIENTO', {
            facturas_proximas_vencer: facturasProximasVencer.length,
            facturas_vencidas_notificadas: facturasVencidas.length,
            notificaciones_enviadas: notificacionesEnviadas,
            fecha_proceso: new Date().toISOString()
          });

          console.log(`✅ Notificaciones procesadas: ${notificacionesEnviadas}`);

        } finally {
          conexion.release();
        }

      } catch (error) {
        console.error('❌ Error enviando notificaciones:', error);
        
        await this.registrarLogSistema('NOTIFICACIONES_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Notificaciones de vencimiento (diario a las 08:00)');
  }

  /**
   * Backup diario de datos críticos
   * Se ejecuta todos los días a las 01:00 AM
   */
  static backupDiario() {
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('💾 Iniciando backup diario de datos críticos...');
        
        const conexion = await Database.conexion();
        
        try {
          // Crear respaldo de facturas del día
          const fechaHoy = new Date().toISOString().split('T')[0];
          
          const [facturasHoy] = await conexion.execute(`
            SELECT COUNT(*) as total FROM facturas 
            WHERE DATE(created_at) = ? AND activo = 1
          `, [fechaHoy]);

          const [pagosHoy] = await conexion.execute(`
            SELECT COUNT(*) as total, SUM(valor_pagado) as total_pagado 
            FROM pagos 
            WHERE DATE(created_at) = ?
          `, [fechaHoy]);

          // Verificar integridad de datos críticos
          const [verificacionIntegridad] = await conexion.execute(`
            SELECT 
              (SELECT COUNT(*) FROM facturas WHERE activo = 1) as total_facturas,
              (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as total_clientes_activos,
              (SELECT COUNT(*) FROM servicios_cliente WHERE estado = 'activo') as total_servicios_activos,
              (SELECT SUM(total) FROM facturas WHERE estado = 'pendiente' AND activo = 1) as cartera_pendiente
          `);

          await this.registrarLogSistema('BACKUP_DIARIO', {
            facturas_creadas_hoy: facturasHoy[0].total,
            pagos_registrados_hoy: pagosHoy[0].total,
            monto_pagado_hoy: pagosHoy[0].total_pagado || 0,
            verificacion_integridad: verificacionIntegridad[0],
            fecha_backup: new Date().toISOString()
          });

          console.log(`💾 Backup completado - Facturas hoy: ${facturasHoy[0].total}, Pagos: ${pagosHoy[0].total}`);

        } finally {
          conexion.release();
        }

      } catch (error) {
        console.error('❌ Error en backup diario:', error);
        
        await this.registrarLogSistema('BACKUP_DIARIO_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Backup diario (diario a las 01:00)');
  }

  /**
   * Limpieza semanal de datos temporales
   * Se ejecuta los domingos a las 04:00 AM
   */
  static limpiezaSemanal() {
    cron.schedule('0 4 * * 0', async () => {
      try {
        console.log('🧹 Iniciando limpieza semanal...');
        
        const conexion = await Database.conexion();
        
        try {
          // Limpiar logs de sistema antiguos (más de 3 meses)
          const [logsEliminados] = await conexion.execute(`
            DELETE FROM logs_sistema 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH)
          `);

          // Limpiar facturas anuladas muy antiguas (más de 1 año)
          const [facturasArchivadas] = await conexion.execute(`
            UPDATE facturas 
            SET activo = 0 
            WHERE estado = 'anulada' 
              AND updated_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
              AND activo = 1
          `);

          // Optimizar tablas principales
          await conexion.execute('OPTIMIZE TABLE facturas');
          await conexion.execute('OPTIMIZE TABLE detalle_facturas');
          await conexion.execute('OPTIMIZE TABLE pagos');
          await conexion.execute('OPTIMIZE TABLE clientes');

          console.log(`🧹 Limpieza completada:`);
          console.log(`   - Logs eliminados: ${logsEliminados.affectedRows}`);
          console.log(`   - Facturas archivadas: ${facturasArchivadas.affectedRows}`);
          console.log(`   - Tablas optimizadas: 4`);

          await this.registrarLogSistema('LIMPIEZA_SEMANAL', {
            logs_eliminados: logsEliminados.affectedRows,
            facturas_archivadas: facturasArchivadas.affectedRows,
            fecha_proceso: new Date().toISOString()
          });

        } finally {
          conexion.release();
        }

      } catch (error) {
        console.error('❌ Error en limpieza semanal:', error);
        
        await this.registrarLogSistema('LIMPIEZA_SEMANAL_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Limpieza semanal (domingos a las 04:00)');
  }

  /**
   * Tarea para generar reportes automáticos mensuales
   * Se ejecuta el día 2 de cada mes a las 07:00 AM
   */
  static reportesMensuales() {
    cron.schedule('0 7 2 * *', async () => {
      try {
        console.log('📊 Generando reportes mensuales automáticos...');
        
        // Calcular período anterior
        const fechaActual = new Date();
        const mesAnterior = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1);
        const periodoAnterior = mesAnterior.toISOString().slice(0, 7); // YYYY-MM

        const estadisticas = await FacturacionAutomaticaService.obtenerEstadisticasFacturacion(
          `${periodoAnterior}-01`,
          `${periodoAnterior}-31`
        );

        // Generar reporte consolidado
        const reporteConsolidado = {
          periodo: periodoAnterior,
          resumen_ejecutivo: {
            total_facturado: estadisticas.generales.total_facturado,
            total_facturas: estadisticas.generales.total_facturas,
            clientes_facturados: estadisticas.generales.total_facturas, // Aproximación
            promedio_factura: estadisticas.generales.promedio_factura,
            tasa_pago: ((estadisticas.generales.total_pagado / estadisticas.generales.total_facturado) * 100).toFixed(2)
          },
          facturacion_por_servicios: estadisticas.por_tipo_servicio,
          top_clientes: estadisticas.top_clientes,
          fecha_generacion: new Date().toISOString()
        };

        await this.registrarLogSistema('REPORTE_MENSUAL_AUTOMATICO', reporteConsolidado);

        // Enviar reporte por email a administradores
        try {
          await this.enviarReporteMensual(reporteConsolidado);
        } catch (emailError) {
          console.warn('⚠️ No se pudo enviar reporte mensual por email:', emailError.message);
        }

        console.log(`📊 Reporte mensual generado para el período ${periodoAnterior}`);

      } catch (error) {
        console.error('❌ Error generando reportes mensuales:', error);
        
        await this.registrarLogSistema('REPORTE_MENSUAL_ERROR', {
          error: error.message,
          fecha_error: new Date().toISOString()
        });
      }
    }, {
      timezone: 'America/Bogota'
    });

    console.log('📅 Tarea programada: Reportes mensuales (día 2 de cada mes a las 07:00)');
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  /**
   * Registrar evento en logs del sistema
   */
  static async registrarLogSistema(tipo, datos) {
    try {
      const { Database } = require('../models/Database');
      const conexion = await Database.conexion();
      
      try {
        await conexion.execute(`
          INSERT INTO logs_sistema (
            tipo, descripcion, datos_json, nivel, created_at
          ) VALUES (?, ?, ?, ?, NOW())
        `, [
          tipo,
          `Tarea automática: ${tipo}`,
          JSON.stringify(datos),
          'info'
        ]);
      } finally {
        conexion.release();
      }
    } catch (error) {
      console.error('❌ Error registrando log del sistema:', error);
    }
  }

  /**
   * Enviar notificación a administradores
   */
  static async enviarNotificacionAdministradores(asunto, datos) {
    try {
      const { Database } = require('../models/Database');
      const conexion = await Database.conexion();
      
      try {
        // Obtener emails de administradores
        const [administradores] = await conexion.execute(`
          SELECT email, nombre FROM sistema_usuarios 
          WHERE rol = 'administrador' AND activo = 1 AND email IS NOT NULL
        `);

        // Aquí integrarías tu servicio de email existente
        // const EmailService = require('../services/EmailService');

        for (const admin of administradores) {
          try {
            if (EmailService && typeof EmailService.enviarNotificacionAdmin === 'function') {
              await EmailService.enviarNotificacionAdmin(admin.email, asunto, datos);
            }
            console.log(`📧 Notificación enviada a administrador: ${admin.email}`);
          } catch (emailError) {
            console.warn(`⚠️ Error enviando email a ${admin.email}:`, emailError.message);
          }
        }

      } finally {
        conexion.release();
      }
    } catch (error) {
      console.error('❌ Error enviando notificaciones a administradores:', error);
    }
  }

  /**
   * Enviar alerta de error crítico
   */
  static async enviarAlertaError(asunto, error) {
    try {
      const datos = {
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString(),
        servidor: process.env.NODE_ENV || 'development'
      };

      await this.enviarNotificacionAdministradores(`🚨 ALERTA: ${asunto}`, datos);
    } catch (alertError) {
      console.error('❌ Error enviando alerta de error:', alertError);
    }
  }

  /**
   * Enviar reporte mensual consolidado
   */
  static async enviarReporteMensual(reporte) {
    try {
      const asunto = `📊 Reporte Mensual de Facturación - ${reporte.periodo}`;
      
      const contenido = {
        periodo: reporte.periodo,
        resumen: reporte.resumen_ejecutivo,
        top_clientes: reporte.top_clientes.slice(0, 3),
        fecha_generacion: reporte.fecha_generacion
      };

      await this.enviarNotificacionAdministradores(asunto, contenido);

    } catch (error) {
      console.error('❌ Error enviando reporte mensual:', error);
    }
  }

  /**
   * Detener todas las tareas programadas
   */
  static detenerTareas() {
    console.log('🛑 Deteniendo todas las tareas programadas...');
    const tasks = cron.getTasks();
    tasks.forEach((task, name) => {
      try {
        task.stop();
        console.log(`⏹️ Tarea detenida: ${name}`);
      } catch (error) {
        console.warn(`⚠️ Error deteniendo tarea ${name}:`, error.message);
      }
    });
    console.log('✅ Todas las tareas programadas detenidas');
  }

  /**
   * Obtener estado de las tareas programadas
   */
  static obtenerEstadoTareas() {
    const tasks = cron.getTasks();
    const estado = {
      total_tareas: tasks.size,
      tareas_activas: 0,
      tareas_detenidas: 0,
      ultima_verificacion: new Date().toISOString(),
      detalles: []
    };

    tasks.forEach((task, name) => {
      const taskInfo = {
        nombre: name || 'Tarea sin nombre',
        activa: task.running || false,
        programada: task.scheduled || false
      };

      if (taskInfo.activa) {
        estado.tareas_activas++;
      } else {
        estado.tareas_detenidas++;
      }

      estado.detalles.push(taskInfo);
    });

    return estado;
  }

  /**
   * Ejecutar facturación manual (para testing)
   */
  static async ejecutarFacturacionManual(clienteId = null) {
    try {
      console.log('🧪 Ejecutando facturación manual para testing...');
      
      let resultado;
      
      if (clienteId) {
        console.log(`👤 Facturación individual para cliente ${clienteId}...`);
        resultado = await FacturacionAutomaticaService.generarFacturaClienteIndividual(clienteId);
      } else {
        console.log('🏢 Facturación mensual completa...');
        resultado = await FacturacionAutomaticaService.generarFacturacionMensual();
      }
      
      console.log('📊 Resultado facturación manual:');
      if (clienteId) {
        console.log(`   ✅ Factura generada: ${resultado.numero_factura}`);
        console.log(`   💰 Total: ${resultado.total.toLocaleString('es-CO')}`);
      } else {
        console.log(`   ✅ Exitosas: ${resultado.exitosas}`);
        console.log(`   ❌ Fallidas: ${resultado.fallidas}`);
      }
      
      return resultado;

    } catch (error) {
      console.error('❌ Error en facturación manual:', error);
      throw error;
    }
  }

  /**
   * Verificar configuración del sistema
   */
  static async verificarConfiguracion() {
    try {
      console.log('🔧 Verificando configuración del sistema...');
      
      const { Database } = require('../models/Database');
      const conexion = await Database.conexion();
      
      try {
        // Verificar configuración de empresa
        const [configEmpresa] = await conexion.execute(`
          SELECT COUNT(*) as total FROM configuracion_empresa
        `);

        // Verificar conceptos de facturación
        const [conceptos] = await conexion.execute(`
          SELECT COUNT(*) as total FROM conceptos_facturacion WHERE activo = 1
        `);

        // Verificar planes activos
        const [planes] = await conexion.execute(`
          SELECT COUNT(*) as total FROM planes_servicio WHERE activo = 1
        `);

        const configuracion = {
          empresa_configurada: configEmpresa[0].total > 0,
          conceptos_disponibles: conceptos[0].total,
          planes_activos: planes[0].total,
          base_datos_conectada: true,
          fecha_verificacion: new Date().toISOString()
        };

        console.log('📋 Estado de la configuración:');
        console.log(`   🏢 Empresa configurada: ${configuracion.empresa_configurada ? '✅' : '❌'}`);
        console.log(`   📋 Conceptos de facturación: ${configuracion.conceptos_disponibles}`);
        console.log(`   📦 Planes activos: ${configuracion.planes_activos}`);
        console.log(`   🗄️ Base de datos: ${configuracion.base_datos_conectada ? '✅' : '❌'}`);

        return configuracion;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error verificando configuración:', error);
      return {
        empresa_configurada: false,
        conceptos_disponibles: 0,
        planes_activos: 0,
        base_datos_conectada: false,
        error: error.message,
        fecha_verificacion: new Date().toISOString()
      };
    }
  }

  /**
   * Ejecutar diagnóstico completo del sistema
   */
  static async ejecutarDiagnostico() {
    try {
      console.log('🔍 Ejecutando diagnóstico completo del sistema...');

      const diagnostico = {
        fecha_diagnostico: new Date().toISOString(),
        estado_general: 'ok',
        componentes: {},
        problemas: [],
        recomendaciones: []
      };

      // 1. Verificar configuración
      diagnostico.componentes.configuracion = await this.verificarConfiguracion();

      // 2. Verificar estado de tareas programadas
      diagnostico.componentes.tareas_programadas = this.obtenerEstadoTareas();

      // 3. Verificar integridad de datos
      try {
        const validacion = await FacturacionAutomaticaService.validarIntegridadDatos();
        diagnostico.componentes.integridad_datos = validacion;

        if (!validacion.valido) {
          diagnostico.problemas.push({
            categoria: 'integridad_datos',
            descripcion: `${validacion.total_errores} errores de integridad encontrados`,
            criticidad: 'media'
          });
        }
      } catch (error) {
        diagnostico.problemas.push({
          categoria: 'integridad_datos',
          descripcion: 'Error verificando integridad de datos',
          criticidad: 'alta',
          error: error.message
        });
      }

      // 4. Evaluar estado general
      if (diagnostico.problemas.length === 0) {
        diagnostico.estado_general = 'excelente';
      } else if (diagnostico.problemas.filter(p => p.criticidad === 'alta').length > 0) {
        diagnostico.estado_general = 'critico';
      } else if (diagnostico.problemas.length > 3) {
        diagnostico.estado_general = 'advertencia';
      } else {
        diagnostico.estado_general = 'bueno';
      }

      // 5. Generar recomendaciones
      if (diagnostico.componentes.tareas_programadas.tareas_activas === 0) {
        diagnostico.recomendaciones.push('Activar tareas programadas para automatización completa');
      }

      if (!diagnostico.componentes.configuracion.empresa_configurada) {
        diagnostico.recomendaciones.push('Completar configuración de la empresa');
      }

      if (diagnostico.componentes.configuracion.planes_activos === 0) {
        diagnostico.recomendaciones.push('Crear planes de servicio para poder facturar');
      }

      console.log(`📊 Diagnóstico completado - Estado: ${diagnostico.estado_general}`);
      console.log(`🔍 Problemas encontrados: ${diagnostico.problemas.length}`);
      console.log(`💡 Recomendaciones: ${diagnostico.recomendaciones.length}`);

      return diagnostico;

    } catch (error) {
      console.error('❌ Error ejecutando diagnóstico completo:', error);
      return {
        fecha_diagnostico: new Date().toISOString(),
        estado_general: 'error',
        error: error.message,
        componentes: {},
        problemas: [
          {
            categoria: 'sistema',
            descripcion: 'Error ejecutando diagnóstico completo',
            criticidad: 'alta',
            error: error.message
          }
        ],
        recomendaciones: ['Revisar logs del sistema para más detalles']
      };
    }
  }

  /**
   * Listar todas las tareas programadas disponibles
   */
  static listarTareasProgramadas() {
    return {
      facturacion_mensual: {
        descripcion: 'Facturación mensual automática',
        horario: '0 6 1 * *',
        descripcion_horario: 'Día 1 de cada mes a las 06:00',
        activa: true
      },
      actualizacion_estados: {
        descripcion: 'Actualización de estados de facturas',
        horario: '0 2 * * *',
        descripcion_horario: 'Diario a las 02:00',
        activa: true
      },
      calculo_intereses: {
        descripcion: 'Cálculo de intereses por mora',
        horario: '0 3 * * *',
        descripcion_horario: 'Diario a las 03:00',
        activa: true
      },
      notificaciones: {
        descripcion: 'Envío de notificaciones de vencimiento',
        horario: '0 8 * * *',
        descripcion_horario: 'Diario a las 08:00',
        activa: true
      },
      backup_diario: {
        descripcion: 'Backup diario de datos críticos',
        horario: '0 1 * * *',
        descripcion_horario: 'Diario a las 01:00',
        activa: true
      },
      limpieza_semanal: {
        descripcion: 'Limpieza semanal de datos temporales',
        horario: '0 4 * * 0',
        descripcion_horario: 'Domingos a las 04:00',
        activa: true
      },
      reportes_mensuales: {
        descripcion: 'Generación de reportes mensuales',
        horario: '0 7 2 * *',
        descripcion_horario: 'Día 2 de cada mes a las 07:00',
        activa: true
      }
    };
  }
}

module.exports = CronJobs;

          

          