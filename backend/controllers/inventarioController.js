// backend/controllers/inventoryController.js

const InventoryModel = require('../models/inventario');
const { validationResult } = require('express-validator');
const { Database } = require('../models/Database');
const xlsx = require('xlsx');

class InventoryController {

    // ==========================================
    // GESTIÓN DE EQUIPOS
    // ==========================================

    /**
     * Obtener todos los equipos con filtros y paginación
     */
    static async getAllEquipment(req, res) {
        try {
            const filters = {
                tipo: req.query.tipo,
                estado: req.query.estado,
                instalador_id: req.query.instalador_id,
                search: req.query.search,
                disponible: req.query.disponible === 'true',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                orderBy: req.query.orderBy || 'updated_at',
                orderDirection: req.query.orderDirection || 'DESC'
            };

            // Solo instaladores se restringen a sus propios equipos por sede
            // Secretaria/supervisor ven todo el inventario para gestión completa
            if (req.user.rol === 'instalador' && req.user.sede) {
                filters.sede = req.user.sede;
            } else if (req.user.rol === 'administrador' && req.query.sede) {
                // Admin puede filtrar por sede manualmente
                filters.sede = req.query.sede;
            }

            // Calcular offset para paginación
            filters.offset = (filters.page - 1) * filters.limit;

            const result = await InventoryModel.getAll(filters);

            res.json({
                success: true,
                data: {
                    equipos: result.equipos,
                    pagination: {
                        currentPage: filters.page,
                        totalPages: result.pagination.pages,
                        totalItems: result.pagination.total,
                        itemsPerPage: filters.limit,
                        hasNextPage: filters.page < result.pagination.pages,
                        hasPrevPage: filters.page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error en getAllEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener equipo por ID
     */
    static async getEquipmentById(req, res) {
        try {
            const { id } = req.params;
            const equipo = await InventoryModel.getById(id);

            if (!equipo) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipo no encontrado'
                });
            }

            res.json({
                success: true,
                data: equipo
            });
        } catch (error) {
            console.error('Error en getEquipmentById:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Crear nuevo equipo
     */
    static async createEquipment(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors: errors.array()
                });
            }

            const cantidad = parseInt(req.body.cantidad) || 1;

            // Parsear seriales si se proporcionaron
            let serialesArray = [];
            const serialesRaw = req.body.seriales;
            if (serialesRaw) {
                if (Array.isArray(serialesRaw)) {
                    serialesArray = serialesRaw.map(s => String(s).trim()).filter(s => s);
                } else {
                    serialesArray = String(serialesRaw).split(/[\n,]/).map(s => s.trim()).filter(s => s);
                }
            }

            // Validar que seriales coincidan con cantidad si se proporcionaron
            if (serialesArray.length > 0 && serialesArray.length !== cantidad) {
                return res.status(400).json({
                    success: false,
                    message: `Se proporcionaron ${serialesArray.length} seriales pero la cantidad es ${cantidad}. Deben coincidir.`
                });
            }

            const baseData = {
                nombre: req.body.nombre.trim(),
                tipo: req.body.tipo,
                marca: req.body.marca?.trim(),
                modelo: req.body.modelo?.trim(),
                estado: req.body.estado || 'disponible',
                precio_compra: req.body.precio_compra,
                fecha_compra: req.body.fecha_compra,
                proveedor: req.body.proveedor?.trim(),
                ubicacion: req.body.ubicacion?.trim(),
                sede: req.body.sede?.trim() || null,
                observaciones: req.body.observaciones?.trim()
            };

            if (cantidad === 1) {
                // Verificar que el código no exista
                const codeAvailable = await InventoryModel.checkCodeAvailability(req.body.codigo);
                if (!codeAvailable) {
                    return res.status(400).json({
                        success: false,
                        message: 'El código del equipo ya existe'
                    });
                }

                const equipoData = {
                    ...baseData,
                    codigo: req.body.codigo.toUpperCase().trim(),
                    numero_serie: req.body.numero_serie?.trim() || (serialesArray[0] || null)
                };

                const nuevoEquipo = await InventoryModel.create(equipoData, req.user.id);

                return res.status(201).json({
                    success: true,
                    message: 'Equipo creado exitosamente',
                    data: nuevoEquipo
                });
            }

            // Creación por lotes (cantidad > 1)
            const baseCodigo = req.body.codigo.toUpperCase().trim();
            const creados = [];
            const erroresCreacion = [];

            for (let i = 1; i <= cantidad; i++) {
                const suffix = String(i).padStart(3, '0');
                const codigo = `${baseCodigo}-${suffix}`;

                const available = await InventoryModel.checkCodeAvailability(codigo);
                if (!available) {
                    erroresCreacion.push(`Código ${codigo} ya existe, se omitió`);
                    continue;
                }

                const equipoData = {
                    ...baseData,
                    codigo,
                    numero_serie: serialesArray[i - 1] || null
                };

                try {
                    const equipo = await InventoryModel.create(equipoData, req.user.id);
                    creados.push(equipo);
                } catch (createErr) {
                    erroresCreacion.push(`Error creando ${codigo}: ${createErr.message}`);
                }
            }

            return res.status(201).json({
                success: true,
                message: `${creados.length} equipo(s) creado(s) exitosamente`,
                data: creados,
                errores: erroresCreacion
            });
        } catch (error) {
            console.error('Error en createEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Actualizar equipo
     */
    static async updateEquipment(req, res) {
        try {
            const { id } = req.params;
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors: errors.array()
                });
            }

            // Verificar que el equipo existe
            const equipoExistente = await InventoryModel.getById(id);
            if (!equipoExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Equipo no encontrado'
                });
            }

            // Verificar que el código no exista en otro equipo
            if (req.body.codigo && req.body.codigo !== equipoExistente.codigo) {
                const codeAvailable = await InventoryModel.checkCodeAvailability(req.body.codigo, id);
                if (!codeAvailable) {
                    return res.status(400).json({
                        success: false,
                        message: 'El código del equipo ya existe'
                    });
                }
            }

            const equipoData = {
                codigo: req.body.codigo?.toUpperCase().trim() || equipoExistente.codigo,
                nombre: req.body.nombre?.trim() || equipoExistente.nombre,
                tipo: req.body.tipo || equipoExistente.tipo,
                marca: req.body.marca?.trim() || equipoExistente.marca,
                modelo: req.body.modelo?.trim() || equipoExistente.modelo,
                numero_serie: req.body.numero_serie?.trim() || equipoExistente.numero_serie,
                precio_compra: req.body.precio_compra !== undefined ? req.body.precio_compra : equipoExistente.precio_compra,
                fecha_compra: req.body.fecha_compra || equipoExistente.fecha_compra,
                proveedor: req.body.proveedor?.trim() || equipoExistente.proveedor,
                ubicacion: req.body.ubicacion?.trim() || equipoExistente.ubicacion,
                sede: req.body.sede !== undefined ? (req.body.sede?.trim() || null) : equipoExistente.sede,
                observaciones: req.body.observaciones?.trim() || equipoExistente.observaciones
            };

            const equipoActualizado = await InventoryModel.update(id, equipoData, req.user.id);

            res.json({
                success: true,
                message: 'Equipo actualizado exitosamente',
                data: equipoActualizado
            });
        } catch (error) {
            console.error('Error en updateEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Eliminar equipo
     */
    static async deleteEquipment(req, res) {
        try {
            const { id } = req.params;

            await InventoryModel.delete(id);

            res.json({
                success: true,
                message: 'Equipo eliminado exitosamente'
            });
        } catch (error) {
            console.error('Error en deleteEquipment:', error);

            if (error.message.includes('No se puede eliminar')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ==========================================
    // GESTIÓN DE ASIGNACIONES
    // ==========================================

    /**
     * Asignar equipo a instalador
     */
    static async assignToInstaller(req, res) {
        try {
            const { id } = req.params;
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors: errors.array()
                });
            }

            const assignmentData = {
                ubicacion: req.body.ubicacion?.trim(),
                notas: req.body.notas?.trim()
            };

            const equipoAsignado = await InventoryModel.assignToInstaller(
                id,
                req.body.instalador_id,
                assignmentData,
                req.user.id
            );

            res.json({
                success: true,
                message: 'Equipo asignado exitosamente al instalador',
                data: equipoAsignado
            });
        } catch (error) {
            console.error('Error en assignToInstaller:', error);

            if (error.message.includes('no está disponible') || error.message.includes('no es un instalador')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Devolver equipo
     */
    static async returnEquipment(req, res) {
        try {
            const { id } = req.params;

            const returnData = {
                ubicacion_devolucion: req.body.ubicacion_devolucion?.trim() || 'Almacén Principal',
                notas: req.body.notas?.trim()
            };

            const equipoDevuelto = await InventoryModel.returnEquipment(id, returnData, req.user.id);

            res.json({
                success: true,
                message: 'Equipo devuelto exitosamente',
                data: equipoDevuelto
            });
        } catch (error) {
            console.error('Error en returnEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Marcar equipo como instalado
     */
    static async markAsInstalled(req, res) {
        try {
            const { id } = req.params;
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos de entrada inválidos',
                    errors: errors.array()
                });
            }

            const installationData = {
                instalador_id: req.body.instalador_id,
                ubicacion_cliente: req.body.ubicacion_cliente?.trim(),
                coordenadas_lat: req.body.coordenadas_lat,
                coordenadas_lng: req.body.coordenadas_lng,
                notas: req.body.notas?.trim(),
                cliente_id: req.body.cliente_id,
                instalacion_id: req.body.instalacion_id
            };

            const equipoInstalado = await InventoryModel.markAsInstalled(id, installationData, req.user.id);

            res.json({
                success: true,
                message: 'Equipo marcado como instalado exitosamente',
                data: equipoInstalado
            });
        } catch (error) {
            console.error('Error en markAsInstalled:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener equipos de un instalador
     */
    static async getInstallerEquipment(req, res) {
        try {
            const { instaladorId } = req.params;
            const { estado } = req.query;

            const equipos = await InventoryModel.getByInstaller(instaladorId, estado);

            res.json({
                success: true,
                message: equipos
            });
        } catch (error) {
            console.error('Error en getInstallerEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Actualizar ubicación de equipo (para instaladores móviles)
     */
    static async updateLocation(req, res) {
        try {
            const { id } = req.params;

            const locationData = {
                lat: req.body.lat,
                lng: req.body.lng,
                direccion: req.body.direccion?.trim()
            };

            const equipoActualizado = await InventoryModel.updateLocation(id, locationData, req.user.id);

            res.json({
                success: true,
                message: 'Ubicación actualizada exitosamente',
                data: equipoActualizado
            });
        } catch (error) {
            console.error('Error en updateLocation:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ==========================================
    // HISTORIAL Y REPORTES
    // ==========================================

    /**
     * Obtener historial de un equipo
     */
    static async getEquipmentHistory(req, res) {
        try {
            const { id } = req.params;

            const historial = await InventoryModel.getHistory(id);

            res.json({
                success: true,
                message: historial
            });
        } catch (error) {
            console.error('Error en getEquipmentHistory:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener historial de un instalador
     */
    static async getInstallerHistory(req, res) {
        try {
            const { instaladorId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            const historial = await InventoryModel.getInstallerHistory(instaladorId, limit);

            res.json({
                success: true,
                message: historial
            });
        } catch (error) {
            console.error('Error en getInstallerHistory:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

   
    /**
     * Obtener reporte por rango de fechas
     */
/**
 * Obtener estadísticas del inventario
 */
 static async getStats(req, res) {
        try {
            const stats = await InventoryModel.getStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error en getStats:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    // ==========================================
    // UTILIDADES
    // ==========================================

    /**
     * Obtener equipos disponibles
     */
    static async getAvailableEquipment(req, res) {
        try {
            const { tipo } = req.query;

            const equipos = await InventoryModel.getAvailableEquipment(tipo);

            res.json({
                success: true,
                message: equipos
            });
        } catch (error) {
            console.error('Error en getAvailableEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener instaladores activos
     */
    static async getActiveInstallers(req, res) {
        try {
            const instaladores = await InventoryModel.getActiveInstallers();

            res.json({
                success: true,
                message: instaladores
            });
        } catch (error) {
            console.error('Error en getActiveInstallers:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Buscar equipos
     */
    static async searchEquipment(req, res) {
        try {
            const { q } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'El término de búsqueda debe tener al menos 2 caracteres'
                });
            }

            const equipos = await InventoryModel.search(q.trim());

            res.json({
                success: true,
                message: equipos
            });
        } catch (error) {
            console.error('Error en searchEquipment:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener tipos de equipos
     */
    static async getTypes(req, res) {
        try {
            const tipos = await InventoryModel.getTypes();

            res.json({
                success: true,
                message: tipos
            });
        } catch (error) {
            console.error('Error en getTypes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Obtener marcas por tipo
     */
    static async getBrandsByType(req, res) {
        try {
            const { tipo } = req.params;

            const marcas = await InventoryModel.getBrandsByType(tipo);

            res.json({
                success: true,
                message: marcas
            });
        } catch (error) {
            console.error('Error en getBrandsByType:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Importación masiva de equipos desde archivo Excel
     */
    static async bulkUpload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No se recibió ningún archivo'
                });
            }

            const sede = req.body.sede || null;

            // Parsear el archivo Excel desde buffer
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

            if (!rows || rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El archivo Excel está vacío o no tiene datos'
                });
            }

            const tiposValidos = ['router', 'decodificador', 'cable', 'antena', 'splitter', 'amplificador', 'otro'];

            // Aliases de tipos aceptados (normalizados a los tipos válidos)
            const tipoAliases = {
                'television': 'decodificador', 'televisión': 'decodificador',
                'tv': 'decodificador', 'decodificadores': 'decodificador', 'decoder': 'decodificador',
                'routers': 'router', 'wifi': 'router', 'access point': 'otro', 'accesspoint': 'otro',
                'cables': 'cable', 'cable coaxial': 'cable', 'fibra': 'cable', 'cable utp': 'cable',
                'antenas': 'antena', 'antenna': 'antena',
                'splitters': 'splitter', 'divisor': 'splitter',
                'amplificadores': 'amplificador', 'amplifier': 'amplificador',
                'otros': 'otro', 'switch': 'otro', 'switches': 'otro',
                'ups': 'otro', 'modem': 'router', 'onu': 'router', 'olt': 'otro',
                'no aplica': 'otro', 'no_aplica': 'otro', 'n/a': 'otro', 'na': 'otro',
                'sin tipo': 'otro', 'sin_tipo': 'otro', 'ninguno': 'otro', 'desconocido': 'otro'
            };

            const normalizarTipo = (tipoRaw) => {
                if (!tipoRaw) return 'otro';
                const t = tipoRaw.trim().toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes
                if (tiposValidos.includes(t)) return t;
                if (tipoAliases[t]) return tipoAliases[t];
                return null; // Tipo inválido
            };

            // Normalizar y validar filas
            const equiposData = [];
            const validationErrors = [];

            rows.forEach((row, idx) => {
                const fila = idx + 2;
                const codigoBase = String(
                    row.codigo || row.Codigo || row.CODIGO ||
                    row['Código'] || row['CÓDIGO'] || ''
                ).trim().toUpperCase();
                const nombre = String(
                    row.nombre || row.Nombre || row.NOMBRE ||
                    row.descripcion || row.Descripcion || row.DESCRIPCION || ''
                ).trim();
                const tipoRaw = String(
                    row.tipo || row.Tipo || row.TIPO ||
                    row.type || row.Type || row.TYPE || ''
                ).trim();
                const tipoNormalizado = normalizarTipo(tipoRaw);
                const cantidad = parseInt(row.cantidad || row.Cantidad || row.CANTIDAD || 1) || 1;
                const serialesRaw = String(row.seriales || row.Seriales || row.SERIALES || '').trim();

                if (!codigoBase) {
                    validationErrors.push({ fila, error: 'Código es obligatorio (columna: codigo)' });
                    return;
                }
                if (!nombre) {
                    validationErrors.push({ fila, error: 'Nombre es obligatorio (columna: nombre)' });
                    return;
                }
                if (!tipoNormalizado) {
                    validationErrors.push({ fila, error: `Tipo '${tipoRaw}' no válido. Use: ${tiposValidos.join(', ')}` });
                    return;
                }
                const tipo = tipoNormalizado;

                const baseEquipo = {
                    nombre,
                    tipo,
                    marca: String(row.marca || row.Marca || row.MARCA || '').trim() || null,
                    modelo: String(row.modelo || row.Modelo || row.MODELO || '').trim() || null,
                    estado: 'disponible',
                    precio_compra: parseFloat(row.precio_compra || row.PrecioCompra || row.PRECIO_COMPRA || 0) || null,
                    fecha_compra: row.fecha_compra || row.FechaCompra || null,
                    proveedor: String(row.proveedor || row.Proveedor || row.PROVEEDOR || '').trim() || null,
                    ubicacion: String(row.ubicacion || row.Ubicacion || row.UBICACION || '').trim() || null,
                    sede: String(row.sede || row.Sede || row.SEDE || sede || '').trim() || null,
                    observaciones: String(row.observaciones || row.Observaciones || row.OBSERVACIONES || '').trim() || null
                };

                if (cantidad === 1) {
                    // Fila única
                    const numero_serie = String(row.numero_serie || row.NumeroSerie || row.NUMERO_SERIE || serialesRaw || '').trim() || null;
                    equiposData.push({ ...baseEquipo, codigo: codigoBase, numero_serie });
                } else {
                    // Expandir fila en múltiples equipos
                    const serialesArr = serialesRaw
                        ? serialesRaw.split(/[,\n]/).map(s => s.trim()).filter(s => s)
                        : [];

                    for (let i = 1; i <= cantidad; i++) {
                        const suffix = String(i).padStart(3, '0');
                        const codigo = `${codigoBase}-${suffix}`;
                        const numero_serie = serialesArr[i - 1] || null;
                        equiposData.push({ ...baseEquipo, codigo, numero_serie });
                    }
                }
            });

            if (validationErrors.length > 0 && equiposData.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Todos los registros tienen errores de validación (${validationErrors.length} filas con error). Tipos válidos: ${tiposValidos.join(', ')}. Revise que las columnas del Excel sean: codigo, nombre, tipo, marca, modelo, numero_serie, cantidad, seriales.`,
                    errores: validationErrors
                });
            }

            const result = await InventoryModel.bulkCreate(equiposData, req.user.id);

            res.json({
                success: true,
                message: `Importación completada: ${result.inserted.length} equipos insertados`,
                insertados: result.inserted.length,
                erroresValidacion: validationErrors,
                erroresInsercion: result.errors
            });

        } catch (error) {
            console.error('Error en bulkUpload:', error);
            res.status(500).json({
                success: false,
                message: 'Error procesando el archivo',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Descargar plantilla Excel para importación masiva
     */
    static downloadTemplate(req, res) {
        try {
            const headers = [
                'codigo', 'nombre', 'tipo', 'marca', 'modelo', 'numero_serie',
                'cantidad', 'seriales',
                'precio_compra', 'fecha_compra', 'proveedor', 'ubicacion', 'sede', 'observaciones'
            ];

            const example = [
                'RTR001', 'Router WiFi AC1200', 'router', 'TP-Link', 'Archer C6', '',
                3, 'SER001,SER002,SER003',
                75000, '2025-01-15', 'Distribuidora Tech', 'Almacén Principal', 'Sede Central', 'Equipo nuevo'
            ];

            const exampleSingle = [
                'DEC001', 'Decodificador HD', 'decodificador', 'ZTE', 'ZXV10', 'DEC-001-SN',
                1, '',
                50000, '2025-01-15', 'Distribuidora Tech', 'Almacén Principal', 'Sede Sur', ''
            ];

            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.aoa_to_sheet([headers, example, exampleSingle]);
            xlsx.utils.book_append_sheet(wb, ws, 'Inventario');

            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', 'attachment; filename=plantilla_inventario.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error) {
            console.error('Error generando plantilla:', error);
            res.status(500).json({ success: false, message: 'Error generando plantilla' });
        }
    }

    /**
     * Verificar disponibilidad de código
     */
    static async checkCodeAvailability(req, res) {
        try {
            const { codigo } = req.params;
            const { excludeId } = req.query;

            const available = await InventoryModel.checkCodeAvailability(codigo, excludeId);

            res.json({
                success: true,
                data: {
                    available,
                    codigo
                }
            });
        } catch (error) {
            console.error('Error en checkCodeAvailability:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = InventoryController;