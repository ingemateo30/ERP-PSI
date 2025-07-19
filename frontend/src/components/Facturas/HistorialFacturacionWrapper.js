// frontend/src/components/Facturas/HistorialFacturacionWrapper.js
// Wrapper completo para el historial de facturación que funciona independientemente

import React, { useState, useEffect } from 'react';
import { 
  Search, Users, FileText, AlertCircle, X, Eye
} from 'lucide-react';
import HistorialFacturacionCliente from './HistorialFacturacionCliente';

const HistorialFacturacionWrapper = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar lista de clientes al montar el componente
  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/clients?page=1&limit=10');
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.data || []);
      } else {
        setError('Error cargando clientes');
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const buscarClientes = async (termino) => {
    if (!termino || termino.length < 2) {
      cargarClientes();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/clients?search=${encodeURIComponent(termino)}&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setClientes(data.data || []);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBusquedaChange = (e) => {
    const valor = e.target.value;
    setBusquedaCliente(valor);
    
    // Debounce la búsqueda
    clearTimeout(window.busquedaTimeout);
    window.busquedaTimeout = setTimeout(() => {
      buscarClientes(valor);
    }, 300);
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarBuscador(false);
  };

  const volverAlBuscador = () => {
    setClienteSeleccionado(null);
    setMostrarBuscador(true);
    setBusquedaCliente('');
    cargarClientes();
  };

  const ClienteCard = ({ cliente }) => (
    <div
      key={cliente.id}
      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => seleccionarCliente(cliente)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{cliente.nombre}</h3>
          <p className="text-sm text-gray-600">CC: {cliente.identificacion}</p>
          {cliente.telefono && (
            <p className="text-sm text-gray-500">Tel: {cliente.telefono}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            cliente.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {cliente.estado}
          </span>
          <Eye className="h-4 w-4 text-blue-600" />
        </div>
      </div>
    </div>
  );

  // Si hay un cliente seleccionado, mostrar el historial
  if (clienteSeleccionado && !mostrarBuscador) {
    return (
      <div className="space-y-4">
        {/* Header con botón para volver */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historial de Facturación</h1>
              <p className="text-gray-600">
                Cliente: <span className="font-medium">{clienteSeleccionado.nombre}</span> - 
                CC: {clienteSeleccionado.identificacion}
              </p>
            </div>
            <button
              onClick={volverAlBuscador}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Cambiar Cliente
            </button>
          </div>
        </div>

        {/* Componente de historial */}
        <HistorialFacturacionCliente 
          clienteId={clienteSeleccionado.id}
          clienteNombre={clienteSeleccionado.nombre}
        />
      </div>
    );
  }

  // Mostrar buscador de clientes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Historial de Facturación</h1>
        <p className="text-gray-600">
          Seleccione un cliente para ver su historial completo de facturación
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Buscar Cliente</h2>
        </div>

        <div className="relative">
          <input
            type="text"
            value={busquedaCliente}
            onChange={handleBusquedaChange}
            placeholder="Busque por nombre, cédula o teléfono..."
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
        </div>

        {busquedaCliente && (
          <p className="text-sm text-gray-600 mt-2">
            Buscando: "<span className="font-medium">{busquedaCliente}</span>"
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

      {/* Lista de clientes */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">
              Clientes Disponibles ({clientes.length})
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
          {clientes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientes.map((cliente) => (
                <ClienteCard key={cliente.id} cliente={cliente} />
              ))}
            </div>
          ) : !loading ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {busquedaCliente ? 'No se encontraron clientes' : 'No hay clientes registrados'}
              </h3>
              <p className="text-gray-500">
                {busquedaCliente 
                  ? 'Intente con otros términos de búsqueda'
                  : 'Agregue clientes al sistema para ver su historial de facturación'
                }
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">¿Cómo usar esta funcionalidad?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use el buscador para encontrar un cliente específico</li>
              <li>• Haga clic en cualquier cliente para ver su historial de facturación</li>
              <li>• Puede filtrar las facturas por estado, fechas y número</li>
              <li>• Expanda cada factura para ver detalles completos</li>
              <li>• Descargue o vea las facturas en PDF directamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistorialFacturacionWrapper;