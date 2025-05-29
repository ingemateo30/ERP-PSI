// backend/controllers/companyConfigController.js - CONTROLADOR COMPLETO

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/responses');
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
        const defaultConfig = {
          id: null,
          licencia: 'DEMO2025',
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
          porcentaje_interes: 0.00,
          fecha_actualizacion: null,
          updated_at: null
        };

        return ApiResponse.success(res, {
          config: defaultConfig
        }, 'Configuración por defecto obtenida');
      }
      
      return ApiResponse.success(res, {
        config: configs[0]
      }, 'Configuración obtenida exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo configuración de empresa:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
  
  // Actualizar configuración de empresa
  static async updateCompanyConfig(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.validationError(res, errors.array());
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
            dias_mora_corte, porcentaje_iva, porcentaje_interes, 
            fecha_actualizacion, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          licencia || 'DEMO2025',
          empresa_nombre || '',
          empresa_nit || '',
          empresa_direccion || '',
          empresa_ciudad || '',
          empresa_departamento || '',
          empresa_telefono || '',
          empresa_email || '',
          resolucion_facturacion || '',
          licencia_internet || '',
          vigilado || '',
          vigilado_internet || '',
          comentario || '',
          prefijo_factura || 'FAC',
          codigo_gs1 || '',
          valor_reconexion || 15000.00,
          dias_mora_corte || 30,
          porcentaje_iva || 19.00,
          porcentaje_interes || 0.00
        ]);
        
        logger.info('Configuración de empresa creada', {
          configId: result.insertId,
          updatedBy: req.user.id
        });
      } else {
        // Actualizar configuración existente
        await connection.execute(`
          UPDATE configuracion_empresa SET
            licencia = COALESCE(?, licencia),
            empresa_nombre = COALESCE(?, empresa_nombre),
            empresa_nit = COALESCE(?, empresa_nit),
            empresa_direccion = COALESCE(?, empresa_direccion),
            empresa_ciudad = COALESCE(?, empresa_ciudad),
            empresa_departamento = COALESCE(?, empresa_departamento),
            empresa_telefono = COALESCE(?, empresa_telefono),
            empresa_email = COALESCE(?, empresa_email),
            resolucion_facturacion = COALESCE(?, resolucion_facturacion),
            licencia_internet = COALESCE(?, licencia_internet),
            vigilado = COALESCE(?, vigilado),
            vigilado_internet = COALESCE(?, vigilado_internet),
            comentario = COALESCE(?, comentario),
            prefijo_factura = COALESCE(?, prefijo_factura),
            codigo_gs1 = COALESCE(?, codigo_gs1),
            valor_reconexion = COALESCE(?, valor_reconexion),
            dias_mora_corte = COALESCE(?, dias_mora_corte),
            porcentaje_iva = COALESCE(?, porcentaje_iva),
            porcentaje_interes = COALESCE(?, porcentaje_interes),
            fecha_actualizacion = NOW(),
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
      
      return ApiResponse.success(res, {
        config: updated[0]
      }, 'Configuración actualizada exitosamente');
      
    } catch (error) {
      logger.error('Error actualizando configuración de empresa:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
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
      const [counts] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM departamentos) as departamentos,
          (SELECT COUNT(*) FROM ciudades) as ciudades,
          (SELECT COUNT(*) FROM sectores WHERE activo = 1) as sectores_activos,
          (SELECT COUNT(*) FROM sectores) as sectores_total,
          (SELECT COUNT(*) FROM bancos WHERE activo = 1) as bancos_activos,
          (SELECT COUNT(*) FROM bancos) as bancos_total,
          (SELECT COUNT(*) FROM planes_servicio WHERE activo = 1) as planes_activos,
          (SELECT COUNT(*) FROM planes_servicio) as planes_total,
          (SELECT COUNT(*) FROM conceptos_facturacion WHERE activo = 1) as conceptos_activos,
          (SELECT COUNT(*) FROM conceptos_facturacion) as conceptos_total,
          (SELECT COUNT(*) FROM sistema_usuarios WHERE activo = 1) as usuarios_activos,
          (SELECT COUNT(*) FROM sistema_usuarios) as usuarios_total,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') as clientes_activos,
          (SELECT COUNT(*) FROM clientes) as clientes_total
      `);
      
      connection.release();
      
      const stats = counts[0];
      
      // Calcular nivel de configuración
      const configurationLevel = {
        empresa: isConfigured,
        geografia: stats.departamentos > 0 && stats.ciudades > 0 && stats.sectores_activos > 0,
        bancos: stats.bancos_activos > 0,
        planes: stats.planes_activos > 0,
        conceptos: stats.conceptos_activos > 0,
        usuarios: stats.usuarios_activos > 1 // Al menos admin + otro usuario
      };
      
      const completedItems = Object.values(configurationLevel).filter(Boolean).length;
      const totalItems = Object.keys(configurationLevel).length;
      const completionPercentage = Math.round((completedItems / totalItems) * 100);
      
      return ApiResponse.success(res, {
        empresa_configurada: isConfigured,
        nivel_configuracion: configurationLevel,
        porcentaje_completado: completionPercentage,
        estadisticas: stats,
        configuracion_completa: completionPercentage === 100,
        resumen: {
          total_departamentos: stats.departamentos,
          total_ciudades: stats.ciudades,
          sectores_activos: stats.sectores_activos,
          bancos_activos: stats.bancos_activos,
          planes_activos: stats.planes_activos,
          conceptos_activos: stats.conceptos_activos,
          usuarios_activos: stats.usuarios_activos,
          clientes_activos: stats.clientes_activos
        }
      }, 'Estadísticas obtenidas exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo estadísticas de configuración:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Obtener próximos consecutivos
  static async getNextConsecutives(req, res) {
    try {
      const connection = await pool.getConnection();
      
      const [config] = await connection.execute(
        'SELECT consecutivo_factura, consecutivo_contrato, consecutivo_recibo, prefijo_factura FROM configuracion_empresa LIMIT 1'
      );
      
      if (config.length === 0) {
        connection.release();
        return ApiResponse.success(res, {
          consecutivos: {
            factura: 1,
            contrato: 1,
            recibo: 1,
            prefijo_factura: 'FAC'
          }
        }, 'Consecutivos por defecto obtenidos');
      }
      
      const consecutivos = config[0];
      
      connection.release();
      
      return ApiResponse.success(res, {
        consecutivos: {
          factura: consecutivos.consecutivo_factura,
          contrato: consecutivos.consecutivo_contrato,
          recibo: consecutivos.consecutivo_recibo,
          prefijo_factura: consecutivos.prefijo_factura || 'FAC'
        }
      }, 'Consecutivos obtenidos exitosamente');
      
    } catch (error) {
      logger.error('Error obteniendo consecutivos:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar consecutivos
  static async updateConsecutives(req, res) {
    try {
      const { consecutivo_factura, consecutivo_contrato, consecutivo_recibo } = req.body;
      
      // Validaciones básicas
      if (consecutivo_factura && consecutivo_factura < 1) {
        return ApiResponse.validationError(res, [{
          field: 'consecutivo_factura',
          message: 'El consecutivo de factura debe ser mayor a 0'
        }]);
      }
      
      if (consecutivo_contrato && consecutivo_contrato < 1) {
        return ApiResponse.validationError(res, [{
          field: 'consecutivo_contrato',
          message: 'El consecutivo de contrato debe ser mayor a 0'
        }]);
      }
      
      if (consecutivo_recibo && consecutivo_recibo < 1) {
        return ApiResponse.validationError(res, [{
          field: 'consecutivo_recibo',
          message: 'El consecutivo de recibo debe ser mayor a 0'
        }]);
      }
      
      const connection = await pool.getConnection();
      
      // Verificar si existe configuración
      const [existing] = await connection.execute(
        'SELECT id FROM configuracion_empresa LIMIT 1'
      );
      
      if (existing.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Configuración de empresa no encontrada');
      }
      
      // Construir query dinámicamente
      const updateFields = [];
      const updateValues = [];
      
      if (consecutivo_factura !== undefined) {
        updateFields.push('consecutivo_factura = ?');
        updateValues.push(consecutivo_factura);
      }
      
      if (consecutivo_contrato !== undefined) {
        updateFields.push('consecutivo_contrato = ?');
        updateValues.push(consecutivo_contrato);
      }
      
      if (consecutivo_recibo !== undefined) {
        updateFields.push('consecutivo_recibo = ?');
        updateValues.push(consecutivo_recibo);
      }
      
      if (updateFields.length === 0) {
        connection.release();
        return ApiResponse.error(res, 'No hay consecutivos para actualizar', 400);
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(existing[0].id);
      
      await connection.execute(`
        UPDATE configuracion_empresa 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);
      
      // Obtener consecutivos actualizados
      const [updated] = await connection.execute(
        'SELECT consecutivo_factura, consecutivo_contrato, consecutivo_recibo, prefijo_factura FROM configuracion_empresa WHERE id = ?',
        [existing[0].id]
      );
      
      connection.release();
      
      logger.info('Consecutivos actualizados', {
        configId: existing[0].id,
        updatedBy: req.user.id,
        changes: req.body
      });
      
      return ApiResponse.success(res, {
        consecutivos: updated[0]
      }, 'Consecutivos actualizados exitosamente');
      
    } catch (error) {
      logger.error('Error actualizando consecutivos:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Incrementar consecutivo específico
  static async incrementConsecutive(req, res) {
    try {
      const { type } = req.params; // 'factura', 'contrato', 'recibo'
      
      if (!['factura', 'contrato', 'recibo'].includes(type)) {
        return ApiResponse.error(res, 'Tipo de consecutivo inválido', 400);
      }
      
      const connection = await pool.getConnection();
      
      const [config] = await connection.execute(
        'SELECT id FROM configuracion_empresa LIMIT 1'
      );
      
      if (config.length === 0) {
        connection.release();
        return ApiResponse.notFound(res, 'Configuración de empresa no encontrada');
      }
      
      const fieldName = `consecutivo_${type}`;
      
      // Incrementar consecutivo
      await connection.execute(`
        UPDATE configuracion_empresa 
        SET ${fieldName} = ${fieldName} + 1, updated_at = NOW()
        WHERE id = ?
      `, [config[0].id]);
      
      // Obtener nuevo valor
      const [updated] = await connection.execute(`
        SELECT ${fieldName} as nuevo_consecutivo 
        FROM configuracion_empresa 
        WHERE id = ?
      `, [config[0].id]);
      
      connection.release();
      
      logger.info(`Consecutivo ${type} incrementado`, {
        type: type,
        newValue: updated[0].nuevo_consecutivo,
        updatedBy: req.user?.id || 'system'
      });
      
      return ApiResponse.success(res, {
        type: type,
        nuevo_consecutivo: updated[0].nuevo_consecutivo
      }, `Consecutivo de ${type} incrementado exitosamente`);
      
    } catch (error) {
      logger.error('Error incrementando consecutivo:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }

  // Restablecer configuración a valores por defecto
  static async resetConfig(req, res) {
    try {
      if (req.user.rol !== 'administrador') {
        return ApiResponse.forbidden(res, 'Solo los administradores pueden restablecer la configuración');
      }
      
      const { confirm } = req.body;
      
      if (confirm !== 'RESET_CONFIG') {
        return ApiResponse.error(res, 'Confirmación requerida para restablecer configuración', 400);
      }
      
      const connection = await pool.getConnection();
      
      // Eliminar configuración existente
      await connection.execute('DELETE FROM configuracion_empresa');
      
      // Crear configuración por defecto
      await connection.execute(`
        INSERT INTO configuracion_empresa (
          licencia, empresa_nombre, empresa_nit, empresa_direccion,
          empresa_ciudad, empresa_departamento, empresa_telefono, empresa_email,
          resolucion_facturacion, licencia_internet, vigilado, vigilado_internet,
          comentario, prefijo_factura, codigo_gs1, consecutivo_factura,
          consecutivo_contrato, consecutivo_recibo, valor_reconexion,
          dias_mora_corte, porcentaje_iva, porcentaje_interes,
          fecha_actualizacion, updated_at
        ) VALUES (
          'DEMO2025', '', '', '', '', '', '', '', '', '', '', '', '',
          'FAC', '', 1, 1, 1, 15000.00, 30, 19.00, 0.00, NOW(), NOW()
        )
      `);
      
      connection.release();
      
      logger.logSecurity('warn', 'Configuración de empresa restablecida', {
        resetBy: req.user.id,
        resetByEmail: req.user.email
      });
      
      return ApiResponse.success(res, null, 'Configuración restablecida exitosamente');
      
    } catch (error) {
      logger.error('Error restableciendo configuración:', error);
      return ApiResponse.error(res, 'Error interno del servidor', 500);
    }
  }
}

module.exports = CompanyConfigController;