// backend/models/ConceptoFacturacion.js

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
                    updated_at
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
            query += ' ORDER BY tipo ASC, nombre ASC';
            
            // Paginación
            if (filters.limit) {
                const offset = ((filters.page || 1) - 1) * filters.limit;
                query += ' LIMIT ? OFFSET ?';
                params.push(parseInt(filters.limit), offset);
            }
            
            console.log('📝 Query SQL:', query);
            console.log('📝 Parámetros:', params);
            
            const [rows] = await pool.execute(query, params);
            
            console.log('📊 Filas obtenidas:', rows.length);
            
            // Convertir valores numéricos y booleanos
            const conceptos = rows.map(concepto => ({
                ...concepto,
                valor_base: parseFloat(concepto.valor_base) || 0,
                porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
                aplica_iva: Boolean(concepto.aplica_iva),
                activo: Boolean(concepto.activo)
            }));
            
            return conceptos;
        } catch (error) {
            console.error('❌ Error en getAll:', error);
            throw error;
        }
    }

    // Obtener concepto por ID
    async getById(id) {
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
                    updated_at
                FROM ${this.tableName}
                WHERE id = ?
            `;
            
            const [rows] = await pool.execute(query, [id]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const concepto = rows[0];
            return {
                ...concepto,
                valor_base: parseFloat(concepto.valor_base) || 0,
                porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
                aplica_iva: Boolean(concepto.aplica_iva),
                activo: Boolean(concepto.activo)
            };
        } catch (error) {
            console.error('❌ Error en getById:', error);
            throw error;
        }
    }

    // Obtener concepto por código
    async getByCode(codigo) {
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
                    updated_at
                FROM ${this.tableName}
                WHERE codigo = ?
            `;
            
            const [rows] = await pool.execute(query, [codigo]);
            
            if (rows.length === 0) {
                return null;
            }
            
            const concepto = rows[0];
            return {
                ...concepto,
                valor_base: parseFloat(concepto.valor_base) || 0,
                porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
                aplica_iva: Boolean(concepto.aplica_iva),
                activo: Boolean(concepto.activo)
            };
        } catch (error) {
            console.error('❌ Error en getByCode:', error);
            throw error;
        }
    }

    // Crear nuevo concepto
    async create(data) {
        try {
            // Validar que el código no exista
            const existingCode = await this.getByCode(data.codigo);
            if (existingCode) {
                throw new Error(`Ya existe un concepto con el código "${data.codigo}"`);
            }

            const query = `
                INSERT INTO ${this.tableName} (
                    codigo,
                    nombre,
                    valor_base,
                    aplica_iva,
                    porcentaje_iva,
                    descripcion,
                    tipo,
                    activo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                data.codigo,
                data.nombre,
                data.valor_base || 0,
                data.aplica_iva ? 1 : 0,
                data.porcentaje_iva || 0,
                data.descripcion || null,
                data.tipo,
                data.activo !== undefined ? (data.activo ? 1 : 0) : 1
            ];
            
            const [result] = await pool.execute(query, params);
            
            // Obtener el concepto creado
            return await this.getById(result.insertId);
        } catch (error) {
            console.error('❌ Error en create:', error);
            throw error;
        }
    }

    // Actualizar concepto
    async update(id, data) {
        try {
            // Verificar que existe
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Concepto no encontrado');
            }

            // Validar código único si se está cambiando
            if (data.codigo && data.codigo !== existing.codigo) {
                const existingCode = await this.getByCode(data.codigo);
                if (existingCode && existingCode.id !== parseInt(id)) {
                    throw new Error(`Ya existe un concepto con el código "${data.codigo}"`);
                }
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
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const params = [
                data.codigo !== undefined ? data.codigo : existing.codigo,
                data.nombre !== undefined ? data.nombre : existing.nombre,
                data.valor_base !== undefined ? data.valor_base : existing.valor_base,
                data.aplica_iva !== undefined ? (data.aplica_iva ? 1 : 0) : (existing.aplica_iva ? 1 : 0),
                data.porcentaje_iva !== undefined ? data.porcentaje_iva : existing.porcentaje_iva,
                data.descripcion !== undefined ? data.descripcion : existing.descripcion,
                data.tipo !== undefined ? data.tipo : existing.tipo,
                data.activo !== undefined ? (data.activo ? 1 : 0) : (existing.activo ? 1 : 0),
                id
            ];
            
            await pool.execute(query, params);
            
            // Retornar el concepto actualizado
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en update:', error);
            throw error;
        }
    }

    // Eliminar concepto
    async delete(id) {
        try {
            // Verificar que existe
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Concepto no encontrado');
            }

            // Verificar que no esté siendo usado en facturas
            const [facturaRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM detalle_facturas WHERE concepto_id = ?',
                [id]
            );
            
            if (facturaRows[0].count > 0) {
                throw new Error('No se puede eliminar el concepto porque está siendo usado en facturas');
            }

            const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
            await pool.execute(query, [id]);
            
            return true;
        } catch (error) {
            console.error('❌ Error en delete:', error);
            throw error;
        }
    }

    // Cambiar estado activo/inactivo
    async toggleStatus(id) {
        try {
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Concepto no encontrado');
            }

            const newStatus = !existing.activo;
            
            const query = `
                UPDATE ${this.tableName} 
                SET activo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await pool.execute(query, [newStatus ? 1 : 0, id]);
            
            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en toggleStatus:', error);
            throw error;
        }
    }

    // Obtener conceptos por tipo
    async getByType(tipo) {
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
                    updated_at
                FROM ${this.tableName}
                WHERE tipo = ? AND activo = 1
                ORDER BY nombre ASC
            `;
            
            const [rows] = await pool.execute(query, [tipo]);
            
            return rows.map(concepto => ({
                ...concepto,
                valor_base: parseFloat(concepto.valor_base) || 0,
                porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
                aplica_iva: Boolean(concepto.aplica_iva),
                activo: Boolean(concepto.activo)
            }));
        } catch (error) {
            console.error('❌ Error en getByType:', error);
            throw error;
        }
    }

    // Obtener estadísticas
    async getStats() {
        try {
            const [totalRows] = await pool.execute(
                `SELECT COUNT(*) as total FROM ${this.tableName}`
            );
            
            const [activosRows] = await pool.execute(
                `SELECT COUNT(*) as activos FROM ${this.tableName} WHERE activo = 1`
            );
            
            const [porTipoRows] = await pool.execute(`
                SELECT 
                    tipo,
                    COUNT(*) as total,
                    COUNT(CASE WHEN activo = 1 THEN 1 END) as activos
                FROM ${this.tableName}
                GROUP BY tipo
                ORDER BY tipo
            `);
            
            return {
                total_conceptos: totalRows[0].total,
                conceptos_activos: activosRows[0].activos,
                conceptos_inactivos: totalRows[0].total - activosRows[0].activos,
                por_tipo: porTipoRows
            };
        } catch (error) {
            console.error('❌ Error en getStats:', error);
            throw error;
        }
    }

    // Obtener contador de uso en facturas
    async getUsageCount(id) {
        try {
            const [rows] = await pool.execute(`
                SELECT COUNT(*) as uso_facturas
                FROM detalle_facturas 
                WHERE concepto_id = ?
            `, [id]);
            
            return rows[0].uso_facturas;
        } catch (error) {
            console.error('❌ Error en getUsageCount:', error);
            return 0;
        }
    }
}

module.exports = ConceptoFacturacion;