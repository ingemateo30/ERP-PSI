// components/Facturas/AnularModal.js - Modal para anular facturas
import React, { useState, useCallback } from 'react';

const AnularModal = ({ 
  isOpen, 
  onClose, 
  onConfirmar, 
  factura, 
  loading = false, 
  error = null 
}) => {
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState('');

  // Validar motivo
  const validarMotivo = useCallback((valor) => {
    if (!valor || valor.trim().length === 0) {
      return 'El motivo de anulación es requerido';
    }
    if (valor.trim().length < 10) {
      return 'El motivo debe tener al menos 10 caracteres';
    }
    if (valor.trim().length > 500) {
      return 'El motivo no puede exceder 500 caracteres';
    }
    return '';
  }, []);

  // Manejar cambio de motivo
  const handleMotivoChange = useCallback((e) => {
    const valor = e.target.value;
    setMotivo(valor);
    
    const errorValidacion = validarMotivo(valor);
    setMotivoError(errorValidacion);
  }, [validarMotivo]);

  // Manejar confirmación
  const handleConfirmar = useCallback((e) => {
    e.preventDefault();
    
    const errorValidacion = validarMotivo(motivo);
    if (errorValidacion) {
      setMotivoError(errorValidacion);
      return;
    }

    onConfirmar(motivo.trim());
  }, [motivo, validarMotivo, onConfirmar]);

  // Manejar cierre
  const handleClose = useCallback(() => {
    if (!loading) {
      setMotivo('');
      setMotivoError('');
      onClose();
    }
  }, [loading, onClose]);

  // Manejar tecla Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && !loading) {
      handleClose();
    }
  }, [handleClose, loading]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🚫</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-900">
                  Anular Factura
                </h3>
                <p className="text-sm text-red-600">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors disabled:opacity-50"
            >
              <span className="sr-only">Cerrar</span>
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <form onSubmit={handleConfirmar} className="p-6">
          {/* Información de la factura */}
          {factura && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Información de la Factura:
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Número:</span>
                  <span className="ml-2 font-medium">{factura.numero_factura}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <span className="ml-2 font-medium">{factura.nombre_cliente}</span>
                </div>
                <div>
                  <span className="text-gray-500">Valor:</span>
                  <span className="ml-2 font-medium">
                    ${factura.total?.toLocaleString('es-CO') || '0'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    factura.estado === 'pendiente' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : factura.estado === 'pagada'
                      ? 'bg-green-100 text-green-800'
                      : factura.estado === 'vencida'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {factura.estado?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advertencia */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Importante
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Una vez anulada, la factura no podrá ser modificada ni utilizada para pagos. 
                  Esta acción es permanente y quedará registrada en el sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Campo de motivo */}
          <div className="mb-6">
            <label 
              htmlFor="motivo" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Motivo de Anulación <span className="text-red-500">*</span>
            </label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={handleMotivoChange}
              placeholder="Describe detalladamente el motivo de la anulación (mínimo 10 caracteres)..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${
                motivoError 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              disabled={loading}
              maxLength={500}
              required
            />
            
            {/* Contador de caracteres */}
            <div className="flex justify-between items-center mt-1">
              <div>
                {motivoError && (
                  <p className="text-sm text-red-600">
                    {motivoError}
                  </p>
                )}
              </div>
              <div className={`text-xs ${
                motivo.length < 10 
                  ? 'text-red-500' 
                  : motivo.length > 450 
                  ? 'text-yellow-600' 
                  : 'text-gray-500'
              }`}>
                {motivo.length}/500 caracteres
                {motivo.length < 10 && (
                  <span className="ml-1">(mínimo 10)</span>
                )}
              </div>
            </div>
          </div>

          {/* Error del servidor */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-500">❌</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!motivoError || motivo.trim().length < 10}
              className={`px-6 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                loading || !!motivoError || motivo.trim().length < 10
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Anulando...
                </div>
              ) : (
                '🚫 Anular Factura'
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <p>📝 <strong>Nota:</strong> El motivo de anulación será registrado permanentemente y será visible en el historial de la factura.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnularModal;