// components/Facturas/FacturasList.js - Corregido
import React, { useState } from 'react';
import { 
  FileText, 
  Eye, 
  Download, 
  Edit, 
  Copy, 
  DollarSign, 
  X, 
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

const FacturasList = ({
  facturas = [],
  loading,
  pagination = {},
  onEditarFactura,
  onMarcarPagada,
  onAnularFactura,
  onDuplicarFactura,
  onDescargarPDF,
  onVerPDF,
  onCambiarPagina,
  actionLoading
}) => {
  const [facturaExpandida, setFacturaExpandida] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(null);

  // Formatear moneda
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  // Obtener badge de estado
  const getBadgeEstado = (estado) => {
    const badges = {
      pendiente: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: Clock,
        label: 'Pendiente'
      },
      pagada: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Pagada'
      },
      vencida: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: AlertTriangle,
        label: 'Vencida'
      },
      anulada: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: X,
        label: 'Anulada'
      },
      parcial: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: DollarSign,
        label: 'Pago Parcial'
      }
    };

    const badge = badges[estado] || badges.pendiente;
    const IconComponent = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  // Manejar expansión de factura
  const toggleExpansion = (facturaId) => {
    setFacturaExpandida(facturaExpandida === facturaId ? null : facturaId);
  };

  // Manejar menú de acciones
  const toggleMenu = (facturaId, e) => {
    e.stopPropagation();
    setMenuAbierto(menuAbierto === facturaId ? null : facturaId);
  };

  // Cerrar menús al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = () => {
      setMenuAbierto(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Componente de paginación
  const Pagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;

    const pages = [];
    const currentPage = pagination.page || 1;
    const totalPages = pagination.totalPages;

    // Calcular páginas a mostrar
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onCambiarPagina && onCambiarPagina(currentPage - 1)}
            disabled={currentPage <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => onCambiarPagina && onCambiarPagina(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {((currentPage - 1) * (pagination.limit || 10)) + 1}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(currentPage * (pagination.limit || 10), pagination.total || 0)}
              </span>{' '}
              de{' '}
              <span className="font-medium">{pagination.total || 0}</span>{' '}
              resultados
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onCambiarPagina && onCambiarPagina(currentPage - 1)}
                disabled={currentPage <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => onCambiarPagina && onCambiarPagina(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    page === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => onCambiarPagina && onCambiarPagina(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Lista de Facturas
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!facturas || facturas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Lista de Facturas
          </h3>
        </div>
        <div className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
          <p className="text-gray-500 mb-4">
            No se encontraron facturas con los criterios seleccionados.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refrescar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Lista de Facturas ({facturas.length})
          </h3>
          <div className="text-sm text-gray-500">
            Total facturado: {formatearMoneda(facturas.reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0))}
          </div>
        </div>
      </div>

      {/* Desktop Table */}
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
                Fecha
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
                <tr 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpansion(factura.id)}
                >
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
                      {formatearFecha(factura.fecha_emision)}
                    </div>
                    {factura.ruta && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {factura.ruta}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      {formatearMoneda(factura.total)}
                    </div>
                    {factura.saldo_pendiente > 0 && (
                      <div className="text-xs text-red-600">
                        Pendiente: {formatearMoneda(factura.saldo_pendiente)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getBadgeEstado(factura.estado)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatearFecha(factura.fecha_vencimiento)}
                    </div>
                    {factura.dias_vencido > 0 && (
                      <div className="text-xs text-red-600">
                        {factura.dias_vencido} días vencida
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => toggleMenu(factura.id, e)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        disabled={actionLoading}
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      
                      {menuAbierto === factura.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onVerPDF && onVerPDF(factura.id);
                                setMenuAbierto(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver PDF
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDescargarPDF && onDescargarPDF(factura.id);
                                setMenuAbierto(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Descargar PDF
                            </button>
                            
                            {factura.estado !== 'pagada' && factura.estado !== 'anulada' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditarFactura && onEditarFactura(factura);
                                    setMenuAbierto(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </button>
                                
                                {factura.estado === 'pendiente' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMarcarPagada && onMarcarPagada(factura);
                                      setMenuAbierto(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Registrar Pago
                                  </button>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAnularFactura && onAnularFactura(factura);
                                    setMenuAbierto(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Anular
                                </button>
                              </>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicarFactura && onDuplicarFactura(factura.id);
                                setMenuAbierto(null);
                              }}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </button>
                          </div>
                        </div>
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
                          <h4 className="font-medium text-gray-900 mb-2">Servicios</h4>
                          <div className="space-y-1 text-sm">
                            {factura.internet > 0 && (
                              <div className="flex justify-between">
                                <span>Internet:</span>
                                <span>{formatearMoneda(factura.internet)}</span>
                              </div>
                            )}
                            {factura.television > 0 && (
                              <div className="flex justify-between">
                                <span>Televisión:</span>
                                <span>{formatearMoneda(factura.television)}</span>
                              </div>
                            )}
                            {factura.varios > 0 && (
                              <div className="flex justify-between">
                                <span>Varios:</span>
                                <span>{formatearMoneda(factura.varios)}</span>
                              </div>
                            )}
                            {factura.publicidad > 0 && (
                              <div className="flex justify-between">
                                <span>Publicidad:</span>
                                <span>{formatearMoneda(factura.publicidad)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Otros Conceptos</h4>
                          <div className="space-y-1 text-sm">
                            {factura.saldo_anterior > 0 && (
                              <div className="flex justify-between">
                                <span>Saldo Anterior:</span>
                                <span>{formatearMoneda(factura.saldo_anterior)}</span>
                              </div>
                            )}
                            {factura.interes > 0 && (
                              <div className="flex justify-between">
                                <span>Intereses:</span>
                                <span>{formatearMoneda(factura.interes)}</span>
                              </div>
                            )}
                            {factura.reconexion > 0 && (
                              <div className="flex justify-between">
                                <span>Reconexión:</span>
                                <span>{formatearMoneda(factura.reconexion)}</span>
                              </div>
                            )}
                            {factura.descuento > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Descuento:</span>
                                <span>-{formatearMoneda(factura.descuento)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Información Adicional</h4>
                          <div className="space-y-1 text-sm">
                            {factura.periodo_facturacion && (
                              <div>
                                <span className="text-gray-600">Período:</span>
                                <span className="ml-2">{factura.periodo_facturacion}</span>
                              </div>
                            )}
                            {factura.fecha_desde && factura.fecha_hasta && (
                              <div>
                                <span className="text-gray-600">Servicio:</span>
                                <span className="ml-2">
                                  {formatearFecha(factura.fecha_desde)} - {formatearFecha(factura.fecha_hasta)}
                                </span>
                              </div>
                            )}
                            {factura.observaciones && (
                              <div>
                                <span className="text-gray-600">Observaciones:</span>
                                <p className="mt-1 text-gray-900">{factura.observaciones}</p>
                              </div>
                            )}
                          </div>
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

      {/* Mobile Cards */}
      <div className="md:hidden">
        {facturas.map((factura) => (
          <div key={factura.id} className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-900">
                {factura.numero_factura}
              </div>
              {getBadgeEstado(factura.estado)}
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {factura.nombre_cliente}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatearFecha(factura.fecha_emision)}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatearMoneda(factura.total)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Vence: {formatearFecha(factura.fecha_vencimiento)}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onVerPDF && onVerPDF(factura.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDescargarPDF && onDescargarPDF(factura.id)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                >
                  <Download className="h-4 w-4" />
                </button>
                {factura.estado === 'pendiente' && (
                  <button
                    onClick={() => onMarcarPagada && onMarcarPagada(factura)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <Pagination />
    </div>
  );
};

export default FacturasList;