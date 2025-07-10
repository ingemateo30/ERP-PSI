// =============================================
// FRONTEND: COMPONENTE CLIENTES INACTIVOS
// =============================================

// frontend/src/components/Clients/ClientesInactivos.js
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, RefreshCw, UserCheck, Calendar,
  Clock, AlertTriangle, Eye, FileText
} from 'lucide-react';
import { clientService } from '../../services/clientService';

const ClientesInactivos = ({ onVolver, permissions }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Cargar clientes inactivos
  useEffect(() => {
    cargarClientesInactivos();
  }, [pagination.page, pagination.limit, searchTerm]);

  const cargarClientesInactivos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await clientService.getClientesInactivos({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });

      if (response.success) {
        setClientes(response.data.clientes || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      } else {
        throw new Error(response.message || 'Error al cargar clientes inactivos');
      }

    } catch (error) {
      console.error('Error cargando clientes inactivos:', error);
      setError(error.message);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const getMotivoColor = (motivo) => {
    const colores = {
      'voluntario': 'bg-blue-100 text-blue-800',
      'mora': 'bg-red-100 text-red-800',
      'traslado': 'bg-yellow-100 text-yellow-800',
      'fallecimiento': 'bg-gray-100 text-gray-800',
      'duplicado': 'bg-orange-100 text-orange-800',
      'otro': 'bg-purple-100 text-purple-800'
    };
    return colores[motivo] || 'bg-gray-100 text-gray-800';
  };

  const getMotivoLabel = (motivo) => {
    const labels = {
      'voluntario': 'Voluntario',
      'mora': 'Por Mora',
      'traslado': 'Traslado',
      'fallecimiento': 'Fallecimiento',
      'duplicado': 'Duplicado',
      'otro': 'Otro'
    };
    return labels[motivo] || motivo;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onVolver}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clientes Inactivos</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total || 0} clientes inactivos registrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar clientes inactivos..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>

            {/* Refrescar */}
            <button
              onClick={cargarClientesInactivos}
              disabled={loading}
              className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            onClick={cargarClientesInactivos}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Lista de clientes inactivos */}
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
                  Fecha Inactivación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo Inactivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-gray-500">Cargando clientes inactivos...</span>
                    </div>
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No hay clientes inactivos</p>
                      <p className="text-sm">
                        {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Todos los clientes están activos'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cliente.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cliente.identificacion}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {cliente.telefono || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cliente.direccion || 'Sin dirección'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatearFecha(cliente.fecha_inactivacion)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMotivoColor(cliente.motivo_inactivacion)}`}>
                        {getMotivoLabel(cliente.motivo_inactivacion)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {cliente.dias_inactivo || 0} días
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {permissions.canView && (
                          <button
                            onClick={() => {/* Abrir modal de detalles */}}
                            className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        
                        {permissions.canView && (
                          <button
                            onClick={() => {/* Mostrar observaciones */}}
                            className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                            title="Ver observaciones"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        
                        {permissions.canReactivate && (
                          <button
                            onClick={() => {/* Reactivar cliente */}}
                            className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                            title="Reactivar cliente"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && clientes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} clientes inactivos
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                <span className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md">
                  {pagination.page} de {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ClientesInactivos;