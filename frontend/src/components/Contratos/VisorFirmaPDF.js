// frontend/src/components/Contratos/VisorFirmaPDF.js
import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
    FileText,
    PenTool,
    Save,
    RotateCcw,
    Download,
    Upload,
    Check,
    Eye,
    Tablet,
    AlertCircle
} from 'lucide-react';

const VisorFirmaPDF = ({ contratoId, onFirmaCompleta, onCancelar }) => {
    const sigCanvas = useRef();
    const fileInputRef = useRef();

    const [pdfUrl, setPdfUrl] = useState('');
    const [contratoData, setContratoData] = useState({});
    const [loading, setLoading] = useState(true);
    const [procesandoFirma, setProcesandoFirma] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pdfCargado, setPdfCargado] = useState(false);

    const [modoFirma, setModoFirma] = useState('digital'); // 'digital' | 'imagen'
    const [datosSignature, setDatosSignature] = useState({
        firmado_por: '',
        cedula_firmante: '',
        tipo_firma: 'digital',
        observaciones: ''
    });

    useEffect(() => {
        cargarContratoParaFirma();
    }, [contratoId]);

    const cargarContratoParaFirma = async () => {
        try {
            setLoading(true);
            setError('');
            setPdfCargado(false);

            console.log('📋 Cargando contrato para firma usando servicio...');

            if (!contratoId || isNaN(contratoId)) {
                throw new Error('ID de contrato inválido');
            }

            // Usar el servicio que maneja todo internamente
            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;

            const response = await service.cargarContratoParaFirma(contratoId);

            if (response.success && response.data) {
                setContratoData(response.data);

                // El servicio ya nos devuelve la URL del PDF lista para usar
                const urlPDF = response.data.pdf_url;
                
                if (urlPDF) {
                    console.log('🔗 URL del PDF recibida:', urlPDF);
                    setPdfUrl(urlPDF);
                    setPdfCargado(true);
                } else {
                    throw new Error('No se pudo generar la URL del PDF');
                }

                // Pre-llenar con datos del cliente si existen
                setDatosSignature(prev => ({
                    ...prev,
                    firmado_por: response.data.cliente_nombre || '',
                    cedula_firmante: response.data.cliente_identificacion || ''
                }));
                
            } else {
                throw new Error(response.message || 'Error cargando contrato');
            }
        } catch (error) {
            console.error('❌ Error cargando contrato desde servicio:', error);
            setError('Error cargando contrato: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // NUEVO: Verificar que el PDF se puede cargar correctamente - USANDO SERVICIO
    const verificarPDF = async (url) => {
        try {
            console.log('🔍 Verificando disponibilidad del PDF...');
            
            // Usar el servicio para verificar
            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;
            
            const verificacion = await service.verificarPDF(contratoId);
            
            if (verificacion.disponible) {
                const contentType = verificacion.contentType;
                if (contentType && contentType.includes('application/pdf')) {
                    setPdfCargado(true);
                    console.log('✅ PDF verificado exitosamente');
                } else {
                    throw new Error('El archivo no es un PDF válido');
                }
            } else {
                throw new Error(verificacion.error || 'PDF no disponible');
            }
        } catch (error) {
            console.error('❌ Error verificando PDF:', error);
            setError('Error cargando el PDF del contrato: ' + error.message);
            setPdfCargado(false);
        }
    };

    const limpiarFirma = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
        setError('');
    };

    const manejarSubidaImagen = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('La imagen no debe superar 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setDatosSignature(prev => ({
                    ...prev,
                    signature_base64: e.target.result
                }));
                setError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const procesarFirma = async () => {
        try {
            // Validaciones
            if (!datosSignature.firmado_por.trim()) {
                setError('Debe especificar el nombre del firmante');
                return;
            }

            if (!datosSignature.cedula_firmante.trim()) {
                setError('Debe especificar la cédula del firmante');
                return;
            }

            let signatureBase64 = datosSignature.signature_base64;

            // Capturar firma digital si es necesario
            if (modoFirma === 'digital') {
                if (sigCanvas.current && sigCanvas.current.isEmpty()) {
                    setError('Debe firmar en el área designada');
                    return;
                }
                signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL();
            }

            if (!signatureBase64) {
                setError('Debe proporcionar una firma');
                return;
            }

            setProcesandoFirma(true);
            setError('');

            console.log('🖊️ Procesando firma digital usando servicio...');

            // CORRECCIÓN: Usar el servicio
            const contratosService = await import('../../services/contratosService');
            const service = contratosService.default;

            const datosParaEnviar = {
                ...datosSignature,
                signature_base64: signatureBase64,
                tipo_firma: modoFirma
            };

            const response = await service.procesarFirmaDigital(contratoId, datosParaEnviar);

            if (response.success) {
                setSuccess('¡Contrato firmado digitalmente y guardado exitosamente!');

                setTimeout(() => {
                    if (onFirmaCompleta) {
                        onFirmaCompleta(response.data);
                    }
                }, 1500);
            } else {
                throw new Error(response.message || 'Error procesando la firma');
            }

        } catch (error) {
            console.error('❌ Error procesando firma:', error);
            setError('Error procesando firma: ' + error.message);
        } finally {
            setProcesandoFirma(false);
        }
    };

    const abrirPDFEnNuevaVentana = () => {
        if (pdfUrl) {
            // Para nueva ventana, necesitamos pasar el token de alguna manera
            // Vamos a usar un endpoint especial o abrir con fetch + blob
            const token = localStorage.getItem('token');
            
            // Crear una nueva ventana con el PDF usando fetch para incluir headers
            fetch(pdfUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                // Limpiar el URL después de un tiempo
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            })
            .catch(error => {
                console.error('Error abriendo PDF:', error);
                // Fallback: intentar abrir directamente
                window.open(pdfUrl, '_blank');
            });
        }
    };

    const descargarPDF = () => {
        if (pdfUrl) {
            const token = localStorage.getItem('token');
            
            // Usar fetch para descargar con headers de autenticación
            fetch(pdfUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/pdf'
                }
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `contrato_${contratoData.numero_contrato || contratoId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error descargando PDF:', error);
                setError('Error descargando el PDF');
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Cargando contrato...</span>
            </div>
        );
    }

    if (error && !pdfCargado) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">
                        Error al cargar el contrato
                    </h3>
                </div>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={cargarContratoParaFirma}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Reintentar
                    </button>
                    {onCancelar && (
                        <button
                            onClick={onCancelar}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (contratoData.firmado) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Check className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">
                        Contrato ya firmado
                    </h3>
                </div>
                <p className="text-green-700 mb-4">
                    Este contrato ya ha sido firmado digitalmente.
                </p>
                {pdfUrl && (
                    <div className="flex gap-3">
                        <button
                            onClick={abrirPDFEnNuevaVentana}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Eye className="h-4 w-4" />
                            Ver PDF
                        </button>
                        <button
                            onClick={descargarPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Descargar
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Firma Digital de Contrato
                </h2>
                <p className="text-gray-600">
                    Contrato: {contratoData.numero_contrato} - Cliente: {contratoData.cliente_nombre}
                </p>
            </div>

            {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visor de PDF */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Documento del Contrato
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={abrirPDFEnNuevaVentana}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                <Eye className="h-4 w-4" />
                                Abrir en nueva ventana
                            </button>
                            <button
                                onClick={descargarPDF}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                Descargar
                            </button>
                        </div>
                    </div>

                    {/* CORRECCIÓN: Iframe mejorado para mostrar PDF con autenticación */}
                    <div className="border rounded-lg overflow-hidden bg-gray-50">
                        {pdfCargado && pdfUrl ? (
                            <iframe
                                src={pdfUrl}
                                className="w-full h-96 lg:h-[600px]"
                                title="Contrato PDF"
                                style={{ border: 'none' }}
                                onLoad={() => {
                                    console.log('✅ PDF cargado en iframe');
                                    // Verificar si el contenido del iframe es realmente un PDF
                                    setTimeout(() => {
                                        try {
                                            const iframe = document.querySelector('iframe[title="Contrato PDF"]');
                                            if (iframe && iframe.contentDocument) {
                                                const iframeContent = iframe.contentDocument.body.innerHTML;
                                                if (iframeContent.includes('401') || iframeContent.includes('403') || iframeContent.includes('Unauthorized')) {
                                                    setError('Error de autenticación. Use el botón "Abrir en nueva ventana".');
                                                    setPdfCargado(false);
                                                }
                                            }
                                        } catch (e) {
                                            // Cross-origin error - esto es normal para PDFs válidos
                                            console.log('PDF cargado correctamente (cross-origin)');
                                        }
                                    }, 1000);
                                }}
                                onError={() => {
                                    console.error('❌ Error cargando PDF en iframe');
                                    setError('Error mostrando el PDF. Use el botón "Abrir en nueva ventana".');
                                    setPdfCargado(false);
                                }}
                            />
                        ) : (
                            <div className="h-96 lg:h-[600px] flex items-center justify-center">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        {loading ? 'Cargando PDF...' : 'PDF no disponible'}
                                    </p>
                                    {!loading && pdfUrl && (
                                        <button
                                            onClick={abrirPDFEnNuevaVentana}
                                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Abrir PDF en nueva ventana
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel de Firma */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Área de Firma Digital
                    </h3>

                    {/* Información del firmante */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del firmante *
                            </label>
                            <input
                                type="text"
                                value={datosSignature.firmado_por}
                                onChange={(e) => setDatosSignature(prev => ({
                                    ...prev,
                                    firmado_por: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nombre completo del firmante"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cédula del firmante *
                            </label>
                            <input
                                type="text"
                                value={datosSignature.cedula_firmante}
                                onChange={(e) => setDatosSignature(prev => ({
                                    ...prev,
                                    cedula_firmante: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Número de identificación"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observaciones (opcional)
                            </label>
                            <textarea
                                value={datosSignature.observaciones}
                                onChange={(e) => setDatosSignature(prev => ({
                                    ...prev,
                                    observaciones: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="2"
                                placeholder="Comentarios adicionales..."
                            />
                        </div>
                    </div>

                    {/* Selector de modo de firma */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de firma
                        </label>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setModoFirma('digital')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    modoFirma === 'digital'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Tablet className="h-4 w-4" />
                                Digital
                            </button>
                            <button
                                onClick={() => setModoFirma('imagen')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    modoFirma === 'imagen'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Upload className="h-4 w-4" />
                                Subir imagen
                            </button>
                        </div>
                    </div>

                    {/* Área de firma */}
                    {modoFirma === 'digital' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Firma con el dedo o stylus
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    canvasProps={{
                                        width: 400,
                                        height: 150,
                                        className: 'signature-canvas w-full border rounded bg-white'
                                    }}
                                    backgroundColor="rgb(255, 255, 255)"
                                />
                            </div>
                            <button
                                onClick={limpiarFirma}
                                className="mt-2 flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Limpiar firma
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subir imagen de firma
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={manejarSubidaImagen}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2" />
                                Seleccionar imagen de firma
                                <br />
                                <span className="text-sm">PNG, JPG (máx. 2MB)</span>
                            </button>
                            {datosSignature.signature_base64 && (
                                <div className="mt-3">
                                    <img
                                        src={datosSignature.signature_base64}
                                        alt="Firma seleccionada"
                                        className="max-w-full h-20 border rounded object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botón de confirmar firma */}
                    <button
                        onClick={procesarFirma}
                        disabled={procesandoFirma}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {procesandoFirma ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Confirmar Firma
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VisorFirmaPDF;