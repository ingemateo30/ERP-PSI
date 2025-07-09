// backend/services/InteresesMoratoriosService.js
const { Database } = require('../models/Database');

class InteresesMoratoriosService {
  /**
   * Calcular intereses moratorios con tasa diaria del 2% mensual
   * Tasa mensual: 2%
   * Tasa diaria: 2% / 30 = 0.0666% = 0.000666
   */
  static async calcularInteresesMoratorios(clienteId = null, fechaCalculo = new Date()) {
    try {
      console.log(`💰 Iniciando cálculo de intereses moratorios...`);
      
      const conexion = await Database.conexion();
      
      try {
        // Obtener configuración de intereses
        const [config] = await conexion.execute(`
          SELECT 
            COALESCE(valor, '2') as porcentaje_mensual
          FROM configuracion_facturacion 
          WHERE parametro = 'PORCENTAJE_INTERES_MORA' 
            AND activo = 1
        `);

        const porcentajeMensual = parseFloat(config[0]?.porcentaje_mensual || 2);
        const tasaDiaria = porcentajeMensual / 30 / 100; // Convertir a decimal diario
        
        console.log(`📊 Configuración de intereses:`);
        console.log(`   - Tasa mensual: ${porcentajeMensual}%`);
        console.log(`   - Tasa diaria: ${(tasaDiaria * 100).toFixed(6)}%`);

        // Construir condición WHERE para cliente específico o todos
        const whereCliente = clienteId ? 'AND f.cliente_id = ?' : '';
        const params = clienteId ? [clienteId] : [];

        // Obtener facturas morosas (más de fecha de vencimiento)
        const [facturasMorosas] = await conexion.execute(`
          SELECT 
            f.id,
            f.cliente_id,
            f.numero_factura,
            f.total,
            f.fecha_vencimiento,
            f.interes as interes_actual,
            COALESCE(SUM(p.valor_pagado), 0) as total_pagado,
            DATEDIFF(?, f.fecha_vencimiento) as dias_mora,
            (f.total - COALESCE(SUM(p.valor_pagado), 0)) as saldo_pendiente
          FROM facturas f
          LEFT JOIN pagos p ON f.id = p.factura_id AND p.activo = 1
          WHERE f.estado IN ('pendiente', 'vencida')
            AND f.activo = 1
            AND f.fecha_vencimiento < ?
            ${whereCliente}
          GROUP BY f.id, f.cliente_id, f.numero_factura, f.total, f.fecha_vencimiento, f.interes
          HAVING saldo_pendiente > 0 AND dias_mora > 0
          ORDER BY f.fecha_vencimiento ASC
        `, [fechaCalculo, fechaCalculo, ...params]);

        let totalInteresesCalculados = 0;
        let facturasConIntereses = 0;
        const detalleCalculos = [];

        for (const factura of facturasMorosas) {
          // Solo calcular intereses si hay días de mora
          if (factura.dias_mora > 0 && factura.saldo_pendiente > 0) {
            
            // Calcular interés diario sobre saldo pendiente
            const interesDiario = factura.saldo_pendiente * tasaDiaria;
            const interesTotal = interesDiario * factura.dias_mora;
            
            // Redondear a centavos
            const interesRedondeado = Math.round(interesTotal);
            
            if (interesRedondeado > 0) {
              totalInteresesCalculados += interesRedondeado;
              facturasConIntereses++;

              detalleCalculos.push({
                factura_id: factura.id,
                numero_factura: factura.numero_factura,
                cliente_id: factura.cliente_id,
                saldo_pendiente: factura.saldo_pendiente,
                dias_mora: factura.dias_mora,
                interes_calculado: interesRedondeado,
                interes_anterior: factura.interes_actual || 0,
                tasa_aplicada: tasaDiaria,
                fecha_calculo: fechaCalculo
              });

              // Actualizar intereses en la factura
              await conexion.execute(`
                UPDATE facturas 
                SET 
                  interes = ?,
                  updated_at = NOW()
                WHERE id = ?
              `, [interesRedondeado, factura.id]);

              console.log(`   💰 Factura ${factura.numero_factura}: $${factura.saldo_pendiente} x ${factura.dias_mora} días = $${interesRedondeado}`);
            }
          }
        }

        // Registrar log del cálculo
        await this.registrarLogIntereses(conexion, {
          fecha_calculo: fechaCalculo,
          facturas_procesadas: facturasMorosas.length,
          facturas_con_intereses: facturasConIntereses,
          total_intereses: totalInteresesCalculados,
          tasa_diaria: tasaDiaria,
          cliente_id: clienteId,
          detalle: detalleCalculos
        });

        console.log(`✅ Cálculo completado:`);
        console.log(`   - Facturas procesadas: ${facturasMorosas.length}`);
        console.log(`   - Facturas con intereses: ${facturasConIntereses}`);
        console.log(`   - Total intereses: $${totalInteresesCalculados.toLocaleString()}`);

        return {
          success: true,
          facturas_procesadas: facturasMorosas.length,
          facturas_con_intereses: facturasConIntereses,
          total_intereses: totalInteresesCalculados,
          tasa_diaria: tasaDiaria,
          detalle: detalleCalculos
        };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error calculando intereses moratorios:', error);
      throw error;
    }
  }

  /**
   * Obtener intereses pendientes para incluir en próxima factura
   */
  static async obtenerInteresesPendientes(clienteId, fechaCorte = new Date()) {
    try {
      const conexion = await Database.conexion();
      
      try {
        const [resultado] = await conexion.execute(`
          SELECT 
            COALESCE(SUM(interes), 0) as total_intereses,
            COUNT(*) as facturas_con_interes
          FROM facturas 
          WHERE cliente_id = ? 
            AND estado IN ('pendiente', 'vencida')
            AND interes > 0
            AND activo = 1
            AND fecha_vencimiento < ?
        `, [clienteId, fechaCorte]);

        return {
          total: parseFloat(resultado[0]?.total_intereses || 0),
          facturas: parseInt(resultado[0]?.facturas_con_interes || 0)
        };

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo intereses pendientes:', error);
      return { total: 0, facturas: 0 };
    }
  }

  /**
   * Registrar log detallado del cálculo de intereses
   */
  static async registrarLogIntereses(conexion, datos) {
    try {
      await conexion.execute(`
        INSERT INTO logs_sistema (
          tipo, 
          descripcion, 
          datos_json, 
          created_at
        ) VALUES (?, ?, ?, NOW())
      `, [
        'CALCULO_INTERESES_MORA',
        `Cálculo automático de intereses moratorios - ${datos.facturas_con_intereses} facturas afectadas`,
        JSON.stringify(datos)
      ]);
    } catch (error) {
      console.warn('⚠️ No se pudo registrar log de intereses:', error.message);
    }
  }

  /**
   * Obtener historial de intereses de un cliente
   */
  static async obtenerHistorialIntereses(clienteId, fechaInicio = null, fechaFin = null) {
    try {
      const conexion = await Database.conexion();
      
      try {
        let whereClausulas = ['f.cliente_id = ?'];
        let params = [clienteId];

        if (fechaInicio) {
          whereClausulas.push('f.fecha_emision >= ?');
          params.push(fechaInicio);
        }

        if (fechaFin) {
          whereClausulas.push('f.fecha_emision <= ?');
          params.push(fechaFin);
        }

        const [historial] = await conexion.execute(`
          SELECT 
            f.id,
            f.numero_factura,
            f.fecha_emision,
            f.fecha_vencimiento,
            f.total,
            f.interes,
            f.estado,
            DATEDIFF(COALESCE(f.fecha_pago, CURDATE()), f.fecha_vencimiento) as dias_mora,
            c.nombre as cliente_nombre
          FROM facturas f
          JOIN clientes c ON f.cliente_id = c.id
          WHERE ${whereClausulas.join(' AND ')}
            AND f.interes > 0
            AND f.activo = 1
          ORDER BY f.fecha_vencimiento DESC
        `, params);

        return historial;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error obteniendo historial de intereses:', error);
      throw error;
    }
  }

  /**
   * Configurar parámetros de intereses
   */
  static async configurarParametros(porcentajeMensual, diasGracia = 0) {
    try {
      const conexion = await Database.conexion();
      
      try {
        // Actualizar porcentaje mensual
        await conexion.execute(`
          UPDATE configuracion_facturacion 
          SET valor = ?, updated_at = NOW()
          WHERE parametro = 'PORCENTAJE_INTERES_MORA'
        `, [porcentajeMensual.toString()]);

        // Configurar días de gracia si se proporciona
        if (diasGracia > 0) {
          await conexion.execute(`
            INSERT INTO configuracion_facturacion (
              parametro, valor, tipo, descripcion, categoria
            ) VALUES (
              'DIAS_GRACIA_INTERESES', ?, 'NUMBER', 
              'Días de gracia antes de aplicar intereses', 'MORA'
            ) ON DUPLICATE KEY UPDATE 
              valor = ?, updated_at = NOW()
          `, [diasGracia.toString(), diasGracia.toString()]);
        }

        console.log(`✅ Parámetros de intereses actualizados:`);
        console.log(`   - Porcentaje mensual: ${porcentajeMensual}%`);
        console.log(`   - Días de gracia: ${diasGracia}`);

        return true;

      } finally {
        conexion.release();
      }

    } catch (error) {
      console.error('❌ Error configurando parámetros de intereses:', error);
      throw error;
    }
  }
}

module.exports = InteresesMoratoriosService;