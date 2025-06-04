// backend/controllers/inventoryController.js

const InventoryModel = require('../models/inventario');
const { validationResult } = require('express-validator');

class InventoryController {

  // ==========================================
  // GESTIÓN DE EQUIPOS
  // ==========================================

  /**
   * Obtener todos los equipos con filtros y paginación
   */
  static async getAllEquipment(req, res) {
    try {
      const filters = {
        tipo: req.query.tipo,
        estado: req.query.estado,
        instalador_id: req.query.instalador_id,
        search: req.query.search,
        disponible: req.query.disponible === 'true',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        orderBy: req.query.orderBy || 'updated_at',
        orderDirection: req.query.orderDirection || 'DESC'
      };

      // Calcular offset para paginación
      filters.offset = (filters.page - 1) * filters.limit;

      const result = await InventoryModel.getAll(filters);
      
      res.json({
        success: true,
        message: {
          equipos: result.equipos,
          pagination: {
            currentPage: filters.page,
            totalPages: result.pagination.pages,
            totalItems: result.pagination.total,
            itemsPerPage: filters.limit,
            hasNextPage: filters.page < result.pagination.pages,
            hasPrevPage: filters.page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error en getAllEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener equipo por ID
   */
  static async getEquipmentById(req, res) {
    try {
      const { id } = req.params;
      const equipo = await InventoryModel.getById(id);

      if (!equipo) {
        return res.status(404).json({
          success: false,
          message: 'Equipo no encontrado'
        });
      }

      res.json({
        success: true,
        data: equipo
      });
    } catch (error) {
      console.error('Error en getEquipmentById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Crear nuevo equipo
   */
  static async createEquipment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      // Verificar que el código no exista
      const codeAvailable = await InventoryModel.checkCodeAvailability(req.body.codigo);
      if (!codeAvailable) {
        return res.status(400).json({
          success: false,
          message: 'El código del equipo ya existe'
        });
      }

      const equipoData = {
        codigo: req.body.codigo.toUpperCase().trim(),
        nombre: req.body.nombre.trim(),
        tipo: req.body.tipo,
        marca: req.body.marca?.trim(),
        modelo: req.body.modelo?.trim(),
        numero_serie: req.body.numero_serie?.trim(),
        estado: req.body.estado || 'disponible',
        precio_compra: req.body.precio_compra,
        fecha_compra: req.body.fecha_compra,
        proveedor: req.body.proveedor?.trim(),
        ubicacion: req.body.ubicacion?.trim(),
        observaciones: req.body.observaciones?.trim()
      };

      const nuevoEquipo = await InventoryModel.create(equipoData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Equipo creado exitosamente',
        data: nuevoEquipo
      });
    } catch (error) {
      console.error('Error en createEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Actualizar equipo
   */
  static async updateEquipment(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      // Verificar que el equipo existe
      const equipoExistente = await InventoryModel.getById(id);
      if (!equipoExistente) {
        return res.status(404).json({
          success: false,
          message: 'Equipo no encontrado'
        });
      }

      // Verificar que el código no exista en otro equipo
      if (req.body.codigo && req.body.codigo !== equipoExistente.codigo) {
        const codeAvailable = await InventoryModel.checkCodeAvailability(req.body.codigo, id);
        if (!codeAvailable) {
          return res.status(400).json({
            success: false,
            message: 'El código del equipo ya existe'
          });
        }
      }

      const equipoData = {
        codigo: req.body.codigo?.toUpperCase().trim() || equipoExistente.codigo,
        nombre: req.body.nombre?.trim() || equipoExistente.nombre,
        tipo: req.body.tipo || equipoExistente.tipo,
        marca: req.body.marca?.trim() || equipoExistente.marca,
        modelo: req.body.modelo?.trim() || equipoExistente.modelo,
        numero_serie: req.body.numero_serie?.trim() || equipoExistente.numero_serie,
        precio_compra: req.body.precio_compra !== undefined ? req.body.precio_compra : equipoExistente.precio_compra,
        fecha_compra: req.body.fecha_compra || equipoExistente.fecha_compra,
        proveedor: req.body.proveedor?.trim() || equipoExistente.proveedor,
        ubicacion: req.body.ubicacion?.trim() || equipoExistente.ubicacion,
        observaciones: req.body.observaciones?.trim() || equipoExistente.observaciones
      };

      const equipoActualizado = await InventoryModel.update(id, equipoData, req.user.id);

      res.json({
        success: true,
        message: 'Equipo actualizado exitosamente',
        data: equipoActualizado
      });
    } catch (error) {
      console.error('Error en updateEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Eliminar equipo
   */
  static async deleteEquipment(req, res) {
    try {
      const { id } = req.params;

      await InventoryModel.delete(id);

      res.json({
        success: true,
        message: 'Equipo eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error en deleteEquipment:', error);
      
      if (error.message.includes('No se puede eliminar')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==========================================
  // GESTIÓN DE ASIGNACIONES
  // ==========================================

  /**
   * Asignar equipo a instalador
   */
  static async assignToInstaller(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const assignmentData = {
        ubicacion: req.body.ubicacion?.trim(),
        notas: req.body.notas?.trim()
      };

      const equipoAsignado = await InventoryModel.assignToInstaller(
        id,
        req.body.instalador_id,
        assignmentData,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Equipo asignado exitosamente al instalador',
        data: equipoAsignado
      });
    } catch (error) {
      console.error('Error en assignToInstaller:', error);
      
      if (error.message.includes('no está disponible') || error.message.includes('no es un instalador')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Devolver equipo
   */
  static async returnEquipment(req, res) {
    try {
      const { id } = req.params;

      const returnData = {
        ubicacion_devolucion: req.body.ubicacion_devolucion?.trim() || 'Almacén Principal',
        notas: req.body.notas?.trim()
      };

      const equipoDevuelto = await InventoryModel.returnEquipment(id, returnData, req.user.id);

      res.json({
        success: true,
        message: 'Equipo devuelto exitosamente',
        data: equipoDevuelto
      });
    } catch (error) {
      console.error('Error en returnEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Marcar equipo como instalado
   */
  static async markAsInstalled(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array()
        });
      }

      const installationData = {
        instalador_id: req.body.instalador_id,
        ubicacion_cliente: req.body.ubicacion_cliente?.trim(),
        coordenadas_lat: req.body.coordenadas_lat,
        coordenadas_lng: req.body.coordenadas_lng,
        notas: req.body.notas?.trim(),
        cliente_id: req.body.cliente_id,
        instalacion_id: req.body.instalacion_id
      };

      const equipoInstalado = await InventoryModel.markAsInstalled(id, installationData, req.user.id);

      res.json({
        success: true,
        message: 'Equipo marcado como instalado exitosamente',
        data: equipoInstalado
      });
    } catch (error) {
      console.error('Error en markAsInstalled:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener equipos de un instalador
   */
  static async getInstallerEquipment(req, res) {
    try {
      const { instaladorId } = req.params;
      const { estado } = req.query;

      const equipos = await InventoryModel.getByInstaller(instaladorId, estado);

      res.json({
        success: true,
        message: equipos
      });
    } catch (error) {
      console.error('Error en getInstallerEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Actualizar ubicación de equipo (para instaladores móviles)
   */
  static async updateLocation(req, res) {
    try {
      const { id } = req.params;

      const locationData = {
        lat: req.body.lat,
        lng: req.body.lng,
        direccion: req.body.direccion?.trim()
      };

      const equipoActualizado = await InventoryModel.updateLocation(id, locationData, req.user.id);

      res.json({
        success: true,
        message: 'Ubicación actualizada exitosamente',
        data: equipoActualizado
      });
    } catch (error) {
      console.error('Error en updateLocation:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==========================================
  // HISTORIAL Y REPORTES
  // ==========================================

  /**
   * Obtener historial de un equipo
   */
  static async getEquipmentHistory(req, res) {
    try {
      const { id } = req.params;

      const historial = await InventoryModel.getHistory(id);

      res.json({
        success: true,
        message: historial
      });
    } catch (error) {
      console.error('Error en getEquipmentHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener historial de un instalador
   */
  static async getInstallerHistory(req, res) {
    try {
      const { instaladorId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const historial = await InventoryModel.getInstallerHistory(instaladorId, limit);

      res.json({
        success: true,
        message: historial
      });
    } catch (error) {
      console.error('Error en getInstallerHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener estadísticas del inventario
   */
  static async getStats(req, res) {
    try {
      const stats = await InventoryModel.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener reporte por rango de fechas
   */
  static async getReportByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const { tipo } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son requeridas'
        });
      }

      const reporte = await InventoryModel.getReportByDateRange(startDate, endDate, tipo);

      res.json({
        success: true,
        data: reporte
      });
    } catch (error) {
      console.error('Error en getReportByDateRange:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Obtener equipos disponibles
   */
  static async getAvailableEquipment(req, res) {
    try {
      const { tipo } = req.query;

      const equipos = await InventoryModel.getAvailableEquipment(tipo);

      res.json({
        success: true,
        message: equipos
      });
    } catch (error) {
      console.error('Error en getAvailableEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener instaladores activos
   */
  static async getActiveInstallers(req, res) {
    try {
      const instaladores = await InventoryModel.getActiveInstallers();

      res.json({
        success: true,
        message: instaladores
      });
    } catch (error) {
      console.error('Error en getActiveInstallers:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Buscar equipos
   */
  static async searchEquipment(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const equipos = await InventoryModel.search(q.trim());

      res.json({
        success: true,
        message: equipos
      });
    } catch (error) {
      console.error('Error en searchEquipment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener tipos de equipos
   */
  static async getTypes(req, res) {
    try {
      const tipos = await InventoryModel.getTypes();

      res.json({
        success: true,
        message: tipos
      });
    } catch (error) {
      console.error('Error en getTypes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener marcas por tipo
   */
  static async getBrandsByType(req, res) {
    try {
      const { tipo } = req.params;

      const marcas = await InventoryModel.getBrandsByType(tipo);

      res.json({
        success: true,
        message: marcas
      });
    } catch (error) {
      console.error('Error en getBrandsByType:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verificar disponibilidad de código
   */
  static async checkCodeAvailability(req, res) {
    try {
      const { codigo } = req.params;
      const { excludeId } = req.query;

      const available = await InventoryModel.checkCodeAvailability(codigo, excludeId);

      res.json({
        success: true,
        data: {
          available,
          codigo
        }
      });
    } catch (error) {
      console.error('Error en checkCodeAvailability:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = InventoryController;