// frontend/src/components/Facturas/HistorialFacturacionWrapper.js
// Wrapper completo para el historial de facturación que funciona independientemente

import React, { useState, useEffect } from 'react';
import { 
  Search, Users, FileText, AlertCircle, X, Eye, Calendar,
  ChevronDown, ChevronUp, DollarSign, Clock, CheckCircle,
  Filter, RefreshCw, Download, PrinterIcon, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const HistorialFacturacionWrapper = () => {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarBuscador, setMostrarBuscador] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    estado: 'todas',
    fecha_desde: '',
    fecha_hasta: '',
    limite: 50
  });
  const [estadisticas, setEstadisticas] = useState({
    total_facturas: 0,
    total_pagadas: 0,
    total_pendientes: 0,
    monto_total: 0,
    monto_pagado: 0,
    monto_pendiente: 0
  });

  // Cargar lista de clientes al montar el componente
  useEffect(() => {
    // Verificar primero si queremos modo demo
    const urlParams = new URLSearchParams(window.location.search);
    const modoDemo = urlParams.get('demo') === 'true';
    
    if (modoDemo) {
      console.log('🎭 Modo demo activado');
      cargarDatosPrueba();
    } else {
      verificarEndpoints();
      cargarClientes();
    }
  }, []);

  const cargarDatosPrueba = () => {
    const clientesPrueba = [
      {
        id: 1,
        nombres: 'Juan Carlos',
        apellidos: 'Pérez García',
        tipo_documento: 'CC',
        numero_documento: '12345678',
        telefono: '300-123-4567',
        email: 'juan.perez@email.com',
        direccion: 'Calle 123 #45-67',
        estado: 'activo'
      },
      {
        id: 2,
        nombres: 'María Elena',
        apellidos: 'Rodríguez López',
        tipo_documento: 'CC',
        numero_documento: '87654321',
        telefono: '301-987-6543',
        email: 'maria.rodriguez@email.com',
        direccion: 'Carrera 89 #12-34',
        estado: 'activo'
      },
      {
        id: 3,
        nombres: 'Carlos Alberto',
        apellidos: 'Gómez Martínez',
        tipo_documento: 'CC',
        numero_documento: '11223344',
        telefono: '302-555-7890',
        email: 'carlos.gomez@email.com',
        direccion: 'Avenida 56 #78-90',
        estado: 'activo'
      }
    ];
    
    setClientes(clientesPrueba);
    setError('🎭 Modo demo - Datos de prueba cargados. Para usar datos reales, quite ?demo=true de la URL');
    setLoading(false);
  };

  // Función para verificar qué endpoints están disponibles
  const verificarEndpoints = async () => {
    const endpoints = [
      '/health',
      '/api/v1',
      '/api/v1/clients',
      '/api/v1/facturas', 
      '/api/v1/facturacion/facturas'
    ];
    
    console.log('🔍 Verificando endpoints disponibles...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        
        console.log(`✅ ${endpoint}: ${response.status} ${response.statusText} (JSON: ${isJson})`);
        
        if (isJson && response.ok) {
          try {
            const data = await response.json();
            console.log(`📝 Respuesta de ${endpoint}:`, data);
          } catch (e) {
            console.log(`❌ Error parseando JSON de ${endpoint}`);
          }
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: Error - ${error.message}`);
      }
    }
    
    // También verificar si el servidor está corriendo
    try {
      const response = await fetch('/');
      console.log(`🏠 Ruta raíz (/): ${response.status}`);
    } catch (error) {
      console.log('❌ El servidor backend no parece estar ejecutándose');
    }
  };

  // Cargar facturas cuando se selecciona un cliente o cambian los filtros
  useEffect(() => {
    if (clienteSeleccionado) {
      cargarFacturasCliente();
    }
  }, [clienteSeleccionado, filtros]);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Lista de endpoints para probar en orden
      const endpoints = [
        '/api/v1/clients',
        '/api/v1/clients?page=1&limit=50',
        '/health',
        '/api/v1'
      ];
      
      let data = null;
      let response = null;
      let endpointExitoso = null;
      
      // Probar cada endpoint hasta encontrar uno que funcione
      for (const endpoint of endpoints) {
        try {
          console.log(`Probando endpoint: ${endpoint}`);
          response = await fetch(endpoint);
          
          // Verificar si la respuesta es exitosa
          if (!response.ok) {
            console.log(`${endpoint} falló con status: ${response.status}`);
            continue;
          }
          
          // Verificar content-type
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.log(`${endpoint} no devuelve JSON`);
            continue;
          }
          
          // Intentar parsear la respuesta
          data = await response.json();
          endpointExitoso = endpoint;
          console.log(`✅ Éxito con endpoint: ${endpoint}`);
          break;
          
        } catch (fetchError) {
          console.log(`Error en ${endpoint}:`, fetchError.message);
          continue;
        }
      }
      
      // Si ningún endpoint funcionó, usar datos de prueba
      if (!data || !endpointExitoso) {
        console.log('Ningún endpoint de clientes disponible, usando datos de prueba');
        
        const clientesPrueba = [
          {
            id: 1,
            nombres: 'Juan Carlos',
            apellidos: 'Pérez García',
            tipo_documento: 'CC',
            numero_documento: '12345678',
            telefono: '300-123-4567',
            email: 'juan.perez@email.com',
            direccion: 'Calle 123 #45-67',
            estado: 'activo'
          },
          {
            id: 2,
            nombres: 'María Elena',
            apellidos: 'Rodríguez López',
            tipo_documento: 'CC',
            numero_documento: '87654321',
            telefono: '301-987-6543',
            email: 'maria.rodriguez@email.com',
            direccion: 'Carrera 89 #12-34',
            estado: 'activo'
          },
          {
            id: 3,
            nombres: 'Carlos Alberto',
            apellidos: 'Gómez Martínez',
            tipo_documento: 'CC',
            numero_documento: '11223344',
            telefono: '302-555-7890',
            email: 'carlos.gomez@email.com',
            direccion: 'Avenida 56 #78-90',
            estado: 'activo'
          }
        ];
        
        setClientes(clientesPrueba);
        setError('⚠️ Usando datos de prueba - Endpoints de clientes no disponibles');
        return;
      }
      
      // Procesar la respuesta exitosa
      if (data.success && data.data) {
        setClientes(data.data);
        console.log(`Clientes cargados exitosamente desde: ${endpointExitoso}`);
      } else if (Array.isArray(data)) {
        setClientes(data);
        console.log(`Clientes cargados como array desde: ${endpointExitoso}`);
      } else {
        console.log('Formato de respuesta inesperado:', data);
        setError('Formato de respuesta inesperado del servidor');
      }
      
    } catch (error) {
      console.error('Error general cargando clientes:', error);
      
      // En caso de error total, usar datos de prueba
      const clientesPrueba = [
        {
          id: 1,
          nombres: 'Usuario',
          apellidos: 'Prueba',
          tipo_documento: 'CC',
          numero_documento: '12345678',
          telefono: '300-000-0000',
          email: 'prueba@test.com',
          estado: 'activo'
        }
      ];
      
      setClientes(clientesPrueba);
      setError('⚠️ Error de conexión - Usando datos de prueba');
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
      setError('');
      
      // Lista de endpoints para búsqueda
      const endpoints = [
        `/api/v1/clients?search=${encodeURIComponent(termino)}`,
        `/api/v1/clients`,
        '/health'
      ];
      
      let data = null;
      let endpointExitoso = null;
      
      // Probar cada endpoint de búsqueda
      for (const endpoint of endpoints) {
        try {
          console.log(`Probando búsqueda en: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (!response.ok) {
            console.log(`Búsqueda falló en ${endpoint}: ${response.status}`);
            continue;
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.log(`${endpoint} no devuelve JSON en búsqueda`);
            continue;
          }
          
          data = await response.json();
          endpointExitoso = endpoint;
          console.log(`✅ Búsqueda exitosa en: ${endpoint}`);
          break;
          
        } catch (fetchError) {
          console.log(`Error buscando en ${endpoint}:`, fetchError.message);
          continue;
        }
      }
      
      // Si la búsqueda falló, hacer filtrado local
      if (!data || !endpointExitoso) {
        console.log('Búsqueda en servidor falló, intentando filtrado local');
        
        // Cargar todos los clientes y filtrar localmente
        await cargarClientes();
        
        // Filtrar localmente los clientes cargados
        const clientesFiltrados = clientes.filter(cliente => {
          const terminoBusqueda = termino.toLowerCase();
          return (
            cliente.nombres?.toLowerCase().includes(terminoBusqueda) ||
            cliente.apellidos?.toLowerCase().includes(terminoBusqueda) ||
            cliente.numero_documento?.includes(termino) ||
            cliente.telefono?.includes(termino) ||
            cliente.email?.toLowerCase().includes(terminoBusqueda)
          );
        });
        
        setClientes(clientesFiltrados);
        return;
      }
      
      // Procesar resultados de búsqueda
      if (data.success && data.data) {
        setClientes(data.data);
      } else if (Array.isArray(data)) {
        setClientes(data);
      } else {
        // Si no se puede procesar, usar filtrado local
        await cargarClientes();
      }
      
    } catch (error) {
      console.error('Error en búsqueda:', error);
      // En caso de error, recargar todos los clientes
      await cargarClientes();
    } finally {
      setLoading(false);
    }
  };

  const cargarFacturasCliente = async () => {
    if (!clienteSeleccionado) return;

    try {
      setLoadingFacturas(true);
      setError('');
      
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        cliente_id: clienteSeleccionado.id,
        page: 1,
        limit: filtros.limite
      });

      if (filtros.estado !== 'todas') {
        params.append('estado', filtros.estado);
      }
      
      if (filtros.fecha_desde) {
        params.append('fecha_desde', filtros.fecha_desde);
      }
      
      if (filtros.fecha_hasta) {
        params.append('fecha_hasta', filtros.fecha_hasta);
      }

      // Lista de endpoints para facturas
      const endpoints = [
        `/api/v1/facturas?cliente_id=${clienteSeleccionado.id}`,
        `/api/v1/facturacion/facturas?${params}`,
        `/api/v1/facturas?${params}`,
        `/api/v1/facturas`
      ];
      
      let data = null;
      let endpointExitoso = null;
      
      // Probar cada endpoint hasta encontrar uno que funcione
      for (const endpoint of endpoints) {
        try {
          console.log(`Probando endpoint de facturas: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (!response.ok) {
            console.log(`${endpoint} falló con status: ${response.status}`);
            continue;
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.log(`${endpoint} no devuelve JSON`);
            continue;
          }
          
          data = await response.json();
          endpointExitoso = endpoint;
          console.log(`✅ Facturas obtenidas desde: ${endpoint}`);
          break;
          
        } catch (fetchError) {
          console.log(`Error en ${endpoint}:`, fetchError.message);
          continue;
        }
      }
      
      // Si ningún endpoint funcionó, usar datos de prueba
      if (!data || !endpointExitoso) {
        console.log('Ningún endpoint de facturas disponible, usando datos de prueba');
        
        const facturasPrueba = [
          {
            id: 1,
            numero_factura: 'F-2024-001',
            fecha_factura: '2024-01-15',
            fecha_vencimiento: '2024-02-15',
            total: 85000,
            monto_pagado: 85000,
            estado: 'pagada',
            periodo: 'Enero 2024',
            subtotal: 71429,
            iva: 13571,
            descuento: 0,
            items: [
              {
                concepto: 'Internet 50 Mbps',
                cantidad: 1,
                valor_unitario: 65000,
                total: 65000
              },
              {
                concepto: 'TV Digital',
                cantidad: 1,
                valor_unitario: 20000,
                total: 20000
              }
            ],
            pagos: [
              {
                fecha_pago: '2024-01-20',
                monto: 85000,
                metodo_pago: 'Efectivo'
              }
            ]
          },
          {
            id: 2,
            numero_factura: 'F-2024-002',
            fecha_factura: '2024-02-15',
            fecha_vencimiento: '2024-03-15',
            total: 85000,
            monto_pagado: 0,
            estado: 'pendiente',
            periodo: 'Febrero 2024',
            subtotal: 71429,
            iva: 13571,
            descuento: 0,
            items: [
              {
                concepto: 'Internet 50 Mbps',
                cantidad: 1,
                valor_unitario: 65000,
                total: 65000
              },
              {
                concepto: 'TV Digital',
                cantidad: 1,
                valor_unitario: 20000,
                total: 20000
              }
            ]
          }
        ];
        
        setFacturas(facturasPrueba);
        calcularEstadisticas(facturasPrueba);
        setError('⚠️ Usando datos de prueba - Endpoints de facturación no disponibles');
        return;
      }
      
      // Procesar la respuesta exitosa
      let facturasData = [];
      
      if (data.success && data.data) {
        facturasData = Array.isArray(data.data) ? data.data : [data.data];
      } else if (Array.isArray(data)) {
        facturasData = data;
      } else if (data.facturas) {
        facturasData = Array.isArray(data.facturas) ? data.facturas : [data.facturas];
      } else {
        console.log('Formato de respuesta de facturas inesperado:', data);
        facturasData = [];
      }
      
      // Filtrar por cliente si es necesario
      if (facturasData.length > 0 && endpointExitoso.includes('facturas') && !endpointExitoso.includes('cliente_id')) {
        facturasData = facturasData.filter(factura => 
          factura.cliente_id === clienteSeleccionado.id ||
          factura.client_id === clienteSeleccionado.id
        );
      }
      
      setFacturas(facturasData);
      calcularEstadisticas(facturasData);
      
      if (facturasData.length === 0) {
        setError('No se encontraron facturas para este cliente');
      }
      
    } catch (error) {
      console.error('Error general cargando facturas:', error);
      
      // En caso de error total, usar datos de prueba
      const facturasPrueba = [
        {
          id: 1,
          numero_factura: 'DEMO-001',
          fecha_factura: new Date().toISOString().split('T')[0],
          fecha_vencimiento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          total: 75000,
          monto_pagado: 0,
          estado: 'pendiente',
          periodo: 'Mes actual'
        }
      ];
      
      setFacturas(facturasPrueba);
      calcularEstadisticas(facturasPrueba);
      setError('⚠️ Error de conexión - Usando datos de prueba');
    } finally {
      setLoadingFacturas(false);
    }
  };

  const calcularEstadisticas = (facturasData) => {
    const stats = facturasData.reduce((acc, factura) => {
      const monto = parseFloat(factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      
      acc.total_facturas++;
      acc.monto_total += monto;
      acc.monto_pagado += montoPagado;
      
      if (factura.estado === 'pagada') {
        acc.total_pagadas++;
      } else {
        acc.total_pendientes++;
        acc.monto_pendiente += (monto - montoPagado);
      }
      
      return acc;
    }, {
      total_facturas: 0,
      total_pagadas: 0,
      total_pendientes: 0,
      monto_total: 0,
      monto_pagado: 0,
      monto_pendiente: 0
    });
    
    setEstadisticas(stats);
  };

  const resetearEstadisticas = () => {
    setEstadisticas({
      total_facturas: 0,
      total_pagadas: 0,
      total_pendientes: 0,
      monto_total: 0,
      monto_pagado: 0,
      monto_pendiente: 0
    });
  };

  const verDetalleFactura = async (factura) => {
    try {
      setLoading(true);
      
      // Intentar obtener detalle completo de la factura
      let response = await fetch(`/api/v1/facturacion/facturas/${factura.id}`);
      
      if (!response.ok && response.status === 404) {
        response = await fetch(`/api/v1/facturas/${factura.id}`);
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFacturaDetalle(data.data);
        } else {
          // Si no se puede obtener el detalle, usar los datos básicos
          setFacturaDetalle(factura);
        }
      } else {
        setFacturaDetalle(factura);
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      setFacturaDetalle(factura);
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
    setBusquedaCliente('');
    setFacturas([]);
    setFacturaDetalle(null);
    resetearEstadisticas();
  };

  const limpiarSeleccion = () => {
    setClienteSeleccionado(null);
    setMostrarBuscador(true);
    setFacturas([]);
    setFacturaDetalle(null);
    resetearEstadisticas();
    cargarClientes();
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(valor || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';
    try {
      return format(new Date(fecha), 'dd/MM/yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pagada': return 'text-green-600 bg-green-100';
      case 'pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'vencida': return 'text-red-600 bg-red-100';
      case 'anulada': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const descargarFactura = async (facturaId) => {
    try {
      const response = await fetch(`/api/v1/facturas/${facturaId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `factura_${facturaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error descargando factura:', error);
    }
  };

  if (error && !clientes.length && !clienteSeleccionado) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={cargarClientes}
              className="inline-flex items-center px-4 py-2 bg-[#0e6493] text-white rounded-lg hover:bg-[#0e6493]/90 transition-colors mr-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </button>
            <button
              onClick={verificarEndpoints}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              🔍 Diagnosticar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Mensaje de ayuda para debugging */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Información de Debugging:</p>
                <p className="text-yellow-700">{error}</p>
                <div className="mt-2 text-xs text-yellow-600">
                  <p>Endpoints verificados:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>/health - Estado del servidor</li>
                    <li>/api/v1 - Info de la API</li>
                    <li>/api/v1/clients - Clientes</li>
                    <li>/api/v1/facturas - Facturas regulares</li>
                    <li>/api/v1/facturacion/facturas - Facturación automática</li>
                  </ul>
                  <div className="mt-2 bg-yellow-100 p-2 rounded">
                    <p className="font-bold">Pasos para solucionar:</p>
                    <ol className="list-decimal list-inside mt-1">
                      <li>Verificar que el servidor backend esté ejecutándose</li>
                      <li>Comprobar que el puerto sea el correcto (ej: 3001)</li>
                      <li>Verificar las rutas en backend/index.js</li>
                      <li>Revisar la consola del backend para errores</li>
                      <li>Probar <a href="/health" className="text-blue-600 underline">/health</a> en el navegador</li>
                    </ol>
                    <p className="mt-2 text-yellow-800">
                      <strong>Prueba rápida:</strong> <a href="?demo=true" className="text-blue-600 underline">Activar modo demo</a> para ver la interfaz funcionando.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historial de Facturación</h1>
              <p className="text-gray-600 mt-1">
                Consulta el historial completo de facturación por cliente
              </p>
            </div>
            {clienteSeleccionado && (
              <button
                onClick={limpiarSeleccion}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Nueva Consulta
              </button>
            )}
          </div>
        </div>

        {/* Buscador de clientes */}
        {mostrarBuscador && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Cliente</h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre, documento, teléfono..."
                value={busquedaCliente}
                onChange={handleBusquedaChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0e6493]" />
                <span className="ml-2 text-gray-600">Buscando clientes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((cliente) => (
                  <div
                    key={cliente.id}
                    onClick={() => seleccionarCliente(cliente)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#0e6493] hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <Users className="w-5 h-5 text-[#0e6493] mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {cliente.nombres} {cliente.apellidos}
                        </h3>
                        <p className="text-sm text-gray-600">{cliente.tipo_documento}: {cliente.numero_documento}</p>
                        {cliente.telefono && (
                          <p className="text-sm text-gray-500">{cliente.telefono}</p>
                        )}
                        {cliente.email && (
                          <p className="text-sm text-gray-500 truncate">{cliente.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && clientes.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
                <p className="text-gray-600">
                  {busquedaCliente ? 'Intenta con otros términos de búsqueda' : 'No hay clientes registrados'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cliente seleccionado y filtros */}
        {clienteSeleccionado && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#0e6493] rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {clienteSeleccionado.nombres} {clienteSeleccionado.apellidos}
                  </h2>
                  <p className="text-gray-600">
                    {clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => handleFiltroChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                >
                  <option value="todas">Todas</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="pagada">Pagadas</option>
                  <option value="vencida">Vencidas</option>
                  <option value="anulada">Anuladas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
                <input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Límite</label>
                <select
                  value={filtros.limite}
                  onChange={(e) => handleFiltroChange('limite', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0e6493] focus:border-transparent"
                >
                  <option value={25}>25 facturas</option>
                  <option value={50}>50 facturas</option>
                  <option value={100}>100 facturas</option>
                  <option value={200}>200 facturas</option>
                </select>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                    <p className="text-2xl font-bold text-blue-600">{estadisticas.total_facturas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Pagadas</p>
                    <p className="text-2xl font-bold text-green-600">{estadisticas.total_pagadas}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-600">{estadisticas.total_pendientes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Facturado</p>
                    <p className="text-lg font-bold text-blue-600">{formatearMoneda(estadisticas.monto_total)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Pagado</p>
                    <p className="text-lg font-bold text-green-600">{formatearMoneda(estadisticas.monto_pagado)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Total Pendiente</p>
                    <p className="text-lg font-bold text-red-600">{formatearMoneda(estadisticas.monto_pendiente)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listado de facturas */}
        {clienteSeleccionado && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Facturas del Cliente</h3>
                {loadingFacturas && (
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
                      Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
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
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {factura.numero_factura || `#${factura.id}`}
                        </div>
                        {factura.periodo && (
                          <div className="text-sm text-gray-500">
                            Período: {factura.periodo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatearFecha(factura.fecha_factura)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatearFecha(factura.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatearMoneda(factura.total)}
                        </div>
                        {factura.monto_pagado > 0 && (
                          <div className="text-sm text-green-600">
                            Pagado: {formatearMoneda(factura.monto_pagado)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(factura.estado)}`}>
                          {factura.estado || 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => verDetalleFactura(factura)}
                            className="text-[#0e6493] hover:text-[#0e6493]/80"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => descargarFactura(factura.id)}
                            className="text-green-600 hover:text-green-800"
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

            {!loadingFacturas && facturas.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
                <p className="text-gray-600">
                  No se encontraron facturas para este cliente con los filtros aplicados
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal de detalle de factura */}
        {facturaDetalle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalle de Factura #{facturaDetalle.numero_factura || facturaDetalle.id}
                  </h3>
                  <button
                    onClick={() => setFacturaDetalle(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Información General</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Número:</span>
                        <span className="font-medium">{facturaDetalle.numero_factura || `#${facturaDetalle.id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{formatearFecha(facturaDetalle.fecha_factura)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vencimiento:</span>
                        <span className="font-medium">{formatearFecha(facturaDetalle.fecha_vencimiento)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(facturaDetalle.estado)}`}>
                          {facturaDetalle.estado || 'Pendiente'}
                        </span>
                      </div>
                      {facturaDetalle.periodo && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Período:</span>
                          <span className="font-medium">{facturaDetalle.periodo}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Valores</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatearMoneda(facturaDetalle.subtotal || 0)}</span>
                      </div>
                      {facturaDetalle.descuento > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Descuento:</span>
                          <span className="font-medium text-green-600">-{formatearMoneda(facturaDetalle.descuento)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">IVA:</span>
                        <span className="font-medium">{formatearMoneda(facturaDetalle.iva || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-900 font-semibold">Total:</span>
                        <span className="font-bold text-lg">{formatearMoneda(facturaDetalle.total)}</span>
                      </div>
                      {facturaDetalle.monto_pagado > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-medium text-green-600">{formatearMoneda(facturaDetalle.monto_pagado)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saldo:</span>
                            <span className="font-medium text-red-600">
                              {formatearMoneda((facturaDetalle.total || 0) - (facturaDetalle.monto_pagado || 0))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conceptos/Items de la factura */}
                {facturaDetalle.items && facturaDetalle.items.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Conceptos Facturados</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {facturaDetalle.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.concepto || item.descripcion}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.cantidad || 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{formatearMoneda(item.valor_unitario || item.precio)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatearMoneda(item.total || item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Historial de pagos */}
                {facturaDetalle.pagos && facturaDetalle.pagos.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Historial de Pagos</h4>
                    <div className="space-y-2">
                      {facturaDetalle.pagos.map((pago, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatearFecha(pago.fecha_pago)}
                            </span>
                            {pago.metodo_pago && (
                              <span className="text-sm text-gray-600 ml-2">
                                ({pago.metodo_pago})
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-green-600">
                            {formatearMoneda(pago.monto)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observaciones */}
                {facturaDetalle.observaciones && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Observaciones</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {facturaDetalle.observaciones}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setFacturaDetalle(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => descargarFactura(facturaDetalle.id)}
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
      </div>
    </div>
  );
};

export default HistorialFacturacionWrapper;