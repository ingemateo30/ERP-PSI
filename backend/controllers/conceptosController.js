// backend/controllers/conceptosController.js

const ConceptoFacturacion = require('../models/ConceptoFacturacion');
const { validationResult } = require('express-validator');

class ConceptosController {
    constructor() {
        this.conceptoModel = new ConceptoFacturacion();
    }

    // Obtener todos los conceptos - CONVERTIDO A ARROW FUNCTION
    getAll = async (req, res) => {
        try {
            console.log('🔍 Obteniendo conceptos de facturación');
            console.log('📊 Query params:', req.query);

            const filters = {
                tipo: req.query.tipo,
                activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || null
            };

            // Limpiar filtros vacíos
            Object.keys(filters).forEach(key => {
                if (filters[key] === undefined || filters[key] === '') {
                    delete filters[key];
                }
            });

            const conceptos = await this.conceptoModel.getAll(filters);
            
            console.log('✅ Conceptos obtenidos:', conceptos.length);

            res.json({
                success: true,
                message: 'Conceptos obtenidos exitosamente',
                data: conceptos,
                total: conceptos.length
            });
        } catch (error) {
            console.error('❌ Error obteniendo conceptos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener concepto por ID - CONVERTIDO A ARROW FUNCTION
    getById = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🔍 Obteniendo concepto por ID:', id);

            const concepto = await this.conceptoModel.getById(id);
            
            if (!concepto) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            // Obtener estadísticas de uso
            const usoFacturas = await this.conceptoModel.getUsageCount(id);

            res.json({
                success: true,
                message: 'Concepto obtenido exitosamente',
                data: {
                    ...concepto,
                    uso_facturas: usoFacturas
                }
            });
        } catch (error) {
            console.error('❌ Error obteniendo concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo concepto - CONVERTIDO A ARROW FUNCTION
    create = async (req, res) => {
        try {
            console.log('➕ Creando nuevo concepto:', req.body);

            // Validar errores de express-validator
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    validationErrors: errors.array()
                });
            }

            const conceptoData = {
                codigo: req.body.codigo?.trim().toUpperCase(),
                nombre: req.body.nombre?.trim(),
                valor_base: parseFloat(req.body.valor_base) || 0,
                aplica_iva: Boolean(req.body.aplica_iva),
                porcentaje_iva: parseFloat(req.body.porcentaje_iva) || 0,
                descripcion: req.body.descripcion?.trim() || null,
                tipo: req.body.tipo,
                activo: req.body.activo !== undefined ? Boolean(req.body.activo) : true
            };

            // Validaciones adicionales
            if (!conceptoData.codigo) {
                return res.status(400).json({
                    success: false,
                    message: 'El código es requerido'
                });
            }

            if (!conceptoData.nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre es requerido'
                });
            }

            if (!conceptoData.tipo) {
                return res.status(400).json({
                    success: false,
                    message: 'El tipo es requerido'
                });
            }

            // Validar tipo válido
            const tiposValidos = ['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'];
            if (!tiposValidos.includes(conceptoData.tipo)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}`
                });
            }

            const nuevoConcepto = await this.conceptoModel.create(conceptoData);
            
            console.log('✅ Concepto creado exitosamente:', nuevoConcepto.id);

            res.status(201).json({
                success: true,
                message: 'Concepto creado exitosamente',
                data: nuevoConcepto
            });
        } catch (error) {
            console.error('❌ Error creando concepto:', error);
            
            if (error.message.includes('Ya existe un concepto')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar concepto - CONVERTIDO A ARROW FUNCTION
    update = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('✏️ Actualizando concepto:', id, req.body);

            // Validar errores de express-validator
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    validationErrors: errors.array()
                });
            }

            const updateData = {};

            // Solo incluir campos que se están actualizando
            if (req.body.codigo !== undefined) {
                updateData.codigo = req.body.codigo.trim().toUpperCase();
            }
            if (req.body.nombre !== undefined) {
                updateData.nombre = req.body.nombre.trim();
            }
            if (req.body.valor_base !== undefined) {
                updateData.valor_base = parseFloat(req.body.valor_base) || 0;
            }
            if (req.body.aplica_iva !== undefined) {
                updateData.aplica_iva = Boolean(req.body.aplica_iva);
            }
            if (req.body.porcentaje_iva !== undefined) {
                updateData.porcentaje_iva = parseFloat(req.body.porcentaje_iva) || 0;
            }
            if (req.body.descripcion !== undefined) {
                updateData.descripcion = req.body.descripcion?.trim() || null;
            }
            if (req.body.tipo !== undefined) {
                updateData.tipo = req.body.tipo;
                
                // Validar tipo válido
                const tiposValidos = ['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'];
                if (!tiposValidos.includes(updateData.tipo)) {
                    return res.status(400).json({
                        success: false,
                        message: `Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}`
                    });
                }
            }
            if (req.body.activo !== undefined) {
                updateData.activo = Boolean(req.body.activo);
            }

            const conceptoActualizado = await this.conceptoModel.update(id, updateData);
            
            console.log('✅ Concepto actualizado exitosamente');

            res.json({
                success: true,
                message: 'Concepto actualizado exitosamente',
                data: conceptoActualizado
            });
        } catch (error) {
            console.error('❌ Error actualizando concepto:', error);
            
            if (error.message === 'Concepto no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('Ya existe un concepto')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar concepto - CONVERTIDO A ARROW FUNCTION
    delete = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🗑️ Eliminando concepto:', id);

            await this.conceptoModel.delete(id);
            
            console.log('✅ Concepto eliminado exitosamente');

            res.json({
                success: true,
                message: 'Concepto eliminado exitosamente'
            });
        } catch (error) {
            console.error('❌ Error eliminando concepto:', error);
            
            if (error.message === 'Concepto no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('está siendo usado')) {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado activo/inactivo - CONVERTIDO A ARROW FUNCTION
    toggleStatus = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🔄 Cambiando estado del concepto:', id);

            const conceptoActualizado = await this.conceptoModel.toggleStatus(id);
            
            console.log('✅ Estado cambiado exitosamente');

            res.json({
                success: true,
                message: `Concepto ${conceptoActualizado.activo ? 'activado' : 'desactivado'} exitosamente`,
                data: conceptoActualizado
            });
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            
            if (error.message === 'Concepto no encontrado') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener conceptos por tipo - CONVERTIDO A ARROW FUNCTION
    getByType = async (req, res) => {
        try {
            const { tipo } = req.params;
            console.log('🔍 Obteniendo conceptos por tipo:', tipo);

            const conceptos = await this.conceptoModel.getByType(tipo);
            
            res.json({
                success: true,
                message: `Conceptos de tipo "${tipo}" obtenidos exitosamente`,
                data: conceptos
            });
        } catch (error) {
            console.error('❌ Error obteniendo conceptos por tipo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas - CONVERTIDO A ARROW FUNCTION
    getStats = async (req, res) => {
        try {
            console.log('📊 Obteniendo estadísticas de conceptos');
            console.log('this:', this);
            console.log('this.conceptoModel:', this.conceptoModel);

            const stats = await this.conceptoModel.getStats();
            
            res.json({
                success: true,
                message: 'Estadísticas obtenidas exitosamente',
                data: stats
            });
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener tipos de conceptos disponibles - CONVERTIDO A ARROW FUNCTION
    getTipos = async (req, res) => {
        try {
            const tipos = [
                { value: 'internet', label: 'Internet', description: 'Servicios de conectividad a internet' },
                { value: 'television', label: 'Televisión', description: 'Servicios de televisión por cable' },
                { value: 'reconexion', label: 'Reconexión', description: 'Costos de reconexión de servicios' },
                { value: 'interes', label: 'Intereses', description: 'Intereses por mora en pagos' },
                { value: 'descuento', label: 'Descuentos', description: 'Descuentos aplicables' },
                { value: 'varios', label: 'Varios', description: 'Conceptos diversos' },
                { value: 'publicidad', label: 'Publicidad', description: 'Servicios publicitarios' }
            ];

            res.json({
                success: true,
                message: 'Tipos de conceptos obtenidos exitosamente',
                data: tipos
            });
        } catch (error) {
            console.error('❌ Error obteniendo tipos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new ConceptosController();