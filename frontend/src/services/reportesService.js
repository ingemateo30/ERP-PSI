// frontend/src/services/reportesService.js - VERSIÓN CORREGIDA usando patrón de configService

import authService from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://45.173.69.5:3000/api/v1';


class ReportesService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/reportes-regulatorios`;
  }

  // Realizar petición HTTP básica (copiado de configService.js que funciona)
  async makeRequest(url, options = {}) {
    const token = authService.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log('🔗 Haciendo petición a:', url);
      console.log('🔑 Token presente:', !!token);
      console.log('📋 Headers:', headers);

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Para descargas de archivos, no intentar parsear como JSON
      if (options.isFileDownload) {
        if (!response.ok) {
          // Intentar leer error como texto
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error en ReportesService:', error);
      
      if (error.message.includes('401')) {
        try {
          console.log('🔄 Intentando refrescar token...');
          await authService.refreshToken();
          // Reintentar la petición original
          const newToken = authService.getToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            console.log('🔄 Reintentando con nuevo token...');
            
            const retryResponse = await fetch(url, { ...options, headers });
            
            if (options.isFileDownload) {
              if (!retryResponse.ok) {
                const errorText = await retryResponse.text();
                throw new Error(errorText || 'Error en reintento');
              }
              return retryResponse;
            }
            
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              throw new Error(retryData.message || 'Error en reintento');
            }
            
            return retryData;
          }
        } catch (refreshError) {
          console.error('❌ Error al refrescar token:', refreshError);
          // Si falla el refresh, redirigir al login
          authService.removeToken();
          window.location.href = '/login';
          throw new Error('Sesión expirada');
        }
      }
      
      throw error;
    }
  }

  // Obtener reportes disponibles
  async getReportesDisponibles() {
    try {
      console.log('📋 Obteniendo reportes disponibles...');
      
      const data = await this.makeRequest(`${this.baseURL}/disponibles`);
      
      console.log('✅ Reportes obtenidos:', data);
      return {
        success: true,
        data: data.reportes || []
      };
    } catch (error) {
      console.error('❌ Error obteniendo reportes disponibles:', error);
      
      // Fallback con datos estáticos
      return {
        success: false,
        error: error.message,
        data: [
          {
            id: 'suscriptores_tv',
            nombre: 'Suscriptores y Asociados de TV Cerrada',
            descripcion: 'Res. 00175 - F6',
            periodicidad: 'Trimestral',
            parametros: ['anno', 'trimestre']
          },
          {
            id: 'planes_tarifarios',
            nombre: 'Planes Tarifarios de Servicios Fijos',
            descripcion: 'Res. 6333 - T.1.2',
            periodicidad: 'Semestral',
            parametros: ['anno', 'semestre']
          },
          {
            id: 'lineas_valores',
            nombre: 'Líneas y Valores Facturados',
            descripcion: 'Res. 6333 - T.1.3',
            periodicidad: 'Trimestral',
            parametros: ['anno', 'trimestre']
          },
          {
            id: 'disponibilidad_qos',
            nombre: 'Disponibilidad del Servicio QoS',
            descripcion: 'Res. 6333 - T.2.1.B',
            periodicidad: 'Semestral',
            parametros: ['anno', 'semestre']
          },
          {
            id: 'monitoreo_quejas',
            nombre: 'Monitoreo de Quejas',
            descripcion: 'Res. 6755 - T.4.2',
            periodicidad: 'Trimestral',
            parametros: ['anno', 'trimestre']
          },
          {
            id: 'indicadores_quejas',
            nombre: 'Indicadores de Quejas y Peticiones',
            descripcion: 'Res. 6755 - T.4.3',
            periodicidad: 'Trimestral',
            parametros: ['anno', 'trimestre']
          },
          {
            id: 'facturas_ventas',
            nombre: 'Facturas de Ventas (Modelo Contable)',
            descripcion: 'Reporte para importación contable',
            periodicidad: 'Según rango de fechas',
            parametros: ['fechaInicio', 'fechaFin']
          },
          {
            id: 'siigo_facturacion',
            nombre: 'Facturación Siigo (Modelo de importación)',
            descripcion: 'Reporte para importación de facturas en Siigo',
            periodicidad: 'Según rango de fechas',
            parametros: ['fechaInicio', 'fechaFin']
          }
        ]
      };
    }
  }

  // Método genérico para generar reportes
  async generarReporte(reportId, params) {
    try {
      console.log(`📊 Generando reporte: ${reportId}`, params);
      
      const endpoint = this.getEndpointForReport(reportId);
      const queryParams = new URLSearchParams(params);
      const url = `${this.baseURL}/${endpoint}?${queryParams}`;
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        isFileDownload: true // Flag para indicar que es descarga de archivo
      });
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('El archivo generado está vacío');
      }
      
      // Generar nombre de archivo
      let filename = this.generateFilename(reportId, params);
      
      // Intentar obtener el nombre del archivo del header
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Descargar archivo
      this.downloadBlob(blob, filename);
      
      console.log('✅ Reporte generado y descargado:', filename);
      return { 
        success: true, 
        filename,
        message: 'Reporte generado exitosamente'
      };
      
    } catch (error) {
      console.error(`❌ Error generando reporte ${reportId}:`, error);
      throw error;
    }
  }

  // Generar reporte de suscriptores de TV
  async generarReporteSuscriptoresTv(params) {
    return this.generarReporte('suscriptores_tv', params);
  }

  // Generar reporte de planes tarifarios
  async generarReportePlanesTarifarios(params) {
    return this.generarReporte('planes_tarifarios', params);
  }

  // Generar reporte de líneas y valores
  async generarReporteLineasValores(params) {
    return this.generarReporte('lineas_valores', params);
  }

  // Generar reporte de disponibilidad QoS
  async generarReporteDisponibilidad(params) {
    return this.generarReporte('disponibilidad_qos', params);
  }

  // Generar reporte de monitoreo de quejas
  async generarReporteQuejas(params) {
    return this.generarReporte('monitoreo_quejas', params);
  }

  // Generar reporte de indicadores de quejas
  async generarReporteIndicadoresQuejas(params) {
    return this.generarReporte('indicadores_quejas', params);
  }

  // Generar reporte de facturas de ventas
  async generarReporteFacturasVentas(params) {
    return this.generarReporte('facturas_ventas', params);
  }

  // Generar reporte de facturación Siigo
  async generarReporteSiigoFacturacion(params) {
    return this.generarReporte('siigo_facturacion', params);
  }

  // Método para mapear IDs a endpoints
  getEndpointForReport(reportId) {
    const mapping = {
      'suscriptores_tv': 'suscriptores-tv',
      'planes_tarifarios': 'planes-tarifarios',
      'lineas_valores': 'lineas-valores',
      'disponibilidad_qos': 'disponibilidad-qos',
      'monitoreo_quejas': 'monitoreo-quejas',
      'indicadores_quejas': 'indicadores-quejas',
      'facturas_ventas': 'facturas-ventas',
      'siigo_facturacion': 'siigo-facturacion'
    };

    return mapping[reportId] || reportId;
  }

  // Generar nombre de archivo
  generateFilename(reportId, params) {
    let filename = reportId;
    
    if (params.anno) {
      filename += `_${params.anno}`;
    }
    
    if (params.trimestre) {
      filename += `_T${params.trimestre}`;
    }
    
    if (params.semestre) {
      filename += `_S${params.semestre}`;
    }
    
    if (params.fechaInicio && params.fechaFin) {
      filename += `_${params.fechaInicio}_${params.fechaFin}`;
    }
    
    return `${filename}.xlsx`;
  }

  // Descargar blob como archivo
  downloadBlob(blob, filename) {
    try {
      console.log('💾 Descargando archivo:', filename);
      console.log('📁 Blob size:', blob.size, 'bytes');
      
      // Crear blob con tipo MIME correcto
      const fileBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(fileBlob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      // Agregar al DOM, hacer clic y remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL después de un momento
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Archivo descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error descargando archivo:', error);
      throw error;
    }
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
      case 'siigo_facturacion':
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

  // Generar múltiples reportes
  async generarMultiplesReportes(reportes) {
    const resultados = [];
    
    for (const reporte of reportes) {
      try {
        console.log(`🔄 Procesando reporte: ${reporte.tipo}`);
        const resultado = await this.generarReporte(reporte.tipo, reporte.parametros);
        
        resultados.push({
          tipo: reporte.tipo,
          success: true,
          filename: resultado.filename
        });
        
      } catch (error) {
        console.error(`❌ Error generando reporte ${reporte.tipo}:`, error);
        resultados.push({
          tipo: reporte.tipo,
          success: false,
          error: error.message
        });
      }
    }
    
    return resultados;
  }

  // Debug del token
  debugToken() {
    const token = authService.getToken();
    console.group('🔍 Debug Token');
    console.log('Token presente:', !!token);
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
      console.log('Token parts:', token.split('.').length);
    }
    console.groupEnd();
  }
}

export default new ReportesService();