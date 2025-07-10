// backend/controllers/servicePlansController.js
// VERSIÓN CORREGIDA basada en la estructura REAL de la base de datos

const { Database } = require('../models/Database');
const { validationResult } = require('express-validator');

class ServicePlansController {

  /**
   * OBTENER TODOS LOS PLANES CON FILTROS AVANZADOS
   */
  static async getPlans(req, res) {
    try {
      console.log('🔍 Obteniendo planes de servicio con filtros:', req.query);

      const {
        tipo,
        segmento,
        activo,
        promocional,
        incluir_promocionales = true,
        orden = 'orden_visualizacion',
        limite,
        offset,
        search,
        tecnologia
      } = req.query;

      // Construir consulta con los campos REALES de la BD
      let query = `
        SELECT 
          p.*,
          CASE WHEN p.aplica_iva = 1 THEN p.precio * 1.19 ELSE p.precio END as precio_con_iva,
          COALESCE(p.velocidad_subida, 0) + COALESCE(p.velocidad_bajada, 0) as velocidad_total,
          (SELECT COUNT(*) FROM servicios_cliente sc WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos,
          CASE 
            WHEN p.precio_internet > 0 AND p.precio_television > 0 THEN 'Combo'
            WHEN p.precio_internet > 0 THEN 'Solo Internet'
            WHEN p.precio_television > 0 THEN 'Solo TV'
            ELSE 'Otro'
          END as tipo_servicio_detallado
        FROM planes_servicio p
        WHERE 1=1
      `;

      const params = [];

      // Aplicar filtros
      if (tipo) {
        query += ' AND p.tipo = ?';
        params.push(tipo);
      }

      if (segmento) {
        query += ' AND p.segmento = ?';
        params.push(segmento);
      }

      if (activo !== undefined && activo !== '') {
        query += ' AND p.activo = ?';
        params.push(parseInt(activo));
      }

      if (promocional !== undefined) {
        query += ' AND p.promocional = ?';
        params.push(promocional === 'true' ? 1 : 0);
      }

      if (tecnologia) {
        query += ' AND p.tecnologia = ?';
        params.push(tecnologia);
      }

      // Búsqueda por texto
      if (search) {
        query += ' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      // Filtro de promocionales vigentes
      if (incluir_promocionales === 'false') {
        query += ' AND (p.promocional = 0 OR (p.promocional = 1 AND (p.fecha_fin_promocion IS NULL OR p.fecha_fin_promocion >= CURDATE())))';
      }

      // Ordenamiento
      const ordenamientosValidos = [
        'orden_visualizacion', 'nombre', 'precio', 'created_at', 'updated_at', 
        'tipo', 'segmento', 'clientes_activos'
      ];
      
      if (ordenamientosValidos.includes(orden)) {
        query += ` ORDER BY ${orden === 'clientes_activos' ? 'clientes_activos' : 'p.' + orden}`;
      } else {
        query += ' ORDER BY p.orden_visualizacion, p.nombre';
      }

      // Paginación
      if (limite) {
        query += ' LIMIT ?';
        params.push(parseInt(limite));
        
        if (offset) {
          query += ' OFFSET ?';
          params.push(parseInt(offset));
        }
      }

      console.log('📊 Query ejecutada:', query);
      console.log('📊 Parámetros:', params);

      const planes = await Database.query(query, params);

      // Procesar conceptos incluidos (JSON)
      const planesFormateados = planes.map(plan => ({
        ...plan,
        conceptos_incluidos: plan.conceptos_incluidos ? 
          (typeof plan.conceptos_incluidos === 'string' ? 
            JSON.parse(plan.conceptos_incluidos) : 
            plan.conceptos_incluidos
          ) : null,
        // Convertir valores numéricos a números
        precio: parseFloat(plan.precio) || 0,
        precio_internet: parseFloat(plan.precio_internet) || 0,
        precio_television: parseFloat(plan.precio_television) || 0,
        velocidad_bajada: parseInt(plan.velocidad_bajada) || 0,
        velocidad_subida: parseInt(plan.velocidad_subida) || 0,
        canales_tv: parseInt(plan.canales_tv) || 0,
        permanencia_meses: parseInt(plan.permanencia_meses) || 0,
        descuento_combo: parseFloat(plan.descuento_combo) || 0,
        precio_instalacion: parseFloat(plan.precio_instalacion) || 0,
        orden_visualizacion: parseInt(plan.orden_visualizacion) || 0,
        
        // CAMPOS NUEVOS REALES DE LA BD
        precio_internet_sin_iva: parseFloat(plan.precio_internet_sin_iva) || 0,
        precio_television_sin_iva: parseFloat(plan.precio_television_sin_iva) || 0,
        precio_internet_con_iva: parseFloat(plan.precio_internet_con_iva) || 0,
        precio_television_con_iva: parseFloat(plan.precio_television_con_iva) || 0,
        costo_instalacion_permanencia: parseFloat(plan.costo_instalacion_permanencia) || 0,
        costo_instalacion_sin_permanencia: parseFloat(plan.costo_instalacion_sin_permanencia) || 0,
        permanencia_minima_meses: parseInt(plan.permanencia_minima_meses) || 0,
        
        // Convertir valores booleanos
        activo: Boolean(plan.activo),
        aplica_iva: Boolean(plan.aplica_iva),
        requiere_instalacion: Boolean(plan.requiere_instalacion),
        promocional: Boolean(plan.promocional),
        aplica_iva_estrato_123: Boolean(plan.aplica_iva_estrato_123),
        aplica_iva_estrato_456: Boolean(plan.aplica_iva_estrato_456),
        aplica_permanencia: Boolean(plan.aplica_permanencia)
      }));

      console.log(`✅ ${planesFormateados.length} planes obtenidos exitosamente`);

      res.json({
        success: true,
        data: planesFormateados,
        total: planesFormateados.length,
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
   * OBTENER UN PLAN ESPECÍFICO POR ID
   */
  static async getPlan(req, res) {
    try {
      const { id } = req.params;

      const planes = await Database.query(`
        SELECT 
          p.*,
          CASE WHEN p.aplica_iva = 1 THEN p.precio * 1.19 ELSE p.precio END as precio_con_iva,
          (SELECT COUNT(*) FROM servicios_cliente sc WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos
        FROM planes_servicio p 
        WHERE p.id = ?
      `, [id]);

      if (planes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan no encontrado'
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
   * CREAR NUEVO PLAN CON TODOS LOS CAMPOS REALES
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
        // Campos básicos
        codigo,
        nombre,
        tipo,
        precio,
        velocidad_subida,
        velocidad_bajada,
        canales_tv,
        descripcion,
        aplica_iva = true,
        activo = true,
        
        // Campos de precios específicos
        precio_internet,
        precio_television,
        precio_instalacion = 42016,
        requiere_instalacion = true,
        
        // Campos de segmentación
        segmento = 'residencial',
        tecnologia = 'Fibra Óptica',
        permanencia_meses = 0,
        descuento_combo = 0,
        
        // Campos JSON y configuración avanzada
        conceptos_incluidos,
        orden_visualizacion = 0,
        
        // Campos promocionales
        promocional = false,
        fecha_inicio_promocion,
        fecha_fin_promocion,
        
        // CAMPOS NUEVOS REALES DE LA BD
        aplica_iva_estrato_123 = false,
        aplica_iva_estrato_456 = true,
        precio_internet_sin_iva,
        precio_television_sin_iva,
        precio_internet_con_iva,
        precio_television_con_iva,
        costo_instalacion_permanencia = 50000,
        costo_instalacion_sin_permanencia = 150000,
        permanencia_minima_meses = 6,
        aplica_permanencia = true
      } = req.body;

      console.log('🆕 Creando nuevo plan:', { codigo, nombre, tipo });

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
        if (!precio_internet && !precio_television) {
          precioInternetFinal = Math.round(precio * 0.65);
          precioTelevisionFinal = Math.round(precio * 0.35);
        }
      }

      // Auto-calcular precios con y sin IVA si no se proporcionan
      let precioInternetSinIVA = precio_internet_sin_iva || precioInternetFinal;
      let precioInternetConIVA = precio_internet_con_iva || Math.round(precioInternetFinal * 1.19);
      let precioTVSinIVA = precio_television_sin_iva || Math.round(precioTelevisionFinal / 1.19);
      let precioTVConIVA = precio_television_con_iva || precioTelevisionFinal;

      // Crear conceptos incluidos
      let conceptosIncluidos = {};
      if (conceptos_incluidos) {
        try {
          conceptosIncluidos = typeof conceptos_incluidos === 'string' 
            ? JSON.parse(conceptos_incluidos) 
            : conceptos_incluidos;
        } catch (e) {
          conceptosIncluidos = {};
        }
      }

      // Auto-generar conceptos básicos si está vacío
      if (Object.keys(conceptosIncluidos).length === 0) {
        conceptosIncluidos = {
          tipo_principal: tipo,
          instalacion: precio_instalacion
        };

        if (precioInternetFinal > 0) {
          conceptosIncluidos.internet = {
            precio: precioInternetFinal,
            velocidad_bajada: velocidad_bajada,
            velocidad_subida: velocidad_subida
          };
        }

        if (precioTelevisionFinal > 0) {
          conceptosIncluidos.television = {
            precio: precioTelevisionFinal,
            canales: canales_tv
          };
        }

        if (tipo === 'combo' && descuento_combo > 0) {
          conceptosIncluidos.descuento_combo = descuento_combo;
        }
      }

      // Insertar en base de datos con TODOS los campos reales
      const result = await Database.query(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada, 
          canales_tv, descripcion, aplica_iva, activo, precio_internet, precio_television,
          precio_instalacion, requiere_instalacion, segmento, tecnologia,
          permanencia_meses, descuento_combo, conceptos_incluidos, orden_visualizacion,
          promocional, fecha_inicio_promocion, fecha_fin_promocion,
          aplica_iva_estrato_123, aplica_iva_estrato_456,
          precio_internet_sin_iva, precio_television_sin_iva,
          precio_internet_con_iva, precio_television_con_iva,
          costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
          permanencia_minima_meses, aplica_permanencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        codigo, nombre, tipo, precio, 
        velocidad_subida || null, velocidad_bajada || null, canales_tv || null, descripcion,
        aplica_iva ? 1 : 0, activo ? 1 : 0, 
        precioInternetFinal, precioTelevisionFinal,
        precio_instalacion, requiere_instalacion ? 1 : 0, segmento, tecnologia,
        permanencia_meses, descuento_combo, JSON.stringify(conceptosIncluidos), orden_visualizacion,
        promocional ? 1 : 0, fecha_inicio_promocion || null, fecha_fin_promocion || null,
        aplica_iva_estrato_123 ? 1 : 0, aplica_iva_estrato_456 ? 1 : 0,
        precioInternetSinIVA, precioTVSinIVA, precioInternetConIVA, precioTVConIVA,
        costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
        permanencia_minima_meses, aplica_permanencia ? 1 : 0
      ]);

      console.log('✅ Plan creado con ID:', result.insertId);

      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          codigo,
          nombre,
          tipo
        },
        message: 'Plan creado exitosamente'
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
   * ACTUALIZAR PLAN EXISTENTE CON TODOS LOS CAMPOS REALES
   */
  static async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const datosActualizacion = req.body;

      console.log('🔄 Actualizando plan ID:', id);
      console.log('📝 Datos recibidos:', Object.keys(datosActualizacion));

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

      // Campos que se pueden actualizar - BASADOS EN LA ESTRUCTURA REAL
      const camposPermitidos = [
        // Campos básicos
        'nombre', 'precio', 'velocidad_subida', 'velocidad_bajada', 'canales_tv', 'descripcion',
        'aplica_iva', 'activo', 'precio_internet', 'precio_television',
        'precio_instalacion', 'requiere_instalacion', 'segmento', 'tecnologia',
        'permanencia_meses', 'descuento_combo', 'conceptos_incluidos', 'orden_visualizacion',
        'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion',
        
        // CAMPOS NUEVOS REALES
        'aplica_iva_estrato_123', 'aplica_iva_estrato_456',
        'precio_internet_sin_iva', 'precio_television_sin_iva',
        'precio_internet_con_iva', 'precio_television_con_iva',
        'costo_instalacion_permanencia', 'costo_instalacion_sin_permanencia',
        'permanencia_minima_meses', 'aplica_permanencia'
      ];

      const actualizaciones = {};
      const valores = [];
      
      camposPermitidos.forEach(campo => {
        if (datosActualizacion.hasOwnProperty(campo)) {
          // Conversiones especiales para campos booleanos
          if (['aplica_iva', 'activo', 'requiere_instalacion', 'promocional', 
               'aplica_iva_estrato_123', 'aplica_iva_estrato_456', 'aplica_permanencia'].includes(campo)) {
            actualizaciones[campo] = '?';
            valores.push(datosActualizacion[campo] ? 1 : 0);
          }
          // Conversiones especiales para campos numéricos que pueden ser null
          else if (['velocidad_subida', 'velocidad_bajada', 'canales_tv'].includes(campo)) {
            actualizaciones[campo] = '?';
            const valor = datosActualizacion[campo];
            valores.push(valor === '' || valor === null || valor === undefined ? null : parseInt(valor));
          }
          // Conversiones especiales para campos de texto que pueden ser null
          else if (['descripcion'].includes(campo)) {
            actualizaciones[campo] = '?';
            const valor = datosActualizacion[campo];
            valores.push(valor === '' ? null : valor);
          }
          // Conversiones especiales para fechas
          else if (['fecha_inicio_promocion', 'fecha_fin_promocion'].includes(campo)) {
            actualizaciones[campo] = '?';
            const valor = datosActualizacion[campo];
            valores.push(valor === '' ? null : valor);
          }
          // Campos JSON
          else if (campo === 'conceptos_incluidos') {
            actualizaciones[campo] = '?';
            let valor = datosActualizacion[campo];
            if (typeof valor === 'string') {
              try {
                JSON.parse(valor); // Validar que es JSON válido
                valores.push(valor);
              } catch (e) {
                valores.push('{}');
              }
            } else if (typeof valor === 'object') {
              valores.push(JSON.stringify(valor));
            } else {
              valores.push('{}');
            }
          }
          // Campos normales
          else {
            actualizaciones[campo] = '?';
            valores.push(datosActualizacion[campo]);
          }
        }
      });

      if (Object.keys(actualizaciones).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
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

      console.log('✅ Plan actualizado exitosamente');

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
   * CAMBIAR ESTADO ACTIVO/INACTIVO
   */
  static async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { activo } = req.body;

      await Database.query(
        'UPDATE planes_servicio SET activo = ?, updated_at = NOW() WHERE id = ?',
        [activo ? 1 : 0, id]
      );

      res.json({
        success: true,
        message: `Plan ${activo ? 'activado' : 'desactivado'} exitosamente`
      });

    } catch (error) {
      console.error('❌ Error cambiando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error cambiando estado del plan',
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

      // Eliminar el plan
      await Database.query('DELETE FROM planes_servicio WHERE id = ?', [id]);

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
        'SELECT * FROM planes_servicio WHERE id = ?',
        [id]
      );

      if (planOriginal.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan original no encontrado'
        });
      }

      const plan = planOriginal[0];

      // Verificar que el nuevo código no exista
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

      // Crear el plan duplicado
      const planDuplicado = {
        ...plan,
        codigo: nuevo_codigo,
        nombre: nuevo_nombre,
        ...modificaciones
      };

      // Remover campos que no se deben duplicar
      delete planDuplicado.id;
      delete planDuplicado.created_at;
      delete planDuplicado.updated_at;

      // Insertar el nuevo plan
      const result = await Database.query(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada, 
          canales_tv, descripcion, aplica_iva, activo, precio_internet, precio_television,
          precio_instalacion, requiere_instalacion, segmento, tecnologia,
          permanencia_meses, descuento_combo, conceptos_incluidos, orden_visualizacion,
          promocional, fecha_inicio_promocion, fecha_fin_promocion,
          aplica_iva_estrato_123, aplica_iva_estrato_456,
          precio_internet_sin_iva, precio_television_sin_iva,
          precio_internet_con_iva, precio_television_con_iva,
          costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
          permanencia_minima_meses, aplica_permanencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        planDuplicado.codigo, planDuplicado.nombre, planDuplicado.tipo, planDuplicado.precio,
        planDuplicado.velocidad_subida, planDuplicado.velocidad_bajada, planDuplicado.canales_tv, planDuplicado.descripcion,
        planDuplicado.aplica_iva, planDuplicado.activo, planDuplicado.precio_internet, planDuplicado.precio_television,
        planDuplicado.precio_instalacion, planDuplicado.requiere_instalacion, planDuplicado.segmento, planDuplicado.tecnologia,
        planDuplicado.permanencia_meses, planDuplicado.descuento_combo, planDuplicado.conceptos_incluidos, planDuplicado.orden_visualizacion,
        planDuplicado.promocional, planDuplicado.fecha_inicio_promocion, planDuplicado.fecha_fin_promocion,
        planDuplicado.aplica_iva_estrato_123, planDuplicado.aplica_iva_estrato_456,
        planDuplicado.precio_internet_sin_iva, planDuplicado.precio_television_sin_iva,
        planDuplicado.precio_internet_con_iva, planDuplicado.precio_television_con_iva,
        planDuplicado.costo_instalacion_permanencia, planDuplicado.costo_instalacion_sin_permanencia,
        planDuplicado.permanencia_minima_meses, planDuplicado.aplica_permanencia
      ]);

      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          codigo: nuevo_codigo,
          nombre: nuevo_nombre
        },
        message: 'Plan duplicado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error duplicando plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error duplicando plan',
        error: error.message
      });
    }
  }
}

module.exports = ServicePlansController;