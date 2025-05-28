// backend/controllers/geographyController.js

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class GeographyController {
  
  // ========================================
  // DEPARTAMENTOS
  // ========================================
  
  // Obtener todos los departamentos
  static async getDepartments(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [departments] = await connection.execute(`
        SELECT 
          d.*,
          COUNT(c.id) as total_ciudades
        FROM departamentos d
        LEFT JOIN ciudades c ON d.id = c.departamento_id
        GROUP BY d.id
        ORDER BY d.nombre ASC
      `);
      
      connection.release();
      
      return success(res, 'Departamentos obtenidos exitosamente', departments);
      
    } catch (err) {
      logger.error('Error obteniendo departamentos:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear departamento
  static async createDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
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
        return error(res, 'Ya existe un departamento con ese código o nombre', 400);
      }
      
      const [result] = await connection.execute(
        'INSERT INTO departamentos (codigo, nombre) VALUES (?, ?)',
        [codigo, nombre]
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
      
      return success(res, 'Departamento creado exitosamente', newDept[0], 201);
      
    } catch (err) {
      logger.error('Error creando departamento:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar departamento
  static async updateDepartment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
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
        return error(res, 'Departamento no encontrado', 404);
      }
      
      // Verificar duplicados (excluyendo el actual)
      const [duplicates] = await connection.execute(
        'SELECT id FROM departamentos WHERE (codigo = ? OR nombre = ?) AND id != ?',
        [codigo, nombre, id]
      );
      
      if (duplicates.length > 0) {
        connection.release();
        return error(res, 'Ya existe otro departamento con ese código o nombre', 400);
      }
      
      await connection.execute(
        'UPDATE departamentos SET codigo = ?, nombre = ? WHERE id = ?',
        [codigo, nombre, id]
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
      
      return success(res, 'Departamento actualizado exitosamente', updated[0]);
      
    } catch (err) {
      logger.error('Error actualizando departamento:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ========================================
  // CIUDADES
  // ========================================
  
  // Obtener ciudades (con filtros)
  static async getCities(req, res) {
    try {
      const { departamento_id } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          c.*,
          d.nombre as departamento_nombre,
          COUNT(s.id) as total_sectores
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN sectores s ON c.id = s.ciudad_id
      `;
      
      let params = [];
      
      if (departamento_id) {
        query += ' WHERE c.departamento_id = ?';
        params.push(departamento_id);
      }
      
      query += ' GROUP BY c.id ORDER BY d.nombre ASC, c.nombre ASC';
      
      const [cities] = await connection.execute(query, params);
      
      connection.release();
      
      return success(res, 'Ciudades obtenidas exitosamente', cities);
      
    } catch (err) {
      logger.error('Error obteniendo ciudades:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear ciudad
  static async createCity(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
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
        return error(res, 'Departamento no encontrado', 400);
      }
      
      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM ciudades WHERE codigo = ? OR (nombre = ? AND departamento_id = ?)',
        [codigo, nombre, departamento_id]
      );
      
      if (existing.length > 0) {
        connection.release();
        return error(res, 'Ya existe una ciudad con ese código o nombre en este departamento', 400);
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
      
      return success(res, 'Ciudad creada exitosamente', newCity[0], 201);
      
    } catch (err) {
      logger.error('Error creando ciudad:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // ========================================
  // SECTORES
  // ========================================
  
  // Obtener sectores
  static async getSectors(req, res) {
    try {
      const { ciudad_id } = req.query;
      
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          s.*,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre,
          COUNT(cl.id) as total_clientes
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        LEFT JOIN clientes cl ON s.id = cl.sector_id
      `;
      
      let params = [];
      
      if (ciudad_id) {
        query += ' WHERE s.ciudad_id = ?';
        params.push(ciudad_id);
      }
      
      query += ' GROUP BY s.id ORDER BY d.nombre ASC, c.nombre ASC, s.nombre ASC';
      
      const [sectors] = await connection.execute(query, params);
      
      connection.release();
      
      return success(res, 'Sectores obtenidos exitosamente', sectors);
      
    } catch (err) {
      logger.error('Error obteniendo sectores:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Crear sector
  static async createSector(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const { codigo, nombre, ciudad_id } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar que la ciudad existe
      if (ciudad_id) {
        const [cityExists] = await connection.execute(
          'SELECT id FROM ciudades WHERE id = ?',
          [ciudad_id]
        );
        
        if (cityExists.length === 0) {
          connection.release();
          return error(res, 'Ciudad no encontrada', 400);
        }
      }
      
      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM sectores WHERE codigo = ?',
        [codigo]
      );
      
      if (existing.length > 0) {
        connection.release();
        return error(res, 'Ya existe un sector con ese código', 400);
      }
      
      const [result] = await connection.execute(
        'INSERT INTO sectores (codigo, nombre, ciudad_id, activo) VALUES (?, ?, ?, 1)',
        [codigo, nombre, ciudad_id || null]
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
      
      return success(res, 'Sector creado exitosamente', newSector[0], 201);
      
    } catch (err) {
      logger.error('Error creando sector:', err);
      return error(res, 'Error interno del servidor', 500);
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
        return error(res, 'Sector no encontrado', 404);
      }
      
      const newStatus = sector[0].activo ? 0 : 1;
      
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
      
      return success(res, `Sector ${newStatus ? 'activado' : 'desactivado'} exitosamente`, {
        activo: newStatus === 1
      });
      
    } catch (err) {
      logger.error('Error cambiando estado del sector:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = GeographyController;