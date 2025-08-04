// frontend/src/services/incidenciasService.js
import authService from './authService';

class IncidenciasService {
    constructor() {
        this.baseURL = '/api/incidencias';
    }

    // Método auxiliar para hacer peticiones
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
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ 
                    message: 'Error de conexión' 
                }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en petición Incidencias:', error);
            throw error;
        }
    }

    // Obtener todas las incidencias con filtros
    async getIncidencias(filters = {}) {
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
            console.error('Error obteniendo incidencias:', error);
            throw error;
        }
    }

    // Obtener estadísticas de incidencias
    async getEstadisticas() {
        try {
            const url = `${this.baseURL}/estadisticas`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo estadísticas incidencias:', error);
            throw error;
        }
    }

    // Obtener resumen de incidencias activas
    async getIncidenciasActivas() {
        try {
            const url = `${this.baseURL}/activas/resumen`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo incidencias activas:', error);
            throw error;
        }
    }

    // Obtener incidencia por ID
    async getIncidenciaById(id) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo incidencia:', error);
            throw error;
        }
    }

    // Crear nueva incidencia
    async createIncidencia(incidenciaData) {
        try {
            const url = this.baseURL;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(incidenciaData)
            });
        } catch (error) {
            console.error('Error creando incidencia:', error);
            throw error;
        }
    }

    // Actualizar incidencia
    async updateIncidencia(id, incidenciaData) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url, {
                method: 'PUT',
                body: JSON.stringify(incidenciaData)
            });
        } catch (error) {
            console.error('Error actualizando incidencia:', error);
            throw error;
        }
    }

    // Cerrar incidencia
    async cerrarIncidencia(id, datosCierre) {
        try {
            const url = `${this.baseURL}/${id}/cerrar`;
            return await this.makeRequest(url, {
                method: 'POST',
                body: JSON.stringify(datosCierre)
            });
        } catch (error) {
            console.error('Error cerrando incidencia:', error);
            throw error;
        }
    }

    // Obtener municipios disponibles
    async getMunicipiosDisponibles() {
        try {
            const url = `${this.baseURL}/municipios/disponibles`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo municipios:', error);
            throw error;
        }
    }

    // Obtener responsables disponibles
    async getResponsablesDisponibles() {
        try {
            const url = `${this.baseURL}/responsables/disponibles`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo responsables:', error);
            throw error;
        }
    }

    // Generar reporte de disponibilidad
    async getReporteDisponibilidad(mes, anno) {
        try {
            const url = `${this.baseURL}/reportes/disponibilidad?mes=${mes}&anno=${anno}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error generando reporte de disponibilidad:', error);
            throw error;
        }
    }

    // Validar datos de incidencia
    validateIncidenciaData(data) {
        const errors = [];

        if (!data.tipo_incidencia) {
            errors.push('Tipo de incidencia es requerido');
        }

        if (!data.categoria) {
            errors.push('Categoría es requerida');
        }

        if (!data.descripcion || data.descripcion.trim().length < 20) {
            errors.push('Descripción debe tener al menos 20 caracteres');
        }

        if (data.usuarios_afectados && (isNaN(data.usuarios_afectados) || data.usuarios_afectados < 0)) {
            errors.push('Usuarios afectados debe ser un número válido');
        }

        if (data.coordenadas_lat && (isNaN(data.coordenadas_lat) || Math.abs(data.coordenadas_lat) > 90)) {
            errors.push('Latitud debe ser un número válido entre -90 y 90');
        }

        if (data.coordenadas_lng && (isNaN(data.coordenadas_lng) || Math.abs(data.coordenadas_lng) > 180)) {
            errors.push('Longitud debe ser un número válido entre -180 y 180');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Formatear duración en minutos a texto legible
    formatearDuracion(minutos) {
        if (!minutos || minutos === 0) return 'N/A';
        
        const dias = Math.floor(minutos / (24 * 60));
        const horas = Math.floor((minutos % (24 * 60)) / 60);
        const mins = minutos % 60;
        
        let resultado = [];
        
        if (dias > 0) resultado.push(`${dias}d`);
        if (horas > 0) resultado.push(`${horas}h`);
        if (mins > 0 || resultado.length === 0) resultado.push(`${mins}m`);
        
        return resultado.join(' ');
    }

    // Formatear fecha para mostrar
    formatFecha(fecha) {
        if (!fecha) return 'N/A';
        
        try {
            return new Date(fecha).toLocaleDateString('es-CO', {
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

    // Calcular tiempo transcurrido desde inicio
    calcularTiempoTranscurrido(fechaInicio, fechaFin = null) {
        if (!fechaInicio) return 'N/A';
        
        try {
            const inicio = new Date(fechaInicio);
            const fin = fechaFin ? new Date(fechaFin) : new Date();
            const diferencia = fin - inicio;
            const minutos = Math.floor(diferencia / (1000 * 60));
            
            return this.formatearDuracion(minutos);
        } catch (error) {
            return 'N/A';
        }
    }

    // Obtener color según estado
    getColorEstado(estado) {
        const colores = {
            'reportado': 'red',
            'en_atencion': 'yellow',
            'resuelto': 'green',
            'cerrado': 'blue'
        };
        return colores[estado] || 'gray';
    }

    // Obtener color según tipo
    getColorTipo(tipo) {
        const colores = {
            'programado': 'blue',
            'no_programado': 'orange',
            'emergencia': 'red'
        };
        return colores[tipo] || 'gray';
    }

    // Obtener color según categoría
    getColorCategoria(categoria) {
        const colores = {
            'fibra_cortada': 'red',
            'falla_energia': 'orange',
            'mantenimiento': 'blue',
            'actualizacion': 'green',
            'otros': 'gray'
        };
        return colores[categoria] || 'gray';
    }

    // Calcular nivel de impacto basado en usuarios afectados
    getNivelImpacto(usuariosAfectados) {
        if (!usuariosAfectados || usuariosAfectados === 0) return { nivel: 'Ninguno', color: 'gray' };
        if (usuariosAfectados <= 10) return { nivel: 'Bajo', color: 'green' };
        if (usuariosAfectados <= 50) return { nivel: 'Medio', color: 'yellow' };
        if (usuariosAfectados <= 100) return { nivel: 'Alto', color: 'orange' };
        return { nivel: 'Crítico', color: 'red' };
    }

    // Obtener icono según tipo de incidencia
    getIconoTipo(tipo) {
        const iconos = {
            'programado': '🛠️',
            'no_programado': '⚠️',
            'emergencia': '🚨'
        };
        return iconos[tipo] || '📋';
    }

    // Obtener icono según categoría
    getIconoCategoria(categoria) {
        const iconos = {
            'fibra_cortada': '✂️',
            'falla_energia': '⚡',
            'mantenimiento': '🔧',
            'actualizacion': '🔄',
            'otros': '📝'
        };
        return iconos[categoria] || '📋';
    }

    // Exportar datos a CSV
    exportarCSV(incidencias, filename = 'incidencias_export.csv') {
        if (!incidencias || incidencias.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const headers = [
            'Número Incidencia',
            'Tipo',
            'Categoría',
            'Estado',
            'Fecha Inicio',
            'Fecha Fin',
            'Duración (min)',
            'Usuarios Afectados',
            'Municipio',
            'Responsable',
            'Descripción'
        ];

        const csvContent = [
            headers.join(','),
            ...incidencias.map(inc => [
                inc.numero_incidencia,
                inc.tipo_incidencia,
                inc.categoria,
                inc.estado,
                this.formatFecha(inc.fecha_inicio),
                this.formatFecha(inc.fecha_fin),
                inc.tiempo_duracion_minutos || inc.duracion_minutos || 'N/A',
                inc.usuarios_afectados || 0,
                inc.municipio_nombre || 'N/A',
                inc.responsable_nombre || 'Sin asignar',
                `"${inc.descripcion}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Generar coordenadas aleatorias para Colombia (para testing)
    generarCoordenadasColombia() {
        // Aproximadamente los límites de Colombia
        const latMin = -4.2;
        const latMax = 12.6;
        const lngMin = -79.0;
        const lngMax = -66.8;
        
        return {
            lat: (Math.random() * (latMax - latMin) + latMin).toFixed(6),
            lng: (Math.random() * (lngMax - lngMin) + lngMin).toFixed(6)
        };
    }

    // Validar coordenadas para Colombia
    validarCoordenadasColombia(lat, lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        // Límites aproximados de Colombia
        const latMin = -4.2;
        const latMax = 12.6;
        const lngMin = -79.0;
        const lngMax = -66.8;
        
        return latNum >= latMin && latNum <= latMax && lngNum >= lngMin && lngNum <= lngMax;
    }

    // Obtener URL de Google Maps
    getGoogleMapsUrl(lat, lng) {
        if (!lat || !lng) return null;
        return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    // Calcular SLA (Service Level Agreement) basado en tipo
    calcularSLA(tipoIncidencia, fechaInicio) {
        const slaMinutos = {
            'emergencia': 60,      // 1 hora
            'no_programado': 240,  // 4 horas
            'programado': 480      // 8 horas
        };
        
        const sla = slaMinutos[tipoIncidencia] || 480;
        const inicio = new Date(fechaInicio);
        const limite = new Date(inicio.getTime() + sla * 60000);
        const ahora = new Date();
        
        return {
            sla_minutos: sla,
            fecha_limite: limite,
            tiempo_restante: limite > ahora ? Math.floor((limite - ahora) / 60000) : 0,
            vencido: limite <= ahora,
            porcentaje_usado: Math.min(100, ((ahora - inicio) / (sla * 60000)) * 100)
        };
    }

    // Generar número de incidencia automático (para frontend)
    generarNumeroIncidencia() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        
        return `INC${year}${month}${day}${hour}${minute}`;
    }
}

const incidenciasService = new IncidenciasService();
export default incidenciasService;