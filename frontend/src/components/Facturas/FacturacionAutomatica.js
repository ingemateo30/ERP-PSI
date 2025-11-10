// frontend/src/components/Facturas/FacturacionAutomatica.js - MEJORADO VISUALMENTE

import React, { useState, useEffect } from 'react';
import { 
  Calendar, DollarSign, FileText, Users, CheckCircle, XCircle,
  Play, Eye, Download, RefreshCw, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { facturasService } from '../../services/facturasService';
import { Card, CardContent } from '../ui/card';

const FacturacionAutomatica = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [expandedCliente, setExpandedCliente] = useState(null);
  
  const { user } = useAuth();

  // Limpiar estados
  const limpiarEstados = () => {
    setPreview(null);
    setResultado(null);
    setExpandedCliente(null);
  };

  // Generar preview DETALLADO
  const generarPreview = async () => {
    setLoading(true);
    limpiarEstados();
    
    try {
      console.log('👁️ Solicitando preview detallado...');
      
      const response = await facturasService.getPreviewFacturacionMensual({
        periodo: new Date().toISOString().slice(0, 7)
      });
      
      console.log('✅ Preview recibido:', response);
      
      if (response.success && response.data) {
        setPreview(response.data);
      } else {
        setPreview({ error: 'No se pudo generar el preview' });
      }
      
    } catch (error) {
      console.error('❌ Error generando preview:', error);
      setPreview({ error: error.message || 'Error al generar preview' });
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar facturación
  const ejecutarFacturacion = async () => {
    if (!window.confirm(
      'Esta acción generará la facturación mensual para todos los clientes activos.\n\n' +
      '⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER.\n\n' +
      '¿Desea continuar?'
    )) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('⚡ Ejecutando facturación mensual...');
      
      const response = await facturasService.ejecutarFacturacionMensual({
        periodo: new Date().toISOString().slice(0, 7)
      });
      
      console.log('✅ Facturación completada:', response);
      
      setResultado(response.data || response);
      setPreview(null);
      
    } catch (error) {
      console.error('❌ Error ejecutando facturación:', error);
      setResultado({
        success: false,
        message: error.message || 'Error al ejecutar facturación',
        detalles: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatear moneda
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  // Toggle expandir detalle
  const toggleExpandir = (clienteId) => {
    setExpandedCliente(expandedCliente === clienteId ? null : clienteId);
  };

  // Obtener color por tipo de factura
  const getColorTipoFactura = (tipo) => {
    const colores = {
      'primera': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
      'segunda': 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300',
      'mensual': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Encabezado de la página */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facturación Automática</h1>
            <p className="text-sm text-gray-600 mt-1">
              Genera y gestiona la facturación mensual de todos tus clientes de forma automatizada
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen si hay preview */}
      {preview?.resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
          <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {preview.resumen.total_clientes}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">A facturar este mes</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Monto Total</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatearMoneda(preview.resumen.monto_total_estimado)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Estimado a recaudar</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Servicios Activos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {preview.resumen.servicios_totales}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total de servicios</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatearMoneda(preview.resumen.promedio_por_cliente)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Por cliente</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botones de acción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Preview de Facturación</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Revisa qué facturas se generarán antes de ejecutar el proceso completo
                </p>
                <button
                  onClick={generarPreview}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border-2 border-blue-600 rounded-lg text-sm font-semibold text-blue-600 bg-white hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-5 h-5 mr-2" />
                  )}
                  Generar Preview Detallado
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Ejecutar Facturación Mensual</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Genera las facturas para todos los clientes activos del período actual
                </p>
                <button
                  onClick={ejecutarFacturacion}
                  disabled={loading || !preview?.detalles?.length}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  Ejecutar Facturación Ahora
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada de preview */}
      {preview?.detalles && preview.detalles.length > 0 && (
        <Card className="shadow-xl border-t-4 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-blue-600" />
                  Detalle de Facturas a Generar
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold text-blue-600">{preview.detalles.length}</span> {preview.detalles.length === 1 ? 'cliente' : 'clientes'} listos para facturar
                </p>
              </div>
              <button
                onClick={() => {/* Exportar lógica */}}
                className="inline-flex items-center px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Estrato
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Tipo Factura
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      IVA
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.detalles.map((cliente) => (
                    <React.Fragment key={cliente.cliente_id}>
                      <tr className="hover:bg-blue-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">{cliente.nombre}</div>
                            <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 font-bold rounded-full text-sm">
                            {cliente.estrato}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border-2 ${getColorTipoFactura(cliente.tipo_factura)} shadow-sm`}>
                            {cliente.tipo_factura === 'primera' ? '1ra Factura' : 
                             cliente.tipo_factura === 'segunda' ? '2da Nivelación' : 
                             'Mensual'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(cliente.periodo_facturacion.fecha_desde).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})} - {' '}
                            {new Date(cliente.periodo_facturacion.fecha_hasta).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {cliente.periodo_facturacion.dias} días
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatearMoneda(cliente.totales.subtotal)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatearMoneda(cliente.totales.iva)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-bold text-blue-600">
                            {formatearMoneda(cliente.totales.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleExpandir(cliente.cliente_id)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-all duration-200"
                          >
                            {expandedCliente === cliente.cliente_id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Fila expandida con detalle */}
                      {expandedCliente === cliente.cliente_id && (
                        <tr className="bg-white border-t-2 border-gray-200">
                          <td colSpan="8" className="px-6 py-6">
                            <div className="space-y-6 animate-fadeIn">
                              {/* Servicios */}
                              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                  Servicios Contratados
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {cliente.servicios.map((servicio, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md hover:bg-gray-50 transition-all">
                                      <span className="text-sm font-medium text-gray-800">{servicio.nombre}</span>
                                      <div className="text-right">
                                        <span className="text-sm font-bold text-gray-900">
                                          {formatearMoneda(servicio.precio)}
                                        </span>
                                        {servicio.aplica_iva && (
                                          <span className="block text-xs text-gray-600 mt-1">
                                            +{servicio.porcentaje_iva}% IVA
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Conceptos */}
                              <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                  <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                                  Conceptos a Facturar
                                </h4>
                                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                                  {cliente.conceptos.map((concepto, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 hover:bg-blue-50 transition-colors">
                                      <span className="text-sm font-medium text-gray-800">{concepto.concepto}</span>
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900">
                                          {formatearMoneda(concepto.valor)}
                                        </div>
                                        {concepto.aplica_iva && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            IVA: {formatearMoneda(concepto.iva)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Totales */}
                             <div className="bg-white p-5 rounded-lg border-2 border-blue-300 shadow-md">
                                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                                  <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                                  Resumen de Totales
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Internet:</span>
                                    <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.internet)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">Televisión:</span>
                                    <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.television)}</span>
                                  </div>
                                  {cliente.totales.instalacion > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-gray-700">Instalación:</span>
                                      <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.instalacion)}</span>
                                    </div>
                                  )}
                                  {cliente.totales.varios > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-gray-700">Varios:</span>
                                      <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.varios)}</span>
                                    </div>
                                  )}
                                  <div className="border-t-2 border-blue-400 mt-3 pt-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-bold text-gray-800">Subtotal:</span>
                                      <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-bold text-gray-800">IVA:</span>
                                      <span className="text-sm font-bold text-gray-900">{formatearMoneda(cliente.totales.iva)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-100 -mx-5 -mb-5 px-5 py-3 rounded-b-lg mt-3 border-t-2 border-gray-300">
                                      <span className="text-lg font-extrabold text-gray-900">TOTAL:</span>
                                      <span className="text-xl font-extrabold text-blue-700">{formatearMoneda(cliente.totales.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay datos */}
      {preview && !preview.detalles?.length && !preview.error && (
        <Card className="border-2 border-yellow-300 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">No hay clientes para facturar</p>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Todos los clientes activos ya tienen factura del período actual o no cumplen las condiciones necesarias para generar facturación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error en preview */}
      {preview?.error && (
        <Card className="border-2 border-red-300 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center bg-red-50 p-4 rounded-lg">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-900">Error al generar preview</p>
                <p className="text-sm text-red-700 mt-1">{preview.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado de ejecución */}
      {resultado && (
        <Card className={`shadow-xl border-t-4 ${resultado.success !== false ? 'border-green-500' : 'border-red-500'}`}>
          <CardContent className="p-6">
            <div className={`rounded-xl p-6 bg-white ${resultado.success !== false ? 'border-2 border-green-300' : 'border-2 border-red-300'}`}>
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${resultado.success !== false ? 'bg-green-200' : 'bg-red-200'}`}>
                  {resultado.success !== false ? (
                    <CheckCircle className="w-7 h-7 text-green-700" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-700" />
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">
                    {resultado.message || 'Proceso completado'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {resultado.success !== false ? 'Facturación realizada exitosamente' : 'Ocurrió un error durante el proceso'}
                  </p>
                </div>
              </div>
              {resultado.facturas_generadas > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-600 mb-1">Clientes Procesados</p>
                    <p className="text-3xl font-extrabold text-gray-900">{resultado.clientes_procesados}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-600 mb-1">Facturas Generadas</p>
                    <p className="text-3xl font-extrabold text-green-700">{resultado.facturas_generadas}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
                    <p className="text-sm font-medium text-gray-600 mb-1">Errores</p>
                    <p className="text-3xl font-extrabold text-red-700">{resultado.errores || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FacturacionAutomatica;