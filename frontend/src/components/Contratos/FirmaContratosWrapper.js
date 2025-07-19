// frontend/src/components/Contratos/FirmaContratosWrapper.js
// Wrapper completo para la firma de contratos que funciona independientemente

import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, AlertCircle, X, Eye, PenTool, CheckCircle, Clock
} from 'lucide-react';
import VisorFirmaPDF from './VisorFirmaPDF';

const FirmaContratosWrapper = () => {
  const [contratos, setContratos] = useState([]);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [busquedaContrato, setBusquedaContrato] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('pendiente');

  // Cargar lista de contratos al montar el componente
  useEffect(() => {
    cargarContratos();
  }, [filtroEstado]);

  const cargarContratos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        estado: 'activo'
      });

      if (filtroEstado === 'pendiente') {
        params.append('firmado', 'false');
      } else if (filtroEstado === 'firmado') {
        params.append('firmado', 'true');
      }

      const response = await fetch(`/api/v1/contratos?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContratos(data.data || []);
      } else {
        setError('Error cargando contratos');
      }
    } catch (error) {
      console.error('Error cargando contratos:', error);
      setError('Error de conexión');
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
      const params = new URLSearchParams({
        search: termino,
        limit: '20'
      });

      if (filtroEstado === 'pendiente') {
        params.append('firmado', 'false');
      } else if (filtroEstado === 'firmado') {
        params.append('firmado', 'true');
      }

      const response = await fetch(`/api/v1/contratos?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setContratos(data.data || []);
      }
    } catch (error) {
      console.error('Error buscando contratos:', error);
    } finally {
      setLoading(false);
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

  const seleccionarContrato = (contrato) => {
    setContratoSeleccionado(contrato);
    setMostrarBuscador(false);
  };

  const volverAlBuscador = () => {
    setContratoSeleccionado(null);
    setMostrarBuscador(true);
    setBusquedaContrato('');
    cargarContratos();
  };

  const handleFirmaCompleta = (resultado) => {
    console.log('Firma completada:', resultado);
    // Refrescar lista y volver al buscador
    volverAlBuscador();
    // Mostrar notificación de éxito
    if (window.showNotification) {
      window.showNotification('success', 'Contrato firmado exitosamente');
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const ContratoCard = ({ contrato }) => (
    <div
      key={contrato.id}
      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => seleccionarContrato(contrato)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900">{contrato.numero_contrato}</h3>
            {contrato.firmado_cliente ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
          </div>
          
          <p className="text-sm text-gray-600">
            Cliente: {contrato.cliente_nombre || 'N/A'}
          </p>
          <p className="text-sm text-gray-500">
            CC: {contrato.cliente_identificacion || 'N/A'}
          </p>
          <p className="text-sm text-gray-500">
            Fecha: {formatearFecha(contrato.fecha_generacion)}
          </p>
          
          {contrato.fecha_firma && (
            <p className="text-sm text-green-600">
              Firmado: {formatearFecha(contrato.fecha_firma)}
            </p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            contrato.firmado_cliente 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {contrato.firmado_cliente ? 'Firmado' : 'Pendiente'}
          </span>
          
          <div className="flex items-center gap-1">
            {contrato.firmado_cliente ? (
              <Eye className="h-4 w-4 text-blue-600" />
            ) : (
              <PenTool className="h-4 w-4 text-orange-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Si hay un contrato seleccionado, mostrar el visor de firma
  if (contratoSeleccionado && !mostrarBuscador) {
    return (
      <div className="space-y-4">
        {/* Header con botón para volver */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {contratoSeleccionado.firmado_cliente ? 'Ver Contrato' : 'Firmar Contrato'}
              </h1>
              <p className="text-gray-600">
                Contrato: <span className="font-medium">{contratoSeleccionado.numero_contrato}</span> - 
                Cliente: {contratoSeleccionado.cliente_nombre}
              </p>
            </div>
            <button
              onClick={volverAlBuscador}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Volver
            </button>
          </div>
        </div>

        {/* Componente de firma */}
        <VisorFirmaPDF 
          contratoId={contratoSeleccionado.id}
          onFirmaCompleta={handleFirmaCompleta}
          onCancelar={volverAlBuscador}
        />
      </div>
    );
  }

  // Mostrar buscador de contratos
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Firma Digital de Contratos</h1>
        <p className="text-gray-600">
          Seleccione un contrato para firmarlo digitalmente o ver contratos ya firmados
        </p>
      </div>

      {/* Filtros y buscador */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Buscar Contratos</h2>
        </div>

        {/* Filtros por estado */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setFiltroEstado('pendiente')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'pendiente'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes de Firma
          </button>
          <button
            onClick={() => setFiltroEstado('firmado')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'firmado'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ya Firmados
          </button>
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filtroEstado === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
        </div>

        {/* Campo de búsqueda */}
        <div className="relative">
          <input
            type="text"
            value={busquedaContrato}
            onChange={handleBusquedaChange}
            placeholder="Busque por número de contrato, cliente o cédula..."
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
        </div>

        {busquedaContrato && (
          <p className="text-sm text-gray-600 mt-2">
            Buscando: "<span className="font-medium">{busquedaContrato}</span>"
          </p>
        )}
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">
              Contratos {filtroEstado === 'pendiente' ? 'Pendientes' : filtroEstado === 'firmado' ? 'Firmados' : 'Disponibles'} 
              ({contratos.length})
            </h2>
            {loading && (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Cargando...
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {contratos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contratos.map((contrato) => (
                <ContratoCard key={contrato.id} contrato={contrato} />
              ))}
            </div>
          ) : !loading ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {busquedaContrato ? 'No se encontraron contratos' : 
                 filtroEstado === 'pendiente' ? 'No hay contratos pendientes de firma' :
                 filtroEstado === 'firmado' ? 'No hay contratos firmados' :
                 'No hay contratos registrados'}
              </h3>
              <p className="text-gray-500">
                {busquedaContrato 
                  ? 'Intente con otros términos de búsqueda'
                  : 'Los contratos aparecerán aquí cuando se generen desde el módulo de clientes'
                }
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando contratos...</p>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <PenTool className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">¿Cómo usar la firma digital?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use los filtros para ver contratos pendientes o ya firmados</li>
              <li>• Haga clic en cualquier contrato para abrirlo</li>
              <li>• Los contratos pendientes se pueden firmar con tablet o firma digital</li>
              <li>• Los contratos firmados se pueden visualizar y descargar</li>
              <li>• La firma queda registrada con fecha y datos del firmante</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmaContratosWrapper;