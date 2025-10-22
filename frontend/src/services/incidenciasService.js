// frontend/src/services/incidenciasService.js
// SERVICIO CORREGIDO PARA GESTIÓN DE INCIDENCIAS

import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';


class IncidenciasService {
    constructor() {
        // ✅ CORRECCIÓN: URL base correcta según backend routes
        this.baseURL = `${API_BASE_URL}/incidencias`;
        console.log('🚨 IncidenciasService inicializado con URL:', this.baseURL);

        // Tipos de incidencia predefinidos
        this.tiposIncidencia = [
            { value: 'red', label: 'Falla de Red', icon: '🌐' },
            { value: 'energia', label: 'Problemas de Energía', icon: '⚡' },
            { value: 'fibra', label: 'Daño en Fibra Óptica', icon: '🔌' },
            { value: 'equipos', label: 'Falla de Equipos', icon: '📡' },
            { value: 'mantenimiento', label: 'Mantenimiento Programado', icon: '🔧' },
            { value: 'otros', label: 'Otros', icon: '❓' }
        ];

        // Estados de incidencia predefinidos
        this.estadosIncidencia = [
            { value: 'reportado', label: 'Reportado', color: 'orange' },
            { value: 'en_progreso', label: 'En Progreso', color: 'blue' },
            { value: 'resuelto', label: 'Resuelto', color: 'green' },
            { value: 'cerrado', label: 'Cerrado', color: 'gray' }
        ];
    }

    // ✅ MÉTODO CORREGIDO PARA HACER PETICIONES HTTP
    async makeRequest(url, options = {}) {
        try {
            console.log(`🌐 IncidenciasService: ${options.method || 'GET'} ${url}`);

            const token = authService.getToken();
            if (!token) {
                throw new Error('Token de autenticación requerido');
            }

            const config = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                }
            };

            if (options.body) {
                config.body = options.body;
            }

            console.log('📤 IncidenciasService - Configuración de petición:', {
                url,
                method: config.method,
                hasToken: !!token,
                hasBody: !!config.body
            });

            const response = await fetch(url, config);

            // ✅ VERIFICAR TIPO DE CONTENIDO ANTES DE PROCESAR
            const contentType = response.headers.get('content-type');
            console.log('📥 IncidenciasService - Respuesta recibida:', {
                status: response.status,
                statusText: response.statusText,
                contentType,
                url: response.url
            });

            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Respuesta HTML recibida en lugar de JSON:', textResponse.substring(0, 200));
                throw new Error(`El endpoint no fue encontrado`);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Error del servidor: ${response.status} - ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ IncidenciasService - Respuesta exitosa:', data.message || 'Datos recibidos');
            return data;

        } catch (error) {
            console.error('❌ Error en petición Incidencias:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS PRINCIPALES PARA INCIDENCIAS
    // ==========================================

    // Obtener todas las incidencias con filtros
    async getIncidencias(filtros = {}) {
        try {
            console.log('📋 Obteniendo incidencias con filtros:', filtros);

            const params = new URLSearchParams();

            Object.entries(filtros).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });

            const queryString = params.toString();
            const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;

            const response = await this.makeRequest(url);

            // ✅ CORRECCIÓN: Retornar la estructura que espera el frontend
            return {
                success: true,
                incidencias: response.data || response, // Los datos pueden venir en response.data o directamente en response
                total: response.total || 0,
                pagination: response.pagination || {}
            };
        } catch (error) {
            console.error('❌ Error obteniendo incidencias:', error);
            throw error;
        }
    }

    getNivelImpacto(usuariosAfectados) {
        if (!usuariosAfectados || usuariosAfectados === 0) {
            return { nivel: 'Sin impacto', color: 'gray' };
        } else if (usuariosAfectados <= 10) {
            return { nivel: 'Bajo', color: 'green' };
        } else if (usuariosAfectados <= 50) {
            return { nivel: 'Medio', color: 'yellow' };
        } else if (usuariosAfectados <= 100) {
            return { nivel: 'Alto', color: 'orange' };
        } else {
            return { nivel: 'Crítico', color: 'red' };
        }
    }

    // Generar URL de Google Maps
    getGoogleMapsUrl(lat, lng) {
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    // Formatear fecha (alias para formatearFecha)
    formatFecha(fecha) {
        return this.formatearFecha(fecha);
    }

    // Calcular SLA
    calcularSLA(tipo, fechaInicio) {
        if (!fechaInicio) return { vencido: false };

        const inicio = new Date(fechaInicio);
        const ahora = new Date();
        const horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);

        let slaHoras;
        switch (tipo) {
            case 'emergencia':
                slaHoras = 2;
                break;
            case 'no_programado':
                slaHoras = 8;
                break;
            default:
                return { vencido: false };
        }

        return { vencido: horasTranscurridas > slaHoras };
    }

    // Obtener estadísticas de incidencias
    async getEstadisticas() {
        try {
            console.log('📊 Obteniendo estadísticas de incidencias');
            const url = `${this.baseURL}/estadisticas`;
            const response = await this.makeRequest(url);

            return {
                success: true,
                estadisticas: response.data || {}
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas incidencias:', error);
            throw error;
        }
    }

    // Obtener incidencias activas (resumen)
    async getIncidenciasActivas() {
        try {
            console.log('⚡ Obteniendo incidencias activas');
            const url = `${this.baseURL}/activas/resumen`;
            const response = await this.makeRequest(url);

            return {
                success: true,
                incidenciasActivas: response.data || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo incidencias activas:', error);
            throw error;
        }
    }

    // Obtener incidencia por ID
    async getIncidenciaById(id) {
        try {
            console.log(`🔍 Obteniendo incidencia con ID: ${id}`);
            const url = `${this.baseURL}/${id}`;
            const response = await this.makeRequest(url);

            return {
                success: true,
                incidencia: response.data
            };
        } catch (error) {
            console.error('❌ Error obteniendo incidencia:', error);
            throw error;
        }
    }

    // Crear nueva incidencia
    async createIncidencia(incidenciaData) {
        try {
            console.log('➕ Creando nueva incidencia:', incidenciaData.titulo);
            const response = await this.makeRequest(this.baseURL, {
                method: 'POST',
                body: JSON.stringify(incidenciaData)
            });

            return response;
        } catch (error) {
            console.error('❌ Error creando incidencia:', error);
            throw error;
        }
    }

    // Actualizar incidencia
    async updateIncidencia(id, incidenciaData) {
        try {
            console.log(`✏️ Actualizando incidencia ${id}`);
            const url = `${this.baseURL}/${id}`;
            const response = await this.makeRequest(url, {
                method: 'PUT',
                body: JSON.stringify(incidenciaData)
            });

            return response;
        } catch (error) {
            console.error('❌ Error actualizando incidencia:', error);
            throw error;
        }
    }

    // Cerrar incidencia
    async cerrarIncidencia(id, datosCierre) {
        try {
            console.log(`🔒 Cerrando incidencia ${id}`);
            const url = `${this.baseURL}/${id}/cerrar`;
            const response = await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(datosCierre)
            });

            return response;
        } catch (error) {
            console.error('❌ Error cerrando incidencia:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS PARA DATOS DE SOPORTE
    // ==========================================

    // Obtener municipios disponibles
    async getMunicipiosDisponibles() {
        try {
            console.log('🏘️ Obteniendo municipios disponibles');
            const url = `${this.baseURL}/municipios/disponibles`;
            const response = await this.makeRequest(url);

            return {
                success: true,
                municipios: response.data?.municipios || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo municipios:', error);
            throw error;
        }
    }

    // Obtener responsables disponibles
    async getResponsablesDisponibles() {
        try {
            console.log('👷 Obteniendo responsables disponibles');
            const url = `${this.baseURL}/responsables/disponibles`;
            const response = await this.makeRequest(url);

            return {
                success: true,
                responsables: response.data?.responsables || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo responsables:', error);
            throw error;
        }
    }

    // ==========================================
    // MÉTODOS UTILITARIOS
    // ==========================================

    // Obtener tipos de incidencia
    getTiposIncidencia() {
        return this.tiposIncidencia;
    }

    // Obtener estados de incidencia
    getEstadosIncidencia() {
        return this.estadosIncidencia;
    }

    // Obtener color por estado
    getColorPorEstado(estado) {
        const estadoObj = this.estadosIncidencia.find(e => e.value === estado);
        return estadoObj ? estadoObj.color : 'gray';
    }

    // Obtener etiqueta por tipo
    getEtiquetaPorTipo(tipo) {
        const tipoObj = this.tiposIncidencia.find(t => t.value === tipo);
        return tipoObj ? tipoObj.label : tipo;
    }

    // Obtener icono por tipo
    getIconoPorTipo(tipo) {
        const tipoObj = this.tiposIncidencia.find(t => t.value === tipo);
        return tipoObj ? tipoObj.icon : '❓';
    }

    // Formatear duración
    formatearDuracion(minutos) {
        if (!minutos) return 'N/A';

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        if (horas > 0) {
            return `${horas}h ${mins}m`;
        }
        return `${mins}m`;
    }

    // Formatear fecha
    formatearFecha(fecha) {
        if (!fecha) return 'N/A';

        try {
            return new Date(fecha).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    // Validar formulario de incidencia
    validarIncidencia(incidenciaData) {
        const errores = [];
        if (!incidenciaData.tipo_incidencia && !incidenciaData.tipo) {
            errores.push('El tipo de incidencia es requerido');
        }

        if (!incidenciaData.categoria) {
            errores.push('La categoría es requerida');
        }

        if (!incidenciaData.descripcion?.trim()) {
            errores.push('La descripción es requerida');
        }

        if (incidenciaData.usuarios_afectados && incidenciaData.usuarios_afectados < 0) {
            errores.push('El número de usuarios afectados debe ser positivo');
        }

        return {
            isValid: errores.length === 0,
            errors: errores
        };
    }

    // ==========================================
    // MÉTODOS DE DEPURACIÓN
    // ==========================================

    // Estado de conexión
    async verificarConexion() {
        try {
            console.log('🔍 Verificando conexión con API de incidencias...');
            const response = await this.makeRequest(this.baseURL);
            console.log('✅ Conexión exitosa con API de incidencias');
            return true;
        } catch (error) {
            console.error('❌ Error de conexión con API de incidencias:', error);
            return false;
        }
    }

    // Información de depuración
    getDebugInfo() {
        return {
            baseURL: this.baseURL,
            hasToken: !!authService.getToken(),
            tiposDisponibles: this.tiposIncidencia.length,
            estadosDisponibles: this.estadosIncidencia.length,
            version: '1.0.0'
        };
    }
}

// Exportar una instancia única del servicio
const incidenciasService = new IncidenciasService();

// Verificar configuración inicial
console.log('🚨 IncidenciasService configurado:', {
    baseURL: incidenciasService.baseURL,
    hasToken: !authService.getToken(),
    tiposDisponibles: incidenciasService.getTiposIncidencia().length,
    estadosDisponibles: incidenciasService.getEstadosIncidencia().length
});

export default incidenciasService;