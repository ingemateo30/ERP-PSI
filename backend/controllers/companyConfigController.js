// backend/controllers/companyConfigController.js

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { success, error } = require('../utils/responses');
const pool = require('../config/database');

class CompanyConfigController {
  
  // Obtener configuración de empresa
  static async getCompanyConfig(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [configs] = await connection.execute(
        'SELECT * FROM configuracion_empresa ORDER BY id ASC LIMIT 1'
      );
      
      connection.release();
      
      // Si no existe configuración, crear una por defecto
      if (configs.length === 0) {
        return success(res, 'Configuración obtenida', {
          config: {
            id: null,
            licencia: 'DEMO2024',
            empresa_nombre: '',
            empresa_nit: '',
            empresa_direccion: '',
            empresa_ciudad: '',
            empresa_departamento: '',
            empresa_telefono: '',
            empresa_email: '',
            resolucion_facturacion: '',
            licencia_internet: '',
            vigilado: '',
            vigilado_internet: '',
            comentario: '',
            prefijo_factura: 'FAC',
            codigo_gs1: '',
            consecutivo_factura: 1,
            consecutivo_contrato: 1,
            consecutivo_recibo: 1,
            valor_reconexion: 15000.00,
            dias_mora_corte: 30,
            porcentaje_iva: 19.00,
            porcentaje_interes: 0.00
          }
        });
      }
      
      return success(res, 'Configuración obtenida exitosamente', {
        config: configs[0]
      });
      
    } catch (err) {
      logger.error('Error obteniendo configuración de empresa:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar configuración de empresa
  static async updateCompanyConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return error(res, 'Datos de entrada inválidos', 400, errors.array());
      }
      
      const {
        licencia, empresa_nombre, empresa_nit, empresa_direccion,
        empresa_ciudad, empresa_departamento, empresa_telefono, empresa_email,
        resolucion_facturacion, licencia_internet, vigilado, vigilado_internet,
        comentario, prefijo_factura, codigo_gs1, valor_reconexion,
        dias_mora_corte, porcentaje_iva, porcentaje_interes
      } = req.body;
      
      const connection = await pool.getConnection();
      
      // Verificar si existe configuración
      const [existing] = await connection.execute(
        'SELECT id FROM configuracion_empresa LIMIT 1'
      );
      
      if (existing.length === 0) {
        // Crear nueva configuración
        const [result] = await connection.execute(`
          INSERT INTO configuracion_empresa (
            licencia, empresa_nombre, empresa_nit, empresa_direccion,
            empresa_ciudad, empresa_departamento, empresa_telefono, empresa_email,
            resolucion_facturacion, licencia_internet, vigilado, vigilado_internet,
            comentario, prefijo_factura, codigo_gs1, valor_reconexion,
            dias_mora_corte, porcentaje_iva, porcentaje_interes, fecha_actualizacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          licencia, empresa_nombre, empresa_nit, empresa_direccion,
          empresa_ciudad, empresa_departamento, empresa_telefono, empresa_email,
          resolucion_facturacion, licencia_internet, vigilado, vigilado_internet,
          comentario, prefijo_factura, codigo_gs1, valor_reconexion,
          dias_mora_corte, porcentaje_iva, porcentaje_interes
        ]);
        
        logger.info('Configuración de empresa creada', {
          configId: result.insertId,
          updatedBy: req.user.id
        });
      } else {
        // Actualizar configuración existente
        await connection.execute(`
          UPDATE configuracion_empresa SET
            licencia = ?, empresa_nombre = ?, empresa_nit = ?, empresa_direccion = ?,
            empresa_ciudad = ?, empresa_departamento = ?, empresa_telefono = ?, empresa_email = ?,
            resolucion_facturacion = ?, licencia_internet = ?, vigilado = ?, vigilado_internet = ?,
            comentario = ?, prefijo_factura = ?, codigo_gs1 = ?, valor_reconexion = ?,
            dias_mora_corte = ?, porcentaje_iva = ?, porcentaje_interes = ?, fecha_actualizacion = NOW(),
            updated_at = NOW()
          WHERE id = ?
        `, [
          licencia, empresa_nombre, empresa_nit, empresa_direccion,
          empresa_ciudad, empresa_departamento, empresa_telefono, empresa_email,
          resolucion_facturacion, licencia_internet, vigilado, vigilado_internet,
          comentario, prefijo_factura, codigo_gs1, valor_reconexion,
          dias_mora_corte, porcentaje_iva, porcentaje_interes, existing[0].id
        ]);
        
        logger.info('Configuración de empresa actualizada', {
          configId: existing[0].id,
          updatedBy: req.user.id
        });
      }
      
      // Obtener configuración actualizada
      const [updated] = await connection.execute(
        'SELECT * FROM configuracion_empresa ORDER BY id ASC LIMIT 1'
      );
      
      connection.release();
      
      return success(res, 'Configuración actualizada exitosamente', {
        config: updated[0]
      });
      
    } catch (err) {
      logger.error('Error actualizando configuración de empresa:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Obtener estadísticas de configuración
  static async getConfigStats(req, res) {
    try {
      const connection = await pool.getConnection();
      
      // Verificar si la configuración está completa
      const [config] = await connection.execute(
        'SELECT * FROM configuracion_empresa LIMIT 1'
      );
      
      const isConfigured = config.length > 0 && 
        config[0].empresa_nombre && 
        config[0].empresa_nit;
      
      // Contar registros en tablas de configuración
      const [deptCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM departamentos'
      );
      
      const [cityCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM ciudades'
      );
      
      const [sectorCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM sectores'
      );
      
      const [bankCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM bancos WHERE activo = 1'
      );
      
      const [planCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM planes_servicio WHERE activo = 1'
      );
      
      const [conceptCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM conceptos_facturacion WHERE activo = 1'
      );
      
      connection.release();
      
      return success(res, 'Estadísticas obtenidas exitosamente', {
        stats: {
          empresa_configurada: isConfigured,
          total_departamentos: deptCount[0].count,
          total_ciudades: cityCount[0].count,
          total_sectores: sectorCount[0].count,
          total_bancos: bankCount[0].count,
          total_planes: planCount[0].count,
          total_conceptos: conceptCount[0].count,
          configuracion_completa: isConfigured && 
            deptCount[0].count > 0 && 
            cityCount[0].count > 0 && 
            bankCount[0].count > 0
        }
      });
      
    } catch (err) {
      logger.error('Error obteniendo estadísticas de configuración:', err);
      return error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = CompanyConfigController;