// frontend/src/services/pqrService.js - VERSIÓN CORREGIDA
import authService from './authService';

class PQRService {
    constructor() {
        // CORRECCIÓN: Usar la URL completa del servidor
        this.baseURL = 'http://localhost:3000/api/pqr'; // URL por defecto para desarrollo
    }

    // Método auxiliar para hacer peticiones - VERSIÓN MEJORADA
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
            console.log('🌐 Haciendo petición a:', url); // Debug
            
            const response = await fetch(url, mergedOptions);
            
            console.log('📡 Respuesta status:', response.status); // Debug
            console.log('📡 Respuesta headers:', response.headers.get('content-type')); // Debug
            
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
            console.log('✅ Respuesta exitosa:', data); // Debug
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

    // Utilidades para fechas y tiempo
    formatFecha(fecha) {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    calcularTiempoTranscurrido(fechaInicio) {
        if (!fechaInicio) return 'N/A';
        
        const inicio = new Date(fechaInicio);
        const ahora = new Date();
        const diferencia = ahora - inicio;
        
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (dias > 0) {
            return `${dias} día${dias > 1 ? 's' : ''} y ${horas} hora${horas > 1 ? 's' : ''}`;
        } else {
            return `${horas} hora${horas > 1 ? 's' : ''}`;
        }
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
}

export default new PQRService();