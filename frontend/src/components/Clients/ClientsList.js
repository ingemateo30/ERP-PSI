import React from 'react';
import { Eye, Edit, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { CLIENT_STATE_LABELS, CLIENT_STATE_COLORS, PAGINATION_CONFIG } from '../../constants/clientConstants';

const ClientsList = ({
  clients,
  pagination,
  loading,
  onClientSelect,
  onEditClient,
  onPageChange,
  onLimitChange,
  permissions
}) => {
  // Función para obtener el color del estado
  const getStateColor = (state) => {
    const colorClass = CLIENT_STATE_COLORS[state] || 'gray';
    return {
      'green': 'bg-green-100 text-green-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'red': 'bg-red-100 text-red-800',
      'gray': 'bg-gray-100 text-gray-800',
      'slate': 'bg-slate-100 text-slate-800'
    }[colorClass];
  };

  // Formatear teléfono
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay clientes
          </h3>
          <p className="text-gray-500">
            No se encontraron clientes con los filtros aplicados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header de la tabla */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Clientes ({pagination.totalItems?.toLocaleString() || 0})
          </h3>
          
          {/* Selector de elementos por página */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Mostrar:</label>
            <select
              value={pagination.itemsPerPage}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              {PAGINATION_CONFIG.LIMIT_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-700">por página</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
                onClick={() => onClientSelect(client)}
              >
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
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {client.telefono && (
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {formatPhone(client.telefono)}
                      </div>
                    )}
                    {client.correo && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        {client.correo}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      <span className="truncate max-w-32">
                        {client.direccion}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {client.sector_nombre && (
                        <span>{client.sector_nombre}</span>
                      )}
                      {client.ciudad_nombre && (
                        <span>{client.sector_nombre ? ', ' : ''}{client.ciudad_nombre}</span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(client.estado)}`}>
                    {CLIENT_STATE_LABELS[client.estado] || client.estado}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(client.fecha_registro || client.created_at)}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClientSelect(client);
                      }}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {permissions.canEdit && onEditClient && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClient(client);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-1 text-sm text-gray-700">
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;