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

  // Crear nuevo cliente
  static async crear(req, res) {
    try {
      // Validaciones básicas
      const { identificacion, nombre, direccion } = req.body;
      
      if (!identificacion || !nombre || !direccion) {
        return res.status(400).json({
          success: false,
          message: 'Identificación, nombre y dirección son requeridos'
        });
      }

      const datosCliente = {
        ...req.body,
        created_by: req.user?.id // ID del usuario autenticado
      };

      const nuevoCliente = await Cliente.crear(datosCliente);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: nuevoCliente
      });
    } catch (error) {
      console.error('Error al crear cliente:', error);
      
      if (error.message.includes('Ya existe un cliente')) {
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

      const clienteActualizado = await Cliente.actualizar(id, req.body);

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: clienteActualizado
      });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      
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