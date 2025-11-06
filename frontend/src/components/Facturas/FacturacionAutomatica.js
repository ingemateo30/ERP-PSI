// frontend/src/components/Facturas/FacturacionAutomatica.js - CORREGIDO CON TABLA DETALLADA

import React, { useState, useEffect } from 'react';
import { 
  Calendar, DollarSign, FileText, Users, CheckCircle, XCircle,
  Play, Eye, Download, RefreshCw, Loader2, AlertTriangle,
  ChevronDown, ChevronUp
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
      setPreview(null); // Limpiar preview después de ejecutar
      
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
      'primera': 'bg-blue-100 text-blue-800 border-blue-300',
      'segunda': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'mensual': 'bg-green-100 text-green-800 border-green-300'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen si hay preview */}
      {preview?.resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {preview.resumen.total_clientes}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(preview.resumen.monto_total_estimado)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Servicios</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {preview.resumen.servicios_totales}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatearMoneda(preview.resumen.promedio_por_cliente)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botones de acción */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Preview de Facturación</h3>
            <p className="text-sm text-gray-600 mb-4">
              Revisa qué facturas se generarán antes de ejecutar el proceso
            </p>
            <button
              onClick={generarPreview}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Generar Preview
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Facturación Mensual</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ejecuta la facturación mensual para todos los clientes activos
            </p>
            <button
              onClick={ejecutarFacturacion}
              disabled={loading || !preview?.detalles?.length}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Tabla detallada de preview */}
      {preview?.detalles && preview.detalles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Detalle de Facturas a Generar ({preview.detalles.length})
              </h3>
              <button
                onClick={() => {/* Exportar lógica */}}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estrato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo Factura
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Período
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      IVA
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.detalles.map((cliente) => (
                    <React.Fragment key={cliente.cliente_id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">{cliente.nombre}</div>
                            <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {cliente.estrato}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getColorTipoFactura(cliente.tipo_factura)}`}>
                            {cliente.tipo_factura === 'primera' ? '1ra' : 
                             cliente.tipo_factura === 'segunda' ? '2da Nivelación' : 
                             'Mensual'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {new Date(cliente.periodo_facturacion.fecha_desde).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})} - {' '}
                            {new Date(cliente.periodo_facturacion.fecha_hasta).toLocaleDateString('es-CO', {day: '2-digit', month: 'short'})}
                          </div>
                          <div className="text-xs text-gray-500">
                            {cliente.periodo_facturacion.dias} días
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatearMoneda(cliente.totales.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatearMoneda(cliente.totales.iva)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatearMoneda(cliente.totales.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleExpandir(cliente.cliente_id)}
                            className="text-blue-600 hover:text-blue-800"
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
                        <tr>
                          <td colSpan="8" className="px-4 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Servicios */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Servicios:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {cliente.servicios.map((servicio, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border">
                                      <span className="text-sm text-gray-700">{servicio.nombre}</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatearMoneda(servicio.precio)}
                                        {servicio.aplica_iva && (
                                          <span className="text-xs text-gray-500 ml-1">
                                            (+{servicio.porcentaje_iva}% IVA)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Conceptos */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Conceptos a Facturar:</h4>
                                <div className="bg-white rounded border divide-y">
                                  {cliente.conceptos.map((concepto, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2">
                                      <span className="text-sm text-gray-700">{concepto.concepto}</span>
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
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-700">Internet:</span>
                                  <span className="text-sm font-medium">{formatearMoneda(cliente.totales.internet)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-700">Televisión:</span>
                                  <span className="text-sm font-medium">{formatearMoneda(cliente.totales.television)}</span>
                                </div>
                                {cliente.totales.instalacion > 0 && (
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-700">Instalación:</span>
                                    <span className="text-sm font-medium">{formatearMoneda(cliente.totales.instalacion)}</span>
                                  </div>
                                )}
                                {cliente.totales.varios > 0 && (
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-gray-700">Varios:</span>
                                    <span className="text-sm font-medium">{formatearMoneda(cliente.totales.varios)}</span>
                                  </div>
                                )}
                                <div className="border-t border-blue-300 mt-2 pt-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                                    <span className="text-sm font-semibold">{formatearMoneda(cliente.totales.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-700">IVA:</span>
                                    <span className="text-sm font-semibold">{formatearMoneda(cliente.totales.iva)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-gray-900">TOTAL:</span>
                                    <span className="text-base font-bold text-blue-600">{formatearMoneda(cliente.totales.total)}</span>
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
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No hay clientes para facturar</p>
            <p className="text-sm text-gray-600 mt-2">
              Todos los clientes activos ya tienen factura del período actual o no cumplen las condiciones para facturar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error en preview */}
      {preview?.error && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{preview.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado de ejecución */}
      {resultado && (
        <Card>
          <CardContent className="p-6">
            <div className={`rounded-lg p-4 ${resultado.success !== false ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center mb-2">
                {resultado.success !== false ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-2" />
                )}
                <h4 className="text-lg font-medium">
                  {resultado.message || 'Proceso completado'}
                </h4>
              </div>
              {resultado.facturas_generadas > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm text-gray-600">Procesados</p>
                    <p className="text-2xl font-bold text-gray-900">{resultado.clientes_procesados}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm text-gray-600">Generadas</p>
                    <p className="text-2xl font-bold text-green-600">{resultado.facturas_generadas}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm text-gray-600">Errores</p>
                    <p className="text-2xl font-bold text-red-600">{resultado.errores || 0}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FacturacionAutomatica;