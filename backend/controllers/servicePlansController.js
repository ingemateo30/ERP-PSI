// backend/controllers/ServicePlansController.js
// Controller mejorado para planes de servicio con nueva estructura

const { Database } = require('../models/Database');
const { validationResult } = require('express-validator');

class ServicePlansController {

  /**
   * OBTENER TODOS LOS PLANES CON INFORMACIÓN COMPLETA
   */
  static async getAllPlans(req, res) {
    try {
      const { 
        tipo, 
        segmento, 
        tecnologia, 
        activo = 1,
        incluir_promocionales = true,
        orden = 'orden_visualizacion'
      } = req.query;

      let whereConditions = ['p.activo = ?'];
      let queryParams = [parseInt(activo)];

      // Filtros opcionales
      if (tipo) {
        whereConditions.push('p.tipo = ?');
        queryParams.push(tipo);
      }

      if (segmento) {
        whereConditions.push('p.segmento = ?');
        queryParams.push(segmento);
      }

      if (tecnologia) {
        whereConditions.push('p.tecnologia LIKE ?');
        queryParams.push(`%${tecnologia}%`);
      }

      if (incluir_promocionales === 'false') {
        whereConditions.push('p.promocional = 0');
      }

      const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';

      // Orden válido
      const ordenesValidos = ['orden_visualizacion', 'precio', 'nombre', 'created_at'];
      const ordenFinal = ordenesValidos.includes(orden) ? orden : 'orden_visualizacion';

      const planes = await Database.query(`
        SELECT 
          p.*,
          -- Información calculada
          CASE 
            WHEN p.precio_internet > 0 AND p.precio_television > 0 THEN 'Combo'
            WHEN p.precio_internet > 0 THEN 'Internet'
            WHEN p.precio_television > 0 THEN 'TV'
            ELSE 'Otro'
          END as tipo_detallado,
          
          CASE 
            WHEN p.aplica_iva = 1 THEN ROUND(p.precio * 1.19, 2)
            ELSE p.precio 
          END as precio_con_iva,
          
          -- Clientes activos
          (SELECT COUNT(*) FROM servicios_cliente sc 
           WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos,
           
          -- Verificar si es promocional vigente
          CASE 
            WHEN p.promocional = 1 AND p.fecha_fin_promocion >= CURDATE() THEN 1
            WHEN p.promocional = 1 AND p.fecha_fin_promocion < CURDATE() THEN 0
            ELSE p.promocional
          END as promocional_vigente

        FROM planes_servicio p
        ${whereClause}
        ORDER BY p.${ordenFinal}, p.precio
      `, queryParams);

      // Formatear respuesta
      const planesFormateados = planes.map(plan => ({
        ...plan,
        conceptos_incluidos: plan.conceptos_incluidos ? 
          JSON.parse(plan.conceptos_incluidos) : null,
        // Información de velocidad formateada
        velocidad_display: plan.velocidad_bajada ? 
          `${plan.velocidad_bajada}/${plan.velocidad_subida || 1} Mbps` : null,
        // Canales formateados
        canales_display: plan.canales_tv ? `${plan.canales_tv} canales` : null
      }));

      res.json({
        success: true,
        data: planesFormateados,
        total: planesFormateados.length,
        filtros_aplicados: { tipo, segmento, tecnologia, activo, orden },
        message: 'Planes obtenidos exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo planes de servicio',
        error: error.message
      });
    }
  }

  /**
   * OBTENER PLAN POR ID CON INFORMACIÓN COMPLETA
   */
  static async getPlanById(req, res) {
    try {
      const { id } = req.params;

      const planes = await Database.query(`
        SELECT 
          p.*,
          -- Información calculada
          CASE 
            WHEN p.precio_internet > 0 AND p.precio_television > 0 THEN 'Combo'
            WHEN p.precio_internet > 0 THEN 'Internet'
            WHEN p.precio_television > 0 THEN 'TV'
            ELSE 'Otro'
          END as tipo_detallado,
          
          ROUND(p.precio * 1.19, 2) as precio_con_iva,
          
          -- Clientes y estadísticas
          (SELECT COUNT(*) FROM servicios_cliente sc 
           WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos,
          (SELECT COUNT(*) FROM servicios_cliente sc 
           WHERE sc.plan_id = p.id AND sc.estado = 'suspendido') as clientes_suspendidos,
          (SELECT AVG(DATEDIFF(CURDATE(), sc.fecha_activacion)) 
           FROM servicios_cliente sc 
           WHERE sc.plan_id = p.id AND sc.estado = 'activo') as dias_promedio_cliente
           
        FROM planes_servicio p
        WHERE p.id = ? AND p.activo = 1
      `, [id]);

      if (planes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan de servicio no encontrado'
        });
      }

      const plan = {
        ...planes[0],
        conceptos_incluidos: planes[0].conceptos_incluidos ? 
          JSON.parse(planes[0].conceptos_incluidos) : null
      };

      res.json({
        success: true,
        data: plan,
        message: 'Plan obtenido exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo plan de servicio',
        error: error.message
      });
    }
  }

  /**
   * CREAR NUEVO PLAN CON VALIDACIONES MEJORADAS
   */
  static async createPlan(req, res) {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const {
        codigo,
        nombre,
        tipo,
        precio,
        precio_internet,
        precio_television,
        velocidad_subida,
        velocidad_bajada,
        canales_tv,
        descripcion,
        precio_instalacion = 42016,
        requiere_instalacion = true,
        segmento = 'residencial',
        tecnologia = 'Fibra Óptica',
        permanencia_meses = 0,
        descuento_combo = 0,
        orden_visualizacion = 0,
        promocional = false,
        fecha_inicio_promocion,
        fecha_fin_promocion,
        aplica_iva = true
      } = req.body;

      // Verificar código único
      const codigoExistente = await Database.query(
        'SELECT id FROM planes_servicio WHERE codigo = ?', 
        [codigo]
      );

      if (codigoExistente.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un plan con ese código'
        });
      }

      // Validar precios según tipo
      let precioInternetFinal = precio_internet || 0;
      let precioTelevisionFinal = precio_television || 0;

      if (tipo === 'internet') {
        precioInternetFinal = precio;
        precioTelevisionFinal = 0;
      } else if (tipo === 'television') {
        precioInternetFinal = 0;
        precioTelevisionFinal = precio;
      } else if (tipo === 'combo') {
        // Si no se especifican precios individuales, calcular automáticamente
        if (!precio_internet && !precio_television) {
          precioInternetFinal = Math.round(precio * 0.65);
          precioTelevisionFinal = Math.round(precio * 0.35);
        }
      }

      // Crear conceptos incluidos
      const conceptosIncluidos = {
        tipo_principal: tipo,
        instalacion: precio_instalacion
      };

      if (precioInternetFinal > 0) {
        conceptosIncluidos.internet = precioInternetFinal;
      }
      if (precioTelevisionFinal > 0) {
        conceptosIncluidos.television = precioTelevisionFinal;
      }
      if (descuento_combo > 0) {
        conceptosIncluidos.descuento_combo = descuento_combo;
      }

      // Insertar plan
      const resultado = await Database.query(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, precio_internet, precio_television,
          velocidad_subida, velocidad_bajada, canales_tv, descripcion,
          precio_instalacion, requiere_instalacion, segmento, tecnologia,
          permanencia_meses, descuento_combo, conceptos_incluidos, 
          orden_visualizacion, promocional, fecha_inicio_promocion, 
          fecha_fin_promocion, aplica_iva, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        codigo, nombre, tipo, precio, precioInternetFinal, precioTelevisionFinal,
        velocidad_subida, velocidad_bajada, canales_tv, descripcion,
        precio_instalacion, requiere_instalacion, segmento, tecnologia,
        permanencia_meses, descuento_combo, JSON.stringify(conceptosIncluidos),
        orden_visualizacion, promocional, fecha_inicio_promocion,
        fecha_fin_promocion, aplica_iva
      ]);

      res.status(201).json({
        success: true,
        data: {
          id: resultado.insertId,
          codigo,
          nombre,
          tipo,
          precio,
          conceptos_incluidos: conceptosIncluidos
        },
        message: 'Plan de servicio creado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error creando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando plan de servicio',
        error: error.message
      });
    }
  }

  /**
   * ACTUALIZAR PLAN EXISTENTE
   */
  static async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const datosActualizacion = req.body;

      // Verificar que el plan existe
      const planExistente = await Database.query(
        'SELECT * FROM planes_servicio WHERE id = ?', 
        [id]
      );

      if (planExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
        });
      }

      const plan = planExistente[0];

      // Campos que se pueden actualizar
      const camposPermitidos = [
        'nombre', 'precio', 'precio_internet', 'precio_television',
        'velocidad_subida', 'velocidad_bajada', 'canales_tv', 'descripcion',
        'precio_instalacion', 'requiere_instalacion', 'segmento', 'tecnologia',
        'permanencia_meses', 'descuento_combo', 'orden_visualizacion',
        'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion', 'aplica_iva'
      ];

      const actualizaciones = {};
      const valores = [];
      
      camposPermitidos.forEach(campo => {
        if (datosActualizacion.hasOwnProperty(campo)) {
          actualizaciones[campo] = '?';
          valores.push(datosActualizacion[campo]);
        }
      });

      if (Object.keys(actualizaciones).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      // Actualizar conceptos incluidos si cambió algo relevante
      if (datosActualizacion.precio || datosActualizacion.precio_internet || 
          datosActualizacion.precio_television || datosActualizacion.descuento_combo) {
        
        const conceptosActualizados = JSON.parse(plan.conceptos_incluidos || '{}');
        
        if (datosActualizacion.precio_internet) {
          conceptosActualizados.internet = datosActualizacion.precio_internet;
        }
        if (datosActualizacion.precio_television) {
          conceptosActualizados.television = datosActualizacion.precio_television;
        }
        if (datosActualizacion.descuento_combo) {
          conceptosActualizados.descuento_combo = datosActualizacion.descuento_combo;
        }

        actualizaciones.conceptos_incluidos = '?';
        valores.push(JSON.stringify(conceptosActualizados));
      }

      // Agregar updated_at
      actualizaciones.updated_at = 'NOW()';
      valores.push(id);

      const setClauses = Object.keys(actualizaciones).map(key => 
        `${key} = ${actualizaciones[key]}`
      ).join(', ');

      await Database.query(`
        UPDATE planes_servicio 
        SET ${setClauses}
        WHERE id = ?
      `, valores);

      res.json({
        success: true,
        message: 'Plan actualizado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error actualizando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando plan de servicio',
        error: error.message
      });
    }
  }

  /**
   * OBTENER ESTADÍSTICAS DE PLANES
   */
  static async getPlansStats(req, res) {
    try {
      const stats = await Database.query(`
        SELECT 
          COUNT(*) as total_planes,
          SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as planes_activos,
          SUM(CASE WHEN tipo = 'internet' THEN 1 ELSE 0 END) as planes_internet,
          SUM(CASE WHEN tipo = 'television' THEN 1 ELSE 0 END) as planes_tv,
          SUM(CASE WHEN tipo = 'combo' THEN 1 ELSE 0 END) as planes_combo,
          SUM(CASE WHEN segmento = 'residencial' THEN 1 ELSE 0 END) as planes_residenciales,
          SUM(CASE WHEN segmento = 'empresarial' THEN 1 ELSE 0 END) as planes_empresariales,
          AVG(precio) as precio_promedio,
          MIN(precio) as precio_minimo,
          MAX(precio) as precio_maximo,
          SUM(CASE WHEN promocional = 1 AND fecha_fin_promocion >= CURDATE() THEN 1 ELSE 0 END) as promociones_vigentes
        FROM planes_servicio
      `);

      // Planes más populares
      const planesPopulares = await Database.query(`
        SELECT 
          p.codigo,
          p.nombre,
          p.tipo,
          p.precio,
          COUNT(sc.id) as total_clientes
        FROM planes_servicio p
        LEFT JOIN servicios_cliente sc ON p.id = sc.plan_id AND sc.estado = 'activo'
        WHERE p.activo = 1
        GROUP BY p.id
        ORDER BY total_clientes DESC
        LIMIT 5
      `);

      res.json({
        success: true,
        data: {
          ...stats[0],
          planes_mas_populares: planesPopulares
        },
        message: 'Estadísticas obtenidas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas',
        error: error.message
      });
    }
  }

  /**
   * DUPLICAR PLAN (útil para crear variaciones)
   */
  static async duplicatePlan(req, res) {
    try {
      const { id } = req.params;
      const { nuevo_codigo, nuevo_nombre, modificaciones = {} } = req.body;

      // Obtener plan original
      const planOriginal = await Database.query(
        'SELECT * FROM planes_servicio WHERE id = ? AND activo = 1',
        [id]
      );

      if (planOriginal.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan original no encontrado'
        });
      }

      const plan = planOriginal[0];

      // Verificar que el nuevo código no existe
      const codigoExistente = await Database.query(
        'SELECT id FROM planes_servicio WHERE codigo = ?',
        [nuevo_codigo]
      );

      if (codigoExistente.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un plan con ese código'
        });
      }

      // Crear datos del nuevo plan
      const nuevoPlano = {
        ...plan,
        codigo: nuevo_codigo,
        nombre: nuevo_nombre,
        ...modificaciones
      };

      // Remover campos que no se deben copiar
      delete nuevoPlano.id;
      delete nuevoPlano.created_at;
      delete nuevoPlano.updated_at;

      // Crear el nuevo plan
      const campos = Object.keys(nuevoPlano).join(', ');
      const valores = Object.values(nuevoPlano);
      const placeholders = valores.map(() => '?').join(', ');

      const resultado = await Database.query(`
        INSERT INTO planes_servicio (${campos}) VALUES (${placeholders})
      `, valores);

      res.status(201).json({
        success: true,
        data: {
          id: resultado.insertId,
          codigo: nuevo_codigo,
          nombre: nuevo_nombre,
          plan_original_id: id
        },
        message: 'Plan duplicado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error duplicando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error duplicando plan de servicio',
        error: error.message
      });
    }
  }

  /**
   * ELIMINAR PLAN (SOFT DELETE)
   */
  static async deletePlan(req, res) {
    try {
      const { id } = req.params;

      // Verificar si tiene clientes activos
      const clientesActivos = await Database.query(`
        SELECT COUNT(*) as total 
        FROM servicios_cliente 
        WHERE plan_id = ? AND estado = 'activo'
      `, [id]);

      if (clientesActivos[0].total > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el plan porque tiene ${clientesActivos[0].total} clientes activos`
        });
      }

      // Soft delete
      await Database.query(`
        UPDATE planes_servicio 
        SET activo = 0, updated_at = NOW() 
        WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Plan eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando plan de servicio',
        error: error.message
      });
    }
  }

  /**
   * ACTIVAR/DESACTIVAR PLAN
   */
  static async togglePlanStatus(req, res) {
    try {
      const { id } = req.params;
      const { activo } = req.body;

      await Database.query(`
        UPDATE planes_servicio 
        SET activo = ?, updated_at = NOW() 
        WHERE id = ?
      `, [activo ? 1 : 0, id]);

      res.json({
        success: true,
        message: `Plan ${activo ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error) {
      console.error('❌ Error cambiando estado del plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error cambiando estado del plan',
        error: error.message
      });
    }
  }
}

module.exports = ServicePlansController;