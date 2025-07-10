// frontend/src/components/Contratos/ContratosList.js
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Edit, 
  Search, 
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import contratosService from '../../services/contratosService';

const ContratosList = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    search: '',
    estado: '',
    tipo_contrato: '',
    page: 1,
    limit: 10
  });
  const [estadisticas, setEstadisticas] = useState(null);
  const [paginacion, setPaginacion] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  // Cargar contratos
  useEffect(() => {
    cargarContratos();
  }, [filtros]);

  // Cargar estadísticas al montar
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarContratos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await contratosService.obtenerTodos(filtros);
      
      if (response.success) {
        setContratos(response.data.contratos || []);
        setPaginacion(response.data.pagination || {});
      } else {
        setError(response.message || 'Error cargando contratos');
      }
    } catch (err) {
      console.error('Error cargando contratos:', err);
      setError(err.message || 'Error cargando contratos');
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await contratosService.obtenerEstadisticas();
      if (response.success) {
        setEstadisticas(response.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1 // Resetear página al cambiar filtros
    }));
  };

  const handleDescargarPDF = async (contratoId) => {
    try {
      await contratosService.generarPDF(contratoId, true);
    } catch (err) {
      console.error('Error descargando PDF:', err);
      alert('Error al descargar el PDF del contrato');
    }
  };

  const handleCambiarEstado = async (contratoId, nuevoEstado) => {
    try {
      const motivo = prompt(`Ingrese el motivo para cambiar a "${nuevoEstado}":`);
      if (!motivo) return;

      await contratosService.actualizarEstado(contratoId, {
        estado: nuevoEstado,
        observaciones: motivo
      });

      await cargarContratos();
      await cargarEstadisticas();
      
      alert('Estado del contrato actualizado exitosamente');
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('Error al cambiar el estado del contrato');
    }
  };

  const obtenerIconoEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'vencido':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'terminado':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'anulado':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'vencido':
        return 'bg-orange-100 text-orange-800';
      case 'terminado':
        return 'bg-gray-100 text-gray-800';
      case 'anulado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && contratos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Cargando contratos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Contratos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.total_contratos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.contratos_activos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.contratos_vencidos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <User className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Firmados</p>
                <p className="text-2xl font-bold text-gray-900">{estadisticas.contratos_firmados}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => handleFiltroChange('search', e.target.value)}
                placeholder="Número, cliente, identificación..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => handleFiltroChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="vencido">Vencido</option>
              <option value="terminado">Terminado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filtros.tipo_contrato}
              onChange={(e) => handleFiltroChange('tipo_contrato', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="servicio">Servicio</option>
              <option value="permanencia">Permanencia</option>
              <option value="comercial">Comercial</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFiltros({
                search: '',
                estado: '',
                tipo_contrato: '',
                page: 1,
                limit: 10
              })}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permanencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contratos.map((contrato) => (
                <tr key={contrato.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contrato.numero_contrato}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contrato.tipo_contrato}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contrato.cliente_nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contrato.cliente_identificacion}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contrato.plan_nombre || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contrato.plan_precio ? 
                          new Intl.NumberFormat('es-CO', { 
                            style: 'currency', 
                            currency: 'COP' 
                          }).format(contrato.plan_precio)
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {obtenerIconoEstado(contrato.estado)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${obtenerColorEstado(contrato.estado)}`}>
                        {contrato.estado}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contrato.tipo_permanencia === 'con_permanencia' 
                      ? `${contrato.permanencia_meses || 0} meses`
                      : 'Sin permanencia'
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contrato.fecha_generacion ? 
                      new Date(contrato.fecha_generacion).toLocaleDateString('es-CO')
                      : 'N/A'
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleDescargarPDF(contrato.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {contrato.estado === 'activo' && (
                        <button
                          onClick={() => handleCambiarEstado(contrato.id, 'terminado')}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
                          title="Terminar contrato"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {contrato.estado !== 'anulado' && (
                        <button
                          onClick={() => handleCambiarEstado(contrato.id, 'anulado')}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Anular contrato"
                        >
                          <AlertTriangle className="w-4 h-4" />
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
        {paginacion.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handleFiltroChange('page', Math.max(1, filtros.page - 1))}
                  disabled={filtros.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handleFiltroChange('page', Math.min(paginacion.totalPages, filtros.page + 1))}
                  disabled={filtros.page >= paginacion.totalPages}
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
                      {((filtros.page - 1) * filtros.limit) + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(filtros.page * filtros.limit, paginacion.total)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{paginacion.total}</span>{' '}
                    resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handleFiltroChange('page', Math.max(1, filtros.page - 1))}
                      disabled={filtros.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handleFiltroChange('page', Math.min(paginacion.totalPages, filtros.page + 1))}
                      disabled={filtros.page >= paginacion.totalPages}
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

      {/* Mensaje si no hay contratos */}
      {!loading && contratos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay contratos</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filtros.search || filtros.estado || filtros.tipo_contrato
              ? 'No se encontraron contratos con los filtros aplicados.'
              : 'Aún no se han generado contratos en el sistema.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ContratosList;