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
     * Cargar contrato específicamente para el proceso de firma - CORREGIDO
     */
    async cargarContratoParaFirma(id) {
        try {
            console.log(`📋 Cargando contrato para firma ID: ${id}`);

            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            // Usar el endpoint específico para abrir firma
            const response = await apiService.get(`${API_BASE}/${id}/abrir-firma`);

            // Si la respuesta es exitosa, generar el PDF directamente con apiService
            if (response.success && response.data) {
                // CORREGIDO: Usar apiService como en facturas, no URL externa
                try {
                    const pdfResponse = await apiService.get(`${API_BASE}/${id}/pdf`, {
                        responseType: 'blob'
                    });

                    // Crear URL del blob para el visor
                    const blob = new Blob([pdfResponse], { type: 'application/pdf' });
                    const urlPDF = URL.createObjectURL(blob);

                    // Agregar la URL del PDF a los datos
                    response.data.pdf_url = urlPDF;
                    response.data.pdf_blob = blob;

                    console.log('🔗 PDF blob generado exitosamente');
                } catch (pdfError) {
                    console.error('❌ Error generando PDF:', pdfError);
                    // No fallar si el PDF no se puede generar inicialmente
                    response.data.pdf_url = null;
                }
            }

            console.log('✅ Contrato para firma cargado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error cargando contrato para firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * CORRECCIÓN: Método mejorado para obtener URL del PDF
     */
    async obtenerUrlPDF(id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            // Obtener token de autenticación
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }

            // Construir URL base de la API
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

            // CORRECCIÓN: URL con parámetros de autenticación correctos
            const pdfUrl = `${apiUrl}/contratos/${id}/pdf?token=${encodeURIComponent(token)}&t=${Date.now()}`;

            console.log('🔗 URL del PDF generada:', pdfUrl);

            return pdfUrl;
        } catch (error) {
            console.error('❌ Error generando URL del PDF:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Generar PDF del contrato para descarga
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
                headers: {
                    'Accept': 'application/pdf',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            // Validación del blob
            if (!response.data || response.data.size === 0) {
                throw new Error('El PDF generado está vacío');
            }

            // Verificar que es realmente un PDF
            const contentType = response.headers?.['content-type'] || '';
            if (!contentType.includes('application/pdf')) {
                console.warn('⚠️ Tipo de contenido inesperado:', contentType);
            }

            if (download) {
                // Crear enlace de descarga automática
                const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `contrato_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }

            console.log('✅ PDF generado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
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

            // Validar datos requeridos
            if (!datosSignature.signature_base64) {
                throw new Error('Firma digital requerida');
            }

            if (!datosSignature.firmado_por || !datosSignature.cedula_firmante) {
                throw new Error('Datos del firmante incompletos');
            }

            // CORRECCIÓN: Usar el endpoint específico para procesar firma
            const response = await apiService.post(`${API_BASE}/${id}/procesar-firma`, datosSignature);

            console.log('✅ Firma digital procesada exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error procesando firma digital:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Obtener contratos para el proceso de firma
     */
    async obtenerContratosParaFirma(filtros = {}) {
        try {
            console.log('📋 Obteniendo contratos para firma:', filtros);

            const params = {
                ...filtros,
                para_firma: true
            };

            const response = await apiService.get(API_BASE, params);

            console.log('✅ Contratos para firma obtenidos exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo contratos para firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Buscar contratos específicamente para firma
     */
    async buscarContratosParaFirma(termino, estado = 'pendiente') {
        try {
            console.log('🔍 Buscando contratos para firma:', { termino, estado });

            const params = {
                buscar: termino,
                estado: estado,
                para_firma: true
            };

            const response = await apiService.get(API_BASE, params);

            console.log('✅ Búsqueda de contratos para firma completada');
            return response;
        } catch (error) {
            console.error('❌ Error buscando contratos para firma:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Crear nuevo contrato
     */
    async crear(datosContrato) {
        try {
            console.log('📝 Creando nuevo contrato');

            const response = await apiService.post(API_BASE, datosContrato);

            console.log('✅ Contrato creado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error creando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Actualizar contrato existente
     */
    async actualizar(id, datosContrato) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`📝 Actualizando contrato ID: ${id}`);

            const response = await apiService.put(`${API_BASE}/${id}`, datosContrato);

            console.log('✅ Contrato actualizado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error actualizando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Cambiar estado del contrato
     */
    async cambiarEstado(id, nuevoEstado, observaciones = '') {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`🔄 Cambiando estado del contrato ID: ${id} a ${nuevoEstado}`);

            const response = await apiService.put(`${API_BASE}/${id}/estado`, {
                estado: nuevoEstado,
                observaciones
            });

            console.log('✅ Estado del contrato actualizado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error cambiando estado del contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Eliminar/anular contrato
     */
    async eliminar(id, motivo = '') {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`🗑️ Eliminando contrato ID: ${id}`);

            const response = await apiService.delete(`${API_BASE}/${id}`, {
                data: { motivo }
            });

            console.log('✅ Contrato eliminado exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error eliminando contrato:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Obtener estadísticas de contratos
     */
    async obtenerEstadisticas(filtros = {}) {
        try {
            console.log('📊 Obteniendo estadísticas de contratos');

            const response = await apiService.get(`${API_BASE}/stats`, filtros);

            console.log('✅ Estadísticas obtenidas exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
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

    /**
     * Verificar disponibilidad de PDF
     */
    async verificarPDF(id) {
        try {
            if (!id || isNaN(id)) {
                throw new Error('ID de contrato inválido');
            }

            console.log(`🔍 Verificando disponibilidad del PDF para contrato ID: ${id}`);

            // Generar URL del PDF SIN token en query
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
            const urlPDF = `${apiUrl}/contratos/${id}/pdf?t=${Date.now()}`;

            // Obtener token del localStorage
            const token = localStorage.getItem('token');

            // Hacer solicitud HEAD con token en header Authorization
            const response = await fetch(urlPDF, {
                method: 'HEAD',
                headers: {
                    'Accept': 'application/pdf',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('✅ PDF verificado exitosamente');
            return {
                disponible: response.ok,
                contentType: response.headers.get('content-type') || '',
                size: response.headers.get('content-length') || 0,
                url: urlPDF
            };
        } catch (error) {
            console.error('❌ Error verificando PDF:', error);
            return {
                disponible: false,
                error: error.message
            };
        }
    }

    /**
     * Exportar contratos a Excel
     */
    async exportarExcel(filtros = {}) {
        try {
            console.log('📊 Exportando contratos a Excel');

            const response = await apiService.get(`${API_BASE}/exportar`, {
                params: filtros,
                responseType: 'blob'
            });

            // Crear descarga automática
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contratos_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            console.log('✅ Contratos exportados exitosamente');
            return response;
        } catch (error) {
            console.error('❌ Error exportando contratos:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Manejo centralizado de errores
     */
    handleError(error) {
        if (error.response) {
            // Error de respuesta del servidor
            const message = error.response.data?.message || error.response.statusText || 'Error del servidor';
            const status = error.response.status;

            console.error(`❌ Error ${status}:`, message);

            return new Error(`Error ${status}: ${message}`);
        } else if (error.request) {
            // Error de red
            console.error('❌ Error de red:', error.request);
            return new Error('Error de conexión con el servidor');
        } else {
            // Error de configuración
            console.error('❌ Error de configuración:', error.message);
            return new Error(error.message || 'Error desconocido');
        }
    }
}

// Exportar instancia única del servicio
export default new ContratosService();