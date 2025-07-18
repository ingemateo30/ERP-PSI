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
  Tablet
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
      
      const response = await fetch(`/api/v1/contratos/${contratoId}/abrir-firma`);
      const data = await response.json();
      
      if (data.success) {
        setContratoData(data.data);
        setPdfUrl(`/api/v1/contratos/${contratoId}/pdf?t=${Date.now()}`);
        
        // Pre-llenar con datos del cliente si existen
        setDatosSignature(prev => ({
          ...prev,
          firmado_por: data.data.cliente_nombre || '',
          cedula_firmante: data.data.cliente_identificacion || ''
        }));
      } else {
        setError(data.message || 'Error cargando contrato');
      }
    } catch (error) {
      console.error('Error cargando contrato:', error);
      setError('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
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

      const response = await fetch(`/api/v1/contratos/${contratoId}/procesar-firma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...datosSignature,
          signature_base64: signatureBase64,
          tipo_firma: modoFirma
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Contrato firmado exitosamente');
        setTimeout(() => {
          if (onFirmaCompleta) {
            onFirmaCompleta(result.data);
          }
        }, 2000);
      } else {
        setError(result.message || 'Error procesando la firma');
      }

    } catch (error) {
      console.error('Error procesando firma:', error);
      setError('Error de comunicación con el servidor');
    } finally {
      setProcesandoFirma(false);
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
        <button
          onClick={() => window.open(`/api/v1/contratos/${contratoId}/pdf`, '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Eye className="h-4 w-4" />
          Ver contrato firmado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Visor de PDF */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contrato: {contratoData.numero_contrato}
        </h3>
        
        <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title="Contrato PDF"
          />
        </div>
      </div>

      {/* Área de firma */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Firma del contrato</h3>
          
          <div className="flex gap-2">
            <button
              onClick={() => setModoFirma('digital')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                modoFirma === 'digital' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PenTool className="h-4 w-4" />
              Firma Digital
            </button>
            <button
              onClick={() => setModoFirma('imagen')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                modoFirma === 'imagen' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Upload className="h-4 w-4" />
              Subir Imagen
            </button>
          </div>
        </div>

        {/* Área de firma digital */}
        {modoFirma === 'digital' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="font-medium text-gray-900">Área de Firma</label>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tablet className="h-4 w-4" />
                Compatible con tablet y dispositivos táctiles
              </div>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'signature-canvas w-full h-40 border border-gray-200 rounded bg-white',
                  style: { touchAction: 'none' }
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            
            <div className="flex justify-between mt-3">
              <button
                onClick={limpiarFirma}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
              <p className="text-sm text-gray-500">
                Firme en el área blanca usando su dedo o stylus
              </p>
            </div>
          </div>
        )}

        {/* Subir imagen de firma */}
        {modoFirma === 'imagen' && (
          <div className="mb-6">
            <label className="block font-medium text-gray-900 mb-3">
              Subir Imagen de Firma
            </label>
            
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                {datosSignature.signature_base64 ? (
                  <img 
                    src={datosSignature.signature_base64} 
                    alt="Firma subida" 
                    className="max-h-32 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click para subir</span> o arrastre aquí
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG (MAX. 2MB)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={manejarSubidaImagen}
                />
              </label>
            </div>
          </div>
        )}

        {/* Datos del firmante */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre completo del firmante *
            </label>
            <input
              type="text"
              value={datosSignature.firmado_por}
              onChange={(e) => setDatosSignature(prev => ({
                ...prev,
                firmado_por: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre completo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cédula del firmante *
            </label>
            <input
              type="text"
              value={datosSignature.cedula_firmante}
              onChange={(e) => setDatosSignature(prev => ({
                ...prev,
                cedula_firmante: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Número de cédula"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones (opcional)
          </label>
          <textarea
            value={datosSignature.observaciones}
            onChange={(e) => setDatosSignature(prev => ({
              ...prev,
              observaciones: e.target.value
            }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Observaciones adicionales..."
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          {onCancelar && (
            <button
              onClick={onCancelar}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={procesandoFirma}
            >
              Cancelar
            </button>
          )}
          
          <button
            onClick={procesarFirma}
            disabled={procesandoFirma}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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