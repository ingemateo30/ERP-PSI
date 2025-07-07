// components/Facturas/PagoModal.js - Corregido
import React, { useState, useEffect } from 'react';
import { METODOS_PAGO } from '../../hooks/useFacturacionManual';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

const PagoModal = ({ isOpen, onClose, onConfirmar, factura, loading, error }) => {
  const [datosPago, setDatosPago] = useState({
    valor_pagado: '',
    metodo_pago: 'efectivo',
    fecha_pago: new Date().toISOString().split('T')[0],
    referencia_pago: '',
    observaciones: '',
    banco: '',
    numero_cheque: '',
    numero_autorizacion: ''
  });

  const [errores, setErrores] = useState({});
  const [pagoCompleto, setPagoCompleto] = useState(true);

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && factura) {
      const valorTotal = parseFloat(factura.total || 0);
      setDatosPago({
        valor_pagado: valorTotal.toString(),
        metodo_pago: 'efectivo',
        fecha_pago: new Date().toISOString().split('T')[0],
        referencia_pago: '',
        observaciones: '',
        banco: '',
        numero_cheque: '',
        numero_autorizacion: ''
      });
      setPagoCompleto(true);
      setErrores({});
    }
  }, [isOpen, factura]);

  // Manejar cambios en los campos
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDatosPago(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo
    if (errores[name]) {
      setErrores(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // Verificar si es pago completo
    if (name === 'valor_pagado') {
      const valorPago = parseFloat(value || 0);
      const valorTotal = parseFloat(factura?.total || 0);
      setPagoCompleto(valorPago >= valorTotal);
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    // Validar valor pagado
    const valorPago = parseFloat(datosPago.valor_pagado || 0);
    const valorTotal = parseFloat(factura?.total || 0);
    
    if (!datosPago.valor_pagado || valorPago <= 0) {
      nuevosErrores.valor_pagado = 'El valor del pago es requerido y debe ser mayor a 0';
    } else if (valorPago > valorTotal) {
      nuevosErrores.valor_pagado = 'El valor del pago no puede ser mayor al total de la factura';
    }
    
    // Validar fecha de pago
    if (!datosPago.fecha_pago) {
      nuevosErrores.fecha_pago = 'La fecha de pago es requerida';
    } else {
      const fechaPago = new Date(datosPago.fecha_pago);
      const fechaFactura = new Date(factura?.fecha_emision || new Date());
      
      if (fechaPago < fechaFactura) {
        nuevosErrores.fecha_pago = 'La fecha de pago no puede ser anterior a la fecha de emisión de la factura';
      }
    }
    
    // Validaciones específicas por método de pago
    switch (datosPago.metodo_pago) {
      case 'transferencia':
      case 'pse':
        if (!datosPago.referencia_pago) {
          nuevosErrores.referencia_pago = 'La referencia de pago es requerida para transferencias';
        }
        if (!datosPago.banco) {
          nuevosErrores.banco = 'El banco es requerido para transferencias';
        }
        break;
      case 'tarjeta':
        if (!datosPago.numero_autorizacion) {
          nuevosErrores.numero_autorizacion = 'El número de autorización es requerido para pagos con tarjeta';
        }
        break;
      case 'cheque':
        if (!datosPago.numero_cheque) {
          nuevosErrores.numero_cheque = 'El número de cheque es requerido';
        }
        if (!datosPago.banco) {
          nuevosErrores.banco = 'El banco emisor es requerido para cheques';
        }
        break;
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
    
    // Preparar datos para envío
    const datosParaEnvio = {
      ...datosPago,
      valor_pagado: parseFloat(datosPago.valor_pagado),
      pago_completo: pagoCompleto
    };
    
    try {
      await onConfirmar(datosParaEnvio);
    } catch (error) {
      console.error('Error al procesar pago:', error);
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

  // Opciones de métodos de pago
  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo', icon: DollarSign },
    { value: 'transferencia', label: 'Transferencia Bancaria', icon: CreditCard },
    { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito', icon: CreditCard },
    { value: 'cheque', label: 'Cheque', icon: FileText },
    { value: 'pse', label: 'PSE', icon: CreditCard },
    { value: 'otro', label: 'Otro', icon: DollarSign }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registrar Pago</h2>
            <p className="text-gray-600 mt-1">
              Factura #{factura?.numero_factura || 'N/A'} - {factura?.nombre_cliente}
            </p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Información de la Factura</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600">Número de Factura:</span>
              <p className="font-medium">{factura?.numero_factura || 'N/A'}</p>
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
              <span className="text-sm text-gray-600">Total a Pagar:</span>
              <p className="font-bold text-lg text-blue-600">
                {formatearMoneda(factura?.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de pago */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valor del pago */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor del Pago *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  name="valor_pagado"
                  value={datosPago.valor_pagado}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.valor_pagado ? 'border-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errores.valor_pagado && (
                <p className="mt-1 text-sm text-red-600">{errores.valor_pagado}</p>
              )}
              {!pagoCompleto && (
                <p className="mt-1 text-sm text-yellow-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Pago parcial - Quedará saldo pendiente
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metodosPago.map((metodo) => {
                  const IconComponent = metodo.icon;
                  return (
                    <label
                      key={metodo.value}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        datosPago.metodo_pago === metodo.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="metodo_pago"
                        value={metodo.value}
                        checked={datosPago.metodo_pago === metodo.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <IconComponent className={`h-5 w-5 mr-2 ${
                        datosPago.metodo_pago === metodo.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        datosPago.metodo_pago === metodo.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {metodo.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Fecha de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Pago *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  name="fecha_pago"
                  value={datosPago.fecha_pago}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.fecha_pago ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {errores.fecha_pago && (
                <p className="mt-1 text-sm text-red-600">{errores.fecha_pago}</p>
              )}
            </div>

            {/* Campos específicos según método de pago */}
            {(datosPago.metodo_pago === 'transferencia' || datosPago.metodo_pago === 'pse') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco *
                  </label>
                  <input
                    type="text"
                    name="banco"
                    value={datosPago.banco}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.banco ? 'border-red-500' : ''
                    }`}
                    placeholder="Nombre del banco"
                  />
                  {errores.banco && (
                    <p className="mt-1 text-sm text-red-600">{errores.banco}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia de Pago *
                  </label>
                  <input
                    type="text"
                    name="referencia_pago"
                    value={datosPago.referencia_pago}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.referencia_pago ? 'border-red-500' : ''
                    }`}
                    placeholder="Número de referencia o comprobante"
                  />
                  {errores.referencia_pago && (
                    <p className="mt-1 text-sm text-red-600">{errores.referencia_pago}</p>
                  )}
                </div>
              </>
            )}

            {datosPago.metodo_pago === 'tarjeta' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Autorización *
                </label>
                <input
                  type="text"
                  name="numero_autorizacion"
                  value={datosPago.numero_autorizacion}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errores.numero_autorizacion ? 'border-red-500' : ''
                  }`}
                  placeholder="Código de autorización"
                />
                {errores.numero_autorizacion && (
                  <p className="mt-1 text-sm text-red-600">{errores.numero_autorizacion}</p>
                )}
              </div>
            )}

            {datosPago.metodo_pago === 'cheque' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Cheque *
                  </label>
                  <input
                    type="text"
                    name="numero_cheque"
                    value={datosPago.numero_cheque}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.numero_cheque ? 'border-red-500' : ''
                    }`}
                    placeholder="Número del cheque"
                  />
                  {errores.numero_cheque && (
                    <p className="mt-1 text-sm text-red-600">{errores.numero_cheque}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco Emisor *
                  </label>
                  <input
                    type="text"
                    name="banco"
                    value={datosPago.banco}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errores.banco ? 'border-red-500' : ''
                    }`}
                    placeholder="Banco emisor del cheque"
                  />
                  {errores.banco && (
                    <p className="mt-1 text-sm text-red-600">{errores.banco}</p>
                  )}
                </div>
              </>
            )}

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={datosPago.observaciones}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Observaciones adicionales sobre el pago..."
              />
            </div>
          </div>

          {/* Resumen del pago */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Resumen del Pago</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-blue-700">Total de la Factura:</span>
                <p className="font-bold text-blue-900">{formatearMoneda(factura?.total)}</p>
              </div>
              <div>
                <span className="text-sm text-blue-700">Valor a Pagar:</span>
                <p className="font-bold text-blue-900">{formatearMoneda(datosPago.valor_pagado)}</p>
              </div>
              <div>
                <span className="text-sm text-blue-700">Saldo Restante:</span>
                <p className="font-bold text-blue-900">
                  {formatearMoneda(Math.max(0, (factura?.total || 0) - (parseFloat(datosPago.valor_pagado) || 0)))}
                </p>
              </div>
              <div>
                <span className="text-sm text-blue-700">Estado Final:</span>
                <p className="font-bold text-blue-900">
                  {pagoCompleto ? 'Pagada' : 'Pago Parcial'}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 mt-6">
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
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </div>
              ) : (
                'Registrar Pago'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PagoModal;