// frontend/src/components/Facturas/FacturacionAutomatica.js
// Componente para Facturación Automática siguiendo la estructura existente del proyecto

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

const FacturacionAutomatica = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
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

  const { currentUser, hasPermission } = useAuth();

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
      setEstadisticas(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
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

      const response = await facturasService.getAll(params);
      
      setFacturas(response.data.facturas);
      setPaginacion(prev => ({
        ...prev,
        total: response.data.pagination.total
      }));
      
      setFacturasData(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setFacturasData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  };

  const generarPreview = async () => {
    setLoading(true);
    try {
      const response = await facturasService.generarFacturacionMensual({
        solo_preview: true,
        fecha_referencia: new Date().toISOString()
      });
      setPreview(response.data);
    } catch (error) {
      console.error('Error generando preview:', error);
      alert(`Error: ${error.message || 'Error de conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarFacturacionMensual = async () => {
    if (!window.confirm('¿Está seguro de ejecutar la facturación mensual? Esta acción no se puede deshacer.')) {
  return;
}

    setLoading(true);
    try {
      const response = await facturasService.generarFacturacionMensual({
        fecha_referencia: new Date().toISOString()
      });
      setResultado(response.data);
      alert(`Facturación completada: ${response.data.exitosas} exitosas, ${response.data.fallidas} fallidas`);
      cargarFacturas();
      cargarEstadisticas();
    } catch (error) {
      console.error('Error ejecutando facturación:', error);
      alert(`Error: ${error.message || 'Error de conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  const generarFacturaIndividual = async (clienteId) => {
    setLoading(true);
    try {
      const response = await facturasService.generarFacturaIndividual(clienteId);
      alert(`Factura generada: ${response.data.numero_factura}`);
      cargarFacturas();
    } catch (error) {
      console.error('Error generando factura individual:', error);
      alert(`Error: ${error.message || 'Error de conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COMPONENTES DE UI
  // ==========================================

  const TarjetaEstadistica = ({ titulo, valor, icono: Icono, color, subtitulo, loading }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow duration-200" 
         style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{titulo}</p>
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
              <span className="text-lg text-gray-400">Cargando...</span>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
            </p>
          )}
          {subtitulo && !loading && <p className="text-sm text-gray-500 mt-1">{subtitulo}</p>}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icono className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  const TablaFacturas = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Facturas Recientes</h3>
        <p className="text-sm text-gray-500 mt-1">Gestión de facturas del sistema</p>
      </div>
      
      {facturasData.loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin h-6 w-6 text-[#0e6493] mr-3" />
          <span className="text-gray-600">Cargando facturas...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
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
                  Total
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
              {facturas.map((factura) => (
                <tr key={factura.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {factura.numero_factura}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {factura.nombre_cliente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(factura.fecha_emision).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${Number(factura.total).toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      factura.estado === 'pagada' ? 'bg-green-100 text-green-800' :
                      factura.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      factura.estado === 'vencida' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {factura.estado_descripcion || factura.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-[#0e6493] hover:text-[#0e6493]/80 transition-colors"
                        onClick={() => window.open(`/api/v1/facturacion/facturas/${factura.id}/ver-pdf`, '_blank')}
                        title="Ver PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-700 transition-colors"
                        onClick={() => window.open(`/api/v1/facturacion/facturas/${factura.id}/pdf`, '_blank')}
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {((paginacion.page - 1) * paginacion.limit) + 1} - {Math.min(paginacion.page * paginacion.limit, paginacion.total)} de {paginacion.total} facturas
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={paginacion.page === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Página {paginacion.page} de {Math.ceil(paginacion.total / paginacion.limit)}
          </span>
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={paginacion.page >= Math.ceil(paginacion.total / paginacion.limit)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );

  const PanelPreview = () => {
    if (!preview) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vista Previa de Facturación</h3>
          <span className="text-sm text-gray-500">Simulación sin impacto</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <TarjetaEstadistica
            titulo="Total Clientes"
            valor={preview.total_clientes}
            icono={Users}
            color="#0e6493"
          />
          <TarjetaEstadistica
            titulo="Primera Factura"
            valor={preview.clientes_primera_factura}
            icono={FileText}
            color="#10B981"
          />
          <TarjetaEstadistica
            titulo="Nivelación"
            valor={preview.clientes_nivelacion}
            icono={TrendingUp}
            color="#F59E0B"
          />
          <TarjetaEstadistica
            titulo="Ingresos Estimados"
            valor={`$${preview.estimado_ingresos.toLocaleString('es-CO')}`}
            icono={DollarSign}
            color="#8B5CF6"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Cliente</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Tipo</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Días</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Servicios</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Total Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preview.detalles.slice(0, 10).map((detalle, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{detalle.cliente_nombre}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      detalle.tipo_facturacion === 'primera' ? 'bg-green-100 text-green-800' :
                      detalle.tipo_facturacion === 'nivelacion' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {detalle.tipo_facturacion}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{detalle.dias_facturados}</td>
                  <td className="px-4 py-2 text-gray-600">{detalle.servicios}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">${detalle.total_estimado.toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.detalles.length > 10 && (
          <p className="text-sm text-gray-500 mt-3 text-center">
            Mostrando 10 de {preview.detalles.length} clientes. Vista completa después de ejecutar.
          </p>
        )}
      </div>
    );
  };

  const PanelResultado = () => {
    if (!resultado) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resultado de Facturación</h3>
          <span className="text-sm text-green-600 font-medium">✓ Completado</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <TarjetaEstadistica
            titulo="Facturas Exitosas"
            valor={resultado.exitosas}
            icono={CheckCircle}
            color="#10B981"
          />
          <TarjetaEstadistica
            titulo="Facturas Fallidas"
            valor={resultado.fallidas}
            icono={XCircle}
            color="#EF4444"
          />
          <TarjetaEstadistica
            titulo="Total Generadas"
            valor={resultado.facturas_generadas.length}
            icono={FileText}
            color="#0e6493"
          />
        </div>

        {resultado.errores.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Errores Encontrados:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {resultado.errores.slice(0, 5).map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span>{error.nombre} (ID: {error.cliente_id}): {error.error}</span>
                </li>
              ))}
            </ul>
            {resultado.errores.length > 5 && (
              <p className="text-sm text-red-600 mt-2 font-medium">
                Y {resultado.errores.length - 5} errores más...
              </p>
            )}
          </div>
        )}

        {resultado.facturas_generadas.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">📄 Facturas Generadas:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Número</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Cliente</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Período</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {resultado.facturas_generadas.slice(0, 10).map((factura, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-[#0e6493]">{factura.numero_factura}</td>
                      <td className="px-4 py-2 text-gray-900">{factura.cliente_nombre}</td>
                      <td className="px-4 py-2 text-gray-600">{factura.periodo}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">${factura.total.toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Facturación Automática</h1>
            <p className="text-gray-600">
              Sistema automatizado de facturación mensual PSI
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                cargarFacturas();
                cargarEstadisticas();
              }}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Principales */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TarjetaEstadistica
            titulo="Total Facturado"
            valor={`$${estadisticas.generales?.total_facturado?.toLocaleString('es-CO') || '0'}`}
            icono={DollarSign}
            color="#10B981"
            subtitulo={`Período: ${filtros.fecha_desde} - ${filtros.fecha_hasta}`}
          />
          <TarjetaEstadistica
            titulo="Facturas Generadas"
            valor={estadisticas.generales?.total_facturas || 0}
            icono={FileText}
            color="#0e6493"
            subtitulo={`Promedio: $${(estadisticas.generales?.promedio_factura || 0).toLocaleString('es-CO')}`}
          />
          <TarjetaEstadistica
            titulo="Pendientes de Pago"
            valor={`$${(estadisticas.generales?.total_pendiente || 0).toLocaleString('es-CO')}`}
            icono={Clock}
            color="#F59E0B"
            subtitulo="Cartera por cobrar"
          />
          <TarjetaEstadistica
            titulo="Pagos Recibidos"
            valor={`$${(estadisticas.generales?.total_pagado || 0).toLocaleString('es-CO')}`}
            icono={CheckCircle}
            color="#8B5CF6"
            subtitulo={`${((estadisticas.generales?.total_pagado / estadisticas.generales?.total_facturado * 100) || 0).toFixed(1)}% efectividad`}
          />
        </div>
      )}

      {/* Panel de Control de Facturación */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Control de Facturación</h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={generarPreview}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] disabled:opacity-50 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            {loading ? 'Generando...' : 'Vista Previa'}
          </button>

          {hasPermission('administrador') && (
            <button
              onClick={ejecutarFacturacionMensual}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#0e6493] hover:bg-[#0e6493]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Procesando...' : 'Ejecutar Facturación'}
            </button>
          )}

          <button
            onClick={() => window.open('/api/v1/facturacion/reportes/resumen', '_blank')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0e6493] transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Reportes
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="inline-flex items-center text-[#0e6493]">
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              <span className="text-lg font-medium">Procesando facturación...</span>
            </div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Consulta</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0e6493] focus:border-[#0e6493] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0e6493] focus:border-[#0e6493] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0e6493] focus:border-[#0e6493] transition-colors"
            >
              <option value="">Todos los estados</option>
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
              placeholder="ID del cliente"
              value={filtros.cliente_id}
              onChange={(e) => setFiltros(prev => ({ ...prev, cliente_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#0e6493] focus:border-[#0e6493] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Paneles de Preview y Resultado */}
      <PanelPreview />
      <PanelResultado />

      {/* Tabla de Facturas */}
      <TablaFacturas />

      {/* Información del Sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <h4 className="font-semibold mb-3 text-blue-900">Información del Sistema de Facturación Automática</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-900 mb-2">📅 Proceso de Facturación:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• Primera factura: Desde fecha de activación por 30 días</li>
                  <li>• Segunda factura: Se nivela al período mensual estándar</li>
                  <li>• Facturación regular: Del día 1 al 30/31 de cada mes</li>
                  <li>• Ejecución automática: Día 1 de cada mes a las 6:00 AM</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-900 mb-2">💰 Aplicación de Impuestos:</h5>
                <ul className="space-y-1 text-blue-700">
                  <li>• Internet: Sin IVA para estratos 1, 2 y 3</li>
                  <li>• Televisión: Siempre aplica IVA del 19%</li>
                  <li>• Instalación: $42,016 + IVA en primera factura</li>
                  <li>• Intereses por mora: Después de 30 días de vencimiento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacturacionAutomatica;