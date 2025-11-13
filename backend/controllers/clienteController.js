// backend/controllers/clienteController.js - VERSIÓN CORREGIDA

const Cliente = require('../models/cliente');
const XLSX = require('xlsx');
const path = require('path');

class ClienteController {
  // Obtener todos los clientes
  static async obtenerTodos(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        estado,
        identificacion,
        nombre,
        sector_id,
        ciudad_id,
        telefono
      } = req.query;

      const offset = (page - 1) * limit;

      const filtros = {
        limite: parseInt(limit),
        offset: parseInt(offset)
      };

      // Agregar filtros si existen
      if (estado) filtros.estado = estado;
      if (identificacion) filtros.identificacion = identificacion;
      if (nombre) filtros.nombre = nombre;
      if (sector_id) filtros.sector_id = sector_id;
      if (ciudad_id) filtros.ciudad_id = ciudad_id;
      if (telefono) filtros.telefono = telefono;

      const [clientes, total] = await Promise.all([
        Cliente.obtenerTodos(filtros),
        Cliente.contarTotal(filtros)
      ]);

      const totalPages = Math.ceil(total / limit);

      // CORRECCIÓN: Formatear fechas correctamente para evitar desfase
      const clientesFormateados = clientes.map(cliente => ({
        ...cliente,
        fecha_registro: cliente.fecha_registro ? new Date(cliente.fecha_registro).toISOString().split('T')[0] : null,
        fecha_inicio_servicio: cliente.fecha_inicio_servicio ? new Date(cliente.fecha_inicio_servicio).toISOString().split('T')[0] : null,
        fecha_fin_servicio: cliente.fecha_fin_servicio ? new Date(cliente.fecha_fin_servicio).toISOString().split('T')[0] : null,
        created_at: cliente.created_at ? new Date(cliente.created_at).toISOString() : null,
        updated_at: cliente.updated_at ? new Date(cliente.updated_at).toISOString() : null
      }));

      res.json({
        success: true,
        data: clientesFormateados,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // NUEVO: Función para exportar clientes
  static async exportarClientes(req, res) {
    try {
      console.log('🔄 Iniciando exportación de clientes');

      const {
        format = 'excel',
        estado,
        sector_id,
        ciudad_id,
        fechaInicio,
        fechaFin
      } = req.query;

      // Construir filtros para la exportación
      const filtros = {};

      if (estado) filtros.estado = estado;
      if (sector_id) filtros.sector_id = sector_id;
      if (ciudad_id) filtros.ciudad_id = ciudad_id;

      // CORRECCIÓN: Agregar filtros de fecha si se proporcionan
      if (fechaInicio) filtros.fecha_inicio = fechaInicio;
      if (fechaFin) filtros.fecha_fin = fechaFin;

      // Obtener todos los clientes que coincidan con los filtros
      const clientes = await Cliente.obtenerTodosParaExportar(filtros);

      if (!clientes || clientes.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron clientes para exportar'
        });
      }

      console.log(`📊 Exportando ${clientes.length} clientes`);

      // CORRECCIÓN: Formatear datos para exportación con fechas corregidas
      const datosExportacion = clientes.map(cliente => ({
        'ID': cliente.id,
        'Identificación': cliente.identificacion,
        'Tipo Documento': cliente.tipo_documento,
        'Nombre': cliente.nombre,
        'Dirección': cliente.direccion,
        'Barrio': cliente.barrio,
        'Ciudad': cliente.ciudad_nombre || '',
        'Sector': cliente.sector_codigo ? `${cliente.sector_codigo} - ${cliente.sector_nombre}` : '',
        'Estrato': cliente.estrato,
        'Teléfono': cliente.telefono,
        'Teléfono 2': cliente.telefono_2 || '',
        'Email': cliente.email || '',
        'Estado': cliente.estado,
        'Fecha Registro': cliente.fecha_registro ? ClienteController.formatearFechaExportacion(cliente.fecha_registro) : '',
        'Fecha Inicio Servicio': cliente.fecha_inicio_servicio ? ClienteController.formatearFechaExportacion(cliente.fecha_inicio_servicio) : '',
        'Fecha Fin Servicio': cliente.fecha_fin_servicio ? ClienteController.formatearFechaExportacion(cliente.fecha_fin_servicio) : '',
        'MAC Address': cliente.mac_address || '',
        'IP Asignada': cliente.ip_asignada || '',
        'TAP': cliente.tap || '',
        'Puerto': cliente.puerto || '',
        'Contrato': cliente.numero_contrato || '',
        'Ruta': cliente.ruta || '',
        'Requiere Reconexión': cliente.requiere_reconexion ? 'Sí' : 'No',
        'Código Usuario': cliente.codigo_usuario || '',
        'Observaciones': cliente.observaciones || '',
        'Fecha Creación': cliente.created_at ? ClienteController.formatearFechaHoraExportacion(cliente.created_at) : '',
        'Última Actualización': cliente.updated_at ? ClienteController.formatearFechaHoraExportacion(cliente.updated_at) : ''
      }));

      if (format === 'csv') {
        // Exportar como CSV
        const csv = ClienteController.convertirACSV(datosExportacion);
        const fechaActual = new Date().toISOString().split('T')[0];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="clientes_${fechaActual}.csv"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        // Agregar BOM para compatibilidad con Excel
        res.write('\uFEFF');
        res.end(csv);
      } else {
        // Exportar como Excel
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(datosExportacion);

        // CORRECCIÓN: Configurar anchos de columna apropiados
        const columnWidths = [
          { wch: 8 },   // ID
          { wch: 15 },  // Identificación
          { wch: 12 },  // Tipo Documento
          { wch: 30 },  // Nombre
          { wch: 40 },  // Dirección
          { wch: 20 },  // Barrio
          { wch: 15 },  // Ciudad
          { wch: 25 },  // Sector
          { wch: 8 },   // Estrato
          { wch: 15 },  // Teléfono
          { wch: 15 },  // Teléfono 2
          { wch: 25 },  // Email
          { wch: 12 },  // Estado
          { wch: 12 },  // Fecha Registro
          { wch: 15 },  // Fecha Inicio Servicio
          { wch: 15 },  // Fecha Fin Servicio
          { wch: 18 },  // MAC Address
          { wch: 12 },  // IP Asignada
          { wch: 10 },  // TAP
          { wch: 10 },  // Puerto
          { wch: 15 },  // Contrato
          { wch: 8 },   // Ruta
          { wch: 12 },  // Requiere Reconexión
          { wch: 15 },  // Código Usuario
          { wch: 30 },  // Observaciones
          { wch: 18 },  // Fecha Creación
          { wch: 18 }   // Última Actualización
        ];

        worksheet['!cols'] = columnWidths;

        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

        // Generar buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const fechaActual = new Date().toISOString().split('T')[0];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="clientes_${fechaActual}.xlsx"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        res.end(buffer);
      }

      console.log('✅ Exportación completada exitosamente');

    } catch (error) {
      console.error('❌ Error al exportar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor durante la exportación',
        error: error.message
      });
    }
  }

  // CORRECCIÓN: Función auxiliar para formatear fechas en exportación
  static formatearFechaExportacion(fecha) {
    if (!fecha) return '';

    try {
      const fechaObj = new Date(fecha);
      // Ajustar por zona horaria para evitar desfase
      const offsetMinutos = fechaObj.getTimezoneOffset();
      fechaObj.setMinutes(fechaObj.getMinutes() + offsetMinutos);

      return fechaObj.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return fecha;
    }
  }

  // Función auxiliar para formatear fecha y hora
  static formatearFechaHoraExportacion(fechaHora) {
    if (!fechaHora) return '';

    try {
      return new Date(fechaHora).toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha y hora:', error);
      return fechaHora;
    }
  }

  // Función auxiliar para convertir a CSV
  static convertirACSV(datos) {
    if (!datos || datos.length === 0) return '';

    const headers = Object.keys(datos[0]);
    const csvHeaders = headers.join(',');

    const csvRows = datos.map(row => {
      return headers.map(header => {
        const value = row[header] || '';
        // Escapar comillas y envolver en comillas si contiene comas
        const escapedValue = value.toString().replace(/"/g, '""');
        return escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Obtener cliente por ID
  static async obtenerPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      const cliente = await Cliente.obtenerPorId(id);

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // CORRECCIÓN: Formatear fechas antes de enviar respuesta
      const clienteFormateado = {
        ...cliente,
        fecha_registro: cliente.fecha_registro ? new Date(cliente.fecha_registro).toISOString().split('T')[0] : null,
        fecha_inicio_servicio: cliente.fecha_inicio_servicio ? new Date(cliente.fecha_inicio_servicio).toISOString().split('T')[0] : null,
        fecha_fin_servicio: cliente.fecha_fin_servicio ? new Date(cliente.fecha_fin_servicio).toISOString().split('T')[0] : null
      };

      res.json({
        success: true,
        data: clienteFormateado
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nuevo cliente
  static async crear(req, res) {
    try {
      console.log('🔍 DEBUG - Crear Cliente');
      console.log('Body recibido:', JSON.stringify(req.body, null, 2));

      // Validaciones básicas mínimas
      const { identificacion, nombre, direccion } = req.body;

      if (!identificacion || !nombre || !direccion) {
        console.log('❌ Faltan campos requeridos:', {
          identificacion: !!identificacion,
          nombre: !!nombre,
          direccion: !!direccion
        });

        return res.status(400).json({
          success: false,
          message: 'Identificación, nombre y dirección son campos requeridos'
        });
      }

      // CORRECCIÓN: Procesar fechas correctamente antes de guardar
      const datosCliente = { ...req.body };

      // Convertir fechas al formato correcto
      if (datosCliente.fecha_registro) {
        datosCliente.fecha_registro = ClienteController.procesarFecha(datosCliente.fecha_registro);
      }

      if (datosCliente.fecha_inicio_servicio) {
        datosCliente.fecha_inicio_servicio = ClienteController.procesarFecha(datosCliente.fecha_inicio_servicio);
      }

      if (datosCliente.fecha_fin_servicio) {
        datosCliente.fecha_fin_servicio = ClienteController.procesarFecha(datosCliente.fecha_fin_servicio);
      }

      // CORRECCIÓN: Validar sincronización ciudad-sector
      if (datosCliente.sector_id && datosCliente.ciudad_id) {
        const sectorValido = await Cliente.validarSectorCiudad(datosCliente.sector_id, datosCliente.ciudad_id);
        if (!sectorValido) {
          return res.status(400).json({
            success: false,
            message: 'El sector seleccionado no pertenece a la ciudad especificada'
          });
        }
      }

      console.log('✅ Datos procesados:', datosCliente);

      const clienteId = await Cliente.crear(datosCliente);
      const clienteCreado = await Cliente.obtenerPorId(clienteId);

      // Crear notificación de nuevo cliente
      try {
        const Notificacion = require('../models/notificacion');
        await Notificacion.notificarNuevoCliente(clienteId, nombre);
        console.log('🔔 Notificación de nuevo cliente creada');
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError);
        // No fallar la creación del cliente si falla la notificación
      }

      res.status(201).json({
        success: true,
        data: clienteCreado,
        message: 'Cliente creado exitosamente'
      });

      const serviciosConInstalacion = serviciosCreados.filter(s => s.requiere_instalacion);
if (serviciosConInstalacion.length > 0) {
  try {
    await conexion.execute(`
      INSERT INTO instalaciones (
        cliente_id, 
        tipo_instalacion, 
        estado, 
        fecha_programada,
        direccion_instalacion,
        barrio,
        telefono_contacto,
        observaciones, 
        created_at
      ) VALUES (?, 'nueva', 'programada', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ?, ?, ?, 
               'Instalación generada automáticamente', NOW())
    `, [
      clienteId,
      datosCliente.direccion,
      datosCliente.barrio || '',
      datosCliente.telefono || ''
    ]);

          console.log(`🔧 Instalación automática creada para cliente ${clienteId}`);
        } catch (error) {
          console.warn('⚠️ Error creando instalación automática:', error.message);
        }
      }

    } catch (error) {
      console.error('Error al crear cliente:', error);

      if (error.message.includes('Duplicate entry')) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un cliente con esta identificación'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // CORRECCIÓN: Función auxiliar para procesar fechas
  static procesarFecha(fecha) {
    if (!fecha) return null;

    try {
      // Si viene como string de fecha, asegurar formato YYYY-MM-DD
      if (typeof fecha === 'string') {
        const fechaObj = new Date(fecha + 'T00:00:00.000Z');
        return fechaObj.toISOString().split('T')[0];
      }

      return fecha;
    } catch (error) {
      console.error('Error procesando fecha:', error);
      return null;
    }
  }

  // Actualizar cliente
  static async actualizar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      // Verificar que el cliente existe
      const clienteExistente = await Cliente.obtenerPorId(id);
      if (!clienteExistente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // CORRECCIÓN: Procesar fechas en actualización
      const datosActualizacion = { ...req.body };

      if (datosActualizacion.fecha_registro) {
        datosActualizacion.fecha_registro = ClienteController.procesarFecha(datosActualizacion.fecha_registro);
      }

      if (datosActualizacion.fecha_inicio_servicio) {
        datosActualizacion.fecha_inicio_servicio = ClienteController.procesarFecha(datosActualizacion.fecha_inicio_servicio);
      }

      if (datosActualizacion.fecha_fin_servicio) {
        datosActualizacion.fecha_fin_servicio = ClienteController.procesarFecha(datosActualizacion.fecha_fin_servicio);
      }

      // CORRECCIÓN: Validar sincronización ciudad-sector en actualización
      if (datosActualizacion.sector_id && datosActualizacion.ciudad_id) {
        const sectorValido = await Cliente.validarSectorCiudad(datosActualizacion.sector_id, datosActualizacion.ciudad_id);
        if (!sectorValido) {
          return res.status(400).json({
            success: false,
            message: 'El sector seleccionado no pertenece a la ciudad especificada'
          });
        }
      }

      await Cliente.actualizar(id, datosActualizacion);
      const clienteActualizado = await Cliente.obtenerPorId(id);

      res.json({
        success: true,
        data: clienteActualizado,
        message: 'Cliente actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error al actualizar cliente:', error);

      if (error.message.includes('Duplicate entry')) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe otro cliente con esta identificación'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar cliente
  static async eliminar(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      await Cliente.eliminar(id);

      res.json({
        success: true,
        message: 'Cliente eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);

      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('servicios activos')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Buscar clientes
  static async buscar(req, res) {
    try {
      const { q: termino, estado } = req.query;

      if (!termino || termino.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const filtros = {};
      if (estado) filtros.estado = estado;

      const clientes = await Cliente.buscar(termino.trim(), filtros);

      res.json({
        success: true,
        data: clientes
      });
    } catch (error) {
      console.error('Error en búsqueda de clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas
  static async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await Cliente.obtenerEstadisticas();

      res.json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener cliente por identificación
  static async obtenerPorIdentificacion(req, res) {
    try {
      const { identificacion } = req.params;

      if (!identificacion) {
        return res.status(400).json({
          success: false,
          message: 'Identificación requerida'
        });
      }

      const cliente = await Cliente.obtenerPorIdentificacion(identificacion);

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      console.error('Error al obtener cliente por identificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ClienteController;