// frontend/src/components/Facturas/FacturacionAutomatica.js - ERROR JSX CORREGIDO

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
      
      setFacturasData({
        facturas: response.data?.facturas || [],
        loading: false,
        error: null
      });
      
      setPaginacion(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setFacturasData({
        facturas: [],
        loading: false,
        error: error.message
      });
    }
  };

  const generarPreview = async () => {
    setLoading(true);
    try {
      const response = await facturasService.validarIntegridadDatos();
      setPreview(response.data);
    } catch (error) {
      console.error('Error generando preview:', error);
      setPreview({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const ejecutarFacturacionMensual = async () => {
    if (!hasPermission('administrador')) {
      alert('No tienes permisos para ejecutar la facturación masiva');
      return;
    }

    const confirmacion = window.confirm(
      '¿Estás seguro de ejecutar la facturación mensual masiva? Esta acción no se puede deshacer.'
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

        {/* Estadísticas Principales */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Control de Facturación</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={generarPreview}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              {loading ? 'Generando...' : 'Vista Previa'}
            </button>

            {hasPermission('administrador') && (
              <button
                onClick={ejecutarFacturacionMensual}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  'Ejecutar Facturación Mensual'
                )}
              </button>
            )}
          </div>

          {/* Mostrar preview si existe */}
          {preview && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Vista Previa de Facturación</h3>
              {preview.error ? (
                <p className="text-red-600">{preview.error}</p>
              ) : (
                <div className="text-sm text-blue-800">
                  <p>Clientes a facturar: {preview.total_clientes || 0}</p>
                  <p>Monto estimado: ${(preview.monto_estimado || 0).toLocaleString('es-CO')}</p>
                </div>
              )}
            </div>
          )}

          {/* Mostrar resultado si existe */}
          {resultado && (
            <div className={`mt-6 p-4 rounded-lg ${resultado.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h3 className={`text-lg font-medium mb-2 ${resultado.error ? 'text-red-900' : 'text-green-900'}`}>
                {resultado.error ? 'Error en Facturación' : 'Facturación Completada'}
              </h3>
              {resultado.error ? (
                <p className="text-red-600">{resultado.error}</p>
              ) : (
                <div className="text-sm text-green-800">
                  <p>Facturas generadas: {resultado.facturas_generadas || 0}</p>
                  <p>Monto total: ${(resultado.monto_total || 0).toLocaleString('es-CO')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de Facturas Recientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Facturas Recientes</h2>
          
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
                        ${factura.total?.toLocaleString('es-CO')}
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
    </div>
  );
};

export default FacturacionAutomatica;