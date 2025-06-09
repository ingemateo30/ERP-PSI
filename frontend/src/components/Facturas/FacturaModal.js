// components/Facturas/FacturaModal.js
import React, { useState, useEffect } from 'react';
import { useFacturasAcciones } from '../../hooks/useFacturas';
import clientService from '../../services/clientService';
import FacturasService from '../../services/facturasService';

const FacturaModal = ({ isOpen, isEditing, factura, onClose, onSuccess }) => {
  const { crearFactura, actualizarFactura, loading, error, clearError } = useFacturasAcciones();

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
          nombre: factura.nombre_cliente,
          identificacion: factura.identificacion_cliente
        });
      } else {
        // Resetear para nueva factura
        const fechaActual = new Date().toISOString().split('T')[0];
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        setFormData({
          cliente_id: '',
          periodo_facturacion: new Date().toISOString().substr(0, 7), // YYYY-MM
          fecha_emision: fechaActual,
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          fecha_desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          fecha_hasta: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
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
    
    return Math.max(0, servicios + cargos - descuentos);
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.cliente_id || !clienteSeleccionado) {
      newErrors.cliente_id = 'Debe seleccionar un cliente';
    }

    if (!formData.periodo_facturacion) {
      newErrors.periodo_facturacion = 'Período de facturación es requerido';
    }

    if (!formData.fecha_vencimiento) {
      newErrors.fecha_vencimiento = 'Fecha de vencimiento es requerida';
    }

    if (!formData.fecha_desde) {
      newErrors.fecha_desde = 'Fecha desde es requerida';
    }

    if (!formData.fecha_hasta) {
      newErrors.fecha_hasta = 'Fecha hasta es requerida';
    }

    // Validar que fecha_hasta sea mayor que fecha_desde
    if (formData.fecha_desde && formData.fecha_hasta && formData.fecha_desde > formData.fecha_hasta) {
      newErrors.fecha_hasta = 'La fecha hasta debe ser mayor que la fecha desde';
    }

    // Validar que el total no sea 0
    const total = calcularTotal();
    if (total <= 0) {
      newErrors.total = 'El total de la factura debe ser mayor a $0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const datosFactura = {
        ...formData,
        total: calcularTotal()
      };

      if (isEditing) {
        await actualizarFactura(factura.id, datosFactura);
      } else {
        await crearFactura(datosFactura);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error al guardar factura:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  const total = calcularTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditing ? `Editar Factura ${factura?.numero_factura}` : 'Nueva Factura'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Información general */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">
                Información General
              </h4>

              {/* Búsqueda de cliente */}
              <div className="relative">
                <label htmlFor="busqueda_cliente" className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <input
                  type="text"
                  id="busqueda_cliente"
                  value={busquedaCliente}
                  onChange={handleBusquedaCliente}
                  onFocus={() => setMostrarListaClientes(true)}
                  placeholder="Buscar cliente por nombre o identificación..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cliente_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isEditing}
                />
                
                {/* Lista de clientes */}
                {mostrarListaClientes && clientes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => seleccionarCliente(cliente)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50"
                      >
                        <div className="font-medium text-gray-900">{cliente.nombre}</div>
                        <div className="text-sm text-gray-600">{cliente.identificacion}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Cliente seleccionado */}
                {clienteSeleccionado && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border">
                    <div className="text-sm">
                      <strong>Cliente:</strong> {clienteSeleccionado.nombre}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>ID:</strong> {clienteSeleccionado.identificacion}
                    </div>
                  </div>
                )}
                
                {errors.cliente_id && (
                  <p className="text-red-600 text-sm mt-1">{errors.cliente_id}</p>
                )}
              </div>

              {/* Período de facturación */}
              <div>
                <label htmlFor="periodo_facturacion" className="block text-sm font-medium text-gray-700 mb-1">
                  Período de Facturación *
                </label>
                <input
                  type="month"
                  id="periodo_facturacion"
                  name="periodo_facturacion"
                  value={formData.periodo_facturacion}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.periodo_facturacion ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.periodo_facturacion && (
                  <p className="text-red-600 text-sm mt-1">{errors.periodo_facturacion}</p>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fecha_desde" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Desde *
                  </label>
                  <input
                    type="date"
                    id="fecha_desde"
                    name="fecha_desde"
                    value={formData.fecha_desde}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fecha_desde ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.fecha_desde && (
                    <p className="text-red-600 text-sm mt-1">{errors.fecha_desde}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="fecha_hasta" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Hasta *
                  </label>
                  <input
                    type="date"
                    id="fecha_hasta"
                    name="fecha_hasta"
                    value={formData.fecha_hasta}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fecha_hasta ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.fecha_hasta && (
                    <p className="text-red-600 text-sm mt-1">{errors.fecha_hasta}</p>
                  )}
                </div>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  id="fecha_vencimiento"
                  name="fecha_vencimiento"
                  value={formData.fecha_vencimiento}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.fecha_vencimiento ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.fecha_vencimiento && (
                  <p className="text-red-600 text-sm mt-1">{errors.fecha_vencimiento}</p>
                )}
              </div>

              {/* Ruta y observaciones */}
              <div>
                <label htmlFor="ruta" className="block text-sm font-medium text-gray-700 mb-1">
                  Ruta
                </label>
                <input
                  type="text"
                  id="ruta"
                  name="ruta"
                  value={formData.ruta}
                  onChange={handleInputChange}
                  placeholder="Ej: R01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Información adicional sobre la factura..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Columna derecha - Conceptos y valores */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">
                Conceptos y Valores
              </h4>

              {/* Servicios */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-3">Servicios</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="internet" className="block text-sm font-medium text-gray-700 mb-1">
                      Internet
                    </label>
                    <input
                      type="number"
                      id="internet"
                      name="internet"
                      value={formData.internet}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="television" className="block text-sm font-medium text-gray-700 mb-1">
                      Televisión
                    </label>
                    <input
                      type="number"
                      id="television"
                      name="television"
                      value={formData.television}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cargos adicionales */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-900 mb-3">Cargos Adicionales</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="saldo_anterior" className="block text-sm font-medium text-gray-700 mb-1">
                      Saldo Anterior
                    </label>
                    <input
                      type="number"
                      id="saldo_anterior"
                      name="saldo_anterior"
                      value={formData.saldo_anterior}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="interes" className="block text-sm font-medium text-gray-700 mb-1">
                      Intereses
                    </label>
                    <input
                      type="number"
                      id="interes"
                      name="interes"
                      value={formData.interes}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="reconexion" className="block text-sm font-medium text-gray-700 mb-1">
                      Reconexión
                    </label>
                    <input
                      type="number"
                      id="reconexion"
                      name="reconexion"
                      value={formData.reconexion}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="varios" className="block text-sm font-medium text-gray-700 mb-1">
                      Varios
                    </label>
                    <input
                      type="number"
                      id="varios"
                      name="varios"
                      value={formData.varios}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="publicidad" className="block text-sm font-medium text-gray-700 mb-1">
                      Publicidad
                    </label>
                    <input
                      type="number"
                      id="publicidad"
                      name="publicidad"
                      value={formData.publicidad}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="descuento" className="block text-sm font-medium text-gray-700 mb-1">
                      Descuento
                    </label>
                    <input
                      type="number"
                      id="descuento"
                      name="descuento"
                      value={formData.descuento}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <h5 className="font-medium text-green-900 mb-2">Total de la Factura</h5>
                <div className="text-2xl font-bold text-green-700">
                  {FacturasService.formatearMoneda(total)}
                </div>
                {errors.total && (
                  <p className="text-red-600 text-sm mt-1">{errors.total}</p>
                )}
              </div>
            </div>
          </div>

          {/* Error general */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || total <= 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isEditing ? '✏️ Actualizar Factura' : '💾 Crear Factura'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacturaModal;