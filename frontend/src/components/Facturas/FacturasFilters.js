// frontend/src/components/Facturas/FacturasFilters.js - VERSIÓN FINAL CORREGIDA
import React, { useState } from 'react';
import { Search, Filter, X, Calendar, DollarSign, FileText, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const FacturasFilters = ({ onBuscar, onLimpiar, loading = false }) => {
  // Estado simple para mostrar/ocultar filtros avanzados
  const [mostrarAvanzados, setMostrarAvanzados] = useState(false);
  
  // Estados individuales para cada campo - ESTO EVITA EL PROBLEMA DEL CARACTER ÚNICO
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [vencimientoDesde, setVencimientoDesde] = useState('');
  const [vencimientoHasta, setVencimientoHasta] = useState('');
  const [diasVencimiento, setDiasVencimiento] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');
  const [ruta, setRuta] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [incluirAnuladas, setIncluirAnuladas] = useState(false);

  // Construir objeto de filtros
  const construirFiltros = () => {
    const filtros = {};
    
    if (search.trim()) filtros.search = search.trim();
    if (estado) filtros.estado = estado;
    if (numeroFactura.trim()) filtros.numero_factura = numeroFactura.trim();
    if (fechaDesde) filtros.fecha_desde = fechaDesde;
    if (fechaHasta) filtros.fecha_hasta = fechaHasta;
    if (vencimientoDesde) filtros.vencimiento_desde = vencimientoDesde;
    if (vencimientoHasta) filtros.vencimiento_hasta = vencimientoHasta;
    if (diasVencimiento) filtros.dias_vencimiento = diasVencimiento;
    if (montoMin) filtros.monto_min = montoMin;
    if (montoMax) filtros.monto_max = montoMax;
    if (ruta.trim()) filtros.ruta = ruta.trim();
    if (metodoPago) filtros.metodo_pago = metodoPago;
    if (clienteId) filtros.cliente_id = clienteId;
    if (incluirAnuladas) filtros.incluir_anuladas = incluirAnuladas;

    return filtros;
  };

  // Manejar búsqueda
  const handleBuscar = (e) => {
    e.preventDefault();
    const filtros = construirFiltros();
    console.log('🔍 Buscando con filtros:', filtros);
    
    if (onBuscar) {
      onBuscar(filtros);
    }
  };

  // Limpiar todos los campos
  const handleLimpiar = () => {
    console.log('🗑️ Limpiando filtros');
    
    setSearch('');
    setEstado('');
    setNumeroFactura('');
    setFechaDesde('');
    setFechaHasta('');
    setVencimientoDesde('');
    setVencimientoHasta('');
    setDiasVencimiento('');
    setMontoMin('');
    setMontoMax('');
    setRuta('');
    setMetodoPago('');
    setClienteId('');
    setIncluirAnuladas(false);
    setMostrarAvanzados(false);
    
    if (onLimpiar) {
      onLimpiar();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Búsqueda</h3>
          </div>
          <button
            type="button"
            onClick={() => setMostrarAvanzados(!mostrarAvanzados)}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
          >
            <span className="font-medium">
              {mostrarAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados
            </span>
            {mostrarAvanzados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleBuscar} className="p-6">
        {/* FILTROS BÁSICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Búsqueda general */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Búsqueda General
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Número de factura, cliente, identificación..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagada">Pagadas</option>
              <option value="vencida">Vencidas</option>
              <option value="anulada">Anuladas</option>
            </select>
          </div>

          {/* Número de factura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">N° Factura</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="FAC000001"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* FILTROS AVANZADOS - USANDO DISPLAY CSS INLINE */}
        <div style={{ display: mostrarAvanzados ? 'block' : 'none' }}>
          <div className="pt-6 border-t border-gray-200 space-y-6">
            {/* Fechas de emisión */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Fechas de Emisión
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Fechas de vencimiento */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-red-600" />
                Fechas de Vencimiento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vence Desde</label>
                  <input
                    type="date"
                    value={vencimientoDesde}
                    onChange={(e) => setVencimientoDesde(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vence Hasta</label>
                  <input
                    type="date"
                    value={vencimientoHasta}
                    onChange={(e) => setVencimientoHasta(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Días Vencidos (mín)</label>
                  <input
                    type="number"
                    min="0"
                    value={diasVencimiento}
                    onChange={(e) => setDiasVencimiento(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Montos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                Rangos de Monto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoMin}
                    onChange={(e) => setMontoMin(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto Máximo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={montoMax}
                    onChange={(e) => setMontoMax(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Ubicación y métodos */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                Ubicación y Métodos de Pago
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ruta</label>
                  <input
                    type="text"
                    value={ruta}
                    onChange={(e) => setRuta(e.target.value)}
                    placeholder="R001"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta_credito">Tarjeta Crédito</option>
                    <option value="tarjeta_debito">Tarjeta Débito</option>
                    <option value="cheque">Cheque</option>
                    <option value="pse">PSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Cliente</label>
                  <input
                    type="number"
                    min="1"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    placeholder="12345"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Opciones adicionales */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Opciones Adicionales</h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirAnuladas}
                  onChange={(e) => setIncluirAnuladas(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">Incluir facturas anuladas</span>
              </label>
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar Facturas
          </button>

          <button
            type="button"
            onClick={handleLimpiar}
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
          >
            <X className="w-4 h-4 mr-2" />
            Limpiar Filtros
          </button>
        </div>

        {/* INFO DE AYUDA */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Search className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Consejos de Búsqueda</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• La búsqueda general busca en número de factura, cliente e identificación</li>
                <li>• Usa los filtros avanzados para búsquedas más específicas</li>
                <li>• Combina múltiples filtros para resultados más precisos</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FacturasFilters;