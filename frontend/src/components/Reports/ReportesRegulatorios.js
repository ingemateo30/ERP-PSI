
import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react';

const ReportesRegulatorios = () => {
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState('');
    const [parameters, setParameters] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        cargarReportesDisponibles();
    }, []);

    const cargarReportesDisponibles = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Token presente:', !!token);
            
            const response = await fetch('/api/reportes-regulatorios/disponibles', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response URL:', response.url);
            
            // Verificar que la respuesta sea JSON válido
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('Respuesta no JSON:', responseText.substring(0, 200));
                throw new Error('El endpoint devolvió HTML en lugar de JSON - posible error 404');
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            setReportes(data.reportes || []);
            
        } catch (error) {
            console.error('Error cargando reportes:', error);
            
            // Fallback con datos estáticos
            const reportesEstaticos = [
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
                }
            ];
            
            setReportes(reportesEstaticos);
            console.warn('Usando datos estáticos debido al error. Verifica que el endpoint /api/reportes-regulatorios/disponibles exista en el backend.');
        }
    };

    const handleParameterChange = (param, value) => {
        setParameters(prev => ({
            ...prev,
            [param]: value
        }));
        
        if (errors[param]) {
            setErrors(prev => ({
                ...prev,
                [param]: null
            }));
        }
    };

    const validateParameters = (reporte) => {
        const newErrors = {};
        
        reporte.parametros.forEach(param => {
            if (!parameters[param]) {
                newErrors[param] = `${param} es requerido`;
            }
        });

        if (parameters.anno && (parameters.anno < 2020 || parameters.anno > new Date().getFullYear())) {
            newErrors.anno = 'Año debe estar entre 2020 y el año actual';
        }

        if (parameters.trimestre && (parameters.trimestre < 1 || parameters.trimestre > 4)) {
            newErrors.trimestre = 'Trimestre debe estar entre 1 y 4';
        }

        if (parameters.semestre && (parameters.semestre < 1 || parameters.semestre > 2)) {
            newErrors.semestre = 'Semestre debe ser 1 o 2';
        }

        if (parameters.fechaInicio && parameters.fechaFin) {
            if (new Date(parameters.fechaInicio) > new Date(parameters.fechaFin)) {
                newErrors.fechaFin = 'Fecha fin debe ser posterior a fecha inicio';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generarReporte = async () => {
        const reporte = reportes.find(r => r.id === selectedReport);
        if (!reporte) {
            alert('Por favor selecciona un reporte');
            return;
        }

        if (!validateParameters(reporte)) {
            alert('Por favor completa todos los parámetros requeridos');
            return;
        }

        setLoading(true);
        try {
            const queryParams = new URLSearchParams(parameters);
            const url = `/api/reportes-regulatorios/${selectedReport.replace('_', '-')}?${queryParams}`;
            
            console.log('Generando reporte:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Intentar leer el error como JSON, si no como texto
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || `Error ${response.status}`;
                } catch {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            // Verificar que sea un archivo Excel
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('spreadsheetml')) {
                console.warn('Tipo de contenido inesperado:', contentType);
            }

            // Obtener el blob del archivo
            const blob = await response.blob();
            console.log('Blob size:', blob.size, 'bytes');
            
            if (blob.size === 0) {
                throw new Error('El archivo generado está vacío');
            }
            
            // Crear URL de descarga con tipo MIME correcto
            const downloadUrl = window.URL.createObjectURL(new Blob([blob], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }));
            
            // Obtener nombre del archivo
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `${reporte.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            console.log('Descargando archivo:', filename);
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = 'none';
            
            // Agregar al DOM, hacer clic y remover
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar URL después de un momento
            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
            }, 100);

            alert('Reporte generado y descargado exitosamente');

        } catch (error) {
            console.error('Error generando reporte:', error);
            alert(`Error generando el reporte: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInput = (param, reporte) => {
        const hasError = errors[param];
        const baseClasses = `w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            hasError ? 'border-red-500' : 'border-gray-300'
        }`;

        switch (param) {
            case 'anno':
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Año *
                        </label>
                        <input
                            type="number"
                            min="2020"
                            max={new Date().getFullYear()}
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                            placeholder="Ej: 2024"
                        />
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );

            case 'trimestre':
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Trimestre *
                        </label>
                        <select
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        >
                            <option value="">Seleccionar trimestre</option>
                            <option value="1">1 (Enero - Marzo)</option>
                            <option value="2">2 (Abril - Junio)</option>
                            <option value="3">3 (Julio - Septiembre)</option>
                            <option value="4">4 (Octubre - Diciembre)</option>
                        </select>
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );

            case 'semestre':
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Semestre *
                        </label>
                        <select
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        >
                            <option value="">Seleccionar semestre</option>
                            <option value="1">1 (Enero - Junio)</option>
                            <option value="2">2 (Julio - Diciembre)</option>
                        </select>
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );

            case 'fechaInicio':
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Fecha Inicio *
                        </label>
                        <input
                            type="date"
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        />
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );

            case 'fechaFin':
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Fecha Fin *
                        </label>
                        <input
                            type="date"
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        />
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );

            default:
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {param} *
                        </label>
                        <input
                            type="text"
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        />
                        {hasError && <p className="text-sm text-red-600">{errors[param]}</p>}
                    </div>
                );
        }
    };

    const selectedReportData = reportes.find(r => r.id === selectedReport);

    return (
                    <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Reportes Regulatorios
                </h1>
                <p className="text-gray-600">
                    Generación de reportes para entidades regulatorias (CRC) y contabilidad
                </p>
                
                {/* Debug info temporal */}
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Estado:</strong> Token {localStorage.getItem('token') ? '🟢' : '🔴'} | 
                    Reportes cargados: {reportes.length} | 
                    Seleccionado: {selectedReport || 'ninguno'} |
                    <button 
                        onClick={() => window.open('/api/reportes-regulatorios/disponibles', '_blank')}
                        className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                    >
                        Probar Endpoint
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de selección de reportes */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <FileSpreadsheet className="w-5 h-5 mr-2" />
                            Reportes Disponibles
                        </h2>
                        
                        <div className="space-y-3">
                            {reportes.map((reporte) => (
                                <div
                                    key={reporte.id}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                        selectedReport === reporte.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                        setSelectedReport(reporte.id);
                                        setParameters({});
                                        setErrors({});
                                    }}
                                >
                                    <h3 className="font-medium text-sm">{reporte.nombre}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{reporte.descripcion}</p>
                                    <div className="flex items-center mt-2 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {reporte.periodicidad}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Panel de parámetros y generación */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow p-6">
                        {selectedReportData ? (
                            <>
                                <h2 className="text-lg font-semibold mb-4">
                                    {selectedReportData.nombre}
                                </h2>
                                
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-start">
                                        <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-blue-900 mb-1">
                                                {selectedReportData.descripcion}
                                            </h3>
                                            <p className="text-sm text-blue-700">
                                                Periodicidad: {selectedReportData.periodicidad}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {selectedReportData.parametros.map(param => 
                                        renderParameterInput(param, selectedReportData)
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={generarReporte}
                                        disabled={loading || !selectedReport}
                                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Generando...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Generar Reporte
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Selecciona un Reporte
                                </h3>
                                <p className="text-gray-600">
                                    Escoge un reporte de la lista para configurar sus parámetros
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Información adicional */}
            <div className="mt-6 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Información Importante</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Reportes CRC</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Los reportes se generan según las resoluciones vigentes</li>
                            <li>• Formato Excel compatible con el SUI</li>
                            <li>• Datos extraídos directamente del sistema</li>
                            <li>• Validación automática de períodos</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">Reportes Contables</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Formato compatible con sistemas contables</li>
                            <li>• Incluye todos los detalles de facturación</li>
                            <li>• Separación por conceptos e impuestos</li>
                            <li>• Exportación por rangos de fechas</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportesRegulatorios;