// components/Reports/ReportesRegulatorios.js - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import reportesService from '../../services/reportesService';

const ReportesRegulatorios = () => {
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState('');
    const [parameters, setParameters] = useState({});
    const [errors, setErrors] = useState({});
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        cargarReportesDisponibles();
    }, []);

    const cargarReportesDisponibles = async () => {
        try {
            console.log('🔄 Cargando reportes disponibles...');
            setLoading(true);
            
            const resultado = await reportesService.getReportesDisponibles();
            
            if (resultado.success) {
                console.log('✅ Reportes cargados exitosamente:', resultado.data);
                setReportes(resultado.data);
                
                if (resultado.data.length > 0) {
                    showNotification('Reportes cargados exitosamente', 'success');
                }
            } else {
                console.warn('⚠️ Error cargando reportes, usando fallback:', resultado.error);
                setReportes(resultado.data); // Los datos de fallback
                showNotification('Usando datos de respaldo. Verifica la conexión con el servidor.', 'warning');
            }
            
        } catch (error) {
            console.error('❌ Error cargando reportes:', error);
            showNotification(`Error cargando reportes: ${error.message}`, 'error');
            
            // Datos de respaldo en caso de error total
            setReportes([
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
                    id: 'facturas_ventas',
                    nombre: 'Facturas de Ventas (Modelo Contable)',
                    descripcion: 'Reporte para importación contable',
                    periodicidad: 'Según rango de fechas',
                    parametros: ['fechaInicio', 'fechaFin']
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
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
        const validation = reportesService.validateParameters(reporte.id, parameters);
        setErrors(validation.errors);
        return validation.isValid;
    };

    const generarReporte = async () => {
        const reporte = reportes.find(r => r.id === selectedReport);
        if (!reporte) {
            showNotification('Por favor selecciona un reporte', 'error');
            return;
        }

        if (!validateParameters(reporte)) {
            showNotification('Por favor completa todos los parámetros requeridos correctamente', 'error');
            return;
        }

        setLoading(true);
        try {
            console.log(`🎯 Generando reporte: ${selectedReport} con parámetros:`, parameters);
            
            let resultado;
            switch (selectedReport) {
                case 'suscriptores_tv':
                    resultado = await reportesService.generarReporteSuscriptoresTv(parameters);
                    break;
                case 'planes_tarifarios':
                    resultado = await reportesService.generarReportePlanesTarifarios(parameters);
                    break;
                case 'lineas_valores':
                    resultado = await reportesService.generarReporteLineasValores(parameters);
                    break;
                case 'disponibilidad_qos':
                    resultado = await reportesService.generarReporteDisponibilidad(parameters);
                    break;
                case 'monitoreo_quejas':
                    resultado = await reportesService.generarReporteQuejas(parameters);
                    break;
                case 'indicadores_quejas':
                    resultado = await reportesService.generarReporteIndicadoresQuejas(parameters);
                    break;
                case 'facturas_ventas':
                    resultado = await reportesService.generarReporteFacturasVentas(parameters);
                    break;
                default:
                    // Usar método genérico
                    resultado = await reportesService.generarReporte(selectedReport, parameters);
                    break;
            }

            if (resultado.success) {
                showNotification(`Reporte "${reporte.nombre}" generado y descargado exitosamente`, 'success');
            } else {
                throw new Error(resultado.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            showNotification(`Error generando el reporte: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderParameterInput = (param, reporte) => {
        const hasError = errors[param];
        const baseClasses = `w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                            placeholder={`Ej: ${new Date().getFullYear()}`}
                        />
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
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
                            <option value="1">1er Trimestre (Enero - Marzo)</option>
                            <option value="2">2do Trimestre (Abril - Junio)</option>
                            <option value="3">3er Trimestre (Julio - Septiembre)</option>
                            <option value="4">4to Trimestre (Octubre - Diciembre)</option>
                        </select>
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
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
                            <option value="1">1er Semestre (Enero - Junio)</option>
                            <option value="2">2do Semestre (Julio - Diciembre)</option>
                        </select>
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
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
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
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
                            max={new Date().toISOString().split('T')[0]}
                            min={parameters.fechaInicio || ''}
                        />
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
                    </div>
                );

            default:
                return (
                    <div key={param} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            {param.charAt(0).toUpperCase() + param.slice(1)} *
                        </label>
                        <input
                            type="text"
                            value={parameters[param] || ''}
                            onChange={(e) => handleParameterChange(param, e.target.value)}
                            className={baseClasses}
                        />
                        {hasError && <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {errors[param]}
                        </p>}
                    </div>
                );
        }
    };

    const selectedReportData = reportes.find(r => r.id === selectedReport);

    return (
        <div className="p-6">
            {/* Notificación */}
            {notification && (
                <div className={`mb-6 p-4 rounded-lg border flex items-center ${
                    notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                    {notification.type === 'success' && <CheckCircle className="w-5 h-5 mr-3" />}
                    {notification.type === 'warning' && <AlertCircle className="w-5 h-5 mr-3" />}
                    {notification.type === 'error' && <XCircle className="w-5 h-5 mr-3" />}
                    {notification.type === 'info' && <AlertCircle className="w-5 h-5 mr-3" />}
                    <span>{notification.message}</span>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Reportes Regulatorios
                </h1>
                <p className="text-gray-600">
                    Generación de reportes para entidades regulatorias (CRC) y contabilidad
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel de selección de reportes */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <FileSpreadsheet className="w-5 h-5 mr-2" />
                            Reportes Disponibles
                        </h2>
                        
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-600 mt-2">Cargando reportes...</p>
                            </div>
                        ) : reportes.length > 0 ? (
                            <div className="space-y-3">
                                {reportes.map((reporte) => (
                                    <div
                                        key={reporte.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                            selectedReport === reporte.id
                                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                        ) : (
                            <div className="text-center py-8">
                                <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600">No hay reportes disponibles</p>
                                <button 
                                    onClick={cargarReportesDisponibles}
                                    className="mt-2 text-blue-600 hover:text-blue-800"
                                >
                                    Intentar cargar nuevamente
                                </button>
                            </div>
                        )}
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
                                        <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-medium text-blue-900 mb-1">
                                                {selectedReportData.descripcion}
                                            </h3>
                                            <p className="text-sm text-blue-700">
                                                Periodicidad: {selectedReportData.periodicidad}
                                            </p>
                                            <p className="text-xs text-blue-600 mt-1">
                                                Los reportes se generan en formato Excel (.xlsx) compatible con el SUI de la CRC
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
                                                Generando Reporte...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Generar y Descargar
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
                                    Escoge un reporte de la lista para configurar sus parámetros y generarlo
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
                        <h4 className="font-medium text-gray-900 mb-2">📊 Reportes CRC</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Los reportes se generan según las resoluciones vigentes de la CRC</li>
                            <li>• Formato Excel compatible con el SUI (Sistema Único de Información)</li>
                            <li>• Datos extraídos directamente del sistema en tiempo real</li>
                            <li>• Validación automática de períodos y parámetros</li>
                            <li>• Incluye hoja de información de control requerida</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-900 mb-2">💼 Reportes Contables</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Formato compatible con sistemas contables estándar</li>
                            <li>• Incluye todos los detalles de facturación y pagos</li>
                            <li>• Separación por conceptos, descuentos e impuestos</li>
                            <li>• Exportación por rangos de fechas personalizables</li>
                            <li>• Códigos de terceros y centros de costo incluidos</li>
                        </ul>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>Nota:</strong> Los reportes se descargan automáticamente al generarse. 
                        Asegúrate de permitir las descargas en tu navegador.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportesRegulatorios;