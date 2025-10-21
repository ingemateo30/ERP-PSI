// backend/controllers/plantillasCorreoController.js

const PlantillasCorreo = require('../models/PlantillasCorreo');
const { validationResult } = require('express-validator');

class PlantillasCorreoController {
    // Obtener todas las plantillas
    static async getAll(req, res) {
        try {
            console.log('📧 GET /plantillas-correo - Obteniendo plantillas');
            console.log('🔍 Query params:', req.query);

            const filters = {
                tipo: req.query.tipo,
                activo: req.query.activo ? req.query.activo === 'true' : undefined,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            // Limpiar filtros undefined
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined || filters[key] === '') {
                    delete filters[key];
                }
            });

            console.log('🔧 Filtros aplicados:', filters);

            const result = await PlantillasCorreo.getAll(filters);

            // Preparar respuesta con paginación
            const response = {
                success: true,
                data: result.plantillas,
                message: 'Plantillas obtenidas correctamente',
                pagination: null
            };

            if (filters.limit) {
                const totalPages = Math.ceil(result.total / filters.limit);
                response.pagination = {
                    currentPage: filters.page,
                    totalPages,
                    totalItems: result.total,
                    itemsPerPage: filters.limit,
                    hasNextPage: filters.page < totalPages,
                    hasPrevPage: filters.page > 1
                };
            }

            console.log('✅ Plantillas obtenidas:', result.plantillas.length);

            res.status(200).json(response);
        } catch (error) {
            console.error('❌ Error en getAll plantillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener plantillas',
                error: error.message
            });
        }
    }

    // Obtener plantilla por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 GET /plantillas-correo/:id - ID:', id);

            const plantilla = await PlantillasCorreo.getById(id);

            if (!plantilla) {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            console.log('✅ Plantilla encontrada:', plantilla.titulo);

            res.status(200).json({
                success: true,
                message: 'Plantilla obtenida correctamente',
                data: plantilla
            });
        } catch (error) {
            console.error('❌ Error en getById plantilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener plantilla',
                error: error.message
            });
        }
    }

    // Crear nueva plantilla
    static async create(req, res) {
        try {
            console.log('📧 POST /plantillas-correo - Creando plantilla');
            console.log('📋 Body:', req.body);

            // Validar errores de entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ Errores de validación:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: 'Errores de validación',
                    validationErrors: errors.array()
                });
            }

            const { titulo, asunto, contenido, tipo, activo } = req.body;

            // Validaciones adicionales
            if (!titulo || !titulo.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El título es requerido'
                });
            }

            if (!contenido || !contenido.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El contenido es requerido'
                });
            }

            const tiposValidos = ['facturacion', 'corte', 'reconexion', 'bienvenida', 'general'];
            if (tipo && !tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
                });
            }

            const plantillaData = {
                titulo: titulo.trim(),
                asunto: asunto?.trim() || '',
                contenido: contenido.trim(),
                tipo: tipo || 'general',
                activo: activo !== undefined ? Boolean(activo) : true
            };

            const nuevaPlantilla = await PlantillasCorreo.create(plantillaData);

            console.log('✅ Plantilla creada:', nuevaPlantilla.id);

            res.status(201).json({
                success: true,
                message: 'Plantilla creada correctamente',
                data: nuevaPlantilla
            });
        } catch (error) {
            console.error('❌ Error en create plantilla:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una plantilla con ese título'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al crear plantilla',
                error: error.message
            });
        }
    }

    // Actualizar plantilla
    static async update(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 PUT /plantillas-correo/:id - ID:', id);
            console.log('📋 Body:', req.body);

            // Validar errores de entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ Errores de validación:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: 'Errores de validación',
                    validationErrors: errors.array()
                });
            }

            const { titulo, asunto, contenido, tipo, activo } = req.body;

            // Validaciones adicionales
            if (!titulo || !titulo.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El título es requerido'
                });
            }

            if (!contenido || !contenido.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'El contenido es requerido'
                });
            }

            const tiposValidos = ['facturacion', 'corte', 'reconexion', 'bienvenida', 'general'];
            if (tipo && !tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
                });
            }

            const plantillaData = {
                titulo: titulo.trim(),
                asunto: asunto?.trim() || '',
                contenido: contenido.trim(),
                tipo: tipo || 'general',
                activo: activo !== undefined ? Boolean(activo) : true
            };

            const plantillaActualizada = await PlantillasCorreo.update(id, plantillaData);

            console.log('✅ Plantilla actualizada:', id);

            res.status(200).json({
                success: true,
                message: 'Plantilla actualizada correctamente',
                data: plantillaActualizada
            });
        } catch (error) {
            console.error('❌ Error en update plantilla:', error);

            if (error.message === 'Plantilla no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una plantilla con ese título'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al actualizar plantilla',
                error: error.message
            });
        }
    }

    // Eliminar plantilla
    static async delete(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 DELETE /plantillas-correo/:id - ID:', id);

            await PlantillasCorreo.delete(id);

            console.log('✅ Plantilla eliminada:', id);

            res.status(200).json({
                success: true,
                message: 'Plantilla eliminada correctamente'
            });
        } catch (error) {
            console.error('❌ Error en delete plantilla:', error);

            if (error.message === 'Plantilla no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al eliminar plantilla',
                error: error.message
            });
        }
    }

    // Cambiar estado (activo/inactivo)
    static async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 POST /plantillas-correo/:id/toggle - ID:', id);

            const plantillaActualizada = await PlantillasCorreo.toggleStatus(id);

            console.log('✅ Estado de plantilla cambiado:', id);

            res.status(200).json({
                success: true,
                message: `Plantilla ${plantillaActualizada.activo ? 'activada' : 'desactivada'} correctamente`,
                data: plantillaActualizada
            });
        } catch (error) {
            console.error('❌ Error en toggleStatus plantilla:', error);

            if (error.message === 'Plantilla no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al cambiar estado de plantilla',
                error: error.message
            });
        }
    }

    // Obtener plantillas por tipo
    static async getByType(req, res) {
        try {
            const { tipo } = req.params;
            console.log('📧 GET /plantillas-correo/tipo/:tipo - Tipo:', tipo);

            const tiposValidos = ['facturacion', 'corte', 'reconexion', 'bienvenida', 'general'];
            if (!tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
                });
            }

            const plantillas = await PlantillasCorreo.getByType(tipo);

            console.log('✅ Plantillas por tipo obtenidas:', plantillas.length);

            res.status(200).json({
                success: true,
                message: `Plantillas de tipo '${tipo}' obtenidas correctamente`,
                data: plantillas
            });
        } catch (error) {
            console.error('❌ Error en getByType plantillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener plantillas por tipo',
                error: error.message
            });
        }
    }

    // Obtener estadísticas
    static async getStats(req, res) {
        try {
            console.log('📧 GET /plantillas-correo/stats - Obteniendo estadísticas');

            const stats = await PlantillasCorreo.getStats();

            console.log('✅ Estadísticas obtenidas');

            res.status(200).json({
                success: true,
                message: 'Estadísticas obtenidas correctamente',
                data: stats
            });
        } catch (error) {
            console.error('❌ Error en getStats plantillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener estadísticas',
                error: error.message
            });
        }
    }

    // Duplicar plantilla
    static async duplicate(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 POST /plantillas-correo/:id/duplicate - ID:', id);

            const plantillaDuplicada = await PlantillasCorreo.duplicate(id);

            console.log('✅ Plantilla duplicada:', plantillaDuplicada.id);

            res.status(201).json({
                success: true,
                message: 'Plantilla duplicada correctamente',
                data: plantillaDuplicada
            });
        } catch (error) {
            console.error('❌ Error en duplicate plantilla:', error);

            if (error.message === 'Plantilla no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al duplicar plantilla',
                error: error.message
            });
        }
    }

    // Previsualizar plantilla
    static async preview(req, res) {
        try {
            const { id } = req.params;
            console.log('📧 POST /plantillas-correo/:id/preview - ID:', id);
            console.log('📋 Datos ejemplo:', req.body);

            const datosEjemplo = req.body || {};

            const preview = await PlantillasCorreo.preview(id, datosEjemplo);

            console.log('✅ Preview generado');

            res.status(200).json({
                success: true,
                message: 'Preview generado correctamente',
                data: preview
            });
        } catch (error) {
            console.error('❌ Error en preview plantilla:', error);

            if (error.message === 'Plantilla no encontrada') {
                return res.status(404).json({
                    success: false,
                    message: 'Plantilla no encontrada'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al generar preview',
                error: error.message
            });
        }
    }
}

module.exports = PlantillasCorreoController;