import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard, 
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const HistorialFacturacionCliente = ({ clienteId, clienteNombre }) => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    numero_factura: ''
  });
  const [estadisticas, setEstadisticas] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (clienteId) {
      cargarHistorialFacturacion();
    }
  }, [clienteId, filtros]);

  const cargarHistorialFacturacion = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        cliente_id: clienteId,
        ...filtros
      });

      const response = await fetch(`/api/v1/facturas/historial-cliente?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setHistorial(data.data.facturas || []);
        setEstadisticas(data.data.estadisticas || {});
      } else {
        setError(data.message || 'Error cargando historial');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      pagada: 'bg-green-100 text-green-800',
      vencida: 'bg-red-100 text-red-800',
      anulada: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estilos[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado?.charAt(0).toUpperCase() + estado?.slice(1) || 'N/A'}
      </span>
    );
  };

  const toggleRowExpansion = (facturaId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(facturaId)) {
      newExpanded.delete(facturaId);
    } else {
      newExpanded.add(facturaId);
    }
    setExpandedRows(newExpanded);
  };

  const descargarFactura = async (facturaId, numeroFactura) => {
    try {
      const response = await fetch(`/api/v1/facturas/${facturaId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Factura_${numeroFactura}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error descargando factura');
      }
    } catch (error) {
      console.error('Error descargando factura:', error);
      alert('Error descargando factura');
    }
  };

  const verFactura = (facturaId) => {
    window.open(`/api/v1/facturas/${facturaId}/ver-pdf`, '_blank');
  };

  const aplicarFiltros = () => {
    cargarHistorialFacturacion();
  };

  const limpiarFiltros = () => {
    setFiltros({
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_factura: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando historial de facturación...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Historial de Facturación
            </h2>
            {clienteNombre && (
              <p className="text-sm text-gray-600 mt-1">
                Cliente: <span className="font-medium">{clienteNombre}</span>
              </p>
            )}
          </div>
          <button
            onClick={cargarHistorialFacturacion}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas resumidas */}
      {estadisticas && Object.keys(estadisticas).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Facturas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {estadisticas.total_facturas || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatearMoneda(estadisticas.valor_total)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {estadisticas.pendientes || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Pendiente</p>
                <p className="text-2xl font-semibold text-red-600">
                  {formatearMoneda(estadisticas.valor_pendiente)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="vencida">Vencida</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Factura
            </label>
            <input
              type="text"
              value={filtros.numero_factura}
              onChange={(e) => setFiltros(prev => ({ ...prev, numero_factura: e.target.value }))}
              placeholder="Buscar por número..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={aplicarFiltros}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            Aplicar Filtros
          </button>
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabla de historial */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historial.length > 0 ? (
                historial.map((factura) => (
                  <React.Fragment key={factura.id}>
                    {/* Fila principal */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {factura.numero_factura}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatearFecha(factura.fecha_emision)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {factura.periodo_facturacion}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatearFecha(factura.fecha_desde)} - {formatearFecha(factura.fecha_hasta)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoBadge(factura.estado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatearMoneda(factura.total)}
                        </div>
                        {factura.subtotal && (
                          <div className="text-xs text-gray-500">
                            Subtotal: {formatearMoneda(factura.subtotal)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatearFecha(factura.fecha_vencimiento)}
                        </div>
                        {factura.estado === 'vencida' && (
                          <div className="text-xs text-red-600">
                            Vencida
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => verFactura(factura.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver factura"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => descargarFactura(factura.id, factura.numero_factura)}
                            className="p-1 text-green-600 hover:text-green-800 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {factura.estado === 'pendiente' && (
                            <button
                              className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
                              title="Registrar pago"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleRowExpansion(factura.id)}
                          className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                          title={expandedRows.has(factura.id) ? "Ocultar detalles" : "Ver detalles"}
                        >
                          {expandedRows.has(factura.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Fila expandida con detalles */}
                    {expandedRows.has(factura.id) && (
                      <tr className="bg-gray-50">
                        <td colSpan="7" className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Desglose de servicios */}
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">Servicios</h4>
                              {factura.internet > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Internet:</span>
                                  <span>{formatearMoneda(factura.internet)}</span>
                                </div>
                              )}
                              {factura.television > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Televisión:</span>
                                  <span>{formatearMoneda(factura.television)}</span>
                                </div>
                              )}
                              {factura.publicidad > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Publicidad:</span>
                                  <span>{formatearMoneda(factura.publicidad)}</span>
                                </div>
                              )}
                            </div>

                            {/* Otros conceptos */}
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">Otros Conceptos</h4>
                              {factura.saldo_anterior > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Saldo anterior:</span>
                                  <span>{formatearMoneda(factura.saldo_anterior)}</span>
                                </div>
                              )}
                              {factura.interes > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Intereses:</span>
                                  <span>{formatearMoneda(factura.interes)}</span>
                                </div>
                              )}
                              {factura.reconexion > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Reconexión:</span>
                                  <span>{formatearMoneda(factura.reconexion)}</span>
                                </div>
                              )}
                              {factura.varios > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span>Varios:</span>
                                  <span>{formatearMoneda(factura.varios)}</span>
                                </div>
                              )}
                              {factura.descuento > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>Descuento:</span>
                                  <span>-{formatearMoneda(factura.descuento)}</span>
                                </div>
                              )}
                            </div>

                            {/* Información adicional */}
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-900">Información</h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>{formatearMoneda(factura.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>IVA:</span>
                                  <span>{formatearMoneda(factura.iva)}</span>
                                </div>
                                <div className="flex justify-between font-medium border-t pt-1">
                                  <span>Total:</span>
                                  <span>{formatearMoneda(factura.total)}</span>
                                </div>
                              </div>
                              {factura.observaciones && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-600">Observaciones:</span>
                                  <p className="text-xs text-gray-700 mt-1">{factura.observaciones}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Historial de pagos si existen */}
                          {factura.pagos && factura.pagos.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-medium text-gray-900 mb-2">Historial de Pagos</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase">
                                      <th className="text-left py-1">Fecha</th>
                                      <th className="text-left py-1">Valor</th>
                                      <th className="text-left py-1">Método</th>
                                      <th className="text-left py-1">Referencia</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {factura.pagos.map((pago, index) => (
                                      <tr key={index} className="border-t border-gray-100">
                                        <td className="py-1">{formatearFecha(pago.fecha_pago)}</td>
                                        <td className="py-1">{formatearMoneda(pago.valor_pago)}</td>
                                        <td className="py-1">{pago.metodo_pago}</td>
                                        <td className="py-1">{pago.referencia_pago || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay facturas
                      </h3>
                      <p className="text-gray-500">
                        No se encontraron facturas para este cliente con los filtros aplicados.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistorialFacturacionCliente;