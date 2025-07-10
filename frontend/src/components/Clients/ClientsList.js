// =============================================
// FRONTEND: frontend/src/components/Clients/ClientsList.js - CORREGIDO
// =============================================

import React from 'react';
import { 
  Eye, Edit, Trash2, UserX, Phone, Mail, MapPin, 
  Calendar, ChevronLeft, ChevronRight, AlertCircle,
  RefreshCw, User
} from 'lucide-react';

const ClientsList = ({ 
  clients = [], 
  pagination = {}, 
  loading = false,
  onClientSelect,
  onEditClient,
  onDeleteClient,
  onInactivarCliente, // ⭐ NUEVA PROP PARA INACTIVAR
  onPageChange,
  onLimitChange,
  permissions = {}
}) => {

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  // Obtener color del estado
  const getEstadoColor = (estado) => {
    const colores = {
      'activo': 'bg-green-100 text-green-800',
      'suspendido': 'bg-yellow-100 text-yellow-800', 
      'cortado': 'bg-red-100 text-red-800',
      'retirado': 'bg-gray-100 text-gray-800',
      'inactivo': 'bg-gray-100 text-gray-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  // Renderizar acciones
  const renderActions = (client) => (
    <div className="flex items-center gap-2">
      {/* Ver detalles */}
      {permissions.canRead && onClientSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClientSelect(client);
          }}
          className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Editar */}
      {permissions.canUpdate && onEditClient && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditClient(client);
          }}
          className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
          title="Editar cliente"
        >
          <Edit className="w-4 h-4" />
        </button>
      )}

      {/* ⭐ NUEVO: Botón inactivar - Solo para clientes activos */}
      {permissions.canDelete && onInactivarCliente && client.estado === 'activo' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInactivarCliente(client);
          }}
          className="text-orange-600 hover:text-orange-800 p-1 rounded transition-colors"
          title="Inactivar cliente"
        >
          <UserX className="w-4 h-4" />
        </button>
      )}

      {/* Eliminar */}
      {permissions.canDelete && onDeleteClient && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`¿Está seguro de eliminar al cliente ${client.nombre}?`)) {
              onDeleteClient(client.id);
            }
          }}
          className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
          title="Eliminar cliente"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Cargando clientes...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col items-center justify-center py-12">
          <User className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay clientes registrados
          </h3>
          <p className="text-gray-500 text-center">
            Comience agregando el primer cliente al sistema
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registro
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onClientSelect && onClientSelect(client)}
              >
                {/* Datos del cliente */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {client.nombre}
                    </div>
                    <div className="text-sm text-gray-500">
                      {client.identificacion}
                    </div>
                  </div>
                </td>

                {/* Contacto */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {client.telefono && (
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {client.telefono}
                      </div>
                    )}
                    {client.correo && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {client.correo}
                      </div>
                    )}
                  </div>
                </td>

                {/* Ubicación */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="truncate max-w-xs">
                        {client.direccion}
                      </span>
                    </div>
                    {(client.barrio || client.sector_nombre) && (
                      <div className="text-xs text-gray-500">
                        {[client.barrio, client.sector_nombre].filter(Boolean).join(' - ')}
                      </div>
                    )}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(client.estado)}`}>
                    {client.estado}
                  </span>
                </td>

                {/* Fecha de registro */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatearFecha(client.fecha_registro)}
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {renderActions(client)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando{' '}
              <span className="font-medium">
                {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}
              </span>{' '}
              a{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
              </span>{' '}
              de{' '}
              <span className="font-medium">
                {pagination.totalItems}
              </span>{' '}
              resultados
            </div>
            
            <div className="flex items-center gap-2">
              {/* Selector de elementos por página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mostrar:</span>
                <select
                  value={pagination.itemsPerPage || 10}
                  onChange={(e) => onLimitChange && onLimitChange(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Controles de paginación */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;