// backend/controllers/geographyController.js - Controlador de configuración geográfica

const pool = require('../config/database');
const logger = require('../utils/logger');

class GeographyController {
  // ============================================
  // DEPARTAMENTOS
  // ============================================

  // Obtener todos los departamentos
  static async obtenerDepartamentos(req, res) {
    try {
      const { includeStats } = req.query;
      
      let query = `
        SELECT d.*
        ${includeStats === 'true' ? ', (SELECT COUNT(*) FROM ciudades WHERE departamento_id = d.id) as ciudades_count' : ''}
        FROM departamentos d
        ORDER BY d.nombre ASC
      `;

      const connection = await pool.getConnection();
      const [departamentos] = await connection.execute(query);
      connection.release();

      res.json({
        success: true,
        data: departamentos,
        message: 'Departamentos obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo departamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener departamento por ID
  static async obtenerDepartamentoPorId(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT d.*,
          (SELECT COUNT(*) FROM ciudades WHERE departamento_id = d.id) as ciudades_count
        FROM departamentos d
        WHERE d.id = ?
      `;

      const connection = await pool.getConnection();
      const [departamentos] = await connection.execute(query, [id]);
      connection.release();

      if (departamentos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Departamento no encontrado'
        });
      }

      res.json({
        success: true,
        data: departamentos[0],
        message: 'Departamento obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo departamento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear departamento
  static async crearDepartamento(req, res) {
    return GeographyController.createDepartment(req, res);
  }

  static async createDepartment(req, res) {
    try {
      const { codigo, nombre } = req.body;

      // Validaciones
      if (!codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Código y nombre son requeridos'
        });
      }

      // Verificar si ya existe
      const connection = await pool.getConnection();
      
      const [existing] = await connection.execute(
        'SELECT id FROM departamentos WHERE codigo = ? OR nombre = ?',
        [codigo, nombre]
      );

      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe un departamento con ese código o nombre'
        });
      }

      // Crear departamento
      const [result] = await connection.execute(
        'INSERT INTO departamentos (codigo, nombre) VALUES (?, ?)',
        [codigo.trim(), nombre.trim()]
      );

      // Obtener el departamento creado
      const [created] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [result.insertId]
      );

      connection.release();

      res.status(201).json({
        success: true,
        data: created[0],
        message: 'Departamento creado exitosamente'
      });
    } catch (error) {
      console.error('Error creando departamento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar departamento
  static async actualizarDepartamento(req, res) {
    return GeographyController.updateDepartment(req, res);
  }

  static async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { codigo, nombre } = req.body;

      if (!codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Código y nombre son requeridos'
        });
      }

      const connection = await pool.getConnection();

      // Verificar si existe
      const [existing] = await connection.execute(
        'SELECT id FROM departamentos WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Departamento no encontrado'
        });
      }

      // Verificar duplicados
      const [duplicates] = await connection.execute(
        'SELECT id FROM departamentos WHERE (codigo = ? OR nombre = ?) AND id != ?',
        [codigo, nombre, id]
      );

      if (duplicates.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe otro departamento con ese código o nombre'
        });
      }

      // Actualizar
      await connection.execute(
        'UPDATE departamentos SET codigo = ?, nombre = ? WHERE id = ?',
        [codigo.trim(), nombre.trim(), id]
      );

      // Obtener el departamento actualizado
      const [updated] = await connection.execute(
        'SELECT * FROM departamentos WHERE id = ?',
        [id]
      );

      connection.release();

      res.json({
        success: true,
        data: updated[0],
        message: 'Departamento actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error actualizando departamento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar departamento
  static async eliminarDepartamento(req, res) {
    return GeographyController.deleteDepartment(req, res);
  }

  static async deleteDepartment(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Verificar si tiene ciudades asociadas
      const [cities] = await connection.execute(
        'SELECT COUNT(*) as count FROM ciudades WHERE departamento_id = ?',
        [id]
      );

      if (cities[0].count > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'No se puede eliminar un departamento que tiene ciudades asociadas'
        });
      }

      // Eliminar
      const [result] = await connection.execute(
        'DELETE FROM departamentos WHERE id = ?',
        [id]
      );

      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Departamento no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Departamento eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando departamento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ============================================
  // CIUDADES
  // ============================================

  // Obtener todas las ciudades
  static async obtenerCiudades(req, res) {
    try {
      const { departamento_id, includeStats } = req.query;
      
      let query = `
        SELECT c.*, d.nombre as departamento_nombre
        ${includeStats === 'true' ? ', (SELECT COUNT(*) FROM sectores WHERE ciudad_id = c.id) as sectores_count' : ''}
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
      `;
      
      const params = [];
      
      if (departamento_id) {
        query += ' WHERE c.departamento_id = ?';
        params.push(departamento_id);
      }
      
      query += ' ORDER BY d.nombre ASC, c.nombre ASC';

      const connection = await pool.getConnection();
      const [ciudades] = await connection.execute(query, params);
      connection.release();

      res.json({
        success: true,
        data: ciudades,
        message: 'Ciudades obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo ciudades:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener ciudad por ID
  static async obtenerCiudadPorId(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT c.*, d.nombre as departamento_nombre,
          (SELECT COUNT(*) FROM sectores WHERE ciudad_id = c.id) as sectores_count
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.id = ?
      `;

      const connection = await pool.getConnection();
      const [ciudades] = await connection.execute(query, [id]);
      connection.release();

      if (ciudades.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ciudad no encontrada'
        });
      }

      res.json({
        success: true,
        data: ciudades[0],
        message: 'Ciudad obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo ciudad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear ciudad
  static async crearCiudad(req, res) {
    return GeographyController.createCity(req, res);
  }

  static async createCity(req, res) {
    try {
      const { departamento_id, codigo, nombre } = req.body;

      if (!departamento_id || !codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Departamento, código y nombre son requeridos'
        });
      }

      const connection = await pool.getConnection();

      // Verificar si el departamento existe
      const [dept] = await connection.execute(
        'SELECT id FROM departamentos WHERE id = ?',
        [departamento_id]
      );

      if (dept.length === 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'El departamento especificado no existe'
        });
      }

      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM ciudades WHERE codigo = ? OR nombre = ?',
        [codigo, nombre]
      );

      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe una ciudad con ese código o nombre'
        });
      }

      // Crear ciudad
      const [result] = await connection.execute(
        'INSERT INTO ciudades (departamento_id, codigo, nombre) VALUES (?, ?, ?)',
        [departamento_id, codigo.trim(), nombre.trim()]
      );

      // Obtener la ciudad creada con información del departamento
      const [created] = await connection.execute(
        `SELECT c.*, d.nombre as departamento_nombre 
         FROM ciudades c 
         LEFT JOIN departamentos d ON c.departamento_id = d.id 
         WHERE c.id = ?`,
        [result.insertId]
      );

      connection.release();

      res.status(201).json({
        success: true,
        data: created[0],
        message: 'Ciudad creada exitosamente'
      });
    } catch (error) {
      console.error('Error creando ciudad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar ciudad
  static async actualizarCiudad(req, res) {
    return GeographyController.updateCity(req, res);
  }

  static async updateCity(req, res) {
    try {
      const { id } = req.params;
      const { departamento_id, codigo, nombre } = req.body;

      if (!departamento_id || !codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Departamento, código y nombre son requeridos'
        });
      }

      const connection = await pool.getConnection();

      // Verificar si la ciudad existe
      const [existing] = await connection.execute(
        'SELECT id FROM ciudades WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Ciudad no encontrada'
        });
      }

      // Verificar si el departamento existe
      const [dept] = await connection.execute(
        'SELECT id FROM departamentos WHERE id = ?',
        [departamento_id]
      );

      if (dept.length === 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'El departamento especificado no existe'
        });
      }

      // Verificar duplicados
      const [duplicates] = await connection.execute(
        'SELECT id FROM ciudades WHERE (codigo = ? OR nombre = ?) AND id != ?',
        [codigo, nombre, id]
      );

      if (duplicates.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe otra ciudad con ese código o nombre'
        });
      }

      // Actualizar
      await connection.execute(
        'UPDATE ciudades SET departamento_id = ?, codigo = ?, nombre = ? WHERE id = ?',
        [departamento_id, codigo.trim(), nombre.trim(), id]
      );

      // Obtener la ciudad actualizada
      const [updated] = await connection.execute(
        `SELECT c.*, d.nombre as departamento_nombre 
         FROM ciudades c 
         LEFT JOIN departamentos d ON c.departamento_id = d.id 
         WHERE c.id = ?`,
        [id]
      );

      connection.release();

      res.json({
        success: true,
        data: updated[0],
        message: 'Ciudad actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error actualizando ciudad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar ciudad
  static async eliminarCiudad(req, res) {
    return GeographyController.deleteCity(req, res);
  }

  static async deleteCity(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Verificar si tiene sectores asociados
      const [sectors] = await connection.execute(
        'SELECT COUNT(*) as count FROM sectores WHERE ciudad_id = ?',
        [id]
      );

      if (sectors[0].count > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'No se puede eliminar una ciudad que tiene sectores asociados'
        });
      }

      // Eliminar
      const [result] = await connection.execute(
        'DELETE FROM ciudades WHERE id = ?',
        [id]
      );

      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ciudad no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Ciudad eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando ciudad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ============================================
  // SECTORES
  // ============================================

  // Obtener todos los sectores
  static async obtenerSectores(req, res) {
    try {
      const { ciudad_id, activo, includeStats } = req.query;
      
      let query = `
        SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
        ${includeStats === 'true' ? ', (SELECT COUNT(*) FROM clientes WHERE sector_id = s.id) as clientes_count' : ''}
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (ciudad_id) {
        query += ' AND s.ciudad_id = ?';
        params.push(ciudad_id);
      }
      
      if (activo !== null && activo !== undefined) {
        query += ' AND s.activo = ?';
        params.push(activo === 'true' ? 1 : 0);
      }
      
      query += ' ORDER BY d.nombre ASC, c.nombre ASC, s.nombre ASC';

      const connection = await pool.getConnection();
      const [sectores] = await connection.execute(query, params);
      connection.release();

      res.json({
        success: true,
        data: sectores,
        message: 'Sectores obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo sectores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener sector por ID
  static async obtenerSectorPorId(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre,
          (SELECT COUNT(*) FROM clientes WHERE sector_id = s.id) as clientes_count
        FROM sectores s
        LEFT JOIN ciudades c ON s.ciudad_id = c.id
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE s.id = ?
      `;

      const connection = await pool.getConnection();
      const [sectores] = await connection.execute(query, [id]);
      connection.release();

      if (sectores.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sector no encontrado'
        });
      }

      res.json({
        success: true,
        data: sectores[0],
        message: 'Sector obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo sector:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear sector
  static async crearSector(req, res) {
    return GeographyController.createSector(req, res);
  }

  static async createSector(req, res) {
    try {
      const { ciudad_id, codigo, nombre, activo = true } = req.body;

      if (!codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Código y nombre son requeridos'
        });
      }

      const connection = await pool.getConnection();

      // Verificar si la ciudad existe (si se especifica)
      if (ciudad_id) {
        const [city] = await connection.execute(
          'SELECT id FROM ciudades WHERE id = ?',
          [ciudad_id]
        );

        if (city.length === 0) {
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'La ciudad especificada no existe'
          });
        }
      }

      // Verificar duplicados
      const [existing] = await connection.execute(
        'SELECT id FROM sectores WHERE codigo = ?',
        [codigo]
      );

      if (existing.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe un sector con ese código'
        });
      }

      // Crear sector
      const [result] = await connection.execute(
        'INSERT INTO sectores (ciudad_id, codigo, nombre, activo) VALUES (?, ?, ?, ?)',
        [ciudad_id || null, codigo.trim(), nombre.trim(), activo ? 1 : 0]
      );

      // Obtener el sector creado con información relacionada
      const [created] = await connection.execute(
        `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
         FROM sectores s
         LEFT JOIN ciudades c ON s.ciudad_id = c.id
         LEFT JOIN departamentos d ON c.departamento_id = d.id
         WHERE s.id = ?`,
        [result.insertId]
      );

      connection.release();

      res.status(201).json({
        success: true,
        data: created[0],
        message: 'Sector creado exitosamente'
      });
    } catch (error) {
      console.error('Error creando sector:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar sector
  static async actualizarSector(req, res) {
    try {
      const { id } = req.params;
      const { ciudad_id, codigo, nombre, activo } = req.body;

      if (!codigo || !nombre) {
        return res.status(400).json({
          success: false,
          message: 'Código y nombre son requeridos'
        });
      }

      const connection = await pool.getConnection();

      // Verificar si el sector existe
      const [existing] = await connection.execute(
        'SELECT id FROM sectores WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Sector no encontrado'
        });
      }

      // Verificar si la ciudad existe (si se especifica)
      if (ciudad_id) {
        const [city] = await connection.execute(
          'SELECT id FROM ciudades WHERE id = ?',
          [ciudad_id]
        );

        if (city.length === 0) {
          connection.release();
          return res.status(400).json({
            success: false,
            message: 'La ciudad especificada no existe'
          });
        }
      }

      // Verificar duplicados
      const [duplicates] = await connection.execute(
        'SELECT id FROM sectores WHERE codigo = ? AND id != ?',
        [codigo, id]
      );

      if (duplicates.length > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'Ya existe otro sector con ese código'
        });
      }

      // Actualizar
      await connection.execute(
        'UPDATE sectores SET ciudad_id = ?, codigo = ?, nombre = ?, activo = ? WHERE id = ?',
        [ciudad_id || null, codigo.trim(), nombre.trim(), activo ? 1 : 0, id]
      );

      // Obtener el sector actualizado
      const [updated] = await connection.execute(
        `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
         FROM sectores s
         LEFT JOIN ciudades c ON s.ciudad_id = c.id
         LEFT JOIN departamentos d ON c.departamento_id = d.id
         WHERE s.id = ?`,
        [id]
      );

      connection.release();

      res.json({
        success: true,
        data: updated[0],
        message: 'Sector actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error actualizando sector:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Toggle estado del sector
  static async toggleSector(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Obtener estado actual
      const [current] = await connection.execute(
        'SELECT activo FROM sectores WHERE id = ?',
        [id]
      );

      if (current.length === 0) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Sector no encontrado'
        });
      }

      const newState = current[0].activo ? 0 : 1;

      // Actualizar estado
      await connection.execute(
        'UPDATE sectores SET activo = ? WHERE id = ?',
        [newState, id]
      );

      // Obtener el sector actualizado
      const [updated] = await connection.execute(
        `SELECT s.*, c.nombre as ciudad_nombre, d.nombre as departamento_nombre
         FROM sectores s
         LEFT JOIN ciudades c ON s.ciudad_id = c.id
         LEFT JOIN departamentos d ON c.departamento_id = d.id
         WHERE s.id = ?`,
        [id]
      );

      connection.release();

      res.json({
        success: true,
        data: updated[0],
        message: `Sector ${newState ? 'activado' : 'desactivado'} exitosamente`
      });
    } catch (error) {
      console.error('Error cambiando estado del sector:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar sector
  static async eliminarSector(req, res) {
    try {
      const { id } = req.params;

      const connection = await pool.getConnection();

      // Verificar si tiene clientes asociados
      const [clients] = await connection.execute(
        'SELECT COUNT(*) as count FROM clientes WHERE sector_id = ?',
        [id]
      );

      if (clients[0].count > 0) {
        connection.release();
        return res.status(409).json({
          success: false,
          message: 'No se puede eliminar un sector que tiene clientes asociados'
        });
      }

      // Eliminar
      const [result] = await connection.execute(
        'DELETE FROM sectores WHERE id = ?',
        [id]
      );

      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sector no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Sector eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando sector:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ============================================
  // UTILIDADES GEOGRÁFICAS
  // ============================================

  // Obtener jerarquía completa
  static async obtenerJerarquia(req, res) {
    return GeographyController.getGeographyHierarchy(req, res);
  }

  static async getGeographyHierarchy(req, res) {
    try {
      const connection = await pool.getConnection();

      const [jerarquia] = await connection.execute(`
        SELECT 
          d.id as departamento_id,
          d.codigo as departamento_codigo,
          d.nombre as departamento_nombre,
          c.id as ciudad_id,
          c.codigo as ciudad_codigo,
          c.nombre as ciudad_nombre,
          s.id as sector_id,
          s.codigo as sector_codigo,
          s.nombre as sector_nombre,
          s.activo as sector_activo
        FROM departamentos d
        LEFT JOIN ciudades c ON d.id = c.departamento_id
        LEFT JOIN sectores s ON c.id = s.ciudad_id
        ORDER BY d.nombre ASC, c.nombre ASC, s.nombre ASC
      `);

      connection.release();

      // Organizar datos en estructura jerárquica
      const departamentos = {};

      jerarquia.forEach(row => {
        if (!departamentos[row.departamento_id]) {
          departamentos[row.departamento_id] = {
            id: row.departamento_id,
            codigo: row.departamento_codigo,
            nombre: row.departamento_nombre,
            ciudades: {}
          };
        }

        if (row.ciudad_id && !departamentos[row.departamento_id].ciudades[row.ciudad_id]) {
          departamentos[row.departamento_id].ciudades[row.ciudad_id] = {
            id: row.ciudad_id,
            codigo: row.ciudad_codigo,
            nombre: row.ciudad_nombre,
            sectores: []
          };
        }

        if (row.sector_id) {
          departamentos[row.departamento_id].ciudades[row.ciudad_id].sectores.push({
            id: row.sector_id,
            codigo: row.sector_codigo,
            nombre: row.sector_nombre,
            activo: Boolean(row.sector_activo)
          });
        }
      });

      // Convertir a array
      const resultado = Object.values(departamentos).map(dept => ({
        ...dept,
        ciudades: Object.values(dept.ciudades)
      }));

      res.json({
        success: true,
        data: resultado,
        message: 'Jerarquía geográfica obtenida exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo jerarquía:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Buscar ubicaciones
  static async buscarUbicaciones(req, res) {
    return GeographyController.searchLocations(req, res);
  }

  static async searchLocations(req, res) {
    try {
      const { q: query, type = 'all' } = req.query;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const connection = await pool.getConnection();
      const searchTerm = `%${query}%`;
      const results = { departamentos: [], ciudades: [], sectores: [] };

      // Buscar departamentos
      if (type === 'all' || type === 'departamentos') {
        const [departamentos] = await connection.execute(
          'SELECT id, codigo, nombre, "departamento" as tipo FROM departamentos WHERE nombre LIKE ? OR codigo LIKE ? ORDER BY nombre ASC LIMIT 10',
          [searchTerm, searchTerm]
        );
        results.departamentos = departamentos;
      }

      // Buscar ciudades
      if (type === 'all' || type === 'ciudades') {
        const [ciudades] = await connection.execute(
          `SELECT c.id, c.codigo, c.nombre, d.nombre as departamento_nombre, "ciudad" as tipo
           FROM ciudades c
           LEFT JOIN departamentos d ON c.departamento_id = d.id
           WHERE c.nombre LIKE ? OR c.codigo LIKE ?
           ORDER BY c.nombre ASC LIMIT 10`,
          [searchTerm, searchTerm]
        );
        results.ciudades = ciudades;
      }

      // Buscar sectores
      if (type === 'all' || type === 'sectores') {
        const [sectores] = await connection.execute(
          `SELECT s.id, s.codigo, s.nombre, s.activo, c.nombre as ciudad_nombre, d.nombre as departamento_nombre, "sector" as tipo
           FROM sectores s
           LEFT JOIN ciudades c ON s.ciudad_id = c.id
           LEFT JOIN departamentos d ON c.departamento_id = d.id
           WHERE s.nombre LIKE ? OR s.codigo LIKE ?
           ORDER BY s.nombre ASC LIMIT 10`,
          [searchTerm, searchTerm]
        );
        results.sectores = sectores;
      }

      connection.release();

      res.json({
        success: true,
        data: results,
        message: 'Búsqueda completada exitosamente'
      });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas geográficas
  static async obtenerEstadisticasGeografia(req, res) {
    return GeographyController.getGeographyStats(req, res);
  }

  static async getGeographyStats(req, res) {
    try {
      const connection = await pool.getConnection();

      const [estadisticas] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM departamentos) as total_departamentos,
          (SELECT COUNT(*) FROM ciudades) as total_ciudades,
          (SELECT COUNT(*) FROM sectores) as total_sectores,
          (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
          (SELECT COUNT(*) FROM sectores WHERE activo = 0) as sectores_inactivos,
          (SELECT COUNT(DISTINCT s.ciudad_id) FROM sectores s WHERE s.activo = 1) as ciudades_con_sectores_activos,
          (SELECT COUNT(DISTINCT c.departamento_id) FROM ciudades c 
           INNER JOIN sectores s ON c.id = s.ciudad_id WHERE s.activo = 1) as departamentos_con_sectores_activos
      `);

      connection.release();

      res.json({
        success: true,
        data: estadisticas[0],
        message: 'Estadísticas geográficas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas geográficas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = GeographyController;