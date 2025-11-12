// frontend/src/components/Facturas/FacturacionAutomatica.js - ESTILO LIMPIO APLICADO

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
      
      const response = await facturasService.generarFacturacionMensual({
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
      'primera': 'bg-blue-100 text-blue-800',
      'segunda': 'bg-yellow-100 text-yellow-800',
      'mensual': 'bg-green-100 text-green-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado de la página */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación Automática</h1>
          <p className="text-gray-600">Genera y gestiona la facturación mensual de forma automatizada</p>
        </div>
      </div>

      {/* Tarjetas de resumen si hay preview */}
      {preview?.resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {preview.resumen.total_clientes}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatearMoneda(preview.resumen.monto_total_estimado)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {preview.resumen.servicios_totales}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatearMoneda(preview.resumen.promedio_por_cliente)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview de Facturación</h3>
              <p className="text-sm text-gray-600 mb-4">
                Revisa qué facturas se generarán antes de ejecutar el proceso completo
              </p>
              <button
                onClick={generarPreview}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                Generar Preview Detallado
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ejecutar Facturación Mensual</h3>
              <p className="text-sm text-gray-600 mb-4">
                Genera las facturas para todos los clientes activos del período actual
              </p>
              <button
                onClick={ejecutarFacturacion}
                disabled={loading || !preview?.detalles?.length}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Ejecutar Facturación Ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla detallada de preview */}
      {preview?.detalles && preview.detalles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Detalle de Facturas a Generar
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {preview.detalles.length} {preview.detalles.length === 1 ? 'cliente' : 'clientes'} listos para facturar
              </p>
            </div>
            <button
              onClick={() => {/* Exportar lógica */}}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estrato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Factura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.detalles.map((cliente) => (
                  <React.Fragment key={cliente.cliente_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                        <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 font-bold rounded-full text-sm">
                          {cliente.estrato}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getColorTipoFactura(cliente.tipo_factura)}`}>
                          {cliente.tipo_factura === 'primera' ? '1ra Factura' : 
                           cliente.tipo_factura === 'segunda' ? '2da Nivelación' : 
                           'Mensual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {new Date(cliente.periodo_facturacion.fecha_desde).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})} - {' '}
                          {new Date(cliente.periodo_facturacion.fecha_hasta).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cliente.periodo_facturacion.dias} días
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatearMoneda(cliente.totales.subtotal)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatearMoneda(cliente.totales.iva)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatearMoneda(cliente.totales.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleExpandir(cliente.cliente_id)}
                          className="text-blue-600 hover:text-blue-900"
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
                      <tr className="bg-gray-50">
                        <td colSpan="8" className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Servicios */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Servicios Contratados</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {cliente.servicios.map((servicio, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-900">{servicio.nombre}</span>
                                    <div className="text-right">
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatearMoneda(servicio.precio)}
                                      </span>
                                      {servicio.aplica_iva && (
                                        <span className="block text-xs text-gray-500">
                                          +{servicio.porcentaje_iva}% IVA
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Conceptos */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Conceptos a Facturar</h4>
                              <div className="space-y-2">
                                {cliente.conceptos.map((concepto, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-900">{concepto.concepto}</span>
                                    <div className="text-right">
                                      <div className="text-sm font-medium text-gray-900">
                                        {formatearMoneda(concepto.valor)}
                                      </div>
                                      {concepto.aplica_iva && (
                                        <div className="text-xs text-gray-500">
                                          IVA: {formatearMoneda(concepto.iva)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Totales */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Resumen de Totales</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Internet:</span>
                                  <span className="text-sm font-medium text-gray-900">{formatearMoneda(cliente.totales.internet)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Televisión:</span>
                                  <span className="text-sm font-medium text-gray-900">{formatearMoneda(cliente.totales.television)}</span>
                                </div>
                                {cliente.totales.instalacion > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Instalación:</span>
                                    <span className="text-sm font-medium text-gray-900">{formatearMoneda(cliente.totales.instalacion)}</span>
                                  </div>
                                )}
                                {cliente.totales.varios > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Varios:</span>
                                    <span className="text-sm font-medium text-gray-900">{formatearMoneda(cliente.totales.varios)}</span>
                                  </div>
                                )}
                                <div className="border-t border-blue-300 pt-2 mt-2">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm font-semibold text-gray-900">Subtotal:</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatearMoneda(cliente.totales.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-900">IVA:</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatearMoneda(cliente.totales.iva)}</span>
                                  </div>
                                  <div className="flex justify-between bg-blue-100 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                                    <span className="text-base font-bold text-gray-900">TOTAL:</span>
                                    <span className="text-base font-bold text-blue-700">{formatearMoneda(cliente.totales.total)}</span>
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
        </div>
      )}

      {/* Mensaje si no hay datos */}
      {preview && !preview.detalles?.length && !preview.error && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">No hay clientes para facturar</p>
          <p className="text-sm text-gray-600">
            Todos los clientes activos ya tienen factura del período actual
          </p>
        </div>
      )}

      {/* Error en preview */}
      {preview?.error && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center bg-red-50 p-4 rounded-lg">
            <XCircle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <p className="font-semibold text-red-900">Error al generar preview</p>
              <p className="text-sm text-red-700 mt-1">{preview.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado de ejecución */}
      {resultado && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className={`rounded-lg p-6 ${resultado.success !== false ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${resultado.success !== false ? 'bg-green-100' : 'bg-red-100'}`}>
                {resultado.success !== false ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {resultado.message || 'Proceso completado'}
                </h4>
                <p className="text-sm text-gray-600">
                  {resultado.success !== false ? 'Facturación realizada exitosamente' : 'Ocurrió un error'}
                </p>
              </div>
            </div>
            {resultado.facturas_generadas > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Clientes Procesados</p>
                  <p className="text-2xl font-bold text-gray-900">{resultado.clientes_procesados}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Facturas Generadas</p>
                  <p className="text-2xl font-bold text-green-600">{resultado.facturas_generadas}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Errores</p>
                  <p className="text-2xl font-bold text-red-600">{resultado.errores || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturacionAutomatica;