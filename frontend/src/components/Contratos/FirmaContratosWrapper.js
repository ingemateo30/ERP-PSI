// frontend/src/components/Contratos/FirmaContratosWrapper.js
// Wrapper completo para la firma de contratos que funciona independientemente

import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, AlertCircle, X, Eye, PenTool, CheckCircle, Clock,
  Users, Calendar, Filter, RefreshCw, Download, Edit, Save, 
  FileCheck, FileX, UserCheck, Building
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const FirmaContratosWrapper = () => {
  const [contratos, setContratos] = useState([]);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [busquedaContrato, setBusquedaContrato] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [procesandoFirma, setProcesandoFirma] = useState(false);
  const [mostrarModalFirma, setMostrarModalFirma] = useState(false);
  const [datosForm, setDatosForm] = useState({
    fecha_firma: '',
    observaciones: '',
    lugar_firma: '',
    firmado_por: ''
  });
  const [estadisticas, setEstadisticas] = useState({
    total_contratos: 0,
    pendientes: 0,
    firmados: 0,
    anulados: 0
  });

  // Cargar lista de contratos al montar el componente
  useEffect(() => {
    cargarContratos();
  }, [filtroEstado]);

  const cargarContratos = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        limit: '50',
        estado: 'activo'
      });

      if (filtroEstado === 'pendiente') {
        params.append('firmado', 'false');
      } else if (filtroEstado === 'firmado') {
        params.append('firmado', 'true');
      } else if (filtroEstado !== 'todos') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/v1/contratos?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContratos(data.data || []);
        calcularEstadisticas(data.data || []);
      } else {
        setError('Error cargando contratos: ' + (data.message || 'Error desconocido'));
        setContratos([]);
        resetearEstadisticas();
      }
    } catch (error) {
      console.error('Error cargando contratos:', error);
      setError('Error de conexión al cargar contratos');
      setContratos([]);
      resetearEstadisticas();
    } finally {
      setLoading(false);
    }
  };

  const buscarContratos = async (termino) => {
    if (!termino || termino.length < 2) {
      cargarContratos();
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        search: termino,
        limit: '20'
      });

      if (filtroEstado === 'pendiente') {
        params.append('firmado', 'false');
      } else if (filtroEstado === 'firmado') {
        params.append('firmado', 'true');
      } else if (filtroEstado !== 'todos') {
        params.append('estado', filtroEstado);
      }

      const response = await fetch(`/api/v1/contratos?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContratos(data.data || []);
        calcularEstadisticas(data.data || []);
      }
    } catch (error) {
      console.error('Error buscando contratos:', error);
      setError('Error al buscar contratos');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstadisticas = (contratosData) => {
    const stats = contratosData.reduce((acc, contrato) => {
      acc.total_contratos++;
      
      if (contrato.fecha_firma) {
        acc.firmados++;
      } else if (contrato.estado === 'anulado') {
        acc.anulados++;
      } else {
        acc.pendientes++;
      }
      
      return acc;
    }, {
      total_contratos: 0,
      pendientes: 0,
      firmados: 0,
      anulados: 0
    });
    
    setEstadisticas(stats);
  };

  const resetearEstadisticas = () => {
    setEstadisticas({
      total_contratos: 0,
      pendientes: 0,
      firmados: 0,
      anulados: 0
    });
  };

  const verDetalleContrato = async (contrato) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/v1/contratos/${contrato.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContratoSeleccionado(data.data);
        } else {
          setContratoSeleccionado(contrato);
        }
      } else {
        setContratoSeleccionado(contrato);
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      setContratoSeleccionado(contrato);
    } finally {
      setLoading(false);
    }
  };

  const iniciarFirmaContrato = (contrato) => {
    setContratoSeleccionado(contrato);
    setDatosForm({
      fecha_firma: new Date().toISOString().split('T')[0],
      observaciones: 'Contrato firmado por el cliente',
      lugar_firma: '',
      firmado_por: contrato.cliente_nombre || ''
    });
    setMostrarModalFirma(true);
  };

  const confirmarFirmaContrato = async () => {
    try {
      setProcesandoFirma(true);
      
      const response = await fetch(`/api/v1/contratos/${contratoSeleccionado.id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'activo',
          fecha_firma: datosForm.fecha_firma,
          observaciones: datosForm.observaciones,
          lugar_firma: datosForm.lugar_firma,
          firmado_por: datosForm.firmado_por
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMostrarModalFirma(false);
        setContratoSeleccionado(null);
        cargarContratos(); // Recargar lista
        
        // Mostrar mensaje de éxito
        alert('Contrato firmado exitosamente');
      } else {
        setError('Error firmando contrato: ' + (data.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error firmando contrato:', error);
      setError('Error de conexión al firmar contrato');
    } finally {
      setProcesandoFirma(false);
    }
  };

  const anularContrato = async (contrato, motivo = '') => {
    if (!window.confirm('¿Está seguro de que desea anular este contrato?')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/v1/contratos/${contrato.id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'anulado',
          observaciones: motivo || 'Contrato anulado'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        cargarContratos(); // Recargar lista
        alert('Contrato anulado exitosamente');
      } else {
        setError('Error anulando contrato: ' + (data.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error anulando contrato:', error);
      setError('Error de conexión al anular contrato');
    } finally {
      setLoading(false);
    }
  };

  const descargarContrato = async (contratoId) => {
    try {
      const response = await fetch(`/api/v1/contratos/${contratoId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `contrato_${contratoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error al descargar el contrato');
      }
    } catch (error) {
      console.error('Error descargando contrato:', error);
      alert('Error al descargar el contrato');
    }
  };

  const handleBusquedaChange = (e) => {
    const valor = e.target.value;
    setBusquedaContrato(valor);
    
    // Debounce la búsqueda
    clearTimeout(window.busquedaContratoTimeout);
    window.busquedaContratoTimeout = setTimeout(() => {
      buscarContratos(valor);
    }, 300);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const getEstadoColor = (contrato) => {
    if (contrato.fecha_firma) {
      return 'text-green-600 bg-green-100';
    } else if (contrato.estado === 'anulado') {
      return 'text-red-600 bg-red-100';
    } else {
      return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getEstadoTexto = (contrato) => {
    if (contrato.fecha_firma) {
      return 'Firmado';
    } else if (contrato.estado === 'anulado') {
      return 'Anulado';
    } else {
      return 'Pendiente';
    }
  };

  if (error && !contratos.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={cargarContratos}
              className="inline-flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Firma de Contratos</h1>
              <p className="text-gray-600 mt-1">
                Gestiona la firma y estado de los contratos de servicios
              </p>
            </div>
            <button
              onClick={cargarContratos}
              className="inline-flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Contratos</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento, número de contrato..."
                  value={busquedaContrato}
                  onChange={handleBusquedaChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              >
                <option value="todos">Todos los contratos</option>
                <option value="pendiente">Pendientes de firma</option>
                <option value="firmado">Firmados</option>
                <option value="anulado">Anulados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Contratos</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.total_contratos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Firmados</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.firmados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <FileX className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Anulados</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.anulados}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de contratos */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Contratos {filtroEstado !== 'todos' && `(${filtroEstado})`}
              </h3>
              {loading && (
                <div className="flex items-center text-[#0e6493]">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Cargando...
                </div>
              )}
            </div>
          </div>

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
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Contrato
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
                {contratos.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{contrato.numero_contrato || contrato.id}
                      </div>
                      {contrato.fecha_firma && (
                        <div className="text-sm text-green-600">
                          Firmado: {formatearFecha(contrato.fecha_firma)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contrato.cliente_nombre || `${contrato.nombres} ${contrato.apellidos}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {contrato.cliente_documento || contrato.numero_documento}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contrato.tipo_servicio || contrato.servicio || 'Internet + TV'}
                      </div>
                      {contrato.plan && (
                        <div className="text-sm text-gray-500">
                          Plan: {contrato.plan}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearFecha(contrato.fecha_contrato || contrato.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(contrato)}`}>
                        {getEstadoTexto(contrato)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => verDetalleContrato(contrato)}
                          className="text-[#0e6493] hover:text-[#0e6493]/80"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!contrato.fecha_firma && contrato.estado !== 'anulado' && (
                          <button
                            onClick={() => iniciarFirmaContrato(contrato)}
                            className="text-green-600 hover:text-green-800"
                            title="Firmar contrato"
                          >
                            <PenTool className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => descargarContrato(contrato.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        
                        {!contrato.fecha_firma && contrato.estado !== 'anulado' && (
                          <button
                            onClick={() => anularContrato(contrato)}
                            className="text-red-600 hover:text-red-800"
                            title="Anular contrato"
                          >
                            <FileX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && contratos.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay contratos</h3>
              <p className="text-gray-600">
                {busquedaContrato 
                  ? 'No se encontraron contratos con los criterios de búsqueda' 
                  : 'No hay contratos registrados'
                }
              </p>
            </div>
          )}
        </div>

        {/* Modal de detalle de contrato */}
        {contratoSeleccionado && !mostrarModalFirma && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalle del Contrato #{contratoSeleccionado.numero_contrato || contratoSeleccionado.id}
                  </h3>
                  <button
                    onClick={() => setContratoSeleccionado(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Información del cliente */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Información del Cliente
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nombre:</span>
                        <span className="font-medium">
                          {contratoSeleccionado.cliente_nombre || 
                           `${contratoSeleccionado.nombres} ${contratoSeleccionado.apellidos}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Documento:</span>
                        <span className="font-medium">
                          {contratoSeleccionado.cliente_documento || contratoSeleccionado.numero_documento}
                        </span>
                      </div>
                      {contratoSeleccionado.telefono && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Teléfono:</span>
                          <span className="font-medium">{contratoSeleccionado.telefono}</span>
                        </div>
                      )}
                      {contratoSeleccionado.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{contratoSeleccionado.email}</span>
                        </div>
                      )}
                      {contratoSeleccionado.direccion && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dirección:</span>
                          <span className="font-medium">{contratoSeleccionado.direccion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del contrato */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Información del Contrato
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Número:</span>
                        <span className="font-medium">#{contratoSeleccionado.numero_contrato || contratoSeleccionado.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">
                          {formatearFecha(contratoSeleccionado.fecha_contrato || contratoSeleccionado.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(contratoSeleccionado)}`}>
                          {getEstadoTexto(contratoSeleccionado)}
                        </span>
                      </div>
                      {contratoSeleccionado.fecha_firma && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fecha Firma:</span>
                          <span className="font-medium text-green-600">
                            {formatearFecha(contratoSeleccionado.fecha_firma)}
                          </span>
                        </div>
                      )}
                      {contratoSeleccionado.firmado_por && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Firmado por:</span>
                          <span className="font-medium">{contratoSeleccionado.firmado_por}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del servicio */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Información del Servicio
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">
                          {contratoSeleccionado.tipo_servicio || contratoSeleccionado.servicio || 'Internet + TV'}
                        </span>
                      </div>
                      {contratoSeleccionado.plan && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plan:</span>
                          <span className="font-medium">{contratoSeleccionado.plan}</span>
                        </div>
                      )}
                      {contratoSeleccionado.velocidad && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Velocidad:</span>
                          <span className="font-medium">{contratoSeleccionado.velocidad}</span>
                        </div>
                      )}
                      {contratoSeleccionado.valor_mensual && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valor Mensual:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('es-CO', {
                              style: 'currency',
                              currency: 'COP'
                            }).format(contratoSeleccionado.valor_mensual)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Observaciones</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                      {contratoSeleccionado.observaciones || 'Sin observaciones adicionales'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setContratoSeleccionado(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                  
                  {!contratoSeleccionado.fecha_firma && contratoSeleccionado.estado !== 'anulado' && (
                    <button
                      onClick={() => iniciarFirmaContrato(contratoSeleccionado)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
                    >
                      <PenTool className="w-4 h-4 mr-2" />
                      Firmar Contrato
                    </button>
                  )}
                  
                  <button
                    onClick={() => descargarContrato(contratoSeleccionado.id)}
                    className="px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors inline-flex items-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de firma de contrato */}
        {mostrarModalFirma && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <PenTool className="w-5 h-5 mr-2 text-green-600" />
                    Firmar Contrato #{contratoSeleccionado?.numero_contrato || contratoSeleccionado?.id}
                  </h3>
                  <button
                    onClick={() => setMostrarModalFirma(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Firma *
                    </label>
                    <input
                      type="date"
                      value={datosForm.fecha_firma}
                      onChange={(e) => setDatosForm(prev => ({ ...prev, fecha_firma: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firmado por
                    </label>
                    <input
                      type="text"
                      value={datosForm.firmado_por}
                      onChange={(e) => setDatosForm(prev => ({ ...prev, firmado_por: e.target.value }))}
                      placeholder="Nombre de quien firma el contrato"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lugar de Firma
                    </label>
                    <input
                      type="text"
                      value={datosForm.lugar_firma}
                      onChange={(e) => setDatosForm(prev => ({ ...prev, lugar_firma: e.target.value }))}
                      placeholder="Ciudad donde se firma el contrato"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={datosForm.observaciones}
                      onChange={(e) => setDatosForm(prev => ({ ...prev, observaciones: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Observaciones adicionales sobre la firma..."
                    />
                  </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Importante:</p>
                      <p>Al confirmar la firma del contrato, se marcará como activo y comenzará la facturación automática según los términos acordados.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setMostrarModalFirma(false)}
                    disabled={procesandoFirma}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarFirmaContrato}
                    disabled={procesandoFirma || !datosForm.fecha_firma}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center disabled:opacity-50"
                  >
                    {procesandoFirma ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Firmando...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Confirmar Firma
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirmaContratosWrapper;