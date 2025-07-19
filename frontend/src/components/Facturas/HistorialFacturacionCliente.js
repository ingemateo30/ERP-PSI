// frontend/src/components/Facturas/HistorialFacturacionCliente.js
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
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [estadisticas, setEstadisticas] = useState({
    total_facturas: 0,
    total_monto: 0,
    total_pagado: 0,
    total_pendiente: 0,
    facturas_pagadas: 0,
    facturas_pendientes: 0,
    facturas_vencidas: 0
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 0
  });

  useEffect(() => {
    if (clienteId) {
      cargarHistorialFacturacion();
    }
  }, [clienteId, filtros, paginacion.page]);

  const cargarHistorialFacturacion = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        cliente_id: clienteId,
        page: paginacion.page,
        limit: paginacion.limit,
        ...Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v !== ''))
      });

      // Intentar múltiples endpoints
      let response;
      let data;
      
      try {
        response = await fetch(`/api/v1/facturacion/facturas?${queryParams}`);
        data = await response.json();
      } catch (error) {
        // Fallback al endpoint de facturas regular
        response = await fetch(`/api/v1/facturas?${queryParams}`);
        data = await response.json();
      }

      if (data.success) {
        setHistorial(data.data || []);
        
        // Calcular estadísticas localmente si no vienen del backend
        if (data.estadisticas) {
          setEstadisticas(data.estadisticas);
        } else {
          calcularEstadisticas(data.data || []);
        }

        // Actualizar paginación si viene en la respuesta
        if (data.pagination) {
          setPaginacion(prev => ({
            ...prev,
            total: data.pagination.total,
            total_pages: data.pagination.total_pages
          }));
        }
      } else {
        setError(data.message || 'Error cargando historial de facturación');
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      setError('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (facturas) => {
    const stats = facturas.reduce((acc, factura) => {
      const monto = parseFloat(factura.total || 0);
      const pagado = parseFloat(factura.monto_pagado || 0);

      acc.total_facturas++;
      acc.total_monto += monto;
      acc.total_pagado += pagado;

      if (factura.estado === 'pagada') {
        acc.facturas_pagadas++;
      } else if (factura.estado === 'vencida') {
        acc.facturas_vencidas++;
        acc.total_pendiente += monto - pagado;
      } else {
        acc.facturas_pendientes++;
        acc.total_pendiente += monto - pagado;
      }

      return acc;
    }, {
      total_facturas: 0,
      total_monto: 0,
      total_pagado: 0,
      total_pendiente: 0,
      facturas_pagadas: 0,
      facturas_pendientes: 0,
      facturas_vencidas: 0
    });

    setEstadisticas(stats);
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
    if (!fecha) return 'No definida';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      pagada: 'bg-green-100 text-green-800',
      vencida: 'bg-red-100 text-red-800',
      anulada: 'bg-gray-100 text-gray-800',
      parcial: 'bg-blue-100 text-blue-800'
    };
    
    return estilos[estado?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const toggleExpandRow = (facturaId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(facturaId)) {
      newExpanded.delete(facturaId);
    } else {
      newExpanded.add(facturaId);
    }
    setExpandedRows(newExpanded);
  };

  const descargarFactura = async (facturaId) => {
    try {
      const response = await fetch(`/api/v1/facturas/${facturaId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `factura_${facturaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error al descargar la factura');
      }
    } catch (error) {
      console.error('Error descargando factura:', error);
      alert('Error al descargar la factura');
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_factura: ''
    });
    setPaginacion(prev => ({ ...prev, page: 1 }));
  };

  const cambiarPagina = (nuevaPagina) => {
    setPaginacion(prev => ({ ...prev, page: nuevaPagina }));
  };

  if (!clienteId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
          <span className="text-yellow-800">Seleccione un cliente para ver su historial de facturación</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información del cliente */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Historial de Facturación
            </h2>
            {clienteNombre && (
              <p className="text-gray-600">
                Cliente: <span className="font-medium">{clienteNombre}</span>
              </p>
            )}
          </div>
          <button
            onClick={cargarHistorialFacturacion}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Facturas</p>
              <p className="text-2xl font-bold text-blue-600">{estadisticas.total_facturas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pagadas</p>
              <p className="text-2xl font-bold text-green-600">{estadisticas.facturas_pagadas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{estadisticas.facturas_pendientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Facturado</p>
              <p className="text-lg font-bold text-green-600">{formatearMoneda(estadisticas.total_monto)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagada">Pagadas</option>
              <option value="vencida">Vencidas</option>
              <option value="anulada">Anuladas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Número Factura</label>
            <input
              type="text"
              placeholder="Buscar por número..."
              value={filtros.numero_factura}
              onChange={(e) => setFiltros(prev => ({ ...prev, numero_factura: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de historial */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Facturas ({estadisticas.total_facturas})
            </h3>
            {loading && (
              <div className="flex items-center text-[#0e6493]">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Cargando...
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historial.length > 0 ? (
                  historial.map((factura) => (
                    <React.Fragment key={factura.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleExpandRow(factura.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedRows.has(factura.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{factura.numero_factura || factura.id}
                              </div>
                              {factura.periodo && (
                                <div className="text-sm text-gray-500">
                                  {factura.periodo}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatearFecha(factura.fecha_factura)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatearFecha(factura.fecha_vencimiento)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatearMoneda(factura.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">
                            {formatearMoneda(factura.monto_pagado || 0)}
                          </div>
                          {factura.total > (factura.monto_pagado || 0) && (
                            <div className="text-sm text-red-600">
                              Pendiente: {formatearMoneda(factura.total - (factura.monto_pagado || 0))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(factura.estado)}`}>
                            {factura.estado || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => descargarFactura(factura.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleExpandRow(factura.id)}
                              className="text-[#0e6493] hover:text-[#0e6493]/80"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila expandida con detalles */}
                      {expandedRows.has(factura.id) && (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Detalles de la factura */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Detalles de la Factura</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Subtotal:</span>
                                      <span>{formatearMoneda(factura.subtotal || 0)}</span>
                                    </div>
                                    {factura.descuento > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Descuento:</span>
                                        <span className="text-green-600">-{formatearMoneda(factura.descuento)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">IVA:</span>
                                      <span>{formatearMoneda(factura.iva || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1">
                                      <span className="font-semibold">Total:</span>
                                      <span className="font-semibold">{formatearMoneda(factura.total)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Información Adicional</h4>
                                  <div className="space-y-1 text-sm">
                                    {factura.fecha_creacion && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Creada:</span>
                                        <span>{formatearFecha(factura.fecha_creacion)}</span>
                                      </div>
                                    )}
                                    {factura.usuario_creador && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Creada por:</span>
                                        <span>{factura.usuario_creador}</span>
                                      </div>
                                    )}
                                    {factura.metodo_pago && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Método de pago:</span>
                                        <span>{factura.metodo_pago}</span>
                                      </div>
                                    )}
                                    {factura.observaciones && (
                                      <div className="mt-2">
                                        <span className="text-gray-600">Observaciones:</span>
                                        <p className="text-gray-800 mt-1">{factura.observaciones}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Conceptos facturados */}
                              {factura.items && factura.items.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Conceptos Facturados</h4>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Concepto</th>
                                          <th className="px-3 py-2 text-left">Cantidad</th>
                                          <th className="px-3 py-2 text-left">Valor Unitario</th>
                                          <th className="px-3 py-2 text-left">Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {factura.items.map((item, index) => (
                                          <tr key={index} className="border-t border-gray-200">
                                            <td className="px-3 py-2">{item.concepto || item.descripcion}</td>
                                            <td className="px-3 py-2">{item.cantidad || 1}</td>
                                            <td className="px-3 py-2">{formatearMoneda(item.valor_unitario || item.precio)}</td>
                                            <td className="px-3 py-2">{formatearMoneda(item.total || item.subtotal)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Historial de pagos */}
                              {factura.pagos && factura.pagos.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Historial de Pagos</h4>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Fecha</th>
                                          <th className="px-3 py-2 text-left">Valor</th>
                                          <th className="px-3 py-2 text-left">Método</th>
                                          <th className="px-3 py-2 text-left">Referencia</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {factura.pagos.map((pago, index) => (
                                          <tr key={index} className="border-t border-gray-200">
                                            <td className="px-3 py-2">{formatearFecha(pago.fecha_pago)}</td>
                                            <td className="px-3 py-2 text-green-600 font-medium">
                                              {formatearMoneda(pago.monto || pago.valor_pago)}
                                            </td>
                                            <td className="px-3 py-2">{pago.metodo_pago}</td>
                                            <td className="px-3 py-2">{pago.referencia_pago || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : !loading ? (
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
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#0e6493] mr-2" />
                        <span className="text-gray-600">Cargando historial...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {paginacion.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando página {paginacion.page} de {paginacion.total_pages} 
                ({paginacion.total} facturas en total)
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => cambiarPagina(paginacion.page - 1)}
                  disabled={paginacion.page <= 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                
                {/* Números de página */}
                {Array.from({ length: Math.min(5, paginacion.total_pages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => cambiarPagina(pageNum)}
                      className={`px-3 py-1 border text-sm rounded ${
                        paginacion.page === pageNum
                          ? 'bg-[#0e6493] text-white border-[#0e6493]'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => cambiarPagina(paginacion.page + 1)}
                  disabled={paginacion.page >= paginacion.total_pages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialFacturacionCliente;