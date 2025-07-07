// components/Facturas/FacturaModal.js - Corregido
import React, { useState, useEffect } from 'react';
import { useFacturasAcciones, useFormularioFactura, useFacturasUtilidades } from '../../hooks/useFacturacionManual';
import clientService from '../../services/clientService';
import FacturasService from '../../services/facturacionManualService';

const FacturaModal = ({ isOpen, isEditing, factura, onClose, onSuccess }) => {
  const { crearFactura, actualizarFactura, loading, error, clearError } = useFacturasAcciones();
  const { generarNumero } = useFacturasUtilidades();

  const [formData, setFormData] = useState({
    cliente_id: '',
    periodo_facturacion: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    fecha_desde: '',
    fecha_hasta: '',
    internet: 0,
    television: 0,
    saldo_anterior: 0,
    interes: 0,
    reconexion: 0,
    descuento: 0,
    varios: 0,
    publicidad: 0,
    ruta: '',
    observaciones: ''
  });

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [errors, setErrors] = useState({});
  const [calculandoTotal, setCalculandoTotal] = useState(false);

  // Inicializar formulario
  useEffect(() => {
    if (isOpen) {
      if (isEditing && factura) {
        // Cargar datos de la factura existente
        setFormData({
          cliente_id: factura.cliente_id || '',
          periodo_facturacion: factura.periodo_facturacion || '',
          fecha_emision: factura.fecha_emision || new Date().toISOString().split('T')[0],
          fecha_vencimiento: factura.fecha_vencimiento || '',
          fecha_desde: factura.fecha_desde || '',
          fecha_hasta: factura.fecha_hasta || '',
          internet: factura.internet || 0,
          television: factura.television || 0,
          saldo_anterior: factura.saldo_anterior || 0,
          interes: factura.interes || 0,
          reconexion: factura.reconexion || 0,
          descuento: factura.descuento || 0,
          varios: factura.varios || 0,
          publicidad: factura.publicidad || 0,
          ruta: factura.ruta || '',
          observaciones: factura.observaciones || ''
        });
        setBusquedaCliente(factura.nombre_cliente || '');
        setClienteSeleccionado({
          id: factura.cliente_id,
          nombre: factura.nombre_cliente
        });
      } else {
        // Generar número de factura para nueva factura
        generarNumeroFactura();
        
        // Formulario limpio para nueva factura
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        setFormData({
          cliente_id: '',
          periodo_facturacion: '',
          fecha_emision: new Date().toISOString().split('T')[0],
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          fecha_desde: '',
          fecha_hasta: '',
          internet: 0,
          television: 0,
          saldo_anterior: 0,
          interes: 0,
          reconexion: 0,
          descuento: 0,
          varios: 0,
          publicidad: 0,
          ruta: '',
          observaciones: ''
        });
        setBusquedaCliente('');
        setClienteSeleccionado(null);
      }
      setErrors({});
      clearError();
    }
  }, [isOpen, isEditing, factura, clearError]);

  // Generar número de factura automáticamente
  const generarNumeroFactura = async () => {
    try {
      const numero = await generarNumero();
      if (numero) {
        setFormData(prev => ({ ...prev, numero_factura: numero }));
      }
    } catch (error) {
      console.error('Error generando número de factura:', error);
    }
  };

  // Buscar clientes
  const buscarClientes = async (termino) => {
    if (termino.length < 2) {
      setClientes([]);
      return;
    }

    try {
      const response = await clientService.buscarClientes(termino);
      setClientes(response.data || []);
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      setClientes([]);
    }
  };

  // Manejar búsqueda de cliente
  const handleBusquedaCliente = (e) => {
    const valor = e.target.value;
    setBusquedaCliente(valor);
    setMostrarListaClientes(true);
    
    if (valor.length >= 2) {
      buscarClientes(valor);
    } else {
      setClientes([]);
    }
  };

  // Seleccionar cliente
  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente.nombre);
    setFormData(prev => ({ ...prev, cliente_id: cliente.id }));
    setMostrarListaClientes(false);
    setClientes([]);
    
    // Limpiar error de cliente
    if (errors.cliente_id) {
      setErrors(prev => ({ ...prev, cliente_id: null }));
    }
  };

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const valorFinal = type === 'number' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: valorFinal
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // Auto-calcular fechas de período si se cambia el período de facturación
    if (name === 'periodo_facturacion' && value) {
      const [year, month] = value.split('-');
      const primerDia = new Date(parseInt(year), parseInt(month) - 1, 1);
      const ultimoDia = new Date(parseInt(year), parseInt(month), 0);
      
      setFormData(prev => ({
        ...prev,
        fecha_desde: primerDia.toISOString().split('T')[0],
        fecha_hasta: ultimoDia.toISOString().split('T')[0]
      }));
    }
  };

  // Calcular total
  const calcularTotal = () => {
    const servicios = (formData.internet || 0) + (formData.television || 0);
    const cargos = (formData.saldo_anterior || 0) + (formData.interes || 0) + 
                   (formData.reconexion || 0) + (formData.varios || 0) + (formData.publicidad || 0);
    const descuentos = formData.descuento || 0;
    
    const subtotal = servicios + cargos - descuentos;
    const iva = subtotal > 0 ? subtotal * 0.19 : 0;
    const total = subtotal + iva;
    
    return {
      servicios: servicios.toFixed(2),
      cargos: cargos.toFixed(2),
      descuentos: descuentos.toFixed(2),
      subtotal: subtotal.toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Validar formulario
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.cliente_id) {
      nuevosErrores.cliente_id = 'Debe seleccionar un cliente';
    }
    
    if (!formData.fecha_emision) {
      nuevosErrores.fecha_emision = 'La fecha de emisión es requerida';
    }
    
    if (!formData.fecha_vencimiento) {
      nuevosErrores.fecha_vencimiento = 'La fecha de vencimiento es requerida';
    }
    
    // Validar que la fecha de vencimiento sea posterior a la de emisión
    if (formData.fecha_emision && formData.fecha_vencimiento) {
      const emision = new Date(formData.fecha_emision);
      const vencimiento = new Date(formData.fecha_vencimiento);
      
      if (vencimiento <= emision) {
        nuevosErrores.fecha_vencimiento = 'La fecha de vencimiento debe ser posterior a la de emisión';
      }
    }
    
    // Validar que al menos un servicio tenga valor
    const tieneServicios = (formData.internet || 0) > 0 || 
                          (formData.television || 0) > 0 || 
                          (formData.varios || 0) > 0 || 
                          (formData.publicidad || 0) > 0;
    
    if (!tieneServicios) {
      nuevosErrores.servicios = 'Debe especificar al menos un servicio o concepto';
    }
    
    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    try {
      setCalculandoTotal(true);
      
      // Usar el service para formatear y calcular totales
      const datosFormateados = FacturasService.formatearDatosFactura(formData);
      
      let resultado;
      if (isEditing && factura) {
        resultado = await actualizarFactura(factura.id, datosFormateados);
      } else {
        resultado = await crearFactura(datosFormateados);
      }
      
      if (resultado && onSuccess) {
        onSuccess(resultado);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error al guardar factura:', error);
    } finally {
      setCalculandoTotal(false);
    }
  };

  // Manejar cierre del modal
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const totales = calcularTotal();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Factura' : 'Nueva Factura'}
            </h2>
            <p className="text-gray-600 mt-1">
              {isEditing 
                ? `Modificar factura ${factura?.numero_factura || 'N/A'}`
                : 'Crear una nueva factura manual'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Cliente */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
            </div>

            {/* Búsqueda de Cliente */}
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <input
                type="text"
                value={busquedaCliente}
                onChange={handleBusquedaCliente}
                placeholder="Buscar cliente por nombre o identificación..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cliente_id ? 'border-red-500' : ''
                }`}
              />
              {errors.cliente_id && (
                <p className="mt-1 text-sm text-red-600">{errors.cliente_id}</p>
              )}
              
              {/* Lista de clientes */}
              {mostrarListaClientes && clientes.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                  {clientes.map((cliente) => (
                    <div
                      key={cliente.id}
                      onClick={() => seleccionarCliente(cliente)}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{cliente.nombre}</div>
                      <div className="text-sm text-gray-600">{cliente.identificacion}</div>
                      {cliente.direccion && (
                        <div className="text-xs text-gray-500">{cliente.direccion}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Información de Facturación */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Facturación</h3>
            </div>

            {/* Período de Facturación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período de Facturación
              </label>
              <input
                type="month"
                name="periodo_facturacion"
                value={formData.periodo_facturacion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Ruta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ruta
              </label>
              <input
                type="text"
                name="ruta"
                value={formData.ruta}
                onChange={handleInputChange}
                placeholder="Ej: Ruta 1, Centro, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha de Emisión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Emisión *
              </label>
              <input
                type="date"
                name="fecha_emision"
                value={formData.fecha_emision}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fecha_emision ? 'border-red-500' : ''
                }`}
              />
              {errors.fecha_emision && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_emision}</p>
              )}
            </div>

            {/* Fecha de Vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                name="fecha_vencimiento"
                value={formData.fecha_vencimiento}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fecha_vencimiento ? 'border-red-500' : ''
                }`}
              />
              {errors.fecha_vencimiento && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha_vencimiento}</p>
              )}
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período Desde
              </label>
              <input
                type="date"
                name="fecha_desde"
                value={formData.fecha_desde}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período Hasta
              </label>
              <input
                type="date"
                name="fecha_hasta"
                value={formData.fecha_hasta}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Servicios y Conceptos */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Servicios y Conceptos</h3>
            </div>

            {/* Internet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internet ($)
              </label>
              <input
                type="number"
                name="internet"
                value={formData.internet}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Televisión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Televisión ($)
              </label>
              <input
                type="number"
                name="television"
                value={formData.television}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Saldo Anterior */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saldo Anterior ($)
              </label>
              <input
                type="number"
                name="saldo_anterior"
                value={formData.saldo_anterior}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Interés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interés ($)
              </label>
              <input
                type="number"
                name="interes"
                value={formData.interes}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reconexión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reconexión ($)
              </label>
              <input
                type="number"
                name="reconexion"
                value={formData.reconexion}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Descuento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descuento ($)
              </label>
              <input
                type="number"
                name="descuento"
                value={formData.descuento}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Varios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Varios ($)
              </label>
              <input
                type="number"
                name="varios"
                value={formData.varios}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Publicidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publicidad ($)
              </label>
              <input
                type="number"
                name="publicidad"
                value={formData.publicidad}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows="3"
                placeholder="Observaciones adicionales sobre la factura..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error de servicios */}
            {errors.servicios && (
              <div className="md:col-span-2">
                <p className="text-sm text-red-600">{errors.servicios}</p>
              </div>
            )}
          </div>

          {/* Resumen de Totales */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Totales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Servicios:</span>
                <span className="font-medium">${totales.servicios}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Otros Cargos:</span>
                <span className="font-medium">${totales.cargos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Descuentos:</span>
                <span className="font-medium text-red-600">-${totales.descuentos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${totales.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA (19%):</span>
                <span className="font-medium">${totales.iva}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-blue-600">${totales.total}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={loading || calculandoTotal}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || calculandoTotal}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || calculandoTotal ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {calculandoTotal ? 'Calculando...' : 'Guardando...'}
                </div>
              ) : (
                isEditing ? 'Actualizar Factura' : 'Crear Factura'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacturaModal;