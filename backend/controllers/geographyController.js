// backend/controllers/geographyController.js - CONTROLADOR GEOGRÁFICO COMPLETO

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/responses');
const pool = require('../config/database');

class GeographyController {
  
  // ========================================
  // DEPARTAMENTOS
  // ========================================
  
  // Obtener todos los departamentos
  static async getDepartments(req, res) {
    try {
      const { includeStats = 'false' } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          d.id,
          d.codigo,
          d.nombre
      `;
      
      if (includeStats === 'true') {
        query += `,
          COUNT(DISTINCT c.id) as total_ciudades,
          COUNT(DISTINCT s.id) as total_sectores,
          COUNT(DISTINCT cl.id) as total_clientes
        `;
      }
      
      query += `
        FROM departamentos d
      `;
      
      if (includeStats === 'true') {
        query += `
          LEFT JOIN ciudades c ON d.id = c.departamento_id
          LEFT JOIN sectores s ON c.id = s.ciudad_id
          LEFT JOIN clientes cl ON s.id = cl.sector_id
          GROUP BY d.id, d.codigo, d.nombre
        `;
      }
      
      query += ` ORDER BY d.nombre ASC`;
      
      const [departments] = await connection.execute(query);
      
      connection.release();
      
      return ApiResponse.success(res, departments, 'Departamentos obtenidos exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo departamentos:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener departamento por ID
  static async getDepartmentById(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [departments] = await connection.execute(`
        SELECT 
          d.*,
          COUNT(DISTINCT c.id) as total_ciudades,
          COUNT(DISTINCT s.id) as total_sectores,
          COUNT(DISTINCT cl.id) as total_clientes
        FROM departamentos d
        LEFT JOIN ciudades c ON d.id = c.departamento_id
        LEFT JOIN sectores s ON c.id = s.ciudad_id
        LEFT JOIN clientes cl ON s.id = cl.sector_id
        WHERE d.id = ?
        GROUP BY d.id
      `, [id]);
      
      connection.release();
      
      if (departments.length === 0) {
        return ApiResponse.notFound(res, 'Departamento no encontrado');
      }
      
      return ApiResponse.success(res, departments[0], 'Departamento obtenido exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo departamento:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear departamento
  static async createDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar si ya existe
      const [existing] = await connection.execute(
        'SELECT id FROM departamentos WHERE codigo = ? OR nombre = ?',
        [codigo, nombre]
      );
      
      if (existing.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe un departamento con ese código o nombre');
      }
      
      const [result] = await connection.execute(
        'INSERT INTO departamentos (codigo, nombre) VALUES (?, ?)',
        [codigo.toUpperCase(), nombre]
      );
      
      // Obtener el departamento creado
      const [newDept] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [result.insertId]
      );
      
      connection.release();
      
      logger.info('Departamento creado', {
        deptId: result.insertId,
        codigo: codigo,
        nombre: nombre,
        createdBy: req.user.id
      });
      
      return ApiResponse.created(res, newDept[0], 'Departamento creado exitosamente');
      
    } catch (error) {
      logger.error('Error creando departamento:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar departamento
  static async updateDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { id } = req.params;
      const { codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Departamento no encontrado');
      }
      
      // Verificar duplicados (excluyendo el actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM departamentos WHERE (codigo = ? OR nombre = ?) AND id != ?',
        [codigo, nombre, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe otro departamento con ese código o nombre');
      }
      
      await connection.execute(
        'UPDATE departamentos SET codigo = ?, nombre = ? WHERE id = ?',
        [codigo.toUpperCase(), nombre, id]
      );
      
      // Obtener departamento actualizado
      const [updated] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [id]
      );
      
      connection.release();
      
      logger.info('Departamento actualizado', {
        deptId: id,
        updatedBy: req.user.id
      });
      
      return ApiResponse.success(res, updated[0], 'Departamento actualizado exitosamente');
      
    } catch (error) {
      logger.error('Error actualizando departamento:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Eliminar departamento
  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Departamento no encontrado');
      }
      
      // Verificar si tiene ciudades asociadas
      const [cities] = await connection.execute(
        'SELECT COUNT(*) as count FROM ciudades WHERE departamento_id = ?',
        [id]
      );
      
      if (cities[0].count > 0) {
        connection.release();
        return ApiResponse.error(res, 'No se puede eliminar el departamento porque tiene ciudades asociadas', 400);
      }
      
      await connection.execute('DELETE FROM departamentos WHERE id = ?', [id]);
      
      connection.release();
      
      logger.info('Departamento eliminado', {
        deptId: id,
        deletedBy: req.user.id
      });
      
      return ApiResponse.success(res, null, 'Departamento eliminado exitosamente');
      
    } catch (error) {
      logger.error('Error eliminando departamento:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ========================================
  // CIUDADES
  // ========================================
  
  // Obtener ciudades (con filtros)
  static async getCities(req, res) {
    try {
      const { departamento_id, includeStats = 'false' } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          c.id,
          c.departamento_id,
          c.codigo,
          c.nombre,
          d.nombre as departamento_nombre
      `;
      
      if (includeStats === 'true') {
        query += `,
          COUNT(DISTINCT s.id) as total_sectores,
          COUNT(DISTINCT cl.id) as total_clientes
        `;
      }
      
      query += `
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
      `;
      
      if (includeStats === 'true') {
        query += `
          LEFT JOIN sectores s ON c.id = s.ciudad_id
          LEFT JOIN clientes cl ON s.id = cl.sector_id
        `;
      }
      
      let params = [];
      
      if (departamento_id) {
        query += ' WHERE c.departamento_id = ?';
        params.push(departamento_id);
      }
      
      if (includeStats === 'true') {
        query += ' GROUP BY c.id, c.departamento_id, c.codigo, c.nombre, d.nombre';
      }
      
      query += ' ORDER BY d.nombre ASC, c.nombre ASC';
      
      const [cities] = await connection.execute(query, params);
      
      connection.release();
      
      return ApiResponse.success(res, cities, 'Ciudades obtenidas exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo ciudades:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener ciudad por ID
  static async getCityById(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [cities] = await connection.execute(`
        SELECT 
          c.*,
          d.nombre as departamento_nombre,
          COUNT(DISTINCT s.id) as total_sectores,
          COUNT(DISTINCT cl.id) as total_clientes
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN sectores s ON c.id = s.ciudad_id
        LEFT JOIN clientes cl ON s.id = cl.sector_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);
      
      connection.release();
      
      if (cities.length === 0) {
        return ApiResponse.notFound(res, 'Ciudad no encontrada');
      }
      
      return ApiResponse.success(res, cities[0], 'Ciudad obtenida exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo ciudad:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear ciudad
  static async createCity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { departamento_id, codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que el departamento existe
      const [deptExists] = await connection.execute(
        'SELECT id FROM departamentos WHERE id = ?',
        [departamento_id]
      );
      
      if (deptExists.length === 0) {
        connection.release();
        return ApiResponse.error(res, 'Departamento no encontrado', 400);
      }
      
      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM ciudades WHERE codigo = ? OR (nombre = ? AND departamento_id = ?)',
        [codigo, nombre, departamento_id]
      );
      
      if (existing.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe una ciudad con ese código o nombre en este departamento');
      }
      
      const [result] = await connection.execute(
        'INSERT INTO ciudades (departamento_id, codigo, nombre) VALUES (?, ?, ?)',
        [departamento_id, codigo, nombre]
      );
      
      // Obtener ciudad creada con departamento
      const [newCity] = await connection.execute(`
        SELECT 
          c.*,
          d.nombre as departamento_nombre
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.id = ?
      `, [result.insertId]);
      
      connection.release();
      
      logger.info('Ciudad creada', {
        cityId: result.insertId,
        codigo: codigo,
        nombre: nombre,
        departamento_id: departamento_id,
        createdBy: req.user.id
      });
      
      return ApiResponse.created(res, newCity[0], 'Ciudad creada exitosamente');
      
    } catch (error) {
      logger.error('Error creando ciudad:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar ciudad
  static async updateCity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { id } = req.params;
      const { departamento_id, codigo, nombre } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que la ciudad existe
      const [existing] = await connection.execute(
        'SELECT * FROM ciudades WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Ciudad no encontrada');
      }
      
      // Verificar que el departamento existe
      const [deptExists] = await connection.execute(
        'SELECT id FROM departamentos WHERE id = ?',
        [departamento_id]
      );
      
      if (deptExists.length === 0) {
        connection.release();
        return ApiResponse.error(res, 'Departamento no encontrado', 400);
      }
      
      // Verificar duplicados (excluyendo la actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM ciudades WHERE (codigo = ? OR (nombre = ? AND departamento_id = ?)) AND id != ?',
        [codigo, nombre, departamento_id, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe otra ciudad con ese código o nombre en este departamento');
      }
      
      await connection.execute(
        'UPDATE ciudades SET departamento_id = ?, codigo = ?, nombre = ? WHERE id = ?',
        [departamento_id, codigo, nombre, id]
      );
      
      // Obtener ciudad actualizada
      const [updated] = await connection.execute(`
        SELECT 
          c.*,
          d.nombre as departamento_nombre
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.id = ?
      `, [id]);
      
      connection.release();
      
      logger.info('Ciudad actualizada', {
        cityId: id,
        updatedBy: req.user.id
      });
      
      return ApiResponse.success(res, updated[0], 'Ciudad actualizada exitosamente');
      
    } catch (error) {
      logger.error('Error actualizando ciudad:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Eliminar ciudad
  static async deleteCity(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM ciudades WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Ciudad no encontrada');
      }
      
      // Verificar si tiene sectores asociados
      const [sectors] = await connection.execute(
        'SELECT COUNT(*) as count FROM sectores WHERE ciudad_id = ?',
        [id]
      );
      
      if (sectors[0].count > 0) {
        connection.release();
        return ApiResponse.error(res, 'No se puede eliminar la ciudad porque tiene sectores asociados', 400);
      }
      
      await connection.execute('DELETE FROM ciudades WHERE id = ?', [id]);
      
      connection.release();
      
      logger.info('Ciudad eliminada', {
        cityId: id,
        deletedBy: req.user.id
      });
      
      return ApiResponse.success(res, null, 'Ciudad eliminada exitosamente');
      
    } catch (error) {
      logger.error('Error eliminando ciudad:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ========================================
  // SECTORES
  // ========================================
  
  // Obtener sectores
  static async getSectors(req, res) {
    try {
      const { ciudad_id, activo, includeStats = 'false' } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          s.id,
          s.codigo,
          s.nombre,
          s.ciudad_id,
          s.activo,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
      `;
      
      if (includeStats === 'true') {
        query += `,
          COUNT(DISTINCT cl.id) as total_clientes,
          COUNT(CASE WHEN cl.estado = 'activo' THEN 1 END) as clientes_activos
        `;
      }
      
      query += `
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
      `;
      
      if (includeStats === 'true') {
        query += ` LEFT JOIN clientes cl ON s.id = cl.sector_id`;
      }
      
      let whereConditions = [];
      let params = [];
      
      if (ciudad_id) {
        whereConditions.push('s.ciudad_id = ?');
        params.push(ciudad_id);
      }
      
      if (activo !== undefined) {
        whereConditions.push('s.activo = ?');
        params.push(activo === 'true' ? 1 : 0);
      }
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      if (includeStats === 'true') {
        query += ` GROUP BY s.id, s.codigo, s.nombre, s.ciudad_id, s.activo, c.nombre, d.nombre`;
      }
      
      query += ' ORDER BY d.nombre ASC, c.nombre ASC, s.nombre ASC';
      
      const [sectors] = await connection.execute(query, params);
      
      connection.release();
      
      return ApiResponse.success(res, sectors, 'Sectores obtenidos exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo sectores:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener sector por ID
  static async getSectorById(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [sectors] = await connection.execute(`
        SELECT 
          s.*,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          COUNT(DISTINCT cl.id) as total_clientes,
          COUNT(CASE WHEN cl.estado = 'activo' THEN 1 END) as clientes_activos
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN clientes cl ON s.id = cl.sector_id
        WHERE s.id = ?
        GROUP BY s.id
      `, [id]);
      
      connection.release();
      
      if (sectors.length === 0) {
        return ApiResponse.notFound(res, 'Sector no encontrado');
      }
      
      return ApiResponse.success(res, sectors[0], 'Sector obtenido exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo sector:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear sector
  static async createSector(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { codigo, nombre, ciudad_id } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que la ciudad existe (si se proporciona)
      if (ciudad_id) {
        const [cityExists] = await connection.execute(
          'SELECT id FROM ciudades WHERE id = ?',
          [ciudad_id]
        );
        
        if (cityExists.length === 0) {
          connection.release();
          return ApiResponse.error(res, 'Ciudad no encontrada', 400);
        }
      }
      
      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM sectores WHERE codigo = ?',
        [codigo]
      );
      
      if (existing.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe un sector con ese código');
      }
      
      const [result] = await connection.execute(
        'INSERT INTO sectores (codigo, nombre, ciudad_id, activo) VALUES (?, ?, ?, 1)',
        [codigo.toUpperCase(), nombre, ciudad_id || null]
      );
      
      // Obtener sector creado
      const [newSector] = await connection.execute(`
        SELECT 
          s.*,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE s.id = ?
      `, [result.insertId]);
      
      connection.release();
      
      logger.info('Sector creado', {
        sectorId: result.insertId,
        codigo: codigo,
        nombre: nombre,
        ciudad_id: ciudad_id,
        createdBy: req.user.id
      });
      
      return ApiResponse.created(res, newSector[0], 'Sector creado exitosamente');
      
    } catch (error) {
      logger.error('Error creando sector:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar sector
  static async updateSector(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
      }
      
      const { id } = req.params;
      const { codigo, nombre, ciudad_id } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que el sector existe
      const [existing] = await connection.execute(
        'SELECT * FROM sectores WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Sector no encontrado');
      }
      
      // Verificar que la ciudad existe (si se proporciona)
      if (ciudad_id) {
        const [cityExists] = await connection.execute(
          'SELECT id FROM ciudades WHERE id = ?',
          [ciudad_id]
        );
        
        if (cityExists.length === 0) {
          connection.release();
          return ApiResponse.error(res, 'Ciudad no encontrada', 400);
        }
      }
      
      // Verificar código único (excluyendo el actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM sectores WHERE codigo = ? AND id != ?',
        [codigo, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return ApiResponse.conflict(res, 'Ya existe otro sector con ese código');
      }
      
      await connection.execute(
        'UPDATE sectores SET codigo = ?, nombre = ?, ciudad_id = ? WHERE id = ?',
        [codigo.toUpperCase(), nombre, ciudad_id || null, id]
      );
      
      // Obtener sector actualizado
      const [updated] = await connection.execute(`
        SELECT 
          s.*,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE s.id = ?
      `, [id]);
      
      connection.release();
      
      logger.info('Sector actualizado', {
        sectorId: id,
        updatedBy: req.user.id
      });
      
      return ApiResponse.success(res, updated[0], 'Sector actualizado exitosamente');
      
    } catch (error) {
      logger.error('Error actualizando sector:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Activar/desactivar sector
  static async toggleSector(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      const [sector] = await connection.execute(
        'SELECT * FROM sectores WHERE id = ?',
        [id]
      );
      
      if (sector.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Sector no encontrado');
      }
      
      const newStatus = sector[0].activo ? 0 : 1;
      
      // Si se desactiva, verificar que no tenga clientes activos
      if (newStatus === 0) {
        const [activeClients] = await connection.execute(
          'SELECT COUNT(*) as count FROM clientes WHERE sector_id = ? AND estado = "activo"',
          [id]
        );
        
        if (activeClients[0].count > 0) {
          connection.release();
          return ApiResponse.error(res, 'No se puede desactivar el sector porque tiene clientes activos', 400);
        }
      }
      
      await connection.execute(
        'UPDATE sectores SET activo = ? WHERE id = ?',
        [newStatus, id]
      );
      
      connection.release();
      
      logger.info('Estado de sector cambiado', {
        sectorId: id,
        newStatus: newStatus,
        changedBy: req.user.id
      });
      
      return ApiResponse.success(res, {
        activo: newStatus === 1
      }, `Sector ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      
    } catch (error) {
      logger.error('Error cambiando estado del sector:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Eliminar sector
  static async deleteSector(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await pool.getConnection();
      
      // Verificar que existe
      const [existing] = await connection.execute(
        'SELECT * FROM sectores WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Sector no encontrado');
      }
      
      // Verificar si tiene clientes asociados
      const [clients] = await connection.execute(
        'SELECT COUNT(*) as count FROM clientes WHERE sector_id = ?',
        [id]
      );
      
      if (clients[0].count > 0) {
        connection.release();
        return ApiResponse.error(res, 'No se puede eliminar el sector porque tiene clientes asociados', 400);
      }
      
      await connection.execute('DELETE FROM sectores WHERE id = ?', [id]);
      
      connection.release();
      
      logger.info('Sector eliminado', {
        sectorId: id,
        deletedBy: req.user.id
      });
      
      return ApiResponse.success(res, null, 'Sector eliminado exitosamente');
      
    } catch (error) {
      logger.error('Error eliminando sector:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // ========================================
  // MÉTODOS DE UTILIDAD
  // ========================================

  // Obtener jerarquía geográfica completa
  static async getGeographyHierarchy(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [departments] = await connection.execute(`
        SELECT 
          d.id,
          d.codigo,
          d.nombre,
          COUNT(DISTINCT c.id) as total_ciudades,
          COUNT(DISTINCT s.id) as total_sectores
        FROM departamentos d
        LEFT JOIN ciudades c ON d.id = c.departamento_id
        LEFT JOIN sectores s ON c.id = s.ciudad_id
        GROUP BY d.id, d.codigo, d.nombre
        ORDER BY d.nombre ASC
      `);
      
      // Para cada departamento, obtener sus ciudades y sectores
      for (let dept of departments) {
        const [cities] = await connection.execute(`
          SELECT 
            c.id,
            c.codigo,
            c.nombre,
            COUNT(DISTINCT s.id) as total_sectores
          FROM ciudades c
          LEFT JOIN sectores s ON c.id = s.ciudad_id
          WHERE c.departamento_id = ?
          GROUP BY c.id, c.codigo, c.nombre
          ORDER BY c.nombre ASC
        `, [dept.id]);
        
        // Para cada ciudad, obtener sus sectores
        for (let city of cities) {
          const [sectors] = await connection.execute(`
            SELECT id, codigo, nombre, activo
            FROM sectores
            WHERE ciudad_id = ?
            ORDER BY nombre ASC
          `, [city.id]);
          
          city.sectores = sectors;
        }
        
        dept.ciudades = cities;
      }
      
      connection.release();
      
      return ApiResponse.success(res, departments, 'Jerarquía geográfica obtenida exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo jerarquía geográfica:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Buscar ubicaciones por término
  static async searchLocations(req, res) {
    try {
      const { q, type = 'all' } = req.query;
      
      if (!q || q.length < 2) {
        return ApiResponse.error(res, 'El término de búsqueda debe tener al menos 2 caracteres', 400);
      }
      
      const connection = await pool.getConnection();
      
      let results = {
        departamentos: [],
        ciudades: [],
        sectores: []
      };
      
      const searchTerm = `%${q}%`;
      
      // Buscar departamentos
      if (type === 'all' || type === 'departamentos') {
        const [departments] = await connection.execute(`
          SELECT id, codigo, nombre, 'departamento' as tipo
          FROM departamentos
          WHERE nombre LIKE ? OR codigo LIKE ?
          ORDER BY nombre ASC
          LIMIT 10
        `, [searchTerm, searchTerm]);
        
        results.departamentos = departments;
      }
      
      // Buscar ciudades
      if (type === 'all' || type === 'ciudades') {
        const [cities] = await connection.execute(`
          SELECT 
            c.id, 
            c.codigo, 
            c.nombre, 
            c.departamento_id,
            d.nombre as departamento_nombre,
            'ciudad' as tipo
          FROM ciudades c
          LEFT JOIN departamentos d ON c.departamento_id = d.id
          WHERE c.nombre LIKE ? OR c.codigo LIKE ?
          ORDER BY c.nombre ASC
          LIMIT 10
        `, [searchTerm, searchTerm]);
        
        results.ciudades = cities;
      }
      
      // Buscar sectores
      if (type === 'all' || type === 'sectores') {
        const [sectors] = await connection.execute(`
          SELECT 
            s.id, 
            s.codigo, 
            s.nombre, 
            s.ciudad_id,
            s.activo,
            c.nombre as ciudad_nombre,
            d.nombre as departamento_nombre,
            'sector' as tipo
          FROM sectores s
          LEFT JOIN ciudades c ON s.ciudad_id = c.id
          LEFT JOIN departamentos d ON c.departamento_id = d.id
          WHERE s.nombre LIKE ? OR s.codigo LIKE ?
          ORDER BY s.nombre ASC
          LIMIT 10
        `, [searchTerm, searchTerm]);
        
        results.sectores = sectors;
      }
      
      connection.release();
      
      const totalResults = results.departamentos.length + results.ciudades.length + results.sectores.length;
      
      return ApiResponse.success(res, {
        ...results,
        total_resultados: totalResults,
        termino_busqueda: q
      }, 'Búsqueda realizada exitosamente');
      
    } catch (error) {
      logger.error('Error en búsqueda de ubicaciones:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener estadísticas geográficas
  static async getGeographyStats(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [stats] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM departamentos) as total_departamentos,
          (SELECT COUNT(*) FROM ciudades) as total_ciudades,
          (SELECT COUNT(*) FROM sectores) as total_sectores,
          (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
          (SELECT COUNT(*) FROM sectores WHERE activo = 0) as sectores_inactivos,
          (SELECT COUNT(DISTINCT cl.sector_id) FROM clientes cl WHERE cl.sector_id IS NOT NULL) as sectores_con_clientes,
          (SELECT COUNT(*) FROM clientes WHERE sector_id IS NULL) as clientes_sin_sector
      `);
      
      // Departamentos con más ciudades
      const [topDepartments] = await connection.execute(`
        SELECT 
          d.nombre,
          COUNT(c.id) as total_ciudades
        FROM departamentos d
        LEFT JOIN ciudades c ON d.id = c.departamento_id
        GROUP BY d.id, d.nombre
        ORDER BY total_ciudades DESC
        LIMIT 5
      `);
      
      // Sectores con más clientes
      const [topSectors] = await connection.execute(`
        SELECT 
          s.nombre as sector_nombre,
          c.nombre as ciudad_nombre,
          COUNT(cl.id) as total_clientes
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN clientes cl ON s.id = cl.sector_id
        WHERE s.activo = 1
        GROUP BY s.id, s.nombre, c.nombre
        ORDER BY total_clientes DESC
        LIMIT 5
      `);
      
      connection.release();
      
      return ApiResponse.success(res, {
        ...stats[0],
        departamentos_con_mas_ciudades: topDepartments,
        sectores_con_mas_clientes: topSectors
      }, 'Estadísticas geográficas obtenidas exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo estadísticas geográficas:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = GeographyController;