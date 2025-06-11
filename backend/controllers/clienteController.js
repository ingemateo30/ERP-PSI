// backend/controllers/clienteController.js - VERSIÓN SIMPLIFICADA PARA DEBUG

const Cliente = require('../models/cliente');

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

      res.json({
        success: true,
        data: clientes,
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

      res.json({
        success: true,
        data: cliente
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

  // Crear nuevo cliente - VERSIÓN SIMPLIFICADA
  static async crear(req, res) {
    try {
      console.log('🔍 DEBUG - Crear Cliente');
      console.log('Body recibido:', JSON.stringify(req.body, null, 2));

      // Validaciones básicas mínimas
      const { identificacion, nombre, direccion } = req.body;
      
      if (!identificacion || !nombre || !direccion) {
        console.log('❌ Faltan campos requeridos:', { identificacion: !!identificacion, nombre: !!nombre, direccion: !!direccion });
        return res.status(400).json({
          success: false,
          message: 'Identificación, nombre y dirección son requeridos',
          received: {
            identificacion: !!identificacion,
            nombre: !!nombre,
            direccion: !!direccion
          }
        });
      }

      // Preparar datos con valores por defecto seguros
      const datosCliente = {
        identificacion: identificacion.toString().trim(),
        tipo_documento: req.body.tipo_documento || 'cedula',
        nombre: nombre.toString().trim(),
        direccion: direccion.toString().trim(),
        sector_id: req.body.sector_id ? parseInt(req.body.sector_id) : null,
        estrato: req.body.estrato || null,
        barrio: req.body.barrio || null,
        ciudad_id: req.body.ciudad_id ? parseInt(req.body.ciudad_id) : null,
        telefono: req.body.telefono || null,
        telefono_2: req.body.telefono_2 || null,
        correo: req.body.correo || null,
        fecha_registro: req.body.fecha_registro || new Date().toISOString().split('T')[0],
        fecha_hasta: req.body.fecha_hasta || null,
        estado: req.body.estado || 'activo',
        mac_address: req.body.mac_address || null,
        ip_asignada: req.body.ip_asignada || null,
        tap: req.body.tap || null,
        poste: req.body.poste || null,
        contrato: req.body.contrato || null,
        ruta: req.body.ruta || null,
        requiere_reconexion: req.body.requiere_reconexion ? 1 : 0,
        codigo_usuario: req.body.codigo_usuario || null,
        observaciones: req.body.observaciones || null,
        created_by: req.user?.id || 1 // ID del usuario autenticado
      };

      console.log('📤 Datos a enviar al modelo:', JSON.stringify(datosCliente, null, 2));

      const nuevoCliente = await Cliente.crear(datosCliente);

      console.log('✅ Cliente creado exitosamente:', nuevoCliente.id);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: nuevoCliente
      });
    } catch (error) {
      console.error('❌ Error al crear cliente:', error);
      
      if (error.message.includes('Ya existe un cliente')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Actualizar cliente - VERSIÓN SIMPLIFICADA
  static async actualizar(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🔍 DEBUG - Actualizar Cliente');
      console.log('ID:', id);
      console.log('Body recibido:', JSON.stringify(req.body, null, 2));
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cliente inválido'
        });
      }

      // Limpiar datos de entrada - solo incluir campos que no estén vacíos
      const datosLimpios = {};
      
      Object.keys(req.body).forEach(key => {
        const value = req.body[key];
        
        // Solo incluir valores no vacíos
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'sector_id' || key === 'ciudad_id') {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              datosLimpios[key] = numValue;
            }
          } else if (key === 'requiere_reconexion') {
            datosLimpios[key] = value ? 1 : 0;
          } else if (typeof value === 'string') {
            datosLimpios[key] = value.trim();
          } else {
            datosLimpios[key] = value;
          }
        }
      });

      console.log('📤 Datos limpios para actualizar:', JSON.stringify(datosLimpios, null, 2));

      const clienteActualizado = await Cliente.actualizar(id, datosLimpios);

      console.log('✅ Cliente actualizado exitosamente');

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: clienteActualizado
      });
    } catch (error) {
      console.error('❌ Error al actualizar cliente:', error);
      
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Ya existe un cliente')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

  // Validar identificación
  static async validarIdentificacion(req, res) {
    try {
      const { identificacion } = req.params;

      if (!identificacion) {
        return res.status(400).json({
          success: false,
          message: 'Identificación requerida'
        });
      }

      const cliente = await Cliente.obtenerPorIdentificacion(identificacion);

      res.json({
        success: true,
        data: {
          existe: !!cliente,
          cliente: cliente || null
        }
      });
    } catch (error) {
      console.error('Error al validar identificación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = ClienteController;