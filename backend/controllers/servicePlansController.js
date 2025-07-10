// backend/controllers/servicePlansController.js
// VERSIÓN OPTIMIZADA - Sin campos obsoletos: precio_instalacion, permanencia_meses, conceptos_incluidos

const { Database } = require('../models/Database');
const { validationResult } = require('express-validator');

class ServicePlansController {

  /**
   * OBTENER TODOS LOS PLANES CON PAGINACIÓN Y FILTROS
   */
  static async getPlans(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '', 
        tipo = '', 
        activo = '', 
        segmento = '',
        orden = 'orden_visualizacion'
      } = req.query;

      console.log('📊 Obteniendo planes con filtros:', { page, limit, search, tipo, activo, segmento });

      let query = `
        SELECT 
          p.*,
          CASE WHEN p.aplica_iva = 1 THEN p.precio * 1.19 ELSE p.precio END as precio_con_iva,
          (SELECT COUNT(*) FROM servicios_cliente sc WHERE sc.plan_id = p.id AND sc.estado = 'activo') as clientes_activos
        FROM planes_servicio p 
        WHERE 1=1
      `;

      const params = [];

      // Filtros dinámicos
      if (search) {
        query += ` AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (tipo) {
        query += ` AND p.tipo = ?`;
        params.push(tipo);
      }

      if (activo !== '') {
        query += ` AND p.activo = ?`;
        params.push(activo === 'true' ? 1 : 0);
      }

      if (segmento) {
        query += ` AND p.segmento = ?`;
        params.push(segmento);
      }

      // Ordenamiento
      const ordenesValidos = ['orden_visualizacion', 'nombre', 'precio', 'created_at', 'tipo'];
      const ordenFinal = ordenesValidos.includes(orden) ? orden : 'orden_visualizacion';
      query += ` ORDER BY p.${ordenFinal} ASC, p.nombre ASC`;

      // Paginación
      if (limit && limit !== 'all') {
        const limite = parseInt(limit);
        const offset = (parseInt(page) - 1) * limite;
        
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

      // ✅ PROCESAR DATOS SIN CAMPOS OBSOLETOS
      const planesFormateados = planes.map(plan => ({
        ...plan,
        // Convertir valores numéricos a números
        precio: parseFloat(plan.precio) || 0,
        precio_internet: parseFloat(plan.precio_internet) || 0,
        precio_television: parseFloat(plan.precio_television) || 0,
        velocidad_bajada: parseInt(plan.velocidad_bajada) || 0,
        velocidad_subida: parseInt(plan.velocidad_subida) || 0,
        canales_tv: parseInt(plan.canales_tv) || 0,
        descuento_combo: parseFloat(plan.descuento_combo) || 0,
        orden_visualizacion: parseInt(plan.orden_visualizacion) || 0,
        
        // ✅ CAMPOS OPTIMIZADOS DE INSTALACIÓN
        costo_instalacion_permanencia: parseFloat(plan.costo_instalacion_permanencia) || 0,
        costo_instalacion_sin_permanencia: parseFloat(plan.costo_instalacion_sin_permanencia) || 0,
        permanencia_minima_meses: parseInt(plan.permanencia_minima_meses) || 0,
        
        // Precios con IVA específicos
        precio_internet_sin_iva: parseFloat(plan.precio_internet_sin_iva) || 0,
        precio_television_sin_iva: parseFloat(plan.precio_television_sin_iva) || 0,
        precio_internet_con_iva: parseFloat(plan.precio_internet_con_iva) || 0,
        precio_television_con_iva: parseFloat(plan.precio_television_con_iva) || 0,
        
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

      // ✅ SIN PROCESAMIENTO DE CAMPOS OBSOLETOS
      const plan = {
        ...planes[0],
        // Convertir tipos de datos correctamente
        activo: Boolean(planes[0].activo),
        aplica_iva: Boolean(planes[0].aplica_iva),
        requiere_instalacion: Boolean(planes[0].requiere_instalacion),
        promocional: Boolean(planes[0].promocional),
        aplica_permanencia: Boolean(planes[0].aplica_permanencia)
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
   * ✅ CREAR NUEVO PLAN SIN CAMPOS OBSOLETOS
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
        requiere_instalacion = true,
        
        // Campos de segmentación
        segmento = 'residencial',
        tecnologia = 'Fibra Óptica',
        descuento_combo = 0,
        
        // Campos de configuración
        orden_visualizacion = 0,
        
        // Campos promocionales
        promocional = false,
        fecha_inicio_promocion,
        fecha_fin_promocion,
        
        // ✅ CAMPOS OPTIMIZADOS DE INSTALACIÓN Y PERMANENCIA
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

      // ✅ CALCULAR PRECIOS SIN IVA/CON IVA AUTOMÁTICAMENTE
      const precioInternetFinal = parseFloat(precio_internet) || 0;
      const precioTelevisionFinal = parseFloat(precio_television) || 0;

      const precioInternetSinIVA = precio_internet_sin_iva ? 
        parseFloat(precio_internet_sin_iva) : precioInternetFinal;
      const precioTVSinIVA = precio_television_sin_iva ? 
        parseFloat(precio_television_sin_iva) : precioTelevisionFinal;

      const ivaRate = 0.19; // 19%
      const precioInternetConIVA = precio_internet_con_iva ? 
        parseFloat(precio_internet_con_iva) : (precioInternetSinIVA * (1 + ivaRate));
      const precioTVConIVA = precio_television_con_iva ? 
        parseFloat(precio_television_con_iva) : (precioTVSinIVA * (1 + ivaRate));

      // ✅ INSERTAR CON CAMPOS OPTIMIZADOS
      const result = await Database.query(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada, 
          canales_tv, descripcion, aplica_iva, activo, precio_internet, precio_television,
          requiere_instalacion, segmento, tecnologia,
          descuento_combo, orden_visualizacion,
          promocional, fecha_inicio_promocion, fecha_fin_promocion,
          aplica_iva_estrato_123, aplica_iva_estrato_456,
          precio_internet_sin_iva, precio_television_sin_iva,
          precio_internet_con_iva, precio_television_con_iva,
          costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
          permanencia_minima_meses, aplica_permanencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        codigo, nombre, tipo, precio, 
        velocidad_subida || null, velocidad_bajada || null, canales_tv || null, descripcion,
        aplica_iva ? 1 : 0, activo ? 1 : 0, 
        precioInternetFinal, precioTelevisionFinal,
        requiere_instalacion ? 1 : 0, segmento, tecnologia,
        descuento_combo, orden_visualizacion,
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
   * ✅ ACTUALIZAR PLAN SIN CAMPOS OBSOLETOS
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

      // ✅ CAMPOS PERMITIDOS SIN OBSOLETOS
      const camposPermitidos = [
        // Campos básicos
        'nombre', 'precio', 'velocidad_subida', 'velocidad_bajada', 'canales_tv', 'descripcion',
        'aplica_iva', 'activo', 'precio_internet', 'precio_television',
        'requiere_instalacion', 'segmento', 'tecnologia',
        'descuento_combo', 'orden_visualizacion',
        'promocional', 'fecha_inicio_promocion', 'fecha_fin_promocion',
        
        // ✅ CAMPOS OPTIMIZADOS
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

      // ✅ INSERTAR PLAN DUPLICADO SIN CAMPOS OBSOLETOS
      const result = await Database.query(`
        INSERT INTO planes_servicio (
          codigo, nombre, tipo, precio, velocidad_subida, velocidad_bajada, 
          canales_tv, descripcion, aplica_iva, activo, precio_internet, precio_television,
          requiere_instalacion, segmento, tecnologia,
          descuento_combo, orden_visualizacion,
          promocional, fecha_inicio_promocion, fecha_fin_promocion,
          aplica_iva_estrato_123, aplica_iva_estrato_456,
          precio_internet_sin_iva, precio_television_sin_iva,
          precio_internet_con_iva, precio_television_con_iva,
          costo_instalacion_permanencia, costo_instalacion_sin_permanencia,
          permanencia_minima_meses, aplica_permanencia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        planDuplicado.codigo, planDuplicado.nombre, planDuplicado.tipo, planDuplicado.precio, 
        planDuplicado.velocidad_subida, planDuplicado.velocidad_bajada, planDuplicado.canales_tv, 
        planDuplicado.descripcion, planDuplicado.aplica_iva, planDuplicado.activo, 
        planDuplicado.precio_internet, planDuplicado.precio_television,
        planDuplicado.requiere_instalacion, planDuplicado.segmento, planDuplicado.tecnologia,
        planDuplicado.descuento_combo, planDuplicado.orden_visualizacion,
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
        message: 'Error duplicando plan de servicio',
        error: error.message
      });
    }
  }
}

module.exports = ServicePlansController;