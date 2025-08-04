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
            console.log('🌐 Haciendo petición a:', url);
            console.log('🔑 Token presente:', !!token);
            
            const response = await fetch(url, mergedOptions);
            
            console.log('📡 Respuesta recibida:', response.status, response.statusText);
            
            // Verificar si la respuesta es HTML (página de error)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const htmlText = await response.text();
                console.error('❌ Respuesta HTML recibida en lugar de JSON:', htmlText.substring(0, 200));
                throw new Error(`Error del servidor: ${response.status} - El endpoint no fue encontrado`);
            }
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    console.error('❌ Error parseando respuesta de error:', parseError);
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Verificar estructura de respuesta esperada
            if (!data.success) {
                throw new Error(data.message || 'Respuesta sin éxito del servidor');
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error en petición Incidencias:', error);
            
            // Si es un error de red, proporcionar más contexto
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Error de conexión. Verifique que el servidor esté ejecutándose en http://localhost:3000');
            }
            
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
            const response = await this.makeRequest(url);
            
            return {
                success: true,
                incidencias: response.data.incidencias || [],
                pagination: response.data.pagination || {}
            };
        } catch (error) {
            console.error('❌ Error obteniendo incidencias:', error);
            throw error;
        }
    }

    // Obtener estadísticas de incidencias
    async getEstadisticas() {
        try {
            const url = `${this.baseURL}/estadisticas`;
            const response = await this.makeRequest(url);
            
            return {
                success: true,
                ...response.data
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas incidencias:', error);
            throw error;
        }
    }

    // Obtener resumen de incidencias activas
    async getIncidenciasActivas() {
        try {
            const url = `${this.baseURL}/activas/resumen`;
            const response = await this.makeRequest(url);
            
            return {
                success: true,
                incidencias: response.data || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo incidencias activas:', error);
            throw error;
        }
    }

    // Obtener incidencia por ID
    async getIncidenciaById(id) {
        try {
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
            const url = this.baseURL;
            const response = await this.makeRequest(url, {
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

    // Obtener municipios disponibles
    async getMunicipiosDisponibles() {
        try {
            const url = `${this.baseURL}/municipios/disponibles`;
            const response = await this.makeRequest(url);
            
            return {
                success: true,
                municipios: response.data.municipios || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo municipios:', error);
            throw error;
        }
    }

    // Obtener responsables disponibles
    async getResponsablesDisponibles() {
        try {
            const url = `${this.baseURL}/responsables/disponibles`;
            const response = await this.makeRequest(url);
            
            return {
                success: true,
                responsables: response.data.responsables || []
            };
        } catch (error) {
            console.error('❌ Error obteniendo responsables:', error);
            throw error;
        }
    }

    // Validar datos de incidencia
    validateIncidenciaData(data) {
        const errors = [];

        if (!data.tipo) {
            errors.push('Tipo de incidencia es requerido');
        }

        if (!data.titulo || data.titulo.trim().length < 5) {
            errors.push('Título debe tener al menos 5 caracteres');
        }

        if (!data.descripcion || data.descripcion.trim().length < 10) {
            errors.push('Descripción debe tener al menos 10 caracteres');
        }

        if (!data.municipio_id) {
            errors.push('Municipio es requerido');
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

    // Obtener tipos de incidencia disponibles
    getTiposIncidencia() {
        return [
            { value: 'corte_masivo', label: 'Corte Masivo', icon: '🚨', color: 'red' },
            { value: 'falla_equipos', label: 'Falla de Equipos', icon: '⚠️', color: 'orange' },
            { value: 'mantenimiento', label: 'Mantenimiento Programado', icon: '🔧', color: 'blue' },
            { value: 'clima', label: 'Afectación Climática', icon: '🌧️', color: 'gray' },
            { value: 'infraestructura', label: 'Problema de Infraestructura', icon: '🏗️', color: 'yellow' },
            { value: 'terceros', label: 'Daño por Terceros', icon: '👥', color: 'purple' },
            { value: 'otros', label: 'Otros', icon: '📋', color: 'gray' }
        ];
    }

    // Obtener estados de incidencia disponibles
    getEstadosIncidencia() {
        return [
            { value: 'reportado', label: 'Reportado', color: 'bg-yellow-100 text-yellow-800', icon: '📝' },
            { value: 'en_progreso', label: 'En Progreso', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
            { value: 'cerrado', label: 'Cerrado', color: 'bg-green-100 text-green-800', icon: '✅' }
        ];
    }

    // Obtener mecanismos de solución disponibles
    getMecanismosSolucion() {
        return [
            { value: 'reparacion', label: 'Reparación', icon: '🔧' },
            { value: 'reemplazo', label: 'Reemplazo', icon: '🔄' },
            { value: 'configuracion', label: 'Configuración', icon: '⚙️' },
            { value: 'mantenimiento', label: 'Mantenimiento', icon: '🛠️' },
            { value: 'otros', label: 'Otros', icon: '📋' }
        ];
    }

    // Formatear duración en minutos a texto legible
    formatearDuracion(minutos) {
        if (!minutos || minutos === 0) return 'No disponible';
        
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
        if (!fecha) return 'No disponible';
        
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
        if (!fechaInicio) return 'No disponible';
        
        try {
            const inicio = new Date(fechaInicio);
            const fin = fechaFin ? new Date(fechaFin) : new Date();
            const diferencia = fin - inicio;
            const minutos = Math.floor(diferencia / (1000 * 60));
            
            return this.formatearDuracion(minutos);
        } catch (error) {
            return 'No disponible';
        }
    }

    // Obtener color según estado
    getColorEstado(estado) {
        const estados = this.getEstadosIncidencia();
        const estadoObj = estados.find(e => e.value === estado);
        return estadoObj ? estadoObj.color : 'bg-gray-100 text-gray-800';
    }

    // Obtener color según tipo
    getColorTipo(tipo) {
        const tipos = this.getTiposIncidencia();
        const tipoObj = tipos.find(t => t.value === tipo);
        return tipoObj ? tipoObj.color : 'gray';
    }

    // Obtener icono según tipo
    getIconoTipo(tipo) {
        const tipos = this.getTiposIncidencia();
        const tipoObj = tipos.find(t => t.value === tipo);
        return tipoObj ? tipoObj.icon : '📋';
    }

    // Obtener icono según estado
    getIconoEstado(estado) {
        const estados = this.getEstadosIncidencia();
        const estadoObj = estados.find(e => e.value === estado);
        return estadoObj ? estadoObj.icon : '📋';
    }

    // Calcular nivel de impacto basado en usuarios afectados
    getNivelImpacto(usuariosAfectados) {
        if (!usuariosAfectados || usuariosAfectados === 0) {
            return { nivel: 'Ninguno', color: 'bg-gray-100 text-gray-800', badge: 'secondary' };
        }
        if (usuariosAfectados <= 10) {
            return { nivel: 'Bajo', color: 'bg-green-100 text-green-800', badge: 'success' };
        }
        if (usuariosAfectados <= 50) {
            return { nivel: 'Medio', color: 'bg-yellow-100 text-yellow-800', badge: 'warning' };
        }
        if (usuariosAfectados <= 100) {
            return { nivel: 'Alto', color: 'bg-orange-100 text-orange-800', badge: 'warning' };
        }
        return { nivel: 'Crítico', color: 'bg-red-100 text-red-800', badge: 'danger' };
    }

    // Exportar datos a CSV
    exportarCSV(incidencias, filename = 'incidencias_export.csv') {
        if (!incidencias || incidencias.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const headers = [
            'ID',
            'Tipo',
            'Título',
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
                inc.id,
                inc.tipo,
                `"${inc.titulo}"`,
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
            'corte_masivo': 120,        // 2 horas
            'falla_equipos': 240,       // 4 horas
            'mantenimiento': 480,       // 8 horas (programado)
            'clima': 360,               // 6 horas
            'infraestructura': 720,     // 12 horas
            'terceros': 480,            // 8 horas
            'otros': 480                // 8 horas por defecto
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
            porcentaje_usado: Math.min(100, Math.max(0, ((ahora - inicio) / (sla * 60000)) * 100))
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

    // Obtener estadísticas resumen para dashboard
    async getResumenEstadisticas() {
        try {
            const estadisticas = await this.getEstadisticas();
            
            const totalIncidencias = estadisticas.por_estado ? 
                Object.values(estadisticas.por_estado).reduce((a, b) => a + b, 0) : 0;
            
            return {
                success: true,
                total: totalIncidencias,
                activas: (estadisticas.por_estado?.reportado || 0) + 
                        (estadisticas.por_estado?.en_progreso || 0),
                cerradas: estadisticas.por_estado?.cerrado || 0,
                tiempo_promedio: Math.round(estadisticas.tiempo_promedio_resolucion || 0),
                usuarios_afectados_total: estadisticas.usuarios_afectados_activos || 0
            };
        } catch (error) {
            console.error('❌ Error obteniendo resumen de estadísticas:', error);
            return {
                success: false,
                total: 0,
                activas: 0,
                cerradas: 0,
                tiempo_promedio: 0,
                usuarios_afectados_total: 0
            };
        }
    }

    // Filtrar incidencias por criterios múltiples
    filtrarIncidencias(incidencias, filtros) {
        if (!incidencias || !Array.isArray(incidencias)) return [];
        
        return incidencias.filter(incidencia => {
            // Filtro por tipo
            if (filtros.tipo && incidencia.tipo !== filtros.tipo) return false;
            
            // Filtro por estado
            if (filtros.estado && incidencia.estado !== filtros.estado) return false;
            
            // Filtro por municipio
            if (filtros.municipio_id && incidencia.municipio_id !== parseInt(filtros.municipio_id)) return false;
            
            // Filtro por responsable
            if (filtros.responsable_id && incidencia.responsable_id !== parseInt(filtros.responsable_id)) return false;
            
            // Filtro por rango de fechas
            if (filtros.fecha_inicio) {
                const fechaIncidencia = new Date(incidencia.fecha_inicio);
                const fechaFiltro = new Date(filtros.fecha_inicio);
                if (fechaIncidencia < fechaFiltro) return false;
            }
            
            if (filtros.fecha_fin) {
                const fechaIncidencia = new Date(incidencia.fecha_inicio);
                const fechaFiltro = new Date(filtros.fecha_fin);
                if (fechaIncidencia > fechaFiltro) return false;
            }
            
            // Filtro por usuarios afectados mínimos
            if (filtros.usuarios_min && (incidencia.usuarios_afectados || 0) < parseInt(filtros.usuarios_min)) return false;
            
            return true;
        });
    }

    // Agrupar incidencias por criterio
    agruparIncidencias(incidencias, criterio) {
        if (!incidencias || !Array.isArray(incidencias)) return {};
        
        return incidencias.reduce((grupos, incidencia) => {
            let clave;
            
            switch (criterio) {
                case 'tipo':
                    clave = incidencia.tipo;
                    break;
                case 'estado':
                    clave = incidencia.estado;
                    break;
                case 'municipio':
                    clave = incidencia.municipio_nombre || 'Sin municipio';
                    break;
                case 'responsable':
                    clave = incidencia.responsable_nombre || 'Sin asignar';
                    break;
                case 'fecha':
                    clave = new Date(incidencia.fecha_inicio).toLocaleDateString('es-CO');
                    break;
                default:
                    clave = 'otros';
            }
            
            if (!grupos[clave]) grupos[clave] = [];
            grupos[clave].push(incidencia);
            
            return grupos;
        }, {});
    }

    // Calcular métricas de rendimiento
    calcularMetricas(incidencias) {
        if (!incidencias || !Array.isArray(incidencias) || incidencias.length === 0) {
            return {
                total: 0,
                promedio_resolucion: 0,
                tasa_resolucion: 0,
                usuarios_promedio: 0,
                incidencias_por_dia: 0
            };
        }

        const cerradas = incidencias.filter(inc => inc.estado === 'cerrado');
        const tiemposResolucion = cerradas
            .map(inc => inc.tiempo_duracion_minutos)
            .filter(tiempo => tiempo && tiempo > 0);

        const usuariosAfectados = incidencias
            .map(inc => inc.usuarios_afectados || 0)
            .filter(usuarios => usuarios > 0);

        // Calcular días únicos
        const fechasUnicas = new Set(
            incidencias.map(inc => new Date(inc.fecha_inicio).toDateString())
        );

        return {
            total: incidencias.length,
            promedio_resolucion: tiemposResolucion.length > 0 
                ? Math.round(tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length)
                : 0,
            tasa_resolucion: Math.round((cerradas.length / incidencias.length) * 100),
            usuarios_promedio: usuariosAfectados.length > 0
                ? Math.round(usuariosAfectados.reduce((a, b) => a + b, 0) / usuariosAfectados.length)
                : 0,
            incidencias_por_dia: fechasUnicas.size > 0
                ? Math.round(incidencias.length / fechasUnicas.size * 10) / 10
                : 0
        };
    }

    // Obtener opciones para formularios
    getOpcionesFormulario() {
        return {
            tipos: this.getTiposIncidencia(),
            estados: this.getEstadosIncidencia(),
            mecanismos: this.getMecanismosSolucion()
        };
    }

    // Validar estructura de respuesta del backend
    validarRespuestaBackend(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }
        
        return response.hasOwnProperty('success') && 
               (response.success === true || response.success === false);
    }

    // Debug: imprimir información de estado del servicio
    debug() {
        console.log('🔍 IncidenciasService Debug Info:');
        console.log('Base URL:', this.baseURL);
        console.log('Token disponible:', !!authService.getToken());
        console.log('Tipos disponibles:', this.getTiposIncidencia().length);
        console.log('Estados disponibles:', this.getEstadosIncidencia().length);
    }
}

// Exportar una instancia única del servicio
const incidenciasService = new IncidenciasService();
export default incidenciasService;