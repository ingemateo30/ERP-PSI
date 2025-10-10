// frontend/src/services/pqrService.js - VERSIÓN COMPLETA CORREGIDA (solo URLs dinámicas)
import authService from './authService';

class PQRService {
    constructor() {
        // ✅ URL base dinámica desde el archivo .env (solo modificado aquí)
        const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
        this.baseURL = `${apiBase.replace(/\/$/, '')}/pqr`;
    }

    // ==========================================
    // MÉTODO AUXILIAR PARA PETICIONES HTTP
    // ==========================================
    async makeRequest(url, options = {}) {
        const token = authService.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            console.log('🌐 Haciendo petición a:', url);
            
            const response = await fetch(url, mergedOptions);
            
            console.log('📡 Respuesta status:', response.status);
            console.log('📡 Content-Type:', response.headers.get('content-type'));
            
            // Verificar si la respuesta es HTML (error 404 o similar)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.error('❌ Recibiendo HTML en lugar de JSON. URL probablemente incorrecta.');
                console.error('URL solicitada:', url);
                throw new Error(`Endpoint no encontrado: ${url}. Verifica que el servidor backend esté corriendo.`);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error de respuesta:', errorText);
                
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: 'Error de conexión con el servidor' };
                }
                
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Respuesta exitosa:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error en petición PQR:', error);
            
            // Errores de red comunes
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('No se puede conectar con el servidor. Verifica que esté ejecutándose en el puerto correcto.');
            }
            
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS PRINCIPALES DE PQR
    // ==========================================

    // Obtener todas las PQR con filtros
    async getPQRs(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });

            const url = `${this.baseURL}?${queryParams.toString()}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo PQRs:', error);
            throw error;
        }
    }

    // Obtener estadísticas de PQR
    async getEstadisticas() {
        try {
            const url = `${this.baseURL}/estadisticas`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas PQR:', error);
            throw error;
        }
    }

    // Obtener PQR por ID
    async getPQRById(id) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo PQR:', error);
            throw error;
        }
    }

    // Crear nueva PQR
    async createPQR(pqrData) {
        try {
            const url = this.baseURL;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(pqrData)
            });
        } catch (error) {
            console.error('❌ Error creando PQR:', error);
            throw error;
        }
    }

    // Actualizar PQR
    async updatePQR(id, pqrData) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url, {
                method: 'PUT',
                body: JSON.stringify(pqrData)
            });
        } catch (error) {
            console.error('❌ Error actualizando PQR:', error);
            throw error;
        }
    }

    // Eliminar PQR
    async deletePQR(id) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('❌ Error eliminando PQR:', error);
            throw error;
        }
    }

    // Asignar PQR a usuario
    async asignarPQR(id, usuarioId) {
        try {
            const url = `${this.baseURL}/${id}/asignar`;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify({ usuario_id: usuarioId })
            });
        } catch (error) {
            console.error('❌ Error asignando PQR:', error);
            throw error;
        }
    }

    // Obtener PQRs por cliente
    async getPQRsByCliente(clienteId) {
        try {
            const url = `${this.baseURL}/cliente/${clienteId}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo PQRs del cliente:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS PARA USUARIOS - AGREGADOS
    // ==========================================

    // Obtener usuarios disponibles para asignar PQRs
    async getUsuariosDisponibles() {
        try {
            // ✅ Cambiado aquí: usar apiBase desde .env
            const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
            const url = `${apiBase.replace(/\/$/, '')}/users`; // Endpoint específico para usuarios
            const response = await this.makeRequest(url);
            
            // Asegurar estructura de respuesta consistente
            if (response && response.success) {
                return {
                    success: true,
                    usuarios: response.usuarios || response.data || []
                };
            }
            
            // Si no tiene la estructura esperada, adaptarla
            return {
                success: true,
                usuarios: Array.isArray(response) ? response : []
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo usuarios disponibles:', error);
            
            // Retornar estructura consistente en caso de error
            return {
                success: false,
                usuarios: [],
                error: error.message
            };
        }
    }

    // Obtener todos los usuarios del sistema
    async getUsuarios() {
        try {
            // ✅ Cambiado aquí: usar apiBase desde .env
            const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
            const url = `${apiBase.replace(/\/$/, '')}/users`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS PARA CLIENTES - AGREGADOS
    // ==========================================

    // Obtener clientes activos (con búsqueda opcional)
    async getClientesActivos(searchTerm = '') {
        try {
            // ✅ Cambiado aquí: usar apiBase desde .env
            const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
            let url = `${apiBase.replace(/\/$/, '')}/clients`;
            
            // Agregar parámetro de búsqueda si existe
            if (searchTerm && searchTerm.trim() !== '') {
                const queryParams = new URLSearchParams();
                queryParams.append('search', searchTerm.trim());
                url += `?${queryParams.toString()}`;
            }
            
            const response = await this.makeRequest(url);
            
            // Asegurar estructura de respuesta consistente
            if (response && response.success) {
                return {
                    success: true,
                    clientes: response.clientes || response.data || []
                };
            }
            
            // Si no tiene la estructura esperada, adaptarla
            return {
                success: true,
                clientes: Array.isArray(response) ? response : []
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo clientes activos:', error);
            
            // Retornar estructura consistente en caso de error
            return {
                success: false,
                clientes: [],
                error: error.message
            };
        }
    }

    // Obtener todos los clientes
    async getClientes() {
        try {
            // ✅ Cambiado aquí: usar apiBase desde .env
            const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
            const url = `${apiBase.replace(/\/$/, '')}/clients`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error obteniendo clientes:', error);
            throw error;
        }
    }

    // Buscar clientes por criterio
    async buscarClientes(criterio) {
        try {
            // ✅ Cambiado aquí: usar apiBase desde .env
            const apiBase = process.env.REACT_APP_API_URL || 'http://16.16.16.154:3000/api/v1';
            const queryParams = new URLSearchParams();
            queryParams.append('q', criterio);

            const url = `${apiBase.replace(/\/$/, '')}/clients/search?${queryParams.toString()}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('❌ Error buscando clientes:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS DE VALIDACIÓN
    // ==========================================

    // Validar datos de PQR antes de enviar
    validatePQRData(pqrData) {
        const errors = [];
        
        // Validaciones obligatorias
        if (!pqrData.tipo || pqrData.tipo.trim() === '') {
            errors.push('El tipo de PQR es obligatorio');
        }
        
        if (!pqrData.categoria || pqrData.categoria.trim() === '') {
            errors.push('La categoría es obligatoria');
        }
        
        if (!pqrData.cliente_id) {
            errors.push('Debe seleccionar un cliente');
        }
        
        if (!pqrData.descripcion || pqrData.descripcion.trim() === '') {
            errors.push('La descripción es obligatoria');
        } else if (pqrData.descripcion.trim().length < 10) {
            errors.push('La descripción debe tener al menos 10 caracteres');
        }
        
        if (!pqrData.medio_recepcion || pqrData.medio_recepcion.trim() === '') {
            errors.push('El medio de recepción es obligatorio');
        }
        
        if (!pqrData.prioridad || pqrData.prioridad.trim() === '') {
            errors.push('La prioridad es obligatoria');
        }
        
        // Validar formato de email si se proporciona
        if (pqrData.email_contacto && pqrData.email_contacto.trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(pqrData.email_contacto)) {
                errors.push('El formato del email no es válido');
            }
        }
        
        // Validar teléfono si se proporciona
        if (pqrData.telefono_contacto && pqrData.telefono_contacto.trim() !== '') {
            const telefonoRegex = /^[0-9+\-\s()]{7,15}$/;
            if (!telefonoRegex.test(pqrData.telefono_contacto)) {
                errors.push('El formato del teléfono no es válido');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // ==========================================
    // UTILIDADES PARA FECHAS Y FORMATO
    // ==========================================

    // Formatear fecha para visualización
    formatFecha(fecha) {
        if (!fecha) return 'N/A';
        
        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            return fechaObj.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha inválida';
        }
    }

    // Formatear fecha solo con día/mes/año
    formatFechaSolo(fecha) {
        if (!fecha) return 'N/A';
        
        try {
            const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
            return fechaObj.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha inválida';
        }
    }

    // Calcular tiempo transcurrido desde una fecha
    calcularTiempoTranscurrido(fechaInicio) {
        if (!fechaInicio) return 'N/A';
        
        try {
            const inicio = new Date(fechaInicio);
            const ahora = new Date();
            const diferencia = ahora - inicio;
            
            const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
            const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
            
            if (dias > 0) {
                return `${dias} día${dias > 1 ? 's' : ''} y ${horas} hora${horas > 1 ? 's' : ''}`;
            } else if (horas > 0) {
                return `${horas} hora${horas > 1 ? 's' : ''} y ${minutos} minuto${minutos > 1 ? 's' : ''}`;
            } else {
                return `${minutos} minuto${minutos > 1 ? 's' : ''}`;
            }
        } catch (error) {
            console.error('Error calculando tiempo transcurrido:', error);
            return 'N/A';
        }
    }

    // ==========================================
    // MÉTODOS DE CONFIGURACIÓN Y UTILIDADES
    // ==========================================

    // Obtener configuración de tipos de PQR
    getTiposPQR() {
        return [
            { value: 'peticion', label: 'Petición', color: 'blue' },
            { value: 'queja', label: 'Queja', color: 'red' },
            { value: 'reclamo', label: 'Reclamo', color: 'orange' },
            { value: 'sugerencia', label: 'Sugerencia', color: 'green' }
        ];
    }

    // Obtener configuración de estados
    getEstadosPQR() {
        return [
            { value: 'abierto', label: 'Abierto', color: 'gray' },
            { value: 'en_proceso', label: 'En Proceso', color: 'yellow' },
            { value: 'resuelto', label: 'Resuelto', color: 'green' },
            { value: 'cerrado', label: 'Cerrado', color: 'blue' },
            { value: 'escalado', label: 'Escalado', color: 'red' }
        ];
    }

    // Obtener configuración de categorías
    getCategoriasPQR() {
        return [
            { value: 'facturacion', label: 'Facturación' },
            { value: 'tecnico', label: 'Técnico' },
            { value: 'comercial', label: 'Comercial' },
            { value: 'atencion_cliente', label: 'Atención al Cliente' },
            { value: 'otros', label: 'Otros' }
        ];
    }

    // Obtener configuración de medios de recepción
    getMediosRecepcion() {
        return [
            { value: 'telefono', label: 'Teléfono' },
            { value: 'email', label: 'Email' },
            { value: 'presencial', label: 'Presencial' },
            { value: 'web', label: 'Web' },
            { value: 'chat', label: 'Chat' },
            { value: 'whatsapp', label: 'WhatsApp' }
        ];
    }

    // Obtener configuración de prioridades
    getPrioridades() {
        return [
            { value: 'baja', label: 'Baja', color: 'green' },
            { value: 'media', label: 'Media', color: 'yellow' },
            { value: 'alta', label: 'Alta', color: 'orange' },
            { value: 'critica', label: 'Crítica', color: 'red' }
        ];
    }

    // Método para verificar conectividad con el backend
    async checkConnection() {
        try {
            const url = this.baseURL.replace('/api/pqr', '/health');
            const response = await fetch(url);
            return response.ok;
        } catch {
            return false;
        }
    }

    // Obtener color para estado
    getColorEstado(estado) {
        const estados = this.getEstadosPQR();
        const estadoObj = estados.find(e => e.value === estado);
        return estadoObj ? estadoObj.color : 'gray';
    }

    // Obtener color para tipo
    getColorTipo(tipo) {
        const tipos = this.getTiposPQR();
        const tipoObj = tipos.find(t => t.value === tipo);
        return tipoObj ? tipoObj.color : 'gray';
    }

    // Obtener color para prioridad
    getColorPrioridad(prioridad) {
        const prioridades = this.getPrioridades();
        const prioridadObj = prioridades.find(p => p.value === prioridad);
        return prioridadObj ? prioridadObj.color : 'gray';
    }
}

// Exportar instancia única del servicio
export default new PQRService();
