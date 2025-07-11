// backend/controllers/instalacionesController.js

const { Database } = require('../models/Database');


console.log('🔧 Inicializando controlador de instalaciones...');

class InstalacionesController {
  
  // Test del controlador
  static async test(req, res) {
    try {
      console.log('🧪 Test instalaciones controller');
      
      res.json({
        success: true,
        message: 'Controlador de instalaciones funcionando correctamente',
        timestamp: new Date().toISOString(),
        user: req.user || null
      });
    } catch (error) {
      console.error('❌ Error en test instalaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error en test del controlador',
        error: error.message
      });
    }
  }

  // Listar instalaciones con filtros y paginación
  static async listar(req, res) {
    try {
      console.log('📋 Listando instalaciones con filtros:', req.query);

      const {
        pagina = 1,
        limite = 20,
        busqueda = '',
        estado = '',
        tipo_instalacion = '',
        instalador_id = '',
        fecha_desde = '',
        fecha_hasta = '',
        cliente_id = '',
        vencidas = false
      } = req.query;

      // Construir consulta base
      let consulta = `
        SELECT 
          i.id,
          i.cliente_id,
          i.servicio_cliente_id,
          i.instalador_id,
          i.fecha_programada,
          i.hora_programada,
          i.fecha_realizada,
          i.hora_inicio,
          i.hora_fin,
          i.estado,
          i.direccion_instalacion,
          i.barrio,
          i.telefono_contacto,
          i.persona_recibe,
          i.tipo_instalacion,
          i.observaciones,
          i.equipos_instalados,
          i.fotos_instalacion,
          i.coordenadas_lat,
          i.coordenadas_lng,
          i.costo_instalacion,
          i.created_at,
          i.updated_at,
          i.contrato_id,
          i.tipo_orden,
          
          -- Datos del cliente
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion,
          c.correo as cliente_email,
          
          -- Datos del instalador
          u.nombre as instalador_nombres,
          u.telefono as instalador_telefono,
          
          -- Datos del servicio
          sc.plan_id,
          sc.estado as servicio_estado,
          
          -- Datos del plan
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          
          -- Información geográfica
          s.nombre as sector_nombre,
          cd.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          
          -- Cálculos
          CASE 
            WHEN i.estado = 'completada' THEN 'Completada'
            WHEN i.estado = 'cancelada' THEN 'Cancelada'
            WHEN i.estado = 'reagendada' THEN 'Reagendada'
            WHEN i.estado = 'en_proceso' THEN 'En Proceso'
            WHEN i.fecha_programada < CURDATE() THEN 'Vencida'
            WHEN i.fecha_programada = CURDATE() THEN 'Hoy'
            ELSE 'Programada'
          END as estado_descriptivo,
          
          DATEDIFF(CURDATE(), i.fecha_programada) as dias_desde_programacion,
          
          CASE 
            WHEN i.fecha_programada < CURDATE() AND i.estado IN ('programada', 'en_proceso') THEN 1
            ELSE 0
          END as es_vencida

        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades cd ON s.ciudad_id = cd.id
        LEFT JOIN departamentos d ON cd.departamento_id = d.id
        WHERE 1=1
      `;

      const parametros = [];

      // Aplicar filtros
      if (busqueda) {
        consulta += ` AND (
          c.nombre LIKE ? OR 
          c.identificacion LIKE ? OR 
          i.direccion_instalacion LIKE ? OR
          i.persona_recibe LIKE ? OR
          i.telefono_contacto LIKE ?
        )`;
        const busquedaParam = `%${busqueda}%`;
        parametros.push(busquedaParam, busquedaParam, busquedaParam, busquedaParam, busquedaParam);
      }

      if (estado) {
        consulta += ` AND i.estado = ?`;
        parametros.push(estado);
      }

      if (tipo_instalacion) {
        consulta += ` AND i.tipo_instalacion = ?`;
        parametros.push(tipo_instalacion);
      }

      if (instalador_id) {
        consulta += ` AND i.instalador_id = ?`;
        parametros.push(instalador_id);
      }

      if (cliente_id) {
        consulta += ` AND i.cliente_id = ?`;
        parametros.push(cliente_id);
      }

      if (fecha_desde) {
        consulta += ` AND i.fecha_programada >= ?`;
        parametros.push(fecha_desde);
      }

      if (fecha_hasta) {
        consulta += ` AND i.fecha_programada <= ?`;
        parametros.push(fecha_hasta);
      }

      if (vencidas === 'true') {
        consulta += ` AND i.fecha_programada < CURDATE() AND i.estado IN ('programada', 'en_proceso')`;
      }

      // Contar total de registros
      const consultaConteo = consulta.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [conteoResult] = await Database.query(consultaConteo, parametros);
      const totalRegistros = conteoResult.total;

      // Agregar ordenamiento y paginación
      consulta += ` ORDER BY 
        CASE 
          WHEN i.estado = 'en_proceso' THEN 1
          WHEN i.fecha_programada = CURDATE() THEN 2
          WHEN i.fecha_programada < CURDATE() AND i.estado IN ('programada', 'en_proceso') THEN 3
          ELSE 4
        END,
        i.fecha_programada ASC,
        i.hora_programada ASC
      `;

      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      consulta += ` LIMIT ? OFFSET ?`;
      parametros.push(parseInt(limite), offset);

      // Ejecutar consulta principal
      const instalaciones = await Database.query(consulta, parametros);

      // Procesar equipos instalados (JSON)
      instalaciones.forEach(instalacion => {
        if (instalacion.equipos_instalados) {
          try {
            instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
          } catch (e) {
            instalacion.equipos_instalados = [];
          }
        } else {
          instalacion.equipos_instalados = [];
        }

        if (instalacion.fotos_instalacion) {
          try {
            instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
          } catch (e) {
            instalacion.fotos_instalacion = [];
          }
        } else {
          instalacion.fotos_instalacion = [];
        }
      });

      const totalPaginas = Math.ceil(totalRegistros / parseInt(limite));

      res.json({
        success: true,
        data: {
          instalaciones,
          paginacion: {
            pagina_actual: parseInt(pagina),
            total_paginas: totalPaginas,
            total_registros: totalRegistros,
            registros_por_pagina: parseInt(limite),
            tiene_siguiente: parseInt(pagina) < totalPaginas,
            tiene_anterior: parseInt(pagina) > 1
          }
        }
      });

    } catch (error) {
      console.error('❌ Error listando instalaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las instalaciones',
        error: error.message
      });
    }
  }

  // Obtener instalación por ID
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Obteniendo instalación ID:', id);

      const consulta = `
        SELECT 
          i.*,
          
          -- Datos del cliente
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion,
          c.correo as cliente_email,
          
          -- Datos del instalador
          u.nombre as instalador_nombres,
          u.telefono as instalador_telefono,
          u.email as instalador_email,
          
          -- Datos del servicio
          sc.plan_id,
          sc.estado as servicio_estado,
          sc.fecha_activacion,
          
          -- Datos del plan
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio,
          ps.velocidad_subida,
          ps.velocidad_bajada,
          
          -- Información geográfica
          s.nombre as sector_nombre,
          cd.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          
          -- Información del contrato
          cont.numero_contrato,
          cont.tipo_permanencia,
          cont.permanencia_meses

        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        LEFT JOIN sectores s ON c.sector_id = s.id
        LEFT JOIN ciudades cd ON s.ciudad_id = cd.id
        LEFT JOIN departamentos d ON cd.departamento_id = d.id
        LEFT JOIN contratos cont ON i.contrato_id = cont.id
        WHERE i.id = ?
      `;

      const [instalacion] = await Database.query(consulta, [id]);

      if (!instalacion) {
        return res.status(404).json({
          success: false,
          message: 'Instalación no encontrada'
        });
      }

      // Procesar JSON fields
      if (instalacion.equipos_instalados) {
        try {
          instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
        } catch (e) {
          instalacion.equipos_instalados = [];
        }
      }

      if (instalacion.fotos_instalacion) {
        try {
          instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
        } catch (e) {
          instalacion.fotos_instalacion = [];
        }
      }

      res.json({
        success: true,
        data: instalacion
      });

    } catch (error) {
      console.error('❌ Error obteniendo instalación:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la instalación',
        error: error.message
      });
    }
  }

  // Crear nueva instalación
  static async crear(req, res) {
    const connection = await Database.getConnection();
    
    try {
      await connection.beginTransaction();
      
      console.log('➕ Creando nueva instalación:', req.body);

      const {
        cliente_id,
        servicio_cliente_id,
        instalador_id,
        fecha_programada,
        hora_programada,
        direccion_instalacion,
        barrio,
        telefono_contacto,
        persona_recibe,
        tipo_instalacion = 'nueva',
        observaciones,
        equipos_instalados = [],
        costo_instalacion = 0,
        coordenadas_lat,
        coordenadas_lng,
        contrato_id,
        tipo_orden = 'instalacion'
      } = req.body;

      // Validar cliente existe
      const [cliente] = await connection.query(
        'SELECT id, nombre FROM clientes WHERE id = ?',
        [cliente_id]
      );

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Validar servicio cliente existe
      const [servicioCliente] = await connection.query(
        'SELECT id, plan_id FROM servicios_cliente WHERE id = ?',
        [servicio_cliente_id]
      );

      if (!servicioCliente) {
        throw new Error('Servicio de cliente no encontrado');
      }

      // Validar instalador si se proporciona
      if (instalador_id) {
        const [instalador] = await connection.query(
          `SELECT id, nombres, apellidos FROM sistema_usuarios 
           WHERE id = ? AND rol IN ('instalador', 'supervisor')`,
          [instalador_id]
        );

        if (!instalador) {
          throw new Error('Instalador no encontrado o no tiene permisos');
        }
      }

      // Verificar si ya existe una instalación para este servicio
      const [instalacionExistente] = await connection.query(
        `SELECT id FROM instalaciones 
         WHERE servicio_cliente_id = ? AND estado NOT IN ('cancelada', 'completada')`,
        [servicio_cliente_id]
      );

      if (instalacionExistente) {
        throw new Error('Ya existe una instalación pendiente para este servicio');
      }

      // Preparar datos para inserción
      const equiposJson = JSON.stringify(equipos_instalados);
      
      const query = `
        INSERT INTO instalaciones (
          cliente_id,
          servicio_cliente_id,
          instalador_id,
          fecha_programada,
          hora_programada,
          direccion_instalacion,
          barrio,
          telefono_contacto,
          persona_recibe,
          tipo_instalacion,
          observaciones,
          equipos_instalados,
          costo_instalacion,
          coordenadas_lat,
          coordenadas_lng,
          contrato_id,
          tipo_orden,
          estado,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'programada', NOW(), NOW())
      `;

      const parametros = [
        cliente_id,
        servicio_cliente_id,
        instalador_id || null,
        fecha_programada,
        hora_programada || null,
        direccion_instalacion || null,
        barrio || null,
        telefono_contacto || null,
        persona_recibe || null,
        tipo_instalacion,
        observaciones || null,
        equiposJson,
        costo_instalacion,
        coordenadas_lat || null,
        coordenadas_lng || null,
        contrato_id || null,
        tipo_orden
      ];

      const result = await connection.query(query, parametros);
      const instalacionId = result.insertId;

      // Registrar en logs
      

      // Si hay equipos, actualizar su estado a "asignado"
      if (equipos_instalados && equipos_instalados.length > 0) {
        for (const equipo of equipos_instalados) {
          if (equipo.equipo_id) {
            await connection.query(
              `UPDATE inventario_equipos 
               SET estado = 'asignado', instalador_id = ?, fecha_asignacion = NOW()
               WHERE id = ?`,
              [instalador_id, equipo.equipo_id]
            );
          }
        }
      }

      await connection.commit();

      // Obtener la instalación creada con datos completos
      const instalacionCreada = await this.obtenerInstalacionCompleta(instalacionId);

      res.status(201).json({
        success: true,
        message: 'Instalación creada exitosamente',
        data: instalacionCreada
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creando instalación:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Error al crear la instalación',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Actualizar instalación
  static async actualizar(req, res) {
    const connection = await Database.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      console.log('📝 Actualizando instalación ID:', id, 'Datos:', req.body);

      // Obtener instalación actual
      const [instalacionActual] = await connection.query(
        'SELECT * FROM instalaciones WHERE id = ?',
        [id]
      );

      if (!instalacionActual) {
        throw new Error('Instalación no encontrada');
      }

      const {
        instalador_id,
        fecha_programada,
        hora_programada,
        direccion_instalacion,
        barrio,
        telefono_contacto,
        persona_recibe,
        tipo_instalacion,
        observaciones,
        equipos_instalados,
        costo_instalacion,
        coordenadas_lat,
        coordenadas_lng,
        estado
      } = req.body;

      // Construir consulta de actualización dinámicamente
      const camposActualizar = [];
      const parametros = [];

      if (instalador_id !== undefined) {
        camposActualizar.push('instalador_id = ?');
        parametros.push(instalador_id);
      }

      if (fecha_programada !== undefined) {
        camposActualizar.push('fecha_programada = ?');
        parametros.push(fecha_programada);
      }

      if (hora_programada !== undefined) {
        camposActualizar.push('hora_programada = ?');
        parametros.push(hora_programada);
      }

      if (direccion_instalacion !== undefined) {
        camposActualizar.push('direccion_instalacion = ?');
        parametros.push(direccion_instalacion);
      }

      if (barrio !== undefined) {
        camposActualizar.push('barrio = ?');
        parametros.push(barrio);
      }

      if (telefono_contacto !== undefined) {
        camposActualizar.push('telefono_contacto = ?');
        parametros.push(telefono_contacto);
      }

      if (persona_recibe !== undefined) {
        camposActualizar.push('persona_recibe = ?');
        parametros.push(persona_recibe);
      }

      if (tipo_instalacion !== undefined) {
        camposActualizar.push('tipo_instalacion = ?');
        parametros.push(tipo_instalacion);
      }

      if (observaciones !== undefined) {
        camposActualizar.push('observaciones = ?');
        parametros.push(observaciones);
      }

      if (equipos_instalados !== undefined) {
        camposActualizar.push('equipos_instalados = ?');
        parametros.push(JSON.stringify(equipos_instalados));
      }

      if (costo_instalacion !== undefined) {
        camposActualizar.push('costo_instalacion = ?');
        parametros.push(costo_instalacion);
      }

      if (coordenadas_lat !== undefined) {
        camposActualizar.push('coordenadas_lat = ?');
        parametros.push(coordenadas_lat);
      }

      if (coordenadas_lng !== undefined) {
        camposActualizar.push('coordenadas_lng = ?');
        parametros.push(coordenadas_lng);
      }

      if (estado !== undefined) {
        camposActualizar.push('estado = ?');
        parametros.push(estado);
      }

      if (camposActualizar.length === 0) {
        throw new Error('No se proporcionaron campos para actualizar');
      }

      // Agregar updated_at y id
      camposActualizar.push('updated_at = NOW()');
      parametros.push(id);

      const query = `UPDATE instalaciones SET ${camposActualizar.join(', ')} WHERE id = ?`;
      
      await connection.query(query, parametros);

      // Registrar en logs
    

      await connection.commit();

      // Obtener instalación actualizada
      const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

      res.json({
        success: true,
        message: 'Instalación actualizada exitosamente',
        data: instalacionActualizada
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error actualizando instalación:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Error al actualizar la instalación',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Cambiar estado de instalación
  static async cambiarEstado(req, res) {
    const connection = await Database.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { 
        estado, 
        observaciones, 
        fecha_realizada,
        hora_inicio,
        hora_fin,
        equipos_instalados,
        fotos_instalacion
      } = req.body;

      console.log('🔄 Cambiando estado instalación ID:', id, 'a:', estado);

      // Obtener instalación actual
      const [instalacionActual] = await connection.query(
        'SELECT * FROM instalaciones WHERE id = ?',
        [id]
      );

      if (!instalacionActual) {
        throw new Error('Instalación no encontrada');
      }

      // Preparar campos a actualizar
      const camposActualizar = ['estado = ?', 'updated_at = NOW()'];
      const parametros = [estado];

      if (observaciones) {
        camposActualizar.push('observaciones = ?');
        parametros.push(observaciones);
      }

      if (fecha_realizada) {
        camposActualizar.push('fecha_realizada = ?');
        parametros.push(fecha_realizada);
      }

      if (hora_inicio) {
        camposActualizar.push('hora_inicio = ?');
        parametros.push(hora_inicio);
      }

      if (hora_fin) {
        camposActualizar.push('hora_fin = ?');
        parametros.push(hora_fin);
      }

      if (equipos_instalados) {
        camposActualizar.push('equipos_instalados = ?');
        parametros.push(JSON.stringify(equipos_instalados));
      }

      if (fotos_instalacion) {
        camposActualizar.push('fotos_instalacion = ?');
        parametros.push(JSON.stringify(fotos_instalacion));
      }

      parametros.push(id);

      const query = `UPDATE instalaciones SET ${camposActualizar.join(', ')} WHERE id = ?`;
      await connection.query(query, parametros);

      // Lógica específica por estado
      if (estado === 'completada') {
        // Actualizar equipos a estado "instalado"
        if (equipos_instalados && equipos_instalados.length > 0) {
          for (const equipo of equipos_instalados) {
            if (equipo.equipo_id) {
              await connection.query(
                `UPDATE inventario_equipos 
                 SET estado = 'instalado', ubicacion_actual = ?
                 WHERE id = ?`,
                [instalacionActual.direccion_instalacion, equipo.equipo_id]
              );
            }
          }
        }

        // Activar servicio del cliente si no está activo
        await connection.query(
          `UPDATE servicios_cliente 
           SET estado = 'activo', fecha_activacion = CURDATE()
           WHERE id = ? AND estado != 'activo'`,
          [instalacionActual.servicio_cliente_id]
        );
      }

      if (estado === 'cancelada') {
        // Liberar equipos asignados
        if (instalacionActual.equipos_instalados) {
          try {
            const equiposActuales = JSON.parse(instalacionActual.equipos_instalados);
            for (const equipo of equiposActuales) {
              if (equipo.equipo_id) {
                await connection.query(
                  `UPDATE inventario_equipos 
                   SET estado = 'disponible', instalador_id = NULL, fecha_devolucion = NOW()
                   WHERE id = ?`,
                  [equipo.equipo_id]
                );
              }
            }
          } catch (e) {
            console.warn('Error liberando equipos:', e);
          }
        }
      }

     

      await connection.commit();

      // Obtener instalación actualizada
      const instalacionActualizada = await this.obtenerInstalacionCompleta(id);

      res.json({
        success: true,
        message: `Estado de instalación cambiado a: ${estado}`,
        data: instalacionActualizada
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error cambiando estado:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Error al cambiar el estado',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Eliminar instalación
  static async eliminar(req, res) {
    const connection = await Database.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      console.log('🗑️ Eliminando instalación ID:', id);

      // Obtener instalación
      const [instalacion] = await connection.query(
        'SELECT * FROM instalaciones WHERE id = ?',
        [id]
      );

      if (!instalacion) {
        throw new Error('Instalación no encontrada');
      }

      // Solo permitir eliminar si está en estado programada o cancelada
      if (!['programada', 'cancelada'].includes(instalacion.estado)) {
        throw new Error('Solo se pueden eliminar instalaciones programadas o canceladas');
      }

      // Liberar equipos si los hay
      if (instalacion.equipos_instalados) {
        try {
          const equipos = JSON.parse(instalacion.equipos_instalados);
          for (const equipo of equipos) {
            if (equipo.equipo_id) {
              await connection.query(
                `UPDATE inventario_equipos 
                 SET estado = 'disponible', instalador_id = NULL, fecha_devolucion = NOW()
                 WHERE id = ?`,
                [equipo.equipo_id]
              );
            }
          }
        } catch (e) {
          console.warn('Error liberando equipos:', e);
        }
      }

      // Eliminar instalación
      await connection.query('DELETE FROM instalaciones WHERE id = ?', [id]);

      // Registrar en logs
     

      await connection.commit();

      res.json({
        success: true,
        message: 'Instalación eliminada exitosamente'
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error eliminando instalación:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Error al eliminar la instalación',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Obtener estadísticas de instalaciones
  static async obtenerEstadisticas(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas de instalaciones');

      const { fecha_desde, fecha_hasta, instalador_id } = req.query;

      // Estadísticas generales
      let consultaGeneral = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN estado = 'reagendada' THEN 1 ELSE 0 END) as reagendadas,
          SUM(CASE WHEN fecha_programada < CURDATE() AND estado IN ('programada', 'en_proceso') THEN 1 ELSE 0 END) as vencidas,
          SUM(CASE WHEN fecha_programada = CURDATE() THEN 1 ELSE 0 END) as hoy,
          SUM(CASE WHEN WEEK(fecha_programada) = WEEK(CURDATE()) AND YEAR(fecha_programada) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as esta_semana,
          SUM(CASE WHEN MONTH(fecha_programada) = MONTH(CURDATE()) AND YEAR(fecha_programada) = YEAR(CURDATE()) THEN 1 ELSE 0 END) as este_mes,
          ROUND(AVG(costo_instalacion), 2) as costo_promedio,
          SUM(costo_instalacion) as costo_total
        FROM instalaciones 
        WHERE 1=1
      `;

      const parametrosGeneral = [];

      if (fecha_desde) {
        consultaGeneral += ` AND fecha_programada >= ?`;
        parametrosGeneral.push(fecha_desde);
      }

      if (fecha_hasta) {
        consultaGeneral += ` AND fecha_programada <= ?`;
        parametrosGeneral.push(fecha_hasta);
      }

      if (instalador_id) {
        consultaGeneral += ` AND instalador_id = ?`;
        parametrosGeneral.push(instalador_id);
      }

      const [estadisticasGenerales] = await Database.query(consultaGeneral, parametrosGeneral);

      // Estadísticas por instalador
      let consultaInstaladores = `
        SELECT 
          i.instalador_id,
          u.nombre as instalador_nombre,
          COUNT(*) as total_instalaciones,
          SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(CASE WHEN i.estado = 'programada' THEN 1 ELSE 0 END) as programadas,
          SUM(CASE WHEN i.estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
          SUM(CASE WHEN i.estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(CASE WHEN i.fecha_programada < CURDATE() AND i.estado IN ('programada', 'en_proceso') THEN 1 ELSE 0 END) as vencidas,
          ROUND((SUM(CASE WHEN i.estado = 'completada' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as porcentaje_exito,
          SUM(i.costo_instalacion) as ingresos_total
        FROM instalaciones i
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        WHERE i.instalador_id IS NOT NULL
      `;

      const parametrosInstaladores = [];

      if (fecha_desde) {
        consultaInstaladores += ` AND i.fecha_programada >= ?`;
        parametrosInstaladores.push(fecha_desde);
      }

      if (fecha_hasta) {
        consultaInstaladores += ` AND i.fecha_programada <= ?`;
        parametrosInstaladores.push(fecha_hasta);
      }

      if (instalador_id) {
        consultaInstaladores += ` AND i.instalador_id = ?`;
        parametrosInstaladores.push(instalador_id);
      }

      consultaInstaladores += ` GROUP BY i.instalador_id, u.nombre ORDER BY total_instalaciones DESC`;

      const instaladores = await Database.query(consultaInstaladores, parametrosInstaladores);

      // Estadísticas por tipo de instalación
      let consultaTipos = `
        SELECT 
          tipo_instalacion,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          ROUND(AVG(costo_instalacion), 2) as costo_promedio
        FROM instalaciones 
        WHERE 1=1
      `;

      const parametrosTipos = [];

      if (fecha_desde) {
        consultaTipos += ` AND fecha_programada >= ?`;
        parametrosTipos.push(fecha_desde);
      }

      if (fecha_hasta) {
        consultaTipos += ` AND fecha_programada <= ?`;
        parametrosTipos.push(fecha_hasta);
      }

      if (instalador_id) {
        consultaTipos += ` AND instalador_id = ?`;
        parametrosTipos.push(instalador_id);
      }

      consultaTipos += ` GROUP BY tipo_instalacion ORDER BY total DESC`;

      const tiposInstalacion = await Database.query(consultaTipos, parametrosTipos);

      // Estadísticas mensuales del año actual
      const consultaMensual = `
        SELECT 
          MONTH(fecha_programada) as mes,
          MONTHNAME(fecha_programada) as mes_nombre,
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
          SUM(costo_instalacion) as ingresos
        FROM instalaciones 
        WHERE YEAR(fecha_programada) = YEAR(CURDATE())
        ${instalador_id ? 'AND instalador_id = ?' : ''}
        GROUP BY MONTH(fecha_programada), MONTHNAME(fecha_programada)
        ORDER BY MONTH(fecha_programada)
      `;

      const parametrosMensual = instalador_id ? [instalador_id] : [];
      const estadisticasMensuales = await Database.query(consultaMensual, parametrosMensual);

      // Instalaciones próximas (siguientes 7 días)
      const consultaProximas = `
        SELECT 
          i.id,
          i.fecha_programada,
          i.hora_programada,
          i.estado,
          i.tipo_instalacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          i.direccion_instalacion,
          u.nombre as instalador_nombre,
          ps.nombre as plan_nombre
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE i.fecha_programada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND i.estado IN ('programada', 'en_proceso')
        ${instalador_id ? 'AND i.instalador_id = ?' : ''}
        ORDER BY i.fecha_programada ASC, i.hora_programada ASC
        LIMIT 10
      `;

      const parametrosProximas = instalador_id ? [instalador_id] : [];
      const instalacionesProximas = await Database.query(consultaProximas, parametrosProximas);

      res.json({
        success: true,
        data: {
          resumen: estadisticasGenerales,
          por_instalador: instaladores,
          por_tipo: tiposInstalacion,
          mensuales: estadisticasMensuales,
          proximas: instalacionesProximas
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // Método auxiliar para obtener instalación completa
  static async obtenerInstalacionCompleta(id) {
    try {
      const consulta = `
        SELECT 
          i.*,
          c.identificacion as cliente_identificacion,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          CONCAT(u.nombres, ' ', u.apellidos) as instalador_nombre_completo,
          u.telefono as instalador_telefono,
          ps.nombre as plan_nombre,
          ps.tipo as plan_tipo,
          ps.precio as plan_precio
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN sistema_usuarios u ON i.instalador_id = u.id
        LEFT JOIN servicios_cliente sc ON i.servicio_cliente_id = sc.id
        LEFT JOIN planes_servicio ps ON sc.plan_id = ps.id
        WHERE i.id = ?
      `;

      const [instalacion] = await Database.query(consulta, [id]);

      if (instalacion) {
        // Procesar JSON fields
        if (instalacion.equipos_instalados) {
          try {
            instalacion.equipos_instalados = JSON.parse(instalacion.equipos_instalados);
          } catch (e) {
            instalacion.equipos_instalados = [];
          }
        }

        if (instalacion.fotos_instalacion) {
          try {
            instalacion.fotos_instalacion = JSON.parse(instalacion.fotos_instalacion);
          } catch (e) {
            instalacion.fotos_instalacion = [];
          }
        }
      }

      return instalacion;
    } catch (error) {
      console.error('Error obteniendo instalación completa:', error);
      return null;
    }
  }
}

console.log('✅ Controlador de instalaciones inicializado');

module.exports = InstalacionesController;