// backend/controllers/conceptosController.js - ACTUALIZADO

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

            // Validar ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de concepto inválido'
                });
            }

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
            console.log('➕ Creando nuevo concepto');
            console.log('📊 Datos recibidos:', req.body);

            // Validar datos de entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Errores de validación',
                    errors: errors.array()
                });
            }

            const {
                codigo,
                nombre,
                valor_base,
                aplica_iva,
                porcentaje_iva,
                descripcion,
                tipo,
                activo
            } = req.body;

            // Verificar que el código no exista
            const codigoExists = await this.conceptoModel.existsCode(codigo.toUpperCase());
            if (codigoExists) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un concepto con este código'
                });
            }

            const conceptoData = {
                codigo: codigo.toUpperCase(),
                nombre: nombre.trim(),
                valor_base: parseFloat(valor_base) || 0,
                aplica_iva: Boolean(aplica_iva),
                porcentaje_iva: parseFloat(porcentaje_iva) || 0,
                descripcion: descripcion ? descripcion.trim() : null,
                tipo,
                activo: activo !== undefined ? Boolean(activo) : true
            };

            const nuevoConcepto = await this.conceptoModel.create(conceptoData);

            console.log('✅ Concepto creado exitosamente:', nuevoConcepto.id);

            res.status(201).json({
                success: true,
                message: 'Concepto creado exitosamente',
                data: nuevoConcepto
            });
        } catch (error) {
            console.error('❌ Error creando concepto:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar concepto - CONVERTIDO A ARROW FUNCTION
    update = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('✏️ Actualizando concepto ID:', id);
            console.log('📊 Datos recibidos:', req.body);

            // Validar ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de concepto inválido'
                });
            }

            // Validar datos de entrada
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Errores de validación',
                    errors: errors.array()
                });
            }

            const {
                codigo,
                nombre,
                valor_base,
                aplica_iva,
                porcentaje_iva,
                descripcion,
                tipo,
                activo
            } = req.body;

            // Verificar que el código no exista en otro concepto
            if (codigo) {
                const codigoExists = await this.conceptoModel.existsCode(codigo.toUpperCase(), id);
                if (codigoExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro concepto con este código'
                    });
                }
            }

            const conceptoData = {
                codigo: codigo ? codigo.toUpperCase() : undefined,
                nombre: nombre ? nombre.trim() : undefined,
                valor_base: valor_base !== undefined ? parseFloat(valor_base) || 0 : undefined,
                aplica_iva: aplica_iva !== undefined ? Boolean(aplica_iva) : undefined,
                porcentaje_iva: porcentaje_iva !== undefined ? parseFloat(porcentaje_iva) || 0 : undefined,
                descripcion: descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : undefined,
                tipo: tipo || undefined,
                activo: activo !== undefined ? Boolean(activo) : undefined
            };

            // Remover campos undefined
            Object.keys(conceptoData).forEach(key => {
                if (conceptoData[key] === undefined) {
                    delete conceptoData[key];
                }
            });

            const conceptoActualizado = await this.conceptoModel.update(id, conceptoData);

            console.log('✅ Concepto actualizado exitosamente');

            res.json({
                success: true,
                message: 'Concepto actualizado exitosamente',
                data: conceptoActualizado
            });
        } catch (error) {
            console.error('❌ Error actualizando concepto:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar concepto - CONVERTIDO A ARROW FUNCTION
    delete = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🗑️ Eliminando concepto ID:', id);

            // Validar ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de concepto inválido'
                });
            }

            const result = await this.conceptoModel.delete(id);

            console.log('✅ Concepto eliminado exitosamente');

            res.json({
                success: true,
                message: 'Concepto eliminado exitosamente',
                data: result
            });
        } catch (error) {
            console.error('❌ Error eliminando concepto:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado activo/inactivo - CONVERTIDO A ARROW FUNCTION
    toggleStatus = async (req, res) => {
        try {
            const { id } = req.params;
            console.log('🔄 Cambiando estado de concepto ID:', id);

            // Validar ID
            if (!id || isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de concepto inválido'
                });
            }

            const conceptoActualizado = await this.conceptoModel.toggleStatus(id);

            console.log('✅ Estado del concepto cambiado exitosamente');

            res.json({
                success: true,
                message: 'Estado del concepto cambiado exitosamente',
                data: conceptoActualizado
            });
        } catch (error) {
            console.error('❌ Error cambiando estado:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas - CONVERTIDO A ARROW FUNCTION
    getStats = async (req, res) => {
        try {
            console.log('📊 Obteniendo estadísticas de conceptos');

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

    // Obtener conceptos por tipo - CONVERTIDO A ARROW FUNCTION
    getByType = async (req, res) => {
        try {
            const { tipo } = req.params;
            console.log('🔍 Obteniendo conceptos por tipo:', tipo);

            // Validar tipo
            const tiposValidos = ['internet', 'television', 'reconexion', 'interes', 'descuento', 'varios', 'publicidad'];
            if (!tiposValidos.includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de concepto inválido'
                });
            }

            const conceptos = await this.conceptoModel.getByType(tipo);
            
            res.json({
                success: true,
                message: `Conceptos de tipo '${tipo}' obtenidos exitosamente`,
                data: conceptos,
                total: conceptos.length
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

    // Obtener tipos de conceptos disponibles - CONVERTIDO A ARROW FUNCTION
    getTipos = async (req, res) => {
        try {
            console.log('📋 Obteniendo tipos de conceptos disponibles');

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

    // Importación masiva de conceptos - CONVERTIDO A ARROW FUNCTION
    bulkCreate = async (req, res) => {
        try {
            console.log('📦 Iniciando importación masiva de conceptos');
            
            const { conceptos } = req.body;

            if (!Array.isArray(conceptos) || conceptos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere un array de conceptos válido'
                });
            }

            if (conceptos.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Máximo 100 conceptos por lote'
                });
            }

            const resultados = {
                exitosos: [],
                errores: [],
                total: conceptos.length
            };

            // Procesar cada concepto
            for (let i = 0; i < conceptos.length; i++) {
                try {
                    const concepto = conceptos[i];
                    
                    // Validaciones básicas
                    if (!concepto.codigo || !concepto.nombre || !concepto.tipo) {
                        resultados.errores.push({
                            posicion: i + 1,
                            concepto: concepto,
                            error: 'Código, nombre y tipo son obligatorios'
                        });
                        continue;
                    }

                    // Verificar código duplicado
                    const codigoExists = await this.conceptoModel.existsCode(concepto.codigo.toUpperCase());
                    if (codigoExists) {
                        resultados.errores.push({
                            posicion: i + 1,
                            concepto: concepto,
                            error: `El código '${concepto.codigo}' ya existe`
                        });
                        continue;
                    }

                    const conceptoData = {
                        codigo: concepto.codigo.toUpperCase(),
                        nombre: concepto.nombre.trim(),
                        valor_base: parseFloat(concepto.valor_base) || 0,
                        aplica_iva: Boolean(concepto.aplica_iva),
                        porcentaje_iva: parseFloat(concepto.porcentaje_iva) || 0,
                        descripcion: concepto.descripcion ? concepto.descripcion.trim() : null,
                        tipo: concepto.tipo,
                        activo: concepto.activo !== undefined ? Boolean(concepto.activo) : true
                    };

                    const nuevoConcepto = await this.conceptoModel.create(conceptoData);
                    
                    resultados.exitosos.push({
                        posicion: i + 1,
                        concepto: nuevoConcepto
                    });

                } catch (error) {
                    console.error(`Error procesando concepto ${i + 1}:`, error);
                    resultados.errores.push({
                        posicion: i + 1,
                        concepto: conceptos[i],
                        error: error.message
                    });
                }
            }

            console.log('✅ Importación masiva completada:', {
                total: resultados.total,
                exitosos: resultados.exitosos.length,
                errores: resultados.errores.length
            });

            res.status(201).json({
                success: true,
                message: `Importación completada: ${resultados.exitosos.length} exitosos, ${resultados.errores.length} errores`,
                data: {
                    conceptos_creados: resultados.exitosos,
                    conceptos_error: resultados.errores,
                    resumen: {
                        total_procesados: resultados.total,
                        exitosos: resultados.exitosos.length,
                        fallidos: resultados.errores.length,
                        porcentaje_exito: Math.round((resultados.exitosos.length / resultados.total) * 100)
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error en importación masiva:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new ConceptosController();