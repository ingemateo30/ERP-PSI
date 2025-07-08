// frontend/src/components/Clients/FacturasClienteCompleto.js
// Componente para mostrar facturas generadas desde cliente completo

import React, { useState, useEffect } from 'react';
import { clienteCompletoService } from '../../services/clienteCompletoService';

const FacturasClienteCompleto = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filtros, setFiltros] = useState({
    estado: '',
    cliente_id: ''
  });

  // Cargar facturas al montar el componente
  useEffect(() => {
    cargarFacturas();
  }, [pagination.page, filtros]);

  const cargarFacturas = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filtros
      };

      const response = await clienteCompletoService.getFacturasGeneradas(params);

      if (response?.data?.facturas) {
        setFacturas(response.data.facturas);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      }

    } catch (err) {
      console.error('Error cargando facturas:', err);
      setError(err.message || 'Error cargando facturas');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleFilterChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPagination(prev => ({
      ...prev,
      page: 1 // Resetear a primera página al filtrar
    }));
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const formatearMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(monto);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pagada': return 'text-green-600 bg-green-100';
      case 'pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'vencida': return 'text-red-600 bg-red-100';
      case 'anulada': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Cargando facturas...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Facturas Generadas Automáticamente
          </h2>
          <p className="text-gray-600 mt-1">
            Facturas creadas desde el módulo de Cliente Completo
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={filtros.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagada">Pagadas</option>
            <option value="vencida">Vencidas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Cliente
          </label>
          <input
            type="text"
            value={filtros.cliente_id}
            onChange={(e) => handleFilterChange('cliente_id', e.target.value)}
            placeholder="Filtrar por cliente..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={cargarFacturas}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabla de facturas */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Emisión
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Vencimiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
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
            {facturas.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No hay facturas generadas
                </td>
              </tr>
            ) : (
              facturas.map((factura) => (
                <tr key={factura.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {factura.numero_factura}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {factura.cliente_nombre}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factura.cliente_identificacion}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatearFecha(factura.fecha_emision)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatearFecha(factura.fecha_vencimiento)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatearMonto(factura.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(factura.estado)}`}>
                      {factura.estado?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {/* Ver detalles */}}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => {/* Descargar PDF */}}
                        className="text-green-600 hover:text-green-900"
                        title="Descargar PDF"
                      >
                        📄
                      </button>
                      {factura.estado === 'pendiente' && (
                        <button
                          onClick={() => {/* Marcar como pagada */}}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Marcar como pagada"
                        >
                          💰
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
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} facturas
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleChangePage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md">
              {pagination.page} de {pagination.totalPages}
            </span>
            <button
              onClick={() => handleChangePage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasClienteCompleto;