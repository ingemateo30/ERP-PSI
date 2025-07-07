// components/Facturas/FacturasList.js
import React, { useState } from 'react';
import FacturasService from '../../services/facturacionManualService';

const FacturasList = ({
  facturas,
  loading,
  pagination,
  onCambiarPagina,
  onEditarFactura,
  onMarcarPagada,
  onAnularFactura,
  onDuplicarFactura,
  onDescargarPDF,
  onVerPDF
}) => {
  const [facturaExpandida, setFacturaExpandida] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [mostrarMotivoAnulacion, setMostrarMotivoAnulacion] = useState(null);

  // Expandir/contraer detalles de factura
  const toggleExpandir = (facturaId) => {
    setFacturaExpandida(facturaExpandida === facturaId ? null : facturaId);
  };

  // Manejar anulación
  const handleAnular = (factura) => {
    setMostrarMotivoAnulacion(factura.id);
    setMotivoAnulacion('');
  };

  const confirmarAnulacion = (facturaId) => {
    onAnularFactura(facturaId, motivoAnulacion);
    setMostrarMotivoAnulacion(null);
    setMotivoAnulacion('');
  };

  const cancelarAnulacion = () => {
    setMostrarMotivoAnulacion(null);
    setMotivoAnulacion('');
  };

  // Obtener badge de estado
  const obtenerBadgeEstado = (estado) => {
    const estilos = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'pagada': 'bg-green-100 text-green-800',
      'vencida': 'bg-red-100 text-red-800',
      'anulada': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estilos[estado] || 'bg-gray-100 text-gray-800'}`}>
        {estado?.toUpperCase() || 'DESCONOCIDO'}
      </span>
    );
  };

  // Calcular días de vencimiento
  const calcularVencimiento = (fechaVencimiento, estado) => {
    if (estado === 'pagada' || estado === 'anulada') return null;
    
    const vencimiento = FacturasService.calcularDiasVencimiento(fechaVencimiento);
    
    if (vencimiento.vencida) {
      return (
        <span className="text-red-600 text-sm font-medium">
          ⚠️ {vencimiento.mensaje}
        </span>
      );
    } else if (vencimiento.dias <= 3) {
      return (
        <span className="text-orange-600 text-sm font-medium">
          ⏰ {vencimiento.mensaje}
        </span>
      );
    }
    
    return (
      <span className="text-gray-600 text-sm">
        {vencimiento.mensaje}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Cargando facturas...</p>
      </div>
    );
  }

  if (!facturas || facturas.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium mb-2">No hay facturas</h3>
        <p>No se encontraron facturas con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Tabla para pantallas grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Factura
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimiento
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => (
              <React.Fragment key={factura.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {factura.numero_factura}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {factura.id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {factura.nombre_cliente || 'Sin nombre'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factura.identificacion_cliente}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {FacturasService.formatearFecha(factura.fecha_desde)} -
                    </div>
                    <div className="text-sm text-gray-900">
                      {FacturasService.formatearFecha(factura.fecha_hasta)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {FacturasService.formatearMoneda(factura.total)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {obtenerBadgeEstado(factura.estado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {FacturasService.formatearFecha(factura.fecha_vencimiento)}
                    </div>
                    {calcularVencimiento(factura.fecha_vencimiento, factura.estado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {/* Botón expandir */}
                      <button
                        onClick={() => toggleExpandir(factura.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        {facturaExpandida === factura.id ? '👁️‍🗨️' : '👁️'}
                      </button>

                      {/* Descargar PDF */}
                      <button
                        onClick={() => onDescargarPDF(factura)}
                        className="text-green-600 hover:text-green-900"
                        title="Descargar PDF"
                      >
                        📥
                      </button>

                      {/* Ver PDF */}
                      <button
                        onClick={() => onVerPDF(factura.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver PDF"
                      >
                        📄
                      </button>

                      {/* Editar (solo si no está pagada o anulada) */}
                      {factura.estado === 'pendiente' && (
                        <button
                          onClick={() => onEditarFactura(factura)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}

                      {/* Marcar como pagada */}
                      {factura.estado === 'pendiente' && (
                        <button
                          onClick={() => onMarcarPagada(factura)}
                          className="text-green-600 hover:text-green-900"
                          title="Marcar como pagada"
                        >
                          💰
                        </button>
                      )}

                      {/* Duplicar */}
                      <button
                        onClick={() => onDuplicarFactura(factura.id)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Duplicar factura"
                      >
                        📋
                      </button>

                      {/* Anular */}
                      {factura.estado !== 'anulada' && factura.estado !== 'pagada' && (
                        <button
                          onClick={() => handleAnular(factura)}
                          className="text-red-600 hover:text-red-900"
                          title="Anular factura"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Fila expandida con detalles */}
                {facturaExpandida === factura.id && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Información del Cliente</h4>
                          <p className="text-sm text-gray-600">
                            <strong>Dirección:</strong> {factura.cliente_direccion || 'No disponible'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Teléfono:</strong> {factura.cliente_telefono || 'No disponible'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Sector:</strong> {factura.sector_nombre || 'No asignado'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Detalles de Facturación</h4>
                          <p className="text-sm text-gray-600">
                            <strong>Internet:</strong> {FacturasService.formatearMoneda(factura.internet)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Televisión:</strong> {FacturasService.formatearMoneda(factura.television)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Saldo Anterior:</strong> {FacturasService.formatearMoneda(factura.saldo_anterior)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Ruta:</strong> {factura.ruta || 'No asignada'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Información de Pago</h4>
                          {factura.estado === 'pagada' && (
                            <>
                              <p className="text-sm text-gray-600">
                                <strong>Fecha de Pago:</strong> {FacturasService.formatearFecha(factura.fecha_pago)}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Método:</strong> {factura.metodo_pago}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Referencia:</strong> {factura.referencia_pago || 'N/A'}
                              </p>
                            </>
                          )}
                          {factura.observaciones && (
                            <p className="text-sm text-gray-600">
                              <strong>Observaciones:</strong> {factura.observaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Modal inline para motivo de anulación */}
                {mostrarMotivoAnulacion === factura.id && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 bg-red-50">
                      <div className="max-w-md">
                        <h4 className="font-medium text-red-900 mb-2">Anular Factura</h4>
                        <textarea
                          value={motivoAnulacion}
                          onChange={(e) => setMotivoAnulacion(e.target.value)}
                          placeholder="Ingrese el motivo de anulación (mínimo 10 caracteres)"
                          className="w-full p-2 border border-red-300 rounded text-sm"
                          rows="3"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => confirmarAnulacion(factura.id)}
                            disabled={motivoAnulacion.length < 10}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirmar Anulación
                          </button>
                          <button
                            onClick={cancelarAnulacion}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista para móviles */}
      <div className="md:hidden">
        {facturas.map((factura) => (
          <div key={factura.id} className="border-b border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{factura.numero_factura}</h3>
                <p className="text-sm text-gray-600">{factura.nombre_cliente}</p>
              </div>
              <div className="text-right">
                {obtenerBadgeEstado(factura.estado)}
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {FacturasService.formatearMoneda(factura.total)}
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <p>Vence: {FacturasService.formatearFecha(factura.fecha_vencimiento)}</p>
              {calcularVencimiento(factura.fecha_vencimiento, factura.estado)}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onDescargarPDF(factura)}
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
              >
                📥 PDF
              </button>
              <button
                onClick={() => onVerPDF(factura.id)}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
              >
                👁️ Ver
              </button>
              {factura.estado === 'pendiente' && (
                <>
                  <button
                    onClick={() => onEditarFactura(factura)}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => onMarcarPagada(factura)}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                  >
                    💰 Pagar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => onCambiarPagina(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => onCambiarPagina(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{pagination.totalItems}</span> facturas
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => onCambiarPagina(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => onCambiarPagina(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => onCambiarPagina(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasList;