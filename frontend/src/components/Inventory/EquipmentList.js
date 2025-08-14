// frontend/src/components/Inventory/EquipmentList.js

import React from 'react';
import inventoryService from '../../services/inventoryService';
import { getStateColor, getStateLabel, getTypeIcon } from '../../constants/inventoryConstants';

const EquipmentList = ({
  equipos,
  pagination,
  loading,
  userRole,
  onEdit,
  onDelete,
  onAssign,
  onReturn,
  onHistory,
  onPageChange
}) => {

  // Obtener color del estado
  const getStateColor = (estado) => {
    const colors = {
      'disponible': 'bg-green-100 text-green-800',
      'asignado': 'bg-blue-100 text-blue-800',
      'instalado': 'bg-purple-100 text-purple-800',
      'dañado': 'bg-red-100 text-red-800',
      'perdido': 'bg-gray-100 text-gray-800',
      'mantenimiento': 'bg-yellow-100 text-yellow-800',
      'devuelto': 'bg-indigo-100 text-indigo-800'
    };
    return colors[estado] || 'bg-gray-100 text-gray-800';
  };

  // Obtener icono del tipo
  const getTypeIcon = (tipo) => {
    const icons = {
      'router': '📡',
      'decodificador': '📺',
      'cable': '🔌',
      'antena': '📡',
      'splitter': '🔀',
      'amplificador': '🔊',
      'otro': '📦'
    };
    return icons[tipo] || '📦';
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Formatear precio
  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Renderizar acciones según rol y estado
  const renderActions = (equipo) => {
    const canEdit = userRole !== 'instalador';
    const canDelete = userRole === 'administrador';
    const canAssign = userRole !== 'instalador' && equipo.estado === 'disponible';
    const canReturn = equipo.estado === 'asignado' || equipo.estado === 'instalado';

    return (
      <div className="flex space-x-2">
        {/* Ver historial */}
        <button
          onClick={() => onHistory(equipo)}
          className="text-gray-600 hover:text-gray-800 p-1 rounded"
          title="Ver historial"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Editar */}
        {canEdit && (
          <button
            onClick={() => onEdit(equipo)}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
            title="Editar equipo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* Asignar */}
        {canAssign && (
          <button
            onClick={() => onAssign(equipo)}
            className="text-green-600 hover:text-green-800 p-1 rounded"
            title="Asignar a instalador"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
        )}

        {/* Devolver */}
        {canReturn && (
          <button
            onClick={() => onReturn(equipo)}
            className="text-yellow-600 hover:text-yellow-800 p-1 rounded"
            title="Devolver equipo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        )}

        {/* Eliminar */}
        {canDelete && equipo.estado === 'disponible' && (
          <button
            onClick={() => onDelete(equipo)}
            className="text-red-600 hover:text-red-800 p-1 rounded"
            title="Eliminar equipo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!equipos || equipos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay equipos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {userRole !== 'instalador' ? 'Comienza creando un nuevo equipo.' : 'No tienes equipos asignados.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Tabla para pantallas grandes */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instalador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Asignación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {equipos.map((equipo) => (
              <tr key={equipo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getTypeIcon(equipo.tipo)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {equipo.codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {equipo.nombre}
                      </div>
                      {equipo.marca && (
                        <div className="text-xs text-gray-400">
                          {equipo.marca} {equipo.modelo && `- ${equipo.modelo}`}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(equipo.estado)}`}>
                    {inventoryService.getStateLabel(equipo.estado)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {equipo.instalador_nombre || '-'}
                  {equipo.instalador_telefono && (
                    <div className="text-xs text-gray-500">
                      {equipo.instalador_telefono}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {equipo.ubicacion_actual || equipo.ubicacion || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(equipo.fecha_asignacion)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(equipo.precio_compra)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {renderActions(equipo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden">
        {equipos.map((equipo) => (
          <div key={equipo.id} className="border-b border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getTypeIcon(equipo.tipo)}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {equipo.codigo}
                  </div>
                  <div className="text-sm text-gray-500">
                    {equipo.nombre}
                  </div>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(equipo.estado)}`}>
                {inventoryService.getStateLabel(equipo.estado)}
              </span>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Instalador:</span>
                <div className="font-medium">{equipo.instalador_nombre || '-'}</div>
              </div>
              <div>
                <span className="text-gray-500">Precio:</span>
                <div className="font-medium">{formatPrice(equipo.precio_compra)}</div>
              </div>
            </div>
            
            <div className="mt-3 flex justify-end">
              {renderActions(equipo)}
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando {' '}
                <span className="font-medium">
                  {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}
                </span> a {' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                </span> de {' '}
                <span className="font-medium">{pagination.totalItems}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginación">
                <button
                  onClick={() => onPageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Números de página */}
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  const isCurrentPage = pageNum === pagination.currentPage;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        isCurrentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;