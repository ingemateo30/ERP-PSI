// components/Facturas/AnularModal.js - Corregido
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  FileX, 
  X, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const AnularModal = ({ isOpen, onClose, onConfirmar, factura, loading, error }) => {
  const [motivo, setMotivo] = useState('');
  const [motivoDetallado, setMotivoDetallado] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});

  // Motivos predefinidos
  const motivosPredefinidos = [
    { value: 'duplicada', label: 'Factura duplicada' },
    { value: 'error_datos', label: 'Error en los datos' },
    { value: 'cliente_solicita', label: 'Solicitud del cliente' },
    { value: 'error_sistema', label: 'Error del sistema' },
    { value: 'cambio_servicio', label: 'Cambio de servicio' },
    { value: 'otro', label: 'Otro motivo' }
  ];

  // Limpiar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setMotivoDetallado('');
      setConfirmacion('');
      setErrores({});
    }
  }, [isOpen]);

  // Manejar cambios en los campos
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'motivo') {
      setMotivo(value);
    } else if (name === 'motivo_detallado') {
      setMotivoDetallado(value);
    } else if (name === 'confirmacion') {
      setConfirmacion(value);
    }

    // Limpiar error del campo
    if (errores[name]) {
      setErrores(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    // Validar motivo
    if (!motivo) {
      nuevosErrores.motivo = 'Debe seleccionar un motivo para la anulación';
    }
    
    // Validar motivo detallado si es necesario
    if (motivo === 'otro' && !motivoDetallado.trim()) {
      nuevosErrores.motivo_detallado = 'Debe especificar el motivo detallado';
    }
    
    if (!motivoDetallado.trim() && motivo !== 'otro') {
      nuevosErrores.motivo_detallado = 'Debe proporcionar una descripción del motivo';
    }
    
    // Validar confirmación
    const textoConfirmacion = `ANULAR-${factura?.numero_factura || 'FACTURA'}`;
    if (confirmacion !== textoConfirmacion) {
      nuevosErrores.confirmacion = `Debe escribir exactamente: ${textoConfirmacion}`;
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    // Construir motivo completo
    const motivoCompleto = motivo === 'otro' 
      ? motivoDetallado 
      : `${motivosPredefinidos.find(m => m.value === motivo)?.label}: ${motivoDetallado}`;
    
    try {
      await onConfirmar(motivoCompleto);
    } catch (error) {
      console.error('Error al anular factura:', error);
    }
  };

  // Formatear moneda
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  if (!isOpen) return null;

  const textoConfirmacion = `ANULAR-${factura?.numero_factura || 'FACTURA'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg mr-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-900">Anular Factura</h2>
              <p className="text-red-700 mt-1">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Información de la factura */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <FileX className="h-5 w-5 mr-2" />
            Información de la Factura a Anular
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Número de Factura:</span>
              <p className="font-bold text-lg text-red-600">{factura?.numero_factura || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Cliente:</span>
              <p className="font-medium">{factura?.nombre_cliente || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Fecha de Emisión:</span>
              <p className="font-medium">{factura?.fecha_emision || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total:</span>
              <p className="font-bold text-lg text-gray-900">
                {formatearMoneda(factura?.total)}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Estado Actual:</span>
              <p className={`font-medium inline-block px-2 py-1 rounded text-sm ${
                factura?.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                factura?.estado === 'vencida' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {factura?.estado === 'pendiente' ? 'Pendiente' :
                 factura?.estado === 'vencida' ? 'Vencida' :
                 factura?.estado || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Período:</span>
              <p className="font-medium">
                {factura?.fecha_desde && factura?.fecha_hasta 
                  ? `${factura.fecha_desde} al ${factura.fecha_hasta}`
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Advertencia */}
        <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Advertencia Importante</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>La anulación de la factura es una acción permanente e irreversible</li>
                  <li>Una vez anulada, la factura no podrá ser modificada ni reactivada</li>
                  <li>Si el cliente ya realizó el pago, deberá gestionarse la devolución por separado</li>
                  <li>Esta acción quedará registrada en el historial del sistema</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Motivo de anulación */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de Anulación *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {motivosPredefinidos.map((motivoPredefinido) => (
                <label
                  key={motivoPredefinido.value}
                  className={`relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    motivo === motivoPredefinido.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={motivoPredefinido.value}
                    checked={motivo === motivoPredefinido.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded-full mr-3 flex items-center justify-center ${
                    motivo === motivoPredefinido.value
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                  }`}>
                    {motivo === motivoPredefinido.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    motivo === motivoPredefinido.value ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {motivoPredefinido.label}
                  </span>
                </label>
              ))}
            </div>
            {errores.motivo && (
              <p className="mt-1 text-sm text-red-600">{errores.motivo}</p>
            )}
          </div>

          {/* Descripción detallada */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción Detallada *
            </label>
            <textarea
              name="motivo_detallado"
              value={motivoDetallado}
              onChange={handleInputChange}
              rows="4"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errores.motivo_detallado ? 'border-red-500' : ''
              }`}
              placeholder={
                motivo === 'otro' 
                  ? 'Especifique el motivo de anulación...'
                  : 'Proporcione una descripción detallada del motivo de anulación...'
              }
            />
            {errores.motivo_detallado && (
              <p className="mt-1 text-sm text-red-600">{errores.motivo_detallado}</p>
            )}
          </div>

          {/* Confirmación de seguridad */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmación de Seguridad *
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Para confirmar la anulación, escriba exactamente el siguiente texto:
            </p>
            <div className="bg-gray-100 p-3 rounded-md mb-2">
              <code className="text-sm font-mono text-red-600 font-bold">
                {textoConfirmacion}
              </code>
            </div>
            <input
              type="text"
              name="confirmacion"
              value={confirmacion}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono ${
                errores.confirmacion ? 'border-red-500' : ''
              }`}
              placeholder="Escriba el texto de confirmación aquí..."
            />
            {errores.confirmacion && (
              <p className="mt-1 text-sm text-red-600">{errores.confirmacion}</p>
            )}
          </div>

          {/* Información de quien anula */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Información de Auditoría</h4>
            <p className="text-sm text-blue-700">
              Esta anulación será registrada con la fecha y hora actual, y quedará asociada a su usuario para fines de auditoría.
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo || !motivoDetallado.trim() || confirmacion !== textoConfirmacion}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Anulando...
                </div>
              ) : (
                'Anular Factura'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnularModal;