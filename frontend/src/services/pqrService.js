// frontend/src/services/pqrService.js
import authService from './authService';

class PQRService {
    constructor() {
        this.baseURL = '/api/pqr';
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
            console.error('Error en petición PQR:', error);
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
            console.error('Error obteniendo PQRs:', error);
            throw error;
        }
    }

    // Obtener estadísticas de PQR
    async getEstadisticas() {
        try {
            const url = `${this.baseURL}/estadisticas`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo estadísticas PQR:', error);
            throw error;
        }
    }

    // Obtener PQR por ID
    async getPQRById(id) {
        try {
            const url = `${this.baseURL}/${id}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo PQR:', error);
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
            console.error('Error creando PQR:', error);
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
            console.error('Error actualizando PQR:', error);
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
            console.error('Error eliminando PQR:', error);
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
            console.error('Error asignando PQR:', error);
            throw error;
        }
    }

    // Obtener PQRs por cliente
    async getPQRsByCliente(clienteId) {
        try {
            const url = `${this.baseURL}/cliente/${clienteId}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo PQRs del cliente:', error);
            throw error;
        }
    }

    // Obtener usuarios disponibles para asignación
    async getUsuariosDisponibles() {
        try {
            const url = `${this.baseURL}/usuarios/disponibles`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            throw error;
        }
    }

    // Generar reporte para CRC
    async getReporteCRC(anno, trimestre) {
        try {
            const url = `${this.baseURL}/reportes/crc?anno=${anno}&trimestre=${trimestre}`;
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error generando reporte CRC:', error);
            throw error;
        }
    }

    // Obtener clientes activos para formulario
    async getClientesActivos(search = '') {
        try {
            const token = authService.getToken();
            const url = `/api/v1/clients?search=${encodeURIComponent(search)}&limit=50&estado=activo`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error cargando clientes');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo clientes:', error);
            throw error;
        }
    }

    // Validar datos de PQR
    validatePQRData(data) {
        const errors = [];

        if (!data.cliente_id) {
            errors.push('Cliente es requerido');
        }

        if (!data.tipo) {
            errors.push('Tipo de PQR es requerido');
        }

        if (!data.categoria) {
            errors.push('Categoría es requerida');
        }

        if (!data.medio_recepcion) {
            errors.push('Medio de recepción es requerido');
        }

        if (!data.asunto || data.asunto.trim().length < 10) {
            errors.push('Asunto debe tener al menos 10 caracteres');
        }

        if (!data.descripcion || data.descripcion.trim().length < 20) {
            errors.push('Descripción debe tener al menos 20 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
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

    // Calcular tiempo transcurrido
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
                return `${dias}d ${horas}h`;
            } else if (horas > 0) {
                return `${horas}h ${minutos}m`;
            } else {
                return `${minutos}m`;
            }
        } catch (error) {
            return 'N/A';
        }
    }

    // Obtener color según estado
    getColorEstado(estado) {
        const colores = {
            'abierto': 'gray',
            'en_proceso': 'yellow',
            'resuelto': 'green',
            'cerrado': 'blue',
            'escalado': 'red'
        };
        return colores[estado] || 'gray';
    }

    // Obtener color según tipo
    getColorTipo(tipo) {
        const colores = {
            'peticion': 'blue',
            'queja': 'red',
            'reclamo': 'orange',
            'sugerencia': 'green'
        };
        return colores[tipo] || 'gray';
    }

    // Obtener prioridad con color
    getColorPrioridad(prioridad) {
        const colores = {
            'baja': 'green',
            'media': 'yellow',
            'alta': 'orange',
            'critica': 'red'
        };
        return colores[prioridad] || 'gray';
    }

    // Exportar datos a CSV
    exportarCSV(pqrs, filename = 'pqrs_export.csv') {
        if (!pqrs || pqrs.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const headers = [
            'Número Radicado',
            'Cliente',
            'Identificación',
            'Tipo',
            'Categoría',
            'Estado',
            'Fecha Recepción',
            'Asunto',
            'Prioridad',
            'Usuario Asignado',
            'Tiempo Respuesta (horas)'
        ];

        const csvContent = [
            headers.join(','),
            ...pqrs.map(pqr => [
                pqr.numero_radicado,
                `"${pqr.cliente_nombre}"`,
                pqr.cliente_identificacion,
                pqr.tipo,
                pqr.categoria,
                pqr.estado,
                this.formatFecha(pqr.fecha_recepcion),
                `"${pqr.asunto}"`,
                pqr.prioridad,
                pqr.usuario_asignado_nombre || 'Sin asignar',
                pqr.tiempo_respuesta_horas || 'N/A'
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
}

const pqrService = new PQRService();
export default pqrService;