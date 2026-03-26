// frontend/src/services/contratosService.js
import apiService from './apiService';
import authService from './authService';

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
            if (response.success && response.data ) {
                try {
                    console.log('📄 Descargando PDF del contrato...');

                    // CORRECCIÓN: Usar fetch directo para manejar mejor las respuestas blob
                    const token = authService.getToken();
                    const apiUrl = process.env.NODE_ENV === 'development'
                    ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
                    : process.env.REACT_APP_API_URL;

                    const pdfUrl = `${apiUrl}/contratos/${id}/pdf`;

                    const pdfResponse = await fetch(pdfUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/pdf',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log('📦 PDF Response status:', pdfResponse.status);
                    console.log('📦 PDF Response ok:', pdfResponse.ok);

                    if (!pdfResponse.ok) {
                        const errorText = await pdfResponse.text();
                        throw new Error(`Error ${pdfResponse.status}: ${errorText}`);
                    }

                    // Convertir a blob
                    const blob = await pdfResponse.blob();

                    console.log('📄 Blob creado - tamaño:', blob.size, 'tipo:', blob.type);

                    // Verificar que el blob no esté vacío
                    if (blob.size === 0) {
                        throw new Error('El PDF descargado está vacío');
                    }

                    // Crear URL del blob para el visor
                    const urlPDF = URL.createObjectURL(blob);

                    // Agregar la URL del PDF a los datos
                    response.data.pdf_url = urlPDF;
                    response.data.pdf_blob = blob;

                    console.log('🔗 PDF blob generado exitosamente - URL:', urlPDF);

                } catch (pdfError) {
                    console.error('❌ Error generando PDF:', pdfError);
                    // CORRECCIÓN: Usar URL directa como fallback
                    const token = authService.getToken();
                    const apiUrl = process.env.NODE_ENV === 'development'
                    ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
                    : process.env.REACT_APP_API_URL;

                    const urlPDF = `${apiUrl}/contratos/${id}/pdf`;
                    

                    response.data.pdf_url = urlPDF;
                    response.data.error_pdf = pdfError.message;

                    console.log('🔗 Usando URL directa como fallback:', urlPDF);
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
            const token = authService.getToken();
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }

            // Construir URL base de la API
            const apiUrl = process.env.NODE_ENV === 'development'
                ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
                : process.env.REACT_APP_API_URL;


            // CORRECCIÓN: URL con parámetros de autenticación correctos
            const pdfUrl = `${apiUrl}/contratos/${id}/pdf?token=${encodeURIComponent(token)}`;

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
                responseType: 'blob',
                headers: {
                    'Accept': 'application/pdf'
                }
            });

            const blob = response.data;

            // Validación del blob
            if (!blob || blob.size === 0) {
                throw new Error('El PDF generado está vacío');
            }


            if (download) {
                // Crear enlace de descarga automática
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `contrato_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            }

            console.log('✅ PDF generado exitosamente');
            return blob;
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
            search: termino,           // ✅ CAMBIO: 'buscar' → 'search'
            filtroEstado: estado,      // ✅ CAMBIO: 'estado' → 'filtroEstado'
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

async actualizarEstado(id, nuevoEstado, observaciones = '') {
    return this.cambiarEstado(id, nuevoEstado, observaciones);
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

async anularContrato(id, motivo = '') {
    return this.eliminar(id, motivo);
}

/**
 * Renovar contrato existente generando uno nuevo
 */
async renovarContrato(id, datos = {}) {
    try {
        if (!id || isNaN(id)) {
            throw new Error('ID de contrato inválido');
        }

        console.log(`🔄 Renovando contrato ID: ${id}`);

        const response = await apiService.post(`${API_BASE}/${id}/renovar`, datos);

        console.log('✅ Contrato renovado exitosamente');
        return response;
    } catch (error) {
        console.error('❌ Error renovando contrato:', error);
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

        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dias);

        const params = {
            estado: 'activo',
            fecha_vencimiento_hasta: `${fechaLimite.getFullYear()}-${String(fechaLimite.getMonth()+1).padStart(2,'0')}-${String(fechaLimite.getDate()).padStart(2,'0')}`
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

        const blob = await apiService.request(`${API_BASE}/${id}/pdf`, {
            method: 'HEAD'
        });

        console.log('✅ PDF verificado exitosamente');

        return {
            disponible: true,
            contentType: 'application/pdf',
            size: 0,
            url: `${(process.env.NODE_ENV === 'development'
             ? (process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1')
            : process.env.REACT_APP_API_URL)}/contratos/${id}/pdf`
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
        const message = error.response.data?.message || error.response.statusText || 'Error del servidor';
        const status = error.response.status;

        console.error(`❌ Error ${status}:`, message);

        return new Error(`Error ${status}: ${message}`);
    } else if (error.request) {
        console.error('❌ Error de red:', error.request);
        return new Error('Error de conexión con el servidor');
    } else {
        console.error('❌ Error de configuración:', error.message);
        return new Error(error.message || 'Error desconocido');
    }
}
}

// Exportar instancia única del servicio
export default new ContratosService();