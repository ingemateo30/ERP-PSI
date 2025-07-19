// frontend/src/services/contratosService.js
import apiService from './apiService';

const API_BASE = '/contratos';

class ContratosService {

    /**
     * Obtener todos los contratos con filtros y paginación
     */
    async obtenerTodos(params = {}) {
        try {
            console.log('📋 Obteniendo contratos:', params);

            const response = await apiService.get(API_BASE, params);

            console.log('✅ Contratos obtenidos exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo contratos:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Obtener contrato por ID
     */
    async obtenerPorId(id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`📄 Obteniendo contrato ID: ${id}`);

            const response = await apiService.get(`${API_BASE}/${id}`);

            console.log('✅ Contrato obtenido exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Generar PDF del contrato
     */
    async generarPDF(id, download = true) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`📄 Generando PDF del contrato ID: ${id}`);

            const response = await apiService.request(`${API_BASE}/${id}/pdf`, {
                method: 'GET',
                responseType: 'blob',
                headers: { 'Accept': 'application/pdf' }
            });

            // Validación del blob
            if (!(response.data instanceof Blob)) {
                throw new Error('Respuesta inválida del servidor');
            }

            if (download && response.data) {
                // Crear enlace de descarga
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `contrato_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }

            console.log('✅ PDF del contrato generado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error generando PDF del contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Actualizar estado del contrato
     */
    async actualizarEstado(id, datos) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`🔄 Actualizando estado del contrato ID: ${id}`, datos);

            const response = await apiService.put(`${API_BASE}/${id}/estado`, datos);

            console.log('✅ Estado del contrato actualizado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error actualizando estado del contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Obtener estadísticas de contratos
     */
    async obtenerEstadisticas() {
        try {
            console.log('📊 Obteniendo estadísticas de contratos');

            const response = await apiService.get(`${API_BASE}/stats`);

            console.log('✅ Estadísticas obtenidas exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Firmar contrato (marcar como firmado)
     */
    async firmarContrato(id, fechaFirma = null) {
        try {
            const datos = {
                estado: 'activo',
                fecha_firma: fechaFirma || new Date().toISOString().split('T')[0],
                observaciones: 'Contrato firmado por el cliente'
            };

            return await this.actualizarEstado(id, datos);
        } catch (error) {
            console.error('❌ Error firmando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Anular contrato
     */
    async anularContrato(id, motivo = '') {
        try {
            const datos = {
                estado: 'anulado',
                observaciones: motivo || 'Contrato anulado'
            };

            return await this.actualizarEstado(id, datos);
        } catch (error) {
            console.error('❌ Error anulando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Terminar contrato
     */
    async terminarContrato(id, motivo = '') {
        try {
            const datos = {
                estado: 'terminado',
                observaciones: motivo || 'Contrato terminado'
            };

            return await this.actualizarEstado(id, datos);
        } catch (error) {
            console.error('❌ Error terminando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Buscar contratos por cliente
     */
    async buscarPorCliente(clienteId, params = {}) {
        try {
            const filtros = {
                ...params,
                cliente_id: clienteId
            };

            return await this.obtenerTodos(filtros);
        } catch (error) {
            console.error('❌ Error buscando contratos por cliente:', error);
            throw this.handleError(error);
        }
    }

    /**
 * Obtener contratos para firma (con filtros específicos)
 */
    async obtenerContratosParaFirma(params = {}) {
        try {
            console.log('✍️ Obteniendo contratos para firma:', params);

            // Construir parámetros específicos para firma
            const filtros = {
                limit: 50,
                estado: 'activo',
                ...params
            };

            // Manejo de filtros específicos de firma
            if (params.filtroEstado === 'pendiente') {
                filtros.firmado = 'false';
            } else if (params.filtroEstado === 'firmado') {
                filtros.firmado = 'true';
            } else if (params.filtroEstado !== 'todos' && params.filtroEstado) {
                filtros.estado = params.filtroEstado;
            }

            // Limpiar filtroEstado ya que no es un parámetro del backend
            delete filtros.filtroEstado;

            const response = await apiService.get(API_BASE, filtros);

            console.log('✅ Contratos para firma obtenidos exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo contratos para firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Buscar contratos para firma
     */
    async buscarContratosParaFirma(termino, filtroEstado = 'todos') {
        try {
            console.log('🔍 Buscando contratos para firma:', { termino, filtroEstado });

            if (!termino || termino.length < 2) {
                return await this.obtenerContratosParaFirma({ filtroEstado });
            }

            const filtros = {
                search: termino,
                limit: 20,
                filtroEstado
            };

            return await this.obtenerContratosParaFirma(filtros);
        } catch (error) {
            console.error('❌ Error buscando contratos para firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Procesar firma de contrato
     */
    async procesarFirmaContrato(id, datosF, irma) {
        try {
            console.log(`✍️ Procesando firma del contrato ID: ${id}`);

            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            const datos = {
                estado: 'activo',
                fecha_firma: datosF.irma.fecha_firma || new Date().toISOString().split('T')[0],
                observaciones: datosF.irma.observaciones || 'Contrato firmado por el cliente',
                lugar_firma: datosF.irma.lugar_firma || '',
                firmado_por: datosF.irma.firmado_por || ''
            };

            const response = await apiService.put(`${API_BASE}/${id}/estado`, datos);

            console.log('✅ Firma procesada exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error procesando firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Filtrar contratos por estado
     */
    async filtrarPorEstado(estado, params = {}) {
        try {
            const filtros = {
                ...params,
                estado: estado
            };

            return await this.obtenerTodos(filtros);
        } catch (error) {
            console.error('❌ Error filtrando contratos por estado:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Obtener contratos próximos a vencer
     */
    async obtenerProximosAVencer(dias = 30) {
        try {
            console.log(`⏰ Obteniendo contratos próximos a vencer en ${dias} días`);

            // Calcular fecha límite
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() + dias);

            const params = {
                estado: 'activo',
                fecha_vencimiento_hasta: fechaLimite.toISOString().split('T')[0]
            };

            return await this.obtenerTodos(params);
        } catch (error) {
            console.error('❌ Error obteniendo contratos próximos a vencer:', error);
            throw this.handleError(error);
        }
    }

    async cargarContratoParaFirma(id) {
        try {
            console.log(`📋 Cargando contrato para firma ID: ${id}`);

            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            const response = await apiService.get(`${API_BASE}/${id}/abrir-firma`);

            console.log('✅ Contrato para firma cargado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error cargando contrato para firma:', error);
            throw this.handleError(error);
        }
    }

    async obtenerUrlPDF(id) {
    try {
        // Retornar URL con token para autenticación
        const token = localStorage.getItem('token');
        return `${API_BASE}/${id}/pdf?t=${Date.now()}&authorization=${token}`;
    } catch (error) {
        throw this.handleError(error);
    }
}
    /**
     * Procesar firma digital con canvas/imagen y guardar PDF
     */
    async procesarFirmaDigital(id, datosSignature) {
        try {
            console.log(`🖊️ Procesando firma digital del contrato ID: ${id}`);

            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            // Este endpoint debe:
            // 1. Procesar la firma digital
            // 2. Generar PDF firmado
            // 3. Guardar PDF en servidor
            // 4. Actualizar campos: documento_pdf_path, firmado_cliente, fecha_firma
            const response = await apiService.post(`${API_BASE}/${id}/procesar-firma`, datosSignature);

            console.log('✅ Firma digital procesada y PDF guardado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error procesando firma digital:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Manejar errores de la API
     */
    handleError(error) {
        if (error.response) {
            // Error del servidor
            const message = error.response.data?.message || 'Error del servidor';
            const status = error.response.status;

            if (status === 401) {
                // Token expirado, redirigir al login
                window.location.href = '/login';
                return new Error('Sesión expirada');
            }

            return new Error(`${message} (${status})`);
        } else if (error.request) {
            // Error de red
            return new Error('Error de conexión');
        } else {
            // Error interno
            return new Error(error.message || 'Error interno');
        }
    }

    /**
     * Validar datos del contrato
     */
    validarDatos(datos) {
        const errores = [];

        if (!datos.cliente_id) {
            errores.push('ID del cliente es requerido');
        }

        if (!datos.servicio_id) {
            errores.push('ID del servicio es requerido');
        }

        if (datos.permanencia_meses && datos.permanencia_meses < 0) {
            errores.push('Los meses de permanencia no pueden ser negativos');
        }

        if (datos.costo_instalacion && datos.costo_instalacion < 0) {
            errores.push('El costo de instalación no puede ser negativo');
        }

        return errores;
    }

    /**
     * Formatear datos para mostrar
     */
    formatearContrato(contrato) {
        return {
            ...contrato,
            fecha_generacion_formatted: contrato.fecha_generacion
                ? new Date(contrato.fecha_generacion).toLocaleDateString('es-CO')
                : 'N/A',
            fecha_inicio_formatted: contrato.fecha_inicio
                ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CO')
                : 'N/A',
            fecha_vencimiento_permanencia_formatted: contrato.fecha_vencimiento_permanencia
                ? new Date(contrato.fecha_vencimiento_permanencia).toLocaleDateString('es-CO')
                : 'N/A',
            costo_instalacion_formatted: contrato.costo_instalacion
                ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(contrato.costo_instalacion)
                : 'N/A',
            plan_precio_formatted: contrato.plan_precio
                ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(contrato.plan_precio)
                : 'N/A',
            estado_badge: this.obtenerBadgeEstado(contrato.estado),
            tipo_permanencia_label: contrato.tipo_permanencia === 'con_permanencia'
                ? `Con permanencia (${contrato.permanencia_meses || 0} meses)`
                : 'Sin permanencia'
        };
    }

    /**
     * Obtener badge de estado para UI
     */
    obtenerBadgeEstado(estado) {
        const badges = {
            'activo': { color: 'green', text: 'Activo' },
            'vencido': { color: 'orange', text: 'Vencido' },
            'terminado': { color: 'gray', text: 'Terminado' },
            'anulado': { color: 'red', text: 'Anulado' }
        };

        return badges[estado] || { color: 'gray', text: 'Desconocido' };
    }
}

export default new ContratosService();