// frontend/src/components/Facturas/FacturacionAutomatica.js - ESTILO MEJORADO Y CONSISTENTE

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
  AlertCircle as AlertIcon,
  Settings,
  Activity,
  CreditCard,
  FileSpreadsheet
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
  
  // Inicializar fechas correctamente
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
      const params = {
        fecha_desde: filtros.fecha_desde,
        fecha_hasta: filtros.fecha_hasta
      };

      console.log('📊 Cargando estadísticas con parámetros:', params);
      
      const response = await facturasService.getEstadisticas(params);
      
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
        fecha_desde: filtros.fecha_desde,
        fecha_hasta: filtros.fecha_hasta
      };

      if (filtros.estado) {
        params.estado = filtros.estado;
      }
      if (filtros.cliente_id) {
        params.cliente_id = filtros.cliente_id;
      }

      console.log('📋 Cargando facturas con parámetros:', params);
      
      const response = await facturasService.getFacturas(params);
      
      setFacturas(response.data?.facturas || []);
      setPaginacion(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0
      }));
      
      setFacturasData({
        facturas: response.data?.facturas || [],
        loading: false,
        error: null
      });
      
    } catch (error) {
      console.error('Error cargando facturas:', error);
      setFacturasData({
        facturas: [],
        loading: false,
        error: error.message
      });
    }
  };

const generarFacturacionMensual = async () => {
  try {
    setLoading(true);
    
    const params = {
      fecha_referencia: new Date().toISOString(),
      solo_preview: false
    };

    console.log('🚀 Generando facturación mensual con parámetros:', params);
    
    const response = await facturasService.generarFacturacionMensual(params);
    
    console.log('✅ Respuesta completa:', response);
    console.log('✅ response.data:', response.data);

    // ✅ CORRECCIÓN: Validar que detalles sea un array
    const datos = response.data || response;
    const resultadoValidado = {
      ...datos,
      detalles: Array.isArray(datos?.detalles) ? datos.detalles : [],
      clientes_procesados: datos?.clientes_procesados || 0,
      facturas_generadas: datos?.facturas_generadas || 0,
      errores: datos?.errores || 0,
      tasa_exito: datos?.tasa_exito || '0.00'
    };

    console.log('✅ Resultado validado:', resultadoValidado);
    setResultado(resultadoValidado);
    
    // Recargar datos
    await cargarEstadisticas();
    await cargarFacturas();
    
  } catch (error) {
    console.error('Error generando facturación:', error);
    setResultado({
      success: false,
      message: error.message,
      errores: [error.message],
      detalles: [] // ✅ Asegurar que detalles sea array incluso en error
    });
  } finally {
    setLoading(false);
  }
};
  const obtenerPreview = async () => {
    try {
      setLoading(true);
      
      const params = {
        periodo: new Date().toISOString().slice(0, 7) // YYYY-MM
      };

      console.log('👁️ Obteniendo preview con parámetros:', params);
      
      const response = await facturasService.getPreviewFacturacionMensual(params);
      setPreview(response.data);
      
    } catch (error) {
      console.error('Error obteniendo preview:', error);
      setPreview({
        success: false,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // MANEJADORES DE EVENTOS
  // ==========================================

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    setPaginacion(prev => ({ ...prev, page: 1 }));
  };

  const cambiarPagina = (nuevaPagina) => {
    setPaginacion(prev => ({
      ...prev,
      page: nuevaPagina
    }));
  };

  // ==========================================
  // FUNCIONES DE UTILIDAD
  // ==========================================

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      'pagada': 'bg-green-100 text-green-800 border-green-200',
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'vencida': 'bg-red-100 text-red-800 border-red-200',
      'anulada': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Facturación Automática</h1>
                <p className="text-sm text-gray-500">Gestión y generación automática de facturas mensuales</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={obtenerPreview}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                  <Eye className="w-4 h-4 mr-2" />
                }
                Vista Previa
              </button>
              
              <button
                onClick={generarFacturacionMensual}
                disabled={loading || !hasPermission('facturas')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                  <Play className="w-4 h-4 mr-2" />
                }
                Generar Facturación
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Estadísticas Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">{estadisticas.total_clientes?.toLocaleString('es-CO') || '0'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Facturas Generadas</p>
                    <p className="text-2xl font-bold text-gray-900">{estadisticas.facturas_generadas?.toLocaleString('es-CO') || '0'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Monto Total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatearMoneda(estadisticas.monto_total)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Errores</p>
                    <p className="text-2xl font-bold text-gray-900">{estadisticas.errores || '0'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros Mejorados */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Filtros de Búsqueda</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <select
                    value={filtros.estado}
                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagada">Pagada</option>
                    <option value="vencida">Vencida</option>
                    <option value="anulada">Anulada</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      cargarEstadisticas();
                      cargarFacturas();
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resultados y Preview */}
{/* Resultados y Preview */}
{(resultado || preview) && (
  <div className="bg-white shadow-sm rounded-xl border border-gray-200">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">
        {preview ? 'Vista Previa de Facturación' : 'Resultado de Facturación'}
      </h3>
    </div>
    <div className="p-6">
      <div className={`rounded-xl p-6 border-2 ${
        (resultado?.success !== false && preview?.success !== false) ? 
        'bg-green-50 border-green-200' : 
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {(resultado?.success !== false && preview?.success !== false) ? 
              <CheckCircle className="w-6 h-6 text-green-600" /> :
              <XCircle className="w-6 h-6 text-red-600" />
            }
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-medium text-gray-900">
              {resultado?.message || preview?.message || 'Proceso completado'}
            </h4>
            
            {/* Resumen de Preview */}
            {preview?.resumen && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Clientes a facturar</div>
                  <div className="text-2xl font-bold text-gray-900">{preview.resumen.total_clientes}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Monto estimado</div>
                  <div className="text-2xl font-bold text-gray-900">{formatearMoneda(preview.resumen.monto_total_estimado)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Servicios totales</div>
                  <div className="text-2xl font-bold text-gray-900">{preview.resumen.servicios_totales || 0}</div>
                </div>
              </div>
            )}

            {/* ✅ NUEVO: Resumen de Resultado */}
            {resultado && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Procesados</div>
                  <div className="text-2xl font-bold text-blue-700">{resultado.clientes_procesados || 0}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Generadas</div>
                  <div className="text-2xl font-bold text-green-700">{resultado.facturas_generadas || 0}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Errores</div>
                  <div className="text-2xl font-bold text-red-700">{resultado.errores || 0}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500">Tasa Éxito</div>
                  <div className="text-2xl font-bold text-gray-900">{resultado.tasa_exito || 0}%</div>
                </div>
              </div>
            )}

            {/* ✅ NUEVO: Detalle por Cliente */}
            {resultado && Array.isArray(resultado.detalles) && resultado.detalles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Detalle por Cliente</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {resultado.detalles.map((detalle, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        detalle.estado === 'generada'
                          ? 'bg-green-50 border-green-200'
                          : detalle.estado === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {detalle.nombre || 'Sin nombre'}
                          </p>
                          {detalle.numero_factura && (
                            <p className="text-xs text-gray-600 mt-1">
                              Factura: {detalle.numero_factura}
                            </p>
                          )}
                          {detalle.razon && (
                            <p className="text-xs text-gray-600 mt-1">
                              {detalle.razon}
                            </p>
                          )}
                          {detalle.error && (
                            <p className="text-xs text-red-600 mt-1">
                              Error: {detalle.error}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          {detalle.total && (
                            <p className="font-semibold text-gray-900 text-sm">
                              {formatearMoneda(detalle.total)}
                            </p>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                              detalle.estado === 'generada'
                                ? 'bg-green-100 text-green-700'
                                : detalle.estado === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {detalle.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Errores */}
            {(resultado?.errores || preview?.errores) && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-red-800 mb-2">Errores encontrados:</h5>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {(resultado?.errores || preview?.errores).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}
          {/* Lista de Facturas */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900">Facturas Recientes</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {paginacion.total} facturas en total
                </span>
              </div>
            </div>

            <div className="overflow-hidden">
              {facturasData.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Cargando facturas...</span>
                  </div>
                </div>
              ) : facturasData.error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar facturas</h3>
                    <p className="text-sm text-gray-500">{facturasData.error}</p>
                  </div>
                </div>
              ) : facturas.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron facturas</h3>
                    <p className="text-sm text-gray-500">Ajusta los filtros o genera nuevas facturas</p>
                  </div>
                </div>
              ) : (
                <>
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
                            Vencimiento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {facturas.map((factura) => (
                          <tr key={factura.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{factura.numero_factura}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{factura.nombre_cliente}</div>
                              <div className="text-sm text-gray-500">{factura.identificacion_cliente}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatearFecha(factura.fecha_emision)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatearFecha(factura.fecha_vencimiento)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{formatearMoneda(factura.total)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${obtenerColorEstado(factura.estado)}`}>
                                {factura.estado_descripcion || factura.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación Mejorada */}
                  {paginacion.total > paginacion.limit && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-700">
                          <span>
                            Mostrando{' '}
                            <span className="font-medium">
                              {((paginacion.page - 1) * paginacion.limit) + 1}
                            </span>
                            {' '}a{' '}
                            <span className="font-medium">
                              {Math.min(paginacion.page * paginacion.limit, paginacion.total)}
                            </span>
                            {' '}de{' '}
                            <span className="font-medium">{paginacion.total}</span>
                            {' '}resultados
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => cambiarPagina(paginacion.page - 1)}
                            disabled={paginacion.page === 1}
                            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          
                          <span className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg">
                            {paginacion.page}
                          </span>
                          
                          <button
                            onClick={() => cambiarPagina(paginacion.page + 1)}
                            disabled={paginacion.page * paginacion.limit >= paginacion.total}
                            className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FacturacionAutomatica;