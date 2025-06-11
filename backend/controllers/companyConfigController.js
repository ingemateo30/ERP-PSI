// backend/controllers/companyConfigController.js - CONTROLADOR COMPLETO Y CORREGIDO

const { Database } = require('../models/Database');
const logger = require('../utils/logger');

class CompanyConfigController {
  // ==========================================
  // CONFIGURACIÓN DE EMPRESA
  // ==========================================

  // Obtener configuración general
  static async getConfigOverview(req, res) {
    try {
      console.log('📊 Obteniendo resumen de configuración...');

      // Obtener configuración de empresa
      const [empresaConfig] = await Database.query(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );

      // Obtener contadores
      const contadores = await CompanyConfigController.getCounters();

      // Verificar si la configuración está completa
      const empresaConfigurada = empresaConfig && empresaConfig.empresa_nombre && empresaConfig.empresa_nit;
      
      const configCompleta = empresaConfigurada && 
                            contadores.bancos_activos > 0 && 
                            contadores.sectores_activos > 0 && 
                            contadores.planes_activos > 0;

      const porcentajeCompletado = CompanyConfigController.calcularPorcentajeCompletado(contadores, empresaConfigurada);

      const overview = {
        empresa_configurada: empresaConfigurada,
        configuracion_completa: configCompleta,
        porcentaje_completado: porcentajeCompletado,
        contadores,
        empresa: empresaConfig || null
      };

      console.log('✅ Resumen de configuración obtenido:', overview);

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('❌ Error obteniendo resumen de configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener configuración de empresa
  static async getCompanyConfig(req, res) {
    try {
      const [config] = await Database.query(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );

      res.json({
        success: true,
        data: {
          config: config || null
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuración de empresa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar configuración de empresa
  static async updateCompanyConfig(req, res) {
    try {
      const configData = req.body;
      
      // Verificar si existe configuración
      const [existingConfig] = await Database.query(
        'SELECT id FROM configuracion_empresa LIMIT 1'
      );

      let query;
      let params;

      if (existingConfig) {
        // Actualizar configuración existente
        const updateFields = [];
        const updateValues = [];

        Object.keys(configData).forEach(key => {
          if (configData[key] !== undefined && key !== 'id') {
            updateFields.push(`${key} = ?`);
            updateValues.push(configData[key]);
          }
        });

        if (updateFields.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No hay campos para actualizar'
          });
        }

        updateValues.push(existingConfig.id);
        query = `UPDATE configuracion_empresa SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`;
        params = updateValues;
      } else {
        // Crear nueva configuración
        const fields = Object.keys(configData);
        const values = Object.values(configData);
        const placeholders = fields.map(() => '?').join(', ');

        query = `INSERT INTO configuracion_empresa (${fields.join(', ')}) VALUES (${placeholders})`;
        params = values;
      }

      await Database.query(query, params);

      // Obtener configuración actualizada
      const [updatedConfig] = await Database.query(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );

      res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: {
          config: updatedConfig
        }
      });
    } catch (error) {
      console.error('Error actualizando configuración de empresa:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // GESTIÓN GEOGRÁFICA
  // ==========================================

  // Obtener departamentos
  static async getDepartments(req, res) {
    try {
      const { includeStats = false } = req.query;

      let query = 'SELECT * FROM departamentos ORDER BY nombre ASC';
      const departamentos = await Database.query(query);

      if (includeStats) {
        // Agregar estadísticas si se solicita
        for (let dept of departamentos) {
          const [ciudadesCount] = await Database.query(
            'SELECT COUNT(*) as total FROM ciudades WHERE departamento_id = ?',
            [dept.id]
          );
          dept.total_ciudades = ciudadesCount.total;
        }
      }

      console.log(`📍 Departamentos obtenidos: ${departamentos.length}`);

      res.json({
        success: true,
        data: departamentos
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

  // Obtener ciudades
  static async getCities(req, res) {
    try {
      const { departamento_id, includeStats = false } = req.query;

      let query = `
        SELECT 
          c.*,
          d.nombre as departamento_nombre
        FROM ciudades c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
      `;
      
      const params = [];
      
      if (departamento_id) {
        query += ' WHERE c.departamento_id = ?';
        params.push(departamento_id);
      }
      
      query += ' ORDER BY c.nombre ASC';

      const ciudades = await Database.query(query, params);

      if (includeStats) {
        // Agregar estadísticas si se solicita
        for (let ciudad of ciudades) {
          const [sectoresCount] = await Database.query(
            'SELECT COUNT(*) as total FROM sectores WHERE ciudad_id = ? AND activo = 1',
            [ciudad.id]
          );
          ciudad.total_sectores = sectoresCount.total;
        }
      }

      console.log(`🏙️ Ciudades obtenidas: ${ciudades.length}`);

      res.json({
        success: true,
        data: ciudades
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

  // Obtener sectores
  static async getSectors(req, res) {
    try {
      const { ciudad_id, activo, includeStats = false } = req.query;

      let query = `
        SELECT 
          s.*,
          c.nombre as ciudad_nombre,
          d.nombre as departamento_nombre
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
      
      if (activo !== undefined) {
        query += ' AND s.activo = ?';
        params.push(activo === 'true' ? 1 : 0);
      }
      
      query += ' ORDER BY s.codigo ASC';

      const sectores = await Database.query(query, params);

      if (includeStats) {
        // Agregar estadísticas si se solicita
        for (let sector of sectores) {
          const [clientesCount] = await Database.query(
            'SELECT COUNT(*) as total FROM clientes WHERE sector_id = ?',
            [sector.id]
          );
          sector.total_clientes = clientesCount.total;
        }
      }

      console.log(`🏘️ Sectores obtenidos: ${sectores.length}`);

      res.json({
        success: true,
        data: sectores
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

  // ==========================================
  // GESTIÓN DE BANCOS
  // ==========================================

  // Obtener bancos
  static async getBanks(req, res) {
    try {
      const { activo } = req.query;

      let query = 'SELECT * FROM bancos';
      const params = [];
      
      if (activo !== undefined) {
        query += ' WHERE activo = ?';
        params.push(activo === 'true' ? 1 : 0);
      }
      
      query += ' ORDER BY nombre ASC';

      const bancos = await Database.query(query, params);

      console.log(`🏦 Bancos obtenidos: ${bancos.length}`);

      res.json({
        success: true,
        data: bancos
      });
    } catch (error) {
      console.error('Error obteniendo bancos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // PLANES DE SERVICIO
  // ==========================================

  // Obtener planes de servicio
  static async getServicePlans(req, res) {
    try {
      const { tipo, activo } = req.query;

      let query = 'SELECT * FROM planes_servicio WHERE 1=1';
      const params = [];
      
      if (tipo) {
        query += ' AND tipo = ?';
        params.push(tipo);
      }
      
      if (activo !== undefined) {
        query += ' AND activo = ?';
        params.push(activo === 'true' ? 1 : 0);
      }
      
      query += ' ORDER BY tipo ASC, precio ASC';

      const planes = await Database.query(query, params);

      console.log(`📦 Planes de servicio obtenidos: ${planes.length}`);

      res.json({
        success: true,
        data: planes
      });
    } catch (error) {
      console.error('Error obteniendo planes de servicio:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // ESTADÍSTICAS Y CONTADORES
  // ==========================================

  // Obtener contadores
  static async getCounters() {
    try {
      const queries = await Promise.all([
        Database.query('SELECT COUNT(*) as total FROM departamentos'),
        Database.query('SELECT COUNT(*) as total FROM ciudades'),
        Database.query('SELECT COUNT(*) as total FROM sectores WHERE activo = 1'),
        Database.query('SELECT COUNT(*) as total FROM bancos WHERE activo = 1'),
        Database.query('SELECT COUNT(*) as total FROM planes_servicio WHERE activo = 1'),
        Database.query('SELECT COUNT(*) as total FROM conceptos_facturacion WHERE activo = 1')
      ]);

      return {
        departamentos: queries[0][0]?.total || 0,
        ciudades: queries[1][0]?.total || 0,
        sectores_activos: queries[2][0]?.total || 0,
        bancos_activos: queries[3][0]?.total || 0,
        planes_activos: queries[4][0]?.total || 0,
        conceptos_activos: queries[5][0]?.total || 0
      };
    } catch (error) {
      console.error('Error obteniendo contadores:', error);
      return {
        departamentos: 0,
        ciudades: 0,
        sectores_activos: 0,
        bancos_activos: 0,
        planes_activos: 0,
        conceptos_activos: 0
      };
    }
  }

  // Obtener estadísticas
  static async getConfigStats(req, res) {
    try {
      const contadores = await CompanyConfigController.getCounters();

      res.json({
        success: true,
        data: contadores
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  // Calcular porcentaje de configuración completado
  static calcularPorcentajeCompletado(contadores, empresaConfigurada) {
    const pasos = [
      empresaConfigurada,
      contadores.bancos_activos > 0,
      contadores.sectores_activos > 0,
      contadores.planes_activos > 0
    ];

    const pasosCompletados = pasos.filter(Boolean).length;
    return Math.round((pasosCompletados / pasos.length) * 100);
  }

  // Verificar salud de la configuración
  static async getConfigHealth(req, res) {
    try {
      const contadores = await CompanyConfigController.getCounters();
      const [empresaConfig] = await Database.query(
        'SELECT empresa_nombre, empresa_nit FROM configuracion_empresa LIMIT 1'
      );

      const empresaConfigurada = empresaConfig && empresaConfig.empresa_nombre && empresaConfig.empresa_nit;
      
      const problemas = [];
      
      if (!empresaConfigurada) {
        problemas.push('Configuración de empresa incompleta');
      }
      
      if (contadores.bancos_activos === 0) {
        problemas.push('No hay bancos configurados');
      }
      
      if (contadores.sectores_activos === 0) {
        problemas.push('No hay sectores configurados');
      }
      
      if (contadores.planes_activos === 0) {
        problemas.push('No hay planes de servicio configurados');
      }

      const sistemaOperativo = problemas.length === 0;

      res.json({
        success: true,
        data: {
          sistema_operativo: sistemaOperativo,
          problemas,
          contadores,
          empresa_configurada: empresaConfigurada
        }
      });
    } catch (error) {
      console.error('Error verificando salud de configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ==========================================
  // JERARQUÍA GEOGRÁFICA
  // ==========================================

  // Obtener jerarquía geográfica completa
  static async getGeographyHierarchy(req, res) {
    try {
      const departamentos = await Database.query('SELECT * FROM departamentos ORDER BY nombre ASC');
      
      const hierarchy = [];
      
      for (let dept of departamentos) {
        const ciudades = await Database.query(
          'SELECT * FROM ciudades WHERE departamento_id = ? ORDER BY nombre ASC',
          [dept.id]
        );
        
        const ciudadesWithSectors = [];
        
        for (let ciudad of ciudades) {
          const sectores = await Database.query(
            'SELECT * FROM sectores WHERE ciudad_id = ? AND activo = 1 ORDER BY codigo ASC',
            [ciudad.id]
          );
          
          ciudadesWithSectors.push({
            ...ciudad,
            sectores
          });
        }
        
        hierarchy.push({
          ...dept,
          ciudades: ciudadesWithSectors
        });
      }

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      console.error('Error obteniendo jerarquía geográfica:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = CompanyConfigController;