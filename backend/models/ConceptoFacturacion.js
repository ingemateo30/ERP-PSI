// backend/models/ConceptoFacturacion.js - ACTUALIZADO

const pool = require('../config/database');

class ConceptoFacturacion {
    constructor() {
        this.tableName = 'conceptos_facturacion';
        console.log('🔧 ConceptoFacturacion model inicializado');
    }

    // Obtener todos los conceptos con filtros opcionales
    async getAll(filters = {}) {
        console.log('🔍 ConceptoFacturacion.getAll llamado con filtros:', filters);
        
        try {
            let query = `
                SELECT 
                    id,
                    codigo,
                    nombre,
                    valor_base,
                    aplica_iva,
                    porcentaje_iva,
                    descripcion,
                    tipo,
                    activo,
                    created_at,
                    updated_at,
                    CASE 
                        WHEN aplica_iva = 1 THEN ROUND(valor_base * (1 + porcentaje_iva/100), 2)
                        ELSE valor_base 
                    END as valor_con_iva,
                    CASE 
                        WHEN aplica_iva = 1 THEN ROUND(valor_base * (porcentaje_iva/100), 2)
                        ELSE 0 
                    END as valor_iva
                FROM ${this.tableName}
                WHERE 1=1
            `;
            
            const params = [];
            
            // Filtros
            if (filters.tipo) {
                query += ' AND tipo = ?';
                params.push(filters.tipo);
            }
            
            if (filters.activo !== undefined) {
                query += ' AND activo = ?';
                params.push(filters.activo ? 1 : 0);
            }
            
            if (filters.search) {
                query += ' AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            
            // Ordenamiento
            query += ' ORDER BY tipo ASC, CAST(codigo AS UNSIGNED) ASC, codigo ASC';
            
            // Paginación
            if (filters.limit) {
                const offset = ((filters.page || 1) - 1) * filters.limit;
                query += ' LIMIT ? OFFSET ?';
                params.push(filters.limit, offset);
            }
            
            console.log('📝 Query SQL:', query);
            console.log('📊 Parámetros:', params);
            
            const [rows] = await pool.execute(query, params);
            
            console.log('✅ Conceptos encontrados:', rows.length);
            
            return rows;
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.getAll:', error);
            throw error;
        }
    }

    // Obtener concepto por ID
    async getById(id) {
        console.log('🔍 ConceptoFacturacion.getById llamado con ID:', id);
        
        try {
            const query = `
                SELECT 
                    id,
                    codigo,
                    nombre,
                    valor_base,
                    aplica_iva,
                    porcentaje_iva,
                    descripcion,
                    tipo,
                    activo,
                    created_at,
                    updated_at,
                    CASE 
                        WHEN aplica_iva = 1 THEN ROUND(valor_base * (1 + porcentaje_iva/100), 2)
                        ELSE valor_base 
                    END as valor_con_iva,
                    CASE 
                        WHEN aplica_iva = 1 THEN ROUND(valor_base * (porcentaje_iva/100), 2)
                        ELSE 0 
                    END as valor_iva
                FROM ${this.tableName}
                WHERE id = ?
            `;
            
            const [rows] = await pool.execute(query, [id]);
            
            console.log('✅ Concepto encontrado:', rows.length > 0 ? 'Sí' : 'No');
            
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.getById:', error);
            throw error;
        }
    }

    // Crear nuevo concepto
    async create(conceptoData) {
        console.log('➕ ConceptoFacturacion.create llamado con datos:', conceptoData);
        
        try {
            const query = `
                INSERT INTO ${this.tableName} 
                (codigo, nombre, valor_base, aplica_iva, porcentaje_iva, descripcion, tipo, activo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                conceptoData.codigo,
                conceptoData.nombre,
                conceptoData.valor_base || 0,
                conceptoData.aplica_iva ? 1 : 0,
                conceptoData.porcentaje_iva || 0,
                conceptoData.descripcion || null,
                conceptoData.tipo,
                conceptoData.activo ? 1 : 0
            ];
            
            const [result] = await pool.execute(query, params);
            
            console.log('✅ Concepto creado con ID:', result.insertId);
            
            // Retornar el concepto creado
            return await this.getById(result.insertId);
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.create:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya existe un concepto con este código');
            }
            
            throw error;
        }
    }

    // Actualizar concepto
    async update(id, conceptoData) {
        console.log('✏️ ConceptoFacturacion.update llamado con ID:', id, 'y datos:', conceptoData);
        
        try {
            // Verificar que el concepto existe
            const existingConcepto = await this.getById(id);
            if (!existingConcepto) {
                throw new Error('Concepto no encontrado');
            }
            
            const query = `
                UPDATE ${this.tableName} 
                SET 
                    codigo = ?,
                    nombre = ?,
                    valor_base = ?,
                    aplica_iva = ?,
                    porcentaje_iva = ?,
                    descripcion = ?,
                    tipo = ?,
                    activo = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const params = [
                conceptoData.codigo,
                conceptoData.nombre,
                conceptoData.valor_base || 0,
                conceptoData.aplica_iva ? 1 : 0,
                conceptoData.porcentaje_iva || 0,
                conceptoData.descripcion || null,
                conceptoData.tipo,
                conceptoData.activo ? 1 : 0,
                id
            ];
            
            await pool.execute(query, params);
            
            console.log('✅ Concepto actualizado');
            
            // Retornar el concepto actualizado
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.update:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya existe otro concepto con este código');
            }
            
            throw error;
        }
    }

    // Eliminar concepto (soft delete)
    async delete(id) {
        console.log('🗑️ ConceptoFacturacion.delete llamado con ID:', id);
        
        try {
            // Verificar que el concepto existe
            const existingConcepto = await this.getById(id);
            if (!existingConcepto) {
                throw new Error('Concepto no encontrado');
            }
            
            // Verificar si está siendo usado en facturas
            const usoFacturas = await this.getUsageCount(id);
            if (usoFacturas > 0) {
                throw new Error(`No se puede eliminar: el concepto está siendo usado en ${usoFacturas} facturas`);
            }
            
            const query = `
                UPDATE ${this.tableName} 
                SET activo = 0, updated_at = NOW()
                WHERE id = ?
            `;
            
            await pool.execute(query, [id]);
            
            console.log('✅ Concepto desactivado');
            
            return { success: true, message: 'Concepto desactivado exitosamente' };
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.delete:', error);
            throw error;
        }
    }

    // Cambiar estado activo/inactivo
    async toggleStatus(id) {
        console.log('🔄 ConceptoFacturacion.toggleStatus llamado con ID:', id);
        
        try {
            const existingConcepto = await this.getById(id);
            if (!existingConcepto) {
                throw new Error('Concepto no encontrado');
            }
            
            const newStatus = existingConcepto.activo ? 0 : 1;
            
            const query = `
                UPDATE ${this.tableName} 
                SET activo = ?, updated_at = NOW()
                WHERE id = ?
            `;
            
            await pool.execute(query, [newStatus, id]);
            
            console.log('✅ Estado del concepto cambiado a:', newStatus ? 'Activo' : 'Inactivo');
            
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.toggleStatus:', error);
            throw error;
        }
    }

    // Obtener estadísticas
    async getStats() {
        console.log('📊 ConceptoFacturacion.getStats llamado');
        
        try {
            const query = `
                SELECT 
                    tipo,
                    COUNT(*) as total,
                    COUNT(CASE WHEN activo = 1 THEN 1 END) as activos,
                    COUNT(CASE WHEN activo = 0 THEN 1 END) as inactivos,
                    AVG(valor_base) as valor_promedio,
                    MIN(valor_base) as valor_minimo,
                    MAX(valor_base) as valor_maximo,
                    COUNT(CASE WHEN aplica_iva = 1 THEN 1 END) as con_iva
                FROM ${this.tableName}
                GROUP BY tipo
                ORDER BY total DESC
            `;
            
            const [rows] = await pool.execute(query);
            
            // Estadísticas generales
            const totalQuery = `
                SELECT 
                    COUNT(*) as total_general,
                    COUNT(CASE WHEN activo = 1 THEN 1 END) as activos_general,
                    COUNT(CASE WHEN activo = 0 THEN 1 END) as inactivos_general,
                    AVG(valor_base) as valor_promedio_general
                FROM ${this.tableName}
            `;
            
            const [totalRows] = await pool.execute(totalQuery);
            
            console.log('✅ Estadísticas obtenidas');
            
            return {
                por_tipo: rows,
                general: totalRows[0]
            };
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.getStats:', error);
            throw error;
        }
    }

    // Contar uso en facturas
    async getUsageCount(id) {
        console.log('🔍 ConceptoFacturacion.getUsageCount llamado con ID:', id);
        
        try {
            const query = `
                SELECT COUNT(*) as uso_facturas
                FROM detalle_facturas 
                WHERE concepto_id = ?
            `;
            
            const [rows] = await pool.execute(query, [id]);
            
            return rows[0].uso_facturas;
        } catch (error) {
            console.error('❌ Error en getUsageCount:', error);
            return 0;
        }
    }

    // Buscar conceptos por tipo
    async getByType(tipo) {
        console.log('🔍 ConceptoFacturacion.getByType llamado con tipo:', tipo);
        
        try {
            return await this.getAll({ tipo, activo: true });
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.getByType:', error);
            throw error;
        }
    }

    // Verificar si un código existe
    async existsCode(codigo, excludeId = null) {
        console.log('🔍 ConceptoFacturacion.existsCode llamado con código:', codigo);
        
        try {
            let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE codigo = ?`;
            const params = [codigo];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            const [rows] = await pool.execute(query, params);
            
            return rows[0].count > 0;
        } catch (error) {
            console.error('❌ Error en ConceptoFacturacion.existsCode:', error);
            throw error;
        }
    }
}

module.exports = ConceptoFacturacion;