const Instalacion = require('../models/instalacion');
const { validarDatos, validarFecha, validarNumeroPositivo } = require('../middleware/validaciones');
const { respuestaExitosa, respuestaError } = require('../utils/responses');

class InstalacionesController {
  // Crear nueva instalación
  static async crear(req, res) {
    try {
      const {
        cliente_id,
        plan_id,
        instalador_id,
        fecha_programada,
        direccion_instalacion,
        barrio,
        ciudad_id,
        telefono_contacto,
        persona_recibe,
        tipo_instalacion,
        observaciones,
        equipos_instalados,
        coordenadas_lat,
        coordenadas_lng,
        costo_instalacion
      } = req.body;

      // Validaciones básicas
      if (!cliente_id || !plan_id || !fecha_programada || !direccion_instalacion) {
        return respuestaError(res, 'Los campos cliente_id, plan_id, fecha_programada y direccion_instalacion son obligatorios', 400);
      }

      // Validar formato de fecha
      if (!validarFecha(fecha_programada)) {
        return respuestaError(res, 'El formato de fecha_programada debe ser YYYY-MM-DD HH:MM:SS', 400);
      }

      // Validar que la fecha programada sea futura
      const fechaProgramada = new Date(fecha_programada);
      const ahora = new Date();
      if (fechaProgramada <= ahora) {
        return respuestaError(res, 'La fecha programada debe ser futura', 400);
      }

      // Validar coordenadas si se proporcionan
      if (coordenadas_lat && (coordenadas_lat < -90 || coordenadas_lat > 90)) {
        return respuestaError(res, 'La latitud debe estar entre -90 y 90 grados', 400);
      }

      if (coordenadas_lng && (coordenadas_lng < -180 || coordenadas_lng > 180)) {
        return respuestaError(res, 'La longitud debe estar entre -180 y 180 grados', 400);
      }

      // Validar costo de instalación
      if (costo_instalacion && !validarNumeroPositivo(costo_instalacion)) {
        return respuestaError(res, 'El costo de instalación debe ser un número positivo', 400);
      }

      // Validar tipos permitidos
      const tiposPermitidos = ['nueva', 'migracion', 'upgrade', 'reparacion'];
      if (tipo_instalacion && !tiposPermitidos.includes(tipo_instalacion)) {
        return respuestaError(res, `El tipo de instalación debe ser uno de: ${tiposPermitidos.join(', ')}`, 400);
      }

      // Validar equipos instalados si se proporcionan
      if (equipos_instalados && (!Array.isArray(equipos_instalados) || equipos_instalados.length === 0)) {
        return respuestaError(res, 'Los equipos instalados deben ser un array no vacío', 400);
      }

      const datosInstalacion = {
        cliente_id: parseInt(cliente_id),
        plan_id: parseInt(plan_id),
        instalador_id: instalador_id ? parseInt(instalador_id) : null,
        fecha_programada,
        direccion_instalacion: direccion_instalacion.trim(),
        barrio: barrio ? barrio.trim() : null,
        ciudad_id: ciudad_id ? parseInt(ciudad_id) : null,
        telefono_contacto: telefono_contacto ? telefono_contacto.trim() : null,
        persona_recibe: persona_recibe ? persona_recibe.trim() : null,
        tipo_instalacion: tipo_instalacion || 'nueva',
        observaciones: observaciones ? observaciones.trim() : null,
        equipos_instalados,
        coordenadas_lat: coordenadas_lat ? parseFloat(coordenadas_lat) : null,
        coordenadas_lng: coordenadas_lng ? parseFloat(coordenadas_lng) : null,
        costo_instalacion: costo_instalacion ? parseFloat(costo_instalacion) : 0
      };

      const instalacion = await Instalacion.crear(datosInstalacion);

      return respuestaExitosa(res, {
        instalacion,
        mensaje: 'Instalación creada exitosamente'
      }, 201);

    } catch (error) {
      console.error('Error al crear instalación:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Listar instalaciones con filtros y paginación
  static async listar(req, res) {
    try {
      const {
        pagina = 1,
        limite = 10,
        estado,
        instalador_id,
        fecha_desde,
        fecha_hasta,
        tipo_instalacion,
        ciudad_id,
        busqueda
      } = req.query;

      // Validar paginación
      const paginaNum = parseInt(pagina);
      const limiteNum = parseInt(limite);

      if (paginaNum < 1 || limiteNum < 1 || limiteNum > 100) {
        return respuestaError(res, 'Parámetros de paginación inválidos. Página >= 1, límite entre 1 y 100', 400);
      }

      // Validar fechas si se proporcionan
      if (fecha_desde && !validarFecha(fecha_desde, 'YYYY-MM-DD')) {
        return respuestaError(res, 'El formato de fecha_desde debe ser YYYY-MM-DD', 400);
      }

      if (fecha_hasta && !validarFecha(fecha_hasta, 'YYYY-MM-DD')) {
        return respuestaError(res, 'El formato de fecha_hasta debe ser YYYY-MM-DD', 400);
      }

      // Validar estados permitidos
      const estadosPermitidos = ['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'];
      if (estado && !estadosPermitidos.includes(estado)) {
        return respuestaError(res, `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`, 400);
      }

      const filtros = {
        estado,
        instalador_id: instalador_id ? parseInt(instalador_id) : null,
        fecha_desde,
        fecha_hasta,
        tipo_instalacion,
        ciudad_id: ciudad_id ? parseInt(ciudad_id) : null,
        busqueda: busqueda ? busqueda.trim() : null
      };

      // Remover filtros vacíos
      Object.keys(filtros).forEach(key => {
        if (filtros[key] === null || filtros[key] === undefined || filtros[key] === '') {
          delete filtros[key];
        }
      });

      const paginacion = {
        pagina: paginaNum,
        limite: limiteNum
      };

      const resultado = await Instalacion.listar(filtros, paginacion);

      return respuestaExitosa(res, resultado);

    } catch (error) {
      console.error('Error al listar instalaciones:', error);
      return respuestaError(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener instalación por ID
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      const instalacion = await Instalacion.obtenerPorId(parseInt(id));

      if (!instalacion) {
        return respuestaError(res, 'Instalación no encontrada', 404);
      }

      return respuestaExitosa(res, { instalacion });

    } catch (error) {
      console.error('Error al obtener instalación:', error);
      return respuestaError(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar instalación
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      const datosActualizacion = req.body;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      // Validaciones específicas para actualización
      if (datosActualizacion.fecha_programada) {
        if (!validarFecha(datosActualizacion.fecha_programada)) {
          return respuestaError(res, 'El formato de fecha_programada debe ser YYYY-MM-DD HH:MM:SS', 400);
        }
      }

      if (datosActualizacion.fecha_realizada) {
        if (!validarFecha(datosActualizacion.fecha_realizada)) {
          return respuestaError(res, 'El formato de fecha_realizada debe ser YYYY-MM-DD HH:MM:SS', 400);
        }
      }

      if (datosActualizacion.estado) {
        const estadosPermitidos = ['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'];
        if (!estadosPermitidos.includes(datosActualizacion.estado)) {
          return respuestaError(res, `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`, 400);
        }
      }

      if (datosActualizacion.tipo_instalacion) {
        const tiposPermitidos = ['nueva', 'migracion', 'upgrade', 'reparacion'];
        if (!tiposPermitidos.includes(datosActualizacion.tipo_instalacion)) {
          return respuestaError(res, `El tipo de instalación debe ser uno de: ${tiposPermitidos.join(', ')}`, 400);
        }
      }

      // Validar coordenadas
      if (datosActualizacion.coordenadas_lat !== undefined) {
        if (datosActualizacion.coordenadas_lat && (datosActualizacion.coordenadas_lat < -90 || datosActualizacion.coordenadas_lat > 90)) {
          return respuestaError(res, 'La latitud debe estar entre -90 y 90 grados', 400);
        }
      }

      if (datosActualizacion.coordenadas_lng !== undefined) {
        if (datosActualizacion.coordenadas_lng && (datosActualizacion.coordenadas_lng < -180 || datosActualizacion.coordenadas_lng > 180)) {
          return respuestaError(res, 'La longitud debe estar entre -180 y 180 grados', 400);
        }
      }

      // Validar costo
      if (datosActualizacion.costo_instalacion !== undefined) {
        if (datosActualizacion.costo_instalacion && !validarNumeroPositivo(datosActualizacion.costo_instalacion)) {
          return respuestaError(res, 'El costo de instalación debe ser un número positivo', 400);
        }
      }

      // Limpiar datos de strings
      ['direccion_instalacion', 'barrio', 'telefono_contacto', 'persona_recibe', 'observaciones'].forEach(campo => {
        if (datosActualizacion[campo]) {
          datosActualizacion[campo] = datosActualizacion[campo].trim();
        }
      });

      // Convertir números
      ['instalador_id', 'ciudad_id'].forEach(campo => {
        if (datosActualizacion[campo]) {
          datosActualizacion[campo] = parseInt(datosActualizacion[campo]);
        }
      });

      ['coordenadas_lat', 'coordenadas_lng', 'costo_instalacion'].forEach(campo => {
        if (datosActualizacion[campo] !== undefined && datosActualizacion[campo] !== null) {
          datosActualizacion[campo] = parseFloat(datosActualizacion[campo]);
        }
      });

      const instalacionActualizada = await Instalacion.actualizar(parseInt(id), datosActualizacion);

      return respuestaExitosa(res, {
        instalacion: instalacionActualizada,
        mensaje: 'Instalación actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error al actualizar instalación:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Eliminar instalación
  static async eliminar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      await Instalacion.eliminar(parseInt(id));

      return respuestaExitosa(res, {
        mensaje: 'Instalación eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar instalación:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Cambiar estado de instalación
  static async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado, observaciones, fecha_realizada, equipos_instalados, fotos_instalacion } = req.body;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      if (!estado) {
        return respuestaError(res, 'El estado es obligatorio', 400);
      }

      const estadosPermitidos = ['programada', 'en_proceso', 'completada', 'cancelada', 'reagendada'];
      if (!estadosPermitidos.includes(estado)) {
        return respuestaError(res, `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`, 400);
      }

      const datosActualizacion = { estado };

      // Si se marca como completada, requerir fecha de realización
      if (estado === 'completada') {
        if (!fecha_realizada) {
          return respuestaError(res, 'La fecha de realización es obligatoria para completar la instalación', 400);
        }

        if (!validarFecha(fecha_realizada)) {
          return respuestaError(res, 'El formato de fecha_realizada debe ser YYYY-MM-DD HH:MM:SS', 400);
        }

        datosActualizacion.fecha_realizada = fecha_realizada;

        // Validar equipos instalados para instalaciones completadas
        if (equipos_instalados && Array.isArray(equipos_instalados)) {
          datosActualizacion.equipos_instalados = equipos_instalados;
        }

        // Validar fotos de instalación
        if (fotos_instalacion && Array.isArray(fotos_instalacion)) {
          datosActualizacion.fotos_instalacion = fotos_instalacion;
        }
      }

      if (observaciones) {
        datosActualizacion.observaciones = observaciones.trim();
      }

      const instalacionActualizada = await Instalacion.actualizar(parseInt(id), datosActualizacion);

      return respuestaExitosa(res, {
        instalacion: instalacionActualizada,
        mensaje: `Instalación marcada como ${estado} exitosamente`
      });

    } catch (error) {
      console.error('Error al cambiar estado de instalación:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Obtener estadísticas de instalaciones
  static async obtenerEstadisticas(req, res) {
    try {
      const { fecha_desde, fecha_hasta, instalador_id } = req.query;

      // Validar fechas si se proporcionan
      if (fecha_desde && !validarFecha(fecha_desde, 'YYYY-MM-DD')) {
        return respuestaError(res, 'El formato de fecha_desde debe ser YYYY-MM-DD', 400);
      }

      if (fecha_hasta && !validarFecha(fecha_hasta, 'YYYY-MM-DD')) {
        return respuestaError(res, 'El formato de fecha_hasta debe ser YYYY-MM-DD', 400);
      }

      const filtros = {};

      if (fecha_desde) filtros.fecha_desde = fecha_desde;
      if (fecha_hasta) filtros.fecha_hasta = fecha_hasta;
      if (instalador_id) filtros.instalador_id = parseInt(instalador_id);

      const estadisticas = await Instalacion.obtenerEstadisticas(filtros);

      return respuestaExitosa(res, { estadisticas });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return respuestaError(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener instalaciones pendientes por instalador
  static async obtenerPendientesPorInstalador(req, res) {
    try {
      const { instalador_id } = req.params;

      if (!instalador_id || isNaN(parseInt(instalador_id))) {
        return respuestaError(res, 'ID de instalador inválido', 400);
      }

      const instalacionesPendientes = await Instalacion.obtenerPendientesPorInstalador(parseInt(instalador_id));

      return respuestaExitosa(res, {
        instalaciones: instalacionesPendientes,
        total: instalacionesPendientes.length
      });

    } catch (error) {
      console.error('Error al obtener instalaciones pendientes:', error);
      return respuestaError(res, 'Error interno del servidor', 500);
    }
  }

  // Reagendar instalación
  static async reagendar(req, res) {
    try {
      const { id } = req.params;
      const { nueva_fecha, motivo } = req.body;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      if (!nueva_fecha) {
        return respuestaError(res, 'La nueva fecha es obligatoria', 400);
      }

      if (!validarFecha(nueva_fecha)) {
        return respuestaError(res, 'El formato de nueva_fecha debe ser YYYY-MM-DD HH:MM:SS', 400);
      }

      // Validar que la nueva fecha sea futura
      const nuevaFecha = new Date(nueva_fecha);
      const ahora = new Date();
      if (nuevaFecha <= ahora) {
        return respuestaError(res, 'La nueva fecha debe ser futura', 400);
      }

      const datosActualizacion = {
        fecha_programada: nueva_fecha,
        estado: 'reagendada',
        observaciones: motivo ? `Reagendada: ${motivo.trim()}` : 'Reagendada'
      };

      const instalacionActualizada = await Instalacion.actualizar(parseInt(id), datosActualizacion);

      return respuestaExitosa(res, {
        instalacion: instalacionActualizada,
        mensaje: 'Instalación reagendada exitosamente'
      });

    } catch (error) {
      console.error('Error al reagendar instalación:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Asignar instalador
  static async asignarInstalador(req, res) {
    try {
      const { id } = req.params;
      const { instalador_id } = req.body;

      if (!id || isNaN(parseInt(id))) {
        return respuestaError(res, 'ID de instalación inválido', 400);
      }

      if (!instalador_id || isNaN(parseInt(instalador_id))) {
        return respuestaError(res, 'ID de instalador inválido', 400);
      }

      const datosActualizacion = {
        instalador_id: parseInt(instalador_id)
      };

      const instalacionActualizada = await Instalacion.actualizar(parseInt(id), datosActualizacion);

      return respuestaExitosa(res, {
        instalacion: instalacionActualizada,
        mensaje: 'Instalador asignado exitosamente'
      });

    } catch (error) {
      console.error('Error al asignar instalador:', error);
      return respuestaError(res, error.message || 'Error interno del servidor', 500);
    }
  }

  // Obtener agenda del instalador
  static async obtenerAgendaInstalador(req, res) {
    try {
      const { instalador_id } = req.params;
      const { fecha_desde, fecha_hasta } = req.query;

      if (!instalador_id || isNaN(parseInt(instalador_id))) {
        return respuestaError(res, 'ID de instalador inválido', 400);
      }

      const filtros = {
        instalador_id: parseInt(instalador_id)
      };

      if (fecha_desde) {
        if (!validarFecha(fecha_desde, 'YYYY-MM-DD')) {
          return respuestaError(res, 'El formato de fecha_desde debe ser YYYY-MM-DD', 400);
        }
        filtros.fecha_desde = fecha_desde;
      }

      if (fecha_hasta) {
        if (!validarFecha(fecha_hasta, 'YYYY-MM-DD')) {
          return respuestaError(res, 'El formato de fecha_hasta debe ser YYYY-MM-DD', 400);
        }
        filtros.fecha_hasta = fecha_hasta;
      }

      const resultado = await Instalacion.listar(filtros, { pagina: 1, limite: 100 });

      return respuestaExitosa(res, {
        agenda: resultado.instalaciones,
        total: resultado.paginacion.total
      });

    } catch (error) {
      console.error('Error al obtener agenda del instalador:', error);
      return respuestaError(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = InstalacionesController;