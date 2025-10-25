// frontend/src/components/Facturas/FacturaModal.js - COMPLETAMENTE CORREGIDO
import authService from '../../services/authService';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  factura = null, // Factura para editar (null para crear nueva)
  modo = 'crear', // 'crear' o 'editar'
  onSuccess 
}) => {
  // ==========================================
  // ESTADOS DEL FORMULARIO
  // ==========================================
  const [formData, setFormData] = useState({
    numero_factura: '',
    cliente_id: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    periodo_desde: '',
    periodo_hasta: '',
    subtotal: '',
    impuestos: '',
    descuentos: '',
    total: '',
    observaciones: '',
    items: []
  });

  const [clienteInfo, setClienteInfo] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // ==========================================
  // DETECTAR MODO DE OPERACIÓN
  // ==========================================
  const esEdicion = useMemo(() => {
    return modo === 'editar' || (factura && factura.id);
  }, [modo, factura]);

  // ==========================================
  // CARGAR DATOS INICIALES
  // ==========================================
  useEffect(() => {
    if (!isOpen) return;

    console.log('🔄 [FacturaModal] Inicializando modal:', { esEdicion, factura });

    if (esEdicion && factura) {
      // MODO EDICIÓN: Cargar datos de la factura existente
      console.log('✏️ [FacturaModal] Cargando datos para edición:', factura);
      
      setFormData({
        numero_factura: factura.numero_factura || '',
        cliente_id: factura.cliente_id || '',
        fecha_emision: factura.fecha_emision || '',
        fecha_vencimiento: factura.fecha_vencimiento || '',
        periodo_desde: factura.periodo_desde || '',
        periodo_hasta: factura.periodo_hasta || '',
        subtotal: factura.subtotal || '',
        impuestos: factura.impuestos || '',
        descuentos: factura.descuentos || '',
        total: factura.total || '',
        observaciones: factura.observaciones || '',
        items: factura.items || []
      });

      // Configurar información del cliente
      setClienteInfo({
        id: factura.cliente_id,
        nombre: factura.nombre_cliente || '',
        identificacion: factura.identificacion_cliente || '',
        direccion: factura.direccion_cliente || '',
        telefono: factura.telefono_cliente || '',
        email: factura.email_cliente || ''
      });

      setBusquedaCliente(factura.nombre_cliente || '');
      
    } else {
      // MODO CREACIÓN: Formulario limpio con valores por defecto
      console.log('➕ [FacturaModal] Inicializando para creación');
      
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      
      setFormData({
        numero_factura: '',
        cliente_id: '',
        fecha_emision: fechaHoy,
        fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
        periodo_desde: '',
        periodo_hasta: '',
        subtotal: '0',
        impuestos: '0',
        descuentos: '0',
        total: '0',
        observaciones: '',
        items: [{
          concepto_id: '',
          descripcion: '',
          cantidad: 1,
          precio_unitario: 0
        }]
      });

      setClienteInfo(null);
      setBusquedaCliente('');
      
      // Generar número de factura automáticamente
      generarNumeroFactura();
    }

    // Limpiar errores
    setErrors({});
    setTouched({});
    
  }, [isOpen, esEdicion, factura]);

  // ==========================================
  // GENERAR NÚMERO DE FACTURA
  // ==========================================
  const generarNumeroFactura = useCallback(async () => {
  if (esEdicion) return; // No generar nuevo número en edición
  
  try {
    console.log('🔢 [FacturaModal] Generando número de factura...');
    
    const response = await fetch('http://45.173.69.5:3000/api/v1/facturas/generar-numero', {
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json'
  }
});
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [FacturaModal] Respuesta recibida:', data);
      
      if (data.success && data.data?.numero_factura) {
        console.log('✅ [FacturaModal] Número generado:', data.data.numero_factura);
        setFormData(prev => ({
          ...prev,
          numero_factura: data.data.numero_factura
        }));
      }
    } else {
      console.error('❌ [FacturaModal] Error en respuesta:', response.status);
    }
  } catch (error) {
    console.error('❌ [FacturaModal] Error generando número:', error);
  }
}, [esEdicion]);
  // ==========================================
  // BÚSQUEDA DE CLIENTES
  // ==========================================
  const buscarClientes = useCallback(async (termino) => {
    if (!termino || termino.length < 2) {
      setClientesEncontrados([]);
      setMostrarBusqueda(false);
      return;
    }

    try {
      setLoadingClientes(true);
      
      const response = await fetch(`http://45.173.69.5:3000/api/v1/clients/search?q=${encodeURIComponent(termino)}`, {
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
      console.error('❌ [FacturaModal] Error buscando clientes:', error);
      setClientesEncontrados([]);
      setMostrarBusqueda(false);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  // Debounce para búsqueda de clientes
useEffect(() => {
  if (!esEdicion && busquedaCliente && busquedaCliente.trim().length >= 3) {
    const timer = setTimeout(() => {
      buscarClientes(busquedaCliente);
    }, 500);

    return () => clearTimeout(timer);
  }
}, [busquedaCliente, esEdicion]);
  // ==========================================
  // MANEJO DE FORMULARIO
  // ==========================================
 const handleInputChange = useCallback((campo, valor) => {
  setFormData(prev => {
    const newData = {
      ...prev,
      [campo]: valor
    };
    
    // Recalcular totales inmediatamente si es un campo numérico
    if (['subtotal', 'impuestos', 'descuentos'].includes(campo)) {
      const subtotal = parseFloat(newData.subtotal) || 0;
      const impuestos = parseFloat(newData.impuestos) || 0;
      const descuentos = parseFloat(newData.descuentos) || 0;
      newData.total = (subtotal + impuestos - descuentos).toString();
    }
    
    return newData;
  });

  // Marcar campo como tocado
  setTouched(prev => ({
    ...prev,
    [campo]: true
  }));

  // Limpiar error si existe
// Limpiar error si existe
setErrors(prev => {
  if (prev[campo]) {
    const newErrors = { ...prev };
    delete newErrors[campo];
    return newErrors;
  }
  return prev;
});
}, []); // Sin dependencias para evitar re-renders// Sin dependencias para evitar re-renders
  const seleccionarCliente = useCallback((cliente) => {
    console.log('👤 [FacturaModal] Cliente seleccionado:', cliente);
    
    setClienteInfo(cliente);
    setBusquedaCliente(cliente.nombre);
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id
    }));
    setMostrarBusqueda(false);
    
    // Limpiar error de cliente
    if (errors.cliente_id) {
      setErrors(prev => ({
        ...prev,
        cliente_id: null
      }));
    }
  }, [errors.cliente_id]);

  // ==========================================
  // CÁLCULO DE TOTALES
  // ==========================================
  const recalcularTotales = useCallback(() => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const impuestos = parseFloat(formData.impuestos) || 0;
    const descuentos = parseFloat(formData.descuentos) || 0;
    
    const total = subtotal + impuestos - descuentos;
    
    setFormData(prev => ({
      ...prev,
      total: total.toString()
    }));
  }, [formData.subtotal, formData.impuestos, formData.descuentos]);

  // ==========================================
  // VALIDACIONES
  // ==========================================
  const validarFormulario = useCallback(() => {
    const nuevosErrores = {};

    // Validaciones básicas
    if (!formData.numero_factura.trim()) {
      nuevosErrores.numero_factura = 'Número de factura es requerido';
    }

    if (!formData.cliente_id) {
      nuevosErrores.cliente_id = 'Debe seleccionar un cliente';
    }

    if (!formData.fecha_emision) {
      nuevosErrores.fecha_emision = 'Fecha de emisión es requerida';
    }

    if (!formData.fecha_vencimiento) {
      nuevosErrores.fecha_vencimiento = 'Fecha de vencimiento es requerida';
    }

    // Validar que fecha de vencimiento sea posterior a emisión
    if (formData.fecha_emision && formData.fecha_vencimiento) {
      if (new Date(formData.fecha_vencimiento) <= new Date(formData.fecha_emision)) {
        nuevosErrores.fecha_vencimiento = 'Fecha de vencimiento debe ser posterior a la emisión';
      }
    }

    // Validar totales
    const total = parseFloat(formData.total) || 0;
    if (total <= 0) {
      nuevosErrores.total = 'El total debe ser mayor a 0';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [formData]);

  // ==========================================
  // GUARDAR FACTURA
  // ==========================================
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      console.warn('⚠️ [FacturaModal] Formulario con errores:', errors);
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para envío
      const datosParaEnvio = {
  numero_factura: formData.numero_factura.trim(),
  cliente_id: parseInt(formData.cliente_id),
  periodo_facturacion: formData.fecha_emision ? formData.fecha_emision.substring(0, 7) : new Date().toISOString().substring(0, 7), // YYYY-MM
  fecha_emision: formData.fecha_emision,
  fecha_vencimiento: formData.fecha_vencimiento,
  fecha_desde: formData.periodo_desde || null,
  fecha_hasta: formData.periodo_hasta || null,
  subtotal: parseFloat(formData.subtotal) || 0,
  impuestos: parseFloat(formData.impuestos) || 0,
  descuentos: parseFloat(formData.descuentos) || 0,
  total: parseFloat(formData.total) || 0,
  observaciones: formData.observaciones.trim(),
  items: formData.items.filter(item => 
    item.descripcion && item.cantidad > 0 && item.precio_unitario > 0
  )
};

      console.log('💾 [FacturaModal] Guardando factura:', { esEdicion, datos: datosParaEnvio });

      let response;
      
      if (esEdicion) {
        // ACTUALIZAR FACTURA EXISTENTE
        response = await fetch(`http://45.173.69.5:3000/api/v1/facturas/${factura.id}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(datosParaEnvio)
});
      } else {
        // CREAR NUEVA FACTURA
        response = await fetch('http://45.173.69.5:3000/api/v1/facturas', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(datosParaEnvio)
});
      }

      const resultado = await response.json();

      if (response.ok && resultado.success) {
        console.log('✅ [FacturaModal] Factura guardada exitosamente:', resultado);
        
        if (onSuccess) {
          onSuccess(resultado.data);
        }
        
        handleClose();
      } else {
        throw new Error(resultado.message || 'Error al guardar la factura');
      }

    } catch (error) {
      console.error('❌ [FacturaModal] Error guardando factura:', error);
      setErrors({ 
        general: error.message || 'Error al guardar la factura' 
      });
    } finally {
      setLoading(false);
    }
  }, [formData, esEdicion, factura, validarFormulario, onSuccess]);

  // ==========================================
  // CERRAR MODAL
  // ==========================================
  const handleClose = useCallback(() => {
    if (loading) return; // No cerrar si está guardando
    
    setFormData({
      numero_factura: '',
      cliente_id: '',
      fecha_emision: '',
      fecha_vencimiento: '',
      periodo_desde: '',
      periodo_hasta: '',
      subtotal: '',
      impuestos: '',
      descuentos: '',
      total: '',
      observaciones: '',
      items: []
    });
    
    setClienteInfo(null);
    setBusquedaCliente('');
    setClientesEncontrados([]);
    setMostrarBusqueda(false);
    setErrors({});
    setTouched({});
    
    if (onClose) {
      onClose();
    }
  }, [loading, onClose]);

  // ==========================================
  // COMPONENTE DE CAMPO CON ERROR
  // ==========================================
  const CampoConError = ({ label, error, children, required = false }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );

  // ==========================================
  // RENDER
  // ==========================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              {esEdicion ? 'Editar Factura' : 'Nueva Factura'}
            </h2>
            <p className="text-gray-600 mt-1">
              {esEdicion 
                ? `Modificando factura ${factura?.numero_factura || ''}`
                : 'Crear una nueva factura para el cliente'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido del formulario */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error general */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-800">{errors.general}</span>
                </div>
              </div>
            )}

            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Número de factura */}
              <CampoConError 
                label="Número de Factura" 
                error={errors.numero_factura}
                required
              >
                <input
                  type="text"
                  value={formData.numero_factura}
                  onChange={(e) => handleInputChange('numero_factura', e.target.value)}
                  disabled={esEdicion} // No editable en modo edición
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="F000001"
                />
              </CampoConError>

              {/* Búsqueda de cliente */}
              <CampoConError 
                label="Cliente" 
                error={errors.cliente_id}
                required
              >
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    disabled={esEdicion} // No editable en modo edición
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Buscar cliente por nombre o identificación..."
                  />
                  <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  
                  {/* Loading de búsqueda */}
                  {loadingClientes && (
                    <div className="absolute right-10 top-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                  
                  {/* Resultados de búsqueda */}
                  {mostrarBusqueda && clientesEncontrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {clientesEncontrados.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => seleccionarCliente(cliente)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Información del cliente seleccionado */}
                {clienteInfo && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-800">
                      <User className="w-4 h-4 mr-2" />
                      <span className="font-medium">{clienteInfo.nombre}</span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      ID: {clienteInfo.identificacion} | Tel: {clienteInfo.telefono}
                    </div>
                  </div>
                )}
              </CampoConError>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CampoConError 
                label="Fecha de Emisión" 
                error={errors.fecha_emision}
                required
              >
                <input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => handleInputChange('fecha_emision', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </CampoConError>

              <CampoConError 
                label="Fecha de Vencimiento" 
                error={errors.fecha_vencimiento}
                required
              >
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleInputChange('fecha_vencimiento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </CampoConError>
            </div>

            {/* Período de facturación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CampoConError label="Período Desde" error={errors.periodo_desde}>
                <input
                  type="date"
                  value={formData.periodo_desde}
                  onChange={(e) => handleInputChange('periodo_desde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </CampoConError>

              <CampoConError label="Período Hasta" error={errors.periodo_hasta}>
                <input
                  type="date"
                  value={formData.periodo_hasta}
                  onChange={(e) => handleInputChange('periodo_hasta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </CampoConError>
            </div>

            {/* Valores financieros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CampoConError label="Subtotal" error={errors.subtotal}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.subtotal}
                    onChange={(e) => handleInputChange('subtotal', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </CampoConError>

              <CampoConError label="Impuestos" error={errors.impuestos}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.impuestos}
                    onChange={(e) => handleInputChange('impuestos', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </CampoConError>

              <CampoConError label="Descuentos" error={errors.descuentos}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descuentos}
                    onChange={(e) => handleInputChange('descuentos', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </CampoConError>
            </div>

            {/* Total calculado */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total de la Factura:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${parseFloat(formData.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <CampoConError label="Observaciones" error={errors.observaciones}>
              <textarea
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observaciones adicionales para la factura..."
              />
            </CampoConError>
          </form>
        </div>

        {/* Footer con botones */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {esEdicion ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {esEdicion ? 'Actualizar Factura' : 'Crear Factura'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overlay para cerrar búsqueda */}
      {mostrarBusqueda && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setMostrarBusqueda(false)}
        />
      )}
    </div>
  );
};

export default FacturaModal;