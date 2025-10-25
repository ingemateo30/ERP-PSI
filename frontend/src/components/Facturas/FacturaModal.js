// frontend/src/components/Facturas/FacturaModal.js - VERSIÓN CORREGIDA FINAL
import authService from '../../services/authService';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Save, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

const FacturaModal = ({ 
  isOpen, 
  onClose, 
  factura = null,
  modo = 'crear',
  onSuccess 
}) => {
  // Estados
  const [formData, setFormData] = useState({
    numero_factura: '',
    cliente_id: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    periodo_desde: '',
    periodo_hasta: '',
    subtotal: '0',
    impuestos: '0',
    descuentos: '0',
    total: '0',
    observaciones: ''
  });

  const [clienteInfo, setClienteInfo] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [errors, setErrors] = useState({});
  
  const esEdicion = modo === 'editar' || (factura && factura.id);
  const busquedaTimerRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (!isOpen) return;

    if (esEdicion && factura) {
      setFormData({
        numero_factura: factura.numero_factura || '',
        cliente_id: factura.cliente_id || '',
        fecha_emision: factura.fecha_emision || '',
        fecha_vencimiento: factura.fecha_vencimiento || '',
        periodo_desde: factura.periodo_desde || '',
        periodo_hasta: factura.periodo_hasta || '',
        subtotal: String(factura.subtotal || '0'),
        impuestos: String(factura.impuestos || '0'),
        descuentos: String(factura.descuentos || '0'),
        total: String(factura.total || '0'),
        observaciones: factura.observaciones || ''
      });
      setClienteInfo({
        id: factura.cliente_id,
        nombre: factura.nombre_cliente || '',
        identificacion: factura.identificacion_cliente || '',
        telefono: factura.telefono_cliente || ''
      });
      setBusquedaCliente(factura.nombre_cliente || '');
    } else {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVenc = new Date();
      fechaVenc.setDate(fechaVenc.getDate() + 30);
      
      setFormData({
        numero_factura: '',
        cliente_id: '',
        fecha_emision: fechaHoy,
        fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
        periodo_desde: '',
        periodo_hasta: '',
        subtotal: '0',
        impuestos: '0',
        descuentos: '0',
        total: '0',
        observaciones: ''
      });
      setClienteInfo(null);
      setBusquedaCliente('');
      generarNumeroFactura();
    }
    setErrors({});
  }, [isOpen, esEdicion, factura]);

  // Generar número de factura
  const generarNumeroFactura = async () => {
    if (esEdicion) return;
    try {
      const response = await fetch('http://45.173.69.5:3000/api/v1/facturas/generar-numero', {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.numero_factura) {
          setFormData(prev => ({
            ...prev,
            numero_factura: data.data.numero_factura
          }));
        }
      }
    } catch (error) {
      console.error('Error generando número:', error);
    }
  };

  // Búsqueda de clientes con debounce
  const buscarClientes = async (termino) => {
    if (!termino || termino.length < 3) {
      setClientesEncontrados([]);
      setMostrarBusqueda(false);
      return;
    }

    try {
      setLoadingClientes(true);
      const response = await fetch(`http://45.173.69.5:3000/api/v1/clientes/search?q=${encodeURIComponent(termino)}`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const clientes = data.data || data.clientes || [];
        setClientesEncontrados(clientes);
        setMostrarBusqueda(clientes.length > 0);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
      setClientesEncontrados([]);
      setMostrarBusqueda(false);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Handler de búsqueda con debounce
  const handleBusquedaChange = (valor) => {
    setBusquedaCliente(valor);
    
    if (busquedaTimerRef.current) {
      clearTimeout(busquedaTimerRef.current);
    }
    
    if (valor.length >= 3) {
      busquedaTimerRef.current = setTimeout(() => {
        buscarClientes(valor);
      }, 500);
    } else {
      setMostrarBusqueda(false);
    }
  };

  // Seleccionar cliente
  const seleccionarCliente = (cliente) => {
    setClienteInfo(cliente);
    setBusquedaCliente(cliente.nombre);
    setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
    setMostrarBusqueda(false);
    setErrors(prev => ({ ...prev, cliente_id: null }));
  };

  // Handler de cambio de inputs
  const handleChange = (campo, valor) => {
    setFormData(prev => {
      const newData = { ...prev, [campo]: valor };
      
      // Recalcular total si cambian campos numéricos
      if (['subtotal', 'impuestos', 'descuentos'].includes(campo)) {
        const subtotal = parseFloat(newData.subtotal) || 0;
        const impuestos = parseFloat(newData.impuestos) || 0;
        const descuentos = parseFloat(newData.descuentos) || 0;
        newData.total = String(subtotal + impuestos - descuentos);
      }
      
      return newData;
    });
    
    // Limpiar error del campo
    if (errors[campo]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[campo];
        return newErrors;
      });
    }
  };

  // Validar formulario
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.numero_factura.trim()) {
      nuevosErrores.numero_factura = 'Número de factura requerido';
    }
    if (!formData.cliente_id) {
      nuevosErrores.cliente_id = 'Debe seleccionar un cliente';
    }
    if (!formData.fecha_emision) {
      nuevosErrores.fecha_emision = 'Fecha de emisión requerida';
    }
    if (!formData.fecha_vencimiento) {
      nuevosErrores.fecha_vencimiento = 'Fecha de vencimiento requerida';
    }
    if (formData.fecha_emision && formData.fecha_vencimiento) {
      if (new Date(formData.fecha_vencimiento) <= new Date(formData.fecha_emision)) {
        nuevosErrores.fecha_vencimiento = 'Fecha de vencimiento debe ser posterior a emisión';
      }
    }
    const total = parseFloat(formData.total) || 0;
    if (total <= 0) {
      nuevosErrores.total = 'El total debe ser mayor a 0';
    }
    
    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Guardar factura
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📋 Validando formulario...', formData);
    
    if (!validarFormulario()) {
      console.warn('⚠️ Formulario inválido:', errors);
      return;
    }

    setLoading(true);

    try {
      const datosParaEnvio = {
        numero_factura: formData.numero_factura.trim(),
        cliente_id: parseInt(formData.cliente_id),
        periodo_facturacion: formData.fecha_emision.substring(0, 7),
        fecha_emision: formData.fecha_emision,
        fecha_vencimiento: formData.fecha_vencimiento,
        fecha_desde: formData.periodo_desde || null,
        fecha_hasta: formData.periodo_hasta || null,
        subtotal: parseFloat(formData.subtotal) || 0,
        impuestos: parseFloat(formData.impuestos) || 0,
        descuentos: parseFloat(formData.descuentos) || 0,
        total: parseFloat(formData.total) || 0,
        observaciones: formData.observaciones.trim(),
        items: []
      };

      console.log('💾 Guardando factura:', datosParaEnvio);

      const url = esEdicion 
        ? `http://45.173.69.5:3000/api/v1/facturas/${factura.id}`
        : 'http://45.173.69.5:3000/api/v1/facturas';
      
      const response = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosParaEnvio)
      });

      const resultado = await response.json();

      if (response.ok && resultado.success) {
        console.log('✅ Factura guardada:', resultado);
        if (onSuccess) onSuccess(resultado.data);
        handleClose();
      } else {
        throw new Error(resultado.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('❌ Error guardando:', error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Cerrar modal
  const handleClose = () => {
    if (loading) return;
    setFormData({
      numero_factura: '',
      cliente_id: '',
      fecha_emision: '',
      fecha_vencimiento: '',
      periodo_desde: '',
      periodo_hasta: '',
      subtotal: '0',
      impuestos: '0',
      descuentos: '0',
      total: '0',
      observaciones: ''
    });
    setClienteInfo(null);
    setBusquedaCliente('');
    setErrors({});
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              {esEdicion ? 'Editar Factura' : 'Nueva Factura'}
            </h2>
          </div>
          <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-gray-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded p-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{errors.general}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Número Factura */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Número de Factura <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.numero_factura}
                  onChange={(e) => handleChange('numero_factura', e.target.value)}
                  disabled={esEdicion}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {errors.numero_factura && (
                  <p className="text-sm text-red-600 mt-1">{errors.numero_factura}</p>
                )}
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => handleBusquedaChange(e.target.value)}
                    disabled={esEdicion}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="Buscar cliente..."
                  />
                  <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  
                  {mostrarBusqueda && clientesEncontrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                      {clientesEncontrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => seleccionarCliente(cliente)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b"
                        >
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {clienteInfo && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center text-blue-800">
                      <User className="w-4 h-4 mr-2" />
                      <span className="font-medium">{clienteInfo.nombre}</span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      ID: {clienteInfo.identificacion} | Tel: {clienteInfo.telefono}
                    </div>
                  </div>
                )}
                {errors.cliente_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.cliente_id}</p>
                )}
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Emisión <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => handleChange('fecha_emision', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                {errors.fecha_emision && (
                  <p className="text-sm text-red-600 mt-1">{errors.fecha_emision}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Vencimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleChange('fecha_vencimiento', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                {errors.fecha_vencimiento && (
                  <p className="text-sm text-red-600 mt-1">{errors.fecha_vencimiento}</p>
                )}
              </div>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Período Desde</label>
                <input
                  type="date"
                  value={formData.periodo_desde}
                  onChange={(e) => handleChange('periodo_desde', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Período Hasta</label>
                <input
                  type="date"
                  value={formData.periodo_hasta}
                  onChange={(e) => handleChange('periodo_hasta', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.subtotal}
                  onChange={(e) => handleChange('subtotal', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Impuestos</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.impuestos}
                  onChange={(e) => handleChange('impuestos', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descuentos</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.descuentos}
                  onChange={(e) => handleChange('descuentos', e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-50 p-4 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total de la Factura:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${parseFloat(formData.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium mb-1">Observaciones</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {esEdicion ? 'Actualizar' : 'Crear Factura'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacturaModal;