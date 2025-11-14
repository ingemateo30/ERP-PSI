// frontend/src/components/Facturas/FacturasList.js - CORREGIDO: Sin alertas de mora en facturas pagadas
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
  MapPin,
  ChevronDown,
  ChevronUp
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

  // ==========================================
  // UTILIDADES DE FORMATO
  // ==========================================
  
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ==========================================
  // FUNCIÓN CRÍTICA: CALCULAR DÍAS DE VENCIMIENTO
  // ==========================================
  const calcularDiasVencimiento = (factura) => {
    // IMPORTANTE: Si está pagada o anulada, NO está en mora
    if (factura.estado === 'pagada' || factura.estado === 'anulada') {
      return 0;
    }

    if (!factura.fecha_vencimiento) {
      return 0;
    }

    try {
      const fechaVencimiento = new Date(factura.fecha_vencimiento);
      const fechaActual = new Date();
      
      // Restablecer horas para comparar solo fechas
      fechaVencimiento.setHours(0, 0, 0, 0);
      fechaActual.setHours(0, 0, 0, 0);
      
      const diferenciaMilisegundos = fechaActual - fechaVencimiento;
      const diferenciaDias = Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
      
      // Solo retornar días positivos si está realmente vencida
      return diferenciaDias > 0 ? diferenciaDias : 0;
    } catch (error) {
      console.error('Error calculando días de vencimiento:', error);
      return 0;
    }
  };

  // ==========================================
  // FUNCIÓN CRÍTICA: DETERMINAR SI ESTÁ EN MORA
  // ==========================================
  const estaEnMora = (factura) => {
    // REGLA PRINCIPAL: Las facturas PAGADAS y ANULADAS NUNCA están en mora
    if (factura.estado === 'pagada' || factura.estado === 'anulada') {
      return false;
    }

    // Solo verificar mora para facturas pendientes o vencidas
    if (factura.estado === 'pendiente' || factura.estado === 'vencida') {
      const diasVencimiento = calcularDiasVencimiento(factura);
      return diasVencimiento > 0;
    }

    return false;
  };

  // ==========================================
  // OBTENER BADGE DE ESTADO CORREGIDO
  // ==========================================
  const getBadgeEstado = (factura) => {
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
      }
    };

    // Determinar el estado visual basado en lógica corregida
    let estadoFinal = factura.estado;
    
    // Si está en mora pero no es el estado oficial, mostrar como vencida
    if (estaEnMora(factura) && factura.estado === 'pendiente') {
      estadoFinal = 'vencida';
    }

    const badge = badges[estadoFinal] || badges.pendiente;
    const IconComponent = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  // ==========================================
  // OBTENER ALERTA DE MORA CORREGIDA
  // ==========================================
  const getAlertaMora = (factura) => {
    // CRÍTICO: NO mostrar alertas de mora para facturas pagadas o anuladas
    if (!estaEnMora(factura)) {
      return null;
    }

    const diasVencimiento = calcularDiasVencimiento(factura);
    
    let colorClase = 'bg-yellow-100 text-yellow-800';
    let icono = '⚠️';
    let mensaje = `${diasVencimiento} día${diasVencimiento > 1 ? 's' : ''} de mora`;

    if (diasVencimiento > 30) {
      colorClase = 'bg-red-100 text-red-800';
      icono = '🚨';
      mensaje = `MORA CRÍTICA: ${diasVencimiento} días`;
    } else if (diasVencimiento > 15) {
      colorClase = 'bg-orange-100 text-orange-800';
      icono = '⚠️';
      mensaje = `Mora alta: ${diasVencimiento} días`;
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClase}`}>
        <span className="mr-1">{icono}</span>
        {mensaje}
      </span>
    );
  };

  // ==========================================
  // OBTENER ACCIONES DISPONIBLES
  // ==========================================
  const getAccionesDisponibles = (factura) => {
    const acciones = [];

    // Ver PDF (siempre disponible)
    acciones.push({
      label: 'Ver PDF',
      icon: Eye,
      onClick: () => onVerPDF && onVerPDF(factura.id),
      color: 'text-blue-600 hover:bg-blue-50'
    });

    // Descargar PDF (siempre disponible)
    acciones.push({
      label: 'Descargar PDF',
      icon: Download,
      onClick: () => onDescargarPDF && onDescargarPDF(factura.id),
      color: 'text-gray-600 hover:bg-gray-50'
    });

    // Editar (solo pendientes y vencidas)
    if (factura.estado === 'pendiente' || factura.estado === 'vencida') {
      acciones.push({
        label: 'Editar',
        icon: Edit,
        onClick: () => onEditarFactura && onEditarFactura(factura),
        color: 'text-blue-600 hover:bg-blue-50'
      });
    }

    // Marcar como pagada (solo pendientes y vencidas)
    if (factura.estado === 'pendiente' || factura.estado === 'vencida') {
      acciones.push({
        label: 'Marcar como Pagada',
        icon: DollarSign,
        onClick: () => onMarcarPagada && onMarcarPagada(factura),
        color: 'text-green-600 hover:bg-green-50'
      });
    }

    // Anular (solo pendientes y vencidas)
    if (factura.estado === 'pendiente' || factura.estado === 'vencida') {
      acciones.push({
        label: 'Anular',
        icon: X,
        onClick: () => onAnularFactura && onAnularFactura(factura),
        color: 'text-red-600 hover:bg-red-50'
      });
    }

    // Duplicar (no anuladas)
    if (factura.estado !== 'anulada') {
      acciones.push({
        label: 'Duplicar',
        icon: Copy,
        onClick: () => onDuplicarFactura && onDuplicarFactura(factura.id),
        color: 'text-purple-600 hover:bg-purple-50'
      });
    }

    return acciones;
  };

  // ==========================================
  // MANEJO DE EVENTOS
  // ==========================================
  
  const toggleExpansion = (facturaId) => {
    setFacturaExpandida(facturaExpandida === facturaId ? null : facturaId);
  };

  const toggleMenu = (facturaId, e) => {
    e.stopPropagation();
    setMenuAbierto(menuAbierto === facturaId ? null : facturaId);
  };

  // ==========================================
  // COMPONENTE DE PAGINACIÓN
  // ==========================================
  const Pagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page = 1, totalPages = 1, total = 0 } = pagination;

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => page > 1 && onCambiarPagina(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={() => page < totalPages && onCambiarPagina(page + 1)}
            disabled={page >= totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando página <span className="font-medium">{page}</span> de{' '}
              <span className="font-medium">{totalPages}</span> ({total} facturas total)
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => page > 1 && onCambiarPagina(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              {/* Números de página */}
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNum = Math.max(1, page - 2) + index;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onCambiarPagina(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNum === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => page < totalPages && onCambiarPagina(page + 1)}
                disabled={page >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER ESTADOS DE CARGA Y ERROR
  // ==========================================
  
  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!facturas || facturas.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay facturas disponibles
          </h3>
          <p className="text-gray-500">
            No se encontraron facturas con los filtros aplicados.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Facturas ({facturas.length})
          </h3>
          <div className="text-sm text-gray-500">
            {pagination.total && `${pagination.total} facturas total`}
          </div>
        </div>
      </div>

      {/* Tabla Desktop */}
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
                Fecha Emisión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => {
              const diasVencimiento = calcularDiasVencimiento(factura);
              const alertaMora = getAlertaMora(factura);
              const acciones = getAccionesDisponibles(factura);
              
              return (
                <React.Fragment key={factura.id}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleExpansion(factura.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {factura.numero_factura}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {factura.id}
                          </div>
                        </div>
                        <div className="ml-2">
                          {facturaExpandida === factura.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {factura.nombre_cliente}
                        </div>
                        <div className="text-sm text-gray-500">
                          {factura.identificacion_cliente}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearFecha(factura.fecha_emision)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatearFecha(factura.fecha_vencimiento)}
                        </div>
                        {/* ALERTA DE MORA CORREGIDA: Solo si está realmente en mora */}
                        {alertaMora && (
                          <div className="mt-1">
                            {alertaMora}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatearMoneda(factura.total)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBadgeEstado(factura)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="relative">
                        <button
                          onClick={(e) => toggleMenu(factura.id, e)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {/* Menú desplegable */}
                        {menuAbierto === factura.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              {acciones.map((accion, index) => {
                                const IconComponent = accion.icon;
                                return (
                                  <button
                                    key={index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      accion.onClick();
                                      setMenuAbierto(null);
                                    }}
                                    className={`flex items-center w-full px-4 py-2 text-sm ${accion.color} transition-colors`}
                                  >
                                    <IconComponent className="w-4 h-4 mr-3" />
                                    {accion.label}
                                  </button>
                                );
                              })}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Información del Cliente</h4>
          <div className="space-y-1 text-gray-600">
            <div>📍 {factura.cliente_direccion || 'No especificada'}</div>
            <div>📞 {factura.cliente_telefono || 'No especificado'}</div>
            <div>✉️ {factura.cliente_email || 'No especificado'}</div>
            {factura.ruta && <div>🛣️ Ruta: {factura.ruta}</div>}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Detalles Financieros</h4>
          <div className="space-y-1 text-gray-600">
            <div>Subtotal: {formatearMoneda(factura.subtotal || 0)}</div>
            <div>Impuestos: {formatearMoneda(factura.iva || 0)}</div>
            <div>Descuentos: {formatearMoneda(factura.descuento || 0)}</div>
            <div className="font-bold text-gray-900">
              Total: {formatearMoneda(factura.total || 0)}
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Estado y Pagos</h4>
          <div className="space-y-1 text-gray-600">
            <div>Estado: {getBadgeEstado(factura)}</div>
            {factura.fecha_pago && (
              <div>Fecha de pago: {formatearFecha(factura.fecha_pago)}</div>
            )}
            {factura.metodo_pago && (
              <div>Método: {factura.metodo_pago}</div>
            )}
            {factura.referencia_pago && (
              <div>Ref: {factura.referencia_pago}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Observaciones */}
      {factura.observaciones && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Observaciones</h4>
          <p className="text-gray-600 text-sm">{factura.observaciones}</p>
        </div>
      )}
    </td>
  </tr>
)}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile */}
      <div className="md:hidden">
        {facturas.map((factura) => {
          const alertaMora = getAlertaMora(factura);
          const acciones = getAccionesDisponibles(factura);
          
          return (
            <div key={factura.id} className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">
                  {factura.numero_factura}
                </div>
                {getBadgeEstado(factura)}
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
              
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  Vence: {formatearFecha(factura.fecha_vencimiento)}
                </div>
                {/* ALERTA DE MORA MOBILE CORREGIDA */}
                {alertaMora && alertaMora}
              </div>
              
              <div className="flex space-x-2 overflow-x-auto">
                {acciones.slice(0, 4).map((accion, index) => {
                  const IconComponent = accion.icon;
                  return (
                    <button
                      key={index}
                      onClick={accion.onClick}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded flex-shrink-0"
                      title={accion.label}
                    >
                      <IconComponent className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      <Pagination />
      
      {/* Overlay del menú para cerrar al hacer clic fuera */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setMenuAbierto(null)}
        />
      )}
    </div>
  );
};

export default FacturasList;