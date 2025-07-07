// frontend/src/components/Facturas/FacturacionAutomatica.js - CORREGIDO

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle as AlertIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { facturasService } from '../../services/facturasService';
import { Card, CardContent } from '../ui/card';

const FacturacionAutomatica = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    total_clientes: 0,
    facturas_generadas: 0,
    monto_total: 0,
    errores: 0
  });
  const [facturas, setFacturas] = useState([]);
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    estado: '',
    cliente_id: ''
  });
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // CORREGIDO: usar 'user' en lugar de 'currentUser'
  const { user, hasPermission } = useAuth();

  // Estados para el componente
  const [facturasData, setFacturasData] = useState({
    facturas: [],
    loading: false,
    error: null
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarEstadisticas();
    cargarFacturas();
  }, [filtros, paginacion.page]);

  // ==========================================
  // FUNCIONES DE API
  // ==========================================

  const cargarEstadisticas = async () => {
    try {
      const response = await facturasService.getEstadisticas({
        fecha_desde: filtros.fecha_desde,
        fecha_hasta: filtros.fecha_hasta
      });
      setEstadisticas(response.data || {
        total_clientes: 0,
        facturas_generadas: 0,
        monto_total: 0,
        errores: 0
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas({
        total_clientes: 0,
        facturas_generadas: 0,
        monto_total: 0,
        errores: 0
      });
    }
  };

  const cargarFacturas = async () => {
    try {
      setFacturasData(prev => ({ ...prev, loading: true, error: null }));
      
      const params = {
        page: paginacion.page,
        limit: paginacion.limit,
        ...filtros
      };

      const response = await facturasService.getFacturas(params);
      
      setFacturasData({
        facturas: response.data?.facturas || [],
        loading: false,
        error: null
      });
      
      setPaginacion(prev => ({
        ...prev,
        total: response.data?.total || 0
      }));
      
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setFacturasData({
        facturas: [],
        loading: false,
        error: error.message || 'Error al cargar facturas'
      });
    }
  };

  const generarPreview = async () => {
    setLoading(true);
    try {
      const response = await facturasService.getPreviewFacturacion({
        periodo: new Date().toISOString().slice(0, 7)
      });
      setPreview(response.data);
    } catch (error) {
      console.error('Error generando preview:', error);
      setPreview({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const ejecutarFacturacion = async () => {
    const confirmacion = window.confirm(
      'Esta acción generará la facturación mensual para todos los clientes activos. ' +
      'Esta acción no se puede deshacer.'
    );

    if (!confirmacion) return;

    setLoading(true);
    try {
      const response = await facturasService.generarFacturacionMensual({
        periodo: new Date().toISOString().slice(0, 7)
      });
      setResultado(response.data);
      await cargarFacturas();
      await cargarEstadisticas();
    } catch (error) {
      console.error('Error ejecutando facturación:', error);
      setResultado({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const exportarFacturas = async () => {
    try {
      const response = await facturasService.exportarFacturas({
        ...filtros,
        formato: 'excel'
      });
      
      // Crear blob y descargar
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando facturas:', error);
    }
  };

  const actualizarFiltros = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginacion(prev => ({
      ...prev,
      page: 1
    }));
  };

  // ==========================================
  // COMPONENTES DE UI
  // ==========================================

  // Componente para tarjetas de estadísticas
  const TarjetaEstadistica = ({ titulo, valor, icono: IconComponent, color, subtitulo }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <IconComponent className="h-8 w-8" style={{ color }} />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{titulo}</dt>
            <dd className="text-lg font-medium text-gray-900">{valor}</dd>
            {subtitulo && <dd className="text-sm text-gray-500">{subtitulo}</dd>}
          </dl>
        </div>
      </div>
    </div>
  );

  // Componente para la tabla de facturas
  const TablaFacturas = () => (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Facturas Recientes
          </h3>
          <button
            onClick={exportarFacturas}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => actualizarFiltros('fecha_desde', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => actualizarFiltros('fecha_hasta', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => actualizarFiltros('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="vencida">Vencida</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente ID
            </label>
            <input
              type="text"
              value={filtros.cliente_id}
              onChange={(e) => actualizarFiltros('cliente_id', e.target.value)}
              placeholder="ID del cliente"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contenido de la tabla */}
        {facturasData.loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : facturasData.error ? (
          <div className="text-center py-8 text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{facturasData.error}</p>
          </div>
        ) : facturasData.facturas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>No hay facturas para mostrar</p>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {facturasData.facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {factura.numero_factura}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {factura.cliente_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(factura.fecha_emision).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${factura.total?.toLocaleString('es-CO') || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        factura.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                        factura.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        factura.estado === 'vencida' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {factura.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facturación Automática</h1>
              <p className="mt-2 text-gray-600">
                Generación masiva y control de facturación mensual
              </p>
            </div>
            <button
              onClick={() => {
                cargarEstadisticas();
                cargarFacturas();
              }}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <TarjetaEstadistica
            titulo="Total Clientes"
            valor={estadisticas.total_clientes?.toLocaleString('es-CO') || '0'}
            icono={Users}
            color="#3B82F6"
          />
          <TarjetaEstadistica
            titulo="Facturas Generadas"
            valor={estadisticas.facturas_generadas?.toLocaleString('es-CO') || '0'}
            icono={FileText}
            color="#10B981"
          />
          <TarjetaEstadistica
            titulo="Monto Total"
            valor={`$${estadisticas.monto_total?.toLocaleString('es-CO') || '0'}`}
            icono={DollarSign}
            color="#F59E0B"
          />
          <TarjetaEstadistica
            titulo="Errores"
            valor={estadisticas.errores?.toLocaleString('es-CO') || '0'}
            icono={AlertTriangle}
            color="#EF4444"
          />
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Panel de Preview */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview de Facturación
                </h3>
                <Eye className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Revisa qué facturas se generarán antes de ejecutar el proceso
              </p>
              <button
                onClick={generarPreview}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 rounded-lg shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Generar Preview
              </button>
            </CardContent>
          </Card>

          {/* Panel de Ejecución */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Facturación Mensual
                </h3>
                <Play className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Ejecuta la facturación mensual para todos los clientes activos
              </p>
              <button
                onClick={ejecutarFacturacion}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Ejecutar Facturación
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Resultados del Preview */}
        {preview && (
          <Card className="mb-8">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resultado del Preview
              </h3>
              {preview.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700">{preview.error}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-700 font-medium">Preview generado exitosamente</p>
                  </div>
                  <div className="text-sm text-green-600">
                    <p>Clientes a facturar: {preview.clientes_count || 0}</p>
                    <p>Monto total estimado: ${preview.monto_total?.toLocaleString('es-CO') || '0'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultados de la Facturación */}
        {resultado && (
          <Card className="mb-8">
            <CardContent>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resultado de la Facturación
              </h3>
              {resultado.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700">{resultado.error}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-700 font-medium">Facturación ejecutada exitosamente</p>
                  </div>
                  <div className="text-sm text-green-600">
                    <p>Facturas generadas: {resultado.facturas_generadas || 0}</p>
                    <p>Monto total: ${resultado.monto_total?.toLocaleString('es-CO') || '0'}</p>
                    <p>Errores: {resultado.errores || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabla de Facturas */}
        <TablaFacturas />
      </div>
    </div>
  );
};

export default FacturacionAutomatica;