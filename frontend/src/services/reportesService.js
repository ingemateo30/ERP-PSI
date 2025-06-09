// services/reportesService.js
import apiService from './apiService';

class ReportesService {
    
    // Obtener reportes disponibles
    async getReportesDisponibles() {
        try {
            const response = await apiService.get('/reportes-regulatorios/disponibles');
            return response.data;
        } catch (error) {
            console.error('Error obteniendo reportes disponibles:', error);
            throw error;
        }
    }

    // Generar reporte de suscriptores de TV
    async generarReporteSuscriptoresTv(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/suscriptores-tv', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Suscriptores_TV_${params.anno}_T${params.trimestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte suscriptores TV:', error);
            throw error;
        }
    }

    // Generar reporte de planes tarifarios
    async generarReportePlanesTarifarios(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/planes-tarifarios', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Planes_Tarifarios_${params.anno}_S${params.semestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte planes tarifarios:', error);
            throw error;
        }
    }

    // Generar reporte de líneas y valores
    async generarReporteLineasValores(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/lineas-valores', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Lineas_Valores_${params.anno}_T${params.trimestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte líneas y valores:', error);
            throw error;
        }
    }

    // Generar reporte de disponibilidad QoS
    async generarReporteDisponibilidad(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/disponibilidad-qos', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Disponibilidad_QoS_${params.anno}_S${params.semestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte disponibilidad:', error);
            throw error;
        }
    }

    // Generar reporte de monitoreo de quejas
    async generarReporteQuejas(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/monitoreo-quejas', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Monitoreo_Quejas_${params.anno}_T${params.trimestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte quejas:', error);
            throw error;
        }
    }

    // Generar reporte de indicadores de quejas
    async generarReporteIndicadoresQuejas(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/indicadores-quejas', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Indicadores_Quejas_${params.anno}_T${params.trimestre}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte indicadores quejas:', error);
            throw error;
        }
    }

    // Generar reporte de facturas de ventas
    async generarReporteFacturasVentas(params) {
        try {
            const response = await apiService.get('/reportes-regulatorios/facturas-ventas', {
                params,
                responseType: 'blob'
            });
            return this.downloadFile(response, `Facturas_Ventas_${params.fechaInicio}_${params.fechaFin}.xlsx`);
        } catch (error) {
            console.error('Error generando reporte facturas ventas:', error);
            throw error;
        }
    }

    // Método auxiliar para descargar archivos
    downloadFile(response, defaultFilename) {
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Intentar obtener el nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers['content-disposition'];
        let filename = defaultFilename;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { success: true, filename };
    }

    // Generar múltiples reportes
    async generarMultiplesReportes(reportes) {
        const resultados = [];
        
        for (const reporte of reportes) {
            try {
                let resultado;
                
                switch (reporte.tipo) {
                    case 'suscriptores_tv':
                        resultado = await this.generarReporteSuscriptoresTv(reporte.parametros);
                        break;
                    case 'planes_tarifarios':
                        resultado = await this.generarReportePlanesTarifarios(reporte.parametros);
                        break;
                    case 'lineas_valores':
                        resultado = await this.generarReporteLineasValores(reporte.parametros);
                        break;
                    case 'disponibilidad_qos':
                        resultado = await this.generarReporteDisponibilidad(reporte.parametros);
                        break;
                    case 'monitoreo_quejas':
                        resultado = await this.generarReporteQuejas(reporte.parametros);
                        break;
                    case 'indicadores_quejas':
                        resultado = await this.generarReporteIndicadoresQuejas(reporte.parametros);
                        break;
                    case 'facturas_ventas':
                        resultado = await this.generarReporteFacturasVentas(reporte.parametros);
                        break;
                    default:
                        throw new Error(`Tipo de reporte no válido: ${reporte.tipo}`);
                }
                
                resultados.push({
                    tipo: reporte.tipo,
                    success: true,
                    filename: resultado.filename
                });
                
            } catch (error) {
                resultados.push({
                    tipo: reporte.tipo,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return resultados;
    }

    // Validar parámetros de reporte
    validateParameters(tipo, parametros) {
        const errors = {};
        
        switch (tipo) {
            case 'suscriptores_tv':
            case 'lineas_valores':
            case 'monitoreo_quejas':
            case 'indicadores_quejas':
                if (!parametros.anno) errors.anno = 'Año es requerido';
                if (!parametros.trimestre) errors.trimestre = 'Trimestre es requerido';
                break;
                
            case 'planes_tarifarios':
            case 'disponibilidad_qos':
                if (!parametros.anno) errors.anno = 'Año es requerido';
                if (!parametros.semestre) errors.semestre = 'Semestre es requerido';
                break;
                
            case 'facturas_ventas':
                if (!parametros.fechaInicio) errors.fechaInicio = 'Fecha inicio es requerida';
                if (!parametros.fechaFin) errors.fechaFin = 'Fecha fin es requerida';
                break;
        }
        
        // Validaciones adicionales
        if (parametros.anno && (parametros.anno < 2020 || parametros.anno > new Date().getFullYear())) {
            errors.anno = 'Año debe estar entre 2020 y el año actual';
        }
        
        if (parametros.trimestre && (parametros.trimestre < 1 || parametros.trimestre > 4)) {
            errors.trimestre = 'Trimestre debe estar entre 1 y 4';
        }
        
        if (parametros.semestre && (parametros.semestre < 1 || parametros.semestre > 2)) {
            errors.semestre = 'Semestre debe ser 1 o 2';
        }
        
        if (parametros.fechaInicio && parametros.fechaFin) {
            if (new Date(parametros.fechaInicio) > new Date(parametros.fechaFin)) {
                errors.fechaFin = 'Fecha fin debe ser posterior a fecha inicio';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Obtener estadísticas de reportes generados
    async getEstadisticasReportes() {
        try {
            const response = await apiService.get('/reportes-regulatorios/estadisticas');
            return response.data;
        } catch (error) {
            console.error('Error obteniendo estadísticas de reportes:', error);
            throw error;
        }
    }
}

export default new ReportesService();