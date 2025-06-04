// backend/models/PlantillasCorreo.js

const db = require('../config/database');

class PlantillasCorreo {
    // Obtener todas las plantillas con filtros opcionales
    static async getAll(filters = {}) {
        try {
            let query = `
                SELECT 
                    id,
                    titulo,
                    asunto,
                    contenido,
                    tipo,
                    activo,
                    created_at,
                    updated_at
                FROM plantillas_correo 
                WHERE 1=1
            `;
            
            const params = [];

            // Aplicar filtros
            if (filters.tipo) {
                query += ` AND tipo = ?`;
                params.push(filters.tipo);
            }

            if (filters.activo !== undefined) {
                query += ` AND activo = ?`;
                params.push(filters.activo);
            }

            if (filters.search) {
                query += ` AND (titulo LIKE ? OR asunto LIKE ? OR contenido LIKE ?)`;
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Ordenamiento
            query += ` ORDER BY tipo ASC, titulo ASC`;

            // Paginación
            if (filters.limit) {
                const offset = filters.page ? (filters.page - 1) * filters.limit : 0;
                query += ` LIMIT ? OFFSET ?`;
                params.push(parseInt(filters.limit), offset);
            }

            console.log('🔍 Query plantillas:', query);
            console.log('📋 Parámetros:', params);

            const [rows] = await db.execute(query, params);

            // Si hay paginación, obtener el total
            let total = rows.length;
            if (filters.limit) {
                const countQuery = `
                    SELECT COUNT(*) as total 
                    FROM plantillas_correo 
                    WHERE 1=1
                    ${filters.tipo ? 'AND tipo = ?' : ''}
                    ${filters.activo !== undefined ? 'AND activo = ?' : ''}
                    ${filters.search ? 'AND (titulo LIKE ? OR asunto LIKE ? OR contenido LIKE ?)' : ''}
                `;
                
                const countParams = [];
                if (filters.tipo) countParams.push(filters.tipo);
                if (filters.activo !== undefined) countParams.push(filters.activo);
                if (filters.search) {
                    const searchTerm = `%${filters.search}%`;
                    countParams.push(searchTerm, searchTerm, searchTerm);
                }

                const [countResult] = await db.execute(countQuery, countParams);
                total = countResult[0].total;
            }

            return { plantillas: rows, total };
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.getAll:', error);
            throw error;
        }
    }

    // Obtener plantilla por ID
    static async getById(id) {
        try {
            const query = `
                SELECT 
                    id,
                    titulo,
                    asunto,
                    contenido,
                    tipo,
                    activo,
                    created_at,
                    updated_at
                FROM plantillas_correo 
                WHERE id = ?
            `;

            console.log('🔍 Obteniendo plantilla por ID:', id);

            const [rows] = await db.execute(query, [id]);

            if (rows.length === 0) {
                return null;
            }

            return rows[0];
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.getById:', error);
            throw error;
        }
    }

    // Crear nueva plantilla
    static async create(plantillaData) {
        try {
            const { titulo, asunto, contenido, tipo = 'general', activo = true } = plantillaData;

            console.log('➕ Creando plantilla:', { titulo, tipo });

            const query = `
                INSERT INTO plantillas_correo (titulo, asunto, contenido, tipo, activo)
                VALUES (?, ?, ?, ?, ?)
            `;

            const params = [titulo, asunto, contenido, tipo, activo];

            const [result] = await db.execute(query, params);

            console.log('✅ Plantilla creada con ID:', result.insertId);

            return await this.getById(result.insertId);
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.create:', error);
            throw error;
        }
    }

    // Actualizar plantilla
    static async update(id, plantillaData) {
        try {
            const { titulo, asunto, contenido, tipo, activo } = plantillaData;

            console.log('✏️ Actualizando plantilla ID:', id);

            const query = `
                UPDATE plantillas_correo 
                SET titulo = ?, asunto = ?, contenido = ?, tipo = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const params = [titulo, asunto, contenido, tipo, activo, id];

            const [result] = await db.execute(query, params);

            if (result.affectedRows === 0) {
                throw new Error('Plantilla no encontrada');
            }

            console.log('✅ Plantilla actualizada');

            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.update:', error);
            throw error;
        }
    }

    // Eliminar plantilla
    static async delete(id) {
        try {
            console.log('🗑️ Eliminando plantilla ID:', id);

            const query = `DELETE FROM plantillas_correo WHERE id = ?`;

            const [result] = await db.execute(query, [id]);

            if (result.affectedRows === 0) {
                throw new Error('Plantilla no encontrada');
            }

            console.log('✅ Plantilla eliminada');

            return { message: 'Plantilla eliminada correctamente' };
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.delete:', error);
            throw error;
        }
    }

    // Cambiar estado activo/inactivo
    static async toggleStatus(id) {
        try {
            console.log('🔄 Cambiando estado de plantilla ID:', id);

            const query = `
                UPDATE plantillas_correo 
                SET activo = NOT activo, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [id]);

            if (result.affectedRows === 0) {
                throw new Error('Plantilla no encontrada');
            }

            console.log('✅ Estado de plantilla cambiado');

            return await this.getById(id);
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.toggleStatus:', error);
            throw error;
        }
    }

    // Obtener plantillas por tipo
    static async getByType(tipo) {
        try {
            const query = `
                SELECT 
                    id,
                    titulo,
                    asunto,
                    contenido,
                    tipo,
                    activo,
                    created_at,
                    updated_at
                FROM plantillas_correo 
                WHERE tipo = ? AND activo = 1
                ORDER BY titulo ASC
            `;

            console.log('🔍 Obteniendo plantillas por tipo:', tipo);

            const [rows] = await db.execute(query, [tipo]);

            return rows;
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.getByType:', error);
            throw error;
        }
    }

    // Obtener estadísticas de plantillas
    static async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_plantillas,
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as plantillas_activas,
                    SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as plantillas_inactivas,
                    COUNT(DISTINCT tipo) as tipos_diferentes
                FROM plantillas_correo
            `;

            console.log('📊 Obteniendo estadísticas de plantillas');

            const [rows] = await db.execute(query);

            // Obtener conteo por tipo
            const tiposQuery = `
                SELECT 
                    tipo,
                    COUNT(*) as total,
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activas
                FROM plantillas_correo 
                GROUP BY tipo
                ORDER BY tipo
            `;

            const [tiposRows] = await db.execute(tiposQuery);

            return {
                ...rows[0],
                por_tipo: tiposRows
            };
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.getStats:', error);
            throw error;
        }
    }

    // Duplicar plantilla
    static async duplicate(id) {
        try {
            console.log('📄 Duplicando plantilla ID:', id);

            const original = await this.getById(id);
            if (!original) {
                throw new Error('Plantilla no encontrada');
            }

            const nuevaPlantilla = {
                titulo: `${original.titulo} (Copia)`,
                asunto: original.asunto,
                contenido: original.contenido,
                tipo: original.tipo,
                activo: false // Las copias se crean inactivas por defecto
            };

            return await this.create(nuevaPlantilla);
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.duplicate:', error);
            throw error;
        }
    }

    // Previsualizar plantilla con datos de prueba
    static async preview(id, datosEjemplo = {}) {
        try {
            const plantilla = await this.getById(id);
            if (!plantilla) {
                throw new Error('Plantilla no encontrada');
            }

            // Datos de ejemplo por defecto
            const ejemploDefault = {
                nombre_cliente: 'Juan Pérez',
                fecha_vencimiento: '2025-01-15',
                valor_factura: '$125,000',
                numero_factura: 'FAC-001234',
                empresa_nombre: 'Tu Empresa ISP',
                fecha_actual: new Date().toLocaleDateString('es-ES'),
                telefono_soporte: '(601) 123-4567'
            };

            const datos = { ...ejemploDefault, ...datosEjemplo };

            // Reemplazar variables en el contenido
            let contenidoPreview = plantilla.contenido;
            let asuntoPreview = plantilla.asunto;

            Object.keys(datos).forEach(variable => {
                const regex = new RegExp(`{{${variable}}}`, 'g');
                contenidoPreview = contenidoPreview.replace(regex, datos[variable]);
                asuntoPreview = asuntoPreview.replace(regex, datos[variable]);
            });

            return {
                ...plantilla,
                asunto_preview: asuntoPreview,
                contenido_preview: contenidoPreview,
                variables_disponibles: Object.keys(ejemploDefault)
            };
        } catch (error) {
            console.error('❌ Error en PlantillasCorreo.preview:', error);
            throw error;
        }
    }
}

module.exports = PlantillasCorreo;